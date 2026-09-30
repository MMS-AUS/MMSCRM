import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getSupabase } from './supabase.ts';
import { Lead } from '../src/types/index.ts';

function toDeterministicUuid(id: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;
  const hash = crypto.createHash('md5').update(id).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    '8' + hash.substring(17, 20),
    hash.substring(20, 32)
  ].join('-');
}
import {
  isLeadAlreadyInSystem,
  applySheetUpdatesToLead,
  sortLeadsByDateDesc,
  normalizeEmailForComparison,
  normalizePhoneForComparison,
  normalizeNameForComparison,
  areDistinctProperties
} from '../src/utils/googleSheetsTemplate.ts';

const LEADS_DB_FILE = path.join(process.cwd(), '.leads_db.json');

/**
 * Reads all leads from persistent server store (.leads_db.json or Supabase)
 */
export async function getDbLeads(): Promise<Lead[]> {
  // 1. First check local persistent file
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

  // 2. If Supabase is configured, attempt to read or sync from Supabase
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        // Map Supabase columns & metadata JSONB to Lead interface
        const sbLeads: Lead[] = data.map((d: any) => {
          const meta = (d.metadata && typeof d.metadata === 'object') ? d.metadata : {};
          const fullName = d.full_name || `${d.first_name || ''} ${d.last_name || ''}`.trim() || d.customer_name || '';
          return {
            id: meta.original_id || d.id,
            projectNumber: d.project_number || undefined,
            leadDate: d.lead_date || undefined,
            platform: d.platform || '',
            salesPersonName: d.sales_person_name || '',
            state: d.state || '',
            postcode: d.postcode || '',
            area: meta.area || '',
            nearestBigCity: meta.nearest_big_city || '',
            status: d.status || 'New',
            saleDate: meta.sale_date || undefined,
            firstName: d.first_name || (fullName.split(' ')[0] || ''),
            lastName: d.last_name || (fullName.split(' ').slice(1).join(' ') || ''),
            managerRenteeFirstName: meta.manager_rentee_first_name || '',
            managerRenteeLastName: meta.manager_rentee_last_name || '',
            address: d.address || '',
            suburb: d.suburb || '',
            addressVerified: Boolean(meta.address_verified),
            primaryMobile: meta.primary_mobile || d.phone || d.phone_number || '',
            secondaryMobile: meta.secondary_mobile || '',
            email: d.email || '',
            salesTeamNotes: meta.sales_team_notes || d.notes || '',
            systemPrice: meta.system_price || '',
            sellingPrice: meta.selling_price || '',
            deposit: meta.deposit || '',
            depositReceivedDate: meta.deposit_received_date || undefined,
            customerName: fullName,
            phone: d.phone || d.phone_number || meta.primary_mobile || '',
            systemSizeKw: d.system_size_kw ? Number(d.system_size_kw) : undefined,
            batteryRequired: meta.battery_required !== undefined ? meta.battery_required : undefined,
            propertyType: meta.property_type || '',
            roofType: meta.roof_type || '',
            phaseType: meta.phase_type || '',
            quarterlyBillAud: meta.quarterly_bill_aud ? Number(meta.quarterly_bill_aud) : undefined,
            source: d.source || d.platform || '',
            sheetSyncRowId: meta.sheet_sync_row_id || d.sheet_sync_row_id || undefined,
            createdAt: d.created_at || undefined,
            assignedTo: d.assigned_to || d.sales_person_name || ''
          };
        });

        // Merge file leads with Supabase leads (deduplicated)
        const merged: Lead[] = [...fileLeads];
        for (const sbl of sbLeads) {
          if (!isLeadAlreadyInSystem(sbl, merged).isDuplicate) {
            merged.push(sbl);
          }
        }
        return sortLeadsByDateDesc(merged);
      }
    } catch (err: any) {
      console.warn('[LeadsDb] Warning querying Supabase leads table:', err.message || err);
    }
  }

  return sortLeadsByDateDesc(fileLeads);
}

/**
 * Persists leads array to .leads_db.json and Supabase
 */
