import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  RefreshCw,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  Trash2,
  AlertCircle,
  ExternalLink,
  ClipboardPaste,
  Upload,
  Globe,
  HelpCircle,
  Sparkles,
  Info,
  Check,
  ChevronRight
} from 'lucide-react';
import { downloadGoogleSheetLeadFormat, parseGoogleSheetCsv } from '../../utils/googleSheetsTemplate';
import { Lead } from '../../types';

interface MetaAdsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MetaAdsSyncModal: React.FC<MetaAdsSyncModalProps> = ({ isOpen, onClose }) => {
  const {
    leads,
    syncGoogleSheetLeads,
    deleteDummyLeads,
    clearAllLeads,
    googleSheetUrl,
    setGoogleSheetUrl,
    isSheetAutoSyncEnabled,
    setIsSheetAutoSyncEnabled,
    sheetAutoSyncInterval,
    setSheetAutoSyncInterval,
    isSheetSyncing,
    lastSheetSyncTime,
    lastSheetSyncStats,
    performGoogleSheetSync
  } = useApp();

  const [activeTab, setActiveTab] = useState<'url' | 'upload' | 'paste'>('url');
  const [sheetUrl, setSheetUrl] = useState(() => {
    return googleSheetUrl || localStorage.getItem('google_sheet_lead_url') || '';
  });
  const [pastedCsv, setPastedCsv] = useState('');
  const [localSyncing, setLocalSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
    rowsCount?: number;
    duplicateCount?: number;
    isPrivate?: boolean;
  } | null>(null);

  // Sync sheetUrl with context googleSheetUrl if it updates
  React.useEffect(() => {
    if (googleSheetUrl && googleSheetUrl !== sheetUrl && !sheetUrl) {
      setSheetUrl(googleSheetUrl);
    }
  }, [googleSheetUrl]);

  // Live preview for pasted or uploaded content
  const previewLeads = useMemo(() => {
    if (!pastedCsv.trim()) return [];
    try {
      return parseGoogleSheetCsv(pastedCsv.trim());
    } catch {
      return [];
    }
  }, [pastedCsv]);

  // Count detected dummy leads in current database
  const detectedDummyCount = useMemo(() => {
    const dummyNames = [
      'callum fletcher',
      'ashleigh miller',
      'declan macarthur',
      'andrew gerber',
      'tarek assad',
      'rojin piya',
      'sheet lead'
    ];
    return leads.filter(l => {
      const full = `${l.firstName || ''} ${l.lastName || ''}`.trim().toLowerCase();
      const cust = (l.customerName || '').trim().toLowerCase();
      const id = (l.id || '').toLowerCase();
      return (
        dummyNames.includes(full) ||
        dummyNames.includes(cust) ||
        id.includes('lead-andrew-') ||
        id.includes('lead-tarek-') ||
        id.includes('lead-rojin-') ||
        id.includes('lead-sheet-') ||
        id.includes('dummy')
      );
    }).length;
  }, [leads]);

  if (!isOpen) return null;

  // 1. Live Google Sheets URL Fetcher & Auto-Sync Trigger
  const handleSyncLiveUrl = async () => {
    if (!sheetUrl.trim()) {
      setSyncResult({ type: 'error', message: 'Please enter your Google Sheet URL.' });
      return;
    }

    setLocalSyncing(true);
    setSyncResult(null);

    try {
      setGoogleSheetUrl(sheetUrl.trim());
      localStorage.setItem('google_sheet_lead_url', sheetUrl.trim());

      const res = await performGoogleSheetSync(sheetUrl.trim());

      if (!res.success) {
        setSyncResult({
          type: 'error',
          isPrivate: res.isPrivate,
          message: res.error || 'Failed to sync Google Sheet.'
        });
        return;
      }

      if (res.addedCount > 0 && res.updatedCount > 0) {
        setSyncResult({
          type: 'success',
          message: `Successfully ingested ${res.addedCount} new lead(s) and synced changes for ${res.updatedCount} existing lead(s) from your Google Sheet!`,
          rowsCount: res.addedCount,
          duplicateCount: res.duplicateCount
        });
      } else if (res.addedCount > 0) {
        setSyncResult({
          type: 'success',
          message: `Successfully ingested ${res.addedCount} new lead(s) from your Google Sheet! (${res.duplicateCount} existing leads already in the system were skipped to prevent duplicates).`,
          rowsCount: res.addedCount,
          duplicateCount: res.duplicateCount
        });
      } else if (res.updatedCount > 0) {
        setSyncResult({
          type: 'success',
          message: `Successfully synchronized and updated details for ${res.updatedCount} existing lead(s) from your Google Sheet! 0 duplicates added.`,
          rowsCount: 0,
          duplicateCount: res.duplicateCount
        });
      } else {
        setSyncResult({
          type: 'success',
          message: `All ${res.totalRows} lead(s) in your Google Sheet already exist and are in sync with the system. 0 duplicate leads were added.`,
          rowsCount: 0,
          duplicateCount: res.duplicateCount
        });
      }
    } catch (err: any) {
      setSyncResult({
        type: 'error',
        message: 'Network error connecting to sheet: ' + err.message
      });
    } finally {
      setLocalSyncing(false);
    }
  };

