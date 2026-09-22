-- ============================================================================
-- Supabase Migration: CER BridgeSelect STC Portal Connector API Integration
-- Tables: bridgeselect_credentials
-- Columns: projects.bridgeselect_sync_status, projects.bridgeselect_synced_at
-- ============================================================================

-- 1. Create bridgeselect_credentials table
CREATE TABLE IF NOT EXISTS bridgeselect_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  account_key TEXT NOT NULL,
  account_salt TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security for bridgeselect_credentials
ALTER TABLE bridgeselect_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow tenant members to read bridgeselect credentials" ON bridgeselect_credentials;
CREATE POLICY "Allow tenant members to read bridgeselect credentials"
ON bridgeselect_credentials FOR SELECT
USING (
  tenant_id = auth.uid() OR 
  tenant_id IS NULL
);

DROP POLICY IF EXISTS "Allow tenant members to upsert bridgeselect credentials" ON bridgeselect_credentials;
CREATE POLICY "Allow tenant members to upsert bridgeselect credentials"
ON bridgeselect_credentials FOR ALL
USING (
  tenant_id = auth.uid() OR 
  tenant_id IS NULL
);

-- 2. Add BridgeSelect sync columns to projects table
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'projects') THEN
    ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS bridgeselect_sync_status TEXT DEFAULT 'un-synced',
      ADD COLUMN IF NOT EXISTS bridgeselect_synced_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS nmi TEXT,
      ADD COLUMN IF NOT EXISTS installation_status TEXT;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'jobs') THEN
    ALTER TABLE jobs 
      ADD COLUMN IF NOT EXISTS bridgeselect_sync_status TEXT DEFAULT 'un-synced',
      ADD COLUMN IF NOT EXISTS bridgeselect_synced_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS nmi_number TEXT,
      ADD COLUMN IF NOT EXISTS installation_status TEXT;
  END IF;
END $$;

-- 3. Performance indices
CREATE INDEX IF NOT EXISTS idx_bridgeselect_credentials_tenant_id ON bridgeselect_credentials(tenant_id);
