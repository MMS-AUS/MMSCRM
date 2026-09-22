import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CompanyLogo } from '../common/CompanyLogo';
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Building2,
  Briefcase,
  Mail,
  KeyRound,
  Check,
  Sparkles
} from 'lucide-react';

interface JoinERPSetPasswordScreenProps {
  inviteToken?: string;
  initialEmail?: string;
  onBackToLogin?: () => void;
}

export const JoinERPSetPasswordScreen: React.FC<JoinERPSetPasswordScreenProps> = ({
  inviteToken,
  initialEmail,
  onBackToLogin
}) => {
  const { companyProfile, systemUsers, setUserPassword, login } = useApp();

  // Extract query params if not explicitly passed as props
  const tokenFromUrl = useMemo(() => {
    if (inviteToken) return inviteToken;
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('invite_token') || '';
  }, [inviteToken]);

  const emailFromUrl = useMemo(() => {
    if (initialEmail) return initialEmail;
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('email') || '';
  }, [initialEmail]);

  // Find user by token or email
  const matchedUser = useMemo(() => {
    if (tokenFromUrl) {
      const byToken = systemUsers.find(u => u.inviteToken === tokenFromUrl);
      if (byToken) return byToken;
    }
    if (emailFromUrl) {
      const byEmail = systemUsers.find(
        u => u.email.toLowerCase() === emailFromUrl.toLowerCase().trim()
      );
      if (byEmail) return byEmail;
    }
    // Default fallback to first pending user or first user for seamless onboarding preview
    const pending = systemUsers.find(u => !u.isPasswordSet);
    return pending || systemUsers[0];
  }, [systemUsers, tokenFromUrl, emailFromUrl]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password validation criteria
  const hasMinLength = password.length >= 8;
  const hasNumber = /[0-9]/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = hasMinLength && hasNumber && hasLetter && passwordsMatch;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!matchedUser) {
      setErrorMessage('User invitation record not found. Please contact your system administrator.');
      return;
    }

    if (!isFormValid) {
      setErrorMessage('Please ensure your password meets all the security criteria below.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      // Set password in global state
      const res = setUserPassword(matchedUser.id, password);

      if (res.success) {
        setSuccessMessage('Password set successfully! Directing you to your ERP workspace...');

        // Clear query params so subsequent refreshes stay normal
        if (typeof window !== 'undefined' && window.history) {
          const url = new URL(window.location.href);
          url.searchParams.delete('invite_token');
          url.searchParams.delete('email');
          window.history.replaceState({}, '', url.pathname);
        }

        setTimeout(() => {
          setIsSubmitting(false);
          login(matchedUser);
        }, 1200);
      } else {
        setIsSubmitting(false);
        setErrorMessage(res.message);
      }
    }, 600);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-50 text-slate-900 min-h-screen relative">
      {/* Top Security Header */}
      <div className="w-full max-w-md mb-3 flex items-center justify-between text-xs px-1 text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-700">Official Team Member Invitation</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
          <Lock className="w-3 h-3 text-emerald-600" />
          <span>256-Bit TLS</span>
        </div>
      </div>

      {/* Main Invite Card */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 space-y-5">
        {/* Company Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <CompanyLogo profile={companyProfile} size="lg" variant="login" />

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>ERP Workspace Invitation</span>
          </div>

          <h2 className="text-xl font-black tracking-tight text-slate-900 pt-1">
            Set Your Password
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
            Welcome to the team! You have been granted access to My Solar CRM. Please set your account password to begin.
          </p>
        </div>

        {/* Invited User Card Details */}
        {matchedUser && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Invited Team Member
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                {matchedUser.role.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm">
                {matchedUser.name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm text-slate-900 truncate">{matchedUser.name}</div>
                <div className="text-xs text-slate-500 truncate flex items-center gap-1 font-mono">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span>{matchedUser.email}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-400" />
                <span>Dept: <strong>{matchedUser.department || 'Operations'}</strong></span>
              </div>
              <div className="flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-slate-400" />
                <span>Domain: <strong>@{matchedUser.assignedDomain || 'mysolarcrm.com.au'}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Create New Password
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter at least 8 characters..."
                className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password..."
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Password Security Checklist */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs text-slate-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Password Security Checklist
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                {hasMinLength ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />}
                <span>8+ Characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                {hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />}
                <span>At least 1 Number</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                {hasLetter ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />}
                <span>Letters (A-Z, a-z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                {passwordsMatch ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />}
                <span>Passwords Match</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-950 font-black rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/10 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span>Activating Account...</span>
              </span>
            ) : (
              <>
                <span>Set Password &amp; Enter ERP</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Already configured?</span>
          <button
            type="button"
            onClick={() => {
              if (onBackToLogin) {
                onBackToLogin();
              } else if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.delete('invite_token');
                url.searchParams.delete('email');
                window.location.href = url.pathname;
              }
            }}
            className="text-slate-900 font-bold hover:underline flex items-center gap-1"
          >
            <span>Back to Staff Sign In</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
