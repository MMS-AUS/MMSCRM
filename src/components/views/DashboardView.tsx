import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Flame,
  FolderKanban,
  LifeBuoy,
  BadgeDollarSign,
  TrendingUp,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  AlertTriangle,
  ChevronRight,
  Sun,
  Activity,
  Award
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { NavSection } from '../layout/Sidebar';
import { ProjectStatus, TicketStatus, Lead } from '../../types';

export const DashboardView: React.FC<{ onNavigate: (sec: NavSection) => void }> = ({ onNavigate }) => {
  const {
    leads,
    projects,
    tickets,
    calculatePL,
    maintenanceRecords,
    setActiveBridgeSelectProject
  } = useApp();

  const [activeSectionTab, setActiveSectionTab] = useState<'all' | 'leads' | 'projects' | 'tickets'>('all');

  // Financial calculations
  const plData = calculatePL();
  const totalRevenue = plData.reduce((acc, p) => acc + p.contractRevenueAud, 0);
  const totalProfit = plData.reduce((acc, p) => acc + p.grossProfitAud, 0);
  const avgMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;
  const totalStcsClaimed = projects.reduce((acc, p) => acc + p.stcValueAud, 0);
  const totalCapacityKw = projects.reduce((acc, p) => acc + (p.systemSizeKw || 0), 0);

  // 1. LEADS BY STAGE DATA
  const leadStages: { status: Lead['status']; label: string; color: string }[] = [
    { status: 'New', label: 'New Lead', color: '#38bdf8' },
    { status: 'Contacted', label: 'Contacted', color: '#60a5fa' },
    { status: 'Site Survey Scheduled', label: 'Survey Booked', color: '#f59e0b' },
    { status: 'Proposal Sent', label: 'Proposal Sent', color: '#a78bfa' },
    { status: 'Converted to Project', label: 'Converted Won', color: '#bef264' },
    { status: 'Lost', label: 'Lost / Disqualified', color: '#ef4444' }
  ];

  const leadsByStageData = leadStages.map(ls => {
    const matchingLeads = (leads || []).filter(l => l?.status === ls.status);
    const count = matchingLeads.length;
    const estimatedValue = count * 9500; // Average residential solar AUD
    return {
      stage: ls.label,
      rawStage: ls.status,
      count,
      value: estimatedValue,
      fill: ls.color
    };
  });

  const wonLeads = (leads || []).filter(l => l?.status === 'Converted to Project').length;
  const leadConversionRate = (leads || []).length > 0 ? Math.round((wonLeads / leads.length) * 100) : 0;

  // Leads by Source
  const leadSourceMap: Record<string, number> = {};
  (leads || []).forEach(l => {
    if (!l) return;
    const src = l.source || 'Direct Website';
    leadSourceMap[src] = (leadSourceMap[src] || 0) + 1;
  });
  const leadsBySourceData = Object.entries(leadSourceMap).map(([source, count], idx) => {
    const palette = ['#bef264', '#38bdf8', '#fbbf24', '#c084fc', '#f87171', '#34d399'];
    return {
      name: source,
      value: count,
      color: palette[idx % palette.length]
    };
  });

  // 2. PROJECTS BY STAGE DATA
  const projectStages: { status: ProjectStatus; label: string; color: string }[] = [
    { status: 'Site Survey', label: 'Survey', color: '#94a3b8' },
    { status: 'Engineering & DNSP Approval', label: 'DNSP Grid', color: '#38bdf8' },
    { status: 'Sales Order Dispatched', label: 'Order Sent', color: '#60a5fa' },
    { status: 'RFQ Sent to Installers', label: 'RFQ Sent', color: '#fbbf24' },
    { status: 'Install Scheduled', label: 'Scheduled', color: '#f59e0b' },
    { status: 'Installation in Progress', label: 'Installing', color: '#fb923c' },
    { status: 'Installation Completed', label: 'Installed', color: '#4ade80' },
    { status: 'BridgeSelect STC Claimed', label: 'STC Lodged', color: '#a3e635' },
    { status: 'Grid Meter Connected', label: 'Metered', color: '#bef264' },
    { status: 'Completed', label: 'Handover Completed', color: '#10b981' }
  ];

  const projectsByStageData = projectStages.map(ps => {
    const matchingProjects = (projects || []).filter(p => p?.status === ps.status);
    const count = matchingProjects.length;
    const totalKw = matchingProjects.reduce((sum, p) => sum + (p?.systemSizeKw || 0), 0);
    return {
      stage: ps.label,
      rawStatus: ps.status,
      count,
      totalKw: Math.round(totalKw * 10) / 10,
      fill: ps.color
    };
  });

  // 3. TICKETS BY STAGE & CATEGORY DATA
  const ticketStages: { status: TicketStatus; label: string; color: string }[] = [
    { status: 'New', label: 'New Alert', color: '#f43f5e' },
    { status: 'Assigned', label: 'Assigned', color: '#fb923c' },
    { status: 'Technician Scheduled', label: 'Tech Booked', color: '#facc15' },
    { status: 'In Progress', label: 'In Progress', color: '#38bdf8' },
    { status: 'Resolved', label: 'Resolved', color: '#4ade80' },
    { status: 'Closed', label: 'Closed', color: '#64748b' }
  ];

  const ticketsByStageData = ticketStages.map(ts => {
    const count = (tickets || []).filter(t => t?.status === ts.status).length;
    return {
      stage: ts.label,
      rawStatus: ts.status,
      count,
      fill: ts.color
    };
  });

  const ticketCategoryMap: Record<string, number> = {};
  (tickets || []).forEach(t => {
    if (!t) return;
    const cat = t.category || 'General';
    ticketCategoryMap[cat] = (ticketCategoryMap[cat] || 0) + 1;
  });
  const ticketsByCategoryData = Object.entries(ticketCategoryMap).map(([category, count], idx) => {
    const colors = ['#f43f5e', '#fb923c', '#38bdf8', '#a855f7', '#bef264'];
    return {
      name: category,
      value: count,
      color: colors[idx % colors.length]
    };
  });

  const activeTicketsCount = (tickets || []).filter(t => t?.status !== 'Resolved' && t?.status !== 'Closed').length;
  const urgentTickets = (tickets || []).filter(t => t?.priority === 'Urgent');
  const readyForBridgeSelect = (projects || []).filter(
    p => p?.status === 'Installation Completed' && (!p.stcClaimStatus || p.stcClaimStatus === 'Pending')
  );

  // STC Claimed vs Unclaimed calculations
  const claimedProjects = (projects || []).filter(
    p =>
      p?.status === 'BridgeSelect STC Claimed' ||
      p?.status === 'Grid Meter Connected' ||
      p?.status === 'Completed' ||
      p?.bridgeSelectStatus === 'Submitted to Clean Energy Regulator' ||
      p?.bridgeSelectStatus === 'STCs Approved & Paid' ||
      p?.stcClaimStatus === 'Claimed' ||
      p?.stcClaimStatus === 'Approved' ||
      p?.stcClaimStatus === 'Submitted'
  );
  const unclaimedProjects = (projects || []).filter(p => p && !claimedProjects.some(cp => cp.id === p.id));
  const claimedStcTotal = claimedProjects.reduce((sum, p) => sum + (p?.stcCount || 0), 0);
  const claimedStcValueAud = claimedProjects.reduce((sum, p) => sum + (p?.internalStcValueAud ?? p?.stcValueAud ?? 0), 0);
  const unclaimedStcTotal = unclaimedProjects.reduce((sum, p) => sum + (p?.stcCount || 0), 0);
  const unclaimedStcValueAud = unclaimedProjects.reduce((sum, p) => sum + (p?.internalStcValueAud ?? p?.stcValueAud ?? 0), 0);
  const resolvedTicketsCount = (tickets || []).filter(t => t?.status === 'Resolved' || t?.status === 'Closed').length;
  const totalPipelineEstimatedValueAud = leads.length * 9500;
  const wonLeadsValueAud = wonLeads * 9500;

  return (
    <div className="flex-1 bg-[#0a0a0a] overflow-y-auto p-4 sm:p-6 space-y-6 text-[#e5e7eb]">
      {/* Organized Header & Section Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#262626] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Executive Dashboard</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#bef2641a] text-[#bef264] border border-[#bef26433]">
              Live Stage Operations
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Stage-by-stage pipeline analytics across Leads, Solar Projects, and Customer Support Tickets
          </p>
        </div>

        {/* Section Segmented Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-[#141414] border border-[#262626] rounded-xl self-start md:self-auto">
          {[
            { id: 'all', label: 'All Sections', icon: Activity },
            { id: 'leads', label: `Leads (${leads.length})`, icon: Flame },
            { id: 'projects', label: `Projects (${projects.length})`, icon: FolderKanban },
            { id: 'tickets', label: `Tickets (${tickets.length})`, icon: LifeBuoy }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSectionTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSectionTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  isActive
                    ? 'bg-[#bef264] text-black shadow-xs font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-[#1f1f1f]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary KPI Ribbon - Section Specific */}
      {activeSectionTab === 'all' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Leads KPI */}
          <div
            onClick={() => onNavigate('leads')}
            className="bg-[#141414] hover:bg-[#181818] p-4 rounded-xl border border-[#262626] hover:border-[#333] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Inbound Leads Pipeline</span>
              <div className="p-2 rounded-lg bg-[#bef2641a] text-[#bef264] group-hover:scale-110 transition-transform">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{leads.length}</span>
              <span className="text-xs text-emerald-400 font-semibold">{leadConversionRate}% Win Rate</span>
            </div>
            <div className="mt-2 text-[11px] text-gray-400 flex items-center justify-between">
              <span>{wonLeads} Converted to Projects</span>
              <span className="text-[#bef264] font-medium flex items-center">
                View <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Projects KPI */}
          <div
            onClick={() => onNavigate('projects')}
            className="bg-[#141414] hover:bg-[#181818] p-4 rounded-xl border border-[#262626] hover:border-[#333] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Total Systems Active</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                <FolderKanban className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{projects.length}</span>
              <span className="text-xs text-blue-400 font-semibold">{totalCapacityKw.toFixed(1)} kW</span>
            </div>
            <div className="mt-2 text-[11px] text-gray-400 flex items-center justify-between">
              <span>${(totalRevenue / 1000).toFixed(0)}k AUD Contract Value</span>
              <span className="text-blue-400 font-medium flex items-center">
                View <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Number of STC's Claimed */}
          <div
            onClick={() => onNavigate('projects')}
            className="bg-[#141414] hover:bg-[#181818] p-4 rounded-xl border border-[#262626] hover:border-[#333] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Number of STC's Claimed</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{claimedStcTotal}</span>
              <span className="text-xs text-emerald-400 font-semibold">{claimedProjects.length} Projects</span>
            </div>
            <div className="mt-2 text-[11px] text-gray-400 flex items-center justify-between">
              <span>${(claimedStcValueAud / 1000).toFixed(1)}k AUD Rebates</span>
              <span className="text-emerald-400 font-medium flex items-center">
                STC <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Number of STC's Unclaimed */}
          <div
            onClick={() => onNavigate('projects')}
            className="bg-[#141414] hover:bg-[#181818] p-4 rounded-xl border border-[#262626] hover:border-[#333] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Number of STC's Unclaimed</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{unclaimedStcTotal}</span>
              <span className="text-xs text-amber-400 font-semibold">{unclaimedProjects.length} Pending</span>
            </div>
            <div className="mt-2 text-[11px] text-gray-400 flex items-center justify-between">
              <span>${(unclaimedStcValueAud / 1000).toFixed(1)}k AUD Pending</span>
              <span className="text-amber-400 font-medium flex items-center">
                Review <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Support Tickets KPI */}
          <div
            onClick={() => onNavigate('tickets')}
            className="bg-[#141414] hover:bg-[#181818] p-4 rounded-xl border border-[#262626] hover:border-[#333] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Service &amp; Warranty Tickets</span>
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
                <LifeBuoy className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{activeTicketsCount}</span>
              <span className="text-xs text-rose-400 font-semibold">{urgentTickets.length} Urgent</span>
            </div>
            <div className="mt-2 text-[11px] text-gray-400 flex items-center justify-between">
              <span>{tickets.length} total historical tickets</span>
              <span className="text-rose-400 font-medium flex items-center">
                Tickets <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      )}

      {/* LEADS TAB KPI RIBBON (No STCs, No Tickets) */}
      {activeSectionTab === 'leads' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            onClick={() => onNavigate('leads')}
            className="bg-[#141414] hover:bg-[#181818] p-4 rounded-xl border border-[#262626] hover:border-[#333] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Inbound Leads Pipeline</span>
              <div className="p-2 rounded-lg bg-[#bef2641a] text-[#bef264] group-hover:scale-110 transition-transform">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{leads.length}</span>
              <span className="text-xs text-emerald-400 font-semibold">{leadConversionRate}% Win Rate</span>
            </div>
            <div className="mt-2 text-[11px] text-gray-400 flex items-center justify-between">
              <span>{wonLeads} Converted to Projects</span>
              <span className="text-[#bef264] font-medium flex items-center">
                View <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          <div
            onClick={() => onNavigate('leads')}
            className="bg-[#141414] hover:bg-[#181818] p-4 rounded-xl border border-[#262626] hover:border-[#333] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Converted to Projects</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{wonLeads}</span>
              <span className="text-xs text-emerald-400 font-semibold">${(wonLeadsValueAud / 1000).toFixed(0)}k AUD</span>
            </div>
            <div className="mt-2 text-[11px] text-gray-400 flex items-center justify-between">
              <span>Customer Proposals Signed</span>
              <span className="text-emerald-400 font-medium flex items-center">
                Converted <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          <div
            onClick={() => onNavigate('leads')}
            className="bg-[#141414] hover:bg-[#181818] p-4 rounded-xl border border-[#262626] hover:border-[#333] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Estimated Pipeline Value</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">${(totalPipelineEstimatedValueAud / 1000).toFixed(0)}k</span>
              <span className="text-xs text-blue-400 font-semibold">{leads.length - wonLeads} In Progress</span>
            </div>
            <div className="mt-2 text-[11px] text-gray-400 flex items-center justify-between">
              <span>Potential Residential Solar Value</span>
              <span className="text-blue-400 font-medium flex items-center">
                Pipeline <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      )}

      {/* PROJECTS TAB KPI RIBBON (No Inbound Leads, No Tickets, No BridgeSelect Profit -> STCs Claimed & Unclaimed Added) */}
      {activeSectionTab === 'projects' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Projects KPI */}
          <div
            onClick={() => onNavigate('projects')}
            className="bg-[#141414] hover:bg-[#181818] p-4 rounded-xl border border-[#262626] hover:border-[#333] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Total Systems Active</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                <FolderKanban className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{projects.length}</span>
              <span className="text-xs text-blue-400 font-semibold">{totalCapacityKw.toFixed(1)} kW</span>
            </div>
            <div className="mt-2 text-[11px] text-gray-400 flex items-center justify-between">
              <span>${(totalRevenue / 1000).toFixed(0)}k AUD Contract Value</span>
              <span className="text-blue-400 font-medium flex items-center">
                View <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Number of STC's Claimed */}
          <div
            onClick={() => onNavigate('projects')}
            className="bg-[#141414] hover:bg-[#181818] p-4 rounded-xl border border-[#262626] hover:border-[#333] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Number of STC's Claimed</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{claimedStcTotal}</span>
              <span className="text-xs text-emerald-400 font-semibold">{claimedProjects.length} Projects</span>
            </div>
            <div className="mt-2 text-[11px] text-gray-400 flex items-center justify-between">
              <span>${(claimedStcValueAud / 1000).toFixed(1)}k AUD CER Rebates</span>
              <span className="text-emerald-400 font-medium flex items-center">
                Lodged <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Number of STC's Unclaimed */}
          <div
            onClick={() => onNavigate('projects')}
            className="bg-[#141414] hover:bg-[#181818] p-4 rounded-xl border border-[#262626] hover:border-[#333] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Number of STC's Unclaimed</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{unclaimedStcTotal}</span>
              <span className="text-xs text-amber-400 font-semibold">{unclaimedProjects.length} Pending</span>
            </div>
            <div className="mt-2 text-[11px] text-gray-400 flex items-center justify-between">
              <span>${(unclaimedStcValueAud / 1000).toFixed(1)}k AUD Pending</span>
              <span className="text-amber-400 font-medium flex items-center">
                Pending <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TICKETS TAB KPI RIBBON (No Inbound Leads, No BridgeSelect Profit, No Service & Warranty Tickets) */}
      {activeSectionTab === 'tickets' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            onClick={() => onNavigate('projects')}
            className="bg-[#141414] hover:bg-[#181818] p-4 rounded-xl border border-[#262626] hover:border-[#333] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Total Systems Active</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                <FolderKanban className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{projects.length}</span>
              <span className="text-xs text-blue-400 font-semibold">{totalCapacityKw.toFixed(1)} kW</span>
            </div>
            <div className="mt-2 text-[11px] text-gray-400 flex items-center justify-between">
              <span>Customer Fleet Under Warranty</span>
              <span className="text-blue-400 font-medium flex items-center">
                Fleet <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          <div
            onClick={() => onNavigate('tickets')}
            className="bg-[#141414] hover:bg-[#181818] p-4 rounded-xl border border-[#262626] hover:border-[#333] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Active Support Cases</span>
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
                <LifeBuoy className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{activeTicketsCount}</span>
              <span className="text-xs text-rose-400 font-semibold">{urgentTickets.length} Urgent</span>
            </div>
            <div className="mt-2 text-[11px] text-gray-400 flex items-center justify-between">
              <span>Inverter, WiFi &amp; Hardware Dispatches</span>
              <span className="text-rose-400 font-medium flex items-center">
                Manage <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          <div
            onClick={() => onNavigate('tickets')}
            className="bg-[#141414] hover:bg-[#181818] p-4 rounded-xl border border-[#262626] hover:border-[#333] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Resolved &amp; Closed History</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{resolvedTicketsCount}</span>
              <span className="text-xs text-emerald-400 font-semibold">
                {tickets.length > 0 ? Math.round((resolvedTicketsCount / tickets.length) * 100) : 0}% Solved
              </span>
            </div>
            <div className="mt-2 text-[11px] text-gray-400 flex items-center justify-between">
              <span>{tickets.length} Total Historical Support Inquiries</span>
              <span className="text-emerald-400 font-medium flex items-center">
                History <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: LEADS ACCORDING TO STAGES */}
      {/* ========================================================================= */}
      {(activeSectionTab === 'all' || activeSectionTab === 'leads') && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#202020]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#bef2641a] text-[#bef264]">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Leads Pipeline by Stage</h3>
                <p className="text-[11px] text-gray-400">
                  Real-time progression from Meta Ads intake through site survey to converted contract
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('leads')}
              className="text-xs text-[#bef264] hover:underline font-semibold flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Manage All Leads</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            {/* Stage Bar Chart (8 cols) */}
            <div className="lg:col-span-8">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadsByStageData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <XAxis
                      dataKey="stage"
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#181818', borderColor: '#2d2d2d', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      formatter={(value: any, name: any) => [`${value} Leads`, 'Volume']}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {leadsByStageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Stage Breakdown List & Source Donut (4 cols) */}
            <div className="lg:col-span-4 bg-[#181818] border border-[#262626] rounded-xl p-4 space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Stage Distribution
              </span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {leadsByStageData.map(item => (
                  <div key={item.stage} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                      <span className="text-gray-300 truncate max-w-[130px]">{item.stage}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{item.count}</span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        ({leads.length > 0 ? Math.round((item.count / leads.length) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-[#262626] flex items-center justify-between text-xs">
                <span className="text-gray-400">Total Pipeline:</span>
                <span className="font-bold text-[#bef264]">{leads.length} Leads</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: PROJECTS ACCORDING TO STAGES */}
      {/* ========================================================================= */}
      {(activeSectionTab === 'all' || activeSectionTab === 'projects') && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#202020]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <FolderKanban className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Projects Pipeline by Stage</h3>
                <p className="text-[11px] text-gray-400">
                  Full lifecycle tracking from DNSP Grid Approval, Installer Dispatch, STC Claim to Metering
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('projects')}
              className="text-xs text-blue-400 hover:underline font-semibold flex items-center gap-1 self-start sm:self-auto"
            >
              <span>View All Projects</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            {/* Stage Bar Chart (8 cols) */}
            <div className="lg:col-span-8">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectsByStageData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <XAxis
                      dataKey="stage"
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#181818', borderColor: '#2d2d2d', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      formatter={(value: any, name: any, item: any) => [
                        `${value} Projects (${item.payload.totalKw} kW)`,
                        'Stage Volume'
                      ]}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {projectsByStageData.map((entry, index) => (
                        <Cell key={`proj-cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Action & Milestone Highlights (4 cols) */}
            <div className="lg:col-span-4 bg-[#181818] border border-[#262626] rounded-xl p-4 space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Installation Milestones
              </span>

              <div className="space-y-2.5">
                <div className="p-2.5 rounded-lg bg-[#141414] border border-[#262626]">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-400">CER STCs Claimed vs Unclaimed</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#bef2641a] text-[#bef264] text-[10px] font-bold">
                      {claimedStcTotal} Claimed / {unclaimedStcTotal} Unclaimed
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300">
                    {claimedProjects.length} systems lodged (${(claimedStcValueAud / 1000).toFixed(1)}k AUD), {unclaimedProjects.length} installations pending (${(unclaimedStcValueAud / 1000).toFixed(1)}k AUD).
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-[#141414] border border-[#262626]">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-400">Total Generation Power</span>
                    <span className="text-white font-bold text-xs">{totalCapacityKw.toFixed(1)} kW</span>
                  </div>
                  <p className="text-[11px] text-gray-300">Clean solar power across NSW &amp; QLD network areas.</p>
                </div>
              </div>

              <div className="pt-2 border-t border-[#262626] flex items-center justify-between text-xs">
                <span className="text-gray-400">Total Active Systems:</span>
                <span className="font-bold text-blue-400">{projects.length} Installations</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: TICKETS ACCORDING TO STAGES */}
      {/* ========================================================================= */}
      {(activeSectionTab === 'all' || activeSectionTab === 'tickets') && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#202020]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                <LifeBuoy className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Tickets &amp; Warranty by Stage</h3>
                <p className="text-[11px] text-gray-400">
                  Service dispatch workflow: Inverter faults, WiFi monitoring, and switchboard maintenance
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('tickets')}
              className="text-xs text-rose-400 hover:underline font-semibold flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Manage All Tickets</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            {/* Tickets Stage Bar Chart (8 cols) */}
            <div className="lg:col-span-8">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ticketsByStageData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <XAxis
                      dataKey="stage"
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      interval={0}
                    />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#181818', borderColor: '#2d2d2d', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      formatter={(value: any) => [`${value} Tickets`, 'Volume']}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {ticketsByStageData.map((entry, index) => (
                        <Cell key={`ticket-cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Breakdown (4 cols) */}
            <div className="lg:col-span-4 bg-[#181818] border border-[#262626] rounded-xl p-4 space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Fault Categories
              </span>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {ticketsByCategoryData.map(cat => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-gray-300 truncate max-w-[140px]">{cat.name}</span>
                    </div>
                    <span className="font-bold text-white">{cat.value}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-[#262626] flex items-center justify-between text-xs">
                <span className="text-gray-400">Active Unresolved:</span>
                <span className="font-bold text-rose-400">{activeTicketsCount} Tickets</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Operational Highlights / Quick Actions Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="p-4 rounded-xl bg-[#141414] border border-[#262626] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-300">2-Year CEC Maintenance</span>
            <p className="text-[11px] text-gray-500">
              {(maintenanceRecords || []).filter(m => m?.status === 'Overdue').length} system(s) overdue for inspection
            </p>
          </div>
          <button
            onClick={() => onNavigate('maintenance')}
            className="px-3 py-1.5 rounded-lg bg-[#1f1f1f] hover:bg-[#262626] text-xs text-amber-400 font-semibold border border-[#333] transition-colors"
          >
            Review
          </button>
        </div>

        <div className="p-4 rounded-xl bg-[#141414] border border-[#262626] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-300">Customer Referral Program</span>
            <p className="text-[11px] text-gray-500">
              Direct EFT incentives for happy solar advocates
            </p>
          </div>
          <button
            onClick={() => onNavigate('referrals')}
            className="px-3 py-1.5 rounded-lg bg-[#1f1f1f] hover:bg-[#262626] text-xs text-emerald-400 font-semibold border border-[#333] transition-colors"
          >
            Referrals
          </button>
        </div>

        <div className="p-4 rounded-xl bg-[#141414] border border-[#262626] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-300">Customer Reviews &amp; GMB</span>
            <p className="text-[11px] text-gray-500">
              Sync verified 5-star feedback to Google Business Profile
            </p>
          </div>
          <button
            onClick={() => onNavigate('reviews')}
            className="px-3 py-1.5 rounded-lg bg-[#1f1f1f] hover:bg-[#262626] text-xs text-[#bef264] font-semibold border border-[#333] transition-colors"
          >
            Reviews
          </button>
        </div>
      </div>
    </div>
  );
};
