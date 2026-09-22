import {
  UserProfile,
  Contact,
  Company,
  Lead,
  Project,
  Ticket,
  MaintenanceRecord,
  SubContractor,
  SalesOrder,
  InstallOrder,
  CustomerReview,
  MessageMediaSMS,
  VoIPCallLog,
  DynamicDropdownConfig,
  LeaveRequest,
  IntegrationConfig,
  ReferralBonus,
  CompanyProfile,
  AppNotification,
  RoleAccessConfig,
  SystemFeatureConfig,
  DynamicRoleConfig,
  SystemOperationalRules,
  PortalAddressConfig,
  SystemPortalAddresses
} from '../types';

export const INITIAL_COMPANY_PROFILE: CompanyProfile = {
  companyName: 'MySolarCRM',
  legalName: 'MySolarCRM Australia Pty Ltd',
  abn: '52 619 840 231',
  acn: '619 840 231',
  logoUrl: '',
  headerLogoUrl: '',
  loginLogoUrl: '',
  logoPreset: 'sun',
  headerLogoPreset: 'sun',
  loginLogoPreset: 'sun',
  primaryColor: '#f59e0b',
  accentColor: '#38bdf8',
  tagline: "Australia's Premier Solar & Battery Energy Management CRM",
  email: 'operations@mysolarcrm.com.au',
  phone: '1300 852 400',
  website: 'https://mysolarcrm.com.au',
  address: 'Level 14, 100 Pacific Highway, North Sydney NSW 2060',
  cecRetailerNumber: 'CEC-RET-94281',
  portalWelcomeText: 'Welcome to the My Solar Customer Portal. Track your solar installation, view your signed contract, and monitor savings.',
  portalBannerUrl: ''
};

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

export const INITIAL_ACCESS_ROLES: RoleAccessConfig[] = [
  {
    role: 'admin',
    roleName: 'System Administrator',
    description: 'Full unconstrained access to all ERP modules, P&L, HRMS, and settings.',
    canViewLeads: true,
    canEditLeads: true,
    canViewProjects: true,
    canEditProjects: true,
    canViewTickets: true,
    canResolveTickets: true,
    canViewFinancials: true,
    canManageSettings: true,
    canAccessPortals: true
  },
  {
    role: 'manager',
    roleName: 'Operations & Sales Manager',
    description: 'Pipeline oversight, RFQ management, installer dispatch, and team coordination.',
    canViewLeads: true,
    canEditLeads: true,
    canViewProjects: true,
    canEditProjects: true,
    canViewTickets: true,
    canResolveTickets: true,
    canViewFinancials: true,
    canManageSettings: false,
    canAccessPortals: true
  },
  {
    role: 'employee',
    roleName: 'Sales & Field Representative',
    description: 'Leads prospecting, customer communication, survey scheduling, and site notes.',
    canViewLeads: true,
    canEditLeads: true,
    canViewProjects: true,
    canEditProjects: false,
    canViewTickets: true,
    canResolveTickets: false,
    canViewFinancials: false,
    canManageSettings: false,
    canAccessPortals: false
  },
  {
    role: 'installer',
    roleName: 'Subcontractor Installer',
    description: 'Access to assigned work orders, quote submission, and photo uploads.',
    canViewLeads: false,
    canEditLeads: false,
    canViewProjects: true,
    canEditProjects: false,
    canViewTickets: false,
    canResolveTickets: false,
    canViewFinancials: false,
    canManageSettings: false,
    canAccessPortals: true
  },
  {
    role: 'customer',
    roleName: 'Customer (Self-Service)',
    description: 'Live project tracking, signed proposal review, invoices, and review submission.',
    canViewLeads: false,
    canEditLeads: false,
    canViewProjects: true,
    canEditProjects: false,
    canViewTickets: true,
    canResolveTickets: false,
    canViewFinancials: false,
    canManageSettings: false,
    canAccessPortals: true
  }
];

