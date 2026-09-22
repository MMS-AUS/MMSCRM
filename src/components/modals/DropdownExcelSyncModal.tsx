import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Plus,
  Edit2,
  FileCheck,
  Search,
  Filter,
  Layers,
  ArrowRight,
  Info,
  Check,
  X,
  FileDown,
  BookOpen
} from 'lucide-react';
import { DropdownCategoryConfig } from '../../types';
import {
  exportDropdownsToExcel,
  exportDropdownTemplate,
  parseDropdownsExcelFile,
  DropdownImportSummary,
  DropdownImportRow,
  DROPDOWN_CATEGORY_LABELS
} from '../../services/dropdownExcelService';

interface DropdownExcelSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  dropdownConfigs: DropdownCategoryConfig[];
  onApplyImport: (
    summary: DropdownImportSummary,
    mode: 'merge' | 'replace'
  ) => { addedCount: number; updatedCount: number; deletedCount: number; categoriesModified: number };
  initialTab?: 'import' | 'export' | 'guide';
}

export const DropdownExcelSyncModal: React.FC<DropdownExcelSyncModalProps> = ({
  isOpen,
  onClose,
  dropdownConfigs,
  onApplyImport,
  initialTab = 'import'
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'guide'>(initialTab);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  // File parsing states
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedSummary, setParsedSummary] = useState<DropdownImportSummary | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Filter & preview states
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<'ALL' | 'ADD' | 'UPDATE' | 'DELETE' | 'WARNING'>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Execution states
  const [isApplying, setIsApplying] = useState(false);
  const [importResult, setImportResult] = useState<{
    addedCount: number;
    updatedCount: number;
    deletedCount: number;
    categoriesModified: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsParsing(true);
    setParseError(null);
    setImportResult(null);

    try {
      const summary = await parseDropdownsExcelFile(file, dropdownConfigs);
      if (summary.totalRows === 0) {
        setParseError('No dropdown option rows could be identified in the uploaded Excel file. Please ensure columns include "Category Key", "Option Value", and optional "Action".');
        setParsedSummary(null);
      } else {
        setParsedSummary(summary);
      }
    } catch (err: any) {
      setParseError(`Failed to parse file: ${err.message || 'Unknown format error'}`);
      setParsedSummary(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsParsing(true);
    setParseError(null);
    setImportResult(null);

    try {
      const summary = await parseDropdownsExcelFile(file, dropdownConfigs);
      if (summary.totalRows === 0) {
        setParseError('No dropdown option rows found. Please check file formatting.');
        setParsedSummary(null);
      } else {
        setParsedSummary(summary);
      }
    } catch (err: any) {
      setParseError(`Failed to parse file: ${err.message}`);
      setParsedSummary(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleExecuteImport = () => {
    if (!parsedSummary) return;
    setIsApplying(true);

    try {
      const result = onApplyImport(parsedSummary, importMode);
      setImportResult(result);
    } finally {
      setIsApplying(false);
    }
  };

  const handleExportAll = () => {
    exportDropdownsToExcel(dropdownConfigs);
  };

  const handleExportTemplate = () => {
    exportDropdownTemplate();
  };

  // Filter parsed rows for preview
  const filteredRows = (parsedSummary?.rows || []).filter(row => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchOpt = row.optionValue.toLowerCase().includes(q);
      const matchCat = (row.categoryLabel || row.categoryKey).toLowerCase().includes(q);
      const matchOld = (row.oldValue || '').toLowerCase().includes(q);
      if (!matchOpt && !matchCat && !matchOld) return false;
    }

    if (actionFilter === 'ADD' && row.action !== 'ADD') return false;
    if (actionFilter === 'UPDATE' && row.action !== 'UPDATE') return false;
    if (actionFilter === 'DELETE' && row.action !== 'DELETE') return false;
    if (actionFilter === 'WARNING' && row.status !== 'warning') return false;

    if (selectedCategoryFilter !== 'ALL' && row.categoryKey !== selectedCategoryFilter) {
      return false;
    }

    return true;
  });

  const totalOptionsCount = dropdownConfigs.reduce((acc, c) => acc + c.options.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-5xl bg-[#161616] rounded-2xl shadow-2xl border border-[#2d2d2d] overflow-hidden text-[#e5e7eb] flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 md:p-5 bg-[#121212] text-white flex items-center justify-between border-b border-[#262626]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#bef264]/20 text-[#bef264] border border-[#bef264]/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base md:text-lg text-white">Excel Dropdowns &amp; Hardware Management</h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#bef264]/20 text-[#bef264] border border-[#bef264]/30">
                  Bulk Add, Update &amp; Delete
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Manage multiple dropdown categories using one single consolidated Excel file (.xlsx)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-[#262626] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Sub-tabs Header */}
        <div className="flex items-center border-b border-[#262626] bg-[#141414] px-4 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'import'
                ? 'border-[#bef264] text-[#bef264] font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>1. Import Excel (.xlsx / .csv)</span>
            {parsedSummary && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#262626] text-gray-300">
                {parsedSummary.validRows} rows
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'export'
                ? 'border-[#bef264] text-[#bef264] font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>2. Export Existing Dropdowns ({totalOptionsCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'guide'
                ? 'border-[#bef264] text-[#bef264] font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            <span>3. Excel Structure &amp; Format Guide</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs">
          {/* TAB 1: IMPORT EXCEL */}
          {activeTab === 'import' && (
            <div className="space-y-5">
              {/* Import Success Banner */}
              {importResult && (
                <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl space-y-2 text-emerald-300">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Excel Dropdown Sync Successfully Applied!</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
                    <div className="p-2 rounded bg-black/30 border border-emerald-500/20">
                      <span className="text-gray-400 block text-[10px]">Options Added:</span>
                      <span className="font-bold text-emerald-300 text-sm">+{importResult.addedCount}</span>
                    </div>
                    <div className="p-2 rounded bg-black/30 border border-emerald-500/20">
                      <span className="text-gray-400 block text-[10px]">Options Updated:</span>
                      <span className="font-bold text-blue-300 text-sm">✎ {importResult.updatedCount}</span>
                    </div>
                    <div className="p-2 rounded bg-black/30 border border-emerald-500/20">
                      <span className="text-gray-400 block text-[10px]">Options Deleted:</span>
                      <span className="font-bold text-rose-300 text-sm">✕ {importResult.deletedCount}</span>
                    </div>
                    <div className="p-2 rounded bg-black/30 border border-emerald-500/20">
                      <span className="text-gray-400 block text-[10px]">Categories Affected:</span>
                      <span className="font-bold text-white text-sm">{importResult.categoriesModified}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Zone */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-2xl border-2 border-dashed border-[#333] hover:border-[#bef264] bg-[#141414] hover:bg-[#181818] transition-all cursor-pointer text-center space-y-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#bef264]/10 text-[#bef264] flex items-center justify-center border border-[#bef264]/20 shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {fileName ? fileName : 'Choose an Excel spreadsheet (.xlsx, .xls) or drag & drop'}
                  </h3>
                  <p className="text-gray-400 text-xs mt-1">
                    Supports consolidated multi-category sheets or workbooks with individual category tabs
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 text-[11px] text-gray-500 font-mono">
                  <span>Columns: Category Key | Option Value | Action | Old Value</span>
                </div>
              </div>

              {parseError && (
                <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-red-300">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Mode Selector & Action Buttons when File is Loaded */}
              {parsedSummary && (
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="p-4 rounded-xl bg-[#1b1b1b] border border-[#2b2b2b] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          Ready to Apply: {parsedSummary.validRows} Actions across {parsedSummary.categoriesAffected.length} Categories
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          + {parsedSummary.addCount} To Add
                        </span>
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          ✎ {parsedSummary.updateCount} To Update
                        </span>
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          ✕ {parsedSummary.deleteCount} To Delete
                        </span>
                        {parsedSummary.warningCount > 0 && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            ⚠️ {parsedSummary.warningCount} Warnings
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mode Selector */}
                    <div className="flex items-center gap-3">
                      <div className="bg-[#121212] p-1 rounded-lg border border-[#262626] flex text-[11px]">
                        <button
                          type="button"
                          onClick={() => setImportMode('merge')}
                          className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                            importMode === 'merge'
                              ? 'bg-[#bef264] text-black font-bold shadow-xs'
                              : 'text-gray-400 hover:text-white'
                          }`}
                          title="Execute specified ADD, UPDATE, and DELETE actions without wiping other existing options"
                        >
                          Smart Merge (Action-Based)
                        </button>
                        <button
                          type="button"
                          onClick={() => setImportMode('replace')}
                          className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                            importMode === 'replace'
                              ? 'bg-rose-500 text-white font-bold shadow-xs'
                              : 'text-gray-400 hover:text-white'
                          }`}
                          title="Completely overwrite each category list with the options found in the Excel file"
                        >
                          Full Category Overwrite
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleExecuteImport}
                        disabled={isApplying || parsedSummary.validRows === 0}
                        className="px-5 py-2.5 rounded-xl bg-[#bef264] hover:bg-[#a3e635] text-slate-950 font-bold text-xs flex items-center gap-2 shadow-xs transition-colors shrink-0"
                      >
                        <Check className="w-4 h-4" />
                        <span>{isApplying ? 'Applying Changes...' : `Confirm & Apply ${parsedSummary.validRows} Changes`}</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter and Search Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#141414] p-3 rounded-xl border border-[#262626]">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Search options or categories..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-[#181818] border border-[#2b2b2b] rounded-lg text-xs text-white placeholder-gray-500 outline-none focus:border-[#bef264]"
                        />
                      </div>

                      {/* Category selector */}
                      <select
                        value={selectedCategoryFilter}
                        onChange={e => setSelectedCategoryFilter(e.target.value)}
                        className="bg-[#181818] border border-[#2b2b2b] rounded-lg px-2.5 py-1.5 text-xs text-gray-300 outline-none focus:border-[#bef264] max-w-[200px]"
                      >
                        <option value="ALL">All Categories ({parsedSummary.categoriesAffected.length})</option>
                        {parsedSummary.categoriesAffected.map(cat => (
                          <option key={cat} value={cat}>
                            {DROPDOWN_CATEGORY_LABELS[cat] || cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Action filter pills */}
                    <div className="flex items-center gap-1 self-start sm:self-center">
                      <button
                        type="button"
                        onClick={() => setActionFilter('ALL')}
                        className={`px-2 py-1 rounded text-[11px] font-semibold ${
                          actionFilter === 'ALL' ? 'bg-[#2b2b2b] text-white' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        All ({parsedSummary.rows.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionFilter('ADD')}
                        className={`px-2 py-1 rounded text-[11px] font-semibold ${
                          actionFilter === 'ADD' ? 'bg-emerald-500/20 text-emerald-300' : 'text-gray-400 hover:text-emerald-400'
                        }`}
                      >
                        Add ({parsedSummary.addCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionFilter('UPDATE')}
                        className={`px-2 py-1 rounded text-[11px] font-semibold ${
                          actionFilter === 'UPDATE' ? 'bg-blue-500/20 text-blue-300' : 'text-gray-400 hover:text-blue-400'
                        }`}
                      >
                        Update ({parsedSummary.updateCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionFilter('DELETE')}
                        className={`px-2 py-1 rounded text-[11px] font-semibold ${
                          actionFilter === 'DELETE' ? 'bg-rose-500/20 text-rose-300' : 'text-gray-400 hover:text-rose-400'
                        }`}
                      >
                        Delete ({parsedSummary.deleteCount})
                      </button>
                      {parsedSummary.warningCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setActionFilter('WARNING')}
                          className={`px-2 py-1 rounded text-[11px] font-semibold ${
                            actionFilter === 'WARNING' ? 'bg-amber-500/20 text-amber-300' : 'text-gray-400 hover:text-amber-400'
                          }`}
                        >
                          Warnings ({parsedSummary.warningCount})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-[#262626] rounded-xl overflow-hidden bg-[#141414]">
                    <div className="overflow-x-auto max-h-[360px]">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#1b1b1b] border-b border-[#262626] text-gray-400 font-semibold uppercase text-[10px]">
                            <th className="py-2.5 px-3">Action</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3">Option Value</th>
                            <th className="py-2.5 px-3">Old Value (If Updating)</th>
                            <th className="py-2.5 px-3">Source Sheet &amp; Row</th>
                            <th className="py-2.5 px-3">Status / Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#202020]">
                          {filteredRows.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-gray-500">
                                No rows match current filter.
                              </td>
                            </tr>
                          ) : (
                            filteredRows.map((r, i) => (
                              <tr key={`${r.categoryKey}-${r.optionValue}-${i}`} className="hover:bg-[#181818] transition-colors">
                                <td className="py-2 px-3 whitespace-nowrap">
                                  {r.action === 'ADD' && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      + ADD
                                    </span>
                                  )}
                                  {r.action === 'UPDATE' && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                      ✎ UPDATE
                                    </span>
                                  )}
                                  {r.action === 'DELETE' && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                      ✕ DELETE
                                    </span>
                                  )}
                                  {r.action === 'KEEP' && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-gray-500/20 text-gray-400 border border-gray-500/30">
                                      KEEP
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3 font-semibold text-white">
                                  <div className="truncate max-w-[200px]" title={r.categoryLabel}>
                                    {r.categoryLabel}
                                  </div>
                                  <span className="text-[10px] font-mono text-gray-500">{r.categoryKey}</span>
                                </td>
                                <td className="py-2 px-3 font-medium text-gray-200">
                                  {r.optionValue}
                                </td>
                                <td className="py-2 px-3 font-mono text-gray-400">
                                  {r.oldValue ? (
                                    <span className="text-amber-400/90">{r.oldValue}</span>
                                  ) : (
                                    <span className="text-gray-600">-</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 font-mono text-[10px] text-gray-400">
                                  {r.sourceSheet} (line {r.rowIndex})
                                </td>
                                <td className="py-2 px-3">
                                  {r.status === 'valid' && (
                                    <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Ready</span>
                                    </span>
                                  )}
                                  {r.status === 'warning' && (
                                    <span className="text-amber-400 flex items-center gap-1 text-[11px]" title={r.validationMessage}>
                                      <AlertTriangle className="w-3 h-3" />
                                      <span className="truncate max-w-[180px]">{r.validationMessage}</span>
                                    </span>
                                  )}
                                  {r.status === 'invalid' && (
                                    <span className="text-rose-400 flex items-center gap-1 text-[11px]" title={r.validationMessage}>
                                      <X className="w-3 h-3" />
                                      <span className="truncate max-w-[180px]">{r.validationMessage}</span>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXPORT EXCEL */}
          {activeTab === 'export' && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-[#1b1b1b] border border-[#2b2b2b] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Download className="w-4 h-4 text-[#bef264]" />
                    Export Full Multi-Category Excel Spreadsheet (.xlsx)
                  </h3>
                  <p className="text-gray-300 text-xs">
                    Downloads an Excel workbook containing all <strong className="text-white">{dropdownConfigs.length} categories</strong> and <strong className="text-white">{totalOptionsCount} active options</strong> currently configured in the CRM.
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Includes the consolidated <code className="text-gray-200">All_Dropdowns</code> master sheet, individual category tabs, and instructions.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleExportTemplate}
                    className="px-4 py-2.5 rounded-xl bg-[#222] hover:bg-[#2c2c2c] border border-[#333] text-gray-200 hover:text-white font-semibold text-xs flex items-center gap-2 transition-colors"
                  >
                    <FileDown className="w-4 h-4 text-blue-400" />
                    <span>Download Blank Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportAll}
                    className="px-5 py-2.5 rounded-xl bg-[#bef264] hover:bg-[#a3e635] text-slate-950 font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Existing List (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Category Breakdown Table */}
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-xs">Categories Included in the Single Export File ({dropdownConfigs.length})</h4>
                  <span className="text-[10px] text-gray-400 font-mono">Total {totalOptionsCount} Dropdown Items</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {dropdownConfigs.map(cat => (
                    <div
                      key={cat.key}
                      className="p-3 rounded-lg bg-[#181818] border border-[#262626] flex items-center justify-between"
                    >
                      <div className="overflow-hidden pr-2">
                        <span className="font-semibold text-white text-xs truncate block">{cat.label}</span>
                        <span className="font-mono text-[10px] text-gray-500">{cat.key}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#242424] text-gray-300 font-mono text-[10px] shrink-0">
                        {cat.options.length} items
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FORMAT GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-[#1b1b1b] border border-[#2b2b2b] space-y-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  Excel Column Structure &amp; Actions Guide
                </h3>
                <p className="text-gray-300 text-xs">
                  A single Excel file can simultaneously add new options, update existing names, or delete obsolete options across multiple categories:
                </p>

                {/* Example Table */}
                <div className="border border-[#2d2d2d] rounded-xl overflow-hidden bg-[#121212]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#202020] text-gray-300 text-[10px] uppercase font-mono">
                        <th className="py-2 px-3 border-r border-[#2d2d2d]">Category Key</th>
                        <th className="py-2 px-3 border-r border-[#2d2d2d]">Option Value</th>
                        <th className="py-2 px-3 border-r border-[#2d2d2d]">Action</th>
                        <th className="py-2 px-3 border-r border-[#2d2d2d]">Old Value</th>
                        <th className="py-2 px-3">Result in System</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#242424] font-mono text-[11px]">
                      <tr>
                        <td className="py-2 px-3 text-emerald-400 border-r border-[#242424]">panelBrands</td>
                        <td className="py-2 px-3 text-white border-r border-[#242424]">Trina Solar Vertex S+ 445W</td>
                        <td className="py-2 px-3 text-emerald-400 border-r border-[#242424]">ADD</td>
                        <td className="py-2 px-3 text-gray-500 border-r border-[#242424]">-</td>
                        <td className="py-2 px-3 text-gray-300">Adds the new solar panel to the CEC panel list</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-emerald-400 border-r border-[#242424]">inverterBrands</td>
                        <td className="py-2 px-3 text-white border-r border-[#242424]">Fronius Primo GEN24 8.0 Plus</td>
                        <td className="py-2 px-3 text-blue-400 border-r border-[#242424]">UPDATE</td>
                        <td className="py-2 px-3 text-amber-400 border-r border-[#242424]">Fronius Primo 8.2</td>
                        <td className="py-2 px-3 text-gray-300">Renames the inverter option across all project forms</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-emerald-400 border-r border-[#242424]">batteryBrands</td>
                        <td className="py-2 px-3 text-white border-r border-[#242424]">Obsolete Battery Model V1</td>
                        <td className="py-2 px-3 text-rose-400 border-r border-[#242424]">DELETE</td>
                        <td className="py-2 px-3 text-gray-500 border-r border-[#242424]">-</td>
                        <td className="py-2 px-3 text-gray-300">Removes the battery model from dropdown selections</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-emerald-400 border-r border-[#242424]">leadStatuses</td>
                        <td className="py-2 px-3 text-white border-r border-[#242424]">Awaiting Landlord Permission</td>
                        <td className="py-2 px-3 text-emerald-400 border-r border-[#242424]">ADD</td>
                        <td className="py-2 px-3 text-gray-500 border-r border-[#242424]">-</td>
                        <td className="py-2 px-3 text-gray-300">Adds new sales pipeline milestone status</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Supported Category Keys Reference */}
              <div className="p-4 rounded-xl bg-[#1b1b1b] border border-[#2b2b2b] space-y-3">
                <h4 className="font-bold text-white text-xs">Supported Category Keys (Use in Category Key Column)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 font-mono text-[10px]">
                  {Object.entries(DROPDOWN_CATEGORY_LABELS).map(([k, label]) => (
                    <div key={k} className="p-2 rounded bg-[#121212] border border-[#262626]">
                      <span className="text-[#bef264] block font-bold">{k}</span>
                      <span className="text-gray-400">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#121212] border-t border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <Info className="w-4 h-4 text-[#bef264]" />
            <span>Single Excel File Engine: Supports Add, Update, and Delete across all system dropdowns</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#262626] hover:bg-[#333] text-white text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
