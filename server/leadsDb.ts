import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getSupabase, getSupabaseUrl, getSupabaseKey } from './supabase.ts';
import { Lead } from '../src/types/index.ts';
import {
  isLeadAlreadyInSystem,
  applySheetUpdatesToLead,
  sortLeadsByDateDesc,
  normalizeEmailForComparison,
  normalizePhoneForComparison,
  normalizeNameForComparison,
  normalizeAddressForComparison,
  areDistinctProperties
} from '../src/utils/googleSheetsTemplate.ts';
export { toDeterministicUuid };
import { ensureContactsForLeads, toDeterministicUuid } from './contactsDb.ts';

const LEADS_DB_FILE = path.join(process.cwd(), '.leads_db.json');

export function mapSupabaseRowToLead(d: any): Lead {
  const meta = (d.metadata && typeof d.metadata === 'object') ? d.metadata : {};
  const fullName = d.customer_name || d.full_name || `${d.first_name || ''} ${d.last_name || ''}`.trim() || 'Lead Customer';
  const fName = d.first_name || (fullName.split(' ')[0] || '');
  const lName = d.last_name || (fullName.split(' ').slice(1).join(' ') || '');
  const cleanPhone = d.primary_mobile || d.phone || d.phone_number || meta.primary_mobile || '';

  const rawSysPrice = d.system_price_aud ?? d.system_price ?? d.budget_aud ?? meta.system_price_aud ?? meta.system_price ?? meta.budget_aud;
  const sysPriceStr = rawSysPrice !== null && rawSysPrice !== undefined && rawSysPrice !== ''
    ? (typeof rawSysPrice === 'number' ? `$${rawSysPrice}` : String(rawSysPrice).startsWith('$') ? String(rawSysPrice) : `$${rawSysPrice}`)
    : '';

  const rawSellingPrice = d.selling_price ?? d.quoted_price_aud ?? meta.selling_price ?? meta.quoted_price_aud;
  const sellingPriceStr = rawSellingPrice !== null && rawSellingPrice !== undefined && rawSellingPrice !== ''
    ? (typeof rawSellingPrice === 'number' ? `$${rawSellingPrice}` : String(rawSellingPrice).startsWith('$') ? String(rawSellingPrice) : `$${rawSellingPrice}`)
    : '';

  const rawDeposit = d.deposit_aud ?? d.deposit ?? meta.deposit_aud ?? meta.deposit;
  const depositStr = rawDeposit !== null && rawDeposit !== undefined && rawDeposit !== ''
    ? (typeof rawDeposit === 'number' ? `$${rawDeposit}` : String(rawDeposit).startsWith('$') ? String(rawDeposit) : `$${rawDeposit}`)
    : '';

  const depositDate = d.deposit_received_date || meta.deposit_received_date || undefined;

  let resolvedSysKw: number | null = null;
  const sysCandidates = [
    d.system_size_kw,
    d.system_size,
    d.system_kw,
    d.system_size_kwp,
    meta.system_size_kw,
    meta.system_size,
    meta.system_kw
  ];
  for (const c of sysCandidates) {
    if (c !== null && c !== undefined && c !== '') {
      const num = cleanNumeric(c);
      if (num !== null && num > 0) {
        resolvedSysKw = num;
        break;
      }
    }
  }

  // Calculate from panels if system size was not found or was stored as 0
  const pCount = cleanNumeric(d.no_of_panels ?? d.panel_count ?? meta.no_of_panels ?? meta.panel_count);
  const pSizeW = cleanNumeric(d.panel_size_w ?? d.panel_size ?? meta.panel_size_w ?? meta.panel_size);
  if ((!resolvedSysKw || resolvedSysKw <= 0) && pCount !== null && pCount > 0 && pSizeW !== null && pSizeW > 0) {
    resolvedSysKw = Math.round((pCount * pSizeW / 1000) * 100) / 100;
  }
  const parsedSysKw = (resolvedSysKw !== null && resolvedSysKw > 0) ? resolvedSysKw : undefined;

  // Inverter Size (kW) resolution
  const rawInvSize = d.inverter_size_kw ?? d.inverter_size ?? d.inverter_kw ?? meta.inverter_size_kw ?? meta.inverter_size ?? meta.inverter_kw;
  let parsedInvSize = cleanNumeric(rawInvSize);
  const invModelStr = String(d.inverter_model || meta.inverter_model || '').trim();
  if ((!parsedInvSize || parsedInvSize <= 0) && invModelStr) {
    const match = invModelStr.match(/(?:-|\b|_)([0-9]+(?:\.[0-9]+)?)\s*(?:k|kw|rt|rs|ktl)?\b/i);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val >= 1 && val <= 250) {
        parsedInvSize = val;
      }
    }
  }

  const isBatteryReq = d.battery_required !== undefined ? Boolean(d.battery_required) : Boolean(meta.battery_required);
  const rawBatStorage = isBatteryReq ? cleanNumeric(d.battery_storage_kwh ?? d.battery_storage ?? d.battery_usable_capacity_kwh ?? meta.battery_storage_kwh ?? meta.battery_usable_capacity_kwh) : null;

  return {
    id: meta.original_id || d.id,
    contactId: d.contact_id || meta.contact_id || undefined,
    projectNumber: d.project_number || undefined,
    leadDate: d.lead_date || undefined,
    platform: d.platform || '',
    salesPersonName: d.sales_person_name || '',
    state: d.state || 'NSW',
    postcode: d.postcode || '',
    area: d.area || meta.area || '',
    nearestBigCity: d.nearest_big_city || meta.nearest_big_city || '',
    status: d.status || 'New',
    saleDate: d.sale_date || meta.sale_date || undefined,
    firstName: fName,
    lastName: lName,
    managerRenteeFirstName: d.manager_rentee_first_name || meta.manager_rentee_first_name || '',
    managerRenteeLastName: d.manager_rentee_last_name || meta.manager_rentee_last_name || '',
    address: d.address || '',
    suburb: d.suburb || '',
    addressVerified: d.address_verified !== undefined ? Boolean(d.address_verified) : Boolean(meta.address_verified),
    primaryMobile: cleanPhone,
    secondaryMobile: d.secondary_mobile || meta.secondary_mobile || '',
    email: d.email || '',
    salesTeamNotes: d.sales_team_notes || d.notes || meta.sales_team_notes || '',
    systemPrice: sysPriceStr,
    sellingPrice: sellingPriceStr,
    deposit: depositStr,
    depositReceivedDate: depositDate,
    customerName: fullName,
    phone: cleanPhone,
    systemSizeKw: parsedSysKw,
    batteryRequired: isBatteryReq,
    propertyType: d.property_type || meta.property_type || 'Residential',
    roofType: d.roof_type || meta.roof_type || '',
    phaseType: d.electrical_phase || d.phase_type || d.phase || meta.electrical_phase || meta.phase_type || meta.phase || '',
    houseStorey: d.house_storey || meta.house_storey || '',
    panelManufacturer: d.panel_manufacturer || meta.panel_manufacturer || '',
    panelModel: d.panel_model || meta.panel_model || '',
    panelSizeW: d.panel_size_w || (d.panel_size !== null && d.panel_size !== undefined ? String(d.panel_size) : undefined) || meta.panel_size_w || undefined,
    panelSeries: d.panel_series || meta.panel_series || undefined,
    noOfPanels: d.no_of_panels || d.panel_count || meta.no_of_panels || undefined,
    inverterManufacturer: d.inverter_manufacturer || meta.inverter_manufacturer || '',
    inverterModel: invModelStr,
    inverterSeries: d.inverter_series || meta.inverter_series || undefined,
    inverterSizeKw: parsedInvSize !== null && parsedInvSize > 0 ? parsedInvSize : undefined,
    noOfInverters: d.no_of_inverters || meta.no_of_inverters || undefined,
    batteryManufacturer: d.battery_manufacturer || meta.battery_manufacturer || '',
    batteryModel: d.battery_model || meta.battery_model || '',
    batteryUsableCapacityKwh: isBatteryReq && rawBatStorage !== null ? rawBatStorage : undefined,
    batterySize: d.battery_size || meta.battery_size || undefined,
    noOfBatteries: isBatteryReq ? (d.no_of_batteries || meta.no_of_batteries || undefined) : undefined,
    quarterlyBillAud: d.quarterly_bill_aud !== null && d.quarterly_bill_aud !== undefined ? Number(d.quarterly_bill_aud) : (meta.quarterly_bill_aud ? Number(meta.quarterly_bill_aud) : undefined),
    docsReceived: d.docs_received || meta.docs_received || undefined,
    docsReceivedDate: d.docs_received_date || meta.docs_received_date || undefined,
    existingSystemDetails: d.existing_system_details || meta.existing_system_details || undefined,
    source: d.source || d.platform || 'Website',
    sheetSyncRowId: d.sheet_sync_row_id || meta.sheet_sync_row_id || undefined,
    createdAt: d.created_at || d.lead_date || undefined,
    assignedTo: d.assigned_to || d.sales_person_name || '',
    activities: Array.isArray(meta.activities) ? meta.activities : [],
    attachments: Array.isArray(meta.attachments) ? meta.attachments : [],
    portalCredentials: meta.portal_credentials || undefined,
    xeroInvoiceId: d.xero_invoice_id || meta.xero_invoice_id || undefined,
    xeroInvoiceNumber: d.xero_invoice_number || meta.xero_invoice_number || undefined,
    xeroInvoiceTotal: d.xero_invoice_total || meta.xero_invoice_total || undefined,
    xeroInvoiceStatus: d.xero_invoice_status || meta.xero_invoice_status || undefined
  };
}

