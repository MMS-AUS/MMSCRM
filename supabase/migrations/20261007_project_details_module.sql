-- ==============================================================================
-- MIGRATION: Australian Solar CRM - Complete "Project Details" Module Schema
-- Target: Supabase (PostgreSQL 15+)
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Ensure projects table exists with base columns and primary key
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_number VARCHAR(100) UNIQUE NOT NULL,
  title TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'Site Survey',
  stage TEXT DEFAULT 'Design',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ALTER TABLE public.projects to add or align every column in the Project Details hierarchy
ALTER TABLE public.projects
  -- Customer & Sales Details
  ADD COLUMN IF NOT EXISTS sales_person_name TEXT,
  ADD COLUMN IF NOT EXISTS sale_date DATE,

  -- 1A. Installation Site Address
  -- Note: street_address stores strictly the street line (e.g. '57 Grove Rd'), never concatenated with suburb/state/postcode!
  ADD COLUMN IF NOT EXISTS street_address TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS suburb TEXT,
  ADD COLUMN IF NOT EXISTS state VARCHAR(10) DEFAULT 'NSW',
  ADD COLUMN IF NOT EXISTS postcode VARCHAR(10),
  ADD COLUMN IF NOT EXISTS area TEXT DEFAULT 'Metro',
  ADD COLUMN IF NOT EXISTS nearest_big_city TEXT,
  ADD COLUMN IF NOT EXISTS deposit_received_date DATE,

  -- 1B. Primary Customer & Rentee Details
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS manager_rentee_first_name TEXT,
  ADD COLUMN IF NOT EXISTS manager_rentee_last_name TEXT,
  ADD COLUMN IF NOT EXISTS primary_mobile TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS secondary_mobile TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS sales_team_notes TEXT,

  -- Technical Specifications & Hardware
  ADD COLUMN IF NOT EXISTS system_size_kw NUMERIC(10,2) DEFAULT 6.60,
  ADD COLUMN IF NOT EXISTS system_size NUMERIC(10,2) DEFAULT 6.60,

  -- 2A. Solar Panels (PV Modules)
  ADD COLUMN IF NOT EXISTS no_of_panels INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS panel_manufacturer TEXT,
  ADD COLUMN IF NOT EXISTS panel_size_w NUMERIC(10,2) DEFAULT 440,
  ADD COLUMN IF NOT EXISTS panel_series TEXT,
  ADD COLUMN IF NOT EXISTS panel_model TEXT,

  -- 2B. Solar Inverter
  ADD COLUMN IF NOT EXISTS no_of_inverters INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS inverter_manufacturer TEXT,
  ADD COLUMN IF NOT EXISTS inverter_size_kw NUMERIC(10,2) DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS inverter_series TEXT,
  ADD COLUMN IF NOT EXISTS inverter_model TEXT,

  -- 2C. Battery Storage System
  ADD COLUMN IF NOT EXISTS no_of_batteries INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS battery_manufacturer TEXT,
  ADD COLUMN IF NOT EXISTS battery_usable_capacity_kwh NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS battery_model TEXT,
  ADD COLUMN IF NOT EXISTS battery_size TEXT,

  -- Hardware & Site Specs
  ADD COLUMN IF NOT EXISTS roof_type TEXT,
  ADD COLUMN IF NOT EXISTS house_storey TEXT,
  ADD COLUMN IF NOT EXISTS electrical_phase TEXT,
  ADD COLUMN IF NOT EXISTS existing_system_details TEXT,
  ADD COLUMN IF NOT EXISTS docs_received BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS docs_received_date DATE,

  -- 3. Electricity Bill (EB) & Meter Checklist
  ADD COLUMN IF NOT EXISTS q1_customer_name_match BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS q2_address_match BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS q3_meter_match BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS q4_meter_phase TEXT DEFAULT 'Single Phase',
  ADD COLUMN IF NOT EXISTS q5_opensolar_system_match BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS q6_opensolar_pricing_match BOOLEAN DEFAULT TRUE,

  -- 4. Grid Application & DNSP Pre-Approval
  ADD COLUMN IF NOT EXISTS nmi VARCHAR(50),
  ADD COLUMN IF NOT EXISTS electricity_distributor TEXT,
  ADD COLUMN IF NOT EXISTS grid_app_ref TEXT,
  ADD COLUMN IF NOT EXISTS energy_retailer TEXT,
  ADD COLUMN IF NOT EXISTS retailer_ref TEXT,
  ADD COLUMN IF NOT EXISTS grid_app_status TEXT DEFAULT 'Not Started',
  ADD COLUMN IF NOT EXISTS grid_applied_date DATE,
  ADD COLUMN IF NOT EXISTS grid_rejected_date DATE,
  ADD COLUMN IF NOT EXISTS grid_approval_date DATE,

  -- 5. Installation Details & Installer Scheduling
  ADD COLUMN IF NOT EXISTS installation_date DATE,
  ADD COLUMN IF NOT EXISTS installation_status TEXT DEFAULT 'Unscheduled',
  ADD COLUMN IF NOT EXISTS booking_date DATE,
  ADD COLUMN IF NOT EXISTS booked_by TEXT,
  ADD COLUMN IF NOT EXISTS completed_month TEXT,
  ADD COLUMN IF NOT EXISTS installation_docs_status TEXT DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS install_docs_received_date DATE,

  -- 5A. Accredited Installer & Subcontractor Invoicing
  ADD COLUMN IF NOT EXISTS installer_name TEXT,
  ADD COLUMN IF NOT EXISTS installer_invoice_date DATE,
  ADD COLUMN IF NOT EXISTS installer_invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS installer_invoice_amount_aud NUMERIC(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS installer_invoice_status TEXT DEFAULT 'Pending Approval',
  ADD COLUMN IF NOT EXISTS customer_final_invoice_number TEXT,

  -- 6. Warehouse Details & Equipment Dispatch
  ADD COLUMN IF NOT EXISTS warehouse_location TEXT,
  ADD COLUMN IF NOT EXISTS sales_order_number TEXT,
  ADD COLUMN IF NOT EXISTS warehouse_invoice_date DATE,
  ADD COLUMN IF NOT EXISTS warehouse_invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS warehouse_invoice_amount_aud NUMERIC(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS warehouse_invoice_status TEXT DEFAULT 'Draft',
  ADD COLUMN IF NOT EXISTS stock_status TEXT DEFAULT 'In Stock',
  ADD COLUMN IF NOT EXISTS stock_used_project TEXT,

  -- 7. Financials, Payment & Finance Brokerage
  ADD COLUMN IF NOT EXISTS system_price_aud NUMERIC(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS system_price NUMERIC(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS selling_price_aud NUMERIC(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_price NUMERIC(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS deposit_aud NUMERIC(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS deposit NUMERIC(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS balance_payable_aud NUMERIC(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS balance_payable_date DATE,
  ADD COLUMN IF NOT EXISTS remaining_payment_aud NUMERIC(12,2) DEFAULT 0.00,

  -- 7A. Finance Brokerage & Green Loan Application
  ADD COLUMN IF NOT EXISTS is_on_finance BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS finance_company_name TEXT,
  ADD COLUMN IF NOT EXISTS finance_status TEXT DEFAULT 'Not Applicable',
  ADD COLUMN IF NOT EXISTS finance_applied_date DATE,
  ADD COLUMN IF NOT EXISTS finance_approved_date DATE,
  ADD COLUMN IF NOT EXISTS finance_approved_amount_aud NUMERIC(12,2) DEFAULT 0.00,

  -- 8. STC Details & Clean Energy Regulator (CER)
  ADD COLUMN IF NOT EXISTS stc_traded_portal TEXT DEFAULT 'BridgeSelect',
  ADD COLUMN IF NOT EXISTS stc_job_no TEXT,

  -- 8A. Solar STC Trading & Claim
  ADD COLUMN IF NOT EXISTS solar_stcs_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS solar_stcs_amount_aud NUMERIC(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS solar_stc_received_date DATE,

  -- 8B. Battery STC / Peak Demand Incentive
  ADD COLUMN IF NOT EXISTS battery_stcs_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS battery_stcs_amount_aud NUMERIC(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS battery_stc_received_date DATE,
  ADD COLUMN IF NOT EXISTS total_stc_amount_received_aud NUMERIC(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS admin_charges_aud NUMERIC(12,2) DEFAULT 150.00,
  ADD COLUMN IF NOT EXISTS stc_status TEXT DEFAULT 'Pending Upload',
  ADD COLUMN IF NOT EXISTS stc_submitted_date DATE;

-- 3. Backfill defaults for any existing rows to satisfy NOT NULL constraints
UPDATE public.projects
SET
  street_address = COALESCE(street_address, address, 'Installation Site Address Pending'),
  address = COALESCE(address, street_address, 'Installation Site Address Pending'),
  suburb = COALESCE(suburb, 'Sydney'),
  first_name = COALESCE(first_name, split_part(customer_name, ' ', 1), 'Customer'),
  last_name = COALESCE(last_name, NULLIF(substr(customer_name, length(split_part(customer_name, ' ', 1)) + 2), ''), 'Account'),
  primary_mobile = COALESCE(primary_mobile, customer_phone, '0400000000'),
  email = COALESCE(email, customer_email, 'customer@example.com'),
  nmi = COALESCE(nmi, '410' || lpad(floor(random() * 100000000)::text, 8, '0')),
  electricity_distributor = COALESCE(electricity_distributor, CASE WHEN state = 'QLD' THEN 'Energex' ELSE 'Ausgrid' END)
WHERE street_address IS NULL 
   OR suburb IS NULL 
   OR first_name IS NULL 
   OR last_name IS NULL 
   OR primary_mobile IS NULL 
   OR email IS NULL 
   OR nmi IS NULL 
   OR electricity_distributor IS NULL;

-- 4. Apply NOT NULL constraints for strictly required fields
ALTER TABLE public.projects
  ALTER COLUMN street_address SET NOT NULL,
  ALTER COLUMN suburb SET NOT NULL,
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL,
  ALTER COLUMN primary_mobile SET NOT NULL,
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN nmi SET NOT NULL,
  ALTER COLUMN electricity_distributor SET NOT NULL;

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_projects_lead_id ON public.projects(lead_id);
CREATE INDEX IF NOT EXISTS idx_projects_contact_id ON public.projects(contact_id);
CREATE INDEX IF NOT EXISTS idx_projects_project_number ON public.projects(project_number);
CREATE INDEX IF NOT EXISTS idx_projects_nmi ON public.projects(nmi);
CREATE INDEX IF NOT EXISTS idx_projects_installation_date ON public.projects(installation_date);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_state_suburb ON public.projects(state, suburb);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated and service access to projects" ON public.projects;
CREATE POLICY "Allow authenticated and service access to projects" 
  ON public.projects 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
