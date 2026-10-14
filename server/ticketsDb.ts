import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Ticket } from '../src/types/index.ts';
import { getSupabase } from './supabase.ts';

const TICKETS_CACHE_FILE = path.join(process.cwd(), '.tickets_db.json');

function toDeterministicUuid(id: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;
  const hash = crypto.createHash('md5').update(id || 'ticket-default').digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    '8' + hash.substring(17, 20),
    hash.substring(20, 32)
  ].join('-');
}

function cleanNumeric(val: any, fallback = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? fallback : num;
  }
  return fallback;
}

function cleanDate(val: any): string | null {
  if (!val) return null;
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString().substring(0, 10);
  }
  return null;
}

function loadLocalTickets(): Ticket[] {
  try {
    if (fs.existsSync(TICKETS_CACHE_FILE)) {
      const raw = fs.readFileSync(TICKETS_CACHE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('[TicketsDb] Failed reading local tickets cache:', err);
  }
  return [];
}

function saveLocalTickets(tickets: Ticket[]) {
  try {
    fs.writeFileSync(TICKETS_CACHE_FILE, JSON.stringify(tickets, null, 2), 'utf8');
  } catch (err) {
    console.warn('[TicketsDb] Failed writing local tickets cache:', err);
  }
}

export function mapDbRowToTicket(row: any): Ticket {
  const fName = row.first_name || '';
  const lName = row.last_name || '';
  const customerName = `${fName} ${lName}`.trim() || 'Valued Customer';
  const rawStatus = row.issue_resolution_status || row.resolution_status || 'Open';

  // Map database status string to UI status
  let status = rawStatus;
  if (rawStatus === 'Open') status = 'New';
  else if (rawStatus === 'Pending') status = 'In Progress';
  else if (rawStatus === 'Resolved') status = 'Resolved';
  else if (rawStatus === 'Closed') status = 'Closed';

  return {
    id: row.id,
    ticketId: row.ticket_id || `TKT-${row.id.substring(0, 8)}`,
    ticketNumber: row.ticket_id || `TKT-${row.id.substring(0, 8)}`,
    projectId: row.project_id || row.installation_project_no || '',
    projectCode: row.installation_project_no || '',
    customerId: '',
    customerName,
    customerPhone: row.contact_number || '',
    title: row.issue_recorded || `Ticket ${row.ticket_id}`,
    description: row.work_required || row.service_issue_notes || '',
    category: row.issue_recorded || 'General Query',
    priority: 'Medium',
    status,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
    assignedTechnician: row.service_handler || row.installer_name || '',
    resolutionNotes: row.work_required || '',

    // Detailed Left Panel Fields
    installationProjectNo: row.installation_project_no || '',
    installationDate: row.installation_date || '',
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    contactNumber: row.contact_number || '',
    emailId: row.email_id || '',
    address: row.address || '',
    suburb: row.suburb || '',
    postCode: row.post_code || '',
    state: row.state || 'NSW',
    phase: row.phase || 'Single Phase',
    storeyType: row.storey_type || 'Single Storey',
    issueRecorded: row.issue_recorded || '',
    initialCheck: row.initial_check || '',
    workRequired: row.work_required || '',
    issueResolutionStatus: row.issue_resolution_status || rawStatus,

    // Existing Hardware
    noOfExistingInverters: row.no_of_existing_inverters ?? 1,
    existingInverterSerialNumber: row.existing_inverter_serials || '',
    existingInverterBrand: row.existing_inverter_brand || '',
    existingInverterModel: row.existing_inverter_model || '',
    existingInverterSize: row.existing_inverter_size || '',
    noOfExistingPanels: row.no_of_existing_panels ?? 0,
    affectedPanelSerialNumber: row.affected_panel_serials || '',
    existingPanelBrand: row.existing_panel_brand || '',
    existingPanelModel: row.existing_panel_model || '',
    existingPanelSize: row.existing_panel_size || '',
    affectedBatterySerialNumber: row.affected_battery_serials || '',
    existingBatteryBrand: row.existing_battery_brand || '',
    existingBatteryModel: row.existing_battery_model || '',
    existingBatterySize: row.existing_battery_size_capacity || '',
    serviceIssueNotes: row.service_issue_notes || '',

    // Replaced Hardware
    noOfReplacedInverters: row.no_of_replaced_inverters ?? 0,
    replacedInverterSerialNumber: row.replaced_inverter_serials || '',
    replacedInverterBrand: row.replaced_inverter_brand || '',
    replacedInverterModel: row.replaced_inverter_model || '',
    replacedInverterSize: row.replaced_inverter_size || '',
    noOfReplacedPanels: row.no_of_replaced_panels ?? 0,
    replacedPanelSerialNumber: row.replaced_panel_serials || '',
    replacedPanelBrand: row.replaced_panel_brand || '',
    replacedPanelModel: row.replaced_panel_model || '',
    replacedPanelSize: row.replaced_panel_size || '',
    replacedBatterySerialNumber: row.replaced_battery_serials || '',
    replacedBatteryBrand: row.replaced_battery_brand || '',
    replacedBatteryModel: row.replaced_battery_model || '',
    replacedBatterySize: row.replaced_battery_size_capacity || '',

    // Warranty Claim
    warrantyClaimDate: row.warranty_claim_date || '',
    warrantyClaimId: row.warranty_claim_id || '',
    warrantyClaimStatus: row.warranty_claim_status || 'Draft',
    warrantyClaimInvoiceNumber: row.claim_invoice_number || '',
    warrantyClaimInvoiceAmount: row.claim_invoice_amount_aud ?? 0,
    warrantyClaimInvoiceStatus: row.claim_invoice_status || '',
    brandNotes: row.brand_notes || '',

    // Electrician / Subcontractor
    installerOrElectricianName: row.installer_name || '',
    installerPhone: row.installer_contact_number || '',
    installerEmail: row.installer_email || '',
    companyName: row.installer_company_name || '',
    installerInvoiceDate: row.installer_invoice_date || '',
    installerInvoiceNumber: row.installer_invoice_number || '',
    installerInvoiceAmount: row.installer_invoice_amount_aud ?? 0,
    installerInvoiceStatus: row.installer_invoice_status || '',
    installerElectricianNotes: row.installer_notes || '',

    // Resolution & Service Financials
    issueResolutionDate: row.issue_resolution_date || '',
    serviceHandler: row.service_handler || '',
    serviceCharge: row.service_charge_aud ?? 0,
    totalServiceIssueAmount: row.total_amount_aud ?? 0
  };
}

export function convertTicketToDbRow(t: Ticket, existingRow?: any) {
  const deterministicId = toDeterministicUuid(t.id || t.ticketNumber || `tkt-${Date.now()}`);

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let linkedProjectId: string | null = null;
  if (t.projectId && uuidRegex.test(t.projectId)) {
    linkedProjectId = t.projectId;
  }

  // Parse first and last name if not explicitly set
  let fName = t.firstName || '';
  let lName = t.lastName || '';
  if (!fName && t.customerName) {
    const parts = t.customerName.trim().split(' ');
    fName = parts[0] || '';
    lName = parts.slice(1).join(' ') || '';
  }

  return {
    id: existingRow?.id || deterministicId,
    ticket_id: (t as any).ticketId || (t as any).ticket_id || t.ticketNumber || t.id || `TKT-${Date.now()}`,
    installation_project_no: t.installationProjectNo || t.projectCode || 'PRJ-UNKNOWN',
    project_id: linkedProjectId,
    installation_date: cleanDate(t.installationDate),
    first_name: fName || null,
    last_name: lName || null,
    contact_number: t.contactNumber || t.customerPhone || null,
    email_id: t.emailId || null,
    address: t.address || null,
    suburb: t.suburb || null,
    post_code: t.postCode || null,
    state: t.state || 'NSW',
    phase: t.phase || 'Single Phase',
    storey_type: t.storeyType || 'Single Storey',

    // Diagnostics & Work
    issue_recorded: t.issueRecorded || t.title || null,
    initial_check: t.initialCheck || null,
    work_required: t.workRequired || t.description || null,
    issue_resolution_status: t.issueResolutionStatus || t.status || 'Open',

    // Existing Hardware
    no_of_existing_inverters: Math.round(cleanNumeric(t.noOfExistingInverters, 1)),
    existing_inverter_brand: t.existingInverterBrand || null,
    existing_inverter_model: t.existingInverterModel || null,
    existing_inverter_size: t.existingInverterSize ? String(t.existingInverterSize) : null,
    existing_inverter_serials: t.existingInverterSerialNumber || null,
    no_of_existing_panels: Math.round(cleanNumeric(t.noOfExistingPanels, 0)),
    existing_panel_brand: t.existingPanelBrand || null,
    existing_panel_model: t.existingPanelModel || null,
    existing_panel_size: t.existingPanelSize ? String(t.existingPanelSize) : null,
    affected_panel_serials: t.affectedPanelSerialNumber || null,
    existing_battery_brand: t.existingBatteryBrand || null,
    existing_battery_model: t.existingBatteryModel || null,
    existing_battery_size_capacity: t.existingBatterySize ? String(t.existingBatterySize) : null,
    affected_battery_serials: t.affectedBatterySerialNumber || null,
    service_issue_notes: t.serviceIssueNotes || null,

    // Replaced Hardware
    no_of_replaced_inverters: Math.round(cleanNumeric(t.noOfReplacedInverters, 0)),
    replaced_inverter_brand: t.replacedInverterBrand || null,
    replaced_inverter_model: t.replacedInverterModel || null,
    replaced_inverter_size: t.replacedInverterSize ? String(t.replacedInverterSize) : null,
    replaced_inverter_serials: t.replacedInverterSerialNumber || null,
    no_of_replaced_panels: Math.round(cleanNumeric(t.noOfReplacedPanels, 0)),
    replaced_panel_brand: t.replacedPanelBrand || null,
    replaced_panel_model: t.replacedPanelModel || null,
    replaced_panel_size: t.replacedPanelSize ? String(t.replacedPanelSize) : null,
    replaced_panel_serials: t.replacedPanelSerialNumber || null,
    replaced_battery_brand: t.replacedBatteryBrand || null,
    replaced_battery_model: t.replacedBatteryModel || null,
    replaced_battery_size_capacity: t.replacedBatterySize ? String(t.replacedBatterySize) : null,
    replaced_battery_serials: t.replacedBatterySerialNumber || null,

    // Warranty Claim
    warranty_claim_date: cleanDate(t.warrantyClaimDate),
    warranty_claim_id: t.warrantyClaimId || null,
    warranty_claim_status: t.warrantyClaimStatus || 'Draft',
    claim_invoice_number: t.warrantyClaimInvoiceNumber || null,
    claim_invoice_amount_aud: cleanNumeric(t.warrantyClaimInvoiceAmount, 0),
    claim_invoice_status: t.warrantyClaimInvoiceStatus || null,
    brand_notes: t.brandNotes || null,

    // Electrician / Subcontractor
    installer_name: t.installerOrElectricianName || null,
    installer_contact_number: t.installerPhone || null,
    installer_email: t.installerEmail || null,
    installer_company_name: t.companyName || null,
    installer_invoice_date: cleanDate(t.installerInvoiceDate),
    installer_invoice_number: t.installerInvoiceNumber || null,
    installer_invoice_amount_aud: cleanNumeric(t.installerInvoiceAmount, 0),
    installer_invoice_status: t.installerInvoiceStatus || null,
    installer_notes: t.installerElectricianNotes || null,

    // Resolution & Billing
    resolution_status: t.issueResolutionStatus || t.status || 'Pending',
    issue_resolution_date: cleanDate(t.issueResolutionDate),
    service_handler: t.serviceHandler || null,
    service_charge_aud: cleanNumeric(t.serviceCharge, 0),
    total_amount_aud: cleanNumeric(t.totalServiceIssueAmount, cleanNumeric(t.installerInvoiceAmount, 0))
  };
}

export async function getDbTickets(): Promise<Ticket[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('customer_support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const mapped = data.map(mapDbRowToTicket);
        saveLocalTickets(mapped);
        return mapped;
      }
      if (error) {
        console.warn('[TicketsDb] Supabase fetch error:', error.message);
      }
    } catch (err) {
      console.warn('[TicketsDb] Exception fetching tickets from Supabase:', err);
    }
  }

  return loadLocalTickets();
}

