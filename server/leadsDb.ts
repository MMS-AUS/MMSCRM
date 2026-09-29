import fs from 'fs';
import path from 'path';
import { getSupabase } from './supabase';
import { Lead } from '../src/types';
import { isLeadAlreadyInSystem, applySheetUpdatesToLead, sortLeadsByDateDesc } from '../src/utils/googleSheetsTemplate';

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
        // Map Supabase columns to Lead interface if needed
        const sbLeads: Lead[] = data.map((d: any) => ({
          id: d.id,
          projectNumber: d.project_number || undefined,
          leadDate: d.lead_date || undefined,
          platform: d.platform || '',
          salesPersonName: d.sales_person_name || '',
          state: d.state || '',
          postcode: d.postcode || '',
          area: d.area || '',
          nearestBigCity: d.nearest_big_city || '',
          status: d.status || '',
          saleDate: d.sale_date || undefined,
          firstName: d.first_name || '',
          lastName: d.last_name || '',
          managerRenteeFirstName: d.manager_rentee_first_name || '',
          managerRenteeLastName: d.manager_rentee_last_name || '',
          address: d.address || '',
          suburb: d.suburb || '',
          addressVerified: Boolean(d.address_verified),
          primaryMobile: d.primary_mobile || d.phone || '',
          secondaryMobile: d.secondary_mobile || '',
          email: d.email || '',
          salesTeamNotes: d.sales_team_notes || '',
          systemPrice: d.system_price || '',
          sellingPrice: d.selling_price || '',
          deposit: d.deposit || '',
          depositReceivedDate: d.deposit_received_date || undefined,
          customerName: d.customer_name || `${d.first_name || ''} ${d.last_name || ''}`.trim() || '',
          phone: d.phone || d.primary_mobile || '',
          systemSizeKw: d.system_size_kw || undefined,
          batteryRequired: d.battery_required !== undefined ? d.battery_required : undefined,
          propertyType: d.property_type || '',
          roofType: d.roof_type || '',
          phaseType: d.phase_type || '',
          quarterlyBillAud: d.quarterly_bill_aud || undefined,
          source: d.source || d.platform || '',
          sheetSyncRowId: d.sheet_sync_row_id || undefined,
          createdAt: d.created_at || undefined,
          assignedTo: d.assigned_to || d.sales_person_name || ''
        }));

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
      // Upsert rows to Supabase
      const rows = sorted.map(l => ({
        id: l.id,
        project_number: l.projectNumber || null,
        lead_date: l.leadDate || null,
        platform: l.platform || null,
        sales_person_name: l.salesPersonName || null,
        state: l.state || null,
        postcode: l.postcode || null,
        area: l.area || null,
        nearest_big_city: l.nearestBigCity || null,
        status: l.status || null,
        sale_date: l.saleDate || null,
        first_name: l.firstName || null,
        last_name: l.lastName || null,
        manager_rentee_first_name: l.managerRenteeFirstName || null,
        manager_rentee_last_name: l.managerRenteeLastName || null,
        address: l.address || null,
        suburb: l.suburb || null,
        address_verified: Boolean(l.addressVerified),
        primary_mobile: l.primaryMobile || l.phone || null,
        secondary_mobile: l.secondaryMobile || null,
        email: l.email || null,
        sales_team_notes: l.salesTeamNotes || null,
        system_price: l.systemPrice || null,
        selling_price: l.sellingPrice || null,
        deposit: l.deposit || null,
        deposit_received_date: l.depositReceivedDate || null,
        customer_name: l.customerName || `${l.firstName || ''} ${l.lastName || ''}`.trim() || null,
        phone: l.phone || l.primaryMobile || null,
        system_size_kw: l.systemSizeKw || null,
        battery_required: l.batteryRequired !== undefined ? l.batteryRequired : null,
        property_type: l.propertyType || null,
        roof_type: l.roofType || null,
        phase_type: l.phaseType || null,
        quarterly_bill_aud: l.quarterlyBillAud || null,
        source: l.source || l.platform || null,
        sheet_sync_row_id: l.sheetSyncRowId || null,
        updated_at: new Date().toISOString()
      }));

      await supabase.from('leads').upsert(rows, { onConflict: 'id' });
    } catch (err: any) {
      console.warn('[LeadsDb] Warning updating Supabase leads:', err.message || err);
    }
  }

  return true;
}

/**
 * Permanently deletes a lead by ID from the database file and Supabase
 */
export async function deleteDbLead(leadId: string): Promise<boolean> {
  const currentLeads = await getDbLeads();
  const next = currentLeads.filter(l => l.id !== leadId);
  await saveDbLeads(next);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('leads').delete().eq('id', leadId);
    } catch (err: any) {
      console.warn('[LeadsDb] Warning deleting lead from Supabase:', err.message || err);
    }
  }

  return true;
}

/**
 * Permanently deletes multiple leads by IDs from the database file and Supabase
 */
export async function deleteDbLeads(leadIds: string[]): Promise<boolean> {
  const idSet = new Set(leadIds);
  const currentLeads = await getDbLeads();
  const next = currentLeads.filter(l => !idSet.has(l.id));
  await saveDbLeads(next);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('leads').delete().in('id', leadIds);
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
    const matchResult = isLeadAlreadyInSystem(candidate, [...currentLeads, ...newOnly]);
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
    finalLeads = sortLeadsByDateDesc([...strictlyNew, ...withUpdates]);
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
