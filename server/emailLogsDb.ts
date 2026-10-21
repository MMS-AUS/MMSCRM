import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getSupabase, isSupabaseQuotaError, markSupabaseRestricted, isSupabaseRestricted } from './supabase.ts';

const EMAIL_LOGS_CACHE_FILE = path.join(process.cwd(), '.email_logs.json');
const MAX_LOCAL_LOGS = 500;

export interface EmailLogRow {
  id: string;
  tenant_id?: string;
  message_id?: string;
  client_ref_id?: string;
  sender_email: string;
  sender_name?: string;
  recipient_email: string;
  recipient_emails?: string[];
  cc_emails?: string[];
  bcc_emails?: string[];
  reply_to?: string;
  subject: string;
  snippet?: string;
  body_html?: string;
  body_text?: string;
  category?: string;
  reference_id?: string;
  delivery_mode?: string;
  status: 'sent' | 'delivered' | 'failed' | 'simulated' | 'verified' | string;
  success: boolean;
  smtp_host?: string;
  smtp_port?: number;
  smtp_secure?: boolean;
  smtp_username?: string;
  smtp_response_code?: number;
  smtp_response_message?: string;
  accepted_recipients?: string[];
  rejected_recipients?: string[];
  error_message?: string;
  error_code?: string;
  error_command?: string;
  error_details?: any;
  sent_at: string;
  created_at: string;
  updated_at?: string;
}

export const EMAIL_LOGS_MIGRATION_SQL = `-- ==============================================================================
-- MIGRATION: Email Logs Table for System SMTP & Outbound Email Diagnostics
-- Target: Supabase (PostgreSQL 15+)
-- Run in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
  message_id TEXT,
  client_ref_id TEXT,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  recipient_email TEXT NOT NULL,
  recipient_emails TEXT[] DEFAULT '{}'::TEXT[],
  cc_emails TEXT[] DEFAULT '{}'::TEXT[],
  bcc_emails TEXT[] DEFAULT '{}'::TEXT[],
  reply_to TEXT,
  subject TEXT NOT NULL,
  snippet TEXT,
  body_html TEXT,
  body_text TEXT,
  category VARCHAR(100) DEFAULT 'general',
  reference_id TEXT,
  delivery_mode VARCHAR(50) DEFAULT 'custom_smtp',
  status VARCHAR(50) NOT NULL DEFAULT 'sent',
  success BOOLEAN NOT NULL DEFAULT true,
  smtp_host TEXT,
  smtp_port INTEGER DEFAULT 587,
  smtp_secure BOOLEAN DEFAULT false,
  smtp_username TEXT,
  smtp_response_code INTEGER,
  smtp_response_message TEXT,
  accepted_recipients TEXT[] DEFAULT '{}'::TEXT[],
  rejected_recipients TEXT[] DEFAULT '{}'::TEXT[],
  error_message TEXT,
  error_code VARCHAR(100),
  error_command VARCHAR(100),
  error_details JSONB DEFAULT '{}'::JSONB,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_success ON public.email_logs (success);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs (status);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs (recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_category ON public.email_logs (category);
CREATE INDEX IF NOT EXISTS idx_email_logs_tenant_id ON public.email_logs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_error_code ON public.email_logs (error_code);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon and service_role full access to email_logs" ON public.email_logs;
CREATE POLICY "Allow anon and service_role full access to email_logs"
  ON public.email_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.email_logs IS 'System and SMTP outbound email transmission logs with error diagnostics';
`;

/**
 * Reads local cached email logs
 */
