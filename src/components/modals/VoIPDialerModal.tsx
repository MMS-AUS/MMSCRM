import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Phone, PhoneCall, PhoneOff, Mic, MicOff, Volume2, User, Clock, AlertCircle } from 'lucide-react';
import { originateCall } from '../../services/voiplineService';

export const VoIPDialerModal: React.FC = () => {
  const { isVoipDialerOpen, setIsVoipDialerOpen, currentUser, contacts, logVoIPCall } = useApp();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callActive, setCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [activeContactName, setActiveContactName] = useState<string | null>(null);

  useEffect(() => {
    let timer: any;
    if (callActive) {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [callActive]);

  if (!isVoipDialerOpen) return null;

  const handleDigit = (digit: string) => {
    if (callActive) return;
    setPhoneNumber(prev => prev + digit);
  };

  const handleBackspace = () => {
    if (callActive) return;
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const startCall = async () => {
    if (!phoneNumber.trim()) return;
    const matchedContact = contacts.find(
      c => c.phone.replace(/\s+/g, '') === phoneNumber.replace(/\s+/g, '')
    );
    setActiveContactName(matchedContact ? matchedContact.name : null);
    setCallActive(true);

    try {
      await originateCall({
        userId: currentUser?.id || 'usr-1',
        contactId: matchedContact?.id,
        calleeNumber: phoneNumber.trim()
      });
    } catch (err) {
      console.warn('[VoIPLine] Error triggering call origination:', err);
    }
  };

  const endCall = () => {
    if (callActive) {
      logVoIPCall({
        direction: 'outbound',
        callerNumber: currentUser.voipLineNumber || '+61 2 8311 4920',
        recipientNumber: phoneNumber,
        contactName: activeContactName || undefined,
        durationSeconds: callDuration,
        status: callDuration > 0 ? 'answered' : 'missed'
      });
    }
    setCallActive(false);
    setIsMuted(false);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm bg-[#1e1e1e] text-[#e5e7eb] rounded-xl shadow-2xl border border-[#2d2d2d] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#161616] border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#bef264] animate-pulse" />
            <div>
              <h3 className="font-bold text-sm text-white">VoIPLine Telecom Web Dialer</h3>
              <p className="text-xs text-gray-400">
                Line: <span className="text-[#bef264] font-mono">{currentUser.voipLineNumber || '+61 2 8311 4920'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (callActive) endCall();
              setIsVoipDialerOpen(false);
            }}
            className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded bg-[#262626] hover:bg-[#333333] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Call Screen or Dialpad */}
        <div className="p-5">
          {callActive ? (
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full bg-[#bef2641a] text-[#bef264] flex items-center justify-center mx-auto mb-4 border border-[#bef26433] animate-pulse">
                <PhoneCall className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-white">{activeContactName || phoneNumber}</h4>
              <p className="text-xs text-gray-400 mt-1">{phoneNumber}</p>
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#161616] border border-[#262626] text-[#bef264] font-mono text-sm">
                <Clock className="w-3.5 h-3.5" />
                {formatTime(callDuration)}
              </div>

              {/* Call in-progress controls */}
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-3.5 rounded-full transition-colors ${
                    isMuted ? 'bg-amber-500 text-black' : 'bg-[#161616] border border-[#262626] text-gray-300 hover:bg-[#262626]'
                  }`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button
                  onClick={endCall}
                  className="p-4 rounded-full bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-950 transition-colors"
                  title="End Call"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
                <div className="p-3.5 rounded-full bg-[#161616] border border-[#262626] text-gray-300">
                  <Volume2 className="w-5 h-5" />
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Phone display */}
              <div className="mb-4">
                <div className="flex items-center justify-between bg-[#121212] border border-[#262626] rounded-lg px-3 py-2.5">
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    placeholder="Enter AU mobile or landline..."
                    className="w-full bg-transparent text-lg font-mono text-center outline-none text-white placeholder:text-gray-600"
                  />
                  {phoneNumber && (
                    <button onClick={handleBackspace} className="text-gray-400 hover:text-white text-sm px-1">
                      ⌫
                    </button>
                  )}
                </div>
                {phoneNumber && (
                  <p className="text-center text-xs text-gray-400 mt-1">
                    {contacts.find(c => c.phone.replace(/\s+/g, '') === phoneNumber.replace(/\s+/g, ''))?.name ? (
                      <span className="text-[#bef264]">
                        Contact: {contacts.find(c => c.phone.replace(/\s+/g, '') === phoneNumber.replace(/\s+/g, ''))?.name}
                      </span>
                    ) : (
                      'Direct AU outbound call'
                    )}
                  </p>
                )}
              </div>

              {/* Dialpad Buttons */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { d: '1', l: '' },
                  { d: '2', l: 'ABC' },
                  { d: '3', l: 'DEF' },
                  { d: '4', l: 'GHI' },
                  { d: '5', l: 'JKL' },
                  { d: '6', l: 'MNO' },
                  { d: '7', l: 'PQRS' },
                  { d: '8', l: 'TUV' },
                  { d: '9', l: 'WXYZ' },
                  { d: '*', l: '' },
                  { d: '0', l: '+' },
                  { d: '#', l: '' }
                ].map(item => (
                  <button
                    key={item.d}
                    onClick={() => handleDigit(item.d)}
                    className="h-12 rounded-lg bg-[#161616] hover:bg-[#262626] active:bg-[#333333] border border-[#262626] flex flex-col items-center justify-center transition-colors text-white"
                  >
                    <span className="text-lg font-semibold leading-none">{item.d}</span>
                    {item.l && <span className="text-[9px] text-gray-400 tracking-wider mt-0.5">{item.l}</span>}
                  </button>
                ))}
              </div>

              {/* Call button */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={startCall}
                  disabled={!phoneNumber}
                  className="w-full py-3 rounded-lg bg-[#bef264] hover:bg-[#a3e635] disabled:opacity-40 text-black font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call via VoIPLine</span>
                </button>
              </div>

              {/* Quick speed-dials from contacts */}
              <div className="mt-4 pt-4 border-t border-[#262626]">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2">Quick Contacts</p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {contacts.slice(0, 4).map(c => (
                    <button
                      key={c.id}
                      onClick={() => setPhoneNumber(c.phone)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-[#161616] hover:bg-[#262626] border border-[#262626] text-gray-300 flex items-center gap-1.5 transition-colors"
                    >
                      <User className="w-3 h-3 text-[#bef264]" />
                      <span className="truncate max-w-[120px]">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