/**
 * Reads all leads from persistent server store.
 * When Supabase is configured and contains records, Supabase is the single source of truth.
 */
export async function getDbLeads(): Promise<Lead[]> {
  let fileLeads: Lead[] = [];
  try {
    if (fs.existsSync(LEADS_DB_FILE)) {
      const raw = fs.readFileSync(LEADS_DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        fileLeads = parsed;
      }
    }
  } catch (err) {
    console.error('[LeadsDb] Error reading .leads_db.json:', err);
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        // Map Supabase rows & metadata JSONB to the full Lead interface
        const sbLeads: Lead[] = data.map(d => mapSupabaseRowToLead(d));

        // Supabase is authoritative! Cache to local file and return
        try {
          fs.writeFileSync(LEADS_DB_FILE, JSON.stringify(sbLeads, null, 2), 'utf-8');
        } catch {}
        return sortLeadsByDateDesc(sbLeads);
      }
    } catch (err: any) {
      console.warn('[LeadsDb] Warning querying Supabase leads table:', err.message || err);
    }
  }

  return sortLeadsByDateDesc(fileLeads);
}

/**
 * Fetches a single lead directly from Supabase by ID or UUID.
 */
export async function getDbLeadById(id: string): Promise<Lead | null> {
  if (!id) return null;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const targetUuid = toDeterministicUuid(id);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isIdUuid = uuidRegex.test(id);
      const isTargetUuid = uuidRegex.test(targetUuid);

      let query = supabase.from('leads').select('*');

      if (isIdUuid && targetUuid === id) {
        query = query.eq('id', id);
      } else if (isTargetUuid && isIdUuid) {
        query = query.or(`id.eq.${targetUuid},id.eq.${id}`);
      } else if (isTargetUuid) {
        query = query.eq('id', targetUuid);
      } else if (isIdUuid) {
        query = query.eq('id', id);
      }

      let { data, error } = await query.limit(1);

      if ((error || !data || data.length === 0) && !isIdUuid) {
        // Fallback: check by sheet_sync_row_id or project_number or metadata original_id
        const fallback = await supabase
          .from('leads')
          .select('*')
          .or(`sheet_sync_row_id.eq.${id},project_number.eq.${id}`)
          .limit(1);
        if (!fallback.error && fallback.data && fallback.data.length > 0) {
          data = fallback.data;
          error = null;
        }
      }

      if (!error && Array.isArray(data) && data.length > 0) {
        const lead = mapSupabaseRowToLead(data[0]);

        // Sync local cache
        try {
          if (fs.existsSync(LEADS_DB_FILE)) {
            const raw = fs.readFileSync(LEADS_DB_FILE, 'utf-8');
            const fileLeads: Lead[] = JSON.parse(raw);
            const idx = fileLeads.findIndex(l => l.id === lead.id || l.id === id || toDeterministicUuid(l.id) === targetUuid);
            if (idx >= 0) {
              fileLeads[idx] = lead;
            } else {
              fileLeads.unshift(lead);
            }
            fs.writeFileSync(LEADS_DB_FILE, JSON.stringify(fileLeads, null, 2), 'utf-8');
          }
        } catch {}

        return lead;
      }
    } catch (err: any) {
      console.warn('[LeadsDb] Error fetching single lead from Supabase:', err.message || err);
    }
  }

  // Fallback to local file store
  const all = await getDbLeads();
  const found = all.find(l => l.id === id || toDeterministicUuid(l.id) === toDeterministicUuid(id));
  return found || null;
}

