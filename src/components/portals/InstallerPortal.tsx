import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  HardHat,
  FolderKanban,
  FileSpreadsheet,
  Download,
  Camera,
  Upload,
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  Layers,
  MapPin,
  ShieldCheck,
  Zap,
  DollarSign,
  LogIn,
  LogOut
} from 'lucide-react';
import { ProjectStatus } from '../../types';
import { CompanyLogo } from '../common/CompanyLogo';
import { PortalLoginPreview } from '../common/PortalLoginPreview';

export const InstallerPortal: React.FC = () => {
  const {
    subContractors,
    selectedInstallerId,
    setSelectedInstallerId,
    projects,
    installOrders,
    updateProjectStatus,
    uploadProjectPhoto,
    submitInstallerQuote,
    companyProfile
  } = useApp();

  const [showLoginPage, setShowLoginPage] = useState(false);

  const fallbackSub = {
    id: 'sub-default-installer',
    companyName: 'Apex Clean Energy Installations Pty Ltd',
    abn: '83 612 940 182',
    cecAccreditationNumber: 'A9428172',
    primaryContact: 'David Miller (Lead CEC Accredited Electrician)',
    email: 'david@apexinstallations.com.au',
    phone: '+61 412 884 910',
    state: 'NSW',
    status: 'Active',
    insuranceExpiryDate: '2027-06-30'
  } as any;

  const currentSub = subContractors.find(s => s.id === selectedInstallerId) || subContractors[0] || fallbackSub;

  const [activeTab, setActiveTab] = useState<'assigned' | 'quotes' | 'compliance'>('assigned');

  // Photo upload form state
  const [activePhotoProjectId, setActivePhotoProjectId] = useState<string>('');
  const [photoCategory, setPhotoCategory] = useState<any>('Array / Panels');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Quote form state
  const [selectedRfqId, setSelectedRfqId] = useState<string>('');
  const [quoteAmount, setQuoteAmount] = useState<string>('');
  const [estimatedDays, setEstimatedDays] = useState<number>(1);
  const [crewSize, setCrewSize] = useState<number>(3);
  const [quoteNotes, setQuoteNotes] = useState('');
  const [quoteSuccess, setQuoteSuccess] = useState(false);

  // Filter assigned projects for this subcontractor
  const assignedProjects = (projects || []).filter(
    p => p && (p.subcontractorId === currentSub.id || p.subcontractorName === currentSub.companyName)
  );

  // Filter RFQ install orders relevant to this state or open
  const availableRfqs = (installOrders || []).filter(
    io => io && (io.state === currentSub.state || io.state === 'NSW') && (io.status === 'RFQ Sent' || io.status === 'Quotes Received')
  );

  const handlePhotoUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePhotoProjectId || !photoUrl.trim()) return;

    uploadProjectPhoto(activePhotoProjectId, {
      category: photoCategory,
      url: photoUrl.trim()
    });

    setPhotoUrl('');
    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 4000);
  };

  const handleQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRfqId || !quoteAmount) return;

    submitInstallerQuote(selectedRfqId, {
      subcontractorId: currentSub.id,
      subcontractorName: currentSub.companyName,
      amountAud: parseFloat(quoteAmount),
      estimatedDays,
      crewSize,
      notes: quoteNotes
    });

    setQuoteSuccess(true);
    setQuoteAmount('');
    setQuoteNotes('');
    setTimeout(() => setQuoteSuccess(false), 4000);
  };

  const samplePhotoUrls = [
    { label: 'Array / Panels', url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80' },
    { label: 'Inverter & Isolators', url: 'https://images.unsplash.com/photo-1548611716-ad38e7e1f400?w=600&auto=format&fit=crop&q=80' },
    { label: 'Switchboard & Meter', url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80' }
  ];

  if (showLoginPage) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-[#181818] border-b border-[#262626] px-4 py-2 flex items-center justify-between text-xs">
          <span className="text-gray-400">
            Previewing: <strong className="text-white">Subcontractor Installer Branded Login Page</strong>
          </span>
          <button
            type="button"
            onClick={() => setShowLoginPage(false)}
            className="px-3 py-1 bg-[#bef264] text-black font-bold rounded-lg text-xs hover:bg-[#a3e635]"
          >
            Back to Installer Dashboard
          </button>
        </div>
        <PortalLoginPreview portalType="installer" onLoginSuccess={() => setShowLoginPage(false)} />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#0a0a0a] overflow-y-auto p-4 sm:p-6 space-y-6 text-[#e5e7eb]">
      {/* Header Banner */}
      <div className="bg-[#161616] border border-[#2d2d2d] text-white p-5 sm:p-6 rounded-xl shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <CompanyLogo profile={companyProfile} size="lg" variant="header" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#bef264]">
                {companyProfile?.companyName || 'My Solar CRM'}
              </span>
              <span className="text-[10px] font-semibold text-gray-500">&bull;</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#bef2641a] text-[#bef264] px-2 py-0.5 rounded-md border border-[#bef26433]">
                Subcontractor Portal
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                CEC: {currentSub.cecAccreditationNumber}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mt-1.5 text-white">{currentSub.companyName}</h1>
            <p className="text-xs text-gray-400">
              Primary Contact: {currentSub.name} &bull; Metro Areas: {currentSub.metroAreas.join(', ')}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowLoginPage(true)}
            className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Log out of subcontractor installer portal"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Log Out</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLoginPage(true)}
            className="px-3 py-1.5 rounded-lg bg-[#202020] hover:bg-[#282828] text-gray-300 hover:text-white border border-[#333] text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Preview how subcontractor installer sees the branded login page"
          >
            <LogIn className="w-3.5 h-3.5 text-[#bef264]" />
            <span>Preview Login Screen</span>
          </button>

          {/* Switch Installer */}
          <div className="bg-[#121212] p-2 rounded-lg border border-[#262626] text-xs flex items-center gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Crew:
            </label>
            <select
              value={selectedInstallerId}
              onChange={e => setSelectedInstallerId(e.target.value)}
              className="bg-[#1c1c1c] text-white text-xs rounded px-2 py-1 outline-none border border-[#333] focus:border-[#bef264]"
            >
              {subContractors.map(s => (
                <option key={s.id} value={s.id}>
                  {s.companyName} ({s.state})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#262626] gap-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('assigned')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'assigned'
              ? 'border-[#bef264] text-[#bef264]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          <span>Assigned Work Orders ({assignedProjects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('quotes')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'quotes'
              ? 'border-[#bef264] text-[#bef264]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Quote on RFQs ({availableRfqs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('compliance')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'compliance'
              ? 'border-[#bef264] text-[#bef264]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>CEC &amp; SAA Compliance Credentials</span>
        </button>
      </div>

      {/* TAB 1: Assigned Jobs & Photos */}
      {activeTab === 'assigned' && (
        <div className="space-y-6">
          {assignedProjects.length === 0 ? (
            <div className="bg-[#1e1e1e] p-8 rounded-xl text-center text-xs text-gray-400 border border-[#2d2d2d]">
              No installations currently assigned to {currentSub.companyName}. Check the RFQ tab to bid on upcoming projects.
            </div>
          ) : (
            assignedProjects.map(proj => (
              <div
                key={proj.id}
                className="bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] shadow-xs overflow-hidden"
              >
                {/* Job Header */}
                <div className="p-4 sm:p-5 bg-[#161616] border-b border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-white">{proj.projectCode}</span>
                      <span className="text-xs font-semibold text-gray-300">&bull; {proj.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#bef2641a] text-[#bef264] border border-[#bef26433] font-medium">
                        {proj.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#bef264]" />
                      <span>{proj.address}, {proj.suburb} ({proj.state})</span>
                      <span>&bull; Contact: {proj.customerName} ({proj.customerPhone})</span>
                    </div>
                  </div>

                  {/* Status update selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-400">Update Status:</span>
                    <select
                      value={proj.status}
                      onChange={e => updateProjectStatus(proj.id, e.target.value as ProjectStatus)}
                      className="text-xs font-semibold bg-[#121212] border border-[#262626] rounded-lg px-2.5 py-1.5 text-white shadow-xs focus:border-[#bef264] outline-none"
                    >
                      <option value="Install Scheduled">Install Scheduled</option>
                      <option value="Installation in Progress">Installation in Progress</option>
                      <option value="Installation Completed">Installation Completed</option>
                      <option value="Completed">Completed &amp; Handover</option>
                    </select>
                  </div>
                </div>

                {/* Job Specs & Attached Docs */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-[#262626]">
                  <div className="space-y-1.5 text-xs">
                    <p className="text-[11px] font-bold uppercase text-gray-400">System Specifications</p>
                    <p className="text-gray-200">
                      <strong>Panels:</strong> {proj.panelCount} × {proj.panelBrand} ({proj.panelModel})
                    </p>
                    <p className="text-gray-200">
                      <strong>Inverter:</strong> {proj.inverterBrand} ({proj.inverterModel})
                    </p>
                    {proj.batteryBrand && (
                      <p className="text-emerald-400">
                        <strong>Battery:</strong> {proj.batteryBrand} ({proj.batteryCapacityKwh} kWh)
                      </p>
                    )}
                    <p className="text-gray-200">
                      <strong>DNSP Grid:</strong> {proj.dnsp}
                    </p>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <p className="text-[11px] font-bold uppercase text-gray-400">Contract &amp; Labor Quoted</p>
                    <p className="text-gray-200">
                      <strong>Installer Payout:</strong> ${proj.installerQuotedAud?.toLocaleString() || '2,850'} AUD
                    </p>
                    <p className="text-gray-200">
                      <strong>BridgeSelect STC Count:</strong> {proj.stcCount} Certs (${proj.stcValueAud.toLocaleString()} AUD)
                    </p>
                    <p className="text-gray-200">
                      <strong>Scheduled Date:</strong> {proj.installationDate || 'Next business day'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase text-gray-400">Attached Work Order Documents</p>
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => alert(`Downloading Project Specifications for ${proj.projectCode}`)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-[#262626] hover:bg-[#333] text-gray-200 font-semibold flex items-center justify-between transition-colors"
                      >
                        <span>Project Specifications PDF</span>
                        <Download className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                      <button
                        onClick={() => alert(`Downloading Architectural Roof Site Plan for ${proj.projectCode}`)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-[#262626] hover:bg-[#333] text-gray-200 font-semibold flex items-center justify-between transition-colors"
                      >
                        <span>Engineering Site Plan PDF</span>
                        <Download className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Upload Installation Photos Section */}
                <div className="p-5 bg-[#161616]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-[#bef264]" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        CEC Mandatory Installation Verification Photos ({proj.installedPhotos?.length || 0})
                      </h4>
                    </div>
                    <button
                      onClick={() => setActivePhotoProjectId(activePhotoProjectId === proj.id ? '' : proj.id)}
                      className="text-xs font-semibold text-[#bef264] hover:underline"
                    >
                      {activePhotoProjectId === proj.id ? 'Hide Upload Form' : '+ Upload Installation Photo'}
                    </button>
                  </div>

                  {/* Photo Upload Form */}
                  {activePhotoProjectId === proj.id && (
                    <form onSubmit={handlePhotoUploadSubmit} className="mb-4 p-4 rounded-xl bg-[#1e1e1e] border border-[#2d2d2d] space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-1">Photo Category</label>
                          <select
                            value={photoCategory}
                            onChange={e => setPhotoCategory(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                          >
                            <option value="Array / Panels">Array / Panels</option>
                            <option value="Inverter & Isolators">Inverter &amp; Isolators</option>
                            <option value="Switchboard">Switchboard &amp; Main Meter</option>
                            <option value="Earthing & Testing">Earthing &amp; Testing</option>
                            <option value="Commissioning Sheet">Commissioning Sheet / SAA Signoff</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-1">Image URL / Fast Pick</label>
                          <input
                            type="text"
                            value={photoUrl}
                            onChange={e => setPhotoUrl(e.target.value)}
                            placeholder="Enter image URL or select below..."
                            className="w-full text-xs p-2 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none placeholder:text-gray-500"
                            required
                          />
                        </div>
                      </div>

                      {/* Quick sample image buttons */}
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-gray-400">Quick Samples:</span>
                        {samplePhotoUrls.map((s, idx) => (
                          <button
                            type="button"
                            key={idx}
                            onClick={() => {
                              setPhotoCategory(s.label as any);
                              setPhotoUrl(s.url);
                            }}
                            className="px-2 py-0.5 rounded bg-[#262626] hover:bg-[#333] text-gray-300 border border-[#333]"
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-[#bef264] hover:bg-[#a3e635] text-black rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Submit Photo for BridgeSelect &amp; CEC Audit</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {uploadSuccess && (
                    <div className="p-3 mb-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Installation photo submitted and geotagged for BridgeSelect audit verification!</span>
                    </div>
                  )}

                  {/* Photo Gallery Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {proj.installedPhotos && proj.installedPhotos.length > 0 ? (
                      proj.installedPhotos.map(photo => (
                        <div key={photo.id} className="group relative rounded-xl border border-[#262626] overflow-hidden bg-slate-900">
                          <img
                            src={photo.url}
                            alt={photo.category}
                            referrerPolicy="no-referrer"
                            className="w-full h-28 object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent p-2 flex flex-col justify-end">
                            <span className="text-[10px] font-bold text-white leading-tight">{photo.category}</span>
                            <span className="text-[9px] text-emerald-400 flex items-center gap-0.5 mt-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" /> CEC Verified
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-4 text-center text-xs text-gray-400">
                        No photos uploaded yet for this work order. Use the button above to upload CEC required evidence.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: RFQ & Quote Submissions */}
      {activeTab === 'quotes' && (
        <div className="space-y-6">
          <div className="bg-[#1e1e1e] p-5 rounded-xl border border-[#2d2d2d] shadow-xs">
            <h3 className="text-sm font-bold text-white mb-1">
              Open Requests for Quotes (RFQs) in {currentSub.state} Metro
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Submit your installation labor quote based on the project specifications and site conditions submitted by AusSolar.
            </p>

            {quoteSuccess && (
              <div className="p-3 mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Quote submitted successfully to AusSolar Operations! You will be notified once awarded.</span>
              </div>
            )}

            <div className="space-y-4">
              {availableRfqs.map(rfq => {
                const myQuote = rfq.quotes.find(q => q.subcontractorId === currentSub.id);
                return (
                  <div key={rfq.id} className="p-4 rounded-xl border border-[#262626] bg-[#161616] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#262626] pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-white">{rfq.orderNumber}</span>
                          <span className="text-xs font-semibold text-gray-300">&bull; {rfq.customerName} ({rfq.systemSizeKw}kW)</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium">
                            {rfq.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Location: {rfq.address} &bull; Roof: {rfq.roofType} ({rfq.storeys})
                        </p>
                      </div>

                      {myQuote ? (
                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                            Your Quote: ${myQuote.amountAud.toLocaleString()} AUD ({myQuote.status})
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedRfqId(rfq.id)}
                          className="px-3 py-1.5 bg-[#bef264] hover:bg-[#a3e635] text-black rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Submit Quote</span>
                        </button>
                      )}
                    </div>

                    {/* Submitted requirements (different project to project) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-[#1e1e1e] p-3 rounded-lg border border-[#262626]">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Panel Count:</span>
                        <span className="font-semibold text-white">{rfq.submittedRequirements.panelCount} Panels</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Inverter:</span>
                        <span className="font-semibold text-white">{rfq.submittedRequirements.inverterType}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Battery Included:</span>
                        <span className="font-semibold text-white">{rfq.submittedRequirements.batteryIncluded ? 'Yes' : 'No'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Switchboard Upgrade:</span>
                        <span className="font-semibold text-white">
                          {rfq.submittedRequirements.switchboardUpgradeRequired ? 'Required' : 'Standard'}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-300">
                      <strong className="text-white">Site Access Instructions:</strong> {rfq.submittedRequirements.siteAccessInstructions}
                    </div>

                    {/* Quote Entry Modal or Inline drawer if selected */}
                    {selectedRfqId === rfq.id && !myQuote && (
                      <form onSubmit={handleQuoteSubmit} className="mt-3 p-4 bg-[#1e1e1e] border border-[#bef264]/30 rounded-xl space-y-3">
                        <h4 className="text-xs font-bold text-[#bef264] uppercase">Submit Installation Quote for {rfq.orderNumber}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-300 mb-1">Quote Total (AUD ex. GST)</label>
                            <input
                              type="number"
                              value={quoteAmount}
                              onChange={e => setQuoteAmount(e.target.value)}
                              placeholder="e.g. 2850"
                              className="w-full text-xs p-2 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-300 mb-1">Estimated Days</label>
                            <input
                              type="number"
                              step="0.5"
                              value={estimatedDays}
                              onChange={e => setEstimatedDays(parseFloat(e.target.value))}
                              className="w-full text-xs p-2 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-300 mb-1">Crew Size</label>
                            <input
                              type="number"
                              value={crewSize}
                              onChange={e => setCrewSize(parseInt(e.target.value))}
                              className="w-full text-xs p-2 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-300 mb-1">Notes &amp; Scope Inclusions</label>
                          <textarea
                            rows={2}
                            value={quoteNotes}
                            onChange={e => setQuoteNotes(e.target.value)}
                            placeholder="Inclusions: Tile brackets, edge protection, SAA signoff..."
                            className="w-full text-xs p-2 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedRfqId('')}
                            className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 bg-[#bef264] hover:bg-[#a3e635] text-black rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Submit Quote to Retailer</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Accreditation & Compliance */}
      {activeTab === 'compliance' && (
        <div className="bg-[#1e1e1e] p-5 rounded-xl border border-[#2d2d2d] shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#262626] pb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">CEC &amp; SAA Subcontractor Credentials</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#161616] border border-[#262626] space-y-2 text-xs">
              <p className="font-bold text-white text-sm">Clean Energy Council Accreditation</p>
              <p className="text-gray-300">
                Accreditation ID: <span className="font-mono font-bold text-[#bef264]">{currentSub.cecAccreditationNumber}</span>
              </p>
              <p className="text-gray-400">
                Endorsements: Grid-Connect PV, Battery Storage Design &amp; Install
              </p>
              <p className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified in BridgeSelect &amp; REC Registry
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#161616] border border-[#262626] space-y-2 text-xs">
              <p className="font-bold text-white text-sm">Solar Accreditation Australia (SAA)</p>
              <p className="text-gray-300">
                License Number: <span className="font-mono font-bold text-[#bef264]">{currentSub.saaLicenseNumber}</span>
              </p>
              <p className="text-gray-400">
                Public Liability Insurance Expiry: <span className="font-semibold text-white">{currentSub.insuranceExpiryDate}</span>
              </p>
              <p className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> $20M Public Liability Active
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
