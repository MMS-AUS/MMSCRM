import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getSupabase, isSupabaseQuotaError, markSupabaseRestricted } from './supabase.ts';
import { Contact, ContactAddress, Lead } from '../src/types/index.ts';
import { normalizeAddressForComparison, normalizePhoneForComparison, normalizeNameForComparison } from '../src/utils/googleSheetsTemplate.ts';

const CONTACTS_DB_FILE = path.join(process.cwd(), '.contacts_db.json');

export function toDeterministicUuid(id: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;
  const hash = crypto.createHash('md5').update(id || 'cnt-default').digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    '8' + hash.substring(17, 20),
    hash.substring(20, 32)
  ].join('-');
}

/**
 * Reads all contacts from persistent store.
 * When Supabase is configured and returns records, Supabase is the authoritative source of truth.
 */
export async function getDbContacts(): Promise<Contact[]> {
  let fileContacts: Contact[] = [];
  try {
    if (fs.existsSync(CONTACTS_DB_FILE)) {
      const raw = fs.readFileSync(CONTACTS_DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        fileContacts = parsed;
      }
    }
  } catch (err) {
    console.error('[ContactsDb] Error reading .contacts_db.json:', err);
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const sbContacts: Contact[] = data.map((d: any) => {
          let addresses: ContactAddress[] = [];
          let cleanNotes = d.notes || '';

          // 1. If addresses column exists in Supabase
          if (Array.isArray(d.addresses) && d.addresses.length > 0) {
            addresses = d.addresses;
          } else if (cleanNotes.includes('[CRM_ADDRESSES_JSON]:')) {
            // 2. Parse serialized addresses from notes fallback
            const parts = cleanNotes.split('[CRM_ADDRESSES_JSON]:');
            cleanNotes = parts[0].trim();
            try {
              const parsed = JSON.parse(parts[1]);
              if (Array.isArray(parsed)) addresses = parsed;
            } catch {}
          }

          // 3. Fallback to primary address if no extra addresses
          if (addresses.length === 0 && (d.street_address || d.address || d.suburb)) {
            addresses = [{
              id: `prop-${d.id}-primary`,
              street: d.street_address || d.address || '',
              suburb: d.suburb || '',
              state: d.state || 'NSW',
              postcode: d.postcode || '',
              city: d.city || d.suburb || '',
              address: d.address || `${d.street_address || ''}, ${d.suburb || ''} ${d.state || ''}`.trim(),
              propertyType: 'Primary Residence',
              isPrimary: true
            }];
          }

          return {
            id: d.id,
            firstName: d.first_name || '',
            lastName: d.last_name || '',
            name: d.name || `${d.first_name || ''} ${d.last_name || ''}`.trim() || 'Contact',
            streetAddress: d.street_address || '',
            suburb: d.suburb || '',
            state: d.state || 'NSW',
            postcode: d.postcode || '',
            area: d.area || '',
            email: d.email || '',
            phone: d.phone || '',
            contactOwner: d.contact_owner || '',
            contactOwnerName: d.contact_owner_name || '',
            contactType: d.contact_type || 'Residential',
            primaryCompany: d.primary_company || '',
            city: d.city || '',
            address: d.address || '',
            addresses,
            type: d.type || 'Residential',
            companyId: d.company_id || undefined,
            companyName: d.company_name || undefined,
            source: d.source || 'Manual',
            notes: cleanNotes,
            createdAt: d.created_at || new Date().toISOString().split('T')[0]
          };
        });

        // Supabase is the single source of truth when configured!
        try {
          fs.writeFileSync(CONTACTS_DB_FILE, JSON.stringify(sbContacts, null, 2), 'utf-8');
        } catch {}
        return sbContacts;
      }
      if (error && isSupabaseQuotaError(error)) {
        markSupabaseRestricted(error.message);
      }
    } catch (err: any) {
      if (isSupabaseQuotaError(err)) {
        markSupabaseRestricted(err.message);
      } else {
        console.warn('[ContactsDb] Warning querying Supabase contacts:', err.message || err);
      }
    }
  }

  return fileContacts;
}

let cachedContactColumns: Set<string> | null = null;
let lastContactColumnsFetch = 0;