export const INITIAL_DROPDOWNS: DynamicDropdownConfig = {
  panelBrands: ['AIKO Solar', 'Jinko Solar (Tiger Neo)', 'Trina Solar (Vertex S+)', 'Canadian Solar', 'LONGi Solar', 'REC Alpha Pure'],
  inverterBrands: ['Fronius (Primo/Symo Gen24)', 'Sungrow (SG/SH Series)', 'Enphase (IQ8 Microinverters)', 'SolarEdge (Home Wave)', 'Sigenergy (SigenStor)', 'GoodWe'],
  batteryBrands: ['Tesla Powerwall 3 (13.5kWh)', 'Sungrow SBR Battery (9.6kWh - 19.2kWh)', 'Sigenergy SigenStor (8kWh - 48kWh)', 'BYD Battery-Box Premium', 'Enphase IQ Battery 5P'],
  leadSources: ['Meta Ads (NSW High Efficiency)', 'Meta Ads (QLD Battery Rebate)', 'Google Search & PMax', 'OpenSolar Lead Form', 'Customer Referral', 'SolarQuotes.com.au'],
  roofTypes: ['Colorbond / Metal Sheet', 'Concrete Tile', 'Terracotta Tile', 'Klip-lok Metal', 'Slate', 'Commercial Flat Roof'],
  projectStatuses: [
    'Site Survey',
    'Engineering & DNSP Approval',
    'Sales Order Dispatched',
    'RFQ Sent to Installers',
    'Install Scheduled',
    'Installation in Progress',
    'Installation Completed',
    'BridgeSelect STC Claimed',
    'Grid Meter Connected',
    'Completed'
  ],
  ticketCategories: [
    'Inverter Fault / Error Code',
    'WiFi Monitoring Drop',
    'Panel Damage / Shading',
    'Switchboard Trip',
    'Roof Leak Inspection',
    'General Query'
  ],
  ticketPriorities: ['Low', 'Medium', 'High', 'Urgent'],
  dnspsNSW: ['Ausgrid (Sydney/Central Coast/Hunter)', 'Endeavour Energy (Western Sydney/South Coast)', 'Essential Energy (Regional NSW)'],
  dnspsQLD: ['Energex (South East QLD/Brisbane/Gold Coast)', 'Ergon Energy (Regional QLD)'],
  employeeDepartments: ['Management', 'Sales', 'Operations', 'Warehouse', 'Customer Support', 'Engineering'],
  referralPaymentStatuses: ['Pending Review', 'Approved for Payment', 'Paid via EFT', 'On Hold', 'Rejected'],
  states: ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'ACT', 'NT'],
  contactTypes: ['Residential', 'Commercial', 'Subcontractor', 'Vendor', 'Government / Council', 'Partner'],
  companyTypes: ['Commercial Customer', 'Subcontractor Installer', 'Equipment Vendor', 'Engineering Consultant', 'Wholesaler / Distributor'],
  platforms: [
    'Meta Lead Ads (Facebook/Instagram)',
    'Google Search & PMax Ads',
    'Website Inbound Form',
    'OpenSolar Lead Form',
    'Customer Referral',
    'Direct Phone Call (Inbound)',
    'Door to Door / Field Sales',
    'SolarQuotes.com.au Partner'
  ],
  salesPersons: [
    'Mitchell Barnes',
    'Chloe Gallagher',
    'Akash Mohite',
    'Liam Evans',
    'Jessica Wu',
    'Marcus Vance',
    'Sarah Jenkins'
  ],
  leadStatuses: [
    'New',
    'Contacted',
    'Site Survey Scheduled',
    'Proposal Sent',
    'Contract Signed',
    'Deposit Received',
    'Converted to Project',
    'Lost'
  ],
  houseStoreys: [
    'Single Storey',
    'Double Storey',
    'Triple Storey',
    'Split Level',
    'Commercial Multi-Level'
  ],
  phases: [
    'Single Phase',
    'Three Phase',
    'Split Phase'
  ],
  docsReceivedOptions: [
    'Yes',
    'No',
    'Partially Received',
    'Pending DNSP Pre-Approval',
    'Pending Council DA / Heritage'
  ],
  existingSystemTemplates: [
    'No existing solar installed (Brand new installation)',
    'Existing 1.5kW System with 8 x 190W panels + Sharp Inverter (To be decommissioned)',
    'Existing 3.0kW System with 12 x 250W panels + Sunny Boy Inverter (Retain existing string)',
    'Existing 5.0kW System with 15 x 330W panels + Fronius Primo (Add AC Coupled Battery)',
    'Existing 6.6kW System with 18 x 370W panels + Sungrow SG5.0RS (Upgrade to Hybrid & Battery)',
    'Existing Solar Hot Water system on North pitch (Roof space constraint)',
    'Existing 3-Phase Solar 10kW with SolarEdge Optimizers'
  ],
  panelHierarchy: [
    { id: 'ph-1', manufacturer: 'AIKO Solar', sizeW: 440, series: 'Neostar 2P', model: 'AIKO-A440-MAH54Mb (All-Black N-Type ABC)' },
    { id: 'ph-2', manufacturer: 'AIKO Solar', sizeW: 450, series: 'Neostar 2S', model: 'AIKO-A450-MAH54Mb (High Efficiency ABC)' },
    { id: 'ph-3', manufacturer: 'AIKO Solar', sizeW: 475, series: 'Stellar Series', model: 'AIKO-A475-MAH60Mb (Commercial & Large Roof)' },
    { id: 'ph-4', manufacturer: 'Jinko Solar (Tiger Neo)', sizeW: 440, series: 'Tiger Neo N-Type 54HL4R', model: 'JKM440N-54HL4R-B (Full Black)' },
    { id: 'ph-5', manufacturer: 'Jinko Solar (Tiger Neo)', sizeW: 475, series: 'Tiger Neo N-Type 60HL4', model: 'JKM475N-60HL4-V (Silver Frame)' },
    { id: 'ph-6', manufacturer: 'Trina Solar (Vertex S+)', sizeW: 440, series: 'Vertex S+ Dual Glass', model: 'TSM-440NEG9R.28 (Clear Black N-Type)' },
    { id: 'ph-7', manufacturer: 'Trina Solar (Vertex S+)', sizeW: 450, series: 'Vertex S+ Dual Glass', model: 'TSM-450NEG9R.28 (High Output)' },
    { id: 'ph-8', manufacturer: 'Trina Solar (Vertex S+)', sizeW: 500, series: 'Vertex S+ Ultra', model: 'TSM-500NEG18R.20 (Bifacial Commercial)' },
    { id: 'ph-9', manufacturer: 'Canadian Solar', sizeW: 415, series: 'HiKu6 Mono PERC', model: 'CS6R-415MS (Reliable All-Weather)' },
    { id: 'ph-10', manufacturer: 'Canadian Solar', sizeW: 440, series: 'TOPHiKu6 N-Type', model: 'CS6R-440T (N-Type TOPCon Dual-Glass)' },
    { id: 'ph-11', manufacturer: 'LONGi Solar', sizeW: 435, series: 'Hi-MO X6 Explorer', model: 'LR5-54HTB-435M (HPBC Black)' },
    { id: 'ph-12', manufacturer: 'LONGi Solar', sizeW: 450, series: 'Hi-MO 7 Bifacial', model: 'LR5-72HGD-450M (Commercial N-Type)' },
    { id: 'ph-13', manufacturer: 'REC Alpha Pure', sizeW: 430, series: 'Alpha Pure-R Series', model: 'REC430AA Pure-R (Heterojunction HJT Lead-Free)' },
    { id: 'ph-14', manufacturer: 'REC Alpha Pure', sizeW: 470, series: 'Alpha Pure-RX Series', model: 'REC470AA Pure-RX (Premium High Density)' }
  ],
  inverterHierarchy: [
    { id: 'ih-1', manufacturer: 'Fronius (Primo/Symo Gen24)', sizeKw: 5.0, model: 'Primo GEN24 5.0 Plus (Single Phase Hybrid Ready)' },
    { id: 'ih-2', manufacturer: 'Fronius (Primo/Symo Gen24)', sizeKw: 6.0, model: 'Primo GEN24 6.0 Plus (Single Phase)' },
    { id: 'ih-3', manufacturer: 'Fronius (Primo/Symo Gen24)', sizeKw: 8.2, model: 'Primo 8.2-1 (High Yield Single Phase)' },
    { id: 'ih-4', manufacturer: 'Fronius (Primo/Symo Gen24)', sizeKw: 10.0, model: 'Symo GEN24 10.0 Plus (Three Phase Hybrid)' },
    { id: 'ih-5', manufacturer: 'Sungrow (SG/SH Series)', sizeKw: 5.0, model: 'SG5.0RS-ADA (Single Phase Dual MPPT String)' },
    { id: 'ih-6', manufacturer: 'Sungrow (SG/SH Series)', sizeKw: 5.0, model: 'SH5.0RS Hybrid (Single Phase Battery Ready)' },
    { id: 'ih-7', manufacturer: 'Sungrow (SG/SH Series)', sizeKw: 8.0, model: 'SH8.0RT-20 (Three Phase High Voltage Hybrid)' },
    { id: 'ih-8', manufacturer: 'Sungrow (SG/SH Series)', sizeKw: 10.0, model: 'SH10RT-20 (Three Phase High Voltage Hybrid)' },
    { id: 'ih-9', manufacturer: 'Enphase (IQ8 Microinverters)', sizeKw: 5.0, model: 'IQ8AC Microinverter Array (5.0kW Peak Grid-Forming)' },
    { id: 'ih-10', manufacturer: 'Enphase (IQ8 Microinverters)', sizeKw: 10.0, model: 'IQ8HC Microinverter Commercial Array (10.0kW Peak)' },
    { id: 'ih-11', manufacturer: 'SolarEdge (Home Wave)', sizeKw: 5.0, model: 'SE5000H Home Wave (HD-Wave with Optimizers)' },
    { id: 'ih-12', manufacturer: 'SolarEdge (Home Wave)', sizeKw: 10.0, model: 'SE10000H Home Hub (Three Phase Backup Ready)' },
    { id: 'ih-13', manufacturer: 'Sigenergy (SigenStor)', sizeKw: 5.0, model: 'SigenStor 5.0 TP (All-in-One 5kW Single Phase)' },
    { id: 'ih-14', manufacturer: 'Sigenergy (SigenStor)', sizeKw: 10.0, model: 'SigenStor 10.0 TP (All-in-One 10kW Three Phase)' },
    { id: 'ih-15', manufacturer: 'GoodWe', sizeKw: 5.0, model: 'DNS Series G3 (GW5000D-NS Single Phase)' },
    { id: 'ih-16', manufacturer: 'GoodWe', sizeKw: 10.0, model: 'ET Series (GW10K-ET Three Phase Storage Hybrid)' }
  ],
  batteryHierarchy: [
    { id: 'bh-1', manufacturer: 'Tesla Powerwall 3 (13.5kWh)', usableCapacityKwh: 13.5, model: 'Tesla Powerwall 3 Integrated Inverter', size: '13.5kWh Wall Mounted Slimline' },
    { id: 'bh-2', manufacturer: 'Tesla Powerwall 3 (13.5kWh)', usableCapacityKwh: 27.0, model: 'Dual Tesla Powerwall 3 Pack (2 x 13.5kWh)', size: '27.0kWh High Capacity Dual Stacking' },
    { id: 'bh-3', manufacturer: 'Sungrow SBR Battery (9.6kWh - 19.2kWh)', usableCapacityKwh: 9.6, model: 'SBR096 High Voltage Modular', size: '3 Modules (9.6kWh Floor Mounted Tower)' },
    { id: 'bh-4', manufacturer: 'Sungrow SBR Battery (9.6kWh - 19.2kWh)', usableCapacityKwh: 12.8, model: 'SBR128 High Voltage Modular', size: '4 Modules (12.8kWh Floor Mounted Tower)' },
    { id: 'bh-5', manufacturer: 'Sungrow SBR Battery (9.6kWh - 19.2kWh)', usableCapacityKwh: 16.0, model: 'SBR160 High Voltage Modular', size: '5 Modules (16.0kWh Floor Mounted Tower)' },
    { id: 'bh-6', manufacturer: 'Sungrow SBR Battery (9.6kWh - 19.2kWh)', usableCapacityKwh: 19.2, model: 'SBR192 High Voltage Modular', size: '6 Modules (19.2kWh Maximum Residential Tower)' },
    { id: 'bh-7', manufacturer: 'Sigenergy SigenStor (8kWh - 48kWh)', usableCapacityKwh: 8.0, model: 'Sigen Battery 8.0kWh LFP', size: 'Single 8kWh Modular Stack' },
    { id: 'bh-8', manufacturer: 'Sigenergy SigenStor (8kWh - 48kWh)', usableCapacityKwh: 16.0, model: 'Sigen Battery Dual Stack 16.0kWh', size: 'Dual 16kWh Modular Stack' },
    { id: 'bh-9', manufacturer: 'Sigenergy SigenStor (8kWh - 48kWh)', usableCapacityKwh: 24.0, model: 'Sigen Battery Triple Stack 24.0kWh', size: 'Triple 24kWh Heavy Duty Residential' },
    { id: 'bh-10', manufacturer: 'BYD Battery-Box Premium', usableCapacityKwh: 10.2, model: 'Battery-Box Premium HVS 10.2', size: '4 x HVS 2.56kWh Modules Tower' },
    { id: 'bh-11', manufacturer: 'BYD Battery-Box Premium', usableCapacityKwh: 13.8, model: 'Battery-Box Premium HVM 13.8', size: '5 x HVM 2.76kWh Modules Tower' },
    { id: 'bh-12', manufacturer: 'Enphase IQ Battery 5P', usableCapacityKwh: 5.0, model: 'IQ Battery 5P Modular', size: '5.0kWh Compact Wall Mount' },
    { id: 'bh-13', manufacturer: 'Enphase IQ Battery 5P', usableCapacityKwh: 10.0, model: 'Dual IQ Battery 5P System (2 x 5P)', size: '10.0kWh Dual Wall Array' },
    { id: 'bh-14', manufacturer: 'Enphase IQ Battery 5P', usableCapacityKwh: 15.0, model: 'Triple IQ Battery 5P System (3 x 5P)', size: '15.0kWh Whole Home Backup' }
  ],

  // Project Management Dropdowns
  projectStages: [
    'Site Survey',
    'Engineering & DNSP Approval',
    'Sales Order Created (Warehouse)',
    'Subcontractor RFQ / Quoting',
    'Install Scheduled',
    'Installation in Progress',
    'Installation Completed',
    'Clean Energy Regulator (STC Claim)',
    'DNSP Grid Inspection & Metering',
    'Completed'
  ],
  ebCustomerNameMatchOptions: ['Yes', 'No', 'Pending Rectification'],
  ebAddressMatchOptions: ['Yes', 'No', 'Pending Land Title / Sub-lot'],
  ebMeterMatchOptions: ['Yes', 'No', 'Discrepancy Flagged'],
  ebMeterPhaseOptions: ['Single Phase', 'Three Phase', 'Two Phase / Split'],
  ebOpenSolarSystemMatchOptions: ['Yes', 'No', 'Variance Verified'],
  ebOpenSolarPricingMatchOptions: ['Yes', 'No', 'Discrepancy Adjusted'],
  electricityDistributors: [
    'Ausgrid',
    'Endeavour Energy',
    'Essential Energy',
    'Energex',
    'Ergon Energy',
    'Powercor',
    'CitiPower',
    'Jemena',
    'United Energy',
    'SA Power Networks',
    'Western Power'
  ],
  energyRetailers: [
    'Origin Energy',
    'AGL Energy',
    'EnergyAustralia',
    'Red Energy',
    'Alinta Energy',
    'Powershop',
    'Amber Electric',
    'Dodo Power & Gas',
    'OVO Energy',
    'GloBird Energy'
  ],
  gridApplicationStatuses: [
    'Not Started',
    'Grid Applied',
    'Grid Under Review',
    'Grid App Approved',
    'Grid Rejected',
    'Resubmitted'
  ],
  installationStatuses: [
    'Unscheduled',
    'Booked / Scheduled',
    'Installer Dispatched',
    'In Progress',
    'Installation Completed',
    'Closed',
    'Cancelled'
  ],
  installationBookedByOptions: [
    'Operations Manager',
    'Lead Electrician',
    'Customer Service',
    'Project Coordinator',
    'Akash Mohite',
    'Chloe Gallagher',
    'Mitchell Barnes'
  ],
  installationMonths: [
    'January 2026',
    'February 2026',
    'March 2026',
    'April 2026',
    'May 2026',
    'June 2026',
    'July 2026',
    'August 2026',
    'September 2026',
    'October 2026',
    'November 2026',
    'December 2026'
  ],
  installationDocsStatuses: [
    'Pending',
    'Uploaded',
    'Under Review',
    'Verified & SAA Approved',
    'Rectification Required'
  ],
  installerInvoiceStatuses: [
    'Pending Approval',
    'Approved',
    'Paid',
    'Disputed',
    'On Hold'
  ],
  warehouses: [
    'Sydney Central DC (Alexandria)',
    'Brisbane North Hub (Eagle Farm)',
    'Melbourne West Warehouse (Truganina)',
    'Adelaide Logistics Depot',
    'Perth Distribution Centre'
  ],
  warehouseInvoiceStatuses: [
    'Draft',
    'Awaiting Dispatch',
    'Invoiced',
    'Paid',
    'Reconciled'
  ],
  stockStatuses: [
    'In Stock',
    'Allocated to Job',
    'Awaiting Shipment',
    'Dispatched to Site',
    'Delivered & Installed'
  ],
  isFinanceOptions: [
    'No (Cash / Direct Payment)',
    'Yes (Green Finance)',
    'Yes (Interest Free)',
    'Conditional Finance'
  ],
  financeCompanies: [
    'Brighte',
    'Plenti',
    'Community First Credit Union',
    'Humm',
    'Handepay',
    'RateSetter',
    'Parker Lane'
  ],
  financeStatuses: [
    'Not Applicable',
    'Application Draft',
    'Submitted',
    'Conditionally Approved',
    'Unconditionally Approved',
    'Settled',
    'Declined'
  ],
  stcPortals: [
    'BridgeSelect',
    'Green Energy Trading (GET)',
    'Clean Energy Trading',
    'TradeSTCs',
    'REC Registry'
  ],
  stcStatuses: [
    'Pending Upload',
    'Pre-Validation Passed',
    'Submitted to CER',
    'Approved & Traded',
    'Audit Flagged',
    'Paid'
  ],
  ticketIssueRecordedOptions: [
    'Inverter Fault / Red Alarm Light',
    'No Generation / Zero Daily Yield',
    'Error Code (e.g. Ground Fault / Isolation Error)',
    'Battery Discharging Failure / Offline',
    'Monitoring Dongle Offline / Wi-Fi Drop',
    'Solar System Tripping Circuit Breaker',
    'Panel Hotspot / Visible Damage',
    'Roof Leak Near Solar Brackets',
    'Smart Meter Interval Misalignment',
    'Physical Damage / Storm Impact'
  ],
  ticketInitialCheckOptions: [
    'Remote Portal Telemetry Verification',
    'DC Isolator Check (Passed)',
    'AC Main Switch Check (Passed)',
    'Inverter Error Code Diagnostic Run',
    'Battery State of Charge (SoC) Inspection',
    'Grid Overvoltage Tripping Check',
    'Wi-Fi RSSI Signal Check',
    'Customer Troubleshooting Guided via Phone',
    'Physical On-Site Inspection Required',
    'Pending Initial Field Dispatch'
  ],
  ticketWorkRequiredOptions: [
    'Inverter Replacement under Manufacturer Warranty',
    'Firmware Upgrade & Inverter Re-commissioning',
    'Replace Faulty DC Isolator / Rewire Cable',
    'Panel Replacement & Recalibration',
    'Wi-Fi Dongle Replacement & Setup',
    'Battery Module Swap / BMS Reset',
    'Switchboard RCD / Circuit Breaker Upgrade',
    'Roof Flashing & Sealant Rectification',
    'Re-torque Solar Clamps & Rail Grounding',
    'General System Health Check & Clean'
  ],
  ticketIssueResolutionStatuses: [
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
  ],
  ticketWarrantyClaimStatuses: [
    'Not Applicable',
    'Draft Claim',
    'Submitted to Manufacturer',
    'RMA (Return Merchandise Auth) Issued',
    'Replacement Dispatched by Brand',
    'Replacement Received & Tested',
    'Warranty Approved & Credited',
    'Warranty Rejected / Out of Scope'
  ],
  ticketWarrantyClaimInvoiceStatuses: [
    'Pending Claim Review',
    'Claim Approved - Awaiting Credit',
    'Manufacturer Rebate Received',
    'Invoice Paid',
    'No Charge / Full Warranty Replacement',
    'Disputed with Brand'
  ],
  ticketBrandNotesPresets: [
    'Claim submitted via Sungrow Service Portal. RMA number pending review.',
    'Tesla Energy case logged. Certified Powerwall technician dispatch requested.',
    'Fronius SOS portal warranty claim approved. Replacement unit shipped from Melbourne warehouse.',
    'AIKO Solar technical support verified cell defect from electroluminescence photos.',
    'Enphase Enlighten warranty swap approved. RMA tracking provided.',
    'Sigenergy automated diagnostics uploaded to cloud support desk.'
  ],
  ticketServiceIssueNotesPresets: [
    'Customer noted inverter alarm started after weekend lightning storm.',
    'Zero kWh generation verified on smart meter for 3 consecutive days.',
    'Isolation resistance fault detected during early morning dew.',
    'Monitoring app disconnected following NBN router upgrade; 2.4GHz network required.',
    'Battery discharging stopped at 20% SoC; firmware recalibration recommended.'
  ],
  ticketInstallerNotesPresets: [
    'Licensed CEC electrician attended site; tested DC voltage and found open circuit string 2.',
    'Replaced faulty inverter under warranty; completed full commissioning and zero export test.',
    'Installed replacement 440W panel, verified Voc and Isc, re-tested earth continuity.',
    'Fixed loose Wi-Fi antenna connection; confirmed cloud sync active on Sungrow iSolarCloud.',
    'Checked roof penetration points; applied Sikaflex waterproof sealant and re-flashed bracket.'
  ]
};

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'usr-admin-1',
    name: 'Admin MakeMySolar',
    email: 'admin@makemysolar.com.au',
    phone: '+61 412 889 012',
    voipLineNumber: '+61 2 8311 4920',
    messageMediaSenderId: '+61 2 8311 4920',
    role: 'admin',
    department: 'Management',
    assignedDomain: 'makemysolar.com.au',
    isPasswordSet: true,
    inviteStatus: 'active'
  },
  {
    id: 'usr-mgr-1',
    name: 'Chloe Gallagher',
    email: 'chloe.g@mysolarcrm.com.au',
    phone: '+61 423 456 789',
    voipLineNumber: '+61 2 8311 4922',
    messageMediaSenderId: '+61 2 8311 4922',
    role: 'manager',
    department: 'Operations',
    assignedDomain: 'mysolarcrm.com.au',
    isPasswordSet: true,
    inviteStatus: 'active'
  },
  {
    id: 'usr-emp-1',
    name: 'Mitchell Barnes',
    email: 'm.barnes@mysolarcrm.com.au',
    phone: '+61 434 567 890',
    voipLineNumber: '+61 7 3184 8921',
    messageMediaSenderId: '+61 7 3184 8921',
    role: 'employee',
    department: 'Sales',
    assignedDomain: 'mysolarcrm.com.au',
    isPasswordSet: true,
    inviteStatus: 'active'
  },
  {
    id: 'usr-emp-2',
    name: 'Sarah Jenkins',
    email: 'sarah.j@mysolarcrm.com.au',
    phone: '+61 418 234 567',
    voipLineNumber: '+61 2 8311 4925',
    messageMediaSenderId: '+61 2 8311 4925',
    role: 'employee',
    department: 'Customer Support',
    assignedDomain: 'mysolarcrm.com.au',
    isPasswordSet: true,
    inviteStatus: 'active'
  }
];

