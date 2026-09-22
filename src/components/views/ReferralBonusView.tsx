import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Gift,
  Plus,
  Search,
  DollarSign,
  UserCheck,
  Building,
  Phone,
  Mail,
  MapPin,
  Paperclip,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Download,
  Trash2,
  ExternalLink,
  Upload,
  Calendar,
  Layers,
  ArrowRight,
  Filter,
  Eye,
  Pencil,
  Save,
  RefreshCw
} from 'lucide-react';
import { ReferralBonus, ReferralAttachment, Contact, Project, ViewMode } from '../../types';
import { ViewModeSwitcher } from '../common/ViewModeSwitcher';

export const ReferralBonusView: React.FC = () => {
  const {
    referralBonuses,
    contacts,
    projects,
    dropdowns,
    addReferralBonus,
    updateReferralBonus,
    deleteReferralBonus,
    addReferralAttachment,
    removeReferralAttachment
  } = useApp();

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<ReferralBonus | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State for Adding / Recording Referral Bonus
  const [referredById, setReferredById] = useState<string>('');
  const [referralContactId, setReferralContactId] = useState<string>('');
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [manualAddress, setManualAddress] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [referralAmount, setReferralAmount] = useState<string>('500');
  const [statusOfReferral, setStatusOfReferral] = useState<string>('Lead Created');
  const [linkedProjectId, setLinkedProjectId] = useState<string>('');
  const [linkedProjectCode, setLinkedProjectCode] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<string>('Pending Review');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [attachments, setAttachments] = useState<ReferralAttachment[]>([]);

  // Temporary attachment upload state
  const [tempAttachmentName, setTempAttachmentName] = useState<string>('');

  // Dropdown list managed from Settings
  const paymentStatusOptions = dropdowns.referralPaymentStatuses && dropdowns.referralPaymentStatuses.length > 0
    ? dropdowns.referralPaymentStatuses
    : ['Pending Review', 'Approved for Payment', 'Paid via EFT', 'On Hold', 'Rejected'];

  // Form State for Editing an existing Referral Bonus (Unlocked Fields)
  const [editingReferral, setEditingReferral] = useState<ReferralBonus | null>(null);
  const [editReferredById, setEditReferredById] = useState<string>('');
  const [editReferralContactId, setEditReferralContactId] = useState<string>('');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editAmount, setEditAmount] = useState<string>('500');
  const [editStatusOfReferral, setEditStatusOfReferral] = useState<string>('Lead Created');
  const [editLinkedProjectId, setEditLinkedProjectId] = useState<string>('');
  const [editLinkedProjectCode, setEditLinkedProjectCode] = useState<string>('');
  const [editPaymentStatus, setEditPaymentStatus] = useState<string>('Pending Review');
  const [editPaymentReference, setEditPaymentReference] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editAttachments, setEditAttachments] = useState<ReferralAttachment[]>([]);
  const [editTempAttachmentName, setEditTempAttachmentName] = useState<string>('');

  // Handle Referrer Selection
  const handleReferredByChange = (contactId: string) => {
    setReferredById(contactId);
  };

  // Handle Referral Customer Selection & Auto-Population
  const handleReferralContactChange = (contactId: string) => {
    setReferralContactId(contactId);
    const matchedContact = contacts.find(c => c.id === contactId);

    if (matchedContact) {
      // 1. Auto-populate Phone
      setPhone(matchedContact.phone || '');

      // 2. Auto-populate Email
      setEmail(matchedContact.email || '');

      // 3. Address Logic:
      // If contact has addresses array with multiple items, user will select.
      // If only 1 address, auto-populate it.
      const contactAddrs = matchedContact.addresses && matchedContact.addresses.length > 0
        ? matchedContact.addresses
        : [
            {
              id: 'addr-primary',
              street: matchedContact.address || matchedContact.city,
              suburb: matchedContact.city,
              state: matchedContact.state,
              propertyType: 'Primary Residence',
              isPrimary: true
            }
          ];

      if (contactAddrs.length === 1) {
        const singleAddr = contactAddrs[0];
        const formatted = `${singleAddr.street || singleAddr.address || ''}, ${singleAddr.suburb || singleAddr.city || ''} ${singleAddr.state || ''}`.trim();
        setSelectedAddress(formatted || matchedContact.address || matchedContact.city);
      } else {
        // Multiple addresses: select the primary one as default, but allow selection
        const primary = contactAddrs.find(a => a.isPrimary) || contactAddrs[0];
        const formatted = `${primary.street || primary.address || ''}, ${primary.suburb || primary.city || ''} ${primary.state || ''}`.trim();
        setSelectedAddress(formatted);
      }

      // 4. Auto-populate Status of Referral from Project
      // Search for any project associated with this customer
      const matchingProject = projects.find(
        p => p.customerId === contactId ||
             p.customerEmail.toLowerCase() === matchedContact.email.toLowerCase() ||
             p.customerPhone.includes(matchedContact.phone)
      );

      if (matchingProject) {
        setStatusOfReferral(matchingProject.status);
        setLinkedProjectId(matchingProject.id);
        setLinkedProjectCode(matchingProject.projectCode);
      } else {
        setStatusOfReferral('New Project / Site Survey Scheduled');
        setLinkedProjectId('');
        setLinkedProjectCode('');
      }
    } else {
      setPhone('');
      setEmail('');
      setSelectedAddress('');
      setStatusOfReferral('Lead Created');
      setLinkedProjectId('');
      setLinkedProjectCode('');
    }
  };

  // Get active selected referral contact's address options
  const activeReferralContact = contacts.find(c => c.id === referralContactId);
  const activeContactAddresses = activeReferralContact?.addresses && activeReferralContact.addresses.length > 0
    ? activeReferralContact.addresses
    : (activeReferralContact ? [{
        id: 'addr-default',
        street: activeReferralContact.address || activeReferralContact.city,
        suburb: activeReferralContact.city,
        state: activeReferralContact.state,
        propertyType: 'Primary Residence',
        isPrimary: true
      }] : []);

  // Handle File Upload for Attachments
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const newAttachment: ReferralAttachment = {
      id: `att-${Date.now()}`,
      name: file.name,
      sizeBytes: file.size,
      fileType: file.name.split('.').pop()?.toLowerCase() || 'document',
      uploadedAt: new Date().toISOString().split('T')[0],
      url: URL.createObjectURL(file)
    };

    setAttachments(prev => [...prev, newAttachment]);
    e.target.value = '';
  };

  const handleAddManualAttachment = () => {
    if (!tempAttachmentName.trim()) return;
    const newAttachment: ReferralAttachment = {
      id: `att-${Date.now()}`,
      name: tempAttachmentName.trim(),
      sizeBytes: 154200,
      fileType: tempAttachmentName.split('.').pop()?.toLowerCase() || 'pdf',
      uploadedAt: new Date().toISOString().split('T')[0]
    };
    setAttachments(prev => [...prev, newAttachment]);
    setTempAttachmentName('');
  };

  const handleRemoveAttachment = (attId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attId));
  };

  // Format currency accounts style
  const formatAudCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Handle Record Submit
  const handleRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!referredById || !referralContactId) {
      alert('Please select both Referred By and Referral Name from the contacts list.');
      return;
    }

    const referrer = contacts.find(c => c.id === referredById);
    const referral = contacts.find(c => c.id === referralContactId);

    const finalAddress = selectedAddress || manualAddress || referral?.address || 'Address on file';
    const cleanAmount = parseFloat(referralAmount.replace(/[^0-9.]/g, '')) || 500;

    const created = addReferralBonus({
      referredById,
      referredByName: referrer ? referrer.name : 'Unknown Contact',
      referralContactId,
      referralName: referral ? referral.name : 'Unknown Customer',
      address: finalAddress,
      phone: phone.trim() || referral?.phone || '',
      email: email.trim() || referral?.email || '',
      referralAmountAud: cleanAmount,
      referralStatus: statusOfReferral,
      linkedProjectId: linkedProjectId || undefined,
      linkedProjectCode: linkedProjectCode || undefined,
      paymentStatus,
      paymentReference: paymentReference.trim() || undefined,
      notes: notes.trim() || undefined,
      attachments
    });

    setSuccessMessage(`Referral bonus ${created.referralCode} successfully recorded!`);
    setTimeout(() => setSuccessMessage(null), 4000);

    // Reset Form
    setReferredById('');
    setReferralContactId('');
    setSelectedAddress('');
    setManualAddress('');
    setPhone('');
    setEmail('');
    setReferralAmount('500');
    setStatusOfReferral('Lead Created');
    setLinkedProjectId('');
    setLinkedProjectCode('');
    setPaymentStatus('Pending Review');
    setPaymentReference('');
    setNotes('');
    setAttachments([]);
    setIsAddModalOpen(false);
  };

  // Standard Solar Project Stages for Quick Selection or Custom Entry
  const standardProjectStages = [
    'Lead Created',
    'Site Survey Scheduled',
    'Proposal Sent',
    'Contract Signed',
    'Deposit Paid',
    'Engineering & DNSP Approval',
    'Sales Order Dispatched',
    'RFQ Sent to Installers',
    'Install Scheduled',
    'Installation in Progress',
    'Installation Completed',
    'BridgeSelect STC Claimed',
    'Grid Meter Connected',
    'Completed'
  ];

  // Start Editing an existing Referral Bonus (Opens Modal with All Fields Unlocked)
  const handleStartEdit = (bonus: ReferralBonus) => {
    setEditingReferral(bonus);
    setSelectedReferral(null);
    setEditReferredById(bonus.referredById);
    setEditReferralContactId(bonus.referralContactId);
    setEditAddress(bonus.address || '');
    setEditPhone(bonus.phone || '');
    setEditEmail(bonus.email || '');
    setEditAmount(bonus.referralAmountAud !== undefined ? String(bonus.referralAmountAud) : '500');
    setEditStatusOfReferral(bonus.referralStatus || 'Lead Created');
    setEditLinkedProjectId(bonus.linkedProjectId || '');
    setEditLinkedProjectCode(bonus.linkedProjectCode || '');
    setEditPaymentStatus(bonus.paymentStatus || 'Pending Review');
    setEditPaymentReference(bonus.paymentReference || '');
    setEditNotes(bonus.notes || '');
    setEditAttachments(bonus.attachments ? [...bonus.attachments] : []);
    setEditTempAttachmentName('');
  };

  const handleEditReferredByChange = (contactId: string) => {
    setEditReferredById(contactId);
  };

  const handleEditReferralContactChange = (contactId: string) => {
    setEditReferralContactId(contactId);
  };

  const handleSyncEditFromContact = () => {
    const matchedContact = contacts.find(c => c.id === editReferralContactId);
    if (!matchedContact) return;
    setEditPhone(matchedContact.phone || '');
    setEditEmail(matchedContact.email || '');
    const addr = matchedContact.address || matchedContact.city || '';
    if (addr) setEditAddress(addr);

    const matchingProject = projects.find(
      p => p.customerId === editReferralContactId ||
           p.customerEmail.toLowerCase() === matchedContact.email.toLowerCase() ||
           p.customerPhone.includes(matchedContact.phone)
    );
    if (matchingProject) {
      setEditStatusOfReferral(matchingProject.status);
      setEditLinkedProjectId(matchingProject.id);
      setEditLinkedProjectCode(matchingProject.projectCode);
    }
  };

  const handleEditLinkedProjectChange = (projId: string) => {
    setEditLinkedProjectId(projId);
    if (!projId) {
      setEditLinkedProjectCode('');
      return;
    }
    const proj = projects.find(p => p.id === projId);
    if (proj) {
      setEditLinkedProjectCode(proj.projectCode);
      setEditStatusOfReferral(proj.status);
    }
  };

  const handleEditFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const newAtt: ReferralAttachment = {
      id: `att-${Date.now()}`,
      name: file.name,
      sizeBytes: file.size,
      fileType: file.name.split('.').pop()?.toLowerCase() || 'document',
      uploadedAt: new Date().toISOString().split('T')[0],
      url: URL.createObjectURL(file)
    };
    setEditAttachments(prev => [...prev, newAtt]);
    e.target.value = '';
  };

  const handleAddManualEditAttachment = () => {
    if (!editTempAttachmentName.trim()) return;
    const newAtt: ReferralAttachment = {
      id: `att-${Date.now()}`,
      name: editTempAttachmentName.trim(),
      sizeBytes: 154200,
      fileType: editTempAttachmentName.split('.').pop()?.toLowerCase() || 'pdf',
      uploadedAt: new Date().toISOString().split('T')[0]
    };
    setEditAttachments(prev => [...prev, newAtt]);
    setEditTempAttachmentName('');
  };

  const handleRemoveEditAttachment = (attId: string) => {
    setEditAttachments(prev => prev.filter(a => a.id !== attId));
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReferral) return;

    const referrer = contacts.find(c => c.id === editReferredById);
    const referral = contacts.find(c => c.id === editReferralContactId);
    const cleanAmount = parseFloat(editAmount.replace(/[^0-9.]/g, '')) || 0;

    const updates: Partial<ReferralBonus> = {
      referredById: editReferredById,
      referredByName: referrer ? referrer.name : (editingReferral.referredByName || 'Unknown Contact'),
      referralContactId: editReferralContactId,
      referralName: referral ? referral.name : (editingReferral.referralName || 'Unknown Customer'),
      address: editAddress.trim() || 'Address on file',
      phone: editPhone.trim(),
      email: editEmail.trim(),
      referralAmountAud: cleanAmount,
      referralStatus: editStatusOfReferral.trim() || 'Lead Created',
      linkedProjectId: editLinkedProjectId || undefined,
      linkedProjectCode: editLinkedProjectCode || undefined,
      paymentStatus: editPaymentStatus,
      paymentReference: editPaymentReference.trim() || undefined,
      notes: editNotes.trim() || undefined,
      attachments: editAttachments,
      paidAt: editPaymentStatus === 'Paid via EFT' ? (editingReferral.paidAt || new Date().toISOString().split('T')[0]) : editingReferral.paidAt
    };

    updateReferralBonus(editingReferral.id, updates);

    setSuccessMessage(`Referral bonus ${editingReferral.referralCode} updated successfully!`);
    setTimeout(() => setSuccessMessage(null), 4000);
    setEditingReferral(null);
  };

  // Filtered referrals list
  const filteredReferrals = referralBonuses.filter(ref => {
    const matchesSearch =
      ref.referralCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.referredByName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.referralName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.phone.includes(searchTerm) ||
      (ref.linkedProjectCode && ref.linkedProjectCode.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPayment =
      filterPaymentStatus === 'all' || ref.paymentStatus === filterPaymentStatus;

    return matchesSearch && matchesPayment;
  });

  // Calculate Metrics
  const totalReferralBonusValue = referralBonuses.reduce((acc, r) => acc + (r.referralAmountAud || 0), 0);
  const totalPaidBonusValue = referralBonuses
    .filter(r => r.paymentStatus === 'Paid via EFT')
    .reduce((acc, r) => acc + (r.referralAmountAud || 0), 0);
  const pendingPayoutCount = referralBonuses.filter(r => r.paymentStatus !== 'Paid via EFT' && r.paymentStatus !== 'Rejected').length;

  return (
    <div className="flex-1 bg-[#0a0a0a] overflow-y-auto p-4 sm:p-6 space-y-6 text-[#e5e7eb]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Gift className="w-6 h-6 text-[#bef264]" />
              <span>Referral Bonus Management</span>
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#bef2641a] text-[#bef264] border border-[#bef26433]">
              Customer Advocates &amp; Affiliate Program
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Record, track, and reconcile solar customer referral incentives and affiliate payouts with auto-synced project stages
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ViewModeSwitcher currentMode={viewMode} onModeChange={setViewMode} />
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Record Referral Bonus</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1e1e1e] p-4 rounded-xl border border-[#2d2d2d] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">Total Recorded Referrals</span>
            <Gift className="w-4 h-4 text-[#bef264]" />
          </div>
          <p className="text-2xl font-bold text-white mt-1">{referralBonuses.length}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Customer &amp; Partner Referrals</p>
        </div>

        <div className="bg-[#1e1e1e] p-4 rounded-xl border border-[#2d2d2d] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">Total Referral Value</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-[#bef264] font-mono mt-1">
            {formatAudCurrency(totalReferralBonusValue)}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">Committed Referral Reserves</p>
        </div>

        <div className="bg-[#1e1e1e] p-4 rounded-xl border border-[#2d2d2d] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">Paid via EFT</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">
            {formatAudCurrency(totalPaidBonusValue)}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">Disbursed to Advocates</p>
        </div>

        <div className="bg-[#1e1e1e] p-4 rounded-xl border border-[#2d2d2d] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">Pending Payouts</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-1">{pendingPayoutCount}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Pending stage or review</p>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#1e1e1e] p-4 rounded-xl border border-[#2d2d2d] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by referral code, referrer, referral name, phone, suburb, project code..."
            className="w-full text-xs pl-9 pr-4 py-2 rounded-lg bg-[#121212] border border-[#262626] text-white placeholder:text-gray-500 outline-none focus:border-[#bef264]"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-400 font-medium">Payment Status:</span>
          </div>
          <select
            value={filterPaymentStatus}
            onChange={e => setFilterPaymentStatus(e.target.value)}
            className="text-xs font-semibold bg-[#121212] border border-[#262626] text-white rounded-lg px-3 py-2 outline-none focus:border-[#bef264]"
          >
            <option value="all">All Payment Statuses ({referralBonuses.length})</option>
            {paymentStatusOptions.map(st => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#e5e7eb] min-w-[850px]">
              <thead className="bg-[#161616] text-gray-400 text-[11px] uppercase tracking-wider border-b border-[#262626]">
                <tr>
                  <th className="py-3 px-4">Ref Code</th>
                  <th className="py-3 px-4">Referred By</th>
                  <th className="py-3 px-4">Referral Name &amp; Contact</th>
                  <th className="py-3 px-4">Installation Address</th>
                  <th className="py-3 px-4">Referral Amount</th>
                  <th className="py-3 px-4">Referral Stage / Status</th>
                  <th className="py-3 px-4">Payment Status</th>
                  <th className="py-3 px-4">Attachments</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {filteredReferrals.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-400">
                      No referral bonuses found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredReferrals.map(bonus => (
                    <tr key={bonus.id} className="hover:bg-[#262626]/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#bef264]">
                        {bonus.referralCode}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{bonus.referredByName}</div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                          <UserCheck className="w-2.5 h-2.5 text-[#bef264]" />
                          <span>Advocate Referrer</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{bonus.referralName}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{bonus.phone}</div>
                        <div className="text-[10px] text-gray-400 truncate max-w-[140px]">{bonus.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-300 max-w-[200px] truncate" title={bonus.address}>
                          {bonus.address}
                        </div>
                        {bonus.linkedProjectCode && (
                          <div className="text-[10px] text-blue-400 font-mono mt-0.5">
                            Project: {bonus.linkedProjectCode}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-sm">
                        {formatAudCurrency(bonus.referralAmountAud)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {bonus.referralStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            bonus.paymentStatus === 'Paid via EFT'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : bonus.paymentStatus === 'Approved for Payment'
                              ? 'bg-[#bef26422] text-[#bef264] border-[#bef26444]'
                              : bonus.paymentStatus === 'On Hold'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : bonus.paymentStatus === 'Rejected'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                          }`}
                        >
                          {bonus.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {bonus.attachments && bonus.attachments.length > 0 ? (
                          <button
                            onClick={() => setSelectedReferral(bonus)}
                            className="flex items-center gap-1 text-[11px] text-gray-300 hover:text-[#bef264] transition-colors"
                          >
                            <Paperclip className="w-3.5 h-3.5 text-[#bef264]" />
                            <span>{bonus.attachments.length} file(s)</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-600">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleStartEdit(bonus)}
                            className="px-2.5 py-1 rounded bg-[#bef264]/10 hover:bg-[#bef264]/25 text-[#bef264] border border-[#bef264]/30 text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs"
                            title="Edit Referral Fields"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => setSelectedReferral(bonus)}
                            className="px-2.5 py-1 rounded bg-[#262626] hover:bg-[#333] text-gray-300 hover:text-white text-xs font-semibold transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to remove referral bonus ${bonus.referralCode}?`)) {
                                deleteReferralBonus(bonus.id);
                              }
                            }}
                            className="p-1 text-gray-500 hover:text-rose-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReferrals.map(bonus => (
            <div
              key={bonus.id}
              className="bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] shadow-xs p-5 flex flex-col justify-between space-y-4 hover:border-[#bef264]/40 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-[#262626] pb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#bef264]">{bonus.referralCode}</span>
                    <h3 className="font-bold text-sm text-white mt-0.5">{bonus.referralName}</h3>
                    <p className="text-[11px] text-gray-400">
                      Referred by <strong className="text-gray-300">{bonus.referredByName}</strong>
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      bonus.paymentStatus === 'Paid via EFT'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : bonus.paymentStatus === 'Approved for Payment'
                        ? 'bg-[#bef26422] text-[#bef264] border-[#bef26444]'
                        : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                    }`}
                  >
                    {bonus.paymentStatus}
                  </span>
                </div>

                <div className="py-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-[11px]">Referral Amount:</span>
                    <span className="font-mono text-base font-bold text-emerald-400">
                      {formatAudCurrency(bonus.referralAmountAud)}
                    </span>
                  </div>

                  <div className="flex items-start gap-1.5 text-gray-300 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#bef264] shrink-0 mt-0.5" />
                    <span className="text-[11px] line-clamp-2">{bonus.address}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-gray-400">
                    <Phone className="w-3 h-3 text-gray-500" />
                    <span className="font-mono">{bonus.phone}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-gray-400 truncate">
                    <Mail className="w-3 h-3 text-gray-500" />
                    <span className="truncate">{bonus.email}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#141414] border border-[#262626] flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Stage / Status:</span>
                    <span className="font-semibold text-blue-400">{bonus.referralStatus}</span>
                  </div>
                </div>

                {bonus.attachments && bonus.attachments.length > 0 && (
                  <div className="text-[11px] text-gray-400 flex items-center gap-1.5 pt-1">
                    <Paperclip className="w-3 h-3 text-[#bef264]" />
                    <span>{bonus.attachments.length} attachment(s) attached</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#262626] flex items-center justify-between gap-2">
                <span className="text-[10px] text-gray-500">Date: {bonus.createdAt}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleStartEdit(bonus)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#bef264]/10 hover:bg-[#bef264]/25 text-[#bef264] border border-[#bef264]/30 text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs"
                    title="Edit Referral Fields"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => setSelectedReferral(bonus)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#262626] hover:bg-[#333] text-white text-xs font-semibold transition-colors"
                  >
                    Manage
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. PIPELINE VIEW (Grouped by Payment Status) */}
      {viewMode === 'pipeline' && (
        <div className="flex lg:grid lg:grid-cols-5 gap-4 overflow-x-auto pb-4 snap-x">
          {paymentStatusOptions.map(statusCol => {
            const colItems = filteredReferrals.filter(r => r.paymentStatus === statusCol);
            const colTotal = colItems.reduce((acc, r) => acc + (r.referralAmountAud || 0), 0);

            return (
              <div
                key={statusCol}
                className="bg-[#141414] rounded-xl border border-[#262626] flex flex-col max-h-[700px] w-[280px] sm:w-[320px] lg:w-auto shrink-0 snap-start"
              >
                <div className="p-3.5 border-b border-[#262626] bg-[#1a1a1a] rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white truncate">{statusCol}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#262626] text-gray-300">
                      {colItems.length}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-emerald-400 mt-1">
                    {formatAudCurrency(colTotal)}
                  </p>
                </div>

                <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                  {colItems.length === 0 ? (
                    <div className="p-4 text-center text-[11px] text-gray-500 border border-dashed border-[#262626] rounded-lg">
                      No records in {statusCol}
                    </div>
                  ) : (
                    colItems.map(item => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedReferral(item)}
                        className="bg-[#1e1e1e] p-3 rounded-lg border border-[#2d2d2d] shadow-xs cursor-pointer hover:border-[#bef264]/40 transition-colors space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-[#bef264]">{item.referralCode}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(item);
                              }}
                              className="p-1 text-gray-400 hover:text-[#bef264] hover:bg-[#262626] rounded transition-colors"
                              title="Edit Referral Fields"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <span className="font-mono text-xs font-bold text-emerald-400">
                              {formatAudCurrency(item.referralAmountAud)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-white leading-tight">{item.referralName}</p>
                          <p className="text-[10px] text-gray-400">By: {item.referredByName}</p>
                        </div>
                        <div className="text-[10px] text-gray-400 truncate flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-gray-500 shrink-0" />
                          <span className="truncate">{item.address}</span>
                        </div>
                        <div className="pt-1 flex items-center justify-between text-[10px]">
                          <span className="text-blue-400 truncate">{item.referralStatus}</span>
                          {item.attachments && item.attachments.length > 0 && (
                            <Paperclip className="w-3 h-3 text-[#bef264]" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RECORD REFERRAL BONUS MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#1e1e1e] rounded-xl shadow-2xl border border-[#2d2d2d] overflow-hidden text-[#e5e7eb] my-auto max-h-[92vh] flex flex-col">
            <div className="p-4 bg-[#161616] border-b border-[#262626] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-[#bef264]" />
                <h3 className="font-bold text-sm">Record Customer Referral Bonus</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                {/* 1. REFERRED BY & REFERRAL NAME (Dropdowns populating contacts) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Referred By (Contact Advocate) <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={referredById}
                    onChange={e => handleReferredByChange(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                    required
                  >
                    <option value="">-- Select Contact (Advocate) --</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type} - {c.city})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">Existing contact who introduced the lead</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Referral Name (New Customer) <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={referralContactId}
                    onChange={e => handleReferralContactChange(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                    required
                  >
                    <option value="">-- Select Referral Contact --</option>
                    {contacts
                      .filter(c => c.id !== referredById)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.type} - {c.city})
                        </option>
                      ))}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">Populates customer contact directory</p>
                </div>
              </div>

              {/* 2. AUTO-POPULATED PHONE & EMAIL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#161616] p-3 rounded-lg border border-[#262626]">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-[#bef264]" />
                    <span>Phone (Auto-populated from Contact)</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Auto-populated phone number"
                    className="w-full text-xs p-2 rounded-lg border border-[#262626] bg-[#121212] text-white font-mono outline-none focus:border-[#bef264]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-[#bef264]" />
                    <span>Email (Auto-populated from Contact)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Auto-populated email address"
                    className="w-full text-xs p-2 rounded-lg border border-[#262626] bg-[#121212] text-white outline-none focus:border-[#bef264]"
                    required
                  />
                </div>
              </div>

              {/* 3. ADDRESS (Auto-populate if 1 address, or select if multiple properties) */}
              <div className="bg-[#161616] p-3.5 rounded-lg border border-[#262626] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-white flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#bef264]" />
                    <span>Installation Property Address</span>
                  </label>
                  {activeContactAddresses.length > 1 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {activeContactAddresses.length} Properties Detected &bull; Select Below
                    </span>
                  )}
                </div>

                {activeContactAddresses.length > 1 ? (
                  <div>
                    <label className="block text-[11px] text-gray-300 mb-1">
                      Choose which customer property is receiving this solar installation:
                    </label>
                    <select
                      value={selectedAddress}
                      onChange={e => setSelectedAddress(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                    >
                      {activeContactAddresses.map(addr => {
                        const formatted = `${addr.street || addr.address || ''}, ${addr.suburb || addr.city || ''} ${addr.state || ''} ${addr.postcode || ''}`.trim();
                        return (
                          <option key={addr.id} value={formatted}>
                            {formatted} ({addr.propertyType || 'Property'}) {addr.isPrimary ? '— [Primary]' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={selectedAddress}
                      onChange={e => setSelectedAddress(e.target.value)}
                      placeholder="Auto-populated property address"
                      className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                      required
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Auto-populated primary address from contact record
                    </p>
                  </div>
                )}
              </div>

              {/* 4. REFERRAL AMOUNT & STATUS OF REFERRAL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Referral Amount (AUD Account Currency) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-xs">
                      $ AUD
                    </span>
                    <input
                      type="number"
                      step="50"
                      min="0"
                      value={referralAmount}
                      onChange={e => setReferralAmount(e.target.value)}
                      placeholder="500.00"
                      className="w-full text-xs pl-16 pr-4 py-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white font-mono font-bold focus:border-[#bef264] outline-none"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-emerald-400 font-mono mt-1">
                    Formatted preview: {formatAudCurrency(parseFloat(referralAmount) || 0)}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Status of Referral (Auto-Populated from Project Stage)
                  </label>
                  <input
                    type="text"
                    value={statusOfReferral}
                    onChange={e => setStatusOfReferral(e.target.value)}
                    placeholder="e.g. Installation Completed, Install Scheduled..."
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-blue-400 font-semibold focus:border-[#bef264] outline-none"
                  />
                  {linkedProjectCode ? (
                    <p className="text-[10px] text-blue-400 font-mono mt-1">
                      Synced from Project {linkedProjectCode}
                    </p>
                  ) : (
                    <p className="text-[10px] text-gray-500 mt-1">
                      Will update dynamically as the installation progresses
                    </p>
                  )}
                </div>
              </div>

              {/* 5. PAYMENT STATUS (Managed from Settings) & PAYMENT REF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Payment Status (Managed from Settings) <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={e => setPaymentStatus(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                    required
                  >
                    {paymentStatusOptions.map(opt => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Payment Reference / EFT Receipt (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={e => setPaymentReference(e.target.value)}
                    placeholder="e.g. CBA-EFT-991204 or Batch #84"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white font-mono focus:border-[#bef264] outline-none"
                  />
                </div>
              </div>

              {/* 6. ATTACHMENTS (File Upload & Document Record) */}
              <div className="p-3.5 bg-[#161616] rounded-lg border border-[#262626] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-white flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#bef264]" />
                    <span>Referral Attachments &amp; Documentation</span>
                  </label>
                  <span className="text-[10px] text-gray-400">{attachments.length} file(s) attached</span>
                </div>

                {/* Upload control */}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <label className="w-full sm:w-auto px-3 py-2 bg-[#262626] hover:bg-[#333] border border-[#333] text-gray-200 text-xs font-semibold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-[#bef264]" />
                    <span>Upload Invoice / Receipt File</span>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    />
                  </label>

                  <span className="text-[11px] text-gray-500">or record filename:</span>

                  <div className="flex-1 flex items-center gap-1.5 w-full sm:w-auto">
                    <input
                      type="text"
                      value={tempAttachmentName}
                      onChange={e => setTempAttachmentName(e.target.value)}
                      placeholder="e.g. Referral_Agreement_Signed.pdf"
                      className="text-xs p-2 rounded-lg border border-[#262626] bg-[#121212] text-white flex-1 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualAttachment}
                      disabled={!tempAttachmentName.trim()}
                      className="text-xs px-3 py-2 bg-[#262626] hover:bg-[#333] text-white rounded-lg font-semibold disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Attached Files List */}
                {attachments.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-[#262626]">
                    {attachments.map(att => (
                      <div
                        key={att.id}
                        className="bg-[#121212] p-2 rounded-lg border border-[#262626] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-[#bef264] shrink-0" />
                          <span className="text-white truncate font-medium">{att.name}</span>
                          <span className="text-[10px] text-gray-400">
                            ({att.sizeBytes ? `${Math.round(att.sizeBytes / 1024)} KB` : 'Document'})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="text-gray-500 hover:text-rose-400 p-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Reconciliation &amp; Settlement Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notes on advocate bank details, milestone verification, or terms..."
                  className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                />
              </div>

              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 p-4 bg-[#161616] border-t border-[#262626] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Gift className="w-4 h-4" />
                  <span>Save Referral Bonus</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL & MANAGE MODAL */}
      {selectedReferral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#1e1e1e] rounded-xl shadow-2xl border border-[#2d2d2d] overflow-hidden text-[#e5e7eb] my-auto max-h-[92vh] flex flex-col">
            <div className="p-4 bg-[#161616] border-b border-[#262626] text-white flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-mono text-[#bef264] font-bold">
                  {selectedReferral.referralCode}
                </span>
                <h3 className="font-bold text-sm">Referral Bonus Details</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStartEdit(selectedReferral)}
                  className="px-2.5 py-1 bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                  title="Unlock all fields for editing"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Fields</span>
                </button>
                <button
                  onClick={() => setSelectedReferral(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Quick Edit Callout */}
              <div className="p-2.5 rounded-lg bg-[#bef264]/10 border border-[#bef264]/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-gray-200">
                  <AlertCircle className="w-4 h-4 text-[#bef264] shrink-0" />
                  <span>Need to update customer info, address, amount, or stage?</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleStartEdit(selectedReferral)}
                  className="font-bold text-[#bef264] hover:underline shrink-0 flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Edit All Fields</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#141414] rounded-lg border border-[#262626]">
                <div>
                  <span className="text-[10px] text-gray-400 block">Referred By:</span>
                  <span className="font-bold text-white text-sm">{selectedReferral.referredByName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Referral Customer:</span>
                  <span className="font-bold text-white text-sm">{selectedReferral.referralName}</span>
                </div>
              </div>

              <div className="space-y-2 p-3 bg-[#161616] rounded-lg border border-[#262626]">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Bonus Amount:</span>
                  <span className="font-mono text-base font-bold text-emerald-400">
                    {formatAudCurrency(selectedReferral.referralAmountAud)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Referral Stage / Status:</span>
                  <span className="font-semibold text-blue-400">{selectedReferral.referralStatus}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Payment Status:</span>
                  <select
                    value={selectedReferral.paymentStatus}
                    onChange={e => {
                      const newStatus = e.target.value;
                      updateReferralBonus(selectedReferral.id, {
                        paymentStatus: newStatus,
                        paidAt: newStatus === 'Paid via EFT' ? new Date().toISOString().split('T')[0] : selectedReferral.paidAt
                      });
                      setSelectedReferral({
                        ...selectedReferral,
                        paymentStatus: newStatus
                      });
                    }}
                    className="text-xs p-1.5 rounded bg-[#121212] border border-[#262626] text-white font-semibold outline-none focus:border-[#bef264]"
                  >
                    {paymentStatusOptions.map(st => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedReferral.paymentReference && (
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-gray-400">EFT Reference:</span>
                    <span className="text-gray-300">{selectedReferral.paymentReference}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-gray-300">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#bef264] shrink-0 mt-0.5" />
                  <span>{selectedReferral.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="font-mono">{selectedReferral.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span>{selectedReferral.email}</span>
                </div>
              </div>

              {/* Attachments list */}
              <div className="space-y-2 border-t border-[#262626] pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#bef264]" />
                    <span>Attachments ({selectedReferral.attachments?.length || 0})</span>
                  </span>
                  <label className="text-[10px] font-bold text-[#bef264] hover:underline cursor-pointer">
                    + Upload File
                    <input
                      type="file"
                      onChange={e => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;
                        const file = files[0];
                        addReferralAttachment(selectedReferral.id, {
                          name: file.name,
                          sizeBytes: file.size,
                          fileType: file.name.split('.').pop()?.toLowerCase() || 'document',
                          url: URL.createObjectURL(file)
                        });
                        // Update active state
                        setSelectedReferral({
                          ...selectedReferral,
                          attachments: [
                            ...(selectedReferral.attachments || []),
                            {
                              id: `att-${Date.now()}`,
                              name: file.name,
                              sizeBytes: file.size,
                              fileType: file.name.split('.').pop()?.toLowerCase() || 'document',
                              uploadedAt: new Date().toISOString().split('T')[0]
                            }
                          ]
                        });
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="space-y-1.5">
                  {(!selectedReferral.attachments || selectedReferral.attachments.length === 0) ? (
                    <p className="text-gray-500 text-[11px]">No attachments uploaded yet.</p>
                  ) : (
                    selectedReferral.attachments.map(att => (
                      <div
                        key={att.id}
                        className="bg-[#141414] p-2 rounded-lg border border-[#262626] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-[#bef264]" />
                          <span className="text-white font-medium">{att.name}</span>
                          <span className="text-[10px] text-gray-500">
                            {att.sizeBytes ? `${Math.round(att.sizeBytes / 1024)} KB` : ''}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            removeReferralAttachment(selectedReferral.id, att.id);
                            setSelectedReferral({
                              ...selectedReferral,
                              attachments: selectedReferral.attachments.filter(a => a.id !== att.id)
                            });
                          }}
                          className="text-gray-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {selectedReferral.notes && (
                <div className="p-2.5 rounded-lg bg-[#141414] border border-[#262626] text-[11px] text-gray-300">
                  <span className="text-gray-400 block font-semibold mb-0.5">Notes:</span>
                  {selectedReferral.notes}
                </div>
              )}

              </div>

              <div className="p-3 sm:p-4 bg-[#161616] border-t border-[#262626] flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(selectedReferral)}
                    className="px-3 py-1.5 bg-[#bef264]/15 hover:bg-[#bef264]/25 text-[#bef264] border border-[#bef264]/40 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Referral Fields</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateReferralBonus(selectedReferral.id, {
                        paymentStatus: 'Paid via EFT',
                        paidAt: new Date().toISOString().split('T')[0],
                        paymentReference: selectedReferral.paymentReference || `EFT-${Date.now().toString().slice(-6)}`
                      });
                      setSelectedReferral({
                        ...selectedReferral,
                        paymentStatus: 'Paid via EFT'
                      });
                    }}
                    className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark as Paid via EFT</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedReferral(null)}
                  className="px-4 py-2 bg-[#262626] hover:bg-[#333] text-white rounded-lg text-xs font-semibold"
                >
                  Close
                </button>
              </div>
          </div>
        </div>
      )}

      {/* EDIT REFERRAL BONUS MODAL (ALL FIELDS FULLY UNLOCKED) */}
      {editingReferral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#1e1e1e] rounded-xl shadow-2xl border border-[#2d2d2d] overflow-hidden text-[#e5e7eb] my-auto max-h-[92vh] flex flex-col">
            <div className="p-4 bg-[#161616] border-b border-[#262626] text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#bef264]/20 text-[#bef264] border border-[#bef264]/40">
                    {editingReferral.referralCode}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> All Fields Unlocked
                  </span>
                </div>
                <h3 className="font-bold text-sm mt-0.5 flex items-center gap-1.5">
                  <Pencil className="w-4 h-4 text-[#bef264]" />
                  <span>Edit Referral Bonus Record</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingReferral(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
                {/* Row 1: Referred By & Referral Customer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Referred By (Advocate / Contact) <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={editReferredById}
                    onChange={e => handleEditReferredByChange(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                  >
                    <option value="">-- Select Referring Advocate --</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type || 'Contact'} - {c.phone || c.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-300">
                      Referral Customer <span className="text-rose-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSyncEditFromContact}
                      className="text-[10px] text-[#bef264] hover:underline flex items-center gap-1 font-semibold"
                      title="Sync phone, email, address, and project from this contact"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      Sync Contact Details
                    </button>
                  </div>
                  <select
                    value={editReferralContactId}
                    onChange={e => handleEditReferralContactChange(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                  >
                    <option value="">-- Select Customer Contact --</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.suburb || c.city || 'NSW'} - {c.phone})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Address with Multi-Property Quick Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Installation Property Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={e => setEditAddress(e.target.value)}
                  placeholder="e.g. 42 Solar Way, Kellyville NSW 2155"
                  required
                  className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                />

                {/* Quick Property Selector if customer has saved properties */}
                {(() => {
                  const targetContact = contacts.find(c => c.id === editReferralContactId);
                  const addrs = targetContact?.addresses && targetContact.addresses.length > 0
                    ? targetContact.addresses
                    : (targetContact?.address ? [{
                        id: 'prim',
                        street: targetContact.address,
                        suburb: targetContact.city || '',
                        state: targetContact.state || 'NSW',
                        propertyType: 'Primary Residence'
                      }] : []);

                  if (addrs.length > 0) {
                    return (
                      <div className="mt-1.5 p-2 bg-[#141414] rounded-lg border border-[#262626] flex items-center flex-wrap gap-1.5">
                        <span className="text-[10px] text-gray-400 font-medium">Customer's Saved Properties:</span>
                        {addrs.map(a => {
                          const full = `${a.street}, ${a.suburb} ${a.state}`;
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => setEditAddress(full)}
                              className="text-[10px] px-2 py-0.5 rounded bg-[#262626] hover:bg-[#333] text-gray-300 hover:text-white border border-[#333] transition-colors"
                              title={`Click to copy: ${full}`}
                            >
                              {a.propertyType ? `${a.propertyType}: ` : ''}{a.street}
                            </button>
                          );
                        })}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Row 3: Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="04xx xxx xxx"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    placeholder="customer@example.com.au"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                  />
                </div>
              </div>

              {/* Row 4: Referral Amount & Referral Status / Project Stage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-300">
                      Referral Amount ($ AUD) <span className="text-rose-400">*</span>
                    </label>
                    <span className="font-mono text-emerald-400 font-bold text-xs">
                      {formatAudCurrency(parseFloat(editAmount) || 0)}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Status of Referral / Project Stage
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={editStatusOfReferral}
                      onChange={e => setEditStatusOfReferral(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none font-medium"
                    >
                      {standardProjectStages.map(st => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                      {!standardProjectStages.includes(editStatusOfReferral) && (
                        <option value={editStatusOfReferral}>{editStatusOfReferral} (Custom)</option>
                      )}
                    </select>
                    <input
                      type="text"
                      value={editStatusOfReferral}
                      onChange={e => setEditStatusOfReferral(e.target.value)}
                      placeholder="Or custom..."
                      className="text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white w-28 outline-none focus:border-[#bef264]"
                      title="Type custom status"
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: Linked Project & Payment Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Linked Solar Installation Project
                  </label>
                  <select
                    value={editLinkedProjectId}
                    onChange={e => handleEditLinkedProjectChange(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                  >
                    <option value="">No Linked Project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.projectCode} - {p.customerName} ({p.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={editPaymentStatus}
                    onChange={e => setEditPaymentStatus(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none font-semibold"
                  >
                    {paymentStatusOptions.map(st => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 6: Payment Reference */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Payment Reference / EFT Receipt Number
                </label>
                <input
                  type="text"
                  value={editPaymentReference}
                  onChange={e => setEditPaymentReference(e.target.value)}
                  placeholder="e.g. EFT-2026-0812 or CBA Ref #92812"
                  className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none font-mono"
                />
              </div>

              {/* Row 7: Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Reconciliation &amp; Settlement Notes
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Notes on advocate bank BSB/account, terms, payout authorization..."
                  className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                />
              </div>

              {/* Row 8: Attachments */}
              <div className="space-y-2 border-t border-[#262626] pt-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-300">
                    Attachments &amp; Invoices ({editAttachments.length})
                  </label>
                  <span className="text-[10px] text-gray-400">PDFs, Invoices, EFT receipts</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <label className="w-full sm:w-auto px-3 py-2 bg-[#262626] hover:bg-[#333] border border-[#333] text-gray-200 text-xs font-semibold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-[#bef264]" />
                    <span>Upload Document File</span>
                    <input
                      type="file"
                      onChange={handleEditFileUpload}
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    />
                  </label>

                  <span className="text-[11px] text-gray-500">or filename:</span>

                  <div className="flex-1 flex items-center gap-1.5 w-full sm:w-auto">
                    <input
                      type="text"
                      value={editTempAttachmentName}
                      onChange={e => setEditTempAttachmentName(e.target.value)}
                      placeholder="e.g. EFT_Receipt_REF004.pdf"
                      className="text-xs p-2 rounded-lg border border-[#262626] bg-[#121212] text-white flex-1 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualEditAttachment}
                      disabled={!editTempAttachmentName.trim()}
                      className="text-xs px-3 py-2 bg-[#262626] hover:bg-[#333] text-white rounded-lg font-semibold disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {editAttachments.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {editAttachments.map(att => (
                      <div
                        key={att.id}
                        className="bg-[#121212] p-2 rounded-lg border border-[#262626] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-[#bef264] shrink-0" />
                          <span className="text-white truncate font-medium">{att.name}</span>
                          <span className="text-[10px] text-gray-400">
                            ({att.sizeBytes ? `${Math.round(att.sizeBytes / 1024)} KB` : 'Document'})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveEditAttachment(att.id)}
                          className="text-gray-500 hover:text-rose-400 p-1 transition-colors"
                          title="Remove attachment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              </div>

              {/* Form Action Buttons */}
              <div className="flex justify-end gap-2 p-3 sm:p-4 bg-[#161616] border-t border-[#262626] shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingReferral(null)}
                  className="px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