export async function getContactTableColumns(supabase: any): Promise<Set<string>> {
  const now = Date.now();
  if (cachedContactColumns && (now - lastContactColumnsFetch < 60000)) {
    return cachedContactColumns;
  }
  try {
    const { data } = await supabase.from('contacts').select('*').limit(1);
    if (data && data.length > 0) {
      cachedContactColumns = new Set(Object.keys(data[0]));
      lastContactColumnsFetch = now;
      return cachedContactColumns;
    }
  } catch (e) {
    console.warn('[ContactsDb] Could not inspect contacts columns:', e);
  }
  return cachedContactColumns || new Set([
    'id', 'first_name', 'last_name', 'name', 'street_address', 'suburb', 'state',
    'postcode', 'area', 'email', 'phone', 'contact_owner', 'contact_owner_name',
    'contact_type', 'primary_company', 'city', 'address', 'type', 'company_id',
    'company_name', 'source', 'notes', 'created_at', 'updated_at'
  ]);
}

/**
 * Persists contacts array to .contacts_db.json and Supabase
 */
export async function saveDbContacts(contacts: Contact[]): Promise<boolean> {
  try {
    fs.writeFileSync(CONTACTS_DB_FILE, JSON.stringify(contacts, null, 2), 'utf-8');
  } catch (err) {
    console.error('[ContactsDb] Error writing .contacts_db.json:', err);
    return false;
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const allowedCols = await getContactTableColumns(supabase);

      const rows = contacts.map(c => {
        let notesVal = c.notes || '';
        if (c.addresses && c.addresses.length > 0) {
          notesVal = (notesVal ? notesVal + '\n' : '') + '[CRM_ADDRESSES_JSON]:' + JSON.stringify(c.addresses);
        }
        const candidateRow: Record<string, any> = {
          id: toDeterministicUuid(c.id),
          first_name: c.firstName || null,
          last_name: c.lastName || null,
          name: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Contact',
          street_address: c.streetAddress || null,
          suburb: c.suburb || null,
          state: c.state || null,
          postcode: c.postcode || null,
          area: c.area || null,
          email: c.email || null,
          phone: c.phone || null,
          contact_owner: c.contactOwner || null,
          contact_owner_name: c.contactOwnerName || null,
          contact_type: c.contactType || null,
          primary_company: c.primaryCompany || null,
          city: c.city || null,
          address: c.address || null,
          type: c.type || 'Residential',
          company_id: c.companyId ? toDeterministicUuid(c.companyId) : null,
          company_name: c.companyName || null,
          source: c.source || 'Manual',
          notes: notesVal || null,
          addresses: Array.isArray(c.addresses) ? c.addresses : [],
          updated_at: new Date().toISOString()
        };

        const filteredRow: Record<string, any> = {};
        for (const [k, v] of Object.entries(candidateRow)) {
          if (allowedCols.has(k)) {
            filteredRow[k] = v;
          }
        }
        return filteredRow;
      });

      // Deduplicate rows by id
      const uniqueMap = new Map<string, any>();
      for (const r of rows) uniqueMap.set(r.id, r);
      const uniqueRows = Array.from(uniqueMap.values());

      const { error: upsertErr } = await supabase.from('contacts').upsert(uniqueRows, { onConflict: 'id' });
      if (upsertErr) {
        if (isSupabaseQuotaError(upsertErr)) {
          markSupabaseRestricted(upsertErr.message);
        } else {
          console.error('[ContactsDb] Error upserting contacts to Supabase:', upsertErr.message, upsertErr.code);
        }
      } else {
        console.log(`[ContactsDb] Successfully saved ${uniqueRows.length} contact(s) to Supabase`);
      }
    } catch (err: any) {
      if (isSupabaseQuotaError(err)) {
        markSupabaseRestricted(err.message);
      } else {
        console.error('[ContactsDb] Error updating Supabase contacts:', err.message || err);
      }
    }
  }

  return true;
}

/**
 * Saves or updates a single contact in database and Supabase
 */
export async function saveSingleDbContact(contact: Contact): Promise<{ success: boolean; contact: Contact; error?: string }> {
  const current = await getDbContacts();
  const contactUuid = toDeterministicUuid(contact.id);
  const idx = current.findIndex(c => c.id === contact.id || toDeterministicUuid(c.id) === contactUuid);

  let updatedList: Contact[];
  if (idx >= 0) {
    updatedList = [...current];
    updatedList[idx] = { ...updatedList[idx], ...contact };
  } else {
    updatedList = [contact, ...current];
  }

  await saveDbContacts(updatedList);
  return { success: true, contact };
}

