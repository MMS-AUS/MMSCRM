import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Users,
  Mail,
  ArrowLeftRight,
  TrendingUp,
  Inbox,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Filter,
  Eye,
  MousePointer,
  MessageSquare,
  Sparkles,
  Search,
  Plus,
  Code
} from 'lucide-react';
import {
  getMailchimpSettings,
  saveMailchimpSettings,
  getMailchimpCampaigns,
  saveMailchimpCampaigns,
  getMailchimpTwoWayEmails,
  saveMailchimpTwoWayEmails,
  pingMailchimpApi,
  runMailchimpTwoWaySync,
  sendMailchimpMarketingCampaign,
  sendMailchimpDirectEmail,
  MailchimpPingResult,
  TwoWaySyncResult
} from '../../services/mailchimpService';
import {
  calculateSubscriberHash,
  buildMailchimpMemberPayload,
  getMailchimpAuthHeader,
  extractDatacenter
} from '../../utils/mailchimpSync';
import { MailchimpIntegrationSettings, MailchimpCampaign, MailchimpTwoWayEmail } from '../../types';

interface MailchimpSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'settings' | 'twoway' | 'campaigns' | 'inbox';
}

export const MailchimpSettingsModal: React.FC<MailchimpSettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'settings'
}) => {
  const { contacts, leads } = useApp();
  const [activeTab, setActiveTab] = useState<'settings' | 'twoway' | 'campaigns' | 'inbox'>(initialTab);

  const [settings, setSettings] = useState<MailchimpIntegrationSettings>(getMailchimpSettings);
  const [campaigns, setCampaigns] = useState<MailchimpCampaign[]>(getMailchimpCampaigns);
  const [emails, setEmails] = useState<MailchimpTwoWayEmail[]>(getMailchimpTwoWayEmails);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Ping test
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<MailchimpPingResult | null>(null);

  // Two-Way Sync
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<TwoWaySyncResult | null>(null);

  // Campaign Dispatch State
  const [campaignTitle, setCampaignTitle] = useState('2026 Spring Solar Battery Rebate Boost (NSW & QLD)');
  const [campaignSubject, setCampaignSubject] = useState('Claim up to $1,500 extra rebate on Tesla Powerwall 3 & Sungrow Batteries');
  const [campaignPreview, setCampaignPreview] = useState('Australian Government & State energy incentives updated for September 2026.');
  const [campaignSegment, setCampaignSegment] = useState<MailchimpCampaign['segment']>('All Leads & Clients');
  const [campaignBody, setCampaignBody] = useState(
    'Hi *|FNAME|*,\n\nGreat news! The NSW Peak Demand Reduction Scheme and QLD Battery Booster programs have released updated battery rebates. If your home or commercial premises has an existing or planned solar installation, you can claim up to $1,500 off your battery addition.\n\nReply directly to this email or speak with our CEC solar engineering team today.'
  );
  const [isDispatchingCampaign, setIsDispatchingCampaign] = useState(false);
  const [campaignSuccessMessage, setCampaignSuccessMessage] = useState<string | null>(null);

  // Email Inbox / Reply State
  const [inboxFilter, setInboxFilter] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedThread, setSelectedThread] = useState<MailchimpTwoWayEmail | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replySuccessMessage, setReplySuccessMessage] = useState<string | null>(null);

  // Direct Compose Modal state
  const [showDirectCompose, setShowDirectCompose] = useState(false);
  const [composeRecipientEmail, setComposeRecipientEmail] = useState('');
  const [composeRecipientName, setComposeRecipientName] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [isDirectSending, setIsDirectSending] = useState(false);

  // Inspector State for Mailchimp MD5 & Payload Verification
  const [inspectorEmail, setInspectorEmail] = useState('akash.mohite@gmail.com');
  const [showPayloadInspector, setShowPayloadInspector] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setSettings(getMailchimpSettings());
      setCampaigns(getMailchimpCampaigns());
      setEmails(getMailchimpTwoWayEmails());
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveMailchimpSettings(settings);
    setSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const handleTestPing = async () => {
    setIsPinging(true);
    setPingResult(null);
    try {
      const res = await pingMailchimpApi();
      setPingResult(res);
      if (res.success) {
        setSettings(prev => ({
          ...prev,
          totalSubscribers: res.totalSubscribers,
          audienceName: res.audienceName,
          serverPrefix: res.serverPrefix
        }));
      }
    } finally {
      setIsPinging(false);
    }
  };

  const handleExecuteTwoWaySync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await runMailchimpTwoWaySync(contacts, leads);
      setSyncResult(res);
      setSettings(getMailchimpSettings());
      setEmails(getMailchimpTwoWayEmails());
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDispatchingCampaign(true);
    setCampaignSuccessMessage(null);
    try {
      const res = await sendMailchimpMarketingCampaign(
        campaignTitle,
        campaignSubject,
        campaignPreview,
        campaignSegment,
        campaignBody
      );
      setCampaignSuccessMessage(res.message);
      setCampaigns(getMailchimpCampaigns());
      setEmails(getMailchimpTwoWayEmails());
    } finally {
      setIsDispatchingCampaign(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedThread || !replyText.trim()) return;
    setIsSendingReply(true);
    setReplySuccessMessage(null);
    try {
      await sendMailchimpDirectEmail(
        selectedThread.senderEmail,
        selectedThread.senderName,
        `Re: ${selectedThread.subject}`,
        replyText,
        selectedThread.contactId,
        selectedThread.leadId,
        selectedThread.isLead
      );
      setReplyText('');
      setReplySuccessMessage(`Reply delivered via Mailchimp/CRM sync to ${selectedThread.senderEmail}!`);
      setEmails(getMailchimpTwoWayEmails());
      setTimeout(() => setReplySuccessMessage(null), 4000);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleSendDirectCompose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeRecipientEmail || !composeSubject || !composeBody) return;
    setIsDirectSending(true);
    try {
      await sendMailchimpDirectEmail(
        composeRecipientEmail,
        composeRecipientName || composeRecipientEmail,
        composeSubject,
        composeBody
      );
      setEmails(getMailchimpTwoWayEmails());
      setShowDirectCompose(false);
      setComposeRecipientEmail('');
      setComposeRecipientName('');
      setComposeSubject('');
      setComposeBody('');
    } finally {
      setIsDirectSending(false);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 3000);
  };

  // Filtered emails for inbox
  const filteredEmails = emails.filter(em => {
    if (inboxFilter === 'inbound' && em.direction !== 'inbound') return false;
    if (inboxFilter === 'outbound' && em.direction !== 'outbound') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        em.subject.toLowerCase().includes(q) ||
        em.bodyText.toLowerCase().includes(q) ||
        em.senderName.toLowerCase().includes(q) ||
        em.senderEmail.toLowerCase().includes(q) ||
        em.recipientName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4">
      <div className="w-full max-w-5xl bg-[#1e1e1e] rounded-xl shadow-2xl border border-[#2d2d2d] overflow-hidden flex flex-col max-h-[92vh] text-[#e5e7eb]">
        {/* Header */}
        <div className="p-4 bg-[#161616] text-white flex items-center justify-between border-b border-[#262626]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white tracking-tight">
                  Mailchimp Marketing &amp; Two-Way Email Synchronization
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                  Two-Way Live Sync Active
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Audience: <span className="font-semibold text-white">{settings.audienceName}</span> &bull; Total Subscribers:{' '}
                <strong className="text-yellow-400">{settings.totalSubscribers.toLocaleString()}</strong> &bull; Synced CRM Contacts:{' '}
                <span className="text-emerald-400 font-bold">{settings.syncedClientsCount} clients</span> +{' '}
                <span className="text-blue-400 font-bold">{settings.syncedLeadsCount} leads</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#262626] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 bg-[#141414] border-b border-[#262626] overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'settings'
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>API &amp; Audience</span>
          </button>
          <button
            onClick={() => setActiveTab('twoway')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'twoway'
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Two-Way Sync Hub</span>
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'campaigns'
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Send Marketing Campaigns</span>
          </button>
          <button
            onClick={() => setActiveTab('inbox')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'inbox'
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Two-Way Email Inbox ({emails.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {savedSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Mailchimp configuration successfully updated!</span>
            </div>
          )}

          {/* TAB 1: API & Audience */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSave} className="space-y-5">
              <div className="p-4 bg-[#161616] border border-[#262626] rounded-xl flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-yellow-400" />
                    Mailchimp Master Audience Connection
                  </h4>
                  <p className="text-xs text-gray-400">
                    Connect your Mailchimp account to synchronize leads, contacts, marketing campaigns, and two-way email communications directly with the CRM.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTestPing}
                  disabled={isPinging}
                  className="px-3 py-1.5 rounded-lg bg-[#262626] hover:bg-[#333] text-gray-200 border border-[#333] text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-yellow-400 ${isPinging ? 'animate-spin' : ''}`} />
                  <span>{isPinging ? 'Connecting...' : 'Ping Mailchimp'}</span>
                </button>
              </div>

              {pingResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                    pingResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-red-500/10 border-red-500/30 text-red-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      {pingResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                      {pingResult.message}
                    </span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-black/30 font-semibold">
                      {pingResult.latencyMs}ms Latency
                    </span>
                  </div>
                  {pingResult.success && (
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px] pt-1 text-gray-300 border-t border-emerald-500/20">
                      <div>Data Center: <strong className="font-mono">{pingResult.serverPrefix}</strong></div>
                      <div>Audience: <strong>{pingResult.audienceName}</strong></div>
                      <div>Total Subscribers: <strong>{pingResult.totalSubscribers.toLocaleString()}</strong></div>
                      <div>Campaigns: <strong>{pingResult.campaignsCount} Active</strong></div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Mailchimp API Key (including datacenter prefix) <span className="text-yellow-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={settings.apiKey}
                    onChange={e => setSettings({ ...settings, apiKey: e.target.value })}
                    className="w-full text-xs font-mono bg-[#121212] border border-[#2d2d2d] rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                    placeholder="98bf31920acde881290312014-us21"
                    required
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Generated under Mailchimp Profile &gt; Extras &gt; API Keys</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Target Audience / List ID <span className="text-yellow-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={settings.audienceId}
                    onChange={e => setSettings({ ...settings, audienceId: e.target.value })}
                    className="w-full text-xs font-mono bg-[#121212] border border-[#2d2d2d] rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                    placeholder="a7bc92f140"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Audience Display Label
                  </label>
                  <input
                    type="text"
                    value={settings.audienceName}
                    onChange={e => setSettings({ ...settings, audienceName: e.target.value })}
                    className="w-full text-xs bg-[#121212] border border-[#2d2d2d] rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                    placeholder="SolarFlow AU Master Clients & Leads"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Default "From" Sender Name
                  </label>
                  <input
                    type="text"
                    value={settings.fromName}
                    onChange={e => setSettings({ ...settings, fromName: e.target.value })}
                    className="w-full text-xs bg-[#121212] border border-[#2d2d2d] rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                    placeholder="SolarFlow Australia Energy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Default "From" Email Address (Verified Domain)
                  </label>
                  <input
                    type="email"
                    value={settings.fromEmail}
                    onChange={e => setSettings({ ...settings, fromEmail: e.target.value })}
                    className="w-full text-xs font-mono bg-[#121212] border border-[#2d2d2d] rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                    placeholder="marketing@solarinstallers.com.au"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-[#262626]">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg text-xs shadow-md transition-colors"
                >
                  Save Mailchimp Settings
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Two-Way Sync Hub */}
          {activeTab === 'twoway' && (
            <div className="space-y-5">
              {/* Architecture diagram card */}
              <div className="p-4 bg-gradient-to-br from-[#1c1a14] via-[#161616] to-[#121212] border border-yellow-500/30 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4 text-yellow-400" />
                      Two-Way Synchronization Engine
                    </h4>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Synchronize customer and lead email correspondence bi-directionally between Mailchimp and your CRM database.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExecuteTwoWaySync}
                    disabled={isSyncing}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg text-xs flex items-center gap-2 shrink-0 shadow-md transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Synchronizing Two-Way...' : 'Run Full Two-Way Sync Now'}</span>
                  </button>
                </div>

                <div className="p-3 bg-black/40 rounded-lg border border-yellow-500/20 flex flex-col md:flex-row items-center justify-between text-xs gap-3">
                  <div className="text-center md:text-left">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block">Source CRM</span>
                    <strong className="text-white">SolarFlow CRM (Leads &amp; Contacts)</strong>
                  </div>
                  <div className="flex items-center gap-2 text-yellow-400 font-mono text-[11px] font-bold">
                    <span>&larr; Inbound Email Replies</span>
                    <ArrowLeftRight className="w-4 h-4 text-yellow-400 shrink-0" />
                    <span>Outbound Campaigns &rarr;</span>
                  </div>
                  <div className="text-center md:text-right">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block">Target Platform</span>
                    <strong className="text-white">Mailchimp API v3.0 (Audience {settings.audienceId})</strong>
                  </div>
                </div>
              </div>

              {syncResult && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2 text-xs text-emerald-300">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Two-Way Synchronization Complete!
                    </span>
                    <span className="text-[11px] font-mono text-gray-400">
                      {new Date(syncResult.syncTimestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-gray-300 pl-4 list-disc">
                    {syncResult.logMessages.map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sync Configuration Options */}
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[#161616] border border-[#262626] cursor-pointer hover:border-[#333]">
                  <input
                    type="checkbox"
                    checked={settings.twoWayEmailSyncEnabled}
                    onChange={e => {
                      const updated = { ...settings, twoWayEmailSyncEnabled: e.target.checked };
                      setSettings(updated);
                      saveMailchimpSettings(updated);
                    }}
                    className="mt-1 rounded bg-[#121212] border-gray-600 text-yellow-500 focus:ring-yellow-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Enable Two-Way Email Synchronisation (Send &amp; Receive via CRM and Mailchimp)
                    </span>
                    <span className="text-[11px] text-gray-400 block mt-0.5">
                      Ingests customer replies to marketing campaigns directly into the CRM customer record timeline, and allows sales representatives to reply directly through the CRM with instant Mailchimp logging.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[#161616] border border-[#262626] cursor-pointer hover:border-[#333]">
                  <input
                    type="checkbox"
                    checked={settings.autoSyncNewLeads}
                    onChange={e => {
                      const updated = { ...settings, autoSyncNewLeads: e.target.checked };
                      setSettings(updated);
                      saveMailchimpSettings(updated);
                    }}
                    className="mt-1 rounded bg-[#121212] border-gray-600 text-yellow-500 focus:ring-yellow-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Auto-Push Meta Ads &amp; Website Leads into Mailchimp Audience
                    </span>
                    <span className="text-[11px] text-gray-400 block mt-0.5">
                      New inbound solar leads from Meta Lead Forms or Google Ads are instantly tagged as <code className="text-yellow-300 font-mono">Lead - Meta Ads</code> with automated nurture sequence activation.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[#161616] border border-[#262626] cursor-pointer hover:border-[#333]">
                  <input
                    type="checkbox"
                    checked={settings.autoSyncNewClients}
                    onChange={e => {
                      const updated = { ...settings, autoSyncNewClients: e.target.checked };
                      setSettings(updated);
                      saveMailchimpSettings(updated);
                    }}
                    className="mt-1 rounded bg-[#121212] border-gray-600 text-yellow-500 focus:ring-yellow-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Auto-Push Signed Clients into Existing Client Segment
                    </span>
                    <span className="text-[11px] text-gray-400 block mt-0.5">
                      Customers who sign OpenSolar proposals are upgraded to <code className="text-emerald-300 font-mono">Client - Active</code> with system size kW merge tags for warranty reminders and battery cross-selling.
                    </span>
                  </div>
                </label>
              </div>

              {/* Merge Fields Mapping */}
              <div className="p-4 bg-[#161616] border border-[#262626] rounded-xl space-y-3">
                <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                  Active Two-Way Merge Field Mappings
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
                  <div className="p-2.5 bg-[#121212] border border-[#262626] rounded-lg">
                    <span className="font-mono text-yellow-300 font-bold block">*|FNAME|* &amp; *|LNAME|*</span>
                    <span className="text-gray-400">Customer First &amp; Last Name</span>
                  </div>
                  <div className="p-2.5 bg-[#121212] border border-[#262626] rounded-lg">
                    <span className="font-mono text-yellow-300 font-bold block">*|STATE|* &amp; *|SUBURB|*</span>
                    <span className="text-gray-400">NEM Distribution Network Area</span>
                  </div>
                  <div className="p-2.5 bg-[#121212] border border-[#262626] rounded-lg">
                    <span className="font-mono text-yellow-300 font-bold block">*|SYSTEM_KW|*</span>
                    <span className="text-gray-400">Installed Solar Capacity (kW)</span>
                  </div>
                </div>
              </div>

              {/* Mailchimp API Payload & Subscriber Hash Inspector */}
              <div className="p-4 bg-[#161616] border border-yellow-500/30 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-yellow-400" />
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                      Mailchimp API Payload, MD5 Hash &amp; Auth Header Inspector
                    </h5>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPayloadInspector(!showPayloadInspector)}
                    className="text-[11px] text-yellow-400 hover:text-yellow-300 font-medium cursor-pointer"
                  >
                    {showPayloadInspector ? 'Hide Inspector' : 'Show Inspector'}
                  </button>
                </div>

                {showPayloadInspector && (
                  <div className="space-y-4 pt-1">
                    <p className="text-[11px] text-gray-400">
                      Live verification of Mailchimp API v3.0 subscriber hash calculation, Base64 HTTP Basic Authentication, and JSON payload construction.
                    </p>

                    {/* Interactive Hash Calculator */}
                    <div className="p-3 bg-[#121212] border border-[#262626] rounded-lg space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="text-[11px] font-semibold text-gray-300">
                          Subscriber Email Hash Verification:
                        </label>
                        <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded">
                          RFC 1321 MD5 Hex Digest (lowercase, trimmed)
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="email"
                          value={inspectorEmail}
                          onChange={e => setInspectorEmail(e.target.value)}
                          className="flex-1 text-xs font-mono bg-[#181818] border border-[#333] rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-yellow-400"
                          placeholder="e.g. akash.mohite@gmail.com"
                        />
                      </div>
                      <div className="p-2 bg-black/60 rounded border border-[#222] font-mono text-[11px] space-y-1">
                        <div className="text-gray-400 flex items-center justify-between flex-wrap gap-1">
                          <span>subscriber_hash:</span>
                          <span className="text-yellow-300 font-bold selection:bg-yellow-500 selection:text-black">
                            {calculateSubscriberHash(inspectorEmail || 'akash.mohite@gmail.com')}
                          </span>
                        </div>
                        <div className="text-gray-500 text-[10px]">
                          PUT /3.0/lists/{settings.audienceId || 'a7bc92f140'}/members/{calculateSubscriberHash(inspectorEmail || 'akash.mohite@gmail.com')}
                        </div>
                      </div>
                    </div>

                    {/* Authentication Header Preview */}
                    <div className="p-3 bg-[#121212] border border-[#262626] rounded-lg space-y-1.5 font-mono text-[11px]">
                      <div className="flex items-center justify-between text-gray-400">
                        <span className="text-[11px] font-semibold text-gray-300 font-sans">HTTP Basic Authorization Header:</span>
                        <span className="text-[10px] text-yellow-400">Base64(anystring:apiKey)</span>
                      </div>
                      <div className="p-2 bg-black/60 rounded border border-[#222] text-emerald-400 break-all text-[11px]">
                        {getMailchimpAuthHeader(settings.apiKey).Authorization}
                      </div>
                    </div>

                    {/* Sample Payload Preview */}
                    <div className="p-3 bg-[#121212] border border-[#262626] rounded-lg space-y-1.5">
                      <div className="flex items-center justify-between text-gray-300 text-xs">
                        <span className="font-semibold">Constructed Mailchimp Member Payload (PUT Body):</span>
                        <span className="text-[10px] text-gray-400 font-mono">status_if_new: subscribed</span>
                      </div>
                      <pre className="p-2.5 bg-black/60 rounded border border-[#222] font-mono text-[10px] text-gray-300 overflow-x-auto max-h-48 leading-relaxed">
                        {JSON.stringify(
                          buildMailchimpMemberPayload(
                            contacts[0] || {
                              name: 'Akash Mohite',
                              email: inspectorEmail || 'akash.mohite@gmail.com',
                              phone: '0412345678',
                              state: 'NSW',
                              postcode: '2000',
                              type: 'Residential'
                            },
                            {
                              tags: ['Client - Active', 'Residential Solar'],
                              statusIfNew: 'subscribed'
                            }
                          ),
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Send Marketing Campaigns */}
          {activeTab === 'campaigns' && (
            <div className="space-y-6">
              {/* Campaign Composer Form */}
              <form onSubmit={handleSendCampaign} className="p-4 sm:p-5 bg-[#161616] border border-[#262626] rounded-xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    Compose &amp; Dispatch Marketing Email via Mailchimp API
                  </h4>
                  <span className="text-xs text-gray-400">
                    Sender: <strong className="text-white">{settings.fromName}</strong> ({settings.fromEmail})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Target Audience Segment <span className="text-yellow-400">*</span>
                    </label>
                    <select
                      value={campaignSegment}
                      onChange={e => setCampaignSegment(e.target.value as any)}
                      className="w-full text-xs bg-[#121212] border border-[#2d2d2d] rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                    >
                      <option value="All Leads & Clients">All Leads &amp; Existing Clients (1,420 contacts)</option>
                      <option value="Existing Clients">Existing Solar Clients Only (185 customers)</option>
                      <option value="Meta Ads Leads">Meta Ads &amp; Web Inbound Leads (48 prospects)</option>
                      <option value="NSW Region">NSW Homeowners &amp; Commercial</option>
                      <option value="QLD Region">QLD Homeowners &amp; Commercial</option>
                      <option value="Battery Upgrade Prospects">Battery Upgrade Prospects</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Internal Campaign Title <span className="text-yellow-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={campaignTitle}
                      onChange={e => setCampaignTitle(e.target.value)}
                      className="w-full text-xs bg-[#121212] border border-[#2d2d2d] rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Email Subject Line <span className="text-yellow-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={campaignSubject}
                      onChange={e => setCampaignSubject(e.target.value)}
                      className="w-full text-xs bg-[#121212] border border-[#2d2d2d] rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Inbox Preview Snippet Text
                    </label>
                    <input
                      type="text"
                      value={campaignPreview}
                      onChange={e => setCampaignPreview(e.target.value)}
                      className="w-full text-xs bg-[#121212] border border-[#2d2d2d] rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Email Content Body (Supports *|FNAME|* personalization)
                    </label>
                    <textarea
                      rows={4}
                      value={campaignBody}
                      onChange={e => setCampaignBody(e.target.value)}
                      className="w-full text-xs bg-[#121212] border border-[#2d2d2d] rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400 font-sans leading-relaxed"
                      required
                    />
                  </div>
                </div>

                {campaignSuccessMessage && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{campaignSuccessMessage}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-[#262626]">
                  <span className="text-[11px] text-gray-400">
                    Two-Way replies from this campaign will land in the CRM inbox automatically.
                  </span>
                  <button
                    type="submit"
                    disabled={isDispatchingCampaign}
                    className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg text-xs flex items-center gap-2 shadow-md transition-colors"
                  >
                    <Send className={`w-3.5 h-3.5 ${isDispatchingCampaign ? 'animate-bounce' : ''}`} />
                    <span>{isDispatchingCampaign ? 'Dispatching Campaign...' : 'Send Marketing Email via Mailchimp'}</span>
                  </button>
                </div>
              </form>

              {/* Past Campaigns Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">Campaign Performance &amp; Engagement Logs</h4>
                  <span className="text-xs text-gray-400">{campaigns.length} campaigns</span>
                </div>

                <div className="space-y-2.5">
                  {campaigns.map(cmp => (
                    <div
                      key={cmp.id}
                      className="p-4 bg-[#161616] border border-[#262626] rounded-xl hover:border-yellow-500/30 transition-all space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-white">{cmp.title}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                cmp.status === 'SENT'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              }`}
                            >
                              {cmp.status}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#262626] text-gray-300">
                              {cmp.segment}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">{cmp.subjectLine}</p>
                        </div>
                        <span className="text-xs text-gray-400 font-mono shrink-0">
                          {new Date(cmp.sentAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#262626] text-xs">
                        <div className="p-2 bg-[#121212] rounded-lg">
                          <span className="text-[10px] text-gray-500 block">Recipients</span>
                          <strong className="text-white font-mono">{cmp.recipientsCount.toLocaleString()}</strong>
                        </div>
                        <div className="p-2 bg-[#121212] rounded-lg">
                          <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Eye className="w-3 h-3 text-emerald-400" /> Open Rate
                          </span>
                          <strong className="text-emerald-400 font-mono">{cmp.openRatePercent}%</strong>
                        </div>
                        <div className="p-2 bg-[#121212] rounded-lg">
                          <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <MousePointer className="w-3 h-3 text-blue-400" /> Click Rate
                          </span>
                          <strong className="text-blue-400 font-mono">{cmp.clickRatePercent}%</strong>
                        </div>
                        <div className="p-2 bg-[#121212] rounded-lg">
                          <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-yellow-400" /> 2-Way Replies
                          </span>
                          <strong className="text-yellow-400 font-mono">{cmp.repliesCount} replies</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Two-Way Email Inbox */}
          {activeTab === 'inbox' && (
            <div className="space-y-4">
              {/* Inbox Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#161616] border border-[#262626] rounded-xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setInboxFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      inboxFilter === 'all'
                        ? 'bg-yellow-500 text-black font-bold'
                        : 'bg-[#262626] text-gray-300 hover:text-white'
                    }`}
                  >
                    All Messages ({emails.length})
                  </button>
                  <button
                    onClick={() => setInboxFilter('inbound')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      inboxFilter === 'inbound'
                        ? 'bg-yellow-500 text-black font-bold'
                        : 'bg-[#262626] text-gray-300 hover:text-white'
                    }`}
                  >
                    Customer Replies Inbound ({emails.filter(e => e.direction === 'inbound').length})
                  </button>
                  <button
                    onClick={() => setInboxFilter('outbound')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      inboxFilter === 'outbound'
                        ? 'bg-yellow-500 text-black font-bold'
                        : 'bg-[#262626] text-gray-300 hover:text-white'
                    }`}
                  >
                    Outbound Dispatches ({emails.filter(e => e.direction === 'outbound').length})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-56">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search emails..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-1.5 bg-[#121212] border border-[#2d2d2d] rounded-lg text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                  <button
                    onClick={() => setShowDirectCompose(true)}
                    className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg text-xs flex items-center gap-1 shrink-0 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Compose Direct</span>
                  </button>
                </div>
              </div>

              {/* Email Threads List */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* List column */}
                <div className={`${selectedThread ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-2`}>
                  {filteredEmails.map(em => (
                    <div
                      key={em.id}
                      onClick={() => setSelectedThread(em)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-1.5 ${
                        selectedThread?.id === em.id
                          ? 'bg-yellow-500/10 border-yellow-500/50'
                          : 'bg-[#161616] border-[#262626] hover:border-[#3d3d3d]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              em.direction === 'inbound'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {em.direction === 'inbound' ? 'INBOUND REPLY' : 'OUTBOUND'}
                          </span>
                          <span className="font-bold text-xs text-white">
                            {em.direction === 'inbound' ? em.senderName : em.recipientName}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {new Date(em.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      <h5 className="text-xs font-semibold text-gray-200 line-clamp-1">{em.subject}</h5>
                      <p className="text-[11px] text-gray-400 line-clamp-2">{em.bodyText}</p>

                      {em.tags && (
                        <div className="flex items-center gap-1 pt-1 flex-wrap">
                          {em.tags.map(t => (
                            <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#262626] text-gray-300">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Selected Thread Detail & Quick Reply */}
                {selectedThread && (
                  <div className="lg:col-span-7 bg-[#161616] border border-[#262626] rounded-xl p-4 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3 border-b border-[#262626] pb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-white">{selectedThread.subject}</h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                selectedThread.direction === 'inbound'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-blue-500/20 text-blue-300'
                              }`}
                            >
                              {selectedThread.direction === 'inbound' ? 'Inbound Customer Reply' : 'Outbound Campaign'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            From: <span className="text-white font-medium">{selectedThread.senderName}</span> ({selectedThread.senderEmail}) &bull; To:{' '}
                            <span className="text-white font-medium">{selectedThread.recipientName}</span> ({selectedThread.recipientEmail})
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedThread(null)}
                          className="text-gray-400 hover:text-white p-1 rounded-lg text-xs"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Email Body display */}
                      <div className="p-3.5 bg-[#121212] border border-[#262626] rounded-lg text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">
                        {selectedThread.bodyText}
                      </div>

                      {selectedThread.campaignTitle && (
                        <div className="text-[11px] text-gray-400 flex items-center gap-1.5 p-2 rounded bg-black/30 border border-[#262626]">
                          <TrendingUp className="w-3.5 h-3.5 text-yellow-400" />
                          <span>Generated from Campaign: <strong>{selectedThread.campaignTitle}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Quick Reply Form */}
                    <div className="space-y-2 pt-3 border-t border-[#262626]">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Send className="w-3.5 h-3.5 text-yellow-400" />
                          Reply Directly via Mailchimp/CRM Two-Way Sync
                        </label>
                        <span className="text-[10px] text-gray-400">
                          Dispatches from {settings.fromEmail}
                        </span>
                      </div>

                      <textarea
                        rows={3}
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder={`Reply to ${selectedThread.senderName}...`}
                        className="w-full text-xs bg-[#121212] border border-[#2d2d2d] rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400 resize-none"
                      />

                      {replySuccessMessage && (
                        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{replySuccessMessage}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleSendReply}
                          disabled={isSendingReply || !replyText.trim()}
                          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-black font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Send className={`w-3.5 h-3.5 ${isSendingReply ? 'animate-bounce' : ''}`} />
                          <span>{isSendingReply ? 'Dispatching...' : 'Send Two-Way Reply'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Compose Modal */}
              {showDirectCompose && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
                  <form
                    onSubmit={handleSendDirectCompose}
                    className="w-full max-w-lg bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] p-5 space-y-4 shadow-2xl"
                  >
                    <div className="flex items-center justify-between border-b border-[#262626] pb-3">
                      <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        <Mail className="w-4 h-4 text-yellow-400" />
                        Compose Direct Customer Email (Mailchimp Synced)
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowDirectCompose(false)}
                        className="text-gray-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">
                          Recipient Email <span className="text-yellow-400">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={composeRecipientEmail}
                          onChange={e => setComposeRecipientEmail(e.target.value)}
                          placeholder="client@example.com.au"
                          className="w-full text-xs font-mono bg-[#121212] border border-[#2d2d2d] rounded-lg p-2 text-white focus:outline-none focus:border-yellow-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">
                          Recipient Name
                        </label>
                        <input
                          type="text"
                          value={composeRecipientName}
                          onChange={e => setComposeRecipientName(e.target.value)}
                          placeholder="Harrison Davies"
                          className="w-full text-xs bg-[#121212] border border-[#2d2d2d] rounded-lg p-2 text-white focus:outline-none focus:border-yellow-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">
                          Subject <span className="text-yellow-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={composeSubject}
                          onChange={e => setComposeSubject(e.target.value)}
                          placeholder="Solar Installation Update & Warranty Document"
                          className="w-full text-xs bg-[#121212] border border-[#2d2d2d] rounded-lg p-2 text-white focus:outline-none focus:border-yellow-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">
                          Message Body <span className="text-yellow-400">*</span>
                        </label>
                        <textarea
                          rows={4}
                          required
                          value={composeBody}
                          onChange={e => setComposeBody(e.target.value)}
                          placeholder="Hi Harrison, writing to update you on..."
                          className="w-full text-xs bg-[#121212] border border-[#2d2d2d] rounded-lg p-2 text-white focus:outline-none focus:border-yellow-400 resize-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#262626]">
                      <button
                        type="button"
                        onClick={() => setShowDirectCompose(false)}
                        className="px-4 py-2 bg-[#262626] hover:bg-[#333] text-gray-300 rounded-lg text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isDirectSending}
                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isDirectSending ? 'Sending...' : 'Dispatch Email'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
