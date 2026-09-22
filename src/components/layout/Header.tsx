import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import {
  Phone,
  MessageSquare,
  RefreshCw,
  Bell,
  ChevronDown,
  User,
  Shield,
  Briefcase,
  Wrench,
  Sun,
  Moon,
  Menu,
  PanelLeftClose,
  Globe,
  Copy,
  Check,
  Sparkles,
  LogOut
} from 'lucide-react';
import { MetaAdsSyncModal } from '../modals/MetaAdsSyncModal';
import { CompanyLogo } from '../common/CompanyLogo';
import { NotificationsPopover } from '../common/NotificationsPopover';
import { NavSection } from './Sidebar';
import { getPortalProductionUrl } from '../../utils/portalUrls';

interface HeaderProps {
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
  onToggleDesktopSidebar?: () => void;
  isDesktopSidebarCollapsed?: boolean;
  onNavigate?: (section: NavSection) => void;
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileSidebar,
  isMobileSidebarOpen = false,
  onToggleDesktopSidebar,
  isDesktopSidebarCollapsed = false,
  onNavigate,
  onOpenProfile
}) => {
  const {
    currentUser,
    activeRole,
    setActiveRole,
    logout,
    companyProfile,
    unreadNotificationsCount,
    setIsVoipDialerOpen,
    setIsQuickSmsOpen,
    dynamicRoles,
    portalAddresses,
    themeMode,
    setThemeMode
  } = useApp();

  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isMetaSheetModalOpen, setIsMetaSheetModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [copiedRoleKey, setCopiedRoleKey] = useState<string | null>(null);

  const isLight = themeMode === 'corporate-slate';

  const ROLE_ICONS: Record<string, any> = {
    admin: Shield,
    manager: Briefcase,
    employee: User,
    customer: Sun,
    installer: Wrench
  };

  const roleOptions = dynamicRoles.map(dr => ({
    role: dr.role,
    label: dr.roleName,
    desc: dr.description,
    portalTarget: dr.portalTarget,
    icon: ROLE_ICONS[dr.role] || (dr.portalTarget === 'customer_portal' ? Sun : dr.portalTarget === 'installer_portal' ? Wrench : Shield)
  }));

  const handleRoleSelect = (role: UserRole) => {
    setActiveRole(role);
    setIsRoleMenuOpen(false);
  };

  const userInitials = (currentUser?.name || 'Akash Mohite')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <header
        className={`h-16 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors duration-200 border-b ${
          isLight
            ? 'bg-white/90 backdrop-blur-md border-slate-200/90 text-slate-900 shadow-soft-xs'
            : 'bg-slate-950/90 backdrop-blur-md border-slate-800/80 text-slate-100'
        }`}
      >
        {/* Left branding and toggles */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Hamburger Menu Toggle (< lg) */}
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className={`lg:hidden p-2 rounded-lg border transition-colors shrink-0 ${
                isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800'
              }`}
              aria-label="Toggle navigation drawer"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Desktop Sidebar Width Toggle (>= lg) */}
          {onToggleDesktopSidebar && (
            <button
              type="button"
              onClick={onToggleDesktopSidebar}
              className={`hidden lg:flex p-1.5 rounded-lg border transition-colors shrink-0 ${
                isLight
                  ? 'text-slate-600 hover:text-amber-600 hover:bg-slate-100 border-slate-200'
                  : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800 border-slate-800'
              }`}
              aria-label="Toggle sidebar collapse"
              title={isDesktopSidebarCollapsed ? 'Expand sidebar (256px)' : 'Collapse to compact rail (64px)'}
            >
              <PanelLeftClose
                className={`w-4 h-4 transition-transform ${isDesktopSidebarCollapsed ? 'rotate-180 text-amber-500' : ''}`}
              />
            </button>
          )}

          {/* Company Dynamic Logo (Header section post-login) */}
          <CompanyLogo profile={companyProfile} size="md" variant="header" />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className={`font-bold text-base sm:text-lg tracking-tight truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {companyProfile?.companyName || 'My Solar CRM'}
              </span>
              <span className={`hidden xs:inline-flex items-center gap-1 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full shrink-0 border ${
                isLight
                  ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}>
                <Sparkles className="w-2.5 h-2.5" />
                <span>AU Solar ERP</span>
              </span>
            </div>
            <div className={`hidden sm:flex items-center gap-1.5 text-[11px] font-medium truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate">NSW, QLD &amp; VIC Grid Certified &bull; CER BridgeSelect Sync</span>
            </div>
          </div>
        </div>

        {/* Center/Right Toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Assigned Australian Virtual Line */}
          <div className={`hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-700'
              : 'bg-slate-900/80 border-slate-800 text-slate-300'
          }`}>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className={`font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>AU Line:</span>
            <span className={`font-mono font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {currentUser.voipLineNumber || '+61 2 8311 4920'}
            </span>
          </div>

          {/* VoIPLine Click-to-call Trigger */}
          <button
            type="button"
            onClick={() => setIsVoipDialerOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isLight
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 shadow-soft-xs'
                : 'bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-400 border-emerald-800/50'
            }`}
            title="Open VoIPLine Telecom Dialer"
          >
            <Phone className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden md:inline">VoIP Line</span>
          </button>

          {/* MessageMedia 2-Way SMS Trigger */}
          <button
            type="button"
            onClick={() => setIsQuickSmsOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isLight
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200 shadow-soft-xs'
                : 'bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 border-amber-800/50'
            }`}
            title="MessageMedia Two-way SMS"
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden md:inline">SMS Hub</span>
          </button>

          {/* Meta Ads Sheet Sync button */}
          <button
            type="button"
            onClick={() => setIsMetaSheetModalOpen(true)}
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              isLight
                ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
            title="Meta Ads Real-time Google Sheet Sync"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
            <span>Meta Sheet</span>
          </button>

          {/* Corporate Slate vs Obsidian Dark Theme Toggle */}
          <button
            type="button"
            onClick={() => setThemeMode(isLight ? 'obsidian' : 'corporate-slate')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300/80'
                : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-800'
            }`}
            title={`Switch to ${isLight ? 'Obsidian Charcoal Dark' : 'Corporate Executive Slate & White'}`}
          >
            {isLight ? (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-700" />
                <span className="hidden xl:inline text-[11px]">Dark Theme</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xl:inline text-[11px]">Slate &amp; White</span>
              </>
            )}
          </button>

          {/* Working Notification Bell Icon with Interactive Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={`p-2 rounded-lg border transition-colors relative ${
                isNotificationsOpen
                  ? isLight
                    ? 'bg-slate-200 text-slate-900 border-slate-300'
                    : 'bg-slate-800 text-white border-slate-700'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800'
              }`}
              title={`${unreadNotificationsCount} unread system notification${
                unreadNotificationsCount === 1 ? '' : 's'
              }`}
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            <NotificationsPopover
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
              onNavigate={onNavigate}
            />
          </div>

          <div className={`h-6 w-px mx-0.5 sm:mx-1 hidden sm:block ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />

          {/* Logged in User Profile Trigger Button */}
          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              className={`flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-lg border transition-all ${
                isLight
                  ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-soft-xs'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
              }`}
              title="View and manage individual user profile"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 to-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0 shadow-soft-xs">
                {userInitials}
              </div>
              <div className="hidden lg:block text-left">
                <span className={`text-xs font-semibold block truncate max-w-[105px] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {currentUser?.name || 'Akash Mohite'}
                </span>
                <span className={`text-[10px] block -mt-0.5 capitalize ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {currentUser?.role || 'admin'}
                </span>
              </div>
            </button>
          )}

          {/* Quick Log Out Button */}
          <button
            type="button"
            onClick={logout}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isLight
                ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700 shadow-soft-xs'
                : 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/60 text-rose-300'
            }`}
            title="Log Out of Session"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="hidden sm:inline">Log Out</span>
          </button>

          {/* Role / Portal Switcher Dropdown with Soft Solar Gold motif */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold transition-all shadow-soft-xs hover:shadow-solar-soft"
              title="Switch portal perspective"
            >
              <Shield className="w-3.5 h-3.5 text-slate-950 shrink-0" />
              <span className="capitalize hidden sm:inline">{activeRole} View</span>
              <span className="capitalize sm:hidden text-[11px]">{activeRole}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform shrink-0 ${
                  isRoleMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isRoleMenuOpen && (
              <div
                className={`absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-xl shadow-soft-lg border p-2 z-50 animate-in fade-in slide-in-from-top-2 ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-800'
                    : 'bg-slate-900 border-slate-800 text-slate-200'
                }`}
              >
                <div className={`px-3 py-2 border-b mb-1 ${isLight ? 'border-slate-100' : 'border-slate-800'}`}>
                  <p className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Switch System Portal
                  </p>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Simulate role-based access control &amp; views
                  </p>
                </div>
                <div className="space-y-1">
                  {roleOptions.map(opt => {
                    const Icon = opt.icon;
                    const isSelected = activeRole === opt.role;
                    const isCustomer = opt.role === 'customer';
                    const isInstaller = opt.role === 'installer';
                    const portalConfig = isCustomer
                      ? portalAddresses?.customerPortal
                      : isInstaller
                      ? portalAddresses?.installerPortal
                      : null;
                    const portalUrl = portalConfig ? getPortalProductionUrl(portalConfig) : null;

                    return (
                      <div
                        key={opt.role}
                        className={`w-full text-left p-2.5 rounded-lg flex items-start gap-2.5 transition-colors group ${
                          isSelected
                            ? isLight
                              ? 'bg-amber-50 text-amber-900 border border-amber-200/80 font-medium'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium'
                            : isLight
                            ? 'hover:bg-slate-100 text-slate-700'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleRoleSelect(opt.role)}
                          className="flex items-start gap-2.5 flex-1 min-w-0 text-left"
                        >
                          <div
                            className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                              isSelected
                                ? 'bg-amber-500 text-slate-950 font-bold'
                                : isLight
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p
                                className={`text-xs font-bold leading-tight ${
                                  isSelected ? (isLight ? 'text-amber-900' : 'text-amber-300') : (isLight ? 'text-slate-900' : 'text-white')
                                }`}
                              >
                                {opt.label}
                              </p>
                            </div>
                            <p className={`text-[11px] truncate mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                              {opt.desc}
                            </p>

                            {/* Portal Address Subdomain Badge */}
                            {portalUrl && (
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono truncate max-w-[180px] border ${
                                  isLight
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-slate-950 text-emerald-400 border-slate-800'
                                }`}>
                                  <Globe className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">{portalUrl.replace(/^https?:\/\//, '')}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </button>

                        {/* Quick Copy Link Button for Portals */}
                        {portalUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(portalUrl);
                              setCopiedRoleKey(opt.role);
                              setTimeout(() => setCopiedRoleKey(null), 2000);
                            }}
                            className={`p-1 rounded transition-colors shrink-0 mt-0.5 ${
                              isLight
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
                            }`}
                            title={`Copy ${opt.label} address`}
                          >
                            {copiedRoleKey === opt.role ? (
                              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <MetaAdsSyncModal isOpen={isMetaSheetModalOpen} onClose={() => setIsMetaSheetModalOpen(false)} />
    </>
  );
};
