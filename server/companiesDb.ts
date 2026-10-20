import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Company } from '../src/types/index.ts';
import { getSupabase, isSupabaseQuotaError, markSupabaseRestricted } from './supabase.ts';

const COMPANIES_CACHE_FILE = path.join(process.cwd(), '.companies_db.json');

function toDeterministicUuid(id: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;
  const hash = crypto.createHash('md5').update(id || 'company-default').digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    '8' + hash.substring(17, 20),
    hash.substring(20, 32)
  ].join('-');
}

function loadLocalCompanies(): Company[] {
  try {
    if (fs.existsSync(COMPANIES_CACHE_FILE)) {
      const raw = fs.readFileSync(COMPANIES_CACHE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('[CompaniesDb] Failed reading local companies cache:', err);
  }
  return [];
}

function saveLocalCompanies(companies: Company[]) {
  try {
    fs.writeFileSync(COMPANIES_CACHE_FILE, JSON.stringify(companies, null, 2), 'utf8');
  } catch (err) {
    console.warn('[CompaniesDb] Failed writing local companies cache:', err);
  }
}

export function mapDbRowToCompany(row: any): Company {
  return {
    id: row.id,
    name: row.name || 'Unnamed Company',
    companyOwner: row.company_owner || row.company_owner_name || 'Mitchell Barnes',
    companyOwnerName: row.company_owner_name || row.company_owner || 'Mitchell Barnes',
    createdAt: row.created_at || new Date().toISOString().split('T')[0],
    phone: row.phone || '',
    country: row.country || 'Australia',
    abn: row.abn || '',
    type: row.type || 'Commercial Customer',
    state: row.state || 'NSW',
    city: row.city || '',
    email: row.email || '',
    contactPerson: row.contact_person || '',
    cecAccredited: Boolean(row.cec_accredited),
    creditLimit: row.credit_limit ? Number(row.credit_limit) : 0,
    activeProjectsCount: row.active_projects_count ? Number(row.active_projects_count) : 0,
    abnVerified: Boolean(row.abn_verified),
    os_id: row.os_id || undefined,
    last_synced_at: row.last_synced_at || undefined,
    last_updated_by: row.last_updated_by || 'crm_user'
  };
}

export function convertCompanyToDbRow(c: Company, existingRow?: any) {
  const deterministicId = toDeterministicUuid(c.id || `comp-${Date.now()}`);

  return {
    id: existingRow?.id || deterministicId,
    name: c.name || 'Unnamed Company',
    company_owner: c.companyOwner || c.companyOwnerName || null,
    company_owner_name: c.companyOwnerName || c.companyOwner || null,
    phone: c.phone || null,
    country: c.country || 'Australia',
    abn: c.abn || null,
    type: c.type || 'Commercial Customer',
    state: c.state || 'NSW',
    city: c.city || null,
    email: c.email || null,
    contact_person: c.contactPerson || null,
    cec_accredited: Boolean(c.cecAccredited),
    credit_limit: typeof c.creditLimit === 'number' ? c.creditLimit : 0,
    active_projects_count: typeof c.activeProjectsCount === 'number' ? c.activeProjectsCount : 0,
    abn_verified: Boolean(c.abnVerified),
    os_id: c.os_id || null,
    last_synced_at: c.last_synced_at || null,
    last_updated_by: c.last_updated_by || 'crm_user'
  };
}

export async function getDbCompanies(): Promise<Company[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const mapped = data.map(mapDbRowToCompany);
        saveLocalCompanies(mapped);
        return mapped;
      }
      if (error) {
        if (isSupabaseQuotaError(error)) {
          markSupabaseRestricted(error.message);
        } else {
          console.info('[CompaniesDb] Supabase read note, using local cache:', error.message);
        }
      }
    } catch (err: any) {
      if (isSupabaseQuotaError(err)) {
        markSupabaseRestricted(err.message);
      } else {
        console.info('[CompaniesDb] Supabase query note, using local cache:', err?.message || err);
      }
    }
  }

  return loadLocalCompanies();
}

export async function saveSingleDbCompany(company: Company): Promise<Company> {
  const supabase = getSupabase();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  let existingDbRow: any = null;
  if (supabase) {
    try {
      const searchId = company.id;
      if (searchId && uuidRegex.test(searchId)) {
        const { data } = await supabase.from('companies').select('id, name').eq('id', searchId).limit(1);
        if (data && data.length > 0) existingDbRow = data[0];
      } else if (company.name) {
        const { data } = await supabase.from('companies').select('id, name').eq('name', company.name).limit(1);
        if (data && data.length > 0) existingDbRow = data[0];
      }
    } catch {}
  }

  const row = convertCompanyToDbRow(company, existingDbRow);

  if (supabase) {
    try {
      const { data, error } = await supabase.from('companies').upsert(row).select();
      if (!error && data && data[0]) {
        const saved = mapDbRowToCompany(data[0]);
        const local = loadLocalCompanies();
        const updatedLocal = [saved, ...local.filter(c => c.id !== saved.id && c.name.toLowerCase() !== saved.name.toLowerCase())];
        saveLocalCompanies(updatedLocal);
        return saved;
      }
      if (error) {
        if (isSupabaseQuotaError(error)) {
          markSupabaseRestricted(error.message);
        } else {
          console.info('[CompaniesDb] Supabase upsert note, using local persistence:', error.message);
        }
      }
    } catch (err: any) {
      if (isSupabaseQuotaError(err)) {
        markSupabaseRestricted(err.message);
      } else {
        console.info('[CompaniesDb] Supabase upsert note, using local persistence:', err?.message || err);
      }
    }
  }

  const local = loadLocalCompanies();
  const fallbackCompany: Company = {
    ...company,
    id: row.id
  };
  const updatedLocal = [fallbackCompany, ...local.filter(c => c.id !== fallbackCompany.id && c.name.toLowerCase() !== fallbackCompany.name.toLowerCase())];
  saveLocalCompanies(updatedLocal);
  return fallbackCompany;
}

export async function deleteDbCompany(id: string): Promise<boolean> {
  const supabase = getSupabase();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (supabase) {
    try {
      if (uuidRegex.test(id)) {
        await supabase.from('companies').delete().eq('id', id);
      } else {
        await supabase.from('companies').delete().eq('name', id);
      }
    } catch (err: any) {
      if (isSupabaseQuotaError(err)) {
        markSupabaseRestricted(err.message);
      } else {
        console.info('[CompaniesDb] Supabase delete note, processed locally:', err?.message || err);
      }
    }
  }

  const local = loadLocalCompanies();
  const filtered = local.filter(c => c.id !== id && c.name !== id);
  saveLocalCompanies(filtered);
  return true;
}