let cachedLeadColumns: Set<string> | null = null;
let lastLeadColumnsFetch = 0;

export async function getLeadTableColumns(supabase: any): Promise<Set<string>> {
  const now = Date.now();
  if (cachedLeadColumns && (now - lastLeadColumnsFetch < 30000)) {
    return cachedLeadColumns;
  }
  try {
    const url = getSupabaseUrl();
    const key = getSupabaseKey();
    if (url && key) {
      const res = await fetch(`${url}/rest/v1/`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
      });
      if (res.ok) {
        const spec = await res.json();
        const props = spec?.definitions?.leads?.properties;
        if (props && typeof props === 'object' && Object.keys(props).length > 0) {
          cachedLeadColumns = new Set(Object.keys(props));
          lastLeadColumnsFetch = now;
          return cachedLeadColumns;
        }
      }
    }
  } catch (e) {
    console.warn('[LeadsDb] Could not inspect OpenAPI leads columns:', e);
  }
  return cachedLeadColumns || new Set([
    'id', 'project_number', 'lead_date', 'platform', 'sales_person_name', 'state',
    'first_name', 'last_name', 'full_name', 'customer_name', 'email', 'phone', 'phone_number',
    'primary_mobile', 'secondary_mobile', 'address', 'suburb', 'postcode', 'area',
    'nearest_big_city', 'manager_rentee_first_name', 'manager_rentee_last_name',
    'system_size', 'system_size_kw', 'panel_count', 'no_of_panels', 'panel_manufacturer', 'panel_model',
    'panel_size', 'panel_size_w', 'panel_series', 'inverter_size_kw', 'no_of_inverters',
    'inverter_manufacturer', 'inverter_model', 'inverter_series', 'battery_storage', 'battery_storage_kwh',
    'battery_usable_capacity_kwh', 'battery_required', 'no_of_batteries', 'battery_manufacturer', 'battery_model',
    'property_type', 'roof_type', 'house_storey', 'electrical_phase', 'phase', 'phase_type',
    'budget_aud', 'system_price_aud', 'deposit_aud', 'deposit', 'deposit_received_date',
    'sale_date', 'quoted_price_aud', 'selling_price', 'status', 'stage', 'source',
    'notes', 'docs_received', 'docs_received_date', 'existing_system_details',
    'os_id', 'assigned_to', 'metadata', 'created_at', 'updated_at'
  ]);
}

