import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FolderKanban,
  Search,
  FileText,
  ShieldCheck,
  Package,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  MapPin,
  Camera,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  DollarSign,
  Zap,
  Building2,
  Plus,
  Edit,
  Sun,
  Phone,
  MessageSquare
} from 'lucide-react';
import { Project, ProjectStatus, ViewMode } from '../../types';
import { ViewModeSwitcher } from '../common/ViewModeSwitcher';
import { ProjectEditModal } from '../projects/ProjectEditModal';

export const ProjectsView: React.FC<{ onNavigateToSection: (sec: any) => void }> = ({ onNavigateToSection }) => {
  const {
    projects,
    updateProjectStatus,
    setActiveBridgeSelectProject,
    setSelectedPreviewProposalUrl,
    salesOrders,
    installOrders,
    systemRules,
    projectsViewMode: viewMode,
    setProjectsViewMode: setViewMode,
    setIsVoipDialerOpen,
    setIsQuickSmsOpen
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProjectForEdit, setSelectedProjectForEdit] = useState<Project | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleOpenEditModal = (proj: Project) => {
    setSelectedProjectForEdit(proj);
    setIsEditModalOpen(true);
  };

  const handleOpenNewProject = () => {
    setSelectedProjectForEdit(null);
    setIsEditModalOpen(true);
  };

  const filteredProjects = (projects || []).filter(p => {
    if (!p) return false;
    const matchesSearch =
      (p.projectCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.suburb || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.address || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = stateFilter === 'all' || p.state === stateFilter;
    const matchesStatus = statusFilter === 'all' || p?.status === statusFilter;
    return matchesSearch && matchesState && matchesStatus;
  });

  const projectStages = [
    {
      id: 'Engineering & DNSP Approval',
      label: 'Engineering & DNSP',
      filter: (p: Project) => p?.status === 'Site Survey' || p?.status === 'Engineering & DNSP Approval',
      color: 'border-blue-500/40 bg-blue-500/10 text-blue-300'
    },
    {
      id: 'Sales Order Dispatched',
      label: 'Warehouse & Equipment',
      filter: (p: Project) => p?.status === 'Sales Order Dispatched',
      color: 'border-amber-500/40 bg-amber-500/10 text-amber-300'
    },
    {
      id: 'Installation in Progress',
      label: 'Installation Scheduled/Active',
      filter: (p: Project) =>
        p?.status === 'RFQ Sent to Installers' ||
        p?.status === 'Install Scheduled' ||
        p?.status === 'Installation in Progress',
      color: 'border-purple-500/40 bg-purple-500/10 text-purple-300'
    },
    {
      id: 'BridgeSelect STC Claimed',
      label: 'STC Compliance & Grid',
      filter: (p: Project) =>
        p?.status === 'Installation Completed' ||
        p?.status === 'BridgeSelect STC Claimed' ||
        p?.status === 'Grid Meter Connected',
      color: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
    },
    {
      id: 'Completed',
      label: 'Completed & Handover',
      filter: (p: Project) => p?.status === 'Completed',
      color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
    }
  ];

  return (
    <div className="flex-1 bg-[#0a0a0a] overflow-y-auto p-4 sm:p-6 space-y-6 text-[#e5e7eb]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Solar Projects Operations Pipeline
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Integrated with OpenSolar proposals, BridgeSelect STC compliance, and warehouse equipment dispatch
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <button
            onClick={handleOpenNewProject}
            className="px-3 py-1.5 rounded-lg bg-[#bef264] hover:bg-[#a3e635] text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>

          <ViewModeSwitcher currentMode={viewMode} onModeChange={setViewMode} />

          <span className="px-3 py-1.5 rounded-lg bg-[#1e1e1e] border border-[#2d2d2d] text-gray-300 shadow-xs">
            Total Pipeline: <strong className="text-white">{projects.length} Systems</strong>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#1e1e1e] p-4 rounded-xl border border-[#2d2d2d] shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by code (e.g. PRJ-NSW-101), customer, suburb..."
            className="w-full text-xs pl-9 pr-4 py-2 rounded-lg bg-[#121212] border border-[#262626] text-white placeholder:text-gray-500 outline-none focus:border-[#bef264]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value)}
            className="text-xs font-semibold bg-[#121212] border border-[#262626] text-white rounded-lg px-3 py-2 outline-none focus:border-[#bef264]"
          >
            <option value="all">All States (NSW &amp; QLD)</option>
            <option value="NSW">NSW (Ausgrid/Endeavour)</option>
            <option value="QLD">QLD (Energex/Ergon)</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs font-semibold bg-[#121212] border border-[#262626] text-white rounded-lg px-3 py-2 outline-none focus:border-[#bef264]"
          >
            <option value="all">All Stages</option>
            <option value="Engineering & DNSP Approval">Engineering &amp; DNSP Approval</option>
            <option value="Sales Order Created (Warehouse)">Sales Order Created</option>
            <option value="Subcontractor RFQ / Quoting">Subcontractor RFQ / Quoting</option>
            <option value="Install Scheduled">Install Scheduled</option>
            <option value="Installation in Progress">Installation in Progress</option>
            <option value="Installation Completed">Installation Completed</option>
            <option value="BridgeSelect STC Claimed">BridgeSelect STC Claimed</option>
            <option value="Completed">Completed &amp; Handover</option>
          </select>
        </div>
      </div>

      {/* View Mode: Pipeline (Kanban) */}
      {viewMode === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 items-start">
          {projectStages.map(stage => {
            const stageProjects = filteredProjects.filter(stage.filter);
            return (
              <div
                key={stage.id}
                className="bg-[#161616] rounded-xl border border-[#262626] p-3 flex flex-col gap-3 min-h-[500px]"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${stage.color}`}>
                    {stage.label}
                  </span>
                  <span className="text-xs font-mono font-bold text-gray-400 bg-[#222] px-2 py-0.5 rounded-md">
                    {stageProjects.length}
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[750px] pr-1">
                  {stageProjects.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-500 border border-dashed border-[#262626] rounded-lg">
                      No projects in this stage
                    </div>
                  ) : (
                    stageProjects.map(proj => (
                      <div
                        key={proj.id}
                        className="bg-[#1e1e1e] p-3 rounded-lg border border-[#2d2d2d] hover:border-[#bef264]/40 transition-all space-y-2.5 shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="cursor-pointer" onClick={() => handleOpenEditModal(proj)}>
                            <span className="font-mono text-[11px] font-bold text-[#bef264] hover:underline block">
                              {proj.projectCode}
                            </span>
                            <h4 className="font-bold text-xs text-white hover:text-[#bef264] transition-colors leading-tight mt-0.5">
                              {proj.customerName}
                            </h4>
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#252525] text-gray-300">
                            {proj.systemSizeKw}kW
                          </span>
                        </div>

                        <div className="text-[11px] text-gray-400 space-y-1">
                          <p className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-[#bef264] shrink-0" />
                            <span className="truncate">{proj.suburb}, {proj.state}</span>
                          </p>
                          <div className="flex justify-between items-center text-[10px] text-gray-400 bg-[#121212] p-1.5 rounded">
                            <span>Contract: <strong className="text-white">${(proj.contractValueAud / 1000).toFixed(1)}k</strong></span>
                            <span>Internal CER: <strong className="text-emerald-400 font-mono">+${(proj.internalStcValueAud ?? proj.stcValueAud).toLocaleString()}</strong></span>
                          </div>
                        </div>

                        {/* Status select in card */}
                        <div className="pt-1">
                          <select
                            value={proj.status}
                            onChange={e => updateProjectStatus(proj.id, e.target.value as ProjectStatus)}
                            className="w-full text-[10px] font-bold bg-[#bef2641a] text-[#bef264] border border-[#bef26433] rounded px-2 py-1 outline-none"
                          >
                            <option value="Site Survey">Site Survey</option>
                            <option value="Engineering & DNSP Approval">Engineering &amp; DNSP</option>
                            <option value="Sales Order Created (Warehouse)">Sales Order (Warehouse)</option>
                            <option value="Subcontractor RFQ / Quoting">Subcontractor RFQ</option>
                            <option value="Install Scheduled">Install Scheduled</option>
                            <option value="Installation in Progress">Installation Active</option>
                            <option value="Installation Completed">Installation Completed</option>
                            <option value="BridgeSelect STC Claimed">BridgeSelect Claimed</option>
                            <option value="Completed">Completed &amp; Handover</option>
                          </select>
                        </div>

                        {/* Quick modal launchers */}
                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-[#262626]">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setIsVoipDialerOpen(true)}
                              className="p-1.5 rounded bg-[#262626] hover:bg-[#333] text-emerald-400 border border-[#333] transition-colors"
                              title="Call Customer"
                            >
                              <Phone className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setIsQuickSmsOpen(true)}
                              className="p-1.5 rounded bg-[#262626] hover:bg-[#333] text-amber-400 border border-[#333] transition-colors"
                              title="SMS Customer"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(proj)}
                              className="text-[10px] text-[#bef264] hover:text-white font-semibold flex items-center gap-1"
                              title="View/Edit Full Project Details"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Details</span>
                            </button>

                            <button
                              onClick={() => setSelectedPreviewProposalUrl(proj.openSolarProposalId)}
                              className="text-[10px] text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1"
                              title="Preview OpenSolar proposal"
                            >
                              <FileText className="w-3 h-3" />
                              <span>OpenSolar</span>
                            </button>

                            <button
                              onClick={() => setActiveBridgeSelectProject(proj)}
                              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                              title="Launch BridgeSelect STC modal"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>STC</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Mode: Table */}
      {viewMode === 'table' && (
        <div className="bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#161616] text-gray-400 uppercase text-[10px] font-bold border-b border-[#2d2d2d] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Project Code &amp; Title</th>
                  <th className="px-4 py-3">Customer &amp; Location</th>
                  <th className="px-4 py-3">Capacity &amp; Hardware</th>
                  <th className="px-4 py-3">Contract Value</th>
                  <th className="px-4 py-3">Internal CER Claim (Profit)</th>
                  <th className="px-4 py-3">Customer STC Rebate</th>
                  <th className="px-4 py-3">Stage / Status</th>
                  <th className="px-4 py-3">Subcontractor</th>
                  <th className="px-4 py-3 text-right">Integrations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No solar projects match your search or filter.
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map(proj => (
                    <tr key={proj.id} className="hover:bg-[#252525] transition-colors">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleOpenEditModal(proj)}
                          className="font-mono font-bold text-[#bef264] hover:underline text-left block"
                        >
                          {proj.projectCode}
                        </button>
                        <span className="text-[11px] text-gray-400 truncate max-w-[150px] block">{proj.title}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div
                          onClick={() => handleOpenEditModal(proj)}
                          className="font-semibold text-white hover:text-[#bef264] cursor-pointer transition-colors"
                        >
                          {proj.customerName}
                        </div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#bef264]" />
                          <span>{proj.suburb}, {proj.state}</span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono">DNSP: {proj.dnsp}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-white block">{proj.systemSizeKw} kW</span>
                        <span className="text-[11px] text-gray-400 block">{proj.panelCount}× {proj.panelBrand}</span>
                        <span className="text-[10px] text-gray-500 block truncate">{proj.inverterBrand}</span>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        <span className="font-bold text-white block">${proj.contractValueAud.toLocaleString()} AUD</span>
                        <span className="text-[10px] text-gray-400">Net Invoice</span>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        <span className="font-bold text-emerald-400 block">+${(proj.internalStcValueAud ?? proj.stcValueAud).toLocaleString()} AUD</span>
                        <span className="text-[10px] text-gray-400">{proj.stcCount} STCs @ ${(proj.internalStcRateAud ?? systemRules.internalStcRateAud ?? 39.50).toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        <span className="font-bold text-blue-400 block">-${(proj.customerStcValueAud ?? Math.round(proj.stcCount * (systemRules.customerStcRateAud || 36.00))).toLocaleString()} AUD</span>
                        <span className="text-[10px] text-gray-400">{proj.stcCount} STCs @ ${(proj.customerStcRateAud ?? systemRules.customerStcRateAud ?? 36.00).toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={proj.status}
                          onChange={e => updateProjectStatus(proj.id, e.target.value as ProjectStatus)}
                          className="text-[11px] font-bold bg-[#bef2641a] text-[#bef264] border border-[#bef26433] rounded-lg px-2 py-1 outline-none shadow-xs"
                        >
                          <option value="Site Survey">Site Survey</option>
                          <option value="Engineering & DNSP Approval">Engineering &amp; DNSP</option>
                          <option value="Sales Order Created (Warehouse)">Sales Order (Warehouse)</option>
                          <option value="Subcontractor RFQ / Quoting">Subcontractor RFQ</option>
                          <option value="Install Scheduled">Install Scheduled</option>
                          <option value="Installation in Progress">Installation Active</option>
                          <option value="Installation Completed">Installation Completed</option>
                          <option value="BridgeSelect STC Claimed">BridgeSelect Claimed</option>
                          <option value="Completed">Completed &amp; Handover</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-300 text-[11px] block">
                          {proj.subcontractorName || 'Pending'}
                        </span>
                        {proj.installerQuotedAud && (
                          <span className="text-[10px] text-gray-500 font-mono">
                            ${proj.installerQuotedAud.toLocaleString()} quote
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setIsVoipDialerOpen(true)}
                            className="p-1.5 rounded bg-[#262626] hover:bg-[#333] text-emerald-400 border border-[#333] transition-colors"
                            title="Call Customer"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setIsQuickSmsOpen(true)}
                            className="p-1.5 rounded bg-[#262626] hover:bg-[#333] text-amber-400 border border-[#333] transition-colors"
                            title="SMS Customer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(proj)}
                            className="p-1.5 rounded bg-[#bef264]/15 hover:bg-[#bef264]/25 text-[#bef264] border border-[#bef264]/30 transition-colors"
                            title="Edit Project Details"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedPreviewProposalUrl(proj.openSolarProposalId)}
                            className="p-1.5 rounded bg-[#262626] hover:bg-[#333] text-orange-400 border border-[#333] transition-colors"
                            title="OpenSolar Proposal"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setActiveBridgeSelectProject(proj)}
                            className="p-1.5 rounded bg-[#262626] hover:bg-[#333] text-emerald-400 border border-[#333] transition-colors"
                            title="BridgeSelect STC"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Mode: Grid */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredProjects.map(proj => {
            const linkedSalesOrder = salesOrders.find(so => so.projectId === proj.id);
            const linkedInstallOrder = installOrders.find(io => io.projectId === proj.id);

            return (
              <div
                key={proj.id}
                className="bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] shadow-xs p-5 space-y-4 hover:border-[#bef264]/40 transition-colors flex flex-col justify-between"
              >
                {/* Top info */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262626] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(proj)}
                          className="font-mono font-bold text-sm text-[#bef264] hover:underline"
                        >
                          {proj.projectCode}
                        </button>
                        <span className="text-sm font-bold text-gray-200">&bull; {proj.title}</span>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-[#262626] text-gray-300 border border-[#333]">
                          {proj.state} Metro
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#bef264]" />
                          {proj.address}, {proj.suburb}
                        </span>
                        <span>&bull; DNSP: <strong className="text-gray-300">{proj.dnsp}</strong></span>
                      </div>
                    </div>

                    {/* Status Dropdown */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <select
                        value={proj.status}
                        onChange={e => updateProjectStatus(proj.id, e.target.value as ProjectStatus)}
                        className="text-xs font-bold bg-[#bef2641a] text-[#bef264] border border-[#bef26433] rounded-lg px-3 py-1.5 outline-none shadow-xs"
                      >
                        <option value="Site Survey">Site Survey</option>
                        <option value="Engineering & DNSP Approval">Engineering &amp; DNSP Approval</option>
                        <option value="Sales Order Created (Warehouse)">Sales Order Created</option>
                        <option value="Subcontractor RFQ / Quoting">Subcontractor RFQ / Quoting</option>
                        <option value="Install Scheduled">Install Scheduled</option>
                        <option value="Installation in Progress">Installation in Progress</option>
                        <option value="Installation Completed">Installation Completed</option>
                        <option value="BridgeSelect STC Claimed">BridgeSelect STC Claimed</option>
                        <option value="Grid Meter Connected">Grid Meter Connected</option>
                        <option value="Completed">Completed &amp; Handover</option>
                      </select>
                    </div>
                  </div>

                  {/* Hardware Specs & Financials */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-2.5 bg-[#161616] rounded-lg border border-[#262626]">
                      <span className="text-[10px] font-bold uppercase text-gray-400 block">System Specs</span>
                      <p className="font-bold text-white mt-0.5">{proj.systemSizeKw} kW Capacity</p>
                      <p className="text-gray-400 text-[11px] truncate">{proj.panelCount} × {proj.panelBrand}</p>
                      <p className="text-gray-400 text-[11px] truncate">{proj.inverterBrand}</p>
                    </div>

                    <div className="p-2.5 bg-[#161616] rounded-lg border border-[#262626]">
                      <span className="text-[10px] font-bold uppercase text-gray-400 block">Contract Revenue</span>
                      <p className="font-bold text-white mt-0.5">${proj.contractValueAud.toLocaleString()} AUD</p>
                      <p className="text-gray-400 text-[11px]">Customer Net Invoice</p>
                    </div>

                    <div className="p-2.5 bg-[#161616] rounded-lg border border-[#262626]">
                      <span className="text-[10px] font-bold uppercase text-gray-400 block">Dual STC Values</span>
                      <p className="font-bold text-emerald-400 mt-0.5 text-xs font-mono">
                        CER Claim: +${(proj.internalStcValueAud ?? proj.stcValueAud).toLocaleString()} AUD
                      </p>
                      <p className="text-blue-400 text-[11px] font-mono">
                        Customer Rebate: -${(proj.customerStcValueAud ?? Math.round(proj.stcCount * (systemRules.customerStcRateAud || 36.00))).toLocaleString()} AUD
                      </p>
                      <p className="text-gray-400 text-[10px] mt-0.5">
                        Trading spread: +${((proj.internalStcValueAud ?? proj.stcValueAud) - (proj.customerStcValueAud ?? Math.round(proj.stcCount * (systemRules.customerStcRateAud || 36.00)))).toLocaleString()} AUD
                      </p>
                    </div>

                    <div className="p-2.5 bg-[#161616] rounded-lg border border-[#262626]">
                      <span className="text-[10px] font-bold uppercase text-gray-400 block">Subcontractor</span>
                      <p className="font-bold text-gray-200 mt-0.5 truncate">
                        {proj.subcontractorName || 'Pending'}
                      </p>
                      <p className="text-gray-400 text-[11px]">
                        {proj.installerQuotedAud ? `$${proj.installerQuotedAud.toLocaleString()} Quote` : 'Awaiting RFQ'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Linked Integration Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#262626]">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setIsVoipDialerOpen(true)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#161616] hover:bg-[#262626] text-emerald-400 border border-[#2d2d2d] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Call Customer"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Call</span>
                    </button>

                    <button
                      onClick={() => setIsQuickSmsOpen(true)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#161616] hover:bg-[#262626] text-amber-400 border border-[#2d2d2d] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="SMS Customer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                      <span>SMS</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(proj)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#bef264]/15 hover:bg-[#bef264]/25 text-[#bef264] border border-[#bef264]/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Project Details</span>
                    </button>

                    <button
                      onClick={() => setSelectedPreviewProposalUrl(proj.openSolarProposalId)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#161616] hover:bg-[#262626] text-orange-400 border border-[#2d2d2d] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-orange-400" />
                      <span>OpenSolar</span>
                    </button>

                    <button
                      onClick={() => setActiveBridgeSelectProject(proj)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#161616] hover:bg-[#262626] text-emerald-400 border border-[#2d2d2d] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>BridgeSelect STC</span>
                    </button>

                    {linkedSalesOrder && (
                      <button
                        onClick={() => onNavigateToSection('sales-orders')}
                        className="px-2.5 py-1.5 rounded-lg bg-[#161616] hover:bg-[#262626] text-blue-400 border border-[#2d2d2d] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Package className="w-3.5 h-3.5 text-blue-400" />
                        <span>SO: {linkedSalesOrder.orderNumber}</span>
                      </button>
                    )}

                    {linkedInstallOrder && (
                      <button
                        onClick={() => onNavigateToSection('install-orders')}
                        className="px-2.5 py-1.5 rounded-lg bg-[#161616] hover:bg-[#262626] text-purple-400 border border-[#2d2d2d] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-purple-400" />
                        <span>IO: {linkedInstallOrder.orderNumber}</span>
                      </button>
                    )}
                  </div>

                  {proj.installedPhotos && proj.installedPhotos.length > 0 && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-[#bef264]" />
                      <span>{proj.installedPhotos.length} CEC Photos</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full HubSpot-Style Project Edit/Details Modal */}
      <ProjectEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        project={selectedProjectForEdit}
      />
    </div>
  );
};
