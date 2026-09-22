import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Lead, AustralianState, LeadActivity, LeadAttachment, CustomerPortalCredentials } from '../../types';
import {
  formatAudAccounts,
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
  Activity
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
    batteryRequired: true,
    roofType: 'Colorbond / Metal Sheet',
    noOfPanels: '24',
    panelManufacturer: 'AIKO Solar',
    panelSizeW: '440',
    panelSeries: 'Neostar 2P',
    panelModel: 'AIKO-A440-MAH54Mb (All-Black N-Type ABC)',
    noOfInverters: '1',
    inverterManufacturer: 'Sungrow (SG/SH Series)',
    inverterSizeKw: '10',
    inverterModel: 'SH10RT-20 (Three Phase High Voltage Hybrid)',
    noOfBatteries: '1',
    batteryManufacturer: 'Tesla Powerwall 3 (13.5kWh)',
    batteryUsableCapacityKwh: '13.5',
    batteryModel: 'Tesla Powerwall 3 Integrated Inverter',
    batterySize: '13.5kWh Wall Mounted Slimline',
    houseStorey: 'Double Storey',
    phase: 'Three Phase',
    existingSystemDetails: 'No existing solar installed (Brand new installation)',
    docsReceived: 'Yes',
    docsReceivedDate: '',

    systemPrice: '$12,500.00',
    sellingPrice: '$8,900.00',
    deposit: '$1,000.00',

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

  const inverterHierarchy = dropdowns.inverterHierarchy || [];
  const inverterManufacturers = useMemo(() => {
    const list = Array.from(new Set(inverterHierarchy.map(i => i.manufacturer)));
    return list.length > 0 ? list : dropdowns.inverterBrands || ['Sungrow', 'Fronius', 'Enphase', 'GoodWe'];
  }, [inverterHierarchy, dropdowns.inverterBrands]);

  const inverterSizes = useMemo(() => {
    const matching = inverterHierarchy.filter(i => i.manufacturer === formData.inverterManufacturer);
    return Array.from(new Set(matching.map(i => String(i.sizeKw))));
  }, [inverterHierarchy, formData.inverterManufacturer]);

  const inverterModels = useMemo(() => {
    const matching = inverterHierarchy.filter(
      i => i.manufacturer === formData.inverterManufacturer && String(i.sizeKw) === String(formData.inverterSizeKw)
    );
    return Array.from(new Set(matching.map(i => i.model)));
  }, [inverterHierarchy, formData.inverterManufacturer, formData.inverterSizeKw]);

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
    const matching = inverterHierarchy.filter(i => i.manufacturer === manuf);
    setFormData(prev => ({
      ...prev,
      inverterManufacturer: manuf,
      inverterSizeKw: matching.length > 0 ? String(matching[0].sizeKw) : prev.inverterSizeKw,
      inverterModel: matching.length > 0 ? matching[0].model : prev.inverterModel
    }));
  };

  const handleInverterSizeChange = (size: string) => {
    const matching = inverterHierarchy.filter(
      i => i.manufacturer === formData.inverterManufacturer && String(i.sizeKw) === size
    );
    setFormData(prev => ({
      ...prev,
      inverterSizeKw: size,
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

  // Populate state on lead edit or create
  useEffect(() => {
    if (lead) {
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        projectNumber: lead.projectNumber || (lead.id ? `PRJ-${lead.id.replace(/[^0-9]/g, '').slice(-4) || '1048'}` : ''),
        leadDate: lead.leadDate || lead.createdAt || today,
        platform: lead.platform || lead.source || dropdowns.platforms?.[0] || 'Meta Lead Ads (Facebook/Instagram)',
        salesPersonName: lead.salesPersonName || lead.assignedTo || dropdowns.salesPersons?.[0] || 'Mitchell Barnes',
        status: lead.status || 'New',
        saleDate: lead.saleDate || '',
        depositReceivedDate: lead.depositReceivedDate || '',

        firstName: lead.firstName || (lead.customerName ? lead.customerName.split(' ')[0] : ''),
        lastName: lead.lastName || (lead.customerName ? lead.customerName.split(' ').slice(1).join(' ') : ''),
        managerRenteeFirstName: lead.managerRenteeFirstName || '',
        managerRenteeLastName: lead.managerRenteeLastName || '',

        hasCompany: Boolean(lead.hasCompany || lead.companyName || lead.companyId),
        companyName: lead.companyName || '',
        companyOwner: lead.companyOwner || lead.salesPersonName || 'Mitchell Barnes',
        companyCreateDate: lead.companyCreateDate || today,
        companyPhone: lead.companyPhone || lead.primaryMobile || lead.phone || '',
        companyCity: lead.companyCity || lead.suburb || 'Sydney',
        companyCountry: lead.companyCountry || 'Australia',
        companyType: lead.companyType || 'Commercial Customer',
        companyAbn: lead.companyAbn || '',

        address: lead.address || '',
        suburb: lead.suburb || '',
        state: lead.state || 'NSW',
        postcode: lead.postcode || '',
        area: lead.area || (lead.postcode ? classifyAustralianPostcode(lead.postcode, String(lead.state)) : 'Metro'),
        nearestBigCity: lead.nearestBigCity || getNearestBigCity(lead.suburb, lead.postcode, String(lead.state)),
        addressVerified: lead.addressVerified ?? Boolean(lead.address && lead.postcode),

        primaryMobile: lead.primaryMobile || lead.phone || '',
        secondaryMobile: lead.secondaryMobile || '',
        email: lead.email || '',

        systemSizeKw: lead.systemSizeKw || 10.4,
        batteryRequired: lead.batteryRequired ?? true,
        roofType: lead.roofType || 'Colorbond / Metal Sheet',
        noOfPanels: lead.noOfPanels !== undefined ? String(lead.noOfPanels) : '24',
        panelManufacturer: lead.panelManufacturer || dropdowns.panelBrands?.[0] || 'AIKO Solar',
        panelSizeW: lead.panelSizeW !== undefined ? String(lead.panelSizeW) : '440',
        panelSeries: lead.panelSeries || 'Neostar 2P',
        panelModel: lead.panelModel || 'AIKO-A440-MAH54Mb (All-Black N-Type ABC)',
        noOfInverters: lead.noOfInverters !== undefined ? String(lead.noOfInverters) : '1',
        inverterManufacturer: lead.inverterManufacturer || dropdowns.inverterBrands?.[0] || 'Sungrow (SG/SH Series)',
        inverterSizeKw: lead.inverterSizeKw !== undefined ? String(lead.inverterSizeKw) : '10',
        inverterModel: lead.inverterModel || 'SH10RT-20 (Three Phase High Voltage Hybrid)',
        noOfBatteries: lead.noOfBatteries !== undefined ? String(lead.noOfBatteries) : '1',
        batteryManufacturer: lead.batteryManufacturer || dropdowns.batteryBrands?.[0] || 'Tesla Powerwall 3 (13.5kWh)',
        batteryUsableCapacityKwh: lead.batteryUsableCapacityKwh !== undefined ? String(lead.batteryUsableCapacityKwh) : '13.5',
        batteryModel: lead.batteryModel || 'Tesla Powerwall 3 Integrated Inverter',
        batterySize: lead.batterySize || '13.5kWh Wall Mounted Slimline',
        houseStorey: lead.houseStorey || 'Double Storey',
        phase: lead.phase || 'Three Phase',
        existingSystemDetails: lead.existingSystemDetails || 'No existing solar installed (Brand new installation)',
        docsReceived: lead.docsReceived || 'Yes',
        docsReceivedDate: lead.docsReceivedDate || '',

        systemPrice: lead.systemPrice !== undefined && lead.systemPrice !== '' ? formatAudAccounts(lead.systemPrice) : '$12,500.00',
        sellingPrice: lead.sellingPrice !== undefined && lead.sellingPrice !== '' ? formatAudAccounts(lead.sellingPrice) : '$8,900.00',
        deposit: lead.deposit !== undefined && lead.deposit !== '' ? formatAudAccounts(lead.deposit) : '$1,000.00',

        salesTeamNotes: lead.salesTeamNotes || ''
      });

      setAttachments(lead.attachments || []);
      setPortalCredentials(lead.portalCredentials);
      setXeroInvoiceId(lead.xeroInvoiceId || '');
      setXeroInvoiceNumber(lead.xeroInvoiceNumber || '');
      setXeroInvoiceTotal(lead.xeroInvoiceTotal || 0);
      setXeroInvoiceStatus(lead.xeroInvoiceStatus || '');
      setXeroReceiptNumber(lead.xeroReceiptNumber || '');
      setXeroReceiptDate(lead.xeroReceiptDate || '');
      setXeroReceiptAmount(lead.xeroReceiptAmount || 0);
      setXeroReceiptMethod(lead.xeroReceiptMethod || '');

      // Seed activities if empty
      if (lead.activities && lead.activities.length > 0) {
        setActivities(lead.activities);
      } else {
        setActivities([
          {
            id: `act-init-1`,
            leadId: lead.id,
            type: 'Status Change',
            title: `Lead Created (${lead.status || 'New'})`,
            description: `Lead registered via ${lead.platform || 'Inbound'} platform assigned to ${lead.salesPersonName || 'Mitchell Barnes'}.`,
            createdAt: lead.leadDate || lead.createdAt || new Date().toISOString(),
            createdBy: 'System Pipeline'
          },
          {
            id: `act-init-2`,
            leadId: lead.id,
            type: 'Note',
            title: 'Customer Requirement Logged',
            description: `Customer requested ${lead.systemSizeKw || 10.4} kW solar system specifications. Contact entity auto-created.`,
            createdAt: new Date().toISOString(),
            createdBy: lead.salesPersonName || 'Mitchell Barnes'
          }
        ]);
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
        batteryRequired: true,
        roofType: 'Colorbond / Metal Sheet',
        noOfPanels: '24',
        panelManufacturer: dropdowns.panelBrands?.[0] || 'AIKO Solar',
        panelSizeW: '440',
        panelSeries: 'Neostar 2P',
        panelModel: 'AIKO-A440-MAH54Mb (All-Black N-Type ABC)',
        noOfInverters: '1',
        inverterManufacturer: dropdowns.inverterBrands?.[0] || 'Sungrow (SG/SH Series)',
        inverterSizeKw: '10',
        inverterModel: 'SH10RT-20 (Three Phase High Voltage Hybrid)',
        noOfBatteries: '1',
        batteryManufacturer: dropdowns.batteryBrands?.[0] || 'Tesla Powerwall 3 (13.5kWh)',
        batteryUsableCapacityKwh: '13.5',
        batteryModel: 'Tesla Powerwall 3 Integrated Inverter',
        batterySize: '13.5kWh Wall Mounted Slimline',
        houseStorey: 'Double Storey',
        phase: 'Three Phase',
        existingSystemDetails: 'No existing solar installed (Brand new installation)',
        docsReceived: 'Yes',
        docsReceivedDate: '',

        systemPrice: '$12,500.00',
        sellingPrice: '$8,900.00',
        deposit: '$1,000.00',

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
      systemPrice: formatAudAccounts(14200),
      sellingPrice: formatAudAccounts(10500),
      deposit: formatAudAccounts(1000),
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

      // Hardware Specs (Section 4B)
      systemSizeKw: formData.systemSizeKw,
      batteryRequired: formData.batteryRequired,
      roofType: formData.roofType,
      noOfPanels: formData.noOfPanels ? Number(formData.noOfPanels) || formData.noOfPanels : 24,
      panelManufacturer: formData.panelManufacturer,
      panelSizeW: formData.panelSizeW ? Number(formData.panelSizeW) || formData.panelSizeW : 440,
      panelSeries: formData.panelSeries,
      panelModel: formData.panelModel,
      noOfInverters: formData.noOfInverters ? Number(formData.noOfInverters) || formData.noOfInverters : 1,
      inverterManufacturer: formData.inverterManufacturer,
      inverterSizeKw: formData.inverterSizeKw ? Number(formData.inverterSizeKw) || formData.inverterSizeKw : 10,
      inverterModel: formData.inverterModel,
      noOfBatteries: formData.noOfBatteries ? Number(formData.noOfBatteries) || formData.noOfBatteries : 1,
      batteryManufacturer: formData.batteryManufacturer,
      batteryUsableCapacityKwh: formData.batteryUsableCapacityKwh ? Number(formData.batteryUsableCapacityKwh) || formData.batteryUsableCapacityKwh : 13.5,
      batteryModel: formData.batteryModel,
      batterySize: formData.batterySize,
      houseStorey: formData.houseStorey,
      phase: formData.phase,
      existingSystemDetails: formData.existingSystemDetails,
      docsReceived: formData.docsReceived,
      docsReceivedDate: formData.docsReceivedDate,

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
                HubSpot CRM Workspace • Source: {formData.platform || 'Direct'} • System: {formData.systemSizeKw} kW
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
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
                  {formData.systemSizeKw} kW
                </span>
              </div>
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
          {/* COLUMN 1: LEFT SIDEBAR (Lead Details Sections 1-8, with System Size (kW) in 4B & Company Checkbox) */}
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
              <span className={`font-bold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>{formData.systemSizeKw} kW</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`uppercase text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Selling:</span>
              <span className={`font-bold font-mono ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>${formData.sellingPrice || '0'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`uppercase text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Deposit:</span>
              <span className={`font-bold font-mono ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>${formData.deposit || '0'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`uppercase text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Company:</span>
              <span className={formData.hasCompany ? (isLight ? 'text-blue-700 font-semibold' : 'text-blue-400 font-semibold') : (isLight ? 'text-slate-500' : 'text-slate-500')}>
                {formData.hasCompany ? formData.companyName || 'Associated' : 'None (Residential)'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