/**
 * Deletes a single contact by ID
 */
export async function deleteDbContact(contactId: string): Promise<boolean> {
  const current = await getDbContacts();
  const contactUuid = toDeterministicUuid(contactId);
  const next = current.filter(c => c.id !== contactId && toDeterministicUuid(c.id) !== contactUuid);
  await saveDbContacts(next);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('contacts').delete().in('id', [contactId, contactUuid]);
    } catch (err: any) {
      if (isSupabaseQuotaError(err)) {
        markSupabaseRestricted(err.message);
      } else {
        console.warn('[ContactsDb] Warning deleting contact from Supabase:', err.message || err);
      }
    }
  }

  return true;
}

/**
 * Clears all contacts
 */
export async function clearAllDbContacts(): Promise<boolean> {
  await saveDbContacts([]);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('contacts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (err: any) {
      if (isSupabaseQuotaError(err)) {
        markSupabaseRestricted(err.message);
      } else {
        console.warn('[ContactsDb] Warning clearing contacts from Supabase:', err.message || err);
      }
    }
  }

  return true;
}

/**
 * Core Google Sheet & Lead Contact Deduplication Logic:
 * 1. Checks contact details first (phone, email, or name).
 * 2. If contact details match:
 *    - Checks the address of the property in the lead.
 *    - If the property address is DIFFERENT: appends as secondary/tertiary address.
 *    - If the property address is the SAME: makes no changes to the contact's addresses.
 *    - In BOTH cases: ensures lead is associated with that contact.
 * 3. If contact is completely new:
 *    - Creates both the contact (with primary address) and associates the lead.
 * 4. Persists everything to Supabase.
 */
