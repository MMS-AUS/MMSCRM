import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Sheet, RefreshCw, CheckCircle2, FileSpreadsheet, ArrowRight, ExternalLink, Download } from 'lucide-react';
import { downloadGoogleSheetLeadFormat } from '../../utils/googleSheetsTemplate';

interface MetaAdsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MetaAdsSyncModal: React.FC<MetaAdsSyncModalProps> = ({ isOpen, onClose }) => {
  const { syncGoogleSheetLeads } = useApp();
  const [sheetUrl, setSheetUrl] = useState(
    'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0'
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSyncNow = () => {
    setIsSyncing(true);
    setSyncResult(null);
    setTimeout(() => {
      const count = syncGoogleSheetLeads();
      setIsSyncing(false);
      setSyncResult(`Successfully pulled and ingested ${count} new verified leads from Meta Ads Sheet.`);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl bg-[#1e1e1e] rounded-xl shadow-2xl border border-[#2d2d2d] overflow-hidden text-[#e5e7eb]">
        {/* Header */}
        <div className="p-4 bg-[#161616] text-white flex items-center justify-between border-b border-[#262626]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#bef2641a] text-[#bef264] border border-[#bef26433]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Meta Ads Google Sheet / Excel Real-Time Sync</h3>
              <p className="text-xs text-gray-400">
                Live webhook connection to Facebook &amp; Instagram Lead Ads Sheets
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#262626] transition-colors">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Connected Google Sheet / Excel Webhook URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sheetUrl}
                onChange={e => setSheetUrl(e.target.value)}
                className="w-full text-xs font-mono bg-[#121212] border border-[#262626] rounded-lg px-3 py-2 text-white outline-none focus:border-[#bef264]"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Active campaigns: <strong className="text-gray-200">Meta NSW Metro Solar (Sydney)</strong> &amp; <strong className="text-gray-200">Meta QLD Battery Boost (Brisbane)</strong>
            </p>
          </div>

          {/* Sync status card */}
          <div className="p-3.5 rounded-xl bg-[#161616] border border-[#262626] text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-300">Google Sheet Dynamic Column Ingestion:</span>
              <span className="inline-flex items-center gap-1 text-[#bef264] font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> 23 Fields Auto-Populated
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Captures data where available from columns (Lead Date, Platform, Sales Person, Customer, Address, Postcode, Mobile, Email, Prices, Notes) and cleanly leaves blank where data is not available in the spreadsheet row.
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-400 pt-2 border-t border-[#262626]">
              <div>&bull; Post Code &rarr; Auto-detects Area (Metro/Reg.)</div>
              <div>&bull; Suburb &rarr; Auto-detects Nearest Big City</div>
              <div>&bull; Mobile &rarr; Auto-formats with 0 prefix</div>
              <div>&bull; Pricing &rarr; Formats to Accounts AUD ($)</div>
              <div>&bull; Contract Signed &rarr; Auto Sale Date</div>
              <div>&bull; Missing Fields &rarr; Left blank &amp; editable</div>
            </div>
          </div>

          {syncResult && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{syncResult}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#161616] border-t border-[#262626] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => downloadGoogleSheetLeadFormat()}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#262626] hover:bg-[#333] text-white border border-[#383838] flex items-center gap-1.5 transition-colors shadow-xs"
            title="Download CSV template format matching all 23 lead fields"
          >
            <Download className="w-3.5 h-3.5 text-[#bef264]" />
            <span>Download Format Template</span>
          </button>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-gray-400 hover:bg-[#262626] hover:text-white transition-colors"
            >
              Done
            </button>
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-[#bef264] hover:bg-[#a3e635] disabled:opacity-50 text-black flex items-center gap-2 shadow-xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing Sheet...' : 'Sync Sheet Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
