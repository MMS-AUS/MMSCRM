import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Sliders,
  Bell,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Info,
  Server,
  Key,
  Globe,
  Trash2,
  Eye,
  X,
  FileText,
  UserCheck,
  Sparkles,
  PlusCircle
} from 'lucide-react';
import {
  getPersonalEmailConfig,
  savePersonalEmailConfig,
  sendTestEmail,
  getOutboundEmailLogs,
  clearOutboundEmailLogs,
  sendSystemEmail
} from '../../services/systemAlertsEmailService';
import {
  PersonalEmailIntegrationConfig,
  OutboundEmailLog,
  EmailDeliveryMode
} from '../../types';
import { useApp } from '../../context/AppContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'delivery' | 'sender' | 'triggers' | 'test' | 'logs';
}

export const SystemEmailAlertsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialTab = 'delivery'
}) => {
  const { currentUser: appUser, connectedDomain } = useApp();
  const [activeTab, setActiveTab] = useState<'delivery' | 'sender' | 'triggers' | 'test' | 'logs'>(initialTab);
  const [config, setConfig] = useState<PersonalEmailIntegrationConfig>(() => getPersonalEmailConfig());
  const [logs, setLogs] = useState<OutboundEmailLog[]>(() => getOutboundEmailLogs());

  // Status & Feedback
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  // Test form state
  const [testRecipient, setTestRecipient] = useState(
    () => config.senderEmail || appUser?.email || `admin@${connectedDomain}`
  );
  const [testCustomNote, setTestCustomNote] = useState('Testing system automated alert dispatch pipeline.');

  // Admin email tag input
  const [newAdminEmail, setNewAdminEmail] = useState('');

  // Selected email preview
  const [selectedPreviewLog, setSelectedPreviewLog] = useState<OutboundEmailLog | null>(null);

  // Browser notification permission state
  const [browserNotificationStatus, setBrowserNotificationStatus] = useState<'granted' | 'denied' | 'default'>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  useEffect(() => {
    if (isOpen) {
      const currentConfig = getPersonalEmailConfig();
      setConfig(currentConfig);
      setTestRecipient(
        currentConfig.senderEmail || appUser?.email || `admin@${connectedDomain}`
      );
      setLogs(getOutboundEmailLogs());
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab, appUser?.email, connectedDomain]);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    const updated = savePersonalEmailConfig(config);
    setConfig(updated);
    setSaveSuccess('Email & Alerts configuration successfully updated!');
    setIsSaving(false);
    setTimeout(() => setSaveSuccess(null), 3500);
  };

  const handleTriggerTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient.trim()) return;

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await sendTestEmail(testRecipient.trim(), testCustomNote);
      setLogs(getOutboundEmailLogs());

      if (res.success) {
        setTestResult({
          success: true,
          message: `Test email successfully dispatched to ${testRecipient}!`,
          details: {
            channel: res.channel,
            status: res.status,
            messageId: res.messageId,
            timestamp: res.timestamp
          }
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || 'Failed to dispatch test email. Please review your credentials.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Error occurred during test dispatch'
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleAddAdminEmail = () => {
    const trimmed = newAdminEmail.trim();
    if (!trimmed || !trimmed.includes('@')) return;
    if (config.adminAlertEmails.includes(trimmed)) return;

    const updated = {
      ...config,
      adminAlertEmails: [...config.adminAlertEmails, trimmed]
    };
    setConfig(updated);
    savePersonalEmailConfig(updated);
    setNewAdminEmail('');
  };

  const handleRemoveAdminEmail = (emailToRemove: string) => {
    const updated = {
      ...config,
      adminAlertEmails: config.adminAlertEmails.filter(e => e !== emailToRemove)
    };
    setConfig(updated);
    savePersonalEmailConfig(updated);
  };

  const handleRequestBrowserNotification = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setBrowserNotificationStatus(perm);
      if (perm === 'granted') {
        new Notification('Apex Solar Alerts Enabled', {
          body: 'You will now receive desktop notifications for urgent solar operations and leads.',
          icon: '/favicon.ico'
        });
      }
    }
  };

  const handleResendLog = async (log: OutboundEmailLog) => {
    try {
      await sendSystemEmail({
        to: log.to,
        subject: `[Resent] ${log.subject}`,
        bodyHtml: log.bodyHtml,
        category: 'Manual Resend'
      });
      setLogs(getOutboundEmailLogs());
      setSaveSuccess(`Email resent to ${log.to}!`);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      alert(`Resend failed: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#111111] border border-[#2e2e2e] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#262626] bg-gradient-to-r from-[#141414] to-[#1c1c1c] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">System Email, Alerts &amp; Personal Integration</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#bef264]/20 text-[#bef264] border border-[#bef264]/30 uppercase tracking-wider">
                  {config.deliveryMode.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Configure SMTP relay, cloud webhooks, and automated system alert dispatches.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#262626] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Alert / Feedback Banners */}
        {saveSuccess && (
          <div className="px-5 py-2.5 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{saveSuccess}</span>
            </div>
            <button onClick={() => setSaveSuccess(null)} className="text-emerald-400 hover:text-white text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-[#262626] bg-[#141414] overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('delivery')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'delivery'
                ? 'border-[#bef264] text-[#bef264] bg-[#1b1b1b]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Delivery Mode &amp; Credentials</span>
          </button>
          <button
            onClick={() => setActiveTab('sender')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'sender'
                ? 'border-[#bef264] text-[#bef264] bg-[#1b1b1b]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Sender Identity &amp; Admin Alerts</span>
          </button>
          <button
            onClick={() => setActiveTab('triggers')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'triggers'
                ? 'border-[#bef264] text-[#bef264] bg-[#1b1b1b]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Automated Event Triggers</span>
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'test'
                ? 'border-[#bef264] text-[#bef264] bg-[#1b1b1b]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Live Test Dispatcher</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'logs'
                ? 'border-[#bef264] text-[#bef264] bg-[#1b1b1b]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Outbox Ledger ({logs.length})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: DELIVERY MODE & CREDENTIALS */}
          {activeTab === 'delivery' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/30 via-[#141414] to-[#141414] border border-blue-500/20 text-blue-300">
                <div className="flex items-center gap-2 font-bold mb-1 text-white">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>Choose Your Outbound Email Delivery Architecture</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  Select how system alerts, lead proposals, project milestones, and portal links are sent. You can configure a personal SMTP server, authenticated relay credentials, or a cloud webhook gateway.
                </p>
              </div>

              {/* Delivery Mode Selector Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: 'custom_smtp' as EmailDeliveryMode,
                    title: 'Personal SMTP / Relay',
                    badge: 'Direct Relay',
                    desc: 'Connect via custom corporate SMTP host or relay with host, port and credentials.'
                  },
                  {
                    id: 'webhook_gateway' as EmailDeliveryMode,
                    title: 'Cloud Gateway / Webhook',
                    badge: 'Resend / SendGrid',
                    desc: 'Direct REST webhook to Resend, SendGrid, Mailgun, Postmark, or custom endpoint.'
                  },
                  {
                    id: 'simulation_audit' as EmailDeliveryMode,
                    title: 'System Relay & Audit',
                    badge: 'Sandbox Ledger',
                    desc: 'All outgoing notifications recorded in high-fidelity ledger with deliverability previews.'
                  }
                ].map(mode => (
                  <div
                    key={mode.id}
                    onClick={() => setConfig({ ...config, deliveryMode: mode.id })}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      config.deliveryMode === mode.id
                        ? 'bg-[#1e2717] border-[#bef264] text-white ring-1 ring-[#bef264]/40'
                        : 'bg-[#141414] border-[#2d2d2d] text-gray-400 hover:border-[#444] hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-white">{mode.title}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/40 text-[#bef264] border border-[#bef264]/30">
                        {mode.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-tight">{mode.desc}</p>
                  </div>
                ))}
              </div>

              {/* Sub-Panel: Custom SMTP */}
              {config.deliveryMode === 'custom_smtp' && (
                <div className="p-4 rounded-xl bg-[#141414] border border-[#2d2d2d] space-y-3">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-amber-400" />
                    <strong className="text-white text-sm">Personal SMTP Server / Relay Credentials</strong>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Configure your corporate SMTP mail server (e.g. Mailgun, SendGrid SMTP, Amazon SES, or corporate mail exchange).
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-gray-300 mb-1">
                        SMTP Host Server
                      </label>
                      <input
                        type="text"
                        value={config.smtpHost}
                        onChange={e => setConfig({ ...config, smtpHost: e.target.value })}
                        className="w-full px-3 py-2 bg-[#1c1c1c] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] outline-none font-mono"
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-300 mb-1">
                        Port
                      </label>
                      <input
                        type="number"
                        value={config.smtpPort}
                        onChange={e => setConfig({ ...config, smtpPort: Number(e.target.value) || 587 })}
                        className="w-full px-3 py-2 bg-[#1c1c1c] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] outline-none font-mono"
                        placeholder="587"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-300 mb-1">
                        SMTP Username / Email
                      </label>
                      <input
                        type="email"
                        value={config.smtpUsername}
                        onChange={e => setConfig({ ...config, smtpUsername: e.target.value })}
                        className="w-full px-3 py-2 bg-[#1c1c1c] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] outline-none font-mono"
                        placeholder={`admin@${connectedDomain}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-300 mb-1">
                        App Password / SMTP Password
                      </label>
                      <input
                        type="password"
                        value={config.smtpPassword}
                        onChange={e => setConfig({ ...config, smtpPassword: e.target.value })}
                        className="w-full px-3 py-2 bg-[#1c1c1c] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] outline-none font-mono"
                        placeholder="••••••••••••••••"
                      />
                      <span className="text-[10px] text-gray-500 mt-0.5 block">
                        Tip: 16-character space-separated Google App Password works best.
                      </span>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.smtpSecure}
                      onChange={e => setConfig({ ...config, smtpSecure: e.target.checked })}
                      className="rounded border-[#333] text-[#bef264] focus:ring-0"
                    />
                    <span className="text-gray-300 text-xs font-semibold">Enable TLS / STARTTLS Encryption</span>
                  </label>
                </div>
              )}

              {/* Sub-Panel: Cloud Gateway / Webhook */}
              {config.deliveryMode === 'webhook_gateway' && (
                <div className="p-4 rounded-xl bg-[#141414] border border-[#2d2d2d] space-y-3">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-purple-400" />
                    <strong className="text-white text-sm">Personal Cloud Webhook / REST Gateway</strong>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Connect an external email dispatch provider like Resend, SendGrid, Mailgun, Postmark, or custom n8n / Zapier webhook.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-300 mb-1">
                        Gateway Provider
                      </label>
                      <select
                        value={config.webhookPayloadType}
                        onChange={e =>
                          setConfig({
                            ...config,
                            webhookPayloadType: e.target.value as any,
                            webhookUrl:
                              e.target.value === 'resend'
                                ? 'https://api.resend.com/emails'
                                : e.target.value === 'sendgrid'
                                ? 'https://api.sendgrid.com/v3/mail/send'
                                : config.webhookUrl
                          })
                        }
                        className="w-full px-3 py-2 bg-[#1c1c1c] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] outline-none"
                      >
                        <option value="resend">Resend API (Recommended)</option>
                        <option value="sendgrid">Twilio SendGrid v3</option>
                        <option value="standard">Standard JSON Webhook (n8n, Zapier, Make)</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-gray-300 mb-1">
                        Webhook Endpoint URL
                      </label>
                      <input
                        type="url"
                        value={config.webhookUrl}
                        onChange={e => setConfig({ ...config, webhookUrl: e.target.value })}
                        className="w-full px-3 py-2 bg-[#1c1c1c] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] outline-none font-mono"
                        placeholder="https://api.resend.com/emails"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 mb-1">
                      API Secret Key (Bearer Token)
                    </label>
                    <input
                      type="password"
                      value={config.webhookApiKey}
                      onChange={e => setConfig({ ...config, webhookApiKey: e.target.value })}
                      className="w-full px-3 py-2 bg-[#1c1c1c] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] outline-none font-mono"
                      placeholder="re_123456789... or SG.xxxx..."
                    />
                  </div>
                </div>
              )}

              {/* Sub-Panel: Simulation Audit Mode */}
              {config.deliveryMode === 'simulation_audit' && (
                <div className="p-4 rounded-xl bg-[#141414] border border-[#2d2d2d] space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Sandbox Simulation &amp; Deliverability Ledger Active</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    In this mode, all automated triggers, lead quotes, project stage milestones, and password resets are compiled into full-fidelity HTML emails and tracked inside the Outbox Ledger. You can inspect complete email layouts, HTML source, and delivery timestamps without sending messages to real inboxes.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SENDER IDENTITY & ADMIN ALERTS */}
          {activeTab === 'sender' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#141414] border border-[#2d2d2d] space-y-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#bef264]" />
                  <span>Outbound Sender Profile &amp; Headers</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 mb-1">
                      Sender Display Name
                    </label>
                    <input
                      type="text"
                      value={config.senderName}
                      onChange={e => setConfig({ ...config, senderName: e.target.value })}
                      className="w-full px-3 py-2 bg-[#1c1c1c] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] outline-none"
                      placeholder="Apex Solar Energy Systems"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">
                      Shown to customers as the sender in quotes and updates.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 mb-1">
                      From Email Address
                    </label>
                    <input
                      type="email"
                      value={config.senderEmail}
                      onChange={e => setConfig({ ...config, senderEmail: e.target.value })}
                      className="w-full px-3 py-2 bg-[#1c1c1c] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] outline-none font-mono"
                      placeholder={`admin@${connectedDomain}`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 mb-1">
                      Reply-To Email Address
                    </label>
                    <input
                      type="email"
                      value={config.replyToEmail}
                      onChange={e => setConfig({ ...config, replyToEmail: e.target.value })}
                      className="w-full px-3 py-2 bg-[#1c1c1c] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] outline-none font-mono"
                      placeholder={`support@${connectedDomain}`}
                    />
                  </div>
                </div>
              </div>

              {/* Admin Alert Email Recipients */}
              <div className="p-4 rounded-xl bg-[#141414] border border-[#2d2d2d] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span>Admin Alert Email Recipients (CC Copies)</span>
                  </h3>
                  <span className="text-[10px] text-gray-400">
                    {config.adminAlertEmails.length} active recipient(s)
                  </span>
                </div>

                <p className="text-[11px] text-gray-400 leading-relaxed">
                  These email addresses will receive instant notification copies whenever a new lead arrives, proposal is sent, installation order is dispatched, or high-priority ticket is created.
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={e => setNewAdminEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddAdminEmail()}
                    placeholder={`Enter email address (e.g. admin@${connectedDomain})`}
                    className="flex-1 px-3 py-2 bg-[#1c1c1c] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddAdminEmail}
                    className="px-3 py-2 bg-[#252525] hover:bg-[#333] text-white text-xs font-semibold rounded-lg border border-[#3e3e3e] transition-colors shrink-0"
                  >
                    Add Recipient
                  </button>
                </div>

                {/* Email Tag List */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {config.adminAlertEmails.map(adminEmail => (
                    <div
                      key={adminEmail}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1e1e1e] border border-[#333] rounded-lg text-xs text-white font-mono"
                    >
                      <Mail className="w-3 h-3 text-[#bef264]" />
                      <span>{adminEmail}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAdminEmail(adminEmail)}
                        className="text-gray-400 hover:text-rose-400 ml-1"
                        title="Remove recipient"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* In-App & Browser Push Notifications */}
              <div className="p-4 rounded-xl bg-[#141414] border border-[#2d2d2d] space-y-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span>Desktop &amp; In-App Notification Channels</span>
                </h3>

                <div className="space-y-2.5 pt-1">
                  <label className="flex items-center justify-between p-2 rounded-lg bg-[#1a1a1a] cursor-pointer">
                    <div>
                      <span className="font-semibold text-white block">In-App Notification Bell &amp; Banners</span>
                      <span className="text-[10px] text-gray-400">
                        Shows counter badge and dropdown notification alerts inside the ERP workspace.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.sendInAppNotification}
                      onChange={e => setConfig({ ...config, sendInAppNotification: e.target.checked })}
                      className="rounded border-[#333] text-[#bef264] focus:ring-0"
                    />
                  </label>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#1a1a1a]">
                    <div>
                      <span className="font-semibold text-white block">Browser Desktop Push Notifications</span>
                      <span className="text-[10px] text-gray-400">
                        Pops a desktop notification when urgent alerts or new leads arrive, even if ERP is in background.
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-gray-400">
                        Permission: <strong className="text-white">{browserNotificationStatus}</strong>
                      </span>
                      {browserNotificationStatus !== 'granted' && (
                        <button
                          type="button"
                          onClick={handleRequestBrowserNotification}
                          className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-[11px] font-semibold rounded-md transition-colors"
                        >
                          Enable
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUTOMATED EVENT TRIGGERS */}
          {activeTab === 'triggers' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/20 via-[#141414] to-[#141414] border border-amber-500/20 text-amber-300">
                <div className="flex items-center gap-2 font-bold mb-1 text-white">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span>Automated System Notification &amp; Email Triggers</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  Turn automated email dispatches and operational notifications on or off for key solar lifecycle events. Whenever an event occurs in the CRM, the system will automatically format and send alerts.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    key: 'newLeadAlert' as const,
                    title: 'New Lead Intake & Assignment',
                    desc: 'Dispatches instant lead alerts with customer contact info, postcode, and kW demand to assigned sales reps & admin.'
                  },
                  {
                    key: 'leadProposalSentAlert' as const,
                    title: 'Customer Proposal & Quote Dispatch',
                    desc: 'Sends solar quote with STC rebate savings breakdown, battery storage specs, and acceptance link to homeowner.'
                  },
                  {
                    key: 'projectStageAlert' as const,
                    title: 'Project Milestone & DNSP Progression',
                    desc: 'Notifies customer when DNSP grid approval is granted, site survey is booked, or installation is completed.'
                  },
                  {
                    key: 'installOrderDispatchedAlert' as const,
                    title: 'Subcontractor Job Order Dispatch',
                    desc: 'Emails installer contractor job pack with roof layout, inverter serials, and SWMS safety sign-off.'
                  },
                  {
                    key: 'serviceTicketAlert' as const,
                    title: 'Service & Maintenance Ticket Escalations',
                    desc: 'Alerts customer with ticket tracking number and notifies field service technician of priority warranty tasks.'
                  },
                  {
                    key: 'xeroInvoiceAlert' as const,
                    title: 'Xero Invoices & Payment Receipts',
                    desc: 'Dispatches deposit invoice link and confirms receipt of bank transfer or credit card payments.'
                  },
                  {
                    key: 'staffInviteAlert' as const,
                    title: 'ERP Staff Invites & Password Resets',
                    desc: 'Emails welcome message with one-time secure password creation URL for new solar team members.'
                  },
                  {
                    key: 'stcClaimAlert' as const,
                    title: 'BridgeSelect STC Rebate Audit Notice',
                    desc: 'Sends compliance summary when STC certificates are registered and validated against CER registry.'
                  },
                  {
                    key: 'customerPortalAlert' as const,
                    title: 'Customer & Installer Portal Magic Links',
                    desc: 'Dispatches customer portal login credentials, temporary passwords, and direct account links.'
                  }
                ].map(trigger => (
                  <div
                    key={trigger.key}
                    onClick={() =>
                      setConfig({
                        ...config,
                        triggers: {
                          ...config.triggers,
                          [trigger.key]: !config.triggers[trigger.key]
                        }
                      })
                    }
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                      config.triggers[trigger.key]
                        ? 'bg-[#151e12] border-emerald-500/40 text-white'
                        : 'bg-[#141414] border-[#292929] text-gray-400 hover:border-[#383838]'
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">{trigger.title}</span>
                        {config.triggers[trigger.key] ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Active
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#222] text-gray-500">
                            Disabled
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 leading-normal">{trigger.desc}</p>
                    </div>

                    <input
                      type="checkbox"
                      checked={config.triggers[trigger.key]}
                      onChange={() => {}} // handled by div click
                      className="mt-1 rounded border-[#333] text-[#bef264] focus:ring-0 pointer-events-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: LIVE TEST DISPATCHER */}
          {activeTab === 'test' && (
            <form onSubmit={handleTriggerTest} className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#141414] border border-[#2d2d2d] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Send className="w-4 h-4 text-[#bef264]" />
                    <span>Send Live Deliverability Test Email</span>
                  </h3>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Mode: <strong className="text-white">{config.deliveryMode.toUpperCase()}</strong>
                  </span>
                </div>

                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Verify your email dispatch pipeline immediately. We will construct a test message using your configured sender identity and active delivery channel, and deliver it to your inbox.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 mb-1">
                      Test Recipient Email Address <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={testRecipient}
                      onChange={e => setTestRecipient(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1c1c1c] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] outline-none font-mono"
                      placeholder={`admin@${connectedDomain}`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 mb-1">
                      Sender Mailbox (From)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={`${config.senderName} <${config.senderEmail}>`}
                      className="w-full px-3 py-2 bg-[#181818] border border-[#282828] rounded-lg text-xs text-gray-400 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">
                    Custom Test Note (Included in Body)
                  </label>
                  <textarea
                    rows={2}
                    value={testCustomNote}
                    onChange={e => setTestCustomNote(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1c1c1c] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] outline-none"
                    placeholder="Enter notes for this test run..."
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSendingTest}
                    className="px-4 py-2 bg-[#bef264] hover:bg-[#a3e635] text-black font-bold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
                  >
                    <Send className={`w-3.5 h-3.5 ${isSendingTest ? 'animate-bounce' : ''}`} />
                    <span>{isSendingTest ? 'Dispatching Test Email...' : 'Send Live Test Email Now'}</span>
                  </button>
                </div>
              </div>

              {/* Test Result Feedback */}
              {testResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>

                  {testResult.details && (
                    <div className="bg-black/30 p-2.5 rounded-lg border border-white/5 font-mono text-[11px] space-y-1 text-gray-300">
                      <div>Channel: <strong className="text-white">{testResult.details.channel}</strong></div>
                      <div>Status: <span className="text-emerald-400 font-bold">{testResult.details.status}</span></div>
                      <div>Message ID: <span className="text-gray-400">{testResult.details.messageId}</span></div>
                      <div>Timestamp: <span className="text-gray-400">{testResult.details.timestamp}</span></div>
                    </div>
                  )}

                  {!testResult.success && (
                    <div className="pt-2 flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setActiveTab('delivery')}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors border border-white/20"
                      >
                        <Sliders className="w-3.5 h-3.5 text-amber-400" />
                        <span>Check Delivery Settings (Custom SMTP / Webhook)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </form>
          )}

          {/* TAB 5: OUTBOX & SENT HISTORY LEDGER */}
          {activeTab === 'logs' && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">Dispatched System Email Ledger</h3>
                  <p className="text-[11px] text-gray-400">
                    Audit trail of all automated alerts, proposals, portal links, and customer emails.
                  </p>
                </div>
                {logs.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Clear all outbound email logs?')) {
                        clearOutboundEmailLogs();
                        setLogs([]);
                      }
                    }}
                    className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear Logs</span>
                  </button>
                )}
              </div>

              {logs.length === 0 ? (
                <div className="p-8 text-center bg-[#141414] rounded-xl border border-[#2d2d2d] text-gray-400 space-y-2">
                  <Mail className="w-8 h-8 text-gray-600 mx-auto" />
                  <p className="font-semibold text-white">No Outbound Emails Logged Yet</p>
                  <p className="text-[11px] text-gray-500">
                    Emails dispatched via automated triggers or test runs will appear here with delivery receipts.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map(log => (
                    <div
                      key={log.id}
                      className="p-3 bg-[#141414] hover:bg-[#181818] border border-[#262626] rounded-xl transition-colors space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                              log.status === 'delivered'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : log.status === 'failed'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {log.status}
                          </span>
                          <strong className="text-white text-xs truncate">{log.subject}</strong>
                        </div>

                        <span className="text-[10px] text-gray-500 shrink-0 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull;{' '}
                          {new Date(log.timestamp).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400">
                        <div>
                          To: <strong className="text-gray-200 font-mono">{log.to}</strong> &bull; Channel:{' '}
                          <span className="text-[#bef264]">{log.channel}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedPreviewLog(log)}
                            className="px-2 py-0.5 bg-[#252525] hover:bg-[#333] text-gray-200 rounded text-[11px] flex items-center gap-1 border border-[#383838]"
                          >
                            <Eye className="w-3 h-3 text-[#bef264]" />
                            <span>Preview</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResendLog(log)}
                            className="px-2 py-0.5 bg-[#252525] hover:bg-[#333] text-gray-200 rounded text-[11px] flex items-center gap-1 border border-[#383838]"
                          >
                            <RefreshCw className="w-3 h-3 text-blue-400" />
                            <span>Resend</span>
                          </button>
                        </div>
                      </div>

                      {log.errorMessage && (
                        <div className="text-[10px] text-rose-400 bg-rose-500/10 p-1.5 rounded border border-rose-500/20 font-mono">
                          Error: {log.errorMessage}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-[#262626] bg-[#141414] flex items-center justify-between shrink-0">
          <div className="text-[11px] text-gray-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>All system alerts synchronized across ERP modules</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#222] hover:bg-[#2e2e2e] text-gray-300 text-xs font-semibold rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold rounded-lg transition-colors shadow-xs"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Email Body Preview Modal */}
      {selectedPreviewLog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-[#141414] border border-[#333] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b border-[#262626] bg-[#1a1a1a]">
              <div>
                <h4 className="text-sm font-bold text-white truncate">{selectedPreviewLog.subject}</h4>
                <p className="text-[11px] text-gray-400 font-mono">
                  Recipient: {selectedPreviewLog.to} &bull; Channel: {selectedPreviewLog.channel}
                </p>
              </div>
              <button
                onClick={() => setSelectedPreviewLog(null)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#262626]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 bg-white text-black">
              <div dangerouslySetInnerHTML={{ __html: selectedPreviewLog.bodyHtml }} />
            </div>
            <div className="p-3 border-t border-[#262626] bg-[#181818] flex justify-end">
              <button
                onClick={() => setSelectedPreviewLog(null)}
                className="px-4 py-1.5 bg-[#262626] hover:bg-[#333] text-white text-xs font-semibold rounded-lg"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
