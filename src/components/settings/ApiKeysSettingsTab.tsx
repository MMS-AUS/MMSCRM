import React, { useState, useEffect } from 'react';
import {
  Key,
  Shield,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Save,
  Flame,
  Zap,
  Globe,
  MessageSquare,
  FileSpreadsheet,
  Sun,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Search,
  Filter
} from 'lucide-react';

interface ConfigField {
  key: string;
  label: string;
  category: 'supabase' | 'firebase' | 'azure_teams' | 'xero' | 'gmail' | 'solar' | 'general';
  isSecret: boolean;
  value: string;
  isConfigured: boolean;
  source: 'app_config' | 'environment' | 'firebase_applet' | 'none';
  placeholder?: string;
  helpText?: string;
}

const CATEGORY_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; portalUrl?: string; portalLabel?: string }
> = {
  supabase: {
    label: 'Supabase Cloud Database',
    icon: Zap,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    portalUrl: 'https://supabase.com/dashboard',
    portalLabel: 'Supabase Dashboard'
  },
  firebase: {
    label: 'Firebase Web App & Auth',
    icon: Flame,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    portalUrl: 'https://console.firebase.google.com',
    portalLabel: 'Firebase Console'
  },
  azure_teams: {
    label: 'Microsoft Teams & Azure Entra',
    icon: MessageSquare,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    portalUrl: 'https://entra.microsoft.com',
    portalLabel: 'Microsoft Entra Admin'
  },
  xero: {
    label: 'Xero Cloud Accounting',
    icon: FileSpreadsheet,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    portalUrl: 'https://developer.xero.com/app/manage',
    portalLabel: 'Xero Developer Portal'
  },
  gmail: {
    label: 'Google Cloud & Gmail OAuth',
    icon: Globe,
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    portalUrl: 'https://console.cloud.google.com/apis/credentials',
    portalLabel: 'Google Cloud Console'
  },
  solar: {
    label: 'Solar CAD & Imagery APIs',
    icon: Sun,
    color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    portalUrl: 'https://app.opensolar.com',
    portalLabel: 'OpenSolar Settings'
  },
  general: {
    label: 'Domain & Application Routing',
    icon: Key,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30'
  }
};

