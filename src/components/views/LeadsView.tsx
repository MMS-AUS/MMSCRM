import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Plus,
  Phone,
  MessageSquare,
  ArrowRight,
  FileSpreadsheet,
  CheckCircle2,
  MapPin,
  Calendar,
  ExternalLink,
  Edit,
  DollarSign,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  Tag,
  Building,
  Filter,
  Sun,
  Zap,
  Battery,
  Cpu,
  Download
} from 'lucide-react';
import { MetaAdsSyncModal } from '../modals/MetaAdsSyncModal';
import { LeadEditModal } from '../leads/LeadEditModal';
import { Lead, ViewMode } from '../../types';
import { ViewModeSwitcher } from '../common/ViewModeSwitcher';
import { formatAudAccounts } from '../../utils/australianPostcodes';
import { downloadGoogleSheetLeadFormat } from '../../utils/googleSheetsTemplate';

export const LeadsView: React.FC<{ onNavigateToProjects: () => void }> = ({ onNavigateToProjects }) => {
  const {
    leads,
    convertLeadToProject,
    setIsVoipDialerOpen,
    setIsQuickSmsOpen,
    dropdowns,
    syncGoogleSheetLeads,
    leadsViewMode: viewMode,
    setLeadsViewMode: setViewMode
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [salesPersonFilter, setSalesPersonFilter] = useState<string>('all');

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filteredLeads = leads.filter(l => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      l.customerName.toLowerCase().includes(q) ||
      (l.firstName && l.firstName.toLowerCase().includes(q)) ||
      (l.lastName && l.lastName.toLowerCase().includes(q)) ||
      (l.address && l.address.toLowerCase().includes(q)) ||
      l.suburb.toLowerCase().includes(q) ||
      (l.nearestBigCity && l.nearestBigCity.toLowerCase().includes(q)) ||
      (l.postcode && l.postcode.includes(searchTerm)) ||
      l.phone.includes(searchTerm) ||
      (l.primaryMobile && l.primaryMobile.includes(searchTerm)) ||
      (l.email && l.email.toLowerCase().includes(q)) ||
      (l.platform && l.platform.toLowerCase().includes(q)) ||
      (l.salesPersonName && l.salesPersonName.toLowerCase().includes(q)) ||
      (l.salesTeamNotes && l.salesTeamNotes.toLowerCase().includes(q)) ||
      (l.panelManufacturer && l.panelManufacturer.toLowerCase().includes(q)) ||
      (l.inverterManufacturer && l.inverterManufacturer.toLowerCase().includes(q)) ||
      (l.batteryManufacturer && l.batteryManufacturer.toLowerCase().includes(q)) ||
      (l.phase && l.phase.toLowerCase().includes(q)) ||
      (l.existingSystemDetails && l.existingSystemDetails.toLowerCase().includes(q));

    const matchesState = stateFilter === 'all' || l.state === stateFilter;
    const matchesStatus = statusFilter === 'all' || l?.status === statusFilter;
    const matchesPlatform = platformFilter === 'all' || l.platform === platformFilter || l.source === platformFilter;
    const matchesArea = areaFilter === 'all' || (l.area || 'Metro') === areaFilter;
    const matchesSalesPerson = salesPersonFilter === 'all' || (l.salesPersonName || l.assignedTo) === salesPersonFilter;

    return matchesSearch && matchesState && matchesStatus && matchesPlatform && matchesArea && matchesSalesPerson;
  });

  const handleOpenAddModal = () => {
    setEditingLead(null);
    setIsLeadModalOpen(true);
  };

  const handleOpenEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setIsLeadModalOpen(true);
  };

  const handleConvert = (leadId: string) => {
    try {
      const proj = convertLeadToProject(leadId);
      setFeedback(`Lead successfully converted to Project ${proj.projectCode}! Assigned to pipeline.`);
      setTimeout(() => setFeedback(null), 6000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleQuickSyncSheet = () => {
    const count = syncGoogleSheetLeads();
    setFeedback(`Synced and auto-populated ${count} leads from linked Google Sheet.`);
    setTimeout(() => setFeedback(null), 5000);
  };

  const leadStages = [
    { id: 'New', label: 'New Inbound', color: 'border-rose-500/40 bg-rose-500/10 text-rose-300' },
    { id: 'Contacted', label: 'Contacted', color: 'border-orange-500/40 bg-orange-500/10 text-orange-300' },
    { id: 'Site Survey Scheduled', label: 'Survey Scheduled', color: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
    { id: 'Proposal Sent', label: 'Proposal Sent', color: 'border-blue-500/40 bg-blue-500/10 text-blue-300' },
    { id: 'Contract Signed', label: 'Contract Signed', color: 'border-purple-500/40 bg-purple-500/10 text-purple-300' },
    { id: 'Deposit Received', label: 'Deposit Received', color: 'border-teal-500/40 bg-teal-500/10 text-teal-300' },
    { id: 'Converted to Project', label: 'Converted to Project', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' }
  ];

  return (
    <div className="flex-1 bg-[#0a0a0a] overflow-y-auto p-4 sm:p-6 space-y-6 text-[#e5e7eb]">
      {/* Header & Meta Ads Integration */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Lead Management
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#bef2641a] text-[#bef264] border border-[#bef26433]">
              Dynamic 23-Field Architecture
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Fetched from linked Google Sheet (auto-populated &amp; blank when absent) or added manually. Fully editable at any stage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <ViewModeSwitcher currentMode={viewMode} onModeChange={setViewMode} />

          <button
            onClick={() => {
              downloadGoogleSheetLeadFormat();
              setFeedback('Google Sheet format downloaded. Populate your columns matching this template for seamless sync.');
              setTimeout(() => setFeedback(null), 5000);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-[#1e1e1e] hover:bg-[#262626] text-white border border-[#2d2d2d] text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            title="Download the required CSV/Google Sheet format template for connecting leads"
          >
            <Download className="w-3.5 h-3.5 text-[#bef264]" />
            <span>Download Format</span>
          </button>

          <button
            onClick={handleQuickSyncSheet}
            className="px-3.5 py-1.5 rounded-lg bg-[#1e1e1e] hover:bg-[#262626] text-white border border-[#2d2d2d] text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            title="Fetch and auto-populate all fields from linked Google Sheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Sync Google Sheet</span>
          </button>

          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-[#1e1e1e] hover:bg-[#262626] text-gray-300 border border-[#2d2d2d] text-xs font-medium transition-colors"
            title="Configure Google Sheet webhook and column mapping"
          >
            Sheet Config
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-1.5 rounded-lg bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Lead Manually</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-medium flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button
            onClick={onNavigateToProjects}
            className="text-xs font-bold text-[#bef264] underline hover:text-white"
          >
            Go to Projects Pipeline &rarr;
          </button>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="bg-[#181818] p-4 rounded-xl border border-[#262626] shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search leads by customer, phone, email, address, suburb, postcode, rep..."
              className="w-full text-xs pl-9 pr-4 py-2 rounded-lg bg-[#121212] border border-[#262626] text-white placeholder:text-gray-500 outline-none focus:border-[#bef264]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* State Filter */}
            <select
              value={stateFilter}
              onChange={e => setStateFilter(e.target.value)}
              className="text-xs font-semibold bg-[#121212] border border-[#262626] text-white rounded-lg px-2.5 py-2 outline-none focus:border-[#bef264]"
            >
              <option value="all">All States</option>
              {(dropdowns.states || ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'ACT', 'NT']).map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs font-semibold bg-[#121212] border border-[#262626] text-white rounded-lg px-2.5 py-2 outline-none focus:border-[#bef264]"
            >
              <option value="all">All Statuses</option>
              {(dropdowns.leadStatuses || ['New', 'Contacted', 'Site Survey Scheduled', 'Proposal Sent', 'Contract Signed', 'Deposit Received', 'Converted to Project', 'Lost']).map(st => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            {/* Area Filter */}
            <select
              value={areaFilter}
              onChange={e => setAreaFilter(e.target.value)}
              className="text-xs font-semibold bg-[#121212] border border-[#262626] text-white rounded-lg px-2.5 py-2 outline-none focus:border-[#bef264]"
            >
              <option value="all">All Areas</option>
              <option value="Metro">Metro</option>
              <option value="Regional">Regional</option>
            </select>

            {/* Sales Person Filter */}
            <select
              value={salesPersonFilter}
              onChange={e => setSalesPersonFilter(e.target.value)}
              className="text-xs font-semibold bg-[#121212] border border-[#262626] text-white rounded-lg px-2.5 py-2 outline-none focus:border-[#bef264]"
            >
              <option value="all">All Sales Reps</option>
              {(dropdowns.salesPersons || ['Mitchell Barnes', 'Chloe Gallagher', 'Akash Mohite', 'Liam Evans']).map(rep => (
                <option key={rep} value={rep}>
                  {rep}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Metrics */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#222] text-[11px] text-gray-400">
          <div className="flex items-center gap-3">
            <span>Showing <strong className="text-white">{filteredLeads.length}</strong> of {leads.length} leads</span>
            <span className="text-gray-600">&bull;</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              {(filteredLeads || []).filter(l => l?.status === 'Converted to Project').length} Converted
            </span>
            <span className="text-gray-600">&bull;</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              {(filteredLeads || []).filter(l => l?.status === 'Contract Signed').length} Signed
            </span>
          </div>
          <div className="text-[11px] text-gray-400">
            Click <strong className="text-[#bef264]">"Edit"</strong> on any lead to update all 23 dynamic fields.
          </div>
        </div>
      </div>

      {/* PIPELINE KANBAN VIEW */}
      {viewMode === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {leadStages.map(stage => {
            const stageLeads = (filteredLeads || []).filter(l => l?.status === stage.id);
            return (
              <div
                key={stage.id}
                className="bg-[#161616] rounded-xl border border-[#262626] p-3 flex flex-col gap-3 min-h-[480px]"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${stage.color}`}>
                    {stage.label}
                  </span>
                  <span className="text-xs font-mono font-bold text-gray-400 bg-[#222] px-2 py-0.5 rounded-md">
                    {stageLeads.length}
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[700px] pr-1">
                  {stageLeads.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-500 border border-dashed border-[#262626] rounded-lg">
                      No leads in this stage
                    </div>
                  ) : (
                    stageLeads.map(lead => {
                      const isConverted = lead.status === 'Converted to Project';
                      return (
                        <div
                          key={lead.id}
                          className="bg-[#1e1e1e] p-3.5 rounded-lg border border-[#2d2d2d] hover:border-[#bef264]/40 transition-all space-y-2.5 shadow-xs cursor-pointer"
                          onClick={() => handleOpenEditModal(lead)}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <h4 className="font-bold text-xs text-white hover:text-[#bef264] transition-colors">
                                {lead.customerName || `${lead.firstName} ${lead.lastName}`}
                              </h4>
                              <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-[#bef264] shrink-0" />
                                <span>{lead.suburb} ({lead.state} {lead.postcode})</span>
                              </p>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              {lead.systemSizeKw || 10.4} kW
                            </span>
                          </div>

                          {/* Classification badges */}
                          <div className="flex flex-wrap gap-1 text-[10px]">
                            <span className="px-1.5 py-0.2 rounded bg-[#141414] text-gray-300 border border-[#2a2a2a]">
                              {lead.area || 'Metro'}
                            </span>
                            {lead.nearestBigCity && (
                              <span className="px-1.5 py-0.2 rounded bg-[#141414] text-[#bef264] border border-[#2a2a2a]">
                                {lead.nearestBigCity}
                              </span>
                            )}
                            {lead.addressVerified ? (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-0.5">
                                <ShieldCheck className="w-2.5 h-2.5" /> Verified
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Unverified
                              </span>
                            )}
                          </div>

                          {/* Pricing info */}
                          <div className="text-[11px] text-gray-300 bg-[#141414] p-2 rounded border border-[#262626] space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Selling Price:</span>
                              <span className="font-bold font-mono text-[#bef264]">
                                {lead.sellingPrice ? formatAudAccounts(lead.sellingPrice) : '$10,500.00'}
                              </span>
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-400">
                              <span>Rep: {lead.salesPersonName || lead.assignedTo || 'Unassigned'}</span>
                              <span>{lead.leadDate || '2026-03-01'}</span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center justify-between gap-1 pt-1" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setIsVoipDialerOpen(true)}
                                className="p-1.5 rounded bg-[#262626] hover:bg-[#333] text-emerald-400 border border-[#333]"
                                title="VoIPLine AU Call"
                              >
                                <Phone className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setIsQuickSmsOpen(true)}
                                className="p-1.5 rounded bg-[#262626] hover:bg-[#333] text-amber-400 border border-[#333]"
                                title="MessageMedia SMS"
                              >
                                <MessageSquare className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(lead)}
                                className="p-1.5 rounded bg-[#262626] hover:bg-[#333] text-gray-300 hover:text-white border border-[#333]"
                                title="Edit All 23 Lead Fields"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                            </div>

                            {isConverted ? (
                              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Converted
                              </span>
                            ) : (
                              <button
                                onClick={() => handleConvert(lead.id)}
                                className="px-2 py-1 rounded bg-[#bef264] hover:bg-[#a3e635] text-black text-[10px] font-bold flex items-center gap-1 shadow-xs transition-colors"
                              >
                                <span>Convert</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CARD GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map(lead => {
            const isConverted = lead.status === 'Converted to Project';
            return (
              <div
                key={lead.id}
                className={`bg-[#181818] rounded-xl border shadow-xs p-5 flex flex-col justify-between space-y-4 transition-all ${
                  isConverted ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-[#262626] hover:border-[#bef264]/40'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3
                          onClick={() => handleOpenEditModal(lead)}
                          className="font-bold text-sm text-white hover:text-[#bef264] cursor-pointer transition-colors leading-tight"
                        >
                          {lead.customerName || `${lead.firstName} ${lead.lastName}`}
                        </h3>
                        {lead.addressVerified ? (
                          <span title="Address verified via Google Autocomplete">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          </span>
                        ) : (
                          <span title="Unverified manual address">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-[#bef264] shrink-0" />
                        <span>{lead.address ? `${lead.address}, ` : ''}{lead.suburb} ({lead.state} {lead.postcode})</span>
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        isConverted
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : lead.status === 'New'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                          : lead.status === 'Contract Signed'
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {lead.status}
                    </span>
                  </div>

                  {/* 23-Field Key Classifications */}
                  <div className="flex flex-wrap items-center gap-1.5 my-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#202020] text-gray-300 border border-[#2d2d2d]">
                      Area: {lead.area || 'Metro'}
                    </span>
                    {lead.nearestBigCity && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#202020] text-[#bef264] border border-[#2d2d2d]">
                        Nearest City: {lead.nearestBigCity}
                      </span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#202020] text-gray-400 border border-[#2d2d2d]">
                      {lead.platform || lead.source || 'Meta Lead Ads'}
                    </span>
                  </div>

                  {/* Pricing and Technical Matrix */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-[#131313] rounded-lg border border-[#222] text-xs my-2">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">System Price:</span>
                      <span className="font-mono font-bold text-white">
                        {lead.systemPrice ? formatAudAccounts(lead.systemPrice) : '$14,200.00'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Selling Price:</span>
                      <span className="font-mono font-bold text-[#bef264]">
                        {lead.sellingPrice ? formatAudAccounts(lead.sellingPrice) : '$10,500.00'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Deposit:</span>
                      <span className="font-mono text-gray-300">
                        {lead.deposit ? formatAudAccounts(lead.deposit) : '$0.00'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Sale / Deposit Date:</span>
                      <span className="font-mono text-[10px] text-gray-300">
                        {lead.saleDate || lead.depositReceivedDate || 'Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Contact Info & Notes */}
                  <div className="space-y-1 text-xs text-gray-300">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="font-mono">{lead.primaryMobile || lead.phone}</span>
                      {lead.secondaryMobile && (
                        <span className="font-mono text-gray-500 text-[10px]">/ {lead.secondaryMobile}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="text-[11px] text-gray-400 truncate">
                        Rep: <strong className="text-gray-200">{lead.salesPersonName || lead.assignedTo || 'Mitchell Barnes'}</strong>
                      </span>
                      <span className="text-[10px] text-gray-500 ml-auto">
                        Lead: {lead.leadDate || lead.createdAt || '2026-03-01'}
                      </span>
                    </div>
                    {lead.salesTeamNotes && (
                      <div className="p-2 rounded bg-[#131313] border border-[#222] text-[11px] text-gray-400 italic line-clamp-2 mt-1">
                        "{lead.salesTeamNotes}"
                      </div>
                    )}

                    {/* Hardware Equipment Badge Strip */}
                    {(lead.panelManufacturer || lead.inverterManufacturer || lead.batteryManufacturer || lead.phase) && (
                      <div className="pt-2 border-t border-[#222] flex flex-wrap gap-1 text-[10px]">
                        {lead.panelManufacturer && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1 font-mono">
                            <Sun className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                            <span>{lead.noOfPanels ? `${lead.noOfPanels}x ` : ''}{lead.panelManufacturer} {lead.panelSizeW ? `${lead.panelSizeW}W` : ''}</span>
                          </span>
                        )}
                        {lead.inverterManufacturer && (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center gap-1 font-mono">
                            <Zap className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                            <span>{lead.inverterManufacturer} {lead.inverterSizeKw ? `${lead.inverterSizeKw}kW` : ''}</span>
                          </span>
                        )}
                        {lead.batteryManufacturer && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1 font-mono">
                            <Battery className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                            <span>{lead.batteryManufacturer}</span>
                          </span>
                        )}
                        {lead.phase && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                            {lead.phase}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-[#222] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsVoipDialerOpen(true)}
                      className="p-2 rounded-lg bg-[#222] hover:bg-[#2c2c2c] text-emerald-400 border border-[#2e2e2e] transition-colors"
                      title="Click-to-Call via VoIPLine"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsQuickSmsOpen(true)}
                      className="p-2 rounded-lg bg-[#222] hover:bg-[#2c2c2c] text-amber-400 border border-[#2e2e2e] transition-colors"
                      title="Two-way SMS via MessageMedia"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(lead)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#222] hover:bg-[#2c2c2c] text-gray-300 hover:text-white border border-[#2e2e2e] transition-colors flex items-center gap-1 text-xs font-semibold"
                      title="Edit all 23 fields dynamically"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>

                  {isConverted ? (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Project Active</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleConvert(lead.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                    >
                      <span>Convert</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW (Showing all 23 key requirements) */}
      {viewMode === 'table' && (
        <div className="bg-[#181818] rounded-xl border border-[#262626] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#121212] text-gray-400 uppercase text-[10px] font-bold border-b border-[#262626] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Lead Date &amp; Customer</th>
                  <th className="px-4 py-3">Platform &amp; Sales Rep</th>
                  <th className="px-4 py-3">Address &amp; Suburb</th>
                  <th className="px-4 py-3">Area &amp; Nearest City</th>
                  <th className="px-4 py-3">Financials (AUD)</th>
                  <th className="px-4 py-3">Status &amp; Key Dates</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No leads matching current search or filters.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map(lead => {
                    const isConverted = lead.status === 'Converted to Project';
                    return (
                      <tr key={lead.id} className="hover:bg-[#202020] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-xs hover:text-[#bef264] cursor-pointer" onClick={() => handleOpenEditModal(lead)}>
                              {lead.customerName || `${lead.firstName} ${lead.lastName}`}
                            </span>
                            {lead.addressVerified ? (
                              <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" title="Verified Address" />
                            ) : (
                              <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0" title="Unverified Manual" />
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <span className="font-mono">{lead.primaryMobile || lead.phone}</span>
                            <span>&bull;</span>
                            <span className="text-[10px] text-gray-500">{lead.leadDate || lead.createdAt || '2026-03-01'}</span>
                          </div>
                          {lead.email && (
                            <div className="text-[10px] text-gray-500 truncate max-w-[200px]">
                              {lead.email}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-gray-200 font-semibold">{lead.platform || lead.source || 'Meta Lead Ads'}</div>
                          <div className="text-[11px] text-[#bef264]">
                            Rep: {lead.salesPersonName || lead.assignedTo || 'Mitchell Barnes'}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-gray-200">
                            {lead.address || 'Address on file'}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            {lead.suburb}, {lead.state} {lead.postcode}
                          </div>
                          {(lead.panelManufacturer || lead.inverterManufacturer) && (
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                              <Sun className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                              <span className="truncate max-w-[140px] text-amber-300">{lead.panelManufacturer}</span>
                              {lead.inverterManufacturer && (
                                <>
                                  <span className="text-gray-600">&bull;</span>
                                  <span className="truncate max-w-[120px] text-cyan-300">{lead.inverterManufacturer}</span>
                                </>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                              (lead.area || 'Metro') === 'Metro'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {lead.area || 'Metro'}
                          </span>
                          <div className="text-[11px] text-gray-400 mt-1">
                            City: <strong className="text-gray-200">{lead.nearestBigCity || 'Sydney'}</strong>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-mono font-bold text-[#bef264]">
                            {lead.sellingPrice ? formatAudAccounts(lead.sellingPrice) : '$10,500.00'}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            Sys: {lead.systemPrice ? formatAudAccounts(lead.systemPrice) : '$14,200.00'} &bull; Dep: {lead.deposit ? formatAudAccounts(lead.deposit) : '$0.00'}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                              isConverted
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : lead.status === 'New'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : lead.status === 'Contract Signed'
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {lead.status}
                          </span>
                          {(lead.saleDate || lead.depositReceivedDate) && (
                            <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                              {lead.saleDate && `Sale: ${lead.saleDate}`}
                              {lead.depositReceivedDate && `Dep: ${lead.depositReceivedDate}`}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setIsVoipDialerOpen(true)}
                              className="p-1.5 rounded bg-[#222] hover:bg-[#2c2c2c] text-emerald-400 border border-[#2e2e2e]"
                              title="Click-to-Call"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setIsQuickSmsOpen(true)}
                              className="p-1.5 rounded bg-[#222] hover:bg-[#2c2c2c] text-amber-400 border border-[#2e2e2e]"
                              title="Two-way SMS"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(lead)}
                              className="p-1.5 rounded bg-[#222] hover:bg-[#2c2c2c] text-gray-300 hover:text-white border border-[#2e2e2e]"
                              title="Edit Lead"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {isConverted ? (
                              <span className="text-[11px] font-bold text-emerald-400 px-2">Active</span>
                            ) : (
                              <button
                                onClick={() => handleConvert(lead.id)}
                                className="px-2.5 py-1 rounded bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
                              >
                                <span>Convert</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Meta Ads / Google Sheet Configuration Modal */}
      <MetaAdsSyncModal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} />

      {/* 23-Field Add & Edit Modal */}
      <LeadEditModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        lead={editingLead}
      />
    </div>
  );
};
