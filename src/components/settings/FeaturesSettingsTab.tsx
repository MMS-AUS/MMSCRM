import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SystemFeatureConfig } from '../../types';
import {
  ToggleLeft,
  ToggleRight,
  Edit2,
  Search,
  Filter,
  RotateCcw,
  CheckCircle2,
  X,
  Sliders,
  Layers,
  Eye,
  EyeOff,
  Sparkles,
  Save
} from 'lucide-react';

export const FeaturesSettingsTab: React.FC = () => {
  const {
    systemFeatures,
    updateSystemFeature,
    toggleSystemFeature,
    resetSystemFeatures
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [editingFeature, setEditingFeature] = useState<SystemFeatureConfig | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Edit modal state
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState<SystemFeatureConfig['category']>('crm');
  const [editShowSidebar, setEditShowSidebar] = useState(true);
  const [editBadgeText, setEditBadgeText] = useState('');

  const categories = [
    { id: 'All', label: 'All Modules' },
    { id: 'crm', label: 'Core CRM & Leads' },
    { id: 'operations', label: 'Operations & Field' },
    { id: 'supply_chain', label: 'Supply Chain & RFQs' },
    { id: 'finance', label: 'Finance & HR' },
    { id: 'communication', label: 'Communications & VoIP' },
    { id: 'portals', label: 'Portals & Branding' }
  ];

  const filteredFeatures = systemFeatures.filter(f => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || f.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalCount = systemFeatures.length;
  const enabledCount = systemFeatures.filter(f => f.enabled).length;
  const disabledCount = totalCount - enabledCount;

  const handleOpenEdit = (feat: SystemFeatureConfig) => {
    setEditingFeature(feat);
    setEditName(feat.name);
    setEditDesc(feat.description);
    setEditCategory(feat.category);
    setEditShowSidebar(feat.showInSidebar);
    setEditBadgeText(feat.badgeText || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFeature) return;

    updateSystemFeature(editingFeature.id, {
      name: editName.trim(),
      description: editDesc.trim(),
      category: editCategory,
      showInSidebar: editShowSidebar,
      badgeText: editBadgeText.trim() ? editBadgeText.trim() : undefined
    });

    setFeedback(`Updated settings for "${editName.trim()}".`);
    setEditingFeature(null);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleToggle = (id: string, name: string, currentStatus: boolean) => {
    toggleSystemFeature(id);
    setFeedback(`Feature "${name}" is now ${!currentStatus ? 'enabled' : 'disabled'}.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleReset = () => {
    if (window.confirm('Reset all feature toggles and labels back to factory defaults?')) {
      resetSystemFeatures();
      setFeedback('All system features reset to default configuration.');
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Metrics Bar */}
      <div className="bg-[#141414] p-4 rounded-xl border border-[#262626] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#bef264]" />
            <h3 className="text-sm font-bold text-white">Dynamic Feature &amp; Functionality Manager</h3>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Globally enable or disable modules, customize navigation labels, and manage system capability switches
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Metrics */}
          <div className="flex items-center gap-3 px-3 py-1.5 bg-[#1a1a1a] rounded-lg border border-[#2d2d2d] text-xs">
            <span className="text-gray-400">
              Active: <strong className="text-emerald-400">{enabledCount}</strong>
            </span>
            <span className="text-gray-600">&bull;</span>
            <span className="text-gray-400">
              Disabled: <strong className="text-rose-400">{disabledCount}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e1e1e] hover:bg-[#262626] text-xs font-semibold text-gray-300 hover:text-white border border-[#2d2d2d] transition-all"
            title="Reset all features to original defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-[#bef264] text-black shadow-xs'
                  : 'bg-[#141414] text-gray-400 hover:text-white hover:bg-[#1f1f1f] border border-[#262626]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search features..."
            className="w-full bg-[#141414] border border-[#262626] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none"
          />
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredFeatures.map(feat => {
          const isEnabled = feat.enabled;
          return (
            <div
              key={feat.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                isEnabled
                  ? 'bg-[#141414] border-[#262626] hover:border-[#383838]'
                  : 'bg-[#101010] border-[#1f1f1f] opacity-75'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isEnabled ? 'bg-[#bef264]' : 'bg-gray-600'
                      }`}
                    />
                    <h4 className="text-xs font-bold text-white tracking-tight">{feat.name}</h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggle(feat.id, feat.name, isEnabled)}
                    className="shrink-0 transition-transform active:scale-95"
                    title={isEnabled ? 'Disable Feature' : 'Enable Feature'}
                  >
                    {isEnabled ? (
                      <ToggleRight className="w-6 h-6 text-[#bef264]" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-gray-600" />
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-gray-400 line-clamp-2 mb-3 leading-relaxed">
                  {feat.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[#202020] flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#1c1c1c] text-gray-400 font-mono text-[10px] uppercase border border-[#2d2d2d]">
                    {feat.category}
                  </span>
                  {feat.showInSidebar ? (
                    <span className="flex items-center gap-1 text-emerald-400 text-[10px]" title="Visible in Sidebar">
                      <Eye className="w-3 h-3" />
                      <span>Sidebar</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-500 text-[10px]" title="Hidden from Sidebar">
                      <EyeOff className="w-3 h-3" />
                      <span>Hidden</span>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(feat)}
                  className="flex items-center gap-1 text-gray-400 hover:text-white px-2 py-1 rounded bg-[#1e1e1e] hover:bg-[#282828] transition-colors"
                  title="Customize module parameters"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Configure</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredFeatures.length === 0 && (
        <div className="p-8 text-center bg-[#141414] rounded-xl border border-[#262626]">
          <Layers className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-xs text-gray-400 font-medium">No features match your query.</p>
        </div>
      )}

      {/* Edit Feature Modal */}
      {editingFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-[#141414] border border-[#2d2d2d] rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#bef264]" />
                <h3 className="font-bold text-sm text-white">
                  Configure System Feature: <span className="font-mono text-[#bef264]">{editingFeature.id}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingFeature(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Display Name (Sidebar &amp; Navigation)
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="e.g. Leads (Meta Ads)"
                  className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white focus:border-[#bef264] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Feature Description
                </label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  placeholder="Describe module functionality and operations..."
                  className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white focus:border-[#bef264] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Functional Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value as any)}
                    className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-2.5 py-2 text-xs text-white focus:border-[#bef264] outline-none"
                  >
                    <option value="crm">Core CRM</option>
                    <option value="operations">Operations &amp; Field</option>
                    <option value="supply_chain">Supply Chain</option>
                    <option value="finance">Finance &amp; HR</option>
                    <option value="communication">Communications</option>
                    <option value="portals">Portals &amp; Branding</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Custom Badge Indicator
                  </label>
                  <input
                    type="text"
                    value={editBadgeText}
                    onChange={e => setEditBadgeText(e.target.value)}
                    placeholder="e.g. Live, 12, New"
                    className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white focus:border-[#bef264] outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#181818] rounded-xl border border-[#262626] flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">Show in Left Sidebar</span>
                  <span className="text-[11px] text-gray-400">Toggle whether this module appears in the main navigation menu</span>
                </div>
                <input
                  type="checkbox"
                  checked={editShowSidebar}
                  onChange={e => setEditShowSidebar(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#bef264] cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setEditingFeature(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold rounded-lg transition-colors shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
