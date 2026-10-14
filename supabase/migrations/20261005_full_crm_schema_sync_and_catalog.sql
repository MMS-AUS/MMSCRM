-- ==============================================================================
-- MIGRATION: Leads Schema Update, Duplicate Cleanup, and Dynamic Hardware/Dropdown Tables
-- Target: Supabase (PostgreSQL 15+)
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. LEADS TABLE MODIFICATIONS & NEW COLUMNS
-- ------------------------------------------------------------------------------
ALTER TABLE public.leads 
  -- Section 2: Manager / Rentee Details
  ADD COLUMN IF NOT EXISTS manager_rentee_first_name TEXT,
  ADD COLUMN IF NOT EXISTS manager_rentee_last_name TEXT,

  -- Section 4: Location & Classification
  ADD COLUMN IF NOT EXISTS area TEXT,
  ADD COLUMN IF NOT EXISTS nearest_big_city TEXT,

  -- Section 5: Secondary Mobile No
  ADD COLUMN IF NOT EXISTS secondary_mobile TEXT,

  -- Section 4B: Solar Hardware & System Specs
  ADD COLUMN IF NOT EXISTS panel_manufacturer TEXT,
  ADD COLUMN IF NOT EXISTS panel_size NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS panel_size_w TEXT,
  ADD COLUMN IF NOT EXISTS panel_series TEXT,
  ADD COLUMN IF NOT EXISTS panel_model TEXT,
  ADD COLUMN IF NOT EXISTS no_of_panels INTEGER,

  ADD COLUMN IF NOT EXISTS no_of_inverters INTEGER,
  ADD COLUMN IF NOT EXISTS inverter_manufacturer TEXT,
  ADD COLUMN IF NOT EXISTS inverter_series TEXT,
  ADD COLUMN IF NOT EXISTS inverter_model TEXT,
  ADD COLUMN IF NOT EXISTS inverter_size_kw NUMERIC(8,2),

  ADD COLUMN IF NOT EXISTS no_of_batteries INTEGER,
  ADD COLUMN IF NOT EXISTS battery_manufacturer TEXT,
  ADD COLUMN IF NOT EXISTS battery_model TEXT,
  -- Note: "Usable Capacity" strictly maps to the existing battery_storage_kwh column!
  ADD COLUMN IF NOT EXISTS battery_storage_kwh NUMERIC(8,2),

  ADD COLUMN IF NOT EXISTS house_storey TEXT,
  ADD COLUMN IF NOT EXISTS electrical_phase TEXT,
  ADD COLUMN IF NOT EXISTS phase TEXT,
  ADD COLUMN IF NOT EXISTS phase_type TEXT,
  ADD COLUMN IF NOT EXISTS roof_type TEXT,
  ADD COLUMN IF NOT EXISTS docs_received TEXT,
  ADD COLUMN IF NOT EXISTS docs_received_date DATE,
  ADD COLUMN IF NOT EXISTS existing_system_details TEXT,

  -- Financials & Date Pickers
  ADD COLUMN IF NOT EXISTS deposit_aud NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS deposit NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS deposit_received_date DATE,
  ADD COLUMN IF NOT EXISTS sale_date DATE,
  ADD COLUMN IF NOT EXISTS system_price_aud NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS budget_aud NUMERIC(12,2);

-- Sync electrical_phase with phase / phase_type if either was populated
UPDATE public.leads
SET electrical_phase = COALESCE(electrical_phase, phase_type, phase)
WHERE electrical_phase IS NULL AND (phase_type IS NOT NULL OR phase IS NOT NULL);

-- Sync panel_size from panel_size_w if present
UPDATE public.leads
SET panel_size = NULLIF(regexp_replace(panel_size_w, '[^0-9.]', '', 'g'), '')::NUMERIC
WHERE panel_size IS NULL AND panel_size_w IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 2. BACKEND CLEANUP: DELETE DUPLICATE system_price COLUMN & UPDATE TRIGGER
-- ------------------------------------------------------------------------------
-- Before dropping system_price, preserve any non-null value in system_price_aud / budget_aud
UPDATE public.leads 
SET system_price_aud = COALESCE(system_price_aud, budget_aud)
WHERE system_price_aud IS NULL AND budget_aud IS NOT NULL;

