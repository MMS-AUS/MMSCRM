import React, { useState } from 'react';
import { Lead, LeadActivity, LeadActivityType } from '../../types';
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
  FileAudio,
  ExternalLink
} from 'lucide-react';
import { formatAudAccounts, parseAudAccounts } from '../../utils/australianPostcodes';
import { formatCustomFieldName } from '../../utils/metaLeadMapper';

interface LeadCenterTabsProps {
  lead?: Lead | null;
  formData: any;
  activities: LeadActivity[];
  onAddActivity: (activity: Omit<LeadActivity, 'id' | 'createdAt'>) => void;
  onToggleTask: (activityId: string) => void;
  onDeleteActivity: (activityId: string) => void;
}

export const LeadCenterTabs: React.FC<LeadCenterTabsProps> = ({
  lead,
  formData,
  activities,
  onAddActivity,
  onToggleTask,
  onDeleteActivity
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
  const [loggerMeetingLocation, setLoggerMeetingLocation] = useState('On-Site Assessment');
  const [quickNoteText, setQuickNoteText] = useState('');

  // Financial calculations
  const parsedSelling = parseAudAccounts(formData.sellingPrice);
  const parsedDeposit = parseAudAccounts(formData.deposit);
  const balanceDue = Math.max(0, parsedSelling - parsedDeposit);
  const estStcRebate = Math.round((Number(formData.systemSizeKw) || 10.4) * 380);

  // Filter activities
  const filteredActivities = activities.filter(a => {
    if (activityFilter === 'All') return true;
    return a.type === activityFilter;
  });

  const handleSaveActivity = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loggerDescription.trim() && !loggerTitle.trim()) return;

    let finalTitle = loggerTitle.trim();
    if (!finalTitle) {
      if (loggerType === 'Call') finalTitle = `Phone Call (${loggerCallOutcome})`;
      else if (loggerType === 'Meeting') finalTitle = `Site Meeting: ${loggerMeetingLocation}`;
      else if (loggerType === 'Task') finalTitle = `Task: ${loggerDescription.slice(0, 30)}...`;
      else if (loggerType === 'Email') finalTitle = 'Customer Email Sent';
      else finalTitle = 'Sales Team Note';
    }

    onAddActivity({
      leadId: lead?.id || 'lead-current',
      type: loggerType,
      title: finalTitle,
      description: loggerDescription.trim(),
      createdBy: formData.salesPersonName || 'Mitchell Barnes',
      callOutcome: loggerType === 'Call' ? loggerCallOutcome : undefined,
      callDuration: loggerType === 'Call' ? loggerCallDuration : undefined,
      dueDate: loggerType === 'Task' ? loggerTaskDueDate : undefined,
      completed: loggerType === 'Task' ? false : undefined,
      priority: loggerType === 'Task' ? loggerTaskPriority : undefined,
      meetingDate: loggerType === 'Meeting' ? loggerMeetingDate : undefined,
      meetingLocation: loggerType === 'Meeting' ? loggerMeetingLocation : undefined
    });

    // Reset logger
    setLoggerTitle('');
    setLoggerDescription('');
    setShowLogger(false);
  };

  const handleQuickNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNoteText.trim()) return;

    onAddActivity({
      leadId: lead?.id || 'lead-current',
      type: 'Note',
      title: 'Quick Activity Note',
      description: quickNoteText.trim(),
      createdBy: formData.salesPersonName || 'Mitchell Barnes'
    });

    setQuickNoteText('');
  };

  const getActivityIcon = (type: LeadActivityType) => {
    switch (type) {
      case 'Note':
        return <FileText className="w-3.5 h-3.5 text-blue-400" />;
      case 'Email':
        return <Mail className="w-3.5 h-3.5 text-amber-400" />;
      case 'Call':
        return <Phone className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Task':
        return <CheckSquare className="w-3.5 h-3.5 text-purple-400" />;
      case 'Meeting':
        return <Calendar className="w-3.5 h-3.5 text-rose-400" />;
      case 'Status Change':
        return <Sparkles className="w-3.5 h-3.5 text-[#bef264]" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Tabs Controller */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-3 shrink-0">
        <div className="flex items-center gap-1.5 p-1 bg-[#141414] rounded-xl border border-[#2e2e2e]">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'overview'
                ? 'bg-[#282828] text-white shadow-sm border border-[#3e3e3e]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-[#bef264]" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('activities')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'activities'
                ? 'bg-[#282828] text-white shadow-sm border border-[#3e3e3e]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-[#bef264]" />
            <span>Activities</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#1b1b1b] text-[#bef264] border border-[#bef26430]">
              {activities.length}
            </span>
          </button>
        </div>

        {/* Quick actions in tab header */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('activities');
              setLoggerType('Note');
              setShowLogger(true);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] text-[11px] font-medium text-gray-300 hover:text-white flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3 h-3 text-[#bef264]" />
            <span>Log Note</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('activities');
              setLoggerType('Call');
              setShowLogger(true);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] text-[11px] font-medium text-gray-300 hover:text-white flex items-center gap-1 transition-colors"
          >
            <Phone className="w-3 h-3 text-emerald-400" />
            <span>Log Call</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-5 overflow-y-auto pr-1">
          {/* 1. DATA HIGHLIGHTS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#bef264]" />
                Data Highlights &amp; Metrics
              </h3>
              <span className="text-[11px] font-mono text-[#bef264] bg-[#bef26410] px-2 py-0.5 rounded border border-[#bef26425]">
                Stage: {formData.status}
              </span>
            </div>

            {/* Metric Bento Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Financial Highlights */}
              <div className="p-4 bg-[#141414] border border-[#2a2a2a] rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-[#222] pb-2">
                  <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    Financial Highlights
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">AUD Accounts</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase">Selling Price</span>
                    <span className="text-sm font-bold text-white font-mono">
                      ${formData.sellingPrice || '0'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase">Deposit Paid</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      ${formData.deposit || '0'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase">Balance Due</span>
                    <span className="text-sm font-bold text-amber-400 font-mono">
                      ${formatAudAccounts(balanceDue)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase">Est. STC Rebate</span>
                    <span className="text-sm font-bold text-cyan-400 font-mono">
                      ~${formatAudAccounts(estStcRebate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hardware & System Specs */}
              <div className="p-4 bg-[#141414] border border-[#2a2a2a] rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-[#222] pb-2">
                  <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    Hardware Specs (Section 4B)
                  </span>
                  <span className="text-[10px] font-bold font-mono text-[#bef264] px-1.5 py-0.5 rounded bg-[#bef26415] border border-[#bef26430]">
                    {formData.systemSizeKw} kW
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Panels:</span>
                    <span className="text-gray-200 font-medium truncate max-w-[180px]">
                      {formData.noOfPanels}x {formData.panelManufacturer} {formData.panelSizeW}W
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Inverter:</span>
                    <span className="text-gray-200 font-medium truncate max-w-[180px]">
                      {formData.noOfInverters}x {formData.inverterManufacturer} ({formData.inverterSizeKw}kW)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Battery:</span>
                    <span className="text-gray-200 font-medium truncate max-w-[180px]">
                      {formData.batteryRequired
                        ? `${formData.noOfBatteries}x ${formData.batteryManufacturer} (${formData.batteryUsableCapacityKwh}kWh)`
                        : 'No Battery Included'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Site Specs:</span>
                    <span className="text-gray-300 font-medium">
                      {formData.houseStorey}, {formData.phase}
                    </span>
                  </div>
                </div>
              </div>

              {/* Location & DNSP Grid */}
              <div className="p-4 bg-[#141414] border border-[#2a2a2a] rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-[#222] pb-2">
                  <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    Property &amp; Grid
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">
                    {formData.area} Area
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Address:</span>
                    <span className="text-gray-200 font-medium truncate max-w-[190px]">
                      {formData.address || 'Address pending'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Suburb &amp; State:</span>
                    <span className="text-gray-200 font-medium">
                      {formData.suburb} {formData.state} {formData.postcode}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Nearest Big City:</span>
                    <span className="text-gray-200 font-medium">
                      {formData.nearestBigCity || 'Sydney'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Roof Type:</span>
                    <span className="text-gray-300 font-medium">
                      {formData.roofType}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pipeline & Associations */}
              <div className="p-4 bg-[#141414] border border-[#2a2a2a] rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-[#222] pb-2">
                  <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    CRM Associations
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">
                    {formData.platform}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Contact:</span>
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Auto-Created &amp; Attached
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Company:</span>
                    <span className={`font-medium ${formData.hasCompany ? 'text-emerald-400' : 'text-gray-500'}`}>
                      {formData.hasCompany ? formData.companyName || 'Associated' : 'None (Residential)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Lead Owner:</span>
                    <span className="text-gray-200 font-medium">
                      {formData.salesPersonName || 'Mitchell Barnes'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Lead Date:</span>
                    <span className="text-gray-200 font-mono">
                      {formData.leadDate || 'Today'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Meta Instant Form Custom Fields / Form Responses */}
            {((formData.custom_fields && Object.keys(formData.custom_fields).length > 0) ||
              (lead?.custom_fields && Object.keys(lead.custom_fields).length > 0) ||
              formData.meta_leadgen_id ||
              formData.fbclid) && (
              <div className="p-4 bg-[#141414] border border-[#2a2a2a] rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-[#222] pb-2">
                  <span className="text-xs font-semibold text-white flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#1877F2]/20 text-[#1877F2] border border-[#1877F2]/40">
                      META ADS
                    </span>
                    <span>Form Responses &amp; Custom Questions</span>
                  </span>
                  {formData.meta_leadgen_id && (
                    <span className="text-[10px] font-mono text-gray-400">
                      ID: {formData.meta_leadgen_id}
                    </span>
                  )}
                </div>

                {/* Render Custom Question Responses */}
                {(() => {
                  const fields = formData.custom_fields || lead?.custom_fields || {};
                  const entries = Object.entries(fields);
                  if (entries.length === 0) {
                    return (
                      <p className="text-xs text-gray-400 italic">
                        Standard lead form fields captured. No additional custom questionnaire items submitted.
                      </p>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {entries.map(([key, val]) => (
                        <div
                          key={key}
                          className="p-2.5 rounded-lg bg-[#1a1a1a] border border-[#262626] space-y-1"
                        >
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                            {formatCustomFieldName(key)}
                          </span>
                          <span className="text-xs font-medium text-white block break-words">
                            {String(val || '—')}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Ad & Click Tracking Information */}
                {(formData.fbclid || formData.fbp) && (
                  <div className="pt-2 border-t border-[#222] flex flex-wrap items-center gap-4 text-[10px] text-gray-400 font-mono">
                    {formData.fbclid && (
                      <div>
                        <span className="text-gray-500">fbclid: </span>
                        <span className="text-gray-300 truncate max-w-[200px] inline-block align-bottom">{formData.fbclid}</span>
                      </div>
                    )}
                    {formData.fbp && (
                      <div>
                        <span className="text-gray-500">fbp: </span>
                        <span className="text-gray-300">{formData.fbp}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. RECENT ACTIVITIES STREAM */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#bef264]" />
                Recent Activities
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('activities')}
                className="text-[11px] text-[#bef264] hover:underline flex items-center gap-1 font-medium"
              >
                <span>View all ({activities.length})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Inline Quick Note */}
            <form onSubmit={handleQuickNoteSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Write a quick update or note for this lead..."
                value={quickNoteText}
                onChange={e => setQuickNoteText(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#141414] border border-[#2e2e2e] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!quickNoteText.trim()}
                className="px-3.5 py-2 bg-[#bef264] disabled:opacity-40 hover:bg-[#a3e635] text-black font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 shrink-0"
              >
                <Send className="w-3 h-3" />
                <span>Add Note</span>
              </button>
            </form>

            {/* List of Recent 4 Activities */}
            <div className="space-y-2">
              {activities.slice(0, 4).map(act => (
                <div
                  key={act.id}
                  className="p-3 bg-[#141414] border border-[#262626] rounded-xl flex items-start gap-3 text-xs"
                >
                  <div className="p-2 rounded-lg bg-[#202020] border border-[#333] shrink-0 mt-0.5">
                    {getActivityIcon(act.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white truncate">{act.title}</span>
                      <span className="text-[10px] text-gray-500 font-mono shrink-0">
                        {act.createdAt ? new Date(act.createdAt).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                    <p className="text-gray-300 mt-1 line-clamp-2 leading-relaxed">
                      {act.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-2.5 h-2.5" />
                        {act.createdBy || 'Team'}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-gray-400">{act.type}</span>
                    </div>
                  </div>
                </div>
              ))}

              {activities.length === 0 && (
                <div className="p-6 bg-[#141414] border border-[#262626] rounded-xl text-center text-xs text-gray-500">
                  No recent activities recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ACTIVITIES */}
      {activeTab === 'activities' && (
        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Subtabs Filter & Mode Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
            {/* Filter pills */}
            <div className="flex flex-wrap items-center gap-1 bg-[#141414] p-1 rounded-xl border border-[#262626]">
              {(['All', 'Note', 'Email', 'Call', 'Task', 'Meeting'] as const).map(tabKey => (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setActivityFilter(tabKey as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    activityFilter === tabKey
                      ? 'bg-[#2a2a2a] text-white border border-[#3a3a3a]'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {tabKey === 'All' ? 'All Activities' : `${tabKey}s`}
                </button>
              ))}
            </div>

            {/* Trigger logger button */}
            <button
              type="button"
              onClick={() => setShowLogger(prev => !prev)}
              className="px-3 py-1.5 bg-[#bef264] hover:bg-[#a3e635] text-black font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showLogger ? 'Cancel Logging' : '+ Log Activity'}</span>
            </button>
          </div>

          {/* Interactive Activity Logger Form */}
          {showLogger && (
            <div className="p-4 bg-[#161616] border border-[#383838] rounded-xl space-y-3.5 shadow-lg animate-fadeIn">
              <div className="flex items-center justify-between border-b border-[#282828] pb-2.5">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#bef264]" />
                  Log New Activity
                </span>
                {/* Type selector */}
                <div className="flex items-center gap-1 bg-[#111] p-0.5 rounded-lg border border-[#2e2e2e]">
                  {(['Note', 'Call', 'Email', 'Task', 'Meeting'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setLoggerType(m)}
                      className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                        loggerType === m
                          ? 'bg-[#2a2a2a] text-white'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Logger Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Activity Title / Subject
                  </label>
                  <input
                    type="text"
                    placeholder={`e.g. ${
                      loggerType === 'Call'
                        ? 'Follow-up call on inverter sizing'
                        : loggerType === 'Email'
                        ? 'Proposal email sent to customer'
                        : loggerType === 'Task'
                        ? 'Submit DNSP grid application'
                        : loggerType === 'Meeting'
                        ? 'Site survey with lead installer'
                        : 'Customer requested 13.2kW revision'
                    }`}
                    value={loggerTitle}
                    onChange={e => setLoggerTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-[#111] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none"
                  />
                </div>

                {/* Mode specific fields */}
                {loggerType === 'Call' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Call Outcome
                      </label>
                      <select
                        value={loggerCallOutcome}
                        onChange={e => setLoggerCallOutcome(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#111] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none"
                      >
                        <option value="Connected">Connected (Spoke with customer)</option>
                        <option value="Left Voicemail">Left Voicemail</option>
                        <option value="No Answer">No Answer</option>
                        <option value="Busy">Busy</option>
                        <option value="Wrong Number">Wrong Number</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Duration
                      </label>
                      <select
                        value={loggerCallDuration}
                        onChange={e => setLoggerCallDuration(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#111] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none"
                      >
                        <option value="2m">2 minutes</option>
                        <option value="5m">5 minutes</option>
                        <option value="15m">15 minutes</option>
                        <option value="30m">30 minutes</option>
                        <option value="45m">45 minutes</option>
                      </select>
                    </div>
                  </div>
                )}

                {loggerType === 'Task' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Task Due Date
                      </label>
                      <input
                        type="date"
                        value={loggerTaskDueDate}
                        onChange={e => setLoggerTaskDueDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#111] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Priority
                      </label>
                      <select
                        value={loggerTaskPriority}
                        onChange={e => setLoggerTaskPriority(e.target.value as any)}
                        className="w-full px-3 py-1.5 bg-[#111] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none"
                      >
                        <option value="Low">Low Priority</option>
                        <option value="Medium">Medium Priority</option>
                        <option value="High">High / Urgent</option>
                      </select>
                    </div>
                  </div>
                )}

                {loggerType === 'Meeting' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Meeting Date &amp; Time
                      </label>
                      <input
                        type="datetime-local"
                        value={loggerMeetingDate}
                        onChange={e => setLoggerMeetingDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#111] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Location / Channel
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Customer Home / Zoom Call"
                        value={loggerMeetingLocation}
                        onChange={e => setLoggerMeetingLocation(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#111] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Details &amp; Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter discussion details, customer preferences, next steps, action items..."
                    value={loggerDescription}
                    onChange={e => setLoggerDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-[#111] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowLogger(false)}
                    className="px-3 py-1.5 rounded-lg border border-[#333] text-gray-400 hover:text-white text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveActivity()}
                    disabled={!loggerDescription.trim() && !loggerTitle.trim()}
                    className="px-4 py-1.5 rounded-lg bg-[#bef264] disabled:opacity-40 hover:bg-[#a3e635] text-black font-semibold text-xs"
                  >
                    Save Activity
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Activities Timeline Feed */}
          <div className="space-y-3">
            {filteredActivities.map(act => (
              <div
                key={act.id}
                className="p-3.5 bg-[#141414] border border-[#262626] rounded-xl space-y-2 hover:border-[#383838] transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-[#202020] border border-[#333] shrink-0">
                      {getActivityIcon(act.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-xs">{act.title}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#222] text-gray-300 border border-[#333]">
                          {act.type}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <span>{act.createdBy || 'Team Member'}</span>
                        <span>•</span>
                        <span>
                          {act.createdAt
                            ? new Date(act.createdAt).toLocaleString('en-AU', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              })
                            : 'Logged'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Activity Actions */}
                  <div className="flex items-center gap-2">
                    {act.type === 'Task' && (
                      <button
                        type="button"
                        onClick={() => onToggleTask(act.id)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors border ${
                          act.completed
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-[#222] text-gray-300 border-[#444] hover:border-gray-300'
                        }`}
                      >
                        <CheckSquare className="w-3 h-3" />
                        <span>{act.completed ? 'Completed' : 'Mark Done'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteActivity(act.id)}
                      className="p-1 rounded text-gray-500 hover:text-rose-400 transition-colors"
                      title="Delete activity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Description / Content */}
                <p className="text-xs text-gray-300 pl-10 whitespace-pre-wrap leading-relaxed">
                  {act.description}
                </p>

                {/* HTML5 Audio Player for Recorded Calls */}
                {act.recordingUrl && (
                  <div className="ml-10 p-3 bg-[#0d0d0d] border border-cyan-500/30 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-cyan-400">
                      <span className="flex items-center gap-1.5">
                        <FileAudio className="w-3.5 h-3.5 text-cyan-400" />
                        VoIPLine Call Recording Audio
                      </span>
                      <a
                        href={act.recordingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        <span>Open Audio</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <audio
                      controls
                      src={act.recordingUrl}
                      className="w-full h-8 mt-1 rounded bg-[#1f1f1f]"
                    />
                  </div>
                )}

                {/* Meta details (Call outcome, Due date, Meeting location) */}
                <div className="pl-10 flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                  {act.callOutcome && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Outcome: {act.callOutcome}
                    </span>
                  )}
                  {act.callDuration && (
                    <span className="px-2 py-0.5 rounded bg-[#202020] text-gray-400 border border-[#333]">
                      Duration: {act.callDuration}
                    </span>
                  )}
                  {act.dueDate && (
                    <span className="px-2 py-0.5 rounded bg-purple-950/40 text-purple-300 border border-purple-800/30 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> Due: {act.dueDate}
                    </span>
                  )}
                  {act.meetingLocation && (
                    <span className="px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-800/30 flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5" /> {act.meetingLocation}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {filteredActivities.length === 0 && (
              <div className="p-8 bg-[#141414] border border-[#262626] rounded-xl text-center space-y-2">
                <Activity className="w-8 h-8 text-gray-600 mx-auto" />
                <p className="text-xs text-gray-400">
                  No activities found for filter &quot;{activityFilter}&quot;.
                </p>
                <button
                  type="button"
                  onClick={() => setShowLogger(true)}
                  className="px-3 py-1.5 bg-[#222] hover:bg-[#2c2c2c] border border-[#333] text-xs text-white rounded-lg inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 text-[#bef264]" />
                  <span>Log an Activity</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
