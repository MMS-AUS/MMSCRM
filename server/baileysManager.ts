import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import qrcode from 'qrcode';
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  WASocket,
  proto
} from '@whiskeysockets/baileys';
import pino from 'pino';

// Root directory for Baileys auth session storage
const SESSIONS_ROOT = path.join(process.cwd(), '.whatsapp_cache', 'baileys_sessions');

export interface BaileysSessionInfo {
  tenantId: string;
  status: 'disconnected' | 'connecting' | 'qr_ready' | 'connected';
  qrCodeUrl?: string | null;
  rawQr?: string | null;
  pairedPhone?: string | null;
  pushName?: string | null;
  lastConnectedAt?: string | null;
  errorMessage?: string | null;
}

type InboundMessageCallback = (tenantId: string, msg: proto.IWebMessageInfo) => Promise<void>;
type StatusUpdateCallback = (session: BaileysSessionInfo) => Promise<void>;

class BaileysSessionManager {
  private sockets: Map<string, WASocket> = new Map();
  private sessions: Map<string, BaileysSessionInfo> = new Map();
  private inboundCallbacks: InboundMessageCallback[] = [];
  private statusCallbacks: StatusUpdateCallback[] = [];
  private quietLogger = pino({ level: 'silent' });

  constructor() {
    this.ensureSessionDir();
  }

  private ensureSessionDir(): void {
    if (!fs.existsSync(SESSIONS_ROOT)) {
      fs.mkdirSync(SESSIONS_ROOT, { recursive: true });
    }
  }

  public onInboundMessage(cb: InboundMessageCallback): void {
    this.inboundCallbacks.push(cb);
  }

  public onStatusUpdate(cb: StatusUpdateCallback): void {
    this.statusCallbacks.push(cb);
  }

  private notifyStatus(session: BaileysSessionInfo): void {
    this.sessions.set(session.tenantId, session);
    for (const cb of this.statusCallbacks) {
      try {
        cb(session).catch(err => console.error('[Baileys] Error in status callback:', err));
      } catch (err) {
        console.error('[Baileys] Sync error in status callback:', err);
      }
    }
  }

  public getSessionInfo(tenantId: string): BaileysSessionInfo {
    const existing = this.sessions.get(tenantId);
    if (existing) return existing;

    const sessionDir = path.join(SESSIONS_ROOT, tenantId);
    const hasCreds = fs.existsSync(path.join(sessionDir, 'creds.json'));

    const initial: BaileysSessionInfo = {
      tenantId,
      status: hasCreds ? 'disconnected' : 'disconnected',
      qrCodeUrl: null,
      rawQr: null,
      pairedPhone: null,
      pushName: null,
      lastConnectedAt: null,
      errorMessage: null
    };
    this.sessions.set(tenantId, initial);
    return initial;
  }

  /**
   * Initializes or restarts a Baileys WhatsApp Web session for a given tenant.
   */
  public async startSession(tenantId: string, forceFresh = false): Promise<BaileysSessionInfo> {
    const sessionDir = path.join(SESSIONS_ROOT, tenantId);
    if (forceFresh && fs.existsSync(sessionDir)) {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      } catch (err) {
        console.warn(`[Baileys] Failed to purge session dir for tenant ${tenantId}:`, err);
      }
    }

    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    // Terminate existing socket if any
    const existingSock = this.sockets.get(tenantId);
    if (existingSock) {
      try {
        existingSock.end(undefined);
      } catch {}
      this.sockets.delete(tenantId);
    }

    const session: BaileysSessionInfo = {
      tenantId,
      status: 'connecting',
      qrCodeUrl: null,
      rawQr: null,
      pairedPhone: null,
      pushName: null,
      lastConnectedAt: null,
      errorMessage: null
    };
    this.notifyStatus(session);

    try {
      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
      const { version } = await fetchLatestBaileysVersion().catch(() => ({
        version: [2, 3000, 1015901307] as [number, number, number]
      }));

      const sock = makeWASocket({
        version,
        auth: state,
        logger: this.quietLogger,
        printQRInTerminal: false,
        browser: ['MySolarCRM Hybrid Engine', 'Chrome', '124.0.0.0'],
        syncFullHistory: false,
        connectTimeoutMs: 30000,
        defaultQueryTimeoutMs: 30000
      });

      this.sockets.set(tenantId, sock);

      // Save credentials whenever updated
      sock.ev.on('creds.update', saveCreds);

      // Handle connection updates (QR code generation, connection success, disconnection)
      sock.ev.on('connection.update', async update => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            const qrCodeUrl = await qrcode.toDataURL(qr, {
              margin: 2,
              width: 320,
              color: { dark: '#0a0a0a', light: '#ffffff' }
            });
            session.status = 'qr_ready';
            session.rawQr = qr;
            session.qrCodeUrl = qrCodeUrl;
            session.errorMessage = null;
            this.notifyStatus(session);
          } catch (err: any) {
            console.error('[Baileys] Error generating QR code image:', err);
          }
        }

        if (connection === 'open') {
          const userJid = sock.user?.id || '';
          const cleanPhone = userJid.split('@')[0]?.split(':')[0] || 'Linked WhatsApp Web';
          session.status = 'connected';
          session.qrCodeUrl = null;
          session.rawQr = null;
          session.pairedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
          session.pushName = sock.user?.name || 'WhatsApp Business User';
          session.lastConnectedAt = new Date().toISOString();
          session.errorMessage = null;
          this.notifyStatus(session);
          console.log(`[Baileys] Tenant ${tenantId} connected to WhatsApp Web as ${session.pairedPhone}`);
        }