function readLocalEmailLogs(): EmailLogRow[] {
  try {
    if (fs.existsSync(EMAIL_LOGS_CACHE_FILE)) {
      const raw = fs.readFileSync(EMAIL_LOGS_CACHE_FILE, 'utf8');
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('[EmailLogsDb] Failed to read local logs cache:', err);
  }
  return [];
}

/**
 * Writes to local cached email logs
 */
function writeLocalEmailLogs(logs: EmailLogRow[]): void {
  try {
    const trimmed = logs.slice(0, MAX_LOCAL_LOGS);
    fs.writeFileSync(EMAIL_LOGS_CACHE_FILE, JSON.stringify(trimmed, null, 2), 'utf8');
  } catch (err) {
    console.warn('[EmailLogsDb] Failed to write local logs cache:', err);
  }
}

/**
 * Ensures ID is a valid UUID for Supabase
 */
function ensureValidUuid(id?: string): string {
  if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  return crypto.randomUUID();
}

/**
 * Record an email attempt into email_logs (both local cache and Supabase)
 */
export async function recordEmailLog(entry: Partial<EmailLogRow>): Promise<EmailLogRow> {
  const now = new Date().toISOString();
  const id = ensureValidUuid(entry.id);

  const normalized: EmailLogRow = {
    id,
    tenant_id: entry.tenant_id || '00000000-0000-0000-0000-000000000001',
    message_id: entry.message_id || undefined,
    client_ref_id: entry.client_ref_id || undefined,
    sender_email: entry.sender_email || 'default@system',
    sender_name: entry.sender_name || 'Apex Solar Operations',
    recipient_email: entry.recipient_email || (Array.isArray(entry.recipient_emails) && entry.recipient_emails[0]) || 'unknown',
    recipient_emails: entry.recipient_emails || (entry.recipient_email ? [entry.recipient_email] : []),
    cc_emails: entry.cc_emails || [],
    bcc_emails: entry.bcc_emails || [],
    reply_to: entry.reply_to || undefined,
    subject: entry.subject || 'System Notification',
    snippet: entry.snippet || (entry.body_text ? entry.body_text.slice(0, 300) : (entry.body_html ? entry.body_html.replace(/<[^>]+>/g, ' ').slice(0, 300) : '')),
    body_html: entry.body_html || undefined,
    body_text: entry.body_text || undefined,
    category: entry.category || 'system_email',
    reference_id: entry.reference_id || undefined,
    delivery_mode: entry.delivery_mode || 'custom_smtp',
    status: entry.status || (entry.success ? 'delivered' : 'failed'),
    success: entry.success ?? true,
    smtp_host: entry.smtp_host || undefined,
    smtp_port: entry.smtp_port ? Number(entry.smtp_port) : 587,
    smtp_secure: Boolean(entry.smtp_secure),
    smtp_username: entry.smtp_username || undefined,
    smtp_response_code: entry.smtp_response_code !== undefined ? Number(entry.smtp_response_code) : undefined,
    smtp_response_message: entry.smtp_response_message || undefined,
    accepted_recipients: entry.accepted_recipients || [],
    rejected_recipients: entry.rejected_recipients || [],
    error_message: entry.error_message || undefined,
    error_code: entry.error_code || undefined,
    error_command: entry.error_command || undefined,
    error_details: entry.error_details || undefined,
    sent_at: entry.sent_at || now,
    created_at: entry.created_at || now,
    updated_at: now
  };

  // 1. Immediately save to local persistent cache
  const localLogs = readLocalEmailLogs();
  const updatedLogs = [normalized, ...localLogs.filter(l => l.id !== normalized.id)];
  writeLocalEmailLogs(updatedLogs);

  // 2. Persist to Supabase if available
  const supabase = getSupabase();
  if (supabase && !isSupabaseRestricted()) {
    try {
      const payload: Record<string, any> = {
        id: normalized.id,
        tenant_id: normalized.tenant_id,
        message_id: normalized.message_id || null,
        client_ref_id: normalized.client_ref_id || null,
        sender_email: normalized.sender_email,
        sender_name: normalized.sender_name || null,
        recipient_email: normalized.recipient_email,
        recipient_emails: normalized.recipient_emails || [],
        cc_emails: normalized.cc_emails || [],
        bcc_emails: normalized.bcc_emails || [],
        reply_to: normalized.reply_to || null,
        subject: normalized.subject,
        snippet: normalized.snippet || null,
        body_html: normalized.body_html || null,
        body_text: normalized.body_text || null,
        category: normalized.category || 'general',
        reference_id: normalized.reference_id || null,
        delivery_mode: normalized.delivery_mode || 'custom_smtp',
        status: normalized.status,
        success: normalized.success,
        smtp_host: normalized.smtp_host || null,
        smtp_port: normalized.smtp_port || 587,
        smtp_secure: normalized.smtp_secure || false,
        smtp_username: normalized.smtp_username || null,
        smtp_response_code: normalized.smtp_response_code ?? null,
        smtp_response_message: normalized.smtp_response_message || null,
        accepted_recipients: normalized.accepted_recipients || [],
        rejected_recipients: normalized.rejected_recipients || [],
        error_message: normalized.error_message || null,
        error_code: normalized.error_code || null,
        error_command: normalized.error_command || null,
        error_details: normalized.error_details || {},
        sent_at: normalized.sent_at,
        created_at: normalized.created_at,
        updated_at: normalized.updated_at
      };

      const { error } = await supabase.from('email_logs').upsert([payload], { onConflict: 'id' });
      if (error) {
        if (isSupabaseQuotaError(error)) {
          markSupabaseRestricted(error.message);
        } else {
          console.info('[EmailLogsDb] Supabase insert note (table may pending migration):', error.message);
        }
      }
    } catch (err: any) {
      if (isSupabaseQuotaError(err)) {
        markSupabaseRestricted(err.message);
      } else {
        console.info('[EmailLogsDb] Supabase log sync note:', err.message || err);
      }
    }
  }

  return normalized;
}

/**
 * Retrieve email logs with filtering and pagination
 */
export async function getDbEmailLogs(options?: {
  limit?: number;
  offset?: number;
  success?: boolean;
  category?: string;
  search?: string;
}): Promise<{ logs: EmailLogRow[]; total: number; source: 'supabase' | 'local' }> {
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;

  const supabase = getSupabase();
  if (supabase && !isSupabaseRestricted()) {
    try {
      let query = supabase
        .from('email_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (options?.success !== undefined) {
        query = query.eq('success', options.success);
      }
      if (options?.category) {
        query = query.eq('category', options.category);
      }
      if (options?.search) {
        const s = options.search.trim();
        query = query.or(`recipient_email.ilike.%${s}%,subject.ilike.%${s}%,error_message.ilike.%${s}%`);
      }

      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (!error && Array.isArray(data)) {
        // Also update local cache with fetched logs
        if (data.length > 0 && offset === 0) {
          const local = readLocalEmailLogs();
          const localMap = new Map(local.map(l => [l.id, l]));
          data.forEach(item => localMap.set(item.id, item as EmailLogRow));
          writeLocalEmailLogs(Array.from(localMap.values()).sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()));
        }

        return {
          logs: data as EmailLogRow[],
          total: count ?? data.length,
          source: 'supabase'
        };
      }

      if (error) {
        if (isSupabaseQuotaError(error)) {
          markSupabaseRestricted(error.message);
        } else {
          console.info('[EmailLogsDb] Supabase query note, falling back to local:', error.message);
        }
      }
    } catch (err: any) {
      if (isSupabaseQuotaError(err)) {
        markSupabaseRestricted(err.message);
      } else {
        console.info('[EmailLogsDb] Supabase query exception, using local:', err.message || err);
      }
    }
  }

  // Fallback to local logs
  let local = readLocalEmailLogs();
  if (options?.success !== undefined) {
    local = local.filter(l => l.success === options.success);
  }
  if (options?.category) {
    local = local.filter(l => l.category === options.category);
  }
  if (options?.search) {
    const s = options.search.toLowerCase().trim();
    local = local.filter(l =>
      (l.recipient_email && l.recipient_email.toLowerCase().includes(s)) ||
      (l.subject && l.subject.toLowerCase().includes(s)) ||
      (l.error_message && l.error_message.toLowerCase().includes(s)) ||
      (l.sender_email && l.sender_email.toLowerCase().includes(s))
    );
  }

  const total = local.length;
  const paginated = local.slice(offset, offset + limit);

  return {
    logs: paginated,
    total,
    source: 'local'
  };
}

