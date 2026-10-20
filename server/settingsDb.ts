import fs from 'fs';
import path from 'path';
import { getSupabase, isSupabaseQuotaError, markSupabaseRestricted, isSupabaseRestricted } from './supabase.ts';

const SETTINGS_FILE = path.join(process.cwd(), '.app_settings.json');
const INTEGRATIONS_FILE = path.join(process.cwd(), '.integrations_db.json');

export const SUPABASE_SETTINGS_MIGRATION_SQL = `-- ==============================================================================
-- MIGRATION: Settings & Integrations Database Tables for Supabase
-- Target: Supabase (PostgreSQL 15+)
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Global System Settings Table
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  category TEXT DEFAULT 'general',
  description TEXT,
  updated_by TEXT DEFAULT 'crm_admin',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Integrations Configuration Table
CREATE TABLE IF NOT EXISTS public.integrations_config (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  enabled BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'disconnected',
  config JSONB DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  sync_frequency TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Dedicated Dropdown Options Table
CREATE TABLE IF NOT EXISTS public.dropdown_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (category, value)
);

-- 4. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_app_settings_category ON public.app_settings(category);
CREATE INDEX IF NOT EXISTS idx_integrations_config_category ON public.integrations_config(category);
CREATE INDEX IF NOT EXISTS idx_integrations_config_enabled ON public.integrations_config(enabled);
CREATE INDEX IF NOT EXISTS idx_dropdown_options_category ON public.dropdown_options(category);

-- 5. Row Level Security & Permissive Access
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dropdown_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_allow_all_app_settings" ON public.app_settings;
CREATE POLICY "crm_allow_all_app_settings" ON public.app_settings FOR ALL USING (true);

DROP POLICY IF EXISTS "crm_allow_all_integrations_config" ON public.integrations_config;
CREATE POLICY "crm_allow_all_integrations_config" ON public.integrations_config FOR ALL USING (true);

DROP POLICY IF EXISTS "crm_allow_all_dropdown_options" ON public.dropdown_options;
CREATE POLICY "crm_allow_all_dropdown_options" ON public.dropdown_options FOR ALL USING (true);

-- 6. Contacts Table: Addresses JSONB Support
ALTER TABLE public.contacts 
  ADD COLUMN IF NOT EXISTS addresses JSONB DEFAULT '[]'::jsonb;

-- 7. Leads Table: Native Visible Columns in Supabase Table Editor
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS primary_mobile TEXT,
  ADD COLUMN IF NOT EXISTS secondary_mobile TEXT,
  ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS system_price_aud NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS budget_aud NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS deposit NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS deposit_aud NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS deposit_received_date DATE,
  ADD COLUMN IF NOT EXISTS sale_date DATE,
  ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT 'Residential',
  ADD COLUMN IF NOT EXISTS roof_type TEXT,
  ADD COLUMN IF NOT EXISTS phase TEXT,
  ADD COLUMN IF NOT EXISTS phase_type TEXT,
  ADD COLUMN IF NOT EXISTS house_storey TEXT,
  ADD COLUMN IF NOT EXISTS nearest_big_city TEXT,
  ADD COLUMN IF NOT EXISTS area TEXT,
  ADD COLUMN IF NOT EXISTS address_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS manager_rentee_first_name TEXT,
  ADD COLUMN IF NOT EXISTS manager_rentee_last_name TEXT,
  ADD COLUMN IF NOT EXISTS sales_team_notes TEXT,
  ADD COLUMN IF NOT EXISTS no_of_panels INTEGER,
  ADD COLUMN IF NOT EXISTS panel_manufacturer TEXT,
  ADD COLUMN IF NOT EXISTS panel_model TEXT,
  ADD COLUMN IF NOT EXISTS panel_size_w TEXT,
  ADD COLUMN IF NOT EXISTS panel_series TEXT,
  ADD COLUMN IF NOT EXISTS no_of_inverters INTEGER,
  ADD COLUMN IF NOT EXISTS inverter_manufacturer TEXT,
  ADD COLUMN IF NOT EXISTS inverter_model TEXT,
  ADD COLUMN IF NOT EXISTS inverter_series TEXT,
  ADD COLUMN IF NOT EXISTS battery_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS no_of_batteries INTEGER,
  ADD COLUMN IF NOT EXISTS battery_manufacturer TEXT,
  ADD COLUMN IF NOT EXISTS battery_model TEXT,
  ADD COLUMN IF NOT EXISTS battery_usable_capacity_kwh NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS battery_size TEXT,
  ADD COLUMN IF NOT EXISTS quarterly_bill_aud NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS docs_received TEXT,
  ADD COLUMN IF NOT EXISTS docs_received_date DATE,
  ADD COLUMN IF NOT EXISTS existing_system_details TEXT,
  ADD COLUMN IF NOT EXISTS sheet_sync_row_id TEXT,
  ADD COLUMN IF NOT EXISTS xero_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS xero_invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS xero_invoice_total NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS xero_invoice_status TEXT;

-- 8. Backfill Native Columns from existing data
UPDATE public.leads 
SET customer_name = COALESCE(customer_name, full_name, (first_name || ' ' || last_name))
WHERE customer_name IS NULL;

UPDATE public.leads 
SET primary_mobile = COALESCE(primary_mobile, phone, phone_number)
WHERE primary_mobile IS NULL;

UPDATE public.leads 
SET selling_price = COALESCE(selling_price, quoted_price_aud)
WHERE selling_price IS NULL;
`;

