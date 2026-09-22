import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Globe,
  Sliders,
  ShieldCheck,
  Check,
  CheckCircle2,
  X,
  Sparkles,
  Lock,
  ArrowRight,
  RefreshCw,
  Server
} from 'lucide-react';
import { getPortalProductionUrl } from '../../utils/portalUrls';

interface DynamicSubdomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPortal?: 'customer' | 'installer';
}

export const DynamicSubdomainModal: React.FC<DynamicSubdomainModalProps> = ({
  isOpen,
  onClose,
  initialPortal = 'customer'
}) => {
  const {
    portalAddresses,
    updatePortalAddress,
    connectedDomains,
    addConnectedDomain,
    addNotification
  } = useApp();

  const [selectedPortal, setSelectedPortal] = useState<'customer' | 'installer'>(initialPortal);

  const activeConfig =
    selectedPortal === 'customer'
      ? portalAddresses.customerPortal
      : portalAddresses.installerPortal;

  const [subdomainInput, setSubdomainInput] = useState(activeConfig.subdomain || (selectedPortal === 'customer' ? 'customer' : 'installers'));
  const [baseDomainInput, setBaseDomainInput] = useState(activeConfig.baseDomain || connectedDomains[0] || 'mysolarcrm.com.au');
  const [customDomainInput, setCustomDomainInput] = useState(activeConfig.customDomain || '');
  const [routingMode, setRoutingMode] = useState(activeConfig.routingMode || 'subdomain');
  const [customNewBase, setCustomNewBase] = useState('');
  const [isAddingNewBase, setIsAddingNewBase] = useState(false);
  const [savedNotification, setSavedNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle portal switch
  const handleSwitchPortal = (type: 'customer' | 'installer') => {
    setSelectedPortal(type);
    const cfg = type === 'customer' ? portalAddresses.customerPortal : portalAddresses.installerPortal;
    setSubdomainInput(cfg.subdomain);
    setBaseDomainInput(cfg.baseDomain);
    setCustomDomainInput(cfg.customDomain || '');
    setRoutingMode(cfg.routingMode);
    setSavedNotification(null);
  };

  const customerPresets = ['customer', 'client', 'portal', 'myenergy', 'solar', 'account'];
  const installerPresets = ['installers', 'installer', 'subcontractor', 'contractor', 'field', 'crew', 'ops'];
  const activePresets = selectedPortal === 'customer' ? customerPresets : installerPresets;

  // Generate live preview URL
  const previewUrl =
    routingMode === 'subdomain'
      ? `https://${subdomainInput || (selectedPortal === 'customer' ? 'customer' : 'installers')}.${baseDomainInput}`
      : routingMode === 'path'
      ? `https://${baseDomainInput}/${activeConfig.pathPrefix || (selectedPortal === 'customer' ? 'portal/customer' : 'portal/installers')}`
      : `https://${customDomainInput || (selectedPortal === 'customer' ? 'client.myenergy.com.au' : 'crew.myenergy.com.au')}`;

  const handleSaveSubdomain = (e: React.FormEvent) => {
    e.preventDefault();

    const sanitizedSubdomain = subdomainInput.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');

    updatePortalAddress(selectedPortal, {
      subdomain: sanitizedSubdomain,
      baseDomain: baseDomainInput,
      customDomain: customDomainInput.trim().toLowerCase(),
      routingMode
    });

    const portalLabel = selectedPortal === 'customer' ? 'Customer Portal' : 'Installer Portal';
    const msg = `${portalLabel} dynamic address successfully updated to: ${previewUrl}`;
    setSavedNotification(msg);

    addNotification({
      title: `${portalLabel} Subdomain Updated`,
      message: `System Administrator updated canonical portal routing to ${previewUrl}`,
      type: 'success',
      actionUrl: '/settings'
    });

    setTimeout(() => {
      setSavedNotification(null);
      onClose();
    }, 1800);
  };

  const handleAddCustomBaseDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customNewBase.trim()) return;
    const clean = customNewBase.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    addConnectedDomain(clean);
    setBaseDomainInput(clean);
    setCustomNewBase('');
    setIsAddingNewBase(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#141414] border border-[#2d2d2d] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl space-y-4 p-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#262626] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#bef264]/10 border border-[#bef264]/30 flex items-center justify-center text-[#bef264]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  Dynamic Subdomain &amp; Routing Editor
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#bef264]/10 text-[#bef264] border border-[#bef264]/30 font-bold">
                  System Admin Unlocked
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                Directly configure dedicated ingress subdomains with automated SSL certificates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#262626] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Portal Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-[#181818] p-1.5 rounded-xl border border-[#262626]">
          <button
            type="button"
            onClick={() => handleSwitchPortal('customer')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              selectedPortal === 'customer'
                ? 'bg-[#bef264] text-black shadow-xs'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Customer Portal</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchPortal('installer')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              selectedPortal === 'installer'
                ? 'bg-emerald-400 text-black shadow-xs'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Installer Portal</span>
          </button>
        </div>

        {/* Live Canonical Preview Bar */}
        <div className="p-3 bg-[#181818] border border-[#2d2d2d] rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-gray-400">
              Live Canonical Address:
            </span>
            <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>TLS 1.3 Automatic</span>
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-white bg-[#121212] p-2 rounded-lg border border-[#242424]">
            <Globe className="w-4 h-4 text-[#bef264] shrink-0" />
            <span className="truncate">{previewUrl}</span>
          </div>
        </div>

        {savedNotification && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{savedNotification}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSaveSubdomain} className="space-y-4">
          {/* Routing Mode */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-300">
              Routing Architecture
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['subdomain', 'path', 'custom_domain'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setRoutingMode(mode)}
                  className={`py-2 px-2.5 rounded-lg text-xs font-semibold capitalize transition-all border ${
                    routingMode === mode
                      ? 'bg-[#bef264] text-black border-[#bef264] font-bold'
                      : 'bg-[#181818] text-gray-400 border-[#282828] hover:text-white'
                  }`}
                >
                  {mode === 'custom_domain' ? 'Custom CNAME' : mode}
                </button>
              ))}
            </div>
          </div>

          {/* Subdomain Input & Presets */}
          {routingMode === 'subdomain' && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Editable Subdomain
                  </label>
                  <div className="flex items-center bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white focus-within:border-[#bef264]">
                    <input
                      type="text"
                      value={subdomainInput}
                      onChange={e =>
                        setSubdomainInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                      }
                      placeholder="e.g. customer"
                      className="w-full bg-transparent outline-none font-mono font-bold"
                      required
                    />
                    <span className="text-gray-500 font-mono text-xs">.</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-300">
                      Parent Domain
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewBase(!isAddingNewBase)}
                      className="text-[10px] text-[#bef264] hover:underline"
                    >
                      {isAddingNewBase ? 'Cancel' : '+ Add Domain'}
                    </button>
                  </div>
                  <select
                    value={baseDomainInput}
                    onChange={e => setBaseDomainInput(e.target.value)}
                    className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-2.5 py-2 text-xs text-white outline-none focus:border-[#bef264]"
                  >
                    {connectedDomains.map(dom => (
                      <option key={dom} value={dom}>
                        {dom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Add Custom Base Domain Input */}
              {isAddingNewBase && (
                <div className="p-2.5 bg-[#1a1a1a] rounded-lg border border-[#2e2e2e] flex items-center gap-2">
                  <input
                    type="text"
                    value={customNewBase}
                    onChange={e => setCustomNewBase(e.target.value)}
                    placeholder="e.g. solarinstallers.com.au"
                    className="flex-1 bg-[#121212] border border-[#333] rounded px-2.5 py-1.5 text-xs text-white outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomBaseDomain}
                    className="px-3 py-1.5 bg-[#bef264] text-black text-xs font-bold rounded"
                  >
                    Use Domain
                  </button>
                </div>
              )}

              {/* Quick Subdomain Presets */}
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                  Quick Subdomain Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activePresets.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSubdomainInput(preset)}
                      className={`px-2 py-1 rounded text-[11px] font-mono transition-colors border ${
                        subdomainInput === preset
                          ? 'bg-[#bef264]/20 border-[#bef264] text-[#bef264] font-bold'
                          : 'bg-[#1a1a1a] border-[#2c2c2c] text-gray-300 hover:text-white'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Custom CNAME Mode */}
          {routingMode === 'custom_domain' && (
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Fully Qualified Custom Domain (FQDN)
              </label>
              <input
                type="text"
                value={customDomainInput}
                onChange={e => setCustomDomainInput(e.target.value.toLowerCase())}
                placeholder="e.g. portal.mybrand.com.au"
                className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-[#bef264] outline-none"
                required
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                Point this FQDN to CNAME <strong>cname.mysolarcrm.com.au</strong> on your registrar.
              </span>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-[#262626]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-[#222] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Apply &amp; Save Subdomain</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
