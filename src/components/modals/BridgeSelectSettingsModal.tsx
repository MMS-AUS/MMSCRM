import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  Sliders,
  Award,
  Layers,
  FileText,
  DollarSign,
  ExternalLink,
  Lock,
  Globe,
  Check,
  Building,
  Key,
  Hash,
  Send,
  Info
} from 'lucide-react';
import {
  fetchBridgeSelectCredentials,
  saveBridgeSelectCredentials,
  pingBridgeSelectApi,
  evaluateProjectStcCompliance,
  pushJobToBridgeSelect,
  BridgeSelectPingResult
} from '../../services/bridgeSelectService';
import { Project } from '../../types';

interface BridgeSelectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'settings' | 'claims' | 'health';
}

export const BridgeSelectSettingsModal: React.FC<BridgeSelectSettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'settings'
}) => {
  const { projects = [], updateProject } = useApp();
  const [activeTab, setActiveTab] = useState<'settings' | 'claims' | 'health'>(initialTab);

  // Form State
  const [accountKey, setAccountKey] = useState('');
  const [accountSalt, setAccountSalt] = useState('');
  const [showSalt, setShowSalt] = useState(false);
  const [algorithm, setAlgorithm] = useState('sha256');
  const [baseUrl, setBaseUrl] = useState('https://api.bridgeselect.com.au');
  const [isConfigured, setIsConfigured] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Ping test state
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<BridgeSelectPingResult | null>(null);

  // Batch action state
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
  const [batchSuccessMessage, setBatchSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      loadCredentials();
    }
  }, [isOpen, initialTab]);

  const loadCredentials = async () => {
    try {
      const data = await fetchBridgeSelectCredentials();
      if (data.credentials) {
        setAccountKey(data.credentials.account_key || '');
        setAccountSalt(data.credentials.account_salt || '');
        setLastUpdatedAt(data.credentials.updated_at || null);
      }
      setIsConfigured(data.configured);
      if (data.algorithm) setAlgorithm(data.algorithm);
      if (data.baseUrl) setBaseUrl(data.baseUrl);
    } catch (err) {
      console.warn('Error fetching BridgeSelect credentials:', err);
    }
  };

  if (!isOpen) return null;

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);

    try {
      const res = await saveBridgeSelectCredentials({
        account_key: accountKey.trim(),
        account_salt: accountSalt.trim()
      });

      if (res.success) {
        setIsConfigured(true);
        setLastUpdatedAt(new Date().toISOString());
        setSaveSuccessMessage('BridgeSelect credentials successfully saved to Supabase!');
        setTimeout(() => setSaveSuccessMessage(null), 5000);
      } else {
        setSaveErrorMessage(res.error || 'Failed to save BridgeSelect credentials');
      }
    } catch (err: any) {
      setSaveErrorMessage(err.message || 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPing = async () => {
    setIsPinging(true);
    setPingResult(null);
    try {
      const res = await pingBridgeSelectApi();
      setPingResult(res);
    } finally {
      setIsPinging(false);
    }
  };

  // Evaluate all projects for STC claims
  const projectEvaluations = projects.map(p => evaluateProjectStcCompliance(p));
  const eligibleProjects = projectEvaluations.filter(
    e => e.isEligibleForLodgement && e.status !== 'synced' && e.status !== 'STCs Approved & Paid'
  );
  const totalEligibleSTCs = eligibleProjects.reduce((sum, e) => sum + e.stcCount, 0);
  const totalEligibleValueAud = eligibleProjects.reduce((sum, e) => sum + e.stcValueAud, 0);

  const handleSingleProjectPush = async (projectId: string) => {
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return;

    try {
      const res = await pushJobToBridgeSelect({
        jobId: proj.id,
        jobData: proj
      });

      updateProject(projectId, {
        bridgeselect_sync_status: res.status,
        bridgeselect_synced_at: res.status === 'synced' ? new Date().toISOString() : null,
        bridgeSelectStatus: res.status === 'synced' ? 'Submitted to Clean Energy Regulator' : 'Failed'
      });

      if (res.success) {
        setBatchSuccessMessage(`Project ${proj.projectCode} successfully pushed to BridgeSelect with checksum ${res.checksum.substring(0, 10)}...`);
      } else {
        setBatchSuccessMessage(`Project ${proj.projectCode} push result: ${res.message}`);
      }
      setTimeout(() => setBatchSuccessMessage(null), 6000);
    } catch (err: any) {
      setBatchSuccessMessage(`Push failed: ${err.message}`);
      setTimeout(() => setBatchSuccessMessage(null), 6000);
    }
  };

  const handleBatchPush = async () => {
    if (eligibleProjects.length === 0) return;
    setIsBatchSubmitting(true);

    let successCount = 0;
    for (const ep of eligibleProjects.slice(0, 5)) {
      const proj = projects.find(p => p.id === ep.projectId);
      if (proj) {
        try {
          const res = await pushJobToBridgeSelect({
            jobId: proj.id,
            jobData: proj
          });
          if (res.success) successCount++;
          updateProject(ep.projectId, {
            bridgeselect_sync_status: res.status,
            bridgeselect_synced_at: res.status === 'synced' ? new Date().toISOString() : null,
            bridgeSelectStatus: res.status === 'synced' ? 'Submitted to Clean Energy Regulator' : 'Pending'
          });
        } catch {
          // continue
        }
      }
    }

    setIsBatchSubmitting(false);
    setBatchSuccessMessage(
      `Batch lodgement completed: ${successCount} systems pushed to BridgeSelect STC Portal.`
    );
    setTimeout(() => setBatchSuccessMessage(null), 6000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4">
      <div className="w-full max-w-4xl bg-[#1e1e1e] rounded-xl shadow-2xl border border-[#2d2d2d] overflow-hidden flex flex-col max-h-[92vh] text-[#e5e7eb]">
        {/* Header */}
        <div className="p-4 bg-[#161616] text-white flex items-center justify-between border-b border-[#262626]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#bef2641a] text-[#bef264] border border-[#bef26433]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white">
                  BridgeSelect Configuration
                </h3>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono border ${
                  isConfigured
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {isConfigured ? 'Connector API Connected' : 'Configuration Pending'}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                BridgeSelect STC Portal Connector API • SHA-256 Checksum Authentication • Auto-Push on Booked Status
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
        <div className="flex items-center border-b border-[#262626] bg-[#141414] px-4">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'settings'
                ? 'border-[#bef264] text-[#bef264]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>API Credentials &amp; Key Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('claims')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'claims'
                ? 'border-[#bef264] text-[#bef264]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Job Push Queue &amp; STC Batch</span>
            {eligibleProjects.length > 0 && (
              <span className="px-1.5 py-0.2 bg-[#bef264] text-black text-[10px] font-extrabold rounded-full ml-1">
                {eligibleProjects.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('health')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'health'
                ? 'border-[#bef264] text-[#bef264]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Connector Spec &amp; Checksum Logic</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {batchSuccessMessage && (
            <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-300 text-xs font-medium">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{batchSuccessMessage}</span>
            </div>
          )}

          {/* TAB 1: SETTINGS / CREDENTIALS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveCredentials} className="space-y-5">
              {saveSuccessMessage && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{saveSuccessMessage}</span>
                </div>
              )}

              {saveErrorMessage && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-300 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>{saveErrorMessage}</span>
                </div>
              )}

              {/* Account KEY and SALT Form */}
              <div className="p-5 rounded-xl bg-[#161616] border border-[#262626] space-y-4">
                <div className="flex items-center justify-between border-b border-[#262626] pb-3">
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-white flex items-center gap-2">
                      <Key className="w-4 h-4 text-[#bef264]" />
                      <span>BridgeSelect Connector API Credentials</span>
                    </h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Enter the Account KEY and SALT provided in your BridgeSelect STC Portal dashboard.
                    </p>
                  </div>
                  {lastUpdatedAt && (
                    <span className="text-[10px] text-gray-500 font-mono">
                      Updated: {new Date(lastUpdatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Field 1: Account KEY */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Account KEY <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={accountKey}
                        onChange={e => setAccountKey(e.target.value)}
                        placeholder="e.g. bs_live_sec_9941a823bf1c8e90"
                        className="w-full text-xs font-mono bg-[#121212] border border-[#2d2d2d] rounded-lg px-3 py-2.5 text-white font-semibold focus:border-[#bef264] outline-none"
                        required
                      />
                    </div>
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      The unique account KEY provided by BridgeSelect. Identifies your organization in API requests.
                    </span>
                  </div>

                  {/* Field 2: Account SALT */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-300">
                        Account SALT <span className="text-rose-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowSalt(!showSalt)}
                        className="text-[11px] text-[#bef264] hover:underline"
                      >
                        {showSalt ? 'Hide SALT' : 'Show SALT'}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showSalt ? 'text' : 'password'}
                        value={accountSalt}
                        onChange={e => setAccountSalt(e.target.value)}
                        placeholder="e.g. salt_cer_sec_884920194827"
                        className="w-full text-xs font-mono bg-[#121212] border border-[#2d2d2d] rounded-lg px-3 py-2.5 text-white font-semibold focus:border-[#bef264] outline-none"
                        required
                      />
                    </div>
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      The SALT string used for cryptographic checksum generation. Appended to the Base64 payload before SHA-256 hashing.
                    </span>
                  </div>
                </div>

                {/* API Endpoint & Specification Info */}
                <div className="mt-4 p-3 bg-[#111] rounded-lg border border-[#262626] text-xs text-gray-400 space-y-1.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-gray-300">
                    <span className="font-semibold text-white">Target Endpoint:</span>
                    <span className="text-[#bef264]">{baseUrl}/connector/&#123;account_key&#125;/job/create-or-edit</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-300">
                    <span className="font-semibold text-white">Checksum Algorithm:</span>
                    <span className="text-sky-400 uppercase font-bold">{algorithm}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-300">
                    <span className="font-semibold text-white">Automated Trigger:</span>
                    <span className="text-emerald-400">Status "Booked" &rarr; Auto-push in background</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleTestPing}
                  disabled={isPinging}
                  className="px-3.5 py-2.5 rounded-lg bg-[#262626] hover:bg-[#333] text-gray-200 border border-[#333] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#bef264] ${isPinging ? 'animate-spin' : ''}`} />
                  <span>{isPinging ? 'Testing Connection...' : 'Test BridgeSelect Ping'}</span>
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-[#bef264] hover:bg-[#a3e635] text-black font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <SaveIcon className="w-4 h-4 text-black" />
                  <span>{isSaving ? 'Saving to Supabase...' : 'Save Configuration'}</span>
                </button>
              </div>

              {pingResult && (
                <div className="p-4 bg-[#141414] border border-[#2d2d2d] rounded-xl text-xs text-gray-300 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`font-bold flex items-center gap-1.5 ${pingResult.success ? 'text-emerald-400' : 'text-amber-400'}`}>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{pingResult.message}</span>
                    </span>
                    <span className="text-[11px] font-mono text-gray-400">Latency: {pingResult.latencyMs}ms</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#262626] text-[11px]">
                    <div>
                      <span className="text-gray-400 block">BridgeSelect Registry:</span>
                      <strong className="text-emerald-400">{pingResult.recRegistryStatus}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Spot STC Feed:</span>
                      <strong className="text-white">${pingResult.spotRateAud.toFixed(2)} AUD</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Deeming Multiplier:</span>
                      <strong className="text-white">{pingResult.currentDeemingMultiplier.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Gateway Time:</span>
                      <strong className="text-white">{pingResult.timestamp}</strong>
                    </div>
                  </div>
                </div>
              )}
            </form>
          )}

          {/* TAB 2: CLAIMS & BATCH PUSH */}
          {activeTab === 'claims' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#161616] rounded-xl border border-[#262626] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#bef264]" />
                    <span>BridgeSelect STC Push Queue</span>
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Projects ready for Clean Energy Regulator STC creation and BridgeSelect lodgement.
                  </p>
                </div>
                <button
                  onClick={handleBatchPush}
                  disabled={isBatchSubmitting || eligibleProjects.length === 0}
                  className="px-4 py-2 bg-[#bef264] hover:bg-[#a3e635] text-black font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Send className={`w-3.5 h-3.5 ${isBatchSubmitting ? 'animate-spin' : ''}`} />
                  <span>{isBatchSubmitting ? 'Pushing Batch...' : 'Push Eligible Projects to BridgeSelect'}</span>
                </button>
              </div>

              <div className="border border-[#262626] rounded-xl overflow-hidden bg-[#161616]">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#121212] text-gray-400 border-b border-[#262626]">
                      <tr>
                        <th className="p-3">Project Code</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">System / NMI</th>
                        <th className="p-3">STCs</th>
                        <th className="p-3">Sync Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#262626]">
                      {projects.slice(0, 15).map(proj => {
                        const syncStatus = (proj as any).bridgeselect_sync_status || 'un-synced';
                        return (
                          <tr key={proj.id} className="hover:bg-[#1a1a1a] transition-colors">
                            <td className="p-3 font-mono font-bold text-white">
                              {proj.projectCode}
                            </td>
                            <td className="p-3 text-gray-300">
                              <div className="font-semibold text-white">{proj.customerName}</div>
                              <div className="text-[11px] text-gray-500">{proj.address}, {proj.state}</div>
                            </td>
                            <td className="p-3 text-gray-300">
                              <div>{proj.systemSizeKw} kW • {proj.inverterBrand || 'Inverter'}</div>
                              <div className="text-[10px] font-mono text-gray-500">NMI: {(proj as any).nmi || 'Pending'}</div>
                            </td>
                            <td className="p-3 text-gray-200 font-mono">
                              {proj.stcCount || Math.round(proj.systemSizeKw * 6.91)} STCs
                            </td>
                            <td className="p-3">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                syncStatus === 'synced'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : syncStatus === 'failed'
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                  : syncStatus === 'Validation Failed'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : 'bg-gray-800 text-gray-400 border-gray-700'
                              }`}>
                                {syncStatus === 'synced' && <CheckCircle2 className="w-3 h-3" />}
                                {syncStatus}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleSingleProjectPush(proj.id)}
                                className="px-2.5 py-1 rounded bg-[#262626] hover:bg-[#333] text-[#bef264] border border-[#333] text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                Push to BridgeSelect
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SPEC & CHECKSUM EXPLANATION */}
          {activeTab === 'health' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#161616] rounded-xl border border-[#262626] space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#bef264]" />
                  <span>BridgeSelect Connector Security &amp; Cryptographic Hashing</span>
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  BridgeSelect uses a strict payload construction method for tamper-proof API authentication. The CRM follows this exact cryptographic pipeline:
                </p>

                <div className="space-y-2 text-xs font-mono bg-[#111] p-4 rounded-lg border border-[#262626]">
                  <div className="flex items-start gap-2 text-gray-300">
                    <span className="text-[#bef264] font-bold">1.</span>
                    <span>Fetch CRM record and map to keys: <span className="text-white">id, fn, ln, e, p, addr, pc, state, nmi, pv_brand, inv_brand, sys_size, etc.</span></span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-300">
                    <span className="text-[#bef264] font-bold">2.</span>
                    <span>Convert mapped object to string and compute <span className="text-white">Base64</span> encoding.</span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-300">
                    <span className="text-[#bef264] font-bold">3.</span>
                    <span>Append the <span className="text-amber-400 font-bold">account_salt</span> directly to the end of the Base64 string (<span className="text-gray-400">base64Payload + account_salt</span>).</span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-300">
                    <span className="text-[#bef264] font-bold">4.</span>
                    <span>Generate <span className="text-sky-400 font-bold">SHA-256</span> checksum hash digest.</span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-300">
                    <span className="text-[#bef264] font-bold">5.</span>
                    <span>POST to <span className="text-emerald-400">{baseUrl}/connector/&#123;account_key&#125;/job/create-or-edit</span> with data (Base64) &amp; checksum.</span>
                  </div>
                </div>

                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Automated Status Trigger:</strong> When any job's installation status updates to <strong className="text-white">"Booked"</strong>, the CRM automatically validates required STC fields and pushes the record to BridgeSelect in the background.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function SaveIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  );
}
