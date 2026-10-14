import React, { useState, useMemo } from 'react';
import {
  X,
  SlidersHorizontal,
  CheckCircle2,
  RotateCcw,
  Search,
  ExternalLink,
  ChevronRight,
  Layers,
  Sparkles,
  Plus,
  Filter
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  ALL_SECTIONS,
  ALL_DROPDOWN_FIELDS,
  getFieldsForSection,
  DEFAULT_DROPDOWN_MAPPINGS
} from '../../utils/dropdownMappingConfig';

interface DropdownMappingModalProps {
  initialSectionId?: string | null;
  onClose: () => void;
  onOpenSettingsCategory?: (categoryKey: string) => void;
}

export const DropdownMappingModal: React.FC<DropdownMappingModalProps> = ({
  initialSectionId,
  onClose,
  onOpenSettingsCategory
}) => {
  const {
    dropdowns,
    dropdownConfigs,
    dropdownMappings,
    updateDropdownMapping,
    resetDropdownMappings,
    addDropdownOption
  } = useApp();

  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    initialSectionId || 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [quickAddCategory, setQuickAddCategory] = useState<string | null>(null);
  const [quickAddValue, setQuickAddValue] = useState('');

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Safe category list from AppContext dropdownConfigs
  const categoryOptions = useMemo(() => {
    return (dropdownConfigs || []).map(cfg => {
      const rawOptions = (dropdowns as any)?.[cfg.key];
      const count = Array.isArray(rawOptions) ? rawOptions.length : (cfg.options?.length || 0);
      return {
        key: cfg.key,
        label: cfg.label,
        count
      };
    });
  }, [dropdownConfigs, dropdowns]);

  // Filtered fields
  const displayedFields = useMemo(() => {
    let list = selectedSectionId === 'all'
      ? ALL_DROPDOWN_FIELDS
      : getFieldsForSection(selectedSectionId);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(f =>
        f.fieldLabel.toLowerCase().includes(q) ||
        f.sectionLabel.toLowerCase().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q)) ||
        f.fieldKey.toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedSectionId, searchQuery]);

  // Count custom mappings
  const customMappingCount = useMemo(() => {
    return Object.entries(dropdownMappings).filter(([k, v]) => {
      return DEFAULT_DROPDOWN_MAPPINGS[k] && DEFAULT_DROPDOWN_MAPPINGS[k] !== v;
    }).length;
  }, [dropdownMappings]);

  const handleCategoryChange = (fieldKey: string, newCategoryKey: string) => {
    updateDropdownMapping(fieldKey, newCategoryKey);
    const field = ALL_DROPDOWN_FIELDS.find(f => f.fieldKey === fieldKey);
    const cat = categoryOptions.find(c => c.key === newCategoryKey);
    showToast(`Mapped "${field?.fieldLabel || fieldKey}" to "${cat?.label || newCategoryKey}"`);
  };

  const handleResetField = (fieldKey: string) => {
    const defaultCat = DEFAULT_DROPDOWN_MAPPINGS[fieldKey];
    if (defaultCat) {
      updateDropdownMapping(fieldKey, defaultCat);
      showToast(`Reset to default category`);
    }
  };

  const handleResetAll = () => {
    if (window.confirm('Reset all field mappings across all sections back to standard defaults?')) {
      resetDropdownMappings();
      showToast('All field mappings reset to CRM defaults!');
    }
  };

  const handleQuickAdd = async (categoryKey: string) => {
    if (!quickAddValue.trim()) return;
    try {
      await addDropdownOption(categoryKey, quickAddValue.trim());
      showToast(`Added "${quickAddValue.trim()}" to category!`);
      setQuickAddValue('');
      setQuickAddCategory(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#141414] border border-[#2b2b2b] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-4 right-4 z-50 bg-[#bef264] text-slate-950 font-bold text-xs px-4 py-2 rounded-lg shadow-xl flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-800" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="p-5 border-b border-[#262626] flex items-start justify-between bg-gradient-to-r from-[#181818] via-[#161616] to-[#141414]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#bef264]/15 text-[#bef264] border border-[#bef264]/30 shadow-inner">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Dropdown Field-to-Category Mapping Engine
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Live Sync
                </span>
                {customMappingCount > 0 && (
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {customMappingCount} Custom Mapped
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Connect and map any dropdown in every section of the application directly to any Settings Dropdown Category. Changes apply instantly CRM-wide.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#262626] rounded-xl transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Section Bar */}
        <div className="p-4 bg-[#181818] border-b border-[#262626] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Section Picker */}
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={selectedSectionId}
              onChange={e => setSelectedSectionId(e.target.value)}
              className="w-full bg-[#121212] border border-[#333] text-white rounded-lg px-3 py-2 text-xs font-semibold focus:border-[#bef264] outline-none"
            >
              <option value="all">🌟 All Sections &amp; Features ({ALL_DROPDOWN_FIELDS.length} Total Fields)</option>
              {ALL_SECTIONS.map(s => {
                const count = getFieldsForSection(s.sectionId).length;
                return (
                  <option key={s.sectionId} value={s.sectionId}>
                    {s.sectionLabel} ({count} fields)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search field name or category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-xs text-gray-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Reset All Action */}
          <button
            type="button"
            onClick={handleResetAll}
            className="px-3 py-2 rounded-lg bg-[#222] hover:bg-[#2c2c2c] text-gray-300 hover:text-white border border-[#383838] text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
            title="Reset all mappings to default"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset All Defaults</span>
          </button>
        </div>

        {/* Content Body: Mapping Cards */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 divide-y divide-[#202020]">
          {displayedFields.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-xs">
              No dropdown fields match your search query or section selection.
            </div>
          ) : (
            displayedFields.map(field => {
              const currentCategoryKey = dropdownMappings[field.fieldKey] || field.defaultCategoryKey;
              const isCustom = currentCategoryKey !== field.defaultCategoryKey;
              const activeCategory = categoryOptions.find(c => c.key === currentCategoryKey);
              const rawOptions = (dropdowns as any)?.[currentCategoryKey] || [];
              const optionsList: string[] = Array.isArray(rawOptions)
                ? rawOptions.map((x: any) => typeof x === 'string' ? x : x.name || x.model || String(x))
                : [];

              return (
                <div
                  key={field.fieldKey}
                  className="pt-3.5 first:pt-0 bg-[#161616] hover:bg-[#1a1a1a] border border-[#262626] hover:border-[#383838] rounded-xl p-4 transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Left: Field Name & Section */}
                    <div className="space-y-1 max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white flex items-center gap-1.5">
                          {field.fieldLabel}
                        </span>
                        {isCustom ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Custom Mapped
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <span className="font-medium text-[#bef264]">{field.sectionLabel}</span>
                        {field.description && (
                          <>
                            <span>•</span>
                            <span className="text-gray-400 truncate max-w-sm">{field.description}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right: Dropdown Category Selector */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 min-w-[340px]">
                      <div className="flex-1">
                        <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                          Connected Settings Category:
                        </label>
                        <select
                          value={currentCategoryKey}
                          onChange={e => handleCategoryChange(field.fieldKey, e.target.value)}
                          className={`w-full text-xs font-semibold rounded-lg px-3 py-2 outline-none border transition-colors ${
                            isCustom
                              ? 'bg-[#1e1a12] border-amber-500/50 text-amber-200 focus:border-amber-400'
                              : 'bg-[#121212] border-[#333] text-white focus:border-[#bef264]'
                          }`}
                        >
                          {categoryOptions.map(cat => (
                            <option key={cat.key} value={cat.key}>
                              {cat.label} ({cat.count} options)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Reset to Default Button */}
                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => handleResetField(field.fieldKey)}
                          className="self-end px-2.5 py-2 rounded-lg bg-[#222] hover:bg-[#333] text-gray-300 hover:text-white border border-[#444] text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Restore default category for this field"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                          <span>Reset</span>
                        </button>
                      )}

                      {/* Quick Add Option or Open Settings */}
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenSettingsCategory) {
                            onOpenSettingsCategory(currentCategoryKey);
                            onClose();
                          } else {
                            setQuickAddCategory(quickAddCategory === currentCategoryKey ? null : currentCategoryKey);
                          }
                        }}
                        className="self-end px-3 py-2 rounded-lg bg-[#1f2937] hover:bg-[#374151] text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="Manage options in Settings"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Settings</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Add Input Bar (Collapsible) */}
                  {quickAddCategory === currentCategoryKey && (
                    <div className="mt-3 p-2.5 rounded-lg bg-[#1a1a1a] border border-cyan-500/30 flex items-center gap-2">
                      <span className="text-xs text-gray-300 font-medium whitespace-nowrap">
                        Add option to <strong className="text-cyan-300">{activeCategory?.label}</strong>:
                      </span>
                      <input
                        type="text"
                        placeholder="New option value..."
                        value={quickAddValue}
                        onChange={e => setQuickAddValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleQuickAdd(currentCategoryKey);
                        }}
                        className="flex-1 px-3 py-1.5 bg-[#121212] border border-[#333] rounded text-xs text-white focus:border-[#bef264] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(currentCategoryKey)}
                        className="px-3 py-1.5 rounded bg-[#bef264] hover:bg-[#a3e635] text-slate-950 text-xs font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  )}

                  {/* Active Options Preview Chips */}
                  <div className="mt-3 pt-2.5 border-t border-[#222] flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-mono text-gray-500 uppercase mr-1">
                      Live Options ({optionsList.length}):
                    </span>
                    {optionsList.length === 0 ? (
                      <span className="text-[11px] text-gray-600 italic">No options defined in this category</span>
                    ) : (
                      <>
                        {optionsList.slice(0, 6).map((opt, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-[#202020] border border-[#303030] text-gray-300 truncate max-w-[200px]"
                          >
                            {opt}
                          </span>
                        ))}
                        {optionsList.length > 6 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#252525] text-gray-400 font-mono">
                            +{optionsList.length - 6} more
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#262626] bg-[#161616] flex items-center justify-between">
          <div className="text-xs text-gray-400">
            <span className="text-white font-semibold">{displayedFields.length}</span> fields displayed • Mappings auto-saved in your session &amp; persistent across reloads.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#bef264] hover:bg-[#a3e635] text-slate-950 text-xs font-bold transition-colors shadow-sm"
          >
            Done &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};
