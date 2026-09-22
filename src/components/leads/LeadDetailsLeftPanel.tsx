import React, { useState } from 'react';
import { AustralianState } from '../../types';
import {
  classifyAustralianPostcode,
  getNearestBigCity,
  formatAustralianMobile,
  validateMultipleEmails,
  formatAudAccounts,
  parseAudAccounts,
  AUSTRALIAN_ADDRESS_DATABASE,
  AustralianAddressPreset
} from '../../utils/australianPostcodes';
import {
  Calendar,
  User,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Search,
  Sparkles,
  Sun,
  Zap,
  Battery,
  Layers,
  Home,
  FileText,
  CheckCircle2,
  AlertCircle,
  Hash,
  PhoneCall,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import { originateCall } from '../../services/voiplineService';
import { useApp } from '../../context/AppContext';

export interface LeadDetailsFormData {
  // Inbound & Pipeline
  projectNumber: string; // Project # - Editable, entered manually by the user
  leadDate: string;
  platform: string;
  salesPersonName: string;
  status: string;
  saleDate: string;
  depositReceivedDate: string;

  // Customer
  firstName: string;
  lastName: string;
  managerRenteeFirstName: string;
  managerRenteeLastName: string;

  // Company
  hasCompany: boolean;
  companyName: string;
  companyOwner: string;
  companyCreateDate: string;
  companyPhone: string;
  companyCity: string;
  companyCountry: string;
  companyType: string;
  companyAbn: string;

  // Address
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  area: 'Metro' | 'Regional' | string;
  nearestBigCity: string;
  addressVerified: boolean;

  // Communication
  primaryMobile: string;
  secondaryMobile: string;
  email: string;

  // Hardware & Site Specs (Section 4B)
  systemSizeKw: number;
  batteryRequired: boolean;
  roofType: string;
  noOfPanels: string;
  panelManufacturer: string;
  panelSizeW: string;
  panelSeries: string;
  panelModel: string;
  noOfInverters: string;
  inverterManufacturer: string;
  inverterSizeKw: string;
  inverterModel: string;
  noOfBatteries: string;
  batteryManufacturer: string;
  batteryUsableCapacityKwh: string;
  batteryModel: string;
  batterySize: string;
  houseStorey: string;
  phase: string;
  existingSystemDetails: string;
  docsReceived: string;
  docsReceivedDate: string;

  // Pricing
  systemPrice: string;
  sellingPrice: string;
  deposit: string;

  // Notes
  salesTeamNotes: string;
}

interface LeadDetailsLeftPanelProps {
  formData: LeadDetailsFormData;
  setFormData: React.Dispatch<React.SetStateAction<LeadDetailsFormData>>;
  dropdowns: any;
  panelManufacturers: string[];
  panelSizes: string[];
  panelSeriesList: string[];
  panelModels: string[];
  inverterManufacturers: string[];
  inverterSizes: string[];
  inverterModels: string[];
  batteryManufacturers: string[];
  batteryCapacities: string[];
  batteryModels: string[];
  batterySizes: string[];
  handlePanelManufacturerChange: (manuf: string) => void;
  handlePanelSizeChange: (size: string) => void;
  handlePanelSeriesChange: (series: string) => void;
  handleNoOfPanelsChange: (count: string) => void;
  handleInverterManufacturerChange: (manuf: string) => void;
  handleInverterSizeChange: (size: string) => void;
  handleBatteryManufacturerChange: (manuf: string) => void;
  handleBatteryCapacityChange: (cap: string) => void;
  onSave?: () => void;
}

export const LeadDetailsLeftPanel: React.FC<LeadDetailsLeftPanelProps> = ({
  formData,
  setFormData,
  dropdowns,
  panelManufacturers,
  panelSizes,
  panelSeriesList,
  panelModels,
  inverterManufacturers,
  inverterSizes,
  inverterModels,
  batteryManufacturers,
  batteryCapacities,
  batteryModels,
  batterySizes,
  handlePanelManufacturerChange,
  handlePanelSizeChange,
  handlePanelSeriesChange,
  handleNoOfPanelsChange,
  handleInverterManufacturerChange,
  handleInverterSizeChange,
  handleBatteryManufacturerChange,
  handleBatteryCapacityChange
}) => {
  const { setIsQuickSmsOpen, currentUser } = useApp();
  const [callingField, setCallingField] = useState<'primary' | 'secondary' | null>(null);
  const [callNotice, setCallNotice] = useState<string | null>(null);

  const handleCall = async (field: 'primary' | 'secondary', number: string) => {
    if (!number) return;
    setCallingField(field);
    setCallNotice(`Calling ${number} via VoIPLine Telecom AU...`);
    try {
      const res = await originateCall({
        userId: currentUser?.id || 'usr-1',
        calleeNumber: number
      });
      setCallNotice(res.message || `Call triggered to ${number}`);
    } catch (err: any) {
      setCallNotice(`Failed to place call: ${err.message}`);
    } finally {
      setCallingField(null);
      setTimeout(() => setCallNotice(null), 4500);
    }
  };

  const [addressSearchQuery, setAddressSearchQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<AustralianAddressPreset[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Address search helper
  const handleAddressInputChange = (val: string) => {
    setFormData(prev => ({ ...prev, address: val, addressVerified: false }));
    setAddressSearchQuery(val);

    if (val.trim().length >= 2) {
      const q = val.toLowerCase().trim();
      const matches = AUSTRALIAN_ADDRESS_DATABASE.filter(
        item =>
          item.address.toLowerCase().includes(q) ||
          item.suburb.toLowerCase().includes(q) ||
          item.postcode.includes(q)
      ).slice(0, 5);
      setAddressSuggestions(matches);
      setShowSuggestions(true);
    } else {
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectAddressSuggestion = (item: AustralianAddressPreset) => {
    const areaClass = classifyAustralianPostcode(item.postcode, item.state);
    const calculatedCity = getNearestBigCity(item.suburb, item.postcode, item.state);

    setFormData(prev => ({
      ...prev,
      address: item.address,
      suburb: item.suburb,
      state: item.state,
      postcode: item.postcode,
      area: areaClass,
      nearestBigCity: calculatedCity,
      addressVerified: true,
      companyCity: prev.companyCity || item.suburb
    }));
    setShowSuggestions(false);
  };

  // Australian mobile input formatting
  const handleMobileChange = (field: 'primaryMobile' | 'secondaryMobile', value: string) => {
    const formatted = formatAustralianMobile(value);
    setFormData(prev => ({
      ...prev,
      [field]: formatted,
      ...(field === 'primaryMobile' && !prev.companyPhone ? { companyPhone: formatted } : {})
    }));
  };

  // State change handler
  const handleStateChange = (newState: string) => {
    const calculatedArea = formData.postcode
      ? classifyAustralianPostcode(formData.postcode, newState)
      : formData.area;
    const calculatedCity = getNearestBigCity(formData.suburb, formData.postcode, newState);

    setFormData(prev => ({
      ...prev,
      state: newState,
      area: calculatedArea,
      nearestBigCity: calculatedCity,
      companyCity: prev.companyCity || calculatedCity
    }));
  };

  // Postcode change handler
  const handlePostcodeChange = (newPostcode: string) => {
    const cleanPc = newPostcode.replace(/[^0-9]/g, '').slice(0, 4);
    const calculatedArea = classifyAustralianPostcode(cleanPc, formData.state);
    const calculatedCity = getNearestBigCity(formData.suburb, cleanPc, formData.state);

    setFormData(prev => ({
      ...prev,
      postcode: cleanPc,
      area: calculatedArea,
      nearestBigCity: calculatedCity,
      companyCity: prev.companyCity || calculatedCity
    }));
  };

  // Suburb change handler
  const handleSuburbChange = (newSuburb: string) => {
    const calculatedCity = getNearestBigCity(newSuburb, formData.postcode, formData.state);
    setFormData(prev => ({
      ...prev,
      suburb: newSuburb,
      nearestBigCity: calculatedCity,
      companyCity: prev.companyCity || newSuburb
    }));
  };

  // Australian ABN validation and formatter helper
  const handleAbnChange = (raw: string) => {
    const cleanDigits = raw.replace(/\D/g, '').slice(0, 11);
    // Format as XX XXX XXX XXX
    let formattedAbn = cleanDigits;
    if (cleanDigits.length > 8) {
      formattedAbn = `${cleanDigits.slice(0, 2)} ${cleanDigits.slice(2, 5)} ${cleanDigits.slice(5, 8)} ${cleanDigits.slice(8)}`;
    } else if (cleanDigits.length > 5) {
      formattedAbn = `${cleanDigits.slice(0, 2)} ${cleanDigits.slice(2, 5)} ${cleanDigits.slice(5)}`;
    } else if (cleanDigits.length > 2) {
      formattedAbn = `${cleanDigits.slice(0, 2)} ${cleanDigits.slice(2)}`;
    }

    setFormData(prev => ({
      ...prev,
      companyAbn: formattedAbn
    }));
  };

  const emailValidation = validateMultipleEmails(formData.email);
  const isAbnValid = formData.companyAbn ? formData.companyAbn.replace(/\s+/g, '').length === 11 : false;

  return (
    <div className="space-y-6 text-sm text-gray-200">
      {/* SECTION 1: Inbound & Pipeline Configuration */}
      <section className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#bef26420] text-[#bef264] text-xs font-bold border border-[#bef26440]">
              1
            </span>
            <h3 className="font-semibold text-white text-sm tracking-wide">
              Inbound &amp; Pipeline Configuration
            </h3>
          </div>
          <span className="text-[11px] text-gray-400 bg-[#222] px-2 py-0.5 rounded border border-[#333]">
            Lead Details
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 flex items-center gap-1">
              <Hash className="w-3 h-3 text-[#bef264]" />
              <span>Project #</span>
              <span className="text-[10px] text-gray-500 font-normal ml-auto">Manual</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. PRJ-2026-001"
                value={formData.projectNumber}
                onChange={e => setFormData(prev => ({ ...prev, projectNumber: e.target.value }))}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono font-semibold text-[#bef264] placeholder-gray-600 focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Lead Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={formData.leadDate}
                onChange={e => setFormData(prev => ({ ...prev, leadDate: e.target.value }))}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Platform
            </label>
            <select
              value={formData.platform}
              onChange={e => setFormData(prev => ({ ...prev, platform: e.target.value }))}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            >
              <option value="">Select Platform...</option>
              {dropdowns.platforms?.map((p: string) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Sales Person Name
            </label>
            <select
              value={formData.salesPersonName}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  salesPersonName: e.target.value,
                  companyOwner: prev.companyOwner || e.target.value
                }))
              }
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            >
              <option value="">Select Sales Person...</option>
              {dropdowns.salesPersons?.map((s: string) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 flex items-center justify-between">
              <span>Lead Status</span>
              <span className="text-[10px] text-[#bef264] font-mono">Connected to Top</span>
            </label>
            <select
              value={formData.status}
              onChange={e => {
                const newStatus = e.target.value;
                const today = new Date().toISOString().split('T')[0];
                const mmddyyyy = `${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getDate()).padStart(2, '0')}/${new Date().getFullYear()}`;
                setFormData(prev => ({
                  ...prev,
                  status: newStatus,
                  saleDate: newStatus === 'Contract Signed' && !prev.saleDate ? today : prev.saleDate,
                  depositReceivedDate:
                    newStatus === 'Deposit Received' && !prev.depositReceivedDate ? mmddyyyy : prev.depositReceivedDate
                }));
              }}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white font-medium focus:border-[#bef264] focus:outline-none transition-colors"
            >
              {dropdowns.leadStatuses?.map((st: string) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Sale Date
            </label>
            <input
              type="date"
              value={formData.saleDate}
              onChange={e => setFormData(prev => ({ ...prev, saleDate: e.target.value }))}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Deposit Received Date (MM/DD/YYYY)
            </label>
            <input
              type="text"
              placeholder="e.g. 09/08/2026"
              value={formData.depositReceivedDate}
              onChange={e => setFormData(prev => ({ ...prev, depositReceivedDate: e.target.value }))}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>
        </div>
      </section>

      {/* SECTION 2: Customer & Manager / Rentee Details */}
      <section className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#bef26420] text-[#bef264] text-xs font-bold border border-[#bef26440]">
              2
            </span>
            <h3 className="font-semibold text-white text-sm tracking-wide">
              Customer &amp; Manager / Rentee Details
            </h3>
          </div>
          <span className="text-[11px] text-emerald-400 font-mono bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
            Auto Contact Sync
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              First Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="First name"
              value={formData.firstName}
              onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Last Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Last name"
              value={formData.lastName}
              onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Manager / Rentee First Name
            </label>
            <input
              type="text"
              placeholder="Optional manager first name"
              value={formData.managerRenteeFirstName}
              onChange={e => setFormData(prev => ({ ...prev, managerRenteeFirstName: e.target.value }))}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Manager / Rentee Last Name
            </label>
            <input
              type="text"
              placeholder="Optional manager last name"
              value={formData.managerRenteeLastName}
              onChange={e => setFormData(prev => ({ ...prev, managerRenteeLastName: e.target.value }))}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>
        </div>
      </section>

      {/* SECTION 3: Company Association & Commercial Details */}
      <section className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#bef26420] text-[#bef264] text-xs font-bold border border-[#bef26440]">
              3
            </span>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#bef264]" />
              <h3 className="font-semibold text-white text-sm tracking-wide">
                Company Association &amp; Commercial Details
              </h3>
            </div>
          </div>
          {formData.hasCompany && (
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              Active Company
            </span>
          )}
        </div>

        {/* Checkbox to activate / deactivate company fields */}
        <div className="p-3 bg-[#121212] rounded-lg border border-[#2e2e2e] flex items-start gap-3">
          <input
            id="lead-has-company-checkbox"
            type="checkbox"
            checked={formData.hasCompany}
            onChange={e => {
              const isChecked = e.target.checked;
              const today = new Date().toISOString().split('T')[0];
              setFormData(prev => ({
                ...prev,
                hasCompany: isChecked,
                companyOwner: prev.companyOwner || prev.salesPersonName || 'Mitchell Barnes',
                companyCreateDate: prev.companyCreateDate || today,
                companyCountry: prev.companyCountry || 'Australia',
                companyType: prev.companyType || 'Commercial Customer',
                companyCity: prev.companyCity || prev.suburb || prev.nearestBigCity || 'Sydney',
                companyPhone: prev.companyPhone || prev.primaryMobile || ''
              }));
            }}
            className="mt-0.5 w-4 h-4 rounded border-[#444] bg-[#222] text-[#bef264] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#bef264]"
          />
          <label htmlFor="lead-has-company-checkbox" className="text-xs text-gray-300 cursor-pointer select-none">
            <span className="font-medium text-white block">
              Associate / Create Commercial Company for this Lead
            </span>
            <span className="text-gray-400 text-[11px] block mt-0.5">
              Check this box to enable company fields and automatically create or link the company record in the CRM.
              If unchecked, this lead is treated as residential with no company association.
            </span>
          </label>
        </div>

        {/* Company Details Fields (Shown only if hasCompany is checked) */}
        {formData.hasCompany ? (
          <div className="space-y-4 pt-1 animate-fadeIn">
            <div className="p-2.5 rounded-lg bg-[#bef26410] border border-[#bef26425] text-xs text-[#d9f99d] flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-[#bef264]" />
              <span>
                Company record will be automatically created and attached to this lead upon saving.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* a. Company Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Company Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex Industrial Logistics Pty Ltd"
                  value={formData.companyName}
                  onChange={e => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
                />
              </div>

              {/* b. Company Owner */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Company Owner
                </label>
                <input
                  type="text"
                  placeholder="Sales Rep or Owner Name"
                  value={formData.companyOwner}
                  onChange={e => setFormData(prev => ({ ...prev, companyOwner: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
                />
              </div>

              {/* c. Create Date */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Create Date
                </label>
                <input
                  type="date"
                  value={formData.companyCreateDate}
                  onChange={e => setFormData(prev => ({ ...prev, companyCreateDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
                />
              </div>

              {/* d. Phone Number */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 02 9123 4567 or 0400 000 000"
                  value={formData.companyPhone}
                  onChange={e => setFormData(prev => ({ ...prev, companyPhone: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
                />
              </div>

              {/* e. City */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  City
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sydney"
                  value={formData.companyCity}
                  onChange={e => setFormData(prev => ({ ...prev, companyCity: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
                />
              </div>

              {/* f. Country */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  placeholder="Australia"
                  value={formData.companyCountry}
                  onChange={e => setFormData(prev => ({ ...prev, companyCountry: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
                />
              </div>

              {/* g. Company Type */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Company Type
                </label>
                <select
                  value={formData.companyType}
                  onChange={e => setFormData(prev => ({ ...prev, companyType: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
                >
                  <option value="Commercial Customer">Commercial Customer</option>
                  <option value="Subcontractor Installer">Subcontractor Installer</option>
                  <option value="Equipment Vendor">Equipment Vendor</option>
                  <option value="Corporate Enterprise">Corporate Enterprise</option>
                  <option value="Real Estate / Strata">Real Estate / Strata</option>
                </select>
              </div>

              {/* h. ABN Number */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-300">
                    ABN Number (Australian Business Number)
                  </label>
                  {isAbnValid ? (
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> 11-digit Valid Format
                    </span>
                  ) : formData.companyAbn ? (
                    <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Requires 11 digits
                    </span>
                  ) : null}
                </div>
                <input
                  type="text"
                  placeholder="XX XXX XXX XXX (e.g. 51 824 753 556)"
                  value={formData.companyAbn}
                  onChange={e => handleAbnChange(e.target.value)}
                  className={`w-full px-3 py-2 bg-[#121212] border rounded-lg text-xs font-mono text-white focus:outline-none transition-colors ${
                    isAbnValid ? 'border-emerald-700/60 focus:border-emerald-500' : 'border-[#333] focus:border-[#bef264]'
                  }`}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-[#141414] border border-[#262626] text-xs text-gray-400 text-center">
            No company associated. Check the box above to link a commercial entity.
          </div>
        )}
      </section>

      {/* SECTION 4: Address, Postcode Verification & Area Auto-Population */}
      <section className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#bef26420] text-[#bef264] text-xs font-bold border border-[#bef26440]">
              4
            </span>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#bef264]" />
              <h3 className="font-semibold text-white text-sm tracking-wide">
                Address, Postcode Verification &amp; Area Auto-Population
              </h3>
            </div>
          </div>
          {formData.addressVerified && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Verified AUS Address
            </span>
          )}
        </div>

        <div className="space-y-3.5">
          {/* Street Address Search / Autocomplete */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Street Address
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Start typing street address (e.g. 12 Castle Street)..."
                value={formData.address}
                onChange={e => handleAddressInputChange(e.target.value)}
                onFocus={() => {
                  if (addressSuggestions.length > 0) setShowSuggestions(true);
                }}
                className="w-full pl-9 pr-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
            </div>

            {/* Address Suggestions Dropdown */}
            {showSuggestions && addressSuggestions.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#383838] rounded-lg shadow-xl overflow-hidden divide-y divide-[#262626]">
                <div className="p-1.5 bg-[#141414] text-[10px] text-gray-400 font-mono flex items-center justify-between">
                  <span>AUSTRALIAN NATIONAL ADDRESS REGISTER</span>
                  <span>Click to auto-fill</span>
                </div>
                {addressSuggestions.map((item, idx) => (
                  <button
                    key={`${item.address}-${item.postcode}-${idx}`}
                    type="button"
                    onClick={() => handleSelectAddressSuggestion(item)}
                    className="w-full text-left px-3 py-2 hover:bg-[#262626] flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <span className="font-medium text-white">{item.address}</span>
                      <span className="text-gray-400 ml-1.5">
                        {item.suburb} {item.state} {item.postcode}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#333] text-[#bef264]">
                      {item.area}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Suburb
              </label>
              <input
                type="text"
                placeholder="e.g. Castle Hill"
                value={formData.suburb}
                onChange={e => handleSuburbChange(e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                State
              </label>
              <select
                value={formData.state}
                onChange={e => handleStateChange(e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              >
                {dropdowns.states?.map((st: string) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Post Code
              </label>
              <input
                type="text"
                maxLength={4}
                placeholder="4-digit postcode"
                value={formData.postcode}
                onChange={e => handlePostcodeChange(e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white font-mono focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Area (Classification)
              </label>
              <select
                value={formData.area}
                onChange={e => setFormData(prev => ({ ...prev, area: e.target.value }))}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white font-medium focus:border-[#bef264] focus:outline-none transition-colors"
              >
                <option value="Metro">Metro</option>
                <option value="Regional">Regional</option>
                <option value="Remote">Remote</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Nearest Big City (Auto-populated from Suburb &amp; Postcode)
            </label>
            <input
              type="text"
              placeholder="e.g. Sydney, Brisbane, Melbourne"
              value={formData.nearestBigCity}
              onChange={e => setFormData(prev => ({ ...prev, nearestBigCity: e.target.value }))}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>
        </div>
      </section>

      {/* SECTION 5: Communication Channels & Real-time Validation */}
      <section className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#bef26420] text-[#bef264] text-xs font-bold border border-[#bef26440]">
              5
            </span>
            <div className="flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-[#bef264]" />
              <h3 className="font-semibold text-white text-sm tracking-wide">
                Communication Channels &amp; Real-time Validation
              </h3>
            </div>
          </div>
          <span className="text-[10px] font-mono text-gray-400">
            Australian Mobile Standard (04XX XXX XXX)
          </span>
        </div>

        {/* Call Notification Banner */}
        {callNotice && (
          <div className="p-2.5 bg-cyan-950/40 border border-cyan-500/40 rounded-xl text-xs text-cyan-300 flex items-center gap-2 animate-fadeIn">
            <PhoneCall className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{callNotice}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-400">
                Primary Mobile No <span className="text-rose-400">*</span>
              </label>
              {formData.primaryMobile && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleCall('primary', formData.primaryMobile)}
                    disabled={callingField === 'primary'}
                    title="Click-to-Call via VoIPLine"
                    className="px-1.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    {callingField === 'primary' ? (
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    ) : (
                      <PhoneCall className="w-2.5 h-2.5" />
                    )}
                    <span>{callingField === 'primary' ? 'Calling...' : 'Call'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsQuickSmsOpen(true)}
                    title="Send SMS"
                    className="px-1.5 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 text-[10px] font-medium flex items-center gap-1 transition-colors"
                  >
                    <MessageSquare className="w-2.5 h-2.5" />
                    <span>SMS</span>
                  </button>
                </div>
              )}
            </div>
            <input
              type="text"
              placeholder="0400 000 000"
              value={formData.primaryMobile}
              onChange={e => handleMobileChange('primaryMobile', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-400">
                Secondary Mobile No
              </label>
              {formData.secondaryMobile && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleCall('secondary', formData.secondaryMobile)}
                    disabled={callingField === 'secondary'}
                    title="Click-to-Call via VoIPLine"
                    className="px-1.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    {callingField === 'secondary' ? (
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    ) : (
                      <PhoneCall className="w-2.5 h-2.5" />
                    )}
                    <span>{callingField === 'secondary' ? 'Calling...' : 'Call'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsQuickSmsOpen(true)}
                    title="Send SMS"
                    className="px-1.5 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 text-[10px] font-medium flex items-center gap-1 transition-colors"
                  >
                    <MessageSquare className="w-2.5 h-2.5" />
                    <span>SMS</span>
                  </button>
                </div>
              )}
            </div>
            <input
              type="text"
              placeholder="0400 000 000 (optional)"
              value={formData.secondaryMobile}
              onChange={e => handleMobileChange('secondaryMobile', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-400">
                Email ID (Accepts multiple emails separated by commas) <span className="text-rose-400">*</span>
              </label>
              {emailValidation.isValid && emailValidation.emails.length > 0 && (
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {emailValidation.emails.length} Validated Email(s)
                </span>
              )}
            </div>
            <input
              type="text"
              placeholder="e.g. nathaniel@gmail.com, nathan.work@solar.com.au"
              value={formData.email}
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className={`w-full px-3 py-2 bg-[#121212] border rounded-lg text-xs text-white focus:outline-none transition-colors ${
                !emailValidation.isValid ? 'border-rose-600/70 focus:border-rose-500' : 'border-[#333] focus:border-[#bef264]'
              }`}
            />
            {/* Display parsed valid email tags */}
            {emailValidation.emails.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {emailValidation.emails.map((m, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#242424] text-gray-300 text-[11px] font-mono border border-[#383838]"
                  >
                    <Mail className="w-3 h-3 text-[#bef264]" />
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 4B: Solar & Electrical Equipment Hardware & Site Specifications */}
      {/* Note: As explicitly requested, System Size (kW) is situated here, and field numbers are removed */}
      <section className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-6 rounded-md bg-[#bef26420] text-[#bef264] text-xs font-bold border border-[#bef26440]">
              4B
            </span>
            <div className="flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-[#bef264]" />
              <h3 className="font-semibold text-white text-sm tracking-wide">
                Solar &amp; Electrical Equipment Hardware &amp; Site Specifications
              </h3>
            </div>
          </div>
          <span className="text-[11px] text-[#bef264] font-mono bg-[#bef2641a] px-2 py-0.5 rounded border border-[#bef26430]">
            System Size: {formData.systemSizeKw} kW
          </span>
        </div>

        {/* System Size (kW) - Moved to Section 4B */}
        <div className="p-3.5 bg-[#121212] rounded-xl border border-[#333] space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-white">
              System Size (kW)
            </label>
            <span className="text-xs font-mono text-[#bef264]">
              {formData.systemSizeKw ? `${formData.systemSizeKw} kW Total Capacity` : 'Custom Size'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[140px]">
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="500"
                value={formData.systemSizeKw}
                onChange={e => setFormData(prev => ({ ...prev, systemSizeKw: Number(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#3e3e3e] rounded-lg text-xs font-mono text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
              <span className="absolute right-3 top-2 text-xs text-gray-500 font-mono">kW</span>
            </div>
            {/* Quick capacity buttons */}
            {[6.6, 10.4, 13.2, 19.8, 30.0].map(preset => (
              <button
                key={preset}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, systemSizeKw: preset }))}
                className={`px-2.5 py-2 rounded-lg text-xs font-mono transition-colors border ${
                  formData.systemSizeKw === preset
                    ? 'bg-[#bef264] text-black font-bold border-[#bef264]'
                    : 'bg-[#1e1e1e] text-gray-300 border-[#333] hover:border-gray-500'
                }`}
              >
                {preset} kW
              </button>
            ))}
          </div>
        </div>

        {/* Panel Hardware Specs */}
        <div className="p-3.5 bg-[#121212] rounded-xl border border-[#2c2c2c] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              Photovoltaic Solar Panels
            </span>
            <span className="text-[11px] text-gray-400">Hardware Tier 1</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">
                Number of Panels
              </label>
              <input
                type="number"
                min="1"
                value={formData.noOfPanels}
                onChange={e => handleNoOfPanelsChange(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">
                Panel Manufacturer
              </label>
              <select
                value={formData.panelManufacturer}
                onChange={e => handlePanelManufacturerChange(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none"
              >
                {panelManufacturers.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">
                Panel Size (W)
              </label>
              <select
                value={formData.panelSizeW}
                onChange={e => handlePanelSizeChange(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none"
              >
                {panelSizes.map(s => (
                  <option key={s} value={s}>
                    {s} W
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">
                Panel Series
              </label>
              <select
                value={formData.panelSeries}
                onChange={e => handlePanelSeriesChange(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none"
              >
                {panelSeriesList.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-gray-400 mb-1">
                Panel Model
              </label>
              <select
                value={formData.panelModel}
                onChange={e => setFormData(prev => ({ ...prev, panelModel: e.target.value }))}
                className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none truncate"
              >
                {panelModels.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Inverter Hardware Specs */}
        <div className="p-3.5 bg-[#121212] rounded-xl border border-[#2c2c2c] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              Solar Inverters
            </span>
            <span className="text-[11px] text-gray-400">CEC Approved</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">
                Number of Inverters
              </label>
              <input
                type="number"
                min="1"
                value={formData.noOfInverters}
                onChange={e => setFormData(prev => ({ ...prev, noOfInverters: e.target.value }))}
                className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">
                Inverter Manufacturer
              </label>
              <select
                value={formData.inverterManufacturer}
                onChange={e => handleInverterManufacturerChange(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none"
              >
                {inverterManufacturers.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">
                Inverter Size (kW)
              </label>
              <select
                value={formData.inverterSizeKw}
                onChange={e => handleInverterSizeChange(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none"
              >
                {inverterSizes.map(s => (
                  <option key={s} value={s}>
                    {s} kW
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">
                Inverter Model
              </label>
              <select
                value={formData.inverterModel}
                onChange={e => setFormData(prev => ({ ...prev, inverterModel: e.target.value }))}
                className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none truncate"
              >
                {inverterModels.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Battery Storage Specs */}
        <div className="p-3.5 bg-[#121212] rounded-xl border border-[#2c2c2c] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Battery className="w-3.5 h-3.5 text-emerald-400" />
                Battery Storage Hardware
              </span>
              <label className="flex items-center gap-1.5 text-xs text-gray-300 ml-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.batteryRequired}
                  onChange={e => setFormData(prev => ({ ...prev, batteryRequired: e.target.checked }))}
                  className="rounded border-[#444] bg-[#222] text-[#bef264] focus:ring-0 accent-[#bef264]"
                />
                <span>Battery Storage Required</span>
              </label>
            </div>
            <span className="text-[11px] text-emerald-400 font-mono">
              {formData.batteryRequired ? 'Battery Included' : 'Solar Only'}
            </span>
          </div>

          {formData.batteryRequired && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  Number of Batteries
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.noOfBatteries}
                  onChange={e => setFormData(prev => ({ ...prev, noOfBatteries: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  Battery Manufacturer
                </label>
                <select
                  value={formData.batteryManufacturer}
                  onChange={e => handleBatteryManufacturerChange(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none"
                >
                  {batteryManufacturers.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  Usable Capacity (kWh)
                </label>
                <select
                  value={formData.batteryUsableCapacityKwh}
                  onChange={e => handleBatteryCapacityChange(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none"
                >
                  {batteryCapacities.map(c => (
                    <option key={c} value={c}>
                      {c} kWh
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  Battery Model
                </label>
                <select
                  value={formData.batteryModel}
                  onChange={e => setFormData(prev => ({ ...prev, batteryModel: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none truncate"
                >
                  {batteryModels.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Site Details (Storey, Phase, Roof Type, Docs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 pt-1">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              House Storey
            </label>
            <select
              value={formData.houseStorey}
              onChange={e => setFormData(prev => ({ ...prev, houseStorey: e.target.value }))}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none"
            >
              <option value="Single Storey">Single Storey</option>
              <option value="Double Storey">Double Storey</option>
              <option value="Triple Storey">Triple Storey</option>
              <option value="Multi-Level Commercial">Multi-Level Commercial</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Electrical Phase
            </label>
            <select
              value={formData.phase}
              onChange={e => setFormData(prev => ({ ...prev, phase: e.target.value }))}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none"
            >
              <option value="Single Phase">Single Phase</option>
              <option value="Two Phase">Two Phase</option>
              <option value="Three Phase">Three Phase</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Roof Type
            </label>
            <select
              value={formData.roofType}
              onChange={e => setFormData(prev => ({ ...prev, roofType: e.target.value }))}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none"
            >
              <option value="Colorbond / Metal Sheet">Colorbond / Metal Sheet</option>
              <option value="Terracotta Tile">Terracotta Tile</option>
              <option value="Concrete Tile">Concrete Tile</option>
              <option value="Klip-lok / Industrial Metal">Klip-lok / Industrial Metal</option>
              <option value="Slate">Slate</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Docs Received
            </label>
            <select
              value={formData.docsReceived}
              onChange={e => setFormData(prev => ({ ...prev, docsReceived: e.target.value }))}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none"
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="Partial">Partial</option>
            </select>
          </div>

          <div className="sm:col-span-2 md:col-span-4">
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Existing System Details
            </label>
            <input
              type="text"
              placeholder="e.g. None (Brand new install) OR 3kW inverter with 8 old panels to be removed"
              value={formData.existingSystemDetails}
              onChange={e => setFormData(prev => ({ ...prev, existingSystemDetails: e.target.value }))}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* SECTION 7: Pricing & Financials (Accounts AUD Format) */}
      <section className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#bef26420] text-[#bef264] text-xs font-bold border border-[#bef26440]">
              7
            </span>
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#bef264]" />
              <h3 className="font-semibold text-white text-sm tracking-wide">
                Pricing &amp; Financials (Accounts AUD Format)
              </h3>
            </div>
          </div>
          <span className="text-[10px] font-mono text-gray-400">
            Real-time Currency Parsing
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              System Price (AUD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-gray-500 font-mono">$</span>
              <input
                type="text"
                placeholder="15,400"
                value={formData.systemPrice}
                onChange={e => setFormData(prev => ({ ...prev, systemPrice: e.target.value }))}
                onBlur={e => {
                  const parsed = parseAudAccounts(e.target.value);
                  if (parsed > 0) {
                    setFormData(prev => ({ ...prev, systemPrice: formatAudAccounts(parsed) }));
                  }
                }}
                className="w-full pl-7 pr-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Selling Price (AUD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-gray-500 font-mono">$</span>
              <input
                type="text"
                placeholder="11,900"
                value={formData.sellingPrice}
                onChange={e => setFormData(prev => ({ ...prev, sellingPrice: e.target.value }))}
                onBlur={e => {
                  const parsed = parseAudAccounts(e.target.value);
                  if (parsed > 0) {
                    setFormData(prev => ({ ...prev, sellingPrice: formatAudAccounts(parsed) }));
                  }
                }}
                className="w-full pl-7 pr-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Deposit (AUD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-gray-500 font-mono">$</span>
              <input
                type="text"
                placeholder="1,000"
                value={formData.deposit}
                onChange={e => setFormData(prev => ({ ...prev, deposit: e.target.value }))}
                onBlur={e => {
                  const parsed = parseAudAccounts(e.target.value);
                  if (parsed >= 0) {
                    setFormData(prev => ({ ...prev, deposit: formatAudAccounts(parsed) }));
                  }
                }}
                className="w-full pl-7 pr-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8: Sales Team Notes & Site Requirements */}
      <section className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#bef26420] text-[#bef264] text-xs font-bold border border-[#bef26440]">
              8
            </span>
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#bef264]" />
              <h3 className="font-semibold text-white text-sm tracking-wide">
                Sales Team Notes &amp; Site Requirements
              </h3>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Sales Team Notes &amp; Special Site Instructions
          </label>
          <textarea
            rows={3}
            placeholder="Enter customer site notes, meter box details, shading considerations, inverter location preferences..."
            value={formData.salesTeamNotes}
            onChange={e => setFormData(prev => ({ ...prev, salesTeamNotes: e.target.value }))}
            className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
          />
        </div>
      </section>
    </div>
  );
};
