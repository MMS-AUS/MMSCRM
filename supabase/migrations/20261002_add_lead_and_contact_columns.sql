-- ==============================================================================
-- MIGRATION: Add First-Class Columns to Leads & Contacts Tables in Supabase
-- Target: Supabase (PostgreSQL 15+)
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- This aligns all CRM fields directly with native columns in the Supabase Table Editor!
-- ==============================================================================

-- 1. Contacts Columns
ALTER TABLE public.contacts 
  ADD COLUMN IF NOT EXISTS addresses JSONB DEFAULT '[]'::jsonb;

-- 2. Leads Columns
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS primary_mobile TEXT,
  ADD COLUMN IF NOT EXISTS secondary_mobile TEXT,
  ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS system_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS deposit NUMERIC(12,2),
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

-- 3. Backfill existing data to native columns
UPDATE public.leads 
SET customer_name = COALESCE(customer_name, full_name, (first_name || ' ' || last_name))
WHERE customer_name IS NULL;

UPDATE public.leads 
SET primary_mobile = COALESCE(primary_mobile, phone, phone_number)
WHERE primary_mobile IS NULL;

UPDATE public.leads 
SET selling_price = COALESCE(selling_price, quoted_price_aud)
WHERE selling_price IS NULL;

-- 4. Enable indexes for fast lookup and foreign key joins
CREATE INDEX IF NOT EXISTS idx_leads_contact_id ON public.leads(contact_id);
CREATE INDEX IF NOT EXISTS idx_leads_sheet_sync_row_id ON public.leads(sheet_sync_row_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_primary_mobile ON public.leads(primary_mobile);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON public.contacts(phone);