export const INITIAL_CONNECTED_DOMAINS = ['makemysolar.com.au', 'mysolarcrm.com.au', 'solarenergy.com.au'];

export const INITIAL_PORTAL_ADDRESSES: SystemPortalAddresses = {
  customerPortal: {
    portalType: 'customer',
    label: 'Customer Self-Service Portal',
    subdomain: 'customer',
    baseDomain: 'mysolarcrm.com.au',
    path: '/customer',
    routingMode: 'subdomain',
    customDomain: 'customer.mysolarcrm.com.au',
    isSslActive: true,
    dnsCnameStatus: 'verified',
    dnsExpectedCname: 'customer.mysolarcrm.com.au CNAME ingress.mysolarcrm.com.au',
    customTitle: 'Customer Self-Service & Solar System Monitoring',
    customSubtitle: 'Track your solar installation, view contracts & monitor energy generation',
    supportPhone: '1300 852 400',
    supportEmail: 'support@mysolarcrm.com.au',
    allowSmsOtp: true,
    allowEmailMagicLink: true,
    allowPasswordLogin: true,
    lastUpdated: '2026-03-01T00:00:00.000Z'
  },
  installerPortal: {
    portalType: 'installer',
    label: 'Subcontractor Installer Portal',
    subdomain: 'installers',
    baseDomain: 'mysolarcrm.com.au',
    path: '/installer',
    routingMode: 'subdomain',
    customDomain: 'installers.mysolarcrm.com.au',
    isSslActive: true,
    dnsCnameStatus: 'verified',
    dnsExpectedCname: 'installers.mysolarcrm.com.au CNAME ingress.mysolarcrm.com.au',
    customTitle: 'Clean Energy Council Accredited Installer Portal',
    customSubtitle: 'Field job packs, photo verification checklists, SWMS & quote submissions',
    supportPhone: '1300 852 400',
    supportEmail: 'contractors@mysolarcrm.com.au',
    allowSmsOtp: true,
    allowEmailMagicLink: false,
    allowPasswordLogin: true,
    requireCecVerification: true,
    lastUpdated: '2026-03-01T00:00:00.000Z'
  },
  enforceSeparateLogins: true,
  enableAutoRouting: true
};

