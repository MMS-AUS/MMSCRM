-- ============================================================================
-- Supabase Migration: Meta WhatsApp Business Cloud API Integration
-- Tables: whatsapp_settings, whatsapp_messages
-- Storage: whatsapp_media bucket
-- ============================================================================

-- 1. Create whatsapp_settings table
CREATE TABLE IF NOT EXISTS whatsapp_settings (
  tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id TEXT NOT NULL,
  waba_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  webhook_verify_token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security for whatsapp_settings
ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read whatsapp_settings" ON whatsapp_settings;
CREATE POLICY "Allow authenticated users to read whatsapp_settings"
ON whatsapp_settings FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to upsert whatsapp_settings" ON whatsapp_settings;
CREATE POLICY "Allow authenticated users to upsert whatsapp_settings"
ON whatsapp_settings FOR ALL
USING (true);

-- 2. Create whatsapp_messages table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  wa_message_id TEXT UNIQUE NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_body TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'received')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  has_media BOOLEAN DEFAULT false NOT NULL,
  media_url TEXT,
  media_type TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security for whatsapp_messages
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read whatsapp_messages" ON whatsapp_messages;
CREATE POLICY "Allow authenticated users to read whatsapp_messages"
ON whatsapp_messages FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to write whatsapp_messages" ON whatsapp_messages;
CREATE POLICY "Allow authenticated users to write whatsapp_messages"
ON whatsapp_messages FOR ALL
USING (true);

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_contact_id ON whatsapp_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_wa_message_id ON whatsapp_messages(wa_message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction_timestamp ON whatsapp_messages(direction, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp DESC);

-- 3. Storage Bucket: whatsapp_media
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp_media', 'whatsapp_media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for whatsapp_media bucket
DROP POLICY IF EXISTS "Allow access to whatsapp_media bucket" ON storage.objects;
CREATE POLICY "Allow access to whatsapp_media bucket"
ON storage.objects FOR ALL
USING (bucket_id = 'whatsapp_media');
