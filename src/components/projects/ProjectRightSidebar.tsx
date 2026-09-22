import React, { useState, useRef } from 'react';
import { Project, LeadAttachment, CustomerPortalCredentials } from '../../types';
import {
  User,
  Building2,
  Paperclip,
  Receipt,
  Upload,
  Trash2,
  Download,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Send,
  Lock,
  Phone,
  Mail,
  MessageSquare,
  Sparkles,
  Plus,
  FileCheck2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatAudAccounts, parseAudAccounts } from '../../utils/australianPostcodes';
import { ProjectFormData } from './ProjectDetailsLeftPanel';

interface ProjectRightSidebarProps {
  project?: Project | null;
  formData: ProjectFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProjectFormData>>;
  attachments: LeadAttachment[];
  onAddAttachment: (attachment: Omit<LeadAttachment, 'id' | 'uploadedAt'>) => void;
  onDeleteAttachment: (attachmentId: string) => void;
  portalCredentials?: CustomerPortalCredentials;
  onSendPortalInvite: () => void;
  onCreateXeroInvoice: () => void;
  onGenerateXeroReceipt: () => void;
  xeroInvoiceNumber?: string;
  xeroInvoiceTotal?: number;
  xeroInvoiceStatus?: string;
  xeroReceiptNumber?: string;
  xeroReceiptAmount?: number;
  xeroReceiptDate?: string;
  xeroActionNotice?: string | null;
}

