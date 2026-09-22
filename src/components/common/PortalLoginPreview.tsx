import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CompanyLogo } from './CompanyLogo';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Phone,
  Sun,
  HardHat,
  Sparkles,
  CheckCircle2,
  Globe,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Smartphone,
  Award
} from 'lucide-react';
import { getPortalProductionUrl, getPortalPreviewUrl } from '../../utils/portalUrls';
import { PortalQRCodeModal } from './PortalQRCodeModal';

interface PortalLoginPreviewProps {
  portalType: 'customer' | 'installer';
  onLoginSuccess: () => void;
}

export const PortalLoginPreview: React.FC<PortalLoginPreviewProps> = ({
  portalType,
  onLoginSuccess
}) => {
  const { companyProfile, portalAddresses, setActiveRole } = useApp();
  const [copied, setCopied] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);

  const isCustomer = portalType === 'customer';
  const activeConfig = isCustomer ? portalAddresses.customerPortal : portalAddresses.installerPortal;
  const canonicalUrl = getPortalProductionUrl(activeConfig);

  const [email, setEmail] = useState(
    isCustomer ? 'matthew.b@outlook.com' : 'ops@sydneysolarinstalls.com.au'
  );
  const [password, setPassword] = useState('••••••••••••');
  const [cecNumber, setCecNumber] = useState('CEC-INS-83921');
  const [loginMethod, setLoginMethod] = useState<'password' | 'sms'>('password');
  const [smsOtpSent, setSmsOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onLoginSuccess();
    }, 400);
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(canonicalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleSendOtp = () => {
    setSmsOtpSent(true);
    setOtpCode('824190');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 bg-white text-slate-900 relative min-h-screen">
      {/* Top Floating Browser Address Bar */}
      <div className="w-full max-w-xl mb-5 bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 shadow-xs flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px] shrink-0 font-bold">
            <Lock className="w-3 h-3" />
            <span>SSL TLS 1.3</span>
          </div>
          <div className="min-w-0 font-mono text-xs text-slate-800 truncate flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            <span className="truncate">{canonicalUrl}/login</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCopyAddress}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-200 shadow-xs"
            title="Copy portal URL"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsQrOpen(true)}
            className="p-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors shadow-xs"
            title="Scan with phone"
          >
            <QrCode className="w-4 h-4 text-amber-600" />
          </button>

          {/* Switch to the other portal address */}
          <button
            type="button"
            onClick={() => setActiveRole(isCustomer ? 'installer' : 'customer')}
            className="px-2 py-1 text-[11px] text-slate-600 hover:text-amber-700 border border-slate-200 hover:border-amber-400 bg-white rounded-lg transition-colors"
            title={`Switch to ${isCustomer ? 'Installer' : 'Customer'} portal address`}
          >
            {isCustomer ? 'To Installer Portal' : 'To Customer Portal'}
          </button>
        </div>
      </div>

      {/* Main Login Card - White Background with Solar Amber Border */}
      <div className="w-full max-w-md bg-white border-2 border-amber-500 rounded-2xl shadow-xl shadow-amber-500/10 p-6 sm:p-8 space-y-5">
        {/* Company Dynamic Logo and Branding Header (Login page logo with free aspect ratio) */}
        <div className="flex flex-col items-center text-center space-y-2.5">
          <CompanyLogo profile={companyProfile} size="lg" variant="login" />

          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            {activeConfig.customSubtitle ||
              (isCustomer
                ? 'Track your solar installation, view contracts & monitor energy generation'
                : 'Field job packs, photo verification checklists, SWMS & quote submissions')}
          </p>

          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isCustomer
                ? 'bg-amber-50 text-amber-800 border border-amber-300'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
            }`}
          >
            {isCustomer ? <Sun className="w-3.5 h-3.5 text-amber-600" /> : <HardHat className="w-3.5 h-3.5 text-emerald-600" />}
            <span>{activeConfig.label}</span>
          </div>
        </div>

        {/* Login Method Tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setLoginMethod('password')}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
              loginMethod === 'password'
                ? 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => setLoginMethod('sms')}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
              loginMethod === 'sms'
                ? 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            AU Mobile SMS OTP
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {loginMethod === 'sms' ? 'Australian Mobile Number' : 'Authorized Email / Account'}
            </label>
            <div className="relative">
              {loginMethod === 'sms' ? (
                <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              ) : (
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              )}
              <input
                type={loginMethod === 'sms' ? 'tel' : 'email'}
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={loginMethod === 'sms' ? '+61 412 889 012' : 'user@domain.com'}
                className="w-full bg-white border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 outline-none font-mono transition-all placeholder-slate-400"
              />
            </div>
          </div>

          {/* Installer Specific CEC Accreditation Check */}
          {!isCustomer && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  CEC Accreditation Number
                </label>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 font-semibold">
                  <Award className="w-3 h-3 text-emerald-600" />
                  <span>CEC Verified</span>
                </span>
              </div>
              <input
                type="text"
                required
                value={cecNumber}
                onChange={e => setCecNumber(e.target.value)}
                placeholder="e.g. CEC-INS-83921"
                className="w-full bg-white border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none font-mono transition-all placeholder-slate-400"
              />
            </div>
          )}

          {/* Password vs SMS OTP view */}
          {loginMethod === 'password' ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Security Password
                </label>
                <button
                  type="button"
                  onClick={() => setLoginMethod('sms')}
                  className="text-[11px] text-amber-600 hover:text-amber-700 hover:underline font-semibold"
                >
                  Use SMS Code Instead
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 outline-none transition-all placeholder-slate-400"
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  6-Digit SMS Verification Code
                </label>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="text-[11px] text-amber-600 hover:text-amber-700 hover:underline font-semibold"
                >
                  {smsOtpSent ? 'Resend Code' : 'Send Code'}
                </button>
              </div>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
                placeholder="824190"
                className="w-full bg-white border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono tracking-widest text-center outline-none transition-all placeholder-slate-400"
              />
              {smsOtpSent && (
                <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Test OTP generated: 824190 (auto-filled)</span>
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 text-slate-950 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md bg-amber-500 hover:bg-amber-400 active:scale-[0.99]"
          >
            {isSubmitting ? (
              <span>Verifying Credentials...</span>
            ) : (
              <>
                <span>Sign In to {isCustomer ? 'Customer Portal' : 'Contractor Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* CEC / Compliance Footer Badge */}
        <div className="pt-4 border-t border-slate-100 flex flex-col items-center text-center space-y-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>CEC Approved Solar Retailer &bull; ABN {companyProfile?.abn || '52 619 840 231'}</span>
          </div>
          <p className="text-slate-500">
            Need support? Call{' '}
            <strong className="text-slate-800">{activeConfig.supportPhone || companyProfile?.phone || '1300 852 400'}</strong>{' '}
            or email{' '}
            <strong className="text-slate-800">{activeConfig.supportEmail || companyProfile?.email || 'support@mysolarcrm.com.au'}</strong>
          </p>
        </div>
      </div>

      {/* QR Code Modal */}
      {isQrOpen && (
        <PortalQRCodeModal
          isOpen={isQrOpen}
          onClose={() => setIsQrOpen(false)}
          portalConfig={activeConfig}
        />
      )}
    </div>
  );
};
