import fs from 'fs';
import path from 'path';
import { getSupabase } from './supabase';
import { Contact, ContactAddress, Lead } from '../src/types';
import { normalizeAddressForComparison } from '../src/utils/googleSheetsTemplate';

const CONTACTS_DB_FILE = path.join(process.cwd(), '.contacts_db.json');

/**
 * Reads all contacts from persistent store (.contacts_db.json or Supabase)
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
        const sbContacts: Contact[] = data.map((d: any) => ({
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
          type: d.type || 'Residential',
          companyId: d.company_id || undefined,
          companyName: d.company_name || undefined,
          source: d.source || 'Manual',
          notes: d.notes || '',
          createdAt: d.created_at || new Date().toISOString().split('T')[0]
        }));

        const mergedMap = new Map<string, Contact>();
        for (const c of fileContacts) mergedMap.set(c.id, c);
        for (const c of sbContacts) mergedMap.set(c.id, c);
        return Array.from(mergedMap.values());
      }
    } catch (err: any) {
      console.warn('[ContactsDb] Warning querying Supabase contacts:', err.message || err);
    }
  }

  return fileContacts;
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
      const rows = contacts.map(c => ({
        id: c.id,
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
        company_id: c.companyId || null,
        company_name: c.companyName || null,
        source: c.source || 'Manual',
        notes: c.notes || null,
        updated_at: new Date().toISOString()
      }));

      await supabase.from('contacts').upsert(rows, { onConflict: 'id' });
    } catch (err: any) {
      console.warn('[ContactsDb] Warning updating Supabase contacts:', err.message || err);
    }
  }

  return true;
}

/**
 * Deletes a single contact by ID
 */
export async function deleteDbContact(contactId: string): Promise<boolean> {
  const current = await getDbContacts();
  const next = current.filter(c => c.id !== contactId);
  await saveDbContacts(next);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('contacts').delete().eq('id', contactId);
    } catch (err: any) {
      console.warn('[ContactsDb] Warning deleting contact from Supabase:', err.message || err);
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
      console.warn('[ContactsDb] Warning clearing contacts from Supabase:', err.message || err);
    }
  }

  return true;
}

/**
 * Ensures that all leads have a corresponding contact in the contacts database.
 * If any lead does not have a contact matching email, phone, or name, it automatically
 * creates the contact and saves it to .contacts_db.json and Supabase.
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
    const cleanDigits = cleanPhone.replace(/[^0-9]/g, '');
    const cleanName = (lead.customerName || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || '').trim();
    if (!cleanName && !cleanEmail && !cleanPhone) continue;

    const existing = Array.from(contactMap.values()).find(c => {
      if (lead.contactId && c.id === lead.contactId) return true;
      if (cleanEmail && c.email && c.email.trim().toLowerCase() === cleanEmail) return true;
      if (cleanDigits && cleanDigits.length >= 6 && c.phone) {
        const cDigits = c.phone.replace(/[^0-9]/g, '');
        if (cDigits === cleanDigits || (cDigits.length >= 9 && cleanDigits.length >= 9 && cDigits.slice(-9) === cleanDigits.slice(-9))) {
          return true;
        }
      }
      if (cleanName && cleanName.length > 2 && c.name && c.name.trim().toLowerCase() === cleanName.toLowerCase()) {
        return true;
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

    if (!existing) {
      const fName = lead.firstName || (cleanName ? cleanName.split(' ')[0] : '');
      const lName = lead.lastName || (cleanName ? cleanName.split(' ').slice(1).join(' ') : '');
      const cid = lead.contactId || `cnt-${lead.id || Date.now()}`;
      lead.contactId = cid;

      const firstAddress: ContactAddress = {
        id: `prop-${cid}-1`,
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
        source: lead.platform || 'Lead Inbound',
        contactOwner: lead.salesPersonName || '',
        contactOwnerName: lead.salesPersonName || '',
        companyId: lead.companyId,
        companyName: lead.companyName,
        createdAt: lead.leadDate || lead.createdAt || new Date().toISOString().split('T')[0]
      };

      contactMap.set(newContact.id, newContact);
      hasChanges = true;
    } else {
      // Existing contact! Ensure lead is linked to this contact ID
      lead.contactId = existing.id;

      // Ensure primary address exists in addresses array
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

      // Check if this lead brings a distinct 2nd (or multiple) property address
      if (leadStreet || leadSuburb) {
        const alreadyPresent = (existing.addresses || []).some(a => {
          const normAStreet = normalizeAddressForComparison(a.street || a.address);
          const normLeadStreet = normalizeAddressForComparison(leadStreet);
          if (normAStreet && normLeadStreet && normAStreet === normLeadStreet) return true;
          const normAFull = normalizeAddressForComparison(a.address || a.street);
          const normLeadFull = normalizeAddressForComparison(fullAddr);
          if (normAFull && normLeadFull && normAFull === normLeadFull) return true;
          return false;
        });

        if (!alreadyPresent) {
          const newAddress: ContactAddress = {
            id: `prop-${existing.id}-${(existing.addresses?.length || 0) + 1}`,
            street: leadStreet,
            suburb: leadSuburb,
            state: (leadState as any) || existing.state || 'NSW',
            postcode: leadPostcode || existing.postcode || '',
            city: lead.nearestBigCity || leadSuburb || existing.city || '',
            address: fullAddr,
            propertyType: lead.propertyType || 'Investment Property',
            systemSizeKw: lead.systemSizeKw ? Number(lead.systemSizeKw) : undefined,
            isPrimary: false
          };
          existing.addresses = [...(existing.addresses || []), newAddress];
          hasChanges = true;
        }
      }
    }
  }

  const result = Array.from(contactMap.values());
  if (hasChanges) {
    await saveDbContacts(result);
  }
  return result;
}