export const ProjectRightSidebar: React.FC<ProjectRightSidebarProps> = ({
  project,
  formData,
  setFormData,
  attachments,
  onAddAttachment,
  onDeleteAttachment,
  portalCredentials,
  onSendPortalInvite,
  onCreateXeroInvoice,
  onGenerateXeroReceipt,
  xeroInvoiceNumber,
  xeroInvoiceTotal,
  xeroInvoiceStatus,
  xeroReceiptNumber,
  xeroReceiptAmount,
  xeroReceiptDate,
  xeroActionNotice
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [uploadCategory, setUploadCategory] = useState<LeadAttachment['category']>('Electricity Bill');
  const [uploadNotes, setUploadNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || project?.customerName || 'Customer Record';
  const cleanEmail = formData.email ? formData.email.split(',')[0].trim() : 'customer@gmail.com';
  const cleanPhone = formData.primaryMobile || '0400 000 000';

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onAddAttachment({
      name: file.name,
      sizeBytes: file.size,
      uploadedBy: 'staff',
      category: uploadCategory,
      notes: uploadNotes.trim() || `${uploadCategory} document uploaded by staff`
    });

    setUploadNotes('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4 text-sm text-gray-200">
      {/* CARD 1: CONTACT (Auto-Created & Attached) */}
      <div className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between border-b border-[#282828] pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#bef26415] text-[#bef264] border border-[#bef26430]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-xs">Contact Record</h4>
              <span className="text-[10px] text-emerald-400 font-mono block">
                Auto-Created &amp; Attached
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#242424] text-gray-300 border border-[#333]">
            {formData.projectNumber || 'Active'}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-sm">{fullName}</span>
            <span className="text-[10px] text-gray-400 bg-[#222] px-2 py-0.5 rounded border border-[#333]">
              {formData.area || 'Metro'} Area
            </span>
          </div>

          <div className="space-y-1.5 pt-1 text-xs">
            <div className="flex items-center justify-between text-gray-300">
              <span className="flex items-center gap-1.5 text-gray-400">
                <Phone className="w-3.5 h-3.5 text-[#bef264]" />
                <span>{cleanPhone}</span>
              </span>
              <a
                href={`tel:${cleanPhone}`}
                className="text-[11px] text-[#bef264] hover:underline font-mono"
              >
                Call
              </a>
            </div>

            <div className="flex items-center justify-between text-gray-300">
              <span className="flex items-center gap-1.5 text-gray-400 truncate max-w-[180px]">
                <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">{cleanEmail}</span>
              </span>
              <a
                href={`mailto:${cleanEmail}`}
                className="text-[11px] text-cyan-400 hover:underline font-mono shrink-0"
              >
                Email
              </a>
            </div>

            <div className="pt-1.5 border-t border-[#262626] text-gray-400">
              <span className="text-[10px] text-gray-500 uppercase block font-semibold">Installation Site</span>
              <p className="text-gray-200 text-xs mt-0.5 font-medium leading-relaxed">
                {formData.address || 'Address pending'}
                {formData.suburb ? `, ${formData.suburb}` : ''}
                {formData.state ? ` ${formData.state}` : ''}
                {formData.postcode ? ` ${formData.postcode}` : ''}
              </p>
              <div className="text-[10px] text-gray-500 mt-0.5">
                City: <span className="text-gray-300">{formData.nearestBigCity || 'Sydney'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 2: COMPANY / ABN (Auto-Attached) */}
      <div className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between border-b border-[#282828] pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-xs">Commercial Entity &amp; ABN</h4>
              <span className="text-[10px] text-cyan-400 font-mono block">
                {formData.hasCompany ? 'Entity Attached' : 'Residential Project'}
              </span>
            </div>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={formData.hasCompany}
              onChange={e => setFormData(prev => ({ ...prev, hasCompany: e.target.checked }))}
              className="w-3.5 h-3.5 rounded bg-[#101010] border-[#333] text-[#bef264] focus:ring-0"
            />
            <span className="text-[10px] text-gray-400">Attach</span>
          </label>
        </div>

        {formData.hasCompany ? (
          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Company Trading Name</label>
              <input
                type="text"
                placeholder="e.g. Acme Solar Solutions Pty Ltd"
                value={formData.companyName}
                onChange={e => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                className="w-full px-2.5 py-1.5 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Australian Business Number (ABN)</label>
              <input
                type="text"
                placeholder="51 824 753 556"
                value={formData.companyAbn}
                onChange={e => setFormData(prev => ({ ...prev, companyAbn: e.target.value }))}
                className="w-full px-2.5 py-1.5 bg-[#121212] border border-[#333] rounded-lg text-xs font-mono text-[#bef264] focus:border-[#bef264] focus:outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Entity Type</label>
                <select
                  value={formData.companyType}
                  onChange={e => setFormData(prev => ({ ...prev, companyType: e.target.value }))}
                  className="w-full px-2 py-1.5 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
                >
                  <option value="Company / Pty Ltd">Pty Ltd</option>
                  <option value="Sole Trader">Sole Trader</option>
                  <option value="Trust / Superfund">Trust / SMSF</option>
                  <option value="Partnership">Partnership</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Company Phone</label>
                <input
                  type="text"
                  placeholder="02 9000 0000"
                  value={formData.companyPhone}
                  onChange={e => setFormData(prev => ({ ...prev, companyPhone: e.target.value }))}
                  className="w-full px-2.5 py-1.5 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-[#141414] border border-[#282828] rounded-lg text-center">
            <p className="text-xs text-gray-400">Residential solar install. Tick 'Attach' to connect an ABN &amp; business entity.</p>
          </div>
        )}
      </div>

      {/* CARD 3: ATTACHMENTS (Real File Uploader) */}
      <div className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between border-b border-[#282828] pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-950/60 text-purple-400 border border-purple-800/40">
              <Paperclip className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-xs">Engineering Documents &amp; Bills</h4>
              <span className="text-[10px] text-gray-400 font-mono block">
                {attachments.length} files attached
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-xs bg-[#bef264] hover:bg-[#aee653] text-slate-950 px-2 py-1 rounded font-bold transition-colors"
          >
            <Upload className="w-3 h-3" />
            <span>Upload</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* Upload form category selector */}
        <div className="flex gap-2">
          <select
            value={uploadCategory}
            onChange={e => setUploadCategory(e.target.value as any)}
            className="w-full px-2.5 py-1.5 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:border-[#bef264] focus:outline-none transition-colors"
          >
            <option value="Electricity Bill">Electricity Bill</option>
            <option value="Site Photo">Site / Meter Photo</option>
            <option value="Proposal / SLD">OpenSolar Proposal / SLD</option>
            <option value="CES Certificate">CES / STC Form</option>
            <option value="Other">Other Document</option>
          </select>
        </div>

        {/* Attachment List */}
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
          {attachments.length === 0 ? (
            <div className="p-4 text-center bg-[#141414] border border-dashed border-[#282828] rounded-lg">
              <p className="text-xs text-gray-500">No documents attached yet.</p>
            </div>
          ) : (
            attachments.map(att => (
              <div
                key={att.id}
                className="p-2.5 bg-[#121212] border border-[#262626] rounded-lg flex items-center justify-between gap-2 text-xs hover:border-[#383838] transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileCheck2 className="w-3.5 h-3.5 text-[#bef264] shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium text-white truncate block text-xs">{att.name}</span>
                    <span className="text-[10px] text-gray-400">
                      {att.category} &bull; {att.sizeBytes ? `${(att.sizeBytes / 1024).toFixed(1)} KB` : att.size || 'PDF'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {att.url && (
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-gray-400 hover:text-white"
                      title="View file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => onDeleteAttachment(att.id)}
                    className="p-1 text-gray-500 hover:text-rose-400"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CARD 4: XERO INVOICING & RECEIPTS */}
      <div className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between border-b border-[#282828] pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-xs">Xero Accounting &amp; STC</h4>
              <span className="text-[10px] text-cyan-400 font-mono block">
                Two-Way Ledger Sync
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-800/30">
            {xeroInvoiceStatus || 'AUTHORISED'}
          </span>
        </div>

        {xeroActionNotice && (
          <div className="p-2 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-[11px] text-emerald-300 flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            <span>{xeroActionNotice}</span>
          </div>
        )}

        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Xero Tax Invoice:</span>
            <span className="font-mono text-white font-semibold">
              {xeroInvoiceNumber || project?.xeroInvoiceNumber || 'INV-2026-9041'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Invoice Total (AUD):</span>
            <span className="font-mono text-amber-400 font-bold text-sm">
              {xeroInvoiceTotal ? formatAudAccounts(xeroInvoiceTotal) : formData.amount || formData.sellingPrice || '$10,500.00'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Deposit Received:</span>
            <span className="font-mono text-emerald-400 font-semibold">
              {xeroReceiptNumber ? `REC: ${xeroReceiptNumber} (${formatAudAccounts(xeroReceiptAmount || 1000)})` : formData.deposit || '$1,000.00'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#262626]">
          <button
            type="button"
            onClick={onCreateXeroInvoice}
            className="w-full py-1.5 px-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors shadow-sm"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Create Invoice</span>
          </button>
          <button
            type="button"
            onClick={onGenerateXeroReceipt}
            className="w-full py-1.5 px-2 bg-[#222] hover:bg-[#2e2e2e] border border-[#3a3a3a] text-gray-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
          >
            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
            <span>Receipt Deposit</span>
          </button>
        </div>
      </div>

      {/* CARD 5: CUSTOMER PORTAL CREDENTIALS */}
      <div className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between border-b border-[#282828] pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800/40">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-xs">Customer Solar Portal</h4>
              <span className="text-[10px] text-amber-400 font-mono block">
                Live Customer Access
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-gray-400 bg-[#222] px-1.5 py-0.5 rounded border border-[#333]">
            AES-256
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Portal Link:</span>
            <a
              href="/portal/client"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#bef264] hover:underline flex items-center gap-1 font-mono text-[11px]"
            >
              <span>/portal/client</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-2.5 bg-[#121212] rounded-lg border border-[#262626] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-[11px]">Username / Email:</span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-white text-[11px] truncate max-w-[130px]">
                  {portalCredentials?.email || cleanEmail}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(portalCredentials?.email || cleanEmail, 'email')}
                  className="p-1 text-gray-400 hover:text-white"
                  title="Copy email"
                >
                  {copiedKey === 'email' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-[11px]">Temp Password:</span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-amber-300 text-[11px]">
                  {portalCredentials?.temporaryPassword || 'Solar2026!Pass'}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(portalCredentials?.temporaryPassword || 'Solar2026!Pass', 'pass')}
                  className="p-1 text-gray-400 hover:text-white"
                  title="Copy password"
                >
                  {copiedKey === 'pass' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onSendPortalInvite}
            className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Customer Portal Invite</span>
          </button>
        </div>
      </div>
    </div>
  );
};