export const INITIAL_COMPANIES: Company[] = [];

export const INITIAL_CONTACTS: Contact[] = [];

export const INITIAL_LEADS: Lead[] = [];

export const INITIAL_SUBCONTRACTORS: SubContractor[] = [];

export const INITIAL_PROJECTS: Project[] = [];

export const INITIAL_TICKETS: Ticket[] = [];

export const INITIAL_MAINTENANCE: MaintenanceRecord[] = [];

export const INITIAL_SALES_ORDERS: SalesOrder[] = [];

export const INITIAL_INSTALL_ORDERS: InstallOrder[] = [];

export const INITIAL_REVIEWS: CustomerReview[] = [];

export const INITIAL_SMS_MESSAGES: MessageMediaSMS[] = [];

export const INITIAL_VOIP_CALLS: VoIPCallLog[] = [];

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [];

export const INITIAL_INTEGRATIONS: IntegrationConfig[] = [
  {
    id: 'gmail',
    name: 'Gmail Personal Email App',
    category: 'Personal Communication',
    enabled: true,
    description: 'Personal Gmail inbox and outbound communication tool. Connect your personal Google/Gmail account (@gmail.com) to compose messages, view client conversation history, and launch your Personal Gmail app directly.',
    lastSyncTime: 'Real-time'
  },
  {
    id: 'bridgeselect',
    name: 'CER BridgeSelect STC Portal',
    category: 'Regulatory & Rebates',
    enabled: true,
    description: 'Clean Energy Regulator STC small-scale technology certificate generation & verification.',
    lastSyncTime: 'Real-time'
  },
  {
    id: 'xero',
    name: 'Xero Cloud Accounting',
    category: 'Finance & Invoicing',
    enabled: true,
    description: 'Bi-directional invoice creation, milestone reconciliation, and contractor bill syncing.',
    lastSyncTime: '1 hour ago'
  },
  {
    id: 'opensolar',
    name: 'OpenSolar Design Platform',
    category: 'Solar Engineering',
    enabled: true,
    description: 'Automated 3D proposal design, system CAD layout, and contract PDF integration.',
    lastSyncTime: 'Real-time'
  },
  {
    id: 'messagemedia',
    name: 'MessageMedia SMS Gateway',
    category: 'Customer Communication',
    enabled: true,
    description: 'Automated 2-way Australian mobile SMS for site arrival notices and customer reminders.',
    lastSyncTime: 'Real-time'
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp Newsletter & EDM',
    category: 'Marketing Automation',
    enabled: true,
    description: 'Two-way email sync, automated solar seasonal maintenance tips and battery upgrade EDM campaigns.',
    lastSyncTime: 'Two-way Active'
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business API',
    category: 'Customer Communication',
    enabled: true,
    description: 'Meta Cloud API direct chat channel with homeowners for roof photo uploads and real-time support.',
    lastSyncTime: 'Real-time'
  },
  {
    id: 'voipline',
    name: 'VoIPLine Telecom AU',
    category: 'Telephony & PBX',
    enabled: true,
    description: 'Virtual cloud PBX click-to-call, customer caller ID lookup, and audio call recordings.',
    lastSyncTime: 'Real-time'
  },
  {
    id: 'messenger',
    name: 'Meta Ads & Messenger Lead Sync',
    category: 'Lead Generation',
    enabled: true,
    description: 'Instant ingestion of Facebook & Instagram solar battery rebate lead forms and Messenger chat.',
    lastSyncTime: 'Real-time'
  },
  {
    id: 'teams',
    name: 'Microsoft Teams Webhook',
    category: 'Internal Comms',
    enabled: true,
    description: 'Adaptive Card channel notifications for new closed sales deals, dispatch alerts, and escalations.',
    lastSyncTime: 'Real-time'
  }
];

