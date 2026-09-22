import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  UserCheck,
  Shield,
  Briefcase,
  User,
  Plus,
  Search,
  Calendar,
  Clock,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Lock,
  Globe,
  Award
} from 'lucide-react';
import { UserProfile, UserRole } from '../../types';

export const HRMSView: React.FC = () => {
  const {
    availableUsers,
    activeRole,
    connectedDomain,
    setConnectedDomain,
    leaveRequests = [],
    updateLeaveStatus,
    addLeaveRequest
  } = useApp();

  const [activeTab, setActiveTab] = useState<'employees' | 'leave' | 'permissions'>('employees');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isNewLeaveModalOpen, setIsNewLeaveModalOpen] = useState(false);

  // New leave form
  const [leaveEmployeeId, setLeaveEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState<any>('Annual Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [days, setDays] = useState<number>(1);
  const [reason, setReason] = useState('');

  const filteredUsers = availableUsers.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleCreateLeave = (e: React.FormEvent) => {
    e.preventDefault();
    const employee = availableUsers.find(u => u.id === leaveEmployeeId);
    if (!employee || !startDate || !endDate) return;

    addLeaveRequest({
      employeeId: employee.id,
      employeeName: employee.name,
      leaveType,
      startDate,
      endDate,
      days,
      reason,
      status: 'Pending'
    });

    setIsNewLeaveModalOpen(false);
    setReason('');
  };

  return (
    <div className="flex-1 bg-[#0a0a0a] overflow-y-auto p-4 sm:p-6 space-y-6 text-[#e5e7eb]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Solar Enterprise HRMS &amp; Staff Directory
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Access Control &amp; RBAC
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Role-based employee directory, VoIPLine telephone assignments, leave approval, and domain security
          </p>
        </div>

        {/* Connected Domain whitelist display */}
        <div className="flex items-center gap-2 p-2 px-3 bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] text-xs shadow-xs">
          <Globe className="w-4 h-4 text-[#bef264]" />
          <span className="text-gray-400 font-medium">Domain Whitelist:</span>
          <span className="font-mono font-bold text-white">@{connectedDomain}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#262626] gap-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('employees')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'employees'
              ? 'border-[#bef264] text-[#bef264]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Staff Directory ({availableUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('leave')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'leave'
              ? 'border-[#bef264] text-[#bef264]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Leave &amp; Attendance ({(leaveRequests || []).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('permissions')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'permissions'
              ? 'border-[#bef264] text-[#bef264]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Role-Based Access Control (RBAC) Matrix</span>
        </button>
      </div>

      {/* TAB 1: Staff Directory */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="bg-[#1e1e1e] p-4 rounded-xl border border-[#2d2d2d] shadow-xs flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search staff by name, email, department..."
                className="w-full text-xs pl-9 pr-4 py-2 rounded-lg bg-[#121212] border border-[#262626] text-white placeholder:text-gray-500 outline-none focus:border-[#bef264]"
              />
            </div>

            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="text-xs font-semibold bg-[#121212] border border-[#262626] text-white rounded-lg px-3 py-2 outline-none w-full sm:w-auto focus:border-[#bef264]"
            >
              <option value="all">All Roles</option>
              <option value="admin">Administrators</option>
              <option value="manager">Operations &amp; Sales Managers</option>
              <option value="employee">Sales &amp; Field Employees</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map(user => (
              <div
                key={user.id}
                className="bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] shadow-xs p-5 space-y-3 hover:border-[#bef264]/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-white">{user.name}</h3>
                    <p className="text-xs text-gray-400">{user.department}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize border ${
                      user.role === 'admin'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : user.role === 'manager'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-gray-300 bg-[#161616] p-3 rounded-lg border border-[#262626]">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#bef264] shrink-0" />
                    <span className="font-mono font-semibold text-gray-200">
                      VoIP Line: {user.voipLineNumber || 'Unassigned'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#262626] flex items-center justify-between text-xs">
                  <span className="text-gray-400">Assigned Region:</span>
                  <span className="font-semibold text-gray-200">{user.state || 'NSW & QLD Metro'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Leave & Attendance */}
      {activeTab === 'leave' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-white">Staff Leave &amp; RDO Tracking</h3>
            <button
              onClick={() => setIsNewLeaveModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Apply for Leave</span>
            </button>
          </div>

          <div className="space-y-3">
            {(leaveRequests || []).map(req => (
              <div
                key={req.id}
                className="bg-[#1e1e1e] p-4 rounded-xl border border-[#2d2d2d] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{req.employeeName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-[#161616] text-gray-300 font-semibold border border-[#262626]">
                      {req.leaveType}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        req.status === 'Approved'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : req.status === 'Rejected'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                  <p className="text-gray-400 mt-1">
                    Dates: <strong className="text-gray-200">{req.startDate}</strong> to <strong className="text-gray-200">{req.endDate}</strong> ({req.days} Day
                    {req.days > 1 ? 's' : ''}) &bull; Reason: <em className="text-gray-300">"{req.reason}"</em>
                  </p>
                </div>

                {req.status === 'Pending' && (
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      onClick={() => updateLeaveStatus(req.id, 'Approved')}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1 shadow-xs transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => updateLeaveStatus(req.id, 'Rejected')}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg flex items-center gap-1 shadow-xs transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Permissions Matrix */}
      {activeTab === 'permissions' && (
        <div className="bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] shadow-xs p-5 space-y-4">
          <div className="border-b border-[#262626] pb-3">
            <h3 className="font-bold text-sm text-white">Enterprise Role-Based Access Control (RBAC)</h3>
            <p className="text-xs text-gray-400">
              Access rules enforced across Administrators, Managers, and Employees
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#161616] text-gray-400 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3">Module / Capability</th>
                  <th className="p-3 text-center">Administrator</th>
                  <th className="p-3 text-center">Operations Manager</th>
                  <th className="p-3 text-center">Sales &amp; Field Employee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                <tr className="hover:bg-[#262626]/40 transition-colors">
                  <td className="p-3 font-semibold text-gray-200">Lead Ingestion (Meta Ads / Sheets)</td>
                  <td className="p-3 text-center text-[#bef264] font-bold">Full Access</td>
                  <td className="p-3 text-center text-[#bef264] font-bold">Full Access</td>
                  <td className="p-3 text-center text-[#bef264] font-bold">Full Access</td>
                </tr>
                <tr className="hover:bg-[#262626]/40 transition-colors">
                  <td className="p-3 font-semibold text-gray-200">Project Creation &amp; Pipeline Progression</td>
                  <td className="p-3 text-center text-[#bef264] font-bold">Full Access</td>
                  <td className="p-3 text-center text-[#bef264] font-bold">Full Access</td>
                  <td className="p-3 text-center text-amber-400 font-bold">View &amp; Survey Only</td>
                </tr>
                <tr className="hover:bg-[#262626]/40 transition-colors">
                  <td className="p-3 font-semibold text-gray-200">BridgeSelect STC Rebate Claims &amp; CER Submission</td>
                  <td className="p-3 text-center text-[#bef264] font-bold">Full Access</td>
                  <td className="p-3 text-center text-[#bef264] font-bold">Full Access</td>
                  <td className="p-3 text-center text-gray-500">Restricted</td>
                </tr>
                <tr className="hover:bg-[#262626]/40 transition-colors">
                  <td className="p-3 font-semibold text-gray-200">Install Orders / Subcontractor Quote Awarding</td>
                  <td className="p-3 text-center text-[#bef264] font-bold">Full Access</td>
                  <td className="p-3 text-center text-[#bef264] font-bold">Full Access</td>
                  <td className="p-3 text-center text-gray-500">Restricted</td>
                </tr>
                <tr className="hover:bg-[#262626]/40 transition-colors">
                  <td className="p-3 font-semibold text-gray-200">P&amp;L Financial Statements &amp; Gross Margins</td>
                  <td className="p-3 text-center text-[#bef264] font-bold">Full Access</td>
                  <td className="p-3 text-center text-[#bef264] font-bold">View Only</td>
                  <td className="p-3 text-center text-gray-500">Restricted</td>
                </tr>
                <tr className="hover:bg-[#262626]/40 transition-colors">
                  <td className="p-3 font-semibold text-gray-200">HRMS &amp; Staff Leave Approvals</td>
                  <td className="p-3 text-center text-[#bef264] font-bold">Full Access</td>
                  <td className="p-3 text-center text-[#bef264] font-bold">Team Approvals</td>
                  <td className="p-3 text-center text-amber-400 font-bold">Self-Service Application</td>
                </tr>
                <tr className="hover:bg-[#262626]/40 transition-colors">
                  <td className="p-3 font-semibold text-gray-200">Dynamic Dropdown Management &amp; Integrations</td>
                  <td className="p-3 text-center text-[#bef264] font-bold">Full Access</td>
                  <td className="p-3 text-center text-gray-500">Restricted</td>
                  <td className="p-3 text-center text-gray-500">Restricted</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      {isNewLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#1e1e1e] rounded-xl shadow-2xl border border-[#2d2d2d] overflow-hidden text-[#e5e7eb]">
            <div className="p-4 bg-[#161616] text-white flex items-center justify-between border-b border-[#262626]">
              <h3 className="font-bold text-sm">Submit Leave Application</h3>
              <button onClick={() => setIsNewLeaveModalOpen(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateLeave} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Select Employee</label>
                <select
                  value={leaveEmployeeId}
                  onChange={e => setLeaveEmployeeId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white outline-none focus:border-[#bef264]"
                  required
                >
                  <option value="">-- Choose Employee --</option>
                  {availableUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={e => setLeaveType(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white outline-none focus:border-[#bef264]"
                >
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Sick & Carer Leave">Sick &amp; Carer Leave</option>
                  <option value="Rostered Day Off (RDO)">Rostered Day Off (RDO)</option>
                  <option value="Compassionate Leave">Compassionate Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white outline-none focus:border-[#bef264]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white outline-none focus:border-[#bef264]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Number of Days</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={days}
                  onChange={e => setDays(parseFloat(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white outline-none focus:border-[#bef264]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Reason / Notes</label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Family holiday in Gold Coast"
                  className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white placeholder:text-gray-500 outline-none focus:border-[#bef264]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewLeaveModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs text-gray-400 hover:bg-[#262626] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#bef264] hover:bg-[#a3e635] text-black rounded-lg text-xs font-bold transition-colors"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
