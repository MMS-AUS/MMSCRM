import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Lead, AustralianState, LeadActivity, LeadAttachment, CustomerPortalCredentials } from '../../types';
import {
  formatAudAccounts,
  formatAudNumber,
  stripDollarSign,
  parseAudAccounts,
  formatAustralianMobile,
  classifyAustralianPostcode,
  getNearestBigCity
} from '../../utils/australianPostcodes';
import {
  X,
  Save,
  Check,
  Building2,
  Sparkles,
  FileSpreadsheet,
  Layers,
  CheckCircle2,
  Sun,
  DollarSign,
  Hash,
  Activity,
  Trash2,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { LeadDetailsLeftPanel, LeadDetailsFormData } from './LeadDetailsLeftPanel';
import { LeadCenterTabs } from './LeadCenterTabs';
import { LeadRightSidebar } from './LeadRightSidebar';

interface LeadEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
}

export const LeadEditModal: React.FC<LeadEditModalProps> = ({ isOpen, onClose, lead }) => {
  const {
    dropdowns,
    addLead,
    updateLead,
    deleteLead,
    addLeadActivity,
    toggleLeadActivityTask,
    deleteLeadActivity,
    addLeadAttachment,
    deleteLeadAttachment,
    sendCustomerPortalInvite,
    createLeadXeroInvoice,
    generateLeadXeroReceipt,
    themeMode
  } = useApp();

  const isLight = themeMode === 'corporate-slate';
  const isEditing = Boolean(lead);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isFetchingFromDb, setIsFetchingFromDb] = useState(false);
  const [dbSynced, setDbSynced] = useState(false);

  // Form State encapsulating all Left Panel fields
  const [formData, setFormData] = useState<LeadDetailsFormData>({
    projectNumber: '',
    leadDate: '',
    platform: '',
    salesPersonName: '',
    status: 'New',
    saleDate: '',
    depositReceivedDate: '',

    firstName: '',
    lastName: '',
    managerRenteeFirstName: '',
    managerRenteeLastName: '',

    hasCompany: false,
    companyName: '',
    companyOwner: '',
    companyCreateDate: '',
    companyPhone: '',
    companyCity: '',
    companyCountry: 'Australia',
    companyType: 'Commercial Customer',
    companyAbn: '',

    address: '',
    suburb: '',
    state: 'NSW',
    postcode: '',
    area: 'Metro',
    nearestBigCity: 'Sydney',
    addressVerified: false,

    primaryMobile: '',
    secondaryMobile: '',
    email: '',

    systemSizeKw: 10.4,
    batteryRequired: false,
    roofType: 'Colorbond / Metal Sheet',
    noOfPanels: '24',
    panelManufacturer: 'AIKO Solar',
    panelSizeW: '440',
    panelSeries: 'Neostar 2P',
    panelModel: 'AIKO-A440-MAH54Mb (All-Black N-Type ABC)',
    noOfInverters: '1',
    inverterManufacturer: 'Sungrow (SG/SH Series)',
    inverterSizeKw: '10',
    inverterSeries: 'SH Series Three Phase',
    inverterModel: 'SH10RT-20 (Three Phase High Voltage Hybrid)',
    noOfBatteries: '',
    batteryManufacturer: '',
    batteryUsableCapacityKwh: '',
    batteryModel: '',
    batterySize: '',
    houseStorey: 'Double Storey',
    phase: 'Three Phase',
    existingSystemDetails: 'No existing solar installed (Brand new installation)',
    docsReceived: 'No',
    docsReceivedDate: '',

    systemPrice: '12,500.00',
    sellingPrice: '8,900.00',
    deposit: '1,000.00',

    salesTeamNotes: ''
  });

  // Attachments & Portal & Xero state
  const [attachments, setAttachments] = useState<LeadAttachment[]>([]);
  const [portalCredentials, setPortalCredentials] = useState<CustomerPortalCredentials | undefined>(undefined);
  const [xeroInvoiceId, setXeroInvoiceId] = useState<string>('');
  const [xeroInvoiceNumber, setXeroInvoiceNumber] = useState<string>('');
  const [xeroInvoiceTotal, setXeroInvoiceTotal] = useState<number>(0);
  const [xeroInvoiceStatus, setXeroInvoiceStatus] = useState<string>('');
  const [xeroReceiptNumber, setXeroReceiptNumber] = useState<string>('');
  const [xeroReceiptDate, setXeroReceiptDate] = useState<string>('');
  const [xeroReceiptAmount, setXeroReceiptAmount] = useState<number>(0);
  const [xeroReceiptMethod, setXeroReceiptMethod] = useState<string>('');
  const [xeroActionNotice, setXeroActionNotice] = useState<string | null>(null);

  // Activities state (local fallback merged with lead activities)
  const [activities, setActivities] = useState<LeadActivity[]>([]);

  // Hardware Cascading Lists
  const panelHierarchy = dropdowns.panelHierarchy || [];
  const panelManufacturers = useMemo(() => {
    const list = Array.from(new Set(panelHierarchy.map(p => p.manufacturer)));
    return list.length > 0 ? list : dropdowns.panelBrands || ['AIKO Solar', 'Trina Solar', 'Jinko Solar'];
  }, [panelHierarchy, dropdowns.panelBrands]);

  const panelSizes = useMemo(() => {
    const matching = panelHierarchy.filter(p => p.manufacturer === formData.panelManufacturer);
    return Array.from(new Set(matching.map(p => String(p.sizeW))));
  }, [panelHierarchy, formData.panelManufacturer]);

  const panelSeriesList = useMemo(() => {
    const matching = panelHierarchy.filter(
      p => p.manufacturer === formData.panelManufacturer && String(p.sizeW) === String(formData.panelSizeW)
    );
    return Array.from(new Set(matching.map(p => p.series)));
  }, [panelHierarchy, formData.panelManufacturer, formData.panelSizeW]);

  const panelModels = useMemo(() => {
    const matching = panelHierarchy.filter(
      p =>
        p.manufacturer === formData.panelManufacturer &&
        String(p.sizeW) === String(formData.panelSizeW) &&
        p.series === formData.panelSeries
    );
    return Array.from(new Set(matching.map(p => p.model)));
  }, [panelHierarchy, formData.panelManufacturer, formData.panelSizeW, formData.panelSeries]);

  const normHw = (v?: string) => (v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanNumeric = (val: any): number | null => {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return isNaN(val) ? null : val;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  };

  const inverterHierarchy = dropdowns.inverterHierarchy || [];
  const inverterManufacturers = useMemo(() => {
    const list = Array.from(new Set(inverterHierarchy.map(i => i.manufacturer)));
    const baseList = list.length > 0 ? list : dropdowns.inverterBrands || ['Sungrow', 'Fronius', 'Enphase', 'GoodWe'];
    if (formData.inverterManufacturer && !baseList.some(m => normHw(m) === normHw(formData.inverterManufacturer))) {
      baseList.unshift(formData.inverterManufacturer);
    }
    return baseList;
  }, [inverterHierarchy, dropdowns.inverterBrands, formData.inverterManufacturer]);

  const inverterSizes = useMemo(() => {
    const normManuf = normHw(formData.inverterManufacturer);
    const matching = inverterHierarchy.filter(i => 
      !normManuf || normHw(i.manufacturer) === normManuf ||
      normHw(i.manufacturer).includes(normManuf) ||
      normManuf.includes(normHw(i.manufacturer))
    );
    const list = Array.from(new Set(matching.map(i => String(i.sizeKw))));
    if (formData.inverterSizeKw && !list.includes(String(formData.inverterSizeKw))) {
      list.unshift(String(formData.inverterSizeKw));
    }
    return list.length > 0 ? list : ['5', '5.0', '6.0', '8.0', '10.0'];
  }, [inverterHierarchy, formData.inverterManufacturer, formData.inverterSizeKw]);

  const inverterSeriesList = useMemo(() => {
    const normManuf = normHw(formData.inverterManufacturer);
    const numSize = cleanNumeric(formData.inverterSizeKw);
    let matching = inverterHierarchy.filter(i => {
      const matchM = !normManuf || normHw(i.manufacturer) === normManuf ||
        normHw(i.manufacturer).includes(normManuf) ||
        normManuf.includes(normHw(i.manufacturer));
      const matchS = numSize === null || cleanNumeric(i.sizeKw) === numSize;
      return matchM && matchS;
    });
    if (matching.length === 0 && normManuf) {
      matching = inverterHierarchy.filter(i => normHw(i.manufacturer) === normManuf);
    }
    const list = Array.from(new Set(matching.map(i => i.series || '').filter(Boolean)));
    if (formData.inverterSeries && !list.includes(formData.inverterSeries)) {
      list.push(formData.inverterSeries);
    }
    return list;
  }, [inverterHierarchy, formData.inverterManufacturer, formData.inverterSizeKw, formData.inverterSeries]);

  const inverterModels = useMemo(() => {
    const normManuf = normHw(formData.inverterManufacturer);
    const numSize = cleanNumeric(formData.inverterSizeKw);
    const normSeries = normHw(formData.inverterSeries);

    let matching = inverterHierarchy.filter(i => {
      const matchM = !normManuf || normHw(i.manufacturer) === normManuf ||
        normHw(i.manufacturer).includes(normManuf) ||
        normManuf.includes(normHw(i.manufacturer));
      const matchS = numSize === null || cleanNumeric(i.sizeKw) === numSize;
      const matchSer = !normSeries || normHw(i.series) === normSeries;
      return matchM && matchS && matchSer;
    });

    if (matching.length === 0 && normSeries) {
      matching = inverterHierarchy.filter(i => {
        const matchM = !normManuf || normHw(i.manufacturer) === normManuf ||
          normHw(i.manufacturer).includes(normManuf) ||
          normManuf.includes(normHw(i.manufacturer));
        const matchS = numSize === null || cleanNumeric(i.sizeKw) === numSize;
        return matchM && matchS;
      });
    }

    if (matching.length === 0 && normManuf) {
      matching = inverterHierarchy.filter(i => 
        normHw(i.manufacturer) === normManuf ||
        normHw(i.manufacturer).includes(normManuf) ||
        normManuf.includes(normHw(i.manufacturer))
      );
    }

    const list = Array.from(new Set(matching.map(i => i.model)));
    if (formData.inverterModel && !list.includes(formData.inverterModel)) {
      list.unshift(formData.inverterModel);
    }
    return list;
  }, [inverterHierarchy, formData.inverterManufacturer, formData.inverterSizeKw, formData.inverterSeries, formData.inverterModel]);

  const batteryHierarchy = dropdowns.batteryHierarchy || [];
  const batteryManufacturers = useMemo(() => {
    const list = Array.from(new Set(batteryHierarchy.map(b => b.manufacturer)));
    return list.length > 0 ? list : dropdowns.batteryBrands || ['Tesla Powerwall 3', 'Sungrow Battery', 'BYD Battery-Box'];
  }, [batteryHierarchy, dropdowns.batteryBrands]);

  const batteryCapacities = useMemo(() => {
    const matching = batteryHierarchy.filter(b => b.manufacturer === formData.batteryManufacturer);
    return Array.from(new Set(matching.map(b => String(b.usableCapacityKwh))));
  }, [batteryHierarchy, formData.batteryManufacturer]);

  const batteryModels = useMemo(() => {
    const matching = batteryHierarchy.filter(
      b => b.manufacturer === formData.batteryManufacturer && String(b.usableCapacityKwh) === String(formData.batteryUsableCapacityKwh)
    );
    return Array.from(new Set(matching.map(b => b.model)));
  }, [batteryHierarchy, formData.batteryManufacturer, formData.batteryUsableCapacityKwh]);

  const batterySizes = useMemo(() => {
    const matching = batteryHierarchy.filter(
      b =>
        b.manufacturer === formData.batteryManufacturer &&
        String(b.usableCapacityKwh) === String(formData.batteryUsableCapacityKwh) &&
        b.model === formData.batteryModel
    );
    return Array.from(new Set(matching.map(b => b.size)));
  }, [batteryHierarchy, formData.batteryManufacturer, formData.batteryUsableCapacityKwh, formData.batteryModel]);

  // Cascading Handlers
  const handlePanelManufacturerChange = (manuf: string) => {
    const matching = panelHierarchy.filter(p => p.manufacturer === manuf);
    const firstSize = matching.length > 0 ? String(matching[0].sizeW) : formData.panelSizeW;
    const firstSeries = matching.length > 0 ? matching[0].series : formData.panelSeries;
    const firstModel = matching.length > 0 ? matching[0].model : formData.panelModel;

    let calculatedKw = formData.systemSizeKw;
    if (formData.noOfPanels && Number(firstSize) > 0) {
      calculatedKw = Math.round(((Number(formData.noOfPanels) * Number(firstSize)) / 1000) * 10) / 10;
    }

    setFormData(prev => ({
      ...prev,
      panelManufacturer: manuf,
      panelSizeW: firstSize,
      panelSeries: firstSeries,
      panelModel: firstModel,
      systemSizeKw: calculatedKw || prev.systemSizeKw
    }));
  };

  const handlePanelSizeChange = (size: string) => {
    const matching = panelHierarchy.filter(
      p => p.manufacturer === formData.panelManufacturer && String(p.sizeW) === size
    );
    const seriesVal = matching.length > 0 ? matching[0].series : formData.panelSeries;
    const modelVal = matching.length > 0 ? matching[0].model : formData.panelModel;

    let calculatedKw = formData.systemSizeKw;
    if (formData.noOfPanels && Number(size) > 0) {
      calculatedKw = Math.round(((Number(formData.noOfPanels) * Number(size)) / 1000) * 10) / 10;
    }

    setFormData(prev => ({
      ...prev,
      panelSizeW: size,
      panelSeries: seriesVal,
      panelModel: modelVal,
      systemSizeKw: calculatedKw || prev.systemSizeKw
    }));
  };

  const handlePanelSeriesChange = (seriesVal: string) => {
    const matching = panelHierarchy.filter(
      p =>
        p.manufacturer === formData.panelManufacturer &&
        String(p.sizeW) === String(formData.panelSizeW) &&
        p.series === seriesVal
    );
    setFormData(prev => ({
      ...prev,
      panelSeries: seriesVal,
      panelModel: matching.length > 0 ? matching[0].model : prev.panelModel
    }));
  };

  const handleNoOfPanelsChange = (val: string) => {
    const n = Number(val);
    const sz = Number(formData.panelSizeW);
    let calculatedKw = formData.systemSizeKw;
    if (n > 0 && sz > 0) {
      calculatedKw = Math.round(((n * sz) / 1000) * 10) / 10;
    }

    setFormData(prev => ({
      ...prev,
      noOfPanels: val,
      systemSizeKw: calculatedKw
    }));
  };

  const handleInverterManufacturerChange = (manuf: string) => {
    const matching = inverterHierarchy.filter(i => normHw(i.manufacturer) === normHw(manuf));
    setFormData(prev => ({
      ...prev,
      inverterManufacturer: manuf,
      inverterSizeKw: matching.length > 0 ? String(matching[0].sizeKw) : prev.inverterSizeKw,
      inverterSeries: matching.length > 0 ? (matching[0].series || '') : prev.inverterSeries,
      inverterModel: matching.length > 0 ? matching[0].model : prev.inverterModel
    }));
  };

  const handleInverterSizeChange = (size: string) => {
    const matching = inverterHierarchy.filter(
      i => normHw(i.manufacturer) === normHw(formData.inverterManufacturer) && cleanNumeric(i.sizeKw) === cleanNumeric(size)
    );
    setFormData(prev => ({
      ...prev,
      inverterSizeKw: size,
      inverterSeries: matching.length > 0 ? (matching[0].series || '') : prev.inverterSeries,
      inverterModel: matching.length > 0 ? matching[0].model : prev.inverterModel
    }));
  };

  const handleInverterSeriesChange = (series: string) => {
    const matching = inverterHierarchy.filter(
      i =>
        normHw(i.manufacturer) === normHw(formData.inverterManufacturer) &&
        cleanNumeric(i.sizeKw) === cleanNumeric(formData.inverterSizeKw) &&
        (!series || normHw(i.series) === normHw(series))
    );
    setFormData(prev => ({
      ...prev,
      inverterSeries: series,
      inverterModel: matching.length > 0 ? matching[0].model : prev.inverterModel
    }));
  };

  const handleBatteryManufacturerChange = (manuf: string) => {
    const matching = batteryHierarchy.filter(b => b.manufacturer === manuf);
    setFormData(prev => ({
      ...prev,
      batteryManufacturer: manuf,
      batteryUsableCapacityKwh: matching.length > 0 ? String(matching[0].usableCapacityKwh) : prev.batteryUsableCapacityKwh,
      batteryModel: matching.length > 0 ? matching[0].model : prev.batteryModel,
      batterySize: matching.length > 0 ? matching[0].size : prev.batterySize
    }));
  };

  const handleBatteryCapacityChange = (cap: string) => {
    const matching = batteryHierarchy.filter(
      b => b.manufacturer === formData.batteryManufacturer && String(b.usableCapacityKwh) === cap
    );
    setFormData(prev => ({
      ...prev,
      batteryUsableCapacityKwh: cap,
      batteryModel: matching.length > 0 ? matching[0].model : prev.batteryModel,
      batterySize: matching.length > 0 ? matching[0].size : prev.batterySize
    }));
  };

  // Helper to map any Lead object (initial or freshly fetched from Supabase) to form state
  const applyLeadToState = (targetLead: Lead) => {
    const rawSysKwCandidates = [
      targetLead.systemSizeKw,
      (targetLead as any).system_size_kw,
      (targetLead as any).system_size,
      (targetLead as any).system_kw,
      (targetLead as any).system_size_kwp,
      (targetLead as any).metadata?.system_size_kw,
      (targetLead as any).metadata?.system_size
    ];
    let resolvedSysKw: any = '';
    for (const cand of rawSysKwCandidates) {
      if (cand !== undefined && cand !== null && cand !== '') {
        const num = typeof cand === 'number' ? cand : parseFloat(String(cand).replace(/[^0-9.]/g, ''));
        if (!isNaN(num) && num > 0) {
          resolvedSysKw = num;
          break;
        }
      }
    }
    // Calculate from panels if still empty or 0
    if (!resolvedSysKw || resolvedSysKw === 0) {
      const pCount = Number(targetLead.noOfPanels || (targetLead as any).panel_count || (targetLead as any).metadata?.no_of_panels) || 0;
      const pSize = Number(targetLead.panelSizeW || (targetLead as any).panel_size || (targetLead as any).metadata?.panel_size_w) || 0;
      if (pCount > 0 && pSize > 0) {
        resolvedSysKw = Math.round((pCount * pSize / 1000) * 100) / 100;
      }
    }

    // Inverter details resolution
    let resolvedInvManuf = targetLead.inverterManufacturer || (targetLead as any).inverter_manufacturer || (targetLead as any).metadata?.inverter_manufacturer || '';
    let resolvedInvModel = String(targetLead.inverterModel || (targetLead as any).inverter_model || (targetLead as any).metadata?.inverter_model || '').trim();
    let resolvedInvSeries = targetLead.inverterSeries || (targetLead as any).inverter_series || (targetLead as any).metadata?.inverter_series || '';
    let resolvedInvSize = (targetLead.inverterSizeKw !== undefined && targetLead.inverterSizeKw !== null && targetLead.inverterSizeKw !== '')
      ? String(targetLead.inverterSizeKw)
      : ((targetLead as any).inverter_size_kw ? String((targetLead as any).inverter_size_kw) : '');

    // Match in inverterHierarchy if model is present to resolve missing fields
    if (resolvedInvModel && inverterHierarchy.length > 0) {
      const normModel = normHw(resolvedInvModel);
      const matchedInv = inverterHierarchy.find(i => {
        const itemNorm = normHw(i.model);
        return itemNorm === normModel || itemNorm.includes(normModel) || normModel.includes(itemNorm);
      });
      if (matchedInv) {
        if (!resolvedInvManuf || normHw(resolvedInvManuf) === normHw(matchedInv.manufacturer)) {
          resolvedInvManuf = matchedInv.manufacturer;
        }
        if (!resolvedInvSeries && matchedInv.series) {
          resolvedInvSeries = matchedInv.series;
        }
        if (!resolvedInvSize && matchedInv.sizeKw) {
          resolvedInvSize = String(matchedInv.sizeKw);
        }
      }
    }

    // Fallback: extract size from model name if still missing
    if (!resolvedInvSize && resolvedInvModel) {
      const match = resolvedInvModel.match(/(?:-|\b|_)([0-9]+(?:\.[0-9]+)?)\s*(?:k|kw|rt|rs|ktl)?\b/i);
      if (match && match[1]) {
        const val = parseFloat(match[1]);
        if (!isNaN(val) && val >= 1 && val <= 250) {
          resolvedInvSize = String(val);
        }
      }
    }

    const isBatReq = Boolean(targetLead.batteryRequired ?? (targetLead as any).battery_required);
    const rawBatCap = targetLead.batteryUsableCapacityKwh ?? (targetLead as any).battery_storage_kwh ?? (targetLead as any).battery_storage ?? (targetLead as any).battery_usable_capacity_kwh;
    const parsedBatCap = (isBatReq && rawBatCap !== undefined && rawBatCap !== null && rawBatCap !== '')
      ? (typeof rawBatCap === 'number' ? String(rawBatCap) : (String(rawBatCap).replace(/[^0-9.]/g, '') || ''))
      : '';

    setFormData({
      projectNumber: targetLead.projectNumber || '',
      leadDate: targetLead.leadDate || '',
      platform: targetLead.platform || '',
      salesPersonName: targetLead.salesPersonName || targetLead.assignedTo || '',
      status: targetLead.status || '',
      saleDate: targetLead.saleDate || '',
      depositReceivedDate: targetLead.depositReceivedDate || '',

      firstName: targetLead.firstName || (targetLead.customerName ? targetLead.customerName.split(' ')[0] : ''),
      lastName: targetLead.lastName || (targetLead.customerName ? targetLead.customerName.split(' ').slice(1).join(' ') : ''),
      managerRenteeFirstName: targetLead.managerRenteeFirstName || '',
      managerRenteeLastName: targetLead.managerRenteeLastName || '',

      hasCompany: Boolean(targetLead.hasCompany || targetLead.companyName || targetLead.companyId),
      companyName: targetLead.companyName || '',
      companyOwner: targetLead.companyOwner || targetLead.salesPersonName || '',
      companyCreateDate: targetLead.companyCreateDate || '',
      companyPhone: targetLead.companyPhone || targetLead.primaryMobile || targetLead.phone || '',
      companyCity: targetLead.companyCity || targetLead.suburb || '',
      companyCountry: targetLead.companyCountry || 'Australia',
      companyType: targetLead.companyType || '',
      companyAbn: targetLead.companyAbn || '',

      address: targetLead.address || '',
      suburb: targetLead.suburb || '',
      state: targetLead.state || '',
      postcode: targetLead.postcode || '',
      area: targetLead.area || '',
      nearestBigCity: targetLead.nearestBigCity || '',
      addressVerified: targetLead.addressVerified ?? Boolean(targetLead.address && targetLead.postcode),

      primaryMobile: targetLead.primaryMobile || targetLead.phone || '',
      secondaryMobile: targetLead.secondaryMobile || '',
      email: targetLead.email || '',

      systemSizeKw: (resolvedSysKw !== '' && resolvedSysKw !== 0 && !isNaN(Number(resolvedSysKw))) ? resolvedSysKw : '',
      batteryRequired: isBatReq,
      roofType: targetLead.roofType || '',
      noOfPanels: targetLead.noOfPanels !== undefined && targetLead.noOfPanels !== null ? String(targetLead.noOfPanels) : '',
      panelManufacturer: targetLead.panelManufacturer || '',
      panelSizeW: targetLead.panelSizeW !== undefined && targetLead.panelSizeW !== null ? String(targetLead.panelSizeW) : '',
      panelSeries: targetLead.panelSeries || '',
      panelModel: targetLead.panelModel || '',
      noOfInverters: targetLead.noOfInverters !== undefined && targetLead.noOfInverters !== null ? String(targetLead.noOfInverters) : '1',
      inverterManufacturer: resolvedInvManuf,
      inverterSizeKw: resolvedInvSize,
      inverterSeries: resolvedInvSeries,
      inverterModel: resolvedInvModel,
      noOfBatteries: isBatReq && targetLead.noOfBatteries !== undefined && targetLead.noOfBatteries !== null ? String(targetLead.noOfBatteries) : '',
      batteryManufacturer: isBatReq ? (targetLead.batteryManufacturer || '') : '',
      batteryUsableCapacityKwh: parsedBatCap,
      batteryModel: isBatReq ? (targetLead.batteryModel || '') : '',
      batterySize: isBatReq ? (targetLead.batterySize || '') : '',
      houseStorey: targetLead.houseStorey || '',
      phase: targetLead.phase || '',
      existingSystemDetails: targetLead.existingSystemDetails || '',
      docsReceived: targetLead.docsReceived || (targetLead as any).docs_received || 'No',
      docsReceivedDate: targetLead.docsReceivedDate || (targetLead as any).docs_received_date || '',

      systemPrice: targetLead.systemPrice !== undefined && targetLead.systemPrice !== '' ? formatAudNumber(targetLead.systemPrice) : '',
      sellingPrice: targetLead.sellingPrice !== undefined && targetLead.sellingPrice !== '' ? formatAudNumber(targetLead.sellingPrice) : '',
      deposit: targetLead.deposit !== undefined && targetLead.deposit !== '' ? formatAudNumber(targetLead.deposit) : '',

      salesTeamNotes: targetLead.salesTeamNotes || ''
    });

    setAttachments(targetLead.attachments || []);
    setPortalCredentials(targetLead.portalCredentials);
    setXeroInvoiceId(targetLead.xeroInvoiceId || '');
    setXeroInvoiceNumber(targetLead.xeroInvoiceNumber || '');
    setXeroInvoiceTotal(targetLead.xeroInvoiceTotal || 0);
    setXeroInvoiceStatus(targetLead.xeroInvoiceStatus || '');
    setXeroReceiptNumber(targetLead.xeroReceiptNumber || '');
    setXeroReceiptDate(targetLead.xeroReceiptDate || '');
    setXeroReceiptAmount(targetLead.xeroReceiptAmount || 0);
    setXeroReceiptMethod(targetLead.xeroReceiptMethod || '');

    if (targetLead.activities && targetLead.activities.length > 0) {
      setActivities(targetLead.activities);
    }
  };

  const fetchFreshLeadFromDb = async () => {
    if (!lead || !lead.id) return;
    setIsFetchingFromDb(true);
    try {
      const res = await fetch(`/api/leads/${encodeURIComponent(lead.id)}`);
      const data = await res.json();
      if (data && data.success && data.lead) {
        applyLeadToState(data.lead);
        setDbSynced(true);
      }
    } catch (err) {
      console.warn('[LeadEditModal] Failed to fetch latest lead data from Supabase:', err);
    } finally {
      setIsFetchingFromDb(false);
    }
  };

  // Populate state on lead edit or create, and fetch fresh database data
  useEffect(() => {
    setIsConfirmingDelete(false);
    setDbSynced(false);
    if (!isOpen) return;

    if (lead) {
      // 1. Immediately apply the lead in memory so the modal opens with zero delay
      applyLeadToState(lead);

      // 2. Fetch fresh record directly from the Supabase database table
      if (lead.id) {
        setIsFetchingFromDb(true);
        fetch(`/api/leads/${encodeURIComponent(lead.id)}`)
          .then(res => res.json())
          .then(data => {
            if (data && data.success && data.lead) {
              applyLeadToState(data.lead);
              setDbSynced(true);
            }
          })
          .catch(err => console.warn('[LeadEditModal] Notice fetching lead from Supabase table:', err))
          .finally(() => setIsFetchingFromDb(false));
      }
    } else {
      // Defaults for brand new lead
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        projectNumber: '',
        leadDate: today,
        platform: dropdowns.platforms?.[0] || 'Meta Lead Ads (Facebook/Instagram)',
        salesPersonName: dropdowns.salesPersons?.[0] || 'Mitchell Barnes',
        status: 'New',
        saleDate: '',
        depositReceivedDate: '',

        firstName: '',
        lastName: '',
        managerRenteeFirstName: '',
        managerRenteeLastName: '',

        hasCompany: false,
        companyName: '',
        companyOwner: 'Mitchell Barnes',
        companyCreateDate: today,
        companyPhone: '',
        companyCity: 'Sydney',
        companyCountry: 'Australia',
        companyType: 'Commercial Customer',
        companyAbn: '',

        address: '',
        suburb: '',
        state: 'NSW',
        postcode: '',
        area: 'Metro',
        nearestBigCity: 'Sydney',
        addressVerified: false,

        primaryMobile: '',
        secondaryMobile: '',
        email: '',

        systemSizeKw: 10.4,
        batteryRequired: false,
        roofType: 'Colorbond / Metal Sheet',
        noOfPanels: '24',
        panelManufacturer: dropdowns.panelBrands?.[0] || 'AIKO Solar',
        panelSizeW: '440',
        panelSeries: 'Neostar 2P',
        panelModel: 'AIKO-A440-MAH54Mb (All-Black N-Type ABC)',
        noOfInverters: '1',
        inverterManufacturer: dropdowns.inverterBrands?.[0] || 'Sungrow (SG/SH Series)',
        inverterSizeKw: '10',
        inverterSeries: 'SH Series Three Phase',
        inverterModel: 'SH10RT-20 (Three Phase High Voltage Hybrid)',
        noOfBatteries: '',
        batteryManufacturer: '',
        batteryUsableCapacityKwh: '',
        batteryModel: '',
        batterySize: '',
        houseStorey: 'Double Storey',
        phase: 'Three Phase',
        existingSystemDetails: 'No existing solar installed (Brand new installation)',
        docsReceived: 'No',
        docsReceivedDate: '',

        systemPrice: '12,500.00',
        sellingPrice: '8,900.00',
        deposit: '1,000.00',

        salesTeamNotes: ''
      });

      setAttachments([]);
      setPortalCredentials(undefined);
      setXeroInvoiceNumber('');
      setXeroReceiptNumber('');
      setActivities([]);
    }
  }, [lead, isOpen, dropdowns]);

  // Activity handlers
  const handleAddActivity = (activityData: Omit<LeadActivity, 'id' | 'createdAt'>) => {
    const newAct: LeadActivity = {
      ...activityData,
      id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };

    setActivities(prev => [newAct, ...prev]);

    if (lead?.id) {
      addLeadActivity(lead.id, activityData);
    }
  };

  const handleToggleTask = (activityId: string) => {
    setActivities(prev =>
      prev.map(a => (a.id === activityId ? { ...a, completed: !a.completed } : a))
    );

    if (lead?.id) {
      toggleLeadActivityTask(lead.id, activityId);
    }
  };

  const handleDeleteActivity = (activityId: string) => {
    setActivities(prev => prev.filter(a => a.id !== activityId));

    if (lead?.id) {
      deleteLeadActivity(lead.id, activityId);
    }
  };

  // Attachment handlers
  const handleAddAttachment = (attData: Omit<LeadAttachment, 'id' | 'uploadedAt'>) => {
    const newAttachment: LeadAttachment = {
      ...attData,
      id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      uploadedAt: new Date().toISOString().split('T')[0]
    };

    setAttachments(prev => [newAttachment, ...prev]);

    if (lead?.id) {
      addLeadAttachment(lead.id, newAttachment);
    }
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));

    if (lead?.id) {
      deleteLeadAttachment(lead.id, attachmentId);
    }
  };

  // Portal invite handler
  const handleSendPortalInvite = () => {
    const email = formData.email ? formData.email.split(',')[0].trim() : 'customer@gmail.com';
    const tempPass = `Solar-2026!${(formData.lastName || 'Customer').replace(/[^a-zA-Z]/g, '')}#${Math.floor(100 + Math.random() * 900)}`;

    const creds: CustomerPortalCredentials = {
      username: email,
      tempPassword: portalCredentials?.tempPassword || tempPass,
      generatedAt: portalCredentials?.generatedAt || new Date().toISOString(),
      inviteSentAt: new Date().toISOString(),
      inviteLink: `https://customer.mysolarcrm.com.au?auth_user=${encodeURIComponent(email)}`,
      status: 'Credentials Sent'
    };

    setPortalCredentials(creds);

    if (lead?.id) {
      sendCustomerPortalInvite(lead.id);
    }

    handleAddActivity({
      leadId: lead?.id || 'lead-current',
      type: 'Email',
      title: 'Customer Portal Invite Sent',
      description: `Portal access link and temporary password dispatched to ${email}.`,
      createdBy: formData.salesPersonName || 'Mitchell Barnes'
    });
  };

  // Xero Invoicing & Payment Receipts
  const handleCreateXeroInvoice = () => {
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const invNum = `INV-2026-${randNum}`;
    const total = formData.sellingPrice ? parseAudAccounts(formData.sellingPrice) : 8900;

    setXeroInvoiceId(`xero-${Date.now()}`);
    setXeroInvoiceNumber(invNum);
    setXeroInvoiceTotal(total);
    setXeroInvoiceStatus('AUTHORISED');
    setXeroActionNotice(`Xero Tax Invoice ${invNum} ($${total.toLocaleString()} AUD) created and linked to contact!`);
    setTimeout(() => setXeroActionNotice(null), 5000);

    if (lead?.id) {
      createLeadXeroInvoice(lead.id);
    }

    handleAddActivity({
      leadId: lead?.id || 'lead-current',
      type: 'Note',
      title: `Xero Invoice Created (${invNum})`,
      description: `Generated official tax invoice for $${total.toLocaleString()} AUD via Xero Accounting API integration.`,
      createdBy: formData.salesPersonName || 'Mitchell Barnes'
    });
  };

  const handleGenerateXeroReceipt = () => {
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const recNum = `REC-2026-${randNum}`;
    const depAmt = formData.deposit ? parseAudAccounts(formData.deposit) : 1000;
    const paid = depAmt > 0 ? depAmt : 1000;

    setXeroReceiptNumber(recNum);
    setXeroReceiptDate(new Date().toISOString().split('T')[0]);
    setXeroReceiptAmount(paid);
    setXeroReceiptMethod('Direct Bank Transfer (EFT)');
    setXeroActionNotice(`Xero Payment Receipt ${recNum} ($${paid.toLocaleString()} AUD) generated and recorded!`);
    setTimeout(() => setXeroActionNotice(null), 5000);

    if (lead?.id) {
      generateLeadXeroReceipt(lead.id);
    }

    handleAddActivity({
      leadId: lead?.id || 'lead-current',
      type: 'Note',
      title: `Xero Payment Receipt (${recNum})`,
      description: `Customer deposit of $${paid.toLocaleString()} AUD reconciled and receipt generated in Xero.`,
      createdBy: formData.salesPersonName || 'Mitchell Barnes'
    });
  };

  // Two-way connected Lead Status handler (synchronizes top section and lead details)
  const handleStatusChange = (newStatus: string) => {
    const today = new Date().toISOString().split('T')[0];
    const mmddyyyy = `${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getDate()).padStart(2, '0')}/${new Date().getFullYear()}`;
    setFormData(prev => ({
      ...prev,
      status: newStatus,
      saleDate: newStatus === 'Contract Signed' && !prev.saleDate ? today : prev.saleDate,
      depositReceivedDate:
        newStatus === 'Deposit Received' && !prev.depositReceivedDate ? mmddyyyy : prev.depositReceivedDate
    }));

    if (newStatus === 'Contract Signed' && !portalCredentials) {
      const safeLastName = (formData.lastName || formData.firstName || 'Customer').replace(/[^a-zA-Z]/g, '');
      const tempPass = `Solar-2026!${safeLastName}#${Math.floor(100 + Math.random() * 900)}`;
      const primaryEmail = formData.email ? formData.email.split(',')[0].trim() : `${(formData.firstName || 'customer').toLowerCase().replace(/\s+/g, '')}@gmail.com`;
      const autoCreds: CustomerPortalCredentials = {
        username: primaryEmail,
        tempPassword: tempPass,
        generatedAt: new Date().toISOString(),
        inviteSentAt: new Date().toISOString(),
        inviteLink: `https://customer.mysolarcrm.com.au?auth_user=${encodeURIComponent(primaryEmail)}`,
        status: 'Credentials Sent'
      };
      setPortalCredentials(autoCreds);
    }

    handleAddActivity({
      leadId: lead?.id || 'lead-current',
      type: 'Status Change',
      title: `Lead Status Changed to ${newStatus}`,
      description: `Lead status updated to ${newStatus} via synchronized header/details.`,
      createdBy: formData.salesPersonName || 'Mitchell Barnes'
    });
  };

  // Demo Prefill: Meta Lead Ads
  const handlePrefillMetaLead = () => {
    setFormData(prev => ({
      ...prev,
      projectNumber: 'PRJ-2026-081',
      platform: 'Meta Lead Ads (Facebook/Instagram)',
      salesPersonName: 'Mitchell Barnes',
      state: 'NSW',
      postcode: '2026',
      area: 'Metro',
      nearestBigCity: 'Sydney',
      status: 'Contract Signed',
      saleDate: new Date().toISOString().split('T')[0],
      firstName: 'Harrison',
      lastName: 'Vance',
      managerRenteeFirstName: 'Eliza',
      managerRenteeLastName: 'Vance',
      address: '74 Campbell Parade',
      suburb: 'Bondi Beach',
      addressVerified: true,
      primaryMobile: '0401 988 234',
      secondaryMobile: '0402 333 111',
      email: 'harrison.vance@gmail.com, eliza.vance@beachside.com.au',
      salesTeamNotes: 'Commercial customer requested 13.2kW Sungrow Hybrid with commercial invoice.',
      systemPrice: formatAudNumber(14200),
      sellingPrice: formatAudNumber(10500),
      deposit: formatAudNumber(1000),
      depositReceivedDate: '09/08/2026',
      systemSizeKw: 13.2,
      hasCompany: true,
      companyName: 'Bondi Coastal Hospitality Pty Ltd',
      companyOwner: 'Mitchell Barnes',
      companyCreateDate: new Date().toISOString().split('T')[0],
      companyPhone: '02 9130 5544',
      companyCity: 'Bondi',
      companyCountry: 'Australia',
      companyType: 'Commercial Customer',
      companyAbn: '51 824 753 556'
    }));
  };

  // Submit & Save Form
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim() || 'New Customer Lead';
    const cleanPrimary = formatAustralianMobile(formData.primaryMobile);
    const cleanSecondary = formData.secondaryMobile ? formatAustralianMobile(formData.secondaryMobile) : '';

    const leadPayload: Partial<Lead> = {
      projectNumber: formData.projectNumber.trim(),
      leadDate: formData.leadDate || new Date().toISOString().split('T')[0],
      platform: formData.platform || dropdowns.platforms?.[0] || 'Meta Lead Ads (Facebook/Instagram)',
      salesPersonName: formData.salesPersonName || dropdowns.salesPersons?.[0] || 'Mitchell Barnes',
      state: (formData.state as AustralianState) || 'NSW',
      postcode: formData.postcode.trim(),
      area: formData.area || 'Metro',
      nearestBigCity: formData.nearestBigCity || 'Sydney',
      status: formData.status || 'New',
      saleDate: formData.saleDate || '',
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      managerRenteeFirstName: formData.managerRenteeFirstName.trim(),
      managerRenteeLastName: formData.managerRenteeLastName.trim(),
      address: formData.address.trim(),
      suburb: formData.suburb.trim() || `${formData.state} Metro`,
      addressVerified: formData.addressVerified,
      primaryMobile: cleanPrimary,
      secondaryMobile: cleanSecondary,
      email: formData.email.trim(),
      salesTeamNotes: formData.salesTeamNotes.trim(),
      systemPrice: formData.systemPrice ? parseAudAccounts(formData.systemPrice) : 12500,
      sellingPrice: formData.sellingPrice ? parseAudAccounts(formData.sellingPrice) : 8900,
      deposit: formData.deposit ? parseAudAccounts(formData.deposit) : 1000,
      depositReceivedDate: formData.depositReceivedDate || '',

      // Company fields
      hasCompany: formData.hasCompany,
      companyName: formData.hasCompany ? formData.companyName.trim() : undefined,
      companyOwner: formData.hasCompany ? formData.companyOwner.trim() : undefined,
      companyCreateDate: formData.hasCompany ? formData.companyCreateDate : undefined,
      companyPhone: formData.hasCompany ? formData.companyPhone : undefined,
      companyCity: formData.hasCompany ? formData.companyCity : undefined,
      companyCountry: formData.hasCompany ? formData.companyCountry : undefined,
      companyType: formData.hasCompany ? formData.companyType : undefined,
      companyAbn: formData.hasCompany ? formData.companyAbn : undefined,

      // Hardware Specs (Section 6)
      systemSizeKw: (() => {
        const raw = formData.systemSizeKw ? (typeof formData.systemSizeKw === 'number' ? formData.systemSizeKw : parseFloat(String(formData.systemSizeKw).replace(/[^0-9.]/g, '')) || 0) : 0;
        if (raw > 0) return raw;
        const pCount = Number(formData.noOfPanels) || 0;
        const pSize = Number(formData.panelSizeW) || 0;
        if (pCount > 0 && pSize > 0) {
          return Math.round((pCount * pSize / 1000) * 100) / 100;
        }
        return 0;
      })(),
      batteryRequired: Boolean(formData.batteryRequired),
      roofType: formData.roofType,
      noOfPanels: formData.noOfPanels ? Number(formData.noOfPanels) || formData.noOfPanels : undefined,
      panelManufacturer: formData.panelManufacturer,
      panelSizeW: formData.panelSizeW ? Number(formData.panelSizeW) || formData.panelSizeW : undefined,
      panelSeries: formData.panelSeries,
      panelModel: formData.panelModel,
      noOfInverters: formData.noOfInverters ? Number(formData.noOfInverters) || formData.noOfInverters : undefined,
      inverterManufacturer: formData.inverterManufacturer,
      inverterSizeKw: (() => {
        if (formData.inverterSizeKw) {
          const num = Number(formData.inverterSizeKw);
          if (!isNaN(num) && num > 0) return num;
        }
        if (formData.inverterModel) {
          const match = String(formData.inverterModel).match(/(?:-|\b|_)([0-9]+(?:\.[0-9]+)?)\s*(?:k|kw|rt|rs|ktl)?\b/i);
          if (match && match[1]) {
            const val = parseFloat(match[1]);
            if (!isNaN(val) && val >= 1 && val <= 250) return val;
          }
        }
        return undefined;
      })(),
      inverterSeries: formData.inverterSeries,
      inverterModel: formData.inverterModel,
      noOfBatteries: formData.batteryRequired && formData.noOfBatteries ? Number(formData.noOfBatteries) || formData.noOfBatteries : undefined,
      batteryManufacturer: formData.batteryRequired ? (formData.batteryManufacturer || undefined) : undefined,
      batteryUsableCapacityKwh: formData.batteryRequired && formData.batteryUsableCapacityKwh ? Number(formData.batteryUsableCapacityKwh) || undefined : undefined,
      batteryModel: formData.batteryRequired ? (formData.batteryModel || undefined) : undefined,
      batterySize: formData.batteryRequired ? (formData.batterySize || undefined) : undefined,
      houseStorey: formData.houseStorey,
      phase: formData.phase,
      existingSystemDetails: formData.existingSystemDetails,
      docsReceived: formData.docsReceived || 'No',
      docsReceivedDate: formData.docsReceivedDate || undefined,

      // Associated records
      attachments,
      portalCredentials,
      activities,
      xeroInvoiceId,
      xeroInvoiceNumber,
      xeroInvoiceTotal,
      xeroInvoiceStatus,
      xeroReceiptNumber,
      xeroReceiptDate,
      xeroReceiptAmount,
      xeroReceiptMethod,

      customerName: fullName,
      phone: cleanPrimary,
      assignedTo: formData.salesPersonName
    };

    if (isEditing && lead) {
      updateLead(lead.id, leadPayload);
    } else {
      addLead(leadPayload);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden transition-colors ${
      isLight ? 'bg-slate-900/40 backdrop-blur-sm' : 'bg-slate-950/75 backdrop-blur-sm'
    }`}>
      <div className={`w-full max-w-[1520px] rounded-2xl shadow-2xl border overflow-hidden flex flex-col h-[94vh] transition-colors ${
        isLight
          ? 'bg-white border-slate-200 text-slate-800'
          : 'bg-slate-900 border-slate-800 text-slate-200'
      }`}>
        {/* Top Header */}
        <header className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 transition-colors ${
          isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-slate-950/80 border-slate-800'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
              isLight
                ? 'bg-amber-50 border-amber-200 text-amber-600'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
            }`}>
              <Sun className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className={`font-bold text-base truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {formData.firstName || formData.lastName
                    ? `${formData.firstName} ${formData.lastName}`.trim()
                    : isEditing
                    ? 'Edit Solar Lead'
                    : 'New Solar Lead'}
                </h2>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border shrink-0 font-medium ${
                  isLight
                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}>
                  {formData.status}
                </span>
                {formData.hasCompany && (
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1 ${
                    isLight
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-blue-950/80 text-blue-400 border-blue-800'
                  }`}>
                    <Building2 className="w-3 h-3" />
                    {formData.companyName || 'Commercial'}
                  </span>
                )}
              </div>
              <p className={`text-xs truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                HubSpot CRM Workspace • Source: {formData.platform || 'Direct'} • System: {formData.systemSizeKw ? `${formData.systemSizeKw} kW` : 'Not Set'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {isEditing && (
              <button
                type="button"
                onClick={fetchFreshLeadFromDb}
                disabled={isFetchingFromDb}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  isFetchingFromDb
                    ? 'bg-amber-950/40 text-amber-300 border-amber-800 animate-pulse'
                    : isLight
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-emerald-950/40 text-emerald-300 border-emerald-800 hover:bg-emerald-900/50'
                }`}
                title="Fetch latest data from Supabase database table"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingFromDb ? 'animate-spin text-amber-400' : 'text-emerald-400'}`} />
                <span className="hidden sm:inline">{isFetchingFromDb ? 'Fetching DB...' : 'Fetch from DB'}</span>
              </button>
            )}

            {/* Prefill button for demo */}
            <button
              type="button"
              onClick={handlePrefillMetaLead}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Pre-fill with sample commercial lead data"
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
              <span>Sample Lead Data</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 hover:shadow-solar-soft cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-slate-950" />
              <span>{isEditing ? 'Save Changes' : 'Create Lead'}</span>
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

        {/* STATIC NON-SCROLLABLE TOP SECTION */}
        <div className={`px-5 py-3 border-b shrink-0 transition-colors ${
          isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-slate-950 border-slate-800'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              {/* Field 1: Project # (Editable, entered manually by the user) */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-1">
                  <Hash className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                  <label className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Project #
                  </label>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                    isLight ? 'bg-white text-slate-700 border-slate-200' : 'bg-slate-900 text-slate-300 border-slate-700'
                  }`}>
                    Manual Entry
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. PRJ-2026-001"
                    value={formData.projectNumber}
                    onChange={e => setFormData(prev => ({ ...prev, projectNumber: e.target.value }))}
                    className={`w-48 sm:w-56 px-3 py-1.5 rounded-lg text-xs font-mono font-bold focus:outline-none transition-colors shadow-xs ${
                      isLight
                        ? 'bg-white border border-slate-300 hover:border-slate-400 focus:border-amber-500 text-slate-900 placeholder-slate-400'
                        : 'bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-amber-500 text-slate-100'
                    }`}
                  />
                </div>
              </div>

              {/* Field 2: Lead Status (Connected to Lead Status under fields in Lead Details) */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-1">
                  <Activity className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                  <label className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Lead Status
                  </label>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                    isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    Connected to Lead Details
                  </span>
                </div>
                <div className="relative">
                  <select
                    value={formData.status}
                    onChange={e => handleStatusChange(e.target.value)}
                    className={`w-48 sm:w-56 px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none transition-colors cursor-pointer shadow-xs ${
                      isLight
                        ? 'bg-white border border-slate-300 hover:border-slate-400 text-slate-800 focus:border-amber-500'
                        : 'bg-slate-900 border border-slate-700 hover:border-slate-600 text-white focus:border-amber-500'
                    }`}
                  >
                    {dropdowns.leadStatuses?.map((st: string) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Status Pipeline Stage Pills */}
              <div className={`hidden xl:flex items-center gap-1.5 pl-3 border-l ${
                isLight ? 'border-slate-300' : 'border-slate-800'
              }`}>
                {['New', 'Contacted', 'Quote Sent', 'Contract Signed', 'Deposit Received'].map(st => {
                  const isActive = formData.status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleStatusChange(st)}
                      className={`px-2.5 py-1 rounded text-[10px] font-medium transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-xs hover:from-amber-400 hover:to-amber-500'
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

            {/* Context Summary Badges on right side */}
            <div className={`hidden md:flex items-center gap-3 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${
                isLight ? 'bg-white border-slate-300 text-slate-700 shadow-2xs' : 'bg-slate-900 border-slate-700 text-slate-200'
              }`}>
                <span className={`text-[10px] uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Customer:</span>
                <span className={`font-semibold truncate max-w-[140px] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {formData.firstName || formData.lastName
                    ? `${formData.firstName} ${formData.lastName}`.trim()
                    : 'New Inbound'}
                </span>
              </div>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${
                isLight ? 'bg-white border-slate-300 text-slate-700 shadow-2xs' : 'bg-slate-900 border-slate-700 text-slate-200'
              }`}>
                <span className={`text-[10px] uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Capacity:</span>
                <span className={`font-mono font-bold ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>
                  {formData.systemSizeKw ? `${formData.systemSizeKw} kW` : 'Not Set'}
                </span>
              </div>
              {isEditing && (
                <div className={`hidden xl:flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] uppercase font-bold ${
                  isFetchingFromDb
                    ? 'bg-amber-950/40 border-amber-800 text-amber-300 animate-pulse'
                    : dbSynced
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400'
                    : isLight
                    ? 'bg-slate-100 border-slate-300 text-slate-600'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}>
                  {isFetchingFromDb ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                      <span>Fetching DB...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Supabase Live</span>
                    </>
                  )}
                </div>
              )}
              {formData.hasCompany && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${
                  isLight ? 'bg-blue-50 border-blue-200 text-blue-800 shadow-2xs' : 'bg-blue-950/40 border-blue-800/40 text-blue-300'
                }`}>
                  <Building2 className="w-3 h-3" />
                  <span className="font-medium truncate max-w-[140px]">
                    {formData.companyName || 'Commercial'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3-Column HubSpot Layout */}
        <div className={`flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden transition-colors ${
          isLight ? 'bg-slate-50/50 divide-slate-200' : 'bg-slate-950/40 divide-slate-800'
        }`}>
          {/* COLUMN 1: LEFT SIDEBAR (Lead Details Sections 1-8, with System Size (kW) in 6 & Company Checkbox) */}
          <div className="lg:col-span-4 xl:col-span-4 overflow-y-auto pr-2 custom-scrollbar">
            <div className="mb-2 flex items-center justify-between pb-1">
              <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                Lead Details
              </span>
              <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Left Column</span>
            </div>
            <LeadDetailsLeftPanel
              formData={formData}
              setFormData={setFormData}
              dropdowns={dropdowns}
              panelManufacturers={panelManufacturers}
              panelSizes={panelSizes}
              panelSeriesList={panelSeriesList}
              panelModels={panelModels}
              inverterManufacturers={inverterManufacturers}
              inverterSizes={inverterSizes}
              inverterSeriesList={inverterSeriesList}
              inverterModels={inverterModels}
              batteryManufacturers={batteryManufacturers}
              batteryCapacities={batteryCapacities}
              batteryModels={batteryModels}
              batterySizes={batterySizes}
              handlePanelManufacturerChange={handlePanelManufacturerChange}
              handlePanelSizeChange={handlePanelSizeChange}
              handlePanelSeriesChange={handlePanelSeriesChange}
              handleNoOfPanelsChange={handleNoOfPanelsChange}
              handleInverterManufacturerChange={handleInverterManufacturerChange}
              handleInverterSizeChange={handleInverterSizeChange}
              handleInverterSeriesChange={handleInverterSeriesChange}
              handleBatteryManufacturerChange={handleBatteryManufacturerChange}
              handleBatteryCapacityChange={handleBatteryCapacityChange}
            />
          </div>

          {/* COLUMN 2: CENTER COLUMN (2 Tabs: Overview & Activities) */}
          <div className={`lg:col-span-5 xl:col-span-5 overflow-y-auto pr-2 custom-scrollbar flex flex-col rounded-xl border p-3.5 transition-colors ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
          }`}>
            <LeadCenterTabs
              lead={lead}
              formData={formData}
              activities={activities}
              onAddActivity={handleAddActivity}
              onToggleTask={handleToggleTask}
              onDeleteActivity={handleDeleteActivity}
            />
          </div>

          {/* COLUMN 3: RIGHT SIDEBAR (Contact, Company, Attachments, Xero Invoicing & Receipts, Customer Portal) */}
          <div className="lg:col-span-3 xl:col-span-3 overflow-y-auto pr-1 custom-scrollbar">
            <div className="mb-2 flex items-center justify-between pb-1">
              <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                CRM &amp; Financials
              </span>
              <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Right Column</span>
            </div>
            <LeadRightSidebar
              lead={lead}
              formData={formData}
              setFormData={setFormData}
              attachments={attachments}
              onAddAttachment={handleAddAttachment}
              onDeleteAttachment={handleDeleteAttachment}
              portalCredentials={portalCredentials}
              onSendPortalInvite={handleSendPortalInvite}
              onCreateXeroInvoice={handleCreateXeroInvoice}
              onGenerateXeroReceipt={handleGenerateXeroReceipt}
              xeroInvoiceNumber={xeroInvoiceNumber}
              xeroInvoiceTotal={xeroInvoiceTotal}
              xeroInvoiceStatus={xeroInvoiceStatus}
              xeroReceiptNumber={xeroReceiptNumber}
              xeroReceiptAmount={xeroReceiptAmount}
              xeroReceiptDate={xeroReceiptDate}
              xeroActionNotice={xeroActionNotice}
            />
          </div>
        </div>

        {/* Footer Summary Bar */}
        <footer className={`px-5 py-3 border-t flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs transition-colors ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-400'
        }`}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className={`uppercase text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Capacity:</span>
              <span className={`font-bold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>{formData.systemSizeKw ? `${formData.systemSizeKw} kW` : 'Not Set'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`uppercase text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Selling:</span>
              <span className={`font-bold font-mono ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{formatAudAccounts(formData.sellingPrice || 0)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`uppercase text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Deposit:</span>
              <span className={`font-bold font-mono ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>{formatAudAccounts(formData.deposit || 0)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`uppercase text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Company:</span>
              <span className={formData.hasCompany ? (isLight ? 'text-blue-700 font-semibold' : 'text-blue-400 font-semibold') : (isLight ? 'text-slate-500' : 'text-slate-500')}>
                {formData.hasCompany ? formData.companyName || 'Associated' : 'None (Residential)'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing && lead && (
              <div className="flex items-center gap-1.5">
                {isConfirmingDelete ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        deleteLead(lead.id);
                        setIsConfirmingDelete(false);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Permanently Delete this lead"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Yes, Delete Now</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#222] hover:bg-[#333] text-gray-300 text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    className={`px-3 py-1.5 rounded-lg border text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1.5 cursor-pointer ${
                      isLight
                        ? 'border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700'
                        : 'border-rose-900/60 bg-rose-950/40 hover:bg-rose-900/50'
                    }`}
                    title="Delete this lead permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-1.5 rounded-lg border transition-colors ${
                isLight
                  ? 'border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  : 'border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="px-5 py-1.5 rounded-lg font-bold transition-all shadow-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 hover:shadow-solar-soft cursor-pointer"
            >
              {isEditing ? 'Save Changes' : 'Create Lead'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
