import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  LifeBuoy,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  MessageSquare,
  User,
  Wrench,
  Filter,
  FileText,
  Plus,
  Edit3
} from 'lucide-react';
import { Ticket, TicketStatus, ViewMode } from '../../types';
import { ViewModeSwitcher } from '../common/ViewModeSwitcher';
import { TicketEditModal } from '../tickets/TicketEditModal';

export const TicketsView: React.FC = () => {
  const {
    tickets,
    updateTicketStatus,
    setIsVoipDialerOpen,
    setIsQuickSmsOpen,
    ticketsViewMode: viewMode,
    setTicketsViewMode: setViewMode
  } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  // Ticket Detail Edit Modal State
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);

  const handleOpenNewTicket = () => {
    setEditingTicket(null);
    setIsTicketModalOpen(true);
  };

  const handleOpenEditTicket = (tkt: Ticket) => {
    setEditingTicket(tkt);
    setIsTicketModalOpen(true);
  };

  const filteredTickets = (tickets || []).filter(t => {
    if (!t) return false;
    const matchesSearch =
      (t.ticketNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.projectCode || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t?.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = (ticketId: string, status: TicketStatus) => {
    updateTicketStatus(ticketId, status, resolutionText || undefined);
    setSelectedTicket(null);
    setResolutionText('');
  };

  const getPriorityBadgeStyle = (priority: string) => {
    switch (priority) {
      case 'High':
      case 'Critical':
      case 'Urgent':
        return 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
      case 'Medium':
        return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
      case 'Low':
      default:
        return 'bg-[#bef264]/20 text-[#bef264] border border-[#bef264]/30';
    }
  };

  const ticketStages: { id: TicketStatus; label: string; color: string }[] = [
    { id: 'New', label: 'New Tickets', color: 'border-rose-500/40 bg-rose-500/10 text-rose-300' },
    { id: 'In Progress', label: 'In Progress / Dispatched', color: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
    { id: 'Resolved', label: 'Resolved (Fixed)', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
    { id: 'Closed', label: 'Closed / Archived', color: 'border-gray-500/40 bg-gray-500/10 text-gray-300' }
  ];

  return (
    <div className="flex-1 bg-[#0a0a0a] overflow-y-auto p-4 sm:p-6 space-y-6 text-[#e5e7eb]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Customer Support Tickets
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Post-Completion Warranty Desk
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Real-time warranty and service tracking raised exclusively from customer portals on Completed solar projects
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <ViewModeSwitcher currentMode={viewMode} onModeChange={setViewMode} />

          <button
            type="button"
            onClick={handleOpenNewTicket}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Raise Support Ticket</span>
          </button>

          <span className="px-3 py-1.5 rounded-lg bg-[#1e1e1e] border border-[#2d2d2d] text-gray-300 shadow-xs">
            Open Tickets: <strong className="text-white">{(tickets || []).filter(t => t && t?.status !== 'Resolved' && t?.status !== 'Closed').length}</strong>
          </span>
        </div>
      </div>

      {/* Rules Notice */}
      <div className="p-3.5 bg-[#1e1e1e] border border-[#bef26433] rounded-xl text-xs text-gray-300 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-[#bef264] mt-0.5 shrink-0" />
        <div>
          <p className="font-bold text-white">System Access Constraint:</p>
          <p className="text-gray-400 text-[11px] mt-0.5">
            Customers can only raise warranty tickets once their Project Status has reached <strong className="text-[#bef264]">Completed</strong>. Once submitted, tickets appear immediately in this queue as "New", and status changes are reflected live in the customer's portal.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-[#1e1e1e] p-4 rounded-xl border border-[#2d2d2d] shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search tickets by ticket number (#TKT-...), customer, project code..."
            className="w-full text-xs pl-9 pr-4 py-2 rounded-lg bg-[#121212] border border-[#262626] text-white placeholder:text-gray-500 outline-none focus:border-[#bef264]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-xs font-semibold bg-[#121212] border border-[#262626] text-white rounded-lg px-3 py-2 outline-none w-full sm:w-auto focus:border-[#bef264]"
        >
          <option value="all">All Ticket Statuses</option>
          <option value="New">New</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      {/* View Mode: Pipeline (Kanban) */}
      {viewMode === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {ticketStages.map(stage => {
            const stageTickets = (filteredTickets || []).filter(t => t?.status === stage.id);
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
                    {stageTickets.length}
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[750px] pr-1">
                  {stageTickets.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-500 border border-dashed border-[#262626] rounded-lg">
                      No tickets in this stage
                    </div>
                  ) : (
                    stageTickets.map(tkt => (
                      <div
                        key={tkt.id}
                        className="bg-[#1e1e1e] p-3.5 rounded-lg border border-[#2d2d2d] hover:border-[#bef264]/40 transition-all space-y-2.5 shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <span className="font-mono font-bold text-xs text-[#bef264]">
                              {tkt.ticketNumber}
                            </span>
                            <h4 className="font-bold text-xs text-white leading-tight mt-0.5">
                              {tkt.title}
                            </h4>
                          </div>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getPriorityBadgeStyle(tkt.priority)}`}
                          >
                            {tkt.priority}
                          </span>
                        </div>

                        <p className="text-[11px] text-gray-300 line-clamp-2 bg-[#141414] p-2 rounded border border-[#262626]">
                          {tkt.description}
                        </p>

                        <div className="text-[10px] text-gray-400 space-y-0.5">
                          <p>Customer: <strong className="text-white">{tkt.customerName}</strong></p>
                          <p>Project: <strong className="text-gray-200">{tkt.projectCode}</strong> &bull; {tkt.category}</p>
                        </div>

                        <div className="pt-1">
                          <select
                            value={tkt.status}
                            onChange={e => handleUpdateStatus(tkt.id, e.target.value as TicketStatus)}
                            className="w-full text-[10px] font-bold bg-[#141414] border border-[#333] rounded px-2 py-1 outline-none text-white focus:border-[#bef264]"
                          >
                            <option value="New">New</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Closed">Closed</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-[#262626]">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setIsVoipDialerOpen(true)}
                              className="p-1.5 rounded bg-[#262626] hover:bg-[#333] text-emerald-400"
                              title="Call Customer"
                            >
                              <Phone className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setIsQuickSmsOpen(true)}
                              className="p-1.5 rounded bg-[#262626] hover:bg-[#333] text-amber-400"
                              title="SMS Customer"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditTicket(tkt)}
                              className="text-[10px] font-bold text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1"
                              title="Open full 3-column ticket details"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Details</span>
                            </button>
                            <button
                              onClick={() => setSelectedTicket(tkt)}
                              className="text-[10px] font-bold text-[#bef264] hover:underline"
                            >
                              Resolution Note
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
                  <th className="px-4 py-3">Ticket # &amp; Title</th>
                  <th className="px-4 py-3">Customer &amp; Project</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assigned Tech</th>
                  <th className="px-4 py-3">Date Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No warranty tickets found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map(tkt => (
                    <tr key={tkt.id} className="hover:bg-[#252525] transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-white block">{tkt.ticketNumber}</span>
                        <span className="text-[11px] text-gray-300 font-semibold truncate max-w-[180px] block">
                          {tkt.title}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{tkt.customerName}</div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-1 font-mono">
                          <span>{tkt.projectCode}</span>
                          <span>&bull;</span>
                          <span>{tkt.customerPhone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        <span className="text-xs">{tkt.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${getPriorityBadgeStyle(tkt.priority)}`}
                        >
                          {tkt.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={tkt.status}
                          onChange={e => handleUpdateStatus(tkt.id, e.target.value as TicketStatus)}
                          className="text-[11px] font-bold bg-[#121212] border border-[#262626] rounded-lg px-2 py-1 outline-none text-white focus:border-[#bef264]"
                        >
                          <option value="New">New</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-[11px]">
                        {tkt.assignedTechnician || 'Auto-Dispatch'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-[11px]">
                        {tkt.createdAt}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditTicket(tkt)}
                            className="p-1.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 transition-colors"
                            title="Edit Ticket Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
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
                            onClick={() => setSelectedTicket(tkt)}
                            className="px-2 py-1 rounded bg-[#bef264] hover:bg-[#a3e635] text-slate-950 text-[11px] font-bold shadow-xs transition-colors"
                          >
                            Resolve
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTickets.map(tkt => (
            <div
              key={tkt.id}
              className="bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] shadow-xs p-5 space-y-3 hover:border-[#bef264]/40 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#262626] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-white">{tkt.ticketNumber}</span>
                      <span className="text-sm font-bold text-gray-200">&bull; {tkt.title}</span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          tkt.status === 'New'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : tkt.status === 'In Progress'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {tkt.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Customer: <strong className="text-white">{tkt.customerName}</strong> ({tkt.customerPhone}) &bull; Linked Project: <strong className="text-white">{tkt.projectCode}</strong>
                    </p>
                  </div>

                  {/* Quick Status updater */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-xs font-semibold text-gray-400">Live Status:</span>
                    <select
                      value={tkt.status}
                      onChange={e => handleUpdateStatus(tkt.id, e.target.value as TicketStatus)}
                      className="text-xs font-bold bg-[#121212] border border-[#262626] rounded-lg px-2.5 py-1.5 outline-none text-white focus:border-[#bef264]"
                    >
                      <option value="New">New</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs text-gray-300 bg-[#161616] p-3 rounded-lg border border-[#262626]">
                  <span className="font-bold text-white block mb-1">Issue Description:</span>
                  <p>{tkt.description}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Category:</span>
                    <span className="font-semibold text-gray-200">{tkt.category}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-0.5">Priority:</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded inline-block ${getPriorityBadgeStyle(tkt.priority)}`}
                    >
                      {tkt.priority} Priority
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Assigned Tech:</span>
                    <span className="font-semibold text-gray-200">{tkt.assignedTechnician || 'Auto-Dispatching'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Created:</span>
                    <span className="text-gray-400">{tkt.createdAt}</span>
                  </div>
                </div>

                {tkt.resolutionNotes && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
                    <span className="font-bold block mb-0.5 text-emerald-400">Technician Resolution Notes:</span>
                    {tkt.resolutionNotes}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="pt-3 flex items-center justify-between border-t border-[#262626]">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEditTicket(tkt)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Edit3 className="w-3 h-3 text-amber-400" />
                    <span>Details</span>
                  </button>
                  <button
                    onClick={() => setIsVoipDialerOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-[#262626] hover:bg-[#333] text-emerald-400 border border-[#333] text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Phone className="w-3 h-3 text-emerald-400" />
                    <span>Call Customer</span>
                  </button>
                  <button
                    onClick={() => setIsQuickSmsOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-[#262626] hover:bg-[#333] text-amber-400 border border-[#333] text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <MessageSquare className="w-3 h-3 text-amber-400" />
                    <span>SMS Update</span>
                  </button>
                </div>

                <button
                  onClick={() => setSelectedTicket(tkt)}
                  className="text-xs font-bold text-[#bef264] hover:underline"
                >
                  Add Resolution Note
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ticket Detail 3-Column Edit Modal */}
      {isTicketModalOpen && (
        <TicketEditModal
          isOpen={isTicketModalOpen}
          onClose={() => {
            setIsTicketModalOpen(false);
            setEditingTicket(null);
          }}
          ticket={editingTicket}
        />
      )}

      {/* Resolution Notes Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#1e1e1e] rounded-xl shadow-2xl border border-[#2d2d2d] overflow-hidden text-[#e5e7eb]">
            <div className="p-4 bg-[#161616] border-b border-[#262626] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Resolution Note: {selectedTicket.ticketNumber}</h3>
              <button onClick={() => setSelectedTicket(null)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="p-5 space-y-3">
              <label className="block text-xs font-semibold text-gray-300">
                Technician Action &amp; Diagnosis
              </label>
              <textarea
                rows={4}
                value={resolutionText}
                onChange={e => setResolutionText(e.target.value)}
                placeholder="e.g. Rebooted Wi-Fi monitoring dongle, reconfigured 2.4GHz network channel, verified live cloud inverter telemetry."
                className="w-full text-xs p-3 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedTicket.id, 'Resolved')}
                  className="px-4 py-1.5 bg-[#bef264] hover:bg-[#a3e635] text-slate-950 text-xs font-bold rounded-lg transition-colors"
                >
                  Mark as Resolved &amp; Update Customer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
