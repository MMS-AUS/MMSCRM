import React, { useState } from 'react';
import { Project, LeadActivity, LeadActivityType } from '../../types';
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
  Trash2,
  CheckCircle2,
  DollarSign,
  Sun,
  Eye,
  ArrowRight,
  ExternalLink,
  Wrench,
  Truck,
  ShieldCheck,
  Send,
  Zap,
  Building2,
  Layers,
  Check,
  CheckCheck,
  AlertTriangle,
  PhoneCall,
  FileAudio,
  RefreshCw
} from 'lucide-react';
import { formatAudAccounts, parseAudAccounts } from '../../utils/australianPostcodes';
import { ProjectFormData } from './ProjectDetailsLeftPanel';
import { fetchSmsLogs, SmsLogEntry } from '../../services/messageMediaService';
import { fetchCallLogs, originateCall } from '../../services/voiplineService';
import { VoIPLineCallLog, ProjectDocument } from '../../types';
import { syncCrmEntityToOpenSolar, fetchProjectDocuments } from '../../services/openSolarService';

interface ProjectCenterTabsProps {
  project?: Project | null;
  formData: ProjectFormData;
  activities: LeadActivity[];
  onAddActivity: (activity: Omit<LeadActivity, 'id' | 'createdAt'>) => void;
  onToggleTask: (activityId: string) => void;
  onDeleteActivity: (activityId: string) => void;
}

