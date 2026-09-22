import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  MessageSquare,
  Send,
  User,
  FolderKanban,
  Check,
  CheckCheck,
  AlertTriangle,
  Clock,
  Phone,
  Radio,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { sendOutboundSms, fetchSmsLogs, SmsLogEntry } from '../../services/messageMediaService';

export const MessageMediaSMSModal: React.FC = () => {
  const { isQuickSmsOpen, setIsQuickSmsOpen, currentUser, contacts, projects } = useApp();
  const [selectedContactId, setSelectedContactId] = useState<string>(contacts[0]?.id || '');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [messageText, setMessageText] = useState('');
  const [senderId, setSenderId] = useState<string>('SolarFlow');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // SMS logs loaded from Supabase
  const [dbLogs, setDbLogs] = useState<SmsLogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const currentContact = contacts.find(c => c.id === selectedContactId);
  const contactPhone = currentContact?.phone || '';

  useEffect(() => {
    if (isQuickSmsOpen) {
      loadLogs();
    }
  }, [isQuickSmsOpen, selectedContactId, selectedProjectId]);

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const logs = await fetchSmsLogs({
        contact_id: selectedContactId || undefined,
        project_id: selectedProjectId || undefined,
        limit: 50
      });
      setDbLogs(logs);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  if (!isQuickSmsOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !contactPhone) return;

    setIsSending(true);
    setSendError(null);

    try {
      const res = await sendOutboundSms({
        recipient_number: contactPhone,
        message_body: messageText.trim(),
        contact_id: selectedContactId || undefined,
        project_id: selectedProjectId || undefined,
        sender_id: senderId.trim() || undefined
      });

      if (res.success) {
        setMessageText('');
        await loadLogs();
      } else {
        setSendError(res.error || 'Failed to dispatch outbound SMS');
      }
    } catch (err: any) {
      setSendError(err.message || 'Error communicating with SMS service');
    } finally {
      setIsSending(false);
    }
  };

  const insertSnippet = (text: string) => {
    setMessageText(prev => (prev ? `${prev} ${text}` : text));
  };

  const charCount = messageText.length;
  const segments = Math.ceil(charCount / 160) || 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] text-slate-800">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base text-slate-800">
                  Outbound SMS Gateway (Sinch MessageMedia)
                </h3>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-medium flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-600" />
                  Live API
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Recipient: <span className="font-mono font-medium text-slate-700">{contactPhone || 'Select contact'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsQuickSmsOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Contact & Project Selector Bar */}
        <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Select Contact
            </label>
            <select
              value={selectedContactId}
              onChange={e => setSelectedContactId(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 text-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              {contacts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Link with Project
            </label>
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 text-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">-- General / No Project --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.projectCode} - {p.customerName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Sender ID
            </label>
            <input
              type="text"
              value={senderId}
              onChange={e => setSenderId(e.target.value)}
              placeholder="SolarFlow"
              className="w-full text-xs bg-white border border-slate-300 text-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
            />
          </div>
        </div>

        {/* Message Thread / Activity Feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-100/50 min-h-[220px]">
          {isLoadingLogs ? (
            <div className="text-center py-10 text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
              Loading SMS history from Supabase...
            </div>
          ) : dbLogs.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs space-y-1">
              <Phone className="w-8 h-8 text-slate-300 mx-auto mb-1" />
              <p className="font-medium text-slate-700">No previous SMS messages for this contact</p>
              <p className="text-[11px] text-slate-400">
                Compose a message below to dispatch via Sinch MessageMedia.
              </p>
            </div>
          ) : (
            dbLogs.map(log => {
              const isDelivered = log.delivery_status === 'delivered';
              const isFailed =
                log.status === 'failed_to_send' ||
                log.delivery_status === 'failed' ||
                log.delivery_status === 'rejected';

              return (
                <div key={log.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-none px-4 py-3 bg-white border border-slate-200 text-slate-800 shadow-2xs text-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-[10px] text-slate-500 border-b border-slate-100 pb-1">
                      <span className="font-semibold text-emerald-700 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        Via {log.sender_id || 'MessageMedia Gateway'}
                      </span>
                      <span>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <p className="leading-relaxed whitespace-pre-wrap text-slate-800 font-normal">
                      {log.message_body}
                    </p>

                    {/* Delivery Status Indicator */}
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {log.provider_message_id ? `#${log.provider_message_id.substring(0, 8)}` : ''}
                      </span>

                      {isDelivered ? (
                        <span
                          className="inline-flex items-center gap-1 text-sky-700 font-medium"
                          title={log.delivered_at ? `Delivered at ${new Date(log.delivered_at).toLocaleTimeString()}` : 'Delivered'}
                        >
                          <span>Delivered</span>
                          <CheckCheck className="w-3.5 h-3.5 text-sky-600" />
                        </span>
                      ) : isFailed ? (
                        <span
                          className="inline-flex items-center gap-1 text-rose-600 font-medium"
                          title={log.error_message || 'SMS delivery failed'}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                          <span>{log.delivery_status || 'Failed'}</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-slate-500 font-medium"
                          title="Message submitted to Sinch MessageMedia, awaiting carrier delivery report"
                        >
                          <span>{log.delivery_status || 'Submitted'}</span>
                          <Check className="w-3.5 h-3.5 text-slate-400" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Error notification */}
        {sendError && (
          <div className="px-4 py-2 bg-rose-50 border-t border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{sendError}</span>
          </div>
        )}

        {/* Quick Solar Industry Snippets */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-slate-500 font-medium whitespace-nowrap">Templates:</span>
          <button
            type="button"
            onClick={() => insertSnippet('Your 13.2kW solar installation has been scheduled for this Thursday at 8:00 AM.')}
            className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap transition-colors"
          >
            📅 Site Install
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('AusSolar Update: Your STC Rebate of $3,850 has been approved and credited.')}
            className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap transition-colors"
          >
            ☀️ STC Rebate
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('Your Tesla Powerwall 3 commissioning is complete and grid export is active.')}
            className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap transition-colors"
          >
            🔋 Battery Active
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('Reminder: Your 2-year solar system safety inspection is due. Reply YES to confirm.')}
            className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap transition-colors"
          >
            🔧 Maintenance
          </button>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              placeholder={`Type SMS to ${contactPhone || 'customer'}...`}
              className="w-full text-xs bg-slate-50 border border-slate-300 text-slate-800 rounded-lg pl-3 pr-20 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
              {charCount}/160 ({segments} seg)
            </span>
          </div>

          <button
            type="submit"
            disabled={isSending || !messageText.trim() || !contactPhone}
            className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-medium text-xs flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
          >
            {isSending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Send SMS</span>
          </button>
        </form>
      </div>
    </div>
  );
};
