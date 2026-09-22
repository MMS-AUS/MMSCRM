import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  Ban,
  DollarSign,
  Users,
  Building,
  FileText,
  Sliders,
  Check,
  Search,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Clock,
  Send,
  X,
  CreditCard,
  Link2,
  Unlink,
  Key,
  HelpCircle
} from 'lucide-react';
import {
  getXeroSettings,
  saveXeroSettings,
  fetchXeroStatusFromBackend,
  fetchXeroSetupInfo,
  initiateXeroOAuthLogin,
  disconnectXeroLive,
  refreshXeroTokenLive,
  fetchLiveXeroInvoices,
  clearXeroSampleData,
  getXeroInvoices,
  saveXeroInvoices,
  createXeroInvoice,
  updateXeroInvoice,
  voidXeroInvoice,
  getXeroQuotations,
  saveXeroQuotations,
  createXeroQuotation,
  updateXeroQuotation,
  voidXeroQuotation,
  convertQuotationToInvoice,
  getXeroBills,
  saveXeroBills,
  createXeroBill,
  updateXeroBill,
  voidXeroBill,
  getXeroContactSyncItems,
  syncAllContactsWithXero,
  syncSingleContactWithXero,
  pingXeroApi,
  XeroPingResult,
  XeroLiveStatusResponse,
  XeroSetupInfo
} from '../../services/xeroService';
import {
  XeroIntegrationSettings,
  XeroInvoice,
  XeroQuotation,
  XeroBill,
  XeroContactSyncItem,
  XeroLineItem,
  XeroInvoiceStatus,
  XeroQuoteStatus,
  XeroBillStatus
} from '../../types';

interface XeroSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'invoices' | 'quotes' | 'bills' | 'contacts' | 'config';
}

