-- ==============================================================================
-- Migration: Create gmail_credentials and emails tables
-- Purpose: Secure OAuth 2.0 token storage, continuous background sync, and 
--          CRM entity linking (Contacts, Companies, Projects, Tickets, Leads).
-- ==============================================================================

-- 1. Create gmail_credentials table
CREATE TABLE IF NOT EXISTS public.gmail_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email_address TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  send_enabled BOOLEAN NOT NULL DEFAULT false,
  latest_history_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index on email_address for fast lookup during Pub/Sub webhook callbacks
CREATE INDEX IF NOT EXISTS idx_gmail_credentials_email 
  ON public.gmail_credentials(email_address);

-- Enable Row Level Security (RLS)
ALTER TABLE public.gmail_credentials ENABLE ROW LEVEL SECURITY;

-- Allow server-side service_role full access to manage credentials
DROP POLICY IF EXISTS "Allow service_role full access to gmail_credentials" ON public.gmail_credentials;
CREATE POLICY "Allow service_role full access to gmail_credentials"
  ON public.gmail_credentials
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Create emails table for CRM continuous background synchronization
CREATE TABLE IF NOT EXISTS public.emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT UNIQUE NOT NULL,
  thread_id TEXT,
  gmail_credentials_id UUID REFERENCES public.gmail_credentials(id) ON DELETE CASCADE,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')) NOT NULL DEFAULT 'inbound',
  from_address TEXT NOT NULL,
  to_addresses TEXT[] NOT NULL DEFAULT '{}',
  cc_addresses TEXT[] DEFAULT '{}',
  subject TEXT DEFAULT '(No Subject)',
  snippet TEXT,
  body_html TEXT,
  body_text TEXT,
  contact_id TEXT,
  contact_name TEXT,
  company_id TEXT,
  project_id TEXT,
  ticket_id TEXT,
  lead_id TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for CRM entity lookups and chronological timeline queries
CREATE INDEX IF NOT EXISTS idx_emails_contact_id ON public.emails(contact_id);
CREATE INDEX IF NOT EXISTS idx_emails_project_id ON public.emails(project_id);
CREATE INDEX IF NOT EXISTS idx_emails_lead_id ON public.emails(lead_id);
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON public.emails(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_message_id ON public.emails(message_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- Allow server-side service_role full access to emails table
DROP POLICY IF EXISTS "Allow service_role full access to emails" ON public.emails;
CREATE POLICY "Allow service_role full access to emails"
  ON public.emails
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
