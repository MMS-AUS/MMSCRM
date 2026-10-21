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
  Info,
  Copy,
  Database,
  Search,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  SystemEmailConfig,
  OutboundEmailLog,
  EmailDeliveryMode
} from '../../types';
import {
  getSystemEmailConfig,
  saveSystemEmailConfig,
  saveSystemEmailConfigAsync,
  fetchServerSystemEmailConfig,
  verifySmtpSettings,
  getOutboundEmailLogs,
  sendSystemEmail,
  clearOutboundEmailLogs,
  fetchDbEmailLogs,
  fetchEmailLogsMigrationSql,
  clearDbEmailLogsApi
} from '../../services/systemAlertsEmailService';
import { SmtpDiagnosticModal } from '../modals/SmtpDiagnosticModal';

interface Props {
  isLight: boolean;
}

export const SystemEmailSettingsTab: React.FC<Props> = ({ isLight }) => {
  const [config, setConfig] = useState<SystemEmailConfig>(getSystemEmailConfig());
  const [logs, setLogs] = useState<OutboundEmailLog[]>(getOutboundEmailLogs());
  const [dbLogs, setDbLogs] = useState<any[]>([]);
  const [logsSource, setLogsSource] = useState<'supabase' | 'local'>('local');
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logsFilter, setLogsFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [logsSearch, setLogsSearch] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [tableStatus, setTableStatus] = useState<{ supabaseConfigured: boolean; emailLogsTableOk: boolean; message: string } | null>(null);
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);

  const [isSaved, setIsSaved] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  
  // Connection verification state
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  // Test email state
  const [testRecipient, setTestRecipient] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; mode?: string } | null>(null);

  const loadLogs = async (filter = logsFilter, search = logsSearch) => {
    setIsLoadingLogs(true);
    try {
      const successParam = filter === 'all' ? undefined : filter === 'success';
      const res = await fetchDbEmailLogs({
        success: successParam,
        search: search ? search.trim() : undefined,
        limit: 100
      });
      setDbLogs(res.logs || []);
      setLogsSource(res.source);
    } catch (err) {
      console.warn('Failed loading email logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const checkTable = async () => {
    try {
      const res = await fetch('/api/email/logs/status');
      const text = await res.text().catch(() => '');
      if (text && text.trim()) {
        const data = JSON.parse(text);
        if (data && data.success) {
          setTableStatus(data);
        }
      }
    } catch {}
  };

  useEffect(() => {
    // Hydrate latest configuration from backend server database, fallback to local storage
    fetchServerSystemEmailConfig().then(srvConfig => {
      if (srvConfig) {
        setConfig(srvConfig);
      }
    }).catch(() => {
      setConfig(getSystemEmailConfig());
    });
    setLogs(getOutboundEmailLogs());
    loadLogs('all', '');
    checkTable();
  }, []);

  const handleCopySql = async () => {
    try {
      const sql = await fetchEmailLogsMigrationSql();
      if (sql) {
        await navigator.clipboard.writeText(sql);
        setCopiedSql(true);
        setTimeout(() => setCopiedSql(false), 3500);
      }
    } catch {}
  };

  const handleSave = async () => {
    const hasSmtp = Boolean((config.smtpHost || '').trim() && (config.smtpUsername || '').trim());
    const toSave: SystemEmailConfig = {
      ...config,
      deliveryMode: hasSmtp && config.deliveryMode === 'simulation_audit' ? 'custom_smtp' : config.deliveryMode
    };
    const updated = await saveSystemEmailConfigAsync(toSave);
    setConfig(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionTestResult(null);
    try {
      const res = await verifySmtpSettings(config);
      setConnectionTestResult(res);
      // Immediately reload logs to show the new connection test log
      setTimeout(() => loadLogs(), 500);
    } catch (err: any) {
      setConnectionTestResult({
        success: false,
        message: err.message || 'SMTP connection verification failed.'
      });
      setTimeout(() => loadLogs(), 500);
    } finally {
      setIsTestingConnection(false);
    }
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
      // Auto-persist config before testing to ensure server has current credentials
      saveSystemEmailConfigAsync(config).catch(() => {});

      const result = await sendSystemEmail({
        to: testRecipient,
        subject: 'MySolarCRM System Mailer Test Notification',
        category: 'System Diagnostic Test',
        customConfig: config,
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
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #0f172a;">${config.senderName} &lt;${config.senderEmail || config.smtpUsername || 'default@system'}&gt;</td>
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
      loadLogs();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'System test dispatch failed.'
      });
      loadLogs();
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleClearLogs = async () => {
    if (confirm('Clear all system email and SMTP diagnostic logs?')) {
      await clearDbEmailLogsApi();
      setLogs([]);
      setDbLogs([]);
    }
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

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setIsDiagnosticModalOpen(true)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Open the SMTP Diagnostic Console to troubleshoot connection and delivery errors"
            >
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Diagnostic Console</span>
            </button>

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
              <div className={`p-4 rounded-xl border space-y-3.5 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-500" />
                    <h4 className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                      SMTP Relay Connection Parameters
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsDiagnosticModalOpen(true)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="Open full SMTP diagnostic console"
                    >
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Troubleshoot & Logs</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTestingConnection || !config.smtpHost || !config.smtpUsername}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {isTestingConnection ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          <span>Verifying Connection...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span>Test SMTP Connection</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Connection Test Feedback */}
                {connectionTestResult && (
                  <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    connectionTestResult.success
                      ? (isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-950/40 border-emerald-800 text-emerald-200')
                      : (isLight ? 'bg-red-50 border-red-200 text-red-900' : 'bg-red-950/40 border-red-800 text-red-200')
                  }`}>
                    {connectionTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5 flex-1">
                      <p className="font-semibold">{connectionTestResult.message}</p>
                      {connectionTestResult.details?.response && (
                        <p className="text-[10px] opacity-75 font-mono">{String(connectionTestResult.details.response)}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      SMTP Host Server *
                    </label>
                    <input
                      type="text"
                      value={config.smtpHost}
                      onChange={e => setConfig({ ...config, smtpHost: e.target.value })}
                      placeholder="e.g. smtp.gmail.com, smtp.mailgun.org, smtp.sendgrid.net"
                      className={`w-full text-xs px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono ${
                        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`block text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        Port *
                      </label>
                      <div className="flex items-center gap-1 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setConfig({ ...config, smtpPort: 587, smtpSecure: false })}
                          className={`px-1.5 py-0.5 rounded cursor-pointer ${
                            config.smtpPort === 587 && !config.smtpSecure
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          587
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfig({ ...config, smtpPort: 465, smtpSecure: true })}
                          className={`px-1.5 py-0.5 rounded cursor-pointer ${
                            config.smtpPort === 465 && config.smtpSecure
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          465
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      value={config.smtpPort}
                      onChange={e => {
                        const p = parseInt(e.target.value) || 587;
                        setConfig({
                          ...config,
                          smtpPort: p,
                          smtpSecure: p === 465 ? true : (p === 587 ? false : config.smtpSecure)
                        });
                      }}
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
                      SMTP Username / Account *
                    </label>
                    <input
                      type="text"
                      value={config.smtpUsername}
                      onChange={e => setConfig({ ...config, smtpUsername: e.target.value })}
                      placeholder="e.g. solar-system@yourdomain.com or user@gmail.com"
                      className={`w-full text-xs px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono ${
                        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      SMTP Password / App Password *
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

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.smtpSecure}
                      onChange={e => setConfig({ ...config, smtpSecure: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <span className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      Require Direct SSL/TLS (Always enabled for Port 465; Keep off for Port 587 STARTTLS)
                    </span>
                  </label>
                </div>

                {/* Helpful Provider Guide */}
                <div className={`p-3 rounded-xl border text-[11px] leading-relaxed space-y-1 ${
                  isLight ? 'bg-sky-50/70 border-sky-200 text-sky-900' : 'bg-sky-950/30 border-sky-800/60 text-sky-200'
                }`}>
                  <p className="font-semibold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                    <span>Quick Configuration Guide:</span>
                  </p>
                  <p>
                    &bull; <strong>Gmail / Google Workspace:</strong> Host: <code className="font-mono">smtp.gmail.com</code> | Port: <code className="font-mono">587</code> | Password: 16-character <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline font-bold">Google App Password</a>.
                  </p>
                  <p>
                    &bull; <strong>Microsoft Office 365 / Outlook:</strong> Host: <code className="font-mono">smtp.office365.com</code> | Port: <code className="font-mono">587</code> (STARTTLS).
                  </p>
                  <p>
                    &bull; <strong>Mailgun / SendGrid:</strong> Host: <code className="font-mono">smtp.mailgun.org</code> or <code className="font-mono">smtp.sendgrid.net</code> | Port: <code className="font-mono">587</code>.
                  </p>
                </div>
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

      {/* Full-width Section: Supabase email_logs Table & SMTP Diagnostics */}
      <div className={`border rounded-2xl p-6 space-y-5 ${
        isLight ? 'bg-white border-slate-200 shadow-soft-sm' : 'bg-slate-900/70 border-slate-800'
      }`}>
        {/* Header & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Database className="w-5 h-5 text-emerald-500" />
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Supabase 'email_logs' Diagnostic Table
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                logsSource === 'supabase'
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400'
                  : 'bg-purple-500/10 text-purple-600 border-purple-500/30 dark:text-purple-400'
              }`}>
                {logsSource === 'supabase' ? '● Supabase Cloud Active' : '○ Local Database Cache'}
              </span>
              {tableStatus && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                  tableStatus.emailLogsTableOk
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                }`}>
                  {tableStatus.message}
                </span>
              )}
            </div>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Captures all outbound emails, verification attempts, delivery success status, and granular SMTP error codes (e.g. EDNS, EAUTH, ECONNREFUSED) for debugging configuration issues.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleCopySql}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm ${
                copiedSql
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : (isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200')
              }`}
              title="Copy the SQL migration script to create public.email_logs in Supabase"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'SQL Copied!' : 'Copy Supabase SQL'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                loadLogs(logsFilter, logsSearch);
                checkTable();
              }}
              disabled={isLoadingLogs}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title="Refresh logs from Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin text-emerald-500' : ''}`} />
            </button>

            {dbLogs.length > 0 && (
              <button
                type="button"
                onClick={handleClearLogs}
                className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Table</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            {(['all', 'success', 'failed'] as const).map(f => {
              const active = logsFilter === f;
              const count = f === 'all'
                ? dbLogs.length
                : dbLogs.filter(l => f === 'success' ? l.success : !l.success).length;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setLogsFilter(f);
                    loadLogs(f, logsSearch);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all capitalize flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? (isLight ? 'bg-white text-slate-900 shadow-sm' : 'bg-slate-700 text-white shadow-sm')
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{f === 'failed' ? 'Errors / Failed' : f}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    f === 'failed'
                      ? 'bg-rose-500/20 text-rose-500 font-bold'
                      : f === 'success'
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={logsSearch}
              onChange={e => {
                const val = e.target.value;
                setLogsSearch(val);
                loadLogs(logsFilter, val);
              }}
              placeholder="Search by recipient, subject, error message, or SMTP host..."
              className={`w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
              }`}
            />
          </div>
        </div>

        {/* Diagnostic Logs Table */}
        {isLoadingLogs ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
            <p className="text-xs">Querying Supabase email_logs table...</p>
          </div>
        ) : dbLogs.length === 0 ? (
          <div className={`p-8 text-center rounded-xl border space-y-2 ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-950/40 border-slate-800 text-slate-400'
          }`}>
            <Database className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-xs font-semibold">No Email Logs Found</p>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto">
              Any SMTP connection tests, verification attempts, or outbound automated emails will automatically appear here with complete delivery receipts and failure stack traces.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={isLight ? 'bg-slate-50 text-slate-600 border-b border-slate-200' : 'bg-slate-950/80 text-slate-400 border-b border-slate-800'}>
                  <th className="py-2.5 px-3 font-semibold w-28">Status</th>
                  <th className="py-2.5 px-3 font-semibold w-48">Recipient</th>
                  <th className="py-2.5 px-3 font-semibold">Subject & Category</th>
                  <th className="py-2.5 px-3 font-semibold w-44">SMTP Server</th>
                  <th className="py-2.5 px-3 font-semibold">SMTP Error Diagnostics</th>
                  <th className="py-2.5 px-3 font-semibold w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dbLogs.map((log: any) => {
                  const isExpanded = expandedLogId === log.id;
                  const isSuccess = Boolean(log.success);
                  const recipient = log.recipient_email || (Array.isArray(log.recipient_emails) ? log.recipient_emails.join(', ') : log.to || 'Unknown');
                  const errorMsg = log.error_message || (log.error_details?.message ? String(log.error_details.message) : null);
                  const sentDate = log.sent_at || log.created_at || log.timestamp;

                  return (
                    <React.Fragment key={log.id}>
                      <tr className={`transition-colors ${
                        isExpanded
                          ? (isLight ? 'bg-slate-100/70' : 'bg-slate-800/60')
                          : (isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/30')
                      }`}>
                        {/* Status */}
                        <td className="py-2.5 px-3 align-top">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              isSuccess
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400'
                                : 'bg-rose-500/10 text-rose-600 border-rose-500/30 dark:text-rose-400'
                            }`}>
                              {isSuccess ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <AlertTriangle className="w-3 h-3 text-rose-500" />}
                              <span>{isSuccess ? (log.status || 'SENT') : 'FAILED'}</span>
                            </span>
                            <div className="text-[10px] font-mono text-slate-400">
                              {sentDate ? new Date(sentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                            </div>
                          </div>
                        </td>

                        {/* Recipient */}
                        <td className="py-2.5 px-3 align-top">
                          <div className="font-mono text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[190px]" title={recipient}>
                            {recipient}
                          </div>
                          {log.sender_email && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[190px]" title={log.sender_email}>
                              From: {log.sender_name ? `${log.sender_name} ` : ''}&lt;{log.sender_email}&gt;
                            </div>
                          )}
                        </td>

                        {/* Subject */}
                        <td className="py-2.5 px-3 align-top">
                          <div className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                            {log.subject || '(No Subject)'}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                              {log.category || log.delivery_mode || 'general'}
                            </span>
                            {log.message_id && (
                              <span className="text-[9px] font-mono text-slate-400 truncate max-w-[160px]" title={log.message_id}>
                                ID: {log.message_id}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* SMTP Server */}
                        <td className="py-2.5 px-3 align-top">
                          {log.smtp_host ? (
                            <div className="space-y-0.5">
                              <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                                {log.smtp_host}:{log.smtp_port || 587}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {log.smtp_secure ? 'SSL/TLS (Port 465)' : 'STARTTLS (Port 587)'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Local Dispatch</span>
                          )}
                        </td>

                        {/* Error Diagnostics */}
                        <td className="py-2.5 px-3 align-top">
                          {isSuccess ? (
                            <div className="text-emerald-600 dark:text-emerald-400 text-[11px] flex items-center gap-1 font-medium">
                              <span>✓ Handshake & transmission confirmed</span>
                              {log.smtp_response_code && (
                                <span className="font-mono text-[10px] opacity-75">({log.smtp_response_code})</span>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="text-rose-600 dark:text-rose-400 text-[11px] font-semibold break-words">
                                {errorMsg || 'SMTP handshake rejected or connection timed out.'}
                              </div>
                              {(log.error_code || log.error_command) && (
                                <div className="flex items-center gap-2 text-[10px] font-mono text-rose-500">
                                  {log.error_code && <span className="px-1 py-0.2 rounded bg-rose-500/10 border border-rose-500/20">Code: {log.error_code}</span>}
                                  {log.error_command && <span className="px-1 py-0.2 rounded bg-rose-500/10 border border-rose-500/20">Cmd: {log.error_command}</span>}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 align-top text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className={`px-2 py-1 rounded text-[11px] font-medium border flex items-center gap-1 ml-auto cursor-pointer transition-colors ${
                              isExpanded
                                ? 'bg-slate-800 text-white border-slate-700'
                                : (isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300')
                            }`}
                          >
                            <span>{isExpanded ? 'Hide' : 'Details'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable JSON & Diagnostics Drawer */}
                      {isExpanded && (
                        <tr className={isLight ? 'bg-slate-100/90' : 'bg-slate-950'}>
                          <td colSpan={6} className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-xs font-semibold">
                                <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>
                                  Full SMTP Transmission & Diagnostic Record (UUID: {log.id})
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  Timestamp: {sentDate ? new Date(sentDate).toISOString() : '—'}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                                <div className={`p-2.5 rounded-lg border space-y-1 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                                  <div className="font-semibold text-slate-500">SMTP Parameters</div>
                                  <div className="font-mono">Host: {log.smtp_host || '—'}</div>
                                  <div className="font-mono">Port: {log.smtp_port || '—'}</div>
                                  <div className="font-mono">Security: {log.smtp_secure ? 'Direct SSL/TLS' : 'STARTTLS'}</div>
                                  <div className="font-mono">Username: {log.smtp_username || '—'}</div>
                                </div>

                                <div className={`p-2.5 rounded-lg border space-y-1 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                                  <div className="font-semibold text-slate-500">Recipients & Dispatch</div>
                                  <div className="font-mono truncate">To: {recipient}</div>
                                  <div className="font-mono truncate">Accepted: {Array.isArray(log.accepted_recipients) && log.accepted_recipients.length > 0 ? log.accepted_recipients.join(', ') : 'None'}</div>
                                  <div className="font-mono truncate text-rose-500">Rejected: {Array.isArray(log.rejected_recipients) && log.rejected_recipients.length > 0 ? log.rejected_recipients.join(', ') : 'None'}</div>
                                  <div className="font-mono">Mode: {log.delivery_mode || 'custom_smtp'}</div>
                                </div>

                                <div className={`p-2.5 rounded-lg border space-y-1 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                                  <div className="font-semibold text-slate-500">Error & Stack Signature</div>
                                  <div className="font-mono text-rose-500">Code: {log.error_code || 'None'}</div>
                                  <div className="font-mono">Command: {log.error_command || 'None'}</div>
                                  <div className="font-mono">Status: {log.status || 'unknown'}</div>
                                </div>
                              </div>

                              {log.snippet && (
                                <div className={`p-2.5 rounded-lg border space-y-1 text-xs ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                                  <div className="font-semibold text-slate-500 text-[11px]">Email Snippet</div>
                                  <div className="text-slate-700 dark:text-slate-300 font-mono text-[11px] whitespace-pre-wrap">{log.snippet}</div>
                                </div>
                              )}

                              {log.error_details && Object.keys(log.error_details).length > 0 && (
                                <div className="space-y-1">
                                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                    Raw Error Details JSON
                                  </div>
                                  <pre className="p-3 rounded-lg bg-black text-emerald-400 font-mono text-[10px] overflow-x-auto max-h-48 border border-slate-800">
                                    {JSON.stringify(log.error_details, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SMTP Diagnostic Modal Component */}
      <SmtpDiagnosticModal
        isOpen={isDiagnosticModalOpen}
        onClose={() => {
          setIsDiagnosticModalOpen(false);
          loadLogs();
        }}
      />
    </div>
  );
};
