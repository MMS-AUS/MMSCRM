import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  HardHat,
  Search,
  Plus,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  Calendar,
  Layers,
  Wrench,
  Award
} from 'lucide-react';
import { SubContractor, AustralianState } from '../../types';

export const SubContractorsView: React.FC<{ onSelectInstaller?: (id: string) => void }> = ({ onSelectInstaller }) => {
  const { subContractors, addSubContractor, projects, setSelectedInstallerId, setActiveRole } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<AustralianState>('NSW');
  const [metroAreas, setMetroAreas] = useState('Sydney Metro, Western Sydney');
  const [abn, setAbn] = useState('');
  const [cecAccreditationNumber, setCecAccreditationNumber] = useState('');
  const [saaLicenseNumber, setSaaLicenseNumber] = useState('');
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState('2027-10-31');

  const filteredSubs = subContractors.filter(s => {
    const matchesSearch =
      s.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.cecAccreditationNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = stateFilter === 'all' || s.state === stateFilter;
    return matchesSearch && matchesState;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !name.trim()) return;

    addSubContractor({
      name: name.trim(),
      companyName: companyName.trim(),
      phone: phone.trim() || '+61 412 000 000',
      email: email.trim() || 'installer@solar.com.au',
      state,
      metroAreas: metroAreas.split(',').map(m => m.trim()),
      abn: abn.trim() || '44 123 456 789',
      cecAccreditationNumber: cecAccreditationNumber.trim() || 'A9998888',
      saaLicenseNumber: saaLicenseNumber.trim() || 'SAA-2026-999',
      insuranceExpiryDate,
      activeProjectsCount: 0,
      completedProjectsCount: 0,
      status: 'Active'
    });

    setCompanyName('');
    setName('');
    setIsAddModalOpen(false);
  };

  const handleSimulateInstallerPortal = (subId: string) => {
    setSelectedInstallerId(subId);
    setActiveRole('installer');
  };

  return (
    <div className="flex-1 bg-[#0a0a0a] overflow-y-auto p-4 sm:p-6 space-y-6 text-[#e5e7eb]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Contracted Solar Installers (Subcontractors)
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#bef2641a] text-[#bef264] border border-[#bef26433]">
              CEC &amp; SAA Compliant
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Pre-qualified electrical contractors licensed for Grid-Connect PV &amp; Battery Storage installations in NSW &amp; QLD
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold shadow-xs flex items-center gap-1.5 self-start transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Subcontractor</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-[#1e1e1e] p-4 rounded-xl border border-[#2d2d2d] shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by company name, CEC ID, contact person..."
            className="w-full text-xs pl-9 pr-4 py-2 rounded-lg bg-[#121212] border border-[#262626] text-white placeholder:text-gray-500 outline-none focus:border-[#bef264]"
          />
        </div>

        <select
          value={stateFilter}
          onChange={e => setStateFilter(e.target.value)}
          className="text-xs font-semibold bg-[#121212] border border-[#262626] text-white rounded-lg px-3 py-2 outline-none w-full sm:w-auto focus:border-[#bef264]"
        >
          <option value="all">All States (NSW &amp; QLD)</option>
          <option value="NSW">NSW (Sydney, Hunter, Central Coast)</option>
          <option value="QLD">QLD (Brisbane, Gold Coast, Sunshine Coast)</option>
        </select>
      </div>

      {/* Subcontractors Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSubs.map(sub => {
          const assignedCount = projects.filter(
            p => p.subcontractorId === sub.id || p.subcontractorName === sub.companyName
          ).length;

          return (
            <div
              key={sub.id}
              className="bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] shadow-xs p-5 space-y-4 hover:border-[#bef264]/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 border-b border-[#262626] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white">{sub.companyName}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {sub.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Lead Electrician: <strong className="text-gray-200">{sub.name}</strong> &bull; ABN: {sub.abn}
                  </p>
                </div>

                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#161616] text-gray-300 border border-[#262626]">
                  {sub.state} Metro
                </span>
              </div>

              {/* Accreditations */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-[#161616] p-3 rounded-lg border border-[#262626]">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">CEC Accreditation:</span>
                  <span className="font-mono font-bold text-white">{sub.cecAccreditationNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">SAA Electrician License:</span>
                  <span className="font-mono font-bold text-white">{sub.saaLicenseNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Insurance Expiry:</span>
                  <span className="font-semibold text-gray-200">{sub.insuranceExpiryDate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Active Jobs Assigned:</span>
                  <span className="font-bold text-[#bef264]">{assignedCount} Projects</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#bef264] shrink-0" />
                  <span>Coverage: {sub.metroAreas.join(', ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="font-mono text-gray-300">{sub.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="text-gray-300">{sub.email}</span>
                </div>
              </div>

              {/* Action / Simulate Installer View */}
              <div className="pt-2 border-t border-[#262626] flex items-center justify-between">
                <span className="text-[11px] text-gray-400">
                  Completed Jobs: <strong className="text-white">{sub.completedProjectsCount}</strong>
                </span>
                <button
                  onClick={() => handleSimulateInstallerPortal(sub.id)}
                  className="px-3 py-1.5 rounded-lg bg-[#121212] hover:bg-[#262626] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs border border-[#2d2d2d] transition-colors"
                >
                  <Wrench className="w-3.5 h-3.5 text-[#bef264]" />
                  <span>Open Installer Portal View</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Subcontractor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-[#1e1e1e] rounded-xl shadow-2xl border border-[#2d2d2d] overflow-hidden text-[#e5e7eb]">
            <div className="p-4 bg-[#161616] text-white flex items-center justify-between border-b border-[#262626]">
              <h3 className="font-bold text-sm">Add Contracted Solar Installer</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Company Trading Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="e.g. Metro SunPower NSW Pty Ltd"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white placeholder:text-gray-500 outline-none focus:border-[#bef264]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Lead CEC Electrician Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Troy Henderson"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white placeholder:text-gray-500 outline-none focus:border-[#bef264]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">State Metro</label>
                  <select
                    value={state}
                    onChange={e => setState(e.target.value as AustralianState)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white outline-none focus:border-[#bef264]"
                  >
                    <option value="NSW">NSW (Sydney / Hunter)</option>
                    <option value="QLD">QLD (Brisbane / Gold Coast)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">ABN</label>
                  <input
                    type="text"
                    value={abn}
                    onChange={e => setAbn(e.target.value)}
                    placeholder="55 123 456 789"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white placeholder:text-gray-500 outline-none focus:border-[#bef264] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">CEC Accreditation #</label>
                  <input
                    type="text"
                    value={cecAccreditationNumber}
                    onChange={e => setCecAccreditationNumber(e.target.value)}
                    placeholder="e.g. A1234567"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white placeholder:text-gray-500 outline-none focus:border-[#bef264] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">SAA License #</label>
                  <input
                    type="text"
                    value={saaLicenseNumber}
                    onChange={e => setSaaLicenseNumber(e.target.value)}
                    placeholder="e.g. SAA-2026-441"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white placeholder:text-gray-500 outline-none focus:border-[#bef264] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Metro Suburbs Covered</label>
                <input
                  type="text"
                  value={metroAreas}
                  onChange={e => setMetroAreas(e.target.value)}
                  placeholder="Sydney Metro, Western Sydney, Hills District..."
                  className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white placeholder:text-gray-500 outline-none focus:border-[#bef264]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs text-gray-400 hover:bg-[#262626] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#bef264] hover:bg-[#a3e635] text-black rounded-lg text-xs font-bold transition-colors"
                >
                  Save Subcontractor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
