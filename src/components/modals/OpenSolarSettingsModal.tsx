import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sun,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Layers,
  FileText,
  ExternalLink,
  Lock,
  Globe,
  Copy,
  Check,
  Building,
  Zap,
  Download,
  Info,
  ChevronRight,
  ShieldCheck,
  Clock,
  Send,
  Database,
  Play
} from 'lucide-react';
import {
  getOpenSolarSettings,
  saveOpenSolarSettings,
  getOpenSolarProposals,
  saveOpenSolarProposals,
  pingOpenSolarApi,
  OpenSolarPingResult,
  fetchOpenSolarServerConfig,
  saveOpenSolarServerConfig,
  setupOpenSolarWebhook,
  triggerOpenSolarBulkSync,
  fetchSyncQueueStats,
  triggerProcessQueue
} from '../../services/openSolarService';
import { OpenSolarIntegrationSettings, OpenSolarSyncedProposal, SyncQueueStats } from '../../types';

interface OpenSolarSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'settings' | 'webhooks' | 'bulk_sync' | 'contracts' | 'proposals';
}

export const OpenSolarSettingsModal: React.FC<OpenSolarSettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'settings'
}) => {
  const { projects, setSelectedPreviewProposalUrl } = useApp();
  const [activeTab, setActiveTab] = useState<'settings' | 'webhooks' | 'bulk_sync' | 'contracts' | 'proposals'>(initialTab);

  const [settings, setSettings] = useState<OpenSolarIntegrationSettings>(getOpenSolarSettings);
  const [proposals, setProposals] = useState<OpenSolarSyncedProposal[]>(getOpenSolarProposals);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Server state
  const [appUrl, setAppUrl] = useState<string>(
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  );
  const [integrationUserId, setIntegrationUserId] = useState<string>('crm_integration');
  const [webhookRegisteredId, setWebhookRegisteredId] = useState<string | null>(null);
  const [isRegisteringWebhook, setIsRegisteringWebhook] = useState(false);
  const [webhookMessage, setWebhookMessage] = useState<{ success: boolean; message: string } | null>(null);

  // Ping test state
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<OpenSolarPingResult | null>(null);

  // Queue state
  const [queueStats, setQueueStats] = useState<SyncQueueStats | null>(null);
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const [bulkSyncResult, setBulkSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(getOpenSolarSettings());
      setProposals(getOpenSolarProposals());
      setActiveTab(initialTab);

      // Fetch latest server config & queue stats
      fetchOpenSolarServerConfig().then(res => {
        if (res.success) {
          if (res.orgId) setSettings(s => ({ ...s, orgId: res.orgId || s.orgId }));
          if (res.webhookId) setWebhookRegisteredId(res.webhookId);
          if (res.queueStats) setQueueStats(res.queueStats);
        }
      });
      fetchSyncQueueStats().then(stats => {
        if (stats) setQueueStats(stats);
      });
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveOpenSolarSettings(settings);
    setSettings(updated);

    // Save to server database / fallback
    const res = await saveOpenSolarServerConfig({
      org_id: settings.orgId,
      api_token: settings.apiKey,
      integration_user_id: integrationUserId
    });

    if (res.success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    }
  };

  const handleTestPing = async () => {
    setIsPinging(true);
    setPingResult(null);
    try {
      const res = await pingOpenSolarApi();
      setPingResult(res);
    } finally {
      setIsPinging(false);
    }
  };

  const handleRegisterWebhook = async () => {
    setIsRegisteringWebhook(true);
    setWebhookMessage(null);
    try {
      const res = await setupOpenSolarWebhook(appUrl);
      if (res.success) {
        setWebhookRegisteredId(res.webhookId || 'wh-registered');
        setWebhookMessage({
          success: true,
          message: `Webhook successfully registered with OpenSolar (ID: ${res.webhookId || 'Active'})! Inbound events are live.`
        });
      } else {
        setWebhookMessage({
          success: false,
          message: res.error || 'Failed to register webhook. Verify OpenSolar API Token permissions.'
        });
      }
    } finally {
      setIsRegisteringWebhook(false);
    }
  };

  const handleTriggerBulkSync = async () => {
    setIsBulkSyncing(true);
    setBulkSyncResult(null);
    try {
      // Enqueue all CRM projects into sync_queue
      const res = await triggerOpenSolarBulkSync('project', projects, 'update');
      if (res.success) {
        setBulkSyncResult({
          success: true,
          message: `HTTP 202 Accepted: ${projects.length} project records enqueued for background synchronization.`
        });
        const updatedStats = await fetchSyncQueueStats();
        if (updatedStats) setQueueStats(updatedStats);
      } else {
        setBulkSyncResult({
          success: false,
          message: res.error || 'Bulk sync request failed.'
        });
      }
    } finally {
      setIsBulkSyncing(false);
    }
  };

  const handleProcessQueueNow = async () => {
    setIsProcessingQueue(true);
    try {
      await triggerProcessQueue(20);
      const updatedStats = await fetchSyncQueueStats();
      if (updatedStats) setQueueStats(updatedStats);
    } finally {
      setIsProcessingQueue(false);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 3000);
  };

  const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/webhooks/opensolar`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4">
      <div className="w-full max-w-4xl bg-[#1e1e1e] rounded-xl shadow-2xl border border-[#2d2d2d] overflow-hidden flex flex-col max-h-[92vh] text-[#e5e7eb]">
        {/* Header */}
        <div className="p-4 bg-[#161616] text-white flex items-center justify-between border-b border-[#262626]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <Sun className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white tracking-tight">
                  OpenSolar 2-Way Synchronization &amp; Contract Automation
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  Bidirectional Sync
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Org: <span className="font-mono text-white font-semibold">{settings.orgId || 'Not Configured'}</span> | Webhook:{' '}
                <span className={`font-mono ${webhookRegisteredId ? 'text-emerald-300' : 'text-gray-400'}`}>
                  {webhookRegisteredId ? 'Active' : 'Unregistered'}
                </span>
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
                ? 'border-orange-400 text-orange-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>API &amp; Environment</span>
          </button>
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'webhooks'
                ? 'border-orange-400 text-orange-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Webhooks &amp; Loop Prevention</span>
          </button>
          <button
            onClick={() => setActiveTab('bulk_sync')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'bulk_sync'
                ? 'border-orange-400 text-orange-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Bulk Sync &amp; Queue ({queueStats?.total ?? 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('contracts')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'contracts'
                ? 'border-orange-400 text-orange-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Signed Contracts &amp; Documents</span>
          </button>
          <button
            onClick={() => setActiveTab('proposals')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'proposals'
                ? 'border-orange-400 text-orange-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Proposal Viewer</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {savedSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>OpenSolar configuration successfully updated and saved to Supabase!</span>
            </div>
          )}

          {/* TAB 1: API & Environment */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSave} className="space-y-5">
              <div className="p-4 bg-[#161616] border border-[#262626] rounded-xl flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Building className="w-4 h-4 text-orange-400" />
                    OpenSolar Environment &amp; API Configuration
                  </h4>
                  <p className="text-xs text-gray-400">
                    Configure your OpenSolar organization credentials for automated 2-way sync across Projects, Contacts, Companies, and Leads.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTestPing}
                  disabled={isPinging}
                  className="px-3 py-1.5 rounded-lg bg-[#262626] hover:bg-[#333] text-gray-200 border border-[#333] text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-orange-400 ${isPinging ? 'animate-spin' : ''}`} />
                  <span>{isPinging ? 'Testing...' : 'Test Connection'}</span>
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1 text-gray-300 border-t border-emerald-500/20">
                      <div>Organization: <strong>{settings.orgId}</strong></div>
                      <div>Gateway: <strong>api.opensolar.com</strong></div>
                      <div>Status: <strong>Authenticated Bearer</strong></div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    OpenSolar Organization ID (<span className="font-mono text-orange-300">OPENSOLAR_ORG_ID</span>) <span className="text-orange-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={settings.orgId}
                    onChange={e => setSettings({ ...settings, orgId: e.target.value })}
                    className="w-full text-xs font-mono bg-[#121212] border border-[#2d2d2d] rounded-lg p-2.5 text-white focus:outline-none focus:border-orange-400"
                    placeholder="OS-ORG-84920"
                    required
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Found in OpenSolar Control &gt; Company &gt; Business Settings</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    CRM Base Application URL (<span className="font-mono text-orange-300">NEXT_PUBLIC_APP_URL</span>)
                  </label>
                  <input
                    type="text"
                    value={appUrl}
                    onChange={e => setAppUrl(e.target.value)}
                    className="w-full text-xs font-mono bg-[#121212] border border-[#2d2d2d] rounded-lg p-2.5 text-white focus:outline-none focus:border-orange-400"
                    placeholder="http://localhost:3000"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Used by OpenSolar to dispatch inbound webhooks</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    OpenSolar Bearer API Token (<span className="font-mono text-orange-300">OPENSOLAR_API_TOKEN</span>) <span className="text-orange-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={settings.apiKey}
                      onChange={e => setSettings({ ...settings, apiKey: e.target.value })}
                      className="w-full text-xs font-mono bg-[#121212] border border-[#2d2d2d] rounded-lg p-2.5 pr-24 text-white focus:outline-none focus:border-orange-400"
                      placeholder="Bearer token from paid OpenSolar account"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-gray-500">
                      Authorization
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Note: OpenSolar API access requires an opted-in paid plan on OpenSolar.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Dedicated Integration User / Actor ID (For Loop Prevention Strategy 2)
                  </label>
                  <input
                    type="text"
                    value={integrationUserId}
                    onChange={e => setIntegrationUserId(e.target.value)}
                    className="w-full text-xs font-mono bg-[#121212] border border-[#2d2d2d] rounded-lg p-2.5 text-white focus:outline-none focus:border-orange-400"
                    placeholder="crm_integration"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Dedicated OpenSolar account name or user ID. Webhooks originating from this actor will be safely dropped to avoid infinite echo loops.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-lg hover:bg-[#262626] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-orange-500 hover:bg-orange-600 text-white shadow-lg transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Inbound Webhooks & Loop Prevention */}
          {activeTab === 'webhooks' && (
            <div className="space-y-6">
              <div className="p-4 bg-[#161616] border border-[#262626] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-orange-400" />
                    OpenSolar Webhook Receiver (<span className="font-mono text-orange-300">/api/webhooks/opensolar</span>)
                  </h4>
                  <p className="text-xs text-gray-400">
                    Real-time inbound synchronization for Project updates, Contacts, and digital contract signing events.
                  </p>
                </div>
                <button
                  onClick={handleRegisterWebhook}
                  disabled={isRegisteringWebhook}
                  className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-2 transition-colors shrink-0"
                >
                  <Send className={`w-3.5 h-3.5 ${isRegisteringWebhook ? 'animate-pulse' : ''}`} />
                  <span>{isRegisteringWebhook ? 'Registering...' : 'Register Webhook with OpenSolar'}</span>
                </button>
              </div>

              {webhookMessage && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                    webhookMessage.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-red-500/10 border-red-500/30 text-red-300'
                  }`}
                >
                  {webhookMessage.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <span>{webhookMessage.message}</span>
                </div>
              )}

              {/* Endpoint URL Card */}
              <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300">Target Webhook URL</span>
                  <button
                    onClick={() => copyToClipboard(webhookUrl, 'webhookUrl')}
                    className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
                  >
                    {copiedField === 'webhookUrl' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === 'webhookUrl' ? 'Copied' : 'Copy URL'}</span>
                  </button>
                </div>
                <div className="font-mono text-xs p-2.5 bg-black/40 border border-[#262626] rounded-lg text-emerald-300 break-all">
                  {webhookUrl}
                </div>
                <div className="text-[11px] text-gray-400 flex flex-wrap gap-4">
                  <span>Trigger Fields: <strong className="text-gray-200">project.*, contact.*, quote.*</strong></span>
                  <span>Events: <strong className="text-gray-200">CREATE, UPDATE, DELETE</strong></span>
                </div>
              </div>

              {/* Loop Prevention Strategies Info Cards */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Active Infinite Loop Prevention Architecture
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-[#161616] border border-[#262626] rounded-xl space-y-1.5">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Strategy 1
                    </span>
                    <h5 className="text-xs font-bold text-white pt-1">Payload Diffing</h5>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Before upserting, the receiver queries existing records via <span className="font-mono text-orange-300">os_id</span> and diffs state values. Identical echoes are dropped with a 200 OK.
                    </p>
                  </div>

                  <div className="p-3.5 bg-[#161616] border border-[#262626] rounded-xl space-y-1.5">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Strategy 2
                    </span>
                    <h5 className="text-xs font-bold text-white pt-1">Actor Filtering</h5>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Inspects the payload's <span className="font-mono text-orange-300">user_id</span> / actor. If changes originated from the dedicated CRM Integration user, the webhook is immediately dropped.
                    </p>
                  </div>

                  <div className="p-3.5 bg-[#161616] border border-[#262626] rounded-xl space-y-1.5">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Strategy 3
                    </span>
                    <h5 className="text-xs font-bold text-white pt-1">Source Origin Flag</h5>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Database columns track <span className="font-mono text-orange-300">last_updated_by = 'webhook'</span> vs <span className="font-mono text-orange-300">'crm_user'</span>. Outbound sync halts if updated by webhook.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Bulk Sync & Asynchronous Queue */}
          {activeTab === 'bulk_sync' && (
            <div className="space-y-6">
              <div className="p-4 bg-[#161616] border border-[#262626] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-400" />
                    Asynchronous Bulk Synchronization Queue
                  </h4>
                  <p className="text-xs text-gray-400">
                    Handles OpenSolar API rate limits (HTTP 429) and prevents serverless timeouts by queuing records in Supabase.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleProcessQueueNow}
                    disabled={isProcessingQueue}
                    className="px-3 py-2 rounded-lg bg-[#262626] hover:bg-[#333] text-gray-200 border border-[#333] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Play className={`w-3.5 h-3.5 text-orange-400 ${isProcessingQueue ? 'animate-spin' : ''}`} />
                    <span>{isProcessingQueue ? 'Processing...' : 'Run Worker Now'}</span>
                  </button>
                  <button
                    onClick={handleTriggerBulkSync}
                    disabled={isBulkSyncing}
                    className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isBulkSyncing ? 'animate-spin' : ''}`} />
                    <span>{isBulkSyncing ? 'Queueing...' : `Bulk Sync ${projects.length} Projects`}</span>
                  </button>
                </div>
              </div>

              {bulkSyncResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                    bulkSyncResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-red-500/10 border-red-500/30 text-red-300'
                  }`}
                >
                  {bulkSyncResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <span>{bulkSyncResult.message}</span>
                </div>
              )}

              {/* Queue Metrics Display */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl text-center">
                  <p className="text-2xl font-bold text-white font-mono">{queueStats?.total ?? 0}</p>
                  <p className="text-[11px] text-gray-400 font-semibold uppercase mt-1">Total Queue Items</p>
                </div>
                <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl text-center">
                  <p className="text-2xl font-bold text-amber-400 font-mono">{queueStats?.pending ?? 0}</p>
                  <p className="text-[11px] text-gray-400 font-semibold uppercase mt-1">Pending Batch</p>
                </div>
                <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl text-center">
                  <p className="text-2xl font-bold text-blue-400 font-mono">{queueStats?.processing ?? 0}</p>
                  <p className="text-[11px] text-gray-400 font-semibold uppercase mt-1">In Processing</p>
                </div>
                <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl text-center">
                  <p className="text-2xl font-bold text-emerald-400 font-mono">{queueStats?.completed ?? 0}</p>
                  <p className="text-[11px] text-gray-400 font-semibold uppercase mt-1">Completed</p>
                </div>
              </div>

              {/* Rate Limit Architecture Info */}
              <div className="p-4 bg-[#161616] border border-[#262626] rounded-xl space-y-2 text-xs">
                <h5 className="font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-400" />
                  Rate Limit &amp; Exponential Backoff Architecture
                </h5>
                <ul className="space-y-1.5 text-gray-400 list-disc list-inside">
                  <li>
                    <strong className="text-gray-200">HTTP 429 Interception:</strong> Inspects <span className="font-mono text-orange-300">Retry-After</span> and <span className="font-mono text-orange-300">X-RateLimit-Reset</span> headers.
                  </li>
                  <li>
                    <strong className="text-gray-200">Exponential Backoff:</strong> Automatically retries with intervals of 2s, 4s, 8s, 16s, and 32s.
                  </li>
                  <li>
                    <strong className="text-gray-200">Batch Chunking:</strong> Processes in bursts of 20 items per batch to stay within OpenSolar concurrency limits.
                  </li>
                  <li>
                    <strong className="text-gray-200">Max Retries (5):</strong> Failed requests exceeding 5 attempts are marked as failed with logged error diagnostics.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 4: Signed Contracts & Documents */}
          {activeTab === 'contracts' && (
            <div className="space-y-6">
              <div className="p-4 bg-[#161616] border border-[#262626] rounded-xl space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Automated Digital Contract Retrieval Pipeline
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  When a customer e-signs an OpenSolar proposal, the webhook receiver intercepts the event, automatically updates the project stage in Supabase to &quot;Contract Signed&quot;, fetches the signed PDF document from OpenSolar&apos;s API, stores the file, and links it in the <span className="font-mono text-orange-300">project_documents</span> table.
                </p>
              </div>

              <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl space-y-3">
                <h5 className="text-xs font-bold text-white">Verification &amp; Storage Details</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-400">
                  <div className="p-3 bg-black/30 rounded-lg border border-[#262626]">
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Document Table</span>
                    <span className="font-mono text-emerald-300">project_documents</span>
                  </div>
                  <div className="p-3 bg-black/30 rounded-lg border border-[#262626]">
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Document Type</span>
                    <span className="text-white font-medium">Signed Contract</span>
                  </div>
                  <div className="p-3 bg-black/30 rounded-lg border border-[#262626]">
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Trigger Stage</span>
                    <span className="text-white font-medium">Stage &rarr; Contract Signed</span>
                  </div>
                  <div className="p-3 bg-black/30 rounded-lg border border-[#262626]">
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Storage Bucket / Directory</span>
                    <span className="font-mono text-orange-300">/contracts/</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Proposal Viewer */}
          {activeTab === 'proposals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Live synchronized proposals from OpenSolar. Click any proposal to open the 3D Viewer.
                </p>
              </div>

              <div className="space-y-2">
                {proposals.map(proposal => (
                  <div
                    key={proposal.id}
                    onClick={() => setSelectedPreviewProposalUrl(proposal.proposalId)}
                    className="p-3.5 bg-[#161616] hover:bg-[#202020] border border-[#262626] rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-orange-400">{proposal.proposalId}</span>
                        <span className="text-xs font-bold text-white">{proposal.customerName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {proposal.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {proposal.address}, {proposal.suburb} {proposal.state} &bull; {proposal.systemSizeKw}kW Solar ({proposal.panelCount} panels)
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
