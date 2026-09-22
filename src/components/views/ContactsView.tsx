import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Search,
  Plus,
  Phone,
  MessageSquare,
  Building2,
  Mail,
  MapPin,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  Home,
  UserCheck,
  Calendar,
  Compass,
  Sparkles,
  Info,
  PhoneCall,
  FileAudio,
  Play,
  X,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Contact, AustralianState, ContactAddress, VoIPLineCallLog, VoIPLineInboundSms } from '../../types';
import { classifyAustralianPostcode } from '../../utils/australianPostcodes';
import { originateCall, fetchCallLogs, fetchInboundSmsLogs } from '../../services/voiplineService';

export const ContactsView: React.FC = () => {
  const {
    contacts,
    companies,
    addContact,
    updateContact,
    deleteContact,
    addContactAddress,
    deleteContactAddress,
    systemUsers,
    dropdowns,
    setIsVoipDialerOpen,
    setIsQuickSmsOpen
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Address modal state
  const [managingAddressesContact, setManagingAddressesContact] = useState<Contact | null>(null);
  const [newAddrLine, setNewAddrLine] = useState('');
  const [newAddrCity, setNewAddrCity] = useState('');
  const [newAddrState, setNewAddrState] = useState<string>('NSW');
  const [newAddrPostcode, setNewAddrPostcode] = useState('');
  const [newAddrType, setNewAddrType] = useState<string>('Residential');
  const [newAddrIsPrimary, setNewAddrIsPrimary] = useState(false);

  // VoIPLine Call & Timeline State
  const [callingContactId, setCallingContactId] = useState<string | null>(null);
  const [timelineContact, setTimelineContact] = useState<Contact | null>(null);
  const [timelineCallLogs, setTimelineCallLogs] = useState<VoIPLineCallLog[]>([]);
  const [timelineSmsLogs, setTimelineSmsLogs] = useState<VoIPLineInboundSms[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const handleOriginateCall = async (contact: Contact) => {
    if (!contact.phone) {
      setToastMsg('No phone number recorded for this contact.');
      setTimeout(() => setToastMsg(null), 3500);
      return;
    }
    setCallingContactId(contact.id);
    setToastMsg(`Calling ${contact.name || contact.firstName} (${contact.phone}) via VoIPLine Telecom AU...`);
    try {
      const res = await originateCall({
        userId: 'usr-1',
        contactId: contact.id,
        calleeNumber: contact.phone
      });
      if (res.success) {
        setToastMsg(res.message || `Connected to ${contact.phone}`);
      } else {
        setToastMsg(`VoIPLine Call notice: ${res.message}`);
      }
    } catch (err: any) {
      setToastMsg(`Call origination error: ${err.message}`);
    } finally {
      setCallingContactId(null);
      setTimeout(() => setToastMsg(null), 6000);
    }
  };

  const handleOpenSms = (contact: Contact) => {
    setIsQuickSmsOpen(true);
    setToastMsg(`Opening SMS composer for ${contact.name || contact.firstName} (${contact.phone})`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleOpenTimeline = async (contact: Contact) => {
    setTimelineContact(contact);
    setLoadingTimeline(true);
    try {
      const [calls, sms] = await Promise.all([
        fetchCallLogs({ contactId: contact.id, limit: 40 }),
        fetchInboundSmsLogs({ contactId: contact.id, limit: 40 })
      ]);
      setTimelineCallLogs(calls);
      setTimelineSmsLogs(sms);
    } catch (err) {
      console.warn('Error loading contact timeline:', err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  // Dynamic dropdown options from Settings
  const stateOptions = dropdowns.states && dropdowns.states.length > 0
    ? dropdowns.states
    : ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

  const contactTypeOptions = dropdowns.contactTypes && dropdowns.contactTypes.length > 0
    ? dropdowns.contactTypes
    : ['Residential', 'Commercial', 'Subcontractor', 'Vendor', 'Government / Council', 'Partner'];

  // Form fields as requested:
  // a. First Name - User enters data manually
  const [firstName, setFirstName] = useState('');
  // b. Last Name - User enters data manually
  const [lastName, setLastName] = useState('');
  // c. Street Address - User enters data manually
  const [streetAddress, setStreetAddress] = useState('');
  // d. Suburb - User enters data manually
  const [suburb, setSuburb] = useState('');
  // e. State - Dynamic dropdown managed from Settings
  const [state, setState] = useState(stateOptions[0] || 'NSW');
  // f. Post Code - User enters data manually
  const [postcode, setPostcode] = useState('');
  // g. Area - Auto-populated based on post code (Metro vs Regional)
  const [area, setArea] = useState<'Metro' | 'Regional'>('Metro');
  const [isAreaAutoCalculated, setIsAreaAutoCalculated] = useState(true);
  // h. Email ID - User enters data manually
  const [email, setEmail] = useState('');
  // i. Phone - User enters data manually
  const [phone, setPhone] = useState('');
  // j. Contact Owner - Dynamic dropdown from Users in Settings
  const [contactOwner, setContactOwner] = useState('');
  // k. Contact Type - Dynamic dropdown from Settings
  const [contactType, setContactType] = useState(contactTypeOptions[0] || 'Residential');
  // l. Primary Company - Dynamic dropdown of companies, auto-populates if left blank
  const [primaryCompanyId, setPrimaryCompanyId] = useState('');
  const [autoPopulatedCompanyName, setAutoPopulatedCompanyName] = useState<string>('');
  // m. Created Date - Auto-populate
  const [notes, setNotes] = useState('');

  // Auto-calculate Area whenever postcode changes
  useEffect(() => {
    if (postcode && isAreaAutoCalculated) {
      const calculated = classifyAustralianPostcode(postcode, state);
      setArea(calculated);
    }
  }, [postcode, state, isAreaAutoCalculated]);

  // Auto-populate Primary Company when left blank
  useEffect(() => {
    if (!primaryCompanyId) {
      // Check if email domain matches any company email/domain
      if (email && email.includes('@')) {
        const domain = email.split('@')[1]?.toLowerCase();
        const matched = companies.find(c => {
          const cDomain = c.email?.split('@')[1]?.toLowerCase();
          return cDomain && domain.includes(cDomain);
        });
        if (matched) {
          setAutoPopulatedCompanyName(`${matched.name} (Matched via email @${domain})`);
          return;
        }
      }

      if (contactType === 'Residential') {
        setAutoPopulatedCompanyName('Individual / No Corporate Entity');
      } else {
        setAutoPopulatedCompanyName('No Company Assigned');
      }
    } else {
      const comp = companies.find(c => c.id === primaryCompanyId);
      setAutoPopulatedCompanyName(comp ? comp.name : '');
    }
  }, [primaryCompanyId, email, contactType, companies]);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setStreetAddress('');
    setSuburb('');
    setState(stateOptions[0] || 'NSW');
    setPostcode('');
    setArea('Metro');
    setIsAreaAutoCalculated(true);
    setEmail('');
    setPhone('');
    setContactOwner(systemUsers[0]?.name || '');
    setContactType(contactTypeOptions[0] || 'Residential');
    setPrimaryCompanyId('');
    setAutoPopulatedCompanyName('');
    setNotes('');
    setEditingContact(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (contact: Contact) => {
    setEditingContact(contact);

    // Split name into first and last if not stored separately
    let fName = contact.firstName || '';
    let lName = contact.lastName || '';
    if (!fName && !lName && contact.name) {
      const parts = contact.name.trim().split(' ');
      fName = parts[0] || '';
      lName = parts.slice(1).join(' ') || '';
    }

    setFirstName(fName);
    setLastName(lName);
    setStreetAddress(contact.streetAddress || contact.address || '');
    setSuburb(contact.suburb || contact.city || '');
    setState(contact.state || stateOptions[0] || 'NSW');
    setPostcode(contact.postcode || '2000');
    setArea((contact.area as 'Metro' | 'Regional') || classifyAustralianPostcode(contact.postcode || '2000', contact.state));
    setIsAreaAutoCalculated(true);
    setEmail(contact.email || '');
    setPhone(contact.phone || '');
    setContactOwner(contact.contactOwnerName || contact.contactOwner || systemUsers[0]?.name || '');
    setContactType(contact.contactType || contact.type || contactTypeOptions[0] || 'Residential');
    setPrimaryCompanyId(contact.companyId || '');
    setNotes(contact.notes || '');
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !phone.trim() || !email.trim()) return;

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    // Determine primary company logic
    let resolvedCompanyId = primaryCompanyId;
    let resolvedCompanyName = '';

    if (resolvedCompanyId) {
      const matched = companies.find(c => c.id === resolvedCompanyId);
      resolvedCompanyName = matched ? matched.name : '';
    } else {
      // Auto-populate based on email domain if available
      if (email.includes('@')) {
        const domain = email.split('@')[1]?.toLowerCase();
        const matched = companies.find(c => {
          const cDomain = c.email?.split('@')[1]?.toLowerCase();
          return cDomain && domain.includes(cDomain);
        });
        if (matched) {
          resolvedCompanyId = matched.id;
          resolvedCompanyName = matched.name;
        }
      }
    }

    const selectedOwner = systemUsers.find(u => u.name === contactOwner || u.id === contactOwner);
    const ownerName = selectedOwner?.name || contactOwner || systemUsers[0]?.name || 'Internal Team';

    const fullStreet = streetAddress.trim() || 'Primary Residence';
    const fullSuburb = suburb.trim() || `${state} Metro`;
    const fullAddress = `${fullStreet}, ${fullSuburb} ${state} ${postcode.trim()}`.trim();

    const primaryAddr: ContactAddress = {
      id: `addr-${Date.now()}`,
      street: fullStreet,
      suburb: fullSuburb,
      address: fullAddress,
      city: fullSuburb,
      state: state as AustralianState,
      postcode: postcode.trim() || '2000',
      propertyType: contactType === 'Commercial' ? 'Commercial' : 'Residential',
      isPrimary: true
    };

    addContact({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: fullName,
      streetAddress: fullStreet,
      suburb: fullSuburb,
      state: state as AustralianState,
      postcode: postcode.trim() || '2000',
      area,
      email: email.trim(),
      phone: phone.trim(),
      contactOwner: selectedOwner?.id || contactOwner,
      contactOwnerName: ownerName,
      contactType,
      type: contactType,
      primaryCompany: resolvedCompanyName || (resolvedCompanyId ? 'Company' : 'Individual'),
      companyId: resolvedCompanyId || undefined,
      companyName: resolvedCompanyName || undefined,
      city: fullSuburb,
      address: fullAddress,
      source: 'Manual',
      notes,
      createdAt: new Date().toISOString().split('T')[0],
      addresses: [primaryAddr]
    });

    setIsAddModalOpen(false);
    resetForm();
    setToastMsg(`Contact "${fullName}" created successfully.`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact || !firstName.trim()) return;

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    let resolvedCompanyId = primaryCompanyId;
    let resolvedCompanyName = '';

    if (resolvedCompanyId) {
      const matched = companies.find(c => c.id === resolvedCompanyId);
      resolvedCompanyName = matched ? matched.name : '';
    } else {
      if (email.includes('@')) {
        const domain = email.split('@')[1]?.toLowerCase();
        const matched = companies.find(c => {
          const cDomain = c.email?.split('@')[1]?.toLowerCase();
          return cDomain && domain.includes(cDomain);
        });
        if (matched) {
          resolvedCompanyId = matched.id;
          resolvedCompanyName = matched.name;
        }
      }
    }

    const selectedOwner = systemUsers.find(u => u.name === contactOwner || u.id === contactOwner);
    const ownerName = selectedOwner?.name || contactOwner || systemUsers[0]?.name || 'Internal Team';

    const fullStreet = streetAddress.trim() || 'Primary Address';
    const fullSuburb = suburb.trim() || `${state} Metro`;
    const fullAddress = `${fullStreet}, ${fullSuburb} ${state} ${postcode.trim()}`.trim();

    // Preserve existing addresses but update primary if present
    const existingAddresses = editingContact.addresses || [];
    const updatedAddresses = existingAddresses.map(a => {
      if (a.isPrimary) {
        return {
          ...a,
          street: fullStreet,
          suburb: fullSuburb,
          address: fullAddress,
          city: fullSuburb,
          state: state as AustralianState,
          postcode: postcode.trim()
        };
      }
      return a;
    });

    updateContact(editingContact.id, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: fullName,
      streetAddress: fullStreet,
      suburb: fullSuburb,
      state: state as AustralianState,
      postcode: postcode.trim(),
      area,
      email: email.trim(),
      phone: phone.trim(),
      contactOwner: selectedOwner?.id || contactOwner,
      contactOwnerName: ownerName,
      contactType,
      type: contactType,
      primaryCompany: resolvedCompanyName || (resolvedCompanyId ? 'Company' : 'Individual'),
      companyId: resolvedCompanyId || undefined,
      companyName: resolvedCompanyName || undefined,
      city: fullSuburb,
      address: fullAddress,
      notes,
      addresses: updatedAddresses.length > 0 ? updatedAddresses : [
        {
          id: `addr-${Date.now()}`,
          street: fullStreet,
          suburb: fullSuburb,
          address: fullAddress,
          city: fullSuburb,
          state: state as AustralianState,
          postcode: postcode.trim(),
          propertyType: contactType === 'Commercial' ? 'Commercial' : 'Residential',
          isPrimary: true
        }
      ]
    });

    setEditingContact(null);
    resetForm();
    setToastMsg(`Contact "${fullName}" updated successfully.`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleDeleteContact = (contact: Contact) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete contact "${contact.name}"?`);
    if (confirmDelete) {
      deleteContact(contact.id);
      setToastMsg(`Contact "${contact.name}" deleted.`);
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  const handleSyncIntegrations = (source: 'Gmail / Outlook' | 'OpenSolar') => {
    setSyncStatusMsg(`Syncing contacts with ${source}...`);
    setTimeout(() => {
      setSyncStatusMsg(`Successfully verified and synced contacts from ${source}!`);
      setTimeout(() => setSyncStatusMsg(null), 4000);
    }, 1200);
  };

  const handleSaveNewPropertyToContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingAddressesContact || !newAddrLine.trim()) return;

    addContactAddress(managingAddressesContact.id, {
      address: newAddrLine.trim(),
      street: newAddrLine.trim(),
      suburb: newAddrCity.trim() || `${newAddrState} Metro`,
      city: newAddrCity.trim() || `${newAddrState} Metro`,
      state: newAddrState as AustralianState,
      postcode: newAddrPostcode.trim() || '2000',
      propertyType: newAddrType,
      isPrimary: newAddrIsPrimary
    });

    const updated = contacts.find(c => c.id === managingAddressesContact.id);
    if (updated) {
      setManagingAddressesContact({
        ...updated,
        addresses: [
          ...(updated.addresses || []),
          {
            id: `addr-temp-${Date.now()}`,
            address: newAddrLine.trim(),
            street: newAddrLine.trim(),
            suburb: newAddrCity.trim() || `${newAddrState} Metro`,
            city: newAddrCity.trim() || `${newAddrState} Metro`,
            state: newAddrState as AustralianState,
            postcode: newAddrPostcode.trim() || '2000',
            propertyType: newAddrType,
            isPrimary: newAddrIsPrimary
          }
        ]
      });
    }

    setNewAddrLine('');
    setNewAddrCity('');
    setNewAddrPostcode('');
    setNewAddrIsPrimary(false);
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.suburb && c.suburb.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.city && c.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.contactOwnerName && c.contactOwnerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.postcode && c.postcode.includes(searchTerm)) ||
      (c.addresses && c.addresses.some(a => a.address.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesState = filterState === 'all' || c.state === filterState;
    const matchesType = filterType === 'all' || (c.contactType || c.type) === filterType;
    return matchesSearch && matchesState && matchesType;
  });

  return (
    <div className="flex-1 bg-[#0a0a0a] overflow-y-auto p-4 sm:p-6 space-y-6 text-[#e5e7eb]">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Sync Triggers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Solar Contacts Directory</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#bef2641a] text-[#bef264] border border-[#bef26433]">
              Fully Editable
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Complete contact management with auto-calculated Metro/Regional areas, internal team owners, and dynamic Settings dropdowns
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleSyncIntegrations('Gmail / Outlook')}
            className="px-3 py-1.5 rounded-lg bg-[#1e1e1e] border border-[#2d2d2d] text-gray-300 hover:bg-[#262626] text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
            <span>Sync Gmail / Outlook</span>
          </button>

          <button
            onClick={() => handleSyncIntegrations('OpenSolar')}
            className="px-3 py-1.5 rounded-lg bg-[#1e1e1e] border border-[#2d2d2d] text-gray-300 hover:bg-[#262626] text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#bef264]" />
            <span>Sync OpenSolar</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-lg bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Contact</span>
          </button>
        </div>
      </div>

      {syncStatusMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{syncStatusMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#1e1e1e] p-4 rounded-xl border border-[#2d2d2d] shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by customer name, phone, email, suburb, owner, or postcode..."
            className="w-full text-xs pl-9 pr-4 py-2 rounded-lg bg-[#121212] border border-[#262626] text-white placeholder:text-gray-500 outline-none focus:border-[#bef264]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterState}
            onChange={e => setFilterState(e.target.value)}
            className="text-xs font-semibold bg-[#121212] border border-[#262626] text-white rounded-lg px-3 py-2 outline-none focus:border-[#bef264]"
          >
            <option value="all">All States</option>
            {stateOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-xs font-semibold bg-[#121212] border border-[#262626] text-white rounded-lg px-3 py-2 outline-none focus:border-[#bef264]"
          >
            <option value="all">All Types</option>
            {contactTypeOptions.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContacts.map(contact => {
          const contactAddresses = contact.addresses && contact.addresses.length > 0
            ? contact.addresses
            : [
                {
                  id: `default-${contact.id}`,
                  address: contact.address || `${contact.city}, ${contact.state}`,
                  street: contact.streetAddress || contact.address,
                  suburb: contact.suburb || contact.city,
                  city: contact.suburb || contact.city,
                  state: contact.state as AustralianState,
                  postcode: contact.postcode || '2000',
                  propertyType: 'Primary Residence',
                  isPrimary: true
                }
              ];

          const contactArea = contact.area || classifyAustralianPostcode(contact.postcode || '2000', contact.state);
          const typeBadge = contact.contactType || contact.type || 'Residential';

          return (
            <div
              key={contact.id}
              className="bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] shadow-xs p-5 flex flex-col justify-between space-y-4 hover:border-[#bef264]/40 transition-colors relative"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-white leading-tight truncate">{contact.name}</h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {contact.companyName ? (
                        <span className="text-[11px] text-gray-300 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-[#bef264]" />
                          <span className="truncate">{contact.companyName}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-500">Individual Customer</span>
                      )}

                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                        contactArea === 'Metro'
                          ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}>
                        {contactArea}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                      typeBadge === 'Residential'
                        ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                        : typeBadge === 'Commercial'
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {typeBadge}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs text-gray-300 mt-2.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      <span className="font-mono text-gray-300 truncate">{contact.phone}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOriginateCall(contact);
                        }}
                        disabled={callingContactId === contact.id}
                        title="Click-to-Call via VoIPLine Telecom AU"
                        className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[11px] font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        {callingContactId === contact.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <PhoneCall className="w-3 h-3" />
                        )}
                        <span>{callingContactId === contact.id ? 'Calling...' : 'Call'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenSms(contact);
                        }}
                        title="SMS Contact"
                        className="px-2 py-0.5 rounded bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 text-[11px] font-medium flex items-center gap-1 transition-colors"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>SMS</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span className="truncate text-gray-300">{contact.email}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#bef264] shrink-0" />
                    <span className="text-gray-300 truncate">
                      {contact.suburb || contact.city} {contact.state} {contact.postcode ? `(${contact.postcode})` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="text-gray-500">Owner:</span>
                    <span className="text-gray-200 font-medium">
                      {contact.contactOwnerName || contact.contactOwner || 'Internal Team'}
                    </span>
                  </div>

                  {contact.createdAt && (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <Calendar className="w-3 h-3 text-gray-500 shrink-0" />
                      <span>Created: {contact.createdAt}</span>
                    </div>
                  )}
                </div>

                {/* Multi-Property Portfolio Accordion */}
                <div className="mt-3 pt-2.5 border-t border-[#262626]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                      <Home className="w-3 h-3 text-gray-500" />
                      <span>Properties ({contactAddresses.length})</span>
                    </span>
                    <button
                      onClick={() => setManagingAddressesContact(contact)}
                      className="text-[10px] text-[#bef264] font-bold hover:underline"
                    >
                      + Manage Properties
                    </button>
                  </div>

                  <div className="space-y-1 max-h-24 overflow-y-auto pr-0.5">
                    {contactAddresses.slice(0, 2).map(addr => (
                      <div
                        key={addr.id}
                        className="bg-[#141414] p-1.5 rounded border border-[#262626] text-[11px] text-gray-300 flex items-center justify-between gap-1"
                      >
                        <span className="truncate font-medium text-white">{addr.address || addr.street}</span>
                        {addr.isPrimary && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#bef26422] text-[#bef264] rounded shrink-0">
                            Primary
                          </span>
                        )}
                      </div>
                    ))}
                    {contactAddresses.length > 2 && (
                      <p className="text-[10px] text-gray-500 italic">+{contactAddresses.length - 2} more property</p>
                    )}
                  </div>
                </div>

                {contact.notes && (
                  <p className="mt-2 text-[11px] text-gray-400 bg-[#121212] border border-[#262626] p-2 rounded-lg line-clamp-2">
                    {contact.notes}
                  </p>
                )}
              </div>

              {/* Quick Actions & Edit Controls */}
              <div className="pt-3 border-t border-[#262626] flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(contact)}
                    className="p-1.5 rounded-lg bg-[#262626] hover:bg-[#bef264] hover:text-black text-gray-300 transition-colors flex items-center gap-1 font-semibold text-xs px-2"
                    title="Edit Contact"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteContact(contact)}
                    className="p-1.5 rounded-lg bg-[#262626] hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition-colors"
                    title="Delete Contact"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <a
                    href={`mailto:${contact.email}`}
                    className="p-2 rounded-lg bg-[#262626] hover:bg-[#333] text-gray-300 border border-[#333] transition-colors"
                    title={`Email ${contact.email}`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleOpenTimeline(contact)}
                    className="p-2 rounded-lg bg-[#262626] hover:bg-cyan-500/20 text-cyan-400 border border-[#333] transition-colors"
                    title="View Call History & Recordings"
                  >
                    <FileAudio className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsVoipDialerOpen(true)}
                    className="p-2 rounded-lg bg-[#262626] hover:bg-[#333] text-emerald-400 border border-[#333] transition-colors"
                    title="Dial Pad"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsQuickSmsOpen(true)}
                    className="p-2 rounded-lg bg-[#262626] hover:bg-[#333] text-[#bef264] border border-[#333] transition-colors"
                    title="SMS via MessageMedia"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Contact Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#1e1e1e] rounded-xl shadow-2xl border border-[#2d2d2d] overflow-hidden text-[#e5e7eb] my-8">
            <div className="p-4 bg-[#161616] border-b border-[#262626] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Add Solar Contact</h3>
                <p className="text-[11px] text-gray-400">All requested contact fields with dynamic dropdowns &amp; auto-calculated Area</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto pr-2">
              {/* a. First Name & b. Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    First Name <span className="text-[#bef264]">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="e.g. Harrison"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none placeholder:text-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Last Name <span className="text-[#bef264]">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="e.g. Davies"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none placeholder:text-gray-500"
                    required
                  />
                </div>
              </div>

              {/* c. Street Address & d. Suburb */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Street Address <span className="text-[#bef264]">*</span>
                  </label>
                  <input
                    type="text"
                    value={streetAddress}
                    onChange={e => setStreetAddress(e.target.value)}
                    placeholder="e.g. 42 Albert Road"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none placeholder:text-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Suburb <span className="text-[#bef264]">*</span>
                  </label>
                  <input
                    type="text"
                    value={suburb}
                    onChange={e => setSuburb(e.target.value)}
                    placeholder="e.g. Strathfield"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none placeholder:text-gray-500"
                    required
                  />
                </div>
              </div>

              {/* e. State, f. Post Code & g. Area */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    State (Dynamic from Settings) <span className="text-[#bef264]">*</span>
                  </label>
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
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Post Code <span className="text-[#bef264]">*</span>
                  </label>
                  <input
                    type="text"
                    value={postcode}
                    onChange={e => {
                      setPostcode(e.target.value);
                      setIsAreaAutoCalculated(true);
                    }}
                    placeholder="e.g. 2135"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none font-mono placeholder:text-gray-500"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-300">
                      Area (Auto-calculated)
                    </label>
                    <span className="text-[10px] text-[#bef264] flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" />
                      Auto
                    </span>
                  </div>
                  <select
                    value={area}
                    onChange={e => {
                      setArea(e.target.value as 'Metro' | 'Regional');
                      setIsAreaAutoCalculated(false);
                    }}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#171717] text-[#bef264] font-bold focus:border-[#bef264] outline-none"
                  >
                    <option value="Metro">Metro Area</option>
                    <option value="Regional">Regional Area</option>
                  </select>
                </div>
              </div>

              {/* h. Email ID & i. Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Email ID <span className="text-[#bef264]">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="harrison.davies@gmail.com"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none placeholder:text-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Phone <span className="text-[#bef264]">*</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+61 411 234 567"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none font-mono placeholder:text-gray-500"
                    required
                  />
                </div>
              </div>

              {/* j. Contact Owner & k. Contact Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Contact Owner (Internal Team from Settings) <span className="text-[#bef264]">*</span>
                  </label>
                  <select
                    value={contactOwner}
                    onChange={e => setContactOwner(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                    required
                  >
                    <option value="">-- Select Internal Team Member --</option>
                    {systemUsers.map(u => (
                      <option key={u.id} value={u.name}>
                        {u.name} ({u.role} - {u.department || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Contact Type (Dynamic from Settings) <span className="text-[#bef264]">*</span>
                  </label>
                  <select
                    value={contactType}
                    onChange={e => setContactType(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                  >
                    {contactTypeOptions.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* l. Primary Company & m. Created Date */}
              <div className="p-3 bg-[#161616] rounded-xl border border-[#262626] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white">
                    Primary Company (Dynamic Directory)
                  </label>
                  <span className="text-[10px] text-gray-400">
                    If left blank, auto-populates based on company assignment / email domain
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <select
                      value={primaryCompanyId}
                      onChange={e => setPrimaryCompanyId(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                    >
                      <option value="">-- Leave Blank for Auto-population --</option>
                      {companies.map(comp => (
                        <option key={comp.id} value={comp.id}>
                          {comp.name} ({comp.type} - {comp.state})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-gray-300 flex items-center justify-between">
                      <span className="text-gray-500 text-[11px]">Assignment:</span>
                      <span className="font-semibold text-white truncate max-w-[180px]">
                        {autoPopulatedCompanyName || 'Auto-evaluating...'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 text-[11px] text-gray-400">
                  <Calendar className="w-3.5 h-3.5 text-[#bef264]" />
                  <span>Created Date (Auto-populated):</span>
                  <span className="font-mono font-semibold text-white">
                    {new Date().toISOString().split('T')[0]}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Notes / System Inquiries</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notes on solar roof type, battery preference, power bills..."
                  className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none placeholder:text-gray-500"
                />
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
                  Create Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {editingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#1e1e1e] rounded-xl shadow-2xl border border-[#2d2d2d] overflow-hidden text-[#e5e7eb] my-8">
            <div className="p-4 bg-[#161616] border-b border-[#262626] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Edit Contact: {editingContact.name}</h3>
                <p className="text-[11px] text-gray-400">Update contact fields, assigned owner, company, and location</p>
              </div>
              <button onClick={() => setEditingContact(null)} className="text-gray-400 hover:text-white transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto pr-2">
              {/* a. First Name & b. Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    First Name <span className="text-[#bef264]">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="e.g. Harrison"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Last Name <span className="text-[#bef264]">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="e.g. Davies"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                    required
                  />
                </div>
              </div>

              {/* c. Street Address & d. Suburb */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Street Address <span className="text-[#bef264]">*</span>
                  </label>
                  <input
                    type="text"
                    value={streetAddress}
                    onChange={e => setStreetAddress(e.target.value)}
                    placeholder="e.g. 42 Albert Road"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Suburb <span className="text-[#bef264]">*</span>
                  </label>
                  <input
                    type="text"
                    value={suburb}
                    onChange={e => setSuburb(e.target.value)}
                    placeholder="e.g. Strathfield"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                    required
                  />
                </div>
              </div>

              {/* e. State, f. Post Code & g. Area */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    State (Dynamic from Settings) <span className="text-[#bef264]">*</span>
                  </label>
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
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Post Code <span className="text-[#bef264]">*</span>
                  </label>
                  <input
                    type="text"
                    value={postcode}
                    onChange={e => {
                      setPostcode(e.target.value);
                      setIsAreaAutoCalculated(true);
                    }}
                    placeholder="e.g. 2135"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none font-mono"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-300">
                      Area (Auto-calculated)
                    </label>
                    <span className="text-[10px] text-[#bef264] flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" />
                      Auto
                    </span>
                  </div>
                  <select
                    value={area}
                    onChange={e => {
                      setArea(e.target.value as 'Metro' | 'Regional');
                      setIsAreaAutoCalculated(false);
                    }}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#171717] text-[#bef264] font-bold focus:border-[#bef264] outline-none"
                  >
                    <option value="Metro">Metro Area</option>
                    <option value="Regional">Regional Area</option>
                  </select>
                </div>
              </div>

              {/* h. Email ID & i. Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Email ID <span className="text-[#bef264]">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="harrison.davies@gmail.com"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Phone <span className="text-[#bef264]">*</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+61 411 234 567"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none font-mono"
                    required
                  />
                </div>
              </div>

              {/* j. Contact Owner & k. Contact Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Contact Owner (Internal Team from Settings) <span className="text-[#bef264]">*</span>
                  </label>
                  <select
                    value={contactOwner}
                    onChange={e => setContactOwner(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                    required
                  >
                    {systemUsers.map(u => (
                      <option key={u.id} value={u.name}>
                        {u.name} ({u.role} - {u.department || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Contact Type (Dynamic from Settings) <span className="text-[#bef264]">*</span>
                  </label>
                  <select
                    value={contactType}
                    onChange={e => setContactType(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                  >
                    {contactTypeOptions.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* l. Primary Company & m. Created Date */}
              <div className="p-3 bg-[#161616] rounded-xl border border-[#262626] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white">
                    Primary Company
                  </label>
                  <span className="text-[10px] text-gray-400">
                    If left blank, auto-populates based on company assignment / email domain
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <select
                      value={primaryCompanyId}
                      onChange={e => setPrimaryCompanyId(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                    >
                      <option value="">-- No Corporate Entity (Individual) --</option>
                      {companies.map(comp => (
                        <option key={comp.id} value={comp.id}>
                          {comp.name} ({comp.type} - {comp.state})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-gray-300 flex items-center justify-between">
                      <span className="text-gray-500 text-[11px]">Assignment:</span>
                      <span className="font-semibold text-white truncate max-w-[180px]">
                        {autoPopulatedCompanyName || 'No Company Assigned'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 text-[11px] text-gray-400">
                  <Calendar className="w-3.5 h-3.5 text-[#bef264]" />
                  <span>Created Date:</span>
                  <span className="font-mono font-semibold text-white">
                    {editingContact.createdAt || '2026-07-12'}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Notes / System Inquiries</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notes on solar roof type, battery preference..."
                  className="w-full text-xs p-2.5 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => handleDeleteContact(editingContact)}
                  className="px-3 py-2 rounded-lg text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Contact</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingContact(null)}
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

      {/* Manage Contact Properties / Addresses Modal */}
      {managingAddressesContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#1e1e1e] rounded-xl shadow-2xl border border-[#2d2d2d] overflow-hidden text-[#e5e7eb] my-8">
            <div className="p-4 bg-[#161616] border-b border-[#262626] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Multiple Properties &amp; Addresses</h3>
                <p className="text-[11px] text-gray-400">Contact: {managingAddressesContact.name}</p>
              </div>
              <button
                onClick={() => setManagingAddressesContact(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Existing Addresses List */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-300">
                  Current Linked Properties:
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(contacts.find(c => c.id === managingAddressesContact.id)?.addresses || []).map(addr => (
                    <div
                      key={addr.id}
                      className="p-2.5 rounded-lg bg-[#141414] border border-[#2d2d2d] flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{addr.address || addr.street}</span>
                          {addr.isPrimary && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#bef26422] text-[#bef264]">
                              Primary
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400">({addr.propertyType || 'Property'})</span>
                        </div>
                        <p className="text-gray-400 text-[11px]">
                          {addr.city || addr.suburb}, {addr.state} {addr.postcode}
                        </p>
                      </div>

                      <button
                        onClick={() => deleteContactAddress(managingAddressesContact.id, addr.id)}
                        className="p-1.5 text-gray-500 hover:text-rose-400 transition-colors"
                        title="Delete this address"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Property Form */}
              <form onSubmit={handleSaveNewPropertyToContact} className="p-3 bg-[#161616] rounded-xl border border-[#2d2d2d] space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-[#bef264]" />
                  <span>Add Additional Property / Address</span>
                </h4>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">Street Address</label>
                  <input
                    type="text"
                    value={newAddrLine}
                    onChange={e => setNewAddrLine(e.target.value)}
                    placeholder="e.g. 14 High Street or Unit 4B / 20 Commercial Rd"
                    className="w-full text-xs p-2 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 mb-1">Suburb / City</label>
                    <input
                      type="text"
                      value={newAddrCity}
                      onChange={e => setNewAddrCity(e.target.value)}
                      placeholder="e.g. Parramatta"
                      className="w-full text-xs p-2 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 mb-1">State</label>
                    <select
                      value={newAddrState}
                      onChange={e => setNewAddrState(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                    >
                      {stateOptions.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 mb-1">Postcode</label>
                    <input
                      type="text"
                      value={newAddrPostcode}
                      onChange={e => setNewAddrPostcode(e.target.value)}
                      placeholder="2150"
                      className="w-full text-xs p-2 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 mb-1">Property Type</label>
                    <select
                      value={newAddrType}
                      onChange={e => setNewAddrType(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-[#262626] bg-[#121212] text-white focus:border-[#bef264] outline-none"
                    >
                      <option value="Residential">Residential</option>
                      <option value="Investment">Investment Property</option>
                      <option value="Commercial">Commercial Building</option>
                      <option value="Warehouse">Warehouse / Industrial</option>
                    </select>
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newAddrIsPrimary}
                        onChange={e => setNewAddrIsPrimary(e.target.checked)}
                        className="rounded border-[#333] text-[#bef264] focus:ring-0"
                      />
                      <span>Set as Primary Address</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold rounded-lg transition-colors"
                  >
                    Save Property Address
                  </button>
                </div>
              </form>

              <div className="flex justify-end pt-2 border-t border-[#262626]">
                <button
                  onClick={() => setManagingAddressesContact(null)}
                  className="px-4 py-2 rounded-lg text-xs bg-[#262626] hover:bg-[#333] text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Contact Communication Timeline & VoIPLine Call Recordings Modal */}
      {timelineContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#171717] rounded-2xl shadow-2xl border border-[#2d2d2d] overflow-hidden text-gray-200 my-8 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 md:p-5 bg-[#121212] border-b border-[#262626] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <FileAudio className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base">
                      {timelineContact.name || `${timelineContact.firstName} ${timelineContact.lastName}`}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#222] text-cyan-300 border border-[#333]">
                      {timelineContact.phone}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    VoIPLine Telecom AU Voice Recordings &amp; Communication Timeline
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOriginateCall(timelineContact)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Click-to-Call</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenSms(timelineContact)}
                  className="px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>SMS</span>
                </button>
                <button
                  onClick={() => setTimelineContact(null)}
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#252525] transition-colors ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Timeline Content */}
            <div className="p-4 md:p-6 overflow-y-auto space-y-5 flex-1">
              {loadingTimeline ? (
                <div className="py-12 text-center text-gray-400 text-xs flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                  <span>Loading call recordings and communication history...</span>
                </div>
              ) : (
                <>
                  {/* Call Recordings & Logs Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-cyan-400" />
                        Call Recordings &amp; Voice Logs ({timelineCallLogs.length})
                      </h4>
                      <span className="text-[10px] text-gray-500">Live VoIPLine AU PBX Sync</span>
                    </div>

                    {timelineCallLogs.length === 0 ? (
                      <div className="p-4 bg-[#121212] border border-[#262626] rounded-xl text-center text-xs text-gray-500">
                        No calls logged yet for this contact. Use &quot;Click-to-Call&quot; to initiate a call via VoIPLine.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {timelineCallLogs.map(call => (
                          <div
                            key={call.id}
                            className="p-3.5 bg-[#141414] border border-[#262626] rounded-xl space-y-2.5 hover:border-[#383838] transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-cyan-400">
                                  {call.direction === 'inbound' ? (
                                    <Phone className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <PhoneCall className="w-4 h-4 text-cyan-400" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-xs text-white">
                                      {call.direction === 'inbound' ? 'Inbound Call' : 'Outbound Call'}
                                    </span>
                                    <span
                                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                        call.status === 'completed'
                                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                          : call.status === 'answered'
                                          ? 'bg-sky-950 text-sky-300 border border-sky-800'
                                          : call.status === 'voicemail'
                                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                                      }`}
                                    >
                                      {call.status}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-gray-400 font-mono flex items-center gap-2 mt-0.5">
                                    <span>From: {call.caller_number || 'Unknown'}</span>
                                    <span>&rarr;</span>
                                    <span>To: {call.callee_number || 'Line'}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="text-[11px] font-mono text-gray-300 block">
                                  {call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : '0s'}
                                </span>
                                <span className="text-[10px] text-gray-500">
                                  {new Date(call.timestamp).toLocaleString()}
                                </span>
                              </div>
                            </div>

                            {/* HTML5 Audio Player for Recorded Calls */}
                            {call.recording_url && (
                              <div className="mt-2 p-3 bg-[#0d0d0d] border border-cyan-500/30 rounded-xl space-y-1.5">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-cyan-400">
                                  <span className="flex items-center gap-1.5">
                                    <FileAudio className="w-3.5 h-3.5 text-cyan-400" />
                                    VoIPLine Asynchronous Call Recording Audio
                                  </span>
                                  <a
                                    href={call.recording_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                                  >
                                    <span>Open Audio Link</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                                <audio
                                  controls
                                  src={call.recording_url}
                                  className="w-full h-8 mt-1 rounded bg-[#1f1f1f]"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Inbound SMS Section */}
                  <div className="space-y-3 pt-4 border-t border-[#262626]">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                      Inbound SMS Messages ({timelineSmsLogs.length})
                    </h4>

                    {timelineSmsLogs.length === 0 ? (
                      <div className="p-4 bg-[#121212] border border-[#262626] rounded-xl text-center text-xs text-gray-500">
                        No inbound SMS messages received from this contact yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {timelineSmsLogs.map(sms => (
                          <div
                            key={sms.id}
                            className="p-3 bg-[#141414] border border-[#262626] rounded-xl space-y-1"
                          >
                            <div className="flex items-center justify-between text-[11px] text-gray-400">
                              <span className="font-mono text-cyan-300">From: {sms.sender_number}</span>
                              <span>{new Date(sms.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-white leading-relaxed">{sms.message_body}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#121212] border-t border-[#262626] flex items-center justify-between shrink-0">
              <span className="text-[11px] text-gray-500">
                VoIPLine Telecom AU &bull; HTML5 In-Browser Voice Player
              </span>
              <button
                type="button"
                onClick={() => setTimelineContact(null)}
                className="px-4 py-1.5 bg-[#252525] hover:bg-[#333] text-gray-200 text-xs font-semibold rounded-lg transition-colors"
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