function cleanNumeric(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

function cleanInt(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : Math.round(val);
  const cleaned = String(val).replace(/[^0-9-]/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Transforms a Lead object into a Supabase table row matching database columns & JSONB metadata
 */
function leadToSupabaseRow(l: Lead, allowedColumns?: Set<string>): Record<string, any> {
  const fullName = l.customerName || `${l.firstName || ''} ${l.lastName || ''}`.trim() || null;
  const firstName = l.firstName || (fullName ? fullName.split(' ')[0] : null);
  const lastName = l.lastName || (fullName ? fullName.split(' ').slice(1).join(' ') : null);
  const cleanPhone = l.phone || l.primaryMobile || null;
  const quotedPrice = cleanNumeric(l.sellingPrice || (l as any).quotedPriceAud || l.systemPrice);
  const sysPrice = cleanNumeric(l.systemPrice || (l as any).systemPriceAud || (l as any).budgetAud);
  const depVal = cleanNumeric(l.deposit || (l as any).depositAud);
  const depDate = l.depositReceivedDate || null;
  const rawSysNum = cleanNumeric(l.systemSizeKw);
  const panelCount = typeof l.noOfPanels === 'number' ? l.noOfPanels : (parseInt(String(l.noOfPanels || ''), 10) || null);
  const panelSizeNum = cleanNumeric(l.panelSizeW);
  const systemKw = (rawSysNum !== null && rawSysNum > 0)
    ? rawSysNum
    : (panelCount && panelSizeNum && panelSizeNum > 0)
    ? Math.round((panelCount * panelSizeNum / 1000) * 100) / 100
    : null;

  const hasBattery = Boolean(l.batteryRequired) && (Boolean(l.batteryManufacturer) || Boolean(l.batteryModel) || cleanNumeric(l.batteryUsableCapacityKwh) !== null || (cleanInt(l.noOfBatteries) !== null && cleanInt(l.noOfBatteries)! > 0));
  const batteryCap = hasBattery ? cleanNumeric(l.batteryUsableCapacityKwh) : null;
  const docsRecDateStr = l.docsReceivedDate ? String(l.docsReceivedDate).split('T')[0] : null;

  let invSizeKw = cleanNumeric(l.inverterSizeKw);
  if ((!invSizeKw || invSizeKw <= 0) && l.inverterModel) {
    const match = String(l.inverterModel).match(/(?:-|\b|_)([0-9]+(?:\.[0-9]+)?)\s*(?:k|kw|rt|rs|ktl)?\b/i);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val >= 1 && val <= 250) {
        invSizeKw = val;
      }
    }
  }

  const metadata: Record<string, any> = {
    original_id: l.id,
    contact_id: l.contactId || null,
    sheet_sync_row_id: l.sheetSyncRowId || l.id,
    system_size: systemKw,
    system_size_kw: systemKw,
    system_price: l.systemPrice || '',
    system_price_aud: sysPrice,
    budget_aud: sysPrice,
    selling_price: l.sellingPrice || '',
    quoted_price_aud: quotedPrice,
    deposit: l.deposit || '',
    deposit_aud: depVal,
    deposit_received_date: depDate || '',
    sale_date: l.saleDate || '',
    area: l.area || '',
    nearest_big_city: l.nearestBigCity || '',
    address_verified: Boolean(l.addressVerified),
    primary_mobile: l.primaryMobile || cleanPhone || '',
    secondary_mobile: l.secondaryMobile || '',
    manager_rentee_first_name: l.managerRenteeFirstName || '',
    manager_rentee_last_name: l.managerRenteeLastName || '',
    battery_required: Boolean(l.batteryRequired),
    property_type: l.propertyType || '',
    roof_type: l.roofType || '',
    phase_type: l.phaseType || l.phase || '',
    house_storey: l.houseStorey || '',
    panel_manufacturer: l.panelManufacturer || '',
    panel_model: l.panelModel || '',
    panel_size_w: l.panelSizeW || '',
    panel_series: l.panelSeries || '',
    no_of_panels: panelCount,
    inverter_manufacturer: l.inverterManufacturer || '',
    inverter_model: l.inverterModel || '',
    inverter_series: l.inverterSeries || '',
    inverter_size_kw: invSizeKw,
    no_of_inverters: cleanInt(l.noOfInverters),
    battery_manufacturer: hasBattery ? (l.batteryManufacturer || '') : '',
    battery_model: hasBattery ? (l.batteryModel || '') : '',
    battery_usable_capacity_kwh: batteryCap,
    battery_storage: batteryCap,
    battery_storage_kwh: batteryCap,
    battery_size: hasBattery ? (l.batterySize || '') : '',
    no_of_batteries: hasBattery ? cleanInt(l.noOfBatteries) : null,
    quarterly_bill_aud: cleanNumeric(l.quarterlyBillAud),
    sales_team_notes: l.salesTeamNotes || '',
    docs_received: l.docsReceived || '',
    docs_received_date: docsRecDateStr || '',
    existing_system_details: l.existingSystemDetails || '',
    activities: l.activities || [],
    attachments: l.attachments || [],
    portal_credentials: l.portalCredentials || null,
    xero_invoice_id: l.xeroInvoiceId || null,
    xero_invoice_number: l.xeroInvoiceNumber || null,
    xero_invoice_total: cleanNumeric(l.xeroInvoiceTotal),
    xero_invoice_status: l.xeroInvoiceStatus || null
  };

  const candidateRow: Record<string, any> = {
    id: toDeterministicUuid(l.id),
    contact_id: l.contactId ? toDeterministicUuid(l.contactId) : null,
    project_number: l.projectNumber || null,
    lead_date: l.leadDate || null,
    platform: l.platform || 'Website',
    sales_person_name: l.salesPersonName || null,
    state: l.state || 'NSW',
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    customer_name: fullName,
    email: l.email || null,
    phone: cleanPhone,
    phone_number: cleanPhone,
    primary_mobile: cleanPhone,
    secondary_mobile: l.secondaryMobile || null,
    address: l.address || null,
    suburb: l.suburb || null,
    postcode: l.postcode || null,
    area: l.area || null,
    nearest_big_city: l.nearestBigCity || null,
    address_verified: Boolean(l.addressVerified),
    manager_rentee_first_name: l.managerRenteeFirstName || null,
    manager_rentee_last_name: l.managerRenteeLastName || null,
    sales_team_notes: l.salesTeamNotes || null,
    selling_price: quotedPrice,
    quoted_price_aud: quotedPrice,
    system_price_aud: sysPrice,
    budget_aud: sysPrice,
    deposit: depVal,
    deposit_aud: depVal,
    deposit_received_date: depDate,
    sale_date: l.saleDate || null,
    property_type: l.propertyType || 'Residential',
    roof_type: l.roofType || null,
    electrical_phase: l.phaseType || l.phase || null,
    phase: l.phase || l.phaseType || null,
    phase_type: l.phaseType || l.phase || null,
    house_storey: l.houseStorey || null,
    system_size: systemKw,
    system_size_kw: systemKw,
    panel_count: panelCount,
    no_of_panels: panelCount,
    panel_manufacturer: l.panelManufacturer || null,
    panel_model: l.panelModel || null,
    panel_size: cleanNumeric(l.panelSizeW),
    panel_size_w: l.panelSizeW ? String(l.panelSizeW) : null,
    panel_series: l.panelSeries || null,
    inverter_size_kw: invSizeKw,
    no_of_inverters: cleanInt(l.noOfInverters),
    inverter_manufacturer: l.inverterManufacturer || null,
    inverter_model: l.inverterModel || null,
    inverter_series: l.inverterSeries || null,
    battery_storage: batteryCap,
    battery_storage_kwh: batteryCap,
    battery_required: Boolean(l.batteryRequired),
    no_of_batteries: hasBattery ? cleanInt(l.noOfBatteries) : null,
    battery_manufacturer: hasBattery ? (l.batteryManufacturer || null) : null,
    battery_model: hasBattery ? (l.batteryModel || null) : null,
    battery_usable_capacity_kwh: batteryCap,
    battery_size: hasBattery ? (l.batterySize ? String(l.batterySize) : null) : null,
    quarterly_bill_aud: cleanNumeric(l.quarterlyBillAud),
    status: l.status || 'New',
    stage: (l as any).stage || 'Inquiry',
    source: l.source || l.platform || 'Organic',
    notes: l.salesTeamNotes || null,
    docs_received: l.docsReceived || null,
    docs_received_date: docsRecDateStr,
    existing_system_details: l.existingSystemDetails || null,
    sheet_sync_row_id: l.sheetSyncRowId || null,
    os_id: (l as any).osId || null,
    assigned_to: l.assignedTo || l.salesPersonName || null,
    xero_invoice_id: l.xeroInvoiceId || null,
    xero_invoice_number: l.xeroInvoiceNumber || null,
    xero_invoice_total: cleanNumeric(l.xeroInvoiceTotal),
    xero_invoice_status: l.xeroInvoiceStatus || null,
    metadata,
    updated_at: new Date().toISOString()
  };

  if (allowedColumns && allowedColumns.size > 0) {
    const filteredRow: Record<string, any> = {};
    for (const [k, v] of Object.entries(candidateRow)) {
      if (allowedColumns.has(k)) {
        filteredRow[k] = v;
      }
    }
    return filteredRow;
  }

  return candidateRow;
}

/**
 * Persists an array of leads to .leads_db.json and Supabase
 */
export async function saveDbLeads(leads: Lead[]): Promise<boolean> {
  const sorted = sortLeadsByDateDesc(leads);
  try {
    fs.writeFileSync(LEADS_DB_FILE, JSON.stringify(sorted, null, 2), 'utf-8');
  } catch (err) {
    console.error('[LeadsDb] Error writing .leads_db.json:', err);
    return false;
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const allowedCols = await getLeadTableColumns(supabase);
      const rows = sorted.map(l => leadToSupabaseRow(l, allowedCols));

      // Deduplicate rows by id to prevent Postgres 21000 on conflict errors
      const uniqueRowsMap = new Map<string, any>();
      for (const row of rows) {
        if (!uniqueRowsMap.has(row.id)) {
          uniqueRowsMap.set(row.id, row);
        }
      }
      const uniqueRows = Array.from(uniqueRowsMap.values());
      if (uniqueRows.length === 0) return true;

      // Validate contact IDs against Supabase contacts to prevent FK constraint errors
      try {
        const { data: dbContacts } = await supabase.from('contacts').select('id');
        const validContactIds = new Set<string>((dbContacts || []).map(c => c.id));
        for (const r of uniqueRows) {
          if (r.contact_id && !validContactIds.has(r.contact_id)) {
            r.contact_id = null;
          }
        }
      } catch (cErr) {
        // non-blocking
      }

      let { error: upsertErr } = await supabase.from('leads').upsert(uniqueRows, { onConflict: 'id' });
      if (upsertErr && upsertErr.message && upsertErr.message.includes('system_price')) {
        console.warn('[LeadsDb] Batch upsert trigger failure due to dropped system_price. Retrying with price columns in metadata...');
        const cleanRows = uniqueRows.map(r => {
          const c = { ...r };
          delete c.system_price;
          delete c.system_price_aud;
          delete c.budget_aud;
          return c;
        });
        const retryRes = await supabase.from('leads').upsert(cleanRows, { onConflict: 'id' });
        upsertErr = retryRes.error;
      }

      if (upsertErr) {
        console.error('[LeadsDb] Error upserting leads to Supabase:', upsertErr.message, upsertErr.code, upsertErr.details);
      } else {
        console.log(`[LeadsDb] Successfully synced ${uniqueRows.length} lead(s) to Supabase`);
      }
    } catch (err: any) {
      console.error('[LeadsDb] Error updating Supabase leads:', err.message || err);
    }
  }

  return true;
}

