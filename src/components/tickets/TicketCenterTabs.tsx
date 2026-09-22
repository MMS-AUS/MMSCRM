import React, { useState } from 'react';
import { LeadActivity, LeadActivityType } from '../../types';
import {
  Activity,
  FileText,
  Mail,
  Phone,
  CheckSquare,
  Calendar,
  Sparkles,
  Plus,
  Clock,
  User,
  Trash2,
  CheckCircle2,
  DollarSign,
  Sun,
  Battery,
  Zap,
  MapPin,
  Building2,
  Send,
  Eye,
  Filter,
  ArrowRight,
  MessageSquare,
  ShieldCheck,
  Wrench,
  Truck
} from 'lucide-react';
import { TicketDetailsFormData } from './TicketDetailsLeftPanel';

interface TicketCenterTabsProps {
  formData: TicketDetailsFormData;
  activities: LeadActivity[];
  onAddActivity: (activity: Omit<LeadActivity, 'id' | 'createdAt'>) => void;
  onToggleTask: (activityId: string) => void;
  onDeleteActivity: (activityId: string) => void;
  isLight?: boolean;
}

export const TicketCenterTabs: React.FC<TicketCenterTabsProps> = ({
  formData,
  activities,
  onAddActivity,
  onToggleTask,
  onDeleteActivity,
  isLight = false
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'activities'>('overview');
  const [activityFilter, setActivityFilter] = useState<'All' | LeadActivityType>('All');

  // Activity logger state
  const [showLogger, setShowLogger] = useState(false);
  const [loggerType, setLoggerType] = useState<LeadActivityType>('Note');
  const [loggerTitle, setLoggerTitle] = useState('');
  const [loggerDescription, setLoggerDescription] = useState('');
  const [loggerCallOutcome, setLoggerCallOutcome] = useState('Connected');
  const [loggerCallDuration, setLoggerCallDuration] = useState('5m');
  const [loggerTaskDueDate, setLoggerTaskDueDate] = useState('');
  const [loggerTaskPriority, setLoggerTaskPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [loggerMeetingDate, setLoggerMeetingDate] = useState('');
  const [loggerMeetingLocation, setLoggerMeetingLocation] = useState('On-Site Diagnostic Visit');

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggerTitle.trim()) return;

    let fullDesc = loggerDescription.trim();
    if (loggerType === 'Call') {
      fullDesc = `Outcome: ${loggerCallOutcome} | Duration: ${loggerCallDuration}\n${fullDesc}`;
    } else if (loggerType === 'Meeting') {
      fullDesc = `Service Inspection: ${loggerMeetingDate} @ ${loggerMeetingLocation}\n${fullDesc}`;
    }

    onAddActivity({
      leadId: formData.ticketId || 'ticket-current',
      type: loggerType,
      title: loggerTitle.trim(),
      description: fullDesc,
      dueDate: loggerType === 'Task' ? loggerTaskDueDate : undefined,
      completed: false,
      createdBy: formData.serviceHandler || 'Service Technician'
    });

    // Reset logger
    setLoggerTitle('');
    setLoggerDescription('');
    setShowLogger(false);
  };

  const filteredActivities = activities.filter(act => {
    if (activityFilter === 'All') return true;
    return act.type === activityFilter;
  });

  const cardBg = isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800';
  const subCardBg = isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/60';

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Tabs Header */}
      <div className={`flex items-center justify-between border-b pb-2 shrink-0 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ticket Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('activities')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'activities'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Service Timeline &amp; Tasks</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'activities'
                ? 'bg-slate-950 text-amber-400'
                : isLight
                ? 'bg-slate-200 text-slate-700'
                : 'bg-slate-800 text-slate-300'
            }`}>
              {activities.length}
            </span>
          </button>
        </div>

        {activeTab === 'activities' && (
          <button
            type="button"
            onClick={() => setShowLogger(!showLogger)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Log Action</span>
          </button>
        )}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-4 overflow-y-auto pr-1">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className={`p-2.5 rounded-xl border ${subCardBg}`}>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Ticket Status</span>
              <span className="text-xs font-bold text-amber-400 mt-0.5 block truncate">
                {formData.issueResolutionStatus || 'Under Investigation'}
              </span>
            </div>
            <div className={`p-2.5 rounded-xl border ${subCardBg}`}>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Project Ref</span>
              <span className="text-xs font-bold text-white mt-0.5 block font-mono truncate">
                {formData.installationProjectNo || 'Unassigned'}
              </span>
            </div>
            <div className={`p-2.5 rounded-xl border ${subCardBg}`}>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Service Charge</span>
              <span className="text-xs font-bold text-emerald-400 mt-0.5 block font-mono">
                {formData.serviceCharge || '$0.00'}
              </span>
            </div>
            <div className={`p-2.5 rounded-xl border ${subCardBg}`}>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Payable</span>
              <span className="text-xs font-bold text-emerald-400 mt-0.5 block font-mono">
                {formData.totalServiceIssueAmount || '$0.00'}
              </span>
            </div>
          </div>

          {/* Issue & Resolution Summary */}
          <div className={`p-3.5 rounded-xl border ${cardBg}`}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5 mb-2">
              <Wrench className="w-3.5 h-3.5" />
              Recorded Fault &amp; Diagnostic Finding
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-start justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Primary Fault:</span>
                <span className="font-semibold text-white text-right max-w-[260px]">
                  {formData.issueRecorded || 'No fault categorized yet'}
                </span>
              </div>
              <div className="flex items-start justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Initial Check:</span>
                <span className="font-semibold text-slate-200 text-right max-w-[260px]">
                  {formData.initialCheck || 'Remote telemetry pending'}
                </span>
              </div>
              <div className="flex items-start justify-between py-1">
                <span className="text-slate-400">Work Required:</span>
                <span className="font-semibold text-amber-400 text-right max-w-[260px]">
                  {formData.workRequired || 'Pending technician diagnostic'}
                </span>
              </div>
            </div>
          </div>

          {/* Existing Equipment vs Replaced Equipment Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`p-3.5 rounded-xl border ${cardBg}`}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-2">
                <Sun className="w-3.5 h-3.5" />
                Original System Hardware
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Inverter:</span>
                  <p className="font-semibold text-white">
                    {formData.existingInverterBrand || 'Standard Solar'} • {formData.existingInverterModel || 'Inverter'} ({formData.existingInverterSize || '5kW'})
                  </p>
                  {formData.existingInverterSerialNumber && (
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                      S/N: {formData.existingInverterSerialNumber}
                    </p>
                  )}
                </div>
                <div className="pt-1 border-t border-slate-800/40">
                  <span className="text-[10px] text-slate-400 block">Solar Panels:</span>
                  <p className="font-semibold text-white">
                    {formData.noOfExistingPanels ? `${formData.noOfExistingPanels}x ` : ''}
                    {formData.existingPanelBrand || 'CEC Approved'} • {formData.existingPanelModel || 'Mono'} ({formData.existingPanelSize || '440W'})
                  </p>
                  {formData.affectedPanelSerialNumber && (
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                      Affected Serials: {formData.affectedPanelSerialNumber}
                    </p>
                  )}
                </div>
                {formData.existingBatteryBrand && (
                  <div className="pt-1 border-t border-slate-800/40">
                    <span className="text-[10px] text-slate-400 block">Battery Storage:</span>
                    <p className="font-semibold text-white">
                      {formData.existingBatteryBrand} • {formData.existingBatteryModel} ({formData.existingBatterySize})
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border ${cardBg}`}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Replaced Hardware
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Replacement Inverter:</span>
                  <p className="font-semibold text-white">
                    {formData.replacedInverterBrand
                      ? `${formData.noOfReplacedInverters || '1'}x ${formData.replacedInverterBrand} ${formData.replacedInverterModel || ''} (${formData.replacedInverterSize || ''})`
                      : 'None replaced under this service'}
                  </p>
                  {formData.replacedInverterSerialNumber && (
                    <p className="text-[10px] font-mono text-emerald-400 mt-0.5">
                      New S/N: {formData.replacedInverterSerialNumber}
                    </p>
                  )}
                </div>
                <div className="pt-1 border-t border-slate-800/40">
                  <span className="text-[10px] text-slate-400 block">Replacement Panels:</span>
                  <p className="font-semibold text-white">
                    {formData.replacedPanelBrand
                      ? `${formData.noOfReplacedPanels || '1'}x ${formData.replacedPanelBrand} ${formData.replacedPanelModel || ''} (${formData.replacedPanelSize || ''})`
                      : 'No panels replaced'}
                  </p>
                  {formData.replacedPanelSerialNumber && (
                    <p className="text-[10px] font-mono text-emerald-400 mt-0.5">
                      New Serials: {formData.replacedPanelSerialNumber}
                    </p>
                  )}
                </div>
                {formData.replacedBatteryBrand && (
                  <div className="pt-1 border-t border-slate-800/40">
                    <span className="text-[10px] text-slate-400 block">Replacement Battery:</span>
                    <p className="font-semibold text-white">
                      {formData.replacedBatteryBrand} {formData.replacedBatteryModel}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Warranty & Field Subcontractor Snapshot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`p-3.5 rounded-xl border ${cardBg}`}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5 mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                Warranty Status
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Claim ID:</span>
                  <span className="font-mono text-white font-semibold">{formData.warrantyClaimId || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Claim Status:</span>
                  <span className="font-semibold text-purple-300">{formData.warrantyClaimStatus || 'Draft Claim'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Invoice Status:</span>
                  <span className="font-semibold text-emerald-400">{formData.warrantyClaimInvoiceStatus || 'Pending Claim Review'}</span>
                </div>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border ${cardBg}`}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 mb-2">
                <Truck className="w-3.5 h-3.5" />
                Electrician / Sub-contractor
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Name:</span>
                  <span className="font-semibold text-white">{formData.installerOrElectricianName || 'In-House Service Team'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Company:</span>
                  <span className="text-slate-300">{formData.companyName || 'AusSolar Operations'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sub Invoice:</span>
                  <span className="font-mono font-semibold text-emerald-400">
                    {formData.installerInvoiceAmount || '$0.00'} ({formData.installerInvoiceStatus || 'Pending'})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVITIES & TIMELINE */}
      {activeTab === 'activities' && (
        <div className="flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden">
          {/* Quick Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 shrink-0 pb-1">
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-slate-400 flex items-center gap-1 font-semibold mr-1">
                <Filter className="w-3 h-3" /> Filter:
              </span>
              {(['All', 'Call', 'Email', 'Task', 'Meeting', 'Note'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActivityFilter(type)}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                    activityFilter === type
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : isLight
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Activity Logger Form Drawer */}
          {showLogger && (
            <form onSubmit={handleCreateActivity} className={`p-3 rounded-xl border space-y-2.5 shrink-0 ${cardBg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log New Service Activity</span>
                </div>
                <div className="flex items-center gap-1">
                  {(['Note', 'Call', 'Task', 'Meeting', 'Email'] as LeadActivityType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setLoggerType(t)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                        loggerType === t
                          ? 'bg-amber-500 text-slate-950'
                          : isLight
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="text"
                required
                value={loggerTitle}
                onChange={e => setLoggerTitle(e.target.value)}
                placeholder={`Activity summary e.g. Customer call re: Inverter error code 402...`}
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs outline-none ${
                  isLight
                    ? 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400'
                    : 'bg-slate-900 border border-slate-700 text-white placeholder-slate-500'
                }`}
              />

              <textarea
                rows={2}
                value={loggerDescription}
                onChange={e => setLoggerDescription(e.target.value)}
                placeholder="Detailed service notes, technician findings, customer feedback..."
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs outline-none ${
                  isLight
                    ? 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400'
                    : 'bg-slate-900 border border-slate-700 text-white placeholder-slate-500'
                }`}
              />

              {loggerType === 'Task' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Due Date</label>
                    <input
                      type="date"
                      value={loggerTaskDueDate}
                      onChange={e => setLoggerTaskDueDate(e.target.value)}
                      className={`w-full px-2 py-1 rounded text-xs ${
                        isLight ? 'bg-white border border-slate-300' : 'bg-slate-900 border border-slate-700 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Priority</label>
                    <select
                      value={loggerTaskPriority}
                      onChange={e => setLoggerTaskPriority(e.target.value as any)}
                      className={`w-full px-2 py-1 rounded text-xs ${
                        isLight ? 'bg-white border border-slate-300' : 'bg-slate-900 border border-slate-700 text-white'
                      }`}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High (Urgent)</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowLogger(false)}
                  className={`px-3 py-1 rounded-lg text-xs ${isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs"
                >
                  Save Activity
                </button>
              </div>
            </form>
          )}

          {/* Activities List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
                <Activity className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-semibold">No service activities logged yet</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Click "Log Action" above to record calls, customer notes, or schedule diagnostic tasks.
                </p>
              </div>
            ) : (
              filteredActivities.map(act => (
                <div
                  key={act.id}
                  className={`p-3 rounded-xl border transition-all ${cardBg} hover:border-amber-500/40`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        act.type === 'Task'
                          ? 'bg-purple-500/15 text-purple-400'
                          : act.type === 'Call'
                          ? 'bg-blue-500/15 text-blue-400'
                          : act.type === 'Meeting'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-amber-500/15 text-amber-400'
                      }`}>
                        {act.type === 'Task' ? (
                          <CheckSquare className="w-3.5 h-3.5" />
                        ) : act.type === 'Call' ? (
                          <Phone className="w-3.5 h-3.5" />
                        ) : act.type === 'Meeting' ? (
                          <Calendar className="w-3.5 h-3.5" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-xs text-white leading-tight">
                            {act.title}
                          </h5>
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider bg-slate-800 text-slate-300">
                            {act.type}
                          </span>
                          {act.dueDate && (
                            <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded">
                              Due: {act.dueDate}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 mt-1 whitespace-pre-line leading-relaxed">
                          {act.description}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1.5">
                          <span>{new Date(act.createdAt).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          <span>•</span>
                          <span>By: {act.createdBy || 'Staff'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {act.type === 'Task' && (
                        <button
                          type="button"
                          onClick={() => onToggleTask(act.id)}
                          className={`p-1 rounded transition-colors ${
                            act.completed
                              ? 'text-emerald-400 hover:text-emerald-300'
                              : 'text-slate-500 hover:text-emerald-400'
                          }`}
                          title={act.completed ? 'Mark incomplete' : 'Mark complete'}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteActivity(act.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                        title="Delete log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
