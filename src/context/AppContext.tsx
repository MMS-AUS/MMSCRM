import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserProfile,
  UserRole,
  Contact,
  Company,
  Lead,
  Project,
  ProjectStatus,
  Ticket,
  MaintenanceRecord,
  SubContractor,
  SalesOrder,
  InstallOrder,
  CustomerReview,
  MessageMediaSMS,
  VoIPCallLog,
  DynamicDropdownConfig,
  ProjectPL,
  LeaveRequest,
  IntegrationConfig,
  DropdownCategoryConfig,
  TicketStatus,
  ContactAddress,
  ReferralBonus,
  ReferralAttachment,
  CompanyProfile,
  AppNotification,
  RoleAccessConfig,
  SystemFeatureConfig,
  DynamicRoleConfig,
  DynamicRoleSpecialActions,
  FeaturePermission,
  SystemOperationalRules,
  PortalAddressConfig,
  SystemPortalAddresses,
  PanelHierarchyItem,
  InverterHierarchyItem,
  BatteryHierarchyItem,
  LeadAttachment,
  CustomerPortalCredentials,
  XeroPaymentReceipt,
  XeroInvoice,
  LeadActivity,
  ViewMode
} from '../types';
import {
  getXeroPaymentReceipts,
  generateXeroInvoiceForLead,
  generateXeroReceiptForLead
} from '../services/xeroService';
import { applyDropdownImport, DropdownImportSummary } from '../services/dropdownExcelService';
import {
  sendOutboundSms,
  fetchSmsLogs
} from '../services/messageMediaService';
import {
  INITIAL_DROPDOWNS,
  INITIAL_USERS,
  INITIAL_CONNECTED_DOMAINS,
  INITIAL_PORTAL_ADDRESSES,
  INITIAL_COMPANIES,
  INITIAL_CONTACTS,
  INITIAL_LEADS,
  INITIAL_SUBCONTRACTORS,
  INITIAL_PROJECTS,
  INITIAL_TICKETS,
  INITIAL_MAINTENANCE,
  INITIAL_SALES_ORDERS,
  INITIAL_INSTALL_ORDERS,
  INITIAL_REVIEWS,
  INITIAL_SMS_MESSAGES,
  INITIAL_VOIP_CALLS,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_INTEGRATIONS,
  INITIAL_REFERRAL_BONUSES,
  INITIAL_COMPANY_PROFILE,
  INITIAL_NOTIFICATIONS,
  INITIAL_ACCESS_ROLES,
  INITIAL_SYSTEM_FEATURES,
  INITIAL_DYNAMIC_ROLES,
  INITIAL_SYSTEM_RULES
} from '../data/initialData';
import {
  classifyAustralianPostcode,
  getNearestBigCity,
  formatAustralianMobile,
  formatAudAccounts,
  parseAudAccounts
} from '../utils/australianPostcodes';
import { dispatchSystemAlert, getPersonalEmailConfig } from '../services/systemAlertsEmailService';
import { triggerCapiStageEvent } from '../services/metaAdsService';

interface AppContextType {
  currentUser: UserProfile;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  setCurrentUser: (user: UserProfile) => void;
  availableUsers: UserProfile[];
  
  // Company Profile & Dynamic Branding
  companyProfile: CompanyProfile;
  updateCompanyProfile: (profile: Partial<CompanyProfile>) => void;
  resetCompanyProfile: () => void;

  // Real-time System Notifications
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;

  // System Users & Access Control
  systemUsers: UserProfile[];
  addSystemUser: (user: Omit<UserProfile, 'id'>) => {
    success: boolean;
    message?: string;
    user: UserProfile;
    inviteLink: string;
  };
  updateSystemUser: (id: string, updates: Partial<UserProfile>) => void;
  deleteSystemUser: (id: string) => void;
  setUserPassword: (userId: string, password: string) => { success: boolean; message: string };
  sendUserInvite: (userId: string, channel?: 'email' | 'sms') => { success: boolean; message: string; inviteLink: string };
  getUserInviteLink: (user: UserProfile) => string;

  accessRoles: RoleAccessConfig[];
  updateRoleAccess: (role: UserRole, updates: Partial<RoleAccessConfig>) => void;

  // Dynamic Features & System Functionalities
  systemFeatures: SystemFeatureConfig[];
  updateSystemFeature: (id: string, updates: Partial<SystemFeatureConfig>) => void;
  toggleSystemFeature: (id: string) => void;
  resetSystemFeatures: () => void;
  isFeatureEnabled: (id: string) => boolean;

  // Dynamic Operational Rules & Global Parameters
  systemRules: SystemOperationalRules;
  updateSystemRules: (updates: Partial<SystemOperationalRules>) => void;
  resetSystemRules: () => void;
  recalculateAllProjectsStc: (customerRate: number, internalRate: number) => void;

  // Dynamic Roles & Granular Access Control
  dynamicRoles: DynamicRoleConfig[];
  addDynamicRole: (role: Omit<DynamicRoleConfig, 'id' | 'role'>) => DynamicRoleConfig;
  updateDynamicRole: (id: string, updates: Partial<DynamicRoleConfig>) => void;
  deleteDynamicRole: (id: string) => boolean;
  cloneDynamicRole: (id: string, newName: string) => DynamicRoleConfig;
  resetDynamicRoles: () => void;
  hasPermission: (featureId: string, action: 'view' | 'create' | 'edit' | 'delete' | 'export') => boolean;
  hasSpecialAction: (actionKey: keyof DynamicRoleSpecialActions) => boolean;
  getActiveRoleConfig: () => DynamicRoleConfig | undefined;

  // Active viewing context for portals
  selectedCustomerId: string;
  setSelectedCustomerId: (id: string) => void;
  selectedInstallerId: string;
  setSelectedInstallerId: (id: string) => void;

  // State entities
  contacts: Contact[];
  addContact: (contact: Omit<Contact, 'id' | 'createdAt'>) => void;
  updateContact: (id: string, contact: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  addContactAddress: (contactId: string, address: Omit<ContactAddress, 'id'>) => void;
  updateContactAddress: (contactId: string, addressId: string, address: Partial<ContactAddress>) => void;
  removeContactAddress: (contactId: string, addressId: string) => void;
  deleteContactAddress: (contactId: string, addressId: string) => void;

  // Referral Bonuses
  referralBonuses: ReferralBonus[];
  addReferralBonus: (bonus: Omit<ReferralBonus, 'id' | 'referralCode' | 'createdAt'>) => ReferralBonus;
  updateReferralBonus: (id: string, updates: Partial<ReferralBonus>) => void;
  deleteReferralBonus: (id: string) => void;
  addReferralAttachment: (referralId: string, attachment: Omit<ReferralAttachment, 'id' | 'uploadedAt'>) => void;
  removeReferralAttachment: (referralId: string, attachmentId: string) => void;

  companies: Company[];
  addCompany: (comp: Omit<Company, 'id'>) => void;
  updateCompany: (id: string, comp: Partial<Company>) => void;
  deleteCompany: (id: string) => void;

  leads: Lead[];
  addLead: (lead: Partial<Lead>) => Lead;
  updateLead: (id: string, lead: Partial<Lead>) => void;
  convertLeadToProject: (leadId: string) => Project;
  syncGoogleSheetLeads: (customLeads?: Partial<Lead>[]) => number;
  addLeadActivity: (leadId: string, activity: Omit<LeadActivity, 'id' | 'createdAt'>) => void;
  toggleLeadActivityTask: (leadId: string, activityId: string) => void;
  deleteLeadActivity: (leadId: string, activityId: string) => void;

  projects: Project[];
  addProject: (proj: Omit<Project, 'id' | 'projectCode'>) => Project;
  updateProject: (id: string, proj: Partial<Project>) => void;
  updateProjectStatus: (id: string, status: ProjectStatus) => void;
  uploadProjectPhoto: (projectId: string, photo: { category: any; url: string }) => void;

  tickets: Ticket[];
  addTicket: (ticket: Omit<Ticket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt'>) => { success: boolean; message?: string; ticket?: Ticket };
  updateTicket: (id: string, ticket: Partial<Ticket>) => void;
  updateTicketStatus: (id: string, status: TicketStatus, resolutionNotes?: string) => void;

  maintenanceRecords: MaintenanceRecord[];
  sendMaintenanceNotification: (id: string) => void;
  completeMaintenance: (id: string, notes?: string) => void;

  subContractors: SubContractor[];
  addSubContractor: (sub: Omit<SubContractor, 'id'>) => void;
  updateSubContractor: (id: string, sub: Partial<SubContractor>) => void;

  salesOrders: SalesOrder[];
  addSalesOrder: (so: Omit<SalesOrder, 'id' | 'orderNumber'>) => void;
  updateSalesOrderStatus: (id: string, status: SalesOrder['status']) => void;

  installOrders: InstallOrder[];
  addInstallOrder: (io: Omit<InstallOrder, 'id' | 'orderNumber'>) => void;
  submitInstallerQuote: (orderId: string, quote: { subcontractorId: string; subcontractorName: string; amountAud: number; estimatedDays: number; crewSize: number; notes: string }) => void;
  awardInstallOrder: (orderId: string, quoteId: string) => void;

  customerReviews: CustomerReview[];
  addCustomerReview: (rev: Omit<CustomerReview, 'id' | 'createdAt' | 'published'>) => void;
  togglePublishReview: (id: string) => void;
  addReviewReply: (id: string, reply: string) => void;

  smsMessages: MessageMediaSMS[];
  sendSMS: (recipientNumber: string, messageText: string, contactId?: string, projectId?: string) => void;

  voipCalls: VoIPCallLog[];
  logVoIPCall: (call: Omit<VoIPCallLog, 'id' | 'timestamp'>) => void;

  dropdowns: DynamicDropdownConfig;
  setDropdowns: React.Dispatch<React.SetStateAction<DynamicDropdownConfig>>;
  addDropdownItem: (category: keyof DynamicDropdownConfig, value: string) => void;
  removeDropdownItem: (category: keyof DynamicDropdownConfig, value: string) => void;
  dropdownConfigs: DropdownCategoryConfig[];
  addDropdownOption: (categoryKey: string, value: string) => void;
  removeDropdownOption: (categoryKey: string, value: string) => void;
  batchImportDropdowns: (
    summary: DropdownImportSummary,
    mode?: 'merge' | 'replace'
  ) => { addedCount: number; updatedCount: number; deletedCount: number; categoriesModified: number };

  connectedDomains: string[];
  connectedDomain: string;
  setConnectedDomain: (domain: string) => void;
  addConnectedDomain: (domain: string) => boolean;
  removeConnectedDomain: (domain: string) => void;

  // Dedicated Portal Addresses (Customer vs Installer)
  portalAddresses: SystemPortalAddresses;
  updatePortalAddress: (portalType: 'customer' | 'installer', updates: Partial<PortalAddressConfig>) => void;
  updatePortalRoutingSettings: (updates: Partial<Pick<SystemPortalAddresses, 'enforceSeparateLogins' | 'enableAutoRouting'>>) => void;
  resetPortalAddresses: () => void;

  employees: UserProfile[];
  addEmployee: (emp: Omit<UserProfile, 'id'>) => { success: boolean; error?: string };
  updateEmployee: (id: string, emp: Partial<UserProfile>) => void;

  leaveRequests: LeaveRequest[];
  addLeaveRequest: (req: Omit<LeaveRequest, 'id' | 'createdAt'>) => void;
  updateLeaveStatus: (id: string, status: 'Pending' | 'Approved' | 'Rejected') => void;

  integrations: IntegrationConfig[];
  toggleIntegration: (id: string) => void;

  // Calculators & Reports
  calculatePL: () => ProjectPL[];

  // Authentication & Session
  isAuthenticated: boolean;
  login: (user?: UserProfile) => void;
  logout: () => void;

  // Theme & Visual Identity (Corporate Slate vs Obsidian)
  themeMode: 'corporate-slate' | 'obsidian';
  setThemeMode: (mode: 'corporate-slate' | 'obsidian') => void;

  // Persistent Display View Modes ('pipeline' | 'table' | 'grid')
  leadsViewMode: ViewMode;
  setLeadsViewMode: (mode: ViewMode) => void;
  projectsViewMode: ViewMode;
  setProjectsViewMode: (mode: ViewMode) => void;
  ticketsViewMode: ViewMode;
  setTicketsViewMode: (mode: ViewMode) => void;

  // Global Dialog states
  isVoipDialerOpen: boolean;
  setIsVoipDialerOpen: (open: boolean) => void;
  isQuickSmsOpen: boolean;
  setIsQuickSmsOpen: (open: boolean) => void;
  selectedPreviewProposalUrl: string | null;
  setSelectedPreviewProposalUrl: (url: string | null) => void;
  activeBridgeSelectProject: Project | null;
  setActiveBridgeSelectProject: (proj: Project | null) => void;

  // Multiple Attachments, Customer Portal Credentials & Xero Accounting
  addLeadAttachment: (leadId: string, attachment: Omit<LeadAttachment, 'id' | 'uploadedAt'>) => LeadAttachment;
  deleteLeadAttachment: (leadId: string, attachmentId: string) => void;
  sendCustomerPortalInvite: (leadId: string) => CustomerPortalCredentials;
  createLeadXeroInvoice: (leadId: string) => XeroInvoice;
  generateLeadXeroReceipt: (leadId: string, amountPaid?: number) => XeroPaymentReceipt;
  xeroPaymentReceipts: XeroPaymentReceipt[];
  addCustomerUpload: (targetId: string, attachment: Omit<LeadAttachment, 'id' | 'uploadedAt' | 'uploadedBy'>) => LeadAttachment;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load or initialize state from localStorage
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('solar_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.email?.toLowerCase() === 'akash.mohite@gmail.com') {
          return {
            ...parsed,
            name: parsed.name === 'Akash Mohite' ? 'Admin MakeMySolar' : parsed.name,
            email: 'admin@makemysolar.com.au',
            assignedDomain: 'makemysolar.com.au'
          };
        }
        return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_USERS[0];
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const savedAuth = localStorage.getItem('solar_authenticated');
    return savedAuth !== 'false';
  });

  const [activeRole, setActiveRole] = useState<UserRole>(() => currentUser.role);

  const login = (user?: UserProfile) => {
    const targetUser = user || currentUser;
    if (user) {
      setCurrentUser(user);
      setActiveRole(user.role);
      localStorage.setItem('solar_user', JSON.stringify(user));
    }
    setIsAuthenticated(true);
    localStorage.setItem('solar_authenticated', 'true');
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.setItem('solar_authenticated', 'false');
  };

  // Theme & Visual Identity: 'corporate-slate' (clean white cards, slate canvas, refined emerald & soft gold)
  const [themeMode, setThemeModeState] = useState<'corporate-slate' | 'obsidian'>(() => {
    const saved = localStorage.getItem('solar_theme_mode');
    return (saved === 'obsidian' || saved === 'corporate-slate') ? saved : 'corporate-slate';
  });

  const setThemeMode = (mode: 'corporate-slate' | 'obsidian') => {
    setThemeModeState(mode);
    localStorage.setItem('solar_theme_mode', mode);
  };

  useEffect(() => {
    if (themeMode === 'corporate-slate') {
      document.body.classList.add('theme-light');
      document.body.classList.remove('theme-dark');
    } else {
      document.body.classList.remove('theme-light');
      document.body.classList.add('theme-dark');
    }
  }, [themeMode]);

  // Selected customer / installer for portal testing
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cnt-1');
  const [selectedInstallerId, setSelectedInstallerId] = useState<string>('sub-1');

