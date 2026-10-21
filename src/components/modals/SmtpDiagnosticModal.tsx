import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Database,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Copy,
  Check,
  Trash2,
  Zap,
  Clock,
  ChevronDown,
  ChevronUp,
  Server,
  Mail,
  ShieldCheck,
  ExternalLink,
  Info,
  Download,
  AlertCircle,
  HelpCircle,
  CheckCircle
} from 'lucide-react';
import {
  fetchDbEmailLogs,
  fetchEmailLogsMigrationSql,
  clearDbEmailLogsApi,
  verifySmtpSettings,
  getSystemEmailConfig,
  fetchServerSystemEmailConfig
} from '../../services/systemAlertsEmailService';
import { SystemEmailConfig } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}

export const SmtpDiagnosticModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onOpenSettings
}) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [source, setSource] = useState<'supabase' | 'local'>('local');
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'failed' | 'success' | 'verification'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);
  const [tableStatus, setTableStatus] = useState<{ supabaseConfigured: boolean; emailLogsTableOk: boolean; message: string } | null>(null);

  // Live SMTP verification test from within the modal
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [currentConfig, setCurrentConfig] = useState<SystemEmailConfig>(getSystemEmailConfig());

  // Load logs and table status
  const loadLogs = async (search = searchQuery) => {
    setIsLoading(true);
    try {
      const res = await fetchDbEmailLogs({
        search: search.trim() ? search.trim() : undefined,
        limit: 100
      });
      setLogs(res.logs || []);
      setSource(res.source);
    } catch (err) {
      console.warn('[SmtpDiagnosticModal] Failed to load email logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkStatus = async () => {
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

  const loadConfig = async () => {
    try {
      const cfg = await fetchServerSystemEmailConfig();
      if (cfg) setCurrentConfig(cfg);
    } catch {
      setCurrentConfig(getSystemEmailConfig());
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
      checkStatus();
      loadConfig();
      setVerifyResult(null);
    }
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

  // Quick live test
  const handleRunVerify = async () => {
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const res = await verifySmtpSettings(currentConfig);
      setVerifyResult(res);
      // Reload logs after 600ms so newly created log appears at top
      setTimeout(() => loadLogs(searchQuery), 600);
    } catch (err: any) {
      setVerifyResult({
        success: false,
        message: err.message || 'SMTP connection verification failed.'
      });
      setTimeout(() => loadLogs(searchQuery), 600);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopySql = async () => {
    try {
      const sql = await fetchEmailLogsMigrationSql();
      if (sql) {
        await navigator.clipboard.writeText(sql);
        setCopiedSql(true);
        setTimeout(() => setCopiedSql(false), 3000);
      }
    } catch {}
  };

  const handleClearLogs = async () => {
    if (confirm('Are you sure you want to clear all SMTP and email diagnostic logs? This will reset the ledger.')) {
      await clearDbEmailLogsApi();
      setLogs([]);
      setExpandedLogId(null);
    }
  };

  const handleCopyLogDetails = async (log: any) => {
    try {
      const text = JSON.stringify(log, null, 2);
      await navigator.clipboard.writeText(text);
      setCopiedLogId(log.id);
      setTimeout(() => setCopiedLogId(null), 2500);
    } catch {}
  };

  const handleExportJson = () => {
    try {
      const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smtp_diagnostic_logs_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
  };

  const handleCopyDiagnosticReport = async () => {
    try {
      const failedLogs = logs.filter(l => !l.success);
      const latestError = failedLogs[0];
      const report = [
        '=== SMTP CONFIGURATION & DIAGNOSTIC REPORT ===',
        `Generated: ${new Date().toISOString()}`,
        `Storage Source: ${source.toUpperCase()}`,
        `Table Status: ${tableStatus?.message || 'Operational'}`,
        '',
        '--- ACTIVE SMTP SETTINGS ---',
        `Host: ${currentConfig.smtpHost || '(None)'}`,
        `Port: ${currentConfig.smtpPort || 587}`,
        `Security Mode: ${currentConfig.smtpSecure ? 'SSL/TLS (Port 465)' : 'STARTTLS (Port 587)'}`,
        `Username: ${currentConfig.smtpUsername || '(None)'}`,
        `Delivery Mode: ${currentConfig.deliveryMode}`,
        '',
        '--- LOG STATISTICS ---',
        `Total Logged Dispatches: ${logs.length}`,
        `Successful: ${logs.filter(l => l.success).length}`,
        `Failures: ${failedLogs.length}`,
        '',
        latestError ? [
          '--- LATEST DETECTED FAILURE ---',
          `Timestamp: ${latestError.sent_at || latestError.created_at}`,
          `Subject: ${latestError.subject}`,
          `Recipient: ${latestError.recipient_email || latestError.to}`,
          `Error Message: ${latestError.error_message || 'Unknown failure'}`,
          `Error Code: ${latestError.error_code || 'N/A'}`,
          `Error Command: ${latestError.error_command || 'N/A'}`,
          `Raw Details: ${JSON.stringify(latestError.error_details || {})}`
        ].join('\n') : 'No failures detected in recent logs.'
      ].join('\n');

      await navigator.clipboard.writeText(report);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 3000);
    } catch {}
  };

  // Filtered and searched logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Tab filter
      if (activeFilter === 'failed' && log.success) return false;
      if (activeFilter === 'success' && !log.success) return false;
      if (activeFilter === 'verification' && log.category !== 'smtp_verification') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const recipient = String(log.recipient_email || log.to || '').toLowerCase();
        const subject = String(log.subject || '').toLowerCase();
        const host = String(log.smtp_host || '').toLowerCase();
        const errMsg = String(log.error_message || '').toLowerCase();
        const errCode = String(log.error_code || '').toLowerCase();
        const category = String(log.category || '').toLowerCase();
        return (
          recipient.includes(q) ||
          subject.includes(q) ||
          host.includes(q) ||
          errMsg.includes(q) ||
          errCode.includes(q) ||
          category.includes(q)
        );
      }
      return true;
    });
  }, [logs, activeFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const successes = logs.filter(l => l.success).length;
    const failures = logs.filter(l => !l.success).length;
    const successRate = total > 0 ? Math.round((successes / total) * 100) : 100;
    return { total, successes, failures, successRate };
  }, [logs]);

  // Detected common failure recommendation
  const detectedGuidance = useMemo(() => {
    const failedLogs = logs.filter(l => !l.success);
    if (failedLogs.length === 0) return null;

    const latest = failedLogs[0];
    const code = String(latest.error_code || '').toUpperCase();
    const msg = String(latest.error_message || '').toLowerCase();

    if (code.includes('EDNS') || msg.includes('getaddrinfo') || msg.includes('enotfound')) {
      return {
        title: 'DNS Resolution Error (Host Not Found)',
        suggestion: `The mail server "${latest.smtp_host || currentConfig.smtpHost}" could not be resolved. Please verify the SMTP Host hostname spelling (common hosts: smtp.gmail.com, smtp.mailgun.org, smtp.sendgrid.net, smtp.office365.com).`,
        type: 'danger'
      };
    }
    if (code.includes('EAUTH') || msg.includes('auth') || msg.includes('535') || msg.includes('credential')) {
      return {
        title: 'Authentication Rejected (Bad Password / 2FA)',
        suggestion: 'The SMTP server rejected your login credentials. If using Gmail / Google Workspace, you MUST generate a dedicated 16-character Google App Password (Personal passwords are blocked by Google). Also ensure 2-Factor Authentication is enabled.',
        type: 'warning'
      };
    }
    if (code.includes('ETIMEDOUT') || code.includes('ECONNREFUSED') || msg.includes('timeout') || msg.includes('refused')) {
      return {
        title: 'Connection Timed Out or Port Blocked',
        suggestion: `Unable to connect to ${latest.smtp_host || currentConfig.smtpHost}:${latest.smtp_port || currentConfig.smtpPort}. Ensure Port 587 (STARTTLS) or Port 465 (SSL/TLS) is open. Note that many cloud hosting providers block outbound Port 25.`,
        type: 'danger'
      };
    }
    if (code.includes('ESOCKET') || msg.includes('tls') || msg.includes('ssl')) {
      return {
        title: 'SSL / TLS Handshake Mismatch',
        suggestion: 'Encryption negotiation failed. For Port 465, enable Direct SSL/TLS. For Port 587 or 25, disable Direct SSL/TLS to allow standard STARTTLS handshake.',
        type: 'warning'
      };
    }
    return {
      title: 'SMTP Dispatch Issue Detected',
      suggestion: `Recent attempt failed with: "${latest.error_message || 'Unknown SMTP error'}". Inspect the detailed error log below for diagnostic codes and server response.`,
      type: 'info'
    };
  }, [logs, currentConfig]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0f1115] border border-slate-800 text-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-b border-slate-800/80 bg-[#14171f] gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  SMTP Diagnostic Console &amp; Email Logs
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  source === 'supabase'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                }`}>
                  {source === 'supabase' ? '● Supabase Cloud' : '○ Local Cache'}
                </span>
                {tableStatus?.emailLogsTableOk && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
                    email_logs table ready
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Audit trail of outbound transmissions, handshake verifications, and granular SMTP error codes.
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={handleRunVerify}
              disabled={isVerifying || !currentConfig.smtpHost || !currentConfig.smtpUsername}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Execute an immediate live connection test to current SMTP host"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Testing Connection...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Test Connection</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopySql}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                copiedSql
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
              title="Copy the SQL migration to create public.email_logs in Supabase"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Database className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'SQL Copied!' : 'Copy Supabase SQL'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Test Feedback Banner (if executed) */}
        {verifyResult && (
          <div className={`px-5 py-3 border-b text-xs flex items-start gap-2.5 shrink-0 ${
            verifyResult.success
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
              : 'bg-rose-950/50 border-rose-800/60 text-rose-200'
          }`}>
            {verifyResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-0.5">
              <div className="font-bold">
                {verifyResult.success ? 'SMTP Connection Succeeded!' : 'SMTP Connection Failed'}
              </div>
              <p className="opacity-90">{verifyResult.message}</p>
              {verifyResult.details?.response && (
                <div className="font-mono text-[10px] opacity-75 mt-1 bg-black/30 p-1.5 rounded">
                  Server Response: {String(verifyResult.details.response)}
                </div>
              )}
            </div>
            <button
              onClick={() => setVerifyResult(null)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer px-1"
            >
              ×
            </button>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Top Metric Cards Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Entries</span>
              <div className="text-xl font-bold text-white">{stats.total}</div>
              <span className="text-[10px] text-slate-500 font-mono">Supabase 'email_logs'</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Successful</span>
              <div className="text-xl font-bold text-emerald-400">{stats.successes}</div>
              <span className="text-[10px] text-emerald-500/80">{stats.successRate}% Success Rate</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">Failed / Errors</span>
              <div className="text-xl font-bold text-rose-400">{stats.failures}</div>
              <span className="text-[10px] text-rose-500/80">Require troubleshooting</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-400">Active Relay</span>
              <div className="text-xs font-bold font-mono text-white truncate" title={currentConfig.smtpHost || 'Unconfigured'}>
                {currentConfig.smtpHost || 'Not Set'}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Port {currentConfig.smtpPort || 587} • {currentConfig.smtpSecure ? 'SSL/TLS' : 'STARTTLS'}
              </span>
            </div>
          </div>

          {/* Intelligent Troubleshooting Suggestion Banner (if failure detected) */}
          {detectedGuidance && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              detectedGuidance.type === 'danger'
                ? 'bg-rose-950/20 border-rose-800/50 text-rose-200'
                : 'bg-amber-950/20 border-amber-800/50 text-amber-200'
            }`}>
              <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${
                detectedGuidance.type === 'danger' ? 'text-rose-400' : 'text-amber-400'
              }`} />
              <div className="space-y-1 flex-1 text-xs">
                <div className="font-bold flex items-center justify-between">
                  <span>Diagnostic Insight: {detectedGuidance.title}</span>
                  {onOpenSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSettings();
                      }}
                      className="text-[11px] underline hover:no-underline font-semibold flex items-center gap-1 text-sky-400 cursor-pointer"
                    >
                      <span>Adjust Settings</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] opacity-90 leading-relaxed">{detectedGuidance.suggestion}</p>
              </div>
            </div>
          )}

          {/* Filters, Search & Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {(
                [
                  { id: 'all', label: 'All', count: stats.total, color: 'slate' as const },
                  { id: 'failed', label: 'Errors Only', count: stats.failures, color: 'rose' as const },
                  { id: 'success', label: 'Success', count: stats.successes, color: 'emerald' as const },
                  { id: 'verification', label: 'Verifications', count: logs.filter(l => l.category === 'smtp_verification').length, color: 'slate' as const }
                ] as const
              ).map(tab => {
                const isActive = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFilter(tab.id as any)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      tab.color === 'rose'
                        ? 'bg-rose-500/20 text-rose-400'
                        : tab.color === 'emerald'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input & Action Buttons */}
            <div className="flex items-center gap-2 flex-1 max-w-lg">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    loadLogs(e.target.value);
                  }}
                  placeholder="Search by recipient, host, subject, error code..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-500"
                />
              </div>

              <button
                type="button"
                onClick={() => loadLogs(searchQuery)}
                disabled={isLoading}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors cursor-pointer shrink-0"
                title="Refresh logs from Supabase"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
              </button>

              <button
                type="button"
                onClick={handleCopyDiagnosticReport}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  copiedReport
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
                title="Copy formatted diagnostic report to clipboard"
              >
                {copiedReport ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copiedReport ? 'Report Copied' : 'Copy Report'}</span>
              </button>

              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors cursor-pointer shrink-0"
                  title="Export raw JSON diagnostic ledger"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Log Entries Container */}
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto text-emerald-400" />
              <p className="text-xs">Querying latest entries from Supabase 'email_logs' table...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-14 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 space-y-2 p-6">
              <Mail className="w-8 h-8 mx-auto opacity-30 text-slate-400" />
              <p className="text-sm font-semibold text-white">No Matching Diagnostic Logs Found</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchQuery
                  ? `No logs match "${searchQuery}". Try clearing search or selecting a different filter.`
                  : 'Outbound emails and SMTP connection tests will appear here with delivery receipts and failure error codes.'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    loadLogs('');
                  }}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-lg cursor-pointer mt-2"
                >
                  Clear Search Filter
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredLogs.map(log => {
                const isExpanded = expandedLogId === log.id;
                const isSuccess = Boolean(log.success);
                const recipient = log.recipient_email || (Array.isArray(log.recipient_emails) ? log.recipient_emails.join(', ') : log.to || 'Unknown');
                const timestamp = log.sent_at || log.created_at || log.timestamp;
                const errorMsg = log.error_message || (log.error_details?.message ? String(log.error_details.message) : null);
                const isCopied = copiedLogId === log.id;

                return (
                  <div
                    key={log.id}
                    className={`rounded-xl border transition-all ${
                      isExpanded
                        ? 'bg-slate-900/95 border-slate-700 shadow-md'
                        : isSuccess
                        ? 'bg-[#14161d] hover:bg-[#181b24] border-slate-800/80'
                        : 'bg-rose-950/15 hover:bg-rose-950/25 border-rose-900/40'
                    }`}
                  >
                    {/* Log Row Header */}
                    <div className="p-3.5 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        {/* Status + Subject */}
                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
                            isSuccess
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          }`}>
                            {isSuccess ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <AlertTriangle className="w-3 h-3 text-rose-400" />}
                            <span>{isSuccess ? (log.status || 'SENT') : 'FAILED'}</span>
                            {log.error_code && !isSuccess && (
                              <span className="font-mono text-[9px] opacity-80">[{log.error_code}]</span>
                            )}
                          </span>

                          <h4 className="text-xs font-semibold text-white truncate" title={log.subject}>
                            {log.subject || '(No Subject)'}
                          </h4>

                          <span className="hidden md:inline text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono shrink-0">
                            {log.category || log.delivery_mode || 'general'}
                          </span>
                        </div>

                        {/* Timestamp & Expand Action */}
                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                          <span className="text-[11px] font-mono text-slate-400">
                            {timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                            {' • '}
                            {timestamp ? new Date(timestamp).toLocaleDateString([], { day: 'numeric', month: 'short' }) : '—'}
                          </span>

                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>{isExpanded ? 'Collapse' : 'Details'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {/* Recipient & SMTP Host Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>
                            To: <strong className="font-mono text-slate-200">{recipient}</strong>
                          </span>
                          {log.sender_email && (
                            <span className="text-[11px] text-slate-500">
                              From: {log.sender_name ? `${log.sender_name} ` : ''}&lt;{log.sender_email}&gt;
                            </span>
                          )}
                        </div>

                        {log.smtp_host && (
                          <div className="font-mono text-[11px] text-slate-400 flex items-center gap-1">
                            <Server className="w-3 h-3 text-slate-500" />
                            <span>{log.smtp_host}:{log.smtp_port || 587}</span>
                            <span className="text-[10px] text-slate-500">
                              ({log.smtp_secure ? 'SSL' : 'STARTTLS'})
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Error Highlight Banner (if failed) */}
                      {!isSuccess && errorMsg && (
                        <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-200 text-xs space-y-1 font-mono">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                            <div className="flex-1 break-words font-semibold">
                              {errorMsg}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-rose-400 pt-0.5">
                            {log.error_code && <span className="bg-rose-950 px-1.5 py-0.5 rounded border border-rose-900/60">Code: {log.error_code}</span>}
                            {log.error_command && <span className="bg-rose-950 px-1.5 py-0.5 rounded border border-rose-900/60">Command: {log.error_command}</span>}
                            {log.smtp_response_code && <span className="bg-rose-950 px-1.5 py-0.5 rounded border border-rose-900/60">Response Code: {log.smtp_response_code}</span>}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Expandable Technical Detail Drawer */}
                    {isExpanded && (
                      <div className="p-4 border-t border-slate-800 bg-[#0d0f14] space-y-3.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Diagnostic Payload &amp; Transmission Details</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => handleCopyLogDetails(log)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{isCopied ? 'Copied JSON' : 'Copy JSON'}</span>
                          </button>
                        </div>

                        {/* Grid Breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-[11px]">
                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                            <div className="font-bold text-slate-400 text-[10px] uppercase font-sans">Server Info</div>
                            <div>Host: {log.smtp_host || '—'}</div>
                            <div>Port: {log.smtp_port || 587}</div>
                            <div>Security: {log.smtp_secure ? 'Direct SSL/TLS' : 'STARTTLS'}</div>
                            <div>User: {log.smtp_username || '—'}</div>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                            <div className="font-bold text-slate-400 text-[10px] uppercase font-sans">Dispatch Routing</div>
                            <div className="truncate">Mode: {log.delivery_mode || 'custom_smtp'}</div>
                            <div className="truncate">Category: {log.category || 'general'}</div>
                            <div className="truncate">Message ID: {log.message_id || 'None'}</div>
                            <div className="truncate">Ref ID: {log.reference_id || 'None'}</div>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                            <div className="font-bold text-slate-400 text-[10px] uppercase font-sans">Error Signature</div>
                            <div className="text-rose-400">Code: {log.error_code || 'None'}</div>
                            <div>Command: {log.error_command || 'None'}</div>
                            <div>Response Code: {log.smtp_response_code || 'None'}</div>
                            <div>Status: {log.status || 'unknown'}</div>
                          </div>
                        </div>

                        {/* Snippet / Body */}
                        {log.snippet && (
                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                            <span className="font-bold text-slate-400 text-[10px] uppercase font-sans">Message Preview Snippet</span>
                            <div className="font-mono text-slate-300 text-[11px] whitespace-pre-wrap">{log.snippet}</div>
                          </div>
                        )}

                        {/* Raw Error Details */}
                        {log.error_details && Object.keys(log.error_details).length > 0 && (
                          <div className="space-y-1">
                            <span className="font-bold text-slate-400 text-[10px] uppercase font-sans">Raw Error Details</span>
                            <pre className="p-3 rounded-xl bg-black border border-slate-800 text-emerald-400 font-mono text-[10px] overflow-x-auto max-h-44">
                              {JSON.stringify(log.error_details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-[#14171f] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Logs stored persistently in Supabase <code className="text-emerald-400 font-mono">public.email_logs</code> table</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {logs.length > 0 && (
              <button
                type="button"
                onClick={handleClearLogs}
                className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Logs</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
