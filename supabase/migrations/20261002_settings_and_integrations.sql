-- ==============================================================================
-- MIGRATION: Settings & Integrations Database Tables for Supabase
-- Target: Supabase (PostgreSQL 15+)
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. App Settings Table (Key-Value / JSONB Store for Global CRM Configurations)
-- Stores: Dropdown option lists, operational rules, system features, company profile,
-- portal addresses, role-based access control, Google Sheet sync parameters.
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
-- Stores: Connection status, enabled toggles, API keys/identifiers, webhook URLs,
-- sync frequencies, and error logs for all third-party integrations (Xero, OpenSolar,
-- BridgeSelect, Sinch MessageMedia, VoIPLine, Gmail, WhatsApp, Teams, Meta Ads, etc.).
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

-- 3. Dedicated Dropdown Options Table (Optional Normalized View for Custom Dropdowns)
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

-- 5. Enable Row Level Security (RLS) & Grant Permissive Access
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dropdown_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_allow_all_app_settings" ON public.app_settings;
CREATE POLICY "crm_allow_all_app_settings" ON public.app_settings FOR ALL USING (true);

DROP POLICY IF EXISTS "crm_allow_all_integrations_config" ON public.integrations_config;
CREATE POLICY "crm_allow_all_integrations_config" ON public.integrations_config FOR ALL USING (true);

DROP POLICY IF EXISTS "crm_allow_all_dropdown_options" ON public.dropdown_options;
CREATE POLICY "crm_allow_all_dropdown_options" ON public.dropdown_options FOR ALL USING (true);

-- 6. Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER trg_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

DROP TRIGGER IF EXISTS trg_integrations_config_updated_at ON public.integrations_config;
CREATE TRIGGER trg_integrations_config_updated_at
BEFORE UPDATE ON public.integrations_config
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