  // Persistent Display View Modes ('pipeline' | 'table' | 'grid')
  const [leadsViewMode, setLeadsViewModeState] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem('solar_leads_view_mode');
      return (saved === 'pipeline' || saved === 'table' || saved === 'grid') ? (saved as ViewMode) : 'grid';
    } catch {
      return 'grid';
    }
  });

  const setLeadsViewMode = (mode: ViewMode) => {
    setLeadsViewModeState(mode);
    try {
      localStorage.setItem('solar_leads_view_mode', mode);
    } catch (e) {
      console.warn('Failed to save solar_leads_view_mode to localStorage', e);
    }
  };

  const [projectsViewMode, setProjectsViewModeState] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem('solar_projects_view_mode');
      return (saved === 'pipeline' || saved === 'table' || saved === 'grid') ? (saved as ViewMode) : 'grid';
    } catch {
      return 'grid';
    }
  });

  const setProjectsViewMode = (mode: ViewMode) => {
    setProjectsViewModeState(mode);
    try {
      localStorage.setItem('solar_projects_view_mode', mode);
    } catch (e) {
      console.warn('Failed to save solar_projects_view_mode to localStorage', e);
    }
  };

  const [ticketsViewMode, setTicketsViewModeState] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem('solar_tickets_view_mode');
      return (saved === 'pipeline' || saved === 'table' || saved === 'grid') ? (saved as ViewMode) : 'grid';
    } catch {
      return 'grid';
    }
  });

  const setTicketsViewMode = (mode: ViewMode) => {
    setTicketsViewModeState(mode);
    try {
      localStorage.setItem('solar_tickets_view_mode', mode);
    } catch (e) {
      console.warn('Failed to save solar_tickets_view_mode to localStorage', e);
    }
  };

  // One-time production initialization: purge legacy demo/dummy data from browser localStorage
  if (typeof window !== 'undefined') {
    try {
      const PROD_CLEAN_KEY = 'solar_crm_prod_clean_v2';
      if (!localStorage.getItem(PROD_CLEAN_KEY)) {
        const demoKeys = [
          'solar_contacts',
          'solar_companies',
          'solar_leads',
          'solar_projects',
          'solar_tickets',
          'solar_maintenance',
          'solar_subcontractors',
          'solar_sales_orders',
          'solar_install_orders',
          'solar_reviews',
          'solar_notifications',
          'solar_sms_messages',
          'solar_voip_calls',
          'solar_leave_requests',
          'solar_referral_bonuses',
          'solar_xero_invoices',
          'solar_xero_quotations',
          'solar_xero_bills',
          'solar_xero_contacts_sync',
          'solar_xero_payment_receipts',
          'solar_opensolar_proposals',
          'solar_messagemedia_sms_logs',
          'solar_mailchimp_campaigns',
          'solar_mailchimp_emails'
        ];
        demoKeys.forEach(k => localStorage.removeItem(k));
        localStorage.setItem(PROD_CLEAN_KEY, 'true');
      }
    } catch (e) {
      console.warn('Could not initialize clean production storage', e);
    }
  }

  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('solar_contacts');
    return saved ? JSON.parse(saved) : INITIAL_CONTACTS;
  });

  const [companies, setCompanies] = useState<Company[]>(() => {
    const saved = localStorage.getItem('solar_companies');
    return saved ? JSON.parse(saved) : INITIAL_COMPANIES;
  });

  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('solar_leads');
    return saved ? JSON.parse(saved) : INITIAL_LEADS;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem('solar_projects');
      const baseProjects: Project[] = saved ? JSON.parse(saved) : INITIAL_PROJECTS;
      return (baseProjects || []).filter(Boolean).map(p => {
        const custRate = p.customerStcRateAud ?? 36.00;
        const intRate = p.internalStcRateAud ?? 39.50;
        const custVal = p.customerStcValueAud ?? Math.round((p.stcCount || 0) * custRate);
        const intVal = p.internalStcValueAud ?? Math.round((p.stcCount || 0) * intRate);
        return {
          ...p,
          customerStcRateAud: custRate,
          customerStcValueAud: custVal,
          internalStcRateAud: intRate,
          internalStcValueAud: intVal,
          stcValueAud: intVal
        };
      });
    } catch {
      return INITIAL_PROJECTS;
    }
  });

  const [tickets, setTickets] = useState<Ticket[]>(() => {
    try {
      const saved = localStorage.getItem('solar_tickets');
      return saved ? (JSON.parse(saved) || []).filter(Boolean) : INITIAL_TICKETS;
    } catch {
      return INITIAL_TICKETS;
    }
  });

  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem('solar_maintenance');
      return saved ? (JSON.parse(saved) || []).filter(Boolean) : INITIAL_MAINTENANCE;
    } catch {
      return INITIAL_MAINTENANCE;
    }
  });

  const [subContractors, setSubContractors] = useState<SubContractor[]>(() => {
    try {
      const saved = localStorage.getItem('solar_subcontractors');
      return saved ? (JSON.parse(saved) || []).filter(Boolean) : INITIAL_SUBCONTRACTORS;
    } catch {
      return INITIAL_SUBCONTRACTORS;
    }
  });

  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(() => {
    const saved = localStorage.getItem('solar_sales_orders');
    if (saved) {
      try {
        const parsed: SalesOrder[] = JSON.parse(saved);
        return (parsed || []).filter(Boolean).map(so => ({
          ...so,
          warehouseLocation:
            so.warehouseLocation ||
            (so.projectCode?.includes('NSW')
              ? 'Sydney Wetherill Park Logistics Hub'
              : 'Brisbane Acacia Ridge Distribution Hub'),
          dispatchDate: so.dispatchDate || (so?.status === 'Ordered' ? 'Pending dispatch' : so.orderDate)
        }));
      } catch (e) {
        console.error('Error parsing cached sales orders', e);
      }
    }
    return INITIAL_SALES_ORDERS;
  });

  const [installOrders, setInstallOrders] = useState<InstallOrder[]>(() => {
    try {
      const saved = localStorage.getItem('solar_install_orders');
      return saved ? (JSON.parse(saved) || []).filter(Boolean) : INITIAL_INSTALL_ORDERS;
    } catch {
      return INITIAL_INSTALL_ORDERS;
    }
  });

  const [customerReviews, setCustomerReviews] = useState<CustomerReview[]>(() => {
    try {
      const saved = localStorage.getItem('solar_reviews');
      return saved ? (JSON.parse(saved) || []).filter(Boolean) : INITIAL_REVIEWS;
    } catch {
      return INITIAL_REVIEWS;
    }
  });

  const [smsMessages, setSmsMessages] = useState<MessageMediaSMS[]>(() => {
    const saved = localStorage.getItem('solar_sms');
    return saved ? JSON.parse(saved) : INITIAL_SMS_MESSAGES;
  });

  const [voipCalls, setVoipCalls] = useState<VoIPCallLog[]>(() => {
    const saved = localStorage.getItem('solar_calls');
    return saved ? JSON.parse(saved) : INITIAL_VOIP_CALLS;
  });

  const [dropdowns, setDropdowns] = useState<DynamicDropdownConfig>(() => {
    const saved = localStorage.getItem('solar_dropdowns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_DROPDOWNS,
          ...parsed,
          states: parsed.states && parsed.states.length > 0 ? parsed.states : INITIAL_DROPDOWNS.states,
          contactTypes: parsed.contactTypes && parsed.contactTypes.length > 0 ? parsed.contactTypes : INITIAL_DROPDOWNS.contactTypes,
          companyTypes: parsed.companyTypes && parsed.companyTypes.length > 0 ? parsed.companyTypes : INITIAL_DROPDOWNS.companyTypes,
          platforms: parsed.platforms && parsed.platforms.length > 0 ? parsed.platforms : INITIAL_DROPDOWNS.platforms,
          salesPersons: parsed.salesPersons && parsed.salesPersons.length > 0 ? parsed.salesPersons : INITIAL_DROPDOWNS.salesPersons,
          leadStatuses: parsed.leadStatuses && parsed.leadStatuses.length > 0 ? parsed.leadStatuses : INITIAL_DROPDOWNS.leadStatuses,
          houseStoreys: parsed.houseStoreys && parsed.houseStoreys.length > 0 ? parsed.houseStoreys : INITIAL_DROPDOWNS.houseStoreys,
          phases: parsed.phases && parsed.phases.length > 0 ? parsed.phases : INITIAL_DROPDOWNS.phases,
          docsReceivedOptions: parsed.docsReceivedOptions && parsed.docsReceivedOptions.length > 0 ? parsed.docsReceivedOptions : INITIAL_DROPDOWNS.docsReceivedOptions,
          existingSystemTemplates: parsed.existingSystemTemplates && parsed.existingSystemTemplates.length > 0 ? parsed.existingSystemTemplates : INITIAL_DROPDOWNS.existingSystemTemplates,
          panelHierarchy: parsed.panelHierarchy && parsed.panelHierarchy.length > 0 ? parsed.panelHierarchy : INITIAL_DROPDOWNS.panelHierarchy,
          inverterHierarchy: parsed.inverterHierarchy && parsed.inverterHierarchy.length > 0 ? parsed.inverterHierarchy : INITIAL_DROPDOWNS.inverterHierarchy,
          batteryHierarchy: parsed.batteryHierarchy && parsed.batteryHierarchy.length > 0 ? parsed.batteryHierarchy : INITIAL_DROPDOWNS.batteryHierarchy,
          projectStages: parsed.projectStages || INITIAL_DROPDOWNS.projectStages,
          electricityDistributors: parsed.electricityDistributors || INITIAL_DROPDOWNS.electricityDistributors,
          energyRetailers: parsed.energyRetailers || INITIAL_DROPDOWNS.energyRetailers,
          gridApplicationStatuses: parsed.gridApplicationStatuses || INITIAL_DROPDOWNS.gridApplicationStatuses,
          installationStatuses: parsed.installationStatuses || INITIAL_DROPDOWNS.installationStatuses,
          installationBookedByOptions: parsed.installationBookedByOptions || INITIAL_DROPDOWNS.installationBookedByOptions,
          installationMonths: parsed.installationMonths || INITIAL_DROPDOWNS.installationMonths,
          installationDocsStatuses: parsed.installationDocsStatuses || INITIAL_DROPDOWNS.installationDocsStatuses,
          installerInvoiceStatuses: parsed.installerInvoiceStatuses || INITIAL_DROPDOWNS.installerInvoiceStatuses,
          warehouses: parsed.warehouses || INITIAL_DROPDOWNS.warehouses,
          warehouseInvoiceStatuses: parsed.warehouseInvoiceStatuses || INITIAL_DROPDOWNS.warehouseInvoiceStatuses,
          stockStatuses: parsed.stockStatuses || INITIAL_DROPDOWNS.stockStatuses,
          isFinanceOptions: parsed.isFinanceOptions || INITIAL_DROPDOWNS.isFinanceOptions,
          financeCompanies: parsed.financeCompanies || INITIAL_DROPDOWNS.financeCompanies,
          financeStatuses: parsed.financeStatuses || INITIAL_DROPDOWNS.financeStatuses,
          stcPortals: parsed.stcPortals || INITIAL_DROPDOWNS.stcPortals,
          stcStatuses: parsed.stcStatuses || INITIAL_DROPDOWNS.stcStatuses,
          ticketIssueRecordedOptions: parsed.ticketIssueRecordedOptions || INITIAL_DROPDOWNS.ticketIssueRecordedOptions,
          ticketInitialCheckOptions: parsed.ticketInitialCheckOptions || INITIAL_DROPDOWNS.ticketInitialCheckOptions,
          ticketWorkRequiredOptions: parsed.ticketWorkRequiredOptions || INITIAL_DROPDOWNS.ticketWorkRequiredOptions,
          ticketIssueResolutionStatuses: parsed.ticketIssueResolutionStatuses || INITIAL_DROPDOWNS.ticketIssueResolutionStatuses,
          ticketWarrantyClaimStatuses: parsed.ticketWarrantyClaimStatuses || INITIAL_DROPDOWNS.ticketWarrantyClaimStatuses,
          ticketWarrantyClaimInvoiceStatuses: parsed.ticketWarrantyClaimInvoiceStatuses || INITIAL_DROPDOWNS.ticketWarrantyClaimInvoiceStatuses,
          ticketBrandNotesPresets: parsed.ticketBrandNotesPresets || INITIAL_DROPDOWNS.ticketBrandNotesPresets,
          ticketServiceIssueNotesPresets: parsed.ticketServiceIssueNotesPresets || INITIAL_DROPDOWNS.ticketServiceIssueNotesPresets,
          ticketInstallerNotesPresets: parsed.ticketInstallerNotesPresets || INITIAL_DROPDOWNS.ticketInstallerNotesPresets,
          ebCustomerNameMatchOptions: parsed.ebCustomerNameMatchOptions || INITIAL_DROPDOWNS.ebCustomerNameMatchOptions,
          ebAddressMatchOptions: parsed.ebAddressMatchOptions || INITIAL_DROPDOWNS.ebAddressMatchOptions,
          ebMeterMatchOptions: parsed.ebMeterMatchOptions || INITIAL_DROPDOWNS.ebMeterMatchOptions,
          ebMeterPhaseOptions: parsed.ebMeterPhaseOptions || INITIAL_DROPDOWNS.ebMeterPhaseOptions,
          ebOpenSolarSystemMatchOptions: parsed.ebOpenSolarSystemMatchOptions || INITIAL_DROPDOWNS.ebOpenSolarSystemMatchOptions,
          ebOpenSolarPricingMatchOptions: parsed.ebOpenSolarPricingMatchOptions || INITIAL_DROPDOWNS.ebOpenSolarPricingMatchOptions
        };
      } catch (e) {
        console.error('Failed to parse cached dropdowns', e);
      }
    }
    return INITIAL_DROPDOWNS;
  });

  const [connectedDomains, setConnectedDomains] = useState<string[]>(() => {
    const saved = localStorage.getItem('solar_domains');
    return saved ? JSON.parse(saved) : INITIAL_CONNECTED_DOMAINS;
  });

  const [portalAddresses, setPortalAddresses] = useState<SystemPortalAddresses>(() => {
    const saved = localStorage.getItem('solar_portal_addresses');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_PORTAL_ADDRESSES,
          ...parsed,
          customerPortal: { ...INITIAL_PORTAL_ADDRESSES.customerPortal, ...(parsed.customerPortal || {}) },
          installerPortal: { ...INITIAL_PORTAL_ADDRESSES.installerPortal, ...(parsed.installerPortal || {}) }
        };
      } catch (e) {
        console.error('Failed to parse cached portal addresses', e);
      }
    }
    return INITIAL_PORTAL_ADDRESSES;
  });

  const [employees, setEmployees] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('solar_employees');
    if (saved) {
      try {
        const parsed: UserProfile[] = JSON.parse(saved);
        return parsed.map(u =>
          u.email?.toLowerCase() === 'akash.mohite@gmail.com'
            ? {
                ...u,
                name: u.name === 'Akash Mohite' ? 'Admin MakeMySolar' : u.name,
                email: 'admin@makemysolar.com.au',
                assignedDomain: 'makemysolar.com.au'
              }
            : u
        );
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_USERS;
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    const saved = localStorage.getItem('solar_leave_requests');
    return saved ? JSON.parse(saved) : INITIAL_LEAVE_REQUESTS;
  });

  const [integrations, setIntegrations] = useState<IntegrationConfig[]>(() => {
    const saved = localStorage.getItem('solar_integrations');
    return saved ? JSON.parse(saved) : INITIAL_INTEGRATIONS;
  });

  const [referralBonuses, setReferralBonuses] = useState<ReferralBonus[]>(() => {
    const saved = localStorage.getItem('solar_referral_bonuses');
    return saved ? JSON.parse(saved) : INITIAL_REFERRAL_BONUSES;
  });

  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => {
    const saved = localStorage.getItem('solar_company_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_COMPANY_PROFILE,
          ...parsed,
          headerLogoUrl: parsed.headerLogoUrl !== undefined ? parsed.headerLogoUrl : (parsed.logoUrl || ''),
          loginLogoUrl: parsed.loginLogoUrl !== undefined ? parsed.loginLogoUrl : (parsed.logoUrl || ''),
          headerLogoPreset: parsed.headerLogoPreset || parsed.logoPreset || 'sun',
          loginLogoPreset: parsed.loginLogoPreset || parsed.logoPreset || 'sun'
        };
      } catch (e) {
        return INITIAL_COMPANY_PROFILE;
      }
    }
    return INITIAL_COMPANY_PROFILE;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('solar_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [xeroPaymentReceipts, setXeroPaymentReceipts] = useState<XeroPaymentReceipt[]>(() => {
    return getXeroPaymentReceipts();
  });

  const [accessRoles, setAccessRoles] = useState<RoleAccessConfig[]>(() => {
    const saved = localStorage.getItem('solar_access_roles');
    return saved ? JSON.parse(saved) : INITIAL_ACCESS_ROLES;
  });

  const [systemUsers, setSystemUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('solar_system_users');
    if (saved) {
      try {
        const parsed: UserProfile[] = JSON.parse(saved);
        return parsed.map(u =>
          u.email?.toLowerCase() === 'akash.mohite@gmail.com'
            ? {
                ...u,
                name: u.name === 'Akash Mohite' ? 'Admin MakeMySolar' : u.name,
                email: 'admin@makemysolar.com.au',
                assignedDomain: 'makemysolar.com.au'
              }
            : u
        );
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_USERS;
  });

  // Dynamic Features & System Functionalities state
  const [systemFeatures, setSystemFeatures] = useState<SystemFeatureConfig[]>(() => {
    const saved = localStorage.getItem('solar_system_features');
    if (saved) {
      try {
        const parsed: SystemFeatureConfig[] = JSON.parse(saved);
        // Merge with initial to ensure newly added features are always included
        const existingIds = new Set(parsed.map(f => f.id));
        const missing = INITIAL_SYSTEM_FEATURES.filter(f => !existingIds.has(f.id));
        return [...parsed, ...missing];
      } catch (e) {
        console.error('Error parsing cached system features', e);
      }
    }
    return INITIAL_SYSTEM_FEATURES;
  });

  // Dynamic Operational Rules state
  const [systemRules, setSystemRules] = useState<SystemOperationalRules>(() => {
    const saved = localStorage.getItem('solar_system_rules');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_SYSTEM_RULES,
          ...parsed,
          customerStcRateAud: parsed.customerStcRateAud ?? 36.00,
          internalStcRateAud: parsed.internalStcRateAud ?? parsed.stcTradingRateAud ?? 39.50,
          stcTradingRateAud: parsed.stcTradingRateAud ?? parsed.internalStcRateAud ?? 39.50
        };
      } catch (e) {
        return INITIAL_SYSTEM_RULES;
      }
    }
    return INITIAL_SYSTEM_RULES;
  });

  // Dynamic Roles state
  const [dynamicRoles, setDynamicRoles] = useState<DynamicRoleConfig[]>(() => {
    const saved = localStorage.getItem('solar_dynamic_roles');
    if (saved) {
      try {
        const parsed: DynamicRoleConfig[] = JSON.parse(saved);
        // Ensure standard system roles exist
        const existingIds = new Set(parsed.map(r => r.id));
        const missing = INITIAL_DYNAMIC_ROLES.filter(r => !existingIds.has(r.id));
        return [...parsed, ...missing];
      } catch (e) {
        console.error('Error parsing cached dynamic roles', e);
      }
    }
    return INITIAL_DYNAMIC_ROLES;
  });

  // UI Dialog state
  const [isVoipDialerOpen, setIsVoipDialerOpen] = useState(false);
  const [isQuickSmsOpen, setIsQuickSmsOpen] = useState(false);
  const [selectedPreviewProposalUrl, setSelectedPreviewProposalUrl] = useState<string | null>(null);
  const [activeBridgeSelectProject, setActiveBridgeSelectProject] = useState<Project | null>(null);

  // Sync back to local storage
  useEffect(() => {
    localStorage.setItem('solar_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('solar_contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('solar_companies', JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem('solar_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('solar_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('solar_tickets', JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem('solar_maintenance', JSON.stringify(maintenanceRecords));
  }, [maintenanceRecords]);

  useEffect(() => {
    localStorage.setItem('solar_subcontractors', JSON.stringify(subContractors));
  }, [subContractors]);

  useEffect(() => {
    localStorage.setItem('solar_sales_orders', JSON.stringify(salesOrders));
  }, [salesOrders]);

  useEffect(() => {
    localStorage.setItem('solar_install_orders', JSON.stringify(installOrders));
  }, [installOrders]);

  useEffect(() => {
    localStorage.setItem('solar_reviews', JSON.stringify(customerReviews));
  }, [customerReviews]);

  useEffect(() => {
    localStorage.setItem('solar_sms', JSON.stringify(smsMessages));
  }, [smsMessages]);

  // Sync Supabase SMS logs on initial load
  useEffect(() => {
    fetchSmsLogs({ limit: 50 })
      .then(logs => {
        if (logs && logs.length > 0) {
          const mapped: MessageMediaSMS[] = logs.map(l => ({
            id: l.id,
            direction: 'outbound',
            senderNumber: l.sender_id || 'MessageMedia',
            recipientNumber: l.recipient_number,
            contactId: l.contact_id || undefined,
            projectId: l.project_id || undefined,
            messageText: l.message_body,
            timestamp: l.created_at,
            status:
              l.status === 'failed_to_send'
                ? 'failed_to_send'
                : l.delivery_status === 'delivered'
                ? 'delivered'
                : 'sent',
            delivery_status: l.delivery_status,
            delivered_at: l.delivered_at || undefined,
            provider_message_id: l.provider_message_id || undefined,
            error_message: l.error_message || undefined
          }));
          setSmsMessages(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const uniqueNew = mapped.filter(m => !existingIds.has(m.id));
            return [...uniqueNew, ...prev];
          });
        }
      })
      .catch(err => console.warn('[AppContext] Could not sync SMS logs:', err));
  }, []);

  useEffect(() => {
    localStorage.setItem('solar_calls', JSON.stringify(voipCalls));
  }, [voipCalls]);

  useEffect(() => {
    localStorage.setItem('solar_dropdowns', JSON.stringify(dropdowns));
  }, [dropdowns]);

  useEffect(() => {
    localStorage.setItem('solar_domains', JSON.stringify(connectedDomains));
  }, [connectedDomains]);

  useEffect(() => {
    localStorage.setItem('solar_portal_addresses', JSON.stringify(portalAddresses));
  }, [portalAddresses]);

  useEffect(() => {
    localStorage.setItem('solar_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('solar_leave_requests', JSON.stringify(leaveRequests));
  }, [leaveRequests]);

  useEffect(() => {
    localStorage.setItem('solar_integrations', JSON.stringify(integrations));
  }, [integrations]);

  useEffect(() => {
    localStorage.setItem('solar_referral_bonuses', JSON.stringify(referralBonuses));
  }, [referralBonuses]);

  useEffect(() => {
    localStorage.setItem('solar_company_profile', JSON.stringify(companyProfile));
  }, [companyProfile]);

  useEffect(() => {
    localStorage.setItem('solar_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('solar_access_roles', JSON.stringify(accessRoles));
  }, [accessRoles]);

  useEffect(() => {
    localStorage.setItem('solar_system_users', JSON.stringify(systemUsers));
  }, [systemUsers]);

  useEffect(() => {
    localStorage.setItem('solar_system_features', JSON.stringify(systemFeatures));
  }, [systemFeatures]);

  useEffect(() => {
    localStorage.setItem('solar_system_rules', JSON.stringify(systemRules));
  }, [systemRules]);

  useEffect(() => {
    localStorage.setItem('solar_dynamic_roles', JSON.stringify(dynamicRoles));
  }, [dynamicRoles]);

  // Dynamic Features & System Functionalities Handlers
  const updateSystemFeature = (id: string, updates: Partial<SystemFeatureConfig>) => {
    setSystemFeatures(prev => prev.map(f => (f.id === id ? { ...f, ...updates } : f)));
  };

  const toggleSystemFeature = (id: string) => {
    setSystemFeatures(prev => prev.map(f => (f.id === id ? { ...f, enabled: !f.enabled } : f)));
  };

  const resetSystemFeatures = () => {
    setSystemFeatures(INITIAL_SYSTEM_FEATURES);
  };

  const isFeatureEnabled = (id: string) => {
    const feat = systemFeatures.find(f => f.id === id);
    return feat ? feat.enabled : true;
  };

  // Dynamic Operational Rules Handlers
  const updateSystemRules = (updates: Partial<SystemOperationalRules>) => {
    setSystemRules(prev => {
      const merged = { ...prev, ...updates };
      if (updates.internalStcRateAud !== undefined && updates.stcTradingRateAud === undefined) {
        merged.stcTradingRateAud = updates.internalStcRateAud;
      }
      return merged;
    });
  };

  const recalculateAllProjectsStc = (customerRate: number, internalRate: number) => {
    setProjects(prev =>
      prev.map(p => {
        const custVal = Math.round((p.stcCount || 0) * customerRate);
        const intVal = Math.round((p.stcCount || 0) * internalRate);
        return {
          ...p,
          customerStcRateAud: customerRate,
          customerStcValueAud: custVal,
          internalStcRateAud: internalRate,
          internalStcValueAud: intVal,
          stcValueAud: intVal
        };
      })
    );
  };

  const resetSystemRules = () => {
    setSystemRules(INITIAL_SYSTEM_RULES);
  };

  // Dynamic Roles Handlers
  const addDynamicRole = (roleData: Omit<DynamicRoleConfig, 'id' | 'role'>) => {
    const newId = `role-${Date.now()}`;
    const newRole: DynamicRoleConfig = {
      ...roleData,
      id: newId,
      role: newId
    };
    setDynamicRoles(prev => [...prev, newRole]);
    return newRole;
  };

  const updateDynamicRole = (id: string, updates: Partial<DynamicRoleConfig>) => {
    setDynamicRoles(prev =>
      prev.map(r => (r.id === id || r.role === id ? { ...r, ...updates } : r))
    );
  };

  const deleteDynamicRole = (id: string) => {
    const roleToDelete = dynamicRoles.find(r => r.id === id || r.role === id);
    if (roleToDelete?.isSystem || roleToDelete?.id === 'admin') {
      return false; // protect system admin from deletion
    }
    setDynamicRoles(prev => prev.filter(r => r.id !== id && r.role !== id));
    if (activeRole === id) {
      setActiveRole('admin');
    }
    return true;
  };

  const cloneDynamicRole = (id: string, newName: string) => {
    const sourceRole = dynamicRoles.find(r => r.id === id || r.role === id) || dynamicRoles[0];
    const newId = `role-${Date.now()}`;
    const clonedRole: DynamicRoleConfig = {
      ...sourceRole,
      id: newId,
      role: newId,
      roleName: newName,
      isSystem: false,
      permissions: JSON.parse(JSON.stringify(sourceRole.permissions || {})),
      specialActions: { ...sourceRole.specialActions }
    };
    setDynamicRoles(prev => [...prev, clonedRole]);
    return clonedRole;
  };

  const resetDynamicRoles = () => {
    setDynamicRoles(INITIAL_DYNAMIC_ROLES);
  };

  const getActiveRoleConfig = () => {
    return (
      dynamicRoles.find(r => r.id === activeRole || r.role === activeRole) ||
      dynamicRoles.find(r => r.id === 'admin')
    );
  };

  const hasPermission = (
    featureId: string,
    action: 'view' | 'create' | 'edit' | 'delete' | 'export'
  ) => {
    // 1. If feature is disabled globally in settings, access is denied for all
    if (!isFeatureEnabled(featureId)) {
      return false;
    }
    // 2. Admin role has full permission by default
    if (activeRole === 'admin') {
      const adminRole = dynamicRoles.find(r => r.id === 'admin');
      if (adminRole?.permissions?.[featureId]?.[action] === false) {
        return false;
      }
      return true;
    }
    const roleConfig = dynamicRoles.find(r => r.id === activeRole || r.role === activeRole);
    if (!roleConfig) return true;
    const perm = roleConfig.permissions?.[featureId];
    if (!perm) return false;
    return Boolean(perm[action]);
  };

  const hasSpecialAction = (actionKey: keyof DynamicRoleSpecialActions) => {
    if (activeRole === 'admin') return true;
    const roleConfig = dynamicRoles.find(r => r.id === activeRole || r.role === activeRole);
    if (!roleConfig) return true;
    return Boolean(roleConfig.specialActions?.[actionKey]);
  };

  // Company Profile Handlers
  const updateCompanyProfile = (updates: Partial<CompanyProfile>) => {
    setCompanyProfile(prev => ({ ...prev, ...updates }));
  };

  const resetCompanyProfile = () => {
    setCompanyProfile(INITIAL_COMPANY_PROFILE);
  };

  // Notification Handlers
  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const addNotification = (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}`,
      timestamp: 'Just now',
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);

    // Send browser desktop notification if enabled
    try {
      const cfg = getPersonalEmailConfig();
      if (cfg?.sendBrowserPushNotification && typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(`Apex Solar ERP: ${notif.title}`, {
            body: notif.message,
            icon: '/favicon.ico'
          });
        }
      }
    } catch {
      // ignore
    }
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // System User Handlers
  const getUserInviteLink = (user: UserProfile): string => {
    const token = user.inviteToken || `inv-${user.id}-${Date.now().toString(36)}`;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mysolarcrm.com.au';
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    return `${origin}${path}?invite_token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;
  };

  const addSystemUser = (userData: Omit<UserProfile, 'id'>) => {
    const token = `inv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
    const isPwdSet = Boolean(userData.password);
    const newUser: UserProfile = {
      ...userData,
      id: `usr-${Date.now()}`,
      inviteToken: token,
      isPasswordSet: isPwdSet,
      inviteStatus: isPwdSet ? 'active' : 'pending_password',
      inviteSentAt: new Date().toISOString()
    };
    setSystemUsers(prev => [newUser, ...prev]);

    const inviteLink = getUserInviteLink(newUser);

    addNotification({
      title: 'User Created & Invite Dispatched',
      message: `Invitation with password creation link generated for ${newUser.name} (${newUser.email}).`,
      type: 'system'
    });

    return {
      success: true,
      message: `User ${newUser.name} created. Invitation link dispatched to ${newUser.email}.`,
      user: newUser,
      inviteLink
    };
  };

  const setUserPassword = (userId: string, password: string) => {
    setSystemUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, password, isPasswordSet: true, inviteStatus: 'active' } : u))
    );
    if (currentUser.id === userId) {
      setCurrentUser(prev => ({ ...prev, password, isPasswordSet: true, inviteStatus: 'active' }));
    }
    addNotification({
      title: 'Password Updated',
      message: `Password has been successfully configured and verified.`,
      type: 'system'
    });
    return { success: true, message: 'Password set successfully. You can now log into your workspace.' };
  };

  const sendUserInvite = (userId: string, channel: 'email' | 'sms' = 'email') => {
    const user = systemUsers.find(u => u.id === userId);
    if (!user) {
      return { success: false, message: 'User not found in system directory', inviteLink: '' };
    }
    const token = user.inviteToken || `inv-${user.id}-${Date.now().toString(36)}`;
    const updatedUser: UserProfile = {
      ...user,
      inviteToken: token,
      inviteSentAt: new Date().toISOString(),
      inviteStatus: user.isPasswordSet ? 'active' : 'pending_password'
    };
    setSystemUsers(prev => prev.map(u => (u.id === userId ? updatedUser : u)));

    const inviteLink = getUserInviteLink(updatedUser);

    addNotification({
      title: 'ERP Invite Dispatched',
      message: `Workspace invite with password setup link sent to ${user.name} via ${channel === 'sms' ? `SMS (${user.phone})` : `Email (${user.email})`}.`,
      type: 'system'
    });

    if (channel === 'email' && user.email) {
      dispatchSystemAlert({
        type: 'staff_invite',
        title: `Welcome to Apex Solar ERP - Team Access Granted for ${user.name}`,
        recipientEmail: user.email,
        recipientName: user.name,
        data: {
          userName: user.name,
          userEmail: user.email,
          role: user.role,
          inviteLink: inviteLink,
          description: `You have been granted access to Apex Solar ERP with ${user.role} permissions. Please follow the link to initialize your workspace account and set your password.`
        }
      }).catch(e => console.warn('Staff invite alert dispatch failed:', e));
    }

    return {
      success: true,
      message: `Invitation link dispatched via ${channel.toUpperCase()} to ${channel === 'sms' ? user.phone : user.email}`,
      inviteLink
    };
  };

  const updateSystemUser = (id: string, updates: Partial<UserProfile>) => {
    setSystemUsers(prev => prev.map(u => (u.id === id ? { ...u, ...updates } : u)));
    if (currentUser.id === id) {
      setCurrentUser(prev => ({ ...prev, ...updates }));
    }
  };

  const deleteSystemUser = (id: string) => {
    setSystemUsers(prev => prev.filter(u => u.id !== id));
  };

  // Role Access Handlers
  const updateRoleAccess = (role: UserRole, updates: Partial<RoleAccessConfig>) => {
    setAccessRoles(prev => prev.map(r => (r.role === role ? { ...r, ...updates } : r)));
  };

  // Contact Handlers
  const addContact = (contact: Omit<Contact, 'id' | 'createdAt'>) => {
    const newContact: Contact = {
      ...contact,
      id: `cnt-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setContacts(prev => [newContact, ...prev]);
  };

  const updateContact = (id: string, updated: Partial<Contact>) => {
    setContacts(prev => prev.map(c => (c.id === id ? { ...c, ...updated } : c)));
  };

  const deleteContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const addContactAddress = (contactId: string, addressData: Omit<ContactAddress, 'id'>) => {
    setContacts(prev =>
      prev.map(c => {
        if (c.id !== contactId) return c;
        const currentAddrs = c.addresses && c.addresses.length > 0 ? c.addresses : [
          {
            id: `addr-${c.id}-1`,
            street: c.address || c.city || 'Primary Address',
            suburb: c.city || '',
            state: c.state || 'NSW',
            propertyType: 'Primary Residence',
            isPrimary: true
          }
        ];
        const newAddr: ContactAddress = {
          ...addressData,
          id: `addr-${Date.now()}`
        };
        const updatedList = newAddr.isPrimary
          ? currentAddrs.map(a => ({ ...a, isPrimary: false })).concat([newAddr])
          : [...currentAddrs, newAddr];

        const primaryAddr = updatedList.find(a => a.isPrimary) || updatedList[0];
        return {
          ...c,
          addresses: updatedList,
          address: primaryAddr ? `${primaryAddr.street}, ${primaryAddr.suburb} ${primaryAddr.state}` : c.address
        };
      })
    );
  };

  const updateContactAddress = (contactId: string, addressId: string, updated: Partial<ContactAddress>) => {
    setContacts(prev =>
      prev.map(c => {
        if (c.id !== contactId) return c;
        const currentAddrs = c.addresses && c.addresses.length > 0 ? c.addresses : [
          {
            id: `addr-${c.id}-1`,
            street: c.address || c.city || 'Primary Address',
            suburb: c.city || '',
            state: c.state || 'NSW',
            propertyType: 'Primary Residence',
            isPrimary: true
          }
        ];
        const updatedList = currentAddrs.map(a => {
          if (a.id === addressId) {
            return { ...a, ...updated };
          }
          if (updated.isPrimary) {
            return { ...a, isPrimary: false };
          }
          return a;
        });
        const primaryAddr = updatedList.find(a => a.isPrimary) || updatedList[0];
        return {
          ...c,
          addresses: updatedList,
          address: primaryAddr ? `${primaryAddr.street}, ${primaryAddr.suburb} ${primaryAddr.state}` : c.address
        };
      })
    );
  };

  const removeContactAddress = (contactId: string, addressId: string) => {
    setContacts(prev =>
      prev.map(c => {
        if (c.id !== contactId) return c;
        const currentAddrs = c.addresses || [];
        const remaining = currentAddrs.filter(a => a.id !== addressId);
        if (remaining.length > 0 && !remaining.some(a => a.isPrimary)) {
          remaining[0].isPrimary = true;
        }
        const primaryAddr = remaining.find(a => a.isPrimary) || remaining[0];
        return {
          ...c,
          addresses: remaining,
          address: primaryAddr ? `${primaryAddr.street}, ${primaryAddr.suburb} ${primaryAddr.state}` : c.address
        };
      })
    );
  };

  // Referral Bonus Handlers
  const addReferralBonus = (bonus: Omit<ReferralBonus, 'id' | 'referralCode' | 'createdAt'>): ReferralBonus => {
    const nextNum = String(referralBonuses.length + 1).padStart(3, '0');
    const newBonus: ReferralBonus = {
      ...bonus,
      id: `ref-${Date.now()}`,
      referralCode: `REF-${new Date().getFullYear()}-${nextNum}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setReferralBonuses(prev => [newBonus, ...prev]);
    return newBonus;
  };

  const updateReferralBonus = (id: string, updates: Partial<ReferralBonus>) => {
    setReferralBonuses(prev => prev.map(b => (b.id === id ? { ...b, ...updates } : b)));
  };

  const deleteReferralBonus = (id: string) => {
    setReferralBonuses(prev => prev.filter(b => b.id !== id));
  };

  const addReferralAttachment = (referralId: string, attachment: Omit<ReferralAttachment, 'id' | 'uploadedAt'>) => {
    setReferralBonuses(prev =>
      prev.map(b => {
        if (b.id !== referralId) return b;
        const newAtt: ReferralAttachment = {
          ...attachment,
          id: `att-${Date.now()}`,
          uploadedAt: new Date().toISOString().split('T')[0]
        };
        return {
          ...b,
          attachments: [...(b.attachments || []), newAtt]
        };
      })
    );
  };

  const removeReferralAttachment = (referralId: string, attachmentId: string) => {
    setReferralBonuses(prev =>
      prev.map(b => {
        if (b.id !== referralId) return b;
        return {
          ...b,
          attachments: (b.attachments || []).filter(a => a.id !== attachmentId)
        };
      })
    );
  };

  // Company Handlers
  const addCompany = (comp: Omit<Company, 'id'>) => {
    const newCompany: Company = {
      ...comp,
      id: `comp-${Date.now()}`
    };
    setCompanies(prev => [newCompany, ...prev]);
  };

  const updateCompany = (id: string, updated: Partial<Company>) => {
    setCompanies(prev => prev.map(c => (c.id === id ? { ...c, ...updated } : c)));
  };

  const deleteCompany = (id: string) => {
    setCompanies(prev => prev.filter(c => c.id !== id));
  };

  // Lead Activity Handlers
  const addLeadActivity = (leadId: string, activity: Omit<LeadActivity, 'id' | 'createdAt'>) => {
    const newActivity: LeadActivity = {
      ...activity,
      id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    setLeads(prev => prev.map(l => {
      if (l.id !== leadId) return l;
      return {
        ...l,
        activities: [newActivity, ...(l.activities || [])]
      };
    }));
  };

  const toggleLeadActivityTask = (leadId: string, activityId: string) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== leadId) return l;
      return {
        ...l,
        activities: (l.activities || []).map(a => a.id === activityId ? { ...a, completed: !a.completed } : a)
      };
    }));
  };

  const deleteLeadActivity = (leadId: string, activityId: string) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== leadId) return l;
      return {
        ...l,
        activities: (l.activities || []).filter(a => a.id !== activityId)
      };
    }));
  };

  // Lead Handlers
  const addLead = (lead: Partial<Lead>): Lead => {
    const fName = lead.firstName || (lead.customerName ? lead.customerName.split(' ')[0] : '');
    const lName = lead.lastName || (lead.customerName ? lead.customerName.split(' ').slice(1).join(' ') : '');
    const fullName = `${fName} ${lName}`.trim() || lead.customerName || 'New Lead';
    const cleanPrimaryMobile = formatAustralianMobile(lead.primaryMobile || lead.phone || '');
    const cleanSecondaryMobile = lead.secondaryMobile ? formatAustralianMobile(lead.secondaryMobile) : '';
    const st = lead.state || 'NSW';
    const pc = lead.postcode || '';
    const calculatedArea = lead.area || (pc ? classifyAustralianPostcode(pc, String(st)) : 'Metro');
    const calculatedCity = lead.nearestBigCity || getNearestBigCity(lead.suburb, pc, String(st));
    const cleanEmail = lead.email ? lead.email.split(',')[0].trim() : '';

    const todayDate = new Date().toISOString().split('T')[0];
    const todayMmDdYyyy = `${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getDate()).padStart(2, '0')}/${new Date().getFullYear()}`;

    // Auto-populate saleDate if status is Contract Signed and not set
    let saleDate = lead.saleDate || '';
    if (lead.status === 'Contract Signed' && !saleDate) {
      saleDate = todayDate;
    }

    // Auto-populate depositReceivedDate if status is Deposit Received and not set
    let depositReceivedDate = lead.depositReceivedDate || '';
    if (lead.status === 'Deposit Received' && !depositReceivedDate) {
      depositReceivedDate = todayMmDdYyyy;
    }

    const leadId = lead.id || `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 1. Company Handling based on checkbox
    let targetCompanyId: string | undefined = undefined;
    let targetCompanyName: string | undefined = undefined;

    if (lead.hasCompany && lead.companyName && lead.companyName.trim()) {
      const compName = lead.companyName.trim();
      const existingComp = companies.find(c =>
        (lead.companyId && c.id === lead.companyId) ||
        c.name.toLowerCase() === compName.toLowerCase()
      );

      if (existingComp) {
        targetCompanyId = existingComp.id;
        targetCompanyName = compName;
        setCompanies(prev => prev.map(c => c.id === existingComp.id ? {
          ...c,
          name: compName,
          companyOwner: lead.companyOwner || c.companyOwner || lead.salesPersonName || 'Mitchell Barnes',
          companyOwnerName: lead.companyOwner || c.companyOwnerName || lead.salesPersonName || 'Mitchell Barnes',
          createdAt: lead.companyCreateDate || c.createdAt || todayDate,
          phone: lead.companyPhone || cleanPrimaryMobile || c.phone,
          city: lead.companyCity || calculatedCity || c.city,
          country: lead.companyCountry || c.country || 'Australia',
          type: (lead.companyType as any) || c.type || 'Commercial Customer',
          abn: lead.companyAbn || c.abn || '',
          abnVerified: Boolean(lead.companyAbn && lead.companyAbn.replace(/\s+/g, '').length >= 9)
        } : c));
      } else {
        targetCompanyId = lead.companyId || `comp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        targetCompanyName = compName;
        const newComp: Company = {
          id: targetCompanyId,
          name: compName,
          companyOwner: lead.companyOwner || lead.salesPersonName || 'Mitchell Barnes',
          companyOwnerName: lead.companyOwner || lead.salesPersonName || 'Mitchell Barnes',
          createdAt: lead.companyCreateDate || todayDate,
          phone: lead.companyPhone || cleanPrimaryMobile || '0400 000 000',
          city: lead.companyCity || calculatedCity || 'Sydney',
          country: lead.companyCountry || 'Australia',
          type: (lead.companyType as any) || 'Commercial Customer',
          abn: lead.companyAbn || '',
          state: st,
          email: cleanEmail || '',
          contactPerson: fullName,
          activeProjectsCount: 0,
          abnVerified: Boolean(lead.companyAbn && lead.companyAbn.replace(/\s+/g, '').length >= 9)
        };
        setCompanies(prev => [newComp, ...prev]);
      }
    }

    // 2. Automatic Contact Creation and Attachment
    let targetContactId = lead.contactId;
    const existingContact = contacts.find(c =>
      (targetContactId && c.id === targetContactId) ||
      (cleanEmail && c.email.toLowerCase() === cleanEmail.toLowerCase()) ||
      (cleanPrimaryMobile && c.phone === cleanPrimaryMobile)
    );

    if (existingContact) {
      targetContactId = existingContact.id;
      setContacts(prev => prev.map(c => c.id === existingContact.id ? {
        ...c,
        name: fullName,
        firstName: fName || c.firstName,
        lastName: lName || c.lastName,
        phone: cleanPrimaryMobile || c.phone,
        email: cleanEmail || c.email,
        address: lead.address || c.address,
        suburb: lead.suburb || c.suburb,
        state: st || c.state,
        postcode: pc || c.postcode,
        city: calculatedCity || c.city,
        contactOwner: lead.salesPersonName || c.contactOwner,
        contactOwnerName: lead.salesPersonName || c.contactOwnerName,
        type: lead.hasCompany ? 'Commercial' : (c.type || 'Residential'),
        companyId: lead.hasCompany ? targetCompanyId : undefined,
        companyName: lead.hasCompany ? targetCompanyName : undefined
      } : c));
    } else {
      targetContactId = `cnt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newContact: Contact = {
        id: targetContactId,
        name: fullName,
        firstName: fName,
        lastName: lName,
        email: cleanEmail || 'customer@gmail.com',
        phone: cleanPrimaryMobile || '0400 000 000',
        address: lead.address ? `${lead.address}, ${lead.suburb || ''} ${st} ${pc}`.trim() : `${lead.suburb || ''} ${st}`.trim(),
        streetAddress: lead.address || '',
        suburb: lead.suburb || '',
        state: st,
        postcode: pc,
        city: calculatedCity,
        area: calculatedArea,
        type: lead.hasCompany ? 'Commercial' : 'Residential',
        source: lead.platform || 'Lead Inbound',
        contactOwner: lead.salesPersonName || 'Mitchell Barnes',
        contactOwnerName: lead.salesPersonName || 'Mitchell Barnes',
        companyId: lead.hasCompany ? targetCompanyId : undefined,
        companyName: lead.hasCompany ? targetCompanyName : undefined,
        createdAt: todayDate
      };
      setContacts(prev => [newContact, ...prev]);
    }

    // 3. Initial Activities
    const initialActivities: LeadActivity[] = lead.activities && lead.activities.length > 0 ? lead.activities : [
      {
        id: `act-${Date.now()}-1`,
        leadId,
        type: 'Status Change',
        title: `Lead Record Created (${lead.status || 'New'})`,
        description: `Inbound lead received via ${lead.platform || 'Direct'}. Hardware size requested: ${lead.systemSizeKw || 10.4}kW. Assigned to ${lead.salesPersonName || 'Mitchell Barnes'}.`,
        createdAt: new Date().toISOString(),
        createdBy: 'CRM System'
      },
      {
        id: `act-${Date.now()}-2`,
        leadId,
        type: 'System',
        title: 'CRM Contact Auto-Created & Attached',
        description: `Contact record "${fullName}" (${cleanPrimaryMobile || cleanEmail}) auto-synced and linked to this lead.`,
        createdAt: new Date().toISOString(),
        createdBy: 'Automation Engine'
      }
    ];

    if (lead.hasCompany && targetCompanyName) {
      initialActivities.push({
        id: `act-${Date.now()}-3`,
        leadId,
        type: 'System',
        title: 'Company Auto-Created & Associated',
        description: `Commercial company "${targetCompanyName}" (ABN: ${lead.companyAbn || 'N/A'}) auto-provisioned and linked to lead & contact.`,
        createdAt: new Date().toISOString(),
        createdBy: 'Automation Engine'
      });
    }

    const newLead: Lead = {
      ...lead,
      id: leadId,
      leadDate: lead.leadDate || todayDate,
      platform: lead.platform || lead.source || (dropdowns.platforms?.[0] || 'Meta Lead Ads (Facebook/Instagram)'),
      salesPersonName: lead.salesPersonName || lead.assignedTo || (dropdowns.salesPersons?.[0] || 'Mitchell Barnes'),
      state: st,
      postcode: pc,
      area: calculatedArea,
      nearestBigCity: calculatedCity,
      status: lead.status || (dropdowns.leadStatuses?.[0] || 'New'),
      saleDate,
      firstName: fName,
      lastName: lName,
      managerRenteeFirstName: lead.managerRenteeFirstName || '',
      managerRenteeLastName: lead.managerRenteeLastName || '',
      address: lead.address || '',
      suburb: lead.suburb || `${st} Metro`,
      addressVerified: lead.addressVerified ?? false,
      primaryMobile: cleanPrimaryMobile,
      secondaryMobile: cleanSecondaryMobile,
      email: lead.email || '',
      salesTeamNotes: lead.salesTeamNotes || '',
      systemPrice: lead.systemPrice ?? 0,
      sellingPrice: lead.sellingPrice ?? 0,
      deposit: lead.deposit ?? 0,
      depositReceivedDate,

      // Associated Contact & Company
      contactId: targetContactId,
      hasCompany: Boolean(lead.hasCompany && targetCompanyName),
      companyId: targetCompanyId,
      companyName: targetCompanyName,
      companyOwner: lead.companyOwner || lead.salesPersonName || 'Mitchell Barnes',
      companyCreateDate: lead.companyCreateDate || todayDate,
      companyPhone: lead.companyPhone || cleanPrimaryMobile,
      companyCity: lead.companyCity || calculatedCity,
      companyCountry: lead.companyCountry || 'Australia',
      companyType: lead.companyType || 'Commercial Customer',
      companyAbn: lead.companyAbn || '',

      // Activities
      activities: initialActivities,

      // Technical & legacy fields
      customerName: fullName,
      phone: cleanPrimaryMobile,
      systemSizeKw: lead.systemSizeKw || 10.4,
      batteryRequired: lead.batteryRequired ?? true,
      propertyType: lead.propertyType || (lead.hasCompany ? 'Commercial Retail' : 'Residential Single-Storey'),
      roofType: lead.roofType || 'Colorbond / Metal Sheet',
      phaseType: lead.phaseType || 'Single Phase',
      quarterlyBillAud: lead.quarterlyBillAud || 950,
      source: lead.platform || lead.source || (dropdowns.platforms?.[0] || 'Meta Lead Ads (Facebook/Instagram)'),
      sheetSyncRowId: lead.sheetSyncRowId,
      createdAt: lead.createdAt || todayDate,
      assignedTo: lead.salesPersonName || lead.assignedTo || (dropdowns.salesPersons?.[0] || 'Mitchell Barnes')
    };

    setLeads(prev => [newLead, ...prev]);

    // Dispatch automated email alert for new incoming lead
    const customerPrimaryEmail = newLead.email ? newLead.email.split(',')[0].trim() : '';
    dispatchSystemAlert({
      type: 'new_lead',
      title: `New Solar Lead Received: ${fullName} (${newLead.systemSizeKw}kW - ${newLead.suburb || newLead.state})`,
      recipientEmail: customerPrimaryEmail || `sales@${connectedDomain}`,
      recipientName: fullName,
      data: {
        customerName: fullName,
        phone: cleanPrimaryMobile,
        email: customerPrimaryEmail,
        address: `${newLead.address || ''}, ${newLead.suburb || ''} ${st} ${pc}`.trim(),
        systemSize: `${newLead.systemSizeKw} kW`,
        assignedSalesRep: newLead.salesPersonName,
        platform: newLead.platform,
        sellingPrice: newLead.sellingPrice ? `$${newLead.sellingPrice}` : '$9,400 AUD',
        description: `A new solar energy enquiry has been recorded in Apex Solar CRM from ${newLead.platform}. Immediate sales follow-up triggered.`
      }
    }).catch(e => console.warn('New lead alert dispatch failed:', e));

    return newLead;
  };

  const updateLead = (id: string, updated: Partial<Lead>) => {
    const todayDate = new Date().toISOString().split('T')[0];
    const todayMmDdYyyy = `${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getDate()).padStart(2, '0')}/${new Date().getFullYear()}`;

    setLeads(prev => prev.map(l => {
      if (l.id !== id) return l;

      const merged = { ...l, ...updated };

      // Auto populate sale date if status becomes Contract Signed
      if (updated.status === 'Contract Signed' && !merged.saleDate) {
        merged.saleDate = todayDate;
      }

      // If status is or becomes Contract Signed, automatically provision Customer Portal Credentials & invite
      if ((updated.status === 'Contract Signed' || merged.status === 'Contract Signed') && !merged.portalCredentials) {
        const safeLastName = (merged.lastName || merged.customerName?.split(' ')[1] || 'Apex').replace(/[^a-zA-Z]/g, '');
        const tempPass = `Solar-${new Date().getFullYear()}!${safeLastName}#${Math.floor(100 + Math.random() * 900)}`;
        const customerPrimaryEmail = merged.email ? merged.email.split(',')[0].trim() : 'customer@gmail.com';
        const portalUrl = `https://customer.mysolarcrm.com.au?auth_user=${encodeURIComponent(customerPrimaryEmail)}`;
        
        merged.portalCredentials = {
          username: customerPrimaryEmail,
          tempPassword: tempPass,
          generatedAt: new Date().toISOString(),
          inviteSentAt: new Date().toISOString(),
          inviteLink: portalUrl,
          status: 'Credentials Sent'
        };

        // Add real-time notification
        setNotifications(notifs => [
          {
            id: `notif-${Date.now()}`,
            title: 'Customer Portal Invite Sent',
            message: `Portal credentials automatically generated and emailed to ${merged.customerName || 'customer'} (${customerPrimaryEmail}).`,
            timestamp: 'Just now',
            read: false,
            type: 'success'
          },
          ...notifs
        ]);

        // Dispatch official customer portal login email
        dispatchSystemAlert({
          type: 'portal_access',
          title: `Your Apex Solar Customer Portal Access - ${merged.customerName}`,
          recipientEmail: customerPrimaryEmail,
          recipientName: merged.customerName || 'Valued Customer',
          data: {
            username: customerPrimaryEmail,
            temporaryPassword: tempPass,
            portalUrl: portalUrl,
            customerName: merged.customerName,
            description: 'Your solar installation contract is confirmed. Access your customer portal to view engineering schematics, council approvals, and real-time installation scheduling.'
          }
        }).catch(e => console.warn('Customer portal alert dispatch failed:', e));
      }

      // 1. Company Association / De-association handling
      let targetCompanyId = merged.companyId;
      let targetCompanyName = merged.companyName;

      if (merged.hasCompany && merged.companyName && merged.companyName.trim()) {
        const compName = merged.companyName.trim();
        targetCompanyName = compName;
        const existingComp = companies.find(c =>
          (targetCompanyId && c.id === targetCompanyId) ||
          c.name.toLowerCase() === compName.toLowerCase()
        );

        if (existingComp) {
          targetCompanyId = existingComp.id;
          setCompanies(comps => comps.map(c => c.id === existingComp.id ? {
            ...c,
            name: compName,
            companyOwner: merged.companyOwner || c.companyOwner || merged.salesPersonName || 'Mitchell Barnes',
            companyOwnerName: merged.companyOwner || c.companyOwnerName || merged.salesPersonName || 'Mitchell Barnes',
            createdAt: merged.companyCreateDate || c.createdAt || todayDate,
            phone: merged.companyPhone || merged.primaryMobile || c.phone,
            city: merged.companyCity || merged.nearestBigCity || c.city,
            country: merged.companyCountry || c.country || 'Australia',
            type: (merged.companyType as any) || c.type || 'Commercial Customer',
            abn: merged.companyAbn || c.abn || '',
            abnVerified: Boolean(merged.companyAbn && merged.companyAbn.replace(/\s+/g, '').length >= 9)
          } : c));
        } else {
          targetCompanyId = merged.companyId || `comp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const newComp: Company = {
            id: targetCompanyId,
            name: compName,
            companyOwner: merged.companyOwner || merged.salesPersonName || 'Mitchell Barnes',
            companyOwnerName: merged.companyOwner || merged.salesPersonName || 'Mitchell Barnes',
            createdAt: merged.companyCreateDate || todayDate,
            phone: merged.companyPhone || merged.primaryMobile || '0400 000 000',
            city: merged.companyCity || merged.nearestBigCity || 'Sydney',
            country: merged.companyCountry || 'Australia',
            type: (merged.companyType as any) || 'Commercial Customer',
            abn: merged.companyAbn || '',
            state: merged.state || 'NSW',
            email: merged.email ? merged.email.split(',')[0].trim() : '',
            contactPerson: merged.customerName || `${merged.firstName || ''} ${merged.lastName || ''}`.trim() || 'Customer',
            activeProjectsCount: 0,
            abnVerified: Boolean(merged.companyAbn && merged.companyAbn.replace(/\s+/g, '').length >= 9)
          };
          setCompanies(comps => [newComp, ...comps]);
        }
        merged.companyId = targetCompanyId;
        merged.companyName = targetCompanyName;
      } else if (!merged.hasCompany) {
        // Deactivate / detach company
        merged.companyId = undefined;
        merged.companyName = undefined;
        targetCompanyId = undefined;
        targetCompanyName = undefined;
      }

      // 2. Automatic Contact Creation / Synchronization
      const cleanEmail = merged.email ? merged.email.split(',')[0].trim() : '';
      const cleanMobile = merged.primaryMobile || merged.phone || '';
      const resolvedName = `${merged.firstName || ''} ${merged.lastName || ''}`.trim() || merged.customerName || 'Lead Customer';

      let targetContactId = merged.contactId;
      const existingContact = contacts.find(c =>
        (targetContactId && c.id === targetContactId) ||
        (cleanEmail && c.email.toLowerCase() === cleanEmail.toLowerCase()) ||
        (cleanMobile && c.phone === cleanMobile)
      );

      if (existingContact) {
        targetContactId = existingContact.id;
        setContacts(cnts => cnts.map(c => c.id === existingContact.id ? {
          ...c,
          name: resolvedName,
          firstName: merged.firstName || c.firstName,
          lastName: merged.lastName || c.lastName,
          phone: cleanMobile || c.phone,
          email: cleanEmail || c.email,
          address: merged.address || c.address,
          suburb: merged.suburb || c.suburb,
          state: merged.state || c.state,
          postcode: merged.postcode || c.postcode,
          city: merged.nearestBigCity || c.city,
          contactOwner: merged.salesPersonName || c.contactOwner,
          contactOwnerName: merged.salesPersonName || c.contactOwnerName,
          type: merged.hasCompany ? 'Commercial' : (c.type || 'Residential'),
          companyId: merged.hasCompany ? targetCompanyId : undefined,
          companyName: merged.hasCompany ? targetCompanyName : undefined
        } : c));
      } else {
        targetContactId = `cnt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const newContact: Contact = {
          id: targetContactId,
          name: resolvedName,
          firstName: merged.firstName,
          lastName: merged.lastName,
          email: cleanEmail || 'customer@gmail.com',
          phone: cleanMobile || '0400 000 000',
          address: merged.address ? `${merged.address}, ${merged.suburb || ''} ${merged.state} ${merged.postcode}`.trim() : `${merged.suburb || ''} ${merged.state}`.trim(),
          streetAddress: merged.address || '',
          suburb: merged.suburb || '',
          state: merged.state || 'NSW',
          postcode: merged.postcode || '',
          city: merged.nearestBigCity || 'Sydney',
          area: merged.area || 'Metro',
          type: merged.hasCompany ? 'Commercial' : 'Residential',
          source: merged.platform || 'Lead Inbound',
          contactOwner: merged.salesPersonName || 'Mitchell Barnes',
          contactOwnerName: merged.salesPersonName || 'Mitchell Barnes',
          companyId: merged.hasCompany ? targetCompanyId : undefined,
          companyName: merged.hasCompany ? targetCompanyName : undefined,
          createdAt: todayDate
        };
        setContacts(cnts => [newContact, ...cnts]);
      }
      merged.contactId = targetContactId;

      // 3. Activity tracking on status change
      if (updated.status && updated.status !== l.status) {
        const statusActivity: LeadActivity = {
          id: `act-${Date.now()}`,
          leadId: id,
          type: 'Status Change',
          title: `Stage Changed to: ${updated.status}`,
          description: `Pipeline stage updated from "${l.status}" to "${updated.status}".`,
          createdAt: new Date().toISOString(),
          createdBy: merged.salesPersonName || 'Sales Agent'
        };
        merged.activities = [statusActivity, ...(merged.activities || [])];

        // Trigger Meta Conversions API (CAPI) stage transition event with stable deduplication
        triggerCapiStageEvent(merged, updated.status, { isUserAction: true }).catch(err =>
          console.warn('[Meta CAPI Auto-Trigger]', err)
        );
      }

      // Auto populate deposit date if status becomes Deposit Received
      if (updated.status === 'Deposit Received' && !merged.depositReceivedDate) {
        merged.depositReceivedDate = todayMmDdYyyy;
      }

      // If postcode changed, auto-update area
      if (updated.postcode !== undefined) {
        merged.area = classifyAustralianPostcode(merged.postcode || '', String(merged.state));
      }

      // If suburb or postcode changed, auto-update nearest big city
      if (updated.suburb !== undefined || updated.postcode !== undefined) {
        merged.nearestBigCity = getNearestBigCity(merged.suburb, merged.postcode, String(merged.state));
      }

      // Sync customerName if firstName or lastName updated
      if (updated.firstName !== undefined || updated.lastName !== undefined) {
        merged.customerName = `${merged.firstName || ''} ${merged.lastName || ''}`.trim() || merged.customerName;
      }

      // Sync phone
      if (updated.primaryMobile !== undefined) {
        merged.phone = formatAustralianMobile(updated.primaryMobile);
        merged.primaryMobile = merged.phone;
      }
      if (updated.secondaryMobile !== undefined) {
        merged.secondaryMobile = formatAustralianMobile(updated.secondaryMobile);
      }

      // Sync source & assignedTo
      if (updated.platform !== undefined) {
        merged.source = updated.platform;
      }
      if (updated.salesPersonName !== undefined) {
        merged.assignedTo = updated.salesPersonName;
      }

      return merged;
    }));
  };

  const addLeadAttachment = (
    leadId: string,
    attachment: Omit<LeadAttachment, 'id' | 'uploadedAt'>
  ): LeadAttachment => {
    const newAttachment: LeadAttachment = {
      ...attachment,
      id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      uploadedAt: new Date().toISOString()
    };

    setLeads(prev => prev.map(l => {
      if (l.id !== leadId) return l;
      return {
        ...l,
        attachments: [newAttachment, ...(l.attachments || [])]
      };
    }));

    setProjects(prev => prev.map(p => {
      if (p.leadId !== leadId && p.id !== leadId) return p;
      return {
        ...p,
        attachments: [newAttachment, ...(p.attachments || [])]
      };
    }));

    return newAttachment;
  };

  const deleteLeadAttachment = (leadId: string, attachmentId: string) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== leadId) return l;
      return {
        ...l,
        attachments: (l.attachments || []).filter(a => a.id !== attachmentId)
      };
    }));

    setProjects(prev => prev.map(p => {
      if (p.leadId !== leadId && p.id !== leadId) return p;
      return {
        ...p,
        attachments: (p.attachments || []).filter(a => a.id !== attachmentId)
      };
    }));
  };

  const sendCustomerPortalInvite = (leadId: string): CustomerPortalCredentials => {
    const lead = leads.find(l => l.id === leadId);
    const safeLastName = (lead?.lastName || lead?.customerName?.split(' ')[1] || 'Apex').replace(/[^a-zA-Z]/g, '');
    const tempPass = `Solar-${new Date().getFullYear()}!${safeLastName}#${Math.floor(100 + Math.random() * 900)}`;
    const email = lead?.email ? lead.email.split(',')[0].trim() : 'customer@gmail.com';
    const credentials: CustomerPortalCredentials = {
      username: email,
      tempPassword: tempPass,
      generatedAt: new Date().toISOString(),
      inviteSentAt: new Date().toISOString(),
      inviteLink: `https://customer.mysolarcrm.com.au?auth_user=${encodeURIComponent(email)}`,
      status: 'Credentials Sent'
    };

    setLeads(prev => prev.map(l => {
      if (l.id !== leadId) return l;
      return { ...l, portalCredentials: credentials };
    }));

    setNotifications(prev => [
      {
        id: `notif-${Date.now()}`,
        title: 'Customer Portal Invite Sent',
        message: `Portal credentials and welcome link sent to ${lead?.customerName || email} (${email}).`,
        timestamp: 'Just now',
        read: false,
        type: 'success'
      },
      ...prev
    ]);

    // Dispatch system email alert for portal invite
    dispatchSystemAlert({
      type: 'portal_access',
      title: `Your Apex Solar Customer Portal Access - ${lead?.customerName || email}`,
      recipientEmail: email,
      recipientName: lead?.customerName || 'Valued Customer',
      data: {
        username: email,
        temporaryPassword: tempPass,
        portalUrl: credentials.inviteLink,
        customerName: lead?.customerName,
        description: 'You have been invited to log in to the Apex Solar Customer Portal. Track project milestones, engineering documents, and CEC compliance records.'
      }
    }).catch(e => console.warn('Portal invite alert dispatch failed:', e));

    return credentials;
  };

  const createLeadXeroInvoice = (leadId: string): XeroInvoice => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) throw new Error('Lead not found');
    const inv = generateXeroInvoiceForLead(lead);

    setLeads(prev => prev.map(l => {
      if (l.id !== leadId) return l;
      return {
        ...l,
        xeroInvoiceId: inv.id,
        xeroInvoiceNumber: inv.invoiceNumber,
        xeroInvoiceTotal: inv.total,
        xeroInvoiceStatus: inv.status
      };
    }));

    setProjects(prev => prev.map(p => {
      if (p.leadId !== leadId && p.id !== leadId) return p;
      return {
        ...p,
        xeroInvoiceId: inv.id,
        xeroInvoiceNumber: inv.invoiceNumber
      };
    }));

    setNotifications(prev => [
      {
        id: `notif-${Date.now()}`,
        title: 'Xero Tax Invoice Created',
        message: `Invoice ${inv.invoiceNumber} ($${inv.total.toLocaleString()} AUD) successfully generated in Xero for ${lead.customerName}.`,
        timestamp: 'Just now',
        read: false,
        type: 'success'
      },
      ...prev
    ]);

    // Dispatch system email alert for tax invoice
    const customerPrimaryEmail = lead.email ? lead.email.split(',')[0].trim() : 'customer@gmail.com';
    dispatchSystemAlert({
      type: 'invoice_issued',
      title: `Tax Invoice ${inv.invoiceNumber} from Apex Solar Pty Ltd ($${inv.total.toLocaleString()} AUD)`,
      recipientEmail: customerPrimaryEmail,
      recipientName: lead.customerName || 'Valued Customer',
      data: {
        invoiceNumber: inv.invoiceNumber,
        totalAmount: `$${inv.total.toLocaleString()} AUD`,
        dueDate: inv.dueDate,
        systemSize: `${lead.systemSizeKw || '6.6'} kW Solar System`,
        customerName: lead.customerName,
        description: `Your official Australian tax invoice ${inv.invoiceNumber} has been generated. Payment terms and direct deposit details are available in the portal.`
      }
    }).catch(e => console.warn('Invoice alert dispatch failed:', e));

    return inv;
  };

  const generateLeadXeroReceipt = (leadId: string, amountPaid?: number): XeroPaymentReceipt => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) throw new Error('Lead not found');
    const inv = generateXeroInvoiceForLead(lead);
    const receipt = generateXeroReceiptForLead(lead, inv, amountPaid);

    setXeroPaymentReceipts(prev => [receipt, ...prev]);

    setLeads(prev => prev.map(l => {
      if (l.id !== leadId) return l;
      return {
        ...l,
        xeroInvoiceId: inv.id,
        xeroInvoiceNumber: inv.invoiceNumber,
        xeroReceiptNumber: receipt.receiptNumber,
        xeroReceiptDate: receipt.paymentDate,
        xeroReceiptAmount: receipt.amountPaidAud,
        xeroReceiptMethod: receipt.paymentMethod
      };
    }));

    setProjects(prev => prev.map(p => {
      if (p.leadId !== leadId && p.id !== leadId) return p;
      return {
        ...p,
        xeroReceiptNumber: receipt.receiptNumber,
        xeroReceiptDate: receipt.paymentDate,
        xeroReceiptAmount: receipt.amountPaidAud
      };
    }));

    setNotifications(prev => [
      {
        id: `notif-${Date.now()}`,
        title: 'Xero Payment Receipt Created',
        message: `Official Payment Receipt ${receipt.receiptNumber} ($${receipt.amountPaidAud.toLocaleString()} AUD) issued for ${lead.customerName}. Available for customer download in Portal.`,
        timestamp: 'Just now',
        read: false,
        type: 'success'
      },
      ...prev
    ]);

    // Dispatch system email alert for payment receipt
    const customerPrimaryEmail = lead.email ? lead.email.split(',')[0].trim() : 'customer@gmail.com';
    dispatchSystemAlert({
      type: 'payment_received',
      title: `Payment Receipt: ${receipt.receiptNumber} - Apex Solar Pty Ltd`,
      recipientEmail: customerPrimaryEmail,
      recipientName: lead.customerName || 'Valued Customer',
      data: {
        receiptNumber: receipt.receiptNumber,
        amountPaid: `$${receipt.amountPaidAud.toLocaleString()} AUD`,
        paymentDate: receipt.paymentDate,
        paymentMethod: receipt.paymentMethod,
        invoiceNumber: inv.invoiceNumber,
        customerName: lead.customerName,
        description: `Thank you for your payment of $${receipt.amountPaidAud.toLocaleString()} AUD. Your payment has been credited to invoice ${inv.invoiceNumber}.`
      }
    }).catch(e => console.warn('Payment receipt alert dispatch failed:', e));

    return receipt;
  };

  const addCustomerUpload = (
    targetId: string,
    attachment: Omit<LeadAttachment, 'id' | 'uploadedAt' | 'uploadedBy'>
  ): LeadAttachment => {
    const newAttachment: LeadAttachment = {
      ...attachment,
      id: `att-cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'customer'
    };

    setLeads(prev => prev.map(l => {
      if (l.id !== targetId && l.email?.toLowerCase() !== targetId.toLowerCase()) return l;
      return {
        ...l,
        attachments: [newAttachment, ...(l.attachments || [])]
      };
    }));

    setProjects(prev => prev.map(p => {
      if (p.id !== targetId && p.leadId !== targetId && p.customerEmail?.toLowerCase() !== targetId.toLowerCase()) return p;
      return {
        ...p,
        attachments: [newAttachment, ...(p.attachments || [])]
      };
    }));

    setNotifications(prev => [
      {
        id: `notif-${Date.now()}`,
        title: 'Customer Document Uploaded',
        message: `Customer uploaded "${newAttachment.name}" (${newAttachment.category}) via Customer Portal.`,
        timestamp: 'Just now',
        read: false,
        type: 'info'
      },
      ...prev
    ]);

    return newAttachment;
  };

  const convertLeadToProject = (leadId: string): Project => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) throw new Error('Lead not found');

    // Create or find matching contact
    let contact = contacts.find(c => c.email.toLowerCase() === lead.email.toLowerCase());
    if (!contact) {
      contact = {
        id: `cnt-${Date.now()}`,
        name: lead.customerName,
        email: lead.email,
        phone: lead.phone,
        state: lead.state,
        city: lead.suburb,
        address: `${lead.suburb}, ${lead.state}`,
        type: 'Residential',
        source: lead.platform || 'Meta Ads',
        createdAt: new Date().toISOString().split('T')[0]
      };
      setContacts(prev => [contact!, ...prev]);
    }

    const statePrefix = lead.state === 'QLD' ? 'QLD' : 'NSW';
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const projectCode = lead.projectNumber?.trim() || `SOL-${statePrefix}-${randNum}`;
    const todayDate = new Date().toISOString().split('T')[0];

    // Dynamic STC calculation using System Rules
    const approxStcs = Math.round(lead.systemSizeKw * 10);
    const customerStcRate = systemRules.customerStcRateAud || 36.00;
    const internalStcRate = systemRules.internalStcRateAud || systemRules.stcTradingRateAud || 39.50;
    const customerStcValue = Math.round(approxStcs * customerStcRate);
    const internalStcValue = Math.round(approxStcs * internalStcRate);
    const baseValue = Math.round(lead.systemSizeKw * 1150 + (lead.batteryRequired ? 8500 : 0));

    // Resolve selling price & amount
    let initialSellingPriceAud = '';
    if (lead.sellingPrice) {
      initialSellingPriceAud = typeof lead.sellingPrice === 'number' ? formatAudAccounts(lead.sellingPrice) : String(lead.sellingPrice);
    } else {
      initialSellingPriceAud = formatAudAccounts(baseValue);
    }

    const newProject: Project = {
      id: `proj-${Date.now()}`,
      projectCode,
      title: `${lead.systemSizeKw}kW ${lead.batteryRequired ? '+ Battery' : 'Solar System'}`,
      customerId: contact.id,
      customerName: lead.customerName,
      customerEmail: lead.email,
      customerPhone: lead.phone,
      address: lead.address ? `${lead.address}, ${lead.suburb} ${lead.state} ${lead.postcode || ''}`.trim() : `${lead.suburb}, ${lead.state}`,
      suburb: lead.suburb,
      state: lead.state,
      dnsp: lead.state === 'QLD' ? 'Energex' : 'Ausgrid',
      status: 'Site Survey',
      systemSizeKw: lead.systemSizeKw,
      panelBrand: lead.panelManufacturer || dropdowns.panelBrands[0] || 'AIKO Solar',
      panelModel: lead.panelModel || 'Neostar 440W All-Black',
      panelCount: lead.noOfPanels ? Number(lead.noOfPanels) : Math.ceil((lead.systemSizeKw * 1000) / 440),
      inverterBrand: lead.inverterManufacturer || dropdowns.inverterBrands[0] || 'Sungrow (SG/SH Series)',
      inverterModel: lead.inverterModel || (lead.systemSizeKw > 8 ? 'SH8.0RS Hybrid' : 'SG5.0RS Single Phase'),
      batteryBrand: lead.batteryRequired ? (lead.batteryManufacturer || dropdowns.batteryBrands[0]) : undefined,
      batteryCapacityKwh: lead.batteryRequired ? (lead.batteryUsableCapacityKwh ? Number(lead.batteryUsableCapacityKwh) : 10) : undefined,
      contractValueAud: parseAudAccounts(initialSellingPriceAud) || baseValue,
      stcCount: approxStcs,
      customerStcRateAud: customerStcRate,
      customerStcValueAud: customerStcValue,
      internalStcRateAud: internalStcRate,
      internalStcValueAud: internalStcValue,
      stcValueAud: internalStcValue,
      bridgeSelectStatus: 'Pending Verification',
      openSolarProposalId: `OS-PROP-${new Date().getFullYear()}-${randNum}`,
      openSolarContractSigned: false,
      leadId: lead.id,

      // Top section
      projectNumber: projectCode,
      amount: initialSellingPriceAud,
      projectCreatedDate: todayDate,
      projectClosedDate: '',
      projectStage: 'Site Survey',

      // Section 1: Customer & Sales
      salesPersonName: lead.salesPersonName || 'Mitchell Barnes',
      postcode: lead.postcode || '',
      area: lead.area || (lead.postcode ? classifyAustralianPostcode(lead.postcode, lead.state) : 'Metro'),
      nearestBigCity: lead.nearestBigCity || getNearestBigCity(lead.suburb, lead.postcode || '', lead.state),
      saleDate: lead.saleDate || todayDate,
      firstName: lead.firstName || (lead.customerName ? lead.customerName.split(' ')[0] : ''),
      lastName: lead.lastName || (lead.customerName ? lead.customerName.split(' ').slice(1).join(' ') : ''),
      managerRenteeFirstName: lead.managerRenteeFirstName || '',
      managerRenteeLastName: lead.managerRenteeLastName || '',
      primaryMobile: lead.primaryMobile || lead.phone || '',
      secondaryMobile: lead.secondaryMobile || '',
      email: lead.email || '',
      salesTeamNotes: lead.salesTeamNotes || '',
      systemPrice: lead.systemPrice ? (typeof lead.systemPrice === 'number' ? formatAudAccounts(lead.systemPrice) : String(lead.systemPrice)) : formatAudAccounts(baseValue + customerStcValue),
      sellingPrice: initialSellingPriceAud,
      deposit: lead.deposit ? (typeof lead.deposit === 'number' ? formatAudAccounts(lead.deposit) : String(lead.deposit)) : formatAudAccounts(1000),
      depositReceivedDate: lead.depositReceivedDate || (lead.status === 'Deposit Received' ? todayDate : ''),

      // Section 2: Technical Specifications & Hardware
      noOfPanels: lead.noOfPanels ? String(lead.noOfPanels) : String(Math.ceil((lead.systemSizeKw * 1000) / 440)),
      panelManufacturer: lead.panelManufacturer || dropdowns.panelBrands[0] || 'AIKO Solar',
      panelSizeW: lead.panelSizeW ? String(lead.panelSizeW) : '440',
      panelSeries: lead.panelSeries || 'Neostar 2P',
      noOfInverters: lead.noOfInverters ? String(lead.noOfInverters) : '1',
      inverterManufacturer: lead.inverterManufacturer || dropdowns.inverterBrands[0] || 'Sungrow (SG/SH Series)',
      inverterSizeKw: lead.inverterSizeKw ? String(lead.inverterSizeKw) : (lead.systemSizeKw > 8 ? '8.0' : '5.0'),
      noOfBatteries: lead.noOfBatteries ? String(lead.noOfBatteries) : (lead.batteryRequired ? '1' : '0'),
      batteryManufacturer: lead.batteryManufacturer || (lead.batteryRequired ? (dropdowns.batteryBrands[0] || 'Tesla Powerwall 3 (13.5kWh)') : ''),
      usableCapacity: lead.batteryUsableCapacityKwh ? String(lead.batteryUsableCapacityKwh) : (lead.batteryRequired ? '13.5' : ''),
      batteryModel: lead.batteryModel || (lead.batteryRequired ? 'Tesla Powerwall 3 Pack' : ''),
      batterySize: lead.batterySize || (lead.batteryRequired ? 'Integrated All-in-One' : ''),
      houseStorey: lead.houseStorey || 'Single Storey',
      roofType: lead.roofType || 'Colorbond / Metal Sheet',
      phase: lead.phase || 'Single Phase',
      existingSystemDetails: lead.existingSystemDetails || 'No existing solar installed (Brand new installation)',
      docsReceived: lead.docsReceived || 'Yes',
      docsReceivedDate: lead.docsReceivedDate || todayDate,

      // Section 3: Electricity Bill (EB) & Meter Checklist
      q1CustomerNameMatch: 'Yes',
      q2AddressMatch: 'Yes',
      q3MeterMatch: 'Yes',
      q4MeterPhase: lead.phase?.includes('Three') ? 'Three Phase' : 'Single Phase',
      q5OpenSolarSystemMatch: 'Yes',
      q6OpenSolarPricingMatch: 'Yes',

      // Section 4: Grid & DNSP Application
      nmi: '',
      electricityDistributor: lead.state === 'QLD' ? 'Energex' : 'Ausgrid',
      gridAppRef: `DNSP-APP-${randNum}`,
      energyRetailer: 'Origin Energy',
      retailerRef: '',
      gridAppStatus: 'Not Started',
      gridAppliedDate: '',
      gridRejectedDate: '',
      gridApprovalDate: '',

      // Section 5: Installation & Logistics
      installationDate: '',
      installationStatus: 'Unscheduled',
      installationBookingDate: '',
      installationBookedBy: 'Operations Manager',
      installationCompletedMonth: '',
      installationDocsStatus: 'Pending',
      installationDocsReceivedDate: '',
      installerName: '',
      installerInvoiceDate: '',
      installerInvoiceNumber: '',
      installerInvoiceAmount: '',
      installerInvoiceStatus: 'Pending Approval',
      customerInvoiceNumber: lead.xeroInvoiceNumber || `INV-${randNum}`,

      // Section 6: Warehouse & Equipment Dispatch
      warehouse: 'Sydney Central DC (Alexandria)',
      salesOrderNo: `SO-${randNum}`,
      warehouseInvoiceDate: '',
      warehouseInvoiceNumber: '',
      warehouseInvoiceAmount: '',
      warehouseInvoiceStatus: 'Draft',
      stockStatus: 'In Stock',
      stockUsedProject: '',
      warehouseInvoicePaidDate: '',

      // Section 7: Financials, Payment & Finance Brokerage
      balancePayable: formatAudAccounts(Math.max(0, (parseAudAccounts(initialSellingPriceAud) || baseValue) - (lead.deposit ? parseAudAccounts(String(lead.deposit)) : 1000))),
      balancePayableDate: '',
      remainingPayment: formatAudAccounts(Math.max(0, (parseAudAccounts(initialSellingPriceAud) || baseValue) - (lead.deposit ? parseAudAccounts(String(lead.deposit)) : 1000))),
      isOnFinance: 'No (Cash / Direct Payment)',
      financeCompanyName: '',
      financeAppliedDate: '',
      financeApprovedDate: '',
      financeApprovedAmount: '',
      financeStatus: 'Not Applicable',

      // Section 8: STC Claims & Clean Energy Regulator (CER)
      stcTradedPortal: 'BridgeSelect',
      stcJobNo: `STC-${randNum}`,
      solarStcs: approxStcs ? String(approxStcs) : '',
      solarStcsAmount: formatAudAccounts(customerStcValue),
      solarStcReceivedDate: '',
      batteryStcs: '',
      batteryStcsAmount: '',
      batteryStcReceivedDate: '',
      totalStcAmountReceived: '',
      adminCharges: '$150.00',
      stcStatus: 'Pending Upload',
      stcSubmittedDate: '',

      // Copied associations & activities
      hasCompany: lead.hasCompany,
      companyName: lead.companyName,
      companyOwner: lead.companyOwner,
      companyAbn: lead.companyAbn,
      companyPhone: lead.companyPhone,
      companyCity: lead.companyCity,
      companyCountry: lead.companyCountry,
      companyType: lead.companyType,
      activities: lead.activities ? [...lead.activities] : [],
      attachments: lead.attachments ? [...lead.attachments] : []
    };

    setProjects(prev => [newProject, ...prev]);

    // Update lead status
    updateLead(leadId, { status: 'Converted to Project' });

    return newProject;
  };

  const syncGoogleSheetLeads = (customLeads?: Partial<Lead>[]): number => {
    const todayDate = new Date().toISOString().split('T')[0];
    const todayMmDdYyyy = `${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getDate()).padStart(2, '0')}/${new Date().getFullYear()}`;

    let incoming: Partial<Lead>[] = [];

    if (customLeads && customLeads.length > 0) {
      incoming = customLeads;
    } else {
      // Realistic leads fetched from connected Google Sheet
      // Capturing data where available, leaving blank where data is not available
      incoming = [
        {
          leadDate: todayDate,
          platform: 'Meta Lead Ads (Facebook/Instagram)',
          salesPersonName: 'Mitchell Barnes',
          state: 'NSW',
          postcode: '2230',
          area: 'Metro',
          nearestBigCity: 'Sydney',
          status: 'New',
          saleDate: '',
          firstName: 'Callum',
          lastName: 'Fletcher',
          managerRenteeFirstName: 'Tania',
          managerRenteeLastName: 'Fletcher',
          address: '30 Gerrale Street',
          suburb: 'Cronulla',
          addressVerified: true,
          primaryMobile: '0418 991 223',
          secondaryMobile: '', // Blank where unavailable in sheet
          email: 'callum.fletcher@gmail.com',
          salesTeamNotes: 'Synced from Meta Lead Sheet row #78. High interest in battery package.',
          systemPrice: 12400,
          sellingPrice: 9100,
          deposit: 0,
          depositReceivedDate: '', // Blank where unavailable
          sheetSyncRowId: `GSHEET_ROW_${Math.floor(70 + Math.random() * 20)}`
        },
        {
          leadDate: todayDate,
          platform: 'Google Search & PMax Ads',
          salesPersonName: 'Chloe Gallagher',
          state: 'QLD',
          postcode: '4305',
          area: 'Metro',
          nearestBigCity: 'Brisbane',
          status: 'Contract Signed',
          saleDate: todayDate, // Auto populated
          firstName: 'Ashleigh',
          lastName: 'Miller',
          managerRenteeFirstName: '', // Blank where unavailable in sheet
          managerRenteeLastName: '', // Blank where unavailable in sheet
          address: '50 Brisbane Street',
          suburb: 'Ipswich',
          addressVerified: true,
          primaryMobile: '0433 112 998',
          secondaryMobile: '0433 998 112',
          email: 'ashleigh.m@outlook.com.au, info@millerproperties.com.au',
          salesTeamNotes: 'Signed commercial solar agreement. Needs DNSP fast-track.',
          systemPrice: 14900,
          sellingPrice: 10800,
          deposit: 1500,
          depositReceivedDate: todayMmDdYyyy,
          sheetSyncRowId: `GSHEET_ROW_${Math.floor(90 + Math.random() * 20)}`
        },
        {
          leadDate: todayDate,
          platform: 'Meta Lead Ads (Facebook/Instagram)',
          salesPersonName: 'Liam Evans',
          state: 'VIC',
          postcode: '3220',
          area: 'Regional',
          nearestBigCity: 'Geelong',
          status: 'Deposit Received',
          saleDate: todayDate,
          firstName: 'Declan',
          lastName: 'Macarthur',
          managerRenteeFirstName: '',
          managerRenteeLastName: '',
          address: '82 Moorabool Street',
          suburb: 'Geelong',
          addressVerified: true,
          primaryMobile: '0455 223 881',
          secondaryMobile: '',
          email: 'declan.m@geelongsolar.com.au',
          salesTeamNotes: 'Deposit received via card. Ready for engineering assessment.',
          systemPrice: 11500,
          sellingPrice: 8200,
          deposit: 1000,
          depositReceivedDate: todayMmDdYyyy,
          sheetSyncRowId: `GSHEET_ROW_${Math.floor(110 + Math.random() * 20)}`
        }
      ];
    }

    const mappedLeads: Lead[] = incoming.map((raw, idx) => {
      const fName = (raw.firstName || '').trim();
      const lName = (raw.lastName || '').trim();
      const fullName = (raw.customerName || `${fName} ${lName}`.trim()) || 'Sheet Lead';
      const cleanPrimary = formatAustralianMobile(raw.primaryMobile || raw.phone || '');
      const cleanSecondary = raw.secondaryMobile ? formatAustralianMobile(raw.secondaryMobile) : '';
      const st = raw.state || 'NSW';
      const pc = raw.postcode || '';
      const calculatedArea = raw.area || (pc ? classifyAustralianPostcode(pc, String(st)) : 'Metro');
      const calculatedCity = raw.nearestBigCity || getNearestBigCity(raw.suburb, pc, String(st));

      const status = raw.status || 'New';
      let saleDate = raw.saleDate || '';
      if (status === 'Contract Signed' && !saleDate) {
        saleDate = todayDate;
      }
      let depositReceivedDate = raw.depositReceivedDate || '';
      if (status === 'Deposit Received' && !depositReceivedDate) {
        depositReceivedDate = todayMmDdYyyy;
      }

      return {
        id: raw.id || `lead-sheet-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        leadDate: raw.leadDate || todayDate,
        platform: raw.platform || (dropdowns.platforms?.[0] || 'Meta Lead Ads (Facebook/Instagram)'),
        salesPersonName: raw.salesPersonName || (dropdowns.salesPersons?.[0] || 'Mitchell Barnes'),
        state: st,
        postcode: pc,
        area: calculatedArea,
        nearestBigCity: calculatedCity,
        status,
        saleDate,
        firstName: fName,
        lastName: lName,
        managerRenteeFirstName: raw.managerRenteeFirstName || '',
        managerRenteeLastName: raw.managerRenteeLastName || '',
        address: raw.address || '',
        suburb: raw.suburb || `${st} Metro`,
        addressVerified: raw.addressVerified ?? (Boolean(raw.address && raw.postcode)),
        primaryMobile: cleanPrimary,
        secondaryMobile: cleanSecondary,
        email: raw.email || '',
        salesTeamNotes: raw.salesTeamNotes || '',
        systemPrice: raw.systemPrice !== undefined ? raw.systemPrice : '',
        sellingPrice: raw.sellingPrice !== undefined ? raw.sellingPrice : '',
        deposit: raw.deposit !== undefined ? raw.deposit : '',
        depositReceivedDate,

        // Legacy & Solar project technical fields
        customerName: fullName,
        phone: cleanPrimary,
        systemSizeKw: raw.systemSizeKw || 10.4,
        batteryRequired: raw.batteryRequired ?? true,
        propertyType: raw.propertyType || 'Residential Single-Storey',
        roofType: raw.roofType || 'Colorbond / Metal Sheet',
        phaseType: raw.phaseType || 'Single Phase',
        quarterlyBillAud: raw.quarterlyBillAud || 950,
        source: raw.platform || 'Google Sheet Sync',
        sheetSyncRowId: raw.sheetSyncRowId || `GSHEET_ROW_${Math.floor(100 + Math.random() * 900)}`,
        createdAt: raw.leadDate || todayDate,
        assignedTo: raw.salesPersonName || (dropdowns.salesPersons?.[0] || 'Mitchell Barnes')
      };
    });

    setLeads(prev => [...mappedLeads, ...prev]);
    return mappedLeads.length;
  };

  // Project Handlers
  const addProject = (proj: Omit<Project, 'id' | 'projectCode'>): Project => {
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const newProj: Project = {
      ...proj,
      id: `proj-${Date.now()}`,
      projectCode: `SOL-${proj.state}-${randNum}`
    };
    setProjects(prev => [newProj, ...prev]);
    return newProj;
  };

  const updateProject = (id: string, updated: Partial<Project>) => {
    setProjects(prev =>
      prev.map(p => {
        if (p.id !== id) return p;
        const merged: Project = { ...p, ...updated };
        const todayDate = new Date().toISOString().split('T')[0];

        // 1. If Installation Status changed to Closed, auto-populate Project Closed Date
        if (merged.installationStatus === 'Closed' && (!merged.projectClosedDate || p.installationStatus !== 'Closed')) {
          merged.projectClosedDate = todayDate;
        }

        // 2. Grid Application Status change date auto-updates
        if (updated.gridAppStatus && updated.gridAppStatus !== p.gridAppStatus) {
          if (updated.gridAppStatus === 'Grid Applied' && !merged.gridAppliedDate) {
            merged.gridAppliedDate = todayDate;
          } else if (updated.gridAppStatus === 'Grid Rejected' && !merged.gridRejectedDate) {
            merged.gridRejectedDate = todayDate;
          } else if (updated.gridAppStatus === 'Grid App Approved' && !merged.gridApprovalDate) {
            merged.gridApprovalDate = todayDate;
          }
        }

        // 3. Amount is auto-populated from Selling Price (AUD) and locked
        if (updated.sellingPrice !== undefined) {
          const formattedSellingPrice = typeof updated.sellingPrice === 'number'
            ? formatAudAccounts(updated.sellingPrice)
            : String(updated.sellingPrice);
          merged.amount = formattedSellingPrice;
          const parsedVal = parseAudAccounts(formattedSellingPrice);
          if (parsedVal > 0) {
            merged.contractValueAud = parsedVal;
          }
        }

        // 4. Postcode / Suburb auto-classification
        if (updated.postcode !== undefined) {
          merged.area = classifyAustralianPostcode(merged.postcode || '', String(merged.state));
        }
        if (updated.suburb !== undefined || updated.postcode !== undefined) {
          merged.nearestBigCity = getNearestBigCity(merged.suburb, merged.postcode || '', String(merged.state));
        }

        // 5. Customer name sync if first/last changed
        if (updated.firstName !== undefined || updated.lastName !== undefined) {
          merged.customerName = `${merged.firstName || ''} ${merged.lastName || ''}`.trim() || merged.customerName;
        }

        // 6. Mobile format
        if (updated.primaryMobile !== undefined) {
          merged.customerPhone = formatAustralianMobile(updated.primaryMobile);
          merged.primaryMobile = merged.customerPhone;
        }
        if (updated.secondaryMobile !== undefined) {
          merged.secondaryMobile = formatAustralianMobile(updated.secondaryMobile);
        }

        // 7. Project stage sync with status if compatible
        if (updated.projectStage && (!updated.status || updated.status === p.status)) {
          const stageToStatusMap: Record<string, ProjectStatus> = {
            'Site Survey': 'Site Survey',
            'DNSP Application Submitted': 'Engineering & DNSP Approval',
            'DNSP Approved': 'Engineering & DNSP Approval',
            'Stock Allocated': 'Sales Order Dispatched',
            'Installation Scheduled': 'Install Scheduled',
            'Install Scheduled': 'Install Scheduled',
            'Installation in Progress': 'Installation in Progress',
            'Installation Completed': 'Installation Completed',
            'BridgeSelect STC Claimed': 'BridgeSelect STC Claimed',
            'Grid Meter Connected': 'Grid Meter Connected',
            'Completed': 'Completed'
          };
          if (stageToStatusMap[updated.projectStage]) {
            merged.status = stageToStatusMap[updated.projectStage];
          }
        }

        // BridgeSelect Automated Push Trigger:
        // When installation_status is updated to "Booked", automatically invoke the push route
        const isNowBooked =
          (merged.installationStatus === 'Booked' || (merged as any).installation_status === 'Booked') &&
          p.installationStatus !== 'Booked' &&
          (p as any).installation_status !== 'Booked';

        if (isNowBooked) {
          fetch('/api/jobs/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobId: merged.id,
              installation_status: 'Booked',
              jobData: merged
            })
          }).catch(e => console.warn('[BridgeSelect Trigger] Auto-push trigger error:', e));
        }

        return merged;
      })
    );
  };

  const updateProjectStatus = (id: string, status: ProjectStatus) => {
    setProjects(prev =>
      prev.map(p => {
        if (p.id !== id) return p;
        const isNowCompleted = status === 'Completed';
        const updated = {
          ...p,
          status,
          completedDate: isNowCompleted ? new Date().toISOString().split('T')[0] : p.completedDate,
          installationDate: (status === 'Installation Completed' || isNowCompleted) && !p.installationDate
            ? new Date().toISOString().split('T')[0]
            : p.installationDate
        };

        // If completed, ensure maintenance record is created automatically (2 years from install date)
        if (isNowCompleted) {
          const installDate = updated.installationDate || new Date().toISOString().split('T')[0];
          const installD = new Date(installDate);
          const nextDue = new Date(installD.getFullYear() + 2, installD.getMonth(), installD.getDate());
          
          setMaintenanceRecords(mPrev => {
            const existing = mPrev.find(m => m.projectId === id);
            if (existing) return mPrev;
            return [
              {
                id: `maint-${Date.now()}`,
                projectId: id,
                projectCode: p.projectCode,
                customerId: p.customerId,
                customerName: p.customerName,
                customerPhone: p.customerPhone,
                customerEmail: p.customerEmail,
                address: p.address,
                state: p.state,
                installationDate: installDate,
                nextPeriodicServiceDueDate: nextDue.toISOString().split('T')[0],
                status: 'Pending',
                notes: 'Automatic 2-year maintenance scheduled on project completion.'
              },
              ...mPrev
            ];
          });
        }

        // Dispatch project milestone alert if status changed
        if (p.status !== status) {
          const customerEmail = p.customerEmail || (p.primaryMobile ? `${p.primaryMobile.replace(/\s+/g, '')}@customer.mysolarcrm.com.au` : 'customer@gmail.com');
          dispatchSystemAlert({
            type: 'project_milestone',
            title: `Project Milestone: ${p.projectCode} is now ${status}`,
            recipientEmail: customerEmail,
            recipientName: p.customerName || 'Valued Customer',
            data: {
              projectCode: p.projectCode,
              customerName: p.customerName,
              newStatus: status,
              previousStatus: p.status,
              systemSize: `${p.systemSizeKw} kW`,
              address: p.address,
              description: `Your solar installation has progressed to milestone "${status}". Our team will notify you of all subsequent inspections and meter reconnections.`
            }
          }).catch(e => console.warn('Project milestone alert dispatch failed:', e));
        }

        return updated;
      })
    );
  };

  const uploadProjectPhoto = (projectId: string, photo: { category: any; url: string }) => {
    setProjects(prev =>
      prev.map(p => {
        if (p.id !== projectId) return p;
        const currentPhotos = p.installedPhotos || [];
        const newPhoto = {
          id: `p-${Date.now()}`,
          category: photo.category,
          url: photo.url,
          uploadedAt: new Date().toISOString(),
          verified: true
        };
        return {
          ...p,
          installedPhotos: [...currentPhotos, newPhoto]
        };
      })
    );
  };

  // Tickets (Requirement: Only allow customer to raise ticket when project status is Completed!)
  const addTicket = (
    ticket: Omit<Ticket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt'>
  ): { success: boolean; message?: string; ticket?: Ticket } => {
    const project = projects.find(p => p.id === ticket.projectId);
    if (!project) {
      return { success: false, message: 'Project not found.' };
    }
    if (project.status !== 'Completed') {
      return {
        success: false,
        message: `Tickets can only be raised once Project Status is "Completed". Current project status is "${project.status}".`
      };
    }

    const randNum = Math.floor(100 + Math.random() * 900);
    const newTicket: Ticket = {
      ...ticket,
      id: `tkt-${Date.now()}`,
      ticketNumber: `TKT-${new Date().getFullYear()}-${randNum}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setTickets(prev => [newTicket, ...prev]);

    // Dispatch automated support ticket alert email
    const customerEmail = project.customerEmail || (project.primaryMobile ? `${project.primaryMobile.replace(/\s+/g, '')}@customer.mysolarcrm.com.au` : 'customer@gmail.com');
    dispatchSystemAlert({
      type: 'ticket_created',
      title: `Support Ticket Opened: #${newTicket.ticketNumber} - ${newTicket.title}`,
      recipientEmail: customerEmail,
      recipientName: newTicket.customerName || project.customerName,
      data: {
        ticketNumber: newTicket.ticketNumber,
        subject: newTicket.title,
        priority: newTicket.priority,
        category: newTicket.category,
        projectCode: project.projectCode,
        systemSize: `${project.systemSizeKw || '6.6'} kW`,
        description: newTicket.description || 'Solar warranty and maintenance ticket logged in Apex Solar ERP.'
      }
    }).catch(e => console.warn('Ticket alert dispatch failed:', e));

    return { success: true, ticket: newTicket };
  };

  const updateTicket = (id: string, updated: Partial<Ticket>) => {
    setTickets(prev =>
      prev.map(t =>
        t.id === id ? { ...t, ...updated, updatedAt: new Date().toISOString() } : t
      )
    );
  };

  // Maintenance Handlers
  const sendMaintenanceNotification = (id: string) => {
    setMaintenanceRecords(prev =>
      prev.map(m => {
        if (m.id !== id) return m;
        const updated = {
          ...m,
          status: 'Notification Sent' as const,
          lastNotificationSentAt: new Date().toISOString()
        };

        // Also record an automated SMS in MessageMedia log
        sendSMS(
          m.customerPhone,
          `AusSolar Service Reminder: Your solar system at ${m.address} is due for its 2-year periodic CEC safety inspection. Reply BOOK to schedule.`,
          m.customerId,
          m.projectId
        );

        return updated;
      })
    );
  };

  const completeMaintenance = (id: string, notes?: string) => {
    setMaintenanceRecords(prev =>
      prev.map(m =>
        m.id === id
          ? {
              ...m,
              status: 'Completed' as const,
              serviceCompletedDate: new Date().toISOString().split('T')[0],
              checklistPassed: true,
              notes: notes || '2-year comprehensive inspection completed successfully.'
            }
          : m
      )
    );
  };

  // Subcontractors
  const addSubContractor = (sub: Omit<SubContractor, 'id'>) => {
    const newSub: SubContractor = {
      ...sub,
      id: `sub-${Date.now()}`
    };
    setSubContractors(prev => [newSub, ...prev]);
  };

  const updateSubContractor = (id: string, updated: Partial<SubContractor>) => {
    setSubContractors(prev => prev.map(s => (s.id === id ? { ...s, ...updated } : s)));
  };

  // Sales Orders
  const addSalesOrder = (so: Omit<SalesOrder, 'id' | 'orderNumber'>) => {
    const randNum = Math.floor(100 + Math.random() * 900);
    const newSo: SalesOrder = {
      ...so,
      id: `so-${Date.now()}`,
      orderNumber: `SO-AU-${randNum}`
    };
    setSalesOrders(prev => [newSo, ...prev]);

    // Link back to project if relevant
    if (so.projectId) {
      updateProject(so.projectId, { salesOrderId: newSo.id });
    }
  };

  const updateSalesOrderStatus = (id: string, status: SalesOrder['status']) => {
    setSalesOrders(prev => prev.map(so => (so.id === id ? { ...so, status } : so)));
  };

  // Install Orders & RFQs
  const addInstallOrder = (io: Omit<InstallOrder, 'id' | 'orderNumber'>) => {
    const randNum = Math.floor(100 + Math.random() * 900);
    const newIo: InstallOrder = {
      ...io,
      id: `io-${Date.now()}`,
      orderNumber: `INST-${new Date().getFullYear()}-${randNum}`
    };
    setInstallOrders(prev => [newIo, ...prev]);

    if (io.projectId) {
      updateProject(io.projectId, { installOrderId: newIo.id, status: 'RFQ Sent to Installers' });
    }

    // Dispatch automated subcontractor install order alert
    const targetProject = projects.find(p => p.id === io.projectId);
    dispatchSystemAlert({
      type: 'install_dispatched',
      title: `Installation Job Order: ${newIo.orderNumber} - ${targetProject?.customerName || 'Solar Site'}`,
      recipientEmail: 'installers@solarinstallers.com.au',
      recipientName: 'CEC Accredited Solar Installers',
      data: {
        orderNumber: newIo.orderNumber,
        customerName: targetProject?.customerName || 'Customer',
        address: targetProject?.address || 'Site Address Pending',
        systemSize: `${targetProject?.systemSizeKw || '6.6'} kW`,
        panels: `${targetProject?.panelCount || 16}x Panels`,
        inverter: `${targetProject?.inverterBrand || 'Sungrow'} Inverter`,
        description: 'Clean Energy Council accredited installation work order ready for scheduling and quote confirmation.'
      }
    }).catch(e => console.warn('Install order alert dispatch failed:', e));
  };

  const submitInstallerQuote = (
    orderId: string,
    quote: {
      subcontractorId: string;
      subcontractorName: string;
      amountAud: number;
      estimatedDays: number;
      crewSize: number;
      notes: string;
    }
  ) => {
    setInstallOrders(prev =>
      prev.map(io => {
        if (io.id !== orderId) return io;
        const newQuote = {
          id: `q-${Date.now()}`,
          ...quote,
          submittedAt: new Date().toISOString().split('T')[0],
          status: 'Pending' as const
        };
        return {
          ...io,
          status: io.status === 'RFQ Sent' ? 'Quotes Received' : io.status,
          quotes: [...io.quotes, newQuote]
        };
      })
    );
  };

  const awardInstallOrder = (orderId: string, quoteId: string) => {
    setInstallOrders(prev =>
      prev.map(io => {
        if (io.id !== orderId) return io;
        const selectedQuote = io.quotes.find(q => q.id === quoteId);
        if (!selectedQuote) return io;

        const updatedQuotes = io.quotes.map(q => ({
          ...q,
          status: q.id === quoteId ? ('Accepted' as const) : ('Rejected' as const)
        }));

        // Also update project with installer and quoted price
        if (io.projectId) {
          updateProject(io.projectId, {
            subcontractorId: selectedQuote.subcontractorId,
            subcontractorName: selectedQuote.subcontractorName,
            installerQuotedAud: selectedQuote.amountAud,
            status: 'Install Scheduled'
          });
        }

        return {
          ...io,
          status: 'Awarded' as const,
          quotes: updatedQuotes,
          awardedSubcontractorId: selectedQuote.subcontractorId,
          awardedAmountAud: selectedQuote.amountAud
        };
      })
    );
  };

  // Reviews
  const addCustomerReview = (
    rev: Omit<CustomerReview, 'id' | 'createdAt' | 'published'>
  ) => {
    const newRev: CustomerReview = {
      ...rev,
      id: `rev-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      published: true
    };
    setCustomerReviews(prev => [newRev, ...prev]);
  };

  const togglePublishReview = (id: string) => {
    setCustomerReviews(prev =>
      prev.map(r => (r.id === id ? { ...r, published: !r.published } : r))
    );
  };

  const addReviewReply = (id: string, reply: string) => {
    setCustomerReviews(prev =>
      prev.map(r => (r.id === id ? { ...r, adminReply: reply } : r))
    );
  };

  // MessageMedia Outbound SMS via Supabase & Sinch Gateway
  const sendSMS = (recipientNumber: string, messageText: string, contactId?: string, projectId?: string) => {
    const senderNumber = currentUser.voipLineNumber || 'SolarFlow';
    const contact = contacts.find(c => c.id === contactId || c.phone === recipientNumber);
    const tempId = `sms-${Date.now()}`;

    // Optimistic record in local state
    const optimisticSms: MessageMediaSMS = {
      id: tempId,
      direction: 'outbound',
      senderNumber,
      recipientNumber,
      contactId: contact?.id || contactId,
      contactName: contact?.name,
      projectId,
      messageText,
      timestamp: new Date().toISOString(),
      status: 'sent',
      delivery_status: 'enroute'
    };

    setSmsMessages(prev => [optimisticSms, ...prev]);

    // Dispatch via Sinch MessageMedia backend route /api/sms/send
    sendOutboundSms({
      recipient_number: recipientNumber,
      message_body: messageText,
      contact_id: contact?.id || contactId,
      project_id: projectId,
      sender_id: senderNumber
    })
      .then(res => {
        if (res.success) {
          setSmsMessages(prev =>
            prev.map(m =>
              m.id === tempId
                ? {
                    ...m,
                    id: res.log?.id || m.id,
                    provider_message_id: res.messageId,
                    status: 'sent',
                    delivery_status: res.delivery_status || 'enroute'
                  }
                : m
            )
          );
        } else {
          setSmsMessages(prev =>
            prev.map(m =>
              m.id === tempId
                ? {
                    ...m,
                    status: 'failed_to_send',
                    delivery_status: 'failed',
                    error_message: res.error
                  }
                : m
            )
          );
        }
      })
      .catch(err => {
        console.error('[AppContext] Error sending outbound SMS:', err);
      });
  };

  // VoIP Calls
  const logVoIPCall = (call: Omit<VoIPCallLog, 'id' | 'timestamp'>) => {
    const newCall: VoIPCallLog = {
      ...call,
      id: `call-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    setVoipCalls(prev => [newCall, ...prev]);
  };

  // Dynamic Dropdown management
  const addDropdownItem = (category: keyof DynamicDropdownConfig, value: string) => {
    if (!value.trim()) return;
    setDropdowns(prev => {
      const current = (prev[category] as unknown as string[]) || [];
      if (Array.isArray(current) && current.includes(value.trim())) return prev;
      return {
        ...prev,
        [category]: [...current, value.trim()]
      };
    });
  };

  const removeDropdownItem = (category: keyof DynamicDropdownConfig, value: string) => {
    setDropdowns(prev => {
      const current = (prev[category] as unknown as string[]) || [];
      return {
        ...prev,
        [category]: current.filter(item => item !== value)
      };
    });
  };

  // Connected Domains (Employees authentication whitelist)
  const addConnectedDomain = (domain: string): boolean => {
    const cleaned = domain.trim().toLowerCase().replace(/^@/, '');
    if (!cleaned) return false;
    if (connectedDomains.includes(cleaned)) return false;
    setConnectedDomains(prev => [...prev, cleaned]);
    return true;
  };

  const removeConnectedDomain = (domain: string) => {
    setConnectedDomains(prev => prev.filter(d => d !== domain));
  };

  // HRMS Employees
  const addEmployee = (emp: Omit<UserProfile, 'id'>): { success: boolean; error?: string } => {
    const emailDomain = emp.email.split('@')[1]?.toLowerCase();
    if (!emailDomain || !connectedDomains.includes(emailDomain)) {
      return {
        success: false,
        error: `Domain "@${emailDomain}" is not in the Connected Domains whitelist. Employees must have an approved company domain (${connectedDomains.map(d => '@' + d).join(', ')}).`
      };
    }

    const newEmp: UserProfile = {
      ...emp,
      id: `usr-${Date.now()}`,
      assignedDomain: emailDomain
    };

    setEmployees(prev => [...prev, newEmp]);
    return { success: true };
  };

  const updateEmployee = (id: string, updated: Partial<UserProfile>) => {
    setEmployees(prev => prev.map(e => (e.id === id ? { ...e, ...updated } : e)));
    if (currentUser.id === id) {
      setCurrentUser(prev => ({ ...prev, ...updated }));
    }
  };

  // P&L Statement Calculator
  const calculatePL = (): ProjectPL[] => {
    return projects.map(p => {
      const so = salesOrders.find(s => s.projectId === p.id || s.id === p.salesOrderId);
      const io = installOrders.find(i => i.projectId === p.id || i.id === p.installOrderId);

      const contractRevenue = p.contractValueAud || 0;
      const internalStcRate = p.internalStcRateAud ?? systemRules.internalStcRateAud ?? systemRules.stcTradingRateAud ?? 39.50;
      const customerStcRate = p.customerStcRateAud ?? systemRules.customerStcRateAud ?? 36.00;

      // Internal STC claim amount (collected by company via BridgeSelect / CER, used to calculate business profit)
      const internalStcClaim = p.internalStcValueAud ?? Math.round((p.stcCount || 0) * internalStcRate);
      // Customer STC rebate amount (discount given to customer on tax invoice)
      const customerStcRebate = p.customerStcValueAud ?? Math.round((p.stcCount || 0) * customerStcRate);
      // STC spread margin retained by company
      const stcTradingMargin = internalStcClaim - customerStcRebate;

      const equipmentCost = so?.totalCostAud || (p.systemSizeKw * 650);
      const laborCost = io?.awardedAmountAud || p.installerQuotedAud || (p.systemSizeKw * 240);
      const complianceCost = 280; // CEC grid application + meter cert
      const totalCost = equipmentCost + laborCost + complianceCost;

      // Real Total Revenue for company = Customer Invoiced Contract + Internal STC Claim Cash
      const totalRealizedRevenue = contractRevenue + internalStcClaim;
      // Real Gross Profit = Total Realized Revenue - Total Direct Costs
      const grossProfit = totalRealizedRevenue - totalCost;
      const grossMarginPercentage = totalRealizedRevenue > 0 ? Math.round((grossProfit / totalRealizedRevenue) * 100) : 0;

      return {
        projectId: p.id,
        projectCode: p.projectCode,
        customerName: p.customerName,
        state: p.state,
        systemSizeKw: p.systemSizeKw,
        contractRevenueAud: contractRevenue,
        stcRebateAud: internalStcClaim, // backward compatibility
        customerStcRebateAud: customerStcRebate,
        internalStcClaimAud: internalStcClaim,
        stcTradingMarginAud: stcTradingMargin,
        totalRealizedRevenueAud: totalRealizedRevenue,
        equipmentSalesOrderCostAud: equipmentCost,
        equipmentCostAud: equipmentCost,
        subcontractorInstallLaborCostAud: laborCost,
        installerCostAud: laborCost,
        complianceAndPermitCostAud: complianceCost,
        totalCostAud: totalCost,
        grossProfitAud: grossProfit,
        grossMarginPercentage,
        marginPercentage: grossMarginPercentage
      };
    });
  };

  // Ticket status update helper
  const updateTicketStatus = (id: string, status: TicketStatus, resolutionNotes?: string) => {
    updateTicket(id, {
      status,
      ...(resolutionNotes ? { resolutionNotes } : {}),
      ...(status === 'Resolved' || status === 'Closed' ? { resolvedAt: new Date().toISOString().split('T')[0] } : {})
    });
  };

  // Connected domain helper for single domain views
  const connectedDomain = connectedDomains[0] || 'solarinstallers.com.au';
  const setConnectedDomain = (domain: string) => {
    const cleaned = domain.trim().toLowerCase().replace(/^@/, '');
    if (!cleaned) return;
    setConnectedDomains(prev => [cleaned, ...prev.filter(d => d !== cleaned)]);
  };

  // Dedicated Portal Addresses Handlers (Customer vs Installer)
  const updatePortalAddress = (
    portalType: 'customer' | 'installer',
    updates: Partial<PortalAddressConfig>
  ) => {
    setPortalAddresses(prev => {
      const key = portalType === 'customer' ? 'customerPortal' : 'installerPortal';
      return {
        ...prev,
        [key]: {
          ...prev[key],
          ...updates,
          lastUpdated: new Date().toISOString()
        }
      };
    });
  };

  const updatePortalRoutingSettings = (
    updates: Partial<Pick<SystemPortalAddresses, 'enforceSeparateLogins' | 'enableAutoRouting'>>
  ) => {
    setPortalAddresses(prev => ({
      ...prev,
      ...updates
    }));
  };

  const resetPortalAddresses = () => {
    setPortalAddresses(INITIAL_PORTAL_ADDRESSES);
  };

  // Leave Requests Handlers
  const addLeaveRequest = (req: Omit<LeaveRequest, 'id' | 'createdAt'>) => {
    const newReq: LeaveRequest = {
      ...req,
      id: `leave-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setLeaveRequests(prev => [newReq, ...prev]);
  };

  const updateLeaveStatus = (id: string, status: 'Pending' | 'Approved' | 'Rejected') => {
    setLeaveRequests(prev =>
      prev.map(r => (r.id === id ? { ...r, status } : r))
    );
  };

  // Integrations Handlers
  const toggleIntegration = (id: string) => {
    setIntegrations(prev =>
      prev.map(i => (i.id === id ? { ...i, enabled: !i.enabled } : i))
    );
  };

  // Dropdown options configurations for Settings View
  const dropdownCategoryLabels: Record<string, string> = {
    states: 'Australian States & Territories (State Dropdown)',
    platforms: 'Lead Inbound Platforms (Meta, Google, Forms, Referral)',
    salesPersons: 'Sales Representatives & Closers (Sale Person Name)',
    leadStatuses: 'Lead Pipeline Stages & Statuses (Lead Status)',
    contactTypes: 'Contact Classifications & Types',
    companyTypes: 'Company Classifications & Types',
    panelBrands: 'Solar PV Panel Brands (CEC Approved)',
    inverterBrands: 'Solar Inverter Brands',
    batteryBrands: 'Battery Storage Brands',
    leadSources: 'Lead Sources & Channels',
    roofTypes: 'Roof Types & Mounting Profiles',
    projectStatuses: 'Project Pipeline Stages',
    ticketCategories: 'Support & Post-Install Issue Categories',
    ticketPriorities: 'Ticket Priority Levels',
    dnspsNSW: 'NSW Electricity Distribution Networks (DNSPs)',
    dnspsQLD: 'QLD Electricity Distribution Networks (DNSPs)',
    employeeDepartments: 'Staff & Team Departments',
    referralPaymentStatuses: 'Referral Bonus Payment Statuses',
    houseStoreys: 'House Storey (Single, Double, Triple, Split Level)',
    phases: 'Electrical Grid Phase (Single Phase, Three Phase)',
    docsReceivedOptions: 'Documentation Received Status (Docs Received?)',
    existingSystemTemplates: 'Existing System Details Presets',

    // Project Dropdowns
    projectStages: 'Project Stages (Project Stage)',
    electricityDistributors: 'Electricity Distributors / DNSPs',
    energyRetailers: 'Energy Retailers',
    gridApplicationStatuses: 'Grid Application Statuses',
    installationStatuses: 'Installation Statuses',
    installationBookedByOptions: 'Installation Booked By Options',
    installationMonths: 'Installation Completed Months',
    installationDocsStatuses: 'Installation Documents Statuses',
    installerInvoiceStatuses: 'Installer Invoice Statuses',
    warehouses: 'Warehouses & Logistics Hubs',
    warehouseInvoiceStatuses: 'Warehouse Invoice Statuses',
    stockStatuses: 'Stock & Warehouse Statuses',
    isFinanceOptions: 'Is On Finance Options',
    financeCompanies: 'Finance Companies',
    financeStatuses: 'Finance Application Statuses',
    stcPortals: 'STC Traded Portals',
    stcStatuses: 'STC Claims & CER Statuses',
    ebCustomerNameMatchOptions: 'EB Checklist: Customer Name Match',
    ebAddressMatchOptions: 'EB Checklist: Property Address Match',
    ebMeterMatchOptions: 'EB Checklist: Meter Number Match',
    ebMeterPhaseOptions: 'EB Checklist: Meter Phase Confirm',
    ebOpenSolarSystemMatchOptions: 'EB Checklist: OpenSolar System Match',
    ebOpenSolarPricingMatchOptions: 'EB Checklist: OpenSolar Pricing & STC Match',

    // Ticket Management Dropdowns
    ticketIssueRecordedOptions: 'Ticket: Issue Recorded Options',
    ticketInitialCheckOptions: 'Ticket: Initial Check Options',
    ticketWorkRequiredOptions: 'Ticket: Work Required Presets',
    ticketIssueResolutionStatuses: 'Ticket: Issue Resolution Statuses',
    ticketWarrantyClaimStatuses: 'Ticket: Warranty Claim Statuses',
    ticketWarrantyClaimInvoiceStatuses: 'Ticket: Warranty Claim Invoice Statuses',
    ticketBrandNotesPresets: 'Ticket: Brand Notes Presets',
    ticketServiceIssueNotesPresets: 'Ticket: Service Issue Notes Presets',
    ticketInstallerNotesPresets: 'Ticket: Installer / Electrician Notes Presets'
  };

  const dropdownConfigs: DropdownCategoryConfig[] = Object.keys(dropdownCategoryLabels).map(key => {
    const rawVal = dropdowns[key as keyof DynamicDropdownConfig];
    const options: string[] = Array.isArray(rawVal)
      ? rawVal.map((x: any) => (typeof x === 'string' ? x : x.name || x.model || x.manufacturer || String(x)))
      : [];
    return {
      key,
      label: dropdownCategoryLabels[key] || key,
      options
    };
  });

  const resolveDropdownKey = (categoryKey: string): keyof DynamicDropdownConfig => {
    if (categoryKey in dropdownCategoryLabels) {
      return categoryKey as keyof DynamicDropdownConfig;
    }
    const camel = categoryKey.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()) as keyof DynamicDropdownConfig;
    if (camel in dropdownCategoryLabels) {
      return camel;
    }
    return 'panelBrands';
  };

  const addDropdownOption = (categoryKey: string, value: string) => {
    const key = resolveDropdownKey(categoryKey);
    addDropdownItem(key, value);
  };

  const removeDropdownOption = (categoryKey: string, value: string) => {
    const key = resolveDropdownKey(categoryKey);
    removeDropdownItem(key, value);
  };

  const batchImportDropdowns = (
    summary: DropdownImportSummary,
    mode: 'merge' | 'replace' = 'merge'
  ) => {
    let result = { addedCount: 0, updatedCount: 0, deletedCount: 0, categoriesModified: 0 };
    setDropdowns(prev => {
      const outcome = applyDropdownImport(prev, summary, mode);
      result = {
        addedCount: outcome.addedCount,
        updatedCount: outcome.updatedCount,
        deletedCount: outcome.deletedCount,
        categoriesModified: outcome.categoriesModified
      };
      return outcome.updatedDropdowns;
    });
    return result;
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        activeRole,
        setActiveRole,
        setCurrentUser,
        availableUsers: systemUsers,

        companyProfile,
        updateCompanyProfile,
        resetCompanyProfile,

        notifications,
        unreadNotificationsCount,
        markNotificationRead,
        markAllNotificationsRead,
        clearNotifications,
        addNotification,

        systemUsers,
        addSystemUser,
        updateSystemUser,
        deleteSystemUser,
        setUserPassword,
        sendUserInvite,
        getUserInviteLink,

        accessRoles,
        updateRoleAccess,

        // Dynamic Features & System Functionalities
        systemFeatures,
        updateSystemFeature,
        toggleSystemFeature,
        resetSystemFeatures,
        isFeatureEnabled,

        // Dynamic Operational Rules
        systemRules,
        updateSystemRules,
        resetSystemRules,
        recalculateAllProjectsStc,

        // Dynamic Roles & Access Control
        dynamicRoles,
        addDynamicRole,
        updateDynamicRole,
        deleteDynamicRole,
        cloneDynamicRole,
        resetDynamicRoles,
        hasPermission,
        hasSpecialAction,
        getActiveRoleConfig,

        selectedCustomerId,
        setSelectedCustomerId,
        selectedInstallerId,
        setSelectedInstallerId,

        contacts,
        addContact,
        updateContact,
        deleteContact,
        addContactAddress,
        updateContactAddress,
        removeContactAddress,
        deleteContactAddress: removeContactAddress,

        referralBonuses,
        addReferralBonus,
        updateReferralBonus,
        deleteReferralBonus,
        addReferralAttachment,
        removeReferralAttachment,

        companies,
        addCompany,
        updateCompany,
        deleteCompany,

        leads,
        addLead,
        updateLead,
        convertLeadToProject,
        syncGoogleSheetLeads,
        addLeadActivity,
        toggleLeadActivityTask,
        deleteLeadActivity,

        projects,
        addProject,
        updateProject,
        updateProjectStatus,
        uploadProjectPhoto,

        tickets,
        addTicket,
        updateTicket,
        updateTicketStatus,

        maintenanceRecords,
        sendMaintenanceNotification,
        completeMaintenance,

        subContractors,
        addSubContractor,
        updateSubContractor,

        salesOrders,
        addSalesOrder,
        updateSalesOrderStatus,

        installOrders,
        addInstallOrder,
        submitInstallerQuote,
        awardInstallOrder,

        customerReviews,
        addCustomerReview,
        togglePublishReview,
        addReviewReply,

        smsMessages,
        sendSMS,

        voipCalls,
        logVoIPCall,

        dropdowns,
        setDropdowns,
        addDropdownItem,
        removeDropdownItem,
        dropdownConfigs,
        addDropdownOption,
        removeDropdownOption,
        batchImportDropdowns,

        connectedDomains,
        connectedDomain,
        setConnectedDomain,
        addConnectedDomain,
        removeConnectedDomain,

        portalAddresses,
        updatePortalAddress,
        updatePortalRoutingSettings,
        resetPortalAddresses,

        employees,
        addEmployee,
        updateEmployee,

        leaveRequests,
        addLeaveRequest,
        updateLeaveStatus,

        integrations,
        toggleIntegration,

        calculatePL,

        isAuthenticated,
        login,
        logout,

        themeMode,
        setThemeMode,

        leadsViewMode,
        setLeadsViewMode,
        projectsViewMode,
        setProjectsViewMode,
        ticketsViewMode,
        setTicketsViewMode,

        isVoipDialerOpen,
        setIsVoipDialerOpen,
        isQuickSmsOpen,
        setIsQuickSmsOpen,
        selectedPreviewProposalUrl,
        setSelectedPreviewProposalUrl,
        activeBridgeSelectProject,
        setActiveBridgeSelectProject,

        addLeadAttachment,
        deleteLeadAttachment,
        sendCustomerPortalInvite,
        createLeadXeroInvoice,
        generateLeadXeroReceipt,
        xeroPaymentReceipts,
        addCustomerUpload
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
