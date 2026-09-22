import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DynamicRoleConfig, DynamicRoleSpecialActions, FeaturePermission } from '../../types';
import {
  Shield,
  Plus,
  Copy,
  Trash2,
  Check,
  X,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Save,
  RotateCcw,
  Sparkles,
  Layers,
  KeyRound,
  Eye,
  PlusCircle,
  FileSpreadsheet,
  Download
} from 'lucide-react';

export const RolesAccessControlTab: React.FC = () => {
  const {
    dynamicRoles,
    addDynamicRole,
    updateDynamicRole,
    deleteDynamicRole,
    cloneDynamicRole,
    resetDynamicRoles,
    systemFeatures,
    activeRole
  } = useApp();

  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    dynamicRoles[0]?.id || 'admin'
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  // New Role Modal state
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleTarget, setNewRoleTarget] = useState<'erp' | 'customer' | 'installer'>('erp');
  const [newRoleBadgeColor, setNewRoleBadgeColor] = useState('bg-lime-500/10 text-lime-400 border-lime-500/30');

  // Edit Role Modal state
  const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDesc, setEditRoleDesc] = useState('');
  const [editRoleTarget, setEditRoleTarget] = useState<'erp' | 'customer' | 'installer'>('erp');
  const [editRoleBadgeColor, setEditRoleBadgeColor] = useState('');

  // Clone Modal state
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [cloneName, setCloneName] = useState('');

  const currentRole = dynamicRoles.find(r => r.id === selectedRoleId || r.role === selectedRoleId) || dynamicRoles[0];

  const BADGE_COLOR_PRESETS = [
    { label: 'Lime / Solar Accent', value: 'bg-lime-500/10 text-lime-400 border-lime-500/30' },
    { label: 'Purple / Executive', value: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
    { label: 'Blue / Operations', value: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    { label: 'Amber / Compliance', value: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    { label: 'Emerald / Field Crew', value: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    { label: 'Rose / Critical', value: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
    { label: 'Cyan / Tech Support', value: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' }
  ];

  // Helper to toggle a specific action for a feature on current role
  const handleToggleFeatureAction = (
    featureId: string,
    action: keyof FeaturePermission
  ) => {
    if (!currentRole) return;
    const currentPermissions = currentRole.permissions || {};
    const featPerm: FeaturePermission = currentPermissions[featureId] || {
      view: false,
      create: false,
      edit: false,
      delete: false,
      export: false
    };

    const updatedPerm: FeaturePermission = {
      ...featPerm,
      [action]: !featPerm[action]
    };

    // If granting create/edit/delete/export, automatically ensure view is enabled
    if (action !== 'view' && updatedPerm[action]) {
      updatedPerm.view = true;
    }

    // If revoking view, automatically revoke all actions
    if (action === 'view' && !updatedPerm.view) {
      updatedPerm.create = false;
      updatedPerm.edit = false;
      updatedPerm.delete = false;
      updatedPerm.export = false;
    }

    updateDynamicRole(currentRole.id, {
      permissions: {
        ...currentPermissions,
        [featureId]: updatedPerm
      }
    });

    setFeedback(`Updated ${action.toUpperCase()} permission for "${featureId}" in ${currentRole.roleName}.`);
    setTimeout(() => setFeedback(null), 2500);
  };

  // Helper to toggle special action
  const handleToggleSpecialAction = (actionKey: keyof DynamicRoleSpecialActions) => {
    if (!currentRole) return;
    const currentSpecial = currentRole.specialActions || {};
    const updatedSpecial: DynamicRoleSpecialActions = {
      ...currentSpecial,
      [actionKey]: !currentSpecial[actionKey]
    };

    updateDynamicRole(currentRole.id, {
      specialActions: updatedSpecial
    });

    setFeedback(`Updated special action "${actionKey}" for ${currentRole.roleName}.`);
    setTimeout(() => setFeedback(null), 2500);
  };

  // Bulk presets for the selected role
  const handleGrantAll = () => {
    if (!currentRole) return;
    const allPerms: Record<string, FeaturePermission> = {};
    systemFeatures.forEach(feat => {
      allPerms[feat.id] = { view: true, create: true, edit: true, delete: true, export: true };
    });

    const allSpecial: DynamicRoleSpecialActions = {
      canManageSettings: true,
      canManageUsers: true,
      canManageRoles: true,
      canUseVoip: true,
      canSendSms: true,
      canSyncMetaSheet: true,
      canApproveSTC: true,
      canAccessCustomerPortal: true,
      canAccessInstallerPortal: true
    };

    updateDynamicRole(currentRole.id, {
      permissions: allPerms,
      specialActions: allSpecial
    });
    setFeedback(`Granted FULL unrestricted access to ${currentRole.roleName}.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleReadOnlyAll = () => {
    if (!currentRole) return;
    const readPerms: Record<string, FeaturePermission> = {};
    systemFeatures.forEach(feat => {
      readPerms[feat.id] = { view: true, create: false, edit: false, delete: false, export: false };
    });

    const basicSpecial: DynamicRoleSpecialActions = {
      canManageSettings: false,
      canManageUsers: false,
      canManageRoles: false,
      canUseVoip: true,
      canSendSms: false,
      canSyncMetaSheet: false,
      canApproveSTC: false,
      canAccessCustomerPortal: currentRole.portalTarget === 'customer',
      canAccessInstallerPortal: currentRole.portalTarget === 'installer'
    };

    updateDynamicRole(currentRole.id, {
      permissions: readPerms,
      specialActions: basicSpecial
    });
    setFeedback(`Configured READ-ONLY access for ${currentRole.roleName}.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleRevokeAll = () => {
    if (!currentRole) return;
    const emptyPerms: Record<string, FeaturePermission> = {};
    systemFeatures.forEach(feat => {
      emptyPerms[feat.id] = { view: false, create: false, edit: false, delete: false, export: false };
    });

    const emptySpecial: DynamicRoleSpecialActions = {
      canManageSettings: false,
      canManageUsers: false,
      canManageRoles: false,
      canUseVoip: false,
      canSendSms: false,
      canSyncMetaSheet: false,
      canApproveSTC: false,
      canAccessCustomerPortal: false,
      canAccessInstallerPortal: false
    };

    updateDynamicRole(currentRole.id, {
      permissions: emptyPerms,
      specialActions: emptySpecial
    });
    setFeedback(`Revoked all permissions for ${currentRole.roleName}.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Create new custom role
  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    // Default permissions based on portal
    const defaultPerms: Record<string, FeaturePermission> = {};
    systemFeatures.forEach(feat => {
      defaultPerms[feat.id] = {
        view: newRoleTarget === 'erp',
        create: false,
        edit: false,
        delete: false,
        export: false
      };
    });

    const created = addDynamicRole({
      roleName: newRoleName.trim(),
      description: newRoleDesc.trim() || 'Custom organizational solar CRM role',
      badgeColor: newRoleBadgeColor,
      portalTarget: newRoleTarget,
      isSystem: false,
      permissions: defaultPerms,
      specialActions: {
        canManageSettings: false,
        canManageUsers: false,
        canManageRoles: false,
        canUseVoip: true,
        canSendSms: false,
        canSyncMetaSheet: false,
        canApproveSTC: false,
        canAccessCustomerPortal: newRoleTarget === 'customer',
        canAccessInstallerPortal: newRoleTarget === 'installer'
      }
    });

    setSelectedRoleId(created.id);
    setIsAddRoleModalOpen(false);
    setNewRoleName('');
    setNewRoleDesc('');
    setFeedback(`New custom role "${created.roleName}" created!`);
    setTimeout(() => setFeedback(null), 3500);
  };

  // Edit existing role details
  const handleOpenEditRole = () => {
    if (!currentRole) return;
    setEditRoleName(currentRole.roleName);
    setEditRoleDesc(currentRole.description);
    setEditRoleTarget(currentRole.portalTarget);
    setEditRoleBadgeColor(currentRole.badgeColor);
    setIsEditRoleModalOpen(true);
  };

  const handleSaveEditRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRole || !editRoleName.trim()) return;

    updateDynamicRole(currentRole.id, {
      roleName: editRoleName.trim(),
      description: editRoleDesc.trim(),
      portalTarget: editRoleTarget,
      badgeColor: editRoleBadgeColor
    });

    setIsEditRoleModalOpen(false);
    setFeedback(`Role details for "${editRoleName.trim()}" updated.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Clone role
  const handleCloneRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRole || !cloneName.trim()) return;

    const cloned = cloneDynamicRole(currentRole.id, cloneName.trim());
    setSelectedRoleId(cloned.id);
    setIsCloneModalOpen(false);
    setCloneName('');
    setFeedback(`Cloned "${currentRole.roleName}" to new role "${cloned.roleName}".`);
    setTimeout(() => setFeedback(null), 3500);
  };

  // Delete custom role
  const handleDeleteRole = () => {
    if (!currentRole) return;
    if (currentRole.isSystem || currentRole.id === 'admin') {
      alert('Default system administrator roles cannot be deleted.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete role "${currentRole.roleName}"?`)) {
      deleteDynamicRole(currentRole.id);
      setSelectedRoleId(dynamicRoles[0]?.id || 'admin');
      setFeedback(`Role "${currentRole.roleName}" deleted.`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleResetRoles = () => {
    if (window.confirm('Reset all roles and permission matrices back to factory defaults?')) {
      resetDynamicRoles();
      setSelectedRoleId('admin');
      setFeedback('All dynamic roles reset to factory default matrix.');
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="bg-[#141414] p-4 rounded-xl border border-[#262626] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#bef264]" />
            <h3 className="text-sm font-bold text-white">Dynamic Role &amp; Access Control Engine</h3>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Create custom roles, define granular View/Create/Edit/Delete/Export permissions per feature, and control special privileges
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddRoleModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Custom Role</span>
          </button>

          <button
            type="button"
            onClick={handleResetRoles}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e1e1e] hover:bg-[#262626] text-xs font-semibold text-gray-300 hover:text-white border border-[#2d2d2d] transition-all"
            title="Reset role permissions to system defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Matrix</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Role Selection Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {dynamicRoles.map(role => {
          const isSelected = (currentRole?.id === role.id || currentRole?.role === role.role);
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelectedRoleId(role.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border ${
                isSelected
                  ? 'bg-[#1e1e1e] border-[#bef264] text-white shadow-xs'
                  : 'bg-[#141414] border-[#262626] text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
              }`}
            >
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${role.badgeColor}`}>
                {role.roleName}
              </span>
              {role.isSystem && (
                <span className="text-[9px] text-gray-500 uppercase font-mono">System</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Role Management Bar */}
      {currentRole && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#202020]">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">{currentRole.roleName}</h4>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${currentRole.badgeColor}`}>
                  {currentRole.portalTarget === 'customer_portal'
                    ? 'Customer Portal'
                    : currentRole.portalTarget === 'installer_portal'
                    ? 'Installer Portal'
                    : 'Main ERP Portal'}
                </span>
                {currentRole.id === activeRole && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#bef2641a] text-[#bef264] border border-[#bef26433] font-bold">
                    Active View
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{currentRole.description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleOpenEditRole}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-[#1e1e1e] hover:bg-[#282828] text-gray-300 hover:text-white border border-[#2d2d2d] transition-all"
                title="Edit role name, description and badge"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Role</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCloneName(`${currentRole.roleName} (Copy)`);
                  setIsCloneModalOpen(true);
                }}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-[#1e1e1e] hover:bg-[#282828] text-gray-300 hover:text-white border border-[#2d2d2d] transition-all"
                title="Clone this role with all its permissions"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Clone</span>
              </button>

              {!currentRole.isSystem && currentRole.id !== 'admin' && (
                <button
                  type="button"
                  onClick={handleDeleteRole}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all"
                  title="Delete this custom role"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}

              <div className="h-5 w-px bg-[#262626] mx-1 hidden sm:block" />

              {/* Bulk Quick Actions */}
              <button
                type="button"
                onClick={handleGrantAll}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium transition-all"
              >
                Grant All
              </button>
              <button
                type="button"
                onClick={handleReadOnlyAll}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium transition-all"
              >
                Read Only
              </button>
              <button
                type="button"
                onClick={handleRevokeAll}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 font-medium transition-all"
              >
                Revoke All
              </button>
            </div>
          </div>

          {/* Granular Permission Matrix */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                Module Permission Matrix ({systemFeatures.length} Features)
              </h5>
              <span className="text-[11px] text-gray-400">
                Click any cell to toggle specific action permissions
              </span>
            </div>

            <div className="overflow-x-auto border border-[#202020] rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181818] text-gray-400 font-semibold border-b border-[#202020]">
                  <tr>
                    <th className="p-3">Feature / Module</th>
                    <th className="p-3 text-center w-20">View</th>
                    <th className="p-3 text-center w-20">Create</th>
                    <th className="p-3 text-center w-20">Edit</th>
                    <th className="p-3 text-center w-20">Delete</th>
                    <th className="p-3 text-center w-20">Export</th>
                    <th className="p-3 text-right">Access Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e1e]">
                  {systemFeatures.map(feat => {
                    const perms = currentRole.permissions?.[feat.id] || {
                      view: false,
                      create: false,
                      edit: false,
                      delete: false,
                      export: false
                    };

                    const hasAll = perms.view && perms.create && perms.edit && perms.delete && perms.export;
                    const hasNone = !perms.view && !perms.create && !perms.edit && !perms.delete && !perms.export;
                    const isReadOnly = perms.view && !perms.create && !perms.edit && !perms.delete && !perms.export;

                    return (
                      <tr key={feat.id} className="hover:bg-[#181818] transition-colors">
                        <td className="p-3">
                          <div className="font-semibold text-white">{feat.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{feat.id} &bull; {feat.category}</div>
                        </td>

                        {/* VIEW */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleFeatureAction(feat.id, 'view')}
                            className={`w-6 h-6 mx-auto rounded flex items-center justify-center transition-all ${
                              perms.view
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-[#1e1e1e] text-gray-600 border border-[#2d2d2d]'
                            }`}
                            title="Toggle View permission"
                          >
                            {perms.view ? <Check className="w-3.5 h-3.5" /> : <X className="w-3 h-3" />}
                          </button>
                        </td>

                        {/* CREATE */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleFeatureAction(feat.id, 'create')}
                            className={`w-6 h-6 mx-auto rounded flex items-center justify-center transition-all ${
                              perms.create
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                                : 'bg-[#1e1e1e] text-gray-600 border border-[#2d2d2d]'
                            }`}
                            title="Toggle Create permission"
                          >
                            {perms.create ? <Check className="w-3.5 h-3.5" /> : <X className="w-3 h-3" />}
                          </button>
                        </td>

                        {/* EDIT */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleFeatureAction(feat.id, 'edit')}
                            className={`w-6 h-6 mx-auto rounded flex items-center justify-center transition-all ${
                              perms.edit
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                : 'bg-[#1e1e1e] text-gray-600 border border-[#2d2d2d]'
                            }`}
                            title="Toggle Edit permission"
                          >
                            {perms.edit ? <Check className="w-3.5 h-3.5" /> : <X className="w-3 h-3" />}
                          </button>
                        </td>

                        {/* DELETE */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleFeatureAction(feat.id, 'delete')}
                            className={`w-6 h-6 mx-auto rounded flex items-center justify-center transition-all ${
                              perms.delete
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                : 'bg-[#1e1e1e] text-gray-600 border border-[#2d2d2d]'
                            }`}
                            title="Toggle Delete permission"
                          >
                            {perms.delete ? <Check className="w-3.5 h-3.5" /> : <X className="w-3 h-3" />}
                          </button>
                        </td>

                        {/* EXPORT */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleFeatureAction(feat.id, 'export')}
                            className={`w-6 h-6 mx-auto rounded flex items-center justify-center transition-all ${
                              perms.export
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                                : 'bg-[#1e1e1e] text-gray-600 border border-[#2d2d2d]'
                            }`}
                            title="Toggle Export CSV/PDF permission"
                          >
                            {perms.export ? <Check className="w-3.5 h-3.5" /> : <X className="w-3 h-3" />}
                          </button>
                        </td>

                        {/* STATUS LABEL */}
                        <td className="p-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              hasAll
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : isReadOnly
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                : hasNone
                                ? 'bg-gray-800 text-gray-500 border border-gray-700'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {hasAll
                              ? 'Full Access'
                              : isReadOnly
                              ? 'Read-Only'
                              : hasNone
                              ? 'Restricted'
                              : 'Custom Access'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Special System Privileges Matrix */}
          <div className="pt-4 border-t border-[#202020]">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Special Privileges &amp; Tool Capabilities
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                {
                  key: 'canManageSettings',
                  label: 'Manage Global Settings',
                  desc: 'Modify system-wide operational rules & brand assets'
                },
                {
                  key: 'canManageUsers',
                  label: 'Manage Staff Accounts',
                  desc: 'Create, edit and decommission internal system users'
                },
                {
                  key: 'canManageRoles',
                  label: 'Manage Access Control & Roles',
                  desc: 'Create dynamic roles and configure RBAC permission matrices'
                },
                {
                  key: 'canUseVoip',
                  label: 'VoIPLine Softphone Dialer',
                  desc: 'Place and receive live PSTN Australian calls via softphone'
                },
                {
                  key: 'canSendSms',
                  label: 'MessageMedia 2-Way SMS',
                  desc: 'Dispatch SMS notifications to leads and field installers'
                },
                {
                  key: 'canSyncMetaSheet',
                  label: 'Sync Meta Ads Leads',
                  desc: 'Trigger webhook sheet ingestion and automated CRM sync'
                },
                {
                  key: 'canApproveSTC',
                  label: 'Financials & STC Approvals',
                  desc: 'Sign off CER STC claims, supplier RFQs & P&L statements'
                },
                {
                  key: 'canAccessCustomerPortal',
                  label: 'Access Customer Portal',
                  desc: 'Allow switching to or viewing customer self-service dashboard'
                },
                {
                  key: 'canAccessInstallerPortal',
                  label: 'Access Installer Portal',
                  desc: 'Allow access to field contractor quotes and work orders'
                }
              ].map(action => {
                const isGranted = Boolean(
                  currentRole.specialActions?.[action.key as keyof DynamicRoleSpecialActions]
                );

                return (
                  <div
                    key={action.key}
                    onClick={() =>
                      handleToggleSpecialAction(action.key as keyof DynamicRoleSpecialActions)
                    }
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                      isGranted
                        ? 'bg-[#181818] border-[#bef26433] hover:border-[#bef264]'
                        : 'bg-[#121212] border-[#202020] opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        {action.label}
                      </span>
                      <span className="text-[11px] text-gray-400 block mt-0.5 leading-relaxed">
                        {action.desc}
                      </span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded shrink-0 flex items-center justify-center mt-0.5 transition-all ${
                        isGranted
                          ? 'bg-[#bef264] text-black'
                          : 'bg-[#202020] text-gray-600 border border-[#2d2d2d]'
                      }`}
                    >
                      {isGranted ? <Check className="w-3.5 h-3.5" /> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW ROLE MODAL */}
      {isAddRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-[#141414] border border-[#2d2d2d] rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#bef264]" />
                <h3 className="font-bold text-sm text-white">Create Custom Dynamic Role</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddRoleModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Role Title / Name
                </label>
                <input
                  type="text"
                  required
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  placeholder="e.g. Solar Design Specialist"
                  className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white focus:border-[#bef264] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Description &amp; Operational Scope
                </label>
                <textarea
                  rows={2}
                  value={newRoleDesc}
                  onChange={e => setNewRoleDesc(e.target.value)}
                  placeholder="e.g. Responsible for PV array layout, string sizing and shade analysis"
                  className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white focus:border-[#bef264] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Primary Portal Perspective
                </label>
                <select
                  value={newRoleTarget}
                  onChange={e => setNewRoleTarget(e.target.value as any)}
                  className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-2.5 py-2 text-xs text-white focus:border-[#bef264] outline-none"
                >
                  <option value="erp">Internal Enterprise ERP Portal</option>
                  <option value="customer">Customer Self-Service Portal</option>
                  <option value="installer">Subcontractor Installer Portal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Badge Color Style
                </label>
                <select
                  value={newRoleBadgeColor}
                  onChange={e => setNewRoleBadgeColor(e.target.value)}
                  className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-2.5 py-2 text-xs text-white focus:border-[#bef264] outline-none"
                >
                  {BADGE_COLOR_PRESETS.map(preset => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setIsAddRoleModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold rounded-lg transition-colors shadow-xs"
                >
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROLE MODAL */}
      {isEditRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-[#141414] border border-[#2d2d2d] rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <h3 className="font-bold text-sm text-white">Edit Role Details</h3>
              <button
                type="button"
                onClick={() => setIsEditRoleModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRole} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Role Name
                </label>
                <input
                  type="text"
                  required
                  value={editRoleName}
                  onChange={e => setEditRoleName(e.target.value)}
                  className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white focus:border-[#bef264] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editRoleDesc}
                  onChange={e => setEditRoleDesc(e.target.value)}
                  className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white focus:border-[#bef264] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Portal Perspective
                </label>
                <select
                  value={editRoleTarget}
                  onChange={e => setEditRoleTarget(e.target.value as any)}
                  className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-2.5 py-2 text-xs text-white focus:border-[#bef264] outline-none"
                >
                  <option value="erp">Internal Enterprise ERP Portal</option>
                  <option value="customer">Customer Self-Service Portal</option>
                  <option value="installer">Subcontractor Installer Portal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Badge Color Style
                </label>
                <select
                  value={editRoleBadgeColor}
                  onChange={e => setEditRoleBadgeColor(e.target.value)}
                  className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-2.5 py-2 text-xs text-white focus:border-[#bef264] outline-none"
                >
                  {BADGE_COLOR_PRESETS.map(preset => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setIsEditRoleModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold rounded-lg transition-colors shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLONE ROLE MODAL */}
      {isCloneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-[#141414] border border-[#2d2d2d] rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div className="flex items-center gap-2">
                <Copy className="w-4 h-4 text-[#bef264]" />
                <h3 className="font-bold text-sm text-white">Clone Dynamic Role</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCloneModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCloneRole} className="space-y-3">
              <p className="text-xs text-gray-400">
                This will duplicate all permission matrices and privileges from{' '}
                <strong className="text-white">{currentRole?.roleName}</strong> into a new role.
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  New Role Name
                </label>
                <input
                  type="text"
                  required
                  value={cloneName}
                  onChange={e => setCloneName(e.target.value)}
                  placeholder="e.g. Senior Operations Manager"
                  className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white focus:border-[#bef264] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setIsCloneModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold rounded-lg transition-colors shadow-xs"
                >
                  Clone Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