export const ApiKeysSettingsTab: React.FC = () => {
  const [fields, setFields] = useState<ConfigField[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Diagnostic ping states
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; latencyMs?: number }>>({});

  const loadCredentials = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/system/credentials');
      const data = await res.json();
      if (data.success && Array.isArray(data.credentials)) {
        setFields(data.credentials);
        const map: Record<string, string> = {};
        data.credentials.forEach((f: ConfigField) => {
          map[f.key] = f.value || '';
        });
        setFormValues(map);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to load credentials from server: ' + err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCredentials();
  }, []);

  const handleInputChange = (key: string, value: string) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const toggleSecretVisibility = (key: string) => {
    setVisibleSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text: string, keyIdentifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyIdentifier);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/system/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: formValues })
      });
      const result = await res.json();

      if (result.success) {
        setFeedback({
          type: 'success',
          message: `Saved and applied ${result.updatedKeys.length} key(s) directly in the app. Changes are effective immediately!`
        });
        await loadCredentials();
      } else {
        setFeedback({ type: 'error', message: result.error || 'Failed to save credentials' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Network error saving keys: ' + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncFirebase = async () => {
    try {
      const res = await fetch('/api/system/credentials/sync-firebase', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: 'Firebase keys automatically populated from your applet config file!'
        });
        await loadCredentials();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to sync Firebase: ' + err.message });
    }
  };

  const handleTestConnection = async (provider: 'supabase' | 'azure_teams' | 'firebase') => {
    setTestingProvider(provider);
    try {
      const res = await fetch('/api/system/credentials/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          overrideData: formValues
        })
      });
      const data = await res.json();
      setTestResults(prev => ({
        ...prev,
        [provider]: {
          success: data.success,
          message: data.message,
          latencyMs: data.latencyMs
        }
      }));
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [provider]: {
          success: false,
          message: 'Ping failed: ' + err.message
        }
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  const handleExportEnv = () => {
    const lines = fields.map(f => {
      const val = formValues[f.key] || '';
      return `${f.key}="${val}"`;
    });
    copyToClipboard(lines.join('\n'), 'all_env');
    setFeedback({
      type: 'success',
      message: 'All environment variables formatted and copied to clipboard!'
    });
  };

  // Filtered fields
  const filteredFields = fields.filter(field => {
    const matchesCategory = selectedCategory === 'all' || field.category === selectedCategory;
    const matchesQuery =
      searchQuery === '' ||
      field.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (field.helpText && field.helpText.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesQuery;
  });

  const configuredCount = fields.filter(f => Boolean(formValues[f.key]?.trim())).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="p-5 bg-gradient-to-r from-[#141414] to-[#1c1c1c] border border-[#2a2a2a] rounded-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#bef264]/10 rounded-xl border border-[#bef264]/30 text-[#bef264]">
                <Key className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                API Keys, Secrets &amp; Integration Environment
              </h2>
            </div>
            <p className="text-xs text-gray-400 max-w-2xl">
              Add or modify keys, secrets, IDs, and endpoints directly within your CRM. All values are stored securely
              in the server configuration and apply immediately without requiring redeployment.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSyncFirebase}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#202020] hover:bg-[#282828] text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded-xl text-xs font-semibold transition-all"
              title="Pre-fills Firebase API Key, Project ID, and App ID from firebase-applet-config.json"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Import Firebase Config</span>
            </button>

            <button
              type="button"
              onClick={handleExportEnv}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#202020] hover:bg-[#282828] text-gray-300 hover:text-white border border-[#333] rounded-xl text-xs font-semibold transition-all"
              title="Copy entire .env file configuration format to clipboard"
            >
              {copiedKey === 'all_env' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'all_env' ? 'Copied .env!' : 'Copy .env Block'}</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-[#bef264] hover:bg-[#a3e635] text-slate-950 rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Saving...' : 'Save & Apply Keys'}</span>
            </button>
          </div>
        </div>

        {/* Status Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 mt-4 border-t border-[#262626]">
          <div className="p-2.5 bg-[#171717] border border-[#262626] rounded-xl">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Configured Keys</span>
            <span className="text-sm font-extrabold text-white">
              {configuredCount} <span className="text-xs font-normal text-gray-500">/ {fields.length} active</span>
            </span>
          </div>

          <div className="p-2.5 bg-[#171717] border border-[#262626] rounded-xl">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Supabase Status</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  formValues['SUPABASE_URL'] && (formValues['SUPABASE_SERVICE_ROLE_KEY'] || formValues['SUPABASE_ANON_KEY'])
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-gray-500'
                }`}
              />
              <span className="text-xs font-bold text-gray-200">
                {formValues['SUPABASE_URL'] ? 'Configured' : 'Missing URL'}
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-[#171717] border border-[#262626] rounded-xl">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Firebase App</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${formValues['VITE_FIREBASE_API_KEY'] ? 'bg-amber-400' : 'bg-gray-500'}`}
              />
              <span className="text-xs font-bold text-gray-200">
                {formValues['VITE_FIREBASE_API_KEY'] ? 'Active Web Key' : 'Not Set'}
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-[#171717] border border-[#262626] rounded-xl">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Teams / Azure</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${formValues['AZURE_CLIENT_ID'] ? 'bg-blue-400' : 'bg-gray-500'}`}
              />
              <span className="text-xs font-bold text-gray-200">
                {formValues['AZURE_CLIENT_ID'] ? 'Client Registered' : 'Pending'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Real-Time Integration Ping & Diagnostics Bar */}
      <div className="p-4 bg-[#141414] border border-[#262626] rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#bef264]" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Live Connection Health Diagnostics
            </span>
          </div>
          <span className="text-[11px] text-gray-400">Test live server handshakes before saving</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Test Supabase */}
          <div className="p-3 bg-[#181818] border border-[#2d2d2d] rounded-xl flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                Supabase
              </span>
              <button
                type="button"
                onClick={() => handleTestConnection('supabase')}
                disabled={testingProvider === 'supabase'}
                className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50"
              >
                {testingProvider === 'supabase' ? 'Testing...' : 'Ping Test'}
              </button>
            </div>
            {testResults['supabase'] && (
              <div
                className={`text-[11px] p-2 rounded-lg border ${
                  testResults['supabase'].success
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}
              >
                {testResults['supabase'].message}
              </div>
            )}
          </div>

          {/* Test Azure Teams */}
          <div className="p-3 bg-[#181818] border border-[#2d2d2d] rounded-xl flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                Microsoft Entra ID
              </span>
              <button
                type="button"
                onClick={() => handleTestConnection('azure_teams')}
                disabled={testingProvider === 'azure_teams'}
                className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50"
              >
                {testingProvider === 'azure_teams' ? 'Testing...' : 'Check Tenant'}
              </button>
            </div>
            {testResults['azure_teams'] && (
              <div
                className={`text-[11px] p-2 rounded-lg border ${
                  testResults['azure_teams'].success
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}
              >
                {testResults['azure_teams'].message}
              </div>
            )}
          </div>

          {/* Test Firebase */}
          <div className="p-3 bg-[#181818] border border-[#2d2d2d] rounded-xl flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Firebase Web API
              </span>
              <button
                type="button"
                onClick={() => handleTestConnection('firebase')}
                disabled={testingProvider === 'firebase'}
                className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50"
              >
                {testingProvider === 'firebase' ? 'Testing...' : 'Verify Key'}
              </button>
            </div>
            {testResults['firebase'] && (
              <div
                className={`text-[11px] p-2 rounded-lg border ${
                  testResults['firebase'].success
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}
              >
                {testResults['firebase'].message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Filter Pills & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {[
            { id: 'all', label: 'All Services', icon: Key },
            { id: 'supabase', label: 'Supabase', icon: Zap },
            { id: 'firebase', label: 'Firebase', icon: Flame },
            { id: 'azure_teams', label: 'Teams / Azure', icon: MessageSquare },
            { id: 'xero', label: 'Xero', icon: FileSpreadsheet },
            { id: 'gmail', label: 'Gmail', icon: Globe },
            { id: 'solar', label: 'Solar & CAD', icon: Sun },
            { id: 'general', label: 'App URLs', icon: Globe }
          ].map(cat => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#bef264] text-slate-950 font-bold'
                    : 'bg-[#181818] text-gray-400 hover:text-white border border-[#2a2a2a]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search key or service..."
            className="w-full bg-[#181818] border border-[#2a2a2a] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none"
          />
        </div>
      </div>

      {/* Credentials Input List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#bef264]" />
            <span>Loading credentials registry...</span>
          </div>
        ) : filteredFields.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs bg-[#141414] border border-[#262626] rounded-xl">
            No variables match your current filter.
          </div>
        ) : (
          filteredFields.map(field => {
            const isConfigured = Boolean(formValues[field.key]?.trim());
            const isSecretVisible = visibleSecrets[field.key];
            const meta = CATEGORY_META[field.category] || CATEGORY_META.general;
            const CategoryIcon = meta.icon;

            return (
              <div
                key={field.key}
                className="p-4 bg-[#141414] hover:bg-[#161616] border border-[#262626] rounded-xl transition-all space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold flex items-center gap-1 ${meta.color}`}>
                      <CategoryIcon className="w-3 h-3" />
                      {meta.label}
                    </span>

                    <span className="font-mono text-xs font-bold text-white tracking-wide">
                      {field.key}
                    </span>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(field.key, `key_${field.key}`)}
                      className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                      title="Copy variable name"
                    >
                      {copiedKey === `key_${field.key}` ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Source badge */}
                    {field.source === 'app_config' && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-semibold">
                        In-App Configured
                      </span>
                    )}
                    {field.source === 'environment' && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-semibold">
                        Environment Variable
                      </span>
                    )}
                    {field.source === 'firebase_applet' && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-semibold">
                        Firebase Applet
                      </span>
                    )}

                    {isConfigured ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-400 border border-gray-600/30 text-[10px] font-semibold">
                        Not Set
                      </span>
                    )}
                  </div>
                </div>

                {/* Input row */}
                <div className="relative flex items-center">
                  <input
                    type={field.isSecret && !isSecretVisible ? 'password' : 'text'}
                    value={formValues[field.key] || ''}
                    onChange={e => handleInputChange(field.key, e.target.value)}
                    placeholder={field.placeholder || 'Enter value...'}
                    className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 pr-20 text-xs text-white placeholder-gray-600 font-mono focus:border-[#bef264] outline-none transition-colors"
                  />

                  <div className="absolute right-2 flex items-center gap-1">
                    {field.isSecret && (
                      <button
                        type="button"
                        onClick={() => toggleSecretVisibility(field.key)}
                        className="p-1 text-gray-400 hover:text-white"
                        title={isSecretVisible ? 'Hide value' : 'Show value'}
                      >
                        {isSecretVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    {formValues[field.key] && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(formValues[field.key], `val_${field.key}`)}
                        className="p-1 text-gray-400 hover:text-white"
                        title="Copy value"
                      >
                        {copiedKey === `val_${field.key}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Helper text & portal deep link */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-gray-400 gap-1 pt-0.5">
                  <span>{field.helpText || field.label}</span>
                  {meta.portalUrl && (
                    <a
                      href={meta.portalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#bef264] hover:underline flex items-center gap-1 shrink-0 font-medium"
                    >
                      <span>Open {meta.portalLabel || 'Console'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Save Bar */}
      <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl flex items-center justify-between gap-4">
        <div className="text-xs text-gray-400">
          <span className="text-white font-semibold block">Instant Real-Time Persistence</span>
          <span>Saving updates <code className="text-[#bef264]">.app_config.json</code> and refreshes active runtime clients immediately.</span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#bef264] hover:bg-[#a3e635] text-slate-950 font-bold rounded-xl text-xs transition-all shadow-xs shrink-0 disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'Applying Changes...' : 'Save & Apply All Changes'}</span>
        </button>
      </div>
    </div>
  );
};