export const XeroSettingsModal: React.FC<XeroSettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'invoices'
}) => {
  const { contacts = [], subContractors = [], projects = [] } = useApp();
  const [activeTab, setActiveTab] = useState<'invoices' | 'quotes' | 'bills' | 'contacts' | 'config'>(initialTab);

  // Core data states
  const [settings, setSettings] = useState<XeroIntegrationSettings>(getXeroSettings);
  const [invoices, setInvoices] = useState<XeroInvoice[]>(getXeroInvoices);
  const [quotes, setQuotes] = useState<XeroQuotation[]>(getXeroQuotations);
  const [bills, setBills] = useState<XeroBill[]>(getXeroBills);
  const [syncedContacts, setSyncedContacts] = useState<XeroContactSyncItem[]>(getXeroContactSyncItems);

  // Live OAuth & Backend Diagnostic States
  const [backendStatus, setBackendStatus] = useState<XeroLiveStatusResponse | null>(null);
  const [setupInfo, setSetupInfo] = useState<XeroSetupInfo | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [isSyncingLiveInvoices, setIsSyncingLiveInvoices] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Search & filter states
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('ALL');

  const [quoteSearch, setQuoteSearch] = useState('');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<string>('ALL');

  const [billSearch, setBillSearch] = useState('');
  const [billStatusFilter, setBillStatusFilter] = useState<string>('ALL');

  const [contactSearch, setContactSearch] = useState('');
  const [contactTypeFilter, setContactTypeFilter] = useState<string>('ALL');

  // Modal dialog states
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<XeroInvoice | null>(null);

  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<XeroQuotation | null>(null);

  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<XeroBill | null>(null);

  // Void confirmation dialog state
  const [voidTarget, setVoidTarget] = useState<{
    type: 'invoice' | 'quote' | 'bill';
    id: string;
    number: string;
  } | null>(null);
  const [voidReasonInput, setVoidReasonInput] = useState('');

  // Status & action notifications
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<XeroPingResult | null>(null);

  const loadLiveStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const [status, info] = await Promise.all([
        fetchXeroStatusFromBackend(),
        fetchXeroSetupInfo()
      ]);
      setBackendStatus(status);
      setSetupInfo(info);
      setSettings(getXeroSettings());
    } catch (e) {
      console.error('[Xero Modal] Error loading status:', e);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSettings(getXeroSettings());
      setInvoices(getXeroInvoices());
      setQuotes(getXeroQuotations());
      setBills(getXeroBills());
      setSyncedContacts(getXeroContactSyncItems());
      setActiveTab(initialTab);
      loadLiveStatus();

      // Check URL parameters for OAuth redirect notifications
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const xeroParam = urlParams.get('xero');
        const tenantParam = urlParams.get('tenant');
        const errorParam = urlParams.get('xero_error');

        if (xeroParam === 'connected') {
          showNotification(`Successfully connected to Xero! Active Tenant: ${tenantParam || 'Connected Org'}. Tokens stored in Supabase.`);
          setActiveTab('config');
          // Clear query params cleanly
          const newUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, '', newUrl);
        } else if (errorParam) {
          showNotification(`Xero OAuth Error: ${decodeURIComponent(errorParam)}`);
          setActiveTab('config');
          const newUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, '', newUrl);
        }
      }
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 7000);
  };

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  /**
   * 4.A & 5: Primary Action - Direct OAuth 2.0 Login to Xero
   */
  const handleConnectToXero = () => {
    initiateXeroOAuthLogin();
  };

  /**
   * 4.C & 5: Disconnect Action - Revokes Xero tokens & deletes record from Supabase
   */
  const handleDisconnectXero = async () => {
    if (confirm('Are you sure you want to disconnect from Xero? This will revoke the OAuth token and delete the credentials record from your Supabase database.')) {
      try {
        const res = await disconnectXeroLive();
        setSettings(getXeroSettings());
        await loadLiveStatus();
        showNotification(res.message || 'Xero integration disconnected and credentials removed from Supabase.');
      } catch (err: any) {
        showNotification(`Error disconnecting: ${err.message}`);
      }
    }
  };

  /**
   * 4.B: Manual Token Refresh test
   */
  const handleRefreshToken = async () => {
    setIsRefreshingToken(true);
    try {
      const res = await refreshXeroTokenLive();
      if (res.success) {
        showNotification(`Xero token pair refreshed! New expiry: ${res.expiresAt ? new Date(res.expiresAt).toLocaleTimeString() : 'Active'}`);
        await loadLiveStatus();
      } else {
        showNotification(`Failed to refresh token: ${res.error}`);
      }
    } finally {
      setIsRefreshingToken(false);
    }
  };

  /**
   * Pull live invoices directly from Xero Cloud Accounting API
   */
  const handleSyncLiveInvoices = async () => {
    setIsSyncingLiveInvoices(true);
    try {
      const live = await fetchLiveXeroInvoices();
      if (live && live.length > 0) {
        // Map to local XeroInvoice model
        const mapped: XeroInvoice[] = live.map((inv: any) => ({
          id: inv.InvoiceID || `xinv-${Date.now()}`,
          type: 'ACCREC' as const,
          invoiceNumber: inv.InvoiceNumber || 'INV-LIVE',
          contactId: inv.Contact?.ContactID || '',
          contactName: inv.Contact?.Name || 'Xero Client',
          contactEmail: inv.Contact?.EmailAddress,
          date: inv.DateString || new Date().toISOString().split('T')[0],
          dueDate: inv.DueDateString || new Date().toISOString().split('T')[0],
          status: (inv.Status || 'AUTHORISED') as XeroInvoiceStatus,
          reference: inv.Reference || '',
          currencyCode: inv.CurrencyCode || 'AUD',
          lineItems: (inv.LineItems || []).map((li: any, idx: number) => ({
            id: li.LineItemID || `li-${idx}`,
            description: li.Description || 'Solar Component',
            quantity: li.Quantity || 1,
            unitAmount: li.UnitAmount || 0,
            accountCode: li.AccountCode || '200',
            taxType: li.TaxType || 'OUTPUT2',
            taxAmount: li.TaxAmount || 0,
            lineAmount: li.LineAmount || 0
          })),
          subTotal: inv.SubTotal || 0,
          totalTax: inv.TotalTax || 0,
          total: inv.Total || 0,
          amountPaid: inv.AmountPaid || 0,
          amountDue: inv.AmountDue || 0,
          updatedAt: inv.UpdatedDateUTC || new Date().toISOString()
        }));

        saveXeroInvoices(mapped);
        setInvoices(mapped);
        showNotification(`Fetched ${mapped.length} live invoices directly from Xero Cloud!`);
      } else {
        showNotification('Connected to Xero, but no invoices were found in this Xero tenant.');
      }
    } catch (err: any) {
      showNotification(`Failed to fetch live invoices: ${err.message}`);
    } finally {
      setIsSyncingLiveInvoices(false);
    }
  };

  // -------------------------------------------------------------
  // INVOICE HANDLERS
  // -------------------------------------------------------------
  const handleOpenCreateInvoice = () => {
    setEditingInvoice(null);
    setIsInvoiceModalOpen(true);
  };

  const handleOpenEditInvoice = (inv: XeroInvoice) => {
    setEditingInvoice(inv);
    setIsInvoiceModalOpen(true);
  };

  const handleConfirmVoid = () => {
    if (!voidTarget) return;
    if (voidTarget.type === 'invoice') {
      voidXeroInvoice(voidTarget.id, voidReasonInput);
      setInvoices(getXeroInvoices());
      showNotification(`Invoice ${voidTarget.number} has been voided in Xero.`);
    } else if (voidTarget.type === 'quote') {
      voidXeroQuotation(voidTarget.id, voidReasonInput);
      setQuotes(getXeroQuotations());
      showNotification(`Quotation ${voidTarget.number} has been voided.`);
    } else if (voidTarget.type === 'bill') {
      voidXeroBill(voidTarget.id, voidReasonInput);
      setBills(getXeroBills());
      showNotification(`Bill ${voidTarget.number} has been voided.`);
    }
    setVoidTarget(null);
    setVoidReasonInput('');
  };

  const handleConvertQuote = (quoteId: string) => {
    const inv = convertQuotationToInvoice(quoteId);
    if (inv) {
      setInvoices(getXeroInvoices());
      setQuotes(getXeroQuotations());
      showNotification(`Quotation converted to Xero Invoice ${inv.invoiceNumber} (Authorised)!`);
    }
  };

  // -------------------------------------------------------------
  // TWO-WAY CONTACT SYNC HANDLER
  // -------------------------------------------------------------
  const handleSyncAllContacts = async () => {
    setIsSyncingContacts(true);
    try {
      const res = await syncAllContactsWithXero(contacts, subContractors);
      setSyncedContacts(getXeroContactSyncItems());
      showNotification(res.message);
    } catch (err: any) {
      showNotification(`Contact sync error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSyncingContacts(false);
    }
  };

  const handleSyncSingleContact = (item: XeroContactSyncItem) => {
    syncSingleContactWithXero(
      item.crmContactId,
      item.name,
      item.email,
      item.phone,
      item.contactType
    );
    setSyncedContacts(getXeroContactSyncItems());
    showNotification(`Contact ${item.name} synced with Xero Accounting.`);
  };

  // -------------------------------------------------------------
  // PING XERO API
  // -------------------------------------------------------------
  const handleTestXeroPing = async () => {
    setIsPinging(true);
    setPingResult(null);
    try {
      const res = await pingXeroApi();
      setPingResult(res);
    } finally {
      setIsPinging(false);
    }
  };

  // -------------------------------------------------------------
  // SAVE CONFIG SETTINGS
  // -------------------------------------------------------------
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveXeroSettings(settings);
    setSettings(updated);
    showNotification('Xero settings and Chart of Accounts mappings saved successfully.');
  };

  // Filtered lists
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      inv.contactName.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      (inv.reference || '').toLowerCase().includes(invoiceSearch.toLowerCase());
    const matchesStatus = invoiceStatusFilter === 'ALL' || inv.status === invoiceStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredQuotes = quotes.filter(q => {
    const matchesSearch =
      q.quoteNumber.toLowerCase().includes(quoteSearch.toLowerCase()) ||
      q.contactName.toLowerCase().includes(quoteSearch.toLowerCase()) ||
      q.title.toLowerCase().includes(quoteSearch.toLowerCase());
    const matchesStatus = quoteStatusFilter === 'ALL' || q.status === quoteStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredBills = bills.filter(b => {
    const matchesSearch =
      b.billNumber.toLowerCase().includes(billSearch.toLowerCase()) ||
      b.contactName.toLowerCase().includes(billSearch.toLowerCase()) ||
      (b.reference || '').toLowerCase().includes(billSearch.toLowerCase());
    const matchesStatus = billStatusFilter === 'ALL' || b.status === billStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredContacts = syncedContacts.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.xeroContactId.toLowerCase().includes(contactSearch.toLowerCase());
    const matchesType = contactTypeFilter === 'ALL' || c.contactType === contactTypeFilter;
    return matchesSearch && matchesType;
  });

  // Financial Metrics
  const totalInvoicedAud = invoices.filter(i => i.status !== 'VOIDED').reduce((sum, i) => sum + i.total, 0);
  const totalReceivableDueAud = invoices
    .filter(i => i.status === 'AUTHORISED')
    .reduce((sum, i) => sum + i.amountDue, 0);
  const totalPaidAud = invoices.reduce((sum, i) => sum + i.amountPaid, 0);

  const totalBillsAud = bills.filter(b => b.status !== 'VOIDED').reduce((sum, b) => sum + b.total, 0);
  const totalPayableDueAud = bills
    .filter(b => b.status === 'AUTHORISED')
    .reduce((sum, b) => sum + b.amountDue, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4">
      <div className="w-full max-w-5xl bg-[#1e1e1e] rounded-xl shadow-2xl border border-[#2d2d2d] overflow-hidden flex flex-col max-h-[94vh] text-[#e5e7eb]">
        {/* Header */}
        <div className="p-4 bg-[#161616] text-white flex items-center justify-between border-b border-[#262626]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg text-white">
                  Xero Cloud Accounting &amp; Financial Operations
                </h3>
                {(backendStatus?.connected || settings.isConnected) ? (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Connected
                  </span>
                ) : (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-bold font-mono flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                    Not Connected
                  </span>
                )}
                {backendStatus?.tokenStorage === 'supabase' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 font-mono">
                    Supabase Synced
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {(backendStatus?.connected || settings.isConnected)
                  ? `Active Tenant: ${backendStatus?.tenantName || settings.organizationName || 'Live Organisation'} • Tenant ID: ${backendStatus?.tenantId || settings.tenantId || 'Active'}`
                  : 'No Xero account connected. Click "Connect to Xero" to initiate OAuth 2.0 authorization.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#262626] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Account Status & Connection Switcher Banner */}
        <div
          className={`px-4 py-2.5 border-b text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
            (backendStatus?.connected || settings.isConnected)
              ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-200'
              : 'bg-sky-950/20 border-sky-500/20 text-sky-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 shrink-0 text-sky-400" />
            <span>
              {(backendStatus?.connected || settings.isConnected) ? (
                <>
                  Connected to: <strong>{backendStatus?.tenantName || settings.organizationName || 'Xero Production Account'}</strong>
                  {backendStatus?.expiresAt && (
                    <span className="text-gray-400 ml-2">
                      (Token expires: {new Date(backendStatus.expiresAt).toLocaleTimeString()})
                    </span>
                  )}
                </>
              ) : (
                <>
                  <strong>OAuth 2.0 Ready:</strong> Click &quot;Connect to Xero&quot; to authorize your live business organization with offline sync.
                </>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(backendStatus?.connected || settings.isConnected) ? (
              <>
                <button
                  type="button"
                  onClick={handleRefreshToken}
                  disabled={isRefreshingToken}
                  className="px-2.5 py-1 bg-[#222] hover:bg-[#2c2c2c] text-sky-300 hover:text-sky-200 border border-sky-500/30 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                  title="Refresh OAuth token pair"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshingToken ? 'animate-spin' : ''}`} />
                  <span>Refresh Token</span>
                </button>
                <button
                  type="button"
                  onClick={handleDisconnectXero}
                  className="px-2.5 py-1 bg-[#222] hover:bg-[#2c2c2c] text-red-400 hover:text-red-300 border border-red-500/30 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                  title="Disconnect and remove credentials from Supabase"
                >
                  <Unlink className="w-3 h-3" />
                  <span>Disconnect</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleConnectToXero}
                className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-black font-extrabold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Connect to Xero</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-[#262626] bg-[#141414] px-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 shrink-0 transition-colors ${
              activeTab === 'invoices'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Invoices (ACCREC)</span>
            <span className="px-1.5 py-0.2 bg-[#262626] text-gray-300 text-[10px] rounded-full ml-1">
              {invoices.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('quotes')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 shrink-0 transition-colors ${
              activeTab === 'quotes'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Quotations (Quotes)</span>
            <span className="px-1.5 py-0.2 bg-[#262626] text-gray-300 text-[10px] rounded-full ml-1">
              {quotes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('bills')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 shrink-0 transition-colors ${
              activeTab === 'bills'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Bills &amp; Expenses (ACCPAY)</span>
            <span className="px-1.5 py-0.2 bg-[#262626] text-gray-300 text-[10px] rounded-full ml-1">
              {bills.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('contacts')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 shrink-0 transition-colors ${
              activeTab === 'contacts'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Two-Way Contacts Sync</span>
            <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full ml-1">
              {syncedContacts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 shrink-0 transition-colors ${
              activeTab === 'config'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Settings &amp; Chart of Accounts</span>
          </button>
        </div>

        {/* Modal Notification Banner */}
        {actionNotice && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-4 py-2.5 flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* ========================================================= */}
          {/* TAB 1: INVOICES (CREATE, EDIT, VOID)                      */}
          {/* ========================================================= */}
          {activeTab === 'invoices' && (
            <div className="space-y-4">
              {/* Metric Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#161616] border border-[#262626]">
                  <span className="text-[11px] text-gray-400 font-bold uppercase">Total Invoiced (AUD)</span>
                  <p className="text-xl font-extrabold text-white mt-0.5">
                    ${totalInvoicedAud.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[11px] text-gray-500">Gross solar system sales</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#161616] border border-[#262626]">
                  <span className="text-[11px] text-amber-400 font-bold uppercase">Outstanding Receivable Due</span>
                  <p className="text-xl font-extrabold text-amber-300 mt-0.5">
                    ${totalReceivableDueAud.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[11px] text-gray-500">Awaiting customer payment</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#161616] border border-[#262626]">
                  <span className="text-[11px] text-emerald-400 font-bold uppercase">Total Collected / Paid</span>
                  <p className="text-xl font-extrabold text-emerald-300 mt-0.5">
                    ${totalPaidAud.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[11px] text-gray-500">Reconciled via bank feed</span>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={invoiceSearch}
                      onChange={e => setInvoiceSearch(e.target.value)}
                      placeholder="Search Invoice #, customer, reference..."
                      className="w-full text-xs pl-8 pr-3 py-2 bg-[#141414] border border-[#262626] rounded-lg text-white outline-none focus:border-sky-400"
                    />
                  </div>

                  <select
                    value={invoiceStatusFilter}
                    onChange={e => setInvoiceStatusFilter(e.target.value)}
                    className="text-xs bg-[#141414] border border-[#262626] rounded-lg px-2.5 py-2 text-gray-200 outline-none focus:border-sky-400"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="AUTHORISED">Authorised</option>
                    <option value="PAID">Paid</option>
                    <option value="VOIDED">Voided</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={handleSyncLiveInvoices}
                    disabled={isSyncingLiveInvoices}
                    className="px-3.5 py-2 bg-[#242424] hover:bg-[#2e2e2e] text-sky-400 hover:text-sky-300 border border-sky-500/30 font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                    title="Fetch live authorized invoices from connected Xero tenant"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingLiveInvoices ? 'animate-spin' : ''}`} />
                    <span>{isSyncingLiveInvoices ? 'Syncing Xero...' : 'Fetch from Xero Cloud'}</span>
                  </button>

                  <button
                    onClick={handleOpenCreateInvoice}
                    className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-black font-extrabold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Invoice in Xero</span>
                  </button>
                </div>
              </div>

              {/* Invoices Table */}
              <div className="bg-[#161616] rounded-xl border border-[#262626] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#121212] text-gray-400 border-b border-[#262626] uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3">Invoice #</th>
                        <th className="p-3">Customer Contact</th>
                        <th className="p-3">Issue Date</th>
                        <th className="p-3">Due Date</th>
                        <th className="p-3">Total (AUD)</th>
                        <th className="p-3">Balance Due</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#262626]">
                      {filteredInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-gray-400 text-xs">
                            No invoices matching filters. Click "+ Create Invoice in Xero" to create one.
                          </td>
                        </tr>
                      ) : (
                        filteredInvoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-[#1a1a1a] transition-colors">
                            <td className="p-3">
                              <span className="font-mono font-bold text-white block">{inv.invoiceNumber}</span>
                              {inv.reference && (
                                <span className="text-[10px] text-gray-500 font-mono">Ref: {inv.reference}</span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-gray-200 block">{inv.contactName}</span>
                              <span className="text-[11px] text-gray-400">{inv.contactEmail}</span>
                            </td>
                            <td className="p-3 text-gray-300 font-mono text-[11px]">{inv.date}</td>
                            <td className="p-3 text-gray-300 font-mono text-[11px]">{inv.dueDate}</td>
                            <td className="p-3 font-mono font-bold text-white">
                              ${inv.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 font-mono font-bold">
                              {inv.status === 'PAID' ? (
                                <span className="text-emerald-400">$0.00</span>
                              ) : inv.status === 'VOIDED' ? (
                                <span className="text-gray-500 line-through">$0.00</span>
                              ) : (
                                <span className="text-amber-300">
                                  ${inv.amountDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                  inv.status === 'PAID'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : inv.status === 'AUTHORISED'
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                    : inv.status === 'DRAFT'
                                    ? 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                                    : 'bg-red-500/20 text-red-300 border-red-500/30'
                                }`}
                              >
                                {inv.status}
                              </span>
                              {inv.voidReason && (
                                <span className="text-[10px] text-red-400 block mt-0.5 truncate max-w-[120px]" title={inv.voidReason}>
                                  {inv.voidReason}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {inv.status !== 'VOIDED' && (
                                  <>
                                    <button
                                      onClick={() => handleOpenEditInvoice(inv)}
                                      className="p-1.5 rounded-lg bg-[#222] hover:bg-[#2e2e2e] text-gray-300 hover:text-white transition-colors"
                                      title="Edit Invoice"
                                    >
                                      <Edit2 className="w-3.5 h-3.5 text-sky-400" />
                                    </button>

                                    <button
                                      onClick={() =>
                                        setVoidTarget({
                                          type: 'invoice',
                                          id: inv.id,
                                          number: inv.invoiceNumber
                                        })
                                      }
                                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                                      title="Void Invoice in Xero"
                                    >
                                      <Ban className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                                {inv.status === 'VOIDED' && (
                                  <span className="text-[11px] text-gray-500 font-mono">Voided</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: QUOTATIONS (CREATE, EDIT, VOID, CONVERT)           */}
          {/* ========================================================= */}
          {activeTab === 'quotes' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={quoteSearch}
                      onChange={e => setQuoteSearch(e.target.value)}
                      placeholder="Search Quote #, customer, title..."
                      className="w-full text-xs pl-8 pr-3 py-2 bg-[#141414] border border-[#262626] rounded-lg text-white outline-none focus:border-sky-400"
                    />
                  </div>

                  <select
                    value={quoteStatusFilter}
                    onChange={e => setQuoteStatusFilter(e.target.value)}
                    className="text-xs bg-[#141414] border border-[#262626] rounded-lg px-2.5 py-2 text-gray-200 outline-none focus:border-sky-400"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="SENT">Sent</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="INVOICED">Invoiced</option>
                    <option value="VOIDED">Voided</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    setEditingQuote(null);
                    setIsQuoteModalOpen(true);
                  }}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-black font-extrabold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-colors self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Quotation in Xero</span>
                </button>
              </div>

              {/* Quotations Table */}
              <div className="bg-[#161616] rounded-xl border border-[#262626] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#121212] text-gray-400 border-b border-[#262626] uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3">Quote #</th>
                        <th className="p-3">Customer &amp; Title</th>
                        <th className="p-3">Issue Date</th>
                        <th className="p-3">Expiry Date</th>
                        <th className="p-3">Total (AUD)</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#262626]">
                      {filteredQuotes.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-gray-400 text-xs">
                            No quotations found. Click "+ Create Quotation in Xero" to draft a new proposal.
                          </td>
                        </tr>
                      ) : (
                        filteredQuotes.map(q => (
                          <tr key={q.id} className="hover:bg-[#1a1a1a] transition-colors">
                            <td className="p-3">
                              <span className="font-mono font-bold text-white block">{q.quoteNumber}</span>
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-gray-200 block">{q.contactName}</span>
                              <span className="text-[11px] text-gray-400">{q.title}</span>
                            </td>
                            <td className="p-3 text-gray-300 font-mono text-[11px]">{q.date}</td>
                            <td className="p-3 text-gray-300 font-mono text-[11px]">{q.expiryDate}</td>
                            <td className="p-3 font-mono font-bold text-white">
                              ${q.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3">
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                  q.status === 'ACCEPTED'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : q.status === 'INVOICED'
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                    : q.status === 'SENT'
                                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                                    : q.status === 'DRAFT'
                                    ? 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                                    : 'bg-red-500/20 text-red-300 border-red-500/30'
                                }`}
                              >
                                {q.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {q.status !== 'VOIDED' && q.status !== 'INVOICED' && (
                                  <>
                                    <button
                                      onClick={() => handleConvertQuote(q.id)}
                                      className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded text-[11px] font-bold transition-colors"
                                      title="Convert Quote to Authorised Xero Invoice"
                                    >
                                      Convert to Invoice
                                    </button>

                                    <button
                                      onClick={() => {
                                        setEditingQuote(q);
                                        setIsQuoteModalOpen(true);
                                      }}
                                      className="p-1.5 rounded-lg bg-[#222] hover:bg-[#2e2e2e] text-gray-300 hover:text-white transition-colors"
                                      title="Edit Quotation"
                                    >
                                      <Edit2 className="w-3.5 h-3.5 text-sky-400" />
                                    </button>

                                    <button
                                      onClick={() =>
                                        setVoidTarget({
                                          type: 'quote',
                                          id: q.id,
                                          number: q.quoteNumber
                                        })
                                      }
                                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                                      title="Void Quotation"
                                    >
                                      <Ban className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                                {q.status === 'INVOICED' && (
                                  <span className="text-[11px] text-sky-400 font-medium">Invoiced</span>
                                )}
                                {q.status === 'VOIDED' && (
                                  <span className="text-[11px] text-gray-500 font-mono">Voided</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: BILLS (CREATE, EDIT, VOID)                         */}
          {/* ========================================================= */}
          {activeTab === 'bills' && (
            <div className="space-y-4">
              {/* Metric Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#161616] border border-[#262626]">
                  <span className="text-[11px] text-gray-400 font-bold uppercase">Total Vendor Bills</span>
                  <p className="text-xl font-extrabold text-white mt-0.5">
                    ${totalBillsAud.toLocaleString(undefined, { minimumFractionDigits: 2 })} AUD
                  </p>
                  <span className="text-[11px] text-gray-500">Equipment distributor &amp; installation contractor expenses</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#161616] border border-[#262626]">
                  <span className="text-[11px] text-amber-400 font-bold uppercase">Outstanding Payables Due</span>
                  <p className="text-xl font-extrabold text-amber-300 mt-0.5">
                    ${totalPayableDueAud.toLocaleString(undefined, { minimumFractionDigits: 2 })} AUD
                  </p>
                  <span className="text-[11px] text-gray-500">Unpaid supplier and contractor invoices</span>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={billSearch}
                      onChange={e => setBillSearch(e.target.value)}
                      placeholder="Search Bill #, vendor, reference..."
                      className="w-full text-xs pl-8 pr-3 py-2 bg-[#141414] border border-[#262626] rounded-lg text-white outline-none focus:border-sky-400"
                    />
                  </div>

                  <select
                    value={billStatusFilter}
                    onChange={e => setBillStatusFilter(e.target.value)}
                    className="text-xs bg-[#141414] border border-[#262626] rounded-lg px-2.5 py-2 text-gray-200 outline-none focus:border-sky-400"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="AUTHORISED">Authorised</option>
                    <option value="PAID">Paid</option>
                    <option value="VOIDED">Voided</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    setEditingBill(null);
                    setIsBillModalOpen(true);
                  }}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-black font-extrabold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-colors self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Bill in Xero</span>
                </button>
              </div>

              {/* Bills Table */}
              <div className="bg-[#161616] rounded-xl border border-[#262626] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#121212] text-gray-400 border-b border-[#262626] uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3">Bill #</th>
                        <th className="p-3">Supplier / Subcontractor</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Due Date</th>
                        <th className="p-3">Total (AUD)</th>
                        <th className="p-3">Balance Due</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#262626]">
                      {filteredBills.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-gray-400 text-xs">
                            No bills matching criteria. Click "+ Create Bill in Xero" to enter a supplier or contractor bill.
                          </td>
                        </tr>
                      ) : (
                        filteredBills.map(b => (
                          <tr key={b.id} className="hover:bg-[#1a1a1a] transition-colors">
                            <td className="p-3">
                              <span className="font-mono font-bold text-white block">{b.billNumber}</span>
                              {b.reference && (
                                <span className="text-[10px] text-gray-500 font-mono">Ref: {b.reference}</span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-gray-200 block">{b.contactName}</span>
                              <span className="text-[11px] text-gray-400">{b.supplierType}</span>
                            </td>
                            <td className="p-3 text-gray-300 font-mono text-[11px]">{b.date}</td>
                            <td className="p-3 text-gray-300 font-mono text-[11px]">{b.dueDate}</td>
                            <td className="p-3 font-mono font-bold text-white">
                              ${b.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 font-mono font-bold">
                              {b.status === 'PAID' ? (
                                <span className="text-emerald-400">$0.00</span>
                              ) : b.status === 'VOIDED' ? (
                                <span className="text-gray-500 line-through">$0.00</span>
                              ) : (
                                <span className="text-amber-300">
                                  ${b.amountDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                  b.status === 'PAID'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : b.status === 'AUTHORISED'
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                    : b.status === 'DRAFT'
                                    ? 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                                    : 'bg-red-500/20 text-red-300 border-red-500/30'
                                }`}
                              >
                                {b.status}
                              </span>
                              {b.voidReason && (
                                <span className="text-[10px] text-red-400 block mt-0.5 truncate max-w-[120px]" title={b.voidReason}>
                                  {b.voidReason}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {b.status !== 'VOIDED' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingBill(b);
                                        setIsBillModalOpen(true);
                                      }}
                                      className="p-1.5 rounded-lg bg-[#222] hover:bg-[#2e2e2e] text-gray-300 hover:text-white transition-colors"
                                      title="Edit Bill"
                                    >
                                      <Edit2 className="w-3.5 h-3.5 text-sky-400" />
                                    </button>

                                    <button
                                      onClick={() =>
                                        setVoidTarget({
                                          type: 'bill',
                                          id: b.id,
                                          number: b.billNumber
                                        })
                                      }
                                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                                      title="Void Bill in Xero"
                                    >
                                      <Ban className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                                {b.status === 'VOIDED' && (
                                  <span className="text-[11px] text-gray-500 font-mono">Voided</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: TWO-WAY CONTACTS SYNC (CRM <-> XERO)                */}
          {/* ========================================================= */}
          {activeTab === 'contacts' && (
            <div className="space-y-4">
              {/* Sync Action Hero Banner */}
              <div className="p-4 rounded-xl bg-[#161616] border border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-sky-400" />
                    <h4 className="font-bold text-sm text-white">
                      Two-Way Contact Sync (SolarFlow CRM &lt;—&gt; Xero Accounting)
                    </h4>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 max-w-xl leading-relaxed">
                    Automatically sync CRM customers, sales leads, and installation subcontractors directly with Xero Contact records. Updates made in either system reflect across both platforms.
                  </p>
                </div>

                <button
                  onClick={handleSyncAllContacts}
                  disabled={isSyncingContacts}
                  className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black font-extrabold text-xs rounded-lg shadow-sm flex items-center gap-2 transition-colors shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingContacts ? 'animate-spin' : ''}`} />
                  <span>{isSyncingContacts ? 'Syncing with Xero...' : 'Sync All Contacts with Xero'}</span>
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={contactSearch}
                      onChange={e => setContactSearch(e.target.value)}
                      placeholder="Search name, email, Xero Contact ID..."
                      className="w-full text-xs pl-8 pr-3 py-2 bg-[#141414] border border-[#262626] rounded-lg text-white outline-none focus:border-sky-400"
                    />
                  </div>

                  <select
                    value={contactTypeFilter}
                    onChange={e => setContactTypeFilter(e.target.value)}
                    className="text-xs bg-[#141414] border border-[#262626] rounded-lg px-2.5 py-2 text-gray-200 outline-none focus:border-sky-400"
                  >
                    <option value="ALL">All Contact Types</option>
                    <option value="Customer">Customers</option>
                    <option value="Subcontractor">Subcontractors</option>
                    <option value="Supplier">Suppliers</option>
                  </select>
                </div>

                <div className="text-xs text-gray-400 font-medium">
                  Showing {filteredContacts.length} of {syncedContacts.length} synced contacts
                </div>
              </div>

              {/* Contacts Table */}
              <div className="bg-[#161616] rounded-xl border border-[#262626] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#121212] text-gray-400 border-b border-[#262626] uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3">Contact Name</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">Xero Contact ID</th>
                        <th className="p-3">Sync Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#262626]">
                      {filteredContacts.map(c => (
                        <tr key={c.crmContactId} className="hover:bg-[#1a1a1a] transition-colors">
                          <td className="p-3 font-bold text-white">{c.name}</td>
                          <td className="p-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                c.contactType === 'Customer'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : c.contactType === 'Subcontractor'
                                  ? 'bg-purple-500/20 text-purple-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {c.contactType}
                            </span>
                          </td>
                          <td className="p-3 text-gray-300">{c.email}</td>
                          <td className="p-3 text-gray-400 font-mono text-[11px]">{c.phone}</td>
                          <td className="p-3 font-mono font-bold text-sky-400">{c.xeroContactId}</td>
                          <td className="p-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>{c.syncStatus}</span>
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleSyncSingleContact(c)}
                              className="px-2.5 py-1 rounded bg-[#222] hover:bg-[#2c2c2c] text-gray-200 border border-[#333] text-[11px] font-bold flex items-center gap-1 ml-auto transition-colors"
                            >
                              <RefreshCw className="w-3 h-3 text-sky-400" />
                              <span>Sync</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: SETTINGS & CHART OF ACCOUNTS                       */}
          {/* ========================================================= */}
          {activeTab === 'config' && (
            <form onSubmit={handleSaveConfig} className="space-y-4">
              {/* Live OAuth 2.0 & Supabase Status Panel */}
              <div className="p-4 rounded-xl bg-[#161616] border border-[#262626] space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-sky-400" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-white">
                      Xero Live Production Connection (OAuth 2.0 &amp; Supabase)
                    </h4>
                    {(backendStatus?.connected || settings.isConnected) ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-mono">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Connected
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1 font-mono">
                        <AlertTriangle className="w-3 h-3 text-red-400" />
                        Not Connected
                      </span>
                    )}
                    {backendStatus?.tokenStorage === 'supabase' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 font-mono">
                        Stored in Supabase
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {(backendStatus?.connected || settings.isConnected) ? (
                      <>
                        <button
                          type="button"
                          onClick={handleRefreshToken}
                          disabled={isRefreshingToken}
                          className="px-3 py-1.5 bg-[#222] hover:bg-[#2c2c2c] text-sky-300 hover:text-sky-200 border border-sky-500/30 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                          title="Refresh OAuth token pair via /api/xero/refresh"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingToken ? 'animate-spin' : ''}`} />
                          <span>Refresh Token</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDisconnectXero}
                          className="px-3 py-1.5 bg-[#222] hover:bg-[#2c2c2c] text-red-400 hover:text-red-300 border border-red-500/30 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                          title="Revoke access and remove from Supabase"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                          <span>Disconnect</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConnectToXero}
                        className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-black font-extrabold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>Connect to Xero</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={loadLiveStatus}
                      disabled={isLoadingStatus}
                      className="px-2.5 py-1.5 bg-[#222] hover:bg-[#2c2c2c] text-gray-300 hover:text-white border border-[#383838] text-xs font-medium rounded-lg transition-colors"
                      title="Check current connection status"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                  <div className="p-3 bg-[#121212] rounded-lg border border-[#262626]">
                    <span className="text-gray-400 block text-[11px]">Connected Xero Organization</span>
                    <strong className="text-white font-bold text-sm block truncate mt-0.5">
                      {backendStatus?.tenantName || settings.organizationName || 'No Organization Connected'}
                    </strong>
                    <span className="text-[11px] text-gray-500">Live production tenant</span>
                  </div>

                  <div className="p-3 bg-[#121212] rounded-lg border border-[#262626]">
                    <span className="text-gray-400 block text-[11px]">Xero Tenant ID</span>
                    <code className="text-sky-300 font-mono text-[11px] block truncate mt-0.5">
                      {backendStatus?.tenantId || settings.tenantId || 'Not authorized'}
                    </code>
                    <span className="text-[11px] text-gray-500">Auto-resolved on OAuth exchange</span>
                  </div>

                  <div className="p-3 bg-[#121212] rounded-lg border border-[#262626]">
                    <span className="text-gray-400 block text-[11px]">Token Storage Target</span>
                    <strong className="text-emerald-400 font-bold block mt-0.5">
                      Supabase Table: xero_credentials
                    </strong>
                    <span className="text-[11px] text-gray-400">
                      {backendStatus?.expiresAt
                        ? `Expires: ${new Date(backendStatus.expiresAt).toLocaleTimeString()}`
                        : 'Secure encrypted tokens'}
                    </span>
                  </div>
                </div>

                {/* Setup & Environment Checklist */}
                <div className="p-3.5 bg-[#121212] border border-[#262626] rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-sky-400" />
                      <span>OAuth 2.0 &amp; Supabase Environment Configuration</span>
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Configured in <code>.env.local</code> / server environment
                    </span>
                  </div>

                  {/* Status Pills */}
                  {setupInfo?.envChecklist && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                      <div className="p-2 bg-[#181818] border border-[#2c2c2c] rounded-lg flex items-center justify-between">
                        <span className="text-gray-300 font-mono">XERO_CLIENT_ID</span>
                        {setupInfo.envChecklist.xeroClientId ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Set
                          </span>
                        ) : (
                          <span className="text-amber-400 font-bold">Missing</span>
                        )}
                      </div>

                      <div className="p-2 bg-[#181818] border border-[#2c2c2c] rounded-lg flex items-center justify-between">
                        <span className="text-gray-300 font-mono">XERO_CLIENT_SECRET</span>
                        {setupInfo.envChecklist.xeroClientSecret ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Set
                          </span>
                        ) : (
                          <span className="text-amber-400 font-bold">Missing</span>
                        )}
                      </div>

                      <div className="p-2 bg-[#181818] border border-[#2c2c2c] rounded-lg flex items-center justify-between">
                        <span className="text-gray-300 font-mono">SUPABASE_URL</span>
                        {setupInfo.envChecklist.supabaseUrl ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Set
                          </span>
                        ) : (
                          <span className="text-amber-400 font-bold">Missing</span>
                        )}
                      </div>

                      <div className="p-2 bg-[#181818] border border-[#2c2c2c] rounded-lg flex items-center justify-between">
                        <span className="text-gray-300 font-mono">SERVICE_ROLE_KEY</span>
                        {setupInfo.envChecklist.supabaseServiceRoleKey ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Set
                          </span>
                        ) : (
                          <span className="text-amber-400 font-bold">Missing</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Authorized Redirect URI Box */}
                  <div className="pt-2 border-t border-[#222]">
                    <label className="block text-[11px] font-bold text-gray-300 mb-1">
                      Authorized Redirect URI (Paste into Xero Developer Portal &rarr; App &rarr; Configuration):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={
                          setupInfo?.authorizedRedirectUri ||
                          (typeof window !== 'undefined'
                            ? `${window.location.origin}/api/auth/xero/callback`
                            : 'http://localhost:3000/api/auth/xero/callback')
                        }
                        className="flex-1 text-xs font-mono bg-[#0d0d0d] border border-[#333] rounded-lg px-3 py-2 text-sky-300 outline-none select-all"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            setupInfo?.authorizedRedirectUri ||
                              (typeof window !== 'undefined'
                                ? `${window.location.origin}/api/auth/xero/callback`
                                : 'http://localhost:3000/api/auth/xero/callback'),
                            'redirectUri'
                          )
                        }
                        className="px-3 py-2 bg-[#222] hover:bg-[#2c2c2c] text-white border border-[#383838] text-xs font-bold rounded-lg transition-colors shrink-0"
                      >
                        {copiedKey === 'redirectUri' ? 'Copied!' : 'Copy URI'}
                      </button>
                    </div>
                  </div>

                  {/* Scopes Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                    <span className="text-gray-400 mr-1">Authorized Scopes:</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#1e1e1e] border border-[#333] font-mono text-gray-300">
                      offline_access
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#1e1e1e] border border-[#333] font-mono text-gray-300">
                      accounting.transactions
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#1e1e1e] border border-[#333] font-mono text-gray-300">
                      accounting.contacts
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#1e1e1e] border border-[#333] font-mono text-gray-300">
                      accounting.settings
                    </span>
                  </div>

                  {/* Supabase Migration Script Drawer */}
                  <div className="pt-2 border-t border-[#222]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-gray-300">
                        Supabase Migration Script (<code>xero_credentials</code> table schema with RLS):
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            `CREATE TABLE IF NOT EXISTS public.xero_credentials (
  id TEXT PRIMARY KEY DEFAULT 'xero_production',
  tenant_id TEXT NOT NULL,
  tenant_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  id_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.xero_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow server-side access only"
  ON public.xero_credentials
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);`,
                            'sqlMigration'
                          )
                        }
                        className="text-[11px] text-sky-400 hover:text-sky-300 underline font-semibold"
                      >
                        {copiedKey === 'sqlMigration' ? 'Copied SQL!' : 'Copy SQL Migration'}
                      </button>
                    </div>
                    <pre className="p-2.5 bg-[#0a0a0a] rounded-lg border border-[#262626] text-[10px] font-mono text-gray-400 overflow-x-auto max-h-24">
{`CREATE TABLE IF NOT EXISTS public.xero_credentials (
  id TEXT PRIMARY KEY DEFAULT 'xero_production',
  tenant_id TEXT NOT NULL,
  tenant_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Chart of Accounts Mappings */}
              <div className="p-4 rounded-xl bg-[#161616] border border-[#262626] space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-sky-400" />
                  <span>Chart of Accounts (General Ledger Mappings)</span>
                </h4>
                <p className="text-xs text-gray-400">
                  Select which Xero general ledger accounts will receive invoices, STC government discounts, hardware purchase bills, and contractor payments.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Solar System &amp; Battery Sales (Revenue)
                    </label>
                    <input
                      type="text"
                      value={settings.salesAccountCode}
                      onChange={e => setSettings({ ...settings, salesAccountCode: e.target.value })}
                      className="w-full text-xs font-mono bg-[#121212] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white focus:border-sky-400 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      STC Government Rebate Clearing Account
                    </label>
                    <input
                      type="text"
                      value={settings.stcClearingAccountCode}
                      onChange={e => setSettings({ ...settings, stcClearingAccountCode: e.target.value })}
                      className="w-full text-xs font-mono bg-[#121212] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white focus:border-sky-400 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Hardware COGS / Inventory (Panels &amp; Inverters)
                    </label>
                    <input
                      type="text"
                      value={settings.cogsAccountCode}
                      onChange={e => setSettings({ ...settings, cogsAccountCode: e.target.value })}
                      className="w-full text-xs font-mono bg-[#121212] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white focus:border-sky-400 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Subcontractor / CEC Installation Labour (Expense)
                    </label>
                    <input
                      type="text"
                      value={settings.installerLabourAccountCode}
                      onChange={e => setSettings({ ...settings, installerLabourAccountCode: e.target.value })}
                      className="w-full text-xs font-mono bg-[#121212] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white focus:border-sky-400 outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Automation Toggles */}
              <div className="p-4 rounded-xl bg-[#161616] border border-[#262626] space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-white">
                  Automated Workflow Rules
                </h4>

                <div className="space-y-2">
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#121212] border border-[#262626] cursor-pointer">
                    <span className="text-xs text-gray-300 font-medium">
                      Automatically sync new customer leads to Xero Contacts upon creation
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.autoSyncNewContacts}
                      onChange={e => setSettings({ ...settings, autoSyncNewContacts: e.target.checked })}
                      className="accent-sky-400"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#121212] border border-[#262626] cursor-pointer">
                    <span className="text-xs text-gray-300 font-medium">
                      Automatically draft Xero Sales Invoice when contract signed in OpenSolar
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.autoCreateInvoiceOnContract}
                      onChange={e => setSettings({ ...settings, autoCreateInvoiceOnContract: e.target.checked })}
                      className="accent-sky-400"
                    />
                  </label>
                </div>
              </div>

              {/* Actions & Ping */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleTestXeroPing}
                  disabled={isPinging}
                  className="px-3.5 py-2 rounded-lg bg-[#262626] hover:bg-[#333] text-gray-200 border border-[#333] text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isPinging ? 'animate-spin' : ''}`} />
                  <span>{isPinging ? 'Testing Xero Connection...' : 'Test Xero API Connection'}</span>
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-black font-extrabold text-xs rounded-lg shadow-sm transition-colors"
                >
                  Save Xero Settings
                </button>
              </div>

              {pingResult && (
                <div className="p-3.5 bg-[#141414] border border-[#2d2d2d] rounded-xl text-xs text-gray-300 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sky-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{pingResult.message}</span>
                    </span>
                    <span className="text-[11px] font-mono text-gray-400">Latency: {pingResult.latencyMs}ms</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#262626] text-[11px]">
                    <div>
                      <span className="text-gray-400 block">ABN:</span>
                      <strong className="text-white">{pingResult.abn}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Currency:</span>
                      <strong className="text-white">{pingResult.currency}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">General Ledger:</span>
                      <strong className="text-emerald-400">{pingResult.accountsMappedCount} Accounts Mapped</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Verified At:</span>
                      <strong className="text-gray-300">{pingResult.timestamp}</strong>
                    </div>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#161616] border-t border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Organization: {settings.organizationName}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-[#262626] hover:bg-[#333] text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>



      {/* ============================================================= */}
      {/* SUB-MODAL 1: CREATE / EDIT INVOICE DIALOG                    */}
      {/* ============================================================= */}
      {isInvoiceModalOpen && (
        <InvoiceFormModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          editingInvoice={editingInvoice}
          contacts={contacts}
          projects={projects}
          onSaved={() => {
            setInvoices(getXeroInvoices());
            setIsInvoiceModalOpen(false);
            showNotification(editingInvoice ? 'Invoice updated in Xero!' : 'New invoice created in Xero!');
          }}
        />
      )}

      {/* ============================================================= */}
      {/* SUB-MODAL 2: CREATE / EDIT QUOTATION DIALOG                  */}
      {/* ============================================================= */}
      {isQuoteModalOpen && (
        <QuotationFormModal
          isOpen={isQuoteModalOpen}
          onClose={() => setIsQuoteModalOpen(false)}
          editingQuote={editingQuote}
          contacts={contacts}
          onSaved={() => {
            setQuotes(getXeroQuotations());
            setIsQuoteModalOpen(false);
            showNotification(editingQuote ? 'Quotation updated in Xero!' : 'New quotation drafted in Xero!');
          }}
        />
      )}

      {/* ============================================================= */}
      {/* SUB-MODAL 3: CREATE / EDIT BILL DIALOG                       */}
      {/* ============================================================= */}
      {isBillModalOpen && (
        <BillFormModal
          isOpen={isBillModalOpen}
          onClose={() => setIsBillModalOpen(false)}
          editingBill={editingBill}
          subContractors={subContractors}
          onSaved={() => {
            setBills(getXeroBills());
            setIsBillModalOpen(false);
            showNotification(editingBill ? 'Bill updated in Xero!' : 'New bill entered into Xero!');
          }}
        />
      )}

      {/* ============================================================= */}
      {/* SUB-MODAL 4: CONFIRM VOID DIALOG                             */}
      {/* ============================================================= */}
      {voidTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#1e1e1e] rounded-xl border border-red-500/30 p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-center gap-2.5 text-red-400 font-bold text-sm">
              <Ban className="w-5 h-5" />
              <span>Confirm Void {voidTarget.type.toUpperCase()}: {voidTarget.number}</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Are you sure you want to void this {voidTarget.type}? In Xero, voiding cancels all outstanding amounts and locks the document against further payments or edits.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Reason for Voiding:
              </label>
              <input
                type="text"
                value={voidReasonInput}
                onChange={e => setVoidReasonInput(e.target.value)}
                placeholder="e.g. Customer cancelled order, incorrect pricing"
                className="w-full text-xs px-3 py-2 bg-[#141414] border border-[#262626] rounded-lg text-white outline-none focus:border-red-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVoidTarget(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-[#262626] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg shadow-sm"
              >
                Confirm Void
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===================================================================
// INVOICE FORM MODAL (CREATE / EDIT)
// ===================================================================
interface InvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingInvoice: XeroInvoice | null;
  contacts: any[];
  projects: any[];
  onSaved: () => void;
}

const InvoiceFormModal: React.FC<InvoiceFormModalProps> = ({
  isOpen,
  onClose,
  editingInvoice,
  contacts,
  projects,
  onSaved
}) => {
  const [contactId, setContactId] = useState(editingInvoice?.contactId || (contacts[0]?.id || ''));
  const [invoiceNumber, setInvoiceNumber] = useState(
    editingInvoice?.invoiceNumber || `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [reference, setReference] = useState(editingInvoice?.reference || '');
  const [date, setDate] = useState(editingInvoice?.date || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    editingInvoice?.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<XeroInvoiceStatus>(editingInvoice?.status || 'AUTHORISED');

  const [lineItems, setLineItems] = useState<XeroLineItem[]>(
    editingInvoice?.lineItems || []
  );

  const selectedContact = contacts.find(c => c.id === contactId);

  const calculateTotals = () => {
    let sub = 0;
    let tax = 0;
    lineItems.forEach(li => {
      sub += li.unitAmount * li.quantity;
      if (li.taxType.includes('10%')) {
        tax += (li.unitAmount * li.quantity) * 0.1;
      }
    });
    return { subTotal: sub, totalTax: tax, total: sub };
  };

  const totals = calculateTotals();

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: `li-${Date.now()}`,
        description: 'Battery Storage / Additional Hardware',
        quantity: 1,
        unitAmount: 2500,
        accountCode: '200',
        taxType: '10% GST on Income',
        taxAmount: 250,
        lineAmount: 2500
      }
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index: number, field: keyof XeroLineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    updated[index].lineAmount = updated[index].quantity * updated[index].unitAmount;
    setLineItems(updated);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const contactName = selectedContact?.name || editingInvoice?.contactName || 'Customer';
    const contactEmail = selectedContact?.email || editingInvoice?.contactEmail || '';

    if (editingInvoice) {
      updateXeroInvoice(editingInvoice.id, {
        contactId,
        contactName,
        contactEmail,
        reference,
        date,
        dueDate,
        status,
        lineItems,
        subTotal: totals.subTotal,
        totalTax: totals.totalTax,
        total: totals.total,
        amountDue: status === 'PAID' ? 0 : totals.total
      });
    } else {
      createXeroInvoice({
        type: 'ACCREC',
        invoiceNumber,
        contactId,
        contactName,
        contactEmail,
        reference,
        date,
        dueDate,
        status,
        currencyCode: 'AUD',
        lineItems,
        subTotal: totals.subTotal,
        totalTax: totals.totalTax,
        total: totals.total,
        amountPaid: 0,
        amountDue: totals.total,
        updatedAt: new Date().toISOString()
      });
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3">
      <div className="w-full max-w-2xl bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] shadow-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto text-white">
        <div className="flex items-center justify-between border-b border-[#262626] pb-3">
          <h3 className="font-bold text-base flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-sky-400" />
            <span>{editingInvoice ? `Edit Invoice: ${editingInvoice.invoiceNumber}` : 'Create Xero Sales Invoice'}</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 font-semibold mb-1">Customer / Contact</label>
              <select
                value={contactId}
                onChange={e => setContactId(e.target.value)}
                className="w-full bg-[#121212] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white font-medium outline-none focus:border-sky-400"
              >
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Invoice Number</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                disabled={Boolean(editingInvoice)}
                className="w-full font-mono bg-[#121212] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white font-bold outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Reference (Project Code / PO)</label>
              <input
                type="text"
                value={reference}
                onChange={e => setReference(e.target.value)}
                className="w-full bg-[#121212] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white outline-none focus:border-sky-400"
                placeholder="SOL-NSW-1042"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Invoice Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as XeroInvoiceStatus)}
                className="w-full bg-[#121212] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white font-bold outline-none focus:border-sky-400"
              >
                <option value="AUTHORISED">AUTHORISED (Active Billable)</option>
                <option value="DRAFT">DRAFT (Review Required)</option>
                <option value="PAID">PAID (Settled in full)</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Issue Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-[#121212] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white font-mono outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-[#121212] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white font-mono outline-none"
                required
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-200">Line Items</span>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Line Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {lineItems.map((li, index) => (
                <div key={li.id || index} className="p-2.5 rounded-lg bg-[#141414] border border-[#262626] space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={li.description}
                      onChange={e => handleLineItemChange(index, 'description', e.target.value)}
                      placeholder="Item description"
                      className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-2.5 py-1.5 text-white outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(index)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <span className="text-[10px] text-gray-400 block mb-0.5">Qty</span>
                      <input
                        type="number"
                        min="1"
                        value={li.quantity}
                        onChange={e => handleLineItemChange(index, 'quantity', parseFloat(e.target.value) || 1)}
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white font-mono outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block mb-0.5">Unit Price ($ AUD)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={li.unitAmount}
                        onChange={e => handleLineItemChange(index, 'unitAmount', parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white font-mono outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block mb-0.5">Tax</span>
                      <select
                        value={li.taxType}
                        onChange={e => handleLineItemChange(index, 'taxType', e.target.value)}
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1.5 py-1 text-white outline-none text-[11px]"
                      >
                        <option value="10% GST on Income">10% GST</option>
                        <option value="BAS Excluded">BAS Excluded (STC)</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block mb-0.5">Amount</span>
                      <span className="font-mono font-bold text-white block pt-1">
                        ${(li.quantity * li.unitAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Breakdown */}
          <div className="p-3 bg-[#141414] border border-[#262626] rounded-xl flex items-center justify-between font-mono">
            <span className="text-gray-400">Total Invoice Amount:</span>
            <span className="text-base font-extrabold text-sky-400">
              ${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })} AUD
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262626]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-gray-400 hover:bg-[#262626] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-black font-extrabold rounded-lg shadow-sm"
            >
              {editingInvoice ? 'Update Invoice in Xero' : 'Authorise Invoice in Xero'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ===================================================================
// QUOTATION FORM MODAL (CREATE / EDIT)
// ===================================================================
interface QuotationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingQuote: XeroQuotation | null;
  contacts: any[];
  onSaved: () => void;
}

const QuotationFormModal: React.FC<QuotationFormModalProps> = ({
  isOpen,
  onClose,
  editingQuote,
  contacts,
  onSaved
}) => {
  const [contactId, setContactId] = useState(editingQuote?.contactId || (contacts[0]?.id || 'cnt-1'));
  const [quoteNumber, setQuoteNumber] = useState(
    editingQuote?.quoteNumber || `QU-2026-${Math.floor(100 + Math.random() * 900)}`
  );
  const [title, setTitle] = useState(editingQuote?.title || '13.2kW Solar Array + 10kWh Battery System');
  const [summary, setSummary] = useState(editingQuote?.summary || 'Standard roof installation with Tier-1 modules');
  const [date, setDate] = useState(editingQuote?.date || new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(
    editingQuote?.expiryDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<XeroQuoteStatus>(editingQuote?.status || 'SENT');

  const [lineItems, setLineItems] = useState<XeroLineItem[]>(
    editingQuote?.lineItems || [
      {
        id: 'qli-1',
        description: '13.2kW Solar Array (30x Jinko Tiger Neo 440W)',
        quantity: 1,
        unitAmount: 14200,
        accountCode: '200',
        taxType: '10% GST on Income',
        taxAmount: 1420,
        lineAmount: 14200
      },
      {
        id: 'qli-2',
        description: 'Less: CER STC Rebate Deduction (140 STCs @ $38.50)',
        quantity: 1,
        unitAmount: -5390,
        accountCode: '215',
        taxType: 'BAS Excluded',
        taxAmount: 0,
        lineAmount: -5390
      }
    ]
  );

  const selectedContact = contacts.find(c => c.id === contactId);

  const calculateTotal = () => {
    return lineItems.reduce((acc, li) => acc + li.quantity * li.unitAmount, 0);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const contactName = selectedContact?.name || editingQuote?.contactName || 'Customer';
    const contactEmail = selectedContact?.email || editingQuote?.contactEmail || '';
    const total = calculateTotal();

    if (editingQuote) {
      updateXeroQuotation(editingQuote.id, {
        contactId,
        contactName,
        contactEmail,
        title,
        summary,
        date,
        expiryDate,
        status,
        lineItems,
        subTotal: total,
        totalTax: total * 0.1,
        total
      });
    } else {
      createXeroQuotation({
        quoteNumber,
        contactId,
        contactName,
        contactEmail,
        title,
        summary,
        date,
        expiryDate,
        status,
        currencyCode: 'AUD',
        lineItems,
        subTotal: total,
        totalTax: total * 0.1,
        total,
        terms: '30 days validity',
        updatedAt: new Date().toISOString()
      });
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3">
      <div className="w-full max-w-xl bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] shadow-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto text-white">
        <div className="flex items-center justify-between border-b border-[#262626] pb-3">
          <h3 className="font-bold text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-400" />
            <span>{editingQuote ? `Edit Quotation: ${editingQuote.quoteNumber}` : 'Draft Xero Quotation'}</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 font-semibold mb-1">Customer / Contact</label>
              <select
                value={contactId}
                onChange={e => setContactId(e.target.value)}
                className="w-full bg-[#121212] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white outline-none focus:border-sky-400"
              >
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Quote Number</label>
              <input
                type="text"
                value={quoteNumber}
                onChange={e => setQuoteNumber(e.target.value)}
                disabled={Boolean(editingQuote)}
                className="w-full font-mono bg-[#121212] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white font-bold outline-none"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-gray-300 font-semibold mb-1">Proposal Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-[#121212] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white font-semibold outline-none focus:border-sky-400"
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Issue Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-[#121212] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white font-mono outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Expiry Date</label>
              <input
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className="w-full bg-[#121212] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white font-mono outline-none"
                required
              />
            </div>
          </div>

          <div className="p-3 bg-[#141414] border border-[#262626] rounded-xl flex items-center justify-between font-mono">
            <span className="text-gray-400">Total Quoted Value:</span>
            <span className="text-base font-extrabold text-sky-400">
              ${calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })} AUD
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262626]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-gray-400 hover:bg-[#262626] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-black font-extrabold rounded-lg shadow-sm"
            >
              Save Quotation in Xero
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ===================================================================
// BILL FORM MODAL (CREATE / EDIT)
// ===================================================================
interface BillFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingBill: XeroBill | null;
  subContractors: any[];
  onSaved: () => void;
}

const BillFormModal: React.FC<BillFormModalProps> = ({
  isOpen,
  onClose,
  editingBill,
  subContractors,
  onSaved
}) => {
  const [vendorName, setVendorName] = useState(
    editingBill?.contactName || (subContractors[0]?.companyName || '')
  );
  const [billNumber, setBillNumber] = useState(
    editingBill?.billNumber || `BILL-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [reference, setReference] = useState(editingBill?.reference || '');
  const [date, setDate] = useState(editingBill?.date || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    editingBill?.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<XeroBillStatus>(editingBill?.status || 'AUTHORISED');
  const [totalAmount, setTotalAmount] = useState(editingBill?.total || 0);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBill) {
      updateXeroBill(editingBill.id, {
        contactName: vendorName,
        reference,
        date,
        dueDate,
        status,
        total: totalAmount,
        amountDue: status === 'PAID' ? 0 : totalAmount
      });
    } else {
      createXeroBill({
        type: 'ACCPAY',
        billNumber,
        contactId: `vnd-${Date.now()}`,
        contactName: vendorName,
        supplierType: vendorName.toLowerCase().includes('solar') ? 'Equipment Distributor' : 'Installation Subcontractor',
        date,
        dueDate,
        status,
        currencyCode: 'AUD',
        lineItems: [
          {
            id: `bli-1`,
            description: `Hardware / Subcontractor supply for ${reference}`,
            quantity: 1,
            unitAmount: totalAmount,
            accountCode: '310',
            taxType: '10% GST on Expenses',
            taxAmount: totalAmount * 0.1,
            lineAmount: totalAmount
          }
        ],
        subTotal: totalAmount,
        totalTax: totalAmount * 0.1,
        total: totalAmount,
        amountPaid: 0,
        amountDue: totalAmount,
        reference,
        updatedAt: new Date().toISOString()
      });
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3">
      <div className="w-full max-w-lg bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] shadow-2xl p-5 space-y-4 text-white">
        <div className="flex items-center justify-between border-b border-[#262626] pb-3">
          <h3 className="font-bold text-base flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-sky-400" />
            <span>{editingBill ? `Edit Bill: ${editingBill.billNumber}` : 'Enter Vendor / Subcontractor Bill'}</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div>
            <label className="block text-gray-300 font-semibold mb-1">Vendor / Subcontractor</label>
            <input
              type="text"
              value={vendorName}
              onChange={e => setVendorName(e.target.value)}
              className="w-full bg-[#121212] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white font-semibold outline-none focus:border-sky-400"
              placeholder="e.g. One Stop Warehouse, Sydney Metro Solar"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 font-semibold mb-1">Bill Reference #</label>
              <input
                type="text"
                value={billNumber}
                onChange={e => setBillNumber(e.target.value)}
                className="w-full font-mono bg-[#121212] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white font-bold outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Internal PO Reference</label>
              <input
                type="text"
                value={reference}
                onChange={e => setReference(e.target.value)}
                className="w-full bg-[#121212] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Bill Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-[#121212] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white font-mono outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-[#121212] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white font-mono outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Bill Total ($ AUD)</label>
              <input
                type="number"
                step="0.01"
                value={totalAmount}
                onChange={e => setTotalAmount(parseFloat(e.target.value) || 0)}
                className="w-full font-mono bg-[#121212] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white font-bold outline-none focus:border-sky-400"
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as XeroBillStatus)}
                className="w-full bg-[#121212] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white font-bold outline-none focus:border-sky-400"
              >
                <option value="AUTHORISED">AUTHORISED</option>
                <option value="DRAFT">DRAFT</option>
                <option value="PAID">PAID</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#262626]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-gray-400 hover:bg-[#262626] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-black font-extrabold rounded-lg shadow-sm"
            >
              {editingBill ? 'Update Bill in Xero' : 'Record Bill in Xero'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
