import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Server,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Bell,
  Sliders,
  FileText,
  UserCheck,
  Briefcase,
  Zap,
  Clock,
  Trash2,
  Terminal,
  ExternalLink,
  Info
} from 'lucide-react';
import {
  SystemEmailConfig,
  OutboundEmailLog,
  EmailDeliveryMode
} from '../../types';
import {
  getSystemEmailConfig,
  saveSystemEmailConfig,
  getOutboundEmailLogs,
  sendSystemEmail,
  clearOutboundEmailLogs
} from '../../services/systemAlertsEmailService';

interface Props {
  isLight: boolean;
}

export const SystemEmailSettingsTab: React.FC<Props> = ({ isLight }) => {
  const [config, setConfig] = useState<SystemEmailConfig>(getSystemEmailConfig());
  const [logs, setLogs] = useState<OutboundEmailLog[]>(getOutboundEmailLogs());
  const [isSaved, setIsSaved] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  
  // Test email state
  const [testRecipient, setTestRecipient] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; mode?: string } | null>(null);

  useEffect(() => {
    setConfig(getSystemEmailConfig());
    setLogs(getOutboundEmailLogs());
  }, []);

  const handleSave = () => {
    const updated = saveSystemEmailConfig(config);
    setConfig(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleAddAdminEmail = () => {
    if (!newAdminEmail || !newAdminEmail.includes('@')) return;
    if (config.adminAlertEmails.includes(newAdminEmail.trim())) return;
    
    const updatedEmails = [...config.adminAlertEmails, newAdminEmail.trim()];
    const updated = { ...config, adminAlertEmails: updatedEmails };
    setConfig(updated);
    saveSystemEmailConfig(updated);
    setNewAdminEmail('');
  };

  const handleRemoveAdminEmail = (emailToRemove: string) => {
    const updatedEmails = config.adminAlertEmails.filter(e => e !== emailToRemove);
    const updated = { ...config, adminAlertEmails: updatedEmails };
    setConfig(updated);
    saveSystemEmailConfig(updated);
  };

  const handleToggleTrigger = (triggerKey: keyof typeof config.triggers) => {
    const updated = {
      ...config,
      triggers: {
        ...config.triggers,
        [triggerKey]: !config.triggers[triggerKey]
      }
    };
    setConfig(updated);
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient) return;

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const result = await sendSystemEmail({
        to: testRecipient,
        subject: 'MySolarCRM System Mailer Test Notification',
        category: 'System Diagnostic Test',
        bodyHtml: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="background-color: #0f172a; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #f8fafc; margin: 0; font-size: 18px; letter-spacing: 0.5px;">MySolarCRM System Dispatcher</h2>
              <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px;">Default ERP Automated Alerts & Notification Engine</p>
            </div>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
              This is a verified test dispatch from your <strong>Default System Email Engine</strong>.
            </p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #64748b; width: 140px;">Delivery Channel:</td>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: bold;">${config.deliveryMode.toUpperCase()}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #64748b;">System Sender:</td>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #0f172a;">${config.senderName} &lt;${config.senderEmail || 'default@system'}&gt;</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #64748b;">Timestamp:</td>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #0f172a;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
            <p style="color: #10b981; font-weight: bold; font-size: 13px; margin-top: 16px;">
              ✓ Delivery successfully processed by system mail pipeline.
            </p>
          </div>
        `
      });

      setTestResult({
        success: result.success,
        message: result.success ? `Delivered via ${result.channel} (ID: ${result.messageId})` : (result.error || 'Dispatch failed'),
        mode: result.channel
      });
      setLogs(getOutboundEmailLogs());
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'System test dispatch failed.'
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleClearLogs = () => {
    clearOutboundEmailLogs();
    setLogs([]);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner explaining dedicated separation */}
      <div className={`p-5 rounded-2xl border ${
        isLight ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white border-slate-700 shadow-md' : 'bg-gradient-to-r from-slate-950 to-slate-900 text-white border-slate-800'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Default ERP Mail System
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/40">
                Independent of User Gmail
              </span>
            </div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <Mail className="w-5 h-5 text-emerald-400" />
              System Email, Automated Alerts & Notifications
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Configured exclusively for system-wide operations: transactional notifications, lead allocations, customer portal welcome credentials, solar quote dispatch, subcontractor install work orders, and Xero invoices. This runs on a dedicated system mailer, completely segregated from personal mailboxes.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSave}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{isSaved ? 'Settings Saved' : 'Save System Settings'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Default System Sender Identity */}
          <div className={`border rounded-2xl p-5 space-y-4 ${
            isLight ? 'bg-white border-slate-200 shadow-soft-xs' : 'bg-slate-900/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-500" />
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Default System Sender Identity
                </h3>
              </div>
              <span className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                ERP Global Mailer
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  System Sender Display Name *
                </label>
                <input
                  type="text"
                  value={config.senderName}
                  onChange={e => setConfig({ ...config, senderName: e.target.value })}
                  placeholder="e.g. Apex Solar Operations System"
                  className={`w-full text-xs px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                />
                <p className={`text-[10px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Appears in client and subcontractor inboxes as the sender.
                </p>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  System Sender Email Address *
                </label>
                <input
                  type="email"
                  value={config.senderEmail}
                  onChange={e => setConfig({ ...config, senderEmail: e.target.value })}
                  placeholder="e.g. system@apexsolar.com.au"
                  className={`w-full text-xs px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                />
                <p className={`text-[10px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Dedicated automated system email (not personal user address).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  Reply-To Address
                </label>
                <input
                  type="email"
                  value={config.replyToEmail}
                  onChange={e => setConfig({ ...config, replyToEmail: e.target.value })}
                  placeholder="e.g. support@apexsolar.com.au"
                  className={`w-full text-xs px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  Admin Notification Recipients
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={e => setNewAdminEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAdminEmail(); } }}
                    placeholder="admin@apexsolar.com.au"
                    className={`flex-1 text-xs px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleAddAdminEmail}
                    className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {config.adminAlertEmails.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {config.adminAlertEmails.map(email => (
                  <span
                    key={email}
                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-medium ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-200'
                    }`}
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAdminEmail(email)}
                      className="text-slate-400 hover:text-red-500 cursor-pointer text-xs"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Card 2: System Delivery Mode (Default Email System) */}
          <div className={`border rounded-2xl p-5 space-y-4 ${
            isLight ? 'bg-white border-slate-200 shadow-soft-xs' : 'bg-slate-900/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-500" />
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  System Delivery Pipeline
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-600 border border-sky-500/20">
                {config.deliveryMode}
              </span>
            </div>

            {/* Delivery Channel Radio Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div
                onClick={() => setConfig({ ...config, deliveryMode: 'custom_smtp' })}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  config.deliveryMode === 'custom_smtp'
                    ? (isLight ? 'bg-emerald-50/80 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20' : 'bg-emerald-950/40 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/20')
                    : (isLight ? 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60 text-slate-700' : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/40 text-slate-300')
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold">System SMTP Relay</span>
                  {config.deliveryMode === 'custom_smtp' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                </div>
                <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Corporate or cloud SMTP (Mailgun, SendGrid, Amazon SES, Postmark, corporate server).
                </p>
              </div>

              <div
                onClick={() => setConfig({ ...config, deliveryMode: 'webhook_gateway' })}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  config.deliveryMode === 'webhook_gateway'
                    ? (isLight ? 'bg-sky-50/80 border-sky-500 text-sky-900 ring-2 ring-sky-500/20' : 'bg-sky-950/40 border-sky-500 text-sky-200 ring-2 ring-sky-500/20')
                    : (isLight ? 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60 text-slate-700' : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/40 text-slate-300')
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold">Cloud Webhook Gateway</span>
                  {config.deliveryMode === 'webhook_gateway' && <CheckCircle2 className="w-3.5 h-3.5 text-sky-500" />}
                </div>
                <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Transactional API endpoints (Resend, SendGrid Mail, Mailgun REST, or custom proxy).
                </p>
              </div>

              <div
                onClick={() => setConfig({ ...config, deliveryMode: 'simulation_audit' })}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  config.deliveryMode === 'simulation_audit'
                    ? (isLight ? 'bg-purple-50/80 border-purple-500 text-purple-900 ring-2 ring-purple-500/20' : 'bg-purple-950/40 border-purple-500 text-purple-200 ring-2 ring-purple-500/20')
                    : (isLight ? 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60 text-slate-700' : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/40 text-slate-300')
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold">System Audit Ledger</span>
                  {config.deliveryMode === 'simulation_audit' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />}
                </div>
                <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Zero-configuration reliable internal dispatch ledger for development and staging.
                </p>
              </div>
            </div>

            {/* SMTP Settings Panel */}
            {config.deliveryMode === 'custom_smtp' && (
              <div className={`p-4 rounded-xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
              }`}>
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-500" />
                  <h4 className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    SMTP Relay Connection Parameters
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      SMTP Host *
                    </label>
                    <input
                      type="text"
                      value={config.smtpHost}
                      onChange={e => setConfig({ ...config, smtpHost: e.target.value })}
                      placeholder="e.g. smtp.mailgun.org, smtp.sendgrid.net, mail.apexsolar.com.au"
                      className={`w-full text-xs px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono ${
                        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      SMTP Port *
                    </label>
                    <input
                      type="number"
                      value={config.smtpPort}
                      onChange={e => setConfig({ ...config, smtpPort: parseInt(e.target.value) || 587 })}
                      placeholder="587"
                      className={`w-full text-xs px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono ${
                        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      SMTP Username
                    </label>
                    <input
                      type="text"
                      value={config.smtpUsername}
                      onChange={e => setConfig({ ...config, smtpUsername: e.target.value })}
                      placeholder="system-relay@apexsolar.com.au"
                      className={`w-full text-xs px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono ${
                        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      SMTP Password / Secret
                    </label>
                    <input
                      type="password"
                      value={config.smtpPassword}
                      onChange={e => setConfig({ ...config, smtpPassword: e.target.value })}
                      placeholder="••••••••••••••••"
                      className={`w-full text-xs px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono ${
                        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
                      }`}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={config.smtpSecure}
                    onChange={e => setConfig({ ...config, smtpSecure: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Use TLS / SSL encryption (recommended for ports 465 and 587)
                  </span>
                </label>
              </div>
            )}

            {/* Webhook Settings Panel */}
            {config.deliveryMode === 'webhook_gateway' && (
              <div className={`p-4 rounded-xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
              }`}>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Webhook Gateway Endpoint URL *
                  </label>
                  <input
                    type="url"
                    value={config.webhookUrl}
                    onChange={e => setConfig({ ...config, webhookUrl: e.target.value })}
                    placeholder="https://api.resend.com/emails or https://api.sendgrid.com/v3/mail/send"
                    className={`w-full text-xs px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono ${
                      isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      API Authorization Key / Bearer Token
                    </label>
                    <input
                      type="password"
                      value={config.webhookApiKey}
                      onChange={e => setConfig({ ...config, webhookApiKey: e.target.value })}
                      placeholder="re_xxxxxxxx or SG.xxxx"
                      className={`w-full text-xs px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono ${
                        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      Payload Standard
                    </label>
                    <select
                      value={config.webhookPayloadType}
                      onChange={e => setConfig({ ...config, webhookPayloadType: e.target.value as any })}
                      className={`w-full text-xs px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
                      }`}
                    >
                      <option value="resend">Resend API Standard</option>
                      <option value="sendgrid">SendGrid Mail Send API</option>
                      <option value="mailgun">Mailgun Messages API</option>
                      <option value="standard">Generic Webhook (To, Subject, HTML)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Automated System Alert Triggers */}
          <div className={`border rounded-2xl p-5 space-y-4 ${
            isLight ? 'bg-white border-slate-200 shadow-soft-xs' : 'bg-slate-900/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Automated Operational Alert Subscriptions
                </h3>
              </div>
              <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Triggered automatically by CRM workflow events
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'newLeadAlert', label: 'New Inbound Solar Lead Received', desc: 'Dispatches alert with customer contact & system specs' },
                { key: 'leadProposalSentAlert', label: 'Proposal & Quote Sent to Customer', desc: 'Alerts sales team when formal solar quote is published' },
                { key: 'projectStageAlert', label: 'Project Milestone & Stage Change', desc: 'Notifies team upon Engineering, Approval, or Ready-to-Build' },
                { key: 'installOrderDispatchedAlert', label: 'Subcontractor Installation Work Order', desc: 'Dispatches site access packet and electrical SLD to installers' },
                { key: 'serviceTicketAlert', label: 'Service & Inverter Maintenance Ticket', desc: 'Alerts technician when system fault or warranty case opens' },
                { key: 'xeroInvoiceAlert', label: 'Xero Invoice & Milestone Deposit Issued', desc: 'Dispatches invoice PDF receipt to accounts and customer' },
                { key: 'staffInviteAlert', label: 'Team User Invitation & Password Reset', desc: 'Sends secure onboarding link to newly registered staff' },
                { key: 'stcClaimAlert', label: 'Clean Energy Regulator STC Claim Status', desc: 'Updates operations upon STC creation, audit, or REC trade' },
                { key: 'customerPortalAlert', label: 'Customer Portal Access Credentials', desc: 'Delivers magic login links and project tracking credentials' }
              ].map(item => {
                const isActive = config.triggers[item.key as keyof typeof config.triggers];
                return (
                  <div
                    key={item.key}
                    onClick={() => handleToggleTrigger(item.key as keyof typeof config.triggers)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                      isActive
                        ? (isLight ? 'bg-emerald-50/50 border-emerald-200 text-slate-900' : 'bg-emerald-950/20 border-emerald-800 text-white')
                        : (isLight ? 'bg-slate-50/40 border-slate-200 text-slate-500 opacity-60' : 'bg-slate-950/20 border-slate-800 text-slate-400 opacity-60')
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold">{item.label}</div>
                      <div className="text-[10px] text-slate-500">{item.desc}</div>
                    </div>
                    <div className={`w-8 h-4.5 rounded-full transition-colors relative shrink-0 mt-0.5 ${
                      isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}>
                      <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${
                        isActive ? 'right-0.5' : 'left-0.5'
                      }`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Diagnostic Tester & Outbound Ledger (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 4: Immediate Diagnostic Test Dispatch */}
          <div className={`border rounded-2xl p-5 space-y-4 ${
            isLight ? 'bg-white border-slate-200 shadow-soft-xs' : 'bg-slate-900/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-500" />
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Dispatch System Test Email
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Live Diagnostic
              </span>
            </div>

            <form onSubmit={handleSendTestEmail} className="space-y-3">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  Recipient Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={testRecipient}
                  onChange={e => setTestRecipient(e.target.value)}
                  placeholder="your-email@example.com"
                  className={`w-full text-xs px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                />
              </div>

              {testResult && (
                <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  testResult.success
                    ? (isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/40 border-emerald-800 text-emerald-200')
                    : (isLight ? 'bg-red-50 border-red-200 text-red-800' : 'bg-red-950/40 border-red-800 text-red-200')
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold">{testResult.message}</p>
                    {testResult.mode && (
                      <p className="text-[10px] opacity-80 mt-0.5">Mode: {testResult.mode}</p>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSendingTest}
                className="w-full py-2.5 px-4 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {isSendingTest ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Transmitting System Email...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send System Test Email</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Card 5: Dispatched System Email Ledger */}
          <div className={`border rounded-2xl p-5 space-y-4 ${
            isLight ? 'bg-white border-slate-200 shadow-soft-xs' : 'bg-slate-900/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  System Email Dispatch Ledger
                </h3>
              </div>
              {logs.length > 0 && (
                <button
                  onClick={handleClearLogs}
                  className="text-[11px] text-slate-400 hover:text-red-500 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {logs.length === 0 ? (
              <div className={`p-8 rounded-xl border text-center space-y-2 ${
                isLight ? 'bg-slate-50/60 border-slate-200 text-slate-500' : 'bg-slate-950/40 border-slate-800 text-slate-400'
              }`}>
                <FileText className="w-6 h-6 mx-auto opacity-40" />
                <p className="text-xs font-medium">No system emails dispatched in this session</p>
                <p className="text-[10px] text-slate-400">
                  Automated alerts will appear here with delivery timestamps and payload statuses.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {logs.slice(0, 15).map(log => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                      isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-semibold truncate max-w-[200px] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {log.subject}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                        log.status === 'delivered' || log.status === 'sent'
                          ? (isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30')
                          : (isLight ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-purple-500/20 text-purple-300 border-purple-500/30')
                      }`}>
                        {log.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate">To: {log.to}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className="text-[10px] font-mono text-slate-400 truncate">
                      Channel: {log.channel} • Sender: {log.from}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