export interface AppSettingRecord {
  key: string;
  value: any;
  category?: string;
  description?: string;
  updated_by?: string;
  updated_at?: string;
}

export interface IntegrationRecord {
  id: string;
  name: string;
  category?: string;
  enabled?: boolean;
  status?: string;
  config?: Record<string, any>;
  last_synced_at?: string;
  sync_frequency?: string;
  error_message?: string;
  updated_at?: string;
}

/**
 * Reads local fallback file for settings
 */
function readLocalSettings(): Record<string, AppSettingRecord> {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
  } catch (err) {
    console.warn('[SettingsDb] Could not read local settings file:', err);
  }
  return {};
}

/**
 * Writes local fallback file for settings
 */
function writeLocalSettings(data: Record<string, AppSettingRecord>): void {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('[SettingsDb] Could not write local settings file:', err);
  }
}

const DEFAULT_INTEGRATIONS: IntegrationRecord[] = [
  { id: 'gmail', name: 'Gmail Personal Email App', category: 'Personal Communication', enabled: true, status: 'connected' },
  { id: 'bridgeselect', name: 'CER BridgeSelect STC Portal', category: 'Regulatory & Rebates', enabled: true, status: 'connected' },
  { id: 'xero', name: 'Xero Cloud Accounting', category: 'Finance & Invoicing', enabled: true, status: 'connected' },
  { id: 'opensolar', name: 'OpenSolar Design Platform', category: 'Solar Engineering', enabled: true, status: 'connected' },
  { id: 'messagemedia', name: 'MessageMedia SMS Gateway', category: 'Customer Communication', enabled: true, status: 'connected' },
  { id: 'mailchimp', name: 'Mailchimp Newsletter & EDM', category: 'Marketing Automation', enabled: true, status: 'connected' },
  { id: 'whatsapp', name: 'WhatsApp Business API', category: 'Customer Communication', enabled: true, status: 'connected' },
  { id: 'voipline', name: 'VoIPLine Telecom AU', category: 'Telephony & PBX', enabled: true, status: 'connected' },
  { id: 'messenger', name: 'Meta Ads & Messenger Lead Sync', category: 'Lead Generation', enabled: true, status: 'connected' },
  { id: 'teams', name: 'Microsoft Teams Webhook', category: 'Internal Comms', enabled: true, status: 'connected' }
];

/**
 * Reads local fallback file for integrations
 */
