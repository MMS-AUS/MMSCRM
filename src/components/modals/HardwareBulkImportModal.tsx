import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Sun,
  Zap,
  Battery,
  Layers,
  Search,
  BookOpen,
  FileDown
} from 'lucide-react';
import {
  parseHardwareFile,
  exportHardwareTemplate,
  HardwareParseResult
} from '../../services/hardwareExcelService';
import { PanelHierarchyItem, InverterHierarchyItem, BatteryHierarchyItem } from '../../types';

interface HardwareBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyImport: (
    data: {
      panels: PanelHierarchyItem[];
      inverters: InverterHierarchyItem[];
      batteries: BatteryHierarchyItem[];
    },
    mode: 'merge' | 'replace'
  ) => Promise<{ panelsCount: number; invertersCount: number; batteriesCount: number }>;
}

export const HardwareBulkImportModal: React.FC<HardwareBulkImportModalProps> = ({
  isOpen,
  onClose,
  onApplyImport
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'templates' | 'guide'>('import');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  // File parsing states
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<HardwareParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Preview filtering
  const [previewFilter, setPreviewFilter] = useState<'all' | 'panel' | 'inverter' | 'battery'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Submitting
  const [isApplying, setIsApplying] = useState(false);
  const [importSuccess, setImportSuccess] = useState<{
    panelsCount: number;
    invertersCount: number;
    batteriesCount: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelected = async (file: File) => {
    setFileName(file.name);
    setIsParsing(true);
    setParseError(null);
    setImportSuccess(null);

    try {
      const res = await parseHardwareFile(file);
      if (res.totalRows === 0) {
        setParseError(
          'No hardware rows found in the uploaded file. Please check that columns match the template (Manufacturer, Watts/kW/Capacity, Series, Model).'
        );
        setParseResult(null);
      } else {
        setParseResult(res);
      }
    } catch (err: any) {
      setParseError(`Failed to parse file: ${err.message || 'Unknown error'}`);
      setParseResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
  };

  const handleApply = async () => {
    if (!parseResult) return;
    setIsApplying(true);
    try {
      const counts = await onApplyImport(
        {
          panels: parseResult.panels,
          inverters: parseResult.inverters,
          batteries: parseResult.batteries
        },
        importMode
      );
      setImportSuccess(counts);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setParseError(`Error saving hardware catalog: ${err.message}`);
    } finally {
      setIsApplying(false);
    }
  };

  const filteredPreviewRows = (parseResult?.previewRows || []).filter(row => {
    if (previewFilter !== 'all' && row.type !== previewFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        row.manufacturer.toLowerCase().includes(q) ||
        row.model.toLowerCase().includes(q) ||
        row.series.toLowerCase().includes(q) ||
        row.size.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#141414] border border-[#2b2b2b] rounded-2xl w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222] bg-[#181818]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#bef264]/15 border border-[#bef264]/25 text-[#bef264]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Bulk Import Hardware &amp; Specifications
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#bef264]/20 text-[#bef264] border border-[#bef264]/30 font-semibold">
                  Panels • Inverters • Batteries
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Upload Excel (.xlsx, .xls) or CSV files to configure cascading equipment dropdowns
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-[#101010] border border-[#2c2c2c] rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('import')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  activeTab === 'import'
                    ? 'bg-[#bef264] text-slate-950 font-bold shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Upload &amp; Preview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('templates')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'templates'
                    ? 'bg-[#bef264] text-slate-950 font-bold shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Templates</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('guide')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'guide'
                    ? 'bg-[#bef264] text-slate-950 font-bold shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Field Guide</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#252525] transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Success feedback */}
        {importSuccess && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-sm text-emerald-200">Catalog Updated Successfully!</p>
              <p className="text-xs text-emerald-400/90 mt-0.5">
                Imported {importSuccess.panelsCount} Panels, {importSuccess.invertersCount} Inverters, and {importSuccess.batteriesCount} Battery models. Cascading dependent dropdowns have been refreshed.
              </p>
            </div>
          </div>
        )}

        {/* Error notification */}
        {parseError && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: UPLOAD & PREVIEW */}
          {activeTab === 'import' && (
            <div className="space-y-5">
              {/* Dropzone */}
              {!parseResult ? (
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#333] hover:border-[#bef264] rounded-2xl p-8 text-center cursor-pointer bg-[#171717] hover:bg-[#1a1f14] transition-all group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelected(f);
                    }}
                  />
                  <div className="w-12 h-12 rounded-2xl bg-[#222] group-hover:bg-[#bef264]/20 text-gray-400 group-hover:text-[#bef264] flex items-center justify-center mx-auto mb-3 transition-colors border border-[#303030]">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-[#bef264] transition-colors">
                    Click to select or drag and drop your Excel or CSV file
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                    Supports multi-sheet workbooks (.xlsx) with Panels, Inverters, and Batteries tabs, or individual CSV files.
                  </p>
                  <div className="flex items-center justify-center gap-4 mt-4 text-[11px] font-mono text-gray-500">
                    <span>.xlsx (Excel)</span>
                    <span>•</span>
                    <span>.xls</span>
                    <span>•</span>
                    <span>.csv</span>
                  </div>
                </div>
              ) : (
                <div className="bg-[#181818] border border-[#2b2b2b] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{fileName}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                          Parsed
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {parseResult.totalRows} Total Rows &bull; {parseResult.validRows} Ready to Import
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setParseResult(null);
                        setFileName(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#252525] hover:bg-[#303030] text-gray-300 text-xs font-semibold transition-colors"
                    >
                      Change File
                    </button>
                  </div>
                </div>
              )}

              {/* Parsing status & counts */}
              {parseResult && (
                <div className="space-y-4">
                  {/* Stats Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-[#191919] border border-[#2c2c2c] rounded-xl">
                      <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold mb-1">
                        <Sun className="w-3.5 h-3.5" />
                        <span>Solar Panels</span>
                      </div>
                      <div className="text-xl font-bold text-white">{parseResult.panels.length}</div>
                      <div className="text-[10px] text-gray-500">Models detected</div>
                    </div>

                    <div className="p-3 bg-[#191919] border border-[#2c2c2c] rounded-xl">
                      <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-semibold mb-1">
                        <Zap className="w-3.5 h-3.5" />
                        <span>Inverters</span>
                      </div>
                      <div className="text-xl font-bold text-white">{parseResult.inverters.length}</div>
                      <div className="text-[10px] text-gray-500">Models detected</div>
                    </div>

                    <div className="p-3 bg-[#191919] border border-[#2c2c2c] rounded-xl">
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold mb-1">
                        <Battery className="w-3.5 h-3.5" />
                        <span>Batteries</span>
                      </div>
                      <div className="text-xl font-bold text-white">{parseResult.batteries.length}</div>
                      <div className="text-[10px] text-gray-500">Storage units</div>
                    </div>

                    <div className="p-3 bg-[#191919] border border-[#2c2c2c] rounded-xl">
                      <div className="flex items-center gap-1.5 text-[#bef264] text-xs font-semibold mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Valid Records</span>
                      </div>
                      <div className="text-xl font-bold text-[#bef264]">{parseResult.validRows}</div>
                      <div className="text-[10px] text-gray-500">Ready to save</div>
                    </div>
                  </div>

                  {/* Import Mode Selector */}
                  <div className="p-4 bg-[#181818] border border-[#2c2c2c] rounded-xl space-y-2">
                    <label className="text-xs font-bold text-white block">Select Import Mode:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                          importMode === 'merge'
                            ? 'bg-[#bef264]/10 border-[#bef264] text-white'
                            : 'bg-[#141414] border-[#2c2c2c] text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          value="merge"
                          checked={importMode === 'merge'}
                          onChange={() => setImportMode('merge')}
                          className="mt-0.5 accent-[#bef264]"
                        />
                        <div>
                          <div className="text-xs font-bold text-white">Merge &amp; Update (Recommended)</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            Adds new models and updates existing hardware without removing your current catalog options.
                          </div>
                        </div>
                      </label>

                      <label
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                          importMode === 'replace'
                            ? 'bg-rose-500/10 border-rose-500 text-white'
                            : 'bg-[#141414] border-[#2c2c2c] text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          value="replace"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="mt-0.5 accent-rose-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-rose-300">Replace Entire Catalog</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            Replaces existing hardware lists with the uploaded spreadsheet contents.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Preview Table Header & Search */}
                  <div className="space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewFilter('all')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                            previewFilter === 'all'
                              ? 'bg-[#333] text-white'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          All ({parseResult.previewRows.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewFilter('panel')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                            previewFilter === 'panel'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <Sun className="w-3 h-3" />
                          <span>Panels ({parseResult.panels.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewFilter('inverter')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                            previewFilter === 'inverter'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <Zap className="w-3 h-3" />
                          <span>Inverters ({parseResult.inverters.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewFilter('battery')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                            previewFilter === 'battery'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <Battery className="w-3 h-3" />
                          <span>Batteries ({parseResult.batteries.length})</span>
                        </button>
                      </div>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Search preview rows..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="pl-9 pr-3 py-1.5 bg-[#181818] border border-[#2e2e2e] rounded-lg text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none"
                        />
                      </div>
                    </div>

                    {/* Preview Table */}
                    <div className="border border-[#282828] rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#1c1c1c] text-gray-400 border-b border-[#282828] sticky top-0 z-10">
                          <tr>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Manufacturer / Brand</th>
                            <th className="py-2.5 px-3">Watts / Size</th>
                            <th className="py-2.5 px-3">Series Name</th>
                            <th className="py-2.5 px-3">Model Number / Full Spec</th>
                            <th className="py-2.5 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#222]">
                          {filteredPreviewRows.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-gray-500 text-xs">
                                No preview rows matching filter.
                              </td>
                            </tr>
                          ) : (
                            filteredPreviewRows.map((row, idx) => (
                              <tr key={idx} className="hover:bg-[#1a1a1a]">
                                <td className="py-2 px-3">
                                  {row.type === 'panel' && (
                                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                                      <Sun className="w-3 h-3" /> Panel
                                    </span>
                                  )}
                                  {row.type === 'inverter' && (
                                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">
                                      <Zap className="w-3 h-3" /> Inverter
                                    </span>
                                  )}
                                  {row.type === 'battery' && (
                                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                                      <Battery className="w-3 h-3" /> Battery
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3 font-semibold text-white truncate max-w-[150px]">
                                  {row.manufacturer}
                                </td>
                                <td className="py-2 px-3 font-mono text-[#bef264]">{row.size}</td>
                                <td className="py-2 px-3 text-gray-300 truncate max-w-[140px]">
                                  {row.series}
                                </td>
                                <td className="py-2 px-3 text-gray-200 truncate max-w-[240px]" title={row.model}>
                                  {row.model}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  {row.status === 'valid' ? (
                                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                                      Ready
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">
                                      Invalid
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

          {/* TAB 2: STARTER TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#191919] border border-[#2b2b2b] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#bef264]" />
                    <h3 className="text-sm font-bold text-white">Master Consolidated Excel Template (.xlsx)</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#bef264]/20 text-[#bef264] font-semibold">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Includes 3 dedicated sheets for Solar Panels, Inverters, and Batteries with pre-filled sample rows and column guides.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => exportHardwareTemplate('master_xlsx')}
                  className="px-4 py-2 bg-[#bef264] hover:bg-[#a3e635] text-slate-950 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .xlsx</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-[#181818] border border-[#262626] rounded-xl space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                      <Sun className="w-4 h-4" />
                      <span>Solar Panels CSV</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Columns: Manufacturer, Watts, Series, Model
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => exportHardwareTemplate('panels_csv')}
                    className="w-full px-3 py-2 bg-[#222] hover:bg-[#2b2b2b] text-gray-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Download Panels CSV</span>
                  </button>
                </div>

                <div className="p-4 bg-[#181818] border border-[#262626] rounded-xl space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-bold">
                      <Zap className="w-4 h-4" />
                      <span>Inverters CSV</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Columns: Manufacturer, Rated_kW, Series, Model
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => exportHardwareTemplate('inverters_csv')}
                    className="w-full px-3 py-2 bg-[#222] hover:bg-[#2b2b2b] text-gray-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Download Inverters CSV</span>
                  </button>
                </div>

                <div className="p-4 bg-[#181818] border border-[#262626] rounded-xl space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                      <Battery className="w-4 h-4" />
                      <span>Battery Storage CSV</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Columns: Manufacturer, Usable_Capacity_kWh, Series, Model, Form_Factor
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => exportHardwareTemplate('batteries_csv')}
                    className="w-full px-3 py-2 bg-[#222] hover:bg-[#2b2b2b] text-gray-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download Batteries CSV</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FIELD SPECIFICATION GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-gray-300">
              <div className="p-4 bg-[#181818] border border-[#262626] rounded-xl space-y-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#bef264]" />
                  <span>How Cascading Dependent Dropdowns Work</span>
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  In solar ERP lead creation and project design, selecting a hardware manufacturer restricts the available Watts ratings. Choosing a Watts rating filters the relevant product Series, which then limits the Model Number selection to verified CEC-approved hardware models.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#181818] border border-[#262626] rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold">
                    <Sun className="w-4 h-4" />
                    <span>Solar Panels</span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-gray-400">
                    <li><strong className="text-white">Manufacturer:</strong> AIKO, Trina, Jinko, LONGi</li>
                    <li><strong className="text-white">Watts:</strong> 415, 440, 450, 475, 500</li>
                    <li><strong className="text-white">Series:</strong> Neostar 2P, Vertex S+, Tiger Neo</li>
                    <li><strong className="text-white">Model:</strong> Exact part number on CEC certificate</li>
                  </ul>
                </div>

                <div className="p-4 bg-[#181818] border border-[#262626] rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold">
                    <Zap className="w-4 h-4" />
                    <span>Inverters</span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-gray-400">
                    <li><strong className="text-white">Manufacturer:</strong> Fronius, Sungrow, Enphase</li>
                    <li><strong className="text-white">Rated kW:</strong> 5.0, 6.0, 8.2, 10.0 (or Watts)</li>
                    <li><strong className="text-white">Series:</strong> GEN24 Plus, SG Series, IQ8</li>
                    <li><strong className="text-white">Model:</strong> Model number with phase details</li>
                  </ul>
                </div>

                <div className="p-4 bg-[#181818] border border-[#262626] rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <Battery className="w-4 h-4" />
                    <span>Batteries</span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-gray-400">
                    <li><strong className="text-white">Manufacturer:</strong> Tesla, Sungrow, BYD, Enphase</li>
                    <li><strong className="text-white">Usable kWh:</strong> 9.6, 12.8, 13.5, 16.0</li>
                    <li><strong className="text-white">Series:</strong> Powerwall 3, SBR High Voltage</li>
                    <li><strong className="text-white">Form Factor:</strong> Wall Mount or Modular Tower</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#222] bg-[#181818]">
          <div className="text-xs text-gray-400">
            {parseResult ? (
              <span>
                <strong className="text-white">{parseResult.validRows}</strong> records ready to import via{' '}
                <strong className={importMode === 'merge' ? 'text-[#bef264]' : 'text-rose-400'}>
                  {importMode === 'merge' ? 'Merge & Update' : 'Replace Catalog'}
                </strong>
              </span>
            ) : (
              <span>Upload a spreadsheet to preview hardware before importing</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#222] hover:bg-[#2b2b2b] text-gray-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            {parseResult && (
              <button
                type="button"
                onClick={handleApply}
                disabled={isApplying || parseResult.validRows === 0}
                className="px-5 py-2 rounded-xl bg-[#bef264] hover:bg-[#a3e635] text-slate-950 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isApplying
                    ? 'Importing...'
                    : `Apply & Save ${parseResult.validRows} Records`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
