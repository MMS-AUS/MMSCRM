import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserProfile } from '../../types';
import {
  Mail,
  Smartphone,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  KeyRound,
  X,
  Send,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface UserInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onTestInviteLink?: (url: string) => void;
}

export const UserInviteModal: React.FC<UserInviteModalProps> = ({
  isOpen,
  onClose,
  user,
  onTestInviteLink
}) => {
  const { getUserInviteLink, sendUserInvite, setUserPassword } = useApp();

  const [copiedLink, setCopiedLink] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<{
    channel: 'email' | 'sms';
    success: boolean;
    message: string;
  } | null>(null);
  const [isSending, setIsSending] = useState<'email' | 'sms' | null>(null);

  // Admin Direct Password Set State
  const [showAdminPasswordSection, setShowAdminPasswordSection] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [adminPasswordSuccess, setAdminPasswordSuccess] = useState(false);

  if (!isOpen || !user) return null;

  const inviteLink = getUserInviteLink(user);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSendInvite = (channel: 'email' | 'sms') => {
    setIsSending(channel);
    setDispatchStatus(null);
    setTimeout(() => {
      const res = sendUserInvite(user.id, channel);
      setIsSending(null);
      setDispatchStatus({
        channel,
        success: res.success,
        message: res.message
      });
      setTimeout(() => setDispatchStatus(null), 4000);
    }, 600);
  };

  const handleAdminSetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput.length < 6) return;

    setUserPassword(user.id, adminPasswordInput);
    setAdminPasswordSuccess(true);
    setTimeout(() => {
      setAdminPasswordSuccess(false);
      setShowAdminPasswordSection(false);
      setAdminPasswordInput('');
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#141414] border border-[#2d2d2d] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#262626] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#bef264]/10 border border-[#bef264]/30 flex items-center justify-center text-[#bef264]">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>ERP User Invitation &amp; Password Setup</span>
                {user.isPasswordSet ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                    Active
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
                    Pending Setup
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-gray-400">
                Generate and dispatch secure onboarding link to {user.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#262626] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Summary Card */}
        <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#282828] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-lime-400 to-emerald-500 text-black font-bold flex items-center justify-center text-sm">
              {user.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <div className="text-xs font-bold text-white">{user.name}</div>
              <div className="text-[11px] text-gray-400 font-mono">{user.email}</div>
              <div className="text-[10px] text-[#bef264] flex items-center gap-1.5 mt-0.5">
                <span className="capitalize">{user.role}</span> &bull; <span>{user.department || 'Operations'}</span>
              </div>
            </div>
          </div>

          <div className="text-right text-[10px] text-gray-400">
            <div>Mobile: <strong className="text-gray-200">{user.phone || 'None'}</strong></div>
            <div className="mt-0.5">
              Status: {user.isPasswordSet ? (
                <span className="text-emerald-400 font-semibold">Password Active</span>
              ) : (
                <span className="text-amber-400 font-semibold">Awaiting Password Setup</span>
              )}
            </div>
          </div>
        </div>

        {/* Invite Link Box */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-gray-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#bef264]" />
              <span>Dedicated Invitation &amp; Password Link</span>
            </label>
            <span className="text-[10px] text-gray-500 font-mono">Expires in 7 days</span>
          </div>

          <div className="p-2.5 bg-[#121212] border border-[#262626] rounded-xl flex items-center justify-between gap-2">
            <code className="text-xs text-[#bef264] font-mono truncate select-all flex-1">
              {inviteLink}
            </code>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg bg-[#242424] hover:bg-[#303030] text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Dispatch Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            disabled={isSending === 'email'}
            onClick={() => handleSendInvite('email')}
            className="p-2.5 bg-[#1e1e1e] hover:bg-[#252525] border border-[#303030] rounded-xl text-left flex items-center justify-between transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                  Send via Email
                </div>
                <div className="text-[10px] text-gray-400 truncate max-w-[150px]">
                  {user.email}
                </div>
              </div>
            </div>
            <Send className={`w-3.5 h-3.5 text-gray-400 group-hover:text-white ${isSending === 'email' ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            disabled={isSending === 'sms'}
            onClick={() => handleSendInvite('sms')}
            className="p-2.5 bg-[#1e1e1e] hover:bg-[#252525] border border-[#303030] rounded-xl text-left flex items-center justify-between transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Send via SMS
                </div>
                <div className="text-[10px] text-gray-400">
                  {user.phone || '+61 412 889 012'}
                </div>
              </div>
            </div>
            <Send className={`w-3.5 h-3.5 text-gray-400 group-hover:text-white ${isSending === 'sms' ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Dispatch Notification Alert */}
        {dispatchStatus && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{dispatchStatus.message}</span>
          </div>
        )}

        {/* Direct Administrator Password Override (Accordion / Toggle) */}
        <div className="pt-2 border-t border-[#262626]">
          {!showAdminPasswordSection ? (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 text-[11px]">
                Need to set password immediately without emailing?
              </span>
              <button
                type="button"
                onClick={() => setShowAdminPasswordSection(true)}
                className="text-[#bef264] hover:underline font-bold text-xs flex items-center gap-1"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Admin Set Password</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleAdminSetPassword} className="space-y-2 bg-[#181818] p-3 rounded-xl border border-[#2a2a2a]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#bef264]" />
                  <span>Direct Administrator Password Setting</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowAdminPasswordSection(false)}
                  className="text-[11px] text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  value={adminPasswordInput}
                  onChange={e => setAdminPasswordInput(e.target.value)}
                  placeholder="Enter initial user password (min 6 chars)..."
                  className="w-full bg-[#121212] border border-[#333] rounded-lg px-3 py-2 pr-10 text-xs text-white placeholder-gray-500 outline-none focus:border-[#bef264]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordText(!showPasswordText)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                >
                  {showPasswordText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-gray-400">
                  Allows user to sign in immediately with this credential.
                </span>
                <button
                  type="submit"
                  disabled={adminPasswordInput.length < 6}
                  className="px-3 py-1.5 bg-[#bef264] hover:bg-[#a3e635] disabled:bg-gray-700 disabled:text-gray-400 text-black text-xs font-bold rounded-lg transition-colors"
                >
                  {adminPasswordSuccess ? 'Password Saved!' : 'Save Password'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-[#262626]">
          <button
            type="button"
            onClick={() => {
              if (onTestInviteLink) {
                onTestInviteLink(inviteLink);
              } else if (typeof window !== 'undefined') {
                window.location.href = inviteLink;
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-[#222] hover:bg-[#2c2c2c] text-[#bef264] text-xs font-semibold flex items-center gap-1.5 border border-[#333] transition-colors"
            title="Open the password setup screen as this user to test"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Test Password Setup Screen</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#262626] hover:bg-[#333] text-white text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