  // 2. Direct Pasted / Preview Importer
  const handleImportParsedLeads = (leadsToImport?: Partial<Lead>[]) => {
    const target = leadsToImport || previewLeads;
    if (!target || target.length === 0) {
      setSyncResult({ type: 'error', message: 'No valid leads found to import. Please check your data format.' });
      return;
    }

    try {
      localStorage.setItem('last_synced_sheet_csv', pastedCsv.trim());
      const added = syncGoogleSheetLeads(target);
      const duplicateCount = target.length - added;

      if (added > 0) {
        setSyncResult({
          type: 'success',
          message: `Successfully ingested ${added} new lead(s) into your CRM! (${duplicateCount} existing leads already in the system were skipped).`,
          rowsCount: added,
          duplicateCount
        });
      } else {
        setSyncResult({
          type: 'success',
          message: `All ${target.length} lead(s) are already present in the CRM system. 0 duplicate leads added.`,
          rowsCount: 0,
          duplicateCount
        });
      }
    } catch (err: any) {
      setSyncResult({ type: 'error', message: 'Failed to import leads: ' + err.message });
    }
  };

  // 3. File Upload Importer
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        setPastedCsv(content);
        const parsed = parseGoogleSheetCsv(content);
        if (parsed.length > 0) {
          localStorage.setItem('last_synced_sheet_csv', content);
          const added = syncGoogleSheetLeads(parsed);
          const duplicateCount = parsed.length - added;
          if (added > 0) {
            setSyncResult({
              type: 'success',
              message: `Successfully imported ${added} new lead(s) from "${file.name}"! (${duplicateCount} existing leads skipped).`,
              rowsCount: added,
              duplicateCount
            });
          } else {
            setSyncResult({
              type: 'success',
              message: `All ${parsed.length} rows from "${file.name}" already exist in the CRM. 0 duplicate leads added.`,
              rowsCount: 0,
              duplicateCount
            });
          }
        } else {
          setSyncResult({
            type: 'error',
            message: `Could not parse valid lead records from "${file.name}". Please ensure it contains columns for Name, Phone, and Address.`
          });
        }
      }
    };
    reader.readAsText(file);
  };

  // 4. Clean Dummy Leads
  const handleCleanDummyLeads = () => {
    if (detectedDummyCount > 0) {
      const count = deleteDummyLeads();
      setSyncResult({
        type: 'success',
        message: `Successfully removed ${count || detectedDummyCount} sample/dummy lead(s) from the system!`
      });
    } else if (leads.length > 0) {
      clearAllLeads();
      setSyncResult({
        type: 'success',
        message: 'All leads have been wiped clean from the CRM database.'
      });
    } else {
      setSyncResult({
        type: 'warning',
        message: 'No leads currently exist in the system.'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl bg-[#1e1e1e] rounded-2xl shadow-2xl border border-[#2d2d2d] overflow-hidden text-[#e5e7eb] flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-[#161616] text-white flex items-center justify-between border-b border-[#262626]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#bef2641a] text-[#bef264] border border-[#bef26433]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Google Sheets &amp; Lead Ingestion Hub</h3>
              <p className="text-xs text-gray-400">
                Connect live Google Sheets, upload CSV/Excel files, or paste spreadsheet rows
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#262626] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher & Dummy Cleanup */}
        <div className="px-5 pt-3 border-b border-[#262626] bg-[#191919] flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setActiveTab('url'); setSyncResult(null); }}
              className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 text-xs font-semibold transition-all ${
                activeTab === 'url'
                  ? 'border-[#bef264] text-[#bef264]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Live Google Sheet URL</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('upload'); setSyncResult(null); }}
              className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 text-xs font-semibold transition-all ${
                activeTab === 'upload'
                  ? 'border-[#bef264] text-[#bef264]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload CSV / Spreadsheet</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('paste'); setSyncResult(null); }}
              className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 text-xs font-semibold transition-all ${
                activeTab === 'paste'
                  ? 'border-[#bef264] text-[#bef264]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <ClipboardPaste className="w-4 h-4" />
              <span>Paste Sheet Data (TSV / CSV)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0 py-1">
            <button
              type="button"
              onClick={handleCleanDummyLeads}
              className="text-xs text-rose-300 hover:text-rose-200 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 transition-all shadow-xs"
              title="Permanently remove all sample and dummy leads from CRM"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete Dummy Leads ({detectedDummyCount})</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* TAB 1: LIVE GOOGLE SHEET URL */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Google Sheet URL (Spreadsheet Link)
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={sheetUrl}
                    onChange={e => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit#gid=0"
                    className="flex-1 text-xs font-mono bg-[#121212] border border-[#2d2d2d] rounded-xl px-3.5 py-2.5 text-white placeholder-gray-600 outline-none focus:border-[#bef264]"
                  />
                  <button
                    type="button"
                    onClick={handleSyncLiveUrl}
                    disabled={localSyncing || isSheetSyncing}
                    className="px-5 py-2.5 bg-[#bef264] hover:bg-[#a3e635] text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all shrink-0 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${localSyncing || isSheetSyncing ? 'animate-spin' : ''}`} />
                    <span>{localSyncing || isSheetSyncing ? 'Syncing...' : 'Sync Live Sheet'}</span>
                  </button>
                </div>
              </div>

              {/* Automatic Background Sync Configuration Card */}
              <div className="p-4 bg-[#151515] border border-[#292929] rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#242424] pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5">
                      {isSheetAutoSyncEnabled && googleSheetUrl ? (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </>
                      ) : (
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gray-500"></span>
                      )}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Automatic Real-time Sheet Sync</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          isSheetAutoSyncEnabled && googleSheetUrl
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-gray-800 text-gray-400 border border-gray-700'
                        }`}>
                          {isSheetAutoSyncEnabled && googleSheetUrl ? `Active (Every ${sheetAutoSyncInterval}s)` : 'Paused'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Automatically pulls new rows added to your Google Sheet without manual clicks.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsSheetAutoSyncEnabled(!isSheetAutoSyncEnabled)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                        isSheetAutoSyncEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'bg-[#252525] text-gray-300 border border-[#333] hover:text-white'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isSheetAutoSyncEnabled ? 'Auto-Sync: ON' : 'Auto-Sync: OFF'}</span>
                    </button>
                  </div>
                </div>

                {/* Auto-Sync Interval Controls & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="text-[11px] font-medium">Poll Interval:</span>
                    <div className="flex items-center gap-1">
                      {[
                        { sec: 15, label: '15s' },
                        { sec: 30, label: '30s (Default)' },
                        { sec: 60, label: '1 min' },
                        { sec: 300, label: '5 min' }
                      ].map(item => (
                        <button
                          key={item.sec}
                          type="button"
                          onClick={() => setSheetAutoSyncInterval(item.sec)}
                          className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                            sheetAutoSyncInterval === item.sec
                              ? 'bg-[#bef264] text-slate-950 font-bold'
                              : 'bg-[#222] text-gray-300 hover:text-white hover:bg-[#2a2a2a]'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="text-[11px] text-gray-400">
                    {lastSheetSyncTime ? (
                      <span>Last checked: {lastSheetSyncTime.toLocaleTimeString()}</span>
                    ) : (
                      <span>Not yet synced</span>
                    )}
                  </div>
                </div>

                {/* Intelligent Deduplication & Change Synchronization Guarantee */}
                <div className="p-3 bg-[#111] rounded-lg border border-[#262626] text-[11px] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Real-time Change Synchronization &amp; Duplicate Prevention</span>
                  </div>
                  <p className="text-gray-400 leading-relaxed">
                    • <strong>Automatic Change Sync</strong>: Any modification in the Google Sheet to an existing lead (such as Status, Notes, Address, Pricing, or System Specifications) is automatically synchronized and updated directly in the CRM record.
                  </p>
                  <p className="text-gray-400 leading-relaxed">
                    • <strong>Strict Deduplication</strong>: Identifies existing leads using normalized Phone (matching all AU mobile formats e.g. 0412 345 678, +614..., 4...), Email, and Customer Name + Address to ensure zero duplicate rows.
                  </p>
                  <p className="text-gray-400 leading-relaxed">
                    • <strong>Chronological Order</strong>: All leads are always automatically sorted on the basis of the <em>Lead Date</em>, latest first.
                  </p>
                </div>
              </div>

              {/* Troubleshooting / Permission notice */}
              <div className="p-4 bg-[#141414] border border-[#292929] rounded-xl text-xs space-y-3">
                <div className="flex items-center gap-2 text-[#bef264] font-semibold">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>How to make Google Sheets sync in real-time</span>
                </div>
                <div className="text-[12px] text-gray-300 space-y-1.5 leading-relaxed">
                  <p>
                    <strong>Why did my sheet not sync previously?</strong>
                  </p>
                  <p className="text-gray-400">
                    By default, Google creates all new spreadsheets with <em>"Restricted"</em> access (requiring your personal Google account password). External applications cannot read private sheets via direct URL without public read access.
                  </p>
                  <div className="p-3 bg-[#181818] rounded-lg border border-[#262626] text-gray-300 space-y-1 text-[11px]">
                    <p className="font-semibold text-white">To enable instant live sync (takes 5 seconds):</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-gray-400">
                      <li>Open your Google Sheet in your browser</li>
                      <li>Click the blue <strong>"Share"</strong> button in the top-right corner</li>
                      <li>Under <strong>"General access"</strong>, change from <strong>"Restricted"</strong> to <strong>"Anyone with the link can view"</strong></li>
                      <li>Click <strong>"Copy link"</strong>, paste it above, and click <strong>"Sync Live Sheet"</strong>!</li>
                    </ol>
                  </div>
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-gray-400 text-[11px]">
                      Prefer to keep your sheet private? Use the <strong>Upload CSV</strong> or <strong>Paste Sheet Data</strong> tab!
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('paste')}
                      className="text-[#bef264] hover:underline font-semibold text-xs flex items-center gap-1"
                    >
                      <span>Switch to Paste Tab</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FILE UPLOAD */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                Upload CSV or Excel File
              </label>
              <div className="p-8 border-2 border-dashed border-[#333] hover:border-[#bef264]/50 rounded-2xl text-center space-y-3 bg-[#141414] transition-all">
                <Upload className="w-8 h-8 text-[#bef264] mx-auto" />
                <div className="text-xs text-gray-300 font-semibold">
                  Click to select or drag and drop your spreadsheet file (.csv)
                </div>
                <p className="text-[11px] text-gray-500">
                  Export from your Google Sheet (File &rarr; Download &rarr; Comma Separated Values .csv)
                </p>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="mt-2 text-xs text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#bef264] file:text-slate-950 hover:file:bg-[#a3e635] cursor-pointer"
                />
              </div>

              <div className="p-3 bg-[#141414] border border-[#262626] rounded-xl text-xs text-gray-400 flex items-center justify-between">
                <span>Need a template? Download the official format matching all 23 CRM fields:</span>
                <button
                  type="button"
                  onClick={() => downloadGoogleSheetLeadFormat()}
                  className="px-3 py-1.5 rounded-lg bg-[#222] hover:bg-[#2c2c2c] text-white border border-[#333] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-[#bef264]" />
                  <span>Download Format (.csv)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PASTE SHEET DATA */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Paste Spreadsheet Cells Directly (Ctrl+C from Google Sheets &rarr; Ctrl+V here)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const sample = `Lead Date\tCustomer Name\tPrimary Mobile\tEmail\tStreet Address\tSuburb\tState\tPostcode\tSystem Size kW\tBattery\n${new Date().toISOString().split('T')[0]}\tDavid Miller\t0412 345 678\tdavid.m@example.com.au\t45 High Street\tParramatta\tNSW\t2150\t10.4\tYes`;
                    setPastedCsv(sample);
                  }}
                  className="text-xs text-[#bef264] hover:underline flex items-center gap-1 font-semibold"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Load Sample Row Format</span>
                </button>
              </div>

              <textarea
                rows={6}
                value={pastedCsv}
                onChange={e => setPastedCsv(e.target.value)}
                placeholder="In Google Sheets: Select your table headers & rows, press Ctrl+C, and paste here directly..."
                className="w-full text-xs font-mono bg-[#121212] border border-[#2d2d2d] rounded-xl p-3 text-white placeholder-gray-600 focus:border-[#bef264] outline-none transition-colors"
              />

              {/* Live Preview of parsed leads */}
              {previewLeads.length > 0 && (
                <div className="space-y-2 p-3 bg-[#141414] border border-[#292929] rounded-xl">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Detected {previewLeads.length} valid lead(s) ready to import:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleImportParsedLeads()}
                      className="px-4 py-1.5 bg-[#bef264] hover:bg-[#a3e635] text-slate-950 font-bold text-xs rounded-lg shadow-xs transition-all"
                    >
                      Import These {previewLeads.length} Leads Now &rarr;
                    </button>
                  </div>
                  <div className="overflow-x-auto max-h-36">
                    <table className="w-full text-left text-[11px]">
                      <thead className="text-gray-500 uppercase text-[9px] border-b border-[#262626]">
                        <tr>
                          <th className="py-1">Name</th>
                          <th className="py-1">Mobile</th>
                          <th className="py-1">Email</th>
                          <th className="py-1">Address</th>
                          <th className="py-1">State</th>
                          <th className="py-1">kW</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#222] text-gray-300 font-mono">
                        {previewLeads.slice(0, 5).map((l, idx) => (
                          <tr key={idx}>
                            <td className="py-1 text-white font-semibold">{l.customerName || `${l.firstName} ${l.lastName}`}</td>
                            <td className="py-1">{l.primaryMobile || '-'}</td>
                            <td className="py-1">{l.email || '-'}</td>
                            <td className="py-1">{l.address ? `${l.address}, ${l.suburb || ''}` : '-'}</td>
                            <td className="py-1">{l.state || 'NSW'}</td>
                            <td className="py-1">{l.systemSizeKw || 10.4}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {previewLeads.length > 5 && (
                    <p className="text-[10px] text-gray-500 italic">
                      + {previewLeads.length - 5} more records parsed...
                    </p>
                  )}
                </div>
              )}

              {pastedCsv && previewLeads.length === 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Could not detect lead records. Ensure your text includes header columns like Name, Mobile, and Address.</span>
                </div>
              )}
            </div>
          )}

          {/* Feedback banner */}
          {syncResult && (
            <div
              className={`p-4 rounded-xl border text-xs font-semibold flex items-start justify-between gap-3 ${
                syncResult.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {syncResult.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p>{syncResult.message}</p>
                  {syncResult.isPrivate && (
                    <div className="text-[11px] text-gray-300 font-normal pt-1">
                      Tip: Open your sheet &rarr; Share (top-right) &rarr; change "Restricted" to "Anyone with the link can view". Alternatively, use the <strong>Upload CSV</strong> tab!
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSyncResult(null)}
                className="text-xs opacity-70 hover:opacity-100 p-1"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#161616] border-t border-[#262626] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => downloadGoogleSheetLeadFormat()}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#262626] hover:bg-[#333] text-white border border-[#383838] flex items-center gap-1.5 transition-colors shadow-xs"
            title="Download CSV template format matching all 23 lead fields"
          >
            <Download className="w-3.5 h-3.5 text-[#bef264]" />
            <span>Download Template (.csv)</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-[#262626] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