export async function saveDbLeads(leads: Lead[]): Promise<boolean> {
  const sorted = sortLeadsByDateDesc(leads);
  try {
    fs.writeFileSync(LEADS_DB_FILE, JSON.stringify(sorted, null, 2), 'utf-8');
  } catch (err) {
    console.error('[LeadsDb] Error writing .leads_db.json:', err);
    return false;
  }

  // Also sync to Supabase if configured
  const supabase = getSupabase();
  if (supabase) {
    try {
      // Upsert rows to Supabase matching exact table schema columns
      const rows = sorted.map(l => {
        const fullName = l.customerName || `${l.firstName || ''} ${l.lastName || ''}`.trim() || null;
        const firstName = l.firstName || (fullName ? fullName.split(' ')[0] : null);
        const lastName = l.lastName || (fullName ? fullName.split(' ').slice(1).join(' ') : null);
        const quotedPrice = parseFloat(String(l.sellingPrice || l.systemPrice || '').replace(/[^0-9.]/g, '')) || null;
        const systemKw = typeof l.systemSizeKw === 'number' ? l.systemSizeKw : (parseFloat(String(l.systemSizeKw || '')) || null);

        return {
          id: toDeterministicUuid(l.id),
          project_number: l.projectNumber || null,
          lead_date: l.leadDate || null,
          platform: l.platform || 'Website',
          sales_person_name: l.salesPersonName || null,
          state: l.state || 'NSW',
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          email: l.email || null,
          phone: l.phone || l.primaryMobile || null,
          phone_number: l.primaryMobile || l.phone || null,
          address: l.address || null,
          suburb: l.suburb || null,
          postcode: l.postcode || null,
          system_size_kw: systemKw,
          panel_count: null,
          inverter_size_kw: null,
          battery_storage_kwh: null,
          budget_aud: null,
          quoted_price_aud: quotedPrice,
          status: l.status || 'New',
          stage: (l as any).stage || 'Inquiry',
          source: l.source || l.platform || 'Organic',
          notes: l.salesTeamNotes || null,
          os_id: (l as any).osId || null,
          assigned_to: l.assignedTo || l.salesPersonName || null,
          metadata: {
            original_id: l.id,
            sheet_sync_row_id: l.sheetSyncRowId || l.id,
            system_price: l.systemPrice || '',
            selling_price: l.sellingPrice || '',
            deposit: l.deposit || '',
            deposit_received_date: l.depositReceivedDate || '',
            area: l.area || '',
            nearest_big_city: l.nearestBigCity || '',
            sale_date: l.saleDate || '',
            address_verified: Boolean(l.addressVerified),
            primary_mobile: l.primaryMobile || '',
            secondary_mobile: l.secondaryMobile || '',
            manager_rentee_first_name: l.managerRenteeFirstName || '',
            manager_rentee_last_name: l.managerRenteeLastName || '',
            battery_required: l.batteryRequired,
            property_type: l.propertyType || '',
            roof_type: l.roofType || '',
            phase_type: l.phaseType || '',
            quarterly_bill_aud: l.quarterlyBillAud,
            sales_team_notes: l.salesTeamNotes || ''
          },
          updated_at: new Date().toISOString()
        };
      });

      const { error: upsertErr } = await supabase.from('leads').upsert(rows, { onConflict: 'id' });
      if (upsertErr) {
        console.warn('[LeadsDb] Error upserting leads to Supabase:', upsertErr.message, upsertErr.code);
      } else {
        console.log(`[LeadsDb] Successfully synced ${rows.length} lead(s) to Supabase`);
      }
    } catch (err: any) {
      console.warn('[LeadsDb] Warning updating Supabase leads:', err.message || err);
    }
  }

  return true;
}

/**
 * Permanently deletes a lead by ID from the database file and Supabase.
 * Accepts optional extra identifiers (email, phone, name, sheetSyncRowId) to guarantee
 * complete removal even if IDs varied across client and server.
 */