function readLocalIntegrations(): IntegrationRecord[] {
  try {
    if (fs.existsSync(INTEGRATIONS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(INTEGRATIONS_FILE, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[SettingsDb] Could not read local integrations file:', err);
  }
  return DEFAULT_INTEGRATIONS;
}

/**
 * Writes local fallback file for integrations
 */
function writeLocalIntegrations(data: IntegrationRecord[]): void {
  try {
    fs.writeFileSync(INTEGRATIONS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('[SettingsDb] Could not write local integrations file:', err);
  }
}

/**
 * Get all settings or a single setting by key
 */
export async function getDbSettings(key?: string): Promise<Record<string, any>> {
  const localMap = readLocalSettings();
  const supabase = getSupabase();

  if (supabase) {
    try {
      let query = supabase.from('app_settings').select('*');
      if (key) {
        query = query.eq('key', key);
      }
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        data.forEach(row => {
          localMap[row.key] = {
            key: row.key,
            value: row.value,
            category: row.category,
            description: row.description,
            updated_by: row.updated_by,
            updated_at: row.updated_at
          };
        });
        // Cache to local file
        writeLocalSettings(localMap);
      } else if (error) {
        if (isSupabaseQuotaError(error)) {
          markSupabaseRestricted(error.message);
        } else {
          console.warn('[SettingsDb] Supabase read app_settings warning (using fallback):', error.message);
        }
      }
    } catch (err: any) {
      if (isSupabaseQuotaError(err)) {
        markSupabaseRestricted(err.message);
      } else {
        console.warn('[SettingsDb] Failed to fetch settings from Supabase:', err);
      }
    }
  }

  if (key) {
    return localMap[key] ? { [key]: localMap[key].value } : {};
  }

  // Return key-value dictionary
  const result: Record<string, any> = {};
  Object.keys(localMap).forEach(k => {
    result[k] = localMap[k].value;
  });
  return result;
}

/**
 * Save / Upsert a single setting
 */
export async function saveDbSetting(
  key: string,
  value: any,
  category = 'general',
  description?: string
): Promise<{ success: boolean; source: 'supabase' | 'local_fallback'; error?: string }> {
  const now = new Date().toISOString();
  const localMap = readLocalSettings();
  localMap[key] = {
    key,
    value,
    category,
    description,
    updated_by: 'crm_admin',
    updated_at: now
  };
  writeLocalSettings(localMap);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from('app_settings').upsert({
        key,
        value,
        category,
        description: description || null,
        updated_by: 'crm_admin',
        updated_at: now
      }, { onConflict: 'key' });

      if (error) {
        if (isSupabaseQuotaError(error)) {
          markSupabaseRestricted(error.message);
          return { success: true, source: 'local_fallback' };
        }
        console.warn(`[SettingsDb] Supabase upsert error for key "${key}":`, error.message);
        return { success: true, source: 'local_fallback', error: error.message };
      }
      return { success: true, source: 'supabase' };
    } catch (err: any) {
      if (isSupabaseQuotaError(err)) {
        markSupabaseRestricted(err.message);
        return { success: true, source: 'local_fallback' };
      }
      console.warn(`[SettingsDb] Supabase upsert failed for key "${key}":`, err.message);
      return { success: true, source: 'local_fallback', error: err.message };
    }
  }

  return { success: true, source: 'local_fallback' };
}

/**
 * Batch save multiple settings
 */
export async function saveDbSettingsBatch(
  entries: Array<{ key: string; value: any; category?: string; description?: string }>
): Promise<{ success: boolean; count: number; source: 'supabase' | 'local_fallback'; error?: string }> {
  const now = new Date().toISOString();
  const localMap = readLocalSettings();

  const supabasePayload: any[] = [];
  for (const item of entries) {
    localMap[item.key] = {
      key: item.key,
      value: item.value,
      category: item.category || 'general',
      description: item.description,
      updated_by: 'crm_admin',
      updated_at: now
    };
    supabasePayload.push({
      key: item.key,
      value: item.value,
      category: item.category || 'general',
      description: item.description || null,
      updated_by: 'crm_admin',
      updated_at: now
    });
  }
  writeLocalSettings(localMap);

  const supabase = getSupabase();
  if (supabase && supabasePayload.length > 0) {
    try {
      const { error } = await supabase.from('app_settings').upsert(supabasePayload, { onConflict: 'key' });
      if (error) {
        if (isSupabaseQuotaError(error)) {
          markSupabaseRestricted(error.message);
          return { success: true, count: entries.length, source: 'local_fallback' };
        }
        console.warn('[SettingsDb] Supabase batch upsert app_settings warning:', error.message);
        return { success: true, count: entries.length, source: 'local_fallback', error: error.message };
      }
      return { success: true, count: entries.length, source: 'supabase' };
    } catch (err: any) {
      if (isSupabaseQuotaError(err)) {
        markSupabaseRestricted(err.message);
        return { success: true, count: entries.length, source: 'local_fallback' };
      }
      console.warn('[SettingsDb] Supabase batch upsert failed:', err.message);
      return { success: true, count: entries.length, source: 'local_fallback', error: err.message };
    }
  }

  return { success: true, count: entries.length, source: 'local_fallback' };
}

/**
 * Get all integrations from Supabase integrations_config
 */
export async function getDbIntegrations(): Promise<IntegrationRecord[]> {
  let list = readLocalIntegrations();
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase.from('integrations_config').select('*').order('name', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        list = data.map(row => ({
          id: row.id,
          name: row.name,
          category: row.category,
          enabled: Boolean(row.enabled),
          status: row.status || 'disconnected',
          config: row.config || {},
          last_synced_at: row.last_synced_at,
          sync_frequency: row.sync_frequency,
          error_message: row.error_message,
          updated_at: row.updated_at
        }));
        writeLocalIntegrations(list);
      } else if (error) {
        if (isSupabaseQuotaError(error)) {
          markSupabaseRestricted(error.message);
        } else {
          console.warn('[SettingsDb] Supabase integrations_config read warning (using local fallback):', error.message);
        }
      }
    } catch (err: any) {
      if (isSupabaseQuotaError(err)) {
        markSupabaseRestricted(err.message);
      } else {
        console.warn('[SettingsDb] Failed to read integrations_config from Supabase:', err);
      }
    }
  }

  return list;
}

