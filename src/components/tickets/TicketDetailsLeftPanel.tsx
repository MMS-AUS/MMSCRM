import React, { useState } from 'react';
import {
  Calendar,
  User,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Building2,
  ShieldCheck,
  AlertCircle,
  Sun,
  Zap,
  Battery,
  Wrench,
  FileText,
  Clock,
  CheckCircle2,
  Hash,
  Truck,
  Plus,
  Trash2,
  ChevronDown
} from 'lucide-react';
import { Project, SubContractor, DynamicDropdownConfig, UserProfile } from '../../types';
import { formatAudAccounts, parseAudAccounts } from '../../utils/australianPostcodes';

export interface TicketDetailsFormData {
  ticketId: string;
  installationProjectNo: string;
  installationDate: string;
  firstName: string;
  lastName: string;
  contactNumber: string;
  emailId: string;
  address: string;
  suburb: string;
  postCode: string;
  state: string;
  phase: string;
  storeyType: string;

  // Issue Details
  issueRecorded: string;
  initialCheck: string;
  workRequired: string;
  issueResolutionStatus: string;

  // Existing Equipment
  noOfExistingInverters: number | string;
  existingInverterSerialNumber: string;
  existingInverterBrand: string;
  existingInverterModel: string;
  existingInverterSize: string;
  noOfExistingPanels: number | string;
  affectedPanelSerialNumber: string;
  existingPanelBrand: string;
  existingPanelModel: string;
  existingPanelSize: string;
  affectedBatterySerialNumber: string;
  existingBatteryBrand: string;
  existingBatteryModel: string;
  existingBatterySize: string;
  serviceIssueNotes: string;

  // Replaced Equipment
  noOfReplacedInverters: number | string;
  replacedInverterSerialNumber: string;
  replacedInverterBrand: string;
  replacedInverterModel: string;
  replacedInverterSize: string;
  noOfReplacedPanels: number | string;
  replacedPanelSerialNumber: string;
  replacedPanelBrand: string;
  replacedPanelModel: string;
  replacedPanelSize: string;
  replacedBatterySerialNumber: string;
  replacedBatteryBrand: string;
  replacedBatteryModel: string;
  replacedBatterySize: string;

  // Warranty Claim Section
  warrantyClaimDate: string;
  warrantyClaimId: string;
  warrantyClaimStatus: string;
  warrantyClaimInvoiceNumber: string;
  warrantyClaimInvoiceAmount: string;
  warrantyClaimInvoiceStatus: string;
  brandNotes: string;

  // Installer / Electrician / Sub-contractor Section
  isInstallerSubContractor: boolean;
  installerOrElectricianName: string;
  installerPhone: string;
  installerEmail: string;
  companyName: string;
  installerInvoiceDate: string;
  installerInvoiceNumber: string;
  installerInvoiceAmount: string;
  installerInvoiceStatus: string;
  installerElectricianNotes: string;

  // Resolution & Billing
  issueResolutionDate: string;
  serviceHandler: string;
  serviceCharge: string;
  totalServiceIssueAmount: string;
}

interface TicketDetailsLeftPanelProps {
  formData: TicketDetailsFormData;
  setFormData: React.Dispatch<React.SetStateAction<TicketDetailsFormData>>;
  dropdowns: DynamicDropdownConfig;
  completedProjects: Project[];
  subContractors: SubContractor[];
  systemUsers: UserProfile[];
  onProjectSelect: (projectIdOrCode: string) => void;
  isLight?: boolean;
}