/**
 * Saves/Updates a single lead in database and Supabase with explicit error reporting.
 */
export async function saveSingleDbLead(lead: Lead): Promise<{
  success: boolean;
  lead: Lead;
  source: 'supabase' | 'local_fallback';
  error?: string;
  details?: any;
}> {
  if (!lead || !lead.id) {
    throw new Error('Lead with valid id is required');
  }

  const leadUuid = toDeterministicUuid(lead.id);
  const currentLeads = await getDbLeads();
  const existingIdx = currentLeads.findIndex(
    l => l.id === lead.id || toDeterministicUuid(l.id) === leadUuid || (lead.sheetSyncRowId && l.sheetSyncRowId === lead.sheetSyncRowId)
  );

  let nextLeads: Lead[];
  if (existingIdx >= 0) {
    nextLeads = [...currentLeads];
    nextLeads[existingIdx] = { ...nextLeads[existingIdx], ...lead };
  } else {
    nextLeads = [lead, ...currentLeads];
  }

  // Update local file cache immediately
  try {
    fs.writeFileSync(LEADS_DB_FILE, JSON.stringify(sortLeadsByDateDesc(nextLeads), null, 2), 'utf-8');
  } catch (err) {
    console.error('[LeadsDb] Error writing single lead to .leads_db.json:', err);
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const allowedCols = await getLeadTableColumns(supabase);
      const row = leadToSupabaseRow(lead, allowedCols);

      if (row.contact_id) {
        try {
          const { data: cExists } = await supabase.from('contacts').select('id').eq('id', row.contact_id).limit(1);
          if (!cExists || cExists.length === 0) {
            row.contact_id = null;
          }
        } catch (e) {
          row.contact_id = null;
        }
      }

      let { data, error } = await supabase.from('leads').upsert([row], { onConflict: 'id' }).select();

      // If remote Supabase has a trigger referencing dropped column 'system_price',
      // retry by omitting system_price_aud and budget_aud from root columns (already preserved in metadata)
      if (error && error.message && error.message.includes('system_price')) {
        console.warn('[LeadsDb] Supabase lead upsert trigger failure due to dropped system_price. Retrying with price columns deferred to metadata...');
        const cleanRow = { ...row };
        delete cleanRow.system_price;
        delete cleanRow.system_price_aud;
        delete cleanRow.budget_aud;
        const retryRes = await supabase.from('leads').upsert([cleanRow], { onConflict: 'id' }).select();
        if (!retryRes.error) {
          console.log(`[LeadsDb] Successfully persisted lead ${lead.id} via metadata fallback (trigger bypassed)`);
          return { success: true, lead, source: 'supabase' };
        }
        error = retryRes.error;
      }

      if (error) {
        console.error('[LeadsDb] Supabase UPDATE/INSERT lead rejection:', error.message, error.code, error.details);
        return {
          success: false,
          lead,
          source: 'local_fallback',
          error: error.message,
          details: error.details || error.hint
        };
      }

      console.log(`[LeadsDb] Successfully persisted lead ${lead.id} (${leadUuid}) to Supabase leads table`);
      return { success: true, lead, source: 'supabase' };
    } catch (err: any) {
      console.error('[LeadsDb] Fatal exception updating Supabase lead:', err.message || err);
      return { success: false, lead, source: 'local_fallback', error: err.message };
    }
  }

  return { success: true, lead, source: 'local_fallback' };
}

