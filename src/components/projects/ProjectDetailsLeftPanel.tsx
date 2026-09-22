import React, { useState } from 'react';
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
  User,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Calendar,
  Search,
  CheckCircle2,
  AlertCircle,
  Sun,
  Zap,
  Battery,
  FileCheck2,
  FileText,
  Truck,
  Wrench,
  BadgePercent,
  Layers,
  ChevronDown,
  ChevronUp,
  Building2,
  Lock,
  Sparkles,
  ShieldCheck,
  Check,
  PhoneCall,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { originateCall } from '../../services/voiplineService';

export interface ProjectFormData {
  // Top fields
  projectNumber: string;
  amount: string; // locked
  projectCreatedDate: string;
  projectClosedDate: string;
  projectStage: string;

  // Section 1: Customer & Sales
  salesPersonName: string;
  state: string;
  postcode: string;
  area: string;
  nearestBigCity: string;
  saleDate: string;
  firstName: string;
  lastName: string;
  managerRenteeFirstName: string;
  managerRenteeLastName: string;
  address: string;
  suburb: string;
  primaryMobile: string;
  secondaryMobile: string;
  email: string;
  salesTeamNotes: string;
  systemPrice: string;
  sellingPrice: string;
  deposit: string;
  depositReceivedDate: string;

  // Section 2: Technical Specifications & Hardware
  systemSizeKw: number | string;
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
  usableCapacity: string;
  batteryModel: string;
  batterySize: string;
  houseStorey: string;
  roofType: string;
  phase: string;
  existingSystemDetails: string;
  docsReceived: string;
  docsReceivedDate: string;

  // Section 3: Electricity Bill (EB) & Meter Checklist
  q1CustomerNameMatch: string;
  q2AddressMatch: string;
  q3MeterMatch: string;
  q4MeterPhase: string;
  q5OpenSolarSystemMatch: string;
  q6OpenSolarPricingMatch: string;

  // Section 4: Grid Application
  nmi: string;
  electricityDistributor: string;
  gridAppRef: string;
  energyRetailer: string;
  retailerRef: string;
  gridAppStatus: string;
  gridAppliedDate: string;
  gridRejectedDate: string;
  gridApprovalDate: string;

  // Section 5: Installation Details
  installationDate: string;
  installationStatus: string;
  installationBookingDate: string;
  installationBookedBy: string;
  installationCompletedMonth: string;
  installationDocsStatus: string;
  installationDocsReceivedDate: string;
  installerName: string;
  installerInvoiceDate: string;
  installerInvoiceNumber: string;
  installerInvoiceAmount: string;
  installerInvoiceStatus: string;
  customerInvoiceNumber: string;

  // Section 6: Warehouse Details
  warehouse: string;
  salesOrderNo: string;
  warehouseInvoiceDate: string;
  warehouseInvoiceNumber: string;
  warehouseInvoiceAmount: string;
  warehouseInvoiceStatus: string;
  stockStatus: string;
  stockUsedProject: string;
  warehouseInvoicePaidDate: string;

  // Section 7: Financials
  balancePayable: string;
  balancePayableDate: string;
  remainingPayment: string;
  isOnFinance: string;
  financeCompanyName: string;
  financeAppliedDate: string;
  financeApprovedDate: string;
  financeApprovedAmount: string;
  financeStatus: string;

  // Section 8: STC Details
  stcTradedPortal: string;
  stcJobNo: string;
  solarStcs: string;
  solarStcsAmount: string;
  solarStcReceivedDate: string;
  batteryStcs: string;
  batteryStcsAmount: string;
  batteryStcReceivedDate: string;
  totalStcAmountReceived: string;
  adminCharges: string;
  stcStatus: string;
  stcSubmittedDate: string;

  // Company details
  hasCompany: boolean;
  companyName: string;
  companyOwner: string;
  companyAbn: string;
  companyPhone: string;
  companyCity: string;
  companyCountry: string;
  companyType: string;
}

interface ProjectDetailsLeftPanelProps {
  formData: ProjectFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProjectFormData>>;
  dropdowns: any;
}