/**
 * Clear email logs (both local cache and Supabase)
 */
export async function clearDbEmailLogs(): Promise<{ success: boolean; clearedCount: number }> {
  let clearedCount = 0;
  const local = readLocalEmailLogs();
  clearedCount = local.length;
  writeLocalEmailLogs([]);

  const supabase = getSupabase();
  if (supabase && !isSupabaseRestricted()) {
    try {
      await supabase.from('email_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (err: any) {
      if (isSupabaseQuotaError(err)) {
        markSupabaseRestricted(err.message);
      }
    }
  }

  return { success: true, clearedCount };
}

/**
 * Check if email_logs table exists and is accessible in Supabase
 */
export async function checkEmailLogsTableStatus(): Promise<{
  supabaseConfigured: boolean;
  emailLogsTableOk: boolean;
  message: string;
}> {
  const supabase = getSupabase();
  if (!supabase || isSupabaseRestricted()) {
    return {
      supabaseConfigured: Boolean(supabase),
      emailLogsTableOk: false,
      message: isSupabaseRestricted() ? 'Supabase is temporarily restricted due to egress quota.' : 'Supabase credentials not configured.'
    };
  }

  try {
    const { error } = await supabase.from('email_logs').select('id').limit(1);
    if (!error) {
      return {
        supabaseConfigured: true,
        emailLogsTableOk: true,
        message: 'Supabase email_logs table is active and verified.'
      };
    }
    return {
      supabaseConfigured: true,
      emailLogsTableOk: false,
      message: `Table check note: ${error.message}. Run SQL migration to create email_logs.`
    };
  } catch (err: any) {
    return {
      supabaseConfigured: true,
      emailLogsTableOk: false,
      message: `Supabase check failed: ${err.message}`
    };
  }
}
