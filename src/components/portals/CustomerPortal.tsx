import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sun,
  CheckCircle2,
  Clock,
  FileText,
  CreditCard,
  MessageSquare,
  Star,
  LifeBuoy,
  PlusCircle,
  Download,
  AlertCircle,
  ShieldCheck,
  Send,
  Zap,
  Layers,
  LogIn,
  LogOut,
  LayoutDashboard
} from 'lucide-react';
import { CompanyLogo } from '../common/CompanyLogo';
import { PortalLoginPreview } from '../common/PortalLoginPreview';

export const CustomerPortal: React.FC = () => {
  const {
    contacts,
    projects,
    tickets,
    addTicket,
    customerReviews,
    addCustomerReview,
    selectedCustomerId,
    setSelectedCustomerId,
    setSelectedPreviewProposalUrl,
    companyProfile,
    systemRules
  } = useApp();

  const [showLoginPage, setShowLoginPage] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Find currently selected customer
  const customer = contacts.find(c => c.id === selectedCustomerId) || contacts[0] || {
    id: 'customer-default',
    name: 'Marcus Aurelius Vance',
    email: 'marcus.vance@bondisolar.com.au',
    phone: '+61 412 884 910',
    address: '44 Ocean Avenue, Bondi Beach NSW 2026',
    suburb: 'Bondi Beach',
    state: 'NSW',
    postcode: '2026',
    customerType: 'Residential',
    company: 'Vance Family Residence'
  } as any;

  const customerProjects = customer ? (projects || []).filter(p => p && (p.customerId === customer.id || p.customerEmail === customer.email)) : [];
  
  const fallbackProject = {
    id: 'prj-default-customer',
    projectCode: 'SOL-2026-NSW-1048',
    status: 'Installation in Progress',
    systemSizeKw: 13.2,
    batteryBrand: 'Tesla Powerwall 3 (13.5 kWh)',
    panelModel: 'Trina Vertex S+ 440W Dual-Glass N-Type (30 Panels)',
    inverterModel: 'Fronius Primo GEN24 10.0 Plus Solar Inverter',
    address: '44 Ocean Avenue, Bondi Beach NSW 2026',
    suburb: 'Bondi Beach',
    state: 'NSW',
    postcode: '2026',
    totalContractAud: 14850,
    depositPaidAud: 1485,
    balanceDueAud: 13365,
    installationDate: '2026-09-24',
    stcCount: 168,
    stcValueAud: 6636,
    openSolarProposalId: 'prop-sample-opensolar-01'
  } as any;

  const activeProject = customerProjects[0] || (projects && projects[0]) || fallbackProject;

  // Ticket creation state
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketCategory, setTicketCategory] = useState<any>('WiFi Monitoring Drop');
  const [ticketPriority, setTicketPriority] = useState<any>('Medium');
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketFeedback, setTicketFeedback] = useState<string | null>(null);

  // Review state
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Filter tickets for this customer's projects
  const customerTickets = (tickets || []).filter(
    t => t && (t.customerId === customer.id || (activeProject && t.projectId === activeProject.id))
  );

  // Active customer reviews
  const existingReview = (customerReviews || []).find(
    r => r && (r.customerId === customer.id || r.customerName === customer.name)
  );

  // Project stages definition
  const stages = [
    { label: 'Site Assessment', done: true },
    {
      label: 'DNSP Grid Approval',
      done: Boolean(activeProject?.status && activeProject.status !== 'Site Survey')
    },
    {
      label: 'Equipment Dispatched',
      done: Boolean(
        activeProject?.status &&
        activeProject.status !== 'Site Survey' &&
        activeProject.status !== 'Engineering & DNSP Approval'
      )
    },
    {
      label: 'CEC Installation',
      done: Boolean(
        activeProject?.status &&
        (activeProject.status === 'Installation Completed' ||
        activeProject.status === 'BridgeSelect STC Claimed' ||
        activeProject.status === 'Grid Meter Connected' ||
        activeProject.status === 'Completed')
      )
    },
    {
      label: 'STC & Grid Connected',
      done: Boolean(
        activeProject?.status &&
        (activeProject.status === 'BridgeSelect STC Claimed' ||
        activeProject.status === 'Grid Meter Connected' ||
        activeProject.status === 'Completed')
      )
    },
    {
      label: 'System Handover',
      done: Boolean(activeProject?.status === 'Completed')
    }
  ];

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketTitle.trim() || !ticketDescription.trim()) return;

    const result = addTicket({
      projectId: activeProject.id,
      projectCode: activeProject.projectCode,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      title: ticketTitle.trim(),
      description: ticketDescription.trim(),
      category: ticketCategory,
      priority: ticketPriority,
      status: 'New'
    });

    if (result.success) {
      setTicketTitle('');
      setTicketDescription('');
      setIsTicketModalOpen(false);
      setTicketFeedback('Support ticket raised successfully! An AusSolar technician has been alerted.');
      setTimeout(() => setTicketFeedback(null), 5000);
    } else {
      alert(result.message);
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    addCustomerReview({
      customerId: customer.id,
      customerName: customer.name,
      suburb: customer.city || activeProject.suburb,
      state: activeProject.state,
      rating: reviewRating,
      comment: reviewComment.trim(),
      systemDetails: `${activeProject.systemSizeKw}kW ${activeProject.panelBrand} + ${activeProject.inverterBrand}`
    });

    setReviewSubmitted(true);
  };

  if (showLoginPage) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-[#181818] border-b border-[#262626] px-4 py-2 flex items-center justify-between text-xs">
          <span className="text-gray-400">
            Previewing: <strong className="text-white">Customer Portal Branded Login Page</strong>
          </span>
          <button
            type="button"
            onClick={() => setShowLoginPage(false)}
            className="px-3 py-1 bg-[#bef264] text-black font-bold rounded-lg text-xs hover:bg-[#a3e635]"
          >
            Back to Customer Dashboard
          </button>
        </div>
        <PortalLoginPreview portalType="customer" onLoginSuccess={() => setShowLoginPage(false)} />
      </div>
    );
  }

  // Customer-facing STC calculations (used exclusively for customer invoices and portal displays)
  const effectiveCustomerRate = activeProject?.customerStcRateAud ?? systemRules?.customerStcRateAud ?? 36.00;
  const effectiveCustomerStcValue = activeProject?.customerStcValueAud ?? Math.round((activeProject?.stcCount || 0) * effectiveCustomerRate);
  const grossSystemValue = (activeProject?.contractValueAud ?? activeProject?.totalContractAud ?? 0) + effectiveCustomerStcValue;

  return (
    <div className="flex-1 bg-[#0a0a0a] overflow-y-auto p-4 sm:p-6 space-y-6 text-[#e5e7eb]">
      {/* Top Customer Switcher & Company Brand Banner */}
      <div className="bg-[#161616] border border-[#2d2d2d] text-white p-4 sm:p-6 rounded-xl shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <CompanyLogo profile={companyProfile} size="lg" variant="header" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#bef264]">
                {companyProfile?.companyName || 'My Solar CRM'}
              </span>
              <span className="text-[10px] font-semibold text-gray-500">&bull;</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#bef2641a] text-[#bef264] border border-[#bef26433]">
                Customer Self-Service
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold mt-1 text-white">Welcome back, {customer.name}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Property: {activeProject.address}, {activeProject.suburb} ({activeProject.state}) &bull; DNSP: <span className="text-[#bef264]">{activeProject.dnsp}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowLoginPage(true)}
            className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Log out of customer self-service portal"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Log Out</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLoginPage(true)}
            className="px-3 py-1.5 rounded-lg bg-[#202020] hover:bg-[#282828] text-gray-300 hover:text-white border border-[#333] text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Preview how customer sees the branded login page"
          >
            <LogIn className="w-3.5 h-3.5 text-[#bef264]" />
            <span>Preview Login Screen</span>
          </button>

          {/* Switch Customer for Demonstration */}
          <div className="bg-[#121212] p-2 rounded-lg border border-[#262626] text-xs flex items-center gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Account:
            </label>
            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="bg-[#1c1c1c] text-white text-xs rounded px-2 py-1 outline-none border border-[#333] focus:border-[#bef264]"
            >
              {contacts
                .filter(c => c.type === 'Residential' || c.type === 'Commercial')
                .map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city})
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {ticketFeedback && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{ticketFeedback}</span>
        </div>
      )}

      {/* Real-time Project Progress Tracker */}
      <div className="bg-[#1e1e1e] p-5 sm:p-6 rounded-xl border border-[#2d2d2d] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#262626] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Your Solar Installation Progress</h2>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[#bef2641a] text-[#bef264] border border-[#bef26433]">
                {activeProject?.projectCode || 'SOL-SAMPLE'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Current Live Status: <strong className="text-[#bef264]">{activeProject?.status || 'Active'}</strong>
            </p>
          </div>
          <button
            onClick={() => setSelectedPreviewProposalUrl(activeProject?.openSolarProposalId)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#262626] hover:bg-[#333] text-amber-400 border border-[#333] transition-colors"
          >
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>View Signed OpenSolar Design</span>
          </button>
        </div>

        {/* Stepper Timeline */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2">
          {stages.map((stage, idx) => (
            <div
              key={stage.label}
              className={`p-3 rounded-xl border transition-all ${
                stage.done
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#161616] border-[#262626] text-gray-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold">Step {idx + 1}</span>
                {stage.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Clock className="w-4 h-4 text-gray-500" />
                )}
              </div>
              <p className="text-xs font-bold leading-snug text-white">{stage.label}</p>
              <p className="text-[10px] mt-1 text-gray-400">
                {stage.done ? 'Completed' : 'In Progress'}
              </p>
            </div>
          ))}
        </div>

        {/* System Specs Snapshot */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-[#161616] rounded-xl border border-[#262626]">
            <p className="text-[10px] font-bold text-gray-400 uppercase">System Capacity</p>
            <p className="text-sm font-bold text-white mt-0.5">{activeProject.systemSizeKw} kW</p>
            <p className="text-[11px] text-gray-400">{activeProject.panelCount} × {activeProject.panelBrand}</p>
          </div>
          <div className="p-3 bg-[#161616] rounded-xl border border-[#262626]">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Inverter</p>
            <p className="text-sm font-bold text-white mt-0.5">{activeProject.inverterBrand.split(' ')[0]}</p>
            <p className="text-[11px] text-gray-400 truncate">{activeProject.inverterModel}</p>
          </div>
          <div className="p-3 bg-[#161616] rounded-xl border border-[#262626]">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Point-of-Sale STC Rebate</p>
            <p className="text-sm font-bold text-[#bef264] mt-0.5">-${effectiveCustomerStcValue.toLocaleString()} AUD</p>
            <p className="text-[11px] text-gray-400">{activeProject.stcCount} STCs @ ${effectiveCustomerRate.toFixed(2)} AUD</p>
          </div>
          <div className="p-3 bg-[#161616] rounded-xl border border-[#262626]">
            <p className="text-[10px] font-bold text-gray-400 uppercase">DNSP Metering</p>
            <p className="text-sm font-bold text-white mt-0.5">{activeProject.dnsp}</p>
            <p className="text-[11px] text-emerald-400 font-medium">Approved</p>
          </div>
        </div>
      </div>

      {/* Invoices & Xero Payment Section */}
      <div className="bg-[#1e1e1e] p-5 sm:p-6 rounded-xl border border-[#2d2d2d] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262626] pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-base font-bold text-white">Invoices &amp; Xero Payment Status</h3>
              <p className="text-xs text-gray-400">Includes Australian Government STC point-of-sale rebate discount</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Official Tax Invoice</span>
            </button>
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 font-mono font-medium border border-blue-500/20">
              Xero Reconciled
            </span>
          </div>
        </div>

        <div className="border border-[#262626] rounded-xl overflow-hidden">
          <div className="p-4 bg-[#161616] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-white">Invoice #INV-2026-{(activeProject?.projectCode || 'SOL-2026-1048').split('-')[2] || '1048'}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Supply &amp; CEC Installation of {activeProject?.systemSizeKw || 6.6}kW Solar System at {activeProject?.address || 'Site Address'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-md border border-emerald-500/30">
                {activeProject?.status === 'Completed' ? 'PAID IN FULL' : 'DEPOSIT RECEIVED'}
              </span>
            </div>
          </div>
          <div className="p-4 space-y-2 text-xs bg-[#1e1e1e]">
            <div className="flex justify-between py-1 border-b border-[#262626]">
              <span className="text-gray-400">Gross Contract System Value:</span>
              <span className="font-semibold text-gray-200">
                ${grossSystemValue.toLocaleString()} AUD
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#262626] text-emerald-400">
              <span>Point-of-Sale STC Government Rebate ({activeProject.stcCount} STCs @ ${effectiveCustomerRate.toFixed(2)} AUD/STC):</span>
              <span className="font-semibold">-${effectiveCustomerStcValue.toLocaleString()} AUD</span>
            </div>
            <div className="flex justify-between py-1 font-bold text-sm text-white pt-1">
              <span>Total Invoiced Amount Payable:</span>
              <span className="text-[#bef264]">${(activeProject?.contractValueAud ?? activeProject?.totalContractAud ?? 0).toLocaleString()} AUD</span>
            </div>
          </div>
        </div>
      </div>

      {/* Support Tickets Section */}
      <div className="bg-[#1e1e1e] p-5 sm:p-6 rounded-xl border border-[#2d2d2d] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#262626] pb-3">
          <div className="flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-bold text-white">Post-Installation Support Tickets</h3>
          </div>

          {activeProject?.status === 'Completed' ? (
            <button
              onClick={() => setIsTicketModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold shadow-xs transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Raise Support Ticket</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Tickets open once Project Status is "Completed".</span>
            </div>
          )}
        </div>

        {activeProject?.status !== 'Completed' && (
          <div className="p-4 rounded-xl bg-[#161616] border border-[#262626] text-xs text-gray-300">
            <p className="font-semibold text-white mb-1">
              Need assistance during installation?
            </p>
            <p className="text-gray-400">
              Your project is currently in the <strong className="text-[#bef264]">{activeProject?.status || 'Active'}</strong> stage. Your dedicated operations manager can be reached directly via phone or MessageMedia SMS using your portal notifications. Dedicated maintenance and warranty tickets unlock immediately once final commissioning is marked Completed.
            </p>
          </div>
        )}

        {customerTickets.length > 0 ? (
          <div className="space-y-3">
            {customerTickets.map(tkt => (
              <div key={tkt.id} className="p-4 rounded-xl border border-[#262626] bg-[#161616] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-white">{tkt.ticketNumber}</span>
                    <span className="text-xs font-semibold text-gray-300">&bull; {tkt.title}</span>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                      tkt.status === 'Resolved'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {tkt.status}
                  </span>
                </div>
                <p className="text-xs text-gray-300">{tkt.description}</p>
                {tkt.resolutionNotes && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300">
                    <strong className="text-emerald-400">Technician Update:</strong> {tkt.resolutionNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : activeProject?.status === 'Completed' ? (
          <p className="text-xs text-gray-400 py-4 text-center">
            No active support tickets. Your solar system is operating normally.
          </p>
        ) : null}
      </div>

      {/* Customer Review Section */}
      <div className="bg-[#1e1e1e] p-5 sm:p-6 rounded-xl border border-[#2d2d2d] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#262626] pb-3">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <h3 className="text-base font-bold text-white">Write a Review for AusSolar</h3>
          </div>
          <span className="text-xs text-gray-400">Solar Customer Feedback</span>
        </div>

        {existingReview ? (
          <div className="p-4 rounded-xl bg-[#161616] border border-[#262626] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < existingReview.rating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-gray-600'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                Review Submitted
              </span>
            </div>
            <p className="text-xs text-gray-300 italic">"{existingReview.comment}"</p>
            {existingReview.adminReply && (
              <div className="p-3 bg-[#121212] rounded-lg border border-[#262626] text-xs text-gray-300 mt-2">
                <span className="font-bold text-[#bef264] block mb-0.5">AusSolar Retailer Response:</span>
                {existingReview.adminReply}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleReviewSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Your Rating</label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className="p-1 text-amber-400 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-gray-600'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-white ml-2">{reviewRating} Stars</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Share your solar installation experience
              </label>
              <textarea
                rows={3}
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                placeholder="How was the CEC installation, energy bill savings, and communication with our team?"
                className="w-full text-xs p-3 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none placeholder:text-gray-500"
              />
            </div>

            <button
              type="submit"
              disabled={!reviewComment.trim()}
              className="px-4 py-2 bg-[#bef264] hover:bg-[#a3e635] disabled:opacity-40 text-black text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Customer Review</span>
            </button>
          </form>
        )}
      </div>

      {/* Ticket Modal */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-[#1e1e1e] rounded-xl shadow-2xl border border-[#2d2d2d] overflow-hidden text-[#e5e7eb]">
            <div className="p-4 bg-[#161616] border-b border-[#262626] text-white flex items-center justify-between">
              <h4 className="font-bold text-sm">Raise Solar System Support Ticket</h4>
              <button onClick={() => setIsTicketModalOpen(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Category</label>
                <select
                  value={ticketCategory}
                  onChange={e => setTicketCategory(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                >
                  <option value="Inverter Fault / Error Code">Inverter Fault / Error Code</option>
                  <option value="WiFi Monitoring Drop">WiFi Monitoring Drop</option>
                  <option value="Panel Damage / Shading">Panel Damage / Shading</option>
                  <option value="Switchboard Trip">Switchboard Trip</option>
                  <option value="Roof Leak Inspection">Roof Leak Inspection</option>
                  <option value="General Query">General Query</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Issue Summary</label>
                <input
                  type="text"
                  value={ticketTitle}
                  onChange={e => setTicketTitle(e.target.value)}
                  placeholder="e.g. Inverter displaying Error 504 on red LED"
                  className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none placeholder:text-gray-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Description &amp; Symptoms</label>
                <textarea
                  rows={3}
                  value={ticketDescription}
                  onChange={e => setTicketDescription(e.target.value)}
                  placeholder="Please describe what you are seeing on your app or switchboard..."
                  className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none placeholder:text-gray-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTicketModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#bef264] hover:bg-[#a3e635] text-black rounded-lg text-xs font-bold transition-colors"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Australian Tax Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#1a1a1a] rounded-xl shadow-2xl border border-[#333] overflow-hidden text-[#e5e7eb]">
            {/* Modal Top Bar */}
            <div className="p-4 bg-[#141414] border-b border-[#262626] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#bef264]" />
                <span className="text-sm font-bold text-white">Australian Tax Invoice Preview</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Xero Sync Ready
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-[#262626] hover:bg-[#333] text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Print / PDF</span>
                </button>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#262626]"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Tax Invoice Document Body */}
            <div className="p-6 space-y-6 bg-[#161616]">
              {/* Header Details */}
              <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-[#262626] pb-5">
                <div>
                  <h2 className="text-lg font-black text-white tracking-wide">
                    {companyProfile?.companyName || 'SolarFlow Retail Pty Ltd'}
                  </h2>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    {companyProfile?.abnNumber || 'ABN 84 629 104 291'}
                  </p>
                  <p className="text-xs text-gray-400">{companyProfile?.streetAddress || '100 Miller Street, North Sydney NSW 2060'}</p>
                  <p className="text-xs text-gray-400">Phone: {companyProfile?.supportPhone || '1300 852 400'}</p>
                </div>
                <div className="sm:text-right">
                  <span className="inline-block text-xs font-bold px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
                    TAX INVOICE
                  </span>
                  <p className="text-xs font-mono text-white">
                    <strong>Invoice #:</strong> INV-2026-{(activeProject?.projectCode || 'SOL-2026-1048').split('-')[2] || '1048'}
                  </p>
                  <p className="text-xs text-gray-400 font-mono">Date: {new Date().toLocaleDateString('en-AU')}</p>
                  <p className="text-xs text-gray-400">Project: {activeProject?.projectCode || 'SOL-PROJECT'}</p>
                </div>
              </div>

              {/* Bill To Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-[#1a1a1a] p-3.5 rounded-lg border border-[#262626]">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Bill To:</span>
                  <p className="font-bold text-white">{customer.name}</p>
                  <p className="text-gray-300">{activeProject.address}</p>
                  <p className="text-gray-300">{activeProject.suburb}, {activeProject.state}</p>
                  <p className="text-gray-400 font-mono mt-1">{customer.email}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Installation Site:</span>
                  <p className="font-bold text-white">{activeProject.title}</p>
                  <p className="text-gray-300">{activeProject.address}</p>
                  <p className="text-gray-400">DNSP Network: {activeProject.dnsp}</p>
                  <p className="text-gray-400">CEC Accreditation: {activeProject.subcontractorName || 'Accredited Master Installer'}</p>
                </div>
              </div>

              {/* Invoice Line Items Table */}
              <div className="border border-[#262626] rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#121212] text-gray-400 uppercase font-bold text-[10px] border-b border-[#262626]">
                    <tr>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-center">Qty / STCs</th>
                      <th className="p-3 text-right">Unit Rate</th>
                      <th className="p-3 text-right">Total (AUD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262626]">
                    <tr>
                      <td className="p-3">
                        <div className="font-bold text-white">
                          Solar Photovoltaic Generation System Supply &amp; CEC Installation
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {activeProject.systemSizeKw}kW System ({activeProject.panelCount}× {activeProject.panelBrand} Panels, {activeProject.inverterBrand} Inverter, Mounting Hardware &amp; Commissioning)
                        </div>
                      </td>
                      <td className="p-3 text-center text-gray-300 font-mono">1.0</td>
                      <td className="p-3 text-right text-gray-300 font-mono">${grossSystemValue.toLocaleString()}</td>
                      <td className="p-3 text-right font-bold text-white font-mono">${grossSystemValue.toLocaleString()}</td>
                    </tr>
                    <tr className="bg-emerald-500/5">
                      <td className="p-3">
                        <div className="font-bold text-emerald-400">
                          Less: Australian STC Government Rebate (Point of Sale Discount)
                        </div>
                        <div className="text-[11px] text-gray-400">
                          Clean Energy Regulator Renewable Energy Target Small-scale Technology Certificates point-of-sale assignment discount.
                        </div>
                      </td>
                      <td className="p-3 text-center text-emerald-400 font-mono font-semibold">{activeProject.stcCount} Certs</td>
                      <td className="p-3 text-right text-emerald-400 font-mono">${effectiveCustomerRate.toFixed(2)} AUD</td>
                      <td className="p-3 text-right font-bold text-emerald-400 font-mono">-${effectiveCustomerStcValue.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total Summary */}
              <div className="flex justify-end">
                <div className="w-full sm:w-72 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#262626]">
                    <span className="text-gray-400">Subtotal Gross:</span>
                    <span className="font-mono text-gray-200">${grossSystemValue.toLocaleString()} AUD</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#262626] text-emerald-400">
                    <span>STC Rebate Discount:</span>
                    <span className="font-mono font-bold">-${effectiveCustomerStcValue.toLocaleString()} AUD</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#262626]">
                    <span className="text-gray-400">Includes GST (10%):</span>
                    <span className="font-mono text-gray-300">
                      ${Math.round(((activeProject?.contractValueAud ?? activeProject?.totalContractAud ?? 0)) / 11).toLocaleString()} AUD
                    </span>
                  </div>
                  <div className="flex justify-between py-2 font-bold text-sm text-white pt-2 border-t border-[#333]">
                    <span>Total Amount Invoiced:</span>
                    <span className="text-[#bef264] font-mono">${((activeProject?.contractValueAud ?? activeProject?.totalContractAud ?? 0)).toLocaleString()} AUD</span>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="p-3.5 bg-[#1a1a1a] rounded-lg border border-[#262626] text-[11px] text-gray-400 space-y-1">
                <p className="font-bold text-white">Payment Method &amp; Remittance:</p>
                <p>Bank: National Australia Bank (NAB) | Account Name: SolarFlow Operations | BSB: 082-001 | Acc: 9481 2291</p>
                <p>Reference: <strong className="text-[#bef264]">INV-2026-{(activeProject?.projectCode || 'SOL-2026-1048').split('-')[2] || '1048'}</strong></p>
              </div>
            </div>

            {/* Modal Bottom Close */}
            <div className="p-4 bg-[#141414] border-t border-[#262626] flex justify-end">
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="px-4 py-2 bg-[#262626] hover:bg-[#333] text-white text-xs font-bold rounded-lg transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
