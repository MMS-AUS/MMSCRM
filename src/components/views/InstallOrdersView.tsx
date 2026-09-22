import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileSpreadsheet,
  Search,
  CheckCircle2,
  Clock,
  HardHat,
  Award,
  Layers,
  MapPin,
  Calendar,
  DollarSign,
  Send,
  Plus
} from 'lucide-react';
import { InstallOrder } from '../../types';

export const InstallOrdersView: React.FC = () => {
  const {
    installOrders,
    projects,
    subContractors,
    awardInstallerQuote,
    createInstallOrderRFQ
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isRfqModalOpen, setIsRfqModalOpen] = useState(false);
  const [awardSuccessMsg, setAwardSuccessMsg] = useState<string | null>(null);

  // New RFQ form
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [roofType, setRoofType] = useState('Tile');
  const [storeys, setStoreys] = useState<'Single' | 'Two Storey'>('Single');
  const [panelCount, setPanelCount] = useState<number>(26);
  const [inverterType, setInverterType] = useState('Sungrow 8kW Hybrid');
  const [batteryIncluded, setBatteryIncluded] = useState(false);
  const [switchboardUpgrade, setSwitchboardUpgrade] = useState(false);
  const [siteAccessInstructions, setSiteAccessInstructions] = useState(
    'Key lockbox on side gate. Double brick walls. Switchboard in carport.'
  );

  const filteredOrders = installOrders.filter(io => {
    const matchesSearch =
      io.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      io.projectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      io.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = stateFilter === 'all' || io.state === stateFilter;
    const matchesStatus = statusFilter === 'all' || io?.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAward = (installOrderId: string, quoteId: string, subName: string, amount: number) => {
    awardInstallerQuote(installOrderId, quoteId);
    setAwardSuccessMsg(`Successfully awarded installation order to ${subName} for $${amount.toLocaleString()} AUD! Work order generated.`);
    setTimeout(() => setAwardSuccessMsg(null), 5000);
  };

  const handleCreateRfq = (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find(p => p.id === selectedProjectId);
    if (!proj) {
      alert('Please select a valid Project to issue an RFQ for.');
      return;
    }

    createInstallOrderRFQ({
      projectId: proj.id,
      projectCode: proj.projectCode,
      customerName: proj.customerName,
      address: proj.address,
      state: proj.state,
      systemSizeKw: proj.systemSizeKw,
      roofType,
      storeys,
      submittedRequirements: {
        panelCount,
        inverterType,
        batteryIncluded,
        switchboardUpgradeRequired: switchboardUpgrade,
        siteAccessInstructions
      }
    });

    setIsRfqModalOpen(false);
    setAwardSuccessMsg(`New RFQ generated and dispatched to accredited installers in ${proj.state} Metro!`);
    setTimeout(() => setAwardSuccessMsg(null), 5000);
  };

  return (
    <div className="flex-1 bg-[#0a0a0a] overflow-y-auto p-4 sm:p-6 space-y-6 text-[#e5e7eb]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Installer Work Orders &amp; RFQ Bidding
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#bef2641a] text-[#bef264] border border-[#bef26433]">
              Subcontractor Bidding Hub
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Submit site specifications (RFQ) to subcontractors, review competitive labor quotes, and award contracts
          </p>
        </div>

        <button
          onClick={() => setIsRfqModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold shadow-xs flex items-center gap-1.5 self-start transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create New RFQ</span>
        </button>
      </div>

      {awardSuccessMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{awardSuccessMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#1e1e1e] p-4 rounded-xl border border-[#2d2d2d] shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by install order (IO-2026-...), project, customer..."
            className="w-full text-xs pl-9 pr-4 py-2 rounded-lg bg-[#121212] border border-[#262626] text-white placeholder:text-gray-500 outline-none focus:border-[#bef264]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value)}
            className="text-xs font-semibold bg-[#121212] border border-[#262626] text-white rounded-lg px-3 py-2 outline-none focus:border-[#bef264]"
          >
            <option value="all">All States (NSW / QLD)</option>
            <option value="NSW">NSW Metro</option>
            <option value="QLD">QLD Metro</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs font-semibold bg-[#121212] border border-[#262626] text-white rounded-lg px-3 py-2 outline-none focus:border-[#bef264]"
          >
            <option value="all">All RFQ Statuses</option>
            <option value="RFQ Sent">RFQ Sent (Awaiting Quotes)</option>
            <option value="Quotes Received">Quotes Received</option>
            <option value="Awarded">Awarded</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Install Orders List */}
      <div className="space-y-4">
        {filteredOrders.map(order => (
          <div
            key={order.id}
            className="bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] shadow-xs p-5 space-y-4 hover:border-[#bef264]/40 transition-colors"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262626] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-white">{order.orderNumber}</span>
                  <span className="text-sm font-bold text-gray-300">&bull; Linked: {order.projectCode}</span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      order.status === 'Awarded'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        : order.status === 'Quotes Received'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-[#bef2641a] text-[#bef264] border-[#bef26433]'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Customer: <strong className="text-gray-200">{order.customerName}</strong> ({order.address}) &bull; State:{' '}
                  <strong className="text-gray-200">{order.state} Metro</strong>
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">System &amp; Roof Specs</span>
                <span className="text-xs font-bold text-white">
                  {order.systemSizeKw} kW &bull; {order.roofType} ({order.storeys})
                </span>
              </div>
            </div>

            {/* Submitted Requirement to Installer */}
            <div className="p-3 bg-[#161616] rounded-xl border border-[#262626] space-y-2 text-xs">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">
                Submitted Project Requirements (Dispatched to Subcontractors):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-gray-400 block text-[10px]">Panel Count:</span>
                  <span className="font-semibold text-white">{order.submittedRequirements.panelCount} Panels</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Inverter Type:</span>
                  <span className="font-semibold text-white">{order.submittedRequirements.inverterType}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Battery In Scope:</span>
                  <span className="font-semibold text-white">
                    {order.submittedRequirements.batteryIncluded ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Switchboard:</span>
                  <span className="font-semibold text-white">
                    {order.submittedRequirements.switchboardUpgradeRequired ? 'Upgrade Required' : 'Standard'}
                  </span>
                </div>
              </div>
              <p className="text-gray-300 text-[11px] pt-1">
                <strong className="text-white">Access Instructions:</strong> {order.submittedRequirements.siteAccessInstructions}
              </p>
            </div>

            {/* Installer Quotes Review & Award Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <HardHat className="w-4 h-4 text-[#bef264]" />
                  <span>Subcontractor Received Quotes ({order.quotes.length})</span>
                </h4>
                {order.awardedToSubcontractor && (
                  <span className="text-xs font-bold text-purple-300 bg-purple-500/20 px-2.5 py-0.5 rounded-lg border border-purple-500/30">
                    Awarded to: {order.awardedToSubcontractor} (${order.awardedAmountAud?.toLocaleString()} AUD)
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {order.quotes.map(quote => {
                  const isAwarded = quote.status === 'Awarded';
                  return (
                    <div
                      key={quote.id}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                        isAwarded
                          ? 'bg-purple-500/10 border-purple-500/40'
                          : 'bg-[#161616] border-[#262626]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{quote.subcontractorName}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isAwarded
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                : 'bg-[#262626] text-gray-300 border-[#333]'
                            }`}
                          >
                            {quote.status}
                          </span>
                        </div>
                        <p className="text-gray-400 text-[11px] mt-0.5">
                          Estimated Duration: <strong className="text-gray-200">{quote.estimatedDays} Day(s)</strong> &bull; Crew Size:{' '}
                          <strong className="text-gray-200">{quote.crewSize} Electricians</strong> &bull; Quoted on: {quote.submittedDate}
                        </p>
                        {quote.notes && (
                          <p className="text-gray-300 text-[11px] italic mt-1 bg-[#121212] border border-[#262626] p-1.5 rounded">
                            "{quote.notes}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 self-start sm:self-auto">
                        <span className="font-mono font-bold text-sm text-[#bef264]">
                          ${quote.amountAud.toLocaleString()} AUD
                        </span>
                        {!isAwarded && order.status !== 'Awarded' && (
                          <button
                            onClick={() => handleAward(order.id, quote.id, quote.subcontractorName, quote.amountAud)}
                            className="px-3 py-1.5 rounded-lg bg-[#bef264] hover:bg-[#a3e635] text-black font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
                          >
                            <Award className="w-3.5 h-3.5 text-black" />
                            <span>Award Quote</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New RFQ Modal */}
      {isRfqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-[#1e1e1e] rounded-xl shadow-2xl border border-[#2d2d2d] overflow-hidden text-[#e5e7eb]">
            <div className="p-4 bg-[#161616] border-b border-[#262626] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Issue Installation RFQ to Subcontractors</h3>
              <button onClick={() => setIsRfqModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateRfq} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Select Solar Project</label>
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                  required
                >
                  <option value="">-- Choose Project in Pipeline --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.projectCode} - {p.customerName} ({p.systemSizeKw}kW - {p.state})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Roof Type</label>
                  <select
                    value={roofType}
                    onChange={e => setRoofType(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                  >
                    <option value="Tile">Tile / Concrete</option>
                    <option value="Colorbond">Colorbond / Metal Sheet</option>
                    <option value="Klip-lok">Klip-lok / Industrial</option>
                    <option value="Slate">Slate / Terracotta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Storeys</label>
                  <select
                    value={storeys}
                    onChange={e => setStoreys(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                  >
                    <option value="Single">Single Storey</option>
                    <option value="Two Storey">Two Storey (Scaffolding/Harness Req)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Panel Count</label>
                  <input
                    type="number"
                    value={panelCount}
                    onChange={e => setPanelCount(parseInt(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Inverter Specification</label>
                  <input
                    type="text"
                    value={inverterType}
                    onChange={e => setInverterType(e.target.value)}
                    placeholder="e.g. Fronius Primo 8.2kW"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none placeholder:text-gray-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1 text-xs">
                <label className="flex items-center gap-1.5 font-semibold text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={batteryIncluded}
                    onChange={e => setBatteryIncluded(e.target.checked)}
                    className="rounded accent-[#bef264] w-4 h-4"
                  />
                  <span>Battery Storage in Scope</span>
                </label>
                <label className="flex items-center gap-1.5 font-semibold text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={switchboardUpgrade}
                    onChange={e => setSwitchboardUpgrade(e.target.checked)}
                    className="rounded accent-[#bef264] w-4 h-4"
                  />
                  <span>Switchboard Upgrade Req</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Site Access Instructions &amp; Safety Notes
                </label>
                <textarea
                  rows={2}
                  value={siteAccessInstructions}
                  onChange={e => setSiteAccessInstructions(e.target.value)}
                  placeholder="e.g. Side gate key code, meter location..."
                  className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none placeholder:text-gray-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRfqModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#bef264] hover:bg-[#a3e635] text-black rounded-lg text-xs font-bold transition-colors"
                >
                  Submit RFQ to Installers
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