export async function getDbTicketById(id: string): Promise<Ticket | null> {
  const supabase = getSupabase();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (supabase) {
    try {
      let query = supabase.from('customer_support_tickets').select('*');
      if (uuidRegex.test(id)) {
        query = query.or(`id.eq.${id},ticket_id.eq.${id}`);
      } else {
        query = query.eq('ticket_id', id);
      }
      const { data, error } = await query.limit(1);
      if (!error && data && data.length > 0) {
        return mapDbRowToTicket(data[0]);
      }
    } catch (err) {
      console.warn('[TicketsDb] Error fetching ticket by id:', err);
    }
  }

  const local = loadLocalTickets();
  return local.find(t => t.id === id || t.ticketNumber === id) || null;
}

export async function saveSingleDbTicket(ticket: Ticket): Promise<Ticket> {
  const supabase = getSupabase();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  let existingDbRow: any = null;
  if (supabase) {
    try {
      let query = supabase.from('customer_support_tickets').select('id, ticket_id');
      const searchId = ticket.id;
      const searchNum = ticket.ticketNumber;

      if (searchId && uuidRegex.test(searchId)) {
        query = query.or(`id.eq.${searchId},ticket_id.eq.${searchId}${searchNum ? `,ticket_id.eq.${searchNum}` : ''}`);
      } else if (searchNum) {
        query = query.eq('ticket_id', searchNum);
      }
      const { data } = await query.limit(1);
      if (data && data.length > 0) {
        existingDbRow = data[0];
      }
    } catch {}
  }

  const row = convertTicketToDbRow(ticket, existingDbRow);

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('customer_support_tickets')
        .upsert(row)
        .select();

      if (error) {
        console.error('[TicketsDb] Failed to upsert ticket in Supabase:', error.message);
      } else if (data && data[0]) {
        const saved = mapDbRowToTicket(data[0]);
        // Update local cache
        const local = loadLocalTickets();
        const updatedLocal = [saved, ...local.filter(t => t.id !== saved.id && t.ticketNumber !== saved.ticketNumber)];
        saveLocalTickets(updatedLocal);
        return saved;
      }
    } catch (err) {
      console.error('[TicketsDb] Exception upserting ticket in Supabase:', err);
    }
  }

  // Fallback to local cache
  const local = loadLocalTickets();
  const fallbackTicket: Ticket = {
    ...ticket,
    id: row.id,
    ticketNumber: row.ticket_id,
    updatedAt: new Date().toISOString()
  };
  const updatedLocal = [fallbackTicket, ...local.filter(t => t.id !== fallbackTicket.id && t.ticketNumber !== fallbackTicket.ticketNumber)];
  saveLocalTickets(updatedLocal);
  return fallbackTicket;
}

