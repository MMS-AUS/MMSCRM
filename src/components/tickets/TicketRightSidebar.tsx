import React, { useState, useRef } from 'react';
import { LeadAttachment } from '../../types';
import {
  User,
  Paperclip,
  Upload,
  Trash2,
  Download,
  Copy,
  Check,
  ShieldCheck,
  CreditCard,
  Send,
  Phone,
  Mail,
  ExternalLink,
  Plus,
  AlertCircle,
  Clock,
  DollarSign,
  FileSpreadsheet
} from 'lucide-react';
import { formatAudAccounts, parseAudAccounts } from '../../utils/australianPostcodes';
import { TicketDetailsFormData } from './TicketDetailsLeftPanel';

interface TicketRightSidebarProps {
  formData: TicketDetailsFormData;
  setFormData: React.Dispatch<React.SetStateAction<TicketDetailsFormData>>;
  attachments: LeadAttachment[];
  onAddAttachment: (attachment: Omit<LeadAttachment, 'id' | 'uploadedAt'>) => void;
  onDeleteAttachment: (attachmentId: string) => void;
  isLight?: boolean;
}

export const TicketRightSidebar: React.FC<TicketRightSidebarProps> = ({
  formData,
  setFormData,
  attachments,
  onAddAttachment,
  onDeleteAttachment,
  isLight = false
}) => {
  const [uploadCategory, setUploadCategory] = useState('Warranty Photo / Evidence');
  const [uploadNotes, setUploadNotes] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = (text: string, fieldKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onAddAttachment({
        name: file.name,
        sizeBytes: file.size,
        uploadedBy: 'staff',
        category: uploadCategory,
        notes: uploadNotes.trim() || 'Service ticket supporting document / on-site diagnostic photo.'
      });
    }

    setUploadNotes('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setActionNotice('Diagnostic attachment added successfully!');
    setTimeout(() => setActionNotice(null), 3500);
  };

  const cardBg = isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800';
  const subCardBg = isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/60';
  const labelClass = `text-[11px] font-semibold flex items-center justify-between mb-1 ${
    isLight ? 'text-slate-700' : 'text-slate-300'
  }`;

  return (
    <div className="space-y-4 text-xs">
      {actionNotice && (
        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* CARD 1: CUSTOMER CONTACT SUMMARY */}
      <div className={`p-3.5 rounded-xl border ${cardBg}`}>
        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            Customer Contact
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {formData.installationProjectNo || 'No Project'}
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block">Customer Name</span>
            <p className="font-bold text-white text-sm">
              {formData.firstName || formData.lastName
                ? `${formData.firstName} ${formData.lastName}`.trim()
                : 'Customer not specified'}
            </p>
          </div>

          <div className="flex items-center justify-between py-1 border-t border-slate-800/50">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Phone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{formData.contactNumber || 'No phone'}</span>
            </div>
            {formData.contactNumber && (
              <button
                type="button"
                onClick={() => handleCopy(formData.contactNumber, 'phone')}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                title="Copy phone"
              >
                {copiedField === 'phone' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            )}
          </div>

          <div className="flex items-center justify-between py-1 border-t border-slate-800/50">
            <div className="flex items-center gap-1.5 text-slate-300 truncate pr-2">
              <Mail className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">{formData.emailId || 'No email'}</span>
            </div>
            {formData.emailId && (
              <button
                type="button"
                onClick={() => handleCopy(formData.emailId, 'email')}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors shrink-0"
                title="Copy email"
              >
                {copiedField === 'email' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            )}
          </div>

          <div className="py-1 border-t border-slate-800/50">
            <span className="text-[10px] text-slate-400 block mb-0.5">Installation Site:</span>
            <p className="text-slate-300 text-[11px] leading-snug">
              {[formData.address, formData.suburb, formData.state, formData.postCode].filter(Boolean).join(', ') || 'Address not populated'}
            </p>
          </div>
        </div>
      </div>

      {/* CARD 2: SERVICE FINANCIALS & AUD ACCOUNTS */}
      <div className={`p-3.5 rounded-xl border ${cardBg}`}>
        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            Service Financials (AUD)
          </span>
          <span className="text-[10px] text-emerald-400 font-semibold">$ Accounts</span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-400">Service Callout Charge:</span>
            <span className="font-mono font-bold text-white text-sm">
              {formData.serviceCharge || '$0.00'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-t border-slate-800/50">
            <span className="text-slate-400">Total Service Amount:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {formData.totalServiceIssueAmount || '$0.00'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-t border-slate-800/50">
            <span className="text-slate-400">Subcontractor Labor Cost:</span>
            <span className="font-mono text-slate-300">
              {formData.installerInvoiceAmount || '$0.00'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-t border-slate-800/50">
            <span className="text-slate-400">Warranty Claim Refund:</span>
            <span className="font-mono text-purple-400">
              {formData.warrantyClaimInvoiceAmount || '$0.00'}
            </span>
          </div>

          <div className={`p-2.5 rounded-lg border mt-2 ${subCardBg}`}>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Assigned Handler:</span>
              <span className="font-semibold text-white">{formData.serviceHandler || 'Unassigned'}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-1">
              <span className="text-slate-400">Target Resolution:</span>
              <span className="font-mono text-amber-400">{formData.issueResolutionDate || 'Open ticket'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 3: ATTACHMENTS & FAULT PHOTOS */}
      <div className={`p-3.5 rounded-xl border ${cardBg}`}>
        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Attachments &amp; Evidence
            </span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
            {attachments.length} files
          </span>
        </div>

        {/* Upload form */}
        <div className="space-y-2 mb-3">
          <div className="grid grid-cols-1 gap-1.5">
            <select
              value={uploadCategory}
              onChange={e => setUploadCategory(e.target.value)}
              className={`w-full px-2 py-1 rounded text-xs outline-none ${
                isLight ? 'bg-white border border-slate-300' : 'bg-slate-800 border border-slate-700 text-slate-200'
              }`}
            >
              <option value="Warranty Photo / Evidence">Inverter / Panel Fault Photo</option>
              <option value="Manufacturer RMA Document">Manufacturer RMA Claim PDF</option>
              <option value="Subcontractor Invoice">Subcontractor Tax Invoice</option>
              <option value="Testing & Commissioning Sheet">CEC Testing &amp; Commissioning Sheet</option>
              <option value="Customer Photos">Customer Email Photos</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              multiple
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Upload Fault Photo / PDF</span>
            </button>
          </div>
        </div>

        {/* List of attachments */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {attachments.length === 0 ? (
            <p className="text-[11px] text-slate-500 text-center py-4 border border-dashed border-slate-800 rounded-lg">
              No service photos or claim files attached yet.
            </p>
          ) : (
            attachments.map(att => (
              <div
                key={att.id}
                className={`p-2 rounded-lg border flex items-center justify-between gap-2 ${subCardBg}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate">{att.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {att.category} • {(att.sizeBytes / 1024).toFixed(0)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteAttachment(att.id)}
                  className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                  title="Remove attachment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
