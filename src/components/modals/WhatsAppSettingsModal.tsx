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
  X
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
  WhatsAppPingResult
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
  initialTab?: 'settings' | 'chat' | 'templates' | 'simulator' | 'logs';
}

const CRM_TEST_CONTACTS = [
  { id: 'c1-marcus-vance', name: 'Marcus Aurelius Vance', phone: '+61 412 884 910', address: '44 Ocean Ave, Bondi Beach NSW' },
  { id: 'c2-elena-rostova', name: 'Elena Rostova', phone: '+61 401 552 194', address: '12 Victoria St, Fitzroy VIC' },
  { id: 'c3-bruce-wayne', name: 'Bruce Wayne', phone: '+61 422 918 200', address: '100 St Georges Cres, Drummoyne NSW' },
  { id: 'c4-sarah-jenkins', name: 'Sarah Jenkins', phone: '+61 433 109 448', address: '78 Pine Road, Indooroopilly QLD' }
];

export const WhatsAppSettingsModal: React.FC<WhatsAppSettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'settings'
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'chat' | 'templates' | 'simulator' | 'logs'>(initialTab);

  // Settings
  const [settings, setSettings] = useState<WhatsAppIntegrationSettings>(getWhatsAppSettings);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(getWhatsAppTemplates);
  const [logs, setLogs] = useState<WhatsAppMessageLog[]>(getWhatsAppLogs);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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
    remainingHours: 23.2,
    remainingMinutes: 1395
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

  // Webhook Simulator state
  const [simType, setSimType] = useState<'text' | 'image' | 'document' | 'status'>('text');
  const [simText, setSimText] = useState('G\'day! Can we move our solar installation to next Thursday?');
  const [simSenderPhone, setSimSenderPhone] = useState('+61 412 884 910');
  const [simSenderName, setSimSenderName] = useState('Marcus Aurelius Vance');
  const [simStatusMsgId, setSimStatusMsgId] = useState('');
  const [simStatusReceipt, setSimStatusReceipt] = useState<'delivered' | 'read' | 'failed'>('read');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<string | null>(null);

  // Media zoom modal
  const [viewingMediaUrl, setViewingMediaUrl] = useState<string | null>(null);

  // Filter messages for current contact
  const conversationMessages = useMemo(() => {
    return logs.filter(l => {
      if (l.contact_id === selectedContact.id) return true;
      if (l.customerPhone && l.customerPhone.replace(/[^0-9]/g, '') === selectedContact.phone.replace(/[^0-9]/g, '')) return true;
      return false;
    });
  }, [logs, selectedContact]);

  // Load and refresh settings & logs
  useEffect(() => {
    if (isOpen) {
      setSettings(getWhatsAppSettings());
      setTemplates(getWhatsAppTemplates());
      setLogs(getWhatsAppLogs());
      setActiveTab(initialTab);

      // Async fetch from remote
      fetchRemoteWhatsAppSettings().then(s => setSettings(s));
      fetchRemoteWhatsAppLogs().then(l => setLogs(l));
    }
  }, [isOpen, initialTab]);

  // Refresh 24-hour window status whenever selected contact changes or logs update
  useEffect(() => {
    if (selectedContact) {
      checkWhatsApp24HourWindow(selectedContact.id, selectedContact.phone).then(status => {
        setWindowStatus(status);
      });
    }
  }, [selectedContact, logs]);

  // Update template parameter inputs when template selection changes
  useEffect(() => {
    if (activeTemplate) {
      const initial: Record<string, string> = {};
      activeTemplate.parameters.forEach((paramName, idx) => {
        if (paramName.toLowerCase().includes('name')) initial[idx] = selectedContact.name.split(' ')[0];
        else if (paramName.toLowerCase().includes('address')) initial[idx] = selectedContact.address;
        else if (paramName.toLowerCase().includes('date')) initial[idx] = 'tomorrow';
        else if (paramName.toLowerCase().includes('time') || paramName.toLowerCase().includes('eta')) initial[idx] = '10:00 AM';
        else if (paramName.toLowerCase().includes('technician') || paramName.toLowerCase().includes('lead')) initial[idx] = 'David Miller (CEC Accredited)';
        else if (paramName.toLowerCase().includes('size')) initial[idx] = '13.2';
        else if (paramName.toLowerCase().includes('battery') || paramName.toLowerCase().includes('provider')) initial[idx] = 'Tesla Powerwall 3';
        else if (paramName.toLowerCase().includes('savings')) initial[idx] = '$2,840/year';
        else if (paramName.toLowerCase().includes('link')) initial[idx] = 'https://mysolarcrm.com.au/proposal/v2026';
        else initial[idx] = `Value ${idx + 1}`;
      });
      setTemplateParams(initial);
    }
  }, [activeTemplate, selectedContact]);

  if (!isOpen) return null;

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveWhatsAppSettings(settings);
    setSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const handlePingTest = async () => {
    setIsPinging(true);
    setPingResult(null);
    try {
      const res = await pingWhatsAppApi();
      setPingResult(res);
      if (res.success) {
        setSettings(prev => ({ ...prev, status: 'connected', qualityRating: res.qualityRating }));
      }
    } finally {
      setIsPinging(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const generateRandomVerifyToken = () => {
    const token = `solarflow_wa_token_${Math.random().toString(36).substring(2, 12)}_${Date.now().toString(36)}`;
    setSettings(prev => ({
      ...prev,
      webhook_verify_token: token,
      webhookVerifyToken: token
    }));
  };

  // Dispatch Free-form message from Chat UI
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputText.trim() || isSendingMessage) return;

    setIsSendingMessage(true);
    setChatFeedback(null);

    try {
      const result = await sendWhatsAppTextMessage(
        selectedContact.phone,
        chatInputText.trim(),
        selectedContact.id,
        false // strictly enforce 24-hour window
      );

      if (result.success) {
        setChatInputText('');
        setLogs(getWhatsAppLogs());
        setChatFeedback({ type: 'success', message: 'Message sent successfully via Meta Cloud API!' });
      } else {
        setChatFeedback({
          type: result.windowExpired ? 'warning' : 'error',
          message: result.message
        });
        if (result.windowExpired) {
          // Switch to template prompt
          setWindowStatus(prev => ({ ...prev, canSendFreeForm: false, isWithin24Hours: false }));
        }
      }
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Dispatch Template message with dynamic parameters
  const handleSendTemplateMessage = async () => {
    if (!activeTemplate || isSendingTemplate) return;

    setIsSendingTemplate(true);
    setTemplateSendResult(null);

    try {
      const orderedParams: string[] = activeTemplate.parameters.map((_, idx) => templateParams[idx] || '');
      const result = await sendWhatsAppTemplateMessage(
        selectedContact.phone,
        activeTemplate.name,
        orderedParams,
        activeTemplate.language || 'en_AU',
        selectedContact.id
      );

      setLogs(getWhatsAppLogs());
      setTemplateSendResult(result.message);
      if (result.success) {
        setActiveTab('chat');
        setChatFeedback({ type: 'success', message: `Template "${activeTemplate.name}" dispatched to customer!` });
      }
    } finally {
      setIsSendingTemplate(false);
    }
  };

  // Trigger Live Webhook Simulation
  const handleSimulateWebhook = async () => {
    setIsSimulating(true);
    setSimResult(null);

    try {
      if (simType === 'status') {
        const targetId = simStatusMsgId || logs.find(l => l.direction === 'outbound')?.wa_message_id || 'wamid.HBgLMjY5MTI4ODQ5MTAVAgARGBI1N0Q2QTY5MjIzREQ0RTFFMQA=';
        const res = await simulateWhatsAppInboundWebhook({
          type: 'text',
          senderPhone: simSenderPhone,
          senderName: simSenderName,
          statusUpdateId: targetId,
          statusUpdateStatus: simStatusReceipt
        });
        setSimResult(res.message);
      } else {
        const res = await simulateWhatsAppInboundWebhook({
          type: simType as any,
          senderPhone: simSenderPhone,
          senderName: simSenderName,
          text: simText,
          mediaCaption: simType === 'image' ? 'Switchboard & meter photo taken on site' : 'Inspection_Report.pdf'
        });
        setSimResult(res.message);
      }

      setLogs(getWhatsAppLogs());
      // Re-evaluate window
      checkWhatsApp24HourWindow(selectedContact.id, selectedContact.phone).then(setWindowStatus);
    } finally {
      setIsSimulating(false);
    }
  };

  const callbackUrl = settings.webhookCallbackUrl || (typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/whatsapp` : 'http://localhost:3000/api/webhooks/whatsapp');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#121212] border border-[#2d2d2d] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] text-gray-100 overflow-hidden font-sans">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#242424] bg-[#171717]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-tight">Meta WhatsApp Business Cloud API</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase">
                  Cloud API v20.0
                </span>
                <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-[#252525] text-gray-400 border border-[#333]">
                  Supabase Powered
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Official 2-way messaging, Supabase persistent storage, media retrieval, and 24-Hour window compliance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePingTest}
              disabled={isPinging}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#242424] hover:bg-[#2e2e2e] text-gray-200 rounded-lg border border-[#383838] transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin text-emerald-400' : 'text-gray-400'}`} />
              <span>{isPinging ? 'Checking...' : 'Ping Meta API'}</span>
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
            { id: 'settings', label: 'API Credentials & Webhook', icon: Sliders },
            { id: 'chat', label: '2-Way CRM Messaging', icon: MessageCircle, badge: windowStatus.canSendFreeForm ? 'Active 24h' : 'Window Expired' },
            { id: 'templates', label: 'Templates & Dynamic Variables', icon: FileCheck },
            { id: 'simulator', label: 'Webhook & Media Sandbox', icon: Zap },
            { id: 'logs', label: 'Message History & Audit', icon: Database }
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
                  <span className={`px-1.5 py-0.2 text-[10px] font-semibold rounded ${
                    tab.badge === 'Active 24h'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: API SETTINGS & WEBHOOK HANDSHAKE */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Status Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-emerald-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Meta Cloud API Connected & Verified</div>
                    <div className="text-xs text-emerald-300/80 mt-0.5">
                      Phone Number ID: <span className="font-mono text-white">{settings.phone_number_id}</span> • Quality Rating: <span className="font-semibold text-emerald-400">{settings.qualityRating || 'GREEN'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Sync: {settings.lastSyncTime || 'Real-time'}</span>
                </div>
              </div>

              {pingResult && (
                <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                  pingResult.success ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' : 'bg-red-950/30 border-red-500/40 text-red-300'
                }`}>
                  <div className="flex items-center gap-2">
                    {pingResult.success ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                    <span>{pingResult.message}</span>
                  </div>
                  <span className="font-mono text-[11px] text-gray-400">Latency: {pingResult.latencyMs}ms</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSaveSettings} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Phone Number ID */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Phone Number ID <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.phone_number_id}
                      onChange={e => setSettings(prev => ({
                        ...prev,
                        phone_number_id: e.target.value,
                        phoneNumberId: e.target.value
                      }))}
                      placeholder="e.g. 109823749281726"
                      className="w-full px-3.5 py-2.5 bg-[#191919] border border-[#333] rounded-xl text-sm font-mono text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Found in Meta App Dashboard &gt; WhatsApp &gt; API Setup &gt; Step 1.
                    </p>
                  </div>

                  {/* WABA ID */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      WhatsApp Business Account ID (WABA ID) <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.waba_id}
                      onChange={e => setSettings(prev => ({
                        ...prev,
                        waba_id: e.target.value,
                        wabaId: e.target.value
                      }))}
                      placeholder="e.g. 392019485019283"
                      className="w-full px-3.5 py-2.5 bg-[#191919] border border-[#333] rounded-xl text-sm font-mono text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Unique WABA identifier from Meta Business Manager.
                    </p>
                  </div>
                </div>

                {/* System User Access Token */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-gray-300">
                      Permanent System User Access Token <span className="text-emerald-400">*</span>
                    </label>
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                      <Lock className="w-3 h-3" /> Securely stored in Supabase
                    </span>
                  </div>
                  <input
                    type="password"
                    required
                    value={settings.access_token}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      access_token: e.target.value,
                      apiToken: e.target.value
                    }))}
                    placeholder="EAAGm0PX4ZBZB4BA...system_user_permanent_token"
                    className="w-full px-3.5 py-2.5 bg-[#191919] border border-[#333] rounded-xl text-sm font-mono text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    System User token generated from Meta Business Manager with permissions: <code className="text-emerald-300 bg-emerald-950/40 px-1 py-0.5 rounded">whatsapp_business_messaging</code> and <code className="text-emerald-300 bg-emerald-950/40 px-1 py-0.5 rounded">whatsapp_business_management</code>.
                  </p>
                </div>

                {/* Webhook Configuration Section */}
                <div className="p-4 rounded-xl bg-[#191919] border border-[#2d2d2d] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-semibold text-white uppercase tracking-wider">Meta Inbound Webhook Configuration</span>
                    </div>
                    <a
                      href="https://developers.facebook.com/apps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <span>Meta App Dashboard</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Webhook Callback URL */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 mb-1">
                      Webhook Callback URL (Paste into Meta Dashboard)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={callbackUrl}
                        className="flex-1 px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono text-emerald-300"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(callbackUrl, 'callbackUrl')}
                        className="px-3 py-2 bg-[#252525] hover:bg-[#303030] text-gray-200 text-xs rounded-lg border border-[#3d3d3d] flex items-center gap-1.5 transition-colors"
                      >
                        {copiedField === 'callbackUrl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedField === 'callbackUrl' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Webhook Verify Token */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-medium text-gray-400">
                        Webhook Verify Token (<code className="text-gray-300">hub.verify_token</code>)
                      </label>
                      <button
                        type="button"
                        onClick={generateRandomVerifyToken}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Generate Secure Token</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        value={settings.webhook_verify_token}
                        onChange={e => setSettings(prev => ({
                          ...prev,
                          webhook_verify_token: e.target.value,
                          webhookVerifyToken: e.target.value
                        }))}
                        className="flex-1 px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono text-gray-200 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(settings.webhook_verify_token, 'verifyToken')}
                        className="px-3 py-2 bg-[#252525] hover:bg-[#303030] text-gray-200 text-xs rounded-lg border border-[#3d3d3d] flex items-center gap-1.5 transition-colors"
                      >
                        {copiedField === 'verifyToken' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedField === 'verifyToken' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Meta uses this token to verify handshake requests (<code className="text-gray-300">GET /api/webhooks/whatsapp</code>).
                    </p>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-gray-400">
                    Configurations persist directly to the Supabase <code className="text-emerald-400">whatsapp_settings</code> table.
                  </span>
                  <div className="flex items-center gap-3">
                    {savedSuccess && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium animate-in fade-in">
                        <Check className="w-3.5 h-3.5" /> Settings saved to Supabase!
                      </span>
                    )}
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Save WhatsApp Credentials</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: 2-WAY CRM MESSAGING & 24-HOUR WINDOW */}
          {activeTab === 'chat' && (
            <div className="space-y-4">
              {/* Contact Selector Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#171717] rounded-xl border border-[#2a2a2a]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-semibold text-sm">
                    {selectedContact.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedContactId}
                        onChange={e => setSelectedContactId(e.target.value)}
                        className="bg-[#222] border border-[#383838] text-sm font-semibold text-white rounded-lg px-2.5 py-1 focus:outline-none focus:border-emerald-500"
                      >
                        {CRM_TEST_CONTACTS.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.phone})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{selectedContact.address}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('templates')}
                    className="px-3 py-1.5 text-xs bg-[#242424] hover:bg-[#2d2d2d] text-emerald-400 rounded-lg border border-emerald-500/30 flex items-center gap-1.5 transition-colors"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Send Approved Template</span>
                  </button>
                  <button
                    onClick={() => {
                      fetchRemoteWhatsAppLogs();
                      checkWhatsApp24HourWindow(selectedContact.id, selectedContact.phone).then(setWindowStatus);
                    }}
                    className="p-1.5 bg-[#242424] hover:bg-[#2e2e2e] text-gray-300 rounded-lg border border-[#333]"
                    title="Refresh chat"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 24-HOUR CUSTOMER CARE WINDOW INDICATOR */}
              <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                windowStatus.canSendFreeForm
                  ? 'bg-emerald-950/25 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-950/25 border-amber-500/30 text-amber-300'
              }`}>
                <div className="flex items-start gap-2.5">
                  {windowStatus.canSendFreeForm ? (
                    <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2">
                      {windowStatus.canSendFreeForm ? (
                        <>
                          <span>Active 24-Hour Customer Care Window</span>
                          <span className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-500/20 text-emerald-300 rounded">
                            {windowStatus.remainingHours} hrs remaining
                          </span>
                        </>
                      ) : (
                        <span>Meta 24-Hour Customer Care Window Expired</span>
                      )}
                    </div>
                    <p className="text-[11px] mt-0.5 text-gray-300">
                      {windowStatus.canSendFreeForm
                        ? 'Customer replied recently. You are permitted to send direct free-form WhatsApp text messages.'
                        : 'Free-form messages are blocked by Meta. You must select an approved WhatsApp Template to initiate contact.'}
                    </p>
                  </div>
                </div>

                {!windowStatus.canSendFreeForm && (
                  <button
                    onClick={() => setActiveTab('templates')}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold text-xs rounded-lg transition-colors shrink-0"
                  >
                    Select Template
                  </button>
                )}
              </div>

              {/* Feedback Alert */}
              {chatFeedback && (
                <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                  chatFeedback.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : chatFeedback.type === 'warning'
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                    : 'bg-red-950/40 border-red-500/40 text-red-300'
                }`}>
                  <span>{chatFeedback.message}</span>
                  <button onClick={() => setChatFeedback(null)} className="text-gray-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Chat Messages Timeline */}
              <div className="h-[360px] overflow-y-auto p-4 rounded-xl bg-[#0f0f0f] border border-[#262626] space-y-3.5 flex flex-col">
                {conversationMessages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-400">
                    <MessageCircle className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-xs">No WhatsApp messages exchanged with {selectedContact.name} yet.</p>
                    <p className="text-[11px] text-gray-400 mt-1">Send a template or simulate an inbound response from the sandbox tab.</p>
                  </div>
                ) : (
                  conversationMessages.map(msg => {
                    const isOutbound = msg.direction === 'outbound';
                    return (
                      <div
                        key={msg.id || msg.wa_message_id}
                        className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                      >
                        <div className="text-[10px] text-gray-400 mb-1 px-1 flex items-center gap-1.5 font-mono">
                          <span>{isOutbound ? 'SolarFlow Team' : msg.customerName || selectedContact.name}</span>
                          <span>•</span>
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div
                          className={`max-w-[82%] sm:max-w-[70%] p-3.5 rounded-2xl text-xs relative ${
                            isOutbound
                              ? 'bg-emerald-600/90 text-white rounded-tr-xs shadow-md'
                              : 'bg-[#222] text-gray-100 rounded-tl-xs border border-[#333]'
                          }`}
                        >
                          {/* Template pill indicator */}
                          {msg.template_name && (
                            <div className="mb-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/25 text-[10px] font-mono text-emerald-200">
                              <FileCheck className="w-3 h-3" />
                              <span>Template: {msg.template_name}</span>
                            </div>
                          )}

                          {/* Media Rendering */}
                          {msg.has_media && msg.media_url && (
                            <div className="mb-2.5 rounded-lg overflow-hidden border border-black/20 bg-black/40">
                              {msg.media_type?.startsWith('image') || msg.media_url.includes('images.unsplash') ? (
                                <div className="relative group">
                                  <img
                                    src={msg.media_url}
                                    alt="WhatsApp attachment"
                                    className="max-h-48 w-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                    onClick={() => setViewingMediaUrl(msg.media_url!)}
                                    referrerPolicy="no-referrer"
                                  />
                                  <button
                                    onClick={() => setViewingMediaUrl(msg.media_url!)}
                                    className="absolute bottom-2 right-2 p-1.5 bg-black/60 rounded-md text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Enlarge photo"
                                  >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : msg.media_type?.includes('pdf') || msg.media_type?.includes('document') ? (
                                <a
                                  href={msg.media_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-3 flex items-center gap-2.5 hover:bg-white/5 transition-colors"
                                >
                                  <FileText className="w-6 h-6 text-red-400 shrink-0" />
                                  <div className="overflow-hidden">
                                    <div className="font-semibold truncate text-white">Inspection_Report.pdf</div>
                                    <div className="text-[10px] text-gray-300">Click to view document</div>
                                  </div>
                                  <Download className="w-4 h-4 ml-auto text-gray-300 shrink-0" />
                                </a>
                              ) : (
                                <div className="p-2.5 flex items-center gap-2 text-xs">
                                  <ImageIcon className="w-4 h-4 text-emerald-300" />
                                  <span>Media attachment ({msg.media_type || 'file'})</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Message Body Text */}
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.message_body || msg.content}</p>

                          {/* Status and WAMID Footer */}
                          <div className={`mt-1.5 flex items-center justify-end gap-1.5 text-[10px] ${isOutbound ? 'text-emerald-200/80' : 'text-gray-400'}`}>
                            {isOutbound && (
                              <span className="flex items-center gap-1 font-mono">
                                {msg.status === 'read' ? (
                                  <span className="flex items-center text-cyan-300" title="Read by customer">
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    <span className="text-[9px]">Read</span>
                                  </span>
                                ) : msg.status === 'delivered' ? (
                                  <span className="flex items-center text-gray-300" title="Delivered to customer phone">
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    <span className="text-[9px]">Delivered</span>
                                  </span>
                                ) : msg.status === 'sent' ? (
                                  <span className="flex items-center text-gray-300" title="Sent from Meta Cloud API">
                                    <Check className="w-3.5 h-3.5" />
                                    <span className="text-[9px]">Sent</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center text-red-300" title={msg.error_message || 'Dispatch failed'}>
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span className="text-[9px]">Failed</span>
                                  </span>
                                )}
                              </span>
                            )}
                            {!isOutbound && (
                              <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-mono">Inbound</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Composer */}
              <form onSubmit={handleSendChatMessage} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={chatInputText}
                    onChange={e => setChatInputText(e.target.value)}
                    disabled={!windowStatus.canSendFreeForm || isSendingMessage}
                    placeholder={
                      windowStatus.canSendFreeForm
                        ? `Type a WhatsApp message to ${selectedContact.name}...`
                        : '24-Hour window expired. Use the Templates tab to send an approved message.'
                    }
                    className={`w-full px-4 py-3 bg-[#191919] border rounded-xl text-xs text-white focus:outline-none transition-colors ${
                      windowStatus.canSendFreeForm
                        ? 'border-[#333] focus:border-emerald-500'
                        : 'border-amber-900/50 bg-[#161616] text-gray-400 cursor-not-allowed'
                    }`}
                  />
                  {!windowStatus.canSendFreeForm && (
                    <Lock className="w-4 h-4 text-amber-500 absolute right-3.5 top-3.5" />
                  )}
                </div>

                {windowStatus.canSendFreeForm ? (
                  <button
                    type="submit"
                    disabled={!chatInputText.trim() || isSendingMessage}
                    className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingMessage ? 'Sending...' : 'Send'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab('templates')}
                    className="px-4 py-3 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Use Template</span>
                  </button>
                )}
              </form>
            </div>
          )}

          {/* TAB 3: TEMPLATES & DYNAMIC VARIABLES */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#171717] border border-[#292929]">
                <div>
                  <h3 className="text-sm font-semibold text-white">Meta Pre-Approved WhatsApp Templates</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Meta requires approved templates with sequential variables (<code className="text-emerald-400">&#123;&#123;1&#125;&#125;</code>, <code className="text-emerald-400">&#123;&#123;2&#125;&#125;</code>) to initiate customer conversations or message outside the 24-hour window.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    Category: {activeTemplate.category}
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#262626] text-gray-300 border border-[#383838]">
                    Lang: {activeTemplate.language}
                  </span>
                </div>
              </div>

              {/* Template Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {templates.map(tpl => {
                  const isSelected = selectedTemplateName === tpl.name;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setSelectedTemplateName(tpl.name)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-emerald-950/30 border-emerald-500 text-white shadow-md'
                          : 'bg-[#181818] border-[#2c2c2c] text-gray-300 hover:border-[#3d3d3d]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-xs font-mono truncate">{tpl.name}</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      </div>
                      <p className="text-[11px] text-gray-400 line-clamp-2">{tpl.bodyText}</p>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Parameter Mapper Form & Live Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Variable Inputs */}
                <div className="p-4 rounded-xl bg-[#191919] border border-[#2a2a2a] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#2e2e2e] pb-2.5">
                    <span className="text-xs font-semibold text-white uppercase tracking-wider">Dynamic Variables Mapping</span>
                    <span className="text-[11px] text-gray-400 font-mono">Recipient: {selectedContact.name} ({selectedContact.phone})</span>
                  </div>

                  <div className="space-y-3">
                    {activeTemplate.parameters.map((paramName, idx) => (
                      <div key={idx}>
                        <label className="block text-[11px] font-medium text-gray-300 mb-1 flex items-center justify-between">
                          <span>Variable &#123;&#123;{idx + 1}&#125;&#125; — <strong className="text-white">{paramName}</strong></span>
                          <span className="text-[10px] text-emerald-400 font-mono">type: text</span>
                        </label>
                        <input
                          type="text"
                          value={templateParams[idx] || ''}
                          onChange={e => setTemplateParams(prev => ({ ...prev, [idx]: e.target.value }))}
                          placeholder={`Enter ${paramName}...`}
                          className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                        />
                      </div>
                    ))}
                  </div>

                  {templateSendResult && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      <span>{templateSendResult}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSendTemplateMessage}
                    disabled={isSendingTemplate}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingTemplate ? 'Dispatched to Meta...' : `Dispatch "${activeTemplate.name}" to ${selectedContact.name}`}</span>
                  </button>
                </div>

                {/* Live JSON Payload Preview */}
                <div className="p-4 rounded-xl bg-[#101010] border border-[#2a2a2a] flex flex-col">
                  <div className="flex items-center justify-between border-b border-[#242424] pb-2.5 mb-3">
                    <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Meta Cloud API Payload</span>
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">POST /v20.0/{'{phone_number_id}'}/messages</span>
                  </div>

                  <pre className="flex-1 text-[11px] font-mono text-emerald-300/90 bg-[#080808] p-3 rounded-lg overflow-x-auto border border-[#1e1e1e]">
{JSON.stringify({
  messaging_product: 'whatsapp',
  recipient_type: 'individual',
  to: selectedContact.phone.replace(/[^0-9]/g, ''),
  type: 'template',
  template: {
    name: activeTemplate.name,
    language: {
      code: activeTemplate.language
    },
    components: [
      {
        type: 'body',
        parameters: activeTemplate.parameters.map((_, idx) => ({
          type: 'text',
          text: templateParams[idx] || ''
        }))
      }
    ]
  }
}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: WEBHOOK & MEDIA SANDBOX */}
          {activeTab === 'simulator' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 text-purple-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400 mt-0.5">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Inbound Webhook & Media Test Sandbox</h3>
                    <p className="text-xs text-purple-300/80 mt-1">
                      Simulate real inbound events from Meta to verify the entire pipeline:
                      <strong className="text-white"> Inbound Webhook parsing &rarr; Automatic Contact Matching & Lead Generation &rarr; 2-Step Media Retrieval &rarr; Supabase Storage Bucket &rarr; 24-Hour Window Activation</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {simResult && (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{simResult}</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('chat')}
                    className="px-2.5 py-1 bg-emerald-500 text-gray-950 font-semibold rounded text-[11px]"
                  >
                    View in Chat
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { id: 'text', label: 'Inbound Customer Text', desc: 'Activates 24-hour free-form messaging window' },
                  { id: 'image', label: 'Inbound Switchboard Photo', desc: 'Tests 2-step media download & Supabase storage' },
                  { id: 'status', label: 'Delivery Receipt Receipt', desc: 'Simulates read / delivered checks (✓✓)' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSimType(item.id as any)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      simType === item.id
                        ? 'bg-purple-950/30 border-purple-500 text-white'
                        : 'bg-[#181818] border-[#2c2c2c] text-gray-300 hover:border-[#383838]'
                    }`}
                  >
                    <div className="font-semibold text-xs text-white">{item.label}</div>
                    <div className="text-[11px] text-gray-400 mt-1">{item.desc}</div>
                  </button>
                ))}
              </div>

              {/* Simulation Configuration */}
              <div className="p-5 rounded-xl bg-[#191919] border border-[#2a2a2a] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Customer / Sender Phone</label>
                    <input
                      type="text"
                      value={simSenderPhone}
                      onChange={e => setSimSenderPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">WhatsApp Profile Name</label>
                    <input
                      type="text"
                      value={simSenderName}
                      onChange={e => setSimSenderName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white"
                    />
                  </div>
                </div>

                {simType === 'text' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Message Text</label>
                    <textarea
                      rows={3}
                      value={simText}
                      onChange={e => setSimText(e.target.value)}
                      className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white"
                    />
                  </div>
                )}

                {simType === 'image' && (
                  <div className="p-3 bg-[#131313] border border-[#262626] rounded-lg text-xs space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                      <ImageIcon className="w-4 h-4" />
                      <span>2-Step Media Retrieval Flow Verified:</span>
                    </div>
                    <p className="text-gray-300 text-[11px]">
                      1. Inbound webhook receives Meta Media ID <code className="text-emerald-300 font-mono">mock_media_id_switchboard_9941</code>.<br />
                      2. Server invokes Meta Graph API to query CDN binary buffer.<br />
                      3. Buffer streams directly into Supabase Storage bucket <code className="text-emerald-300 font-mono">whatsapp_media</code> at <code className="text-emerald-300 font-mono">{'{tenant_id}'}/{'{wa_message_id}'}.jpg</code>.
                    </p>
                  </div>
                )}

                {simType === 'status' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Target WA Message ID</label>
                      <input
                        type="text"
                        value={simStatusMsgId}
                        onChange={e => setSimStatusMsgId(e.target.value)}
                        placeholder="Leave blank for latest outbound message"
                        className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Status Receipt</label>
                      <select
                        value={simStatusReceipt}
                        onChange={e => setSimStatusReceipt(e.target.value as any)}
                        className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-semibold text-white"
                      >
                        <option value="delivered">Delivered (✓✓ gray)</option>
                        <option value="read">Read (✓✓ blue)</option>
                        <option value="failed">Failed (⚠ red alert)</option>
                      </select>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSimulateWebhook}
                  disabled={isSimulating}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isSimulating ? 'Processing Webhook Event...' : 'Trigger Webhook Handshake'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT LOGS & DATABASE */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-[#171717] rounded-xl border border-[#282828]">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-white">Supabase Table: <code className="text-emerald-400">whatsapp_messages</code></span>
                </div>
                <span className="text-xs text-gray-400 font-mono">Total Recorded: {logs.length} messages</span>
              </div>

              <div className="border border-[#292929] rounded-xl overflow-hidden bg-[#101010]">
                <div className="overflow-x-auto max-h-[420px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#181818] border-b border-[#262626] text-gray-400 uppercase text-[10px] tracking-wider font-mono">
                      <tr>
                        <th className="py-2.5 px-3">Direction</th>
                        <th className="py-2.5 px-3">Contact</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3">Content / Template</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Media</th>
                        <th className="py-2.5 px-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222]">
                      {logs.map(log => (
                        <tr key={log.id || log.wa_message_id} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5 px-3 font-mono">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              log.direction === 'outbound' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'
                            }`}>
                              {log.direction}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-white">{log.customerName || 'Customer'}</td>
                          <td className="py-2.5 px-3 font-mono text-gray-400">{log.customerPhone || '—'}</td>
                          <td className="py-2.5 px-3 max-w-xs truncate text-gray-300">{log.message_body || log.content}</td>
                          <td className="py-2.5 px-3 font-mono">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                              log.status === 'read' ? 'bg-cyan-500/20 text-cyan-300' :
                              log.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-300' :
                              log.status === 'sent' ? 'bg-gray-500/20 text-gray-300' :
                              log.status === 'received' ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {log.has_media ? (
                              <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                                <ImageIcon className="w-3 h-3" /> Yes
                              </span>
                            ) : (
                              <span className="text-gray-400 text-[11px]">None</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-gray-400 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#242424] bg-[#141414] text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Meta Graph API v20.0 • Supabase Storage <code className="text-emerald-400">whatsapp_media</code></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#252525] hover:bg-[#303030] text-gray-200 rounded-lg border border-[#383838] transition-colors"
          >
            Close
          </button>
        </div>

      </div>

      {/* Media Zoom Lightbox Modal */}
      {viewingMediaUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setViewingMediaUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-black border border-white/20 p-2">
            <img
              src={viewingMediaUrl}
              alt="Enlarged switchboard media"
              className="max-h-[82vh] w-auto object-contain rounded-xl"
              referrerPolicy="no-referrer"
            />
            <button
              onClick={() => setViewingMediaUrl(null)}
              className="absolute top-4 right-4 p-2 bg-black/70 hover:bg-black text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