export async function deleteDbTicket(id: string): Promise<boolean> {
  const supabase = getSupabase();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (supabase) {
    try {
      if (uuidRegex.test(id)) {
        await supabase.from('customer_support_tickets').delete().eq('id', id);
      } else {
        await supabase.from('customer_support_tickets').delete().eq('ticket_id', id);
      }
    } catch (err) {
      console.warn('[TicketsDb] Error deleting ticket from Supabase:', err);
    }
  }

  const local = loadLocalTickets();
  const filtered = local.filter(t => t.id !== id && t.ticketNumber !== id);
  saveLocalTickets(filtered);
  return true;
}

export async function deleteDbTicketsBatch(ids: string[]): Promise<boolean> {
  const supabase = getSupabase();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (supabase && ids.length > 0) {
    try {
      const validUuids = ids.filter(id => uuidRegex.test(id));
      const textIds = ids.filter(id => !uuidRegex.test(id));

      if (validUuids.length > 0) {
        await supabase.from('customer_support_tickets').delete().in('id', validUuids);
      }
      if (textIds.length > 0) {
        await supabase.from('customer_support_tickets').delete().in('ticket_id', textIds);
      }
    } catch (err) {
      console.warn('[TicketsDb] Error batch deleting tickets from Supabase:', err);
    }
  }

  const local = loadLocalTickets();
  const idSet = new Set(ids);
  const filtered = local.filter(t => !idSet.has(t.id) && !idSet.has(t.ticketNumber));
  saveLocalTickets(filtered);
  return true;
}