export async function ensureContactsForLeads(leads: Lead[]): Promise<Contact[]> {
  const currentContacts = await getDbContacts();
  let hasChanges = false;
  const contactMap = new Map<string, Contact>();
  for (const c of currentContacts) {
    contactMap.set(c.id, c);
  }

  for (const lead of leads) {
    const cleanEmail = (lead.email || '').trim().toLowerCase();
    const cleanPhone = (lead.primaryMobile || lead.phone || '').trim();
    const cleanPhoneNorm = normalizePhoneForComparison(cleanPhone);
    const cleanName = (lead.customerName || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || '').trim();
    const cleanNameNorm = normalizeNameForComparison(cleanName);

    if (!cleanName && !cleanEmail && !cleanPhone) continue;

    // Step 1: Check contact details first
    const existing = Array.from(contactMap.values()).find(c => {
      if (lead.contactId && (c.id === lead.contactId || toDeterministicUuid(c.id) === toDeterministicUuid(lead.contactId))) {
        return true;
      }
      if (cleanEmail && c.email && c.email.trim().toLowerCase() === cleanEmail) {
        return true;
      }
      if (cleanPhoneNorm && c.phone) {
        const cPhoneNorm = normalizePhoneForComparison(c.phone);
        if (cPhoneNorm === cleanPhoneNorm) return true;
        if (cPhoneNorm.length >= 9 && cleanPhoneNorm.length >= 9 && cPhoneNorm.slice(-9) === cleanPhoneNorm.slice(-9)) {
          return true;
        }
      }
      if (cleanNameNorm && cleanNameNorm.length > 2 && c.name) {
        const cNameNorm = normalizeNameForComparison(c.name);
        if (cNameNorm === cleanNameNorm) return true;
      }
      return false;
    });

    const leadStreet = (lead.address || '').trim();
    const leadSuburb = (lead.suburb || '').trim();
    const leadState = (lead.state || 'NSW').trim();
    const leadPostcode = (lead.postcode || '').trim();
    const fullAddr = leadStreet
      ? `${leadStreet}, ${leadSuburb} ${leadState} ${leadPostcode}`.trim()
      : `${leadSuburb} ${leadState}`.trim();

    // Step 2 & 3:
    if (!existing) {
      // Step 3: Completely new contact! Create both contact and link lead
      const fName = lead.firstName || (cleanName ? cleanName.split(' ')[0] : '');
      const lName = lead.lastName || (cleanName ? cleanName.split(' ').slice(1).join(' ') : '');
      const cid = lead.contactId || `cnt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      lead.contactId = cid;

      const firstAddress: ContactAddress = {
        id: `prop-${cid}-primary`,
        street: leadStreet,
        suburb: leadSuburb,
        state: (leadState as any) || 'NSW',
        postcode: leadPostcode,
        city: lead.nearestBigCity || leadSuburb || '',
        address: fullAddr,
        propertyType: lead.propertyType || 'Primary Residence',
        systemSizeKw: lead.systemSizeKw ? Number(lead.systemSizeKw) : undefined,
        isPrimary: true
      };

      const newContact: Contact = {
        id: cid,
        name: cleanName || `${fName} ${lName}`.trim() || 'Contact',
        firstName: fName,
        lastName: lName,
        email: cleanEmail,
        phone: cleanPhone,
        address: fullAddr,
        streetAddress: leadStreet,
        suburb: leadSuburb,
        state: leadState,
        postcode: leadPostcode,
        city: lead.nearestBigCity || leadSuburb || '',
        area: lead.area || '',
        addresses: [firstAddress],
        type: lead.hasCompany ? 'Commercial' : 'Residential',
        contactType: lead.hasCompany ? 'Commercial' : 'Residential',
        source: lead.platform || 'Google Sheet Sync',
        contactOwner: lead.salesPersonName || '',
        contactOwnerName: lead.salesPersonName || '',
        companyId: lead.companyId,
        companyName: lead.companyName,
        createdAt: lead.leadDate || lead.createdAt || new Date().toISOString().split('T')[0]
      };

      contactMap.set(newContact.id, newContact);
      hasChanges = true;
    } else {
      // Step 2: Contact exists! Check property address
      lead.contactId = existing.id;

      // Ensure existing primary address is initialized in addresses array
      if (!existing.addresses || existing.addresses.length === 0) {
        const primaryAddr: ContactAddress = {
          id: `prop-${existing.id}-primary`,
          street: existing.streetAddress || existing.address || '',
          suburb: existing.suburb || existing.city || '',
          state: (existing.state as any) || 'NSW',
          postcode: existing.postcode || '',
          city: existing.city || existing.suburb || '',
          address: existing.address || `${existing.streetAddress || ''}, ${existing.suburb || ''} ${existing.state || ''}`.trim(),
          propertyType: 'Primary Residence',
          isPrimary: true
        };
        existing.addresses = [primaryAddr];
        hasChanges = true;
      }

      // Check if property address is different
      if (leadStreet || leadSuburb) {
        const isSameAddress = (existing.addresses || []).some(a => {
          const normAStreet = normalizeAddressForComparison(a.street || a.address);
          const normLeadStreet = normalizeAddressForComparison(leadStreet);
          if (normAStreet && normLeadStreet && normAStreet === normLeadStreet) return true;
          const normAFull = normalizeAddressForComparison(a.address || a.street);
          const normLeadFull = normalizeAddressForComparison(fullAddr);
          if (normAFull && normLeadFull && normAFull === normLeadFull) return true;
          return false;
        });

        if (!isSameAddress) {
          // Property address is DIFFERENT -> add to contact as secondary/tertiary address
          const currentCount = existing.addresses?.length || 1;
          const propLabel = currentCount === 1 ? 'Secondary Property' : currentCount === 2 ? 'Tertiary Property' : `Property #${currentCount + 1}`;

          const newAddress: ContactAddress = {
            id: `prop-${existing.id}-${currentCount + 1}`,
            street: leadStreet,
            suburb: leadSuburb,
            state: (leadState as any) || existing.state || 'NSW',
            postcode: leadPostcode || existing.postcode || '',
            city: lead.nearestBigCity || leadSuburb || existing.city || '',
            address: fullAddr,
            propertyType: lead.propertyType || propLabel,
            systemSizeKw: lead.systemSizeKw ? Number(lead.systemSizeKw) : undefined,
            isPrimary: false
          };

          existing.addresses = [...(existing.addresses || []), newAddress];
          hasChanges = true;
        }
        // If property address is the SAME: do not make any changes in the contacts!
      }
    }
  }

  const result = Array.from(contactMap.values());
  if (hasChanges) {
    await saveDbContacts(result);
  }
  return result;
}