export const ProjectCenterTabs: React.FC<ProjectCenterTabsProps> = ({
  project,
  formData,
  activities,
  onAddActivity,
  onToggleTask,
  onDeleteActivity
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'activities' | 'documents'>('overview');
  const [activityFilter, setActivityFilter] = useState<'All' | 'SMS' | 'Call' | LeadActivityType>('All');
  const [smsLogs, setSmsLogs] = useState<SmsLogEntry[]>([]);
  const [callLogs, setCallLogs] = useState<VoIPLineCallLog[]>([]);
  const [projectDocs, setProjectDocs] = useState<ProjectDocument[]>([]);
  const [isSyncingOpenSolar, setIsSyncingOpenSolar] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);

  // Load project documents from Supabase / server
  React.useEffect(() => {
    if (project?.id || project?.projectNumber) {
      const targetId = project.id || project.projectNumber;
      fetchProjectDocuments(targetId)
        .then(docs => setProjectDocs(docs))
        .catch(err => console.warn('Failed to load project documents:', err));
    }
  }, [project?.id, project?.projectNumber]);

  const handlePushToOpenSolar = async () => {
    if (!project) return;
    setIsSyncingOpenSolar(true);
    setSyncStatusMessage(null);
    try {
      const res = await syncCrmEntityToOpenSolar('project', project.id || project.projectNumber, project, 'update');
      if (res.success) {
        setSyncStatusMessage(`Successfully synchronized to OpenSolar! (OS-ID: ${res.osId || project.os_id || 'Active'})`);
      } else if (res.skippedLoopPrevention) {
        setSyncStatusMessage(`Sync skipped by loop prevention: ${res.reason}`);
      } else {
        setSyncStatusMessage(`OpenSolar sync warning: ${res.error || 'Check API credentials'}`);
      }
    } catch (err: any) {
      setSyncStatusMessage(`Sync error: ${err.message}`);
    } finally {
      setIsSyncingOpenSolar(false);
      setTimeout(() => setSyncStatusMessage(null), 6000);
    }
  };

  // Load project SMS logs from Supabase
  React.useEffect(() => {
    if (project?.id) {
      fetchSmsLogs({ project_id: project.id })
        .then(logs => setSmsLogs(logs))
        .catch(err => console.warn('Failed to load project SMS logs:', err));
    }
  }, [project?.id]);

  // Load project VoIPLine Call logs from Supabase
  React.useEffect(() => {
    if (project?.customerId || project?.id) {
      fetchCallLogs({ contactId: project?.customerId, limit: 50 })
        .then(logs => setCallLogs(logs))
        .catch(err => console.warn('Failed to load VoIPLine call logs:', err));
    }
  }, [project?.id, project?.customerId]);

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
  const [loggerMeetingLocation, setLoggerMeetingLocation] = useState('Site Installation / Pre-inspection');
  const [quickNoteText, setQuickNoteText] = useState('');

  // Financial calculations
  const parsedSelling = parseAudAccounts(formData.amount || formData.sellingPrice);
  const parsedDeposit = parseAudAccounts(formData.deposit);
  const balanceDue = Math.max(0, parsedSelling - parsedDeposit);
  const estStcRebate = Math.round((Number(formData.systemSizeKw) || 6.6) * 380);

  type TimelineItem =
    | { kind: 'activity'; data: LeadActivity; timestamp: string }
    | { kind: 'sms'; data: SmsLogEntry; timestamp: string }
    | { kind: 'call'; data: VoIPLineCallLog; timestamp: string };

  const timelineItems: TimelineItem[] = [
    ...(activities || []).filter(Boolean).map(a => ({ kind: 'activity' as const, data: a, timestamp: a?.createdAt || new Date().toISOString() })),
    ...(smsLogs || []).filter(Boolean).map(s => ({ kind: 'sms' as const, data: s, timestamp: s?.created_at || new Date().toISOString() })),
    ...(callLogs || []).filter(Boolean).map(c => ({ kind: 'call' as const, data: c, timestamp: c?.timestamp || new Date().toISOString() }))
  ]
    .filter(item => {
      if (!item || !item.data) return false;
      if (activityFilter === 'All') return true;
      if (activityFilter === 'SMS') return item.kind === 'sms';
      if (activityFilter === 'Call') {
        return item.kind === 'call' || (item.kind === 'activity' && item.data.type === 'Call');
      }
      return item.kind === 'activity' && item.data.type === activityFilter;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleSaveActivity = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loggerDescription.trim() && !loggerTitle.trim()) return;

    let finalTitle = loggerTitle.trim();
    if (!finalTitle) {
      if (loggerType === 'Call') finalTitle = `Phone Call (${loggerCallOutcome})`;
      else if (loggerType === 'Meeting') finalTitle = `Site Meeting: ${loggerMeetingLocation}`;
      else if (loggerType === 'Task') finalTitle = `Task: ${loggerDescription.slice(0, 30)}...`;
      else if (loggerType === 'Email') finalTitle = 'Customer Email Sent';
      else finalTitle = 'Project Team Note';
    }

    onAddActivity({
      leadId: project?.id || 'proj-active',
      type: loggerType,
      title: finalTitle,
      description: loggerDescription.trim(),
      createdBy: formData.salesPersonName || 'Project Lead',
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
      leadId: project?.id || 'proj-active',
      type: 'Note',
      title: 'Quick Activity Note',
      description: quickNoteText.trim(),
      createdBy: formData.salesPersonName || 'Project Lead'
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
              {timelineItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'documents'
                ? 'bg-[#282828] text-white shadow-sm border border-[#3e3e3e]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-orange-400" />
            <span>Documents &amp; Contracts</span>
            {(project?.openSolarContractSigned || project?.contract_signed_at || projectDocs.length > 0) && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
                {projectDocs.length > 0 ? projectDocs.length : 'Signed'}
              </span>
            )}
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
        <div className="space-y-5 overflow-y-auto pr-1 custom-scrollbar">
          {/* 1. DATA HIGHLIGHTS & METRICS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#bef264]" />
                Project Highlights &amp; Metrics
              </h3>
              <span className="text-[11px] font-mono text-[#bef264] bg-[#bef26410] px-2 py-0.5 rounded border border-[#bef26425]">
                Stage: {formData.projectStage}
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
                    <span className="text-[10px] text-gray-500 block uppercase">Contract Value</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {formData.amount || formData.sellingPrice || '$0.00'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase">Deposit Paid</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      {formData.deposit || '$0.00'}
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

              {/* Hardware & Site Snapshot */}
              <div className="p-4 bg-[#141414] border border-[#2a2a2a] rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-[#222] pb-2">
                  <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    Hardware &amp; System Specs
                  </span>
                  <span className="text-[10px] font-mono text-[#bef264]">{formData.systemSizeKw} kW Array</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase">Inverter</span>
                    <span className="text-xs font-semibold text-white block truncate">
                      {formData.inverterManufacturer || 'Sungrow'} ({formData.inverterSizeKw || '5.0'}kW)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase">Panels</span>
                    <span className="text-xs font-semibold text-white block truncate">
                      {formData.noOfPanels || 15}x {formData.panelManufacturer || 'AIKO'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase">Storage Battery</span>
                    <span className="text-xs font-semibold text-white block truncate">
                      {formData.batteryManufacturer
                        ? `${formData.batteryManufacturer} (${formData.usableCapacity || '10'}kWh)`
                        : 'None Installed'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase">Phase / Roof</span>
                    <span className="text-xs font-semibold text-white block truncate">
                      {formData.phase || 'Single Phase'} • {formData.roofType || 'Tile'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Status Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-[#141414] border border-[#2a2a2a] rounded-xl">
                <span className="text-[10px] text-gray-500 uppercase block font-semibold">Installation Status</span>
                <span className="text-xs font-bold text-sky-400 mt-0.5 block truncate">
                  {formData.installationStatus || 'Unscheduled'}
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  {formData.installationDate ? `Date: ${formData.installationDate}` : 'Date pending'}
                </span>
              </div>

              <div className="p-3 bg-[#141414] border border-[#2a2a2a] rounded-xl">
                <span className="text-[10px] text-gray-500 uppercase block font-semibold">DNSP Grid Pre-Approval</span>
                <span className="text-xs font-bold text-amber-400 mt-0.5 block truncate">
                  {formData.gridAppStatus || 'Not Started'}
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  {formData.electricityDistributor || 'Ausgrid'}
                </span>
              </div>

              <div className="p-3 bg-[#141414] border border-[#2a2a2a] rounded-xl">
                <span className="text-[10px] text-gray-500 uppercase block font-semibold">STC Trading Portal</span>
                <span className="text-xs font-bold text-[#bef264] mt-0.5 block truncate">
                  {formData.stcStatus || 'Pending Upload'}
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  {formData.stcTradedPortal || 'BridgeSelect'}
                </span>
              </div>
            </div>
          </div>

          {/* OpenSolar & Engineering Direct Links */}
          <div className="p-3 bg-[#141414] border border-[#2a2a2a] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Sun className="w-4 h-4 shrink-0" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">OpenSolar Proposal &amp; SLD Design</div>
                <div className="text-[11px] text-gray-400 font-mono">
                  Proposal ID: {project?.openSolarProposalId || `OS-PROP-2026-${formData.projectNumber || '101'}`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {project?.openSolarContractSigned ? (
                <span className="text-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Contract Signed</span>
                </span>
              ) : (
                <span className="text-xs bg-amber-500/15 border border-amber-500/30 text-amber-400 px-2.5 py-1 rounded-lg font-medium">
                  Contract Pending
                </span>
              )}
              <a
                href={`https://app.opensolar.com/#/projects/${project?.openSolarProposalId || 'demo'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-[#222] hover:bg-[#2c2c2c] border border-[#333] text-gray-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
              >
                <span>Open in OpenSolar</span>
                <ExternalLink className="w-3 h-3 text-gray-400" />
              </a>
            </div>
          </div>

          {/* Quick Note Input Box */}
          <form onSubmit={handleQuickNoteSubmit} className="p-3 bg-[#141414] border border-[#282828] rounded-xl space-y-2">
            <label className="block text-xs font-semibold text-gray-300">Quick Activity Note</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={quickNoteText}
                onChange={e => setQuickNoteText(e.target.value)}
                placeholder="Log a quick customer conversation or project update..."
                className="flex-1 px-3 py-2 bg-[#101010] border border-[#333] rounded-lg text-xs text-white placeholder-gray-500 focus:border-[#bef264] focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!quickNoteText.trim()}
                className="px-3.5 py-2 bg-[#bef264] hover:bg-[#aee653] disabled:opacity-40 disabled:hover:bg-[#bef264] text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Send className="w-3 h-3" />
                <span>Post</span>
              </button>
            </div>
          </form>

          {/* Recent Activities Snapshot */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                Recent Activity Timeline
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('activities')}
                className="text-xs text-[#bef264] hover:underline flex items-center gap-1 font-medium"
              >
                <span>View all ({timelineItems.length})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {timelineItems.length === 0 ? (
              <div className="p-6 text-center bg-[#141414] border border-dashed border-[#282828] rounded-xl">
                <Activity className="w-6 h-6 text-gray-600 mx-auto mb-1.5" />
                <p className="text-xs text-gray-400">No activities or SMS logged yet.</p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('activities');
                    setShowLogger(true);
                  }}
                  className="mt-2 text-xs text-[#bef264] hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3 h-3" /> Log first interaction
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {timelineItems.slice(0, 3).map(item =>
                  item.kind === 'sms' ? (
                    <div
                      key={item.data.id}
                      className="p-3 bg-[#141414] border border-[#262626] rounded-xl flex items-start justify-between gap-3 text-xs hover:border-[#383838] transition-colors"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white truncate text-xs">
                              SMS to {item.data.recipient_number}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/50">
                              SMS
                            </span>
                          </div>
                          <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">
                            {item.data.message_body}
                          </p>
                          <span className="text-[10px] text-gray-500 mt-1 block">
                            Via {item.data.sender_id || 'MessageMedia'} &bull; {new Date(item.data.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 pt-0.5">
                        {item.data.delivery_status === 'delivered' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-400">
                            <CheckCheck className="w-3.5 h-3.5" /> Delivered
                          </span>
                        ) : item.data.delivery_status === 'failed' || item.data.delivery_status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400">
                            <AlertTriangle className="w-3.5 h-3.5" /> Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                            <Check className="w-3.5 h-3.5" /> Sent
                          </span>
                        )}
                      </div>
                    </div>
                  ) : item.kind === 'call' ? (
                    <div
                      key={item.data.id}
                      className="p-3 bg-[#141414] border border-[#262626] rounded-xl flex items-start justify-between gap-3 text-xs hover:border-[#383838] transition-colors"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-[#202020] border border-[#333] text-cyan-400 shrink-0 mt-0.5">
                          <PhoneCall className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white truncate text-xs">
                              {item.data.direction === 'inbound' ? 'Inbound Call' : 'Outbound Call'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-800/50">
                              {item.data?.status || 'Call'}
                            </span>
                          </div>
                          <p className="text-gray-400 text-xs mt-0.5">
                            {item.data.caller_number} &rarr; {item.data.callee_number} ({item.data.duration ? `${item.data.duration}s` : '0s'})
                          </p>
                          <span className="text-[10px] text-gray-500 mt-1 block">
                            VoIPLine AU &bull; {new Date(item.data.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {item.data.recording_url && (
                        <div className="shrink-0 pt-0.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/50">
                            <FileAudio className="w-3 h-3" /> Rec
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      key={item.data.id}
                      className="p-3 bg-[#141414] border border-[#262626] rounded-xl flex items-start justify-between gap-3 text-xs hover:border-[#383838] transition-colors"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-[#202020] border border-[#333] shrink-0 mt-0.5">
                          {getActivityIcon(item.data.type)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white truncate text-xs">{item.data.title}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#222] text-gray-400 border border-[#333]">
                              {item.data.type}
                            </span>
                          </div>
                          {item.data.description && (
                            <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">
                              {item.data.description}
                            </p>
                          )}
                          <span className="text-[10px] text-gray-500 mt-1 block">
                            By {item.data.createdBy || 'Project Lead'} &bull; {new Date(item.data.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: ACTIVITIES */}
      {activeTab === 'activities' && (
        <div className="space-y-4 overflow-y-auto pr-1 custom-scrollbar">
          {/* Filter Pills */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#262626]">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['All', 'Note', 'Email', 'SMS', 'Call', 'Task', 'Meeting', 'Status Change'] as const).map(filter => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActivityFilter(filter as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    activityFilter === filter
                      ? 'bg-[#bef264] text-slate-950 font-bold'
                      : 'bg-[#181818] hover:bg-[#242424] text-gray-400 hover:text-white border border-[#2e2e2e]'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {!showLogger && (
              <button
                type="button"
                onClick={() => setShowLogger(true)}
                className="flex items-center gap-1 text-xs bg-[#bef264] hover:bg-[#aee653] text-slate-950 px-2.5 py-1 rounded-lg font-bold transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Activity</span>
              </button>
            )}
          </div>

          {/* Interactive Activity Logger Box */}
          {showLogger && (
            <form
              onSubmit={handleSaveActivity}
              className="p-4 bg-[#141414] border border-[#bef26450] rounded-xl space-y-3.5 shadow-xl animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between border-b border-[#262626] pb-2.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-[#bef264]">Log:</span>
                  {(['Note', 'Email', 'Call', 'Task', 'Meeting'] as LeadActivityType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setLoggerType(t)}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                        loggerType === t
                          ? 'bg-[#282828] text-white border border-[#444]'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShowLogger(false)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Subject / Summary</label>
                <input
                  type="text"
                  required
                  value={loggerTitle}
                  onChange={e => setLoggerTitle(e.target.value)}
                  placeholder={`e.g. ${
                    loggerType === 'Call'
                      ? 'Discussed inverter placement with electrician'
                      : loggerType === 'Task'
                      ? 'Follow up DNSP pre-approval certificate'
                      : loggerType === 'Meeting'
                      ? 'Pre-install roof framing inspection'
                      : 'Customer confirmed roof access arrangements'
                  }`}
                  className="w-full px-3 py-2 bg-[#101010] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
                />
              </div>

              {loggerType === 'Call' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Call Outcome</label>
                    <select
                      value={loggerCallOutcome}
                      onChange={e => setLoggerCallOutcome(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#101010] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
                    >
                      <option value="Connected">Connected</option>
                      <option value="Left Voicemail">Left Voicemail</option>
                      <option value="No Answer">No Answer</option>
                      <option value="Busy">Busy</option>
                      <option value="Wrong Number">Wrong Number</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Duration</label>
                    <input
                      type="text"
                      value={loggerCallDuration}
                      onChange={e => setLoggerCallDuration(e.target.value)}
                      placeholder="5m"
                      className="w-full px-3 py-1.5 bg-[#101010] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              {loggerType === 'Task' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={loggerTaskDueDate}
                      onChange={e => setLoggerTaskDueDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#101010] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Priority</label>
                    <select
                      value={loggerTaskPriority}
                      onChange={e => setLoggerTaskPriority(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-[#101010] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>
              )}

              {loggerType === 'Meeting' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Meeting Date / Time</label>
                    <input
                      type="datetime-local"
                      value={loggerMeetingDate}
                      onChange={e => setLoggerMeetingDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#101010] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Location</label>
                    <input
                      type="text"
                      value={loggerMeetingLocation}
                      onChange={e => setLoggerMeetingLocation(e.target.value)}
                      placeholder="Site Installation / Pre-inspection"
                      className="w-full px-3 py-1.5 bg-[#101010] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Notes / Description</label>
                <textarea
                  rows={2}
                  value={loggerDescription}
                  onChange={e => setLoggerDescription(e.target.value)}
                  placeholder="Enter detailed outcome or notes..."
                  className="w-full px-3 py-1.5 bg-[#101010] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowLogger(false)}
                  className="px-3 py-1 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#bef264] hover:bg-[#aee653] text-slate-950 font-bold rounded-lg text-xs shadow transition-colors"
                >
                  Save Activity
                </button>
              </div>
            </form>
          )}

          {/* Filtered Activity List */}
          {timelineItems.length === 0 ? (
            <div className="p-8 text-center bg-[#141414] border border-dashed border-[#282828] rounded-xl">
              <Activity className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-400">
                No {activityFilter === 'All' ? '' : activityFilter} activities logged.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {timelineItems.map(item =>
                item.kind === 'sms' ? (
                  <div
                    key={item.data.id}
                    className="p-3.5 bg-[#141414] border border-[#262626] rounded-xl space-y-2 hover:border-[#383838] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-white">
                              SMS to {item.data.recipient_number}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/50">
                              SMS Outbound
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-500 flex items-center gap-2 mt-0.5">
                            <span>Via {item.data.sender_id || 'MessageMedia'}</span>
                            <span>•</span>
                            <span>{new Date(item.data.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Live Delivery Status Indicator */}
                      <div className="flex items-center">
                        {item.data.delivery_status === 'delivered' ? (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-400 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-800/50"
                            title={
                              item.data.delivered_at
                                ? `Delivered at ${new Date(item.data.delivered_at).toLocaleString()}`
                                : 'Delivered to handset'
                            }
                          >
                            <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                            <span>Delivered</span>
                          </span>
                        ) : item.data.delivery_status === 'failed' || item.data.delivery_status === 'rejected' ? (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/50"
                            title={item.data.error_message || 'SMS delivery failed or rejected by carrier'}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Failed</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 bg-[#202020] px-2 py-0.5 rounded border border-[#333]"
                            title="Submitted to MessageMedia gateway - awaiting carrier delivery receipt"
                          >
                            <Check className="w-3.5 h-3.5 text-gray-400" />
                            <span>Submitted</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-gray-300 pl-6 border-l-2 border-emerald-500/30 ml-2 whitespace-pre-line">
                      {item.data.message_body}
                    </p>

                    {item.data.provider_message_id && (
                      <div className="pl-6 ml-2 text-[10px] text-gray-500 font-mono">
                        Provider ID: {item.data.provider_message_id}
                      </div>
                    )}
                  </div>
                ) : item.kind === 'call' ? (
                  <div
                    key={item.data.id}
                    className="p-3.5 bg-[#141414] border border-[#262626] rounded-xl space-y-2.5 hover:border-[#383838] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-[#202020] border border-[#333] text-cyan-400">
                          {item.data.direction === 'inbound' ? (
                            <Phone className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <PhoneCall className="w-3.5 h-3.5 text-cyan-400" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-white">
                              {item.data.direction === 'inbound' ? 'Inbound Voice Call' : 'Outbound Call'}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                item.data?.status === 'completed'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : item.data?.status === 'answered'
                                  ? 'bg-sky-950 text-sky-300 border border-sky-800'
                                  : item.data?.status === 'voicemail'
                                  ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                  : 'bg-amber-950 text-amber-300 border border-amber-800'
                              }`}
                            >
                              {item.data?.status || 'Call'}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono flex items-center gap-2 mt-0.5">
                            <span>From: {item.data.caller_number || 'Unknown'}</span>
                            <span>&rarr;</span>
                            <span>To: {item.data.callee_number || 'Line'}</span>
                            <span>&bull;</span>
                            <span>{new Date(item.data.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] font-mono text-gray-300 block">
                          {item.data.duration
                            ? `${Math.floor(item.data.duration / 60)}m ${item.data.duration % 60}s`
                            : '0s'}
                        </span>
                      </div>
                    </div>

                    {/* HTML5 Audio Player for Recorded Calls */}
                    {item.data.recording_url && (
                      <div className="mt-2 p-3 bg-[#0d0d0d] border border-cyan-500/30 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-cyan-400">
                          <span className="flex items-center gap-1.5">
                            <FileAudio className="w-3.5 h-3.5 text-cyan-400" />
                            VoIPLine Call Recording Audio
                          </span>
                          <a
                            href={item.data.recording_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                          >
                            <span>Open Audio Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <audio
                          controls
                          src={item.data.recording_url}
                          className="w-full h-8 mt-1 rounded bg-[#1f1f1f]"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    key={item.data.id}
                    className="p-3.5 bg-[#141414] border border-[#262626] rounded-xl space-y-2 hover:border-[#383838] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-[#202020] border border-[#333]">
                          {getActivityIcon(item.data.type)}
                        </div>

                        <div>
                          <span className="font-semibold text-xs text-white">{item.data.title}</span>
                          <div className="text-[10px] text-gray-500 flex items-center gap-2 mt-0.5">
                            <span>Logged by {item.data.createdBy || 'Staff'}</span>
                            <span>•</span>
                            <span>{new Date(item.data.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {item.data.type === 'Task' && (
                          <button
                            type="button"
                            onClick={() => onToggleTask(item.data.id)}
                            className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                              item.data.completed
                                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                                : 'bg-[#222] text-gray-300 hover:bg-[#2c2c2c] border border-[#333]'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{item.data.completed ? 'Completed' : 'Mark Done'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteActivity(item.data.id)}
                          className="p-1 text-gray-500 hover:text-rose-400 rounded transition-colors"
                          title="Delete activity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {item.data.description && (
                      <p className="text-xs text-gray-300 pl-6 border-l-2 border-[#2a2a2a] ml-2 whitespace-pre-line">
                        {item.data.description}
                      </p>
                    )}

                    {/* HTML5 Audio Player if activity has recordingUrl */}
                    {item.data.recordingUrl && (
                      <div className="mt-2 p-3 bg-[#0d0d0d] border border-cyan-500/30 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-cyan-400">
                          <span className="flex items-center gap-1.5">
                            <FileAudio className="w-3.5 h-3.5 text-cyan-400" />
                            Call Recording Audio
                          </span>
                          <a
                            href={item.data.recordingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                          >
                            <span>Open Audio Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <audio
                          controls
                          src={item.data.recordingUrl}
                          className="w-full h-8 mt-1 rounded bg-[#1f1f1f]"
                        />
                      </div>
                    )}

                    {/* Metadata tags */}
                    <div className="flex items-center gap-2 pl-6 ml-2 text-[11px] text-gray-400 flex-wrap">
                      {item.data.callOutcome && (
                        <span className="px-1.5 py-0.5 rounded bg-[#1c1c1c] border border-[#333] text-emerald-400">
                          Outcome: {item.data.callOutcome} ({item.data.callDuration || '5m'})
                        </span>
                      )}
                      {item.data.dueDate && (
                        <span className="px-1.5 py-0.5 rounded bg-[#1c1c1c] border border-[#333] text-purple-400">
                          Due: {item.data.dueDate} &bull; {item.data.priority || 'Medium'}
                        </span>
                      )}
                      {item.data.meetingDate && (
                        <span className="px-1.5 py-0.5 rounded bg-[#1c1c1c] border border-[#333] text-rose-400">
                          {item.data.meetingDate} &bull; {item.data.meetingLocation}
                        </span>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: DOCUMENTS & CONTRACTS */}
      {activeTab === 'documents' && (
        <div className="space-y-5 overflow-y-auto pr-1 custom-scrollbar">
          {syncStatusMessage && (
            <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl text-xs text-orange-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-orange-400 shrink-0" />
                <span>{syncStatusMessage}</span>
              </div>
            </div>
          )}

          {/* 1. OpenSolar 2-Way Sync Status & Push Panel */}
          <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    OpenSolar 2-Way Synchronization
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-orange-500/20 text-orange-300 font-mono">
                      os_id: {project?.os_id || project?.openSolarProposalId || 'Unmapped'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    Bidirectional sync mapping between CRM and OpenSolar projects, stages, and quotes.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePushToOpenSolar}
                disabled={isSyncingOpenSolar}
                className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingOpenSolar ? 'animate-spin' : ''}`} />
                <span>{isSyncingOpenSolar ? 'Pushing...' : 'Push Updates to OpenSolar'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
              <div className="p-2.5 bg-black/30 rounded-lg border border-[#222]">
                <span className="text-[10px] uppercase font-bold text-gray-500 block">OpenSolar ID</span>
                <span className="font-mono text-emerald-300 font-semibold truncate block">
                  {project?.os_id || project?.openSolarProposalId || 'Pending Push'}
                </span>
              </div>
              <div className="p-2.5 bg-black/30 rounded-lg border border-[#222]">
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Last Synced</span>
                <span className="text-gray-300 font-mono text-[11px] truncate block">
                  {project?.last_synced_at ? new Date(project.last_synced_at).toLocaleTimeString() : 'Recent'}
                </span>
              </div>
              <div className="p-2.5 bg-black/30 rounded-lg border border-[#222]">
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Source Origin</span>
                <span className="text-orange-300 font-mono text-[11px] truncate block">
                  {project?.last_updated_by || 'crm_user'}
                </span>
              </div>
              <div className="p-2.5 bg-black/30 rounded-lg border border-[#222]">
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Contract Status</span>
                <span className="font-semibold text-white truncate block">
                  {project?.openSolarContractSigned || project?.contract_signed_at ? 'e-Signed' : 'Draft / Sent'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. OpenSolar Signed Contracts Repository */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                OpenSolar Signed Contracts &amp; Proposals
              </h4>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                Verified e-Signature
              </span>
            </div>

            {/* Signed Contract Item */}
            {(project?.openSolarContractSigned || project?.contract_signed_at || projectDocs.length > 0) ? (
              <div className="p-4 bg-[#141414] border border-emerald-500/30 rounded-xl space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">
                          {projectDocs[0]?.file_name || `OpenSolar_Signed_Contract_${project?.os_id || project?.id}.pdf`}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Legally Signed
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Captured from OpenSolar Proposal Webhook &bull; Stage: &quot;Contract Signed&quot;
                      </p>
                      <span className="text-[10px] font-mono text-gray-500 mt-1 block">
                        Storage: {projectDocs[0]?.storage_path || `/contracts/OpenSolar_Signed_Contract_${project?.os_id || project?.id}.pdf`} &bull; Size: {projectDocs[0]?.file_size || '184 KB'}
                      </span>
                    </div>
                  </div>

                  <a
                    href={projectDocs[0]?.download_url || `/contracts/OpenSolar_Signed_Contract_${project?.os_id || project?.id}.pdf`}
                    target="_blank"
                    rel="noreferrer"
                    download={`OpenSolar_Signed_Contract_${project?.os_id || project?.id}.pdf`}
                    className="px-3 py-1.5 rounded-lg bg-[#242424] hover:bg-[#333] border border-[#3e3e3e] text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View / Download PDF</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-[#141414] border border-dashed border-[#2d2d2d] rounded-xl text-center space-y-2">
                <Sun className="w-8 h-8 text-orange-400/60 mx-auto" />
                <p className="text-xs font-semibold text-gray-300">No Signed Contract Yet</p>
                <p className="text-[11px] text-gray-500 max-w-md mx-auto">
                  When the customer signs the digital proposal on OpenSolar, the webhook automatically pushes the signed PDF here and advances the project stage to &quot;Contract Signed&quot;.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