export const INITIAL_REFERRAL_BONUSES: ReferralBonus[] = [];

export const INITIAL_SYSTEM_FEATURES: SystemFeatureConfig[] = [
  {
    id: 'dashboard',
    name: 'Executive Dashboard',
    description: 'Real-time solar pipeline metrics, revenue, conversion rates, and stage breakdowns.',
    category: 'Core CRM',
    enabled: true,
    showInSidebar: true,
    order: 1
  },
  {
    id: 'contacts',
    name: 'Contacts & Multi-Property',
    description: 'Residential & commercial customer management with multi-site address tracking.',
    category: 'Core CRM',
    enabled: true,
    showInSidebar: true,
    order: 2
  },
  {
    id: 'companies',
    name: 'Companies & Suppliers',
    description: 'Commercial solar accounts, equipment distributors, and electrical subcontractors.',
    category: 'Core CRM',
    enabled: true,
    showInSidebar: true,
    order: 3
  },
  {
    id: 'leads',
    name: 'Leads (Meta Ads)',
    description: 'Meta Facebook/Instagram lead capture, phase validation, and 1-click project conversion.',
    category: 'Core CRM',
    enabled: true,
    showInSidebar: true,
    order: 4
  },
  {
    id: 'projects',
    name: 'Solar Projects',
    description: 'Full 10-stage Australian project delivery: Site Survey, DNSP Approval, STC lodgement, and commissioning.',
    category: 'Operations & Field',
    enabled: true,
    showInSidebar: true,
    order: 5
  },
  {
    id: 'tickets',
    name: 'Support & Warranty Tickets',
    description: 'Post-install service requests, inverter fault codes, switchboard trips, and technician scheduling.',
    category: 'Operations & Field',
    enabled: true,
    showInSidebar: true,
    order: 6
  },
  {
    id: 'referrals',
    name: 'Referral Bonus Program',
    description: 'Customer referral reward vouchers, banking EFT payments, and proof attachment compliance.',
    category: 'Core CRM',
    enabled: true,
    showInSidebar: true,
    order: 7
  },
  {
    id: 'maintenance',
    name: '2-Year Periodic Maintenance',
    description: 'Automated 24-month CEC safety inspection cycles, notification triggers, and safety reports.',
    category: 'Operations & Field',
    enabled: true,
    showInSidebar: true,
    order: 8
  },
  {
    id: 'subcontractors',
    name: 'Subcontractor Installers',
    description: 'Accredited CEC electrician roster, insurance expiry audits, and metro service coverage.',
    category: 'Operations & Field',
    enabled: true,
    showInSidebar: true,
    order: 9
  },
  {
    id: 'sales-orders',
    name: 'Sales Orders & Warehouse',
    description: 'Equipment bill of materials (BOM), warehouse inventory picking, and dispatch notes.',
    category: 'Supply Chain',
    enabled: true,
    showInSidebar: true,
    order: 10
  },
  {
    id: 'install-orders',
    name: 'Install Orders (RFQs)',
    description: 'Tendering installation labor to CEC accredited subcontractors, quote reviews, and award workflow.',
    category: 'Supply Chain',
    enabled: true,
    showInSidebar: true,
    order: 11
  },
  {
    id: 'pl-statement',
    name: 'P&L Statement & Financials',
    description: 'Project-level profit & loss, gross margin calculation, equipment vs labor costs, and STC cashflow.',
    category: 'Finance & HR',
    enabled: true,
    showInSidebar: true,
    order: 12
  },
  {
    id: 'hrms',
    name: 'HRMS & Staff Roster',
    description: 'Internal employees, department allocation, leave requests approval, and VoIP extension binding.',
    category: 'Finance & HR',
    enabled: true,
    showInSidebar: true,
    order: 13
  },
  {
    id: 'integrations',
    name: 'Integrations Hub',
    description: 'Active external connectors: VoIPLine Telecom, MessageMedia SMS, Meta Ads Lead Sync, BridgeSelect STC, OpenSolar, Xero, and Microsoft Teams.',
    category: 'Communications & Tools',
    enabled: true,
    showInSidebar: true,
    order: 14
  },
  {
    id: 'company-profile',
    name: 'Company Profile & Branding',
    description: 'Corporate ABN, legal details, CEC retailer credential, dynamic logos, and portal theme customization.',
    category: 'Communications & Tools',
    enabled: true,
    showInSidebar: true,
    order: 15
  },
  {
    id: 'settings',
    name: 'Settings & Administration',
    description: 'Dynamic feature flags, dynamic roles & access control, user accounts, hardware dropdowns, and security.',
    category: 'Communications & Tools',
    enabled: true,
    showInSidebar: true,
    order: 16
  },
  {
    id: 'customer-portal',
    name: 'Customer Self-Service Portal',
    description: 'Branded portal for homeowners to track solar install, download proposals, and review tickets.',
    category: 'Portals & Customer',
    enabled: true,
    showInSidebar: false,
    order: 17
  },
  {
    id: 'installer-portal',
    name: 'Subcontractor Installer Portal',
    description: 'Mobile-friendly portal for CEC installers to view work orders, submit RFQ bids, and upload photos.',
    category: 'Portals & Customer',
    enabled: true,
    showInSidebar: false,
    order: 18
  },
  {
    id: 'voip-telephony',
    name: 'VoIPLine Softphone Dialer',
    description: 'In-app virtual phone dialer with Australian geographic caller ID (+61 2 / +61 7) and call logging.',
    category: 'Communications & Tools',
    enabled: true,
    showInSidebar: false,
    order: 19
  },
  {
    id: 'sinch-sms',
    name: 'Sinch / MessageMedia 2-Way SMS',
    description: 'Two-way SMS text messaging with Australian mobile numbers and appointment notifications.',
    category: 'Communications & Tools',
    enabled: true,
    showInSidebar: false,
    order: 20
  },
  {
    id: 'meta-sync',
    name: 'Meta Ads Google Sheet Ingestion',
    description: 'Live sync tool for ingesting leads from Google Sheets and Meta Webhooks.',
    category: 'Communications & Tools',
    enabled: true,
    showInSidebar: false,
    order: 21
  },
  {
    id: 'stc-calculator',
    name: 'BridgeSelect STC Engine',
    description: 'Automated Australian Clean Energy Regulator STC rebate calculation and compliance engine.',
    category: 'Operations & Field',
    enabled: true,
    showInSidebar: false,
    order: 22
  }
];