export const ProjectDetailsLeftPanel: React.FC<ProjectDetailsLeftPanelProps> = ({
  formData,
  setFormData,
  dropdowns
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

  // Address search autocomplete
  const [addressSearch, setAddressSearch] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<AustralianAddressPreset[]>([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);

  // Email validation state
  const emailValidation = validateMultipleEmails(formData.email);

  // Generic updater with automatic business rules
  const handleChange = (field: keyof ProjectFormData, value: any) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      const todayDate = new Date().toISOString().split('T')[0];

      // 1. Postcode change -> auto-update area and nearest big city
      if (field === 'postcode') {
        next.area = classifyAustralianPostcode(value, prev.state);
        next.nearestBigCity = getNearestBigCity(prev.suburb, value, prev.state);
      }

      // 2. Suburb change -> auto-update nearest big city
      if (field === 'suburb') {
        next.nearestBigCity = getNearestBigCity(value, prev.postcode, prev.state);
      }

      // 3. State change -> re-classify area
      if (field === 'state') {
        next.area = classifyAustralianPostcode(prev.postcode, value);
        next.nearestBigCity = getNearestBigCity(prev.suburb, prev.postcode, value);
      }

      // 4. Primary Mobile change -> auto-format
      if (field === 'primaryMobile') {
        next.primaryMobile = formatAustralianMobile(value);
      }

      // 5. Secondary Mobile change -> auto-format
      if (field === 'secondaryMobile') {
        next.secondaryMobile = formatAustralianMobile(value);
      }

      // 6. Selling Price change -> auto-update amount (locked) & re-calculate balance payable
      if (field === 'sellingPrice') {
        next.amount = value; // Keep Amount locked and synced with Selling Price
        const sellingNum = parseAudAccounts(value);
        const depNum = parseAudAccounts(prev.deposit);
        if (sellingNum > 0) {
          const bal = Math.max(0, sellingNum - depNum);
          next.balancePayable = formatAudAccounts(bal);
          next.remainingPayment = formatAudAccounts(bal);
        }
      }

      // 7. Deposit change -> re-calculate balance payable
      if (field === 'deposit') {
        const depNum = parseAudAccounts(value);
        const sellingNum = parseAudAccounts(prev.sellingPrice);
        if (sellingNum > 0) {
          const bal = Math.max(0, sellingNum - depNum);
          next.balancePayable = formatAudAccounts(bal);
          next.remainingPayment = formatAudAccounts(bal);
        }
      }

      // 8. Deposit Received Date linkage: sync Section 1 and Section 7
      if (field === 'depositReceivedDate') {
        next.depositReceivedDate = value;
      }

      // 9. Installation Status changed to Closed -> auto-populate Project Closed Date
      if (field === 'installationStatus') {
        if (value === 'Closed' && !prev.projectClosedDate) {
          next.projectClosedDate = todayDate;
        }
      }

      // 10. Grid Application Status auto-updates corresponding dates
      if (field === 'gridAppStatus') {
        if (value === 'Grid Applied' && !prev.gridAppliedDate) {
          next.gridAppliedDate = todayDate;
        } else if (value === 'Grid Rejected' && !prev.gridRejectedDate) {
          next.gridRejectedDate = todayDate;
        } else if (value === 'Grid App Approved' && !prev.gridApprovalDate) {
          next.gridApprovalDate = todayDate;
        }
      }

      return next;
    });
  };

  // Address preset selector
  const handleSelectAddress = (preset: AustralianAddressPreset) => {
    setFormData(prev => ({
      ...prev,
      address: preset.address,
      suburb: preset.suburb,
      state: preset.state,
      postcode: preset.postcode,
      area: preset.area,
      nearestBigCity: preset.nearestBigCity
    }));
    setShowAddressDropdown(false);
    setAddressSearch('');
  };

  // Hardware Dependent Dropdowns Logic
  const panelHierarchy = dropdowns?.panelHierarchy || [];
  const inverterHierarchy = dropdowns?.inverterHierarchy || [];
  const batteryHierarchy = dropdowns?.batteryHierarchy || [];

  // 1. Panel Manufacturers
  const panelManufacturers: string[] = Array.from(
    new Set(panelHierarchy.map((p: any) => p.manufacturer).concat(dropdowns?.panelBrands || []))
  );

  // 2. Panel Sizes (Dependent on Panel Manufacturer)
  const panelSizes: string[] = Array.from(
    new Set(
      panelHierarchy
        .filter((p: any) => !formData.panelManufacturer || p.manufacturer === formData.panelManufacturer)
        .map((p: any) => String(p.sizeW))
    )
  );

  // 3. Panel Series (Dependent on Panel Size & Manuf)
  const panelSeriesList: string[] = Array.from(
    new Set(
      panelHierarchy
        .filter((p: any) => {
          const matchManuf = !formData.panelManufacturer || p.manufacturer === formData.panelManufacturer;
          const matchSize = !formData.panelSizeW || String(p.sizeW) === String(formData.panelSizeW);
          return matchManuf && matchSize;
        })
        .map((p: any) => p.series)
    )
  );

  // 4. Panel Models (Dependent on Panel Series)
  const panelModels: string[] = Array.from(
    new Set(
      panelHierarchy
        .filter((p: any) => {
          const matchManuf = !formData.panelManufacturer || p.manufacturer === formData.panelManufacturer;
          const matchSize = !formData.panelSizeW || String(p.sizeW) === String(formData.panelSizeW);
          const matchSeries = !formData.panelSeries || p.series === formData.panelSeries;
          return matchManuf && matchSize && matchSeries;
        })
        .map((p: any) => p.model)
    )
  );

  // Inverter Dependent Dropdowns
  const inverterManufacturers: string[] = Array.from(
    new Set(inverterHierarchy.map((i: any) => i.manufacturer).concat(dropdowns?.inverterBrands || []))
  );

  const inverterSizes: string[] = Array.from(
    new Set(
      inverterHierarchy
        .filter((i: any) => !formData.inverterManufacturer || i.manufacturer === formData.inverterManufacturer)
        .map((i: any) => String(i.sizeKw))
    )
  );

  const inverterModels: string[] = Array.from(
    new Set(
      inverterHierarchy
        .filter((i: any) => {
          const matchManuf = !formData.inverterManufacturer || i.manufacturer === formData.inverterManufacturer;
          const matchSize = !formData.inverterSizeKw || String(i.sizeKw) === String(formData.inverterSizeKw);
          return matchManuf && matchSize;
        })
        .map((i: any) => i.model)
    )
  );

  // Battery Dependent Dropdowns
  const batteryManufacturers: string[] = Array.from(
    new Set(batteryHierarchy.map((b: any) => b.manufacturer).concat(dropdowns?.batteryBrands || []))
  );

  const batteryCapacities: string[] = Array.from(
    new Set(
      batteryHierarchy
        .filter((b: any) => !formData.batteryManufacturer || b.manufacturer === formData.batteryManufacturer)
        .map((b: any) => String(b.usableCapacityKwh))
    )
  );

  const batteryModels: string[] = Array.from(
    new Set(
      batteryHierarchy
        .filter((b: any) => {
          const matchManuf = !formData.batteryManufacturer || b.manufacturer === formData.batteryManufacturer;
          const matchCap = !formData.usableCapacity || String(b.usableCapacityKwh) === String(formData.usableCapacity);
          return matchManuf && matchCap;
        })
        .map((b: any) => b.model)
    )
  );

  const batterySizes: string[] = Array.from(
    new Set(
      batteryHierarchy
        .filter((b: any) => {
          const matchManuf = !formData.batteryManufacturer || b.manufacturer === formData.batteryManufacturer;
          const matchCap = !formData.usableCapacity || String(b.usableCapacityKwh) === String(formData.usableCapacity);
          const matchModel = !formData.batteryModel || b.model === formData.batteryModel;
          return matchManuf && matchCap && matchModel;
        })
        .map((b: any) => b.size)
    )
  );

  return (
    <div className="space-y-4">
      {/* SECTION 1: Customer & Sales Details */}
      <section className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 sm:p-5 space-y-4 shadow-md">
        <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#bef26420] text-[#bef264] text-xs font-bold border border-[#bef26440]">
              1
            </span>
            <h3 className="font-semibold text-white text-sm tracking-wide">
              Customer &amp; Sales Details
            </h3>
          </div>
          <span className="text-[11px] text-gray-400 bg-[#222] px-2 py-0.5 rounded border border-[#333]">
            Section 1
          </span>
        </div>

        {/* Sales Person & State */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Sales Person Name <span className="text-rose-400">*</span>
            </label>
            <select
              value={formData.salesPersonName}
              onChange={e => handleChange('salesPersonName', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            >
              <option value="">Select Sales Person...</option>
              {(dropdowns?.salesPersons || ['Mitchell Barnes', 'Chloe Gallagher', 'Akash Mohite']).map((sp: string) => (
                <option key={sp} value={sp}>
                  {sp}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              State <span className="text-rose-400">*</span>
            </label>
            <select
              value={formData.state}
              onChange={e => handleChange('state', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            >
              {(dropdowns?.states || ['NSW', 'QLD', 'VIC', 'SA', 'WA', 'TAS', 'ACT', 'NT']).map((st: string) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Postcode, Area, Nearest Big City */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Post Code</label>
            <input
              type="text"
              maxLength={4}
              value={formData.postcode}
              onChange={e => handleChange('postcode', e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 2000"
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Area</label>
            <input
              type="text"
              value={formData.area}
              onChange={e => handleChange('area', e.target.value)}
              placeholder="Metro / Regional"
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Suburb (Nearest Big city)</label>
            <input
              type="text"
              value={formData.nearestBigCity}
              onChange={e => handleChange('nearestBigCity', e.target.value)}
              placeholder="e.g. Sydney, Brisbane"
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Sale Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Sale Date</label>
            <input
              type="date"
              value={formData.saleDate}
              onChange={e => handleChange('saleDate', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Deposit Received Date</label>
            <input
              type="date"
              value={formData.depositReceivedDate}
              onChange={e => handleChange('depositReceivedDate', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Customer & Manager Names */}
        <div className="p-3.5 bg-[#141414] border border-[#282828] rounded-xl space-y-3">
          <div className="text-xs font-semibold text-[#bef264] flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            <span>Primary Customer &amp; Rentee Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                First Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="First name"
                value={formData.firstName}
                onChange={e => handleChange('firstName', e.target.value)}
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
                onChange={e => handleChange('lastName', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[#222]">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Manager/Rentee First Name</label>
              <input
                type="text"
                placeholder="Manager first name"
                value={formData.managerRenteeFirstName}
                onChange={e => handleChange('managerRenteeFirstName', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Manager/Rentee Last Name</label>
              <input
                type="text"
                placeholder="Manager last name"
                value={formData.managerRenteeLastName}
                onChange={e => handleChange('managerRenteeLastName', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Address with Australian Database presets */}
        <div className="p-3.5 bg-[#141414] border border-[#282828] rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#bef264] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>Installation Site Address</span>
            </span>
            <button
              type="button"
              onClick={() => setShowAddressDropdown(!showAddressDropdown)}
              className="text-xs text-[#bef264] hover:underline flex items-center gap-1 font-mono"
            >
              <Search className="w-3 h-3" />
              <span>Quick Lookup Preset</span>
            </button>
          </div>

          {showAddressDropdown && (
            <div className="p-3 bg-[#181818] border border-[#333] rounded-lg space-y-2">
              <span className="text-[11px] text-gray-400 block">Select Australian Verified Address Preset:</span>
              <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {AUSTRALIAN_ADDRESS_DATABASE.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectAddress(preset)}
                    className="text-left p-2 hover:bg-[#252525] rounded text-xs text-gray-200 flex items-center justify-between transition-colors border border-transparent hover:border-[#383838]"
                  >
                    <span>{preset.address}, {preset.suburb} {preset.state} {preset.postcode}</span>
                    <span className="text-[10px] text-[#bef264] font-mono">{preset.area}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Street Address <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 142 George Street"
                value={formData.address}
                onChange={e => handleChange('address', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Suburb <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Parramatta"
                value={formData.suburb}
                onChange={e => handleChange('suburb', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Notification Banner */}
        {callNotice && (
          <div className="p-2.5 bg-cyan-950/40 border border-cyan-500/40 rounded-xl text-xs text-cyan-300 flex items-center gap-2 animate-fadeIn">
            <PhoneCall className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{callNotice}</span>
          </div>
        )}

        {/* Contact info: Mobile, Email */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-400">
                Primary Mobile <span className="text-rose-400">*</span>
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
              type="tel"
              placeholder="0400 000 000"
              value={formData.primaryMobile}
              onChange={e => handleChange('primaryMobile', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white font-mono focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-400">Secondary Mobile</label>
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
              type="tel"
              placeholder="0400 000 000"
              value={formData.secondaryMobile}
              onChange={e => handleChange('secondaryMobile', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white font-mono focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Email Address (Multiple Allowed) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="name@domain.com, opt@domain.com"
              value={formData.email}
              onChange={e => handleChange('email', e.target.value)}
              className={`w-full px-3 py-2 bg-[#121212] border rounded-lg text-xs text-white focus:outline-none transition-colors ${
                emailValidation.isValid
                  ? 'border-[#333] focus:border-[#bef264]'
                  : 'border-rose-500/70 focus:border-rose-500'
              }`}
            />
            {!emailValidation.isValid && (
              <span className="text-[10px] text-rose-400 mt-1 block">
                Invalid format: {emailValidation.invalidEmails.join(', ')}
              </span>
            )}
          </div>
        </div>

        {/* Sales Team Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Sales Team Notes</label>
          <textarea
            rows={2}
            value={formData.salesTeamNotes}
            onChange={e => handleChange('salesTeamNotes', e.target.value)}
            placeholder="Enter customer special instructions, access notes..."
            className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
          />
        </div>

        {/* Pricing Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">System Price ($ AUD)</label>
            <input
              type="text"
              value={formData.systemPrice}
              onChange={e => handleChange('systemPrice', e.target.value)}
              onBlur={() => {
                const parsed = parseAudAccounts(formData.systemPrice);
                if (parsed > 0) handleChange('systemPrice', formatAudAccounts(parsed));
              }}
              placeholder="$14,500.00"
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono font-semibold text-[#bef264] placeholder-gray-600 focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Selling Price (After Rebates)</label>
            <input
              type="text"
              value={formData.sellingPrice}
              onChange={e => handleChange('sellingPrice', e.target.value)}
              onBlur={() => {
                const parsed = parseAudAccounts(formData.sellingPrice);
                if (parsed > 0) handleChange('sellingPrice', formatAudAccounts(parsed));
              }}
              placeholder="$10,500.00"
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono font-semibold text-[#bef264] placeholder-gray-600 focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Deposit ($ AUD)</label>
            <input
              type="text"
              value={formData.deposit}
              onChange={e => handleChange('deposit', e.target.value)}
              onBlur={() => {
                const parsed = parseAudAccounts(formData.deposit);
                if (parsed > 0) handleChange('deposit', formatAudAccounts(parsed));
              }}
              placeholder="$1,000.00"
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono font-semibold text-[#bef264] placeholder-gray-600 focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>
        </div>
      </section>

      {/* SECTION 2: Technical Specifications & Hardware */}
      <section className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 sm:p-5 space-y-4 shadow-md">
        <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#bef26420] text-[#bef264] text-xs font-bold border border-[#bef26440]">
              2
            </span>
            <h3 className="font-semibold text-white text-sm tracking-wide">
              Technical Specifications &amp; Hardware
            </h3>
          </div>
          <span className="text-[11px] text-gray-400 bg-[#222] px-2 py-0.5 rounded border border-[#333]">
            Section 2
          </span>
        </div>

        {/* System Size kW */}
        <div className="p-3.5 bg-[#141414] border border-[#282828] rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#bef264] flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5" />
              <span>System Size (kW)</span>
            </label>
            <div className="flex items-center gap-1.5">
              {[6.6, 9.9, 13.2, 19.8, 30].map(kw => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => handleChange('systemSizeKw', kw)}
                  className="text-[10px] bg-[#222] hover:bg-[#2e2e2e] text-gray-300 hover:text-white px-2 py-0.5 rounded border border-[#3a3a3a] transition-colors"
                >
                  {kw} kW
                </button>
              ))}
            </div>
          </div>
          <input
            type="number"
            step="0.1"
            value={formData.systemSizeKw}
            onChange={e => handleChange('systemSizeKw', parseFloat(e.target.value) || '')}
            placeholder="6.6"
            className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono font-bold text-white focus:border-[#bef264] focus:outline-none transition-colors"
          />
        </div>

        {/* Panels Specifications */}
        <div className="p-3.5 bg-[#141414] border border-[#282828] rounded-xl space-y-3">
          <div className="text-xs font-semibold text-[#bef264] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Solar Panels (PV Modules)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">No. of Panels</label>
              <input
                type="text"
                placeholder="15"
                value={formData.noOfPanels}
                onChange={e => handleChange('noOfPanels', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Panel Manufacturer</label>
              <select
                value={formData.panelManufacturer}
                onChange={e => handleChange('panelManufacturer', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              >
                <option value="">Select Panel Manufacturer</option>
                {panelManufacturers.map(pm => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Panel Size (W)</label>
              <select
                value={formData.panelSizeW}
                onChange={e => handleChange('panelSizeW', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              >
                <option value="">Select Watts</option>
                {(panelSizes.length > 0 ? panelSizes : ['440', '475', '500']).map(ps => (
                  <option key={ps} value={ps}>
                    {ps}W
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Panel Series</label>
              <select
                value={formData.panelSeries}
                onChange={e => handleChange('panelSeries', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              >
                <option value="">Select Series</option>
                {(panelSeriesList.length > 0 ? panelSeriesList : ['Neostar 2S+', 'Tiger Neo N-type']).map(ps => (
                  <option key={ps} value={ps}>
                    {ps}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Panel Model</label>
              <select
                value={formData.panelModel}
                onChange={e => handleChange('panelModel', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              >
                <option value="">Select Model</option>
                {(panelModels.length > 0 ? panelModels : ['AIKO-A440-MAH54Mb', 'JKM440N-54HL4R-V']).map(pm => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Inverter Specifications */}
        <div className="p-3.5 bg-[#141414] border border-[#282828] rounded-xl space-y-3">
          <div className="text-xs font-semibold text-[#bef264] flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            <span>Solar Inverter</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">No. of Inverters</label>
              <input
                type="text"
                placeholder="1"
                value={formData.noOfInverters}
                onChange={e => handleChange('noOfInverters', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Inverter Manufacturer</label>
              <select
                value={formData.inverterManufacturer}
                onChange={e => handleChange('inverterManufacturer', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              >
                <option value="">Select Manufacturer</option>
                {inverterManufacturers.map(im => (
                  <option key={im} value={im}>
                    {im}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Inverter Size (kW)</label>
              <select
                value={formData.inverterSizeKw}
                onChange={e => handleChange('inverterSizeKw', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              >
                <option value="">Select Size kW</option>
                {(inverterSizes.length > 0 ? inverterSizes : ['5.0', '6.0', '8.0', '10.0']).map(is => (
                  <option key={is} value={is}>
                    {is} kW
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Inverter Model</label>
              <select
                value={formData.inverterModel}
                onChange={e => handleChange('inverterModel', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              >
                <option value="">Select Model</option>
                {(inverterModels.length > 0 ? inverterModels : ['SG5.0RS-ADA', 'SUN2000-5KTL-L1']).map(im => (
                  <option key={im} value={im}>
                    {im}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Battery Specifications */}
        <div className="p-3.5 bg-[#141414] border border-[#282828] rounded-xl space-y-3">
          <div className="text-xs font-semibold text-[#bef264] flex items-center gap-1.5">
            <Battery className="w-3.5 h-3.5" />
            <span>Battery Storage System</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">No. of Batteries</label>
              <input
                type="text"
                placeholder="1"
                value={formData.noOfBatteries}
                onChange={e => handleChange('noOfBatteries', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Manufacturer</label>
              <select
                value={formData.batteryManufacturer}
                onChange={e => handleChange('batteryManufacturer', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              >
                <option value="">Select Manufacturer</option>
                {batteryManufacturers.map(bm => (
                  <option key={bm} value={bm}>
                    {bm}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Usable Capacity (kWh)</label>
              <select
                value={formData.usableCapacity}
                onChange={e => handleChange('usableCapacity', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              >
                <option value="">Select kWh</option>
                {(batteryCapacities.length > 0 ? batteryCapacities : ['9.6', '13.5', '10.0']).map(bc => (
                  <option key={bc} value={bc}>
                    {bc} kWh
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Model</label>
              <select
                value={formData.batteryModel}
                onChange={e => handleChange('batteryModel', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              >
                <option value="">Select Model</option>
                {(batteryModels.length > 0 ? batteryModels : ['SBR096', 'Powerwall 2', 'LUNA2000-10-S0']).map(bm => (
                  <option key={bm} value={bm}>
                    {bm}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Size / Package</label>
              <select
                value={formData.batterySize}
                onChange={e => handleChange('batterySize', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              >
                <option value="">Select Size</option>
                {(batterySizes.length > 0 ? batterySizes : ['9.6 kWh Pack', '13.5 kWh Unit']).map(bs => (
                  <option key={bs} value={bs}>
                    {bs}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Site Details: Roof Type, Storey, Phase, Existing System, Docs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Roof Type</label>
            <select
              value={formData.roofType}
              onChange={e => handleChange('roofType', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            >
              {(dropdowns?.roofTypes || ['Tin / Colorbond', 'Tile', 'Kliplok', 'Terracotta', 'Slate', 'Flat Roof / Tilt Frames']).map((rt: string) => (
                <option key={rt} value={rt}>
                  {rt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">House Storey</label>
            <select
              value={formData.houseStorey}
              onChange={e => handleChange('houseStorey', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            >
              {(dropdowns?.houseStoreys || ['Single Storey', 'Double Storey', 'Triple Storey', 'Multi Storey Commercial']).map((hs: string) => (
                <option key={hs} value={hs}>
                  {hs}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Electrical Phase</label>
            <select
              value={formData.phase}
              onChange={e => handleChange('phase', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            >
              {(dropdowns?.phases || ['Single Phase', 'Three Phase', 'Two Phase Split']).map((ph: string) => (
                <option key={ph} value={ph}>
                  {ph}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Existing System Details</label>
            <input
              type="text"
              placeholder="e.g. 3kW Existing Inverter to remove"
              value={formData.existingSystemDetails}
              onChange={e => handleChange('existingSystemDetails', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Docs Received</label>
            <select
              value={formData.docsReceived}
              onChange={e => handleChange('docsReceived', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            >
              {(dropdowns?.docsReceivedOptions || ['No', 'Yes (Complete)', 'Partial', 'Awaiting Meter Photos']).map((dr: string) => (
                <option key={dr} value={dr}>
                  {dr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Docs Received Date</label>
            <input
              type="date"
              value={formData.docsReceivedDate}
              onChange={e => handleChange('docsReceivedDate', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>
        </div>
      </section>

      {/* SECTION 3: Electricity Bill (EB) & Meter Checklist */}
      <section className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 sm:p-5 space-y-4 shadow-md">
        <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#bef26420] text-[#bef264] text-xs font-bold border border-[#bef26440]">
              3
            </span>
            <h3 className="font-semibold text-white text-sm tracking-wide">
              Electricity Bill (EB) &amp; Meter Checklist
            </h3>
          </div>
          <span className="text-[11px] text-gray-400 bg-[#222] px-2 py-0.5 rounded border border-[#333]">
            Section 3
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="p-3 bg-[#141414] border border-[#282828] rounded-xl space-y-2">
            <label className="block text-xs font-medium text-gray-300">
              Q1: Customer Name on EB matches Application?
            </label>
            <select
              value={formData.q1CustomerNameMatch}
              onChange={e => handleChange('q1CustomerNameMatch', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            >
              <option value="Yes">Yes (Matches exactly)</option>
              <option value="No">No (Different name on bill)</option>
              <option value="Partial">Partial (Middle initial / maiden name)</option>
            </select>
          </div>

          <div className="p-3 bg-[#141414] border border-[#282828] rounded-xl space-y-2">
            <label className="block text-xs font-medium text-gray-300">
              Q2: Address on EB matches Installation Address?
            </label>
            <select
              value={formData.q2AddressMatch}
              onChange={e => handleChange('q2AddressMatch', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            >
              <option value="Yes">Yes (Address verified)</option>
              <option value="No">No (Mismatch detected)</option>
              <option value="Pending">Pending verification</option>
            </select>
          </div>

          <div className="p-3 bg-[#141414] border border-[#282828] rounded-xl space-y-2">
            <label className="block text-xs font-medium text-gray-300">
              Q3: Meter Number on Bill matches Switchboard Meter?
            </label>
            <select
              value={formData.q3MeterMatch}
              onChange={e => handleChange('q3MeterMatch', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            >
              <option value="Yes">Yes (Meter serial confirmed)</option>
              <option value="No">No (Photo required)</option>
              <option value="Awaiting Photo">Awaiting Photo</option>
            </select>
          </div>

          <div className="p-3 bg-[#141414] border border-[#282828] rounded-xl space-y-2">
            <label className="block text-xs font-medium text-gray-300">
              Q4: Supply Phase Confirmed (Single / Three Phase)?
            </label>
            <select
              value={formData.q4MeterPhase}
              onChange={e => handleChange('q4MeterPhase', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            >
              <option value="Single Phase">Single Phase Confirmed</option>
              <option value="Three Phase">Three Phase Confirmed</option>
              <option value="To be verified on site">To be verified on site</option>
            </select>
          </div>

          <div className="p-3 bg-[#141414] border border-[#282828] rounded-xl space-y-2">
            <label className="block text-xs font-medium text-gray-300">
              Q5: OpenSolar Hardware matches Contracted System?
            </label>
            <select
              value={formData.q5OpenSolarSystemMatch}
              onChange={e => handleChange('q5OpenSolarSystemMatch', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            >
              <option value="Yes">Yes (100% matched)</option>
              <option value="Modified">Modified (Updated in portal)</option>
              <option value="Pending Review">Pending Design Review</option>
            </select>
          </div>

          <div className="p-3 bg-[#141414] border border-[#282828] rounded-xl space-y-2">
            <label className="block text-xs font-medium text-gray-300">
              Q6: OpenSolar Pricing &amp; STC Claim Verified?
            </label>
            <select
              value={formData.q6OpenSolarPricingMatch}
              onChange={e => handleChange('q6OpenSolarPricingMatch', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            >
              <option value="Yes">Yes (Audited &amp; Reconciled)</option>
              <option value="Price Variance">Price Variance flagged</option>
              <option value="Pending Final STC Calc">Pending Final STC Calc</option>
            </select>
          </div>
        </div>
      </section>

      {/* SECTION 4: Grid Application & DNSP Pre-Approval */}
      <section className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 sm:p-5 space-y-4 shadow-md">
        <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#bef26420] text-[#bef264] text-xs font-bold border border-[#bef26440]">
              4
            </span>
            <h3 className="font-semibold text-white text-sm tracking-wide">
              Grid Application &amp; DNSP Pre-Approval
            </h3>
          </div>
          <span className="text-[11px] text-gray-400 bg-[#222] px-2 py-0.5 rounded border border-[#333]">
            Section 4
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              National Meter Identifier (NMI) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              maxLength={11}
              value={formData.nmi}
              onChange={e => handleChange('nmi', e.target.value.toUpperCase())}
              placeholder="e.g. 41020000001"
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono font-semibold text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Electricity Distributor (DNSP) <span className="text-rose-400">*</span>
            </label>
            <select
              value={formData.electricityDistributor}
              onChange={e => handleChange('electricityDistributor', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            >
              {(dropdowns?.distributors || ['Ausgrid', 'Endeavour Energy', 'Essential Energy', 'Energex', 'Ergon Energy', 'CitiPower', 'Powercor', 'United Energy', 'AusNet', 'SA Power Networks', 'Western Power']).map((dn: string) => (
                <option key={dn} value={dn}>
                  {dn}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Grid App Reference Number</label>
            <input
              type="text"
              value={formData.gridAppRef}
              onChange={e => handleChange('gridAppRef', e.target.value)}
              placeholder="e.g. AG-2026-9901"
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Energy Retailer</label>
            <select
              value={formData.energyRetailer}
              onChange={e => handleChange('energyRetailer', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            >
              {(dropdowns?.energyRetailers || ['AGL Energy', 'Origin Energy', 'EnergyAustralia', 'Red Energy', 'Amber Electric', 'Powershop', 'Dodo', 'Ovo Energy', 'Alinta Energy']).map((er: string) => (
                <option key={er} value={er}>
                  {er}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Retailer Reference</label>
            <input
              type="text"
              value={formData.retailerRef}
              onChange={e => handleChange('retailerRef', e.target.value)}
              placeholder="e.g. RET-889102"
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Grid App Status & Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 pt-1">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Grid App Status</label>
            <select
              value={formData.gridAppStatus}
              onChange={e => handleChange('gridAppStatus', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            >
              {(dropdowns?.gridAppStatuses || ['Not Applied', 'Grid Applied', 'Grid App Approved', 'Grid Rejected', 'Resubmitted', 'Connection Contract Signed']).map((gs: string) => (
                <option key={gs} value={gs}>
                  {gs}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Grid Applied Date</label>
            <input
              type="date"
              value={formData.gridAppliedDate}
              onChange={e => handleChange('gridAppliedDate', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Grid Rejected Date</label>
            <input
              type="date"
              value={formData.gridRejectedDate}
              onChange={e => handleChange('gridRejectedDate', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Grid Approval Date</label>
            <input
              type="date"
              value={formData.gridApprovalDate}
              onChange={e => handleChange('gridApprovalDate', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>
        </div>
      </section>

      {/* SECTION 5: Installation Details */}
      <section className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 sm:p-5 space-y-4 shadow-md">
        <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#bef26420] text-[#bef264] text-xs font-bold border border-[#bef26440]">
              5
            </span>
            <h3 className="font-semibold text-white text-sm tracking-wide">
              Installation Details &amp; Installer Scheduling
            </h3>
          </div>
          <span className="text-[11px] text-gray-400 bg-[#222] px-2 py-0.5 rounded border border-[#333]">
            Section 5
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Installation Date</label>
            <input
              type="date"
              value={formData.installationDate}
              onChange={e => handleChange('installationDate', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Installation Status</label>
            <select
              value={formData.installationStatus}
              onChange={e => handleChange('installationStatus', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            >
              {(dropdowns?.installationStatuses || ['Unscheduled', 'Installation Booked', 'Job Dispatched', 'In Progress', 'Installed & Tested', 'Rectification Required', 'Closed']).map((is: string) => (
                <option key={is} value={is}>
                  {is}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Booking Date</label>
            <input
              type="date"
              value={formData.installationBookingDate}
              onChange={e => handleChange('installationBookingDate', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Booked By (Coordinator)</label>
            <select
              value={formData.installationBookedBy}
              onChange={e => handleChange('installationBookedBy', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            >
              <option value="">Select Coordinator</option>
              {(dropdowns?.coordinators || ['Emma Watson', 'Liam Davis', 'Sarah Jenkins']).map((cd: string) => (
                <option key={cd} value={cd}>
                  {cd}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Completed Month</label>
            <input
              type="month"
              value={formData.installationCompletedMonth}
              onChange={e => handleChange('installationCompletedMonth', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Installation Docs Status</label>
            <select
              value={formData.installationDocsStatus}
              onChange={e => handleChange('installationDocsStatus', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            >
              {(dropdowns?.installationDocsStatuses || ['Pending On-Site Form', 'CES Submitted', 'STC Photos Verified', 'Docs Complete']).map((ds: string) => (
                <option key={ds} value={ds}>
                  {ds}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Docs Received Date</label>
            <input
              type="date"
              value={formData.installationDocsReceivedDate}
              onChange={e => handleChange('installationDocsReceivedDate', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Installer Invoice & Accounts */}
        <div className="p-3.5 bg-[#141414] border border-[#282828] rounded-xl space-y-3">
          <div className="text-xs font-semibold text-[#bef264] flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5" />
            <span>Accredited Installer &amp; Subcontractor Invoicing</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Installer Name (CEC Electrician)</label>
              <select
                value={formData.installerName}
                onChange={e => handleChange('installerName', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              >
                <option value="">Select Installer</option>
                {(dropdowns?.installers || ['Apex Solar Electrical (CEC #A19283)', 'Sydney Metro Sparkies (CEC #A49102)', 'SunRun Contracting (CEC #A77219)']).map((inst: string) => (
                  <option key={inst} value={inst}>
                    {inst}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Installer Invoice Date</label>
              <input
                type="date"
                value={formData.installerInvoiceDate}
                onChange={e => handleChange('installerInvoiceDate', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Installer Invoice #</label>
              <input
                type="text"
                placeholder="INV-ELEC-4421"
                value={formData.installerInvoiceNumber}
                onChange={e => handleChange('installerInvoiceNumber', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Installer Invoice Amount ($ AUD)</label>
              <input
                type="text"
                value={formData.installerInvoiceAmount}
                onChange={e => handleChange('installerInvoiceAmount', e.target.value)}
                onBlur={() => {
                  const parsed = parseAudAccounts(formData.installerInvoiceAmount);
                  if (parsed > 0) handleChange('installerInvoiceAmount', formatAudAccounts(parsed));
                }}
                placeholder="$2,200.00"
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono font-semibold text-[#bef264] placeholder-gray-600 focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Installer Invoice Status</label>
              <select
                value={formData.installerInvoiceStatus}
                onChange={e => handleChange('installerInvoiceStatus', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              >
                {(dropdowns?.installerInvoiceStatuses || ['Pending Review', 'Approved for Payment', 'Paid', 'Disputed']).map((iis: string) => (
                  <option key={iis} value={iis}>
                    {iis}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Customer Final Invoice #</label>
              <input
                type="text"
                placeholder="INV-2026-9041"
                value={formData.customerInvoiceNumber}
                onChange={e => handleChange('customerInvoiceNumber', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: Warehouse Details & Equipment Dispatch */}
      <section className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 sm:p-5 space-y-4 shadow-md">
        <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#bef26420] text-[#bef264] text-xs font-bold border border-[#bef26440]">
              6
            </span>
            <h3 className="font-semibold text-white text-sm tracking-wide">
              Warehouse Details &amp; Equipment Dispatch
            </h3>
          </div>
          <span className="text-[11px] text-gray-400 bg-[#222] px-2 py-0.5 rounded border border-[#333]">
            Section 6
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Warehouse Location</label>
            <select
              value={formData.warehouse}
              onChange={e => handleChange('warehouse', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            >
              {(dropdowns?.warehouses || ['Sydney Central DC', 'Melbourne West Hub', 'Brisbane North DC', 'Adelaide Distribution', 'Perth Logistics']).map((wh: string) => (
                <option key={wh} value={wh}>
                  {wh}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Sales Order # (SO)</label>
            <input
              type="text"
              value={formData.salesOrderNo}
              onChange={e => handleChange('salesOrderNo', e.target.value)}
              placeholder="SO-99102"
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Warehouse Invoice Date</label>
            <input
              type="date"
              value={formData.warehouseInvoiceDate}
              onChange={e => handleChange('warehouseInvoiceDate', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Warehouse Invoice #</label>
            <input
              type="text"
              value={formData.warehouseInvoiceNumber}
              onChange={e => handleChange('warehouseInvoiceNumber', e.target.value)}
              placeholder="WH-INV-4410"
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Warehouse Invoice Amount ($ AUD)</label>
            <input
              type="text"
              value={formData.warehouseInvoiceAmount}
              onChange={e => handleChange('warehouseInvoiceAmount', e.target.value)}
              onBlur={() => {
                const parsed = parseAudAccounts(formData.warehouseInvoiceAmount);
                if (parsed > 0) handleChange('warehouseInvoiceAmount', formatAudAccounts(parsed));
              }}
              placeholder="$5,400.00"
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono font-semibold text-[#bef264] placeholder-gray-600 focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Warehouse Invoice Status</label>
            <select
              value={formData.warehouseInvoiceStatus}
              onChange={e => handleChange('warehouseInvoiceStatus', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            >
              {(dropdowns?.warehouseInvoiceStatuses || ['Draft', 'Awaiting Dispatch', 'Invoiced', 'Paid', 'Reconciled']).map((wis: string) => (
                <option key={wis} value={wis}>
                  {wis}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Stock Status</label>
            <select
              value={formData.stockStatus}
              onChange={e => handleChange('stockStatus', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            >
              {(dropdowns?.stockStatuses || ['In Stock', 'Allocated to Job', 'Awaiting Shipment', 'Dispatched to Site', 'Delivered & Installed']).map((ss: string) => (
                <option key={ss} value={ss}>
                  {ss}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Stock Used Project</label>
            <input
              type="text"
              value={formData.stockUsedProject}
              onChange={e => handleChange('stockUsedProject', e.target.value)}
              placeholder="Allocated Project Code"
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>
        </div>
      </section>

      {/* SECTION 7: Financials, Payment & Finance Brokerage */}
      <section className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 sm:p-5 space-y-4 shadow-md">
        <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#bef26420] text-[#bef264] text-xs font-bold border border-[#bef26440]">
              7
            </span>
            <h3 className="font-semibold text-white text-sm tracking-wide">
              Financials, Payment &amp; Finance Brokerage
            </h3>
          </div>
          <span className="text-[11px] text-gray-400 bg-[#222] px-2 py-0.5 rounded border border-[#333]">
            Section 7
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">System Price ($ AUD)</label>
            <input
              type="text"
              value={formData.systemPrice}
              onChange={e => handleChange('systemPrice', e.target.value)}
              onBlur={() => {
                const parsed = parseAudAccounts(formData.systemPrice);
                if (parsed > 0) handleChange('systemPrice', formatAudAccounts(parsed));
              }}
              placeholder="$14,500.00"
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono font-semibold text-[#bef264] placeholder-gray-600 focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Selling Price (After Rebates)</label>
            <input
              type="text"
              value={formData.sellingPrice}
              onChange={e => handleChange('sellingPrice', e.target.value)}
              onBlur={() => {
                const parsed = parseAudAccounts(formData.sellingPrice);
                if (parsed > 0) handleChange('sellingPrice', formatAudAccounts(parsed));
              }}
              placeholder="$10,500.00"
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono font-semibold text-[#bef264] placeholder-gray-600 focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Deposit ($ AUD)</label>
            <input
              type="text"
              value={formData.deposit}
              onChange={e => handleChange('deposit', e.target.value)}
              onBlur={() => {
                const parsed = parseAudAccounts(formData.deposit);
                if (parsed > 0) handleChange('deposit', formatAudAccounts(parsed));
              }}
              placeholder="$1,000.00"
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono font-semibold text-[#bef264] placeholder-gray-600 focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Deposit Received Date</label>
            <input
              type="date"
              value={formData.depositReceivedDate}
              onChange={e => handleChange('depositReceivedDate', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Balance Payable ($ AUD)</label>
            <input
              type="text"
              value={formData.balancePayable}
              onChange={e => handleChange('balancePayable', e.target.value)}
              onBlur={() => {
                const parsed = parseAudAccounts(formData.balancePayable);
                if (parsed > 0) handleChange('balancePayable', formatAudAccounts(parsed));
              }}
              placeholder="$9,500.00"
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono font-semibold text-[#bef264] placeholder-gray-600 focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Balance Payable Date</label>
            <input
              type="date"
              value={formData.balancePayableDate}
              onChange={e => handleChange('balancePayableDate', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Remaining Payment ($ AUD)</label>
            <input
              type="text"
              value={formData.remainingPayment}
              onChange={e => handleChange('remainingPayment', e.target.value)}
              onBlur={() => {
                const parsed = parseAudAccounts(formData.remainingPayment);
                if (parsed > 0) handleChange('remainingPayment', formatAudAccounts(parsed));
              }}
              placeholder="$0.00"
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono font-semibold text-[#bef264] placeholder-gray-600 focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Finance Brokerage Sub-card */}
        <div className="p-3.5 bg-[#141414] border border-[#282828] rounded-xl space-y-3">
          <div className="text-xs font-semibold text-[#bef264] flex items-center gap-1.5">
            <BadgePercent className="w-3.5 h-3.5" />
            <span>Finance Brokerage &amp; Green Loan Application</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Is on Finance</label>
              <select
                value={formData.isOnFinance}
                onChange={e => handleChange('isOnFinance', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              >
                {(dropdowns?.isFinanceOptions || ['No (Cash / Direct Payment)', 'Yes (Green Finance)', 'Yes (Interest Free)', 'Conditional Finance']).map((ifo: string) => (
                  <option key={ifo} value={ifo}>
                    {ifo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Finance Company Name</label>
              <select
                value={formData.financeCompanyName}
                onChange={e => handleChange('financeCompanyName', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              >
                <option value="">Select Finance Provider</option>
                {(dropdowns?.financeCompanies || ['Brighte', 'Plenti', 'Community First Credit Union', 'Humm', 'Handepay', 'Parker Lane']).map((fc: string) => (
                  <option key={fc} value={fc}>
                    {fc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Finance Status</label>
              <select
                value={formData.financeStatus}
                onChange={e => handleChange('financeStatus', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              >
                {(dropdowns?.financeStatuses || ['Not Applicable', 'Application Draft', 'Submitted', 'Conditionally Approved', 'Unconditionally Approved', 'Settled', 'Declined']).map((fs: string) => (
                  <option key={fs} value={fs}>
                    {fs}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Finance Applied Date</label>
              <input
                type="date"
                value={formData.financeAppliedDate}
                onChange={e => handleChange('financeAppliedDate', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Finance Approved Date</label>
              <input
                type="date"
                value={formData.financeApprovedDate}
                onChange={e => handleChange('financeApprovedDate', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Finance Approved Amount ($ AUD)</label>
              <input
                type="text"
                value={formData.financeApprovedAmount}
                onChange={e => handleChange('financeApprovedAmount', e.target.value)}
                onBlur={() => {
                  const parsed = parseAudAccounts(formData.financeApprovedAmount);
                  if (parsed > 0) handleChange('financeApprovedAmount', formatAudAccounts(parsed));
                }}
                placeholder="$10,500.00"
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono font-semibold text-[#bef264] placeholder-gray-600 focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8: STC Details & Clean Energy Regulator (CER) */}
      <section className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 sm:p-5 space-y-4 shadow-md">
        <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#bef26420] text-[#bef264] text-xs font-bold border border-[#bef26440]">
              8
            </span>
            <h3 className="font-semibold text-white text-sm tracking-wide">
              STC Details &amp; Clean Energy Regulator (CER)
            </h3>
          </div>
          <span className="text-[11px] text-gray-400 bg-[#222] px-2 py-0.5 rounded border border-[#333]">
            Section 8
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">STC Traded Portal</label>
            <select
              value={formData.stcTradedPortal}
              onChange={e => handleChange('stcTradedPortal', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            >
              {(dropdowns?.stcPortals || ['BridgeSelect', 'Green Energy Trading (GET)', 'Clean Energy Trading', 'TradeSTCs', 'REC Registry']).map((sp: string) => (
                <option key={sp} value={sp}>
                  {sp}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">STC Job No</label>
            <input
              type="text"
              value={formData.stcJobNo}
              onChange={e => handleChange('stcJobNo', e.target.value)}
              placeholder="STC-2026-991"
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Solar STCs */}
        <div className="p-3.5 bg-[#141414] border border-[#282828] rounded-xl space-y-3">
          <div className="text-xs font-semibold text-[#bef264] flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5" />
            <span>Solar STC Trading &amp; Claim</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Solar STC's (Count)</label>
              <input
                type="text"
                value={formData.solarStcs}
                onChange={e => handleChange('solarStcs', e.target.value)}
                placeholder="66"
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Solar STC's Amount ($ AUD)</label>
              <input
                type="text"
                value={formData.solarStcsAmount}
                onChange={e => handleChange('solarStcsAmount', e.target.value)}
                onBlur={() => {
                  const parsed = parseAudAccounts(formData.solarStcsAmount);
                  if (parsed > 0) handleChange('solarStcsAmount', formatAudAccounts(parsed));
                }}
                placeholder="$2,376.00"
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono font-semibold text-[#bef264] placeholder-gray-600 focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Solar STC Received Date</label>
              <input
                type="date"
                value={formData.solarStcReceivedDate}
                onChange={e => handleChange('solarStcReceivedDate', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Battery STCs */}
        <div className="p-3.5 bg-[#141414] border border-[#282828] rounded-xl space-y-3">
          <div className="text-xs font-semibold text-[#bef264] flex items-center gap-1.5">
            <Battery className="w-3.5 h-3.5" />
            <span>Battery STC / Peak Demand Incentive</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Battery STC's (Count)</label>
              <input
                type="text"
                value={formData.batteryStcs}
                onChange={e => handleChange('batteryStcs', e.target.value)}
                placeholder="e.g. 24"
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Battery STC's Amount ($ AUD)</label>
              <input
                type="text"
                value={formData.batteryStcsAmount}
                onChange={e => handleChange('batteryStcsAmount', e.target.value)}
                onBlur={() => {
                  const parsed = parseAudAccounts(formData.batteryStcsAmount);
                  if (parsed > 0) handleChange('batteryStcsAmount', formatAudAccounts(parsed));
                }}
                placeholder="$864.00"
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono font-semibold text-[#bef264] placeholder-gray-600 focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Battery STC Received Date</label>
              <input
                type="date"
                value={formData.batteryStcReceivedDate}
                onChange={e => handleChange('batteryStcReceivedDate', e.target.value)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Total STC Received, Admin Charges, Status & Submitted Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Total STC Amount Received ($ AUD)</label>
            <input
              type="text"
              value={formData.totalStcAmountReceived}
              onChange={e => handleChange('totalStcAmountReceived', e.target.value)}
              onBlur={() => {
                const parsed = parseAudAccounts(formData.totalStcAmountReceived);
                if (parsed > 0) handleChange('totalStcAmountReceived', formatAudAccounts(parsed));
              }}
              placeholder="$3,240.00"
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono font-semibold text-[#bef264] placeholder-gray-600 focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Admin Charges</label>
            <input
              type="text"
              value={formData.adminCharges}
              onChange={e => handleChange('adminCharges', e.target.value)}
              placeholder="$150.00"
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">STC Status</label>
            <select
              value={formData.stcStatus}
              onChange={e => handleChange('stcStatus', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            >
              {(dropdowns?.stcStatuses || ['Pending Upload', 'Pre-Validation Passed', 'Submitted to CER', 'Approved & Traded', 'Audit Flagged', 'Paid']).map((stcStat: string) => (
                <option key={stcStat} value={stcStat}>
                  {stcStat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">STC Submitted Date</label>
            <input
              type="date"
              value={formData.stcSubmittedDate}
              onChange={e => handleChange('stcSubmittedDate', e.target.value)}
              className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
            />
          </div>
        </div>
      </section>
    </div>
  );
};
