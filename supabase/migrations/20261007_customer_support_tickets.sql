-- ==============================================================================
-- MIGRATION: Customer Support Tickets Module Schema for Supabase
-- Target: Supabase (PostgreSQL 15+)
-- Run in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Enable UUID Extension (standard in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create customer_support_tickets Table
CREATE TABLE IF NOT EXISTS public.customer_support_tickets (
  -- Primary Key (Internal UUID)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ticket Identification & Project
  ticket_id VARCHAR(100) NOT NULL,                        -- e.g. TKT-2026-001
  installation_project_no VARCHAR(100) NOT NULL,          -- e.g. PRJ-2026-104 or project number/code
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL, -- Linked Project Reference

  -- Customer & Site Details (From Project)
  installation_date DATE,                                  -- Installation Date
  first_name TEXT,                                         -- First Name
  last_name TEXT,                                          -- Last Name
  contact_number VARCHAR(50),                              -- Contact Number
  email_id TEXT,                                           -- Email ID
  address TEXT,                                            -- Street Address
  suburb VARCHAR(150),                                     -- Suburb
  post_code VARCHAR(20),                                   -- Post Code
  state VARCHAR(20) DEFAULT 'NSW',                         -- State (NSW, VIC, QLD, SA, WA, TAS, ACT, NT)
  phase VARCHAR(50) DEFAULT 'Single Phase',                -- Single Phase / Three Phase
  storey_type VARCHAR(50) DEFAULT 'Single Storey',         -- Single Storey / Double Storey / Multi

  -- Issue Diagnostics & Work Required
  issue_recorded TEXT,                                     -- Issue Recorded / Primary Fault
  initial_check TEXT,                                      -- Initial Check Performed
  work_required TEXT,                                      -- Work Required / Action Items
  issue_resolution_status VARCHAR(50) DEFAULT 'Open',      -- Open, In Progress, Resolved, Closed

  -- Existing Hardware (From Project)
  -- Inverter Details
  no_of_existing_inverters INTEGER DEFAULT 1,              -- No. of Existing Inverters
  existing_inverter_brand TEXT,                            -- Brand
  existing_inverter_model TEXT,                            -- Model
  existing_inverter_size TEXT,                             -- Size (e.g. 5.0 kW)
  existing_inverter_serials TEXT,                          -- Inverter Serial Number(s)

  -- Solar Panel Details
  no_of_existing_panels INTEGER DEFAULT 0,                 -- No. of Existing Panels
  existing_panel_brand TEXT,                               -- Brand
  existing_panel_model TEXT,                               -- Model
  existing_panel_size TEXT,                                -- Size (e.g. 440W)
  affected_panel_serials TEXT,                             -- Affected Panel Serial Number(s)

  -- Battery Storage Details
  existing_battery_brand TEXT,                             -- Brand
  existing_battery_model TEXT,                             -- Model
  existing_battery_size_capacity TEXT,                     -- Size / Capacity (e.g. 9.6 kWh)
  affected_battery_serials TEXT,                           -- Affected Battery Serial Number(s)
  service_issue_notes TEXT,                                -- Service Issue Notes

  -- Replaced Equipment (Replacement Hardware Details)
  -- Replaced Inverter
  no_of_replaced_inverters INTEGER DEFAULT 0,              -- No. of Replaced Inverters
  replaced_inverter_brand TEXT,                            -- Brand
  replaced_inverter_model TEXT,                            -- Model
  replaced_inverter_size TEXT,                             -- Size
  replaced_inverter_serials TEXT,                          -- Replaced Inverter Serial Number(s)

  -- Replaced Solar Panels
  no_of_replaced_panels INTEGER DEFAULT 0,                 -- No. of Replaced Panels
  replaced_panel_brand TEXT,                               -- Brand
  replaced_panel_model TEXT,                               -- Model
  replaced_panel_size TEXT,                                -- Size
  replaced_panel_serials TEXT,                             -- Replaced Panel Serial Number(s)

  -- Replaced Battery Storage
  replaced_battery_brand TEXT,                             -- Brand
  replaced_battery_model TEXT,                             -- Model
  replaced_battery_size_capacity TEXT,                     -- Size / Capacity
  replaced_battery_serials TEXT,                           -- Replaced Battery Serial Number(s)

  -- Warranty Claim (Brand & Manufacturer)
  warranty_claim_date DATE,                                -- Warranty Claim Date
  warranty_claim_id VARCHAR(100),                          -- Warranty Claim ID
  warranty_claim_status VARCHAR(50) DEFAULT 'Draft',       -- Draft, Submitted, Approved, Rejected, Paid
  claim_invoice_number VARCHAR(100),                       -- Claim Invoice Number
  claim_invoice_amount_aud NUMERIC(12, 2) DEFAULT 0.00,    -- Invoice Amount$ AUD
  claim_invoice_status VARCHAR(50),                        -- Invoice Status
  brand_notes TEXT,                                        -- Brand Notes

  -- Installer / Electrician / Sub-contractor
  installer_name TEXT,                                     -- Installer / Electrician Name
  installer_contact_number VARCHAR(50),                    -- Contact Number
  installer_email TEXT,                                    -- Email ID
  installer_company_name TEXT,                             -- Company Name
  installer_invoice_date DATE,                             -- Invoice Date
  installer_invoice_number VARCHAR(100),                   -- Invoice Number
  installer_invoice_amount_aud NUMERIC(12, 2) DEFAULT 0.00,-- Invoice Amount$ AUD
  installer_invoice_status VARCHAR(50),                    -- Invoice Status
  installer_notes TEXT,                                    -- Installer / Electrician Notes

  -- Resolution & Service Financials
  resolution_status VARCHAR(50) DEFAULT 'Pending',         -- Issue Resolution Status
  issue_resolution_date DATE,                              -- Issue Resolution Date
  service_handler TEXT,                                    -- Service Handler
  service_charge_aud NUMERIC(12, 2) DEFAULT 0.00,          -- Service Charge$ AUD Accounts
  total_amount_aud NUMERIC(12, 2) DEFAULT 0.00,            -- Total Amount$ AUD Accounts

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Indexes for fast query performance & 2-way sync
CREATE INDEX IF NOT EXISTS idx_customer_tickets_ticket_id 
  ON public.customer_support_tickets (ticket_id);

CREATE INDEX IF NOT EXISTS idx_customer_tickets_project_no 
  ON public.customer_support_tickets (installation_project_no);

CREATE INDEX IF NOT EXISTS idx_customer_tickets_project_id 
  ON public.customer_support_tickets (project_id);

CREATE INDEX IF NOT EXISTS idx_customer_tickets_status 
  ON public.customer_support_tickets (issue_resolution_status);

CREATE INDEX IF NOT EXISTS idx_customer_tickets_created_at 
  ON public.customer_support_tickets (created_at DESC);

-- 4. Auto-update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.update_customer_support_tickets_modtime()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customer_support_tickets_modtime ON public.customer_support_tickets;
CREATE TRIGGER trg_customer_support_tickets_modtime
BEFORE UPDATE ON public.customer_support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_customer_support_tickets_modtime();

-- 5. Row Level Security (RLS) Policies
ALTER TABLE public.customer_support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous and authenticated full access to tickets" ON public.customer_support_tickets;
CREATE POLICY "Allow anonymous and authenticated full access to tickets"
  ON public.customer_support_tickets
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 6. Comments for schema documentation
COMMENT ON TABLE public.customer_support_tickets IS 'Customer Support Tickets table with hardware warranty claims, electrician dispatch, and service financials';
COMMENT ON COLUMN public.customer_support_tickets.ticket_id IS 'Human-readable ticket code e.g. TKT-2026-001';
COMMENT ON COLUMN public.customer_support_tickets.installation_project_no IS 'Associated completed solar installation project number';
