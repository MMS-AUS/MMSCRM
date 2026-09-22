import React from 'react';
import { Kanban, Table, LayoutGrid } from 'lucide-react';
import { ViewMode } from '../../types';
import { useApp } from '../../context/AppContext';

interface ViewModeSwitcherProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  labels?: {
    pipeline?: string;
    table?: string;
    grid?: string;
  };
}

export const ViewModeSwitcher: React.FC<ViewModeSwitcherProps> = ({
  currentMode,
  onModeChange,
  labels = { pipeline: 'Pipeline', table: 'Table', grid: 'Grid' }
}) => {
  const { themeMode } = useApp();
  const isLight = themeMode === 'corporate-slate';

  const getButtonClass = (mode: ViewMode) => {
    const isSelected = currentMode === mode;
    if (isSelected) {
      return isLight
        ? 'bg-amber-100 text-amber-950 border border-amber-300 shadow-xs font-bold'
        : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-xs font-bold';
    }
    return isLight
      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
      : 'text-gray-400 hover:text-white hover:bg-[#202020] border border-transparent';
  };

  return (
    <div
      className={`flex items-center p-0.5 rounded-lg border shadow-xs transition-colors ${
        isLight
          ? 'bg-white border-slate-200'
          : 'bg-[#161616] border-[#2d2d2d]'
      }`}
    >
      <button
        type="button"
        onClick={() => onModeChange('pipeline')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${getButtonClass(
          'pipeline'
        )}`}
        title={`View as ${labels.pipeline || 'Pipeline'} (Saved as default)`}
      >
        <Kanban className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{labels.pipeline || 'Pipeline'}</span>
      </button>

      <button
        type="button"
        onClick={() => onModeChange('table')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${getButtonClass(
          'table'
        )}`}
        title={`View as ${labels.table || 'Table'} (Saved as default)`}
      >
        <Table className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{labels.table || 'Table'}</span>
      </button>

      <button
        type="button"
        onClick={() => onModeChange('grid')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${getButtonClass(
          'grid'
        )}`}
        title={`View as ${labels.grid || 'Grid'} (Saved as default)`}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{labels.grid || 'Grid'}</span>
      </button>
    </div>
  );
};
