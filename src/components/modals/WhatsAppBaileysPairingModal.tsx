import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Smartphone,
  QrCode,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Wifi,
  WifiOff,
  LogOut,
  Info,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Check
} from 'lucide-react';
import {
  startBaileysSession,
  fetchBaileysStatus,
  disconnectBaileysSession,
  simulateBaileysPair,
  BaileysLiveSession
} from '../../services/whatsappService';

interface WhatsAppBaileysPairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaired?: (session: BaileysLiveSession) => void;
  tenantId?: string;
}

export const WhatsAppBaileysPairingModal: React.FC<WhatsAppBaileysPairingModalProps> = ({
  isOpen,
  onClose,
  onPaired,
  tenantId = '00000000-0000-0000-0000-000000000001'
}) => {
  const [session, setSession] = useState<BaileysLiveSession | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [qrCountdown, setQrCountdown] = useState<number>(60);
  const [pollErrorCount, setPollErrorCount] = useState(0);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const pollIntervalRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);

  // Stop polling helper
  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const stopCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  // Poll Baileys status endpoint
  const pollStatus = async () => {
    try {
      const res = await fetch(`/api/whatsapp/baileys/status?tenant_id=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.session) {
          const current: BaileysLiveSession = data.session;
          setSession(current);
          setPollErrorCount(0);

          // If connected, notify callback
          if (current.status === 'connected') {
            stopPolling();
            stopCountdown();
            if (onPaired) onPaired(current);
          }
        }
      } else {
        setPollErrorCount(prev => prev + 1);
      }
    } catch (err) {
      setPollErrorCount(prev => prev + 1);
    }
  };

  // Initialize or restart Baileys session
  const initializeSession = async (forceFresh = false) => {
    setIsInitializing(true);
    setQrCountdown(60);
    try {
      // Trigger session start via POST /api/whatsapp/baileys/start
      const res = await fetch('/api/whatsapp/baileys/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId, forceFresh })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setSession(data.session);
          if (data.session.status === 'connected' && onPaired) {
            onPaired(data.session);
          }
        }
      }
    } catch (err) {
      console.warn('[WhatsAppBaileys] Error starting session:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  // Lifecycle on modal open
  useEffect(() => {
    if (!isOpen) {
      stopPolling();
      stopCountdown();
      return;
    }

    // Initial check of current state
    fetchBaileysStatus().then(existing => {
      if (existing && existing.status === 'connected') {
        setSession(existing);
      } else {
        // Start a fresh session to get a fresh QR code
        initializeSession(false);
      }
    });

    // Start polling status every 1500ms
    stopPolling();
    pollIntervalRef.current = setInterval(pollStatus, 1500);

    // QR countdown timer (60s cycle)
    stopCountdown();
    countdownIntervalRef.current = setInterval(() => {
      setQrCountdown(prev => {
        if (prev <= 1) {
          // Auto refresh QR code when timer expires if still waiting
          initializeSession(false);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      stopPolling();
      stopCountdown();
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Simulate pairing for testing
  const handleSimulatePair = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/whatsapp/baileys/simulate-pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          phone: '+61 412 884 910',
          name: 'Solar Rep Mobile'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setSession(data.session);
          if (onPaired) onPaired(data.session);
        }
      }
    } catch (err) {
      console.error('[WhatsAppBaileys] Simulate pair error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Disconnect session
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to unpair this WhatsApp account?')) return;
    setIsDisconnecting(true);
    try {
      await fetch('/api/whatsapp/baileys/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId, clearAuth: true })
      });
      setSession(null);
      // Restart fresh session to generate new QR
      initializeSession(true);
      // Restart polling
      stopPolling();
      pollIntervalRef.current = setInterval(pollStatus, 1500);
    } catch (err) {
      console.error('[WhatsAppBaileys] Disconnect error:', err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleCopyPhone = () => {
    if (session?.pairedPhone) {
      navigator.clipboard.writeText(session.pairedPhone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  if (!isOpen) return null;

  // The QR string to render (raw string from Baileys)
  const qrString = session?.rawQr || '';
  const isConnected = session?.status === 'connected';
  const isQrReady = session?.status === 'qr_ready' && Boolean(qrString);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#0f1115] border border-slate-800 text-slate-100 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800/80 bg-[#14171f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  WhatsApp Web Pairing (Baileys)
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  isConnected
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : isQrReady
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                }`}>
                  {isConnected ? '● Connected' : isQrReady ? 'Ready to Scan' : 'Connecting'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Link your phone directly to My Solar CRM using end-to-end encrypted Multi-Device Web pairing.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          
          {/* STATE 1: ALREADY CONNECTED */}
          {isConnected ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">WhatsApp Web Paired &amp; Active</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Your WhatsApp account is securely connected. Inbound and outbound customer messages will sync in real time.
                </p>
              </div>

              {/* Paired Details Card */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 max-w-md mx-auto space-y-2 text-left">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Paired Phone Number:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-white">{session.pairedPhone || 'Unknown'}</span>
                    <button
                      type="button"
                      onClick={handleCopyPhone}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
                      title="Copy phone"
                    >
                      {copiedPhone ? <Check className="w-3 h-3 text-emerald-400" /> : <Smartphone className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {session.pushName && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Profile / Push Name:</span>
                    <span className="text-slate-200 font-semibold">{session.pushName}</span>
                  </div>
                )}

                {session.lastConnectedAt && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Connected At:</span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {new Date(session.lastConnectedAt).toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                  <span className="text-slate-400">Engine Protocol:</span>
                  <span className="text-emerald-400 font-mono text-[11px]">@whiskeysockets/baileys Multi-File Auth</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="px-4 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isDisconnecting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LogOut className="w-3.5 h-3.5" />
                  )}
                  <span>Unpair WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* STATE 2: SCANNING / GENERATING QR CODE */
            <div className="space-y-6">
              
              {/* QR Display Card */}
              <div className="p-6 rounded-2xl bg-[#14161f] border border-slate-800 flex flex-col items-center justify-center text-center space-y-4">
                
                {isQrReady ? (
                  <div className="space-y-4 flex flex-col items-center">
                    {/* QR Code Container with qrcode.react */}
                    <div className="relative p-3.5 bg-white rounded-2xl shadow-xl transition-transform hover:scale-[1.01]">
                      <QRCodeSVG
                        value={qrString}
                        size={230}
                        level="M"
                        includeMargin={false}
                        bgColor="#ffffff"
                        fgColor="#0a0d14"
                      />
                      {/* WhatsApp Mini Brand Corner Watermark */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-9 h-9 rounded-full bg-white p-1 shadow-md flex items-center justify-center">
                          <div className="w-full h-full rounded-full bg-[#25D366] flex items-center justify-center text-white">
                            <MessageSquare className="w-4 h-4 fill-white" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Countdown and Refresh */}
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
                        <span>Code refreshes in <strong className="font-mono text-emerald-400">{qrCountdown}s</strong></span>
                      </div>

                      <button
                        type="button"
                        onClick={() => initializeSession(true)}
                        disabled={isInitializing}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Force reload a new QR code"
                      >
                        <RefreshCw className={`w-3 h-3 ${isInitializing ? 'animate-spin' : ''}`} />
                        <span>Refresh Now</span>
                      </button>
                    </div>
                  </div>
                ) : isInitializing || session?.status === 'connecting' ? (
                  <div className="py-12 space-y-3">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400" />
                    <div className="text-sm font-semibold text-white">Starting Baileys WhatsApp Session...</div>
                    <p className="text-xs text-slate-400 max-w-xs">
                      Generating secure Multi-File authentication credentials and QR encryption keys.
                    </p>
                  </div>
                ) : (
                  <div className="py-10 space-y-3">
                    <Smartphone className="w-10 h-10 mx-auto text-slate-500" />
                    <div className="text-sm font-semibold text-white">QR Code Session Idle</div>
                    <p className="text-xs text-slate-400 max-w-xs">
                      Click below to generate a new WhatsApp Web pairing QR code.
                    </p>
                    <button
                      type="button"
                      onClick={() => initializeSession(true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      Generate QR Code
                    </button>
                  </div>
                )}

                {/* Error Banner if any */}
                {session?.errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-200 text-xs flex items-center gap-2 text-left">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="font-mono">{session.errorMessage}</span>
                  </div>
                )}
              </div>

              {/* Instructions Guide */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>How to scan with WhatsApp:</span>
                </div>

                <ol className="text-xs text-slate-300 space-y-2 pl-1">
                  <li className="flex items-start gap-2">
                    <span className="w-4.5 h-4.5 rounded-full bg-slate-800 text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <span>Open <strong>WhatsApp</strong> on your mobile phone.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4.5 h-4.5 rounded-full bg-slate-800 text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Tap <strong>Settings</strong> (iOS) or <strong>Menu ⋮</strong> (Android) and select <strong>Linked Devices</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4.5 h-4.5 rounded-full bg-slate-800 text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Tap <strong>Link a Device</strong> and point your camera at this QR code.
                    </span>
                  </li>
                </ol>
              </div>

              {/* Sandbox Simulation Tool */}
              <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="font-semibold text-blue-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>Testing in Sandbox without physical phone?</span>
                  </div>
                  <p className="text-[11px] text-blue-300/80">
                    Instantly simulate pairing with a mock technician mobile number for workflow testing.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSimulatePair}
                  disabled={isSimulating}
                  className="px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  {isSimulating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                  )}
                  <span>Simulate Phone Scan</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-[#14171f] flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encrypted WhatsApp Web Multi-Device Protocol</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            {isConnected ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};
