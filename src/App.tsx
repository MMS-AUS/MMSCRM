import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar, NavSection } from './components/layout/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { ContactsView } from './components/views/ContactsView';
import { CompaniesView } from './components/views/CompaniesView';
import { LeadsView } from './components/views/LeadsView';
import { ProjectsView } from './components/views/ProjectsView';
import { TicketsView } from './components/views/TicketsView';
import { MaintenanceView } from './components/views/MaintenanceView';
import { SubContractorsView } from './components/views/SubContractorsView';
import { SalesOrdersView } from './components/views/SalesOrdersView';
import { InstallOrdersView } from './components/views/InstallOrdersView';
import { PLStatementView } from './components/views/PLStatementView';
import { HRMSView } from './components/views/HRMSView';
import { IntegrationsView } from './components/views/IntegrationsView';
import { SettingsView } from './components/views/SettingsView';
import { CompanyProfileView } from './components/views/CompanyProfileView';
import { ReferralBonusView } from './components/views/ReferralBonusView';
import { CustomerPortal } from './components/portals/CustomerPortal';
import { InstallerPortal } from './components/portals/InstallerPortal';
import { VoIPDialerModal } from './components/modals/VoIPDialerModal';
import { MessageMediaSMSModal } from './components/modals/MessageMediaSMSModal';
import { BridgeSelectModal } from './components/modals/BridgeSelectModal';
import { OpenSolarModal } from './components/modals/OpenSolarModal';
import { UserProfileModal } from './components/modals/UserProfileModal';
import { PortalQRCodeModal } from './components/common/PortalQRCodeModal';
import { CRMLoginScreen } from './components/auth/CRMLoginScreen';
import { JoinERPSetPasswordScreen } from './components/auth/JoinERPSetPasswordScreen';
import {
  ArrowLeft,
  Shield,
  ShieldAlert,
  Wrench,
  Sun,
  LayoutDashboard,
  Flame,
  FolderKanban,
  Gift,
  Menu,
  Globe,
  Lock,
  Copy,
  Check,
  QrCode,
  Sliders
} from 'lucide-react';
import { detectPortalFromCurrentLocation, getPortalProductionUrl } from './utils/portalUrls';

