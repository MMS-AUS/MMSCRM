import React, { useState, useMemo } from 'react';
import {
  Sun,
  Zap,
  Battery,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Layers,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PanelHierarchyItem, InverterHierarchyItem, BatteryHierarchyItem } from '../../types';
import { HardwareItemEditModal, HardwareType } from '../modals/HardwareItemEditModal';
import { HardwareBulkImportModal } from '../modals/HardwareBulkImportModal';
import { exportHardwareToExcel } from '../../services/hardwareExcelService';

export const HardwareCatalogManager: React.FC = () => {
  const {
    dropdowns,
    addPanelItem,
    updatePanelItem,
    deletePanelItem,
    addInverterItem,
    updateInverterItem,
    deleteInverterItem,
    addBatteryItem,
    updateBatteryItem,
    deleteBatteryItem,
    batchImportHardware,
    resetHardwareToDefaults
  } = useApp();

  const [activeTab, setActiveTab] = useState<HardwareType>('panel');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState('ALL');
  const [selectedSeriesFilter, setSelectedSeriesFilter] = useState('ALL');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<
    PanelHierarchyItem | InverterHierarchyItem | BatteryHierarchyItem | null
  >(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  const panels: PanelHierarchyItem[] = dropdowns.panelHierarchy || [];
  const inverters: InverterHierarchyItem[] = dropdowns.inverterHierarchy || [];
  const batteries: BatteryHierarchyItem[] = dropdowns.batteryHierarchy || [];

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  // Distinct brands & series for filters
  const panelBrands = useMemo(() => Array.from(new Set(panels.map(p => p.manufacturer))), [panels]);
  const panelSeries = useMemo(() => Array.from(new Set(panels.map(p => p.series))), [panels]);

  const inverterBrands = useMemo(() => Array.from(new Set(inverters.map(i => i.manufacturer))), [inverters]);
  const inverterSeries = useMemo(
    () => Array.from(new Set(inverters.map(i => i.series || '').filter(Boolean))),
    [inverters]
  );

  const batteryBrands = useMemo(() => Array.from(new Set(batteries.map(b => b.manufacturer))), [batteries]);
  const batterySeries = useMemo(
    () => Array.from(new Set(batteries.map(b => b.series || '').filter(Boolean))),
    [batteries]
  );

  // Filtered lists
  const filteredPanels = useMemo(() => {
    return panels.filter(p => {
      if (selectedBrandFilter !== 'ALL' && p.manufacturer !== selectedBrandFilter) return false;
      if (selectedSeriesFilter !== 'ALL' && p.series !== selectedSeriesFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.manufacturer.toLowerCase().includes(q) ||
          p.model.toLowerCase().includes(q) ||
          p.series.toLowerCase().includes(q) ||
          String(p.sizeW).includes(q)
        );
      }
      return true;
    });
  }, [panels, selectedBrandFilter, selectedSeriesFilter, searchQuery]);

  const filteredInverters = useMemo(() => {
    return inverters.filter(i => {
      if (selectedBrandFilter !== 'ALL' && i.manufacturer !== selectedBrandFilter) return false;
      if (selectedSeriesFilter !== 'ALL' && (i.series || '') !== selectedSeriesFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          i.manufacturer.toLowerCase().includes(q) ||
          i.model.toLowerCase().includes(q) ||
          (i.series || '').toLowerCase().includes(q) ||
          String(i.sizeKw).includes(q)
        );
      }
      return true;
    });
  }, [inverters, selectedBrandFilter, selectedSeriesFilter, searchQuery]);

  const filteredBatteries = useMemo(() => {
    return batteries.filter(b => {
      if (selectedBrandFilter !== 'ALL' && b.manufacturer !== selectedBrandFilter) return false;
      if (selectedSeriesFilter !== 'ALL' && (b.series || '') !== selectedSeriesFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          b.manufacturer.toLowerCase().includes(q) ||
          b.model.toLowerCase().includes(q) ||
          (b.series || '').toLowerCase().includes(q) ||
          (b.size || '').toLowerCase().includes(q) ||
          String(b.usableCapacityKwh).includes(q)
        );
      }
      return true;
    });
  }, [batteries, selectedBrandFilter, selectedSeriesFilter, searchQuery]);

  // Actions
  const handleOpenAddModal = () => {
    setItemToEdit(null);
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (
    item: PanelHierarchyItem | InverterHierarchyItem | BatteryHierarchyItem
  ) => {
    setItemToEdit(item);
    setIsEditModalOpen(true);
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from the active hardware catalog?`)) {
      return;
    }
    if (activeTab === 'panel') {
      await deletePanelItem(id);
      showFeedback('Panel model removed from catalog.');
    } else if (activeTab === 'inverter') {
      await deleteInverterItem(id);
      showFeedback('Inverter model removed from catalog.');
    } else if (activeTab === 'battery') {
      await deleteBatteryItem(id);
      showFeedback('Battery model removed from catalog.');
    }
  };

  const handleResetDefaults = async () => {
    if (
      !window.confirm(
        'Reset hardware catalog to CEC Approved Australian industry defaults? This will restore high-efficiency panels, Fronius/Sungrow inverters, and Tesla/Sungrow batteries.'
      )
    ) {
      return;
    }
    await resetHardwareToDefaults();
    showFeedback('Hardware catalog reset to CEC industry defaults!');
  };

  const handleExportCatalog = () => {
    exportHardwareToExcel({
      panelHierarchy: panels,
      inverterHierarchy: inverters,
      batteryHierarchy: batteries
    });
    showFeedback('Downloaded complete hardware equipment catalog (.xlsx)!');
  };

  return (
    <div className="space-y-6">
      {/* Feedback banner */}
      {feedback && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Main Hardware Hub Card */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-[#bef264]/15 text-[#bef264] border border-[#bef264]/25">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">Equipment Catalog &amp; Dependent Dropdowns</h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#bef264]/20 text-[#bef264] border border-[#bef264]/30 font-bold">
                  Watts • Series • Model
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Configure what hardware is sold in your system. Modifying these values updates the cascading dependent dropdowns across Leads, Projects, and Quotes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-gray-400">
            <span className="text-white font-semibold">{panels.length} Panels</span>
            <span>•</span>
            <span className="text-cyan-400 font-semibold">{inverters.length} Inverters</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">{batteries.length} Batteries</span>
            <span>•</span>
            <span className="text-[#bef264]">Manual Add &amp; Bulk Import</span>
          </div>
        </div>

        {/* Global Catalog Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded-lg bg-[#1c1c1c] hover:bg-[#252525] border border-[#2e2e2e] text-gray-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Reset catalog to CEC default models"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleExportCatalog}
            className="px-3.5 py-2 rounded-lg bg-[#1f1f1f] hover:bg-[#272727] border border-[#333] text-gray-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Export all panels, inverters, and batteries to Excel"
          >
            <Download className="w-3.5 h-3.5 text-[#bef264]" />
            <span>Export Catalog (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBulkImportOpen(true)}
            className="px-4 py-2 rounded-lg bg-[#222] hover:bg-[#2c2c2c] border border-[#383838] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-[#bef264]" />
            <span>Bulk Import (.xlsx / .csv)</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-lg bg-[#bef264] hover:bg-[#a3e635] text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>
              Add{' '}
              {activeTab === 'panel'
                ? 'Panel'
                : activeTab === 'inverter'
                ? 'Inverter'
                : 'Battery'}{' '}
              Manually
            </span>
          </button>
        </div>
      </div>

      {/* Equipment Sub-Tabs Selector */}
      <div className="flex items-center gap-2 p-1.5 bg-[#141414] border border-[#262626] rounded-xl overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => {
            setActiveTab('panel');
            setSelectedBrandFilter('ALL');
            setSelectedSeriesFilter('ALL');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold transition-all ${
            activeTab === 'panel'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs'
              : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
          }`}
        >
          <Sun className="w-4 h-4 text-amber-400" />
          <span>Solar Panels ({panels.length})</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#202020] text-gray-300">
            Brand &rarr; Watts &rarr; Series &rarr; Model
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('inverter');
            setSelectedBrandFilter('ALL');
            setSelectedSeriesFilter('ALL');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold transition-all ${
            activeTab === 'inverter'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-xs'
              : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
          }`}
        >
          <Zap className="w-4 h-4 text-cyan-400" />
          <span>Solar Inverters ({inverters.length})</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#202020] text-gray-300">
            Brand &rarr; Rated kW &rarr; Series &rarr; Model
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('battery');
            setSelectedBrandFilter('ALL');
            setSelectedSeriesFilter('ALL');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold transition-all ${
            activeTab === 'battery'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs'
              : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
          }`}
        >
          <Battery className="w-4 h-4 text-emerald-400" />
          <span>Battery Storage ({batteries.length})</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#202020] text-gray-300">
            Brand &rarr; Capacity &rarr; Series &rarr; Model
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search box */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              type="text"
              placeholder={`Search ${activeTab}s by model, series, brand, or rating...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#181818] border border-[#2c2c2c] rounded-lg text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none"
            />
          </div>

          {/* Filter by Manufacturer */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <select
              value={selectedBrandFilter}
              onChange={e => setSelectedBrandFilter(e.target.value)}
              className="bg-[#181818] border border-[#2c2c2c] rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:border-[#bef264] outline-none"
            >
              <option value="ALL">All Brands ({(activeTab === 'panel' ? panelBrands : activeTab === 'inverter' ? inverterBrands : batteryBrands).length})</option>
              {(activeTab === 'panel' ? panelBrands : activeTab === 'inverter' ? inverterBrands : batteryBrands).map(b => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Series */}
          {(activeTab === 'panel' ? panelSeries : activeTab === 'inverter' ? inverterSeries : batterySeries).length > 0 && (
            <select
              value={selectedSeriesFilter}
              onChange={e => setSelectedSeriesFilter(e.target.value)}
              className="bg-[#181818] border border-[#2c2c2c] rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:border-[#bef264] outline-none"
            >
              <option value="ALL">All Series</option>
              {(activeTab === 'panel' ? panelSeries : activeTab === 'inverter' ? inverterSeries : batterySeries).map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}

          {(selectedBrandFilter !== 'ALL' || selectedSeriesFilter !== 'ALL' || searchQuery.trim()) && (
            <button
              type="button"
              onClick={() => {
                setSelectedBrandFilter('ALL');
                setSelectedSeriesFilter('ALL');
                setSearchQuery('');
              }}
              className="text-[11px] text-[#bef264] hover:underline px-2 py-1"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="text-[11px] font-mono text-gray-400 shrink-0">
          Showing{' '}
          <strong className="text-white">
            {activeTab === 'panel'
              ? filteredPanels.length
              : activeTab === 'inverter'
              ? filteredInverters.length
              : filteredBatteries.length}
          </strong>{' '}
          of{' '}
          {activeTab === 'panel'
            ? panels.length
            : activeTab === 'inverter'
            ? inverters.length
            : batteries.length}{' '}
          {activeTab} models
        </div>
      </div>

      {/* Hardware Table */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#181818] text-gray-400 border-b border-[#262626]">
              <tr>
                <th className="py-3 px-4 font-semibold">Manufacturer / Brand</th>
                <th className="py-3 px-4 font-semibold">
                  {activeTab === 'panel'
                    ? 'Watts (W)'
                    : activeTab === 'inverter'
                    ? 'Rated Power'
                    : 'Usable Capacity'}
                </th>
                <th className="py-3 px-4 font-semibold">Series Name</th>
                <th className="py-3 px-4 font-semibold">Model Number &amp; System Description</th>
                {activeTab === 'battery' && (
                  <th className="py-3 px-4 font-semibold">Form Factor / Size</th>
                )}
                <th className="py-3 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202020]">
              {/* PANELS TABLE */}
              {activeTab === 'panel' &&
                (filteredPanels.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500 text-xs">
                      No solar panels match your current filter. Add one manually or import from Excel.
                    </td>
                  </tr>
                ) : (
                  filteredPanels.map(panel => (
                    <tr key={panel.id} className="hover:bg-[#181818] transition-colors group">
                      <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Sun className="w-3.5 h-3.5 text-amber-400" />
                          <span>{panel.manufacturer}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#bef264] whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-[#bef264]/10 border border-[#bef264]/20">
                          {panel.sizeW} W
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-300 whitespace-nowrap font-medium">
                        {panel.series}
                      </td>
                      <td className="py-3 px-4 text-gray-200">
                        <span className="font-mono text-[11px] text-gray-100 bg-[#1c1c1c] px-2 py-1 rounded border border-[#2b2b2b]">
                          {panel.model}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(panel)}
                            className="p-1.5 rounded-lg bg-[#202020] hover:bg-[#2b2b2b] text-gray-300 hover:text-white transition-colors"
                            title="Edit panel specification"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(panel.id, panel.model)}
                            className="p-1.5 rounded-lg bg-[#202020] hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition-colors"
                            title="Delete panel"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ))}

              {/* INVERTERS TABLE */}
              {activeTab === 'inverter' &&
                (filteredInverters.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500 text-xs">
                      No solar inverters match your current filter. Add one manually or import from Excel.
                    </td>
                  </tr>
                ) : (
                  filteredInverters.map(inv => (
                    <tr key={inv.id} className="hover:bg-[#181818] transition-colors group">
                      <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{inv.manufacturer}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-cyan-400 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                          {inv.sizeKw} kW
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-300 whitespace-nowrap font-medium">
                        {inv.series || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-200">
                        <span className="font-mono text-[11px] text-gray-100 bg-[#1c1c1c] px-2 py-1 rounded border border-[#2b2b2b]">
                          {inv.model}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(inv)}
                            className="p-1.5 rounded-lg bg-[#202020] hover:bg-[#2b2b2b] text-gray-300 hover:text-white transition-colors"
                            title="Edit inverter specification"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(inv.id, inv.model)}
                            className="p-1.5 rounded-lg bg-[#202020] hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition-colors"
                            title="Delete inverter"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ))}

              {/* BATTERIES TABLE */}
              {activeTab === 'battery' &&
                (filteredBatteries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500 text-xs">
                      No battery storage units match your current filter. Add one manually or import from Excel.
                    </td>
                  </tr>
                ) : (
                  filteredBatteries.map(bat => (
                    <tr key={bat.id} className="hover:bg-[#181818] transition-colors group">
                      <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Battery className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{bat.manufacturer}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                          {bat.usableCapacityKwh} kWh
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-300 whitespace-nowrap font-medium">
                        {bat.series || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-200">
                        <span className="font-mono text-[11px] text-gray-100 bg-[#1c1c1c] px-2 py-1 rounded border border-[#2b2b2b]">
                          {bat.model}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-[11px]">
                        {bat.size || '-'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(bat)}
                            className="p-1.5 rounded-lg bg-[#202020] hover:bg-[#2b2b2b] text-gray-300 hover:text-white transition-colors"
                            title="Edit battery specification"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(bat.id, bat.model)}
                            className="p-1.5 rounded-lg bg-[#202020] hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition-colors"
                            title="Delete battery"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Add / Edit Modal */}
      <HardwareItemEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        type={activeTab}
        itemToEdit={itemToEdit}
        existingManufacturers={
          activeTab === 'panel'
            ? panelBrands
            : activeTab === 'inverter'
            ? inverterBrands
            : batteryBrands
        }
        existingSeries={
          activeTab === 'panel'
            ? panelSeries
            : activeTab === 'inverter'
            ? inverterSeries
            : batterySeries
        }
        onSavePanel={async (item, id) => {
          if (id) {
            await updatePanelItem(id, item);
            showFeedback(`Updated solar panel "${item.model}"`);
          } else {
            await addPanelItem(item);
            showFeedback(`Added new solar panel "${item.model}" to catalog`);
          }
        }}
        onSaveInverter={async (item, id) => {
          if (id) {
            await updateInverterItem(id, item);
            showFeedback(`Updated solar inverter "${item.model}"`);
          } else {
            await addInverterItem(item);
            showFeedback(`Added new inverter "${item.model}" to catalog`);
          }
        }}
        onSaveBattery={async (item, id) => {
          if (id) {
            await updateBatteryItem(id, item);
            showFeedback(`Updated battery "${item.model}"`);
          } else {
            await addBatteryItem(item);
            showFeedback(`Added new battery "${item.model}" to catalog`);
          }
        }}
      />

      {/* Bulk Import Modal */}
      <HardwareBulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onApplyImport={async (data, mode) => {
          const counts = await batchImportHardware(data, mode);
          showFeedback(
            `Imported ${counts.panelsCount} Panels, ${counts.invertersCount} Inverters, and ${counts.batteriesCount} Batteries!`
          );
          return counts;
        }}
      />
    </div>
  );
};