-- Drop trigger referencing dropped system_price column
DROP TRIGGER IF EXISTS trg_sync_lead_financials ON public.leads;

-- Recreate trigger function without referencing system_price
CREATE OR REPLACE FUNCTION public.sync_lead_financial_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync system_price_aud and budget_aud
  IF NEW.system_price_aud IS NOT NULL AND (OLD.system_price_aud IS NULL OR NEW.system_price_aud <> OLD.system_price_aud) THEN
    NEW.budget_aud := NEW.system_price_aud;
  ELSIF NEW.budget_aud IS NOT NULL AND (OLD.budget_aud IS NULL OR NEW.budget_aud <> OLD.budget_aud) THEN
    NEW.system_price_aud := NEW.budget_aud;
  END IF;

  -- Sync deposit_aud and deposit
  IF NEW.deposit_aud IS NOT NULL AND (OLD.deposit_aud IS NULL OR NEW.deposit_aud <> OLD.deposit_aud) THEN
    NEW.deposit := NEW.deposit_aud;
  ELSIF NEW.deposit IS NOT NULL AND (OLD.deposit IS NULL OR NEW.deposit <> OLD.deposit) THEN
    NEW.deposit_aud := NEW.deposit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_lead_financials
BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.sync_lead_financial_fields();

-- Drop the redundant system_price column
ALTER TABLE public.leads DROP COLUMN IF EXISTS system_price;

-- ------------------------------------------------------------------------------
-- 3. EQUIPMENT & HARDWARE CATALOG (3 NEW TABLES)
-- ------------------------------------------------------------------------------

-- Table 1: solar_panels (Watts only stores clean numeric values)
CREATE TABLE IF NOT EXISTS public.solar_panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  watts NUMERIC(8,2) NOT NULL,
  series TEXT,
  model TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table 2: solar_inverters (Rated kW only stores clean numeric values)
CREATE TABLE IF NOT EXISTS public.solar_inverters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  rated_kw NUMERIC(8,2) NOT NULL,
  series TEXT,
  model TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table 3: battery_storage (Capacity only stores clean numeric values)
CREATE TABLE IF NOT EXISTS public.battery_storage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  capacity NUMERIC(8,2) NOT NULL,
  series TEXT,
  model TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 4. GENERAL SYSTEM DROPDOWNS & PRESETS (1 NEW TABLE)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_dropdowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 5. INDEXES FOR PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_solar_panels_brand ON public.solar_panels(brand);
CREATE INDEX IF NOT EXISTS idx_solar_inverters_brand ON public.solar_inverters(brand);
CREATE INDEX IF NOT EXISTS idx_battery_storage_brand ON public.battery_storage(brand);
CREATE INDEX IF NOT EXISTS idx_system_dropdowns_category ON public.system_dropdowns(category);

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.solar_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solar_inverters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battery_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_dropdowns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_allow_all_solar_panels" ON public.solar_panels;
CREATE POLICY "crm_allow_all_solar_panels" ON public.solar_panels FOR ALL USING (true);

DROP POLICY IF EXISTS "crm_allow_all_solar_inverters" ON public.solar_inverters;
CREATE POLICY "crm_allow_all_solar_inverters" ON public.solar_inverters FOR ALL USING (true);

DROP POLICY IF EXISTS "crm_allow_all_battery_storage" ON public.battery_storage;
CREATE POLICY "crm_allow_all_battery_storage" ON public.battery_storage FOR ALL USING (true);

DROP POLICY IF EXISTS "crm_allow_all_system_dropdowns" ON public.system_dropdowns;
CREATE POLICY "crm_allow_all_system_dropdowns" ON public.system_dropdowns FOR ALL USING (true);

-- ------------------------------------------------------------------------------
-- 7. NOTIFY POSTGREST TO RELOAD SCHEMA CACHE
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
