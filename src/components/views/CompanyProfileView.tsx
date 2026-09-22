import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Building2,
  Save,
  RotateCcw,
  CheckCircle2,
  Image,
  Sun,
  Shield,
  Zap,
  Leaf,
  Grid,
  Palette,
  Eye,
  Mail,
  Phone,
  Globe,
  MapPin,
  Lock,
  Upload,
  Layout,
  LogIn,
  Sparkles,
  Check
} from 'lucide-react';
import { CompanyLogo } from '../common/CompanyLogo';
import { CompanyProfile } from '../../types';

export const CompanyProfileView: React.FC = () => {
  const { companyProfile, updateCompanyProfile, resetCompanyProfile, themeMode } = useApp();
  const isLight = themeMode === 'corporate-slate';

  const [formData, setFormData] = useState<CompanyProfile>(() => ({
    ...companyProfile,
    headerLogoUrl: companyProfile.headerLogoUrl !== undefined ? companyProfile.headerLogoUrl : (companyProfile.logoUrl || ''),
    loginLogoUrl: companyProfile.loginLogoUrl !== undefined ? companyProfile.loginLogoUrl : (companyProfile.logoUrl || ''),
    headerLogoPreset: companyProfile.headerLogoPreset || companyProfile.logoPreset || 'sun',
    loginLogoPreset: companyProfile.loginLogoPreset || companyProfile.logoPreset || 'sun'
  }));

  const [feedback, setFeedback] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'login' | 'header'>('login');
  const [previewPortalType, setPreviewPortalType] = useState<'customer' | 'installer' | 'staff'>('customer');
  const [isDraggingHeader, setIsDraggingHeader] = useState(false);
  const [isDraggingLogin, setIsDraggingLogin] = useState(false);

  const handleInputChange = (field: keyof CompanyProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (field: 'headerLogoUrl' | 'loginLogoUrl') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          handleInputChange(field, reader.result);
          if (field === 'headerLogoUrl') {
            handleInputChange('logoUrl', reader.result);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileDrop = (field: 'headerLogoUrl' | 'loginLogoUrl') => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (field === 'headerLogoUrl') setIsDraggingHeader(false);
    else setIsDraggingLogin(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          handleInputChange(field, reader.result);
          if (field === 'headerLogoUrl') {
            handleInputChange('logoUrl', reader.result);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyProfile({
      ...formData,
      logoUrl: formData.headerLogoUrl || formData.logoUrl || ''
    });
    setFeedback('Company branding saved! Header and Login page logos successfully updated across all portals.');
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleReset = () => {
    if (window.confirm('Reset company profile and branding back to default settings?')) {
      resetCompanyProfile();
      setFormData({
        companyName: 'My Solar CRM',
        legalName: 'My Solar CRM Australia Pty Ltd',
        abn: '52 619 840 231',
        acn: '619 840 231',
        logoUrl: '',
        headerLogoUrl: '',
        loginLogoUrl: '',
        logoPreset: 'sun',
        headerLogoPreset: 'sun',
        loginLogoPreset: 'sun',
        primaryColor: '#bef264',
        accentColor: '#38bdf8',
        tagline: "Australia's Premier Solar & Battery Energy Management CRM",
        email: 'operations@mysolarcrm.com.au',
        phone: '1300 852 400',
        website: 'https://mysolarcrm.com.au',
        address: 'Level 14, 100 Pacific Highway, North Sydney NSW 2060',
        cecRetailerNumber: 'CEC-RET-94281',
        portalWelcomeText: 'Welcome to the My Solar Customer Portal. Track your solar installation, view your signed contract, and monitor savings.',
        portalBannerUrl: ''
      });
      setFeedback('Reset to default branding.');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const colorPresets = [
    { label: 'Lime Glow (Default)', hex: '#bef264' },
    { label: 'Solar Amber', hex: '#f59e0b' },
    { label: 'Clean Emerald', hex: '#10b981' },
    { label: 'Electric Cyan', hex: '#06b6d4' },
    { label: 'Deep Sky Blue', hex: '#38bdf8' }
  ];

  return (
    <div className="flex-1 bg-[#0a0a0a] overflow-y-auto p-4 sm:p-6 space-y-6 text-[#e5e7eb]">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262626] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Company Profile &amp; Branding</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#bef2641a] text-[#bef264] border border-[#bef26433]">
              Global Branding Engine
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Configure your enterprise name, company logo, CEC credentials, and login portal branding applied across all user accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 rounded-lg bg-[#1e1e1e] hover:bg-[#262626] text-gray-400 hover:text-white text-xs font-semibold border border-[#2d2d2d] transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Apply &amp; Save Branding</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Main 2-Column Layout: Left Form & Right Live Portal Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: 7 Columns */}
        <div className="lg:col-span-7 space-y-6">
          {/* Identity & Legal Info Card */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#262626]">
              <Building2 className="w-4 h-4 text-[#bef264]" />
              <h3 className="font-bold text-sm text-white">Company Information</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">CRM Trade Name</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={e => handleInputChange('companyName', e.target.value)}
                  placeholder="e.g. My Solar CRM"
                  className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none"
                  required
                />
                <span className="text-[10px] text-gray-500 mt-1 block">Displayed in top navigation &amp; login headers</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Legal Registered Name</label>
                <input
                  type="text"
                  value={formData.legalName}
                  onChange={e => handleInputChange('legalName', e.target.value)}
                  placeholder="e.g. My Solar CRM Australia Pty Ltd"
                  className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Australian Business Number (ABN)</label>
                <input
                  type="text"
                  value={formData.abn}
                  onChange={e => handleInputChange('abn', e.target.value)}
                  placeholder="e.g. 52 619 840 231"
                  className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Clean Energy Council (CEC) Retailer #</label>
                <input
                  type="text"
                  value={formData.cecRetailerNumber}
                  onChange={e => handleInputChange('cecRetailerNumber', e.target.value)}
                  placeholder="e.g. CEC-RET-94281"
                  className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Brand Tagline / Slogan</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={e => handleInputChange('tagline', e.target.value)}
                placeholder="e.g. Australia's Premier Solar & Battery Energy Management CRM"
                className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none"
              />
            </div>
          </div>

          {/* Option 1: Header Section Logo (Post-Login) */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#262626]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Layout className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">1. Header Section Logo</h3>
                  <p className="text-[11px] text-gray-400">Post-Login Navigation Header Bar</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 self-start sm:self-center">
                Top Navbar &amp; Dashboards
              </span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              This logo is displayed in the main top header navigation across all CRM workspaces, project boards, and dashboard views once staff or clients have logged in.
            </p>

            {/* Drag & Drop / Click Upload for Header Logo */}
            <div
              onDragOver={e => {
                e.preventDefault();
                setIsDraggingHeader(true);
              }}
              onDragLeave={() => setIsDraggingHeader(false)}
              onDrop={handleFileDrop('headerLogoUrl')}
              className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                isDraggingHeader
                  ? 'border-amber-400 bg-amber-400/10'
                  : 'border-[#2d2d2d] bg-[#181818]/60 hover:bg-[#1c1c1c] hover:border-[#3d3d3d]'
              }`}
            >
              <input
                type="file"
                id="header-logo-file"
                accept="image/*"
                onChange={handleFileUpload('headerLogoUrl')}
                className="hidden"
              />
              <label htmlFor="header-logo-file" className="cursor-pointer flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-[#202020] flex items-center justify-center text-amber-400 border border-[#2f2f2f]">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-white hover:text-amber-400 transition-colors">
                    Click to upload Header Logo
                  </span>
                  <span className="text-gray-400 text-xs block mt-0.5">or drag and drop image file here</span>
                </div>
                <span className="text-[10px] text-gray-500">
                  Recommended: Transparent PNG, SVG, or WebP &bull; Optimal height: 32px – 48px
                </span>
              </label>
            </div>

            {/* Direct URL Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300">
                Or Paste Direct Header Logo Image URL
              </label>
              <input
                type="text"
                value={formData.headerLogoUrl || ''}
                onChange={e => {
                  handleInputChange('headerLogoUrl', e.target.value);
                  handleInputChange('logoUrl', e.target.value);
                }}
                placeholder="https://mysolarcrm.com.au/assets/header-logo.png"
                className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-amber-400 outline-none"
              />
            </div>

            {/* Active Header Logo Status */}
            {formData.headerLogoUrl ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#181818] border border-amber-500/30">
                <div className="w-12 h-12 rounded-lg bg-black/40 border border-[#2d2d2d] flex items-center justify-center overflow-hidden shrink-0 p-1">
                  <img
                    src={formData.headerLogoUrl}
                    alt="Header Logo Preview"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 min-w-0 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Custom Header Logo Active</span>
                  </div>
                  <span className="text-gray-400 text-[10px] truncate block mt-0.5 max-w-sm">
                    {formData.headerLogoUrl.startsWith('data:') ? 'Base64 Encoded Image' : formData.headerLogoUrl}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleInputChange('headerLogoUrl', '');
                    handleInputChange('logoUrl', '');
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 hover:underline px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20 shrink-0"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="pt-2 border-t border-[#202020] space-y-2">
                <label className="block text-xs font-semibold text-gray-300">
                  Header Logo Preset (Fallback Icon)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { key: 'sun', label: 'Solar Sun', icon: Sun },
                    { key: 'solar-panel', label: 'Solar Grid', icon: Grid },
                    { key: 'energy', label: 'Clean Power', icon: Zap },
                    { key: 'leaf', label: 'Eco Green', icon: Leaf },
                    { key: 'modern', label: 'Shield Pro', icon: Shield }
                  ].map(item => {
                    const Icon = item.icon;
                    const isSelected = !formData.headerLogoUrl && (formData.headerLogoPreset || 'sun') === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          handleInputChange('headerLogoPreset', item.key);
                          handleInputChange('logoPreset', item.key);
                        }}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 text-amber-400 font-bold shadow-xs'
                            : 'bg-[#181818] border-[#262626] text-gray-400 hover:text-white hover:bg-[#202020]'
                        }`}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-black"
                          style={{ backgroundColor: formData.primaryColor || '#bef264' }}
                        >
                          <Icon className="w-3.5 h-3.5 font-bold" />
                        </div>
                        <span className="text-[11px] truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Option 2: Login Page Logo (Pre-Login & Portals) */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#262626]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <LogIn className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">2. Login Page Logo</h3>
                  <p className="text-[11px] text-gray-400">Customer &amp; Installer Portal Login Screens</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 self-start sm:self-center">
                Authentication Screens
              </span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              This logo is displayed prominently at the center-top of the Customer Portal login, Subcontractor Installer login, and Staff sign-in authentication screens before logging in.
            </p>

            {/* Drag & Drop / Click Upload for Login Page Logo */}
            <div
              onDragOver={e => {
                e.preventDefault();
                setIsDraggingLogin(true);
              }}
              onDragLeave={() => setIsDraggingLogin(false)}
              onDrop={handleFileDrop('loginLogoUrl')}
              className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                isDraggingLogin
                  ? 'border-emerald-400 bg-emerald-400/10'
                  : 'border-[#2d2d2d] bg-[#181818]/60 hover:bg-[#1c1c1c] hover:border-[#3d3d3d]'
              }`}
            >
              <input
                type="file"
                id="login-logo-file"
                accept="image/*"
                onChange={handleFileUpload('loginLogoUrl')}
                className="hidden"
              />
              <label htmlFor="login-logo-file" className="cursor-pointer flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-[#202020] flex items-center justify-center text-emerald-400 border border-[#2f2f2f]">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-white hover:text-emerald-400 transition-colors">
                    Click to upload Login Page Logo
                  </span>
                  <span className="text-gray-400 text-xs block mt-0.5">or drag and drop image file here</span>
                </div>
                <span className="text-[10px] text-gray-500">
                  Recommended: High-res square emblem or corporate badge &bull; Optimal size: 120px &times; 120px or larger
                </span>
              </label>
            </div>

            {/* Direct URL Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300">
                Or Paste Direct Login Page Logo Image URL
              </label>
              <input
                type="text"
                value={formData.loginLogoUrl || ''}
                onChange={e => handleInputChange('loginLogoUrl', e.target.value)}
                placeholder="https://mysolarcrm.com.au/assets/login-portal-emblem.png"
                className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-emerald-400 outline-none"
              />
            </div>

            {/* Active Login Page Logo Status */}
            {formData.loginLogoUrl ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#181818] border border-emerald-500/30">
                <div className="h-14 min-w-[56px] max-w-[130px] rounded-lg bg-black/40 border border-[#2d2d2d] flex items-center justify-center shrink-0 p-1.5">
                  <img
                    src={formData.loginLogoUrl}
                    alt="Login Page Logo Preview"
                    className="max-h-full max-w-full w-auto h-auto object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 min-w-0 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Custom Login Page Logo Active (Free Ratio)</span>
                  </div>
                  <span className="text-gray-400 text-[10px] truncate block mt-0.5 max-w-sm">
                    {formData.loginLogoUrl.startsWith('data:') ? 'Base64 Encoded Image' : formData.loginLogoUrl}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleInputChange('loginLogoUrl', '')}
                  className="text-xs text-rose-400 hover:text-rose-300 hover:underline px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20 shrink-0"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="pt-2 border-t border-[#202020] space-y-2">
                <label className="block text-xs font-semibold text-gray-300">
                  Login Page Logo Preset (Fallback Icon)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { key: 'sun', label: 'Solar Sun', icon: Sun },
                    { key: 'solar-panel', label: 'Solar Grid', icon: Grid },
                    { key: 'energy', label: 'Clean Power', icon: Zap },
                    { key: 'leaf', label: 'Eco Green', icon: Leaf },
                    { key: 'modern', label: 'Shield Pro', icon: Shield }
                  ].map(item => {
                    const Icon = item.icon;
                    const isSelected = !formData.loginLogoUrl && (formData.loginLogoPreset || 'sun') === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleInputChange('loginLogoPreset', item.key)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold shadow-xs'
                            : 'bg-[#181818] border-[#262626] text-gray-400 hover:text-white hover:bg-[#202020]'
                        }`}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-black"
                          style={{ backgroundColor: formData.primaryColor || '#bef264' }}
                        >
                          <Icon className="w-3.5 h-3.5 font-bold" />
                        </div>
                        <span className="text-[11px] truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Brand Accent Color Card */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#262626]">
              <Palette className="w-4 h-4 text-[#bef264]" />
              <h3 className="font-bold text-sm text-white">Brand Accent Color</h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">
                Primary Brand Theme Color (Applied to buttons, badges &amp; icons)
              </label>
              <div className="flex flex-wrap items-center gap-2.5 mb-2">
                {colorPresets.map(c => {
                  const isSelected = formData.primaryColor === c.hex;
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => handleInputChange('primaryColor', c.hex)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all shadow-xs ${
                        isSelected
                          ? 'border-2 font-bold ring-2 ring-offset-1 ring-offset-black/40'
                          : 'border-[#2d2d2d] text-gray-300 hover:text-white bg-[#181818] hover:bg-[#202020]'
                      }`}
                      style={
                        isSelected
                          ? {
                              borderColor: c.hex,
                              backgroundColor: isLight ? '#ffffff' : '#202020',
                              boxShadow: `0 0 0 2px ${c.hex}40`
                            }
                          : undefined
                      }
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-black/20"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span
                        className={`font-bold tracking-tight ${isSelected ? 'accent-selected-text' : ''}`}
                        style={{
                          color: isSelected
                            ? (isLight ? '#0f172a' : '#ffffff')
                            : undefined
                        }}
                      >
                        {c.label}
                      </span>
                      {isSelected && (
                        <Check
                          className="w-3.5 h-3.5 shrink-0"
                          style={{ color: c.hex }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                Active Accent:{' '}
                <span
                  className="font-bold px-2 py-0.5 rounded-md text-xs inline-block"
                  style={{
                    backgroundColor: isLight ? '#f1f5f9' : '#222222',
                    color: isLight ? '#0f172a' : '#ffffff',
                    border: `1px solid ${formData.primaryColor || '#bef264'}`
                  }}
                >
                  {colorPresets.find(c => c.hex === formData.primaryColor)?.label || 'Custom'} ({formData.primaryColor || '#bef264'})
                </span>
              </p>
            </div>
          </div>

          {/* Contact Details & Welcome Message */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#262626]">
              <Mail className="w-4 h-4 text-[#bef264]" />
              <h3 className="font-bold text-sm text-white">Contact &amp; Portal Welcome Message</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Company Contact Phone</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => handleInputChange('phone', e.target.value)}
                    className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Company Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => handleInputChange('email', e.target.value)}
                    className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Headquarters Address</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => handleInputChange('address', e.target.value)}
                    className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Website URL</label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={formData.website}
                    onChange={e => handleInputChange('website', e.target.value)}
                    className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Portal Login &amp; Handover Welcome Text</label>
              <textarea
                value={formData.portalWelcomeText}
                onChange={e => handleInputChange('portalWelcomeText', e.target.value)}
                rows={2}
                className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                Shown to homeowners and installers on their dedicated self-service dashboards
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: 5 Columns - Live Dual Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-5 sticky top-4 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#bef264]" />
                <h3 className="font-bold text-sm text-white">Live Branding Preview</h3>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                Real-Time Dual Sync
              </span>
            </div>

            {/* View Mode Toggle: Login Page Preview vs Header Section Preview */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#181818] border border-[#262626]">
              <button
                type="button"
                onClick={() => setPreviewTab('login')}
                className={`py-1.5 px-2 text-center text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  previewTab === 'login'
                    ? 'bg-emerald-500 text-black shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login Screen</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewTab('header')}
                className={`py-1.5 px-2 text-center text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  previewTab === 'header'
                    ? 'bg-amber-500 text-black shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Layout className="w-3.5 h-3.5" />
                <span>Header (Post-Login)</span>
              </button>
            </div>

            {previewTab === 'login' ? (
              <div className="space-y-3">
                {/* Portal Type Switcher */}
                <div className="flex rounded-lg bg-[#181818] p-1 border border-[#262626]">
                  {[
                    { key: 'customer', label: 'Customer Portal' },
                    { key: 'installer', label: 'Installer Portal' },
                    { key: 'staff', label: 'Staff Login' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setPreviewPortalType(tab.key as any)}
                      className={`flex-1 py-1 text-center text-xs font-semibold rounded-md transition-all ${
                        previewPortalType === tab.key
                          ? 'bg-[#282828] text-emerald-400 border border-emerald-500/30 font-bold'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Simulated Mobile/Tablet Device Frame with Login Page Logo - White Background & Solar Amber Border */}
                <div className="border border-slate-200/90 rounded-xl bg-white p-5 shadow-xl space-y-4 text-center text-slate-900">
                  <div className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                    <LogIn className="w-3 h-3 text-amber-600" />
                    <span>Login Page Preview (Free Ratio)</span>
                  </div>

                  {/* Brand Logo & Subtitle */}
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <CompanyLogo profile={formData} size="lg" variant="login" />
                    <div>
                      <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-0.5">
                        {previewPortalType === 'customer'
                          ? 'Homeowner Solar & Battery Customer Portal'
                          : previewPortalType === 'installer'
                          ? 'CEC Certified Subcontractor Installer Portal'
                          : 'Enterprise CRM & ERP Staff Authentication'}
                      </p>
                    </div>
                  </div>

                  {/* Simulated Login Box - Solar Amber Border */}
                  <div className="bg-white border-2 border-amber-500 rounded-xl p-4 space-y-3 text-left shadow-lg shadow-amber-500/10">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider">
                        {previewPortalType === 'customer'
                          ? 'Customer Email or Phone'
                          : previewPortalType === 'installer'
                          ? 'CEC Accreditation ID or Email'
                          : 'Staff Work Email (@' + (companyProfile.companyName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'mysolarcrm') + '.com.au)'}
                      </label>
                      <input
                        type="text"
                        disabled
                        placeholder={
                          previewPortalType === 'customer'
                            ? 'sarah.jenkins@gmail.com'
                            : previewPortalType === 'installer'
                            ? 'apex.solar@gmail.com'
                            : `admin@${(companyProfile.companyName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'mysolarcrm')}.com.au`
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider">
                        One-Time SMS Passcode / Password
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                        <input
                          type="password"
                          disabled
                          value="••••••••"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-800 outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled
                      className="w-full py-2 rounded-lg text-slate-950 text-xs font-bold shadow-xs bg-amber-500 hover:bg-amber-400 transition-colors"
                      style={formData.primaryColor ? { backgroundColor: formData.primaryColor } : undefined}
                    >
                      Sign In to Portal
                    </button>
                  </div>

                  {/* Welcome text & Footer Verification */}
                  <div className="space-y-1.5 text-[11px] text-slate-600">
                    <p className="italic text-slate-600">"{formData.portalWelcomeText}"</p>
                    <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 space-y-0.5">
                      <p>ABN: {formData.abn || '52 619 840 231'} &bull; CEC Approved Retailer: {formData.cecRetailerNumber || 'CEC-RET-94281'}</p>
                      <p>{formData.address}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Simulated Post-Login Header Bar with Header Logo */
              <div className="border border-[#2d2d2d] rounded-xl bg-[#0e0e0e] p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Layout className="w-3 h-3" />
                    <span>Using Header Section Logo</span>
                  </div>
                  <span className="text-[10px] text-gray-500">Post-Login View</span>
                </div>

                {/* Simulated Header Navbar Bar */}
                <div className="bg-[#141414] border border-[#2d2d2d] rounded-xl p-3.5 shadow-md flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CompanyLogo profile={formData} size="md" variant="header" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-white tracking-tight truncate">
                          {formData.companyName}
                        </span>
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                          AU Solar ERP
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 truncate">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="truncate">Grid Certified &bull; CER Sync</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-7 h-7 rounded-lg bg-[#202020] border border-[#333] flex items-center justify-center text-xs text-amber-400 font-bold">
                      AM
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[#161616] border border-[#262626] rounded-xl space-y-2 text-left text-xs">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Header Logo Placement Info</span>
                  </div>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    This logo appears continuously in the top navigation bar at all times when users are inside the CRM. It is optimized for horizontal or compact layouts (approx 32–48px high).
                  </p>
                  <div className="pt-2 border-t border-[#222] flex items-center justify-between text-[10px] text-gray-500">
                    <span>Status: {formData.headerLogoUrl ? 'Custom Image' : 'Preset Icon'}</span>
                    <span>Height: 32px standard</span>
                  </div>
                </div>
              </div>
            )}

            <p className="text-[11px] text-gray-500 text-center">
              Changes applied here dynamically update the Header, Sidebar, Customer Portal, and Installer views.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
