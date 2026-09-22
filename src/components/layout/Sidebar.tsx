import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  Flame,
  FolderKanban,
  LifeBuoy,
  Gift,
  Wrench,
  HardHat,
  Package,
  FileSpreadsheet,
  BadgeDollarSign,
  UserCheck,
  Cpu,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  Zap,
  Edit3,
  ShieldCheck,
  LogOut
} from 'lucide-react';

export type NavSection =
  | 'dashboard'
  | 'contacts'
  | 'companies'
  | 'leads'
  | 'projects'
  | 'tickets'
  | 'referrals'
  | 'maintenance'
  | 'subcontractors'
  | 'sales-orders'
  | 'install-orders'
  | 'pl-statement'
  | 'hrms'
  | 'integrations'
  | 'company-profile'
  | 'settings';

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenProfile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  isMobileOpen = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
  onOpenProfile
}) => {
  const {
    currentUser,
    logout,
    leads,
    projects,
    tickets,
    referralBonuses,
    maintenanceRecords,
    installOrders,
    systemFeatures,
    isFeatureEnabled,
    hasPermission,
    themeMode
  } = useApp();

  const isLight = themeMode === 'corporate-slate';

  const newLeadsCount = (leads || []).filter(l => l?.status === 'New').length;
  const activeProjectsCount = (projects || []).filter(p => p?.status !== 'Completed').length;
  const pendingTicketsCount = (tickets || []).filter(t => t?.status === 'New' || t?.status === 'In Progress').length;
  const pendingReferralsCount = (referralBonuses || []).filter(
    r => r && r.paymentStatus !== 'Paid via EFT' && r.paymentStatus !== 'Rejected'
  ).length;
  const overdueMaintCount = (maintenanceRecords || []).filter(m => m?.status === 'Overdue').length;
  const pendingQuotesCount = (installOrders || []).filter(io => io?.status === 'Quotes Received').length;

  const ICON_MAP: Record<string, any> = {
    dashboard: LayoutDashboard,
    contacts: Users,
    companies: Building2,
    leads: Flame,
    projects: FolderKanban,
    tickets: LifeBuoy,
    referrals: Gift,
    maintenance: Wrench,
    subcontractors: HardHat,
    'sales-orders': Package,
    'install-orders': FileSpreadsheet,
    'pl-statement': BadgeDollarSign,
    hrms: UserCheck,
    integrations: Cpu,
    'company-profile': Building2,
    settings: Settings
  };

  const navItems = systemFeatures
    .filter(feat => feat.showInSidebar !== false)
    .filter(feat => isFeatureEnabled(feat.id))
    .filter(feat => hasPermission(feat.id, 'view'))
    .map(feat => {
      let badge: number | string | undefined = undefined;
      let badgeColor: string | undefined = undefined;

      if (feat.id === 'leads' && newLeadsCount > 0) {
        badge = newLeadsCount;
        badgeColor = isLight ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
      } else if (feat.id === 'projects' && activeProjectsCount > 0) {
        badge = activeProjectsCount;
        badgeColor = isLight ? 'bg-blue-100 text-blue-900 border border-blue-300' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
      } else if (feat.id === 'tickets' && pendingTicketsCount > 0) {
        badge = pendingTicketsCount;
        badgeColor = isLight ? 'bg-rose-100 text-rose-900 border border-rose-300' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
      } else if (feat.id === 'referrals' && pendingReferralsCount > 0) {
        badge = pendingReferralsCount;
        badgeColor = isLight ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      } else if (feat.id === 'maintenance' && overdueMaintCount > 0) {
        badge = `${overdueMaintCount} Due`;
        badgeColor = isLight ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
      } else if (feat.id === 'install-orders' && pendingQuotesCount > 0) {
        badge = pendingQuotesCount;
        badgeColor = isLight ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      } else if (feat.badgeText) {
        badge = feat.badgeText;
        badgeColor = isLight ? 'bg-slate-100 text-slate-800 border border-slate-300' : 'bg-slate-800 text-slate-300 border border-slate-700';
      }

      return {
        id: feat.id as NavSection,
        label: feat.name,
        icon: ICON_MAP[feat.id] || LayoutDashboard,
        badge,
        badgeColor
      };
    });

  const userInitials = (currentUser?.name || 'Akash Mohite')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleItemClick = (sectionId: NavSection) => {
    onSelectSection(sectionId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer / Modern Sleek Fixed Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col shrink-0 select-none transition-all duration-200 ease-in-out border-r
          lg:static lg:h-[calc(100vh-4rem)] lg:translate-x-0
          ${isLight ? 'bg-white/95 backdrop-blur-md border-slate-200/90 text-slate-700' : 'bg-slate-950/95 backdrop-blur-md border-slate-800/80 text-slate-300'}
          ${isMobileOpen ? 'translate-x-0 shadow-soft-lg' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-16' : 'w-72 max-w-[85vw] lg:w-64'}
        `}
      >
        {/* Navigation Header / Branding Strip & Collapse toggle */}
        <div className={`p-3 border-b flex items-center justify-between ${isLight ? 'border-slate-100' : 'border-slate-800/80'}`}>
          <div className={`flex items-center gap-2 ${isCollapsed ? 'lg:hidden' : ''}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className={`text-[10px] font-bold uppercase tracking-wider truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Enterprise Operations
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Mobile Close Button (< lg) */}
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className={`lg:hidden p-1.5 rounded-lg border transition-colors ${
                  isLight
                    ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800'
                }`}
                aria-label="Close navigation menu"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Desktop Chevron Collapse/Expand (< lg hidden) */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className={`hidden lg:flex p-1 rounded-md transition-colors ${
                  isLight
                    ? 'text-slate-400 hover:text-amber-600 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                }`}
                aria-label={isCollapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto py-2.5 px-2.5 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center rounded-lg transition-all text-xs font-semibold group relative
                  ${isCollapsed ? 'lg:justify-center lg:px-0 lg:py-2.5 px-3 py-2.5' : 'justify-between px-3 py-2'}
                  ${
                    isActive
                      ? isLight
                        ? 'bg-amber-100/90 text-amber-950 shadow-soft-xs font-bold border border-amber-300/80'
                        : 'bg-slate-900 text-amber-400 shadow-soft-xs font-bold border border-slate-800'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                  }
                `}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                      isActive
                        ? isLight
                          ? 'text-amber-700'
                          : 'text-amber-400'
                        : isLight
                        ? 'text-slate-400 group-hover:text-slate-700'
                        : 'text-slate-500 group-hover:text-amber-400'
                    }`}
                  />
                  <span
                    className={`truncate text-left font-bold ${
                      isActive
                        ? isLight
                          ? 'text-amber-950'
                          : 'text-amber-400'
                        : isLight
                        ? 'text-slate-600 group-hover:text-slate-900'
                        : 'text-slate-400 group-hover:text-slate-100'
                    } ${isCollapsed ? 'lg:hidden' : ''}`}
                  >
                    {item.label}
                  </span>
                </div>

                {/* Badge Handling */}
                {item.badge && (
                  isCollapsed ? (
                    <span
                      className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900"
                      title={`${item.label}: ${item.badge}`}
                    />
                  ) : (
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? isLight
                            ? 'bg-amber-200 text-amber-900 border border-amber-300'
                            : 'bg-slate-800 text-amber-300 border border-slate-700'
                          : item.badgeColor || (isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-800 text-slate-300')
                      }`}
                    >
                      {item.badge}
                    </span>
                  )
                )}
              </button>
            );
          })}
        </div>

        {/* Middle Clean Energy Status Widget (hidden when collapsed) */}
        {!isCollapsed && (
          <div className={`p-3 mx-2.5 mb-2.5 rounded-xl border text-[11px] shrink-0 transition-colors ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-600 shadow-soft-xs'
              : 'bg-slate-900/90 border-slate-800 text-slate-300'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>BridgeSelect STC:</span>
              <span className={`font-mono font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                $38.20 AUD
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={`font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>CEC Retailer:</span>
              <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified</span>
              </span>
            </div>
          </div>
        )}

        {/* User Profile Footer */}
        <div
          onClick={onOpenProfile}
          className={`p-3 border-t shrink-0 cursor-pointer transition-colors group ${
            isLight
              ? 'border-slate-100 bg-white hover:bg-slate-50'
              : 'border-slate-800/80 bg-slate-950 hover:bg-slate-900'
          } ${isCollapsed ? 'flex justify-center' : ''}`}
          title="Click to manage your individual profile & credentials"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-emerald-500 flex items-center justify-center text-slate-950 font-bold text-xs shrink-0 shadow-soft-xs"
                title={`${currentUser?.name || 'Akash Mohite'} (${currentUser?.role || 'Administrator'})`}
              >
                {userInitials}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate transition-colors ${
                    isLight
                      ? 'text-slate-900 group-hover:text-amber-600'
                      : 'text-slate-100 group-hover:text-amber-400'
                  }`}>
                    {currentUser?.name || 'Akash Mohite'}
                  </p>
                  <p className={`text-[10px] truncate capitalize ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {currentUser?.role || 'Administrator'} &bull; {currentUser?.department || 'Management'}
                  </p>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenProfile?.();
                  }}
                  className={`p-1 rounded-md transition-colors ${
                    isLight ? 'hover:bg-slate-200 text-slate-400 hover:text-slate-700' : 'hover:bg-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                  title="Manage Profile"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    logout();
                  }}
                  className={`p-1 rounded-md transition-colors ${
                    isLight ? 'hover:bg-rose-100 text-rose-500 hover:text-rose-700' : 'hover:bg-rose-950/50 text-rose-400 hover:text-rose-300'
                  }`}
                  title="Log Out of Session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
