-- ==============================================================================
-- Supabase Migration: Create xero_credentials table for Xero OAuth 2.0
-- Created: 2026-09-17
-- Description: Stores Xero OAuth 2.0 access & refresh tokens at the organization level
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.xero_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    tenant_id TEXT NOT NULL,
    tenant_name TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for high-performance lookup by active Xero tenant ID
CREATE INDEX IF NOT EXISTS idx_xero_credentials_tenant_id 
    ON public.xero_credentials(tenant_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.xero_credentials ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access for backend API synchronization
CREATE POLICY "Allow service role full access on xero_credentials"
    ON public.xero_credentials
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Trigger to automatically bump updated_at on token refresh
CREATE OR REPLACE FUNCTION update_xero_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_xero_credentials_updated_at ON public.xero_credentials;
CREATE TRIGGER trg_xero_credentials_updated_at
    BEFORE UPDATE ON public.xero_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_xero_credentials_updated_at();

-- Informational comment
COMMENT ON TABLE public.xero_credentials IS 'Secure organizational credentials and OAuth tokens for Xero Cloud Accounting integration';
