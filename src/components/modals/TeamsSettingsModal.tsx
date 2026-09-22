import React, { useState, useEffect } from 'react';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Sliders,
  ShieldCheck,
  Bell,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Info,
  DollarSign,
  Wrench,
  AlertCircle,
  Hash,
  Key,
  Database,
  ArrowRight,
  Code,
  Trash2,
  FolderPlus,
  Plus
} from 'lucide-react';
import {
  getTeamsSettings,
  saveTeamsSettings,
  getTeamsDispatchedCards,
  fetchTeamsServerSettings,
  getTeamsOAuthUrl,
  fetchTeamsJoinedTeams,
  fetchTeamsChannels,
  saveTeamsServerPreferences,
  fetchTeamsWebhooks,
  addTeamsWebhook,
  deleteTeamsWebhook,
  sendTeamsGraphAdaptiveCard,
  sendTeamsWorkflowAdaptiveCard,
  fetchTeamsSqlMigration
} from '../../services/teamsService';
import {
  TeamsIntegrationSettings,
  TeamsDispatchedCard,
  TeamsWorkflowWebhook,
  TeamsJoinedTeam,
  TeamsChannel
} from '../../types';

interface TeamsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'oauth' | 'workflows' | 'card_preview' | 'history' | 'sql';
}

export const TeamsSettingsModal: React.FC<TeamsSettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'oauth'
}) => {
  const [activeTab, setActiveTab] = useState<'oauth' | 'workflows' | 'card_preview' | 'history' | 'sql'>(initialTab);

  const [settings, setSettings] = useState<TeamsIntegrationSettings>(getTeamsSettings);
  const [cards, setCards] = useState<TeamsDispatchedCard[]>(getTeamsDispatchedCards);
  const [webhooks, setWebhooks] = useState<TeamsWorkflowWebhook[]>([]);
  const [joinedTeams, setJoinedTeams] = useState<TeamsJoinedTeam[]>([]);
  const [teamChannels, setTeamChannels] = useState<TeamsChannel[]>([]);
  const [serverConfig, setServerConfig] = useState<any>(null);
  const [sqlMigration, setSqlMigration] = useState<string>('');

  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');

  // New webhook form
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [isAddingWebhook, setIsAddingWebhook] = useState(false);

  // Testing state
  const [testMode, setTestMode] = useState<'graph' | 'workflow'>('graph');
  const [testCustomerName, setTestCustomerName] = useState('Marcus Aurelius Vance');
  const [testSystemSize, setTestSystemSize] = useState('26.4');
  const [testState, setTestState] = useState('NSW');
  const [testInstaller, setTestInstaller] = useState('Apex Clean Energy Installations');
  const [testValue, setTestValue] = useState('34800');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testOutcome, setTestOutcome] = useState<{ success: boolean; message: string; httpCode?: number } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const serverRes = await fetchTeamsServerSettings();
      if (serverRes && serverRes.success) {
        setServerConfig(serverRes);
        if (serverRes.settings?.default_team_id) {
          setSelectedTeamId(serverRes.settings.default_team_id);
        }
        if (serverRes.settings?.default_channel_id) {
          setSelectedChannelId(serverRes.settings.default_channel_id);
        }
        if (serverRes.webhooks) {
          setWebhooks(serverRes.webhooks);
        }
      }

      const teamsList = await fetchTeamsJoinedTeams();
      setJoinedTeams(teamsList);

      const targetTeam = serverRes?.settings?.default_team_id || teamsList[0]?.id;
      if (targetTeam) {
        setSelectedTeamId(targetTeam);
        const channelsList = await fetchTeamsChannels(targetTeam);
        setTeamChannels(channelsList);
      }

      const sql = await fetchTeamsSqlMigration();
      setSqlMigration(sql);
      setCards(getTeamsDispatchedCards());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleTeamChange = async (teamId: string) => {
    setSelectedTeamId(teamId);
    setIsLoading(true);
    try {
      const channels = await fetchTeamsChannels(teamId);
      setTeamChannels(channels);
      if (channels.length > 0) {
        setSelectedChannelId(channels[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    const teamObj = joinedTeams.find(t => t.id === selectedTeamId);
    const channelObj = teamChannels.find(c => c.id === selectedChannelId);

    try {
      await saveTeamsServerPreferences(
        selectedTeamId,
        selectedChannelId,
        teamObj?.displayName,
        channelObj?.displayName
      );

      const updated = saveTeamsSettings({
        ...settings,
        defaultTeamId: selectedTeamId,
        defaultTeamName: teamObj?.displayName,
        defaultChannelId: selectedChannelId,
        defaultChannelName: channelObj?.displayName
      });
      setSettings(updated);

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err: any) {
      alert(`Error saving preferences: ${err.message}`);
    }
  };

  const handleConnectOAuth = async () => {
    try {
      const url = await getTeamsOAuthUrl();
      const width = 600;
      const height = 750;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        url,
        'teams_oauth_popup',
        `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
      );

      const listener = (event: MessageEvent) => {
        if (event.data?.type === 'TEAMS_OAUTH_SUCCESS') {
          window.removeEventListener('message', listener);
          loadData();
          setSavedSuccess(true);
        }
      };
      window.addEventListener('message', listener);
    } catch (err: any) {
      alert(`Could not initiate Microsoft OAuth: ${err.message}`);
    }
  };

  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookUrl.trim()) return;
    setIsAddingWebhook(true);
    try {
      const created = await addTeamsWebhook(newWebhookName || 'Sales & Project Updates', newWebhookUrl.trim());
      if (created.success) {
        setWebhooks(prev => [created.record, ...prev]);
        setNewWebhookName('');
        setNewWebhookUrl('');
      }
    } finally {
      setIsAddingWebhook(false);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Remove this Microsoft Teams Workflow webhook URL?')) return;
    await deleteTeamsWebhook(id);
    setWebhooks(prev => prev.filter(w => w.id !== id));
  };

  const handleSendTestCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingTest(true);
    setTestOutcome(null);

    const payload = {
      customerName: testCustomerName,
      systemSizeKw: testSystemSize,
      state: testState,
      installerName: testInstaller,
      projectValue: testValue,
      crmProjectLink: `https://mysolarcrm.com.au/projects/proj-${Date.now().toString().slice(-4)}`
    };

    try {
      if (testMode === 'graph') {
        const res = await sendTeamsGraphAdaptiveCard(payload);
        if (res.success) {
          setTestOutcome({
            success: true,
            message: `Adaptive Card 1.2 successfully dispatched to Microsoft Teams channel via Graph API. Status: HTTP 201 Created.`,
            httpCode: 201
          });
        } else {
          setTestOutcome({
            success: false,
            message: res.error || 'Failed to dispatch card via Microsoft Graph API.',
            httpCode: 500
          });
        }
      } else {
        const activeUrl = webhooks.find(w => w.is_active)?.webhook_url || settings.defaultChannelWebhookUrl;
        const res = await sendTeamsWorkflowAdaptiveCard(payload, activeUrl);
        if (res.success) {
          setTestOutcome({
            success: true,
            message: `Adaptive Card successfully posted to Power Automate Workflows incoming webhook!`,
            httpCode: res.status || 200
          });
        } else {
          setTestOutcome({
            success: false,
            message: res.error || 'Failed to deliver Adaptive Card to Workflows webhook.',
            httpCode: res.status || 400
          });
        }
      }
      setCards(getTeamsDispatchedCards());
    } catch (err: any) {
      setTestOutcome({
        success: false,
        message: err.message || 'Error executing request.',
        httpCode: 500
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const hasGraphToken = Boolean(serverConfig?.settings?.hasToken);
  const isGraphTokenExpired = Boolean(serverConfig?.settings?.isTokenExpired);
  const expirySeconds = serverConfig?.settings?.secondsRemaining || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#161616] rounded-2xl shadow-2xl border border-[#2d2d2d] overflow-hidden text-[#e5e7eb] flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 md:p-5 bg-[#121212] text-white flex items-center justify-between border-b border-[#262626]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#5059C9]/20 text-[#7B83EB] border border-[#5059C9]/30">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base md:text-lg text-white">Microsoft Teams Integration</h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#5059C9]/30 text-[#A6ACF7] border border-[#5059C9]/40">
                  Graph API v1.0 &amp; Workflows
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Push high-fidelity Adaptive Cards (1.2) for signed contracts, system sizes, values &amp; project alerts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-[#262626] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-[#262626] bg-[#141414] px-4 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('oauth')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'oauth'
                ? 'border-[#7B83EB] text-[#A6ACF7] font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>1. Microsoft Graph API OAuth 2.0</span>
            {hasGraphToken && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Token Connected" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('workflows')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'workflows'
                ? 'border-[#7B83EB] text-[#A6ACF7] font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>2. Power Automate Workflows</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#262626] text-gray-300">
              {webhooks.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('card_preview')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'card_preview'
                ? 'border-[#7B83EB] text-[#A6ACF7] font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>3. Adaptive Card (1.2) Visualizer</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'history'
                ? 'border-[#7B83EB] text-[#A6ACF7] font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>4. Delivery Audit Log ({cards.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'sql'
                ? 'border-[#7B83EB] text-[#A6ACF7] font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>5. Supabase SQL Schema</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {savedSuccess && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Microsoft Teams preferences and notification rules successfully saved.</span>
            </div>
          )}

          {/* TAB 1: GRAPH API OAUTH 2.0 */}
          {activeTab === 'oauth' && (
            <div className="space-y-5 text-xs">
              {/* Azure AD App Overview Card */}
              <div className="p-4 rounded-xl bg-[#1b1b1b] border border-[#2b2b2b] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#262626] pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#7B83EB]" />
                      Microsoft Entra ID (Azure AD) App Registration
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Standard OAuth 2.0 authorization code flow storing tokens in Supabase <code className="text-gray-200">teams_integration_settings</code>.
                    </p>
                  </div>
                  <button
                    onClick={handleConnectOAuth}
                    className="px-4 py-2 rounded-lg bg-[#5059C9] hover:bg-[#434BA8] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Connect Microsoft Teams</span>
                  </button>
                </div>

                {/* Env Vars Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] text-gray-400 font-semibold block mb-1">AZURE_CLIENT_ID</label>
                    <div className="p-2 rounded-lg bg-[#121212] border border-[#262626] font-mono text-[11px] text-gray-300">
                      {serverConfig?.config?.client_id || 'Configured via .env / Azure Portal'}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 font-semibold block mb-1">AZURE_TENANT_ID</label>
                    <div className="p-2 rounded-lg bg-[#121212] border border-[#262626] font-mono text-[11px] text-gray-300">
                      {serverConfig?.config?.tenant_id || 'common'}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] text-gray-400 font-semibold block mb-1">
                      OAuth Redirect URI (Registered in Azure Portal)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={serverConfig?.config?.redirect_uri || 'http://localhost:3000/api/auth/teams/callback'}
                        className="w-full text-xs font-mono bg-[#121212] border border-[#262626] rounded-lg px-3 py-2 text-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(serverConfig?.config?.redirect_uri || 'http://localhost:3000/api/auth/teams/callback', 'redirect_uri')}
                        className="p-2 bg-[#222] hover:bg-[#333] border border-[#333] rounded-lg text-gray-300"
                        title="Copy Redirect URI"
                      >
                        {copiedField === 'redirect_uri' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delegated Graph API Scopes */}
                <div className="p-3 rounded-lg bg-[#121212] border border-[#262626] space-y-1.5">
                  <span className="font-semibold text-gray-300 text-[11px]">Required Delegated Microsoft Graph API Scopes:</span>
                  <div className="flex flex-wrap gap-2 pt-1 font-mono text-[10px]">
                    <span className="px-2 py-0.5 rounded-md bg-[#262626] text-blue-300 border border-[#333]">offline_access</span>
                    <span className="px-2 py-0.5 rounded-md bg-[#262626] text-blue-300 border border-[#333]">Team.ReadBasic.All</span>
                    <span className="px-2 py-0.5 rounded-md bg-[#262626] text-blue-300 border border-[#333]">Channel.ReadBasic.All</span>
                    <span className="px-2 py-0.5 rounded-md bg-[#262626] text-emerald-300 border border-[#333]">ChannelMessage.Send</span>
                  </div>
                </div>

                {/* Token Health Status */}
                <div className="p-3 rounded-lg bg-[#141414] border border-[#262626] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-3 h-3 rounded-full ${hasGraphToken && !isGraphTokenExpired ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    <div>
                      <span className="font-semibold text-white">OAuth Token Health Status</span>
                      <p className="text-[11px] text-gray-400">
                        {hasGraphToken
                          ? `Valid session active. Auto-refreshes seamlessly via utils/teamsTokenManager.ts with 5-minute buffer.`
                          : 'No active session. Click "Connect Microsoft Teams" to authenticate.'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-1 rounded bg-[#202020] text-gray-300 border border-[#333]">
                    {hasGraphToken ? (isGraphTokenExpired ? 'Auto-Refreshing' : `Expires in ${Math.floor(expirySeconds / 60)}m`) : 'Disconnected'}
                  </span>
                </div>
              </div>

              {/* Destination Team & Channel Selectors */}
              <form onSubmit={handleSavePreferences} className="p-4 rounded-xl bg-[#1b1b1b] border border-[#2b2b2b] space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Hash className="w-4 h-4 text-emerald-400" />
                    Default Notification Destination
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Fetched directly from Microsoft Graph API (<code className="text-gray-300">/v1.0/me/joinedTeams</code> and <code className="text-gray-300">/v1.0/teams/&#123;id&#125;/channels</code>).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Select Team</label>
                    <select
                      value={selectedTeamId}
                      onChange={e => handleTeamChange(e.target.value)}
                      className="w-full bg-[#121212] border border-[#2b2b2b] rounded-lg px-3 py-2 text-white outline-none focus:border-[#7B83EB]"
                    >
                      {joinedTeams.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.displayName}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {joinedTeams.find(t => t.id === selectedTeamId)?.description || 'Authenticated Microsoft 365 Team'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Select Channel</label>
                    <select
                      value={selectedChannelId}
                      onChange={e => setSelectedChannelId(e.target.value)}
                      className="w-full bg-[#121212] border border-[#2b2b2b] rounded-lg px-3 py-2 text-white outline-none focus:border-[#7B83EB]"
                    >
                      {teamChannels.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.displayName}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Target for automated Contract Signed &amp; project dispatch Adaptive Cards
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#262626]">
                  <span className="text-[11px] text-gray-400">
                    Saves <code className="text-gray-300">default_team_id</code> and <code className="text-gray-300">default_channel_id</code> to Supabase.
                  </span>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#bef264] hover:bg-[#a3e635] text-black font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Channel Preferences</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: POWER AUTOMATE WORKFLOWS */}
          {activeTab === 'workflows' && (
            <div className="space-y-5 text-xs">
              {/* Step-by-Step Instructions */}
              <div className="p-4 rounded-xl bg-[#1b1b1b] border border-[#2b2b2b] space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h3>Workflows Incoming Webhook Setup Guide (No Azure App Registration Needed)</h3>
                </div>
                <p className="text-[11px] text-gray-300">
                  Follow these 5 simple steps directly inside Microsoft Teams to generate your custom webhook:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-300">
                  <div className="p-2.5 rounded-lg bg-[#141414] border border-[#262626] flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#262626] text-[#bef264] flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                    <span>Open Microsoft Teams and navigate to your desired team &amp; channel.</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#141414] border border-[#262626] flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#262626] text-[#bef264] flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                    <span>Click the three dots (<strong className="text-white">...</strong>) next to the channel name and select <strong className="text-white">Workflows</strong>.</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#141414] border border-[#262626] flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#262626] text-[#bef264] flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                    <span>Search for the template: <strong className="text-[#bef264]">"Post to a channel when a webhook request is received"</strong>.</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#141414] border border-[#262626] flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#262626] text-[#bef264] flex items-center justify-center font-bold text-[10px] shrink-0">4</span>
                    <span>Configure the connection and click <strong className="text-white">Add workflow</strong> to copy the generated Webhook URL.</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#141414] border border-[#262626] sm:col-span-2 flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#262626] text-[#bef264] flex items-center justify-center font-bold text-[10px] shrink-0">5</span>
                    <span>Paste that URL below to store it in Supabase <code className="text-gray-200">teams_webhooks</code> table. Auto-deactivates if Teams returns HTTP 404.</span>
                  </div>
                </div>
              </div>

              {/* Add Webhook Form */}
              <form onSubmit={handleAddWebhook} className="p-4 rounded-xl bg-[#1b1b1b] border border-[#2b2b2b] space-y-3">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-[#bef264]" />
                  Add New Teams Workflow Webhook
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Channel / Alert Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Sales Alerts, Installation Dispatch"
                      value={newWebhookName}
                      onChange={e => setNewWebhookName(e.target.value)}
                      className="w-full bg-[#121212] border border-[#2b2b2b] rounded-lg px-3 py-2 text-white outline-none focus:border-[#bef264]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-gray-400 mb-1">Teams Workflow Webhook URL</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        required
                        placeholder="https://prod-XX.australiasoutheast.logic.azure.com:443/workflows/..."
                        value={newWebhookUrl}
                        onChange={e => setNewWebhookUrl(e.target.value)}
                        className="w-full font-mono text-[11px] bg-[#121212] border border-[#2b2b2b] rounded-lg px-3 py-2 text-white outline-none focus:border-[#bef264]"
                      />
                      <button
                        type="submit"
                        disabled={isAddingWebhook}
                        className="px-4 py-2 rounded-lg bg-[#bef264] hover:bg-[#a3e635] text-black font-bold whitespace-nowrap transition-colors"
                      >
                        {isAddingWebhook ? 'Saving...' : 'Add Webhook'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Saved Webhooks List */}
              <div className="p-4 rounded-xl bg-[#1b1b1b] border border-[#2b2b2b] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-xs">Saved Workflow Webhooks ({webhooks.length})</h4>
                  <span className="text-[10px] text-gray-400">Stored in Supabase <code className="text-gray-300">teams_webhooks</code></span>
                </div>

                <div className="space-y-2">
                  {webhooks.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 bg-[#121212] rounded-lg">
                      No workflow webhooks added yet. Paste a URL from Microsoft Teams above.
                    </div>
                  ) : (
                    webhooks.map(wh => (
                      <div
                        key={wh.id}
                        className="p-3 rounded-lg bg-[#141414] border border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{wh.channel_name}</span>
                            <span
                              className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                                wh.is_active
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : 'bg-red-500/20 text-red-300 border-red-500/30'
                              }`}
                            >
                              {wh.is_active ? 'ACTIVE' : 'INACTIVE (404 Auto-Disabled)'}
                            </span>
                          </div>
                          <p className="font-mono text-[10px] text-gray-400 truncate max-w-xl">
                            {wh.webhook_url}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(wh.webhook_url, wh.id)}
                            className="p-1.5 bg-[#222] hover:bg-[#333] border border-[#333] rounded-lg text-gray-300"
                            title="Copy Webhook URL"
                          >
                            {copiedField === wh.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteWebhook(wh.id)}
                            className="p-1.5 bg-[#222] hover:bg-red-500/20 hover:text-red-400 border border-[#333] rounded-lg text-gray-400"
                            title="Delete Webhook"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ADAPTIVE CARD VISUALIZER & LIVE TESTER */}
          {activeTab === 'card_preview' && (
            <div className="space-y-5 text-xs">
              {/* Live Preview Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Visual rendering of Adaptive Card 1.2 */}
                <div className="p-4 rounded-xl bg-[#1b1b1b] border border-[#2b2b2b] space-y-3">
                  <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#bef264]" />
                    Official Adaptive Card (v1.2) Visual Rendering
                  </h4>
                  <div className="p-4 rounded-xl bg-[#202020] border border-[#333] shadow-md space-y-3 text-white">
                    {/* Header TextBlock */}
                    <div className="font-bold text-sm text-white">
                      New Contract Signed: {testCustomerName}
                    </div>

                    {/* FactSet */}
                    <div className="p-3 rounded-lg bg-[#181818] border border-[#2a2a2a] space-y-1 text-xs">
                      <div className="flex justify-between py-0.5 border-b border-[#252525]">
                        <span className="text-gray-400 font-medium">System Size:</span>
                        <span className="font-bold text-white">{testSystemSize} kW</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-[#252525]">
                        <span className="text-gray-400 font-medium">Location:</span>
                        <span className="font-semibold text-white">{testState}</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-[#252525]">
                        <span className="text-gray-400 font-medium">Value:</span>
                        <span className="font-bold text-[#bef264]">${Number(testValue).toLocaleString()} AUD</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-gray-400 font-medium">Installer:</span>
                        <span className="text-gray-300">{testInstaller}</span>
                      </div>
                    </div>

                    {/* Action.OpenUrl button */}
                    <a
                      href="#"
                      onClick={e => e.preventDefault()}
                      className="block text-center py-2 px-3 rounded-lg bg-[#5059C9] hover:bg-[#434BA8] text-white font-bold text-xs shadow-xs"
                    >
                      View in CRM &rarr;
                    </a>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    Complies strictly with Microsoft Teams Workflows &amp; Graph API Adaptive Card schema specifications.
                  </p>
                </div>

                {/* Tester form */}
                <form onSubmit={handleSendTestCard} className="p-4 rounded-xl bg-[#1b1b1b] border border-[#2b2b2b] space-y-3">
                  <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-[#bef264]" />
                    Trigger Real-Time Test Card
                  </h4>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTestMode('graph')}
                      className={`flex-1 py-1.5 rounded-lg border text-center font-semibold text-[11px] transition-colors ${
                        testMode === 'graph'
                          ? 'bg-[#5059C9] text-white border-[#5059C9]'
                          : 'bg-[#181818] text-gray-400 border-[#2a2a2a] hover:text-white'
                      }`}
                    >
                      Graph API Channel
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestMode('workflow')}
                      className={`flex-1 py-1.5 rounded-lg border text-center font-semibold text-[11px] transition-colors ${
                        testMode === 'workflow'
                          ? 'bg-[#bef264] text-black border-[#bef264]'
                          : 'bg-[#181818] text-gray-400 border-[#2a2a2a] hover:text-white'
                      }`}
                    >
                      Workflows Webhook
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">Customer Name</label>
                      <input
                        type="text"
                        value={testCustomerName}
                        onChange={e => setTestCustomerName(e.target.value)}
                        className="w-full bg-[#121212] border border-[#262626] rounded-md px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">System Size (kW)</label>
                      <input
                        type="text"
                        value={testSystemSize}
                        onChange={e => setTestSystemSize(e.target.value)}
                        className="w-full bg-[#121212] border border-[#262626] rounded-md px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">State</label>
                      <input
                        type="text"
                        value={testState}
                        onChange={e => setTestState(e.target.value)}
                        className="w-full bg-[#121212] border border-[#262626] rounded-md px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">Contract Value ($)</label>
                      <input
                        type="text"
                        value={testValue}
                        onChange={e => setTestValue(e.target.value)}
                        className="w-full bg-[#121212] border border-[#262626] rounded-md px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">Installer</label>
                    <input
                      type="text"
                      value={testInstaller}
                      onChange={e => setTestInstaller(e.target.value)}
                      className="w-full bg-[#121212] border border-[#262626] rounded-md px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingTest}
                    className="w-full py-2.5 rounded-lg bg-[#5059C9] hover:bg-[#434BA8] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <Send className={`w-3.5 h-3.5 ${isSendingTest ? 'animate-spin' : ''}`} />
                    <span>{isSendingTest ? 'Pushing Card to Teams...' : `Post Card via ${testMode === 'graph' ? 'Graph API' : 'Workflows Webhook'}`}</span>
                  </button>

                  {testOutcome && (
                    <div
                      className={`p-3 rounded-xl border flex items-start gap-2 text-xs ${
                        testOutcome.success
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : 'bg-red-500/15 border-red-500/30 text-red-300'
                      }`}
                    >
                      {testOutcome.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      )}
                      <span>{testOutcome.message}</span>
                    </div>
                  )}
                </form>
              </div>

              {/* JSON Payload Spec */}
              <div className="p-4 rounded-xl bg-[#1b1b1b] border border-[#2b2b2b] space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-blue-400" />
                    Exact Microsoft Teams Adaptive Card 1.2 JSON Payload
                  </h4>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        JSON.stringify(
                          {
                            body: { contentType: 'html', content: '<attachment id="card_id"></attachment>' },
                            attachments: [
                              {
                                id: 'card_id',
                                contentType: 'application/vnd.microsoft.card.adaptive',
                                contentUrl: null,
                                content: {
                                  $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
                                  type: 'AdaptiveCard',
                                  version: '1.2',
                                  body: [
                                    { type: 'TextBlock', text: `New Contract Signed: ${testCustomerName}`, weight: 'Bolder', size: 'Medium' },
                                    {
                                      type: 'FactSet',
                                      facts: [
                                        { title: 'System Size:', value: `${testSystemSize} kW` },
                                        { title: 'Location:', value: testState },
                                        { title: 'Installer:', value: testInstaller }
                                      ]
                                    }
                                  ],
                                  actions: [{ type: 'Action.OpenUrl', title: 'View in CRM', url: 'https://mysolarcrm.com.au/projects/proj-1092' }]
                                }
                              }
                            ]
                          },
                          null,
                          2
                        ),
                        'json_spec'
                      )
                    }
                    className="text-[11px] text-[#bef264] hover:underline flex items-center gap-1"
                  >
                    {copiedField === 'json_spec' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>Copy JSON</span>
                  </button>
                </div>
                <pre className="p-3 bg-[#101010] border border-[#222] rounded-lg font-mono text-[10px] text-gray-300 overflow-x-auto max-h-48">
{`{
  "body": {
    "contentType": "html",
    "content": "<attachment id=\\"card_id\\"></attachment>"
  },
  "attachments": [
    {
      "id": "card_id",
      "contentType": "application/vnd.microsoft.card.adaptive",
      "contentUrl": null,
      "content": {
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "type": "AdaptiveCard",
        "version": "1.2",
        "body": [
          {
            "type": "TextBlock",
            "text": "New Contract Signed: ${testCustomerName}",
            "weight": "Bolder",
            "size": "Medium"
          },
          {
            "type": "FactSet",
            "facts": [
              { "title": "System Size:", "value": "${testSystemSize} kW" },
              { "title": "Location:", "value": "${testState}" },
              { "title": "Installer:", "value": "${testInstaller}" }
            ]
          }
        ],
        "actions": [
          {
            "type": "Action.OpenUrl",
            "title": "View in CRM",
            "url": "https://mysolarcrm.com.au/projects/proj-1092"
          }
        ]
      }
    }
  ]
}`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT LOG */}
          {activeTab === 'history' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">Dispatched Adaptive Cards Audit Log</h3>
                  <p className="text-[11px] text-gray-400">
                    Real-time log of notifications sent to Microsoft Teams via Graph API and Workflows.
                  </p>
                </div>
                <button
                  onClick={() => setCards(getTeamsDispatchedCards())}
                  className="px-2.5 py-1.5 rounded-lg bg-[#222] hover:bg-[#333] text-gray-300 text-xs flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Log</span>
                </button>
              </div>

              <div className="space-y-2">
                {cards.map(c => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl bg-[#1b1b1b] border border-[#2b2b2b] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{c.title}</span>
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                            c.status === 'SUCCESS'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-red-500/20 text-red-300 border-red-500/30'
                          }`}
                        >
                          HTTP {c.httpResponseCode} {c.status}
                        </span>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#262626] text-blue-300 border border-[#333]">
                          {c.deliveryMethod === 'workflow_webhook' ? 'Workflows Webhook' : 'Graph API v1.0'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400">{c.summary}</p>
                      <div className="flex items-center gap-3 text-[10px] text-gray-500 pt-1">
                        {c.systemSizeKw && <span>Size: <strong className="text-gray-300">{c.systemSizeKw}kW</strong></span>}
                        {c.contractValueAud && <span>Value: <strong className="text-gray-300">${c.contractValueAud.toLocaleString()} AUD</strong></span>}
                        {c.clientName && <span>Client: <strong className="text-gray-300">{c.clientName}</strong></span>}
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap self-end sm:self-center">
                      {new Date(c.dispatchedAt).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: SUPABASE SQL SCHEMA */}
          {activeTab === 'sql' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    Supabase SQL Migration Script
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Provisions <code className="text-gray-300">teams_integration_settings</code> (OAuth credentials &amp; default channels) and <code className="text-gray-300">teams_webhooks</code> (Power Automate URLs).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(sqlMigration, 'sql_migration')}
                  className="px-3.5 py-1.5 rounded-lg bg-[#bef264] hover:bg-[#a3e635] text-black font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  {copiedField === 'sql_migration' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy SQL to Clipboard</span>
                </button>
              </div>

              <div className="p-3 bg-[#121212] border border-[#262626] rounded-xl space-y-2">
                <span className="text-[11px] font-semibold text-gray-300 block">
                  Instructions for Supabase Dashboard:
                </span>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-400">
                  <li>Open your Supabase Project Dashboard &rarr; Click <strong>SQL Editor</strong> in the left sidebar.</li>
                  <li>Click <strong>+ New Query</strong>.</li>
                  <li>Paste the SQL script below and click <strong>Run</strong>.</li>
                </ol>
              </div>

              <pre className="p-4 bg-[#0d0d0d] border border-[#262626] rounded-xl font-mono text-[11px] text-emerald-400/90 overflow-x-auto max-h-[380px] leading-relaxed">
                {sqlMigration}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#121212] border-t border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encrypted Token Storage with Automated Revocation &amp; 404 Interceptor</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#262626] hover:bg-[#333] text-white text-xs font-semibold transition-colors"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};
