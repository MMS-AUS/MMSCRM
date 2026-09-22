import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
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
  CheckCheck,
  XCircle,
  Database,
  Radio,
  FileCode2,
  HelpCircle,
  Trash2
} from 'lucide-react';
import {
  getMessageMediaConfig,
  saveMessageMediaConfig,
  disconnectMessageMedia,
  sendOutboundSms,
  fetchSmsLogs,
  simulateWebhookDeliveryReport,
  MessageMediaSettingsResponse,
  SmsLogEntry
} from '../../services/messageMediaService';

interface MessageMediaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
}

const SUPABASE_MIGRATION_SQL = `-- 1. Create messagemedia_credentials table
CREATE TABLE IF NOT EXISTS messagemedia_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  user_id UUID,
  api_key TEXT NOT NULL,
  api_secret TEXT NOT NULL,
  default_sender_id TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security for messagemedia_credentials
ALTER TABLE messagemedia_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow tenant members to read credentials"
ON messagemedia_credentials FOR SELECT
USING (tenant_id = auth.uid() OR user_id = auth.uid() OR tenant_id IS NULL);

CREATE POLICY "Allow tenant members to upsert credentials"
ON messagemedia_credentials FOR ALL
USING (tenant_id = auth.uid() OR user_id = auth.uid() OR tenant_id IS NULL);

-- 2. Create sms_logs table
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  contact_id UUID,
  project_id UUID,
  recipient_number TEXT NOT NULL,
  sender_id TEXT,
  message_body TEXT NOT NULL,
  provider_message_id TEXT,
  status TEXT DEFAULT 'sent' NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  delivery_status TEXT DEFAULT 'enroute' NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_contact_id ON sms_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_project_id ON sms_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_provider_message_id ON sms_logs(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at DESC);

-- Row Level Security for sms_logs
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read their tenant's SMS logs"
ON sms_logs FOR SELECT
USING (tenant_id = auth.uid() OR tenant_id IS NULL);

CREATE POLICY "Allow users to insert SMS logs for their tenant"
ON sms_logs FOR INSERT
WITH CHECK (tenant_id = auth.uid() OR tenant_id IS NULL);

CREATE POLICY "Allow system webhook or service role to update delivery status"
ON sms_logs FOR UPDATE
USING (true)
WITH CHECK (true);`;

