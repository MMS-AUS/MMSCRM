import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Wrench,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  UserCheck,
  ShieldCheck,
  Phone,
  MessageSquare,
  Award,
  Sparkles,
  MapPin
} from 'lucide-react';
import { MaintenanceRecord } from '../../types';

export const MaintenanceView: React.FC = () => {
  const {
    maintenanceRecords,
    updateMaintenanceStatus,
    sendAutomatedMaintenanceNotification,
    setIsVoipDialerOpen,
    setIsQuickSmsOpen
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [notificationSuccessMsg, setNotificationSuccessMsg] = useState<string | null>(null);

  const filteredRecords = maintenanceRecords.filter(m => {
    const matchesSearch =
      (m.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.assignedTechnician || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m?.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const overdueCount = (maintenanceRecords || []).filter(m => m?.status === 'Overdue').length;
  const dueSoonCount = (maintenanceRecords || []).filter(m => m?.status === 'Due Soon').length;
  const completedCount = (maintenanceRecords || []).filter(m => m?.status === 'Completed').length;

  const handleNotifyCustomer = (id: string, customerName: string) => {
    sendAutomatedMaintenanceNotification(id);
    setNotificationSuccessMsg(`Automated 2-Year Periodic Service reminder dispatched to ${customerName} via MessageMedia SMS & Gmail!`);
    setTimeout(() => setNotificationSuccessMsg(null), 5000);
  };

  return (
    <div className="flex-1 bg-[#0a0a0a] overflow-y-auto p-4 sm:p-6 space-y-6 text-[#e5e7eb]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              2-Year Periodic Solar Maintenance
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#bef2641a] text-[#bef264] border border-[#bef26433]">
              Clean Energy Council 24-Mo Cycle
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Automated tracking of residential &amp; commercial solar health inspections 2 years post-installation
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 rounded-lg bg-[#1e1e1e] border border-[#2d2d2d] text-gray-300 shadow-xs">
            Overdue Visits: <strong className="text-rose-400">{overdueCount}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-[#1e1e1e] border border-[#2d2d2d] text-gray-300 shadow-xs">
            Due Soon: <strong className="text-[#bef264]">{dueSoonCount}</strong>
          </span>
        </div>
      </div>

      {notificationSuccessMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notificationSuccessMsg}</span>
        </div>
      )}

      {/* Technician Performance Metrics Banner */}
      <div className="bg-[#1e1e1e] p-5 rounded-xl border border-[#2d2d2d] shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#262626] pb-2">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#bef264]" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-white">
              Field Technician Performance Metrics (NSW &amp; QLD Fleet)
            </h3>
          </div>
          <span className="text-[11px] text-gray-400 font-medium">Updated 15 mins ago</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-[#161616] rounded-xl border border-[#262626]">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">Completed Checkups</span>
            <p className="text-base font-bold text-white mt-0.5">{completedCount + 48} Visits</p>
            <p className="text-[10px] text-emerald-400 font-semibold">+12% vs last quarter</p>
          </div>

          <div className="p-3 bg-[#161616] rounded-xl border border-[#262626]">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">On-Time SLA Arrival</span>
            <p className="text-base font-bold text-emerald-400 mt-0.5">96.4%</p>
            <p className="text-[10px] text-gray-400">&plusmn;15 min window accuracy</p>
          </div>

          <div className="p-3 bg-[#161616] rounded-xl border border-[#262626]">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">CEC Compliance Rate</span>
            <p className="text-base font-bold text-blue-400 mt-0.5">100%</p>
            <p className="text-[10px] text-gray-400">AS/NZS 5033 checklist signed</p>
          </div>

          <div className="p-3 bg-[#161616] rounded-xl border border-[#262626]">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">Customer CSAT</span>
            <p className="text-base font-bold text-[#bef264] mt-0.5">4.9 / 5.0</p>
            <p className="text-[10px] text-gray-400">Google My Business reviews</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-[#1e1e1e] p-4 rounded-xl border border-[#2d2d2d] shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by customer, address, technician..."
            className="w-full text-xs pl-9 pr-4 py-2 rounded-lg bg-[#121212] border border-[#262626] text-white placeholder:text-gray-500 outline-none focus:border-[#bef264]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-xs font-semibold bg-[#121212] border border-[#262626] text-white rounded-lg px-3 py-2 outline-none w-full sm:w-auto focus:border-[#bef264]"
        >
          <option value="all">All Service Statuses</option>
          <option value="Overdue">Overdue Visits (Action Required)</option>
          <option value="Due Soon">Due Soon (&lt; 30 Days)</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {/* Maintenance Cards */}
      <div className="space-y-3">
        {filteredRecords.map(rec => {
          const isOverdue = rec.status === 'Overdue';
          return (
            <div
              key={rec.id}
              className={`p-5 rounded-xl border shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isOverdue
                  ? 'bg-rose-500/10 border-rose-500/30'
                  : rec.status === 'Completed'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-[#1e1e1e] border-[#2d2d2d]'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white">{rec.customerName}</h3>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      isOverdue
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                        : rec.status === 'Due Soon'
                        ? 'bg-[#bef2641a] text-[#bef264] border-[#bef26433]'
                        : rec.status === 'Completed'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    }`}
                  >
                    {rec.status}
                  </span>
                  {rec.automatedNotificationSent && (
                    <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" /> SMS &amp; Email Sent
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#bef264]" />
                  <span>{rec.address}</span>
                  <span className="font-mono text-gray-500">({rec.phone})</span>
                </p>

                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 pt-1">
                  <span>Installation Date: <strong className="text-gray-200">{rec.installationDate}</strong></span>
                  <span>&bull;</span>
                  <span>
                    2-Year Due Date:{' '}
                    <strong className={isOverdue ? 'text-rose-400 font-bold' : 'text-gray-200'}>
                      {rec.dueDate}
                    </strong>
                  </span>
                  <span>&bull;</span>
                  <span>Assigned Tech: <strong className="text-gray-200">{rec.assignedTechnician}</strong></span>
                </div>

                {rec.notes && (
                  <p className="text-[11px] text-gray-400 italic mt-1 bg-[#121212] p-2 rounded-lg border border-[#262626]">
                    "{rec.notes}"
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => handleNotifyCustomer(rec.id, rec.customerName)}
                  className="px-3 py-1.5 rounded-lg bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  title="Send automated booking reminder"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Notification</span>
                </button>

                <select
                  value={rec.status}
                  onChange={e => updateMaintenanceStatus(rec.id, e.target.value as any)}
                  className="text-xs font-bold bg-[#121212] border border-[#262626] rounded-lg px-2.5 py-1.5 text-white shadow-xs focus:border-[#bef264] outline-none"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Due Soon">Due Soon</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Completed">Completed</option>
                </select>

                <button
                  onClick={() => setIsVoipDialerOpen(true)}
                  className="p-2 rounded-lg bg-[#262626] hover:bg-[#333] text-emerald-400 border border-[#333] transition-colors"
                  title="Call via VoIPLine"
                >
                  <Phone className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setIsQuickSmsOpen(true)}
                  className="p-2 rounded-lg bg-[#262626] hover:bg-[#333] text-[#bef264] border border-[#333] transition-colors"
                  title="SMS via MessageMedia"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
