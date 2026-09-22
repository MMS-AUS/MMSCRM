import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Settings,
  Users,
  Shield,
  ListFilter,
  Globe,
  Lock,
  Plus,
  Trash2,
  CheckCircle2,
  Edit2,
  Mail,
  Phone,
  Building,
  Check,
  X,
  UserCheck,
  AlertCircle,
  Sliders,
  Zap,
  KeyRound,
  Sparkles,
  FileSpreadsheet,
  Download,
  Upload,
  FileDown,
  BookOpen,
  Search,
  Key
} from 'lucide-react';
import { UserProfile, UserRole, RoleAccessConfig } from '../../types';
import { FeaturesSettingsTab } from '../settings/FeaturesSettingsTab';
import { RolesAccessControlTab } from '../settings/RolesAccessControlTab';
import { OperationalRulesTab } from '../settings/OperationalRulesTab';
import { PortalAddressesTab } from '../settings/PortalAddressesTab';
import { SystemEmailSettingsTab } from '../settings/SystemEmailSettingsTab';
import { ApiKeysSettingsTab } from '../settings/ApiKeysSettingsTab';
import { UserInviteModal } from '../modals/UserInviteModal';
import { DropdownExcelSyncModal } from '../modals/DropdownExcelSyncModal';
import {
  exportDropdownsToExcel,
  exportDropdownTemplate
} from '../../services/dropdownExcelService';

