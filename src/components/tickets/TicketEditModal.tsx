import React, { useState, useEffect, useMemo } from 'react';
import {
  Ticket,
  Project,
  LeadActivity,
  LeadAttachment
} from '../../types';
import { useApp } from '../../context/AppContext';
import {
  Wrench,
  X,
  Save,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Clock,
  Hash,
  Activity,
  User,
  Zap,
  Building2
} from 'lucide-react';
import { formatAudAccounts, parseAudAccounts } from '../../utils/australianPostcodes';
import { TicketDetailsLeftPanel, TicketDetailsFormData } from './TicketDetailsLeftPanel';
import { TicketCenterTabs } from './TicketCenterTabs';
import { TicketRightSidebar } from './TicketRightSidebar';

interface TicketEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket?: Ticket | null;
}

export const TicketEditModal: React.FC<TicketEditModalProps> = ({
  isOpen,
  onClose,
  ticket
}) => {
  const {
    projects,
    dropdowns,
    subContractors,
    systemUsers,
    addTicket,
    updateTicket,
    themeMode
  } = useApp();

  const isLight = themeMode === 'corporate-slate';
  const isEditing = Boolean(ticket);

  // Filter completed projects for the "Installation Project No." dropdown
  const completedProjects = useMemo(() => {
    return (projects || []).filter(Boolean).filter(p => {
      const statusLower = (p?.status || '').toLowerCase();
      const installStatusLower = (p?.installationStatus || '').toLowerCase();
      return (
        statusLower === 'completed' ||
        statusLower.includes('complete') ||
        installStatusLower === 'installation completed' ||
        installStatusLower === 'closed'
      );
    });
  }, [projects]);

  // Form State
  const [formData, setFormData] = useState<TicketDetailsFormData>({
    ticketId: '',
    installationProjectNo: '',
    installationDate: '',
    firstName: '',
    lastName: '',
    contactNumber: '',
    emailId: '',
    address: '',
    suburb: '',
    postCode: '',
    state: 'NSW',
    phase: 'Single Phase',
    storeyType: 'Single Storey',

    // Issue Details
    issueRecorded: '',
    initialCheck: '',
    workRequired: '',
    issueResolutionStatus: 'Under Investigation',

    // Existing Equipment
    noOfExistingInverters: 1,
    existingInverterSerialNumber: '',
    existingInverterBrand: '',
    existingInverterModel: '',
    existingInverterSize: '',
    noOfExistingPanels: 20,
    affectedPanelSerialNumber: '',
    existingPanelBrand: '',
    existingPanelModel: '',
    existingPanelSize: '',
    affectedBatterySerialNumber: '',
    existingBatteryBrand: '',
    existingBatteryModel: '',
    existingBatterySize: '',
    serviceIssueNotes: '',

    // Replaced Equipment
    noOfReplacedInverters: '',
    replacedInverterSerialNumber: '',
    replacedInverterBrand: '',
    replacedInverterModel: '',
    replacedInverterSize: '',
    noOfReplacedPanels: '',
    replacedPanelSerialNumber: '',
    replacedPanelBrand: '',
    replacedPanelModel: '',
    replacedPanelSize: '',
    replacedBatterySerialNumber: '',
    replacedBatteryBrand: '',
    replacedBatteryModel: '',
    replacedBatterySize: '',

    // Warranty Claim Section
    warrantyClaimDate: '',
    warrantyClaimId: '',
    warrantyClaimStatus: 'Not Applicable',
    warrantyClaimInvoiceNumber: '',
    warrantyClaimInvoiceAmount: '$0.00',
    warrantyClaimInvoiceStatus: 'Pending Claim Review',
    brandNotes: '',

    // Installer / Electrician / Sub-contractor Section
    isInstallerSubContractor: false,
    installerOrElectricianName: '',
    installerPhone: '',
    installerEmail: '',
    companyName: '',
    installerInvoiceDate: '',
    installerInvoiceNumber: '',
    installerInvoiceAmount: '$0.00',
    installerInvoiceStatus: 'Pending Approval',
    installerElectricianNotes: '',

    // Resolution & Billing
    issueResolutionDate: '',
    serviceHandler: '',
    serviceCharge: '$0.00',
    totalServiceIssueAmount: '$0.00'
  });

  // Activities and Attachments state
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [attachments, setAttachments] = useState<LeadAttachment[]>([]);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Auto populate based on Project Number selection
  const handleProjectSelect = (projectCodeOrId: string) => {
    const selectedProj = projects.find(
      p => p.projectCode === projectCodeOrId || p.id === projectCodeOrId || p.projectNumber === projectCodeOrId
    );

    if (!selectedProj) return;

    // Parse Customer Names
    let fName = selectedProj.firstName || '';
    let lName = selectedProj.lastName || '';
    if (!fName && selectedProj.customerName) {
      const parts = selectedProj.customerName.trim().split(' ');
      fName = parts[0] || '';
      lName = parts.slice(1).join(' ') || '';
    }

    setFormData(prev => ({
      ...prev,
      installationProjectNo: selectedProj.projectCode || selectedProj.id,
      installationDate: selectedProj.installationDate || selectedProj.completedDate || prev.installationDate,
      firstName: fName || prev.firstName,
      lastName: lName || prev.lastName,
      contactNumber: selectedProj.customerPhone || selectedProj.primaryMobile || prev.contactNumber,
      emailId: selectedProj.customerEmail || selectedProj.email || prev.emailId,
      address: selectedProj.address || prev.address,
      suburb: selectedProj.suburb || prev.suburb,
      postCode: selectedProj.postcode || prev.postCode,
      state: selectedProj.state || prev.state,
      phase: selectedProj.phase || selectedProj.phaseType || prev.phase,
      storeyType: selectedProj.houseStorey || selectedProj.propertyType || prev.storeyType,

      // Existing hardware auto populate
      existingInverterBrand: selectedProj.inverterBrand || selectedProj.inverterManufacturer || prev.existingInverterBrand,
      existingInverterModel: selectedProj.inverterModel || prev.existingInverterModel,
      existingInverterSize: selectedProj.systemSizeKw ? `${selectedProj.systemSizeKw} kW` : prev.existingInverterSize,
      noOfExistingPanels: selectedProj.panelCount || prev.noOfExistingPanels,
      existingPanelBrand: selectedProj.panelBrand || selectedProj.panelManufacturer || prev.existingPanelBrand,
      existingPanelModel: selectedProj.panelModel || prev.existingPanelModel,
      existingPanelSize: selectedProj.panelSizeW ? `${selectedProj.panelSizeW}W` : prev.existingPanelSize,
      existingBatteryBrand: selectedProj.batteryBrand || selectedProj.batteryManufacturer || prev.existingBatteryBrand,
      existingBatteryModel: selectedProj.batteryModel || prev.existingBatteryModel,
      existingBatterySize: selectedProj.batteryCapacityKwh ? `${selectedProj.batteryCapacityKwh} kWh` : prev.existingBatterySize,

      // Installer details if project had an assigned subcontractor
      isInstallerSubContractor: Boolean(selectedProj.subcontractorId || selectedProj.subcontractorName),
      installerOrElectricianName: selectedProj.subcontractorName || selectedProj.installerName || prev.installerOrElectricianName,
      installerInvoiceAmount: selectedProj.installerQuotedAud ? formatAudAccounts(selectedProj.installerQuotedAud) : prev.installerInvoiceAmount
    }));

    setFeedbackNotice(`Auto-populated details from completed project ${selectedProj.projectCode}!`);
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  // Sync ticket when opened
  useEffect(() => {
    if (ticket) {
      setFormData({
        ticketId: ticket.ticketNumber || ticket.id,
        installationProjectNo: ticket.installationProjectNo || ticket.projectCode || '',
        installationDate: ticket.installationDate || '',
        firstName: ticket.firstName || ticket.customerName?.split(' ')[0] || '',
        lastName: ticket.lastName || ticket.customerName?.split(' ').slice(1).join(' ') || '',
        contactNumber: ticket.contactNumber || ticket.customerPhone || '',
        emailId: ticket.emailId || '',
        address: ticket.address || '',
        suburb: ticket.suburb || '',
        postCode: ticket.postCode || '',
        state: ticket.state || 'NSW',
        phase: ticket.phase || 'Single Phase',
        storeyType: ticket.storeyType || 'Single Storey',

        issueRecorded: ticket.issueRecorded || ticket.category || ticket.title || '',
        initialCheck: ticket.initialCheck || '',
        workRequired: ticket.workRequired || ticket.description || '',
        issueResolutionStatus: ticket.issueResolutionStatus || ticket.status || 'Under Investigation',

        noOfExistingInverters: ticket.noOfExistingInverters ?? 1,
        existingInverterSerialNumber: ticket.existingInverterSerialNumber || '',
        existingInverterBrand: ticket.existingInverterBrand || '',
        existingInverterModel: ticket.existingInverterModel || '',
        existingInverterSize: ticket.existingInverterSize || '',
        noOfExistingPanels: ticket.noOfExistingPanels ?? 20,
        affectedPanelSerialNumber: ticket.affectedPanelSerialNumber || '',
        existingPanelBrand: ticket.existingPanelBrand || '',
        existingPanelModel: ticket.existingPanelModel || '',
        existingPanelSize: ticket.existingPanelSize || '',
        affectedBatterySerialNumber: ticket.affectedBatterySerialNumber || '',
        existingBatteryBrand: ticket.existingBatteryBrand || '',
        existingBatteryModel: ticket.existingBatteryModel || '',
        existingBatterySize: ticket.existingBatterySize || '',
        serviceIssueNotes: ticket.serviceIssueNotes || '',

        noOfReplacedInverters: ticket.noOfReplacedInverters ?? '',
        replacedInverterSerialNumber: ticket.replacedInverterSerialNumber || '',
        replacedInverterBrand: ticket.replacedInverterBrand || '',
        replacedInverterModel: ticket.replacedInverterModel || '',
        replacedInverterSize: ticket.replacedInverterSize || '',
        noOfReplacedPanels: ticket.noOfReplacedPanels ?? '',
        replacedPanelSerialNumber: ticket.replacedPanelSerialNumber || '',
        replacedPanelBrand: ticket.replacedPanelBrand || '',
        replacedPanelModel: ticket.replacedPanelModel || '',
        replacedPanelSize: ticket.replacedPanelSize || '',
        replacedBatterySerialNumber: ticket.replacedBatterySerialNumber || '',
        replacedBatteryBrand: ticket.replacedBatteryBrand || '',
        replacedBatteryModel: ticket.replacedBatteryModel || '',
        replacedBatterySize: ticket.replacedBatterySize || '',

        warrantyClaimDate: ticket.warrantyClaimDate || '',
        warrantyClaimId: ticket.warrantyClaimId || '',
        warrantyClaimStatus: ticket.warrantyClaimStatus || 'Not Applicable',
        warrantyClaimInvoiceNumber: ticket.warrantyClaimInvoiceNumber || '',
        warrantyClaimInvoiceAmount: ticket.warrantyClaimInvoiceAmount ? formatAudAccounts(parseAudAccounts(String(ticket.warrantyClaimInvoiceAmount))) : '$0.00',
        warrantyClaimInvoiceStatus: ticket.warrantyClaimInvoiceStatus || 'Pending Claim Review',
        brandNotes: ticket.brandNotes || '',

        isInstallerSubContractor: Boolean(ticket.isInstallerSubContractor),
        installerOrElectricianName: ticket.installerOrElectricianName || '',
        installerPhone: ticket.installerPhone || '',
        installerEmail: ticket.installerEmail || '',
        companyName: ticket.companyName || '',
        installerInvoiceDate: ticket.installerInvoiceDate || '',
        installerInvoiceNumber: ticket.installerInvoiceNumber || '',
        installerInvoiceAmount: ticket.installerInvoiceAmount ? formatAudAccounts(parseAudAccounts(String(ticket.installerInvoiceAmount))) : '$0.00',
        installerInvoiceStatus: ticket.installerInvoiceStatus || 'Pending Approval',
        installerElectricianNotes: ticket.installerElectricianNotes || '',

        issueResolutionDate: ticket.issueResolutionDate || '',
        serviceHandler: ticket.serviceHandler || ticket.assignedTechnician || '',
        serviceCharge: ticket.serviceCharge ? formatAudAccounts(parseAudAccounts(String(ticket.serviceCharge))) : '$0.00',
        totalServiceIssueAmount: ticket.totalServiceIssueAmount ? formatAudAccounts(parseAudAccounts(String(ticket.totalServiceIssueAmount))) : '$0.00'
      });

      setActivities(ticket.activities || []);
      setAttachments(ticket.attachments || []);
    } else {
      // New Ticket Initializer: Generate Auto Ticket ID
      const autoNum = Math.floor(100 + Math.random() * 900);
      const generatedTicketId = `TKT-${new Date().getFullYear()}-${autoNum}`;

      // Pick first completed project if available to auto populate right away
      const initialCompleted = completedProjects[0];
      const initialProjCode = initialCompleted?.projectCode || initialCompleted?.id || '';

      setFormData(prev => ({
        ...prev,
        ticketId: generatedTicketId,
        installationProjectNo: initialProjCode,
        installationDate: initialCompleted?.installationDate || new Date().toISOString().split('T')[0],
        firstName: initialCompleted?.firstName || initialCompleted?.customerName?.split(' ')[0] || '',
        lastName: initialCompleted?.lastName || initialCompleted?.customerName?.split(' ').slice(1).join(' ') || '',
        contactNumber: initialCompleted?.customerPhone || '',
        emailId: initialCompleted?.customerEmail || '',
        address: initialCompleted?.address || '',
        suburb: initialCompleted?.suburb || '',
        postCode: initialCompleted?.postcode || '',
        state: initialCompleted?.state || 'NSW',
        phase: initialCompleted?.phase || 'Single Phase',
        storeyType: initialCompleted?.houseStorey || 'Single Storey',
        existingInverterBrand: initialCompleted?.inverterBrand || '',
        existingInverterModel: initialCompleted?.inverterModel || '',
        existingInverterSize: initialCompleted?.systemSizeKw ? `${initialCompleted.systemSizeKw} kW` : '',
        noOfExistingPanels: initialCompleted?.panelCount || 20,
        existingPanelBrand: initialCompleted?.panelBrand || '',
        existingPanelModel: initialCompleted?.panelModel || '',
        existingBatteryBrand: initialCompleted?.batteryBrand || '',
        existingBatteryModel: initialCompleted?.batteryModel || '',
        serviceHandler: systemUsers[0]?.name || 'Chloe Gallagher'
      }));

      // Initial activity
      setActivities([
        {
          id: `act-${Date.now()}`,
          leadId: generatedTicketId,
          type: 'Note',
          title: 'Ticket Created',
          description: 'Warranty service ticket opened and linked to completed installation project.',
          completed: true,
          createdAt: new Date().toISOString(),
          createdBy: 'System Operations'
        }
      ]);
      setAttachments([]);
    }
  }, [ticket, isOpen, completedProjects, systemUsers]);

  // Activity handlers
  const handleAddActivity = (newAct: Omit<LeadActivity, 'id' | 'createdAt'>) => {
    const act: LeadActivity = {
      ...newAct,
      id: `act-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setActivities(prev => [act, ...prev]);
  };

  const handleToggleTask = (activityId: string) => {
    setActivities(prev =>
      prev.map(a => (a.id === activityId ? { ...a, completed: !a.completed } : a))
    );
  };

  const handleDeleteActivity = (activityId: string) => {
    setActivities(prev => prev.filter(a => a.id !== activityId));
  };

  // Attachment handlers
  const handleAddAttachment = (newAtt: Omit<LeadAttachment, 'id' | 'uploadedAt'>) => {
    const att: LeadAttachment = {
      ...newAtt,
      id: `att-${Date.now()}`,
      uploadedAt: new Date().toISOString()
    };
    setAttachments(prev => [att, ...prev]);
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
  };

  // Submit / Save Ticket
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const matchedProject = projects.find(
      p => p.projectCode === formData.installationProjectNo || p.id === formData.installationProjectNo
    );

    const customerFullName = `${formData.firstName} ${formData.lastName}`.trim() || 'Customer';

    const ticketPayload: Partial<Ticket> = {
      ticketNumber: formData.ticketId,
      projectId: matchedProject?.id || formData.installationProjectNo || 'proj-unknown',
      projectCode: matchedProject?.projectCode || formData.installationProjectNo || 'SOL-PRJ-001',
      customerId: matchedProject?.customerId || 'cnt-unknown',
      customerName: customerFullName,
      customerPhone: formData.contactNumber,
      title: formData.issueRecorded || 'Solar Maintenance Service',
      description: formData.workRequired || formData.serviceIssueNotes || 'Solar warranty service ticket',
      status: formData.issueResolutionStatus || 'Under Investigation',
      assignedTechnician: formData.serviceHandler,
      resolutionNotes: formData.workRequired,

      // Left Panel Custom Fields
      installationProjectNo: formData.installationProjectNo,
      installationDate: formData.installationDate,
      firstName: formData.firstName,
      lastName: formData.lastName,
      contactNumber: formData.contactNumber,
      emailId: formData.emailId,
      address: formData.address,
      suburb: formData.suburb,
      postCode: formData.postCode,
      state: formData.state,
      phase: formData.phase,
      storeyType: formData.storeyType,
      issueRecorded: formData.issueRecorded,
      initialCheck: formData.initialCheck,
      workRequired: formData.workRequired,
      issueResolutionStatus: formData.issueResolutionStatus,

      // Existing Equipment
      noOfExistingInverters: formData.noOfExistingInverters,
      existingInverterSerialNumber: formData.existingInverterSerialNumber,
      existingInverterBrand: formData.existingInverterBrand,
      existingInverterModel: formData.existingInverterModel,
      existingInverterSize: formData.existingInverterSize,
      noOfExistingPanels: formData.noOfExistingPanels,
      affectedPanelSerialNumber: formData.affectedPanelSerialNumber,
      existingPanelBrand: formData.existingPanelBrand,
      existingPanelModel: formData.existingPanelModel,
      existingPanelSize: formData.existingPanelSize,
      affectedBatterySerialNumber: formData.affectedBatterySerialNumber,
      existingBatteryBrand: formData.existingBatteryBrand,
      existingBatteryModel: formData.existingBatteryModel,
      existingBatterySize: formData.existingBatterySize,
      serviceIssueNotes: formData.serviceIssueNotes,

      // Replaced Equipment
      noOfReplacedInverters: formData.noOfReplacedInverters,
      replacedInverterSerialNumber: formData.replacedInverterSerialNumber,
      replacedInverterBrand: formData.replacedInverterBrand,
      replacedInverterModel: formData.replacedInverterModel,
      replacedInverterSize: formData.replacedInverterSize,
      noOfReplacedPanels: formData.noOfReplacedPanels,
      replacedPanelSerialNumber: formData.replacedPanelSerialNumber,
      replacedPanelBrand: formData.replacedPanelBrand,
      replacedPanelModel: formData.replacedPanelModel,
      replacedPanelSize: formData.replacedPanelSize,
      replacedBatterySerialNumber: formData.replacedBatterySerialNumber,
      replacedBatteryBrand: formData.replacedBatteryBrand,
      replacedBatteryModel: formData.replacedBatteryModel,
      replacedBatterySize: formData.replacedBatterySize,

      // Warranty Claim
      warrantyClaimDate: formData.warrantyClaimDate,
      warrantyClaimId: formData.warrantyClaimId,
      warrantyClaimStatus: formData.warrantyClaimStatus,
      warrantyClaimInvoiceNumber: formData.warrantyClaimInvoiceNumber,
      warrantyClaimInvoiceAmount: formData.warrantyClaimInvoiceAmount,
      warrantyClaimInvoiceStatus: formData.warrantyClaimInvoiceStatus,
      brandNotes: formData.brandNotes,

      // Installer / Subcontractor
      isInstallerSubContractor: formData.isInstallerSubContractor,
      installerOrElectricianName: formData.installerOrElectricianName,
      installerPhone: formData.installerPhone,
      installerEmail: formData.installerEmail,
      companyName: formData.companyName,
      installerInvoiceDate: formData.installerInvoiceDate,
      installerInvoiceNumber: formData.installerInvoiceNumber,
      installerInvoiceAmount: formData.installerInvoiceAmount,
      installerInvoiceStatus: formData.installerInvoiceStatus,
      installerElectricianNotes: formData.installerElectricianNotes,

      // Resolution & Billing
      issueResolutionDate: formData.issueResolutionDate,
      serviceHandler: formData.serviceHandler,
      serviceCharge: formData.serviceCharge,
      totalServiceIssueAmount: formData.totalServiceIssueAmount,

      activities,
      attachments
    };

    if (isEditing && ticket) {
      updateTicket(ticket.id, ticketPayload);
    } else {
      // If adding new ticket
      addTicket(ticketPayload as any);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden transition-colors ${
        isLight ? 'bg-slate-900/40 backdrop-blur-sm' : 'bg-slate-950/75 backdrop-blur-sm'
      }`}
    >
      <div
        className={`w-full max-w-[1540px] rounded-2xl shadow-2xl border overflow-hidden flex flex-col h-[94vh] transition-colors ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-slate-900 border-slate-800 text-slate-200'
        }`}
      >
        {/* TOP HEADER (MATCHING LEAD DETAILS PAGE) */}
        <header
          className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 transition-colors ${
            isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-slate-950/80 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                isLight
                  ? 'bg-amber-50 border-amber-200 text-amber-600'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
              }`}
            >
              <Wrench className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className={`font-bold text-base truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {formData.firstName || formData.lastName
                    ? `${formData.firstName} ${formData.lastName}`.trim()
                    : isEditing
                    ? ticket?.customerName
                    : 'New Support Ticket'}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  {formData.ticketId}
                </span>
                {formData.installationProjectNo && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    Project: {formData.installationProjectNo}
                  </span>
                )}
              </div>
              <p className={`text-xs truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Warranty &amp; Service Desk • Linked to Completed Project • Handler: {formData.serviceHandler || 'Unassigned'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {feedbackNotice && (
              <span className="hidden md:inline-flex text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                {feedbackNotice}
              </span>
            )}

            <button
              type="button"
              onClick={() => handleSubmit()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 hover:shadow-solar-soft cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-slate-950" />
              <span>{isEditing ? 'Save Ticket' : 'Create Ticket'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${
                isLight
                  ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* STATIC TOP SUMMARY BAR (MATCHING LEADS PAGE) */}
        <div
          className={`px-5 py-2.5 border-b shrink-0 transition-colors ${
            isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              {/* Field 1: Ticket ID (Auto Generated) */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-1">
                  <Hash className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                  <label className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Ticket ID
                  </label>
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                    isLight ? 'bg-white text-slate-700 border-slate-200' : 'bg-slate-900 text-amber-400 border-slate-700'
                  }`}>
                    Auto Generated
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={formData.ticketId}
                    className={`w-44 px-3 py-1.5 rounded-lg text-xs font-mono font-bold focus:outline-none transition-colors shadow-xs ${
                      isLight
                        ? 'bg-white border border-slate-300 text-amber-600'
                        : 'bg-slate-900 border border-slate-700 text-amber-400'
                    }`}
                  />
                </div>
              </div>

              {/* Field 2: Issue Resolution Status Buttons (Matching Lead Status Pipeline in Leads Details) */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-1">
                  <Activity className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                  <label className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Resolution Status
                  </label>
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                    isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    Live Stage
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    'Under Investigation',
                    'Troubleshooting in Progress',
                    'Warranty Claim Logged with Brand',
                    'Technician Dispatched',
                    'Resolved - Complete Handover',
                    'Customer Closed'
                  ].map(st => {
                    const isActive = formData.issueResolutionStatus === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, issueResolutionStatus: st }))}
                        className={`px-2.5 py-1 rounded text-[10px] font-medium transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-xs'
                            : isLight
                            ? 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-2xs'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Context Summary Badges on right side */}
            <div className={`hidden md:flex items-center gap-3 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${
                isLight ? 'bg-white border-slate-300 text-slate-700 shadow-2xs' : 'bg-slate-900 border-slate-700 text-slate-200'
              }`}>
                <span className={`text-[10px] uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Customer:</span>
                <span className={`font-semibold truncate max-w-[140px] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {formData.firstName || formData.lastName
                    ? `${formData.firstName} ${formData.lastName}`.trim()
                    : 'Customer'}
                </span>
              </div>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${
                isLight ? 'bg-white border-slate-300 text-slate-700 shadow-2xs' : 'bg-slate-900 border-slate-700 text-slate-200'
              }`}>
                <span className={`text-[10px] uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Total Amount:</span>
                <span className={`font-mono font-bold text-emerald-400`}>
                  {formData.totalServiceIssueAmount || '$0.00'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3-COLUMN LAYOUT (FOLLOWING LEADS DETAILS STRUCTURE) */}
        <div
          className={`flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden transition-colors ${
            isLight ? 'bg-slate-50/50' : 'bg-slate-950/40'
          }`}
        >
          {/* COLUMN 1: LEFT SIDEBAR (Ticket Details & Hardware Sections) */}
          <div className="lg:col-span-4 xl:col-span-4 overflow-y-auto pr-2 custom-scrollbar">
            <div className="mb-2 flex items-center justify-between pb-1">
              <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                Ticket Details
              </span>
              <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Left Column</span>
            </div>
            <TicketDetailsLeftPanel
              formData={formData}
              setFormData={setFormData}
              dropdowns={dropdowns}
              completedProjects={completedProjects}
              subContractors={subContractors}
              systemUsers={systemUsers}
              onProjectSelect={handleProjectSelect}
              isLight={isLight}
            />
          </div>

          {/* COLUMN 2: CENTER COLUMN (Overview & Activity Timeline) */}
          <div
            className={`lg:col-span-5 xl:col-span-5 overflow-y-auto pr-2 custom-scrollbar flex flex-col rounded-xl border p-3.5 transition-colors ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <TicketCenterTabs
              formData={formData}
              activities={activities}
              onAddActivity={handleAddActivity}
              onToggleTask={handleToggleTask}
              onDeleteActivity={handleDeleteActivity}
              isLight={isLight}
            />
          </div>

          {/* COLUMN 3: RIGHT SIDEBAR (Customer Contact, Financials AUD, Attachments & Photos) */}
          <div className="lg:col-span-3 xl:col-span-3 overflow-y-auto pr-1 custom-scrollbar">
            <div className="mb-2 flex items-center justify-between pb-1">
              <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                CRM &amp; Financials
              </span>
              <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Right Column</span>
            </div>
            <TicketRightSidebar
              formData={formData}
              setFormData={setFormData}
              attachments={attachments}
              onAddAttachment={handleAddAttachment}
              onDeleteAttachment={handleDeleteAttachment}
              isLight={isLight}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
