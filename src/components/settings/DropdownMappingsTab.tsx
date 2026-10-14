import React, { useState, useMemo } from 'react';
import {
  SlidersHorizontal,
  Search,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Layers,
  Filter,
  Check,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  ALL_SECTIONS,
  ALL_DROPDOWN_FIELDS,
  getFieldsForSection,
  DEFAULT_DROPDOWN_MAPPINGS
} from '../../utils/dropdownMappingConfig';

interface DropdownMappingsTabProps {
  onJumpToCategory?: (categoryKey: string) => void;
}

export const DropdownMappingsTab: React.FC<DropdownMappingsTabProps> = ({
  onJumpToCategory
}) => {
  const {
    dropdowns,
    dropdownConfigs,
    dropdownMappings,
    updateDropdownMapping,
    resetDropdownMappings,
    openMappingModal
  } = useApp();

  const [selectedSectionId, setSelectedSectionId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

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

  const filteredFields = useMemo(() => {
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

  const customMappingCount = useMemo(() => {
    return Object.entries(dropdownMappings).filter(([k, v]) => {
      return DEFAULT_DROPDOWN_MAPPINGS[k] && DEFAULT_DROPDOWN_MAPPINGS[k] !== v;
    }).length;
  }, [dropdownMappings]);

  const handleCategoryChange = (fieldKey: string, newCategoryKey: string) => {
    updateDropdownMapping(fieldKey, newCategoryKey);
    const field = ALL_DROPDOWN_FIELDS.find(f => f.fieldKey === fieldKey);
    const cat = categoryOptions.find(c => c.key === newCategoryKey);
    showFeedback(`Mapped "${field?.fieldLabel || fieldKey}" to "${cat?.label || newCategoryKey}"`);
  };

  const handleResetSingle = (fieldKey: string) => {
    const defaultCat = DEFAULT_DROPDOWN_MAPPINGS[fieldKey];
    if (defaultCat) {
      updateDropdownMapping(fieldKey, defaultCat);
      showFeedback(`Reset "${fieldKey}" to default category.`);
    }
  };

  const handleResetAll = () => {
    if (window.confirm('Reset all field mappings back to system defaults?')) {
      resetDropdownMappings();
      showFeedback('All field mappings have been reset to system defaults.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {feedback && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-medium flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-white font-bold px-1 cursor-pointer">✕</button>
        </div>
      )}

      {/* Main Banner */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">Dropdown Field-to-Category Mappings Engine</h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Connect and map every dropdown across all sections of the application to any Settings category. Changes take effect instantly across all ERP screens.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-gray-400">
            <span className="text-white font-semibold">{ALL_DROPDOWN_FIELDS.length} Total Configurable Fields</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">{ALL_SECTIONS.length} Application Sections</span>
            <span>•</span>
            <span className={customMappingCount > 0 ? 'text-[#bef264] font-semibold' : 'text-gray-500'}>
              {customMappingCount} Custom Re-mappings Active
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {customMappingCount > 0 && (
            <button
              type="button"
              onClick={handleResetAll}
              className="px-3 py-2 rounded-lg bg-[#1c1c1c] hover:bg-rose-950/40 text-gray-300 hover:text-rose-300 border border-[#2e2e2e] hover:border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Reset all mappings to defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All ({customMappingCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => openMappingModal(selectedSectionId === 'all' ? undefined : selectedSectionId)}
            className="px-4 py-2 rounded-lg bg-[#bef264] hover:bg-[#a3e635] text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Launch Mapping Modal</span>
          </button>
        </div>
      </div>

      {/* Section Filter Pills & Search */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Filter by Application Section
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search field or section..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#141414] border border-[#2b2b2b] rounded-lg text-xs text-white placeholder-gray-500 outline-none focus:border-[#bef264]"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pb-1">
          <button
            type="button"
            onClick={() => setSelectedSectionId('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedSectionId === 'all'
                ? 'bg-[#bef264] text-slate-950 shadow-xs font-bold'
                : 'bg-[#181818] text-gray-400 hover:text-white border border-[#2b2b2b]'
            }`}
          >
            All Sections ({ALL_DROPDOWN_FIELDS.length})
          </button>
          {ALL_SECTIONS.map(sec => {
            const isSelected = selectedSectionId === sec.sectionId;
            const count = getFieldsForSection(sec.sectionId).length;
            return (
              <button
                key={sec.sectionId}
                type="button"
                onClick={() => setSelectedSectionId(sec.sectionId)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#bef264] text-slate-950 shadow-xs font-bold'
                    : 'bg-[#181818] text-gray-400 hover:text-white border border-[#2b2b2b]'
                }`}
              >
                <span>{sec.sectionLabel.split(' - ')[0]}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-black/20 text-slate-950 font-bold' : 'bg-[#242424] text-gray-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fields Mapping Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFields.map(field => {
          const currentCatKey = dropdownMappings[field.fieldKey] || field.defaultCategoryKey;
          const isCustom = currentCatKey !== field.defaultCategoryKey;
          const currentCat = categoryOptions.find(c => c.key === currentCatKey);
          const rawOptions = (dropdowns as any)?.[currentCatKey];
          const optionsList: string[] = Array.isArray(rawOptions)
            ? rawOptions.map((x: any) => typeof x === 'string' ? x : x.name || x.model || String(x))
            : [];

          return (
            <div
              key={field.fieldKey}
              className={`p-4 rounded-xl border transition-all ${
                isCustom
                  ? 'bg-[#17201a] border-emerald-500/40 shadow-xs'
                  : 'bg-[#141414] border-[#262626] hover:border-[#383838]'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-sm text-white">
                      {field.fieldLabel}
                    </h4>
                    {isCustom ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                        Custom Mapped
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#202020] text-gray-400 border border-[#2f2f2f]">
                        Default
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-400 block mt-0.5">
                    {field.sectionLabel}
                  </span>
                </div>

                {isCustom && (
                  <button
                    type="button"
                    onClick={() => handleResetSingle(field.fieldKey)}
                    className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#202020] transition-colors shrink-0 cursor-pointer"
                    title="Reset to default category"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {field.description && (
                <p className="text-[11px] text-gray-400 mb-3">
                  {field.description}
                </p>
              )}

              {/* Category Selector */}
              <div className="space-y-1.5 pt-1 border-t border-[#222]">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-[11px] font-semibold text-gray-400">
                    Connected Settings Category:
                  </label>
                  <span className="text-[10px] font-mono text-cyan-400">
                    {optionsList.length} options available
                  </span>
                </div>

                <select
                  value={currentCatKey}
                  onChange={e => handleCategoryChange(field.fieldKey, e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-semibold outline-none transition-colors cursor-pointer ${
                    isCustom
                      ? 'bg-[#111f16] border border-emerald-500/50 text-white focus:border-[#bef264]'
                      : 'bg-[#181818] border border-[#333] text-white focus:border-[#bef264]'
                  }`}
                >
                  {categoryOptions.map(cat => (
                    <option key={cat.key} value={cat.key}>
                      {cat.label} ({cat.count} options)
                    </option>
                  ))}
                </select>
              </div>

              {/* Options Preview Pills */}
              <div className="mt-3 pt-2.5 border-t border-[#222] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-hidden text-[10px]">
                  <span className="text-gray-500 shrink-0">Values:</span>
                  <div className="flex items-center gap-1 overflow-hidden">
                    {optionsList.slice(0, 3).map((val, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 rounded bg-[#202020] text-gray-300 font-mono truncate max-w-[120px]"
                        title={val}
                      >
                        {val}
                      </span>
                    ))}
                    {optionsList.length > 3 && (
                      <span className="text-gray-500 font-mono text-[9px] shrink-0">
                        +{optionsList.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {onJumpToCategory && (
                  <button
                    type="button"
                    onClick={() => onJumpToCategory(currentCatKey)}
                    className="text-[11px] font-semibold text-[#bef264] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                    title={`Edit options in "${currentCat?.label}"`}
                  >
                    <span>Manage</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredFields.length === 0 && (
        <div className="py-12 text-center text-gray-500 bg-[#141414] border border-[#262626] rounded-xl">
          <p className="text-sm font-semibold">No fields found matching &quot;{searchQuery}&quot;</p>
          <p className="text-xs text-gray-600 mt-1">Try clearing your search query or selecting &quot;All Sections&quot;.</p>
        </div>
      )}
    </div>
  );
};
