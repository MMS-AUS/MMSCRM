import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Database, CheckCircle2, AlertTriangle, RefreshCw, Copy, Check, ExternalLink, X, Code2, Layers } from 'lucide-react';

export const SupabaseSettingsSyncBanner: React.FC = () => {
  const { supabaseSettingsStatus, syncAllSettingsToSupabase, themeMode } = useApp();
  const isLight = themeMode === 'corporate-slate';
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [sqlContent, setSqlContent] = useState<string>('');
  const [isLoadingSql, setIsLoadingSql] = useState(false);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await syncAllSettingsToSupabase();
      setSyncFeedback(res.message);
      setTimeout(() => setSyncFeedback(null), 6000);
    } catch (err: any) {
      setSyncFeedback(`Error: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenSqlModal = async () => {
    setIsSqlModalOpen(true);
    if (!sqlContent) {
      setIsLoadingSql(true);
      try {
        const res = await fetch('/api/settings/sql-migration');
        const text = await res.text();
        setSqlContent(text);
      } catch (err) {
        setSqlContent('-- Failed to load SQL script from server. Please check connection.');
      } finally {
        setIsLoadingSql(false);
      }
    }
  };

  const handleCopySql = () => {
    if (sqlContent) {
      navigator.clipboard.writeText(sqlContent);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    }
  };

  const isConfigured = supabaseSettingsStatus?.configured;
  const isTablesReady = supabaseSettingsStatus?.appSettingsTableOk && supabaseSettingsStatus?.integrationsConfigTableOk;

  return (
    <>
      <div className={`p-4 rounded-xl border mb-6 transition-all shadow-xs ${
        isTablesReady
          ? isLight
            ? 'bg-emerald-50/70 border-emerald-200 text-slate-900'
            : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-100'
          : isConfigured
          ? isLight
            ? 'bg-amber-50/80 border-amber-200 text-slate-900'
            : 'bg-amber-950/20 border-amber-500/30 text-amber-100'
          : isLight
          ? 'bg-slate-100 border-slate-300 text-slate-800'
          : 'bg-[#181818] border-[#333] text-slate-300'
      }`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${
              isTablesReady
                ? isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-400'
                : isConfigured
                ? isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/20 text-amber-400'
                : isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-400'
            }`}>
              <Database className="w-5 h-5" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-bold text-sm">Supabase Database Cloud Persistence</span>
                {isTablesReady ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Tables Active (app_settings & integrations_config)
                  </span>
                ) : isConfigured ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    SQL Tables Setup Required in Supabase
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/20 text-slate-400 border border-slate-500/30">
                    Local Cache Active (Connect Supabase in API Keys)
                  </span>
                )}
              </div>

              <p className="text-xs leading-relaxed opacity-90 max-w-3xl">
                {isTablesReady
                  ? 'All custom dropdown options, hardware catalog items, operational rules, company profile, and integration settings are synchronized and permanently stored in your Supabase PostgreSQL database tables. No data is lost on logout or across devices.'
                  : 'Settings and dropdown options are currently cached locally in this browser. To ensure settings, custom dropdowns, and integrations are shared across all team members and never need daily re-entry, run the SQL migration below in your Supabase SQL Editor.'}
              </p>

              {syncFeedback && (
                <div className="mt-2 text-xs font-medium px-2.5 py-1 rounded bg-black/30 border border-white/10 text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {syncFeedback}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-center">
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                isLight
                  ? 'bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-400'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black disabled:bg-emerald-500/50'
              }`}
              title="Push all current dropdowns, rules, and integration states to Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync to Supabase Now'}
            </button>

            <button
              onClick={handleOpenSqlModal}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isLight
                  ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                  : 'bg-[#222] hover:bg-[#2c2c2c] text-slate-300 border-[#444]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-sky-400" />
              View Supabase SQL
            </button>
          </div>
        </div>
      </div>

      {/* SQL Migration Modal */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-[#161616] text-slate-100 rounded-2xl border border-[#333] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#282828] bg-[#1a1a1a]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Supabase Settings & Integrations Database Migration</h3>
                  <p className="text-xs text-slate-400">
                    Creates <code className="text-emerald-400 bg-black/40 px-1 py-0.5 rounded">public.app_settings</code> and <code className="text-emerald-400 bg-black/40 px-1 py-0.5 rounded">public.integrations_config</code>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSqlModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#282828] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step-by-step instructions */}
            <div className="px-6 py-3 bg-[#1e1e1e] border-b border-[#282828] text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[11px]">1</span>
                <span>Copy the SQL script below</span>
                <span className="text-slate-500">&rarr;</span>
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[11px]">2</span>
                <span>Paste in Supabase Dashboard &rarr; SQL Editor &rarr; Run</span>
              </div>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-medium shrink-0"
              >
                Open Supabase Dashboard
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* SQL Content Area */}
            <div className="p-6 overflow-y-auto font-mono text-xs text-slate-300 bg-[#111] flex-1">
              {isLoadingSql ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  Loading SQL schema...
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-mono leading-relaxed select-all">
                  {sqlContent}
                </pre>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#282828] bg-[#1a1a1a]">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Includes RLS policies, trigger timestamps, and performance indexes.</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopySql}
                  disabled={isLoadingSql}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs transition-colors shadow-xs"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy SQL Script
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsSqlModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#282828] hover:bg-[#333] text-slate-300 text-xs font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
