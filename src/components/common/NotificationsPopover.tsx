import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  Flame,
  FolderKanban,
  Gift,
  LifeBuoy,
  Wrench,
  Info,
  ExternalLink,
  Check
} from 'lucide-react';
import { NavSection } from '../layout/Sidebar';

interface NotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (section: NavSection) => void;
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'lead' | 'project' | 'referral' | 'ticket'>('all');

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'unread') return !n.read;
    if (activeFilter === 'lead') return n.type === 'lead';
    if (activeFilter === 'project') return n.type === 'project';
    if (activeFilter === 'referral') return n.type === 'referral';
    if (activeFilter === 'ticket') return n.type === 'ticket';
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'lead':
        return <Flame className="w-4 h-4 text-amber-400" />;
      case 'project':
        return <FolderKanban className="w-4 h-4 text-blue-400" />;
      case 'referral':
        return <Gift className="w-4 h-4 text-emerald-400" />;
      case 'ticket':
        return <LifeBuoy className="w-4 h-4 text-rose-400" />;
      case 'maintenance':
        return <Wrench className="w-4 h-4 text-amber-400" />;
      default:
        return <Info className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'lead':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'project':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'referral':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'ticket':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'maintenance':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-gray-800 text-gray-300 border-gray-700';
    }
  };

  const handleNotificationClick = (notif: (typeof notifications)[0]) => {
    markNotificationRead(notif.id);
    if (notif.targetSection && onNavigate) {
      onNavigate(notif.targetSection as NavSection);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop for click outside */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute right-0 top-12 mt-2 w-96 max-w-[calc(100vw-1.5rem)] bg-[#141414] border border-[#2d2d2d] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
        {/* Header */}
        <div className="p-4 bg-[#181818] border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Notifications</h3>
              <p className="text-[11px] text-gray-400">
                {unreadNotificationsCount} unread system alert{unreadNotificationsCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadNotificationsCount > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsRead}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#262626] transition-colors text-xs flex items-center gap-1"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            )}
            <button
              type="button"
              onClick={clearNotifications}
              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-[#262626] transition-colors text-xs"
              title="Clear all notifications"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#262626] transition-colors"
              title="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="px-3 py-2 bg-[#121212] border-b border-[#262626] flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
          {[
            { key: 'all', label: 'All' },
            { key: 'unread', label: `Unread (${unreadNotificationsCount})` },
            { key: 'lead', label: 'Leads' },
            { key: 'project', label: 'Projects' },
            { key: 'referral', label: 'Referrals' },
            { key: 'ticket', label: 'Tickets' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key as any)}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-colors ${
                activeFilter === f.key
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold'
                  : 'bg-[#1e1e1e] text-gray-400 hover:text-white hover:bg-[#262626]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-[#202020]">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer group ${
                  notif.read ? 'hover:bg-[#1a1a1a]' : 'bg-amber-500/5 hover:bg-amber-500/10'
                }`}
              >
                <div className="p-2 rounded-xl bg-[#1e1e1e] border border-[#2d2d2d] shrink-0 mt-0.5">
                  {getIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className={`font-semibold text-xs truncate ${notif.read ? 'text-gray-300' : 'text-white font-bold'}`}>
                      {notif.title}
                    </span>
                    <span className="text-[10px] text-gray-500 shrink-0 font-medium">{notif.timestamp}</span>
                  </div>

                  <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>

                  <div className="flex items-center justify-between mt-2">
                    <span
                      className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${getTypeBadge(
                        notif.type
                      )}`}
                    >
                      {notif.type}
                    </span>

                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notif.read && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            markNotificationRead(notif.id);
                          }}
                          className="text-[10px] text-gray-400 hover:text-emerald-400 flex items-center gap-0.5"
                          title="Mark read"
                        >
                          <Check className="w-3 h-3" />
                          <span>Mark read</span>
                        </button>
                      )}
                      {notif.targetSection && (
                        <span className="text-[10px] text-amber-400 flex items-center gap-0.5 font-medium">
                          <span>View</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!notif.read && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-2" />
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-semibold text-gray-400">No notifications in this filter</p>
              <p className="text-[11px] text-gray-500 mt-1">You are all caught up!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-[#181818] border-t border-[#262626] text-center">
          <p className="text-[10px] text-gray-500">
            Real-time webhook synchronization for Leads, Installations &amp; Support Tickets
          </p>
        </div>
      </div>
    </>
  );
};