/**
 * Permanently deletes a lead by ID from the database file and Supabase.
 */
export async function deleteDbLead(
  leadId: string,
  extra?: { email?: string; phone?: string; name?: string; sheetSyncRowId?: string }
): Promise<boolean> {
  const currentLeads = await getDbLeads();
  const leadUuid = toDeterministicUuid(leadId);
  const targetLead = currentLeads.find(
    l => l.id === leadId || toDeterministicUuid(l.id) === leadUuid || (extra?.sheetSyncRowId && l.sheetSyncRowId === extra.sheetSyncRowId)
  );

  const targetEmail = normalizeEmailForComparison(extra?.email || targetLead?.email);
  const targetPhone = normalizePhoneForComparison(extra?.phone || targetLead?.primaryMobile || targetLead?.phone);
  const targetName = normalizeNameForComparison(extra?.name || targetLead?.customerName || `${targetLead?.firstName || ''} ${targetLead?.lastName || ''}`);
  const targetSheetRow = extra?.sheetSyncRowId || targetLead?.sheetSyncRowId;

  const deletedIds: string[] = [];
  const next = currentLeads.filter(l => {
    if (l.id === leadId || toDeterministicUuid(l.id) === leadUuid) {
      deletedIds.push(l.id);
      return false;
    }
    if (targetLead && l.id === targetLead.id) {
      deletedIds.push(l.id);
      return false;
    }
    if (targetSheetRow && l.sheetSyncRowId && l.sheetSyncRowId === targetSheetRow) {
      deletedIds.push(l.id);
      return false;
    }
    return true;
  });

  await saveDbLeads(next);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const idsToDelete = Array.from(new Set([leadId, leadUuid, ...deletedIds.map(toDeterministicUuid)]));
      await supabase.from('leads').delete().in('id', idsToDelete);
      if (targetSheetRow) {
        await supabase.from('leads').delete().eq('metadata->>sheet_sync_row_id', targetSheetRow);
      }
    } catch (err: any) {
      console.warn('[LeadsDb] Warning deleting lead from Supabase:', err.message || err);
    }
  }

  return true;
}