export async function deleteDbLead(
  leadId: string,
  extra?: { email?: string; phone?: string; name?: string; sheetSyncRowId?: string }
): Promise<boolean> {
  const currentLeads = await getDbLeads();
  const targetLead = currentLeads.find(l => l.id === leadId || (extra?.sheetSyncRowId && l.sheetSyncRowId === extra.sheetSyncRowId));

  const targetEmail = normalizeEmailForComparison(extra?.email || targetLead?.email);
  const targetPhone = normalizePhoneForComparison(extra?.phone || targetLead?.primaryMobile || targetLead?.phone);
  const targetName = normalizeNameForComparison(extra?.name || targetLead?.customerName || `${targetLead?.firstName || ''} ${targetLead?.lastName || ''}`);
  const targetSheetRow = extra?.sheetSyncRowId || targetLead?.sheetSyncRowId;

  const deletedIds: string[] = [];
  const next = currentLeads.filter(l => {
    // 1. Direct ID match
    if (l.id === leadId) {
      deletedIds.push(l.id);
      return false;
    }
    if (targetLead && l.id === targetLead.id) {
      deletedIds.push(l.id);
      return false;
    }

    // 2. Sheet row ID match (e.g. GSHEET_ROW_4)
    if (targetSheetRow && l.sheetSyncRowId && l.sheetSyncRowId === targetSheetRow) {
      deletedIds.push(l.id);
      return false;
    }
    if (leadId && l.sheetSyncRowId === leadId) {
      deletedIds.push(l.id);
      return false;
    }

    // Do NOT delete different property leads for the same customer when deleting by email/phone/name
    if (targetLead && areDistinctProperties(l, targetLead)) {
      return true;
    }

    // 3. Email match if valid
    if (targetEmail && targetEmail.length > 3 && l.email) {
      if (normalizeEmailForComparison(l.email) === targetEmail) {
        deletedIds.push(l.id);
        return false;
      }
    }

    // 4. Phone match if valid
    if (targetPhone && targetPhone.length >= 6 && (l.primaryMobile || l.phone)) {
      const p = normalizePhoneForComparison(l.primaryMobile || l.phone);
      if (p === targetPhone || (p.length >= 9 && targetPhone.length >= 9 && p.slice(-9) === targetPhone.slice(-9))) {
        deletedIds.push(l.id);
        return false;
      }
    }

    // 5. Name match
    if (targetName && targetName.length > 3) {
      const lName = normalizeNameForComparison(l.customerName || `${l.firstName || ''} ${l.lastName || ''}`);
      if (lName === targetName) {
        deletedIds.push(l.id);
        return false;
      }
    }

    return true;
  });

  await saveDbLeads(next);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const idsToDelete = Array.from(new Set([leadId, ...deletedIds]));
      await supabase.from('leads').delete().in('id', idsToDelete);
      if (targetSheetRow) {
        await supabase.from('leads').delete().eq('sheet_sync_row_id', targetSheetRow);
      }
      if (targetEmail) {
        await supabase.from('leads').delete().eq('email', targetEmail);
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
  const emailSet = new Set<string>();
  const phoneSet = new Set<string>();
  const rowIdSet = new Set<string>();
  const nameSet = new Set<string>();

  if (Array.isArray(items)) {
    for (const it of items) {
      if (it.id) idSet.add(it.id);
      if (it.email) emailSet.add(normalizeEmailForComparison(it.email));
      if (it.phone) phoneSet.add(normalizePhoneForComparison(it.phone));
      if (it.sheetSyncRowId) rowIdSet.add(it.sheetSyncRowId);
      if (it.name) nameSet.add(normalizeNameForComparison(it.name));
    }
  }

  const deletedIds: string[] = [];
  const next = currentLeads.filter(l => {
    if (idSet.has(l.id)) {
      deletedIds.push(l.id);
      return false;
    }
    if (l.sheetSyncRowId && rowIdSet.has(l.sheetSyncRowId)) {
      deletedIds.push(l.id);
      return false;
    }
    if (l.email && emailSet.has(normalizeEmailForComparison(l.email))) {
      deletedIds.push(l.id);
      return false;
    }
    if ((l.primaryMobile || l.phone) && phoneSet.has(normalizePhoneForComparison(l.primaryMobile || l.phone))) {
      deletedIds.push(l.id);
      return false;
    }
    if (l.customerName && nameSet.has(normalizeNameForComparison(l.customerName))) {
      deletedIds.push(l.id);
      return false;
    }
    return true;
  });

  await saveDbLeads(next);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const allIds = Array.from(new Set([...leadIds, ...deletedIds]));
      await supabase.from('leads').delete().in('id', allIds);
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
 * Synchronizes incoming Google Sheet leads against the server database.
 * - If a lead in the sheet already exists in database: updates changed fields.
 * - If a lead was previously deleted from the database: it does NOT match any lead,
 *   so it gets re-synced into the database!
 * - Ensures ZERO duplicate entries are created.
 * - Returns updated list and counts.
 */
export async function syncSheetLeadsWithDb(incomingLeads: Lead[]): Promise<{
  leads: Lead[];
  addedCount: number;
  updatedCount: number;
  duplicateCount: number;
  totalRows: number;
}> {
  const currentLeads = await getDbLeads();
  const newOnly: Lead[] = [];
  const updatedLeadsMap = new Map<string, Lead>();

  for (const candidate of incomingLeads) {
    const effectiveCurrentLeads = currentLeads.map(l => updatedLeadsMap.get(l.id) || l);
    const matchResult = isLeadAlreadyInSystem(candidate, [...effectiveCurrentLeads, ...newOnly]);
    if (matchResult.isDuplicate && matchResult.matchedLead) {
      // Matched an existing lead! Update changed details
      const baseLead = updatedLeadsMap.get(matchResult.matchedLead.id) || matchResult.matchedLead;
      const { hasChanges, updatedLead } = applySheetUpdatesToLead(baseLead, candidate);
      if (hasChanges) {
        updatedLeadsMap.set(matchResult.matchedLead.id, updatedLead);
      }
    } else if (!matchResult.isDuplicate) {
      // Candidate not in database (new lead OR previously deleted lead): re-sync!
      newOnly.push(candidate);
    }
  }

  let finalLeads = currentLeads;
  if (newOnly.length > 0 || updatedLeadsMap.size > 0) {
    const withUpdates = currentLeads.map(l => updatedLeadsMap.get(l.id) || l);
    // Strict deduplication to ensure no duplicate entry is added to database
    const strictlyNew = newOnly.filter(c => !isLeadAlreadyInSystem(c, withUpdates).isDuplicate);
    const newLeadsWithIds = strictlyNew.map((l, idx) => ({
      ...l,
      id: l.id || `lead-sheet-${l.sheetSyncRowId || idx + 1}`,
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
