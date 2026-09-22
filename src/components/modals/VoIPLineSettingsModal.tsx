import React, { useState, useEffect } from 'react';
import {
  Phone,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Users,
  ExternalLink,
  PhoneCall,
  MessageSquare,
  Radio,
  FileAudio,
  CheckCircle2,
  X,
  Play,
  Save,
  Globe,
  KeyRound
} from 'lucide-react';
import {
  fetchVoIPLineSettings,
  saveVoIPLineCredentials,
  fetchServerPublicIp,
  fetchUserPhoneNumbers,
  assignUserPhoneNumber,
  originateCall,
  simulateVoIPLineWebhook
} from '../../services/voiplineService';
import { UserPhoneNumber } from '../../types';

interface VoIPLineSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'credentials' | 'numbers' | 'webhooks' | 'test';
}

export const VoIPLineSettingsModal: React.FC<VoIPLineSettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'credentials'
}) => {
  const [activeTab, setActiveTab] = useState<'credentials' | 'numbers' | 'webhooks' | 'test'>(initialTab);

  // Settings state
  const [apiKey, setApiKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [serverPublicIp, setServerPublicIp] = useState('34.87.12.184');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // User Number Assignments
  const [userNumbers, setUserNumbers] = useState<UserPhoneNumber[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editedNumber, setEditedNumber] = useState('');
  const [numberUpdateStatus, setNumberUpdateStatus] = useState<string | null>(null);

  // Copy helpers
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Test Outbound Call state
  const [testCallee, setTestCallee] = useState('+61 411 234 567');
  const [testUser, setTestUser] = useState('usr-1');
  const [callTesting, setCallTesting] = useState(false);
  const [callTestResult, setCallTestResult] = useState<any>(null);

  // Webhook Simulator state
  const [simulatingWebhook, setSimulatingWebhook] = useState(false);
  const [webhookTestType, setWebhookTestType] = useState<
    'inbound_call' | 'call_answered' | 'call_completed' | 'call_recording' | 'inbound_sms'
  >('call_recording');
  const [webhookSimResult, setWebhookSimResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const settingsData = await fetchVoIPLineSettings();
      setApiKey(settingsData.settings.api_key || '');
      setWebhookSecret(settingsData.settings.webhook_secret || '');
      setServerPublicIp(settingsData.serverPublicIp);
      setWebhookUrl(settingsData.webhookUrl);

      const users = await fetchUserPhoneNumbers();
      setUserNumbers(users);
    } catch (err) {
      console.error('Error loading VoIPLine modal data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    if (!apiKey.trim()) {
      setSaveError('API Key cannot be blank.');
      return;
    }
    if (!webhookSecret.trim()) {
      setSaveError('Webhook Secret Token cannot be blank.');
      return;
    }

    setLoading(true);
    const res = await saveVoIPLineCredentials({
      api_key: apiKey.trim(),
      webhook_secret: webhookSecret.trim()
    });
    setLoading(false);

    if (res.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } else {
      setSaveError(res.message || 'Failed to save settings.');
    }
  };

  const handleSaveUserNumber = async (userId: string, userName?: string) => {
    if (!editedNumber.trim()) return;

    setNumberUpdateStatus('Saving...');
    const res = await assignUserPhoneNumber({
      user_id: userId,
      assigned_number: editedNumber.trim(),
      user_name: userName
    });

    if (res.success) {
      setNumberUpdateStatus('Assigned!');
      setUserNumbers(prev =>
        prev.map(u => (u.user_id === userId ? { ...u, assigned_number: editedNumber.trim() } : u))
      );
      setEditingUserId(null);
      setTimeout(() => setNumberUpdateStatus(null), 2500);
    } else {
      setNumberUpdateStatus(`Error: ${res.error || 'Failed'}`);
    }
  };

  const handleTestCallOrigination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testCallee) return;

    setCallTesting(true);
    setCallTestResult(null);

    const res = await originateCall({
      userId: testUser,
      calleeNumber: testCallee
    });

    setCallTesting(false);
    setCallTestResult(res);
  };

  const handleRunWebhookSimulation = async () => {
    setSimulatingWebhook(true);
    setWebhookSimResult(null);

    let payload: any = {};
    const timestamp = new Date().toISOString();
    const demoCallId = `vpl-call-${Date.now()}`;

    if (webhookTestType === 'inbound_call') {
      payload = {
        event_type: 'User inbound call',
        call_id: demoCallId,
        caller_number: '+61 412 889 123',
        dest_number: userNumbers[0]?.assigned_number || '+61 2 8311 4920',
        timestamp
      };
    } else if (webhookTestType === 'call_answered') {
      payload = {
        event_type: 'User inbound call answered',
        call_id: demoCallId,
        timestamp
      };
    } else if (webhookTestType === 'call_completed') {
      payload = {
        event_type: 'User inbound call completion',
        call_id: demoCallId,
        duration: 142,
        timestamp
      };
    } else if (webhookTestType === 'call_recording') {
      // Test recording asynchronous linking
      payload = {
        event_type: 'Inbound call recording',
        call_id: demoCallId,
        recording_url: 'https://cdn.voipline.net.au/recordings/demo_sample_recording_solar.mp3',
        timestamp
      };
    } else if (webhookTestType === 'inbound_sms') {
      payload = {
        event_type: 'sms',
        from: '+61 412 998 441',
        to: userNumbers[0]?.assigned_number || '+61 2 8311 4920',
        message_body: 'Hi Sarah, can you please email me the updated solar quote for 10kW system?',
        timestamp
      };
    }

    const res = await simulateVoIPLineWebhook(payload, webhookSecret);
    setSimulatingWebhook(false);
    setWebhookSimResult({
      status: res.status,
      success: res.success,
      sentPayload: payload,
      response: res.data
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#171717] rounded-2xl shadow-2xl border border-[#2d2d2d] overflow-hidden text-gray-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 md:p-5 bg-[#121212] border-b border-[#262626] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base md:text-lg text-white">VoIPLine Telecom AU Voice & SMS</h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Cloud PBX + Virtual Mobile
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Manage API authentication, IP whitelisting, user virtual numbers, and asynchronous call recording webhooks.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#252525] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* IP Whitelist Critical Security Warning Banner */}
        <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-200 flex items-start gap-3 shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-amber-300 flex items-center gap-2 flex-wrap">
              <span>VoIPLine Security Requirement: Server IP Whitelisting</span>
              <span className="font-mono text-[11px] bg-black/40 px-2 py-0.5 rounded text-white border border-amber-400/30">
                Server Public IP: {serverPublicIp}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(serverPublicIp, 'server_ip')}
                className="inline-flex items-center gap-1 text-[10px] text-amber-300 hover:text-white bg-amber-900/30 hover:bg-amber-900/50 px-2 py-0.5 rounded border border-amber-500/30 transition-colors"
              >
                {copiedField === 'server_ip' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedField === 'server_ip' ? 'Copied' : 'Copy IP'}</span>
              </button>
            </div>
            <p className="text-amber-300/80 mt-1 leading-relaxed text-[11px]">
              VoIPLine APIs will return a <strong>401 - Not authorised</strong> error unless this server public IP is explicitly added to the IP Whitelist in your VoIPLine portal under <strong>Integration/API &gt; IP Whitelist</strong>.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-4 pt-3 bg-[#141414] border-b border-[#262626] overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('credentials')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'credentials'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Credentials & IP</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('numbers')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'numbers'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Phone Numbers ({userNumbers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('webhooks')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'webhooks'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Webhook Setup Guide</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('test')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'test'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Dialer & Webhook Simulator</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* TAB 1: CREDENTIALS */}
          {activeTab === 'credentials' && (
            <div className="space-y-5">
              <div className="bg-[#1e1e1e] p-4 rounded-xl border border-[#2d2d2d] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    VoIPLine API & Webhook Secret Configuration
                  </h3>
                  <a
                    href="https://portal.voipline.net.au"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <span>Open VoIPLine Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-gray-400 text-xs">
                  Your API Key will be sent in the request header of all outbound call origination requests. The Webhook Secret Token validates the <code className="text-cyan-300 bg-black/40 px-1 py-0.5 rounded">X-Pbx-Token</code> HTTP header on incoming webhooks.
                </p>

                <form onSubmit={handleSaveCredentials} className="space-y-4">
                  <div>
                    <label className="block text-gray-300 font-medium mb-1">VoIPLine API Key</label>
                    <input
                      type="text"
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      placeholder="e.g. vpl_live_9f82b4a7e10c4921b790d6"
                      className="w-full bg-[#121212] border border-[#333] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-hidden focus:border-cyan-500"
                    />
                    <span className="text-[11px] text-gray-500 mt-1 block">
                      Generated under Customer Portal &gt; Integration/API &gt; API Keys.
                    </span>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-medium mb-1">Webhook Secret Token</label>
                    <input
                      type="text"
                      value={webhookSecret}
                      onChange={e => setWebhookSecret(e.target.value)}
                      placeholder="e.g. sec_8402a7b319f0049281a4b2c1"
                      className="w-full bg-[#121212] border border-[#333] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-hidden focus:border-cyan-500"
                    />
                    <span className="text-[11px] text-gray-500 mt-1 block">
                      The exact string entered into the &quot;Secret Token&quot; field in VoIPLine Webhooks settings.
                    </span>
                  </div>

                  {saveSuccess && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>VoIPLine credentials securely saved to Supabase!</span>
                    </div>
                  )}

                  {saveError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{saveError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>Save VoIPLine Credentials</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* IP Whitelist Step-by-Step Card */}
              <div className="p-4 bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] space-y-2">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  IP Whitelisting Instructions
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-gray-400 text-xs">
                  <li>Log in to your <strong>VoIPLine Telecom AU Customer Portal</strong>.</li>
                  <li>Click on the <strong>Integration/API</strong> tab at the top of the portal.</li>
                  <li>Under <strong>IP Whitelist</strong>, click <strong>Add IP Address</strong>.</li>
                  <li>Paste the public IP address: <strong className="text-white font-mono">{serverPublicIp}</strong>.</li>
                  <li>Save the IP whitelist to enable outbound call origination without 401 errors.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: USER PHONE NUMBERS */}
          {activeTab === 'numbers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">CRM User Virtual Mobile Number Assignments</h3>
                  <p className="text-gray-400 text-xs">
                    Each CRM user is assigned a unique VoIPLine Virtual Mobile Number capable of two-way calls and SMS.
                  </p>
                </div>
                {numberUpdateStatus && (
                  <span className="text-xs text-cyan-400 font-medium px-2.5 py-1 rounded bg-cyan-950/60 border border-cyan-800">
                    {numberUpdateStatus}
                  </span>
                )}
              </div>

              <div className="overflow-x-auto border border-[#2d2d2d] rounded-xl bg-[#141414]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1e1e1e] text-gray-400 border-b border-[#2d2d2d] uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3.5">User</th>
                      <th className="py-2.5 px-3.5">User ID</th>
                      <th className="py-2.5 px-3.5">Assigned Virtual Mobile Number</th>
                      <th className="py-2.5 px-3.5">Capabilities</th>
                      <th className="py-2.5 px-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262626]">
                    {userNumbers.map(u => {
                      const isEditing = editingUserId === u.user_id;
                      return (
                        <tr key={u.user_id} className="hover:bg-[#1b1b1b] transition-colors">
                          <td className="py-2.5 px-3.5 font-semibold text-white">
                            {u.user_name || u.user_id}
                          </td>
                          <td className="py-2.5 px-3.5 font-mono text-gray-400 text-[11px]">
                            {u.user_id}
                          </td>
                          <td className="py-2.5 px-3.5">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editedNumber}
                                onChange={e => setEditedNumber(e.target.value)}
                                placeholder="+61 4... or +61 2..."
                                className="bg-black border border-cyan-500 rounded px-2 py-1 text-white font-mono text-xs w-44"
                                autoFocus
                              />
                            ) : (
                              <span className="font-mono text-cyan-300 font-semibold">
                                {u.assigned_number}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-300 border border-emerald-800 text-[10px] flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5" /> Call
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-sky-950/50 text-sky-300 border border-sky-800 text-[10px] flex items-center gap-1">
                                <MessageSquare className="w-2.5 h-2.5" /> SMS
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSaveUserNumber(u.user_id, u.user_name)}
                                  className="px-2 py-1 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded text-[11px]"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingUserId(null)}
                                  className="px-2 py-1 bg-[#282828] text-gray-300 hover:text-white rounded text-[11px]"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingUserId(u.user_id);
                                  setEditedNumber(u.assigned_number);
                                }}
                                className="px-2 py-1 bg-[#252525] hover:bg-[#333] text-gray-300 rounded text-[11px] transition-colors"
                              >
                                Edit Number
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: WEBHOOK SETUP GUIDE */}
          {activeTab === 'webhooks' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  VoIPLine Global Webhook Configuration Steps
                </h3>
                <p className="text-gray-400 leading-relaxed text-xs">
                  Configure your global webhooks within the VoIPLine dashboard using the exact steps below:
                </p>

                {/* Step 1 */}
                <div className="p-3 bg-[#141414] rounded-lg border border-[#2a2a2a] space-y-1.5">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[11px]">1</span>
                    <span>Navigate to Webhooks</span>
                  </div>
                  <p className="text-gray-400 pl-7">
                    Click on the <strong>Integration/API</strong> tab at the top of your customer portal, then select the <strong>Webhooks</strong> option from the left-hand menu.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-3 bg-[#141414] rounded-lg border border-[#2a2a2a] space-y-2">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[11px]">2</span>
                    <span>Set the URL and Secret Token</span>
                  </div>
                  <p className="text-gray-400 pl-7 leading-relaxed">
                    Enter your webhook endpoint into the URL field. In the Secret Token field, enter a secure string. Your application will use this token to validate the <code className="text-cyan-300">X-Pbx-Token</code> HTTP header on incoming requests.
                  </p>
                  <div className="pl-7 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 w-24">Webhook URL:</span>
                      <code className="font-mono bg-black/60 px-2 py-1 rounded text-cyan-300 border border-[#333] flex-1 truncate">
                        {webhookUrl}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(webhookUrl, 'webhook_url')}
                        className="px-2 py-1 bg-[#252525] hover:bg-[#333] text-gray-200 rounded flex items-center gap-1 shrink-0"
                      >
                        {copiedField === 'webhook_url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>Copy</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 w-24">Secret Token:</span>
                      <code className="font-mono bg-black/60 px-2 py-1 rounded text-amber-300 border border-[#333] flex-1 truncate">
                        {webhookSecret}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(webhookSecret, 'secret_token')}
                        className="px-2 py-1 bg-[#252525] hover:bg-[#333] text-gray-200 rounded flex items-center gap-1 shrink-0"
                      >
                        {copiedField === 'secret_token' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-3 bg-[#141414] rounded-lg border border-[#2a2a2a] space-y-1.5">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[11px]">3</span>
                    <span>Select Your Triggers</span>
                  </div>
                  <p className="text-gray-400 pl-7 leading-relaxed">
                    Check the boxes next to the events you want to receive payloads for. For your CRM integration, select:
                  </p>
                  <ul className="list-disc list-inside pl-9 space-y-1 text-gray-300">
                    <li><strong>User inbound call</strong>, <strong>User inbound call answered</strong>, <strong>User inbound call completion</strong></li>
                    <li><strong>User outbound call</strong> & <strong>Voicemail</strong></li>
                    <li><strong>Inbound call recording</strong> & <strong>Outbound call recording</strong> (triggers when audio files compile)</li>
                    <li><strong>Inbound SMS</strong></li>
                  </ul>
                </div>

                {/* Step 4 (CRITICAL) */}
                <div className="p-3.5 bg-rose-500/10 rounded-lg border border-rose-500/30 space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-rose-500/30 text-rose-200 flex items-center justify-center text-[11px]">4</span>
                    <span>Apply the Configuration (Critical final step)</span>
                  </div>
                  <p className="text-rose-200/90 pl-7 leading-relaxed font-medium">
                    Simply saving the webhooks is not enough. You must navigate to the <strong>PBX</strong> tab and click the red <strong>Apply configuration</strong> button for the changes to take effect in your live call flow.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TEST DIALER & WEBHOOK SIMULATOR */}
          {activeTab === 'test' && (
            <div className="space-y-6">
              {/* Test Outbound Originate */}
              <div className="p-4 bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] space-y-3">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-cyan-400" />
                  Test Outbound Call Origination (/api/calls/originate)
                </h4>
                <p className="text-gray-400 text-xs">
                  Initiates a call via the VoIPLine API. Looks up active user&apos;s assigned Virtual Mobile Number as Caller ID, verifies API key header, and creates a record in <code className="text-cyan-300">call_logs</code>.
                </p>

                <form onSubmit={handleTestCallOrigination} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-300 mb-1 text-[11px]">CRM User</label>
                    <select
                      value={testUser}
                      onChange={e => setTestUser(e.target.value)}
                      className="w-full bg-[#121212] border border-[#333] rounded-lg px-2.5 py-1.5 text-white text-xs"
                    >
                      {userNumbers.map(u => (
                        <option key={u.user_id} value={u.user_id}>
                          {u.user_name || u.user_id} ({u.assigned_number})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-1 text-[11px]">Destination Phone Number</label>
                    <input
                      type="text"
                      value={testCallee}
                      onChange={e => setTestCallee(e.target.value)}
                      className="w-full bg-[#121212] border border-[#333] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                      placeholder="+61 4..."
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={callTesting}
                      className="w-full py-1.5 px-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {callTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{callTesting ? 'Originating...' : 'Originate Call'}</span>
                    </button>
                  </div>
                </form>

                {callTestResult && (
                  <div
                    className={`p-3 rounded-lg border text-xs font-mono whitespace-pre-wrap ${
                      callTestResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {JSON.stringify(callTestResult, null, 2)}
                  </div>
                )}
              </div>

              {/* Webhook Simulator */}
              <div className="p-4 bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] space-y-3">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-cyan-400" />
                  Webhook Receiver Simulator (/api/webhooks/voipline)
                </h4>
                <p className="text-gray-400 text-xs">
                  Simulate incoming VoIPLine webhooks with the <code className="text-cyan-300">X-Pbx-Token</code> HTTP header to test asynchronous call recording linking and inbound SMS ingestion.
                </p>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">Trigger:</span>
                    <select
                      value={webhookTestType}
                      onChange={e => setWebhookTestType(e.target.value as any)}
                      className="bg-[#121212] border border-[#333] rounded-lg px-2.5 py-1.5 text-white text-xs"
                    >
                      <option value="call_recording">Inbound/Outbound Call Recording (Asynchronous Audio)</option>
                      <option value="inbound_sms">Inbound SMS Message</option>
                      <option value="inbound_call">User inbound call (Ringing)</option>
                      <option value="call_answered">User inbound call answered</option>
                      <option value="call_completed">User inbound call completion</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunWebhookSimulation}
                    disabled={simulatingWebhook}
                    className="py-1.5 px-4 bg-[#262626] hover:bg-[#333] text-white border border-[#444] rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {simulatingWebhook ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>Dispatch Test Webhook</span>
                  </button>
                </div>

                {webhookSimResult && (
                  <div className="p-3 bg-[#121212] border border-[#333] rounded-lg space-y-2 text-[11px] font-mono">
                    <div className="flex items-center justify-between text-gray-400">
                      <span>HTTP Status: <strong className={webhookSimResult.success ? 'text-emerald-400' : 'text-rose-400'}>{webhookSimResult.status}</strong></span>
                      <span>X-Pbx-Token: Validated</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Sent Payload:</span>
                      <pre className="text-cyan-300 overflow-x-auto p-1.5 bg-black/40 rounded mt-0.5">
                        {JSON.stringify(webhookSimResult.sentPayload, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <span className="text-gray-500">Receiver Response:</span>
                      <pre className="text-emerald-400 overflow-x-auto p-1.5 bg-black/40 rounded mt-0.5">
                        {JSON.stringify(webhookSimResult.response, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#121212] border-t border-[#262626] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>X-Pbx-Token Authentication Active &bull; IP Whitelisting Enforced</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#252525] hover:bg-[#333] text-gray-200 font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
