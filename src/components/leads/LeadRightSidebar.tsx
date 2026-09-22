import React, { useState, useRef } from 'react';
import { Lead, LeadAttachment, CustomerPortalCredentials } from '../../types';
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
  Plus
} from 'lucide-react';
import { formatAudAccounts, parseAudAccounts } from '../../utils/australianPostcodes';

interface LeadRightSidebarProps {
  lead?: Lead | null;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
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

export const LeadRightSidebar: React.FC<LeadRightSidebarProps> = ({
  lead,
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
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<LeadAttachment['category']>('Electricity Bill');
  const [uploadNotes, setUploadNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Lead Contact';
  const cleanEmail = formData.email ? formData.email.split(',')[0].trim() : 'customer@gmail.com';
  const cleanPhone = formData.primaryMobile || '0400 000 000';

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

  const copyToClipboard = (text: string, type: 'invite' | 'password') => {
    navigator.clipboard.writeText(text);
    if (type === 'invite') {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    } else {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
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
            {formData.hasCompany ? 'Commercial' : 'Residential'}
          </span>
        </div>

        <div className="space-y-2.5 pt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#222] to-[#333] border border-[#444] flex items-center justify-center text-xs font-bold text-white shrink-0">
              {(formData.firstName?.[0] || 'C') + (formData.lastName?.[0] || 'T')}
            </div>
            <div className="min-w-0">
              <span className="font-bold text-white text-xs block truncate">
                {fullName}
              </span>
              <span className="text-[11px] text-gray-400 truncate block">
                Owner: {formData.salesPersonName || 'Mitchell Barnes'}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-gray-300 pt-1">
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="text-gray-200 truncate">{cleanEmail}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="text-gray-200 font-mono">{cleanPhone}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[11px] text-gray-500 shrink-0 mt-0.5">Location:</span>
              <span className="text-gray-300 truncate">
                {formData.suburb || 'Sydney'}, {formData.state} {formData.postcode}
              </span>
            </div>
          </div>

          <div className="p-2 bg-[#121212] rounded-lg border border-[#262626] text-[11px] text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Synced automatically based on Lead Details.</span>
          </div>
        </div>
      </div>

      {/* CARD 2: COMPANY (Auto-Created & Associated) */}
      <div className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between border-b border-[#282828] pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-xs">Associated Company</h4>
              <span className="text-[10px] text-gray-400 font-mono block">
                {formData.hasCompany ? 'Auto-Created & Associated' : 'No Company Associated'}
              </span>
            </div>
          </div>
          {formData.hasCompany && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Commercial
            </span>
          )}
        </div>

        {formData.hasCompany ? (
          <div className="space-y-2.5 pt-1">
            <div>
              <span className="font-bold text-white text-xs block">
                {formData.companyName || 'Company Name Pending'}
              </span>
              <span className="text-[11px] text-gray-400">
                {formData.companyType || 'Commercial Customer'}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-gray-300">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Owner:</span>
                <span className="text-gray-200">
                  {formData.companyOwner || formData.salesPersonName || 'Mitchell Barnes'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">ABN Number:</span>
                <span className="font-mono text-[#bef264]">
                  {formData.companyAbn || 'Pending ABN'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Phone:</span>
                <span className="font-mono text-gray-200">
                  {formData.companyPhone || cleanPhone}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">City / Country:</span>
                <span className="text-gray-200">
                  {formData.companyCity || 'Sydney'}, {formData.companyCountry || 'Australia'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Create Date:</span>
                <span className="font-mono text-gray-400">
                  {formData.companyCreateDate || 'Today'}
                </span>
              </div>
            </div>

            <div className="p-2 bg-[#121212] rounded-lg border border-[#262626] text-[11px] text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Company entity provisioned &amp; attached to lead.</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1 text-center py-2">
            <p className="text-xs text-gray-400">
              No commercial company associated. This record is marked as a residential solar customer.
            </p>
            <button
              type="button"
              onClick={() =>
                setFormData((prev: any) => ({
                  ...prev,
                  hasCompany: true,
                  companyName: prev.companyName || `${fullName} Holdings Pty Ltd`,
                  companyOwner: prev.companyOwner || prev.salesPersonName || 'Mitchell Barnes',
                  companyCity: prev.companyCity || prev.suburb || 'Sydney',
                  companyPhone: prev.companyPhone || cleanPhone,
                  companyCountry: 'Australia',
                  companyType: 'Commercial Customer',
                  companyCreateDate: new Date().toISOString().split('T')[0]
                }))
              }
              className="px-3 py-1.5 bg-[#202020] hover:bg-[#2a2a2a] border border-[#383838] rounded-lg text-xs font-semibold text-[#bef264] inline-flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Associate Company</span>
            </button>
          </div>
        )}
      </div>

      {/* CARD 3: ATTACHMENTS (Multiple Documents Supported) */}
      <div className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between border-b border-[#282828] pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Paperclip className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-xs">Attachments &amp; Files</h4>
              <span className="text-[10px] text-gray-400 font-mono block">
                {attachments.length} document(s) attached
              </span>
            </div>
          </div>
        </div>

        {/* Upload Form */}
        <div className="p-3 bg-[#121212] rounded-lg border border-[#282828] space-y-2.5">
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1">
              Document Category
            </label>
            <select
              value={uploadCategory}
              onChange={e => setUploadCategory(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-[#181818] border border-[#333] rounded-lg text-xs text-white focus:outline-none"
            >
              <option value="Electricity Bill">Electricity Bill</option>
              <option value="Roof Photo">Roof Photo</option>
              <option value="Switchboard Photo">Switchboard Photo</option>
              <option value="Meter Box Photo">Meter Box Photo</option>
              <option value="DNSP Approval Letter">DNSP Approval Letter</option>
              <option value="Signed Contract">Signed Contract</option>
              <option value="Other">Other Document</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1">
              Document Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Ausgrid quarterly bill 34 kWh/day"
              value={uploadNotes}
              onChange={e => setUploadNotes(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#181818] border border-[#333] rounded-lg text-xs text-white focus:outline-none"
            />
          </div>

          <div className="pt-1">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 bg-[#222] hover:bg-[#2a2a2a] border border-[#383838] rounded-lg text-xs font-semibold text-gray-200 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-[#bef264]" />
              <span>Choose &amp; Upload Document</span>
            </button>
          </div>
        </div>

        {/* Existing Attachments List */}
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {attachments.map(att => (
            <div
              key={att.id}
              className="p-2.5 bg-[#141414] border border-[#262626] rounded-lg flex items-center justify-between gap-2 text-xs"
            >
              <div className="min-w-0 flex-1">
                <span className="font-medium text-white truncate block">{att.name}</span>
                <span className="text-[10px] text-gray-500 font-mono block">
                  {att.category} • {(att.sizeBytes / 1024).toFixed(0)} KB
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onDeleteAttachment(att.id)}
                  className="p-1 rounded text-gray-500 hover:text-rose-400 transition-colors"
                  title="Remove document"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {attachments.length === 0 && (
            <div className="text-center py-2 text-xs text-gray-500">
              No files uploaded yet.
            </div>
          )}
        </div>
      </div>

      {/* CARD 4: XERO ACCOUNTING (Tax Invoice & Payment Receipts) */}
      <div className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between border-b border-[#282828] pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-xs">Xero Accounting</h4>
              <span className="text-[10px] text-gray-400 font-mono block">
                Invoicing &amp; Receipts
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
            Xero API
          </span>
        </div>

        {xeroActionNotice && (
          <div className="p-2 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-xs text-emerald-300">
            {xeroActionNotice}
          </div>
        )}

        <div className="space-y-3 pt-1">
          {/* Tax Invoice Module */}
          <div className="p-3 bg-[#121212] rounded-lg border border-[#282828] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Tax Invoice</span>
              {xeroInvoiceNumber ? (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {xeroInvoiceNumber}
                </span>
              ) : (
                <span className="text-[10px] text-gray-500">Not Generated</span>
              )}
            </div>

            {xeroInvoiceNumber ? (
              <div className="text-xs text-gray-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total:</span>
                  <span className="font-mono text-white">${formatAudAccounts(xeroInvoiceTotal || 0)} AUD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className="text-emerald-400">{xeroInvoiceStatus || 'Sent to Customer'}</span>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={onCreateXeroInvoice}
              className="w-full py-1.5 bg-[#202020] hover:bg-[#282828] border border-[#383838] rounded-lg text-xs font-semibold text-cyan-300 hover:text-cyan-200 transition-colors flex items-center justify-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{xeroInvoiceNumber ? 'Sync / Update Xero Invoice' : 'Create Tax Invoice in Xero'}</span>
            </button>
          </div>

          {/* Payment Receipt Module */}
          <div className="p-3 bg-[#121212] rounded-lg border border-[#282828] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Payment Receipt</span>
              {xeroReceiptNumber ? (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {xeroReceiptNumber}
                </span>
              ) : (
                <span className="text-[10px] text-gray-500">No Receipt</span>
              )}
            </div>

            {xeroReceiptNumber ? (
              <div className="text-xs text-gray-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Deposit Paid:</span>
                  <span className="font-mono text-emerald-400">${formatAudAccounts(xeroReceiptAmount || 0)} AUD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date:</span>
                  <span className="text-gray-300">{xeroReceiptDate || 'Recent'}</span>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={onGenerateXeroReceipt}
              className="w-full py-1.5 bg-[#202020] hover:bg-[#282828] border border-[#383838] rounded-lg text-xs font-semibold text-emerald-300 hover:text-emerald-200 transition-colors flex items-center justify-center gap-1.5"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>{xeroReceiptNumber ? 'Re-issue Payment Receipt' : 'Generate Payment Receipt'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* CARD 5: CUSTOMER PORTAL CREDENTIALS */}
      {portalCredentials && (
        <div className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 space-y-3 shadow-md">
          <div className="flex items-center justify-between border-b border-[#282828] pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-xs">Customer Portal</h4>
                <span className="text-[10px] text-emerald-400 font-mono block">
                  {portalCredentials.status || 'Active'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[11px] text-gray-500 block">Username:</span>
              <span className="font-mono text-gray-200">{portalCredentials.username}</span>
            </div>
            <div>
              <span className="text-[11px] text-gray-500 block">Temp Password:</span>
              <div className="flex items-center justify-between bg-[#121212] p-1.5 rounded border border-[#282828]">
                <span className="font-mono text-[#bef264]">{portalCredentials.tempPassword}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(portalCredentials.tempPassword, 'password')}
                  className="text-gray-400 hover:text-white p-1"
                >
                  {copiedPassword ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={onSendPortalInvite}
              className="w-full py-1.5 bg-[#202020] hover:bg-[#282828] border border-[#383838] rounded-lg text-xs font-semibold text-emerald-300 hover:text-emerald-200 transition-colors flex items-center justify-center gap-1.5 mt-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Resend Portal Invite Email</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
