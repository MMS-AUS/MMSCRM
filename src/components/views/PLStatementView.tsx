import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BadgeDollarSign,
  TrendingUp,
  Download,
  Search,
  CheckCircle2,
  Layers,
  MapPin,
  FileSpreadsheet,
  PieChart,
  HelpCircle,
  Receipt,
  Building2,
  Sparkles
} from 'lucide-react';

export const PLStatementView: React.FC = () => {
  const { calculatePL, projects, systemRules } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [showStcExplanation, setShowStcExplanation] = useState(false);

  const plRecords = calculatePL();

  const filteredRecords = plRecords.filter(r => {
    const matchesSearch =
      r.projectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = stateFilter === 'all' || r.state === stateFilter;
    return matchesSearch && matchesState;
  });

  const totalContractRevenue = filteredRecords.reduce((acc, r) => acc + (r.contractRevenueAud || 0), 0);
  const totalCustomerStcRebate = filteredRecords.reduce((acc, r) => acc + (r.customerStcRebateAud || 0), 0);
  const totalInternalStcClaim = filteredRecords.reduce((acc, r) => acc + (r.internalStcClaimAud || 0), 0);
  const totalStcTradingMargin = filteredRecords.reduce((acc, r) => acc + (r.stcTradingMarginAud || 0), 0);
  const totalRealizedRevenue = filteredRecords.reduce(
    (acc, r) => acc + (r.totalRealizedRevenueAud || (r.contractRevenueAud + (r.internalStcClaimAud || 0))),
    0
  );
  const totalEquipmentCost = filteredRecords.reduce((acc, r) => acc + (r.equipmentCostAud || 0), 0);
  const totalInstallLaborCost = filteredRecords.reduce((acc, r) => acc + (r.installerCostAud || 0), 0);
  const totalComplianceCost = filteredRecords.reduce((acc, r) => acc + (r.complianceCostAud || 0), 0);
  const totalCosts = totalEquipmentCost + totalInstallLaborCost + totalComplianceCost;
  const totalGrossProfit = filteredRecords.reduce((acc, r) => acc + (r.grossProfitAud || 0), 0);

  const averageMarginPct =
    totalRealizedRevenue > 0 ? Math.round((totalGrossProfit / totalRealizedRevenue) * 100) : 0;

  const handleExportCsv = () => {
    const headers =
      'Project Code,Customer,State,Customer Invoiced (AUD),Customer STC Rebate (AUD),Internal CER STC Claim (AUD),STC Trading Spread (AUD),Total Realized Revenue (AUD),Equipment BOM (AUD),Installer Labor (AUD),Compliance (AUD),Gross Profit (AUD),Margin %\n';
    const rows = filteredRecords
      .map(
        r =>
          `"${r.projectCode}","${r.customerName}","${r.state}",${r.contractRevenueAud},${r.customerStcRebateAud},${r.internalStcClaimAud},${r.stcTradingMarginAud},${r.totalRealizedRevenueAud},${r.equipmentCostAud},${r.installerCostAud},${r.complianceCostAud},${r.grossProfitAud},${r.marginPercentage}%`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SolarFlow_PL_Statement_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="flex-1 bg-[#0a0a0a] overflow-y-auto p-4 sm:p-6 space-y-6 text-[#e5e7eb]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Project Profit &amp; Loss (P&amp;L) Statement
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#bef2641a] text-[#bef264] border border-[#bef26433]">
              Dual-STC Realized Ledger
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Reconciled financial position combining customer billings, CER wholesale STC remittances, equipment BOM, and labor costs.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowStcExplanation(!showStcExplanation)}
            className="px-3 py-2 rounded-lg bg-[#1e1e1e] hover:bg-[#282828] text-gray-300 hover:text-white text-xs font-semibold border border-[#2d2d2d] flex items-center gap-1.5 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#bef264]" />
            <span>Dual STC Accounting Info</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-lg bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export P&amp;L (CSV)</span>
          </button>
        </div>
      </div>

      {/* Dual STC Accounting Info Banner (Collapsible) */}
      {showStcExplanation && (
        <div className="p-4 rounded-xl bg-[#141414] border border-[#bef2644d] space-y-2 text-xs text-gray-300 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-bold">
              <Sparkles className="w-4 h-4 text-[#bef264]" />
              <span>How Dual STC Accounting Determines Your Real Profit:</span>
            </div>
            <button
              onClick={() => setShowStcExplanation(false)}
              className="text-gray-400 hover:text-white text-xs font-mono"
            >
              ✕ Close
            </button>
          </div>
          <p className="text-gray-300 leading-relaxed">
            Australian solar retailers charge customers the <strong className="text-white">Customer Invoiced Price</strong> (gross system price minus the customer STC rebate calculated at <span className="text-blue-400 font-mono">${(systemRules.customerStcRateAud || 36.00).toFixed(2)} AUD/STC</span>). Upon CEC installation completion, the retailer claims the certificates through BridgeSelect/CER at the <strong className="text-white">Internal Wholesale Rate</strong> (<span className="text-[#bef264] font-mono">${(systemRules.internalStcRateAud || 39.50).toFixed(2)} AUD/STC</span>).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
            <div className="p-2 rounded bg-[#1c1c1c] border border-[#262626]">
              <span className="text-gray-400 block text-[10px] uppercase">1. Customer Invoiced Cash</span>
              <span className="text-white font-bold">Customer Payments</span>
            </div>
            <div className="p-2 rounded bg-[#1c1c1c] border border-[#262626]">
              <span className="text-gray-400 block text-[10px] uppercase">2. CER Wholesaler Cash</span>
              <span className="text-emerald-400 font-bold">+ Internal STC Remittance</span>
            </div>
            <div className="p-2 rounded bg-[#1c1c1c] border border-[#262626]">
              <span className="text-gray-400 block text-[10px] uppercase">3. Real Gross Profit</span>
              <span className="text-[#bef264] font-bold">= (1 + 2) - BOM &amp; Labor Costs</span>
            </div>
          </div>
        </div>
      )}

      {/* Financial Position Statement Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Customer Invoiced */}
        <div className="bg-[#181818] p-4 rounded-xl border border-[#2d2d2d] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-gray-400">Customer Invoiced</span>
            <Receipt className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <p className="text-lg font-bold text-white mt-1">
            ${totalContractRevenue.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">AUD</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">Net client invoices</p>
        </div>

        {/* Internal CER STC Claim */}
        <div className="bg-[#181818] p-4 rounded-xl border border-[#2d2d2d] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-gray-400">Internal CER STC</span>
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-lg font-bold text-emerald-400 mt-1">
            +${totalInternalStcClaim.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">AUD</span>
          </p>
          <p className="text-[11px] text-emerald-400/80 font-medium mt-0.5">
            Spread profit: +${totalStcTradingMargin.toLocaleString()}
          </p>
        </div>

        {/* Total Realized Revenue */}
        <div className="bg-[#181818] p-4 rounded-xl border border-[#2d2d2d] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-gray-400">Realized Revenue</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#bef264]" />
          </div>
          <p className="text-lg font-bold text-white mt-1">
            ${totalRealizedRevenue.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">AUD</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">Invoices + CER Claim</p>
        </div>

        {/* Direct Costs (BOM + Labor) */}
        <div className="bg-[#181818] p-4 rounded-xl border border-[#2d2d2d] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-gray-400">Total Direct Costs</span>
            <span className="text-[10px] font-mono text-rose-400">BOM+Labor</span>
          </div>
          <p className="text-lg font-bold text-rose-400 mt-1">
            -${totalCosts.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">AUD</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            BOM: ${totalEquipmentCost.toLocaleString()} | Lab: ${totalInstallLaborCost.toLocaleString()}
          </p>
        </div>

        {/* Real Gross Profit Earned */}
        <div className="bg-[#181818] p-4 rounded-xl border border-[#bef26433] shadow-xs bg-gradient-to-br from-[#181818] to-[#1c2214]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-[#bef264]">Real Gross Profit</span>
            <BadgeDollarSign className="w-3.5 h-3.5 text-[#bef264]" />
          </div>
          <p className="text-lg font-bold text-[#bef264] mt-1 font-mono">
            +${totalGrossProfit.toLocaleString()} <span className="text-[10px] font-normal text-[#bef264]/70">AUD</span>
          </p>
          <p className="text-[11px] text-[#bef264]/80 font-medium mt-0.5">Calculated with Internal STC</p>
        </div>

        {/* Average Margin % */}
        <div className="bg-[#181818] p-4 rounded-xl border border-[#2d2d2d] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-gray-400">Average Margin</span>
            <PieChart className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <p className="text-lg font-bold text-purple-400 mt-1">{averageMarginPct}%</p>
          <p className="text-[11px] text-purple-300 font-semibold mt-0.5">Benchmark: &gt; 35%</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-[#141414] p-4 rounded-xl border border-[#262626] shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by project code, customer name..."
            className="w-full text-xs pl-9 pr-4 py-2 rounded-lg bg-[#181818] border border-[#2d2d2d] text-white placeholder:text-gray-500 outline-none focus:border-[#bef264]"
          />
        </div>

        <select
          value={stateFilter}
          onChange={e => setStateFilter(e.target.value)}
          className="text-xs font-semibold bg-[#181818] border border-[#2d2d2d] text-white rounded-lg px-3 py-2 outline-none w-full sm:w-auto focus:border-[#bef264]"
        >
          <option value="all">All States (NSW &amp; QLD)</option>
          <option value="NSW">NSW Projects</option>
          <option value="QLD">QLD Projects</option>
        </select>
      </div>

      {/* Project-by-Project P&L Table */}
      <div className="bg-[#141414] rounded-xl border border-[#262626] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#262626] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-white">Project Level Profitability &amp; STC Reconciliation</h3>
            <p className="text-xs text-gray-400">
              Showing customer invoice values, internal CER claims, wholesale BOM costs, and resulting gross profit
            </p>
          </div>
          <span className="text-xs text-gray-400 font-medium">
            Showing {filteredRecords.length} reconciled jobs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#181818] text-gray-400 uppercase font-bold text-[10px] tracking-wider border-b border-[#262626]">
              <tr>
                <th className="p-3">Project</th>
                <th className="p-3">Customer &amp; Location</th>
                <th className="p-3 text-right">Customer Invoiced</th>
                <th className="p-3 text-right">Customer STC Rebate</th>
                <th className="p-3 text-right">Internal CER Claim</th>
                <th className="p-3 text-right">Realized Revenue</th>
                <th className="p-3 text-right">Direct Costs</th>
                <th className="p-3 text-right">Gross Profit</th>
                <th className="p-3 text-center">Net Margin</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202020]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-gray-500">
                    No matching projects found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(item => {
                  const isHealthy = item.marginPercentage >= 35;
                  const itemDirectCosts = (item.equipmentCostAud || 0) + (item.installerCostAud || 0) + (item.complianceCostAud || 0);

                  return (
                    <tr key={item.projectId} className="hover:bg-[#1e1e1e]/60 transition-colors">
                      <td className="p-3">
                        <span className="font-mono font-bold text-white block">{item.projectCode}</span>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-gray-200">{item.customerName}</div>
                        <div className="text-[11px] text-gray-400">{item.state} Operations</div>
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-white">
                        ${item.contractRevenueAud.toLocaleString()} AUD
                      </td>
                      <td className="p-3 text-right font-mono text-blue-400" title="Deducted on customer invoice">
                        -${(item.customerStcRebateAud || 0).toLocaleString()} AUD
                      </td>
                      <td className="p-3 text-right font-mono" title="Claimed internally from Clean Energy Regulator">
                        <span className="text-emerald-400 font-bold block">
                          +${(item.internalStcClaimAud || 0).toLocaleString()} AUD
                        </span>
                        {item.stcTradingMarginAud > 0 && (
                          <span className="text-[10px] text-emerald-400/80 block">
                            (+${item.stcTradingMarginAud} spread)
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-white">
                        ${(item.totalRealizedRevenueAud || (item.contractRevenueAud + (item.internalStcClaimAud || 0))).toLocaleString()} AUD
                      </td>
                      <td className="p-3 text-right text-rose-400 font-mono">
                        -${itemDirectCosts.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-bold text-[#bef264] font-mono">
                        +${(item.grossProfitAud || 0).toLocaleString()} AUD
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-bold text-gray-200 font-mono">{item.marginPercentage}%</span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isHealthy
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {isHealthy ? 'Target Met' : 'Review Costs'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
