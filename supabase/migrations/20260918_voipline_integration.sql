-- VoIPLine Telecom AU Voice & SMS Integration Schema
-- Migration: 20260918_voipline_integration.sql

-- 1. voipline_settings Table
CREATE TABLE IF NOT EXISTS voipline_settings (
  tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT NOT NULL,
  webhook_secret TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. user_phone_numbers Table (Assigns unique Virtual Mobile Numbers to CRM users)
CREATE TABLE IF NOT EXISTS user_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  user_name TEXT,
  assigned_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. call_logs Table (Tracks inbound & outbound calls and asynchronous recording URLs)
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voipline_call_id TEXT UNIQUE NOT NULL,
  contact_id TEXT,
  user_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status TEXT NOT NULL DEFAULT 'originating',
  duration INTEGER DEFAULT 0,
  recording_url TEXT,
  caller_number TEXT,
  callee_number TEXT,
  message_body TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. inbound_sms_logs Table (Tracks incoming SMS messages from VoIPLine Virtual Numbers)
CREATE TABLE IF NOT EXISTS inbound_sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id TEXT,
  user_id TEXT,
  sender_number TEXT NOT NULL,
  dest_number TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'inbound',
  message_body TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance and quick timeline lookups
CREATE INDEX IF NOT EXISTS idx_call_logs_voipline_call_id ON call_logs(voipline_call_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_contact_id ON call_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_timestamp ON call_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_inbound_sms_logs_contact_id ON inbound_sms_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_inbound_sms_logs_dest_number ON inbound_sms_logs(dest_number);
CREATE INDEX IF NOT EXISTS idx_inbound_sms_logs_timestamp ON inbound_sms_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_assigned_number ON user_phone_numbers(assigned_number);

-- Enable Row Level Security (RLS)
ALTER TABLE voipline_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_sms_logs ENABLE ROW LEVEL SECURITY;

-- Permissive policies for service role & authenticated CRM users
CREATE POLICY "Allow public read voipline_settings" ON voipline_settings FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write voipline_settings" ON voipline_settings FOR ALL USING (true);

CREATE POLICY "Allow public read user_phone_numbers" ON user_phone_numbers FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write user_phone_numbers" ON user_phone_numbers FOR ALL USING (true);

CREATE POLICY "Allow public read call_logs" ON call_logs FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write call_logs" ON call_logs FOR ALL USING (true);

CREATE POLICY "Allow public read inbound_sms_logs" ON inbound_sms_logs FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write inbound_sms_logs" ON inbound_sms_logs FOR ALL USING (true);
