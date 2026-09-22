import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Building2,
  Plus,
  Phone,
  Mail,
  MapPin,
  Search,
  ShieldCheck,
  Edit2,
  Trash2,
  CheckCircle2,
  ExternalLink,
  UserCheck,
  Calendar,
  Globe2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { Company } from '../../types';
import { validateAndVerifyABN } from '../../utils/abnValidator';

export const CompaniesView: React.FC = () => {
  const { companies, addCompany, updateCompany, deleteCompany, systemUsers, dropdowns } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [showAbnSourceModal, setShowAbnSourceModal] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Available Company Types from Settings Dropdowns (with safe fallbacks)
  const companyTypeOptions = dropdowns.companyTypes && dropdowns.companyTypes.length > 0
    ? dropdowns.companyTypes
    : ['Commercial Customer', 'Subcontractor Installer', 'Equipment Vendor', 'Engineering Consultant', 'Wholesaler / Distributor'];

  // Available States from Settings Dropdowns (with safe fallbacks)
  const stateOptions = dropdowns.states && dropdowns.states.length > 0
    ? dropdowns.states
    : ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

  // Form State for Adding / Editing
  const [name, setName] = useState('');
  const [companyOwner, setCompanyOwner] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Australia');
  const [type, setType] = useState(companyTypeOptions[0] || 'Commercial Customer');
  const [abn, setAbn] = useState('');
  const [state, setState] = useState(stateOptions[0] || 'NSW');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [cecAccredited, setCecAccredited] = useState(false);

  const resetForm = () => {
    setName('');
    setCompanyOwner(systemUsers[0]?.name || '');
    setPhone('');
    setCountry('Australia');
    setType(companyTypeOptions[0] || 'Commercial Customer');
    setAbn('');
    setState(stateOptions[0] || 'NSW');
    setCity('');
    setEmail('');
    setContactPerson('');
    setCecAccredited(false);
    setEditingCompany(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (comp: Company) => {
    setEditingCompany(comp);
    setName(comp.name || '');
    setCompanyOwner(comp.companyOwnerName || comp.companyOwner || systemUsers[0]?.name || '');
    setPhone(comp.phone || '');
    setCountry(comp.country || 'Australia');
    setType(comp.type || companyTypeOptions[0] || 'Commercial Customer');
    setAbn(comp.abn || '');
    setState(comp.state || stateOptions[0] || 'NSW');
    setCity(comp.city || '');
    setEmail(comp.email || '');
    setContactPerson(comp.contactPerson || '');
    setCecAccredited(!!comp.cecAccredited);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const selectedUser = systemUsers.find(u => u.name === companyOwner || u.id === companyOwner);
    const ownerName = selectedUser?.name || companyOwner || systemUsers[0]?.name || 'Internal Operations';

    const abnCheck = validateAndVerifyABN(abn);

    addCompany({
      name: name.trim(),
      companyOwner: selectedUser?.id || companyOwner,
      companyOwnerName: ownerName,
      createdAt: new Date().toISOString().split('T')[0],
      phone: phone.trim() || '+61 2 8000 0000',
      country: country.trim() || 'Australia',
      type,
      abn: abn.trim() || 'Pending ABN',
      state,
      city: city.trim() || `${state} Metro`,
      email: email.trim() || 'info@company.com.au',
      contactPerson: contactPerson.trim() || 'Managing Director',
      cecAccredited,
      activeProjectsCount: 0,
      abnVerified: abnCheck.isValid
    });

    setIsAddModalOpen(false);
    resetForm();
    setSuccessToast(`Company "${name.trim()}" created successfully.`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany || !name.trim()) return;

    const selectedUser = systemUsers.find(u => u.name === companyOwner || u.id === companyOwner);
    const ownerName = selectedUser?.name || companyOwner || systemUsers[0]?.name || 'Internal Operations';

    const abnCheck = validateAndVerifyABN(abn);

    updateCompany(editingCompany.id, {
      name: name.trim(),
      companyOwner: selectedUser?.id || companyOwner,
      companyOwnerName: ownerName,
      phone: phone.trim(),
      country: country.trim() || 'Australia',
      type,
      abn: abn.trim(),
      state,
      city: city.trim(),
      email: email.trim(),
      contactPerson: contactPerson.trim(),
      cecAccredited,
      abnVerified: abnCheck.isValid
    });

    setEditingCompany(null);
    resetForm();
    setSuccessToast(`Company "${name.trim()}" updated successfully.`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleDeleteCompany = (comp: Company) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete company "${comp.name}"? This action cannot be undone.`);
    if (confirmDelete) {
      deleteCompany(comp.id);
      setSuccessToast(`Company "${comp.name}" deleted.`);
      setTimeout(() => setSuccessToast(null), 3500);
    }
  };

  const filteredCompanies = companies.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.abn.includes(searchTerm) ||
      (c.city && c.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.companyOwnerName && c.companyOwnerName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || c.type === filterType;
    return matchesSearch && matchesType;
  });

  const liveAbnValidation = validateAndVerifyABN(abn);

  return (
    <div className="flex-1 bg-[#0a0a0a] overflow-y-auto p-4 sm:p-6 space-y-6 text-[#e5e7eb]">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Companies &amp; Subcontractors Directory</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#bef2641a] text-[#bef264] border border-[#bef26433]">
              Fully Editable
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Organized corporate entities: Commercial Solar Clients, Subcontractor Installer Crews, and Equipment Wholesalers
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => setShowAbnSourceModal(true)}
            className="px-3 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] border border-[#2d2d2d] text-gray-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Learn how ABNs are sourced & verified via ATO & ABR"
          >
            <Info className="w-3.5 h-3.5 text-sky-400" />
            <span>ABN Verification Info</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-lg bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Company</span>
          </button>
        </div>
      </div>

      {/* Info note explaining residential vs commercial & ABN Verification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3.5 bg-[#161616] border border-[#262626] rounded-xl text-xs text-gray-300 flex items-start gap-2.5">
          <Building2 className="w-4 h-4 text-[#bef264] mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-white">Commercial vs Residential Rule:</p>
            <p className="text-gray-400 text-[11px] mt-0.5">
              Residential customers do not belong to a corporate entity. Companies are strictly applied to Commercial Solar Clients, Hardware Wholesalers/Vendors (e.g. Krannich), and Subcontractor Installer partner crews.
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-[#161616] border border-[#262626] rounded-xl text-xs text-gray-300 flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-white">ABN Source &amp; Statutory Validation:</p>
              <p className="text-gray-400 text-[11px] mt-0.5">
                ABNs are issued by the <strong className="text-gray-200">Australian Business Register (ABR)</strong> and validated via the statutory <strong className="text-gray-200">ATO Modulus-89 algorithm</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAbnSourceModal(true)}
            className="text-[11px] text-[#bef264] font-semibold hover:underline shrink-0 self-center"
          >
            View Details &rarr;
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#1e1e1e] p-4 rounded-xl border border-[#2d2d2d] shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search companies by name, ABN, suburb, owner..."
            className="w-full text-xs pl-9 pr-4 py-2 rounded-lg bg-[#121212] border border-[#262626] text-white placeholder:text-gray-500 outline-none focus:border-[#bef264]"
          />
        </div>

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="text-xs font-semibold bg-[#121212] border border-[#262626] text-white rounded-lg px-3 py-2 outline-none w-full sm:w-auto focus:border-[#bef264]"
        >
          <option value="all">All Company Classifications</option>
          {companyTypeOptions.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCompanies.map(comp => {
          const abnCheck = validateAndVerifyABN(comp.abn);
          return (
            <div
              key={comp.id}
              className="bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] shadow-xs p-5 flex flex-col justify-between space-y-4 hover:border-[#bef264]/40 transition-colors relative group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-white leading-tight truncate">{comp.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[11px] font-mono text-gray-300">ABN: {comp.abn}</span>
                      {abnCheck.checksumPassed ? (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" title="ATO Modulus-89 Checksum Valid">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30" title="Checksum Warning">
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                          Unverified
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                      comp.type === 'Subcontractor Installer'
                        ? 'bg-[#bef2641a] text-[#bef264] border-[#bef26433]'
                        : comp.type === 'Equipment Vendor'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    }`}
                  >
                    {comp.type}
                  </span>
                </div>

                {/* Details List */}
                <div className="space-y-1.5 text-xs text-gray-300 mt-3">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="text-gray-400">Owner:</span>
                    <span className="font-medium text-white">{comp.companyOwnerName || comp.companyOwner || 'Internal Team'}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#bef264] shrink-0" />
                    <span>{comp.city} ({comp.state}), {comp.country || 'Australia'}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span className="font-mono text-gray-400">{comp.phone}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span className="truncate text-gray-400">{comp.email}</span>
                  </div>

                  {comp.createdAt && (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <Calendar className="w-3 h-3 text-gray-500 shrink-0" />
                      <span>Created: {comp.createdAt}</span>
                    </div>
                  )}
                </div>

                {comp.cecAccredited && (
                  <div className="mt-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/30">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>CEC &amp; SAA Accredited</span>
                  </div>
                )}
              </div>

              {/* Footer with Edit & Delete Controls */}
              <div className="pt-3 border-t border-[#262626] flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-500 text-[11px]">Contact: </span>
                  <span className="font-semibold text-white">{comp.contactPerson}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <a
                    href={abnCheck.lookupUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-[#262626] hover:bg-[#333] text-gray-400 hover:text-sky-400 transition-colors"
                    title="Open official ABN Lookup on abr.business.gov.au"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(comp)}
                    className="p-1.5 rounded-lg bg-[#262626] hover:bg-[#bef264] hover:text-black text-gray-300 transition-colors flex items-center gap-1 font-semibold text-xs px-2"
                    title="Edit Company Details"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteCompany(comp)}
                    className="p-1.5 rounded-lg bg-[#262626] hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition-colors"
                    title="Delete Company"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Company Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#1e1e1e] rounded-xl shadow-2xl border border-[#2d2d2d] overflow-hidden text-[#e5e7eb] my-8">
            <div className="p-4 bg-[#161616] border-b border-[#262626] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Add Company Entity</h3>
                <p className="text-[11px] text-gray-400">All fields configured with dynamic Settings dropdowns</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-3.5">
              {/* a. Company Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Company Name <span className="text-[#bef264]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Sydney Commercial Solar Solutions Pty Ltd"
                  className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none placeholder:text-gray-500"
                  required
                />
              </div>

              {/* b. Company Owner & f. Company Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Company Owner (Internal Team) <span className="text-[#bef264]">*</span>
                  </label>
                  <select
                    value={companyOwner}
                    onChange={e => setCompanyOwner(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                    required
                  >
                    <option value="">-- Select Team Owner --</option>
                    {systemUsers.map(u => (
                      <option key={u.id} value={u.name}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Company Type <span className="text-[#bef264]">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                  >
                    {companyTypeOptions.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* c. Create Date & e. Country */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Create Date (Auto-populated)
                  </label>
                  <input
                    type="text"
                    value={new Date().toISOString().split('T')[0]}
                    disabled
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#171717] text-gray-400 outline-none cursor-not-allowed font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Country <span className="text-[#bef264]">*</span>
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    placeholder="Australia"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                    required
                  />
                </div>
              </div>

              {/* d. Phone Number & Primary Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Phone Number <span className="text-[#bef264]">*</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+61 2 8000 0000"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none font-mono placeholder:text-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Primary Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="contact@company.com.au"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none placeholder:text-gray-500"
                  />
                </div>
              </div>

              {/* ABN with Live Verification */}
              <div className="p-3 bg-[#161616] rounded-lg border border-[#262626] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-300">
                    Australian Business Number (ABN)
                  </label>
                  {abn && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      liveAbnValidation.checksumPassed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {liveAbnValidation.checksumPassed ? '✓ Modulus 89 Valid' : '⚠ Modulus 89 Unverified'}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={abn}
                    onChange={e => setAbn(e.target.value)}
                    placeholder="XX XXX XXX XXX (11 digits)"
                    className="flex-1 text-xs p-2 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none font-mono placeholder:text-gray-500"
                  />
                  <a
                    href={liveAbnValidation.lookupUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-[#262626] hover:bg-[#333] text-sky-400 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>ABR Search</span>
                  </a>
                </div>

                <p className="text-[10px] text-gray-400">
                  ABNs are issued by the ATO/ABR. Verification verifies 11-digit weighting, active GST status, and registered business name.
                </p>
              </div>

              {/* State & City/Suburb */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">State / Territory</label>
                  <select
                    value={state}
                    onChange={e => setState(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                  >
                    {stateOptions.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">City / Suburb</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="e.g. Wetherill Park"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none placeholder:text-gray-500"
                  />
                </div>
              </div>

              {/* Contact Person & CEC Accredited */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Primary Contact Person</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    placeholder="e.g. David Miller (Director)"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none placeholder:text-gray-500"
                  />
                </div>

                <div className="pt-4">
                  <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cecAccredited}
                      onChange={e => setCecAccredited(e.target.checked)}
                      className="rounded border-[#333] text-[#bef264] focus:ring-0"
                    />
                    <span>CEC &amp; SAA Accredited Installer</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#bef264] hover:bg-[#a3e635] text-black rounded-lg text-xs font-bold transition-colors"
                >
                  Create Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#1e1e1e] rounded-xl shadow-2xl border border-[#2d2d2d] overflow-hidden text-[#e5e7eb] my-8">
            <div className="p-4 bg-[#161616] border-b border-[#262626] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Edit Company: {editingCompany.name}</h3>
                <p className="text-[11px] text-gray-400">Update company details, owner, ABN, and classification</p>
              </div>
              <button onClick={() => setEditingCompany(null)} className="text-gray-400 hover:text-white transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-3.5">
              {/* a. Company Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Company Name <span className="text-[#bef264]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Sydney Commercial Solar Solutions Pty Ltd"
                  className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                  required
                />
              </div>

              {/* b. Company Owner & f. Company Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Company Owner (Internal Team) <span className="text-[#bef264]">*</span>
                  </label>
                  <select
                    value={companyOwner}
                    onChange={e => setCompanyOwner(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                    required
                  >
                    {systemUsers.map(u => (
                      <option key={u.id} value={u.name}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Company Type <span className="text-[#bef264]">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                  >
                    {companyTypeOptions.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* c. Create Date & e. Country */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Create Date
                  </label>
                  <input
                    type="text"
                    value={editingCompany.createdAt || '2026-08-01'}
                    disabled
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#171717] text-gray-400 outline-none cursor-not-allowed font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Country <span className="text-[#bef264]">*</span>
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    placeholder="Australia"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                    required
                  />
                </div>
              </div>

              {/* d. Phone Number & Primary Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Phone Number <span className="text-[#bef264]">*</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+61 2 8000 0000"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Primary Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="contact@company.com.au"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                  />
                </div>
              </div>

              {/* ABN with Live Verification */}
              <div className="p-3 bg-[#161616] rounded-lg border border-[#262626] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-300">
                    Australian Business Number (ABN)
                  </label>
                  {abn && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      liveAbnValidation.checksumPassed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {liveAbnValidation.checksumPassed ? '✓ Modulus 89 Valid' : '⚠ Modulus 89 Unverified'}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={abn}
                    onChange={e => setAbn(e.target.value)}
                    placeholder="XX XXX XXX XXX"
                    className="flex-1 text-xs p-2 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none font-mono"
                  />
                  <a
                    href={liveAbnValidation.lookupUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-[#262626] hover:bg-[#333] text-sky-400 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>ABR Search</span>
                  </a>
                </div>
              </div>

              {/* State & City/Suburb */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">State / Territory</label>
                  <select
                    value={state}
                    onChange={e => setState(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                  >
                    {stateOptions.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">City / Suburb</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="e.g. Wetherill Park"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                  />
                </div>
              </div>

              {/* Contact Person & CEC Accredited */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Primary Contact Person</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    placeholder="e.g. David Miller"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                  />
                </div>

                <div className="pt-4">
                  <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cecAccredited}
                      onChange={e => setCecAccredited(e.target.checked)}
                      className="rounded border-[#333] text-[#bef264] focus:ring-0"
                    />
                    <span>CEC &amp; SAA Accredited Installer</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => handleDeleteCompany(editingCompany)}
                  className="px-3 py-2 rounded-lg text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Company</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCompany(null)}
                    className="px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#bef264] hover:bg-[#a3e635] text-black rounded-lg text-xs font-bold transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ABN Sourcing & Verification Explanation Modal */}
      {showAbnSourceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#1e1e1e] rounded-xl shadow-2xl border border-[#2d2d2d] overflow-hidden text-[#e5e7eb] my-8">
            <div className="p-4 bg-[#161616] border-b border-[#262626] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">ABN Sourcing &amp; Verification Architecture</h3>
              </div>
              <button onClick={() => setShowAbnSourceModal(false)} className="text-gray-400 hover:text-white transition-colors">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-gray-300 leading-relaxed">
              <div className="p-3 bg-[#141414] border border-[#262626] rounded-xl">
                <h4 className="font-bold text-white text-sm mb-1 text-[#bef264]">1. What is the Source of the ABN Number?</h4>
                <p className="text-gray-300">
                  In Australia, all Australian Business Numbers (ABNs) are uniquely issued and maintained by the{' '}
                  <strong className="text-white">Australian Business Register (ABR)</strong>, operated by the{' '}
                  <strong className="text-white">Australian Taxation Office (ATO)</strong> under the <em>A New Tax System (Australian Business Number) Act 1999</em>.
                </p>
                <div className="mt-2 space-y-1 text-[11px] text-gray-400">
                  <p>&bull; <strong className="text-gray-200">Subcontractors &amp; Commercial Clients:</strong> Provided during onboarding via subcontractor agreements or corporate quotes.</p>
                  <p>&bull; <strong className="text-gray-200">Clean Energy Regulator (CER) / REC Registry:</strong> Registered entities claiming STC rebates must hold an active ABN with GST registration.</p>
                  <p>&bull; <strong className="text-gray-200">ABR Web Services (abr.business.gov.au):</strong> Public statutory registry queried for exact trading name and entity verification.</p>
                </div>
              </div>

              <div className="p-3 bg-[#141414] border border-[#262626] rounded-xl space-y-2">
                <h4 className="font-bold text-white text-sm text-[#bef264]">2. How Does the System Verify the ABN Number?</h4>
                <p className="text-gray-300">
                  The system employs a dual-layer verification protocol:
                </p>

                <div className="space-y-2 pt-1">
                  <div className="bg-[#1a1a1a] p-2.5 rounded-lg border border-[#2e2e2e]">
                    <span className="font-bold text-white text-xs block mb-1">Layer 1: Mathematical Modulus 89 Checksum (Built Into the Form)</span>
                    <p className="text-[11px] text-gray-400">
                      The ATO requires all 11-digit ABNs to satisfy a weighted modulus 89 mathematical formula:
                    </p>
                    <ol className="list-decimal list-inside text-[11px] text-gray-400 mt-1 space-y-0.5">
                      <li>Subtract 1 from the 1st digit.</li>
                      <li>Multiply each of the 11 digits by official weights: <code className="text-[#bef264]">[10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]</code>.</li>
                      <li>Sum all products and divide by 89. If the remainder is zero, the ABN is mathematically authentic.</li>
                    </ol>
                  </div>

                  <div className="bg-[#1a1a1a] p-2.5 rounded-lg border border-[#2e2e2e]">
                    <span className="font-bold text-white text-xs block mb-1">Layer 2: Official ABR Web Services &amp; Registry Verification</span>
                    <p className="text-[11px] text-gray-400">
                      Even if an ABN passes mathematical checksum, live government verification confirms:
                    </p>
                    <ul className="list-disc list-inside text-[11px] text-gray-400 mt-1 space-y-0.5">
                      <li><strong className="text-gray-200">Active Status:</strong> Confirms the entity has not been cancelled or struck off.</li>
                      <li><strong className="text-gray-200">GST Registration:</strong> Mandatory for claiming solar STC rebates through BridgeSelect and issuing valid tax invoices.</li>
                      <li><strong className="text-gray-200">Entity Type:</strong> Australian Private Company (PRV), Sole Trader, or Partnership.</li>
                      <li><strong className="text-gray-200">Trading Name Match:</strong> Ensures installer insurance and CEC licenses align with the legal entity.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <a
                  href="https://abr.business.gov.au/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#bef264] font-semibold hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Visit Official Australian Business Register (abr.business.gov.au)</span>
                </a>

                <button
                  onClick={() => setShowAbnSourceModal(false)}
                  className="px-4 py-2 bg-[#262626] hover:bg-[#333] text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