export const TicketDetailsLeftPanel: React.FC<TicketDetailsLeftPanelProps> = ({
  formData,
  setFormData,
  dropdowns,
  completedProjects,
  subContractors,
  systemUsers,
  onProjectSelect,
  isLight = false
}) => {
  // Local state for combo box suggestions toggle
  const [showWorkRequiredPresets, setShowWorkRequiredPresets] = useState(false);
  const [showServiceNotesPresets, setShowServiceNotesPresets] = useState(false);
  const [showBrandNotesPresets, setShowBrandNotesPresets] = useState(false);
  const [showInstallerNotesPresets, setShowInstallerNotesPresets] = useState(false);

  const handleChange = (field: keyof TicketDetailsFormData, value: any) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };

      // Auto calculate Total Amount if Service Charge or other amounts change
      if (field === 'serviceCharge') {
        const scVal = parseAudAccounts(String(value));
        const totalVal = Math.max(0, scVal);
        next.totalServiceIssueAmount = formatAudAccounts(totalVal);
      }

      return next;
    });
  };

  const handleInstallerSubcontractorSelect = (subName: string) => {
    const selectedSub = subContractors.find(s => s.name === subName || s.companyName === subName);
    if (selectedSub) {
      setFormData(prev => ({
        ...prev,
        installerOrElectricianName: selectedSub.name,
        installerPhone: selectedSub.phone,
        installerEmail: selectedSub.email,
        companyName: selectedSub.companyName
      }));
    } else {
      handleChange('installerOrElectricianName', subName);
    }
  };

  // Helper styles matching LeadDetailsLeftPanel
  const sectionHeaderClass = `text-xs font-bold uppercase tracking-wider flex items-center gap-2 pb-2 mb-3 border-b ${
    isLight ? 'text-slate-800 border-slate-200' : 'text-slate-200 border-slate-800'
  }`;
  const labelClass = `text-[11px] font-semibold flex items-center justify-between mb-1 ${
    isLight ? 'text-slate-700' : 'text-slate-300'
  }`;
  const inputClass = `w-full px-2.5 py-1.5 rounded-lg text-xs transition-colors shadow-2xs outline-none ${
    isLight
      ? 'bg-white border border-slate-300 hover:border-slate-400 focus:border-amber-500 text-slate-900 placeholder-slate-400'
      : 'bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-amber-500 text-slate-100 placeholder-slate-500'
  }`;
  const autoInputClass = `w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors outline-none cursor-not-allowed ${
    isLight
      ? 'bg-slate-100 border border-slate-300 text-slate-800'
      : 'bg-slate-800/80 border border-slate-700/80 text-slate-200'
  }`;
  const selectClass = `w-full px-2.5 py-1.5 rounded-lg text-xs transition-colors shadow-2xs outline-none cursor-pointer ${
    isLight
      ? 'bg-white border border-slate-300 hover:border-slate-400 focus:border-amber-500 text-slate-900'
      : 'bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-amber-500 text-slate-100'
  }`;
  const badgeAuto = `text-[9px] font-mono px-1.5 py-0.2 rounded border ${
    isLight ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
  }`;

  return (
    <div className="space-y-6 pb-6 text-xs">
      {/* SECTION 1: TICKET IDENTIFIERS & PROJECT LINKAGE */}
      <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/70 border-slate-800'}`}>
        <div className={sectionHeaderClass}>
          <Hash className="w-4 h-4 text-amber-500" />
          <span>Ticket Identification &amp; Project</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Ticket ID - Text Field - Auto Generated */}
          <div>
            <label className={labelClass}>
              <span>Ticket ID</span>
              <span className={badgeAuto}>Auto Generated</span>
            </label>
            <input
              type="text"
              readOnly
              value={formData.ticketId}
              className={`${autoInputClass} font-mono font-bold text-amber-500`}
            />
          </div>

          {/* Installation Project No. - Dropdown List from Completed Projects */}
          <div>
            <label className={labelClass}>
              <span>Installation Project No.</span>
              <span className="text-[10px] text-emerald-500 font-semibold">Completed Only</span>
            </label>
            <select
              value={formData.installationProjectNo}
              onChange={e => {
                handleChange('installationProjectNo', e.target.value);
                onProjectSelect(e.target.value);
              }}
              className={`${selectClass} font-semibold`}
            >
              <option value="">-- Select Completed Project --</option>
              {completedProjects.map(proj => (
                <option key={proj.id} value={proj.projectCode || proj.id}>
                  {proj.projectCode} • {proj.customerName} ({proj.suburb}, {proj.state})
                </option>
              ))}
            </select>
            {completedProjects.length === 0 && (
              <p className="text-[10px] text-amber-500 mt-1">No completed projects found in database.</p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: CUSTOMER & SITE DETAILS (AUTO POPULATED) */}
      <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/70 border-slate-800'}`}>
        <div className={sectionHeaderClass}>
          <User className="w-4 h-4 text-blue-500" />
          <span>Customer &amp; Site Details (From Project)</span>
        </div>

        <div className="space-y-3">
          {/* Installation Date */}
          <div>
            <label className={labelClass}>
              <span>Installation Date</span>
              <span className={badgeAuto}>Auto Populate</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={formData.installationDate}
                onChange={e => handleChange('installationDate', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Customer Name */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>
                <span>First Name</span>
                <span className={badgeAuto}>Auto</span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={e => handleChange('firstName', e.target.value)}
                placeholder="First name"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                <span>Last Name</span>
                <span className={badgeAuto}>Auto</span>
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={e => handleChange('lastName', e.target.value)}
                placeholder="Last name"
                className={inputClass}
              />
            </div>
          </div>

          {/* Contact Number & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>
                <span>Contact Number</span>
                <span className={badgeAuto}>Auto</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.contactNumber}
                  onChange={e => handleChange('contactNumber', e.target.value)}
                  placeholder="04xx xxx xxx"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>
                <span>Email ID</span>
                <span className={badgeAuto}>Auto</span>
              </label>
              <input
                type="email"
                value={formData.emailId}
                onChange={e => handleChange('emailId', e.target.value)}
                placeholder="customer@email.com"
                className={inputClass}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className={labelClass}>
              <span>Address</span>
              <span className={badgeAuto}>Auto</span>
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={e => handleChange('address', e.target.value)}
              placeholder="Street address"
              className={inputClass}
            />
          </div>

          {/* Suburb, Post Code, State */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelClass}>
                <span>Suburb</span>
                <span className={badgeAuto}>Auto</span>
              </label>
              <input
                type="text"
                value={formData.suburb}
                onChange={e => handleChange('suburb', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                <span>Post Code</span>
                <span className={badgeAuto}>Auto</span>
              </label>
              <input
                type="text"
                value={formData.postCode}
                onChange={e => handleChange('postCode', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                <span>State</span>
                <span className={badgeAuto}>Auto</span>
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={e => handleChange('state', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Phase & Storey Type */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>
                <span>Phase</span>
                <span className={badgeAuto}>Auto</span>
              </label>
              <select
                value={formData.phase}
                onChange={e => handleChange('phase', e.target.value)}
                className={selectClass}
              >
                <option value="Single Phase">Single Phase</option>
                <option value="Three Phase">Three Phase</option>
                <option value="Two Phase">Two Phase</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>
                <span>Storey Type</span>
                <span className={badgeAuto}>Auto</span>
              </label>
              <select
                value={formData.storeyType}
                onChange={e => handleChange('storeyType', e.target.value)}
                className={selectClass}
              >
                <option value="Single Storey">Single Storey</option>
                <option value="Double Storey">Double Storey</option>
                <option value="Triple Storey">Triple Storey</option>
                <option value="Split Level">Split Level</option>
                <option value="Commercial Multi-Level">Commercial Multi-Level</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: ISSUE & DIAGNOSTICS */}
      <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/70 border-slate-800'}`}>
        <div className={sectionHeaderClass}>
          <Wrench className="w-4 h-4 text-rose-500" />
          <span>Issue Diagnostics &amp; Work Required</span>
        </div>

        <div className="space-y-3">
          {/* Issue Recorded - Dropdown managed from Settings */}
          <div>
            <label className={labelClass}>
              <span>Issue Recorded</span>
              <span className="text-[10px] text-slate-400">Managed in Settings</span>
            </label>
            <select
              value={formData.issueRecorded}
              onChange={e => handleChange('issueRecorded', e.target.value)}
              className={selectClass}
            >
              <option value="">-- Select Recorded Issue --</option>
              {(dropdowns.ticketIssueRecordedOptions || [
                'Inverter Fault / Red Alarm Light',
                'No Generation / Zero Daily Yield',
                'Error Code (Ground Fault / Isolation Error)',
                'Battery Discharging Failure / Offline',
                'Monitoring Dongle Offline / Wi-Fi Drop',
                'Solar System Tripping Circuit Breaker',
                'Panel Hotspot / Visible Damage',
                'Roof Leak Near Solar Brackets'
              ]).map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Initial Check - Dropdown managed from Settings */}
          <div>
            <label className={labelClass}>
              <span>Initial Check</span>
              <span className="text-[10px] text-slate-400">Managed in Settings</span>
            </label>
            <select
              value={formData.initialCheck}
              onChange={e => handleChange('initialCheck', e.target.value)}
              className={selectClass}
            >
              <option value="">-- Select Initial Diagnostic Check --</option>
              {(dropdowns.ticketInitialCheckOptions || [
                'Remote Portal Telemetry Verification',
                'DC Isolator Check (Passed)',
                'AC Main Switch Check (Passed)',
                'Inverter Error Code Diagnostic Run',
                'Battery State of Charge (SoC) Inspection',
                'Grid Overvoltage Tripping Check',
                'Wi-Fi RSSI Signal Check',
                'Customer Troubleshooting Guided via Phone',
                'Physical On-Site Inspection Required'
              ]).map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Work Required - Combo Box (Input with preset quick-select buttons) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelClass}>
                <span>Work Required</span>
                <span className="text-[10px] text-amber-500 font-semibold">Combo Box</span>
              </label>
              <button
                type="button"
                onClick={() => setShowWorkRequiredPresets(!showWorkRequiredPresets)}
                className={`text-[10px] flex items-center gap-1 font-semibold hover:underline ${
                  isLight ? 'text-amber-700' : 'text-amber-400'
                }`}
              >
                <span>{showWorkRequiredPresets ? 'Hide presets' : 'Select preset'}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            <textarea
              rows={2}
              value={formData.workRequired}
              onChange={e => handleChange('workRequired', e.target.value)}
              placeholder="Describe work required or click 'Select preset' above..."
              className={inputClass}
            />
            {showWorkRequiredPresets && (
              <div className={`mt-2 p-2 rounded-lg border space-y-1.5 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/80 border-slate-700'}`}>
                <p className="text-[10px] text-slate-400 font-semibold">Quick Presets (Click to insert):</p>
                <div className="flex flex-wrap gap-1.5">
                  {(dropdowns.ticketWorkRequiredOptions || [
                    'Inverter Replacement under Manufacturer Warranty',
                    'Firmware Upgrade & Inverter Re-commissioning',
                    'Replace Faulty DC Isolator / Rewire Cable',
                    'Panel Replacement & Recalibration',
                    'Wi-Fi Dongle Replacement & Setup',
                    'Battery Module Swap / BMS Reset',
                    'Switchboard RCD Upgrade'
                  ]).map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        handleChange('workRequired', preset);
                        setShowWorkRequiredPresets(false);
                      }}
                      className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                        isLight
                          ? 'bg-white hover:bg-amber-50 text-slate-700 border-slate-300'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Issue Resolution Status - Dropdown managed from Settings */}
          <div>
            <label className={labelClass}>
              <span>Issue Resolution Status</span>
              <span className="text-[10px] text-slate-400">Managed in Settings</span>
            </label>
            <select
              value={formData.issueResolutionStatus}
              onChange={e => handleChange('issueResolutionStatus', e.target.value)}
              className={`${selectClass} font-semibold`}
            >
              {(dropdowns.ticketIssueResolutionStatuses || [
                'Under Investigation',
                'Troubleshooting in Progress',
                'Warranty Claim Logged with Brand',
                'Awaiting Replacement Hardware',
                'Technician Dispatched',
                'On-Site Work Completed',
                'Monitoring Stable & Verified',
                'Resolved - Complete Handover',
                'Claim Denied by Manufacturer',
                'Customer Closed'
              ]).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 4: EXISTING HARDWARE / EQUIPMENT DETAILS (AUTO POPULATED FROM PROJECT) */}
      <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/70 border-slate-800'}`}>
        <div className={sectionHeaderClass}>
          <Sun className="w-4 h-4 text-amber-500" />
          <span>Existing Hardware (Auto Populated From Project)</span>
        </div>

        <div className="space-y-4">
          {/* Existing Inverter */}
          <div className={`p-2.5 rounded-lg border space-y-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/60'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Inverter Details
              </span>
              <span className={badgeAuto}>Auto Populated</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className={labelClass}>No. of Existing Inverters</label>
                <input
                  type="number"
                  min="0"
                  value={formData.noOfExistingInverters}
                  onChange={e => handleChange('noOfExistingInverters', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Brand</label>
                <input
                  type="text"
                  value={formData.existingInverterBrand}
                  onChange={e => handleChange('existingInverterBrand', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Model</label>
                <input
                  type="text"
                  value={formData.existingInverterModel}
                  onChange={e => handleChange('existingInverterModel', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Size</label>
                <input
                  type="text"
                  value={formData.existingInverterSize}
                  onChange={e => handleChange('existingInverterSize', e.target.value)}
                  placeholder="e.g. 5.0 kW"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>
                <span>Inverter Serial Number(s)</span>
                <span className="text-[9px] text-slate-400">Supports multiple serials (comma or line separated)</span>
              </label>
              <textarea
                rows={2}
                value={formData.existingInverterSerialNumber}
                onChange={e => handleChange('existingInverterSerialNumber', e.target.value)}
                placeholder="e.g. INV-SN-8829104, INV-SN-8829105"
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          {/* Existing Panels */}
          <div className={`p-2.5 rounded-lg border space-y-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/60'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5" />
                Solar Panel Details
              </span>
              <span className={badgeAuto}>Auto Populated</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className={labelClass}>No. of Existing Panels</label>
                <input
                  type="number"
                  min="0"
                  value={formData.noOfExistingPanels}
                  onChange={e => handleChange('noOfExistingPanels', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Brand</label>
                <input
                  type="text"
                  value={formData.existingPanelBrand}
                  onChange={e => handleChange('existingPanelBrand', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Model</label>
                <input
                  type="text"
                  value={formData.existingPanelModel}
                  onChange={e => handleChange('existingPanelModel', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Size</label>
                <input
                  type="text"
                  value={formData.existingPanelSize}
                  onChange={e => handleChange('existingPanelSize', e.target.value)}
                  placeholder="e.g. 440W"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>
                <span>Affected Panel Serial Number(s)</span>
                <span className="text-[9px] text-slate-400">Multiple serials separated by comma or new line</span>
              </label>
              <textarea
                rows={2}
                value={formData.affectedPanelSerialNumber}
                onChange={e => handleChange('affectedPanelSerialNumber', e.target.value)}
                placeholder="e.g. PNL-2026-9901, PNL-2026-9902"
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          {/* Existing Battery */}
          <div className={`p-2.5 rounded-lg border space-y-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/60'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1.5">
                <Battery className="w-3.5 h-3.5" />
                Battery Storage Details
              </span>
              <span className={badgeAuto}>Auto Populated</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className={labelClass}>Brand</label>
                <input
                  type="text"
                  value={formData.existingBatteryBrand}
                  onChange={e => handleChange('existingBatteryBrand', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Model</label>
                <input
                  type="text"
                  value={formData.existingBatteryModel}
                  onChange={e => handleChange('existingBatteryModel', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Size / Capacity</label>
                <input
                  type="text"
                  value={formData.existingBatterySize}
                  onChange={e => handleChange('existingBatterySize', e.target.value)}
                  placeholder="e.g. 9.6 kWh"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>
                <span>Affected Battery Serial Number(s)</span>
                <span className="text-[9px] text-slate-400">Multiple serials separated by comma or new line</span>
              </label>
              <textarea
                rows={2}
                value={formData.affectedBatterySerialNumber}
                onChange={e => handleChange('affectedBatterySerialNumber', e.target.value)}
                placeholder="e.g. BAT-SBR-0012491"
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          {/* Service Issue Notes - Combo Box */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelClass}>
                <span>Service Issue Notes</span>
                <span className="text-[10px] text-amber-500 font-semibold">Combo Box</span>
              </label>
              <button
                type="button"
                onClick={() => setShowServiceNotesPresets(!showServiceNotesPresets)}
                className={`text-[10px] flex items-center gap-1 font-semibold hover:underline ${
                  isLight ? 'text-amber-700' : 'text-amber-400'
                }`}
              >
                <span>{showServiceNotesPresets ? 'Hide presets' : 'Select preset'}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            <textarea
              rows={2}
              value={formData.serviceIssueNotes}
              onChange={e => handleChange('serviceIssueNotes', e.target.value)}
              placeholder="Notes on hardware physical condition, inspection findings..."
              className={inputClass}
            />
            {showServiceNotesPresets && (
              <div className={`mt-2 p-2 rounded-lg border space-y-1.5 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/80 border-slate-700'}`}>
                <p className="text-[10px] text-slate-400 font-semibold">Quick Presets:</p>
                <div className="space-y-1">
                  {(dropdowns.ticketServiceIssueNotesPresets || [
                    'Customer noted inverter alarm started after weekend lightning storm.',
                    'Zero kWh generation verified on smart meter for 3 consecutive days.',
                    'Isolation resistance fault detected during early morning dew.',
                    'Monitoring app disconnected following NBN router upgrade; 2.4GHz network required.'
                  ]).map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        handleChange('serviceIssueNotes', preset);
                        setShowServiceNotesPresets(false);
                      }}
                      className={`w-full text-left text-[10px] p-1.5 rounded border transition-colors ${
                        isLight
                          ? 'bg-white hover:bg-amber-50 text-slate-700 border-slate-300'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 5: REPLACED EQUIPMENT (NEW / REPLACEMENT HARDWARE) */}
      <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/70 border-slate-800'}`}>
        <div className={sectionHeaderClass}>
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Replaced Equipment (Replacement Hardware Details)</span>
        </div>

        <div className="space-y-4">
          {/* Replaced Inverter */}
          <div className={`p-2.5 rounded-lg border space-y-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/60'}`}>
            <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Replaced Inverter
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className={labelClass}>No. of Replaced Inverters</label>
                <input
                  type="number"
                  min="0"
                  value={formData.noOfReplacedInverters}
                  onChange={e => handleChange('noOfReplacedInverters', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Brand</label>
                <select
                  value={formData.replacedInverterBrand}
                  onChange={e => handleChange('replacedInverterBrand', e.target.value)}
                  className={selectClass}
                >
                  <option value="">-- Select Brand --</option>
                  {(dropdowns.inverterBrands || ['Fronius', 'Sungrow', 'Enphase', 'SolarEdge', 'GoodWe']).map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Model</label>
                <input
                  type="text"
                  value={formData.replacedInverterModel}
                  onChange={e => handleChange('replacedInverterModel', e.target.value)}
                  placeholder="Model name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Size</label>
                <input
                  type="text"
                  value={formData.replacedInverterSize}
                  onChange={e => handleChange('replacedInverterSize', e.target.value)}
                  placeholder="e.g. 5.0 kW"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>
                <span>Replaced Inverter Serial Number(s)</span>
                <span className="text-[9px] text-slate-400">Multiple serials separated by comma or new line</span>
              </label>
              <textarea
                rows={2}
                value={formData.replacedInverterSerialNumber}
                onChange={e => handleChange('replacedInverterSerialNumber', e.target.value)}
                placeholder="Serial numbers of replacement inverters installed"
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          {/* Replaced Panels */}
          <div className={`p-2.5 rounded-lg border space-y-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/60'}`}>
            <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5" />
              Replaced Solar Panels
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className={labelClass}>No. of Replaced Panels</label>
                <input
                  type="number"
                  min="0"
                  value={formData.noOfReplacedPanels}
                  onChange={e => handleChange('noOfReplacedPanels', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Brand</label>
                <select
                  value={formData.replacedPanelBrand}
                  onChange={e => handleChange('replacedPanelBrand', e.target.value)}
                  className={selectClass}
                >
                  <option value="">-- Select Brand --</option>
                  {(dropdowns.panelBrands || ['AIKO Solar', 'Jinko Solar', 'Trina Solar', 'Canadian Solar']).map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Model</label>
                <input
                  type="text"
                  value={formData.replacedPanelModel}
                  onChange={e => handleChange('replacedPanelModel', e.target.value)}
                  placeholder="Model name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Size</label>
                <input
                  type="text"
                  value={formData.replacedPanelSize}
                  onChange={e => handleChange('replacedPanelSize', e.target.value)}
                  placeholder="e.g. 440W"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>
                <span>Replaced Panel Serial Number(s)</span>
                <span className="text-[9px] text-slate-400">Multiple serials separated by comma or new line</span>
              </label>
              <textarea
                rows={2}
                value={formData.replacedPanelSerialNumber}
                onChange={e => handleChange('replacedPanelSerialNumber', e.target.value)}
                placeholder="Serial numbers of replacement panels installed"
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          {/* Replaced Battery */}
          <div className={`p-2.5 rounded-lg border space-y-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/60'}`}>
            <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1.5">
              <Battery className="w-3.5 h-3.5" />
              Replaced Battery Storage
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className={labelClass}>Brand</label>
                <select
                  value={formData.replacedBatteryBrand}
                  onChange={e => handleChange('replacedBatteryBrand', e.target.value)}
                  className={selectClass}
                >
                  <option value="">-- Select Brand --</option>
                  {(dropdowns.batteryBrands || ['Tesla Powerwall 3', 'Sungrow SBR', 'Sigenergy SigenStor']).map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Model</label>
                <input
                  type="text"
                  value={formData.replacedBatteryModel}
                  onChange={e => handleChange('replacedBatteryModel', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Size / Capacity</label>
                <input
                  type="text"
                  value={formData.replacedBatterySize}
                  onChange={e => handleChange('replacedBatterySize', e.target.value)}
                  placeholder="e.g. 10.0 kWh"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>
                <span>Replaced Battery Serial Number(s)</span>
                <span className="text-[9px] text-slate-400">Multiple serials separated by comma or new line</span>
              </label>
              <textarea
                rows={2}
                value={formData.replacedBatterySerialNumber}
                onChange={e => handleChange('replacedBatterySerialNumber', e.target.value)}
                placeholder="Serial numbers of replacement battery modules installed"
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 6: WARRANTY CLAIM SECTION */}
      <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/70 border-slate-800'}`}>
        <div className={sectionHeaderClass}>
          <ShieldCheck className="w-4 h-4 text-purple-500" />
          <span>Warranty Claim (Brand &amp; Manufacturer)</span>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className={labelClass}>Warranty Claim Date</label>
              <input
                type="date"
                value={formData.warrantyClaimDate}
                onChange={e => handleChange('warrantyClaimDate', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Warranty Claim ID</label>
              <input
                type="text"
                value={formData.warrantyClaimId}
                onChange={e => handleChange('warrantyClaimId', e.target.value)}
                placeholder="e.g. RMA-SUN-2026-99"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                <span>Warranty Claim Status</span>
                <span className="text-[10px] text-slate-400">Settings</span>
              </label>
              <select
                value={formData.warrantyClaimStatus}
                onChange={e => handleChange('warrantyClaimStatus', e.target.value)}
                className={selectClass}
              >
                {(dropdowns.ticketWarrantyClaimStatuses || [
                  'Not Applicable',
                  'Draft Claim',
                  'Submitted to Manufacturer',
                  'RMA Issued',
                  'Replacement Dispatched by Brand',
                  'Replacement Received & Tested',
                  'Warranty Approved & Credited'
                ]).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className={labelClass}>Claim Invoice Number</label>
              <input
                type="text"
                value={formData.warrantyClaimInvoiceNumber}
                onChange={e => handleChange('warrantyClaimInvoiceNumber', e.target.value)}
                placeholder="INV-CLM-001"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                <span>Invoice Amount</span>
                <span className="text-[10px] text-emerald-500 font-semibold">$ AUD</span>
              </label>
              <input
                type="text"
                value={formData.warrantyClaimInvoiceAmount}
                onChange={e => handleChange('warrantyClaimInvoiceAmount', e.target.value)}
                onBlur={() => {
                  if (formData.warrantyClaimInvoiceAmount) {
                    handleChange('warrantyClaimInvoiceAmount', formatAudAccounts(parseAudAccounts(formData.warrantyClaimInvoiceAmount)));
                  }
                }}
                placeholder="$0.00"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className={labelClass}>
                <span>Invoice Status</span>
                <span className="text-[10px] text-slate-400">Settings</span>
              </label>
              <select
                value={formData.warrantyClaimInvoiceStatus}
                onChange={e => handleChange('warrantyClaimInvoiceStatus', e.target.value)}
                className={selectClass}
              >
                {(dropdowns.ticketWarrantyClaimInvoiceStatuses || [
                  'Pending Claim Review',
                  'Claim Approved - Awaiting Credit',
                  'Manufacturer Rebate Received',
                  'Invoice Paid',
                  'No Charge / Full Warranty Replacement'
                ]).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Brand Notes - Combo Box */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelClass}>
                <span>Brand Notes</span>
                <span className="text-[10px] text-amber-500 font-semibold">Combo Box</span>
              </label>
              <button
                type="button"
                onClick={() => setShowBrandNotesPresets(!showBrandNotesPresets)}
                className={`text-[10px] flex items-center gap-1 font-semibold hover:underline ${
                  isLight ? 'text-amber-700' : 'text-amber-400'
                }`}
              >
                <span>{showBrandNotesPresets ? 'Hide presets' : 'Select preset'}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            <textarea
              rows={2}
              value={formData.brandNotes}
              onChange={e => handleChange('brandNotes', e.target.value)}
              placeholder="Enter brand RMA correspondence, tracking links or select preset..."
              className={inputClass}
            />
            {showBrandNotesPresets && (
              <div className={`mt-2 p-2 rounded-lg border space-y-1 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/80 border-slate-700'}`}>
                <p className="text-[10px] text-slate-400 font-semibold">Brand Presets:</p>
                <div className="space-y-1">
                  {(dropdowns.ticketBrandNotesPresets || [
                    'Claim submitted via Sungrow Service Portal. RMA number pending review.',
                    'Tesla Energy case logged. Certified Powerwall technician dispatch requested.',
                    'Fronius SOS portal warranty claim approved. Replacement unit shipped from Melbourne warehouse.',
                    'AIKO Solar technical support verified cell defect from electroluminescence photos.'
                  ]).map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        handleChange('brandNotes', preset);
                        setShowBrandNotesPresets(false);
                      }}
                      className={`w-full text-left text-[10px] p-1.5 rounded border transition-colors ${
                        isLight
                          ? 'bg-white hover:bg-amber-50 text-slate-700 border-slate-300'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 7: INSTALLER / ELECTRICIAN / SUB-CONTRACTOR */}
      <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/70 border-slate-800'}`}>
        <div className={sectionHeaderClass}>
          <Truck className="w-4 h-4 text-cyan-500" />
          <span>Installer / Electrician / Sub-contractor</span>
        </div>

        <div className="space-y-3">
          {/* Check Box: Is Installer Sub-contractor? */}
          <div className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              id="isInstallerSubContractor"
              checked={formData.isInstallerSubContractor}
              onChange={e => handleChange('isInstallerSubContractor', e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
            />
            <label htmlFor="isInstallerSubContractor" className={`text-xs font-semibold cursor-pointer select-none ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              Sub-contractor Installer Assigned?
            </label>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
              formData.isInstallerSubContractor
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
            }`}>
              {formData.isInstallerSubContractor ? 'External Subcontractor' : 'In-House Electrician'}
            </span>
          </div>

          {/* Installer / Electrician Name (Select from Subcontractors or type) */}
          <div>
            <label className={labelClass}>
              <span>Installer / Electrician Name</span>
              <span className="text-[10px] text-slate-400">Select or enter</span>
            </label>
            {formData.isInstallerSubContractor && subContractors.length > 0 ? (
              <select
                value={formData.installerOrElectricianName}
                onChange={e => handleInstallerSubcontractorSelect(e.target.value)}
                className={selectClass}
              >
                <option value="">-- Choose Subcontractor --</option>
                {subContractors.map(sub => (
                  <option key={sub.id} value={sub.name}>
                    {sub.name} • {sub.companyName} ({sub.state})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={formData.installerOrElectricianName}
                onChange={e => handleChange('installerOrElectricianName', e.target.value)}
                placeholder="Electrician / Sub-contractor name"
                className={inputClass}
              />
            )}
          </div>

          {/* Phone, Email, Company Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className={labelClass}>Contact Number</label>
              <input
                type="text"
                value={formData.installerPhone}
                onChange={e => handleChange('installerPhone', e.target.value)}
                placeholder="04xx xxx xxx"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email ID</label>
              <input
                type="email"
                value={formData.installerEmail}
                onChange={e => handleChange('installerEmail', e.target.value)}
                placeholder="installer@crew.com.au"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Company Name</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={e => handleChange('companyName', e.target.value)}
                placeholder="Company / Electrical entity"
                className={inputClass}
              />
            </div>
          </div>

          {/* Invoice Date, Number, Amount, Status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className={labelClass}>Invoice Date</label>
              <input
                type="date"
                value={formData.installerInvoiceDate}
                onChange={e => handleChange('installerInvoiceDate', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Invoice Number</label>
              <input
                type="text"
                value={formData.installerInvoiceNumber}
                onChange={e => handleChange('installerInvoiceNumber', e.target.value)}
                placeholder="SUB-INV-001"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                <span>Invoice Amount</span>
                <span className="text-[10px] text-emerald-500 font-semibold">$ AUD</span>
              </label>
              <input
                type="text"
                value={formData.installerInvoiceAmount}
                onChange={e => handleChange('installerInvoiceAmount', e.target.value)}
                onBlur={() => {
                  if (formData.installerInvoiceAmount) {
                    handleChange('installerInvoiceAmount', formatAudAccounts(parseAudAccounts(formData.installerInvoiceAmount)));
                  }
                }}
                placeholder="$0.00"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className={labelClass}>
                <span>Invoice Status</span>
                <span className="text-[10px] text-slate-400">Settings</span>
              </label>
              <select
                value={formData.installerInvoiceStatus}
                onChange={e => handleChange('installerInvoiceStatus', e.target.value)}
                className={selectClass}
              >
                {(dropdowns.installerInvoiceStatuses || [
                  'Pending Approval',
                  'Approved',
                  'Paid',
                  'Disputed',
                  'On Hold'
                ]).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Installer / Electrician Notes - Combo Box */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelClass}>
                <span>Installer / Electrician Notes</span>
                <span className="text-[10px] text-amber-500 font-semibold">Combo Box</span>
              </label>
              <button
                type="button"
                onClick={() => setShowInstallerNotesPresets(!showInstallerNotesPresets)}
                className={`text-[10px] flex items-center gap-1 font-semibold hover:underline ${
                  isLight ? 'text-amber-700' : 'text-amber-400'
                }`}
              >
                <span>{showInstallerNotesPresets ? 'Hide presets' : 'Select preset'}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            <textarea
              rows={2}
              value={formData.installerElectricianNotes}
              onChange={e => handleChange('installerElectricianNotes', e.target.value)}
              placeholder="Electrician field remarks, testing results, commissioning signatures..."
              className={inputClass}
            />
            {showInstallerNotesPresets && (
              <div className={`mt-2 p-2 rounded-lg border space-y-1 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/80 border-slate-700'}`}>
                <p className="text-[10px] text-slate-400 font-semibold">Field Presets:</p>
                <div className="space-y-1">
                  {(dropdowns.ticketInstallerNotesPresets || [
                    'Licensed CEC electrician attended site; tested DC voltage and found open circuit string 2.',
                    'Replaced faulty inverter under warranty; completed full commissioning and zero export test.',
                    'Installed replacement 440W panel, verified Voc and Isc, re-tested earth continuity.',
                    'Fixed loose Wi-Fi antenna connection; confirmed cloud sync active on Sungrow iSolarCloud.'
                  ]).map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        handleChange('installerElectricianNotes', preset);
                        setShowInstallerNotesPresets(false);
                      }}
                      className={`w-full text-left text-[10px] p-1.5 rounded border transition-colors ${
                        isLight
                          ? 'bg-white hover:bg-amber-50 text-slate-700 border-slate-300'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 8: RESOLUTION & BILLING */}
      <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/70 border-slate-800'}`}>
        <div className={sectionHeaderClass}>
          <DollarSign className="w-4 h-4 text-emerald-500" />
          <span>Resolution &amp; Service Financials</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Issue Resolution Status - Dropdown managed from Settings */}
          <div>
            <label className={labelClass}>
              <span>Issue Resolution Status</span>
              <span className="text-[10px] text-slate-400">Settings Managed</span>
            </label>
            <select
              value={formData.issueResolutionStatus}
              onChange={e => handleChange('issueResolutionStatus', e.target.value)}
              className={`${selectClass} font-semibold`}
            >
              {(dropdowns.ticketIssueResolutionStatuses || [
                'Under Investigation',
                'Troubleshooting in Progress',
                'Warranty Claim Logged with Brand',
                'Awaiting Brand Replacement Dispatch',
                'Technician Dispatched / On-Site',
                'Hardware Replaced & Tested',
                'Monitoring Restored',
                'Customer Confirmed Resolved',
                'Closed - Out of Warranty',
                'Resolved'
              ]).map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Issue Resolution Date */}
          <div>
            <label className={labelClass}>Issue Resolution Date</label>
            <input
              type="date"
              value={formData.issueResolutionDate}
              onChange={e => handleChange('issueResolutionDate', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Service Handler - Dropdown populated based on users in settings */}
          <div>
            <label className={labelClass}>
              <span>Service Handler</span>
              <span className="text-[10px] text-slate-400">Settings Users</span>
            </label>
            <select
              value={formData.serviceHandler}
              onChange={e => handleChange('serviceHandler', e.target.value)}
              className={selectClass}
            >
              <option value="">-- Assign Service Staff --</option>
              {systemUsers.map(user => (
                <option key={user.id} value={user.name}>
                  {user.name} ({user.department || user.role})
                </option>
              ))}
            </select>
          </div>

          {/* Service Charge - Accounts format ($ AUD) */}
          <div>
            <label className={labelClass}>
              <span>Service Charge</span>
              <span className="text-[10px] text-emerald-500 font-semibold">$ AUD Accounts</span>
            </label>
            <input
              type="text"
              value={formData.serviceCharge}
              onChange={e => handleChange('serviceCharge', e.target.value)}
              onBlur={() => {
                if (formData.serviceCharge) {
                  const parsed = parseAudAccounts(formData.serviceCharge);
                  handleChange('serviceCharge', formatAudAccounts(parsed));
                }
              }}
              placeholder="$0.00"
              className={`${inputClass} font-mono font-bold text-emerald-400`}
            />
          </div>

          {/* Total Amount - Accounts format ($ AUD) */}
          <div className="sm:col-span-2">
            <label className={labelClass}>
              <span>Total Amount</span>
              <span className="text-[10px] text-emerald-500 font-semibold">$ AUD Accounts</span>
            </label>
            <input
              type="text"
              value={formData.totalServiceIssueAmount}
              onChange={e => handleChange('totalServiceIssueAmount', e.target.value)}
              onBlur={() => {
                if (formData.totalServiceIssueAmount) {
                  const parsed = parseAudAccounts(formData.totalServiceIssueAmount);
                  handleChange('totalServiceIssueAmount', formatAudAccounts(parsed));
                }
              }}
              placeholder="$0.00"
              className={`${inputClass} font-mono font-bold text-emerald-400`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