export const MessageMediaSettingsModal: React.FC<MessageMediaSettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'settings'
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'test' | 'logs' | 'schema'>('settings');

  // Credential configuration state
  const [config, setConfig] = useState<MessageMediaSettingsResponse | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [defaultSenderId, setDefaultSenderId] = useState('');
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  // Test SMS state
  const [testRecipient, setTestRecipient] = useState('+61 411 234 567');
  const [testSenderId, setTestSenderId] = useState('');
  const [testMessage, setTestMessage] = useState(
    'Hi Harrison, your 13.2kW Solar & Battery site survey is scheduled for tomorrow at 10:00 AM. Reply STOP to opt out.'
  );
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    messageId?: string;
    deliveryStatus?: string;
    error?: string;
  } | null>(null);

  // Logs state
  const [logs, setLogs] = useState<SmsLogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Copying feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
      loadLogs();
      if (initialTab === 'test') setActiveTab('test');
      else if (initialTab === 'logs') setActiveTab('logs');
      else if (initialTab === 'schema') setActiveTab('schema');
      else setActiveTab('settings');
    }
  }, [isOpen, initialTab]);

  const loadConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const data = await getMessageMediaConfig();
      setConfig(data);
      if (data.defaultSenderId) {
        setDefaultSenderId(data.defaultSenderId);
      }
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const data = await fetchSmsLogs({ limit: 50 });
      setLogs(data);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !apiSecret.trim()) {
      setSaveFeedback({
        success: false,
        message: 'Please provide both the MessageMedia API Key and API Secret.'
      });
      return;
    }

    setIsSaving(true);
    setSaveFeedback(null);
    try {
      const res = await saveMessageMediaConfig({
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        defaultSenderId: defaultSenderId.trim() || undefined
      });

      if (res.success) {
        setSaveFeedback({
          success: true,
          message: 'MessageMedia credentials successfully saved to Supabase.'
        });
        setApiKey('');
        setApiSecret('');
        await loadConfig();
      } else {
        setSaveFeedback({
          success: false,
          message: res.error || 'Failed to save credentials'
        });
      }
    } catch (err: any) {
      setSaveFeedback({
        success: false,
        message: err.message || 'Error communicating with server'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Sinch MessageMedia and remove stored credentials?')) {
      return;
    }
    const res = await disconnectMessageMedia();
    if (res.success) {
      await loadConfig();
      setSaveFeedback({
        success: true,
        message: 'MessageMedia disconnected. Outbound SMS disabled.'
      });
    }
  };

  const handleSendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient.trim() || !testMessage.trim()) return;

    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await sendOutboundSms({
        recipient_number: testRecipient.trim(),
        message_body: testMessage.trim(),
        sender_id: testSenderId.trim() || defaultSenderId.trim() || undefined
      });

      if (res.success) {
        setTestResult({
          success: true,
          messageId: res.messageId,
          deliveryStatus: res.delivery_status || 'enroute'
        });
        await loadLogs();
      } else {
        setTestResult({
          success: false,
          error: res.error || 'Failed to send SMS'
        });
      }
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSimulateWebhook = async (status: 'delivered' | 'failed' | 'rejected') => {
    if (!testResult?.messageId) return;
    await simulateWebhookDeliveryReport(testResult.messageId, status);
    setTestResult(prev => (prev ? { ...prev, deliveryStatus: status } : null));
    await loadLogs();
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen) return null;

  const isConfigured = Boolean(config?.configured);
  const webhookUrl =
    config?.webhookUrl ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/api/webhooks/sms/delivery`
      : 'https://your-domain.com/api/webhooks/sms/delivery');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-slate-800">
                  Sinch MessageMedia SMS Integration
                </h3>
                {isConfigured ? (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Enterprise Outbound SMS Gateway with Supabase Credential Storage & Webhook Delivery Receipts (DLR)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConfigured && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                title="Disconnect MessageMedia"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Disconnect
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-2">
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            API Credentials & Sender ID
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'test'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Send className="w-4 h-4" />
            Test SMS & Delivery DLR
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'logs'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            Supabase SMS Logs ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'schema'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            Supabase Schema & RLS
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: SETTINGS / CREDENTIALS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-2xl">
              {saveFeedback && (
                <div
                  className={`p-3.5 rounded-lg text-xs flex items-center gap-2 border ${
                    saveFeedback.success
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {saveFeedback.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{saveFeedback.message}</span>
                </div>
              )}

              {isConfigured && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-900 space-y-1">
                    <p className="font-semibold text-emerald-800">
                      Credentials Active in Supabase (<code className="font-mono">messagemedia_credentials</code>)
                    </p>
                    <p className="text-emerald-700">
                      Masked Key: <span className="font-mono">{config?.apiKeyMasked}</span> &bull; Default Sender ID:{' '}
                      <span className="font-semibold">{config?.defaultSenderId || 'Default (Not Set)'}</span>
                    </p>
                    {config?.updatedAt && (
                      <p className="text-emerald-600 text-[11px]">
                        Last updated: {new Date(config.updatedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveConfig} className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800">
                    {isConfigured ? 'Update MessageMedia Credentials' : 'Connect MessageMedia Gateway'}
                  </h4>
                  <a
                    href="https://hub.messagemedia.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-medium"
                  >
                    MessageMedia Hub <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    MessageMedia API Key <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={config?.apiKeyMasked || 'e.g. mm_live_ak_90218734bcfe'}
                    className="w-full text-xs bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Your Basic Auth API Key from the MessageMedia Developer Settings.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    MessageMedia API Secret <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={apiSecret}
                      onChange={e => setApiSecret(e.target.value)}
                      placeholder={isConfigured ? '••••••••••••••••••••••••••••••••' : 'Enter API Secret'}
                      className="w-full text-xs bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 pr-16 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-500 hover:text-slate-800 px-1.5 py-0.5"
                    >
                      {showSecret ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Sender ID <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={defaultSenderId}
                    onChange={e => setDefaultSenderId(e.target.value)}
                    placeholder="e.g. SolarFlow or +61488842910"
                    maxLength={11}
                    className="w-full text-xs bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Alphanumeric sender ID (up to 11 characters) or your dedicated Australian virtual mobile number.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <p className="text-[11px] text-slate-500">
                    Row Level Security (RLS) protects credentials per tenant in Supabase.
                  </p>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg shadow-xs transition-colors flex items-center gap-2"
                  >
                    {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    Save Configuration
                  </button>
                </div>
              </form>

              {/* Webhook Configuration Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <Radio className="w-4 h-4 text-emerald-600" />
                  Delivery Report (DLR) Webhook Receiver
                </div>
                <p className="text-xs text-slate-600">
                  Configure this webhook in your MessageMedia Portal under <strong>Webhooks &rarr; Delivery Reports</strong>{' '}
                  to receive real-time handset receipt updates into Supabase <code className="font-mono text-[11px]">sms_logs</code>.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="w-full text-xs bg-white border border-slate-300 text-slate-700 rounded-lg px-3 py-2 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                    className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs rounded-lg flex items-center gap-1.5 transition-colors shrink-0 font-medium"
                  >
                    {copiedKey === 'webhook' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy URL
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TEST SMS & DELIVERY TRACKING */}
          {activeTab === 'test' && (
            <div className="space-y-6 max-w-2xl">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800">Outbound SMS Testing Utility</h4>
                  <span className="text-xs text-slate-500">
                    Sends live message via <code className="font-mono">/api/sms/send</code>
                  </span>
                </div>

                {!isConfigured && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Please enter and save your API Key & Secret on the <strong>API Credentials</strong> tab before sending a test SMS.
                    </span>
                  </div>
                )}

                <form onSubmit={handleSendTestSms} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Recipient Mobile Number (E.164 Format)
                    </label>
                    <input
                      type="text"
                      value={testRecipient}
                      onChange={e => setTestRecipient(e.target.value)}
                      placeholder="+61 411 234 567"
                      className="w-full text-xs bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono"
                      required
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Australian numbers like <code className="font-mono">0411 234 567</code> will automatically be normalized to <code className="font-mono">+61411234567</code>.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sender ID Override <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={testSenderId}
                      onChange={e => setTestSenderId(e.target.value)}
                      placeholder={defaultSenderId || 'SolarFlow'}
                      className="w-full text-xs bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">Message Content</label>
                      <span className="text-[11px] text-slate-500">
                        {testMessage.length} characters ({Math.ceil(testMessage.length / 160) || 1} SMS segment)
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={testMessage}
                      onChange={e => setTestMessage(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 text-slate-800 rounded-lg p-3 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingTest || !isConfigured}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg shadow-xs transition-colors flex items-center gap-2"
                  >
                    {isSendingTest ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Send Test SMS
                  </button>
                </form>

                {/* Result Card */}
                {testResult && (
                  <div
                    className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                      testResult.success
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50/80 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold flex items-center gap-1.5">
                        {testResult.success ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Message Accepted by Sinch MessageMedia
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                            Sending Failed
                          </>
                        )}
                      </span>
                      {testResult.deliveryStatus && (
                        <span className="px-2 py-0.5 rounded-full bg-white text-slate-700 font-mono text-[11px] border border-slate-200">
                          Status: {testResult.deliveryStatus}
                        </span>
                      )}
                    </div>

                    {testResult.messageId && (
                      <p className="text-[11px] font-mono">
                        Provider Message ID: <strong>{testResult.messageId}</strong>
                      </p>
                    )}

                    {testResult.error && <p className="text-rose-700 font-medium">{testResult.error}</p>}

                    {testResult.success && testResult.messageId && (
                      <div className="pt-2 border-t border-emerald-200 flex items-center justify-between">
                        <span className="text-[11px] text-emerald-800">
                          Test Webhook Delivery Receipts:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSimulateWebhook('delivered')}
                            className="px-2 py-1 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded text-[11px] font-medium transition-colors"
                          >
                            Mark Delivered (DLR)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSimulateWebhook('failed')}
                            className="px-2 py-1 bg-white hover:bg-rose-100 border border-rose-300 text-rose-800 rounded text-[11px] font-medium transition-colors"
                          >
                            Mark Rejected
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SUPABASE SMS LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Supabase SMS Communication Logs</h4>
                  <p className="text-xs text-slate-500">
                    Directly linked to contacts and projects from table <code className="font-mono">sms_logs</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadLogs}
                  disabled={isLoadingLogs}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl">
                  <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No SMS logs recorded yet</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Send a test SMS from the &ldquo;Test SMS&rdquo; tab or from any contact record.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Delivery</th>
                          <th className="py-2.5 px-3">Recipient</th>
                          <th className="py-2.5 px-3">Sender ID</th>
                          <th className="py-2.5 px-3">Message Body</th>
                          <th className="py-2.5 px-3">Provider ID</th>
                          <th className="py-2.5 px-3">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {logs.map(log => {
                          const isDelivered = log.delivery_status === 'delivered';
                          const isFailed = log.status === 'failed_to_send' || log.delivery_status === 'failed' || log.delivery_status === 'rejected';

                          return (
                            <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {isDelivered ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                                    <CheckCheck className="w-3.5 h-3.5 text-sky-600" />
                                    Delivered
                                  </span>
                                ) : isFailed ? (
                                  <span
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200"
                                    title={log.error_message || 'Delivery failed'}
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                    {log.delivery_status || 'Failed'}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                    <Check className="w-3.5 h-3.5 text-slate-400" />
                                    {log.delivery_status || 'Submitted'}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-medium text-slate-800 whitespace-nowrap">
                                {log.recipient_number}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                                {log.sender_id || 'Default'}
                              </td>
                              <td className="py-2.5 px-3 max-w-xs truncate" title={log.message_body}>
                                {log.message_body}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                {log.provider_message_id ? `${log.provider_message_id.substring(0, 10)}…` : '—'}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 text-[11px]">
                                {new Date(log.created_at).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SUPABASE SCHEMA & RLS */}
          {activeTab === 'schema' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Supabase SQL Schema Migration</h4>
                  <p className="text-xs text-slate-500">
                    Tables <code className="font-mono">messagemedia_credentials</code> &amp;{' '}
                    <code className="font-mono">sms_logs</code> with Row Level Security (RLS) policies.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(SUPABASE_MIGRATION_SQL, 'sql')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  {copiedKey === 'sql' ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copied Migration SQL
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy SQL to Clipboard
                    </>
                  )}
                </button>
              </div>

              <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto border border-slate-800">
                <pre className="text-xs font-mono text-emerald-400 leading-relaxed whitespace-pre">
                  {SUPABASE_MIGRATION_SQL}
                </pre>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">How to apply in Supabase:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-600">
                  <li>Open your project dashboard in the Supabase Console.</li>
                  <li>Click on the <strong>SQL Editor</strong> tab in the left sidebar.</li>
                  <li>Click <strong>New Query</strong>, paste the SQL above, and click <strong>Run</strong>.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-emerald-600" />
            Outbound Sinch MessageMedia REST API &bull; Supabase RLS Protected
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
