-- ==============================================================================
-- MIGRATION: Email Logs Table for System SMTP & Outbound Email Diagnostics
-- Target: Supabase (PostgreSQL 15+)
-- Run in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Enable UUID Extension (standard in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create email_logs Table
CREATE TABLE IF NOT EXISTS public.email_logs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant Reference
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',

  -- Message & Provider Identification
  message_id TEXT,                                      -- e.g. <abc1234@smtp.gmail.com> or msg-1792468530473
  client_ref_id TEXT,                                   -- Client reference or correlation ID

  -- Sender & Recipients
  sender_email TEXT NOT NULL,                           -- Envelope / From Email
  sender_name TEXT,                                     -- Display Name (e.g. Apex Solar Operations)
  recipient_email TEXT NOT NULL,                        -- Primary Recipient Email
  recipient_emails TEXT[] DEFAULT '{}'::TEXT[],         -- Full Recipient List ('to')
  cc_emails TEXT[] DEFAULT '{}'::TEXT[],                -- CC Recipients
  bcc_emails TEXT[] DEFAULT '{}'::TEXT[],               -- BCC Recipients
  reply_to TEXT,                                        -- Reply-To Address

  -- Email Content
  subject TEXT NOT NULL,                                -- Subject Line
  snippet TEXT,                                         -- Plaintext preview snippet (first 300 chars)
  body_html TEXT,                                       -- Full HTML Content
  body_text TEXT,                                       -- Plaintext Content

  -- Classification & CRM Association
  category VARCHAR(100) DEFAULT 'general',              -- e.g. smtp_diagnostic, new_lead, proposal_sent, work_order, service_ticket, staff_invite
  reference_id TEXT,                                    -- Associated CRM Entity ID (lead_id, project_id, ticket_id)
  delivery_mode VARCHAR(50) DEFAULT 'custom_smtp',      -- custom_smtp, webhook_gateway, simulation_audit

  -- Delivery Status & Results
  status VARCHAR(50) NOT NULL DEFAULT 'sent',           -- sent, delivered, failed, simulated
  success BOOLEAN NOT NULL DEFAULT true,                -- Quick Boolean for Filtering (true = successful transmission)

  -- SMTP Server & Connection Diagnostics
  smtp_host TEXT,                                       -- e.g. smtp.gmail.com, smtp.office365.com
  smtp_port INTEGER DEFAULT 587,                        -- e.g. 587, 465, 25
  smtp_secure BOOLEAN DEFAULT false,                    -- Direct TLS (465) vs STARTTLS (587)
  smtp_username TEXT,                                   -- Authenticated Account Username

  -- SMTP Response & Diagnostics
  smtp_response_code INTEGER,                           -- e.g. 250 (OK), 535 (Authentication failed)
  smtp_response_message TEXT,                           -- Raw SMTP greeting/queue response
  accepted_recipients TEXT[] DEFAULT '{}'::TEXT[],      -- Accepted recipients returned by mail server
  rejected_recipients TEXT[] DEFAULT '{}'::TEXT[],      -- Rejected recipients returned by mail server

  -- Detailed Error Diagnostics (Crucial for Debugging)
  error_message TEXT,                                   -- Human-friendly error description
  error_code VARCHAR(100),                              -- Error code (e.g. EAUTH, ECONNREFUSED, ETIMEDOUT, EENVELOPE)
  error_command VARCHAR(100),                           -- Failing SMTP command (e.g. AUTH PLAIN, MAIL FROM, RCPT TO)
  error_details JSONB DEFAULT '{}'::JSONB,              -- Complete error payload & stack info

  -- Timestamps
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for High Performance Querying & Filtering
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_success ON public.email_logs (success);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs (status);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs (recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_category ON public.email_logs (category);
CREATE INDEX IF NOT EXISTS idx_email_logs_tenant_id ON public.email_logs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_error_code ON public.email_logs (error_code);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- 5. Policies (Allow CRM backend and authenticated users to read and insert)
DROP POLICY IF EXISTS "Allow anon and service_role full access to email_logs" ON public.email_logs;
CREATE POLICY "Allow anon and service_role full access to email_logs"
  ON public.email_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Comments
COMMENT ON TABLE public.email_logs IS 'System and SMTP outbound email transmission logs with error diagnostics';
