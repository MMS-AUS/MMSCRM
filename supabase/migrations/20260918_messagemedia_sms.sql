-- ============================================================================
-- Supabase Migration: Sinch MessageMedia SMS Integration & Delivery Tracking
-- Tables: messagemedia_credentials, sms_logs
-- ============================================================================

-- 1. Create messagemedia_credentials table
CREATE TABLE IF NOT EXISTS messagemedia_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  user_id UUID,
  api_key TEXT NOT NULL,
  api_secret TEXT NOT NULL,
  default_sender_id TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security for messagemedia_credentials
ALTER TABLE messagemedia_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow tenant members to read credentials" ON messagemedia_credentials;
CREATE POLICY "Allow tenant members to read credentials"
ON messagemedia_credentials FOR SELECT
USING (
  tenant_id = auth.uid() OR 
  user_id = auth.uid() OR 
  tenant_id IS NULL
);

DROP POLICY IF EXISTS "Allow tenant members to upsert credentials" ON messagemedia_credentials;
CREATE POLICY "Allow tenant members to upsert credentials"
ON messagemedia_credentials FOR ALL
USING (
  tenant_id = auth.uid() OR 
  user_id = auth.uid() OR 
  tenant_id IS NULL
);

-- 2. Create sms_logs table
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  contact_id UUID,
  project_id UUID,
  recipient_number TEXT NOT NULL,
  sender_id TEXT,
  message_body TEXT NOT NULL,
  provider_message_id TEXT,
  status TEXT DEFAULT 'sent' NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  delivery_status TEXT DEFAULT 'enroute' NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_sms_logs_contact_id ON sms_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_project_id ON sms_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_provider_message_id ON sms_logs(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at DESC);

-- Row Level Security for sms_logs
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to read their tenant's SMS logs" ON sms_logs;
CREATE POLICY "Allow users to read their tenant's SMS logs"
ON sms_logs FOR SELECT
USING (
  tenant_id = auth.uid() OR 
  tenant_id IS NULL
);

DROP POLICY IF EXISTS "Allow users to insert SMS logs for their tenant" ON sms_logs;
CREATE POLICY "Allow users to insert SMS logs for their tenant"
ON sms_logs FOR INSERT
WITH CHECK (
  tenant_id = auth.uid() OR 
  tenant_id IS NULL
);

DROP POLICY IF EXISTS "Allow system webhook or service role to update delivery status" ON sms_logs;
CREATE POLICY "Allow system webhook or service role to update delivery status"
ON sms_logs FOR UPDATE
USING (true)
WITH CHECK (true);