        if (connection === 'close') {
          const shouldReconnect =
            (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
          
          session.status = 'disconnected';
          session.qrCodeUrl = null;
          session.rawQr = null;
          session.errorMessage = (lastDisconnect?.error as any)?.message || 'Connection closed';
          this.notifyStatus(session);

          this.sockets.delete(tenantId);

          if (shouldReconnect) {
            console.log(`[Baileys] Tenant ${tenantId} disconnected, reconnecting in 5s...`);
            setTimeout(() => {
              this.startSession(tenantId).catch(err => {
                console.error(`[Baileys] Reconnect failed for tenant ${tenantId}:`, err);
              });
            }, 5000);
          } else {
            console.log(`[Baileys] Tenant ${tenantId} logged out of WhatsApp Web.`);
          }
        }
      });

      // Handle incoming messages
      sock.ev.on('messages.upsert', async upsert => {
        if (upsert.type === 'notify' || upsert.type === 'append') {
          for (const msg of upsert.messages) {
            for (const cb of this.inboundCallbacks) {
              try {
                await cb(tenantId, msg);
              } catch (err) {
                console.error('[Baileys] Error executing inbound message callback:', err);
              }
            }
          }
        }
      });

      return session;
    } catch (err: any) {
      console.error(`[Baileys] Failed to initialize socket for tenant ${tenantId}:`, err);
      session.status = 'disconnected';
      session.errorMessage = err.message || 'Failed to start Baileys session';
      this.notifyStatus(session);
      return session;
    }
  }

  /**
   * Disconnects and ends the Baileys session for a tenant.
   */
  public async disconnectSession(tenantId: string, clearAuth = false): Promise<void> {
    const sock = this.sockets.get(tenantId);
    if (sock) {
      try {
        sock.end(undefined);
      } catch {}
      this.sockets.delete(tenantId);
    }

    if (clearAuth) {
      const sessionDir = path.join(SESSIONS_ROOT, tenantId);
      if (fs.existsSync(sessionDir)) {
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch {}
      }
    }

    const session: BaileysSessionInfo = {
      tenantId,
      status: 'disconnected',
      qrCodeUrl: null,
      rawQr: null,
      pairedPhone: null,
      pushName: null,
      lastConnectedAt: null,
      errorMessage: null
    };
    this.notifyStatus(session);
  }

  /**
   * Sends a message via the active Baileys WebSocket connection.
   */
  public async sendMessage(
    tenantId: string,
    toPhone: string,
    text: string,
    mediaUrl?: string
  ): Promise<{ success: boolean; messageId: string; error?: string }> {
    const sock = this.sockets.get(tenantId);
    const session = this.getSessionInfo(tenantId);

    // Format phone to WhatsApp JID: e.g. 61412884910@s.whatsapp.net
    const numeric = toPhone.replace(/\D/g, '');
    const jid = `${numeric}@s.whatsapp.net`;

    if (sock && session.status === 'connected') {
      try {
        let sent: any;
        if (mediaUrl) {
          sent = await sock.sendMessage(jid, {
            image: { url: mediaUrl },
            caption: text
          });
        } else {
          sent = await sock.sendMessage(jid, { text });
        }

        const msgId = sent?.key?.id || `baileys_${crypto.randomBytes(12).toString('hex')}`;
        return { success: true, messageId: msgId };
      } catch (err: any) {
        console.error(`[Baileys] Socket error sending message to ${toPhone}:`, err);
        return {
          success: false,
          messageId: `failed_${Date.now()}`,
          error: err.message || 'Baileys socket transmission failure'
        };
      }
    }

    // In simulation mode (paired phone present without physical socket)
    if (session.status === 'connected') {
      const simMsgId = `baileys_${crypto.randomBytes(12).toString('hex')}`;
      return { success: true, messageId: simMsgId };
    }

    // If socket is not yet paired or offline, return clean diagnostic
    return {
      success: false,
      messageId: `baileys_offline_${Date.now()}`,
      error: `Baileys session for tenant "${tenantId}" is currently ${session.status}. Please scan QR code in the WhatsApp channels tab.`
    };
  }

  /**
   * Simulates a successful pairing for local development / testing without a physical phone.
   */
  public async simulatePairing(
    tenantId: string,
    phone = '+61 412 884 910',
    name = 'Solar Rep Personal Mobile'
  ): Promise<BaileysSessionInfo> {
    const session: BaileysSessionInfo = {
      tenantId,
      status: 'connected',
      qrCodeUrl: null,
      rawQr: null,
      pairedPhone: phone,
      pushName: name,
      lastConnectedAt: new Date().toISOString(),
      errorMessage: null
    };
    this.notifyStatus(session);
    return session;
  }

  /**
   * Simulates an inbound message from WhatsApp Web for testing without a live sender.
   */
  public async simulateInboundMessage(
    tenantId: string,
    fromPhone: string,
    text: string,
    senderName = 'Customer Mobile User'
  ): Promise<void> {
    const numeric = fromPhone.replace(/\D/g, '');
    const remoteJid = `${numeric}@s.whatsapp.net`;

    const fakeMsg: proto.IWebMessageInfo = {
      key: {
        remoteJid,
        fromMe: false,
        id: `baileys_sim_${crypto.randomBytes(8).toString('hex')}`
      },
      message: {
        conversation: text
      },
      messageTimestamp: Math.floor(Date.now() / 1000),
      pushName: senderName
    };

    for (const cb of this.inboundCallbacks) {
      await cb(tenantId, fakeMsg);
    }
  }
}

export const baileysSessionManager = new BaileysSessionManager();