/**
 * Permanently deletes multiple leads by IDs from the database file and Supabase
 */
export async function deleteDbLeads(
  leadIds: string[],
  items?: Array<{ id: string; email?: string; phone?: string; name?: string; sheetSyncRowId?: string }>
): Promise<boolean> {
  const currentLeads = await getDbLeads();
  const idSet = new Set(leadIds);
  leadIds.forEach(id => idSet.add(toDeterministicUuid(id)));

  const deletedIds: string[] = [];
  const next = currentLeads.filter(l => {
    if (idSet.has(l.id) || idSet.has(toDeterministicUuid(l.id))) {
      deletedIds.push(l.id);
      return false;
    }
    return true;
  });

  await saveDbLeads(next);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const allUuids = Array.from(new Set([...leadIds, ...deletedIds])).map(toDeterministicUuid);
      await supabase.from('leads').delete().in('id', allUuids);
    } catch (err: any) {
      console.warn('[LeadsDb] Warning deleting leads batch from Supabase:', err.message || err);
    }
  }

  return true;
}

/**
 * Clears all leads from database file and Supabase
 */
export async function clearAllDbLeads(): Promise<boolean> {
  await saveDbLeads([]);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (err: any) {
      console.warn('[LeadsDb] Warning clearing leads from Supabase:', err.message || err);
    }
  }

  return true;
}

