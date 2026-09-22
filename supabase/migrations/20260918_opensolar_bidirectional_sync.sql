-- ============================================================================
-- Supabase Migration: OpenSolar Robust 2-Way Synchronization & Document Storage
-- Tables: opensolar_credentials, project_documents, sync_queue
-- Columns: contacts.os_id, companies.os_id, leads.os_id, projects.os_id,
--          last_synced_at, last_updated_by
-- ============================================================================

-- 1. Create opensolar_credentials table
CREATE TABLE IF NOT EXISTS opensolar_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  org_id TEXT NOT NULL,
  api_token TEXT NOT NULL,
  webhook_id TEXT,
  integration_user_id TEXT,
  webhook_secret TEXT,
  base_url TEXT DEFAULT 'https://api.opensolar.com',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE opensolar_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow tenant members to read opensolar credentials" ON opensolar_credentials;
CREATE POLICY "Allow tenant members to read opensolar credentials"
ON opensolar_credentials FOR SELECT
USING (tenant_id = auth.uid() OR tenant_id IS NULL);

DROP POLICY IF EXISTS "Allow tenant members to upsert opensolar credentials" ON opensolar_credentials;
CREATE POLICY "Allow tenant members to upsert opensolar credentials"
ON opensolar_credentials FOR ALL
USING (tenant_id = auth.uid() OR tenant_id IS NULL);

-- 2. Add 2-way sync mapping columns to core CRM tables
-- (contacts, companies, leads, projects)
DO $$ 
BEGIN
  -- Projects table
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'projects') THEN
    ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS os_id TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS last_updated_by TEXT DEFAULT 'crm_user',
      ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Leads table
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leads') THEN
    ALTER TABLE leads 
      ADD COLUMN IF NOT EXISTS os_id TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS last_updated_by TEXT DEFAULT 'crm_user';
  END IF;

  -- Contacts table
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contacts') THEN
    ALTER TABLE contacts 
      ADD COLUMN IF NOT EXISTS os_id TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS last_updated_by TEXT DEFAULT 'crm_user';
  END IF;

  -- Companies table
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'companies') THEN
    ALTER TABLE companies 
      ADD COLUMN IF NOT EXISTS os_id TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS last_updated_by TEXT DEFAULT 'crm_user';
  END IF;
END $$;

-- 3. Create project_documents table for downloaded contracts and project paperwork
CREATE TABLE IF NOT EXISTS project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'Signed Contract',
  file_size TEXT,
  mime_type TEXT DEFAULT 'application/pdf',
  download_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all users to view project documents" ON project_documents;
CREATE POLICY "Allow all users to view project documents"
ON project_documents FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow all users to insert project documents" ON project_documents;
CREATE POLICY "Allow all users to insert project documents"
ON project_documents FOR ALL
USING (true);

-- 4. Create sync_queue table for Asynchronous Queueing & Rate Limit Management
CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type TEXT NOT NULL, -- 'contact', 'project', 'company', 'lead'
  model_id TEXT NOT NULL,   -- CRM record identifier
  action TEXT NOT NULL,     -- 'create', 'update', 'delete'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  payload JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all users to manage sync queue" ON sync_queue;
CREATE POLICY "Allow all users to manage sync queue"
ON sync_queue FOR ALL
USING (true);

-- 5. Performance Indices for Sync Queue, OS mapping & Documents
CREATE INDEX IF NOT EXISTS idx_sync_queue_status_next ON sync_queue(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_model ON sync_queue(model_type, model_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_os_id ON projects(os_id);
CREATE INDEX IF NOT EXISTS idx_contacts_os_id ON contacts(os_id);
CREATE INDEX IF NOT EXISTS idx_leads_os_id ON leads(os_id);
CREATE INDEX IF NOT EXISTS idx_companies_os_id ON companies(os_id);
