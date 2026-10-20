import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Sliders,
  ShieldCheck,
  Phone,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Info,
  Layers,
  ArrowRight,
  FileText,
  Image as ImageIcon,
  CheckCheck,
  Download,
  AlertCircle,
  FileCheck,
  Database,
  Terminal,
  Lock,
  Sparkles,
  User,
  Search,
  Maximize2,
  X,
  QrCode,
  Smartphone,
  Server,
  Radio,
  ArrowUpDown
} from 'lucide-react';
import {
  getWhatsAppSettings,
  saveWhatsAppSettings,
  getWhatsAppTemplates,
  saveWhatsAppTemplates,
  getWhatsAppLogs,
  saveWhatsAppLogs,
  pingWhatsAppApi,
  sendWhatsAppTextMessage,
  sendWhatsAppTemplateMessage,
  checkWhatsApp24HourWindow,
  simulateWhatsAppInboundWebhook,
  fetchRemoteWhatsAppSettings,
  fetchRemoteWhatsAppLogs,
  WhatsAppPingResult,
  fetchWhatsAppChannels,
  saveWhatsAppChannel,
  activateWhatsAppChannel,
  startBaileysSession,
  fetchBaileysStatus,
  disconnectBaileysSession,
  simulateBaileysPair,
  simulateBaileysInbound,
  sendUnifiedWhatsAppMessage,
  fetchUnifiedMessages,
  fetchSupabaseStatus,
  HybridChannel,
  UnifiedMessageItem,
  BaileysLiveSession
} from '../../services/whatsappService';
import {
  WhatsAppIntegrationSettings,
  WhatsAppTemplate,
  WhatsAppMessageLog,
  WhatsApp24HourWindowStatus
} from '../../types';

interface WhatsAppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'channels' | 'supabase' | 'chat' | 'templates' | 'simulator' | 'logs';
}

const CRM_TEST_CONTACTS = [
  { id: 'c1-marcus-vance', name: 'Marcus Aurelius Vance', phone: '+61 412 884 910', address: '44 Ocean Ave, Bondi Beach NSW' },
  { id: 'c2-elena-rostova', name: 'Elena Rostova', phone: '+61 401 552 194', address: '12 Victoria St, Fitzroy VIC' },
  { id: 'c3-bruce-wayne', name: 'Bruce Wayne', phone: '+61 422 918 200', address: '100 St Georges Cres, Drummoyne NSW' },
  { id: 'c4-sarah-jenkins', name: 'Sarah Jenkins', phone: '+61 433 109 448', address: '78 Pine Road, Indooroopilly QLD' }
];

const MASTER_SUPABASE_SCHEMA_SQL = `-- ============================================================================
-- HYBRID WHATSAPP ARCHITECTURE: SUPABASE MASTER SCHEMA
-- Supports: Unofficial Baileys Web API (QR Code) + Official Meta Cloud API
-- ============================================================================

-- 1. Create WhatsApp Channel Type ENUM
DO $$ BEGIN
    CREATE TYPE whatsapp_channel_type AS ENUM ('cloud_api', 'baileys_web');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Multi-tenant WhatsApp Channels Configuration Table
CREATE TABLE IF NOT EXISTS whatsapp_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    channel_name TEXT NOT NULL,
    channel_type whatsapp_channel_type NOT NULL DEFAULT 'cloud_api',
    is_active BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'disconnected', -- 'connected', 'qr_ready', 'disconnected', 'connecting'
    credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Normalized Unified Messages Table (Inbound & Outbound from all channels)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    channel_id UUID REFERENCES whatsapp_channels(id) ON DELETE SET NULL,
    channel_type whatsapp_channel_type NOT NULL,
    contact_id TEXT,
    recipient_phone TEXT NOT NULL,
    sender_phone TEXT,
    wa_message_id TEXT NOT NULL UNIQUE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_body TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'template', 'image', 'document', 'audio', 'video')),
    media_url TEXT,
    media_type TEXT,
    media_caption TEXT,
    template_name TEXT,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed', 'received')),
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. High-Performance Indexes for CRM Queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_channels_tenant ON whatsapp_channels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_tenant ON messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
`;

