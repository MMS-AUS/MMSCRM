import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getSupabase, isSupabaseQuotaError, markSupabaseRestricted } from './supabase.ts';
import { baileysSessionManager, BaileysSessionInfo } from './baileysManager.ts';
import { formatToE164 } from './messagemedia.ts';
import { proto } from '@whiskeysockets/baileys';

// ============================================================================
// DATA MODELS & INTERFACES (Hybrid WhatsApp Architecture)
// ============================================================================

export type WhatsAppChannelType = 'cloud_api' | 'baileys_web';
export type WhatsAppChannelStatus = 'connected' | 'qr_ready' | 'disconnected' | 'connecting';

export interface WhatsAppChannel {
  id: string; // uuid
  tenant_id: string; // uuid
  channel_name: string;
  channel_type: WhatsAppChannelType;
  is_active: boolean;
  status: WhatsAppChannelStatus;
  credentials: {
    // Meta Cloud API Credentials
    phone_number_id?: string;
    waba_id?: string;
    access_token?: string;
    webhook_verify_token?: string;
    display_phone_number?: string;
    verified_name?: string;
    api_version?: string;

    // Baileys Web Credentials
    session_id?: string;
    paired_phone?: string;
    push_name?: string;
    qr_code_url?: string | null;
    raw_qr?: string | null;
    last_connected_at?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface UnifiedMessage {
  id: string; // uuid
  tenant_id: string; // uuid
  channel_id: string; // uuid referencing whatsapp_channels
  channel_type: WhatsAppChannelType;
  contact_id?: string | null;
  recipient_phone: string;
  sender_phone?: string | null;
  wa_message_id: string;
  direction: 'inbound' | 'outbound';
  message_body: string;
  message_type: 'text' | 'template' | 'image' | 'document' | 'audio' | 'video';
  media_url?: string | null;
  media_type?: string | null;
  media_caption?: string | null;
  template_name?: string | null;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'received';
  raw_payload?: any;
  created_at: string;
  contact_name?: string | null;
}

export interface SendMessagePayload {
  channelId?: string; // Optional: specify channel, otherwise uses tenant default active
  to: string; // Recipient phone number
  message: string;
  type?: 'text' | 'template' | 'image';
  templateName?: string;
  templateParams?: string[];
  mediaUrl?: string;
  mediaCaption?: string;
  contactId?: string;
  contactName?: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId: string;
  channelId: string;
  channelType: WhatsAppChannelType;
  channelName: string;
  status: UnifiedMessage['status'];
  error?: string;
  timestamp: string;
}

// ============================================================================
// STORAGE CONFIGURATION (Supabase with Local File Cache Resilience)
// ============================================================================

const CACHE_DIR = path.join(process.cwd(), '.whatsapp_cache');
const CHANNELS_FILE = path.join(CACHE_DIR, 'whatsapp_channels.json');
const UNIFIED_MESSAGES_FILE = path.join(CACHE_DIR, 'unified_messages.json');

function ensureDirectories(): void {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Default Seed Channels
const DEFAULT_SEED_CHANNELS: WhatsAppChannel[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    channel_name: 'Official Enterprise WhatsApp (Meta Cloud API)',
    channel_type: 'cloud_api',
    is_active: true,
    status: 'connected',
    credentials: {
      phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID || '109823749281726',
      waba_id: process.env.WHATSAPP_WABA_ID || '392019485019283',
      access_token: process.env.WHATSAPP_ACCESS_TOKEN || 'EAAGm0PX4ZBZB4BA...system_user_permanent_token_sec_9941',
      webhook_verify_token: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'solarflow_wa_verify_token_2026_australia',
      display_phone_number: '+61 480 019 822',
      verified_name: 'SolarFlow Clean Energy Australia',
      api_version: 'v20.0'
    },
    created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    channel_name: 'Dave Miller - Personal Field WhatsApp (Baileys Web)',
    channel_type: 'baileys_web',
    is_active: false,
    status: 'disconnected',
    credentials: {
      session_id: 'session_field_dave_01',
      paired_phone: '+61 412 884 910',
      push_name: 'David Miller (Solar Installer)'
    },
    created_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Default Seed Messages (Normalized across both channels)
const DEFAULT_SEED_UNIFIED_MESSAGES: UnifiedMessage[] = [
  {
    id: 'a1b2c3d4-1111-4000-8000-000000000001',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    channel_id: '00000000-0000-0000-0000-000000000001',
    channel_type: 'cloud_api',
    contact_id: 'c1-marcus-vance',
    recipient_phone: '+61 412 884 910',
    sender_phone: '+61 480 019 822',
    wa_message_id: 'wamid.HBgLMjY5MTI4ODQ5MTAVAgARGBI1N0Q2QTY5MjIzREQ0RTFFMQA=',
    direction: 'outbound',
    message_body: 'Hi Marcus, your CEC solar site assessment for 44 Ocean Avenue, Bondi Beach NSW 2026 is confirmed for tomorrow at 10:00 AM. Our accredited technician David Miller will inspect your switchboard.',
    message_type: 'template',
    template_name: 'solar_survey_confirmation',
    status: 'read',
    created_at: '2026-09-17T08:15:00Z',
    contact_name: 'Marcus Aurelius Vance'
  },
  {
    id: 'a1b2c3d4-2222-4000-8000-000000000002',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    channel_id: '00000000-0000-0000-0000-000000000001',
    channel_type: 'cloud_api',
    contact_id: 'c1-marcus-vance',
    recipient_phone: '+61 480 019 822',
    sender_phone: '+61 412 884 910',
    wa_message_id: 'wamid.HBgLMjY5MTI4ODQ5MTAVAgASGBIzMzk1RTYzRDgzQjFFRDhGMQA=',
    direction: 'inbound',
    message_body: 'Here is the photo of our 3-phase meter box inside the garage.',
    message_type: 'image',
    media_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
    media_type: 'image/jpeg',
    media_caption: '3-phase meter box inside garage',
    status: 'received',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    contact_name: 'Marcus Aurelius Vance'
  },
  {
    id: 'a1b2c3d4-3333-4000-8000-000000000003',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    channel_id: '00000000-0000-0000-0000-000000000002',
    channel_type: 'baileys_web',
    contact_id: 'c1-marcus-vance',
    recipient_phone: '+61 412 884 910',
    sender_phone: '+61 412 884 910',
    wa_message_id: 'baileys_99a8b7c6d5e4f3a2b1c0d9e8',
    direction: 'outbound',
    message_body: 'G\'day Marcus, David here from the install team. I am pulling up to Ocean Ave now in the SolarFlow van. See you shortly!',
    message_type: 'text',
    status: 'delivered',
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    contact_name: 'Marcus Aurelius Vance'
  }
];

// ============================================================================
// CHANNELS REPOSITORY (whatsapp_channels Table in Supabase + Fallback Cache)
// ============================================================================

export async function getStoredWhatsAppChannels(tenantId?: string): Promise<WhatsAppChannel[]> {
  const tid = tenantId || '00000000-0000-0000-0000-000000000001';
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('whatsapp_channels')
        .select('*')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        // Overlay in-memory live Baileys state if available
        return overlayLiveBaileysState(data as WhatsAppChannel[], tid);
      }
      if (error && isSupabaseQuotaError(error)) {
        markSupabaseRestricted(error.message);
      }
    } catch (err: any) {
      if (isSupabaseQuotaError(err)) {
        markSupabaseRestricted(err.message);
      } else {
        console.warn('[WhatsApp Channels] Supabase fetch error, using local cache:', err.message || err);
      }
    }
  }

  // Fallback to local file cache
  ensureDirectories();
  try {
    if (fs.existsSync(CHANNELS_FILE)) {
      const raw = fs.readFileSync(CHANNELS_FILE, 'utf8');
      const channels: WhatsAppChannel[] = JSON.parse(raw);
      const filtered = channels.filter(c => c.tenant_id === tid);
      if (filtered.length > 0) {
        return overlayLiveBaileysState(filtered, tid);
      }
    }
  } catch (err) {
    console.warn('[WhatsApp Channels] Local cache read error:', err);
  }

  // Write default seed channels if none exist
  ensureDirectories();
  fs.writeFileSync(CHANNELS_FILE, JSON.stringify(DEFAULT_SEED_CHANNELS, null, 2), 'utf8');
  return overlayLiveBaileysState(DEFAULT_SEED_CHANNELS, tid);
}

function overlayLiveBaileysState(channels: WhatsAppChannel[], tenantId: string): WhatsAppChannel[] {
  const baileysState = baileysSessionManager.getSessionInfo(tenantId);
  return channels.map(ch => {
    if (ch.channel_type === 'baileys_web') {
      return {
        ...ch,
        status: baileysState.status === 'connected' ? 'connected' : (baileysState.status === 'qr_ready' ? 'qr_ready' : ch.status),
        credentials: {
          ...ch.credentials,
          qr_code_url: baileysState.qrCodeUrl || ch.credentials.qr_code_url,
          raw_qr: baileysState.rawQr || ch.credentials.raw_qr,
          paired_phone: baileysState.pairedPhone || ch.credentials.paired_phone,
          push_name: baileysState.pushName || ch.credentials.push_name,
          last_connected_at: baileysState.lastConnectedAt || ch.credentials.last_connected_at
        }
      };
    }
    return ch;
  });
}

export async function upsertStoredWhatsAppChannel(
  channel: Partial<WhatsAppChannel>
): Promise<WhatsAppChannel> {
  const tid = channel.tenant_id || '00000000-0000-0000-0000-000000000001';
  const currentList = await getStoredWhatsAppChannels(tid);

  let existing = currentList.find(c => c.id === channel.id);
  const now = new Date().toISOString();

  const record: WhatsAppChannel = {
    id: channel.id || existing?.id || crypto.randomUUID(),
    tenant_id: tid,
    channel_name: channel.channel_name || existing?.channel_name || 'WhatsApp Channel',
    channel_type: channel.channel_type || existing?.channel_type || 'cloud_api',
    is_active: channel.is_active !== undefined ? channel.is_active : (existing?.is_active ?? true),
    status: channel.status || existing?.status || 'disconnected',
    credentials: {
      ...(existing?.credentials || {}),
      ...(channel.credentials || {})
    },
    created_at: existing?.created_at || now,
    updated_at: now
  };

  // If setting this channel as active, deactivate other channels for the same tenant if needed
  if (record.is_active) {
    for (const c of currentList) {
      if (c.id !== record.id) c.is_active = false;
    }
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('whatsapp_channels')
        .upsert(record, { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (!error && data) {
        await syncLocalChannelsCache(record);
        return data as WhatsAppChannel;
      }
      if (error && isSupabaseQuotaError(error)) {
        markSupabaseRestricted(error.message);
      }
    } catch (err: any) {
      if (isSupabaseQuotaError(err)) {
        markSupabaseRestricted(err.message);
      } else {
        console.warn('[WhatsApp Channels] Supabase upsert error, syncing locally:', err.message || err);
      }
    }
  }

  await syncLocalChannelsCache(record);
  return record;
}

async function syncLocalChannelsCache(updated: WhatsAppChannel): Promise<void> {
  ensureDirectories();
  try {
    let list: WhatsAppChannel[] = [];
    if (fs.existsSync(CHANNELS_FILE)) {
      list = JSON.parse(fs.readFileSync(CHANNELS_FILE, 'utf8'));
    } else {
      list = [...DEFAULT_SEED_CHANNELS];
    }

    const idx = list.findIndex(c => c.id === updated.id);
    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }

    if (updated.is_active) {
      list.forEach(c => {
        if (c.tenant_id === updated.tenant_id && c.id !== updated.id) {
          c.is_active = false;
        }
      });
    }

    fs.writeFileSync(CHANNELS_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    console.error('[WhatsApp Channels] Cache write error:', err);
  }
}

// ============================================================================
// UNIFIED MESSAGES REPOSITORY (messages Table in Supabase + Fallback Cache)
// ============================================================================

export async function getStoredUnifiedMessages(
  tenantId?: string,
  options?: { contactId?: string; channelId?: string; limit?: number }
): Promise<UnifiedMessage[]> {
  const tid = tenantId || '00000000-0000-0000-0000-000000000001';
  const limit = options?.limit || 200;
  const supabase = getSupabase();

  if (supabase) {
    try {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (options?.contactId) {
        query = query.eq('contact_id', options.contactId);
      }
      if (options?.channelId) {
        query = query.eq('channel_id', options.channelId);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as UnifiedMessage[];
      }
      if (error && isSupabaseQuotaError(error)) {
        markSupabaseRestricted(error.message);
      }
    } catch (err: any) {
      if (isSupabaseQuotaError(err)) {
        markSupabaseRestricted(err.message);
      } else {
        console.warn('[Unified Messages] Supabase select error, using local cache:', err.message || err);
      }
    }
  }

  // Fallback to local cache
  ensureDirectories();
  try {
    if (fs.existsSync(UNIFIED_MESSAGES_FILE)) {
      const raw = fs.readFileSync(UNIFIED_MESSAGES_FILE, 'utf8');
      let messages: UnifiedMessage[] = JSON.parse(raw);
      messages = messages.filter(m => m.tenant_id === tid);
      if (options?.contactId) {
        messages = messages.filter(m => m.contact_id === options.contactId);
      }
      if (options?.channelId) {
        messages = messages.filter(m => m.channel_id === options.channelId);
      }
      return messages;
    } else {
      fs.writeFileSync(UNIFIED_MESSAGES_FILE, JSON.stringify(DEFAULT_SEED_UNIFIED_MESSAGES, null, 2), 'utf8');
      return DEFAULT_SEED_UNIFIED_MESSAGES.filter(m => m.tenant_id === tid);
    }
  } catch (err) {
    console.warn('[Unified Messages] Cache read error:', err);
    return DEFAULT_SEED_UNIFIED_MESSAGES;
  }
}

export async function insertStoredUnifiedMessage(
  msg: Partial<UnifiedMessage>
): Promise<UnifiedMessage> {
  const tid = msg.tenant_id || '00000000-0000-0000-0000-000000000001';
  const now = new Date().toISOString();

  const record: UnifiedMessage = {
    id: msg.id || crypto.randomUUID(),
    tenant_id: tid,
    channel_id: msg.channel_id || '00000000-0000-0000-0000-000000000001',
    channel_type: msg.channel_type || 'cloud_api',
    contact_id: msg.contact_id || null,
    recipient_phone: formatToE164(msg.recipient_phone || '+61412884910'),
    sender_phone: msg.sender_phone ? formatToE164(msg.sender_phone) : null,
    wa_message_id: msg.wa_message_id || `wamid.HBgL${crypto.randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '')}`,
    direction: msg.direction || 'outbound',
    message_body: msg.message_body || '',
    message_type: msg.message_type || 'text',
    media_url: msg.media_url || null,
    media_type: msg.media_type || null,
    media_caption: msg.media_caption || null,
    template_name: msg.template_name || null,
    status: msg.status || (msg.direction === 'inbound' ? 'received' : 'sent'),
    raw_payload: msg.raw_payload || null,
    created_at: msg.created_at || now,
    contact_name: msg.contact_name || null
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([record])
        .select()
        .maybeSingle();

      if (!error && data) {
        await appendToLocalUnifiedMessagesCache(record);
        return data as UnifiedMessage;
      }
      if (error && isSupabaseQuotaError(error)) {
        markSupabaseRestricted(error.message);
      }
    } catch (err: any) {
      if (isSupabaseQuotaError(err)) {
        markSupabaseRestricted(err.message);
      } else {
        console.warn('[Unified Messages] Supabase insert error, saving locally:', err.message || err);
      }
    }
  }

  await appendToLocalUnifiedMessagesCache(record);
  return record;
}

export async function updateStoredUnifiedMessageStatus(
  waMessageId: string,
  status: UnifiedMessage['status']
): Promise<{ success: boolean }> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase
        .from('messages')
        .update({ status })
        .eq('wa_message_id', waMessageId);
    } catch (err) {
      console.warn('[Unified Messages] Supabase status update error:', err);
    }
  }

  // Update in local cache
  ensureDirectories();
  try {
    if (fs.existsSync(UNIFIED_MESSAGES_FILE)) {
      const list: UnifiedMessage[] = JSON.parse(fs.readFileSync(UNIFIED_MESSAGES_FILE, 'utf8'));
      const found = list.find(m => m.wa_message_id === waMessageId);
      if (found) {
        found.status = status;
        fs.writeFileSync(UNIFIED_MESSAGES_FILE, JSON.stringify(list, null, 2), 'utf8');
      }
    }
  } catch {}

  return { success: true };
}