export const SettingsView: React.FC = () => {
  const {
    dropdownConfigs = [],
    addDropdownOption,
    removeDropdownOption,
    batchImportDropdowns,
    systemUsers,
    addSystemUser,
    updateSystemUser,
    deleteSystemUser,
    accessRoles,
    updateRoleAccess,
    connectedDomains,
    addConnectedDomain,
    removeConnectedDomain,
    currentUser,
    dynamicRoles,
    systemFeatures
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'portal-addresses' | 'features' | 'access-control' | 'rules' | 'system-email' | 'users' | 'dropdowns' | 'domains' | 'security' | 'api-keys'
  >('portal-addresses');
  const [feedback, setFeedback] = useState<string | null>(null);

  // User Management State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserVoip, setNewUserVoip] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('employee');
  const [newUserDept, setNewUserDept] = useState('Sales');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteModalUser, setInviteModalUser] = useState<UserProfile | null>(null);

  // Dropdown Management State
  const safeConfigs = dropdownConfigs && dropdownConfigs.length > 0 ? dropdownConfigs : [
    { key: 'panelBrands', label: 'Solar PV Panel Brands (CEC Approved)', options: [] }
  ];
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>(
    safeConfigs[0]?.key || 'panelBrands'
  );
  const [newOptionValue, setNewOptionValue] = useState('');
  const [isExcelSyncModalOpen, setIsExcelSyncModalOpen] = useState(false);
  const [excelSyncInitialTab, setExcelSyncInitialTab] = useState<'import' | 'export' | 'guide'>('import');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [editingOption, setEditingOption] = useState<{ original: string; current: string } | null>(null);

  // Domain Management State
  const [newDomainInput, setNewDomainInput] = useState('');

  const activeCategory = safeConfigs.find(c => c.key === selectedCategoryKey) || safeConfigs[0];

  // User Handlers
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    if (editingUserId) {
      updateSystemUser(editingUserId, {
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        phone: newUserPhone.trim(),
        voipLineNumber: newUserVoip.trim(),
        role: newUserRole,
        department: newUserDept as any
      });
      setFeedback(`User ${newUserName} successfully updated.`);
    } else {
      const result = addSystemUser({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        phone: newUserPhone.trim(),
        voipLineNumber: newUserVoip.trim(),
        role: newUserRole,
        department: newUserDept as any,
        assignedDomain: 'mysolarcrm.com.au'
      });
      setFeedback(`User ${newUserName} successfully created! ERP Invitation & password link generated.`);
      if (result?.user) {
        setInviteModalUser(result.user);
        setIsInviteModalOpen(true);
      }
    }

    setIsAddUserModalOpen(false);
    setEditingUserId(null);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
    setNewUserVoip('');
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleEditClick = (user: UserProfile) => {
    setEditingUserId(user.id);
    setNewUserName(user.name);
    setNewUserEmail(user.email);
    setNewUserPhone(user.phone || '');
    setNewUserVoip(user.voipLineNumber || '');
    setNewUserRole(user.role);
    setNewUserDept(user.department || 'Sales');
    setIsAddUserModalOpen(true);
  };

  const handleDeleteUser = (user: UserProfile) => {
    if (user.id === currentUser.id) {
      alert('You cannot delete your own logged-in account.');
      return;
    }
    if (window.confirm(`Are you sure you want to remove user "${user.name}"?`)) {
      deleteSystemUser(user.id);
      setFeedback(`User ${user.name} removed.`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // Dropdown Handlers
  const handleAddOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOptionValue.trim()) return;

    addDropdownOption(selectedCategoryKey, newOptionValue.trim());
    setNewOptionValue('');
    setFeedback(`Added "${newOptionValue.trim()}" to ${activeCategory.label}!`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleRemoveOption = (val: string) => {
    removeDropdownOption(selectedCategoryKey, val);
    setFeedback(`Removed "${val}" from ${activeCategory.label}.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSaveEditedOption = (originalVal: string, newVal: string) => {
    if (!newVal.trim() || newVal.trim() === originalVal) {
      setEditingOption(null);
      return;
    }
    batchImportDropdowns({
      totalRows: 1,
      validRows: 1,
      addCount: 0,
      updateCount: 1,
      deleteCount: 0,
      keepCount: 0,
      warningCount: 0,
      invalidCount: 0,
      categoriesAffected: [selectedCategoryKey],
      rows: [{
        categoryKey: selectedCategoryKey,
        categoryLabel: activeCategory.label,
        optionValue: newVal.trim(),
        action: 'UPDATE',
        oldValue: originalVal,
        sourceSheet: 'UI_Direct_Edit',
        rowIndex: 1,
        status: 'valid'
      }]
    }, 'merge');
    setEditingOption(null);
    setFeedback(`Updated "${originalVal}" to "${newVal.trim()}".`);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Domain Handlers
  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainInput.trim()) return;
    addConnectedDomain(newDomainInput.trim());
    setNewDomainInput('');
    setFeedback(`Added domain "${newDomainInput.trim()}"!`);
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="flex-1 bg-[#0a0a0a] overflow-y-auto p-4 sm:p-6 space-y-6 text-[#e5e7eb]">
      {/* Title & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262626] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Settings &amp; Administration</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#bef2641a] text-[#bef264] border border-[#bef26433]">
              Enterprise Control
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage system users, define role-based access permissions, customize hardware dropdowns, and configure security
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex items-center gap-1.5 p-1 bg-[#141414] border border-[#262626] rounded-xl overflow-x-auto text-xs no-scrollbar">
        {[
          { id: 'portal-addresses', label: 'Portals & Addresses', icon: Globe },
          { id: 'features', label: `Features (${systemFeatures?.length || 15})`, icon: Sliders },
          { id: 'access-control', label: `Roles & Access Control (${dynamicRoles?.length || 5})`, icon: Shield },
          { id: 'rules', label: 'Operational Rules & Rates', icon: Zap },
          { id: 'system-email', label: 'System Email & Alerts', icon: Mail },
          { id: 'users', label: `Users (${systemUsers.length})`, icon: Users },
          { id: 'dropdowns', label: 'Dropdowns & Hardware', icon: ListFilter },
          { id: 'domains', label: 'Connected Domains', icon: Globe },
          { id: 'api-keys', label: 'API Keys & Secrets', icon: Key },
          { id: 'security', label: 'Security & Audit', icon: Lock }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#bef264] text-slate-950 font-bold shadow-xs'
                  : 'text-gray-400 hover:text-white hover:bg-[#1f1f1f]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB: PORTAL ADDRESSES & ROUTING */}
      {activeTab === 'portal-addresses' && <PortalAddressesTab />}

      {/* TAB: FEATURES & FUNCTIONALITY */}
      {activeTab === 'features' && <FeaturesSettingsTab />}

      {/* TAB: DYNAMIC ROLES & ACCESS CONTROL */}
      {activeTab === 'access-control' && <RolesAccessControlTab />}

      {/* TAB: OPERATIONAL RULES & CALCULATIONS */}
      {activeTab === 'rules' && <OperationalRulesTab />}

      {/* TAB: DEDICATED SYSTEM EMAIL & AUTOMATED ALERTS */}
      {activeTab === 'system-email' && <SystemEmailSettingsTab isLight={false} />}

      {/* TAB 1: USERS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141414] p-4 rounded-xl border border-[#262626]">
            <div>
              <h3 className="text-sm font-bold text-white">System Users &amp; Team Members</h3>
              <p className="text-xs text-gray-400">
                Authorized staff accounts with access to My Solar CRM, VoIP communications, and CRM pipelines
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingUserId(null);
                setNewUserName('');
                setNewUserEmail('');
                setNewUserPhone('');
                setNewUserVoip('');
                setNewUserRole('employee');
                setNewUserDept('Sales');
                setIsAddUserModalOpen(true);
              }}
              className="px-4 py-2 bg-[#bef264] hover:bg-[#a3e635] text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add New User</span>
            </button>
          </div>

          {/* Users Table */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181818] border-b border-[#262626] text-gray-400 font-semibold">
                  <tr>
                    <th className="p-3.5">User</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Password &amp; Access</th>
                    <th className="p-3.5">Contact Details</th>
                    <th className="p-3.5">VoIP Line (AU)</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#202020]">
                  {systemUsers.map(user => {
                    const isSelf = user.id === currentUser.id;
                    const initials = user.name
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <tr key={user.id} className="hover:bg-[#181818] transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-lime-400 to-emerald-500 text-slate-950 font-bold flex items-center justify-center text-xs">
                              {initials}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white">{user.name}</span>
                                {isSelf && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#bef2641a] text-[#bef264] border border-[#bef26433] font-bold">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-gray-400 text-[11px] block">{user.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          {(() => {
                            const roleConfig = dynamicRoles.find(
                              r => r.role === user.role || r.id === user.role
                            );
                            const badgeClass =
                              roleConfig?.badgeColor ||
                              (user.role === 'admin'
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                : user.role === 'manager'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                : 'bg-lime-500/10 text-lime-400 border-lime-500/30');
                            return (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border ${badgeClass}`}
                              >
                                {roleConfig?.roleName || user.role}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-3.5 text-gray-300">{user.department || 'Operations'}</td>
                        <td className="p-3.5">
                          {user.isPasswordSet ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              <KeyRound className="w-3 h-3" />
                              <span>Pending Invite</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-gray-300">{user.phone || '+61 412 889 012'}</td>
                        <td className="p-3.5 font-mono text-emerald-400">{user.voipLineNumber || '+61 2 8311 4920'}</td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setInviteModalUser(user);
                                setIsInviteModalOpen(true);
                              }}
                              className="px-2 py-1 rounded-md bg-[#bef264]/10 hover:bg-[#bef264]/20 text-[#bef264] border border-[#bef264]/30 text-[11px] font-bold flex items-center gap-1 transition-colors"
                              title="Send onboarding invite or manage user password"
                            >
                              <Mail className="w-3 h-3" />
                              <span>Invite Link</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditClick(user)}
                              className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-[#262626] transition-colors"
                              title="Edit user"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(user)}
                                className="p-1.5 rounded-md text-gray-400 hover:text-rose-400 hover:bg-[#262626] transition-colors"
                                title="Delete user"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DROPDOWNS & HARDWARE */}
      {activeTab === 'dropdowns' && (
        <div className="space-y-6">
          {/* Excel Multi-Category Batch Engine Card */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="p-2.5 rounded-xl bg-[#bef264]/15 text-[#bef264] border border-[#bef264]/25">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white">Excel Multi-Category Batch Engine</h3>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#bef264]/20 text-[#bef264] border border-[#bef264]/30">
                      Single File Add, Update &amp; Delete
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Download all existing dropdown lists into one consolidated Excel workbook (.xlsx), or import an Excel file to bulk add, update, and delete options across multiple categories at once.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-gray-400">
                <span className="text-white font-semibold">{safeConfigs.length} Total Categories</span>
                <span>•</span>
                <span className="text-[#bef264] font-semibold">
                  {safeConfigs.reduce((acc, c) => acc + c.options.length, 0)} Total Active Options
                </span>
                <span>•</span>
                <span className="text-blue-400">Multi-Sheet &amp; Consolidated Support</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setExcelSyncInitialTab('guide');
                  setIsExcelSyncModalOpen(true);
                }}
                className="px-3 py-2 rounded-lg bg-[#1c1c1c] hover:bg-[#252525] border border-[#2e2e2e] text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="View Excel column specifications & examples"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                <span>Format Guide</span>
              </button>

              <button
                type="button"
                onClick={() => exportDropdownTemplate()}
                className="px-3 py-2 rounded-lg bg-[#1c1c1c] hover:bg-[#252525] border border-[#2e2e2e] text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Download starter Excel template with sample rows"
              >
                <FileDown className="w-3.5 h-3.5 text-[#bef264]" />
                <span>Blank Template</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  exportDropdownsToExcel(safeConfigs);
                  setFeedback('Downloaded full dropdowns & hardware list (.xlsx)!');
                  setTimeout(() => setFeedback(null), 3500);
                }}
                className="px-3.5 py-2 rounded-lg bg-[#222] hover:bg-[#2a2a2a] border border-[#383838] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                title="Download all active dropdown categories in one Excel file"
              >
                <Download className="w-3.5 h-3.5 text-[#bef264]" />
                <span>Export Existing List (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setExcelSyncInitialTab('import');
                  setIsExcelSyncModalOpen(true);
                }}
                className="px-4 py-2 rounded-lg bg-[#bef264] hover:bg-[#a3e635] text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Single Excel File</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left: Category Selector */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <ListFilter className="w-3.5 h-3.5 text-[#bef264]" />
                  <span>Dropdown Categories</span>
                </h3>
                <span className="text-[10px] font-mono text-gray-500">
                  {safeConfigs.length} lists
                </span>
              </div>

              {/* Filter Categories Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Filter categories..."
                  value={categorySearchQuery}
                  onChange={e => setCategorySearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-[#181818] border border-[#2b2b2b] rounded-lg text-xs text-white placeholder-gray-500 outline-none focus:border-[#bef264]"
                />
              </div>

              <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
                {safeConfigs
                  .filter(cat => {
                    if (!categorySearchQuery.trim()) return true;
                    const q = categorySearchQuery.toLowerCase();
                    return cat.label.toLowerCase().includes(q) || cat.key.toLowerCase().includes(q);
                  })
                  .map(cat => {
                    const isSelected = cat.key === selectedCategoryKey;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => {
                          setSelectedCategoryKey(cat.key);
                          setEditingOption(null);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-[#bef2641a] text-[#bef264] border border-[#bef26433] shadow-xs'
                            : 'text-gray-400 hover:text-white hover:bg-[#181818]'
                        }`}
                      >
                        <span className="truncate mr-2">{cat.label}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#202020] text-gray-300 font-mono shrink-0">
                          {cat.options.length}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Right: Active Options & Add Input */}
            <div className="md:col-span-2 bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#202020] gap-2">
                <div>
                  <h3 className="font-bold text-sm text-white">{activeCategory?.label}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <span>{activeCategory?.options.length} active value{activeCategory?.options.length === 1 ? '' : 's'} available in ERP forms</span>
                    <span>•</span>
                    <span className="font-mono text-[10px] text-gray-500">Key: {activeCategory?.key}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      exportDropdownsToExcel([activeCategory], `${activeCategory.key}_dropdown_export.xlsx`);
                      setFeedback(`Exported "${activeCategory.label}" to Excel!`);
                      setTimeout(() => setFeedback(null), 3000);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-[#1f1f1f] hover:bg-[#282828] border border-[#303030] text-gray-300 hover:text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                    title="Export only this category to Excel"
                  >
                    <Download className="w-3 h-3 text-[#bef264]" />
                    <span>Export Category (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Add Option Form */}
              <form onSubmit={handleAddOption} className="flex gap-2">
                <input
                  type="text"
                  value={newOptionValue}
                  onChange={e => setNewOptionValue(e.target.value)}
                  placeholder={`Add new option to ${activeCategory?.label}...`}
                  className="flex-1 bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#bef264] hover:bg-[#a3e635] text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Option</span>
                </button>
              </form>

              {/* List of Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                {activeCategory?.options.length === 0 ? (
                  <div className="col-span-2 py-8 text-center text-gray-500 text-xs">
                    No options in this category yet. Add one above or import via Excel.
                  </div>
                ) : (
                  activeCategory?.options.map(option => {
                    const isEditing = editingOption?.original === option;

                    return (
                      <div
                        key={option}
                        className={`flex items-center justify-between p-2.5 rounded-lg bg-[#181818] border transition-all ${
                          isEditing ? 'border-[#bef264] bg-[#1a1f14]' : 'border-[#262626] group hover:border-[#383838]'
                        }`}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <input
                              type="text"
                              value={editingOption.current}
                              onChange={e => setEditingOption({ ...editingOption, current: e.target.value })}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveEditedOption(option, editingOption.current);
                                } else if (e.key === 'Escape') {
                                  setEditingOption(null);
                                }
                              }}
                              autoFocus
                              className="flex-1 bg-[#121212] border border-[#2f3f1e] text-xs text-white px-2 py-1 rounded outline-none focus:border-[#bef264]"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditedOption(option, editingOption.current)}
                              className="p-1 rounded bg-[#bef264] text-black hover:bg-[#a3e635]"
                              title="Save change"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingOption(null)}
                              className="p-1 rounded bg-[#262626] text-gray-400 hover:text-white"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-xs text-gray-200 truncate pr-2 font-medium">{option}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => setEditingOption({ original: option, current: option })}
                                className="text-gray-500 hover:text-blue-400 p-1 rounded hover:bg-[#262626] transition-colors"
                                title="Edit / Rename option"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(option)}
                                className="text-gray-500 hover:text-rose-400 p-1 rounded hover:bg-[#262626] transition-colors"
                                title="Delete option"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CONNECTED DOMAINS */}
      {activeTab === 'domains' && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-[#141414] p-4 rounded-xl border border-[#262626]">
            <h3 className="text-sm font-bold text-white">Authorized Corporate Domains</h3>
            <p className="text-xs text-gray-400">
              Email domains permitted to register and receive automated notification dispatches
            </p>
          </div>

          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-4">
            <form onSubmit={handleAddDomain} className="flex gap-2">
              <input
                type="text"
                value={newDomainInput}
                onChange={e => setNewDomainInput(e.target.value)}
                placeholder="e.g. yourcompany.com.au"
                className="flex-1 bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#bef264] hover:bg-[#a3e635] text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Domain</span>
              </button>
            </form>

            <div className="space-y-2">
              {connectedDomains.map(dom => (
                <div
                  key={dom}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#181818] border border-[#262626]"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-mono text-white">{dom}</span>
                  </div>
                  {connectedDomains.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeConnectedDomain(dom)}
                      className="text-gray-500 hover:text-rose-400 transition-colors p-1"
                      title="Remove domain"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SECURITY & AUDIT */}
      {activeTab === 'security' && (
        <div className="space-y-4 max-w-3xl">
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Security &amp; Session Configuration</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#181818] border border-[#262626]">
                <div>
                  <span className="text-xs font-bold text-white block">Two-Factor Authentication (2FA)</span>
                  <span className="text-[11px] text-gray-400">Enforce SMS or authenticator code on login</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  Enforced
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#181818] border border-[#262626]">
                <div>
                  <span className="text-xs font-bold text-white block">Session Timeout</span>
                  <span className="text-[11px] text-gray-400">Automatic logout after inactivity period</span>
                </div>
                <span className="text-xs text-gray-300 font-mono">8 Hours</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#181818] border border-[#262626]">
                <div>
                  <span className="text-xs font-bold text-white block">Data Localization</span>
                  <span className="text-[11px] text-gray-400">Cloud servers hosting client solar documents</span>
                </div>
                <span className="text-xs text-white font-semibold">Sydney, Australia (ap-southeast-2)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: API KEYS & SECRETS */}
      {activeTab === 'api-keys' && <ApiKeysSettingsTab />}

      {/* ADD / EDIT USER MODAL */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#141414] border border-[#2d2d2d] rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <h3 className="font-bold text-sm text-white">
                {editingUserId ? 'Edit User Credentials' : 'Add New System User'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="e.g. Liam Davies"
                  className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white focus:border-[#bef264] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="e.g. liam@mysolarcrm.com.au"
                  className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white focus:border-[#bef264] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Role</label>
                  <select
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value as any)}
                    className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-2.5 py-2 text-xs text-white focus:border-[#bef264] outline-none capitalize"
                  >
                    {dynamicRoles.map(r => (
                      <option key={r.id} value={r.role}>
                        {r.roleName} ({r.portalTarget === 'customer_portal' ? 'Customer Portal' : r.portalTarget === 'installer_portal' ? 'Installer Portal' : 'ERP'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Department</label>
                  <select
                    value={newUserDept}
                    onChange={e => setNewUserDept(e.target.value)}
                    className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-2.5 py-2 text-xs text-white focus:border-[#bef264] outline-none"
                  >
                    <option value="Sales">Sales</option>
                    <option value="Operations">Operations</option>
                    <option value="Management">Management</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Customer Support">Customer Support</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Mobile Phone</label>
                  <input
                    type="text"
                    value={newUserPhone}
                    onChange={e => setNewUserPhone(e.target.value)}
                    placeholder="+61 4XX XXX XXX"
                    className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white focus:border-[#bef264] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">VoIP Line Number</label>
                  <input
                    type="text"
                    value={newUserVoip}
                    onChange={e => setNewUserVoip(e.target.value)}
                    placeholder="+61 2 XXXX XXXX"
                    className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white focus:border-[#bef264] outline-none font-mono"
                  />
                </div>
              </div>

              {!editingUserId && (
                <div className="p-3 bg-[#181818] border border-[#2a2a2a] rounded-xl text-xs text-gray-400 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#bef264] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">Automated Onboarding &amp; Password Link</span>
                    <span className="text-[11px]">
                      Upon creation, an invitation link is generated immediately so the team member can set their password. You can copy or dispatch it via Email or SMS.
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#bef264] hover:bg-[#a3e635] text-slate-950 text-xs font-bold rounded-lg transition-colors"
                >
                  {editingUserId ? 'Save Changes' : 'Create User & Generate Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Invitation & Password Setup Modal */}
      <UserInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => {
          setIsInviteModalOpen(false);
          setInviteModalUser(null);
        }}
        user={inviteModalUser}
      />

      {/* Excel Multi-Category Dropdowns Batch Sync Modal */}
      <DropdownExcelSyncModal
        isOpen={isExcelSyncModalOpen}
        onClose={() => setIsExcelSyncModalOpen(false)}
        dropdownConfigs={safeConfigs}
        onApplyImport={(summary, mode) => {
          const res = batchImportDropdowns(summary, mode);
          setFeedback(`Applied ${res.addedCount} additions, ${res.updatedCount} updates, ${res.deletedCount} deletions across ${res.categoriesModified} categories.`);
          setTimeout(() => setFeedback(null), 4000);
          return res;
        }}
        initialTab={excelSyncInitialTab}
      />
    </div>
  );
};
