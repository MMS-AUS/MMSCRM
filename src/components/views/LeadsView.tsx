import React, { useState, useMemo } from 'react';
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
  Download,
  Trash2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { MetaAdsSyncModal } from '../modals/MetaAdsSyncModal';
import { LeadEditModal } from '../leads/LeadEditModal';
import { Lead, ViewMode } from '../../types';
import { ViewModeSwitcher } from '../common/ViewModeSwitcher';
import { formatAudAccounts } from '../../utils/australianPostcodes';
import { downloadGoogleSheetLeadFormat, sortLeadsByDateDesc } from '../../utils/googleSheetsTemplate';

export const LeadsView: React.FC<{ onNavigateToProjects: () => void }> = ({ onNavigateToProjects }) => {
  const {
    leads,
    convertLeadToProject,
    setIsVoipDialerOpen,
    setIsQuickSmsOpen,
    dropdowns,
    syncGoogleSheetLeads,
    deleteLead,
    deleteLeads,
    deleteDummyLeads,
    clearAllLeads,
    leadsViewMode: viewMode,
    setLeadsViewMode: setViewMode,
    googleSheetUrl,
    isSheetAutoSyncEnabled,
    sheetAutoSyncInterval,
    isSheetSyncing,
    lastSheetSyncTime,
    performGoogleSheetSync
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [salesPersonFilter, setSalesPersonFilter] = useState<string>('all');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // In-App Delete Confirmation Modal state (never blocked by iframe sandboxes)
  const [confirmModal, setConfirmModal] = useState<{
    type: 'single' | 'selected' | 'dummy' | 'all';
    title: string;
    description: string;
    leadId?: string;
    leadName?: string;
    count?: number;
  } | null>(null);

  const filteredLeads = useMemo(() => {
    const list = leads.filter(l => {
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

    // Always sort leads on the basis of the Lead date, latest first
    return sortLeadsByDateDesc(list);
  }, [leads, searchTerm, stateFilter, statusFilter, platformFilter, areaFilter, salesPersonFilter]);

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

  const handleDeleteLead = (lead: Lead) => {
    const name = lead.customerName || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'this lead';
    setConfirmModal({
      type: 'single',
      title: 'Delete Lead',
      description: `Are you sure you want to permanently delete "${name}"? This action cannot be undone.`,
      leadId: lead.id,
      leadName: name
    });
  };

  const handleDeleteSelected = () => {
    if (selectedLeadIds.length === 0) return;
    setConfirmModal({
      type: 'selected',
      title: `Delete ${selectedLeadIds.length} Selected Lead(s)`,
      description: `Are you sure you want to permanently delete all ${selectedLeadIds.length} selected lead(s)? This action cannot be undone.`,
      count: selectedLeadIds.length
    });
  };

  const handleClearAllDummyLeads = () => {
    const dummyNames = [
      'callum fletcher',
      'ashleigh miller',
      'declan macarthur',
      'andrew gerber',
      'tarek assad',
      'rojin piya',
      'sheet lead'
    ];
    const detectedDummyLeads = leads.filter(l => {
      const full = `${l.firstName || ''} ${l.lastName || ''}`.trim().toLowerCase();
      const cust = (l.customerName || '').trim().toLowerCase();
      const id = (l.id || '').toLowerCase();
      return (
        dummyNames.includes(full) ||
        dummyNames.includes(cust) ||
        id.includes('lead-andrew-') ||
        id.includes('lead-tarek-') ||
        id.includes('lead-rojin-') ||
        id.includes('lead-sheet-') ||
        id.includes('dummy')
      );
    });

    if (detectedDummyLeads.length > 0) {
      setConfirmModal({
        type: 'dummy',
        title: 'Delete Sample Dummy Leads',
        description: `Permanently remove all ${detectedDummyLeads.length} sample dummy lead(s) (Callum, Ashleigh, Declan, Andrew, Tarek, Rojin)? Real customer leads will not be affected.`,
        count: detectedDummyLeads.length
      });
    } else {
      setConfirmModal({
        type: 'all',
        title: 'No Dummy Leads Found - Clear All?',
        description: `No automatic sample leads were detected. Would you like to clear ALL ${leads.length} leads in the system to start with a fresh blank slate?`,
        count: leads.length
      });
    }
  };

  const handleClearAllLeads = () => {
    if (leads.length === 0) {
      setFeedback('There are currently 0 leads in the system.');
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    setConfirmModal({
      type: 'all',
      title: 'Clear All Leads in CRM',
      description: `WARNING: Are you sure you want to permanently delete ALL ${leads.length} lead(s) in the system? This action cannot be undone and will completely wipe all lead records.`,
      count: leads.length
    });
  };

  const handleConfirmAction = () => {
    if (!confirmModal) return;

    if (confirmModal.type === 'single' && confirmModal.leadId) {
      deleteLead(confirmModal.leadId);
      setSelectedLeadIds(prev => prev.filter(id => id !== confirmModal.leadId));
      setFeedback(`Lead "${confirmModal.leadName || 'Lead'}" permanently deleted.`);
    } else if (confirmModal.type === 'selected') {
      const count = selectedLeadIds.length;
      deleteLeads(selectedLeadIds);
      setSelectedLeadIds([]);
      setFeedback(`Successfully deleted ${count} selected lead(s).`);
    } else if (confirmModal.type === 'dummy') {
      const count = deleteDummyLeads();
      setSelectedLeadIds([]);
      setFeedback(`Successfully removed ${count || confirmModal.count || 0} sample dummy lead(s).`);
    } else if (confirmModal.type === 'all') {
      const count = leads.length;
      clearAllLeads();
      setSelectedLeadIds([]);
      setFeedback(`Permanently deleted all ${count} leads.`);
    }

    setConfirmModal(null);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleQuickSyncSheet = async () => {
    if (!googleSheetUrl) {
      setIsSyncModalOpen(true);
      return;
    }

    try {
      setFeedback('Syncing latest leads from Google Sheet...');
      const res = await performGoogleSheetSync();
      if (res.success) {
        if (res.addedCount > 0 && res.updatedCount > 0) {
          setFeedback(`⚡ Google Sheet Synced: ${res.addedCount} new lead(s) ingested, ${res.updatedCount} existing lead(s) updated with changes.`);
        } else if (res.addedCount > 0) {
          setFeedback(`⚡ Google Sheet Synced: ${res.addedCount} new lead(s) ingested (${res.duplicateCount} existing leads safely skipped).`);
        } else if (res.updatedCount > 0) {
          setFeedback(`⚡ Google Sheet Synced: ${res.updatedCount} existing lead(s) updated with changes from Google Sheet.`);
        } else {
          setFeedback(`⚡ Google Sheet Synced: All ${res.totalRows} leads in your sheet already exist in the system. 0 duplicate leads added.`);
        }
      } else {
        setFeedback(`Google Sheet notice: ${res.error || 'Check spreadsheet permissions'}`);
        if (res.isPrivate) {
          setIsSyncModalOpen(true);
        }
      }
    } catch (e: any) {
      setFeedback('Sync error: ' + (e.message || 'Network error'));
    }
    setTimeout(() => setFeedback(null), 6000);
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

          {/* Live Auto-Sync Status Indicator */}
          {googleSheetUrl ? (
            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-xs flex items-center gap-2 transition-all ${
                isSheetAutoSyncEnabled
                  ? 'bg-emerald-950/30 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/40'
                  : 'bg-[#1e1e1e] text-gray-400 border-[#2d2d2d] hover:text-white'
              }`}
              title={`Google Sheet live background auto-sync is ${isSheetAutoSyncEnabled ? `ACTIVE (polling every ${sheetAutoSyncInterval}s)` : 'PAUSED'}. Click to configure settings.`}
            >
              <span className="relative flex h-2 w-2">
                {isSheetAutoSyncEnabled ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-500"></span>
                )}
              </span>
              <span>{isSheetSyncing ? 'Auto-Syncing...' : isSheetAutoSyncEnabled ? `Auto-Sync (${sheetAutoSyncInterval}s)` : 'Auto-Sync Paused'}</span>
            </button>
          ) : null}

          <button
            onClick={handleQuickSyncSheet}
            disabled={isSheetSyncing}
            className="px-3.5 py-1.5 rounded-lg bg-[#1e1e1e] hover:bg-[#262626] text-white border border-[#2d2d2d] text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-60"
            title="Fetch and auto-populate new rows from linked Google Sheet without creating duplicates"
          >
            {isSheetSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="hidden sm:inline">{isSheetSyncing ? 'Syncing...' : 'Sync Google Sheet'}</span>
          </button>

          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-[#1e1e1e] hover:bg-[#262626] text-gray-300 border border-[#2d2d2d] text-xs font-medium transition-colors"
            title="Configure Google Sheet link, auto-sync frequency, and deduplication rules"
          >
            Sheet Config
          </button>

          {selectedLeadIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
              title="Delete all selected leads"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedLeadIds.length})</span>
            </button>
          )}

          <button
            onClick={handleClearAllDummyLeads}
            className="px-3 py-1.5 rounded-lg bg-[#222] hover:bg-rose-950/40 text-rose-300 hover:text-rose-200 border border-rose-900/40 hover:border-rose-700/60 text-xs font-medium transition-colors flex items-center gap-1.5"
            title="Permanently remove sample dummy leads (Callum, Ashleigh, Declan, Andrew, Tarek, Rojin)"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Delete Dummy Leads</span>
          </button>

          {leads.length > 0 && (
            <button
              onClick={handleClearAllLeads}
              className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white border border-red-500 text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Permanently wipe all leads in the system"
            >
              <Trash2 className="w-3.5 h-3.5 text-white" />
              <span>Clear All Leads</span>
            </button>
          )}

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
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search leads by customer, phone, email, address, suburb, postcode, rep..."
              className="w-full text-xs pl-11 pr-4 py-2 rounded-lg bg-[#121212] border border-[#262626] text-white placeholder:text-gray-500 outline-none focus:border-[#bef264]"
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
                            {lead.systemSizeKw && (
                              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                {lead.systemSizeKw} kW
                              </span>
                            )}
                          </div>

                          {/* Classification badges */}
                          <div className="flex flex-wrap gap-1 text-[10px]">
                            {lead.area && (
                              <span className="px-1.5 py-0.2 rounded bg-[#141414] text-gray-300 border border-[#2a2a2a]">
                                {lead.area}
                              </span>
                            )}
                            {lead.nearestBigCity && (
                              <span className="px-1.5 py-0.2 rounded bg-[#141414] text-[#bef264] border border-[#2a2a2a]">
                                {lead.nearestBigCity}
                              </span>
                            )}
                            {lead.platform && (
                              <span className="px-1.5 py-0.2 rounded bg-[#141414] text-gray-400 border border-[#2a2a2a]">
                                {lead.platform}
                              </span>
                            )}
                            {lead.address && lead.postcode && (
                              lead.addressVerified ? (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-0.5">
                                  <ShieldCheck className="w-2.5 h-2.5" /> Verified
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  Unverified
                                </span>
                              )
                            )}
                          </div>

                          {/* Pricing info */}
                          {(lead.sellingPrice || lead.salesPersonName || lead.assignedTo || lead.leadDate) && (
                            <div className="text-[11px] text-gray-300 bg-[#141414] p-2 rounded border border-[#262626] space-y-1">
                              {lead.sellingPrice ? (
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Selling Price:</span>
                                  <span className="font-bold font-mono text-[#bef264]">
                                    {formatAudAccounts(lead.sellingPrice)}
                                  </span>
                                </div>
                              ) : null}
                              <div className="flex justify-between text-[10px] text-gray-400">
                                <span>{lead.salesPersonName || lead.assignedTo ? `Rep: ${lead.salesPersonName || lead.assignedTo}` : ''}</span>
                                <span>{lead.leadDate || ''}</span>
                              </div>
                            </div>
                          )}

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
                              <button
                                onClick={() => handleDeleteLead(lead)}
                                className="p-1.5 rounded bg-[#262626] hover:bg-rose-950/50 text-gray-400 hover:text-rose-400 border border-[#333] hover:border-rose-800/50 transition-colors"
                                title="Delete Lead"
                              >
                                <Trash2 className="w-3 h-3" />
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

                    {lead.status && (
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
                    )}
                  </div>

                  {/* 23-Field Key Classifications */}
                  {(lead.area || lead.nearestBigCity || lead.platform) && (
                    <div className="flex flex-wrap items-center gap-1.5 my-2">
                      {lead.area && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#202020] text-gray-300 border border-[#2d2d2d]">
                          Area: {lead.area}
                        </span>
                      )}
                      {lead.nearestBigCity && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#202020] text-[#bef264] border border-[#2d2d2d]">
                          Nearest City: {lead.nearestBigCity}
                        </span>
                      )}
                      {lead.platform && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#202020] text-gray-400 border border-[#2d2d2d]">
                          {lead.platform}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Pricing and Technical Matrix */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-[#131313] rounded-lg border border-[#222] text-xs my-2">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">System Price:</span>
                      <span className="font-mono font-bold text-white">
                        {lead.systemPrice ? formatAudAccounts(lead.systemPrice) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Selling Price:</span>
                      <span className="font-mono font-bold text-[#bef264]">
                        {lead.sellingPrice ? formatAudAccounts(lead.sellingPrice) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Deposit:</span>
                      <span className="font-mono text-gray-300">
                        {lead.deposit ? formatAudAccounts(lead.deposit) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Sale / Deposit Date:</span>
                      <span className="font-mono text-[10px] text-gray-300">
                        {lead.saleDate || lead.depositReceivedDate || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Contact Info & Notes */}
                  <div className="space-y-1 text-xs text-gray-300">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="font-mono">{lead.primaryMobile || lead.phone || '-'}</span>
                      {lead.secondaryMobile && (
                        <span className="font-mono text-gray-500 text-[10px]">/ {lead.secondaryMobile}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="text-[11px] text-gray-400 truncate">
                        Rep: <strong className="text-gray-200">{lead.salesPersonName || lead.assignedTo || '-'}</strong>
                      </span>
                      <span className="text-[10px] text-gray-500 ml-auto">
                        Lead: {lead.leadDate || lead.createdAt || '-'}
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
                    <button
                      onClick={() => handleDeleteLead(lead)}
                      className="p-2 rounded-lg bg-[#222] hover:bg-rose-950/50 text-gray-400 hover:text-rose-400 border border-[#2e2e2e] hover:border-rose-800/50 transition-colors"
                      title="Delete Lead"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
                  <th className="w-10 px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.length}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedLeadIds(filteredLeads.map(l => l.id));
                        } else {
                          setSelectedLeadIds([]);
                        }
                      }}
                      className="rounded border-[#333] bg-[#121212] text-[#bef264] focus:ring-0 cursor-pointer"
                    />
                  </th>
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
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No leads matching current search or filters.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map(lead => {
                    const isConverted = lead.status === 'Converted to Project';
                    const isSelected = selectedLeadIds.includes(lead.id);
                    return (
                      <tr key={lead.id} className={`hover:bg-[#202020] transition-colors ${isSelected ? 'bg-[#bef264]/5' : ''}`}>
                        <td className="w-10 px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedLeadIds(prev => [...prev, lead.id]);
                              } else {
                                setSelectedLeadIds(prev => prev.filter(id => id !== lead.id));
                              }
                            }}
                            className="rounded border-[#333] bg-[#121212] text-[#bef264] focus:ring-0 cursor-pointer"
                          />
                        </td>
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
                            <span className="font-mono">{lead.primaryMobile || lead.phone || '-'}</span>
                            {lead.leadDate && (
                              <>
                                <span>&bull;</span>
                                <span className="text-[10px] text-gray-500">{lead.leadDate}</span>
                              </>
                            )}
                          </div>
                          {lead.email && (
                            <div className="text-[10px] text-gray-500 truncate max-w-[200px]">
                              {lead.email}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-gray-200 font-semibold">{lead.platform || lead.source || '-'}</div>
                          <div className="text-[11px] text-[#bef264]">
                            Rep: {lead.salesPersonName || lead.assignedTo || '-'}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-gray-200">
                            {lead.address || '-'}
                          </div>
                          {(lead.suburb || lead.state || lead.postcode) && (
                            <div className="text-[11px] text-gray-400">
                              {[lead.suburb, [lead.state, lead.postcode].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
                            </div>
                          )}
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
                          {lead.area ? (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                                lead.area === 'Metro'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {lead.area}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-xs">-</span>
                          )}
                          {lead.nearestBigCity && (
                            <div className="text-[11px] text-gray-400 mt-1">
                              City: <strong className="text-gray-200">{lead.nearestBigCity}</strong>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-mono font-bold text-[#bef264]">
                            {lead.sellingPrice ? formatAudAccounts(lead.sellingPrice) : '-'}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            Sys: {lead.systemPrice ? formatAudAccounts(lead.systemPrice) : '-'} &bull; Dep: {lead.deposit ? formatAudAccounts(lead.deposit) : '-'}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {lead.status ? (
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
                          ) : (
                            <span className="text-gray-500 text-xs">-</span>
                          )}
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
                            <button
                              onClick={() => handleDeleteLead(lead)}
                              className="p-1.5 rounded bg-[#222] hover:bg-rose-950/50 text-gray-400 hover:text-rose-400 border border-[#2e2e2e] hover:border-rose-800/50 transition-colors"
                              title="Delete Lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* In-App Delete Confirmation Modal (Bypasses iframe alert/confirm sandbox restrictions) */}
      {confirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#181818] border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{confirmModal.title}</h3>
                <p className="text-xs text-rose-300/80 font-medium">Permanent action &bull; No undo</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed bg-[#121212] p-3.5 rounded-xl border border-[#2a2a2a]">
              {confirmModal.description}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#262626] hover:bg-[#333] text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm &amp; Delete Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