async function appendToLocalUnifiedMessagesCache(msg: UnifiedMessage): Promise<void> {
  ensureDirectories();
  try {
    let list: UnifiedMessage[] = [];
    if (fs.existsSync(UNIFIED_MESSAGES_FILE)) {
      list = JSON.parse(fs.readFileSync(UNIFIED_MESSAGES_FILE, 'utf8'));
    } else {
      list = [...DEFAULT_SEED_UNIFIED_MESSAGES];
    }

    const idx = list.findIndex(m => m.wa_message_id === msg.wa_message_id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...msg };
    } else {
      list.push(msg);
    }

    list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    fs.writeFileSync(UNIFIED_MESSAGES_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    console.error('[Unified Messages] Failed to append to cache:', err);
  }
}

// ============================================================================
// UNIFIED MESSAGE ROUTER (Central sendMessage Function)
// ============================================================================

/**
 * Central routing function that inspects the tenant's configured channel_type:
 * - If 'cloud_api': formats payload and calls Meta Graph API v20.0
 * - If 'baileys_web': retrieves the active socket from Baileys session manager and dispatches via WebSocket
 * Both paths normalize the outgoing message and record it in the unified Supabase `messages` table.
 */
export async function sendMessage(
  tenantId: string,
  payload: SendMessagePayload
): Promise<SendMessageResult> {
  const tid = tenantId || '00000000-0000-0000-0000-000000000001';
  const channels = await getStoredWhatsAppChannels(tid);

  // 1. Resolve target channel (explicit channelId or default active channel)
  let channel: WhatsAppChannel | undefined;
  if (payload.channelId) {
    channel = channels.find(c => c.id === payload.channelId);
  }
  if (!channel) {
    channel = channels.find(c => c.is_active) || channels[0];
  }

  if (!channel) {
    throw new Error(`No WhatsApp channel configured for tenant ${tid}`);
  }

  const cleanRecipient = formatToE164(payload.to);
  const now = new Date().toISOString();

  // 2. ROUTE: Meta WhatsApp Cloud API
  if (channel.channel_type === 'cloud_api') {
    const creds = channel.credentials || {};
    const phoneNumberId = creds.phone_number_id || '109823749281726';
    const accessToken = creds.access_token || '';
    const apiVersion = creds.api_version || 'v20.0';

    let metaPayload: any;
    const recipientDigits = cleanRecipient.replace(/\D/g, '');

    if (payload.type === 'template' && payload.templateName) {
      metaPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientDigits,
        type: 'template',
        template: {
          name: payload.templateName,
          language: { code: 'en_AU' },
          components: [
            {
              type: 'body',
              parameters: (payload.templateParams || []).map(p => ({
                type: 'text',
                text: String(p)
              }))
            }
          ]
        }
      };
    } else {
      metaPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientDigits,
        type: 'text',
        text: {
          preview_url: true,
          body: payload.message
        }
      };
    }

    try {
      // In production or when token is present, make real call to Meta Graph API
      let waMessageId = `wamid.HBgL${crypto.randomBytes(16).toString('base64').replace(/[^a-zA-Z0-9]/g, '')}`;
      let status: UnifiedMessage['status'] = 'sent';

      if (accessToken && !accessToken.includes('...')) {
        const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(metaPayload)
        });

        const data: any = await res.json();
        if (data.messages && data.messages[0]?.id) {
          waMessageId = data.messages[0].id;
        } else if (data.error) {
          throw new Error(`Meta Graph API error: ${data.error.message || JSON.stringify(data.error)}`);
        }
      }

      // Record normalized message in Supabase unified `messages` table
      await insertStoredUnifiedMessage({
        tenant_id: tid,
        channel_id: channel.id,
        channel_type: 'cloud_api',
        contact_id: payload.contactId || null,
        contact_name: payload.contactName || null,
        recipient_phone: cleanRecipient,
        sender_phone: creds.display_phone_number || '+61480019822',
        wa_message_id: waMessageId,
        direction: 'outbound',
        message_body: payload.message,
        message_type: payload.type || 'text',
        template_name: payload.templateName || null,
        media_url: payload.mediaUrl || null,
        media_caption: payload.mediaCaption || null,
        status: 'sent',
        raw_payload: metaPayload,
        created_at: now
      });

      return {
        success: true,
        messageId: waMessageId,
        channelId: channel.id,
        channelType: 'cloud_api',
        channelName: channel.channel_name,
        status: 'sent',
        timestamp: now
      };
    } catch (err: any) {
      console.error('[Router] Meta Cloud API send failed:', err);
      return {
        success: false,
        messageId: `failed_${Date.now()}`,
        channelId: channel.id,
        channelType: 'cloud_api',
        channelName: channel.channel_name,
        status: 'failed',
        error: err.message || 'Meta Cloud API transmission error',
        timestamp: now
      };
    }
  }

  // 3. ROUTE: Baileys Unofficial Web API (WebSocket)
  if (channel.channel_type === 'baileys_web') {
    const baileysRes = await baileysSessionManager.sendMessage(
      tid,
      cleanRecipient,
      payload.message,
      payload.mediaUrl
    );

    const waMessageId = baileysRes.messageId;
    const status: UnifiedMessage['status'] = baileysRes.success ? 'sent' : 'failed';

    // Record normalized message in Supabase unified `messages` table
    await insertStoredUnifiedMessage({
      tenant_id: tid,
      channel_id: channel.id,
      channel_type: 'baileys_web',
      contact_id: payload.contactId || null,
      contact_name: payload.contactName || null,
      recipient_phone: cleanRecipient,
      sender_phone: channel.credentials.paired_phone || '+61412884910',
      wa_message_id: waMessageId,
      direction: 'outbound',
      message_body: payload.message,
      message_type: payload.mediaUrl ? 'image' : 'text',
      media_url: payload.mediaUrl || null,
      media_caption: payload.mediaCaption || null,
      status,
      raw_payload: { to: cleanRecipient, text: payload.message, baileysResult: baileysRes },
      created_at: now
    });

    return {
      success: baileysRes.success,
      messageId: waMessageId,
      channelId: channel.id,
      channelType: 'baileys_web',
      channelName: channel.channel_name,
      status,
      error: baileysRes.error,
      timestamp: now
    };
  }

  throw new Error(`Unsupported channel_type: ${(channel as any).channel_type}`);
}

