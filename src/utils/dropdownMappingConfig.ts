export interface DropdownFieldDefinition {
  fieldKey: string;
  fieldLabel: string;
  sectionId: string;
  sectionLabel: string;
  sectionNumber?: number | string;
  defaultCategoryKey: string;
  description?: string;
}

export interface SectionDefinition {
  sectionId: string;
  sectionLabel: string;
  group: 'Projects' | 'Leads' | 'Tickets' | 'Referrals' | 'Directory & Users';
  badgeColor?: string;
}

export const ALL_SECTIONS: SectionDefinition[] = [
  { sectionId: 'projects_overview', sectionLabel: 'Projects: Overview & Pipeline', group: 'Projects', badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { sectionId: 'projects_sec1', sectionLabel: 'Projects: Section 1 - Customer & Site Details', group: 'Projects', badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { sectionId: 'projects_sec2', sectionLabel: 'Projects: Section 2 - Hardware & Specifications', group: 'Projects', badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { sectionId: 'projects_sec3', sectionLabel: 'Projects: Section 3 - DNSP & Grid Connection', group: 'Projects', badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { sectionId: 'projects_sec4', sectionLabel: 'Projects: Section 4 - EB Checklist Audit', group: 'Projects', badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  { sectionId: 'projects_sec5', sectionLabel: 'Projects: Section 5 - Installation & Logistics', group: 'Projects', badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  { sectionId: 'projects_sec6', sectionLabel: 'Projects: Section 6 - STC Certificates & Trading', group: 'Projects', badgeColor: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  { sectionId: 'projects_sec7', sectionLabel: 'Projects: Section 7 - Finance & Settlement', group: 'Projects', badgeColor: 'bg-green-500/10 text-green-400 border-green-500/20' },
  { sectionId: 'leads_details', sectionLabel: 'Leads: Intake, Qualification & Details', group: 'Leads', badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  { sectionId: 'tickets_support', sectionLabel: 'Tickets: Support, Warranty & Post-Install', group: 'Tickets', badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  { sectionId: 'referrals_view', sectionLabel: 'Referral Bonus Payouts & Tracking', group: 'Referrals', badgeColor: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  { sectionId: 'contacts_directory', sectionLabel: 'Directory: Contacts, Companies & Staff', group: 'Directory & Users', badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' }
];

export const ALL_DROPDOWN_FIELDS: DropdownFieldDefinition[] = [
  // Projects - Overview
  {
    fieldKey: 'projects_projectStatus',
    fieldLabel: 'Project Status',
    sectionId: 'projects_overview',
    sectionLabel: 'Projects: Overview & Pipeline',
    defaultCategoryKey: 'projectStatuses',
    description: 'Overall project lifecycle status (Active, In Progress, On Hold, Cancelled, Closed, Completed).'
  },
  {
    fieldKey: 'projects_pipelineStage',
    fieldLabel: 'Project Stage/ Installation Status',
    sectionId: 'projects_overview',
    sectionLabel: 'Projects: Overview & Pipeline',
    defaultCategoryKey: 'projectStages',
    description: 'Pipeline stage & installation milestone for project workflow Kanban / table columns.'
  },

  // Projects - Section 1: Customer & Site Details
  {
    fieldKey: 'projects_salesPersonName',
    fieldLabel: 'Sales Person Name',
    sectionId: 'projects_sec1',
    sectionLabel: 'Projects: Section 1 - Customer & Site Details',
    sectionNumber: 1,
    defaultCategoryKey: 'salesPersons',
    description: 'Sales representative and closer assigned to this solar job.'
  },
  {
    fieldKey: 'projects_state',
    fieldLabel: 'State / Territory',
    sectionId: 'projects_sec1',
    sectionLabel: 'Projects: Section 1 - Customer & Site Details',
    sectionNumber: 1,
    defaultCategoryKey: 'states',
    description: 'Australian State (NSW, QLD, VIC, WA, SA, TAS, ACT, NT).'
  },
  {
    fieldKey: 'projects_area',
    fieldLabel: 'Area / Region',
    sectionId: 'projects_sec1',
    sectionLabel: 'Projects: Section 1 - Customer & Site Details',
    sectionNumber: 1,
    defaultCategoryKey: 'areas',
    description: 'Geographical classification (Metro, Regional, Rural, Remote).'
  },

  // Projects - Section 2: Technical Specifications & Hardware
  {
    fieldKey: 'projects_panelBrand',
    fieldLabel: 'Panel Manufacturer (CEC Approved)',
    sectionId: 'projects_sec2',
    sectionLabel: 'Projects: Section 2 - Hardware & Specifications',
    sectionNumber: 2,
    defaultCategoryKey: 'panelBrands',
    description: 'Solar PV panel brand options.'
  },
  {
    fieldKey: 'projects_inverterBrand',
    fieldLabel: 'Inverter Manufacturer',
    sectionId: 'projects_sec2',
    sectionLabel: 'Projects: Section 2 - Hardware & Specifications',
    sectionNumber: 2,
    defaultCategoryKey: 'inverterBrands',
    description: 'Solar inverter brand options.'
  },
  {
    fieldKey: 'projects_batteryBrand',
    fieldLabel: 'Battery Storage Manufacturer',
    sectionId: 'projects_sec2',
    sectionLabel: 'Projects: Section 2 - Hardware & Specifications',
    sectionNumber: 2,
    defaultCategoryKey: 'batteryBrands',
    description: 'Home battery storage brand options.'
  },
  {
    fieldKey: 'projects_roofType',
    fieldLabel: 'Roof Type / Profile',
    sectionId: 'projects_sec2',
    sectionLabel: 'Projects: Section 2 - Hardware & Specifications',
    sectionNumber: 2,
    defaultCategoryKey: 'roofTypes',
    description: 'Roof construction profile (Colorbond, Concrete Tile, Terracotta, Klip-Lok, etc.).'
  },
  {
    fieldKey: 'projects_houseStorey',
    fieldLabel: 'House Storey',
    sectionId: 'projects_sec2',
    sectionLabel: 'Projects: Section 2 - Hardware & Specifications',
    sectionNumber: 2,
    defaultCategoryKey: 'houseStoreys',
    description: 'Storey levels (Single Storey, Double Storey, Triple Storey, Split Level).'
  },
  {
    fieldKey: 'projects_electricalPhase',
    fieldLabel: 'Electrical Grid Phase',
    sectionId: 'projects_sec2',
    sectionLabel: 'Projects: Section 2 - Hardware & Specifications',
    sectionNumber: 2,
    defaultCategoryKey: 'phases',
    description: 'Grid connection supply phase (Single Phase, Three Phase, Split Phase).'
  },
  {
    fieldKey: 'projects_docsReceived',
    fieldLabel: 'Documentation Received Status',
    sectionId: 'projects_sec2',
    sectionLabel: 'Projects: Section 2 - Hardware & Specifications',
    sectionNumber: 2,
    defaultCategoryKey: 'docsReceivedOptions',
    description: 'Status of paperwork and approvals received.'
  },

  // Projects - Section 3: Electricity Distributor & Grid
  {
    fieldKey: 'projects_electricityDistributor',
    fieldLabel: 'Electricity Distributor (DNSP)',
    sectionId: 'projects_sec3',
    sectionLabel: 'Projects: Section 3 - DNSP & Grid Connection',
    sectionNumber: 3,
    defaultCategoryKey: 'electricityDistributors',
    description: 'Distribution network service providers (Ausgrid, Endeavour, Energex, Ergon, Essential, etc.).'
  },
  {
    fieldKey: 'projects_energyRetailer',
    fieldLabel: 'Energy Retailer',
    sectionId: 'projects_sec3',
    sectionLabel: 'Projects: Section 3 - DNSP & Grid Connection',
    sectionNumber: 3,
    defaultCategoryKey: 'energyRetailers',
    description: 'Customer electricity retail billing company.'
  },
  {
    fieldKey: 'projects_gridAppStatus',
    fieldLabel: 'Grid Application Status',
    sectionId: 'projects_sec3',
    sectionLabel: 'Projects: Section 3 - DNSP & Grid Connection',
    sectionNumber: 3,
    defaultCategoryKey: 'gridApplicationStatuses',
    description: 'Network pre-approval application tracking status.'
  },

  // Projects - Section 4: EB Checklist Audit
  {
    fieldKey: 'projects_q1CustomerNameMatch',
    fieldLabel: 'Q1: Customer Name on EB Match',
    sectionId: 'projects_sec4',
    sectionLabel: 'Projects: Section 4 - EB Checklist Audit',
    sectionNumber: 4,
    defaultCategoryKey: 'ebCustomerNameMatchOptions',
    description: 'Verification of customer name on electricity bill against solar contract.'
  },
  {
    fieldKey: 'projects_q2AddressMatch',
    fieldLabel: 'Q2: Property Address on EB Match',
    sectionId: 'projects_sec4',
    sectionLabel: 'Projects: Section 4 - EB Checklist Audit',
    sectionNumber: 4,
    defaultCategoryKey: 'ebAddressMatchOptions',
    description: 'Verification of installation address on electricity bill against site address.'
  },
  {
    fieldKey: 'projects_q3MeterMatch',
    fieldLabel: 'Q3: Meter Serial Number Match',
    sectionId: 'projects_sec4',
    sectionLabel: 'Projects: Section 4 - EB Checklist Audit',
    sectionNumber: 4,
    defaultCategoryKey: 'ebMeterMatchOptions',
    description: 'Verification of meter serial on bill vs physical switchboard photo.'
  },
  {
    fieldKey: 'projects_q4MeterPhase',
    fieldLabel: 'Q4: Supply Phase Confirmed',
    sectionId: 'projects_sec4',
    sectionLabel: 'Projects: Section 4 - EB Checklist Audit',
    sectionNumber: 4,
    defaultCategoryKey: 'ebMeterPhaseOptions',
    description: 'Confirmation of single vs three phase electrical supply.'
  },
  {
    fieldKey: 'projects_q5OpenSolarSystemMatch',
    fieldLabel: 'Q5: OpenSolar Hardware Design Match',
    sectionId: 'projects_sec4',
    sectionLabel: 'Projects: Section 4 - EB Checklist Audit',
    sectionNumber: 4,
    defaultCategoryKey: 'ebOpenSolarSystemMatchOptions',
    description: 'Audit confirming OpenSolar proposal system matches executed contract.'
  },
  {
    fieldKey: 'projects_q6OpenSolarPricingMatch',
    fieldLabel: 'Q6: OpenSolar Pricing & STC Match',
    sectionId: 'projects_sec4',
    sectionLabel: 'Projects: Section 4 - EB Checklist Audit',
    sectionNumber: 4,
    defaultCategoryKey: 'ebOpenSolarPricingMatchOptions',
    description: 'Audit confirming contract price, discount, and STC calculations reconcile.'
  },

  // Projects - Section 5: Installation & Logistics
  {
    fieldKey: 'projects_installationStatus',
    fieldLabel: 'Project Stage/ Installation Status',
    sectionId: 'projects_sec5',
    sectionLabel: 'Projects: Section 5 - Installation & Logistics',
    sectionNumber: 5,
    defaultCategoryKey: 'projectStages',
    description: 'Installation progress milestone (Site Survey, Install Scheduled, In Progress, Completed, etc.).'
  },
  {
    fieldKey: 'projects_installationBookedBy',
    fieldLabel: 'Booked By (Coordinator)',
    sectionId: 'projects_sec5',
    sectionLabel: 'Projects: Section 5 - Installation & Logistics',
    sectionNumber: 5,
    defaultCategoryKey: 'installationBookedByOptions',
    description: 'Operations manager or coordinator who scheduled the installation.'
  },
  {
    fieldKey: 'projects_installationDocsStatus',
    fieldLabel: 'Installation Docs Status',
    sectionId: 'projects_sec5',
    sectionLabel: 'Projects: Section 5 - Installation & Logistics',
    sectionNumber: 5,
    defaultCategoryKey: 'installationDocsStatuses',
    description: 'Compliance document package review status (CES, CoC, SAA, Photos).'
  },
  {
    fieldKey: 'projects_installerName',
    fieldLabel: 'Installer Name (CEC Subcontractor)',
    sectionId: 'projects_sec5',
    sectionLabel: 'Projects: Section 5 - Installation & Logistics',
    sectionNumber: 5,
    defaultCategoryKey: 'installers',
    description: 'Accredited Clean Energy Council solar installer team.'
  },
  {
    fieldKey: 'projects_installerInvoiceStatus',
    fieldLabel: 'Installer Invoice Status',
    sectionId: 'projects_sec5',
    sectionLabel: 'Projects: Section 5 - Installation & Logistics',
    sectionNumber: 5,
    defaultCategoryKey: 'installerInvoiceStatuses',
    description: 'Subcontractor installation payment/invoice approval status.'
  },
  {
    fieldKey: 'projects_warehouse',
    fieldLabel: 'Warehouse / Logistics Hub',
    sectionId: 'projects_sec5',
    sectionLabel: 'Projects: Section 5 - Installation & Logistics',
    sectionNumber: 5,
    defaultCategoryKey: 'warehouses',
    description: 'Fulfillment warehouse dispatching solar hardware and racking.'
  },
  {
    fieldKey: 'projects_warehouseInvoiceStatus',
    fieldLabel: 'Warehouse Invoice Status',
    sectionId: 'projects_sec5',
    sectionLabel: 'Projects: Section 5 - Installation & Logistics',
    sectionNumber: 5,
    defaultCategoryKey: 'warehouseInvoiceStatuses',
    description: 'Wholesaler / distributor equipment invoice status.'
  },
  {
    fieldKey: 'projects_stockStatus',
    fieldLabel: 'Stock & Warehouse Status',
    sectionId: 'projects_sec5',
    sectionLabel: 'Projects: Section 5 - Installation & Logistics',
    sectionNumber: 5,
    defaultCategoryKey: 'stockStatuses',
    description: 'Physical equipment inventory allocation status.'
  },

  // Projects - Section 6: STC & Environmental Certificates
  {
    fieldKey: 'projects_stcPortal',
    fieldLabel: 'STC Traded Portal',
    sectionId: 'projects_sec6',
    sectionLabel: 'Projects: Section 6 - STC Certificates & Trading',
    sectionNumber: 6,
    defaultCategoryKey: 'stcPortals',
    description: 'STC aggregator broker (BridgeSelect, Green Energy Trading, REC Registry).'
  },
  {
    fieldKey: 'projects_stcStatus',
    fieldLabel: 'STC Claim Status',
    sectionId: 'projects_sec6',
    sectionLabel: 'Projects: Section 6 - STC Certificates & Trading',
    sectionNumber: 6,
    defaultCategoryKey: 'stcStatuses',
    description: 'Clean Energy Regulator (CER) STC rebate submission status.'
  },

  // Projects - Section 7: Finance & Settlement
  {
    fieldKey: 'projects_isFinance',
    fieldLabel: 'Is on Finance',
    sectionId: 'projects_sec7',
    sectionLabel: 'Projects: Section 7 - Finance & Settlement',
    sectionNumber: 7,
    defaultCategoryKey: 'isFinanceOptions',
    description: 'Whether the project is financed or paid directly.'
  },
  {
    fieldKey: 'projects_financeCompany',
    fieldLabel: 'Finance Company Name',
    sectionId: 'projects_sec7',
    sectionLabel: 'Projects: Section 7 - Finance & Settlement',
    sectionNumber: 7,
    defaultCategoryKey: 'financeCompanies',
    description: 'Third-party green loan provider (Brighte, Plenti, Humm, Community First, etc.).'
  },
  {
    fieldKey: 'projects_financeStatus',
    fieldLabel: 'Finance Application Status',
    sectionId: 'projects_sec7',
    sectionLabel: 'Projects: Section 7 - Finance & Settlement',
    sectionNumber: 7,
    defaultCategoryKey: 'financeStatuses',
    description: 'Consumer finance approval and settlement milestone.'
  },

  // Leads Details
  {
    fieldKey: 'leads_platform',
    fieldLabel: 'Inbound Platform',
    sectionId: 'leads_details',
    sectionLabel: 'Leads: Intake, Qualification & Details',
    defaultCategoryKey: 'platforms',
    description: 'Advertising or inbound source platform (Meta, Google, Forms, Referral).'
  },
  {
    fieldKey: 'leads_salesPerson',
    fieldLabel: 'Sales Representative',
    sectionId: 'leads_details',
    sectionLabel: 'Leads: Intake, Qualification & Details',
    defaultCategoryKey: 'salesPersons',
    description: 'Assigned sales agent or closer.'
  },
  {
    fieldKey: 'leads_status',
    fieldLabel: 'Lead Pipeline Status',
    sectionId: 'leads_details',
    sectionLabel: 'Leads: Intake, Qualification & Details',
    defaultCategoryKey: 'leadStatuses',
    description: 'Lead pipeline qualification status.'
  },
  {
    fieldKey: 'leads_state',
    fieldLabel: 'State / Territory',
    sectionId: 'leads_details',
    sectionLabel: 'Leads: Intake, Qualification & Details',
    defaultCategoryKey: 'states',
    description: 'Customer location state.'
  },
  {
    fieldKey: 'leads_area',
    fieldLabel: 'Area / Region',
    sectionId: 'leads_details',
    sectionLabel: 'Leads: Intake, Qualification & Details',
    defaultCategoryKey: 'areas',
    description: 'Metro vs Regional classification.'
  },
  {
    fieldKey: 'leads_roofType',
    fieldLabel: 'Roof Type',
    sectionId: 'leads_details',
    sectionLabel: 'Leads: Intake, Qualification & Details',
    defaultCategoryKey: 'roofTypes',
    description: 'Lead property roof type.'
  },
  {
    fieldKey: 'leads_panelBrand',
    fieldLabel: 'Preferred Panel Brand',
    sectionId: 'leads_details',
    sectionLabel: 'Leads: Intake, Qualification & Details',
    defaultCategoryKey: 'panelBrands',
    description: 'Quoted panel brand for lead.'
  },
  {
    fieldKey: 'leads_inverterBrand',
    fieldLabel: 'Preferred Inverter Brand',
    sectionId: 'leads_details',
    sectionLabel: 'Leads: Intake, Qualification & Details',
    defaultCategoryKey: 'inverterBrands',
    description: 'Quoted inverter brand for lead.'
  },
  {
    fieldKey: 'leads_batteryBrand',
    fieldLabel: 'Preferred Battery Brand',
    sectionId: 'leads_details',
    sectionLabel: 'Leads: Intake, Qualification & Details',
    defaultCategoryKey: 'batteryBrands',
    description: 'Quoted battery storage brand for lead.'
  },
  {
    fieldKey: 'leads_source',
    fieldLabel: 'Lead Source Channel',
    sectionId: 'leads_details',
    sectionLabel: 'Leads: Intake, Qualification & Details',
    defaultCategoryKey: 'leadSources',
    description: 'Specific marketing campaign or partner source.'
  },

  // Tickets / Support
  {
    fieldKey: 'tickets_category',
    fieldLabel: 'Issue Category',
    sectionId: 'tickets_support',
    sectionLabel: 'Tickets: Support, Warranty & Post-Install',
    defaultCategoryKey: 'ticketCategories',
    description: 'Post-installation issue classification (Inverter Fault, Monitoring, Leak, etc.).'
  },
  {
    fieldKey: 'tickets_priority',
    fieldLabel: 'Priority Level',
    sectionId: 'tickets_support',
    sectionLabel: 'Tickets: Support, Warranty & Post-Install',
    defaultCategoryKey: 'ticketPriorities',
    description: 'Urgency tier (Low, Medium, High, Urgent).'
  },
  {
    fieldKey: 'tickets_issueRecorded',
    fieldLabel: 'Issue Recorded Options',
    sectionId: 'tickets_support',
    sectionLabel: 'Tickets: Support, Warranty & Post-Install',
    defaultCategoryKey: 'ticketIssueRecordedOptions',
    description: 'Initial customer intake diagnosis.'
  },
  {
    fieldKey: 'tickets_initialCheck',
    fieldLabel: 'Initial Check Options',
    sectionId: 'tickets_support',
    sectionLabel: 'Tickets: Support, Warranty & Post-Install',
    defaultCategoryKey: 'ticketInitialCheckOptions',
    description: 'Remote monitoring / portal diagnostic check.'
  },
  {
    fieldKey: 'tickets_workRequired',
    fieldLabel: 'Work Required Presets',
    sectionId: 'tickets_support',
    sectionLabel: 'Tickets: Support, Warranty & Post-Install',
    defaultCategoryKey: 'ticketWorkRequiredOptions',
    description: 'Service electrician action plan.'
  },
  {
    fieldKey: 'tickets_resolutionStatus',
    fieldLabel: 'Resolution Status',
    sectionId: 'tickets_support',
    sectionLabel: 'Tickets: Support, Warranty & Post-Install',
    defaultCategoryKey: 'ticketIssueResolutionStatuses',
    description: 'Overall ticket progression status.'
  },
  {
    fieldKey: 'tickets_warrantyStatus',
    fieldLabel: 'Warranty Claim Status',
    sectionId: 'tickets_support',
    sectionLabel: 'Tickets: Support, Warranty & Post-Install',
    defaultCategoryKey: 'ticketWarrantyClaimStatuses',
    description: 'Manufacturer warranty claim submission status.'
  },
  {
    fieldKey: 'tickets_warrantyInvoiceStatus',
    fieldLabel: 'Warranty Claim Invoice Status',
    sectionId: 'tickets_support',
    sectionLabel: 'Tickets: Support, Warranty & Post-Install',
    defaultCategoryKey: 'ticketWarrantyClaimInvoiceStatuses',
    description: 'Manufacturer labor reimbursement invoice status.'
  },

  // Referral Bonuses
  {
    fieldKey: 'referrals_paymentStatus',
    fieldLabel: 'Referral Bonus Payment Status',
    sectionId: 'referrals_view',
    sectionLabel: 'Referral Bonus Payouts & Tracking',
    defaultCategoryKey: 'referralPaymentStatuses',
    description: 'Payment status of referral fee (Pending, Approved, Paid, On Hold).'
  },
  {
    fieldKey: 'referrals_referralStatus',
    fieldLabel: 'Referral Stage/ Installation Status',
    sectionId: 'referrals_view',
    sectionLabel: 'Referral Bonus Payouts & Tracking',
    defaultCategoryKey: 'projectStages',
    description: 'Synchronized project installation stage for referral eligibility.'
  },

  // Directory & Users
  {
    fieldKey: 'contacts_contactType',
    fieldLabel: 'Contact Classification',
    sectionId: 'contacts_directory',
    sectionLabel: 'Directory: Contacts, Companies & Staff',
    defaultCategoryKey: 'contactTypes',
    description: 'Contact categorization (Residential, Commercial, Subcontractor, etc.).'
  },
  {
    fieldKey: 'contacts_companyType',
    fieldLabel: 'Company Classification',
    sectionId: 'contacts_directory',
    sectionLabel: 'Directory: Contacts, Companies & Staff',
    defaultCategoryKey: 'companyTypes',
    description: 'Company entity categorization.'
  },
  {
    fieldKey: 'users_department',
    fieldLabel: 'Staff Department',
    sectionId: 'contacts_directory',
    sectionLabel: 'Directory: Contacts, Companies & Staff',
    defaultCategoryKey: 'employeeDepartments',
    description: 'Internal team department assignment.'
  }
];

export const DEFAULT_DROPDOWN_MAPPINGS: Record<string, string> = ALL_DROPDOWN_FIELDS.reduce(
  (acc, item) => {
    acc[item.fieldKey] = item.defaultCategoryKey;
    return acc;
  },
  {} as Record<string, string>
);

export function getFieldsForSection(sectionId: string): DropdownFieldDefinition[] {
  return ALL_DROPDOWN_FIELDS.filter(f => f.sectionId === sectionId);
}

export function getFieldDefinition(fieldKey: string): DropdownFieldDefinition | undefined {
  return ALL_DROPDOWN_FIELDS.find(f => f.fieldKey === fieldKey);
}
