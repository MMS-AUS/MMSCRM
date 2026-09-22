import React, { useState, useEffect } from 'react';
import {
  Mail,
  ShieldCheck,
  RefreshCw,
  Power,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Send,
  Inbox,
  User,
  Clock,
  X,
  Sparkles,
  Search,
  BookOpen,
  Sliders,
  Check,
  Compass,
  FileText
} from 'lucide-react';
import {
  GmailStatus,
  CrmEmail,
  getGmailLiveStatus,
  toggleGmailSendEnabled,
  getSyncedCrmEmails,
  disconnectGmailAccount,
  sendGmailEmail,
  buildGmailComposeUrl,
  setPersonalGmailAccount,
  getStoredPersonalGmailOverride
} from '../../services/gmailService';
import { connectGmailWithGoogle } from '../../lib/firebaseAuth';
import { useApp } from '../../context/AppContext';

interface GmailSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'feed' | 'compose' | 'webmail' | 'setup';
}

export const GmailSettingsModal: React.FC<GmailSettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'feed'
}) => {
  const { contacts = [], projects = [], leads = [], themeMode } = useApp();
  const isLight = themeMode === 'corporate-slate';

  const [activeTab, setActiveTab] = useState<'feed' | 'compose' | 'webmail' | 'setup'>(initialTab);
  const [liveStatus, setLiveStatus] = useState<GmailStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isTogglingSend, setIsTogglingSend] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [emails, setEmails] = useState<CrmEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<CrmEmail | null>(null);

  // Manual personal email connect state
  const [manualPersonalEmail, setManualPersonalEmail] = useState('');
  const [personalOverride, setPersonalOverride] = useState(() => getStoredPersonalGmailOverride());

  // Search and filter in email feed
  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'inbound' | 'outbound'>('all');

  // Quick compose form state
  const [composeTo, setComposeTo] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const [composeBcc, setComposeBcc] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [composeSuccess, setComposeSuccess] = useState<string | null>(null);

  // Webmail search tool state
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  // UI Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const status = await getGmailLiveStatus();
      setLiveStatus(status);
    } catch (err: any) {
      console.error('Failed to load Gmail status:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const loadEmails = async () => {
    try {
      const list = await getSyncedCrmEmails({
        search: searchQuery || undefined,
        direction: directionFilter === 'all' ? undefined : directionFilter
      });
      setEmails(list);
    } catch (err) {
      console.warn('Failed to load emails:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      loadStatus();
      loadEmails();
      setPersonalOverride(getStoredPersonalGmailOverride());
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (isOpen && activeTab === 'feed') {
      loadEmails();
    }
  }, [searchQuery, directionFilter, activeTab, isOpen]);

  if (!isOpen) return null;

  const connectedEmail = personalOverride?.emailAddress || liveStatus?.emailAddress || 'akash.mohite@gmail.com';
  const isConnected = !!(personalOverride?.emailAddress || liveStatus?.connected);
  const sendEnabled = personalOverride ? personalOverride.sendEnabled : (liveStatus?.sendEnabled ?? true);

  // Connect Personal Gmail via Google Sign-In (Standard personal scopes)
  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    try {
      const account = await connectGmailWithGoogle();
      const userEmail = account.user?.email;
      if (userEmail) {
        await setPersonalGmailAccount(userEmail, true);
        setPersonalOverride({ emailAddress: userEmail, sendEnabled: true });
        showToast(`Connected personal account: ${userEmail}`);
        await loadStatus();
      }
    } catch (err: any) {
      console.error('Personal Gmail connection error:', err);
      // If popup fails or is blocked in iframe, allow entering manual email
      showToast(err.message || 'OAuth popup closed. You can also connect your address manually.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Manual personal email connect
  const handleSaveManualEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPersonalEmail.trim() || !manualPersonalEmail.includes('@')) {
      showToast('Please enter a valid Gmail address');
      return;
    }
    await setPersonalGmailAccount(manualPersonalEmail.trim(), true);
    setPersonalOverride({ emailAddress: manualPersonalEmail.trim(), sendEnabled: true });
    setManualPersonalEmail('');
    showToast(`Connected personal Gmail: ${manualPersonalEmail.trim()}`);
    await loadStatus();
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect this personal Gmail account?')) return;
    setIsDisconnecting(true);
    try {
      await disconnectGmailAccount();
      setPersonalOverride(null);
      await loadStatus();
      showToast('Personal Gmail account disconnected');
    } catch (err: any) {
      showToast(`Disconnect failed: ${err.message}`);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleToggleSend = async () => {
    const nextState = !sendEnabled;
    setIsTogglingSend(true);
    try {
      if (personalOverride) {
        await setPersonalGmailAccount(personalOverride.emailAddress, nextState);
        setPersonalOverride({ ...personalOverride, sendEnabled: nextState });
      } else {
        await toggleGmailSendEnabled(nextState);
        await loadStatus();
      }
      showToast(`Outbound email dispatch ${nextState ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      showToast(`Toggle failed: ${err.message}`);
    } finally {
      setIsTogglingSend(false);
    }
  };

  // Open in Google's native Personal Gmail Web App
  const handleOpenNativeCompose = () => {
    const url = buildGmailComposeUrl({
      to: composeTo,
      cc: composeCc,
      bcc: composeBcc,
      subject: composeSubject,
      body: composeBody
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Send via in-app API
  const handleSendInApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setComposeError(null);
    setComposeSuccess(null);

    if (!composeTo.trim()) {
      setComposeError('Recipient email address is required');
      return;
    }
    if (!composeSubject.trim()) {
      setComposeError('Subject is required');
      return;
    }
    if (!composeBody.trim()) {
      setComposeError('Email body cannot be empty');
      return;
    }

    setIsSending(true);
    try {
      const res = await sendGmailEmail({
        to: composeTo.trim(),
        cc: composeCc.trim() || undefined,
        bcc: composeBcc.trim() || undefined,
        subject: composeSubject.trim(),
        bodyText: composeBody,
        contactId: selectedContactId || undefined,
        projectId: selectedProjectId || undefined
      });

      setComposeSuccess(`Email dispatched successfully (ID: ${res.messageId || 'SENT'})`);
      showToast('Message dispatched via Personal Gmail!');
      setComposeBody('');
      setComposeSubject('');
      await loadEmails();
    } catch (err: any) {
      setComposeError(err.message || 'Failed to dispatch email. Check connection or use "Open in Gmail App".');
    } finally {
      setIsSending(false);
    }
  };

  // Predefined Solar Communication Templates
  const applySolarTemplate = (templateType: 'quote' | 'inspection' | 'install' | 'stc') => {
    if (templateType === 'quote') {
      setComposeSubject('Solar Proposal & System Specification - Follow Up');
      setComposeBody(
        `Hi there,\n\nFollowing up on our recent discussion regarding your solar energy system proposal. We have tailored a high-efficiency CEC-approved system designed to maximize your energy self-consumption and solar rebate savings.\n\nPlease let me know if you would like to review the inverter specifications, battery storage options, or financing schedule.\n\nBest regards,\nPersonal Solar Advisor`
      );
    } else if (templateType === 'inspection') {
      setComposeSubject('Solar Pre-Installation Roof Assessment & Site Inspection');
      setComposeBody(
        `Dear Customer,\n\nWe have scheduled a preliminary site inspection for your property to verify roof structural integrity, switchboard capacity, and conduit pathways.\n\nDate: Tomorrow at 10:00 AM AEST\nLocation: Customer Installation Site\n\nPlease let us know if this time works for you.\n\nKind regards,\nSolar Operations Team`
      );
    } else if (templateType === 'install') {
      setComposeSubject('Solar Installation Confirmed - Clean Energy Council Accredited Team');
      setComposeBody(
        `Dear Customer,\n\nWe are pleased to confirm that your solar PV installation has been booked with our CEC-accredited installers.\n\nOur installation team will arrive on site with all certified panels, inverter, and mounting hardware. Please ensure clear access to the switchboard and roof perimeter.\n\nThank you,\nInstallations Dispatch`
      );
    } else if (templateType === 'stc') {
      setComposeSubject('Required STC Documentation - Clean Energy Regulator Small-Scale Technology Certificates');
      setComposeBody(
        `Dear Customer,\n\nTo finalize your Small-scale Technology Certificates (STC) rebate through the Clean Energy Regulator, we require signed copies of your solar installation completion agreement and electrical compliance certificate.\n\nPlease sign and return at your earliest convenience.\n\nWarm regards,\nCompliance & STC Administration`
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className={`w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#121212] border-[#2a2a2a]'
      }`}>

        {/* Modal Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between gap-4 shrink-0 ${
          isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-[#161616] border-[#262626]'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`text-base sm:text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Gmail Personal Email App
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-wide">
                  Personal Account (@gmail.com)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  No Workspace Admin Needed
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                Personal Gmail inbox, quick composer, and direct webmail integration. Use your personal Google account directly for customer communication.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open('https://mail.google.com', '_blank', 'noopener,noreferrer')}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Open Gmail Personal Web Application in a new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open Gmail App</span>
            </button>
            <button
              onClick={loadStatus}
              disabled={isLoadingStatus}
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-200'
                  : 'bg-[#222] hover:bg-[#2c2c2c] text-gray-300 hover:text-white border-[#333]'
              }`}
              title="Refresh connection status"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingStatus ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 border-slate-200'
                  : 'bg-[#222] hover:bg-[#2c2c2c] text-gray-400 hover:text-white border-[#333]'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Status Bar */}
        <div className={`p-3.5 sm:p-4 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
          isLight ? 'bg-slate-100/80 border-slate-200 text-slate-700' : 'bg-[#181818] border-[#262626] text-gray-300'
        }`}>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Connected Account:</div>
              <div className={`text-xs font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                isLight ? 'bg-white border-slate-300 text-slate-800 shadow-soft-xs' : 'bg-[#202020] border-[#333] text-white'
              }`}>
                <User className="w-3.5 h-3.5 text-red-500" />
                <span>{connectedEmail}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isConnected
                  ? (isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30')
                  : (isLight ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/30')
              }`}>
                {isConnected ? 'Active & Ready' : 'Personal Account Ready'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isConnected ? (
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                    : 'bg-red-950/40 hover:bg-red-900/50 text-red-300 border-red-800/50'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{isDisconnecting ? 'Disconnecting...' : 'Disconnect Account'}</span>
              </button>
            ) : (
              <button
                onClick={handleConnectGoogle}
                disabled={isConnecting}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isConnecting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Mail className="w-3.5 h-3.5" />
                )}
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Section: Outbound Sending Switch Banner */}
        <div className={`px-4 sm:px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
          isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-[#141414] border-[#262626]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
              sendEnabled
                ? (isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30')
                : (isLight ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-amber-500/15 text-amber-400 border-amber-500/30')
            }`}>
              <Send className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Allow In-App Sending via Personal Gmail
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase border ${
                  sendEnabled
                    ? (isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30')
                    : (isLight ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-amber-500/20 text-amber-300 border-amber-500/30')
                }`}>
                  {sendEnabled ? 'Authorized' : 'Read-Only / Webmail Only'}
                </span>
              </div>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                Controls whether outbound messages can be dispatched directly from the CRM using your personal address.
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleSend}
            disabled={isTogglingSend}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
              sendEnabled
                ? (isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30')
                : (isLight ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200' : 'bg-[#222] text-gray-300 border-[#333] hover:bg-[#2a2a2a]')
            }`}
          >
            {isTogglingSend ? 'Updating...' : sendEnabled ? 'Active (Click to Pause)' : 'Paused (Click to Enable)'}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={`px-4 sm:px-5 border-b flex items-center justify-between shrink-0 overflow-x-auto no-scrollbar ${
          isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-[#141414] border-[#262626]'
        }`}>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('feed')}
              className={`px-3 sm:px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'feed'
                  ? (isLight ? 'border-red-600 text-red-600 bg-white/80' : 'border-red-500 text-red-400 bg-[#1c1c1c]')
                  : (isLight ? 'border-transparent text-slate-600 hover:text-slate-900' : 'border-transparent text-gray-400 hover:text-white')
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>Personal Inbox &amp; CRM Threads ({emails.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('compose')}
              className={`px-3 sm:px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'compose'
                  ? (isLight ? 'border-red-600 text-red-600 bg-white/80' : 'border-red-500 text-red-400 bg-[#1c1c1c]')
                  : (isLight ? 'border-transparent text-slate-600 hover:text-slate-900' : 'border-transparent text-gray-400 hover:text-white')
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Personal Composer &amp; Templates</span>
            </button>
            <button
              onClick={() => setActiveTab('webmail')}
              className={`px-3 sm:px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'webmail'
                  ? (isLight ? 'border-red-600 text-red-600 bg-white/80' : 'border-red-500 text-red-400 bg-[#1c1c1c]')
                  : (isLight ? 'border-transparent text-slate-600 hover:text-slate-900' : 'border-transparent text-gray-400 hover:text-white')
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Gmail Web App Shortcuts</span>
            </button>
            <button
              onClick={() => setActiveTab('setup')}
              className={`px-3 sm:px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'setup'
                  ? (isLight ? 'border-red-600 text-red-600 bg-white/80' : 'border-red-500 text-red-400 bg-[#1c1c1c]')
                  : (isLight ? 'border-transparent text-slate-600 hover:text-slate-900' : 'border-transparent text-gray-400 hover:text-white')
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Personal Account &amp; Setup</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-gray-400">
            <span>Account:</span>
            <strong className={isLight ? 'text-slate-800' : 'text-white'}>{connectedEmail}</strong>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">

          {toastMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* TAB 1: PERSONAL INBOX & CRM THREADS */}
          {activeTab === 'feed' && (
            <div className="space-y-4">
              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search personal emails, contacts, or subjects..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border focus:outline-none transition-colors ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-red-500'
                        : 'bg-[#181818] border-[#2c2c2c] text-white focus:border-red-400'
                    }`}
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {(['all', 'inbound', 'outbound'] as const).map(dir => (
                    <button
                      key={dir}
                      onClick={() => setDirectionFilter(dir)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border capitalize transition-colors ${
                        directionFilter === dir
                          ? (isLight ? 'bg-slate-900 text-white border-slate-900' : 'bg-red-600 text-white border-red-600')
                          : (isLight ? 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50' : 'bg-[#1a1a1a] text-gray-400 border-[#2a2a2a] hover:text-white')
                      }`}
                    >
                      {dir}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email List and Viewer */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[360px]">
                <div className={`lg:col-span-5 rounded-xl border overflow-hidden flex flex-col ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#161616] border-[#262626]'
                }`}>
                  <div className={`p-3 border-b font-bold text-xs flex items-center justify-between ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#1a1a1a] border-[#262626] text-white'
                  }`}>
                    <span>Conversation Feed</span>
                    <span className="text-[11px] font-normal text-gray-400">{emails.length} message(s)</span>
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-[#262626] max-h-[440px]">
                    {emails.length === 0 ? (
                      <div className="p-8 text-center text-xs text-gray-400 space-y-2">
                        <Inbox className="w-8 h-8 mx-auto opacity-40" />
                        <p>No synced messages found for this filter.</p>
                        <button
                          onClick={() => setActiveTab('compose')}
                          className="text-red-400 hover:underline font-semibold"
                        >
                          Compose an email using Personal Gmail &rarr;
                        </button>
                      </div>
                    ) : (
                      emails.map(email => {
                        const isSelected = selectedEmail?.id === email.id;
                        return (
                          <div
                            key={email.id}
                            onClick={() => setSelectedEmail(email)}
                            className={`p-3 text-xs cursor-pointer transition-colors ${
                              isSelected
                                ? (isLight ? 'bg-red-50/70 border-l-4 border-red-600' : 'bg-red-950/30 border-l-4 border-red-500')
                                : 'hover:bg-black/20'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className={`font-semibold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                {email.direction === 'outbound' ? `To: ${email.toAddress}` : `From: ${email.fromAddress}`}
                              </span>
                              <span className={`text-[10px] font-mono shrink-0 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
                                {new Date(email.sentAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className={`font-medium truncate ${isLight ? 'text-slate-800' : 'text-gray-200'}`}>
                              {email.subject || '(No Subject)'}
                            </div>
                            <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                              {email.snippet || email.bodyText}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Selected Email Detail Viewer */}
                <div className={`lg:col-span-7 rounded-xl border p-4 flex flex-col justify-between ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#161616] border-[#262626]'
                }`}>
                  {selectedEmail ? (
                    <div className="space-y-3 flex-1">
                      <div className="flex items-start justify-between gap-2 border-b border-[#262626] pb-3">
                        <div>
                          <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            {selectedEmail.subject || '(No Subject)'}
                          </h3>
                          <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                            <div>From: <strong className={isLight ? 'text-slate-800' : 'text-gray-200'}>{selectedEmail.fromAddress}</strong></div>
                            <div>To: <strong className={isLight ? 'text-slate-800' : 'text-gray-200'}>{selectedEmail.toAddress}</strong></div>
                            <div className="text-[11px] text-gray-500">Date: {new Date(selectedEmail.sentAt).toLocaleString()}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setComposeTo(selectedEmail.direction === 'inbound' ? selectedEmail.fromAddress : selectedEmail.toAddress);
                            setComposeSubject(`Re: ${selectedEmail.subject}`);
                            setActiveTab('compose');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 text-xs font-semibold flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>Reply</span>
                        </button>
                      </div>

                      <div className={`text-xs leading-relaxed p-3 rounded-lg border whitespace-pre-wrap ${
                        isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#121212] border-[#222] text-gray-300'
                      }`}>
                        {selectedEmail.bodyText || selectedEmail.snippet || '(Empty message content)'}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-xs text-gray-400 space-y-2">
                      <Mail className="w-10 h-10 opacity-30" />
                      <p>Select a message from the conversation feed to view details.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERSONAL COMPOSER & TEMPLATES */}
          {activeTab === 'compose' && (
            <div className="space-y-4">
              {/* Quick Template Selector */}
              <div className={`p-4 rounded-xl border space-y-2.5 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#161616] border-[#262626]'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-white'}`}>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Solar Communication Templates (1-Click Fill)</span>
                  </span>
                  <span className="text-[11px] text-gray-400">Click to apply content</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applySolarTemplate('quote')}
                    className="px-2.5 py-1.5 rounded-lg bg-[#222] hover:bg-[#2c2c2c] border border-[#333] text-gray-200 text-xs font-medium transition-colors"
                  >
                    1. Quote Follow-Up
                  </button>
                  <button
                    type="button"
                    onClick={() => applySolarTemplate('inspection')}
                    className="px-2.5 py-1.5 rounded-lg bg-[#222] hover:bg-[#2c2c2c] border border-[#333] text-gray-200 text-xs font-medium transition-colors"
                  >
                    2. Site Inspection Notice
                  </button>
                  <button
                    type="button"
                    onClick={() => applySolarTemplate('install')}
                    className="px-2.5 py-1.5 rounded-lg bg-[#222] hover:bg-[#2c2c2c] border border-[#333] text-gray-200 text-xs font-medium transition-colors"
                  >
                    3. Installation Confirmation
                  </button>
                  <button
                    type="button"
                    onClick={() => applySolarTemplate('stc')}
                    className="px-2.5 py-1.5 rounded-lg bg-[#222] hover:bg-[#2c2c2c] border border-[#333] text-gray-200 text-xs font-medium transition-colors"
                  >
                    4. STC Rebate Docs Request
                  </button>
                </div>
              </div>

              {/* Compose Form */}
              <form onSubmit={handleSendInApp} className={`p-5 rounded-xl border space-y-3.5 ${
                isLight ? 'bg-white border-slate-200 shadow-soft-xs' : 'bg-[#161616] border-[#262626]'
              }`}>
                <div className="flex items-center justify-between border-b border-[#262626] pb-3">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-red-500" />
                    <h3 className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Compose Outbound Email via Personal Gmail
                    </h3>
                  </div>
                  <div className="text-[11px] text-gray-400">
                    From: <strong className={isLight ? 'text-slate-800' : 'text-white'}>{connectedEmail}</strong>
                  </div>
                </div>

                {composeError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
                    {composeError}
                  </div>
                )}
                {composeSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400">
                    {composeSuccess}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                      To (Recipient Email) *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="client@domain.com.au"
                      value={composeTo}
                      onChange={e => setComposeTo(e.target.value)}
                      className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121212] border-[#2c2c2c] text-white focus:border-red-400'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                      Link to CRM Contact
                    </label>
                    <select
                      value={selectedContactId}
                      onChange={e => {
                        setSelectedContactId(e.target.value);
                        const c = contacts.find(item => item.id === e.target.value);
                        if (c?.email) setComposeTo(c.email);
                      }}
                      className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121212] border-[#2c2c2c] text-white'
                      }`}
                    >
                      <option value="">-- Optional: Link to Contact --</option>
                      {contacts.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.email || 'No email'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                      Cc (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="ops@solarcompany.com.au"
                      value={composeCc}
                      onChange={e => setComposeCc(e.target.value)}
                      className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121212] border-[#2c2c2c] text-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                      Link to Project
                    </label>
                    <select
                      value={selectedProjectId}
                      onChange={e => setSelectedProjectId(e.target.value)}
                      className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121212] border-[#2c2c2c] text-white'
                      }`}
                    >
                      <option value="">-- Optional: Link to Project --</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} - {p.customerName} ({p.systemSizeKw}kW)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                    Subject *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Solar Quote Proposal & CEC Documentation"
                    value={composeSubject}
                    onChange={e => setComposeSubject(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121212] border-[#2c2c2c] text-white focus:border-red-400'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                    Message Body *
                  </label>
                  <textarea
                    rows={6}
                    required
                    placeholder="Dear Customer,\n\nPlease find attached the documentation for your residential solar PV system..."
                    value={composeBody}
                    onChange={e => setComposeBody(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none font-sans ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121212] border-[#2c2c2c] text-white focus:border-red-400'
                    }`}
                  />
                </div>

                {/* Dual Action Buttons: Send In-App OR Open Native Gmail */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#262626]">
                  <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Choose to send immediately via CRM or open in your Gmail browser tab</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenNativeCompose}
                      className="px-4 py-2 rounded-lg bg-[#222] hover:bg-[#2c2c2c] border border-[#333] text-gray-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-red-400" />
                      <span>Open in Gmail App</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isSending}
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
                    >
                      <Send className={`w-3.5 h-3.5 ${isSending ? 'animate-spin' : ''}`} />
                      <span>{isSending ? 'Dispatching...' : 'Send via Personal Gmail'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: GMAIL WEB APP SHORTCUTS & QUICK LAUNCH */}
          {activeTab === 'webmail' && (
            <div className="space-y-4">
              <div className={`p-5 rounded-xl border space-y-4 ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#161616] border-[#262626]'
              }`}>
                <div className="flex items-center justify-between border-b border-[#262626] pb-3">
                  <div className="flex items-center gap-2">
                    <Compass className="w-5 h-5 text-red-500" />
                    <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Personal Gmail Web App Shortcuts
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                    Direct Webmail Jump
                  </span>
                </div>

                <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                  Launch specific sections of your Personal Gmail web application directly in your browser without navigation hassle.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <a
                    href="https://mail.google.com/mail/u/0/#inbox"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-4 rounded-xl border flex flex-col justify-between space-y-2 hover:border-red-500/50 transition-colors ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1a1a1a] border-[#2a2a2a]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Inbox className="w-5 h-5 text-red-400" />
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <div>
                      <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>Inbox</div>
                      <div className="text-[11px] text-gray-400">All incoming mail</div>
                    </div>
                  </a>

                  <a
                    href="https://mail.google.com/mail/u/0/#sent"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-4 rounded-xl border flex flex-col justify-between space-y-2 hover:border-red-500/50 transition-colors ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1a1a1a] border-[#2a2a2a]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Send className="w-5 h-5 text-amber-400" />
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <div>
                      <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>Sent Messages</div>
                      <div className="text-[11px] text-gray-400">Outbound history</div>
                    </div>
                  </a>

                  <a
                    href="https://mail.google.com/mail/u/0/#drafts"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-4 rounded-xl border flex flex-col justify-between space-y-2 hover:border-red-500/50 transition-colors ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1a1a1a] border-[#2a2a2a]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <FileText className="w-5 h-5 text-sky-400" />
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <div>
                      <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>Drafts</div>
                      <div className="text-[11px] text-gray-400">Unfinished messages</div>
                    </div>
                  </a>

                  <a
                    href="https://mail.google.com/mail/u/0/#starred"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-4 rounded-xl border flex flex-col justify-between space-y-2 hover:border-red-500/50 transition-colors ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1a1a1a] border-[#2a2a2a]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <div>
                      <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>Starred &amp; VIP</div>
                      <div className="text-[11px] text-gray-400">Priority clients</div>
                    </div>
                  </a>
                </div>

                {/* Instant Search In Gmail Tool */}
                <div className={`p-4 rounded-xl border space-y-2 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141414] border-[#262626]'
                }`}>
                  <div className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                    Search Customer in Personal Gmail
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter customer email or client name to search directly in Gmail..."
                      value={clientSearchQuery}
                      onChange={e => setClientSearchQuery(e.target.value)}
                      className={`flex-1 px-3 py-2 text-xs rounded-lg border focus:outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#1e1e1e] border-[#333] text-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!clientSearchQuery.trim()) return;
                        window.open(
                          `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(clientSearchQuery.trim())}`,
                          '_blank',
                          'noopener,noreferrer'
                        );
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Search Gmail</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PERSONAL ACCOUNT & SETUP */}
          {activeTab === 'setup' && (
            <div className="space-y-4">
              <div className={`p-5 rounded-xl border space-y-4 ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#161616] border-[#262626]'
              }`}>
                <div className="flex items-center justify-between border-b border-[#262626] pb-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-red-500" />
                    <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Personal Gmail Connection Settings
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Standalone Personal App
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Google OAuth (Personal Scopes) */}
                  <div className={`p-4 rounded-xl border space-y-3 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1a1a1a] border-[#262626]'
                  }`}>
                    <div className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                      Method 1: Sign-in with Google Account
                    </div>
                    <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                      Authenticates using standard personal Google credentials. No Workspace administrator approval required.
                    </p>
                    <button
                      onClick={handleConnectGoogle}
                      disabled={isConnecting}
                      className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      {isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      <span>{isConnected ? 'Reconnect / Switch Google Account' : 'Connect Personal Google Account'}</span>
                    </button>
                  </div>

                  {/* Manual Personal Email Address Connection */}
                  <div className={`p-4 rounded-xl border space-y-3 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1a1a1a] border-[#262626]'
                  }`}>
                    <div className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                      Method 2: Link Personal Gmail Address Directly
                    </div>
                    <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                      Specify your personal <code>@gmail.com</code> address to configure the sender identity and webmail links.
                    </p>
                    <form onSubmit={handleSaveManualEmail} className="flex gap-2">
                      <input
                        type="email"
                        placeholder="akash.mohite@gmail.com"
                        value={manualPersonalEmail}
                        onChange={e => setManualPersonalEmail(e.target.value)}
                        className={`flex-1 px-3 py-2 text-xs rounded-lg border focus:outline-none ${
                          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#141414] border-[#333] text-white'
                        }`}
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#bef264] hover:bg-[#a3e635] text-slate-950 font-bold text-xs rounded-lg transition-colors shrink-0"
                      >
                        Set Address
                      </button>
                    </form>
                  </div>
                </div>

                {/* Key Architectural Differences Summary */}
                <div className={`p-4 rounded-xl border space-y-2 ${
                  isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800/30'
                }`}>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>How Personal Gmail Integrates Differently from Google Workspace</span>
                  </div>
                  <ul className="text-xs text-gray-300 space-y-1.5 list-disc pl-5">
                    <li>
                      <strong>Zero Workspace Admin Lockout:</strong> Personal Gmail accounts (<span className="text-emerald-400">@gmail.com</span>) are not bound by organizational domain constraints.
                    </li>
                    <li>
                      <strong>Separate from System Automated Alerts:</strong> System notifications (e.g. quote generated, subcontractor work order, milestone reached) use the dedicated <strong>System Email &amp; Alerts</strong> engine under Settings, leaving your personal Gmail clean.
                    </li>
                    <li>
                      <strong>Direct Web App Launch:</strong> One-click button to compose or search client communications in your real Gmail tab.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t flex items-center justify-between shrink-0 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#161616] border-[#262626]'
        }`}>
          <div className="text-xs flex items-center gap-2 text-gray-400">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>Gmail Personal Email App &bull; Connected for Personal Communication</span>
          </div>

          <button
            onClick={onClose}
            className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-[#222] hover:bg-[#2c2c2c] text-white border-[#333]'
            }`}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
