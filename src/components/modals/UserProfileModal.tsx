import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  User,
  Mail,
  Phone,
  Shield,
  Briefcase,
  Building,
  Save,
  X,
  CheckCircle2,
  Clock,
  KeyRound,
  Globe,
  Bell,
  LogOut
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, setCurrentUser, updateSystemUser, logout } = useApp();

  const [name, setName] = useState(currentUser.name || 'Admin User');
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || '+61 412 889 012');
  const [voipLineNumber, setVoipLineNumber] = useState(currentUser.voipLineNumber || '+61 2 8311 4920');
  const [department, setDepartment] = useState(currentUser.department || 'Management');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Preference toggles
  const [leadAlerts, setLeadAlerts] = useState(true);
  const [projectAlerts, setProjectAlerts] = useState(true);
  const [ticketAlerts, setTicketAlerts] = useState(true);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...currentUser,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      voipLineNumber: voipLineNumber.trim(),
      department: department as any
    };

    setCurrentUser(updated);
    updateSystemUser(currentUser.id, updated);
    setFeedback('Profile successfully updated!');
    setTimeout(() => {
      setFeedback(null);
      onClose();
    }, 1200);
  };

  const userInitials = (name || 'JD')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-[#141414] border border-[#2d2d2d] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#181818] border-b border-[#262626] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-lime-400 to-emerald-500 flex items-center justify-center text-black font-bold text-sm shadow-xs">
              {userInitials}
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Individual User Profile</h2>
              <p className="text-xs text-gray-400">Manage your personal credentials &amp; contact settings</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#262626] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {feedback && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Current Status Badge Banner */}
          <div className="p-3 rounded-xl bg-[#1a1a1a] border border-[#262626] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-gray-300 font-medium">Logged In As:</span>
              <strong className="text-xs text-white capitalize">{currentUser.role} Account</strong>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#bef2641a] text-[#bef264] border border-[#bef26433] font-bold">
              Active Session &bull; AEST (Sydney)
            </span>
          </div>

          {/* Core Personal Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Personal Information</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Mobile Phone (Australia)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+61 4XX XXX XXX"
                    className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">VoIPLine Direct Dial (AU)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-emerald-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={voipLineNumber}
                    onChange={e => setVoipLineNumber(e.target.value)}
                    placeholder="+61 2 XXXX XXXX"
                    className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Department</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <select
                    value={department}
                    onChange={e => setDepartment(e.target.value as any)}
                    className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:border-[#bef264] outline-none"
                  >
                    <option value="Management">Management</option>
                    <option value="Sales">Sales &amp; Business Dev</option>
                    <option value="Operations">Operations &amp; Dispatch</option>
                    <option value="Engineering">CEC Engineering</option>
                    <option value="Customer Support">Customer Support</option>
                    <option value="Warehouse">Warehouse &amp; Logistics</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Assigned Domain</label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    disabled
                    value={currentUser.assignedDomain || 'mysolarcrm.com.au'}
                    className="w-full bg-[#1e1e1e] border border-[#282828] rounded-lg pl-9 pr-3 py-2 text-xs text-gray-400 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="space-y-3 pt-3 border-t border-[#262626]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-[#bef264]" />
              <span>Real-time Alerts &amp; Subscriptions</span>
            </h3>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#181818] border border-[#262626] cursor-pointer hover:bg-[#1f1f1f] transition-colors">
                <div>
                  <p className="text-xs font-semibold text-white">Inbound Meta Ads Leads</p>
                  <p className="text-[11px] text-gray-400">Notify instantly when a new Sydney or Brisbane lead syncs</p>
                </div>
                <input
                  type="checkbox"
                  checked={leadAlerts}
                  onChange={e => setLeadAlerts(e.target.checked)}
                  className="rounded border-[#333] text-[#bef264] focus:ring-0 w-4 h-4 accent-[#bef264]"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#181818] border border-[#262626] cursor-pointer hover:bg-[#1f1f1f] transition-colors">
                <div>
                  <p className="text-xs font-semibold text-white">Installation Milestones &amp; STC Claims</p>
                  <p className="text-[11px] text-gray-400">Notify when BridgeSelect STC packages are verified or lodged</p>
                </div>
                <input
                  type="checkbox"
                  checked={projectAlerts}
                  onChange={e => setProjectAlerts(e.target.checked)}
                  className="rounded border-[#333] text-[#bef264] focus:ring-0 w-4 h-4 accent-[#bef264]"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#181818] border border-[#262626] cursor-pointer hover:bg-[#1f1f1f] transition-colors">
                <div>
                  <p className="text-xs font-semibold text-white">High Priority Support Tickets</p>
                  <p className="text-[11px] text-gray-400">Receive alerts for inverter fault codes and WiFi dropouts</p>
                </div>
                <input
                  type="checkbox"
                  checked={ticketAlerts}
                  onChange={e => setTicketAlerts(e.target.checked)}
                  className="rounded border-[#333] text-[#bef264] focus:ring-0 w-4 h-4 accent-[#bef264]"
                />
              </label>
            </div>
          </div>

          {/* Sticky Footer Form Action */}
          <div className="flex items-center justify-between gap-2 pt-4 border-t border-[#262626]">
            <button
              type="button"
              onClick={() => {
                logout();
                onClose();
              }}
              className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="End current session and return to login"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out of Session</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#bef264] hover:bg-[#a3e635] text-black text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>Save Profile</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