/**
 * Synchronizes incoming Google Sheet leads against the server database and Supabase.
 * Workflow:
 * 1. Checks contact details first.
 *    - If contact matches:
 *      - Checks property address.
 *      - If property address is DIFFERENT: appends address to contact as secondary/tertiary address.
 *      - If property address is the SAME: makes no changes to contact.
 *      - IN BOTH CASES: creates a new lead associated with that contact!
 *    - If contact is completely new:
 *      - Creates both contact AND lead.
 * 2. If a lead already exists for the SAME sheetSyncRowId / same property inquiry, updates its fields.
 * 3. Persists everything to Supabase.
 */
export async function syncSheetLeadsWithDb(incomingLeads: Lead[]): Promise<{
  leads: Lead[];
  addedCount: number;
  updatedCount: number;
  duplicateCount: number;
  totalRows: number;
}> {
  if (!Array.isArray(incomingLeads) || incomingLeads.length === 0) {
    const current = await getDbLeads();
    return { leads: current, addedCount: 0, updatedCount: 0, duplicateCount: 0, totalRows: 0 };
  }

  // 1. Process contacts first according to exact user rules
  await ensureContactsForLeads(incomingLeads);

  const currentLeads = await getDbLeads();
  const newOnly: Lead[] = [];
  const updatedLeadsMap = new Map<string, Lead>();

  for (const candidate of incomingLeads) {
    const candRowId = (candidate.sheetSyncRowId || '').trim();
    const candId = (candidate.id || '').trim();

    // Check if this EXACT sheet row or ID was already synced in a previous pass
    const alreadySyncedLead = currentLeads.find(l => {
      if (candRowId && l.sheetSyncRowId && l.sheetSyncRowId === candRowId) return true;
      if (candId && (l.id === candId || toDeterministicUuid(l.id) === toDeterministicUuid(candId))) return true;
      return false;
    });

    if (alreadySyncedLead) {
      // Same sheet row -> update any changed details from sheet
      const baseLead = updatedLeadsMap.get(alreadySyncedLead.id) || alreadySyncedLead;
      const { hasChanges, updatedLead } = applySheetUpdatesToLead(baseLead, candidate);
      if (hasChanges) {
        updatedLeadsMap.set(alreadySyncedLead.id, updatedLead);
      }
    } else {
      // Brand new row added to Google Sheet:
      // Even if contact details or address match an existing contact,
      // a fresh lead is created and associated with that contact!
      newOnly.push(candidate);
    }
  }

  let finalLeads = currentLeads;
  if (newOnly.length > 0 || updatedLeadsMap.size > 0) {
    const withUpdates = currentLeads.map(l => updatedLeadsMap.get(l.id) || l);
    const newLeadsWithIds = newOnly.map((l, idx) => ({
      ...l,
      id: l.id || `lead-sheet-${l.sheetSyncRowId || Date.now() + idx}`,
      phone: l.phone || l.primaryMobile || '',
      primaryMobile: l.primaryMobile || l.phone || ''
    }));

    finalLeads = sortLeadsByDateDesc([...newLeadsWithIds, ...withUpdates]);
    await saveDbLeads(finalLeads);
  }

  return {
    leads: finalLeads,
    addedCount: newOnly.length,
    updatedCount: updatedLeadsMap.size,
    duplicateCount: incomingLeads.length - newOnly.length,
    totalRows: incomingLeads.length
  };
}