/**
 * Save an integration configuration to Supabase
 */
export async function saveDbIntegration(
  integration: IntegrationRecord
): Promise<{ success: boolean; source: 'supabase' | 'local_fallback'; error?: string }> {
  if (!integration.id) {
    throw new Error('Integration id is required');
  }

  const now = new Date().toISOString();
  const current = readLocalIntegrations();
  const idx = current.findIndex(i => i.id === integration.id);
  const updatedItem: IntegrationRecord = {
    ...integration,
    updated_at: now
  };

  if (idx >= 0) {
    current[idx] = { ...current[idx], ...updatedItem };
  } else {
    current.push(updatedItem);
  }
  writeLocalIntegrations(current);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from('integrations_config').upsert({
        id: updatedItem.id,
        name: updatedItem.name,
        category: updatedItem.category || 'general',
        enabled: Boolean(updatedItem.enabled),
        status: updatedItem.status || 'disconnected',
        config: updatedItem.config || {},
        last_synced_at: updatedItem.last_synced_at || null,
        sync_frequency: updatedItem.sync_frequency || null,
        error_message: updatedItem.error_message || null,
        updated_at: now
      }, { onConflict: 'id' });

      if (error) {
        if (isSupabaseQuotaError(error)) {
          markSupabaseRestricted(error.message);
          return { success: true, source: 'local_fallback' };
        }
        console.warn(`[SettingsDb] Supabase integrations_config upsert warning for "${integration.id}":`, error.message);
        return { success: true, source: 'local_fallback', error: error.message };
      }
      return { success: true, source: 'supabase' };
    } catch (err: any) {
      if (isSupabaseQuotaError(err)) {
        markSupabaseRestricted(err.message);
        return { success: true, source: 'local_fallback' };
      }
      console.warn(`[SettingsDb] Failed to upsert integration to Supabase:`, err.message);
      return { success: true, source: 'local_fallback', error: err.message };
    }
  }

  return { success: true, source: 'local_fallback' };
}

/**
 * Save batch integrations
 */