export const INITIAL_DYNAMIC_ROLES: DynamicRoleConfig[] = [
  {
    id: 'admin',
    role: 'admin',
    roleName: 'System Administrator',
    description: 'Full unconstrained authority across all ERP capabilities, financials, user accounts, and system configuration.',
    badgeColor: 'purple',
    isSystem: true,
    portalTarget: 'erp',
    permissions: {
      dashboard: { view: true, create: true, edit: true, delete: true, export: true },
      contacts: { view: true, create: true, edit: true, delete: true, export: true },
      companies: { view: true, create: true, edit: true, delete: true, export: true },
      leads: { view: true, create: true, edit: true, delete: true, export: true },
      projects: { view: true, create: true, edit: true, delete: true, export: true },
      tickets: { view: true, create: true, edit: true, delete: true, export: true },
      referrals: { view: true, create: true, edit: true, delete: true, export: true },
      maintenance: { view: true, create: true, edit: true, delete: true, export: true },
      subcontractors: { view: true, create: true, edit: true, delete: true, export: true },
      'sales-orders': { view: true, create: true, edit: true, delete: true, export: true },
      'install-orders': { view: true, create: true, edit: true, delete: true, export: true },
      'pl-statement': { view: true, create: true, edit: true, delete: true, export: true },
      hrms: { view: true, create: true, edit: true, delete: true, export: true },
      integrations: { view: true, create: true, edit: true, delete: true, export: true },
      'company-profile': { view: true, create: true, edit: true, delete: true, export: true },
      settings: { view: true, create: true, edit: true, delete: true, export: true },
      'customer-portal': { view: true, create: true, edit: true, delete: true, export: true },
      'installer-portal': { view: true, create: true, edit: true, delete: true, export: true },
      'voip-telephony': { view: true, create: true, edit: true, delete: true, export: true },
      'sinch-sms': { view: true, create: true, edit: true, delete: true, export: true },
      'meta-sync': { view: true, create: true, edit: true, delete: true, export: true },
      'stc-calculator': { view: true, create: true, edit: true, delete: true, export: true }
    },
    specialActions: {
      canManageSettings: true,
      canManageUsers: true,
      canManageRoles: true,
      canUseVoip: true,
      canSendSms: true,
      canSyncMetaSheet: true,
      canApproveSTC: true,
      canAccessCustomerPortal: true,
      canAccessInstallerPortal: true
    }
  },
  {
    id: 'manager',
    role: 'manager',
    roleName: 'Operations & Sales Manager',
    description: 'High-level operational oversight: pipeline management, RFQ awards, installer dispatch, and team supervision.',
    badgeColor: 'blue',
    isSystem: true,
    portalTarget: 'erp',
    permissions: {
      dashboard: { view: true, create: true, edit: true, delete: false, export: true },
      contacts: { view: true, create: true, edit: true, delete: false, export: true },
      companies: { view: true, create: true, edit: true, delete: false, export: true },
      leads: { view: true, create: true, edit: true, delete: false, export: true },
      projects: { view: true, create: true, edit: true, delete: false, export: true },
      tickets: { view: true, create: true, edit: true, delete: false, export: true },
      referrals: { view: true, create: true, edit: true, delete: false, export: true },
      maintenance: { view: true, create: true, edit: true, delete: false, export: true },
      subcontractors: { view: true, create: true, edit: true, delete: false, export: true },
      'sales-orders': { view: true, create: true, edit: true, delete: false, export: true },
      'install-orders': { view: true, create: true, edit: true, delete: false, export: true },
      'pl-statement': { view: true, create: false, edit: false, delete: false, export: true },
      hrms: { view: true, create: true, edit: true, delete: false, export: true },
      integrations: { view: true, create: false, edit: false, delete: false, export: false },
      'company-profile': { view: true, create: false, edit: true, delete: false, export: false },
      settings: { view: true, create: false, edit: false, delete: false, export: false },
      'customer-portal': { view: true, create: true, edit: true, delete: false, export: true },
      'installer-portal': { view: true, create: true, edit: true, delete: false, export: true },
      'voip-telephony': { view: true, create: true, edit: true, delete: false, export: true },
      'sinch-sms': { view: true, create: true, edit: true, delete: false, export: true },
      'meta-sync': { view: true, create: true, edit: true, delete: false, export: true },
      'stc-calculator': { view: true, create: true, edit: true, delete: false, export: true }
    },
    specialActions: {
      canManageSettings: false,
      canManageUsers: true,
      canManageRoles: false,
      canUseVoip: true,
      canSendSms: true,
      canSyncMetaSheet: true,
      canApproveSTC: true,
      canAccessCustomerPortal: true,
      canAccessInstallerPortal: true
    }
  },
  {
    id: 'employee',
    role: 'employee',
    roleName: 'Sales & Field Representative',
    description: 'Frontline sales representative: prospecting leads, logging calls, scheduling site surveys, and updating notes.',
    badgeColor: 'lime',
    isSystem: true,
    portalTarget: 'erp',
    permissions: {
      dashboard: { view: true, create: false, edit: false, delete: false, export: false },
      contacts: { view: true, create: true, edit: true, delete: false, export: false },
      companies: { view: true, create: false, edit: false, delete: false, export: false },
      leads: { view: true, create: true, edit: true, delete: false, export: false },
      projects: { view: true, create: false, edit: true, delete: false, export: false },
      tickets: { view: true, create: true, edit: true, delete: false, export: false },
      referrals: { view: true, create: true, edit: false, delete: false, export: false },
      maintenance: { view: true, create: false, edit: false, delete: false, export: false },
      subcontractors: { view: false, create: false, edit: false, delete: false, export: false },
      'sales-orders': { view: false, create: false, edit: false, delete: false, export: false },
      'install-orders': { view: false, create: false, edit: false, delete: false, export: false },
      'pl-statement': { view: false, create: false, edit: false, delete: false, export: false },
      hrms: { view: true, create: true, edit: false, delete: false, export: false },
      integrations: { view: false, create: false, edit: false, delete: false, export: false },
      'company-profile': { view: false, create: false, edit: false, delete: false, export: false },
      settings: { view: false, create: false, edit: false, delete: false, export: false },
      'customer-portal': { view: false, create: false, edit: false, delete: false, export: false },
      'installer-portal': { view: false, create: false, edit: false, delete: false, export: false },
      'voip-telephony': { view: true, create: true, edit: true, delete: false, export: false },
      'sinch-sms': { view: true, create: true, edit: true, delete: false, export: false },
      'meta-sync': { view: false, create: false, edit: false, delete: false, export: false },
      'stc-calculator': { view: true, create: false, edit: false, delete: false, export: false }
    },
    specialActions: {
      canManageSettings: false,
      canManageUsers: false,
      canManageRoles: false,
      canUseVoip: true,
      canSendSms: true,
      canSyncMetaSheet: false,
      canApproveSTC: false,
      canAccessCustomerPortal: false,
      canAccessInstallerPortal: false
    }
  },
  {
    id: 'solar-designer',
    role: 'solar-designer',
    roleName: 'Solar & Electrical Designer',
    description: 'Engineering specialist responsible for SLDs, OpenSolar 3D roof layouts, DNSP network applications, and system sizing.',
    badgeColor: 'cyan',
    isSystem: false,
    portalTarget: 'erp',
    permissions: {
      dashboard: { view: true, create: false, edit: false, delete: false, export: false },
      contacts: { view: true, create: false, edit: false, delete: false, export: false },
      companies: { view: true, create: false, edit: false, delete: false, export: false },
      leads: { view: true, create: false, edit: true, delete: false, export: false },
      projects: { view: true, create: true, edit: true, delete: false, export: true },
      tickets: { view: true, create: false, edit: true, delete: false, export: false },
      referrals: { view: false, create: false, edit: false, delete: false, export: false },
      maintenance: { view: true, create: false, edit: true, delete: false, export: false },
      subcontractors: { view: true, create: false, edit: false, delete: false, export: false },
      'sales-orders': { view: true, create: true, edit: true, delete: false, export: false },
      'install-orders': { view: true, create: true, edit: true, delete: false, export: false },
      'pl-statement': { view: false, create: false, edit: false, delete: false, export: false },
      hrms: { view: true, create: false, edit: false, delete: false, export: false },
      integrations: { view: true, create: false, edit: false, delete: false, export: false },
      'company-profile': { view: false, create: false, edit: false, delete: false, export: false },
      settings: { view: false, create: false, edit: false, delete: false, export: false },
      'customer-portal': { view: true, create: false, edit: false, delete: false, export: false },
      'installer-portal': { view: true, create: false, edit: false, delete: false, export: false },
      'voip-telephony': { view: true, create: true, edit: true, delete: false, export: false },
      'sinch-sms': { view: true, create: true, edit: true, delete: false, export: false },
      'meta-sync': { view: false, create: false, edit: false, delete: false, export: false },
      'stc-calculator': { view: true, create: true, edit: true, delete: false, export: true }
    },
    specialActions: {
      canManageSettings: false,
      canManageUsers: false,
      canManageRoles: false,
      canUseVoip: true,
      canSendSms: true,
      canSyncMetaSheet: false,
      canApproveSTC: true,
      canAccessCustomerPortal: true,
      canAccessInstallerPortal: true
    }
  },
  {
    id: 'customer',
    role: 'customer',
    roleName: 'Customer (Self-Service Portal)',
    description: 'Residential or commercial client tracking live installation status, accessing invoices, and submitting warranty tickets.',
    badgeColor: 'amber',
    isSystem: true,
    portalTarget: 'customer',
    permissions: {
      dashboard: { view: false, create: false, edit: false, delete: false, export: false },
      contacts: { view: false, create: false, edit: false, delete: false, export: false },
      companies: { view: false, create: false, edit: false, delete: false, export: false },
      leads: { view: false, create: false, edit: false, delete: false, export: false },
      projects: { view: true, create: false, edit: false, delete: false, export: false },
      tickets: { view: true, create: true, edit: false, delete: false, export: false },
      referrals: { view: true, create: true, edit: false, delete: false, export: false },
      maintenance: { view: false, create: false, edit: false, delete: false, export: false },
      subcontractors: { view: false, create: false, edit: false, delete: false, export: false },
      'sales-orders': { view: false, create: false, edit: false, delete: false, export: false },
      'install-orders': { view: false, create: false, edit: false, delete: false, export: false },
      'pl-statement': { view: false, create: false, edit: false, delete: false, export: false },
      hrms: { view: false, create: false, edit: false, delete: false, export: false },
      integrations: { view: false, create: false, edit: false, delete: false, export: false },
      'company-profile': { view: false, create: false, edit: false, delete: false, export: false },
      settings: { view: false, create: false, edit: false, delete: false, export: false },
      'customer-portal': { view: true, create: true, edit: true, delete: false, export: true },
      'installer-portal': { view: false, create: false, edit: false, delete: false, export: false },
      'voip-telephony': { view: false, create: false, edit: false, delete: false, export: false },
      'sinch-sms': { view: false, create: false, edit: false, delete: false, export: false },
      'meta-sync': { view: false, create: false, edit: false, delete: false, export: false },
      'stc-calculator': { view: false, create: false, edit: false, delete: false, export: false }
    },
    specialActions: {
      canManageSettings: false,
      canManageUsers: false,
      canManageRoles: false,
      canUseVoip: false,
      canSendSms: false,
      canSyncMetaSheet: false,
      canApproveSTC: false,
      canAccessCustomerPortal: true,
      canAccessInstallerPortal: false
    }
  },
  {
    id: 'installer',
    role: 'installer',
    roleName: 'Subcontractor Installer Portal',
    description: 'CEC accredited electrician crew access: review assigned RFQs, submit quotes, and upload commissioning photo evidence.',
    badgeColor: 'emerald',
    isSystem: true,
    portalTarget: 'installer',
    permissions: {
      dashboard: { view: false, create: false, edit: false, delete: false, export: false },
      contacts: { view: false, create: false, edit: false, delete: false, export: false },
      companies: { view: false, create: false, edit: false, delete: false, export: false },
      leads: { view: false, create: false, edit: false, delete: false, export: false },
      projects: { view: true, create: false, edit: true, delete: false, export: false },
      tickets: { view: false, create: false, edit: false, delete: false, export: false },
      referrals: { view: false, create: false, edit: false, delete: false, export: false },
      maintenance: { view: false, create: false, edit: false, delete: false, export: false },
      subcontractors: { view: false, create: false, edit: false, delete: false, export: false },
      'sales-orders': { view: false, create: false, edit: false, delete: false, export: false },
      'install-orders': { view: true, create: false, edit: true, delete: false, export: false },
      'pl-statement': { view: false, create: false, edit: false, delete: false, export: false },
      hrms: { view: false, create: false, edit: false, delete: false, export: false },
      integrations: { view: false, create: false, edit: false, delete: false, export: false },
      'company-profile': { view: false, create: false, edit: false, delete: false, export: false },
      settings: { view: false, create: false, edit: false, delete: false, export: false },
      'customer-portal': { view: false, create: false, edit: false, delete: false, export: false },
      'installer-portal': { view: true, create: true, edit: true, delete: false, export: true },
      'voip-telephony': { view: false, create: false, edit: false, delete: false, export: false },
      'sinch-sms': { view: false, create: false, edit: false, delete: false, export: false },
      'meta-sync': { view: false, create: false, edit: false, delete: false, export: false },
      'stc-calculator': { view: false, create: false, edit: false, delete: false, export: false }
    },
    specialActions: {
      canManageSettings: false,
      canManageUsers: false,
      canManageRoles: false,
      canUseVoip: false,
      canSendSms: false,
      canSyncMetaSheet: false,
      canApproveSTC: false,
      canAccessCustomerPortal: false,
      canAccessInstallerPortal: true
    }
  }
];

export const INITIAL_SYSTEM_RULES: SystemOperationalRules = {
  stcTradingRateAud: 39.50,
  customerStcRateAud: 36.00, // Customer STC rate shown to customer on quotes/invoices
  internalStcRateAud: 39.50, // Internal STC rate used for CER/BridgeSelect profit calculation
  defaultWarrantyYearsPanels: 25,
  defaultWarrantyYearsInverter: 10,
  defaultWarrantyYearsBattery: 10,
  referralBonusDefaultAud: 500,
  maintenanceIntervalMonths: 24,
  requireReferralReceiptProof: true,
  enableAutoDnspValidation: true,
  enableAutoStcCalculation: true,
  defaultState: 'NSW',
  emergencyContactPhone: '1300 852 400',
  openSolarSyncIntervalMinutes: 15
};



