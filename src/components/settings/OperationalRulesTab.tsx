import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileSpreadsheet,
  BadgeDollarSign,
  ShieldCheck,
  RotateCcw,
  Save,
  Zap,
  Phone,
  Clock,
  Building,
  CheckCircle2,
  TrendingUp,
  Receipt,
  Layers,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';

export const OperationalRulesTab: React.FC = () => {
  const { systemRules, updateSystemRules, resetSystemRules, recalculateAllProjectsStc, projects } = useApp();

  const [formData, setFormData] = useState({
    customerStcRateAud: systemRules.customerStcRateAud ?? 36.00,
    internalStcRateAud: systemRules.internalStcRateAud ?? systemRules.stcTradingRateAud ?? 39.50,
    stcTradingRateAud: systemRules.internalStcRateAud ?? systemRules.stcTradingRateAud ?? 39.50,
    defaultWarrantyYearsPanels: systemRules.defaultWarrantyYearsPanels ?? 25,
    defaultWarrantyYearsInverter: systemRules.defaultWarrantyYearsInverter ?? 10,
    defaultWarrantyYearsBattery: systemRules.defaultWarrantyYearsBattery ?? 10,
    referralBonusDefaultAud: systemRules.referralBonusDefaultAud ?? 500,
    maintenanceIntervalMonths: systemRules.maintenanceIntervalMonths ?? 24,
    requireReferralReceiptProof: systemRules.requireReferralReceiptProof ?? true,
    enableAutoDnspValidation: systemRules.enableAutoDnspValidation ?? true,
    enableAutoStcCalculation: systemRules.enableAutoStcCalculation ?? true,
    defaultState: systemRules.defaultState ?? 'NSW',
    emergencyContactPhone: systemRules.emergencyContactPhone ?? '1300 852 400',
    openSolarSyncIntervalMinutes: systemRules.openSolarSyncIntervalMinutes ?? 15
  });

  const [feedback, setFeedback] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const spreadPerCert = formData.internalStcRateAud - formData.customerStcRateAud;
  const sampleStcCount = 140; // Standard ~10.4kW residential system (Zone 3)
  const sampleCustomerRebate = Math.round(sampleStcCount * formData.customerStcRateAud);
  const sampleInternalClaim = Math.round(sampleStcCount * formData.internalStcRateAud);
  const sampleRetainedMargin = sampleInternalClaim - sampleCustomerRebate;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSystemRules({
      ...formData,
      stcTradingRateAud: formData.internalStcRateAud // keep backward compatible
    });
    setFeedback('Operational rules and dual STC rates saved successfully to system parameters.');
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSyncToProjects = () => {
    recalculateAllProjectsStc(formData.customerStcRateAud, formData.internalStcRateAud);
    updateSystemRules({
      ...formData,
      stcTradingRateAud: formData.internalStcRateAud
    });
    setSyncFeedback(
      `Synchronized dual STC rates ($${formData.customerStcRateAud.toFixed(2)} customer / $${formData.internalStcRateAud.toFixed(2)} internal) across all ${projects.length} active projects & updated P&L reconciliations!`
    );
    setTimeout(() => setSyncFeedback(null), 5000);
  };

  const handleReset = () => {
    if (window.confirm('Reset all operational rules and STC rates back to system factory defaults?')) {
      resetSystemRules();
      setFormData({
        customerStcRateAud: 36.00,
        internalStcRateAud: 39.50,
        stcTradingRateAud: 39.50,
        defaultWarrantyYearsPanels: 25,
        defaultWarrantyYearsInverter: 10,
        defaultWarrantyYearsBattery: 10,
        referralBonusDefaultAud: 500,
        maintenanceIntervalMonths: 24,
        requireReferralReceiptProof: true,
        enableAutoDnspValidation: true,
        enableAutoStcCalculation: true,
        defaultState: 'NSW',
        emergencyContactPhone: '1300 852 400',
        openSolarSyncIntervalMinutes: 15
      });
      setFeedback('Operational rules reset to default Australian solar parameters.');
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Bar */}
      <div className="bg-[#141414] p-4 sm:p-5 rounded-xl border border-[#262626] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#bef264]" />
            <h3 className="text-sm sm:text-base font-bold text-white">Dynamic Operational Rules &amp; STC Rates</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#bef2641a] text-[#bef264] border border-[#bef26433]">
              CER Dual Rate Engine
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Configure customer-facing point-of-sale invoice rebates, internal wholesale trading STC rates for P&amp;L profits, and warranty lifecycles.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1e1e1e] hover:bg-[#262626] text-xs font-semibold text-gray-300 hover:text-white border border-[#2d2d2d] transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 bg-[#bef264] hover:bg-[#a3e635] text-slate-950 text-xs font-bold rounded-lg transition-colors shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Operational Rules</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {syncFeedback && (
        <div className="p-3.5 bg-[#bef2641a] border border-[#bef2644d] rounded-xl text-xs text-[#bef264] font-medium flex items-center gap-2 animate-in fade-in duration-200">
          <RefreshCw className="w-4 h-4 text-[#bef264] shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Primary Feature: Dual STC Invoicing & Internal Profit Engine */}
      <div className="bg-[#141414] border border-[#2d2d2d] rounded-xl p-5 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#262626]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#bef2641a] text-[#bef264] border border-[#bef26433]">
              <BadgeDollarSign className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white tracking-wide">
                Clean Energy Regulator (CER) Dual STC Invoicing &amp; Trading Engine
              </h4>
              <p className="text-xs text-gray-400">
                Control the exact STC dollar rates applied to customer quotes &amp; tax invoices versus the internal wholesale STC rate used for profit calculations.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSyncToProjects}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#1e1e1e] hover:bg-[#282828] text-[#bef264] border border-[#bef2644d] text-xs font-bold rounded-lg transition-all shadow-xs self-start sm:self-auto"
            title="Recalculate customer invoice STC and internal profit STC for all existing projects"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Rates to All {projects.length} Active Projects</span>
          </button>
        </div>

        {/* Dual Rate Input Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card 1: Customer-Facing STC Invoicing Rate */}
          <div className="bg-[#181818] border border-[#2d2d2d] rounded-xl p-4 flex flex-col justify-between space-y-4 hover:border-blue-500/40 transition-colors">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Customer Invoicing STC Rate
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  Customer &amp; Invoices
                </span>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">
                Displayed to the customer on proposals, OpenSolar quotes, and customer tax invoices as the point-of-sale government rebate discount.
              </p>
            </div>

            <div className="pt-2 border-t border-[#262626]">
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Customer Invoiced Rate ($ AUD / Certificate)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-sm">$</span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="50"
                  value={formData.customerStcRateAud}
                  onChange={e =>
                    setFormData({ ...formData, customerStcRateAud: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-[#121212] border border-[#333] rounded-lg pl-8 pr-28 py-2.5 text-sm text-white focus:border-blue-400 outline-none font-mono font-bold"
                  placeholder="36.00"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-xs">
                  AUD / STC
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2">
                <span>Sample 10.4kW (140 STCs):</span>
                <span className="font-mono font-bold text-emerald-400">
                  -${sampleCustomerRebate.toLocaleString()} AUD on Invoice
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Internal Wholesale Trading STC Rate */}
          <div className="bg-[#181818] border border-[#2d2d2d] rounded-xl p-4 flex flex-col justify-between space-y-4 hover:border-[#bef264]/40 transition-colors">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-[#bef2641a] text-[#bef264] border border-[#bef26433]">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Internal CER Wholesale Trading Rate
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Internal Profit &amp; P&amp;L
                </span>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">
                Wholesale trading rate claimed from the Clean Energy Regulator via BridgeSelect/Clearinghouse. Used internally for P&amp;L reporting and true company gross profit.
              </p>
            </div>

            <div className="pt-2 border-t border-[#262626]">
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Internal Claim Rate ($ AUD / Certificate)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-sm">$</span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="50"
                  value={formData.internalStcRateAud}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      internalStcRateAud: parseFloat(e.target.value) || 0,
                      stcTradingRateAud: parseFloat(e.target.value) || 0
                    })
                  }
                  className="w-full bg-[#121212] border border-[#333] rounded-lg pl-8 pr-28 py-2.5 text-sm text-white focus:border-[#bef264] outline-none font-mono font-bold"
                  placeholder="39.50"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-xs">
                  AUD / STC
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2">
                <span>Sample 10.4kW (140 STCs):</span>
                <span className="font-mono font-bold text-[#bef264]">
                  +${sampleInternalClaim.toLocaleString()} AUD CER Remittance
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Interactive STC Trading Spread & Margin Calculator */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#121212] to-[#181818] border border-[#2d2d2d] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#bef264]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Live Retailer STC Trading Spread &amp; Profit Contribution
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Spread per Certificate:</span>
              <span
                className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md border ${
                  spreadPerCert >= 0
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}
              >
                {spreadPerCert >= 0 ? '+' : ''}${spreadPerCert.toFixed(2)} AUD / STC
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-lg bg-[#141414] border border-[#262626]">
              <span className="text-[11px] text-gray-400 block">Customer Invoiced Rebate</span>
              <p className="text-base font-bold text-blue-400 font-mono mt-0.5">
                -${sampleCustomerRebate.toLocaleString()} AUD
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">Point-of-sale deduction on customer bill</p>
            </div>

            <div className="p-3 rounded-lg bg-[#141414] border border-[#262626]">
              <span className="text-[11px] text-gray-400 block">Internal Wholesale Claim</span>
              <p className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                +${sampleInternalClaim.toLocaleString()} AUD
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">Clearinghouse payment from CER</p>
            </div>

            <div className="p-3 rounded-lg bg-[#141414] border border-[#262626]">
              <span className="text-[11px] text-gray-400 block">STC Profit Contribution</span>
              <p className="text-base font-bold text-[#bef264] font-mono mt-0.5">
                +${sampleRetainedMargin.toLocaleString()} AUD
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">Direct boost to company Gross Profit</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Other Operational Rule Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Panel 2: CEC & Warranties Standard */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#202020]">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Warranty &amp; Lifecycle Standards
            </h4>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Panel (Years)
              </label>
              <input
                type="number"
                value={formData.defaultWarrantyYearsPanels}
                onChange={e =>
                  setFormData({ ...formData, defaultWarrantyYearsPanels: parseInt(e.target.value) || 0 })
                }
                className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-2.5 py-2 text-xs text-white focus:border-[#bef264] outline-none font-mono text-center"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Inverter (Years)
              </label>
              <input
                type="number"
                value={formData.defaultWarrantyYearsInverter}
                onChange={e =>
                  setFormData({ ...formData, defaultWarrantyYearsInverter: parseInt(e.target.value) || 0 })
                }
                className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-2.5 py-2 text-xs text-white focus:border-[#bef264] outline-none font-mono text-center"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Battery (Years)
              </label>
              <input
                type="number"
                value={formData.defaultWarrantyYearsBattery}
                onChange={e =>
                  setFormData({ ...formData, defaultWarrantyYearsBattery: parseInt(e.target.value) || 0 })
                }
                className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-2.5 py-2 text-xs text-white focus:border-[#bef264] outline-none font-mono text-center"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Periodic CEC System Maintenance Inspection Cycle (Months)
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.maintenanceIntervalMonths}
                onChange={e =>
                  setFormData({
                    ...formData,
                    maintenanceIntervalMonths: parseInt(e.target.value) || 0
                  })
                }
                className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white focus:border-[#bef264] outline-none font-mono"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                months
              </span>
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              Triggers automated system alert and SMS inspection invitation to clients.
            </p>
          </div>

          <div className="p-3 bg-[#181818] rounded-xl border border-[#262626] flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">
                Automatic DNSP Pre-Approval Validation
              </span>
              <span className="text-[10px] text-gray-400">
                Check Ausgrid, Endeavour, Essential, and Energex 5kW export limits
              </span>
            </div>
            <input
              type="checkbox"
              checked={formData.enableAutoDnspValidation}
              onChange={e => setFormData({ ...formData, enableAutoDnspValidation: e.target.checked })}
              className="w-4 h-4 rounded accent-[#bef264] cursor-pointer"
            />
          </div>
        </div>

        {/* Panel 3: Referral & Operations Settings */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#202020]">
            <Building className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Referral Program &amp; Regional Settings
            </h4>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Customer Referral Bonus Award ($ AUD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-xs">$</span>
              <input
                type="number"
                step="25"
                value={formData.referralBonusDefaultAud}
                onChange={e =>
                  setFormData({ ...formData, referralBonusDefaultAud: parseFloat(e.target.value) || 0 })
                }
                className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg pl-7 pr-3 py-2 text-xs text-white focus:border-[#bef264] outline-none font-mono"
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              Standard cash reward paid via Australian OSKO/EFT per successful referee installation.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Default State
              </label>
              <select
                value={formData.defaultState}
                onChange={e => setFormData({ ...formData, defaultState: e.target.value as any })}
                className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-2.5 py-2 text-xs text-white focus:border-[#bef264] outline-none"
              >
                <option value="NSW">New South Wales (NSW)</option>
                <option value="QLD">Queensland (QLD)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Support Hotline
              </label>
              <input
                type="text"
                value={formData.emergencyContactPhone}
                onChange={e => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                placeholder="1300 XXX XXX"
                className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white focus:border-[#bef264] outline-none font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-[#181818] rounded-xl border border-[#262626] flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">
                Require EFT Bank Receipt Proof for Referrals
              </span>
              <span className="text-[10px] text-gray-400">
                Enforce uploading payment receipt before bonus status can be marked as Paid
              </span>
            </div>
            <input
              type="checkbox"
              checked={formData.requireReferralReceiptProof}
              onChange={e =>
                setFormData({ ...formData, requireReferralReceiptProof: e.target.checked })
              }
              className="w-4 h-4 rounded accent-[#bef264] cursor-pointer"
            />
          </div>
        </div>
      </div>
    </form>
  );
};