const MainLayout: React.FC = () => {
  const {
    isAuthenticated,
    activeRole,
    setActiveRole,
    leads,
    projects,
    referralBonuses,
    isFeatureEnabled,
    hasPermission,
    portalAddresses,
    themeMode
  } = useApp();
  const isLight = themeMode === 'corporate-slate';
  const [currentSection, setCurrentSection] = useState<NavSection>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [copiedBannerUrl, setCopiedBannerUrl] = useState(false);
  const [gmailToast, setGmailToast] = useState<{ message: string; isError?: boolean } | null>(null);
  const [isSettingPasswordFromInvite, setIsSettingPasswordFromInvite] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('invite_token');
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail') === 'connected') {
      const email = params.get('email') || 'Connected Account';
      setGmailToast({ message: `Gmail account (${email}) successfully connected via OAuth 2.0 with continuous background sync active!` });
      const url = new URL(window.location.href);
      url.searchParams.delete('gmail');
      url.searchParams.delete('email');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      setTimeout(() => setGmailToast(null), 6000);
    } else if (params.get('gmail') === 'error') {
      const msg = params.get('message') || 'Failed to authenticate with Gmail API';
      setGmailToast({ message: `Gmail OAuth Error: ${msg}`, isError: true });
      const url = new URL(window.location.href);
      url.searchParams.delete('gmail');
      url.searchParams.delete('message');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      setTimeout(() => setGmailToast(null), 8000);
    }
  }, []);

  useEffect(() => {
    const handleUrlChange = () => {
      const hasInvite = new URLSearchParams(window.location.search).has('invite_token');
      if (hasInvite) {
        setIsSettingPasswordFromInvite(true);
      }
    };
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // Synchronize activeRole with URL hostname / query params on initial load and navigation
  useEffect(() => {
    const syncPortalFromUrl = () => {
      if (!portalAddresses?.enableAutoRouting) return;
      const detected = detectPortalFromCurrentLocation();
      if (detected && detected !== activeRole) {
        setActiveRole(detected);
      }
    };

    syncPortalFromUrl();
    window.addEventListener('popstate', syncPortalFromUrl);
    window.addEventListener('hashchange', syncPortalFromUrl);
    return () => {
      window.removeEventListener('popstate', syncPortalFromUrl);
      window.removeEventListener('hashchange', syncPortalFromUrl);
    };
  }, [portalAddresses?.enableAutoRouting, activeRole, setActiveRole]);

  const newLeadsCount = (leads || []).filter(l => l?.status === 'New').length;
  const activeProjectsCount = (projects || []).filter(p => p?.status !== 'Completed').length;
  const pendingReferralsCount = (referralBonuses || []).filter(
    r => r.paymentStatus !== 'Paid via EFT' && r.paymentStatus !== 'Rejected'
  ).length;

  const currentPortalConfig =
    activeRole === 'customer'
      ? portalAddresses?.customerPortal
      : activeRole === 'installer'
      ? portalAddresses?.installerPortal
      : null;

  const currentPortalUrl = currentPortalConfig ? getPortalProductionUrl(currentPortalConfig) : '';

  const handleCopyBannerUrl = () => {
    if (!currentPortalUrl) return;
    navigator.clipboard.writeText(currentPortalUrl);
    setCopiedBannerUrl(true);
    setTimeout(() => setCopiedBannerUrl(false), 2000);
  };

  if (isSettingPasswordFromInvite) {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden font-sans">
        <JoinERPSetPasswordScreen
          onBackToLogin={() => {
            setIsSettingPasswordFromInvite(false);
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.delete('invite_token');
              url.searchParams.delete('email');
              window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
            }
          }}
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden font-sans">
        <CRMLoginScreen
          onOpenInviteScreen={() => setIsSettingPasswordFromInvite(true)}
        />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden font-sans transition-colors duration-200 ${
      isLight ? 'bg-slate-100/70 text-slate-900' : 'bg-[#090d16] text-slate-100'
    }`}>
      {gmailToast && (
        <div className={`px-4 py-2 text-xs font-semibold text-center flex items-center justify-center gap-2 z-50 transition-all ${
          gmailToast.isError ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          <span>{gmailToast.message}</span>
          <button
            onClick={() => setGmailToast(null)}
            className="ml-3 px-1.5 py-0.5 rounded bg-black/20 hover:bg-black/30 text-white"
          >
            &times;
          </button>
        </div>
      )}
      <Header
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onToggleDesktopSidebar={() => setIsDesktopSidebarCollapsed(prev => !prev)}
        isDesktopSidebarCollapsed={isDesktopSidebarCollapsed}
        onNavigate={setCurrentSection}
        onOpenProfile={() => setIsUserProfileModalOpen(true)}
      />

      {/* Role-Specific Portal Handling */}
      {activeRole === 'customer' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Live Dedicated Subdomain Address Bar */}
          <div className={`border-b px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs backdrop-blur-md transition-colors ${
            isLight
              ? 'bg-white/95 border-slate-200/90 text-slate-800 shadow-soft-xs'
              : 'bg-slate-950/95 border-slate-800 text-slate-200'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 border ${
                isLight
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              }`}>
                <Lock className="w-3 h-3" />
                <span>SSL</span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0 font-mono text-xs font-semibold truncate">
                <Globe className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate">{currentPortalUrl || 'https://customer.mysolarcrm.com.au'}</span>
              </div>
              <span className={`hidden md:inline text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                &bull; Customer Self-Service Portal
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyBannerUrl}
                className={`px-2 py-1 rounded border flex items-center gap-1 transition-colors text-xs font-medium ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
                }`}
                title="Copy customer portal address"
              >
                {copiedBannerUrl ? (
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedBannerUrl ? 'Copied' : 'Copy URL'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className={`p-1 rounded border transition-colors ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
                }`}
                title="Test on mobile phone"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-500" />
              </button>

              <button
                type="button"
                onClick={() => setActiveRole('installer')}
                className={`px-2 py-1 rounded border transition-colors text-xs hidden sm:inline-flex ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
                }`}
                title="Switch to installer portal address"
              >
                Switch to Installer Portal
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveRole('admin');
                  setCurrentSection('settings');
                }}
                className={`p-1 rounded border transition-colors ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
                }`}
                title="Configure portal domains in Settings"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setActiveRole('admin')}
                className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded text-xs flex items-center gap-1 transition-all shadow-soft-xs"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Return to ERP</span>
              </button>
            </div>
          </div>
          <CustomerPortal />
        </div>
      ) : activeRole === 'installer' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Live Dedicated Subdomain Address Bar */}
          <div className={`border-b px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs backdrop-blur-md transition-colors ${
            isLight
              ? 'bg-white/95 border-slate-200/90 text-slate-800 shadow-soft-xs'
              : 'bg-slate-950/95 border-slate-800 text-slate-200'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 border ${
                isLight
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              }`}>
                <Lock className="w-3 h-3" />
                <span>SSL</span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0 font-mono text-xs font-semibold truncate">
                <Globe className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">{currentPortalUrl || 'https://installers.mysolarcrm.com.au'}</span>
              </div>
              <span className={`hidden md:inline text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                &bull; Subcontractor Installer Portal
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyBannerUrl}
                className={`px-2 py-1 rounded border flex items-center gap-1 transition-colors text-xs font-medium ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
                }`}
                title="Copy installer portal address"
              >
                {copiedBannerUrl ? (
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedBannerUrl ? 'Copied' : 'Copy URL'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className={`p-1 rounded border transition-colors ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
                }`}
                title="Test on mobile phone"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-500" />
              </button>

              <button
                type="button"
                onClick={() => setActiveRole('customer')}
                className={`px-2 py-1 rounded border transition-colors text-xs hidden sm:inline-flex ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
                }`}
                title="Switch to customer portal address"
              >
                Switch to Customer Portal
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveRole('admin');
                  setCurrentSection('settings');
                }}
                className={`p-1 rounded border transition-colors ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
                }`}
                title="Configure portal domains in Settings"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setActiveRole('admin')}
                className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold rounded text-xs flex items-center gap-1 transition-all shadow-soft-xs"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Return to ERP</span>
              </button>
            </div>
          </div>
          <InstallerPortal />
        </div>
      ) : (
        /* Internal ERP & CRM Layout */
        <div className="flex-1 flex overflow-hidden relative">
          <Sidebar
            currentSection={currentSection}
            onSelectSection={sec => {
              setCurrentSection(sec);
              setIsMobileSidebarOpen(false);
            }}
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
            isCollapsed={isDesktopSidebarCollapsed}
            onToggleCollapse={() => setIsDesktopSidebarCollapsed(prev => !prev)}
            onOpenProfile={() => setIsUserProfileModalOpen(true)}
          />

          <main className={`flex-1 flex flex-col min-w-0 overflow-hidden pb-14 lg:pb-0 transition-colors duration-200 ${
            isLight ? 'bg-slate-100/60 text-slate-900' : 'bg-[#090d16] text-slate-100'
          }`}>
            {currentSection !== 'dashboard' &&
            currentSection !== 'company-profile' &&
            (!isFeatureEnabled(currentSection) || !hasPermission(currentSection, 'view')) ? (
              <div className={`flex-1 flex flex-col items-center justify-center p-8 text-center ${
                isLight ? 'bg-slate-50' : 'bg-[#090d16]'
              }`}>
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
                  <ShieldAlert className="w-7 h-7 text-amber-500" />
                </div>
                <h2 className={`text-lg font-bold mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Module Access Restricted or Disabled
                </h2>
                <p className={`text-xs max-w-md mb-5 leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  This feature module has either been disabled globally in System Settings or your active role does not have permission to view it.
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentSection('dashboard')}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-soft-xs"
                >
                  Return to Dashboard
                </button>
              </div>
            ) : (
              <>
                {currentSection === 'dashboard' && <DashboardView onNavigate={setCurrentSection} />}
                {currentSection === 'contacts' && <ContactsView />}
                {currentSection === 'companies' && <CompaniesView />}
                {currentSection === 'leads' && (
                  <LeadsView onNavigateToProjects={() => setCurrentSection('projects')} />
                )}
                {currentSection === 'projects' && (
                  <ProjectsView onNavigateToSection={setCurrentSection} />
                )}
                {currentSection === 'tickets' && <TicketsView />}
                {currentSection === 'referrals' && <ReferralBonusView />}
                {currentSection === 'maintenance' && <MaintenanceView />}
                {currentSection === 'subcontractors' && <SubContractorsView />}
                {currentSection === 'sales-orders' && <SalesOrdersView />}
                {currentSection === 'install-orders' && <InstallOrdersView />}
                {currentSection === 'pl-statement' && <PLStatementView />}
                {currentSection === 'hrms' && <HRMSView />}
                {currentSection === 'integrations' && <IntegrationsView />}
                {currentSection === 'company-profile' && <CompanyProfileView />}
                {currentSection === 'settings' && <SettingsView />}
              </>
            )}
          </main>

          {/* Mobile Bottom Navigation Bar (< lg) */}
          <nav className={`lg:hidden fixed bottom-0 inset-x-0 h-14 backdrop-blur-md border-t flex items-center justify-around z-30 px-2 select-none transition-colors ${
            isLight
              ? 'bg-white/95 border-slate-200 text-slate-600 shadow-soft-sm'
              : 'bg-slate-950/95 border-slate-800 text-slate-400'
          }`}>
            <button
              type="button"
              onClick={() => setCurrentSection('dashboard')}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                currentSection === 'dashboard'
                  ? isLight ? 'text-amber-600 font-bold' : 'text-amber-400 font-bold'
                  : isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentSection('leads')}
              className={`flex flex-col items-center justify-center flex-1 py-1 relative transition-colors ${
                currentSection === 'leads'
                  ? isLight ? 'text-amber-600 font-bold' : 'text-amber-400 font-bold'
                  : isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Leads</span>
              {newLeadsCount > 0 && (
                <span className="absolute top-1 right-[25%] w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setCurrentSection('projects')}
              className={`flex flex-col items-center justify-center flex-1 py-1 relative transition-colors ${
                currentSection === 'projects'
                  ? isLight ? 'text-amber-600 font-bold' : 'text-amber-400 font-bold'
                  : isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FolderKanban className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Projects</span>
              {activeProjectsCount > 0 && (
                <span className="absolute top-1 right-[25%] w-2 h-2 rounded-full bg-blue-500" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setCurrentSection('referrals')}
              className={`flex flex-col items-center justify-center flex-1 py-1 relative transition-colors ${
                currentSection === 'referrals'
                  ? isLight ? 'text-amber-600 font-bold' : 'text-amber-400 font-bold'
                  : isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gift className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Referrals</span>
              {pendingReferralsCount > 0 && (
                <span className="absolute top-1 right-[25%] w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Menu className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">More</span>
            </button>
          </nav>
        </div>
      )}

      {/* Global Modals */}
      <UserProfileModal
        isOpen={isUserProfileModalOpen}
        onClose={() => setIsUserProfileModalOpen(false)}
      />
      <VoIPDialerModal />
      <MessageMediaSMSModal />
      <BridgeSelectModal />
      <OpenSolarModal />
      {isQrModalOpen && currentPortalConfig && (
        <PortalQRCodeModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          portalConfig={currentPortalConfig}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