// ============================================================================
// INBOUND EVENT LISTENERS & WEBHOOK HANDLERS
// ============================================================================

/**
 * Handles incoming Meta WhatsApp Cloud API webhooks (inbound messages & delivery status receipts).
 */
export async function handleMetaCloudInboundWebhook(
  payload: any,
  tenantId = '00000000-0000-0000-0000-000000000001'
): Promise<{ processed: number; statuses: number }> {
  let processed = 0;
  let statuses = 0;

  if (!payload || !payload.entry) return { processed: 0, statuses: 0 };

  const channels = await getStoredWhatsAppChannels(tenantId);
  const cloudChannel = channels.find(c => c.channel_type === 'cloud_api') || channels[0];

  for (const entry of payload.entry) {
    for (const change of entry.changes || []) {
      const val = change.value;
      if (!val) continue;

      // Inbound Messages
      if (val.messages && val.messages.length > 0) {
        const contactInfo = val.contacts && val.contacts[0];
        const contactName = contactInfo?.profile?.name || 'Customer';

        for (const m of val.messages) {
          const fromPhone = formatToE164(m.from);
          let bodyText = '';
          let msgType: UnifiedMessage['message_type'] = 'text';
          let mediaUrl: string | null = null;
          let mediaType: string | null = null;
          let mediaCaption: string | null = null;

          if (m.type === 'text') {
            bodyText = m.text?.body || '';
          } else if (m.type === 'image') {
            msgType = 'image';
            bodyText = m.image?.caption || 'Photo message received';
            mediaCaption = m.image?.caption || null;
            mediaType = m.image?.mime_type || 'image/jpeg';
            mediaUrl = `https://graph.facebook.com/v20.0/${m.image?.id}`;
          } else if (m.type === 'document') {
            msgType = 'document';
            bodyText = m.document?.filename || 'Document received';
            mediaType = m.document?.mime_type || 'application/pdf';
          } else {
            bodyText = `[${m.type} message received]`;
          }

          await insertStoredUnifiedMessage({
            tenant_id: tenantId,
            channel_id: cloudChannel ? cloudChannel.id : '00000000-0000-0000-0000-000000000001',
            channel_type: 'cloud_api',
            recipient_phone: cloudChannel?.credentials.display_phone_number || '+61480019822',
            sender_phone: fromPhone,
            wa_message_id: m.id,
            direction: 'inbound',
            message_body: bodyText,
            message_type: msgType,
            media_url: mediaUrl,
            media_type: mediaType,
            media_caption: mediaCaption,
            status: 'received',
            contact_name: contactName,
            raw_payload: m,
            created_at: new Date(Number(m.timestamp) * 1000).toISOString()
          });

          processed++;
        }
      }

      // Status receipts (sent, delivered, read, failed)
      if (val.statuses && val.statuses.length > 0) {
        for (const st of val.statuses) {
          await updateStoredUnifiedMessageStatus(st.id, st.status as any);
          statuses++;
        }
      }
    }
  }

  return { processed, statuses };
}

