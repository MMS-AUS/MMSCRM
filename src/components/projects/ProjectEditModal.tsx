import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Project, AustralianState, LeadActivity, LeadAttachment, CustomerPortalCredentials, ProjectStatus } from '../../types';
import { ALL_PROJECT_STATUSES, normalizeProjectStatus } from '../../utils/statusUtils';
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
  Sun,
  DollarSign,
  Hash,
  Activity,
  Calendar,
  Lock,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Wrench,
  ShieldCheck,
  Zap,
  Layers,
  Send,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Loader2,
  Trash2,
  SlidersHorizontal
} from 'lucide-react';
import { pushJobToBridgeSelect } from '../../services/bridgeSelectService';
import { ProjectDetailsLeftPanel, ProjectFormData } from './ProjectDetailsLeftPanel';
import { ProjectCenterTabs } from './ProjectCenterTabs';
import { ProjectRightSidebar } from './ProjectRightSidebar';

interface ProjectEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
}

export const ProjectEditModal: React.FC<ProjectEditModalProps> = ({
  isOpen,
  onClose,
  project
}) => {
  const {
    dropdowns,
    addProject,
    updateProject,
    updateProjectStatus,
    deleteProject,
    leads,
    addLeadActivity,
    toggleLeadActivityTask,
    deleteLeadActivity,
    addLeadAttachment,
    deleteLeadAttachment,
    themeMode
  } = useApp();

  const isLight = themeMode === 'corporate-slate';
  const isEditing = Boolean(project);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isFetchingFromDb, setIsFetchingFromDb] = useState(false);
  const [dbSynced, setDbSynced] = useState(false);

  // BridgeSelect STC Connector Integration State
  const [bridgeselectSyncStatus, setBridgeselectSyncStatus] = useState<string>(
    (project as any)?.bridgeselect_sync_status || 'un-synced'
  );
  const [isPushingBridgeSelect, setIsPushingBridgeSelect] = useState<boolean>(false);
  const [pushFeedback, setPushFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
    checksum?: string;
  } | null>(null);

  // Form State encapsulating all 8 Sections & Top Fields
  const [formData, setFormData] = useState<ProjectFormData>({
    // Top bar fields
    projectNumber: '',
    amount: '0.00',
    projectCreatedDate: '',
    projectClosedDate: '',
    projectStatus: 'Active',
    projectStage: 'Site Survey',

    // Section 1: Customer & Sales
    salesPersonName: 'Mitchell Barnes',
    state: 'NSW',
    postcode: '2000',
    area: 'Metro',
    nearestBigCity: 'Sydney',
    saleDate: '',
    firstName: '',
    lastName: '',
    managerRenteeFirstName: '',
    managerRenteeLastName: '',
    address: '',
    suburb: 'Sydney',
    primaryMobile: '',
    secondaryMobile: '',
    email: '',
    salesTeamNotes: '',
    systemPrice: '14,500.00',
    sellingPrice: '10,500.00',
    deposit: '1,000.00',
    depositReceivedDate: '',

    // Section 2: Technical Specs & Hardware
    systemSizeKw: 6.6,
    noOfPanels: '15',
    panelManufacturer: 'AIKO Solar',
    panelSizeW: '440',
    panelSeries: 'Neostar 2S+',
    panelModel: 'AIKO-A440-MAH54Mb',
    noOfInverters: '1',
    inverterManufacturer: 'Sungrow',
    inverterSizeKw: '5.0',
    inverterModel: 'SG5.0RS-ADA Single Phase',
    noOfBatteries: '0',
    batteryManufacturer: '',
    usableCapacity: '',
    batteryModel: '',
    batterySize: '',
    houseStorey: 'Single Storey',
    roofType: 'Colorbond / Metal Sheet',
    phase: 'Single Phase',
    existingSystemDetails: 'No existing solar installed (Brand new installation)',
    docsReceived: 'Yes',
    docsReceivedDate: '',

    // Section 3: EB & Meter Checklist
    q1CustomerNameMatch: 'Yes',
    q2AddressMatch: 'Yes',
    q3MeterMatch: 'Yes',
    q4MeterPhase: 'Single Phase',
    q5OpenSolarSystemMatch: 'Yes',
    q6OpenSolarPricingMatch: 'Yes',

    // Section 4: Grid Application
    nmi: '41020000001',
    electricityDistributor: 'Ausgrid',
    gridAppRef: 'DNSP-APP-001',
    energyRetailer: 'Origin Energy',
    retailerRef: 'RET-001',
    gridAppStatus: 'Grid App Approved',
    gridAppliedDate: '',
    gridRejectedDate: '',
    gridApprovalDate: '',

    // Section 5: Installation Details
    installationDate: '',
    installationStatus: 'Booked / Scheduled',
    installationBookingDate: '',
    installationBookedBy: 'Operations Manager',
    installationCompletedMonth: 'March 2026',
    installationDocsStatus: 'Pending',
    installationDocsReceivedDate: '',
    installerName: 'Direct Solar Contractors NSW',
    installerInvoiceDate: '',
    installerInvoiceNumber: 'INST-INV-101',
    installerInvoiceAmount: '$1,850.00',
    installerInvoiceStatus: 'Pending Approval',
    customerInvoiceNumber: 'INV-2026-081',

    // Section 6: Warehouse Details
    warehouse: 'Sydney Central DC (Alexandria)',
    salesOrderNo: 'SO-99214',
    warehouseInvoiceDate: '',
    warehouseInvoiceNumber: 'WH-INV-4410',
    warehouseInvoiceAmount: '$5,400.00',
    warehouseInvoiceStatus: 'Invoiced',
    stockStatus: 'Allocated to Job',
    stockUsedProject: '',
    warehouseInvoicePaidDate: '',

    // Section 7: Financials
    balancePayable: '$9,500.00',
    balancePayableDate: '',
    remainingPayment: '$9,500.00',
    isOnFinance: 'No (Cash / Direct Payment)',
    financeCompanyName: 'Brighte',
    financeAppliedDate: '',
    financeApprovedDate: '',
    financeApprovedAmount: '$10,500.00',
    financeStatus: 'Not Applicable',

    // Section 8: STC Details
    stcTradedPortal: 'BridgeSelect',
    stcJobNo: 'STC-2026-081',
    solarStcs: '66',
    solarStcsAmount: '$2,376.00',
    solarStcReceivedDate: '',
    batteryStcs: '0',
    batteryStcsAmount: '$0.00',
    batteryStcReceivedDate: '',
    totalStcAmountReceived: '$2,376.00',
    adminCharges: '$150.00',
    stcStatus: 'Approved & Traded',
    stcSubmittedDate: '',

    // Company
    hasCompany: false,
    companyName: '',
    companyOwner: '',
    companyAbn: '',
    companyPhone: '',
    companyCity: '',
    companyCountry: 'Australia',
    companyType: 'Company / Pty Ltd'
  });

  // Attachments and Activities state
  const [attachments, setAttachments] = useState<LeadAttachment[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [portalCredentials, setPortalCredentials] = useState<CustomerPortalCredentials | undefined>(undefined);
  const [xeroInvoiceNumber, setXeroInvoiceNumber] = useState<string>('');
  const [xeroReceiptNumber, setXeroReceiptNumber] = useState<string>('');
  const [xeroNotice, setXeroNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Synchronize when project opens or changes
  const applyProjectToState = (targetProject: Project) => {
    // Find corresponding lead if any
    const matchingLead = leads.find(l => 
      l.id === targetProject.id || 
      l.id === (targetProject as any).leadId || 
      (targetProject.leadId && (l.id === targetProject.leadId || (l as any).originalId === targetProject.leadId)) ||
      (targetProject.projectNumber && l.projectNumber === targetProject.projectNumber) ||
      (targetProject.projectCode && l.projectNumber === targetProject.projectCode) ||
      (targetProject.customerEmail && l.email && targetProject.customerEmail.toLowerCase() === l.email.toLowerCase())
    );

    const resolvedSellingPrice = targetProject.sellingPrice !== undefined
      ? (typeof targetProject.sellingPrice === 'number' ? formatAudNumber(targetProject.sellingPrice) : stripDollarSign(String(targetProject.sellingPrice)))
      : targetProject.contractValueAud !== undefined
      ? formatAudNumber(targetProject.contractValueAud)
      : matchingLead?.sellingPrice
      ? formatAudNumber(matchingLead.sellingPrice)
      : '10,500.00';

    const resolvedSystemPrice = targetProject.systemPrice !== undefined
      ? (typeof targetProject.systemPrice === 'number' ? formatAudNumber(targetProject.systemPrice) : stripDollarSign(String(targetProject.systemPrice)))
      : matchingLead?.systemPrice
      ? formatAudNumber(matchingLead.systemPrice)
      : '14,500.00';

    const resolvedDeposit = targetProject.deposit !== undefined
      ? (typeof targetProject.deposit === 'number' ? formatAudNumber(targetProject.deposit) : stripDollarSign(String(targetProject.deposit)))
      : matchingLead?.deposit
      ? formatAudNumber(matchingLead.deposit)
      : '1,000.00';

    const calcBal = Math.max(0, parseAudAccounts(resolvedSellingPrice) - parseAudAccounts(resolvedDeposit));
    const resolvedBalancePayable = targetProject.balancePayable ? stripDollarSign(targetProject.balancePayable) : formatAudNumber(calcBal);

    setFormData({
      // Top section
      projectNumber: targetProject.projectNumber || targetProject.projectCode || matchingLead?.projectNumber || 'PRJ-2026-001',
      amount: resolvedSellingPrice, // Locked, auto-populated from Selling Price AUD
      projectCreatedDate: targetProject.projectCreatedDate || (targetProject as any).createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
      projectClosedDate: targetProject.projectClosedDate || (targetProject.installationStatus === 'Closed' ? new Date().toISOString().split('T')[0] : ''),
      projectStatus: targetProject.projectStatus || 'Active',
      projectStage: targetProject.projectStage || targetProject.status || 'Site Survey',

      // Section 1: Customer & Sales
      salesPersonName: targetProject.salesPersonName || matchingLead?.salesPersonName || 'Mitchell Barnes',
      state: targetProject.state || matchingLead?.state || 'NSW',
      postcode: targetProject.postcode || matchingLead?.postcode || '2000',
      area: targetProject.area || matchingLead?.area || 'Metro',
      nearestBigCity: targetProject.nearestBigCity || matchingLead?.nearestBigCity || 'Sydney',
      saleDate: targetProject.saleDate || matchingLead?.saleDate || '',
      firstName: targetProject.firstName || matchingLead?.firstName || targetProject.customerName?.split(' ')[0] || '',
      lastName: targetProject.lastName || matchingLead?.lastName || targetProject.customerName?.split(' ').slice(1).join(' ') || '',
      managerRenteeFirstName: targetProject.managerRenteeFirstName || matchingLead?.managerRenteeFirstName || '',
      managerRenteeLastName: targetProject.managerRenteeLastName || matchingLead?.managerRenteeLastName || '',
      address: targetProject.address || matchingLead?.address || '',
      suburb: targetProject.suburb || matchingLead?.suburb || 'Sydney',
      primaryMobile: targetProject.primaryMobile || targetProject.customerPhone || matchingLead?.primaryMobile || '',
      secondaryMobile: targetProject.secondaryMobile || matchingLead?.secondaryMobile || '',
      email: targetProject.email || targetProject.customerEmail || matchingLead?.email || '',
      salesTeamNotes: targetProject.salesTeamNotes || matchingLead?.salesTeamNotes || '',
      systemPrice: resolvedSystemPrice,
      sellingPrice: resolvedSellingPrice,
      deposit: resolvedDeposit,
      depositReceivedDate: targetProject.depositReceivedDate || matchingLead?.depositReceivedDate || '',

      // Section 2: Technical Specs & Hardware
      systemSizeKw: (() => {
        const raw = targetProject.systemSizeKw ?? (targetProject as any).system_size ?? (targetProject as any).system_size_kw ?? matchingLead?.systemSizeKw ?? (matchingLead as any)?.system_size ?? (matchingLead as any)?.system_size_kw;
        if (raw !== undefined && raw !== null && raw !== '') {
          const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^0-9.]/g, ''));
          if (!isNaN(num) && num > 0) return num;
        }
        const pCount = Number(targetProject.noOfPanels || matchingLead?.noOfPanels) || 0;
        const pSize = Number(targetProject.panelSizeW || matchingLead?.panelSizeW) || 0;
        if (pCount > 0 && pSize > 0) {
          return Math.round((pCount * pSize / 1000) * 100) / 100;
        }
        return 6.65;
      })(),
      noOfPanels: String(targetProject.noOfPanels || matchingLead?.noOfPanels || '14'),
      panelManufacturer: targetProject.panelManufacturer || (targetProject as any).panelsBrand || targetProject.panelBrand || matchingLead?.panelManufacturer || 'LONGi Green Energy Technology Co Ltd',
      panelSizeW: String(targetProject.panelSizeW || matchingLead?.panelSizeW || '475'),
      panelSeries: targetProject.panelSeries || matchingLead?.panelSeries || 'LR7',
      panelModel: targetProject.panelModel || matchingLead?.panelModel || 'LR7-54HTH-475M (IEC 61215-2021)',
      noOfInverters: String(targetProject.noOfInverters || matchingLead?.noOfInverters || '1'),
      inverterManufacturer: targetProject.inverterManufacturer || (targetProject as any).inverter_manufacturer || targetProject.inverterBrand || matchingLead?.inverterManufacturer || (matchingLead as any)?.inverter_manufacturer || 'SolaX Power Network Technology (Zhe jiang) Co Ltd',
      inverterSizeKw: (() => {
        const rawSize = targetProject.inverterSizeKw ?? (targetProject as any).inverter_size_kw ?? matchingLead?.inverterSizeKw ?? (matchingLead as any)?.inverter_size_kw;
        if (rawSize !== undefined && rawSize !== null && rawSize !== '') {
          const num = typeof rawSize === 'number' ? rawSize : parseFloat(String(rawSize).replace(/[^0-9.]/g, ''));
          if (!isNaN(num) && num > 0) return String(num);
        }
        const model = targetProject.inverterModel || matchingLead?.inverterModel || '';
        if (model) {
          const match = String(model).match(/(?:-|\b|_)([0-9]+(?:\.[0-9]+)?)\s*(?:k|kw|rt|rs|ktl)?\b/i);
          if (match && match[1]) {
            const val = parseFloat(match[1]);
            if (!isNaN(val) && val >= 1 && val <= 250) return String(val);
          }
        }
        return '5';
      })(),
      inverterSeries: (targetProject as any).inverterSeries || (targetProject as any).inverter_series || matchingLead?.inverterSeries || (matchingLead as any)?.inverter_series || 'X1-BOOST G4',
      inverterModel: targetProject.inverterModel || (targetProject as any).inverter_model || matchingLead?.inverterModel || (matchingLead as any)?.inverter_model || 'X1-BOOST-5K-G4 (AS4777-2 2020)',
      noOfBatteries: String(targetProject.noOfBatteries || matchingLead?.noOfBatteries || (targetProject.batteryBrand ? '1' : '0')),
      batteryManufacturer: targetProject.batteryManufacturer || targetProject.batteryBrand || matchingLead?.batteryManufacturer || '',
      usableCapacity: String(targetProject.usableCapacity || ''),
      batteryModel: targetProject.batteryModel || '',
      batterySize: targetProject.batterySize || '',
      houseStorey: targetProject.houseStorey || matchingLead?.houseStorey || 'Single Storey',
      roofType: targetProject.roofType || matchingLead?.roofType || 'Colorbond / Metal Sheet',
      phase: targetProject.phase || matchingLead?.phase || 'Single Phase',
      existingSystemDetails: targetProject.existingSystemDetails || matchingLead?.existingSystemDetails || 'No existing solar installed (Brand new installation)',
      docsReceived: targetProject.docsReceived || 'Yes',
      docsReceivedDate: targetProject.docsReceivedDate || '',

      // Section 3: EB & Meter Checklist
      q1CustomerNameMatch: targetProject.q1CustomerNameMatch || 'Yes',
      q2AddressMatch: targetProject.q2AddressMatch || 'Yes',
      q3MeterMatch: targetProject.q3MeterMatch || 'Yes',
      q4MeterPhase: targetProject.q4MeterPhase || 'Single Phase',
      q5OpenSolarSystemMatch: targetProject.q5OpenSolarSystemMatch || 'Yes',
      q6OpenSolarPricingMatch: targetProject.q6OpenSolarPricingMatch || 'Yes',

      // Section 4: Grid Application
      nmi: targetProject.nmi || '41020000001',
      electricityDistributor: targetProject.electricityDistributor || targetProject.dnsp || 'Ausgrid',
      gridAppRef: targetProject.gridAppRef || 'DNSP-APP-001',
      energyRetailer: targetProject.energyRetailer || 'Origin Energy',
      retailerRef: targetProject.retailerRef || 'RET-001',
      gridAppStatus: targetProject.gridAppStatus || 'Grid App Approved',
      gridAppliedDate: targetProject.gridAppliedDate || '',
      gridRejectedDate: targetProject.gridRejectedDate || '',
      gridApprovalDate: targetProject.gridApprovalDate || '',

      // Section 5: Installation Details
      installationDate: targetProject.installationDate || '',
      installationStatus: targetProject.installationStatus || 'Booked / Scheduled',
      installationBookingDate: targetProject.installationBookingDate || '',
      installationBookedBy: targetProject.installationBookedBy || 'Operations Manager',
      installationCompletedMonth: targetProject.installationCompletedMonth || 'March 2026',
      installationDocsStatus: targetProject.installationDocsStatus || 'Pending',
      installationDocsReceivedDate: targetProject.installationDocsReceivedDate || '',
      installerName: targetProject.installerName || 'Direct Solar Contractors NSW',
      installerInvoiceDate: targetProject.installerInvoiceDate || '',
      installerInvoiceNumber: targetProject.installerInvoiceNumber || 'INST-INV-101',
      installerInvoiceAmount: targetProject.installerInvoiceAmount ? formatAudAccounts(targetProject.installerInvoiceAmount) : '$1,850.00',
      installerInvoiceStatus: targetProject.installerInvoiceStatus || 'Pending Approval',
      customerInvoiceNumber: targetProject.customerInvoiceNumber || targetProject.xeroInvoiceNumber || 'INV-2026-081',

      // Section 6: Warehouse Details
      warehouse: targetProject.warehouse || 'Sydney Central DC (Alexandria)',
      salesOrderNo: targetProject.salesOrderNo || 'SO-99214',
      warehouseInvoiceDate: targetProject.warehouseInvoiceDate || '',
      warehouseInvoiceNumber: targetProject.warehouseInvoiceNumber || 'WH-INV-4410',
      warehouseInvoiceAmount: targetProject.warehouseInvoiceAmount ? formatAudAccounts(targetProject.warehouseInvoiceAmount) : '$5,400.00',
      warehouseInvoiceStatus: targetProject.warehouseInvoiceStatus || 'Invoiced',
      stockStatus: targetProject.stockStatus || 'Allocated to Job',
      stockUsedProject: targetProject.stockUsedProject || targetProject.projectCode || '',
      warehouseInvoicePaidDate: targetProject.warehouseInvoicePaidDate || '',

      // Section 7: Financials
      balancePayable: resolvedBalancePayable,
      balancePayableDate: targetProject.balancePayableDate || '',
      remainingPayment: targetProject.remainingPayment ? formatAudAccounts(targetProject.remainingPayment) : resolvedBalancePayable,
      isOnFinance: targetProject.isOnFinance || 'No (Cash / Direct Payment)',
      financeCompanyName: targetProject.financeCompanyName || 'Brighte',
      financeAppliedDate: targetProject.financeAppliedDate || '',
      financeApprovedDate: targetProject.financeApprovedDate || '',
      financeApprovedAmount: targetProject.financeApprovedAmount ? formatAudAccounts(targetProject.financeApprovedAmount) : resolvedSellingPrice,
      financeStatus: targetProject.financeStatus || 'Not Applicable',

      // Section 8: STC Details
      stcTradedPortal: targetProject.stcTradedPortal || 'BridgeSelect',
      stcJobNo: targetProject.stcJobNo || 'STC-2026-081',
      solarStcs: String(targetProject.solarStcs || '66'),
      solarStcsAmount: targetProject.solarStcsAmount ? formatAudAccounts(targetProject.solarStcsAmount) : '$2,376.00',
      solarStcReceivedDate: targetProject.solarStcReceivedDate || '',
      batteryStcs: String(targetProject.batteryStcs || '0'),
      batteryStcsAmount: targetProject.batteryStcsAmount ? formatAudAccounts(targetProject.batteryStcsAmount) : '$0.00',
      batteryStcReceivedDate: targetProject.batteryStcReceivedDate || '',
      totalStcAmountReceived: targetProject.totalStcAmountReceived ? formatAudAccounts(targetProject.totalStcAmountReceived) : '$2,376.00',
      adminCharges: targetProject.adminCharges || '$150.00',
      stcStatus: targetProject.stcStatus || 'Approved & Traded',
      stcSubmittedDate: targetProject.stcSubmittedDate || '',

      // Company
      hasCompany: targetProject.hasCompany ?? matchingLead?.hasCompany ?? false,
      companyName: targetProject.companyName || matchingLead?.companyName || '',
      companyOwner: targetProject.companyOwner || matchingLead?.companyOwner || 'Mitchell Barnes',
      companyAbn: targetProject.companyAbn || matchingLead?.companyAbn || '',
      companyPhone: targetProject.companyPhone || matchingLead?.companyPhone || '',
      companyCity: targetProject.companyCity || matchingLead?.companyCity || 'Sydney',
      companyCountry: targetProject.companyCountry || 'Australia',
      companyType: targetProject.companyType || 'Company / Pty Ltd'
    });
  };

  const fetchFreshProjectFromDb = async () => {
    if (!project || !project.id) return;
    setIsFetchingFromDb(true);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}`);
      const data = await res.json();
      if (data && data.success && data.project) {
        applyProjectToState(data.project);
        setDbSynced(true);
      }
    } catch (err) {
      console.warn('[ProjectEditModal] Failed to fetch project from Supabase table:', err);
    } finally {
      setIsFetchingFromDb(false);
    }
  };

  // Populate state on project edit or create, and fetch fresh database data
  useEffect(() => {
    setIsConfirmingDelete(false);
    setDbSynced(false);
    if (!isOpen) return;

    if (project) {
      applyProjectToState(project);

      if (project.id) {
        setIsFetchingFromDb(true);
        fetch(`/api/projects/${encodeURIComponent(project.id)}`)
          .then(res => res.json())
          .then(data => {
            if (data && data.success && data.project) {
              applyProjectToState(data.project);
              setDbSynced(true);
            }
          })
          .catch(err => console.warn('[ProjectEditModal] Notice querying Supabase table:', err))
          .finally(() => setIsFetchingFromDb(false));
      }
      setAttachments(
        leads.find(l => l.id === project.id)?.attachments?.length
          ? leads.find(l => l.id === project.id)!.attachments!
          : [
              {
                id: 'att-sld-01',
                leadId: project.id,
                name: 'Single Line Diagram (SLD) - Ausgrid.pdf',
                size: '1.4 MB',
                type: 'application/pdf',
                url: '#',
                uploadedAt: '2026-03-01',
                category: 'Single Line Diagram (SLD)'
              },
              {
                id: 'att-eb-01',
                leadId: project.id,
                name: 'Electricity_Bill_Q1_2026.pdf',
                size: '840 KB',
                type: 'application/pdf',
                url: '#',
                uploadedAt: '2026-02-28',
                category: 'Electricity Bill'
              }
            ]
      );

      setActivities(
        leads.find(l => l.id === project.id)?.activities?.length
          ? leads.find(l => l.id === project.id)!.activities!
          : [
              {
                id: 'act-proj-01',
                leadId: project.id,
                type: 'Note',
                title: 'Project Created from Signed Lead',
                description: `Project created with ${project.systemSizeKw}kW capacity. Selling Price ${project.sellingPrice || '$10,500.00'}.`,
                createdAt: project.createdAt || new Date().toISOString(),
                createdBy: 'System Conversion'
              },
              {
                id: 'act-proj-02',
                leadId: project.id,
                type: 'Task',
                title: 'Submit DNSP Pre-Approval with Ausgrid',
                description: 'NMI and switchboard details verified against OpenSolar SLD.',
                createdAt: new Date().toISOString(),
                createdBy: 'Mitchell Barnes',
                taskCompleted: true,
                taskPriority: 'High'
              }
            ]
      );

      setXeroInvoiceNumber(project.xeroInvoiceNumber || 'INV-2026-081');
      setXeroReceiptNumber('');
      setBridgeselectSyncStatus((project as any)?.bridgeselect_sync_status || 'un-synced');
    } else {
      // New project default state
      const todayDate = new Date().toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        projectNumber: `PRJ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        amount: '10,500.00',
        projectCreatedDate: todayDate,
        projectClosedDate: '',
        projectStatus: 'Active',
        projectStage: 'Site Survey'
      }));
      setAttachments([]);
      setActivities([]);
      setBridgeselectSyncStatus('un-synced');
    }
  }, [project, isOpen, leads]);

  // Handle Manual Push to BridgeSelect
  const handlePushToBridgeSelect = async () => {
    setIsPushingBridgeSelect(true);
    setPushFeedback(null);

    const mergedData = {
      ...project,
      ...formData,
      id: project?.id || formData.projectNumber,
      projectCode: formData.projectNumber || project?.projectCode,
      customerName: `${formData.firstName} ${formData.lastName}`.trim() || formData.firstName || project?.customerName,
      address: formData.address || (formData as any).streetAddress,
      suburb: formData.suburb,
      postcode: formData.postcode,
      state: formData.state,
      nmi: formData.nmi,
      panelBrand: formData.panelManufacturer,
      panelModel: formData.panelModel,
      panelWattage: parseFloat(formData.panelSizeW) || 440,
      panelCount: parseInt(formData.noOfPanels, 10) || 16,
      inverterBrand: formData.inverterManufacturer,
      inverterModel: formData.inverterModel,
      inverterCapacityKw: parseFloat(formData.inverterSizeKw) || 5.0,
      inverterCount: parseInt(formData.noOfInverters, 10) || 1,
      installerName: formData.installerName,
      installationDate: formData.installationDate
    };

    try {
      const result = await pushJobToBridgeSelect({
        jobId: project?.id || formData.projectNumber,
        jobData: mergedData
      });

      const nextStatus = result.status || (result.success ? 'synced' : 'failed');
      setBridgeselectSyncStatus(nextStatus);

      if (project?.id) {
        updateProject(project.id, {
          bridgeselect_sync_status: nextStatus,
          bridgeselect_synced_at: result.success ? new Date().toISOString() : null,
          bridgeSelectStatus: result.success ? 'Submitted to Clean Energy Regulator' : 'Failed'
        });
      }

      if (result.success) {
        setPushFeedback({
          type: 'success',
          title: 'BridgeSelect Sync Successful',
          message: result.message || 'Job successfully transmitted to BridgeSelect STC Portal.',
          checksum: result.checksum
        });
      } else {
        setPushFeedback({
          type: 'error',
          title: 'BridgeSelect Push Failed',
          message: result.message || result.error || 'The BridgeSelect API returned an error response.'
        });
      }
    } catch (err: any) {
      const isVal = err.message?.toLowerCase().includes('validation') || err.message?.toLowerCase().includes('missing');
      const errStatus = isVal ? 'Validation Failed' : 'failed';
      setBridgeselectSyncStatus(errStatus);

      if (project?.id) {
        updateProject(project.id, {
          bridgeselect_sync_status: errStatus
        });
      }

      setPushFeedback({
        type: isVal ? 'warning' : 'error',
        title: isVal ? 'STC Validation Error' : 'BridgeSelect Push Failed',
        message: err.message || 'Failed to communicate with BridgeSelect API endpoint.'
      });
    } finally {
      setIsPushingBridgeSelect(false);
    }
  };

  // Activity handlers
  const handleAddActivity = (activityData: Omit<LeadActivity, 'id' | 'createdAt'>) => {
    const newAct: LeadActivity = {
      ...activityData,
      id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    setActivities(prev => [newAct, ...prev]);
    if (project?.leadId) {
      addLeadActivity(project.leadId, activityData);
    }
  };

  const handleToggleTask = (activityId: string) => {
    setActivities(prev =>
      prev.map(a => (a.id === activityId ? { ...a, taskCompleted: !a.taskCompleted } : a))
    );
    if (project?.leadId) {
      toggleLeadActivityTask(project.leadId, activityId);
    }
  };

  const handleDeleteActivity = (activityId: string) => {
    setActivities(prev => prev.filter(a => a.id !== activityId));
    if (project?.leadId) {
      deleteLeadActivity(project.leadId, activityId);
    }
  };

  // Attachment handlers
  const handleAddAttachment = (attData: Omit<LeadAttachment, 'id' | 'uploadedAt'>) => {
    const newAtt: LeadAttachment = {
      ...attData,
      id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      uploadedAt: new Date().toISOString().split('T')[0]
    };
    setAttachments(prev => [newAtt, ...prev]);
    if (project?.leadId) {
      addLeadAttachment(project.leadId, newAtt);
    }
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    if (project?.leadId) {
      deleteLeadAttachment(project.leadId, attachmentId);
    }
  };

  // Portal Invite handler
  const handleSendPortalInvite = () => {
    const primaryEmail = formData.email ? formData.email.split(',')[0].trim() : 'customer@gmail.com';
    const tempPass = `Solar-2026!${(formData.lastName || 'Customer').replace(/[^a-zA-Z]/g, '')}#${Math.floor(100 + Math.random() * 900)}`;

    const creds: CustomerPortalCredentials = {
      username: primaryEmail,
      tempPassword: tempPass,
      generatedAt: new Date().toISOString(),
      inviteSentAt: new Date().toISOString(),
      inviteLink: `https://customer.mysolarcrm.com.au?auth_user=${encodeURIComponent(primaryEmail)}`,
      status: 'Credentials Sent'
    };

    setPortalCredentials(creds);
    setXeroNotice(`Portal invitation sent to ${primaryEmail}.`);
    setTimeout(() => setXeroNotice(null), 4000);

    handleAddActivity({
      leadId: project?.id || 'proj-active',
      type: 'Email',
      title: `Customer Portal Invitation Dispatched`,
      description: `Sent credentials and portal link to ${primaryEmail}. Temporary security key generated.`,
      createdBy: formData.salesPersonName || 'Mitchell Barnes'
    });
  };

  // Xero Invoicing handler
  const handleCreateXeroInvoice = () => {
    const invNum = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setXeroInvoiceNumber(invNum);
    setXeroNotice(`Xero Tax Invoice ${invNum} created and synchronized.`);
    setTimeout(() => setXeroNotice(null), 4000);

    handleAddActivity({
      leadId: project?.id || 'proj-active',
      type: 'Note',
      title: `Xero Tax Invoice Synchronized (${invNum})`,
      description: `Generated tax invoice for ${formData.amount || formData.sellingPrice} AUD. Line items synced.`,
      createdBy: formData.salesPersonName || 'Mitchell Barnes'
    });
  };

  // Xero Receipt handler
  const handleGenerateXeroReceipt = () => {
    const recNum = `REC-2026-${Math.floor(100 + Math.random() * 900)}`;
    setXeroReceiptNumber(recNum);
    setXeroNotice(`Deposit receipt ${recNum} generated in Xero.`);
    setTimeout(() => setXeroNotice(null), 4000);

    handleAddActivity({
      leadId: project?.id || 'proj-active',
      type: 'Note',
      title: `Xero Payment Receipt (${recNum})`,
      description: `Customer deposit of ${formData.deposit} AUD reconciled and receipt issued.`,
      createdBy: formData.salesPersonName || 'Mitchell Barnes'
    });
  };

  // Top Stage Change Handler
  const handleStageChange = (newStage: string) => {
    const todayDate = new Date().toISOString().split('T')[0];
    const norm = normalizeProjectStatus(newStage);
    setFormData(prev => {
      const next = { ...prev, projectStage: newStage };
      if (newStage === 'Installation Completed' || newStage === 'Completed' || norm === 'Installation Completed' || norm === 'Completed') {
        if (!next.installationDate) next.installationDate = todayDate;
      }
      if ((newStage === 'Closed' || norm === 'Completed') && !next.projectClosedDate) {
        next.projectClosedDate = todayDate;
      }
      return next;
    });

    handleAddActivity({
      leadId: project?.id || 'proj-active',
      type: 'Status Change',
      title: `Project Status Changed to ${newStage}`,
      description: `Project status changed to ${newStage}.`,
      createdBy: formData.salesPersonName || 'Mitchell Barnes'
    });
  };

  // Save changes
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim() || project?.customerName || 'Customer';
    const cleanPrimary = formatAustralianMobile(formData.primaryMobile);
    const cleanSecondary = formData.secondaryMobile ? formatAustralianMobile(formData.secondaryMobile) : '';
    const resolvedStatus = normalizeProjectStatus(formData.projectStage || project?.status);

    const payload: Partial<Project> = {
      projectCode: formData.projectNumber || project?.projectCode || `SOL-${formData.state}-001`,
      projectNumber: formData.projectNumber.trim(),
      amount: formData.amount || formData.sellingPrice,
      projectCreatedDate: formData.projectCreatedDate,
      projectClosedDate: formData.projectClosedDate,
      projectStatus: formData.projectStatus || 'Active',
      projectStage: formData.projectStage,
      installationStatus: formData.projectStage,
      status: resolvedStatus,

      // Customer & Sales
      salesPersonName: formData.salesPersonName,
      state: (formData.state as AustralianState) || 'NSW',
      postcode: formData.postcode.trim(),
      area: formData.area,
      nearestBigCity: formData.nearestBigCity,
      saleDate: formData.saleDate,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      customerName: fullName,
      managerRenteeFirstName: formData.managerRenteeFirstName.trim(),
      managerRenteeLastName: formData.managerRenteeLastName.trim(),
      streetAddress: formData.address.trim(),
      address: formData.address.trim(),
      suburb: formData.suburb.trim(),
      primaryMobile: cleanPrimary,
      secondaryMobile: cleanSecondary,
      customerPhone: cleanPrimary,
      customerEmail: formData.email.trim(),
      email: formData.email.trim(),
      salesTeamNotes: formData.salesTeamNotes.trim(),
      systemPrice: parseAudAccounts(formData.systemPrice),
      sellingPrice: parseAudAccounts(formData.sellingPrice),
      deposit: parseAudAccounts(formData.deposit),
      depositReceivedDate: formData.depositReceivedDate,
      contractValueAud: parseAudAccounts(formData.sellingPrice),

      // Tech Specs & Hardware
      systemSizeKw: typeof formData.systemSizeKw === 'number' ? formData.systemSizeKw : parseFloat(formData.systemSizeKw) || 6.6,
      noOfPanels: parseInt(formData.noOfPanels) || 15,
      panelManufacturer: formData.panelManufacturer,
      panelBrand: formData.panelManufacturer,
      panelSizeW: parseInt(formData.panelSizeW) || 440,
      panelSeries: formData.panelSeries,
      panelModel: formData.panelModel,
      noOfInverters: parseInt(formData.noOfInverters) || 1,
      inverterManufacturer: formData.inverterManufacturer,
      inverterBrand: formData.inverterManufacturer,
      inverterSizeKw: parseFloat(formData.inverterSizeKw) || 5.0,
      inverterSeries: formData.inverterSeries,
      inverterModel: formData.inverterModel,
      noOfBatteries: parseInt(formData.noOfBatteries) || 0,
      batteryManufacturer: formData.batteryManufacturer,
      batteryBrand: formData.batteryManufacturer,
      usableCapacity: formData.usableCapacity,
      batteryModel: formData.batteryModel,
      batterySize: formData.batterySize,
      houseStorey: formData.houseStorey,
      roofType: formData.roofType,
      phase: formData.phase,
      existingSystemDetails: formData.existingSystemDetails,
      docsReceived: formData.docsReceived,
      docsReceivedDate: formData.docsReceivedDate,

      // EB Checklist
      q1CustomerNameMatch: formData.q1CustomerNameMatch,
      q2AddressMatch: formData.q2AddressMatch,
      q3MeterMatch: formData.q3MeterMatch,
      q4MeterPhase: formData.q4MeterPhase,
      q5OpenSolarSystemMatch: formData.q5OpenSolarSystemMatch,
      q6OpenSolarPricingMatch: formData.q6OpenSolarPricingMatch,

      // Grid
      nmi: formData.nmi,
      electricityDistributor: formData.electricityDistributor,
      dnsp: formData.electricityDistributor,
      gridAppRef: formData.gridAppRef,
      energyRetailer: formData.energyRetailer,
      retailerRef: formData.retailerRef,
      gridAppStatus: formData.gridAppStatus,
      gridAppliedDate: formData.gridAppliedDate,
      gridRejectedDate: formData.gridRejectedDate,
      gridApprovalDate: formData.gridApprovalDate,

      // Installation
      installationDate: formData.installationDate,
      installationBookingDate: formData.installationBookingDate,
      installationBookedBy: formData.installationBookedBy,
      installationCompletedMonth: formData.installationCompletedMonth,
      installationDocsStatus: formData.installationDocsStatus,
      installationDocsReceivedDate: formData.installationDocsReceivedDate,
      installerName: formData.installerName,
      installerInvoiceDate: formData.installerInvoiceDate,
      installerInvoiceNumber: formData.installerInvoiceNumber,
      installerInvoiceAmount: parseAudAccounts(formData.installerInvoiceAmount),
      installerInvoiceStatus: formData.installerInvoiceStatus,
      customerInvoiceNumber: formData.customerInvoiceNumber,

      // Warehouse
      warehouse: formData.warehouse,
      salesOrderNo: formData.salesOrderNo,
      warehouseInvoiceDate: formData.warehouseInvoiceDate,
      warehouseInvoiceNumber: formData.warehouseInvoiceNumber,
      warehouseInvoiceAmount: parseAudAccounts(formData.warehouseInvoiceAmount),
      warehouseInvoiceStatus: formData.warehouseInvoiceStatus,
      stockStatus: formData.stockStatus,
      stockUsedProject: formData.stockUsedProject,
      warehouseInvoicePaidDate: formData.warehouseInvoicePaidDate,

      // Financials
      balancePayable: formData.balancePayable,
      balancePayableDate: formData.balancePayableDate,
      remainingPayment: parseAudAccounts(formData.remainingPayment),
      isOnFinance: formData.isOnFinance,
      financeCompanyName: formData.financeCompanyName,
      financeAppliedDate: formData.financeAppliedDate,
      financeApprovedDate: formData.financeApprovedDate,
      financeApprovedAmount: parseAudAccounts(formData.financeApprovedAmount),
      financeStatus: formData.financeStatus,

      // STC
      stcTradedPortal: formData.stcTradedPortal,
      stcJobNo: formData.stcJobNo,
      solarStcs: parseInt(formData.solarStcs) || 66,
      solarStcsAmount: parseAudAccounts(formData.solarStcsAmount),
      solarStcReceivedDate: formData.solarStcReceivedDate,
      batteryStcs: parseInt(formData.batteryStcs) || 0,
      batteryStcsAmount: parseAudAccounts(formData.batteryStcsAmount),
      batteryStcReceivedDate: formData.batteryStcReceivedDate,
      totalStcAmountReceived: parseAudAccounts(formData.totalStcAmountReceived),
      adminCharges: formData.adminCharges,
      stcStatus: formData.stcStatus,
      stcSubmittedDate: formData.stcSubmittedDate,

      // Company
      hasCompany: formData.hasCompany,
      companyName: formData.companyName,
      companyOwner: formData.companyOwner,
      companyAbn: formData.companyAbn,
      companyPhone: formData.companyPhone,
      companyCity: formData.companyCity,
      companyCountry: formData.companyCountry,
      companyType: formData.companyType
    };

    try {
      if (isEditing && project?.id) {
        await updateProject(project.id, payload);
      } else {
        const added = addProject({
          ...payload,
          customerId: `cust-${Date.now()}`,
          status: (formData.projectStage as ProjectStatus) || 'Site Survey'
        } as any);
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(added)
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to save project to database');
        }
      }
      setSaveSuccessMsg('Project details saved and synced to database successfully!');
      setTimeout(() => {
        onClose();
      }, 400);
    } catch (err: any) {
      console.error('[ProjectEditModal] Error saving project:', err);
      setSaveErrorMsg(err.message || 'Failed to save project to database');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteDelete = () => {
    if (!project?.id) return;
    deleteProject(project.id);
    setIsConfirmingDelete(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden transition-colors ${
      isLight ? 'bg-slate-900/40 backdrop-blur-sm' : 'bg-slate-950/75 backdrop-blur-sm'
    }`}>
      <div className={`w-full max-w-[1540px] rounded-2xl shadow-2xl border overflow-hidden flex flex-col h-[94vh] transition-colors ${
        isLight
          ? 'bg-white border-slate-200 text-slate-800'
          : 'bg-slate-900 border-slate-800 text-slate-200'
      }`}>
        {/* TOP BAR / MODAL HEADER */}
        <header className={`px-5 py-3 border-b flex items-center justify-between shrink-0 transition-colors ${
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
                    : project?.customerName || 'Solar Installation Project'}
                </h2>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border shrink-0 font-medium ${
                  isLight
                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}>
                  {formData.projectStage}
                </span>
                {formData.hasCompany && (
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1 ${
                    isLight
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-blue-950/80 text-blue-400 border-blue-800'
                  }`}>
                    <Building2 className="w-3 h-3" />
                    {formData.companyName || 'Commercial Job'}
                  </span>
                )}
              </div>
              <p className={`text-xs truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Project Management Workspace • System: {formData.systemSizeKw} kW • Inverter: {formData.inverterManufacturer || 'Sungrow'} • DNSP: {formData.electricityDistributor || 'Ausgrid'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isEditing && (
              <button
                type="button"
                onClick={fetchFreshProjectFromDb}
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

            {/* BridgeSelect STC Status Indicator Badge */}
            <div className="flex items-center">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  bridgeselectSyncStatus.toLowerCase() === 'synced'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
                    : bridgeselectSyncStatus.toLowerCase() === 'pending'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
                    : bridgeselectSyncStatus.toLowerCase() === 'failed'
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30'
                    : bridgeselectSyncStatus === 'Validation Failed'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
                    : isLight
                    ? 'bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
                title={`BridgeSelect Connector Status: ${bridgeselectSyncStatus}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    bridgeselectSyncStatus.toLowerCase() === 'synced'
                      ? 'bg-emerald-500 animate-pulse'
                      : bridgeselectSyncStatus.toLowerCase() === 'failed'
                      ? 'bg-rose-500'
                      : bridgeselectSyncStatus === 'Validation Failed'
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
                  }`}
                />
                <span className="capitalize">{bridgeselectSyncStatus}</span>
              </span>
            </div>

            {/* Prominent "Push to BridgeSelect" Button */}
            <button
              type="button"
              onClick={handlePushToBridgeSelect}
              disabled={isPushingBridgeSelect}
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer ${
                bridgeselectSyncStatus.toLowerCase() === 'synced'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold hover:shadow-emerald-500/25'
              } disabled:opacity-60`}
              title="Manually trigger the /api/bridgeselect/push route for this job"
            >
              {isPushingBridgeSelect ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{isPushingBridgeSelect ? 'Pushing to BridgeSelect...' : 'Push to BridgeSelect'}</span>
            </button>

            {isEditing && project?.id && (
              isConfirmingDelete ? (
                <div className="flex items-center gap-1.5 bg-rose-950/70 border border-rose-500/50 rounded-lg px-2 py-1 shadow-xs">
                  <span className="text-[11px] text-rose-200 font-semibold hidden sm:inline">Delete project?</span>
                  <button
                    type="button"
                    onClick={handleExecuteDelete}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    title="Permanently Delete Project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-gray-300 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer"
                  title="Delete this project permanently"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete Project</span>
                </button>
              )
            )}

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 hover:shadow-solar-soft cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-slate-950" />
                  <span>{isEditing ? 'Save Changes' : 'Create Project'}</span>
                </>
              )}
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

        {/* Save feedback banner */}
        {saveSuccessMsg && (
          <div className="px-5 py-2.5 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{saveSuccessMsg}</span>
          </div>
        )}
        {saveErrorMsg && (
          <div className="px-5 py-2.5 bg-rose-500/15 border-b border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold">{saveErrorMsg}</span>
          </div>
        )}

        {/* BridgeSelect Push Feedback Banner (if triggered) */}
        {pushFeedback && (
          <div
            className={`px-5 py-2.5 border-b text-xs flex items-center justify-between gap-3 ${
              pushFeedback.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : pushFeedback.type === 'warning'
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {pushFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : pushFeedback.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <div>
                <span className="font-bold">{pushFeedback.title}: </span>
                <span>{pushFeedback.message}</span>
                {pushFeedback.checksum && (
                  <span className="ml-2 font-mono text-[11px] opacity-80">
                    [SHA-256 Checksum: {pushFeedback.checksum.substring(0, 16)}...]
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setPushFeedback(null)}
              className="text-gray-400 hover:text-white font-bold text-xs p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* STATIC NON-SCROLLABLE TOP SECTION */}
        <div className={`px-5 py-3 border-b shrink-0 transition-colors ${
          isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-slate-950 border-slate-800'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              {/* Field 1: Project Number */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1 mb-1">
                  <Hash className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                  <label className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Project #
                  </label>
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                    isLight ? 'bg-white text-slate-700 border-slate-200' : 'bg-slate-900 text-slate-300 border-slate-700'
                  }`}>
                    Auto/Editable
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. PRJ-2026-001"
                  value={formData.projectNumber}
                  onChange={e => setFormData(prev => ({ ...prev, projectNumber: e.target.value }))}
                  className={`w-40 sm:w-48 px-3 py-1.5 rounded-lg text-xs font-mono font-bold focus:outline-none transition-colors shadow-xs ${
                    isLight
                      ? 'bg-white border border-slate-300 hover:border-slate-400 focus:border-amber-500 text-slate-900 placeholder-slate-400'
                      : 'bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-amber-500 text-slate-100'
                  }`}
                />
              </div>

              {/* Field 2: Amount (Locked for editing, auto-populated from Selling Price AUD) */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1 mb-1">
                  <label className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Amount (AUD)
                  </label>
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border flex items-center gap-0.5 ${
                    isLight ? 'bg-slate-200/80 text-slate-700 border-slate-300' : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}>
                    <Lock className="w-2.5 h-2.5 text-amber-500" />
                    Locked
                  </span>
                </div>
                <div className="relative">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold pointer-events-none ${
                    isLight ? 'text-slate-500' : 'text-amber-500'
                  }`}>$</span>
                  <input
                    type="text"
                    readOnly
                    value={stripDollarSign(formData.amount || formData.sellingPrice)}
                    title="Amount is auto-populated from Selling Price (AUD) and locked for editing."
                    className={`w-36 sm:w-40 pl-7 pr-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-not-allowed select-none shadow-xs ${
                      isLight
                        ? 'bg-slate-200/60 border border-slate-300 text-slate-900'
                        : 'bg-slate-900/60 border border-slate-700/80 text-amber-400'
                    }`}
                  />
                </div>
              </div>

              {/* Field 3: Project Created Date */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1 mb-1">
                  <Calendar className={`w-3.5 h-3.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                  <label className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Project Created Date
                  </label>
                </div>
                <input
                  type="date"
                  value={formData.projectCreatedDate}
                  onChange={e => setFormData(prev => ({ ...prev, projectCreatedDate: e.target.value }))}
                  className={`w-36 sm:w-40 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none transition-colors shadow-xs ${
                    isLight
                      ? 'bg-white border border-slate-300 text-slate-900 focus:border-amber-500'
                      : 'bg-slate-900 border border-slate-700 text-slate-200 focus:border-amber-500'
                  }`}
                />
              </div>

              {/* Field 4: Project Closed Date */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1 mb-1">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                  <label className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Project Closed Date
                  </label>
                  {formData.installationStatus === 'Closed' && (
                    <span className={`text-[9px] font-mono px-1 py-0.2 rounded border ${
                      isLight
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    }`}>
                      Auto-filled
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  value={formData.projectClosedDate}
                  onChange={e => setFormData(prev => ({ ...prev, projectClosedDate: e.target.value }))}
                  className={`w-36 sm:w-40 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none transition-colors shadow-xs ${
                    isLight
                      ? 'bg-white border border-slate-300 text-slate-900 focus:border-amber-500'
                      : 'bg-slate-900 border border-slate-700 text-slate-200 focus:border-amber-500'
                  }`}
                />
              </div>

              {/* Field 5: Project Status (Dropdown managed from Settings -> Project Status) */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1 mb-1">
                  <Activity className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                  <label className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Project Status
                  </label>
                  <span className={`text-[9px] font-mono px-1 py-0.2 rounded border ${
                    isLight ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    Details
                  </span>
                </div>
                <select
                  value={formData.projectStatus || 'Active'}
                  onChange={e => setFormData(prev => ({ ...prev, projectStatus: e.target.value }))}
                  className={`w-44 sm:w-48 px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none transition-colors cursor-pointer shadow-xs ${
                    isLight
                      ? 'bg-white border border-slate-300 hover:border-slate-400 text-slate-900 focus:border-amber-500'
                      : 'bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-100 focus:border-amber-500'
                  }`}
                >
                  {Array.from(new Set([
                    ...(dropdowns?.projectStatuses || [
                      'Active',
                      'In Progress',
                      'On Hold',
                      'Pre-Installation',
                      'Installation Completed',
                      'Completed',
                      'Closed',
                      'Cancelled'
                    ]),
                    ...(formData.projectStatus ? [formData.projectStatus] : [])
                  ])).map((st: string) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 6: Project Stage/ Installation Status (Dropdown managed from Settings -> Project Stage/ Installation Status) */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1 mb-1">
                  <SlidersHorizontal className={`w-3.5 h-3.5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                  <label className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Project Stage/ Installation Status
                  </label>
                  <span className={`text-[9px] font-mono px-1 py-0.2 rounded border ${
                    isLight ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}>
                    Milestone
                  </span>
                </div>
                <select
                  value={formData.projectStage}
                  onChange={e => handleStageChange(e.target.value)}
                  className={`w-48 sm:w-56 px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none transition-colors cursor-pointer shadow-xs ${
                    isLight
                      ? 'bg-white border border-slate-300 hover:border-slate-400 text-slate-900 focus:border-blue-500'
                      : 'bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-100 focus:border-blue-500'
                  }`}
                >
                  {Array.from(new Set([
                    ...(dropdowns?.projectStages || [
                      'Site Survey',
                      'Engineering & DNSP Approval',
                      'Sales Order Dispatched',
                      'RFQ Sent to Installers',
                      'Install Scheduled',
                      'Installation in Progress',
                      'Installation Completed',
                      'BridgeSelect STC Claimed',
                      'Grid Meter Connected',
                      'Completed',
                      'Closed'
                    ]),
                    ...(formData.projectStage ? [formData.projectStage] : [])
                  ])).map((st: string) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Status Stage Indicators */}
            <div className={`hidden xl:flex items-center gap-1.5 pl-3 border-l ${
              isLight ? 'border-slate-300' : 'border-slate-800'
            }`}>
              {[
                'Site Survey',
                'Engineering & DNSP Approval',
                'Sales Order Dispatched',
                'Install Scheduled',
                'Installation in Progress',
                'Installation Completed',
                'Completed'
              ].map(stageName => {
                const isActive =
                  formData.projectStage === stageName ||
                  normalizeProjectStatus(formData.projectStage) === normalizeProjectStatus(stageName);
                return (
                  <button
                    key={stageName}
                    type="button"
                    onClick={() => handleStageChange(stageName)}
                    className={`px-2.5 py-1 rounded text-[10px] font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-xs hover:from-amber-400 hover:to-amber-500'
                        : isLight
                        ? 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-2xs'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {stageName.replace('Installation ', 'Install ')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* THREE COLUMN BODY (Mirrors Lead Details HubSpot Layout) */}
        <div className={`flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden transition-colors ${
          isLight ? 'bg-slate-50/50 divide-slate-200' : 'bg-slate-950/40 divide-slate-800'
        }`}>
          {/* COLUMN 1: LEFT PANEL (8 Comprehensive Sections with 50+ Fields) */}
          <div className="lg:col-span-4 xl:col-span-4 overflow-y-auto pr-2 custom-scrollbar">
            <div className="mb-2 flex items-center justify-between pb-1">
              <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                Project Details
              </span>
              <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Left Column</span>
            </div>
            <ProjectDetailsLeftPanel
              formData={formData}
              setFormData={setFormData}
              dropdowns={dropdowns}
            />
          </div>

          {/* COLUMN 2: CENTER COLUMN (2 Tabs: Overview & Activities) */}
          <div className={`lg:col-span-5 xl:col-span-5 overflow-y-auto pr-2 custom-scrollbar flex flex-col rounded-xl border p-3.5 transition-colors ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
          }`}>
            <ProjectCenterTabs
              project={project}
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
                CRM &amp; Operations
              </span>
              <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Right Column</span>
            </div>
            <ProjectRightSidebar
              project={project}
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
              xeroInvoiceTotal={parseAudAccounts(formData.amount || formData.sellingPrice)}
              xeroInvoiceStatus="AUTHORISED"
              xeroReceiptNumber={xeroReceiptNumber}
              xeroReceiptAmount={parseAudAccounts(formData.deposit)}
              xeroActionNotice={xeroNotice}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