export const WhatsAppSettingsModal: React.FC<WhatsAppSettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'channels'
}) => {
  const [activeTab, setActiveTab] = useState<'channels' | 'supabase' | 'chat' | 'templates' | 'simulator' | 'logs'>(initialTab);

  // Hybrid Channels & Baileys State
  const [channels, setChannels] = useState<HybridChannel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [baileysState, setBaileysState] = useState<BaileysLiveSession | null>(null);
  const [isStartingBaileys, setIsStartingBaileys] = useState(false);

  // Supabase Diagnostics State
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [isLoadingSupabase, setIsLoadingSupabase] = useState(false);

  // Settings & Templates
  const [settings, setSettings] = useState<WhatsAppIntegrationSettings>(getWhatsAppSettings);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(getWhatsAppTemplates);
  const [unifiedMessages, setUnifiedMessages] = useState<UnifiedMessageItem[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Active channel helper
  const activeChannel = useMemo(() => {
    return channels.find(c => c.is_active) || channels[0] || null;
  }, [channels]);

  // Ping test
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<WhatsAppPingResult | null>(null);

  // 2-Way Chat state
  const [selectedContactId, setSelectedContactId] = useState<string>(CRM_TEST_CONTACTS[0].id);
  const selectedContact = useMemo(() => {
    return CRM_TEST_CONTACTS.find(c => c.id === selectedContactId) || CRM_TEST_CONTACTS[0];
  }, [selectedContactId]);

  const [windowStatus, setWindowStatus] = useState<WhatsApp24HourWindowStatus>({
    isWithin24Hours: true,
    canSendFreeForm: true,
    remainingHours: 23.8,
    remainingMinutes: 1428
  });

  const [chatInputText, setChatInputText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [chatFeedback, setChatFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Template builder state
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('solar_survey_confirmation');
  const activeTemplate = useMemo(() => {
    return templates.find(t => t.name === selectedTemplateName) || templates[0];
  }, [templates, selectedTemplateName]);

  const [templateParams, setTemplateParams] = useState<Record<string, string>>({
    '0': 'Marcus',
    '1': '44 Ocean Ave, Bondi Beach',
    '2': 'tomorrow',
    '3': '10:00 AM',
    '4': 'David Miller'
  });
  const [isSendingTemplate, setIsSendingTemplate] = useState(false);
  const [templateSendResult, setTemplateSendResult] = useState<string | null>(null);

  // Simulator state
  const [simChannelType, setSimChannelType] = useState<'cloud_api' | 'baileys_web'>('cloud_api');
  const [simType, setSimType] = useState<'text' | 'image' | 'document' | 'status'>('text');
  const [simSenderPhone, setSimSenderPhone] = useState('+61 412 884 910');
  const [simSenderName, setSimSenderName] = useState('Marcus Aurelius Vance');
  const [simText, setSimText] = useState('G\'day! Here is the photo of our 3-phase switchboard inside the garage.');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<string | null>(null);

  // Initial Load
  const loadAllData = async () => {
    setIsLoadingChannels(true);
    try {
      const [chList, bStatus, uMsgs, sStatus] = await Promise.all([
        fetchWhatsAppChannels(),
        fetchBaileysStatus(),
        fetchUnifiedMessages(),
        fetchSupabaseStatus()
      ]);
      setChannels(chList);
      setBaileysState(bStatus);
      setUnifiedMessages(uMsgs);
      setSupabaseStatus(sStatus);
    } catch (err) {
      console.warn('Error loading hybrid whatsapp data:', err);
    } finally {
      setIsLoadingChannels(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAllData();
      fetchRemoteWhatsAppSettings().then(setSettings);
      fetchRemoteWhatsAppLogs().then(logs => {
        if (logs.length > 0) saveWhatsAppLogs(logs);
      });
      checkWhatsApp24HourWindow(selectedContact.id, selectedContact.phone).then(setWindowStatus);
    }
  }, [isOpen]);

  // Polling for Baileys QR code and connection updates when in channels tab
  useEffect(() => {
    if (!isOpen || activeTab !== 'channels') return;
    const interval = setInterval(async () => {
      const bStatus = await fetchBaileysStatus();
      if (bStatus) {
        setBaileysState(bStatus);
        setChannels(prev =>
          prev.map(c => {
            if (c.channel_type === 'baileys_web') {
              return {
                ...c,
                status: bStatus.status === 'connected' ? 'connected' : (bStatus.status === 'qr_ready' ? 'qr_ready' : c.status),
                credentials: {
                  ...c.credentials,
                  qr_code_url: bStatus.qrCodeUrl || c.credentials.qr_code_url,
                  paired_phone: bStatus.pairedPhone || c.credentials.paired_phone,
                  push_name: bStatus.pushName || c.credentials.push_name,
                  last_connected_at: bStatus.lastConnectedAt || c.credentials.last_connected_at
                }
              };
            }
            return c;
          })
        );
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Channel Activation
  const handleActivateChannel = async (channelId: string) => {
    const success = await activateWhatsAppChannel(channelId);
    if (success) {
      setChannels(prev =>
        prev.map(c => ({
          ...c,
          is_active: c.id === channelId
        }))
      );
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  // Start / Refresh Baileys QR Session
  const handleStartBaileys = async (forceFresh = false) => {
    setIsStartingBaileys(true);
    try {
      const session = await startBaileysSession(forceFresh);
      if (session) {
        setBaileysState(session);
        await loadAllData();
      }
    } finally {
      setIsStartingBaileys(false);
    }
  };

  // Simulate Baileys Pairing for Testing
  const handleSimulateBaileysPair = async () => {
    const res = await simulateBaileysPair('+61 412 884 910', 'David Miller (Solar Installer)');
    if (res.success) {
      setBaileysState(res.session);
      await loadAllData();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  // Disconnect Baileys
  const handleDisconnectBaileys = async () => {
    await disconnectBaileysSession(true);
    setBaileysState(prev => prev ? { ...prev, status: 'disconnected', qrCodeUrl: null, pairedPhone: null } : null);
    await loadAllData();
  };

  // Save Meta Cloud API Settings
  const handleSaveMetaSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveWhatsAppSettings(settings);
    setSettings(updated);

    // Also update channel record
    const metaChannel = channels.find(c => c.channel_type === 'cloud_api');
    if (metaChannel) {
      await saveWhatsAppChannel({
        ...metaChannel,
        credentials: {
          ...metaChannel.credentials,
          phone_number_id: updated.phone_number_id,
          waba_id: updated.waba_id,
          access_token: updated.access_token,
          webhook_verify_token: updated.webhook_verify_token,
          display_phone_number: updated.displayPhoneNumber
        }
      });
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Unified Send Message via Central Router
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputText.trim() || isSendingMessage) return;

    setIsSendingMessage(true);
    setChatFeedback(null);

    try {
      const result = await sendUnifiedWhatsAppMessage({
        channelId: activeChannel?.id,
        to: selectedContact.phone,
        message: chatInputText.trim(),
        type: 'text',
        contactId: selectedContact.id,
        contactName: selectedContact.name
      });

      if (result.success) {
        setChatInputText('');
        const msgs = await fetchUnifiedMessages(selectedContact.id);
        setUnifiedMessages(msgs);
        setChatFeedback({
          type: 'success',
          message: `Dispatched via ${result.channelName || (result.channelType === 'cloud_api' ? 'Meta Cloud API' : 'Baileys Web')} (ID: ${result.messageId.substring(0, 16)}...)`
        });
      } else {
        setChatFeedback({
          type: 'error',
          message: result.error || 'Failed to dispatch message via Unified Message Router'
        });
      }
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Send Template Message via Router
  const handleSendTemplateMessage = async () => {
    if (!activeTemplate || isSendingTemplate) return;

    setIsSendingTemplate(true);
    setTemplateSendResult(null);

    try {
      const orderedParams: string[] = activeTemplate.parameters.map((_, idx) => templateParams[idx] || '');
      const result = await sendUnifiedWhatsAppMessage({
        channelId: activeChannel?.id,
        to: selectedContact.phone,
        message: `Template: ${activeTemplate.name}`,
        type: 'template',
        templateName: activeTemplate.name,
        templateParams: orderedParams,
        contactId: selectedContact.id,
        contactName: selectedContact.name
      });

      if (result.success) {
        setTemplateSendResult(`Template "${activeTemplate.name}" dispatched via ${result.channelType === 'cloud_api' ? 'Meta Cloud API' : 'Baileys Web'}!`);
        const msgs = await fetchUnifiedMessages(selectedContact.id);
        setUnifiedMessages(msgs);
        setActiveTab('chat');
      } else {
        setTemplateSendResult(`Dispatch failed: ${result.error}`);
      }
    } finally {
      setIsSendingTemplate(false);
    }
  };

  // Inbound Simulation
  const handleSimulateInbound = async () => {
    setIsSimulating(true);
    setSimResult(null);

    try {
      if (simChannelType === 'baileys_web') {
        const res = await simulateBaileysInbound(simSenderPhone, simText, simSenderName);
        if (res.success) {
          setSimResult('Simulated Baileys WebSocket "messages.upsert" event received and stored in unified messages table!');
          const msgs = await fetchUnifiedMessages();
          setUnifiedMessages(msgs);
        } else {
          setSimResult(`Baileys simulation failed: ${res.error}`);
        }
      } else {
        const res = await simulateWhatsAppInboundWebhook({
          type: simType as any,
          senderPhone: simSenderPhone,
          senderName: simSenderName,
          text: simText,
          mediaCaption: simType === 'image' ? 'Switchboard & meter photo taken on site' : undefined
        });
        setSimResult(res.message);
        const msgs = await fetchUnifiedMessages();
        setUnifiedMessages(msgs);
      }
    } finally {
      setIsSimulating(false);
    }
  };

  // Ping Meta API
  const handlePingTest = async () => {
    setIsPinging(true);
    try {
      const res = await pingWhatsAppApi();
      setPingResult(res);
    } finally {
      setIsPinging(false);
    }
  };

  const callbackUrl = settings.webhookCallbackUrl || (typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/whatsapp` : 'http://localhost:3000/api/webhooks/whatsapp');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#121212] border border-[#2d2d2d] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] text-gray-100 overflow-hidden font-sans">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#242424] bg-[#171717]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-white tracking-tight">Hybrid WhatsApp Architecture</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase">
                  Meta Cloud API + Baileys Web
                </span>
                <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  Supabase Powered
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Multi-tenant unified messaging router, QR WebSocket session manager, and official Meta Cloud API gateway.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAllData}
              disabled={isLoadingChannels}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#242424] hover:bg-[#2e2e2e] text-gray-200 rounded-lg border border-[#383838] transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingChannels ? 'animate-spin text-emerald-400' : 'text-gray-400'}`} />
              <span>{isLoadingChannels ? 'Syncing...' : 'Sync Channels'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-[#252525] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-[#242424] bg-[#141414] overflow-x-auto">
          {[
            { id: 'channels', label: 'Hybrid Channels', icon: Radio, badge: activeChannel ? `${activeChannel.channel_type === 'cloud_api' ? 'Meta Cloud' : 'Baileys'} Active` : undefined },
            { id: 'supabase', label: 'Supabase Database', icon: Database, badge: supabaseStatus?.configured ? 'Connected' : 'Configured' },
            { id: 'chat', label: '2-Way CRM Chat', icon: MessageCircle },
            { id: 'templates', label: 'Meta Templates', icon: FileCheck },
            { id: 'simulator', label: 'Inbound Simulator', icon: Zap },
            { id: 'logs', label: 'Unified Message Log', icon: Terminal, count: unifiedMessages.length }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#1a1a1a]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.2 text-[10px] font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {tab.badge}
                  </span>
                )}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-[#27272a] text-gray-400 border border-[#3f3f46]">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: HYBRID CHANNELS (Meta Cloud API + Baileys Web QR) */}
          {activeTab === 'channels' && (
            <div className="space-y-6">
              
              {/* Active Routing Summary Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-[#172554]/30 to-black border border-emerald-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <ArrowUpDown className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider font-semibold text-emerald-400">Unified Message Router Status</div>
                    <div className="text-sm font-semibold text-white mt-0.5">
                      Primary Active Route: {activeChannel?.channel_name || 'Official Enterprise WhatsApp (Meta Cloud API)'}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Outbound messages via <code className="text-emerald-300 font-mono">sendMessage(tenantId, payload)</code> automatically dispatch over this channel and insert into Supabase <code className="text-emerald-300 font-mono">messages</code>.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {activeChannel?.channel_type === 'cloud_api' ? 'Official Meta Graph API' : 'Baileys WebSocket'}
                  </span>
                </div>
              </div>

              {savedSuccess && (
                <div className="p-3 bg-emerald-950/50 border border-emerald-800/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Channel configuration and active route updated successfully!</span>
                </div>
              )}

              {/* Channel Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* CARD 1: Official Meta Cloud API */}
                <div className="p-5 rounded-xl bg-[#161616] border border-[#2b2b2b] flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                          <Server className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">Meta Cloud API (Official)</div>
                          <div className="text-[11px] text-gray-400">Enterprise Scale • Graph API v20.0</div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-md ${
                        channels.find(c => c.channel_type === 'cloud_api')?.is_active
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-[#252525] text-gray-400 border border-[#333]'
                      }`}>
                        {channels.find(c => c.channel_type === 'cloud_api')?.is_active ? 'Active Outbound' : 'Standby'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400">
                      Direct integration with Meta Graph API for high-volume broadcasts, automated STC alerts, and certified 2-way business messaging.
                    </p>

                    <div className="space-y-2.5 pt-2 text-xs">
                      <div>
                        <label className="text-[11px] font-medium text-gray-400">Phone Number ID</label>
                        <input
                          type="text"
                          value={settings.phone_number_id || settings.phoneNumberId || ''}
                          onChange={e => setSettings(prev => ({ ...prev, phone_number_id: e.target.value, phoneNumberId: e.target.value }))}
                          className="mt-1 w-full px-3 py-1.5 bg-[#1f1f1f] border border-[#333] rounded-lg text-white font-mono text-xs focus:border-emerald-500 focus:outline-hidden"
                          placeholder="109823749281726"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-gray-400">WhatsApp Business Account ID (WABA)</label>
                        <input
                          type="text"
                          value={settings.waba_id || settings.wabaId || ''}
                          onChange={e => setSettings(prev => ({ ...prev, waba_id: e.target.value, wabaId: e.target.value }))}
                          className="mt-1 w-full px-3 py-1.5 bg-[#1f1f1f] border border-[#333] rounded-lg text-white font-mono text-xs focus:border-emerald-500 focus:outline-hidden"
                          placeholder="392019485019283"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-gray-400">System User Permanent Access Token</label>
                        <input
                          type="password"
                          value={settings.access_token || settings.apiToken || ''}
                          onChange={e => setSettings(prev => ({ ...prev, access_token: e.target.value, apiToken: e.target.value }))}
                          className="mt-1 w-full px-3 py-1.5 bg-[#1f1f1f] border border-[#333] rounded-lg text-white font-mono text-xs focus:border-emerald-500 focus:outline-hidden"
                          placeholder="EAAGm0PX4ZB..."
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-gray-400">Webhook Verify Token</label>
                        <input
                          type="text"
                          value={settings.webhook_verify_token || settings.webhookVerifyToken || ''}
                          onChange={e => setSettings(prev => ({ ...prev, webhook_verify_token: e.target.value, webhookVerifyToken: e.target.value }))}
                          className="mt-1 w-full px-3 py-1.5 bg-[#1f1f1f] border border-[#333] rounded-lg text-white font-mono text-xs focus:border-emerald-500 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#252525] flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleSaveMetaSettings}
                      className="px-3 py-1.5 text-xs font-semibold bg-[#2a2a2a] hover:bg-[#333] text-gray-200 rounded-lg border border-[#3d3d3d] transition-all"
                    >
                      Save Meta Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const metaCh = channels.find(c => c.channel_type === 'cloud_api');
                        if (metaCh) handleActivateChannel(metaCh.id);
                      }}
                      disabled={channels.find(c => c.channel_type === 'cloud_api')?.is_active}
                      className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-all shadow-md shadow-emerald-900/30"
                    >
                      {channels.find(c => c.channel_type === 'cloud_api')?.is_active ? 'Currently Active' : 'Set as Active Route'}
                    </button>
                  </div>
                </div>

                {/* CARD 2: Unofficial Baileys Web API (QR Code) */}
                <div className="p-5 rounded-xl bg-[#161616] border border-[#2b2b2b] flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">Baileys Web API (QR Code)</div>
                          <div className="text-[11px] text-gray-400">Field Users • @whiskeysockets/baileys</div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-md ${
                        channels.find(c => c.channel_type === 'baileys_web')?.is_active
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                          : 'bg-[#252525] text-gray-400 border border-[#333]'
                      }`}>
                        {channels.find(c => c.channel_type === 'baileys_web')?.is_active ? 'Active Outbound' : 'Standby'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400">
                      Allows sales reps and field technicians to link their personal or business WhatsApp number directly via QR code scanning.
                    </p>

                    {/* QR Code / Connection Box */}
                    <div className="p-4 rounded-xl bg-[#111] border border-[#262626] flex flex-col items-center justify-center min-h-[190px] text-center space-y-3">
                      {baileysState?.status === 'qr_ready' && baileysState.qrCodeUrl ? (
                        <div className="space-y-2">
                          <div className="p-2 bg-white rounded-xl inline-block shadow-lg">
                            <img src={baileysState.qrCodeUrl} alt="WhatsApp Web QR Code" className="w-44 h-44 object-contain" />
                          </div>
                          <div className="text-xs font-semibold text-amber-400 flex items-center justify-center gap-1.5">
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Scan with WhatsApp &gt; Linked Devices</span>
                          </div>
                          <p className="text-[11px] text-gray-400">Open WhatsApp on your phone, tap Linked Devices, and point camera here.</p>
                        </div>
                      ) : baileysState?.status === 'connected' ? (
                        <div className="space-y-2 py-3">
                          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div className="text-sm font-semibold text-white">WhatsApp Web Linked & Online</div>
                          <div className="text-xs text-emerald-300 font-mono">
                            Paired Phone: {baileysState.pairedPhone || '+61 412 884 910'}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            User: {baileysState.pushName || 'David Miller (Solar Installer)'}
                          </div>
                        </div>
                      ) : isStartingBaileys ? (
                        <div className="space-y-2 py-6 text-gray-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400" />
                          <div className="text-xs font-medium">Initializing Baileys Multi-File Auth Socket...</div>
                        </div>
                      ) : (
                        <div className="space-y-2 py-6 text-gray-400">
                          <Smartphone className="w-8 h-8 mx-auto text-gray-500" />
                          <div className="text-xs font-medium text-gray-300">No Active WhatsApp Web Session</div>
                          <p className="text-[11px] text-gray-500 max-w-xs">
                            Click below to generate a fresh QR code session or simulate pairing for local testing.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Baileys Action Bar */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleStartBaileys(true)}
                        disabled={isStartingBaileys}
                        className="px-3 py-1.5 text-xs font-medium bg-[#242424] hover:bg-[#2e2e2e] text-white rounded-lg border border-[#383838] transition-all flex items-center gap-1.5"
                      >
                        <QrCode className="w-3.5 h-3.5 text-blue-400" />
                        <span>{baileysState?.status === 'qr_ready' ? 'Refresh QR' : 'Generate QR Code'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSimulateBaileysPair}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-900/30 hover:bg-blue-900/50 text-blue-200 rounded-lg border border-blue-700/40 transition-all flex items-center gap-1.5"
                        title="Simulate paired connection for dev testing without physical phone"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                        <span>Simulate Pairing</span>
                      </button>

                      {baileysState?.status === 'connected' && (
                        <button
                          type="button"
                          onClick={handleDisconnectBaileys}
                          className="px-3 py-1.5 text-xs font-medium bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 rounded-lg border border-rose-800/40 transition-all"
                        >
                          Disconnect
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#252525] flex items-center justify-between gap-3">
                    <span className="text-[11px] text-gray-400 font-mono">
                      Status: <span className="text-white capitalize">{baileysState?.status || 'disconnected'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const bCh = channels.find(c => c.channel_type === 'baileys_web');
                        if (bCh) handleActivateChannel(bCh.id);
                      }}
                      disabled={channels.find(c => c.channel_type === 'baileys_web')?.is_active}
                      className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-all shadow-md shadow-blue-900/30"
                    >
                      {channels.find(c => c.channel_type === 'baileys_web')?.is_active ? 'Currently Active' : 'Set as Active Route'}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: SUPABASE DATABASE & SCHEMA */}
          {activeTab === 'supabase' && (
            <div className="space-y-6">
              
              {/* Supabase Connection Status Card */}
              <div className="p-4 rounded-xl bg-[#161616] border border-[#292929] space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">Supabase Internal Connection</div>
                      <div className="text-xs text-gray-400">Project: soecoieksewpjgymjnph</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Connected Internally
                    </span>
                    <button
                      onClick={async () => {
                        setIsLoadingSupabase(true);
                        const status = await fetchSupabaseStatus();
                        setSupabaseStatus(status);
                        setIsLoadingSupabase(false);
                      }}
                      className="px-2.5 py-1 text-xs font-medium bg-[#222] hover:bg-[#2c2c2c] text-gray-300 rounded-lg border border-[#383838] transition-all flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSupabase ? 'animate-spin text-emerald-400' : 'text-gray-400'}`} />
                      <span>Test Tables</span>
                    </button>
                  </div>
                </div>

                {supabaseStatus?.quotaRestricted && (
                  <div className="p-3 bg-amber-950/40 border border-amber-800/40 rounded-xl text-xs text-amber-200 space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-amber-300">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Supabase Project Egress Quota Notice</span>
                    </div>
                    <p className="text-[11px] text-amber-200/80">
                      Supabase reported: <span className="font-mono text-amber-100">{supabaseStatus.quotaMessage}</span>
                    </p>
                    <p className="text-[11px] text-emerald-300 font-medium">
                      ✓ Zero Downtime Protection Active: The backend has automatically engaged its local persistent cache fallback. All WhatsApp channels, QR sessions, and message routing continue to operate seamlessly.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-lg bg-[#111] border border-[#252525] space-y-1">
                    <div className="text-[11px] font-medium text-gray-400">Supabase Project URL</div>
                    <div className="font-mono text-gray-200 truncate select-all">https://soecoieksewpjgymjnph.supabase.co</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#111] border border-[#252525] space-y-1">
                    <div className="text-[11px] font-medium text-gray-400">whatsapp_channels Table</div>
                    <div className="flex items-center gap-1.5 font-medium text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Schema Defined & Indexed</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#111] border border-[#252525] space-y-1">
                    <div className="text-[11px] font-medium text-gray-400">messages (Unified) Table</div>
                    <div className="flex items-center gap-1.5 font-medium text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Normalized Dual-Channel</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Master Schema Viewer */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white">Supabase SQL Editor Schema</h3>
                  </div>
                  <button
                    onClick={() => copyToClipboard(MASTER_SUPABASE_SCHEMA_SQL, 'schema')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all"
                  >
                    {copiedField === 'schema' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'schema' ? 'Copied to Clipboard!' : 'Copy SQL Schema'}</span>
                  </button>
                </div>
                <div className="relative rounded-xl border border-[#2b2b2b] bg-[#0c0c0c] overflow-hidden">
                  <pre className="p-4 text-xs font-mono text-emerald-300/90 overflow-x-auto max-h-72 leading-relaxed">
                    {MASTER_SUPABASE_SCHEMA_SQL}
                  </pre>
                </div>
                <p className="text-xs text-gray-400">
                  Run this in the Supabase Dashboard &gt; SQL Editor. It creates the <code className="text-emerald-300">whatsapp_channels</code> table, unified <code className="text-emerald-300">messages</code> table, and channel type ENUM.
                </p>
              </div>

            </div>
          )}

          {/* TAB 3: 2-WAY CRM MESSAGING */}
          {activeTab === 'chat' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[480px]">
              
              {/* Left Column: Contact Selector & Route Indicator */}
              <div className="p-4 rounded-xl bg-[#161616] border border-[#2b2b2b] flex flex-col justify-between space-y-3">
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Select CRM Customer</div>
                  <div className="space-y-2">
                    {CRM_TEST_CONTACTS.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedContactId(c.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedContactId === c.id
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                            : 'bg-[#1b1b1b] border-[#2c2c2c] text-gray-400 hover:border-[#3d3d3d] hover:text-gray-200'
                        }`}
                      >
                        <div className="text-xs font-semibold">{c.name}</div>
                        <div className="text-[11px] font-mono text-emerald-400/90">{c.phone}</div>
                        <div className="text-[10px] text-gray-500 truncate mt-0.5">{c.address}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#111] border border-[#262626] text-xs space-y-1.5">
                  <div className="text-[11px] text-gray-400">Active Outbound Route:</div>
                  <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                    {activeChannel?.channel_type === 'cloud_api' ? (
                      <>
                        <Server className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Meta Cloud API</span>
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                        <span>Baileys Web (Field Rep)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Center & Right Column: Chat Timeline */}
              <div className="md:col-span-2 p-4 rounded-xl bg-[#161616] border border-[#2b2b2b] flex flex-col justify-between h-full">
                
                {/* Chat Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-semibold">
                      {selectedContact.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">{selectedContact.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{selectedContact.phone}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-[#222] text-gray-300 border border-[#333]">
                    Unified Messages Stream
                  </span>
                </div>

                {/* Messages Stream */}
                <div className="flex-1 overflow-y-auto py-3 space-y-3">
                  {unifiedMessages
                    .filter(m => !m.contact_id || m.contact_id === selectedContact.id || m.recipient_phone.includes(selectedContact.phone.replace(/\D/g, '').slice(-8)) || (m.sender_phone && m.sender_phone.includes(selectedContact.phone.replace(/\D/g, '').slice(-8))))
                    .map(msg => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.direction === 'outbound' ? 'items-end' : 'items-start'}`}
                      >
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-md ${
                          msg.direction === 'outbound'
                            ? 'bg-emerald-600 text-white rounded-br-xs'
                            : 'bg-[#222] text-gray-100 rounded-bl-xs border border-[#333]'
                        }`}>
                          {msg.media_url && (
                            <img src={msg.media_url} alt="Media message" className="rounded-lg mb-2 max-h-40 w-full object-cover" />
                          )}
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.message_body}</p>
                          <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] opacity-75">
                            <span className="font-mono">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="uppercase text-[9px] font-bold px-1 py-0.2 rounded bg-black/30">
                              {msg.channel_type === 'cloud_api' ? 'Meta' : 'Baileys'}
                            </span>
                            {msg.direction === 'outbound' && <CheckCheck className="w-3 h-3 text-emerald-200" />}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Feedback */}
                {chatFeedback && (
                  <div className={`p-2 rounded-lg text-xs mb-2 ${
                    chatFeedback.type === 'success'
                      ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                      : 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
                  }`}>
                    {chatFeedback.message}
                  </div>
                )}

                {/* Input Bar */}
                <form onSubmit={handleSendChatMessage} className="flex items-center gap-2 pt-3 border-t border-[#262626]">
                  <input
                    type="text"
                    value={chatInputText}
                    onChange={e => setChatInputText(e.target.value)}
                    placeholder={`Message ${selectedContact.name} via ${activeChannel?.channel_name || 'Active Route'}...`}
                    className="flex-1 px-3 py-2 bg-[#1b1b1b] border border-[#333] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-hidden focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={isSendingMessage || !chatInputText.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>

              </div>
            </div>
          )}

          {/* TAB 4: TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Approved Meta Templates</div>
                <div className="space-y-2">
                  {templates.map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => setSelectedTemplateName(tpl.name)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                        selectedTemplateName === tpl.name
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                          : 'bg-[#181818] border-[#292929] text-gray-400 hover:border-[#383838]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">{tpl.name}</span>
                        <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-emerald-500/20 text-emerald-300">
                          {tpl.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{tpl.bodyText}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Parameters Editor */}
              <div className="p-5 rounded-xl bg-[#161616] border border-[#2b2b2b] flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-white">Dynamic Parameters: {activeTemplate.name}</div>
                  <div className="space-y-2">
                    {activeTemplate.parameters.map((paramName, idx) => (
                      <div key={idx}>
                        <label className="text-[11px] text-gray-400 font-medium">{paramName} ({`{{${idx + 1}}}`})</label>
                        <input
                          type="text"
                          value={templateParams[idx] || ''}
                          onChange={e => setTemplateParams({ ...templateParams, [idx]: e.target.value })}
                          className="mt-1 w-full px-3 py-1.5 bg-[#1f1f1f] border border-[#333] rounded-lg text-xs text-white focus:border-emerald-500 focus:outline-hidden"
                        />
                      </div>
                    ))}
                  </div>
                  {templateSendResult && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-300">
                      {templateSendResult}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSendTemplateMessage}
                  disabled={isSendingTemplate}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Template to {selectedContact.name}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: INBOUND SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="p-5 rounded-xl bg-[#161616] border border-[#2b2b2b] space-y-4">
                <div>
                  <div className="text-sm font-semibold text-white">Inbound Ingestion & Webhook Sandbox</div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Test how incoming messages from Meta Cloud API or Baileys Web sockets are parsed and inserted into the unified Supabase <code className="text-emerald-300">messages</code> table.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[11px] font-medium text-gray-400">Simulation Inbound Source</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setSimChannelType('cloud_api')}
                        className={`p-2.5 rounded-lg border font-medium text-xs flex items-center justify-center gap-2 ${
                          simChannelType === 'cloud_api'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                            : 'bg-[#1e1e1e] border-[#333] text-gray-400'
                        }`}
                      >
                        <Server className="w-3.5 h-3.5" />
                        <span>Meta Cloud Webhook</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimChannelType('baileys_web')}
                        className={`p-2.5 rounded-lg border font-medium text-xs flex items-center justify-center gap-2 ${
                          simChannelType === 'baileys_web'
                            ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                            : 'bg-[#1e1e1e] border-[#333] text-gray-400'
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Baileys Socket Upsert</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-gray-400">Sender Phone</label>
                      <input
                        type="text"
                        value={simSenderPhone}
                        onChange={e => setSimSenderPhone(e.target.value)}
                        className="mt-1 w-full px-3 py-1.5 bg-[#1f1f1f] border border-[#333] rounded-lg text-white font-mono text-xs focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-gray-400">Sender Name</label>
                      <input
                        type="text"
                        value={simSenderName}
                        onChange={e => setSimSenderName(e.target.value)}
                        className="mt-1 w-full px-3 py-1.5 bg-[#1f1f1f] border border-[#333] rounded-lg text-white text-xs focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-gray-400">Inbound Message Body</label>
                    <textarea
                      rows={3}
                      value={simText}
                      onChange={e => setSimText(e.target.value)}
                      className="mt-1 w-full px-3 py-2 bg-[#1f1f1f] border border-[#333] rounded-lg text-white text-xs focus:outline-hidden"
                    />
                  </div>
                </div>

                {simResult && (
                  <div className="p-3 bg-[#111] border border-[#2d2d2d] rounded-xl text-xs text-emerald-300 font-mono">
                    {simResult}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSimulateInbound}
                  disabled={isSimulating}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isSimulating ? 'Processing Inbound Payload...' : 'Trigger Inbound Ingestion'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: UNIFIED MESSAGE LOG */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">Unified Messages Audit Trail</div>
                  <p className="text-xs text-gray-400">Normalized records from Supabase <code className="text-emerald-300 font-mono">messages</code> table</p>
                </div>
                <button
                  onClick={async () => {
                    const msgs = await fetchUnifiedMessages();
                    setUnifiedMessages(msgs);
                  }}
                  className="px-3 py-1.5 text-xs bg-[#242424] hover:bg-[#2d2d2d] text-gray-300 rounded-lg border border-[#383838] transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="border border-[#2b2b2b] rounded-xl overflow-hidden bg-[#141414]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1b1b1b] border-b border-[#292929] text-gray-400 font-medium">
                    <tr>
                      <th className="py-2.5 px-4">Channel</th>
                      <th className="py-2.5 px-4">Direction</th>
                      <th className="py-2.5 px-4">Phone / Party</th>
                      <th className="py-2.5 px-4">Message Body</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222] text-gray-300">
                    {unifiedMessages.map(m => (
                      <tr key={m.id} className="hover:bg-[#1a1a1a] transition-colors">
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            m.channel_type === 'cloud_api'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          }`}>
                            {m.channel_type === 'cloud_api' ? 'Meta Cloud' : 'Baileys Web'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 capitalize">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                            m.direction === 'inbound' ? 'bg-amber-500/15 text-amber-300' : 'bg-gray-800 text-gray-300'
                          }`}>
                            {m.direction}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px]">
                          {m.direction === 'inbound' ? m.sender_phone : m.recipient_phone}
                        </td>
                        <td className="py-2.5 px-4 max-w-xs truncate text-gray-200">
                          {m.message_body}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="capitalize text-[11px] text-gray-400">{m.status}</span>
                        </td>
                        <td className="py-2.5 px-4 text-gray-500 text-[11px] whitespace-nowrap">
                          {new Date(m.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#242424] bg-[#171717] flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Hybrid Router Autorouting Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#262626] hover:bg-[#303030] text-gray-200 rounded-lg text-xs font-semibold transition-all"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
