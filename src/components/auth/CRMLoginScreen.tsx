import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CompanyLogo } from '../common/CompanyLogo';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Phone,
  Sun,
  Award,
  Sparkles,
  CheckCircle2,
  Globe,
  UserCheck,
  KeyRound
} from 'lucide-react';
import { INITIAL_USERS } from '../../data/initialData';

interface CRMLoginScreenProps {
  onOpenInviteScreen?: () => void;
}

export const CRMLoginScreen: React.FC<CRMLoginScreenProps> = ({ onOpenInviteScreen }) => {
  const { companyProfile, login, setActiveRole } = useApp();

  const [selectedUser, setSelectedUser] = useState(INITIAL_USERS[0]);
  const [email, setEmail] = useState(INITIAL_USERS[0].email);
  const [password, setPassword] = useState('••••••••••••');
  const [loginMethod, setLoginMethod] = useState<'password' | 'sms'>('password');
  const [smsOtpSent, setSmsOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUserSelect = (user: typeof INITIAL_USERS[0]) => {
    setSelectedUser(user);
    setEmail(user.email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      login(selectedUser);
    }, 400);
  };

  const handleSendOtp = () => {
    setSmsOtpSent(true);
    setOtpCode('719284');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 bg-white text-slate-900 min-h-screen relative">
      {/* Top Security & Portal Context Header */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between text-xs px-1 text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium">Operations Gateway Online</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          <Lock className="w-3 h-3 text-emerald-600" />
          <span>SSL TLS 1.3</span>
        </div>
      </div>

      {/* Main Login Card - White Background with Solar Amber Border */}
      <div className="w-full max-w-md bg-white border-2 border-amber-500 rounded-2xl shadow-xl shadow-amber-500/10 p-6 sm:p-8 space-y-5">
        {/* Company Dynamic Logo and Branding Header (No duplicate trading name) */}
        <div className="flex flex-col items-center text-center space-y-2">
          <CompanyLogo profile={companyProfile} size="md" variant="login" />

          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            Enterprise Solar CRM &amp; Operations ERP Portal
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
            <Sun className="w-3.5 h-3.5 text-amber-600" />
            <span>Staff &amp; Operations Sign In</span>
          </div>
        </div>

        {/* Quick Demo Staff Profile Selector */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Select Staff Account:</span>
            </span>
            <span className="text-[10px] text-slate-500">Demo Profiles</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {INITIAL_USERS.slice(0, 4).map(u => {
              const isSelected = selectedUser.id === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleUserSelect(u)}
                  className={`px-2 py-1.5 rounded-lg text-left text-xs transition-all border ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-600 font-bold shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <p className="truncate font-semibold text-[11px]">{u.name}</p>
                  <p className={`text-[10px] truncate capitalize ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                    {u.role} &bull; {u.department}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Method Tabs */}
          <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200 text-xs font-medium">
            <button
              type="button"
              onClick={() => setLoginMethod('password')}
              className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                loginMethod === 'password'
                  ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>Password</span>
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('sms')}
              className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                loginMethod === 'sms'
                  ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Phone className="w-3 h-3" />
              <span>Mobile SMS 2FA</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Corporate Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                placeholder="you@mysolarcrm.com.au"
              />
            </div>
          </div>

          {loginMethod === 'password' ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Account Password</label>
                <span className="text-[11px] text-amber-600 hover:text-amber-700 cursor-pointer">
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Registered Mobile Phone
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  disabled
                  value={selectedUser.phone || '+61 412 889 012'}
                  className="flex-1 bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-600 font-mono"
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-xl transition-colors border border-amber-300 shrink-0"
                >
                  {smsOtpSent ? 'Resend OTP' : 'Send Code'}
                </button>
              </div>

              {smsOtpSent && (
                <div className="space-y-1 animate-in fade-in">
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Security OTP sent to device (Auto-filled: 719284)
                  </span>
                  <input
                    type="text"
                    required
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit SMS code"
                    className="w-full bg-slate-50 border border-emerald-400 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono tracking-widest text-center focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 mt-2 bg-amber-500 hover:bg-amber-400 active:scale-[0.99] cursor-pointer"
            style={companyProfile?.primaryColor ? { backgroundColor: companyProfile.primaryColor } : undefined}
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Operations</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Portal Switch Links for Testing */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>External Portals:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                login(selectedUser);
                setActiveRole('customer');
              }}
              className="text-amber-600 hover:text-amber-700 font-medium hover:underline"
            >
              Customer Portal
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => {
                login(selectedUser);
                setActiveRole('installer');
              }}
              className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
            >
              Installer Portal
            </button>
          </div>
        </div>

        {/* Onboarding Invite / Set Password prompt */}
        {onOpenInviteScreen && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Received an ERP invitation?</span>
            <button
              type="button"
              onClick={onOpenInviteScreen}
              className="text-amber-600 hover:text-amber-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <KeyRound className="w-3 h-3 text-amber-500" />
              <span>Set Password</span>
            </button>
          </div>
        )}

        {/* Industry Compliance Badges */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-500">
          <div className="flex flex-col items-center">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600 mb-0.5" />
            <span>Clean Energy Council</span>
          </div>
          <div className="flex flex-col items-center">
            <Award className="w-3.5 h-3.5 text-emerald-600 mb-0.5" />
            <span>CER STC Gateway</span>
          </div>
          <div className="flex flex-col items-center">
            <Globe className="w-3.5 h-3.5 text-blue-600 mb-0.5" />
            <span>ISO 27001 Auth</span>
          </div>
        </div>
      </div>
    </div>
  );
};