export async function saveDbIntegrationsBatch(
  integrations: IntegrationRecord[]
): Promise<{ success: boolean; count: number; source: 'supabase' | 'local_fallback'; error?: string }> {
  if (!Array.isArray(integrations) || integrations.length === 0) {
    return { success: true, count: 0, source: 'local_fallback' };
  }

  const now = new Date().toISOString();
  const current = readLocalIntegrations();
  const map = new Map<string, IntegrationRecord>();
  current.forEach(i => map.set(i.id, i));

  const supabasePayload: any[] = [];
  for (const item of integrations) {
    const merged: IntegrationRecord = {
      ...map.get(item.id),
      ...item,
      updated_at: now
    };
    map.set(item.id, merged);
    supabasePayload.push({
      id: merged.id,
      name: merged.name,
      category: merged.category || 'general',
      enabled: Boolean(merged.enabled),
      status: merged.status || 'disconnected',
      config: merged.config || {},
      last_synced_at: merged.last_synced_at || null,
      sync_frequency: merged.sync_frequency || null,
      error_message: merged.error_message || null,
      updated_at: now
    });
  }

  writeLocalIntegrations(Array.from(map.values()));

  const supabase = getSupabase();
  if (supabase && supabasePayload.length > 0) {
    try {
      const { error } = await supabase.from('integrations_config').upsert(supabasePayload, { onConflict: 'id' });
      if (error) {
        if (isSupabaseQuotaError(error)) {
          markSupabaseRestricted(error.message);
          return { success: true, count: integrations.length, source: 'local_fallback' };
        }
        console.warn('[SettingsDb] Supabase integrations_config batch upsert warning:', error.message);
        return { success: true, count: integrations.length, source: 'local_fallback', error: error.message };
      }
      return { success: true, count: integrations.length, source: 'supabase' };
    } catch (err: any) {
      if (isSupabaseQuotaError(err)) {
        markSupabaseRestricted(err.message);
        return { success: true, count: integrations.length, source: 'local_fallback' };
      }
      console.warn('[SettingsDb] Supabase integrations_config batch upsert error:', err.message);
      return { success: true, count: integrations.length, source: 'local_fallback', error: err.message };
    }
  }

  return { success: true, count: integrations.length, source: 'local_fallback' };
}

/**
 * Check connectivity and existence of settings tables in Supabase
 */
export async function checkSettingsDatabaseStatus(): Promise<{
  supabaseConfigured: boolean;
  supabaseRestricted?: boolean;
  restrictionReason?: string;
  appSettingsTableOk: boolean;
  integrationsConfigTableOk: boolean;
  appSettingsCount: number;
  integrationsCount: number;
  message: string;
}> {
  if (isSupabaseRestricted()) {
    return {
      supabaseConfigured: true,
      supabaseRestricted: true,
      restrictionReason: 'exceed_egress_quota',
      appSettingsTableOk: false,
      integrationsConfigTableOk: false,
      appSettingsCount: 0,
      integrationsCount: 0,
      message: 'Supabase cloud egress quota reached. High-speed local database persistence mode is active and protecting all data.'
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      supabaseConfigured: false,
      appSettingsTableOk: false,
      integrationsConfigTableOk: false,
      appSettingsCount: 0,
      integrationsCount: 0,
      message: 'Supabase credentials are not yet configured in Environment or API Keys.'
    };
  }

  let appSettingsOk = false;
  let appSettingsCount = 0;
  let integrationsOk = false;
  let integrationsCount = 0;

  try {
    const { data, error } = await supabase.from('app_settings').select('key').limit(1);
    if (!error) {
      appSettingsOk = true;
      appSettingsCount = Array.isArray(data) ? data.length : 0;
    } else if (isSupabaseQuotaError(error)) {
      markSupabaseRestricted(error.message);
      return {
        supabaseConfigured: true,
        supabaseRestricted: true,
        restrictionReason: error.message,
        appSettingsTableOk: false,
        integrationsConfigTableOk: false,
        appSettingsCount: 0,
        integrationsCount: 0,
        message: 'Supabase cloud egress quota reached. High-speed local database persistence mode is active and protecting all data.'
      };
    }
  } catch (err: any) {
    if (isSupabaseQuotaError(err)) {
      markSupabaseRestricted(err.message);
    }
  }

  try {
    const { data, error } = await supabase.from('integrations_config').select('id').limit(1);
    if (!error) {
      integrationsOk = true;
      integrationsCount = Array.isArray(data) ? data.length : 0;
    } else if (isSupabaseQuotaError(error)) {
      markSupabaseRestricted(error.message);
    }
  } catch (err: any) {
    if (isSupabaseQuotaError(err)) {
      markSupabaseRestricted(err.message);
    }
  }

  let message = 'All settings & integrations tables are active in Supabase.';
  if (!appSettingsOk || !integrationsOk) {
    message = 'Tables app_settings or integrations_config need to be created in Supabase. Run the SQL migration in your Supabase SQL Editor.';
  }

  return {
    supabaseConfigured: true,
    appSettingsTableOk: appSettingsOk,
    integrationsConfigTableOk: integrationsOk,
    appSettingsCount,
    integrationsCount,
    message
  };
}