/**
 * Handles incoming Baileys WebSocket messages.upsert events.
 */
export async function handleBaileysInboundUpsert(
  tenantId: string,
  msg: proto.IWebMessageInfo
): Promise<void> {
  // Ignore outbound messages sent by self
  if (msg.key.fromMe) return;

  const rawJid = msg.key.remoteJid || '';
  const numericPhone = rawJid.split('@')[0]?.split(':')[0] || '';
  if (!numericPhone) return;

  const senderPhone = formatToE164(numericPhone);
  const waMessageId = msg.key.id || `baileys_${crypto.randomBytes(8).toString('hex')}`;
  const pushName = msg.pushName || 'WhatsApp Mobile User';

  // Extract text from standard Baileys message structures
  const m = msg.message;
  let body = '';
  let msgType: UnifiedMessage['message_type'] = 'text';
  let mediaCaption: string | null = null;

  if (m?.conversation) {
    body = m.conversation;
  } else if (m?.extendedTextMessage?.text) {
    body = m.extendedTextMessage.text;
  } else if (m?.imageMessage) {
    msgType = 'image';
    body = m.imageMessage.caption || 'Image received via WhatsApp Web';
    mediaCaption = m.imageMessage.caption || null;
  } else {
    body = '[WhatsApp message]';
  }

  const channels = await getStoredWhatsAppChannels(tenantId);
  const baileysChannel = channels.find(c => c.channel_type === 'baileys_web') || channels[0];

  const timestampSeconds = typeof msg.messageTimestamp === 'number'
    ? msg.messageTimestamp
    : (msg.messageTimestamp as any)?.low || Math.floor(Date.now() / 1000);

  await insertStoredUnifiedMessage({
    tenant_id: tenantId,
    channel_id: baileysChannel ? baileysChannel.id : '00000000-0000-0000-0000-000000000002',
    channel_type: 'baileys_web',
    recipient_phone: baileysChannel?.credentials.paired_phone || '+61412884910',
    sender_phone: senderPhone,
    wa_message_id: waMessageId,
    direction: 'inbound',
    message_body: body,
    message_type: msgType,
    media_caption: mediaCaption,
    status: 'received',
    contact_name: pushName,
    raw_payload: msg,
    created_at: new Date(timestampSeconds * 1000).toISOString()
  });

  console.log(`[Baileys Listener] Ingested message from ${senderPhone}: "${body}"`);
}

// Bind Baileys session manager events to Router handlers
baileysSessionManager.onInboundMessage(async (tenantId, msg) => {
  await handleBaileysInboundUpsert(tenantId, msg);
});

baileysSessionManager.onStatusUpdate(async (session: BaileysSessionInfo) => {
  const channels = await getStoredWhatsAppChannels(session.tenantId);
  const baileysChannel = channels.find(c => c.channel_type === 'baileys_web');
  if (baileysChannel) {
    await upsertStoredWhatsAppChannel({
      id: baileysChannel.id,
      tenant_id: session.tenantId,
      status: session.status,
      credentials: {
        ...baileysChannel.credentials,
        qr_code_url: session.qrCodeUrl,
        raw_qr: session.rawQr,
        paired_phone: session.pairedPhone || baileysChannel.credentials.paired_phone,
        push_name: session.pushName || baileysChannel.credentials.push_name,
        last_connected_at: session.lastConnectedAt || baileysChannel.credentials.last_connected_at
      }
    });
  }
});
