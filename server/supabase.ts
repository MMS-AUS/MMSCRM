import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export interface StoredXeroCredentials {
  id?: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  tenant_id: string;
  tenant_name?: string;
  updated_at?: string;
}

const FALLBACK_CACHE_DIR = path.join(process.cwd(), '.xero_cache');
const FALLBACK_CACHE_FILE = path.join(FALLBACK_CACHE_DIR, 'credentials.json');

function getSupabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function getSupabaseKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseKey());
}

let supabaseInstance: SupabaseClient | null = null;

export function resetSupabaseInstance(): void {
  supabaseInstance = null;
}

export function getSupabase(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();

  if (!url || !key) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
    } catch (err) {
      console.error('[Supabase] Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return supabaseInstance;
}

/**
 * Fallback local file store to preserve tokens if Supabase is pending setup
 */
function readFallbackCache(): StoredXeroCredentials | null {
  try {
    if (fs.existsSync(FALLBACK_CACHE_FILE)) {
      const data = fs.readFileSync(FALLBACK_CACHE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('[Xero] Could not read fallback cache:', err);
  }
  return null;
}

function writeFallbackCache(creds: StoredXeroCredentials): void {
  try {
    if (!fs.existsSync(FALLBACK_CACHE_DIR)) {
      fs.mkdirSync(FALLBACK_CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(FALLBACK_CACHE_FILE, JSON.stringify(creds, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Xero] Could not write fallback cache:', err);
  }
}

function clearFallbackCache(): void {
  try {
    if (fs.existsSync(FALLBACK_CACHE_FILE)) {
      fs.unlinkSync(FALLBACK_CACHE_FILE);
    }
  } catch (err) {
    console.warn('[Xero] Could not clear fallback cache:', err);
  }
}

/**
 * Retrieves stored Xero credentials from Supabase (or fallback cache)
 */
export async function getStoredXeroCredentials(): Promise<StoredXeroCredentials | null> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('xero_credentials')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: data.expires_at,
          tenant_id: data.tenant_id,
          tenant_name: data.tenant_name,
          updated_at: data.updated_at
        };
      }
      if (error) {
        console.warn('[Supabase] Error reading xero_credentials table:', error.message);
      }
    } catch (err) {
      console.error('[Supabase] Exception querying xero_credentials:', err);
    }
  }

  // Fallback if Supabase not configured or temporary issue
  return readFallbackCache();
}

/**
 * Saves or updates Xero credentials in Supabase xero_credentials table
 */
export async function upsertXeroCredentials(creds: {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  tenant_id: string;
  tenant_name?: string;
}): Promise<{ success: boolean; id?: string; source: 'supabase' | 'fallback'; error?: string }> {
  const payload = {
    access_token: creds.access_token,
    refresh_token: creds.refresh_token,
    expires_at: creds.expires_at,
    tenant_id: creds.tenant_id,
    tenant_name: creds.tenant_name || 'Active Xero Organization',
    updated_at: new Date().toISOString()
  };

  // Always keep fallback cache updated
  writeFallbackCache(payload);

  const supabase = getSupabase();
  if (supabase) {
    try {
      // Check if existing record exists for this tenant
      const { data: existing } = await supabase
        .from('xero_credentials')
        .select('id')
        .eq('tenant_id', creds.tenant_id)
        .maybeSingle();

      let resultId: string | undefined;

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from('xero_credentials')
          .update({
            access_token: creds.access_token,
            refresh_token: creds.refresh_token,
            expires_at: creds.expires_at,
            tenant_name: creds.tenant_name || 'Active Xero Organization',
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
        resultId = existing.id;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('xero_credentials')
          .insert([payload])
          .select('id')
          .single();

        if (insertError) throw insertError;
        resultId = inserted?.id;
      }

      return { success: true, id: resultId, source: 'supabase' };
    } catch (err: any) {
      console.error('[Supabase] Failed to upsert xero_credentials in Supabase:', err.message || err);
      return { success: true, source: 'fallback', error: err.message || 'Supabase write error; saved to fallback store' };
    }
  }

  return { success: true, source: 'fallback' };
}

/**
 * Removes Xero credentials from Supabase and fallback cache
 */
export async function deleteXeroCredentials(tenantId?: string): Promise<{ success: boolean; error?: string }> {
  clearFallbackCache();

  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase.from('xero_credentials').delete();
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      } else {
        query = query.neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
      }

      const { error } = await query;
      if (error) {
        console.error('[Supabase] Error deleting xero_credentials:', error.message);
        return { success: false, error: error.message };
      }
    } catch (err: any) {
      console.error('[Supabase] Exception deleting credentials:', err);
      return { success: false, error: err.message };
    }
  }

  return { success: true };
}

// ==============================================================================
// GMAIL INTEGRATION: CREDENTIALS & CONTINUOUS SYNC STORAGE
// ==============================================================================

export interface StoredGmailCredentials {
  id?: string;
  user_id?: string;
  email_address: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  send_enabled: boolean;
  latest_history_id?: string;
  updated_at?: string;
}

export interface StoredCrmEmail {
  id?: string;
  message_id: string;
  thread_id?: string;
  gmail_credentials_id?: string;
  direction: 'inbound' | 'outbound';
  from_address: string;
  to_addresses: string[];
  cc_addresses?: string[];
  subject: string;
  snippet?: string;
  body_html?: string;
  body_text?: string;
  contact_id?: string;
  contact_name?: string;
  company_id?: string;
  project_id?: string;
  ticket_id?: string;
  lead_id?: string;
  received_at: string;
  created_at?: string;
}

const GMAIL_CACHE_DIR = path.join(process.cwd(), '.gmail_cache');
const GMAIL_CREDS_FILE = path.join(GMAIL_CACHE_DIR, 'credentials.json');
const GMAIL_EMAILS_FILE = path.join(GMAIL_CACHE_DIR, 'emails.json');

function readGmailFallbackCache(): StoredGmailCredentials | null {
  try {
    if (fs.existsSync(GMAIL_CREDS_FILE)) {
      const data = fs.readFileSync(GMAIL_CREDS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('[Gmail] Failed to read fallback cache:', err);
  }
  return null;
}

function writeGmailFallbackCache(creds: StoredGmailCredentials): void {
  try {
    if (!fs.existsSync(GMAIL_CACHE_DIR)) {
      fs.mkdirSync(GMAIL_CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(GMAIL_CREDS_FILE, JSON.stringify(creds, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Gmail] Failed to write fallback cache:', err);
  }
}

function clearGmailFallbackCache(): void {
  try {
    if (fs.existsSync(GMAIL_CREDS_FILE)) {
      fs.unlinkSync(GMAIL_CREDS_FILE);
    }
  } catch (err) {
    console.warn('[Gmail] Failed to clear fallback cache:', err);
  }
}

function readGmailEmailsFallback(): StoredCrmEmail[] {
  try {
    if (fs.existsSync(GMAIL_EMAILS_FILE)) {
      const data = fs.readFileSync(GMAIL_EMAILS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('[Gmail] Failed to read fallback emails:', err);
  }
  return [];
}

function writeGmailEmailsFallback(emails: StoredCrmEmail[]): void {
  try {
    if (!fs.existsSync(GMAIL_CACHE_DIR)) {
      fs.mkdirSync(GMAIL_CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(GMAIL_EMAILS_FILE, JSON.stringify(emails, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Gmail] Failed to write fallback emails:', err);
  }
}

/**
 * Retrieves Gmail credentials from Supabase or fallback cache
 */
export async function getStoredGmailCredentials(emailAddress?: string): Promise<StoredGmailCredentials | null> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase.from('gmail_credentials').select('*');
      if (emailAddress) {
        query = query.eq('email_address', emailAddress);
      }
      const { data, error } = await query.order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (!error && data) {
        return {
          id: data.id,
          user_id: data.user_id,
          email_address: data.email_address,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: data.expires_at,
          send_enabled: Boolean(data.send_enabled),
          latest_history_id: data.latest_history_id,
          updated_at: data.updated_at
        };
      }
    } catch (err: any) {
      console.warn('[Supabase] Warning reading gmail_credentials from Supabase:', err.message || err);
    }
  }

  // Fallback to local file store
  return readGmailFallbackCache();
}

/**
 * Persists or updates Gmail credentials in Supabase and fallback cache
 */
export async function upsertGmailCredentials(
  creds: StoredGmailCredentials
): Promise<{ success: boolean; id?: string; source: 'supabase' | 'fallback'; error?: string }> {
  const payload: StoredGmailCredentials = {
    ...creds,
    send_enabled: creds.send_enabled ?? false,
    updated_at: new Date().toISOString()
  };

  writeGmailFallbackCache(payload);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: existing } = await supabase
        .from('gmail_credentials')
        .select('id, send_enabled')
        .eq('email_address', creds.email_address)
        .maybeSingle();

      let resultId: string | undefined;

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from('gmail_credentials')
          .update({
            access_token: creds.access_token,
            refresh_token: creds.refresh_token,
            expires_at: creds.expires_at,
            latest_history_id: creds.latest_history_id || undefined,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
        resultId = existing.id;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('gmail_credentials')
          .insert([{
            email_address: creds.email_address,
            access_token: creds.access_token,
            refresh_token: creds.refresh_token,
            expires_at: creds.expires_at,
            send_enabled: creds.send_enabled ?? false,
            latest_history_id: creds.latest_history_id,
            user_id: creds.user_id,
            updated_at: new Date().toISOString()
          }])
          .select('id')
          .single();

        if (insertError) throw insertError;
        resultId = inserted?.id;
      }

      return { success: true, id: resultId, source: 'supabase' };
    } catch (err: any) {
      console.error('[Supabase] Failed to upsert gmail_credentials in Supabase:', err.message || err);
      return { success: true, source: 'fallback', error: err.message || 'Supabase write error' };
    }
  }

  return { success: true, source: 'fallback' };
}

/**
 * Updates the user-controlled send_enabled toggle in Supabase
 */
export async function updateGmailSendEnabled(
  emailAddress: string | undefined,
  sendEnabled: boolean
): Promise<{ success: boolean; error?: string }> {
  // Update fallback cache
  const cached = readGmailFallbackCache();
  if (cached && (!emailAddress || cached.email_address === emailAddress)) {
    cached.send_enabled = sendEnabled;
    cached.updated_at = new Date().toISOString();
    writeGmailFallbackCache(cached);
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase.from('gmail_credentials').update({
        send_enabled: sendEnabled,
        updated_at: new Date().toISOString()
      });

      if (emailAddress) {
        query = query.eq('email_address', emailAddress);
      } else {
        query = query.neq('id', '00000000-0000-0000-0000-000000000000');
      }

      const { error } = await query;
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error('[Supabase] Error updating send_enabled:', err.message || err);
      return { success: false, error: err.message };
    }
  }

  return { success: true };
}

/**
 * Updates the latest_history_id in Supabase
 */
export async function updateGmailLatestHistoryId(
  emailAddress: string,
  historyId: string
): Promise<{ success: boolean; error?: string }> {
  const cached = readGmailFallbackCache();
  if (cached && cached.email_address === emailAddress) {
    cached.latest_history_id = historyId;
    cached.updated_at = new Date().toISOString();
    writeGmailFallbackCache(cached);
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('gmail_credentials')
        .update({
          latest_history_id: historyId,
          updated_at: new Date().toISOString()
        })
        .eq('email_address', emailAddress);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.warn('[Supabase] Error updating latest_history_id:', err.message || err);
      return { success: false, error: err.message };
    }
  }

  return { success: true };
}

/**
 * Deletes Gmail credentials row
 */
export async function deleteGmailCredentials(emailAddress?: string): Promise<{ success: boolean; error?: string }> {
  clearGmailFallbackCache();

  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase.from('gmail_credentials').delete();
      if (emailAddress) {
        query = query.eq('email_address', emailAddress);
      } else {
        query = query.neq('id', '00000000-0000-0000-0000-000000000000');
      }
      const { error } = await query;
      if (error) throw error;
    } catch (err: any) {
      console.error('[Supabase] Error deleting gmail_credentials:', err.message || err);
      return { success: false, error: err.message };
    }
  }

  return { success: true };
}

/**
 * Saves or updates a synchronized CRM email in Supabase & fallback cache
 */
export async function upsertCrmEmail(
  email: StoredCrmEmail
): Promise<{ success: boolean; id?: string }> {
  // Update fallback list
  const fallbackList = readGmailEmailsFallback();
  const existingIdx = fallbackList.findIndex(e => e.message_id === email.message_id);
  if (existingIdx >= 0) {
    fallbackList[existingIdx] = { ...fallbackList[existingIdx], ...email };
  } else {
    fallbackList.unshift({
      ...email,
      id: email.id || `email-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString()
    });
  }
  // Cap at 200 items in fallback
  if (fallbackList.length > 200) fallbackList.length = 200;
  writeGmailEmailsFallback(fallbackList);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: existing } = await supabase
        .from('emails')
        .select('id')
        .eq('message_id', email.message_id)
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from('emails')
          .update({
            snippet: email.snippet,
            body_html: email.body_html,
            body_text: email.body_text,
            contact_id: email.contact_id,
            contact_name: email.contact_name,
            company_id: email.company_id,
            project_id: email.project_id,
            ticket_id: email.ticket_id,
            lead_id: email.lead_id
          })
          .eq('id', existing.id);
        return { success: true, id: existing.id };
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from('emails')
          .insert([{
            message_id: email.message_id,
            thread_id: email.thread_id,
            gmail_credentials_id: email.gmail_credentials_id,
            direction: email.direction,
            from_address: email.from_address,
            to_addresses: email.to_addresses,
            cc_addresses: email.cc_addresses || [],
            subject: email.subject,
            snippet: email.snippet,
            body_html: email.body_html,
            body_text: email.body_text,
            contact_id: email.contact_id,
            contact_name: email.contact_name,
            company_id: email.company_id,
            project_id: email.project_id,
            ticket_id: email.ticket_id,
            lead_id: email.lead_id,
            received_at: email.received_at || new Date().toISOString(),
            created_at: new Date().toISOString()
          }])
          .select('id')
          .single();

        if (insertErr) throw insertErr;
        return { success: true, id: inserted?.id };
      }
    } catch (err: any) {
      console.warn('[Supabase] Warning writing email to Supabase:', err.message || err);
    }
  }

  return { success: true };
}

/**
 * Queries synchronized emails from Supabase or fallback cache
 */
export async function getCrmEmails(
  filter?: { contactId?: string; projectId?: string; leadId?: string; direction?: string; search?: string; limit?: number }
): Promise<StoredCrmEmail[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase.from('emails').select('*').order('received_at', { ascending: false });

      if (filter?.contactId) query = query.eq('contact_id', filter.contactId);
      if (filter?.projectId) query = query.eq('project_id', filter.projectId);
      if (filter?.leadId) query = query.eq('lead_id', filter.leadId);
      if (filter?.direction) query = query.eq('direction', filter.direction);
      if (filter?.limit) query = query.limit(filter.limit);
      else query = query.limit(50);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          message_id: d.message_id,
          thread_id: d.thread_id,
          gmail_credentials_id: d.gmail_credentials_id,
          direction: d.direction,
          from_address: d.from_address,
          to_addresses: Array.isArray(d.to_addresses) ? d.to_addresses : [d.to_addresses],
          cc_addresses: Array.isArray(d.cc_addresses) ? d.cc_addresses : [],
          subject: d.subject || '(No Subject)',
          snippet: d.snippet,
          body_html: d.body_html,
          body_text: d.body_text,
          contact_id: d.contact_id,
          contact_name: d.contact_name,
          company_id: d.company_id,
          project_id: d.project_id,
          ticket_id: d.ticket_id,
          lead_id: d.lead_id,
          received_at: d.received_at,
          created_at: d.created_at
        }));
      }
    } catch (err: any) {
      console.warn('[Supabase] Error reading emails from Supabase:', err.message || err);
    }
  }

  let list = readGmailEmailsFallback();
  if (filter?.contactId) list = list.filter(e => e.contact_id === filter.contactId);
  if (filter?.projectId) list = list.filter(e => e.project_id === filter.projectId);
  if (filter?.leadId) list = list.filter(e => e.lead_id === filter.leadId);
  if (filter?.direction) list = list.filter(e => e.direction === filter.direction);
  if (filter?.search) {
    const s = filter.search.toLowerCase();
    list = list.filter(e =>
      e.subject.toLowerCase().includes(s) ||
      e.from_address.toLowerCase().includes(s) ||
      (e.snippet && e.snippet.toLowerCase().includes(s))
    );
  }
  return list.slice(0, filter?.limit || 50);
}

// ============================================================================
// SINCH MESSAGEMEDIA CREDENTIALS & SMS LOGS (SUPABASE)
// ============================================================================

export interface StoredMessageMediaCredentials {
  id?: string;
  tenant_id?: string;
  user_id?: string;
  api_key: string;
  api_secret: string;
  default_sender_id?: string;
  updated_at?: string;
}

export interface StoredSmsLog {
  id: string;
  tenant_id?: string;
  contact_id?: string | null;
  project_id?: string | null;
  recipient_number: string;
  sender_id?: string | null;
  message_body: string;
  provider_message_id?: string | null;
  status: 'sent' | 'failed_to_send';
  error_message?: string | null;
  created_at: string;
  delivery_status: 'enroute' | 'submitted' | 'delivered' | 'expired' | 'rejected' | 'failed';
  delivered_at?: string | null;
}

const FALLBACK_MM_CREDS_FILE = path.join(FALLBACK_CACHE_DIR, 'messagemedia_credentials.json');
const FALLBACK_SMS_LOGS_FILE = path.join(FALLBACK_CACHE_DIR, 'sms_logs.json');

function readMessageMediaFallbackCache(): StoredMessageMediaCredentials | null {
  try {
    if (fs.existsSync(FALLBACK_MM_CREDS_FILE)) {
      const data = fs.readFileSync(FALLBACK_MM_CREDS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('[MessageMedia] Could not read fallback cache:', err);
  }
  // Check environment variables
  if (process.env.MESSAGEMEDIA_API_KEY && process.env.MESSAGEMEDIA_API_SECRET) {
    return {
      api_key: process.env.MESSAGEMEDIA_API_KEY,
      api_secret: process.env.MESSAGEMEDIA_API_SECRET,
      default_sender_id: process.env.MESSAGEMEDIA_DEFAULT_SENDER_ID || 'SolarFlow',
      updated_at: new Date().toISOString()
    };
  }
  return null;
}

function writeMessageMediaFallbackCache(creds: StoredMessageMediaCredentials): void {
  try {
    if (!fs.existsSync(FALLBACK_CACHE_DIR)) {
      fs.mkdirSync(FALLBACK_CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(FALLBACK_MM_CREDS_FILE, JSON.stringify(creds, null, 2), 'utf8');
  } catch (err) {
    console.warn('[MessageMedia] Could not write fallback cache:', err);
  }
}

function deleteMessageMediaFallbackCache(): void {
  try {
    if (fs.existsSync(FALLBACK_MM_CREDS_FILE)) {
      fs.unlinkSync(FALLBACK_MM_CREDS_FILE);
    }
  } catch (err) {
    console.warn('[MessageMedia] Could not delete fallback cache:', err);
  }
}

function readSmsLogsFallback(): StoredSmsLog[] {
  try {
    if (fs.existsSync(FALLBACK_SMS_LOGS_FILE)) {
      const data = fs.readFileSync(FALLBACK_SMS_LOGS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('[SMS Logs] Could not read fallback logs:', err);
  }
  return [];
}

function writeSmsLogsFallback(logs: StoredSmsLog[]): void {
  try {
    if (!fs.existsSync(FALLBACK_CACHE_DIR)) {
      fs.mkdirSync(FALLBACK_CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(FALLBACK_SMS_LOGS_FILE, JSON.stringify(logs, null, 2), 'utf8');
  } catch (err) {
    console.warn('[SMS Logs] Could not write fallback logs:', err);
  }
}

/**
 * Retrieves MessageMedia credentials from Supabase or fallback cache
 */
export async function getStoredMessageMediaCredentials(
  tenantId?: string
): Promise<StoredMessageMediaCredentials | null> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase.from('messagemedia_credentials').select('*');
      if (tenantId) {
        query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      }
      query = query.order('updated_at', { ascending: false }).limit(1);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const row = data[0];
        return {
          id: row.id,
          tenant_id: row.tenant_id,
          user_id: row.user_id,
          api_key: row.api_key,
          api_secret: row.api_secret,
          default_sender_id: row.default_sender_id,
          updated_at: row.updated_at
        };
      }
    } catch (err: any) {
      console.warn('[Supabase] Warning reading messagemedia_credentials:', err.message || err);
    }
  }

  return readMessageMediaFallbackCache();
}

/**
 * Upserts MessageMedia credentials into Supabase or fallback cache
 */
export async function upsertMessageMediaCredentials(
  creds: Partial<StoredMessageMediaCredentials> & { api_key: string; api_secret: string }
): Promise<{ success: boolean; id?: string; source: string; error?: string }> {
  const now = new Date().toISOString();
  const updatedCreds: StoredMessageMediaCredentials = {
    ...readMessageMediaFallbackCache(),
    ...creds,
    updated_at: now
  };
  writeMessageMediaFallbackCache(updatedCreds);

  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase.from('messagemedia_credentials').select('id');
      if (creds.tenant_id) {
        query = query.eq('tenant_id', creds.tenant_id);
      }
      const { data: existing } = await query.limit(1).maybeSingle();

      let resultId = existing?.id;
      if (existing?.id) {
        const { error: updateErr } = await supabase
          .from('messagemedia_credentials')
          .update({
            api_key: creds.api_key,
            api_secret: creds.api_secret,
            default_sender_id: creds.default_sender_id || null,
            tenant_id: creds.tenant_id || null,
            user_id: creds.user_id || null,
            updated_at: now
          })
          .eq('id', existing.id);

        if (updateErr) throw updateErr;
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from('messagemedia_credentials')
          .insert([{
            api_key: creds.api_key,
            api_secret: creds.api_secret,
            default_sender_id: creds.default_sender_id || null,
            tenant_id: creds.tenant_id || null,
            user_id: creds.user_id || null,
            updated_at: now
          }])
          .select('id')
          .single();

        if (insertErr) throw insertErr;
        resultId = inserted?.id;
      }

      return { success: true, id: resultId, source: 'supabase' };
    } catch (err: any) {
      console.warn('[Supabase] Failed to write messagemedia_credentials to Supabase:', err.message || err);
      return { success: true, source: 'fallback', error: err.message };
    }
  }

  return { success: true, source: 'fallback' };
}

/**
 * Deletes MessageMedia credentials
 */
export async function deleteMessageMediaCredentials(tenantId?: string): Promise<boolean> {
  deleteMessageMediaFallbackCache();
  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase.from('messagemedia_credentials').delete();
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      } else {
        query = query.neq('api_key', '');
      }
      await query;
    } catch (err) {
      console.warn('[Supabase] Warning deleting messagemedia_credentials:', err);
    }
  }
  return true;
}

/**
 * Inserts an SMS log entry into Supabase and fallback cache
 */
export async function insertSmsLog(
  log: Omit<StoredSmsLog, 'id' | 'created_at'> & { id?: string; created_at?: string }
): Promise<StoredSmsLog> {
  const finalLog: StoredSmsLog = {
    id: log.id || `sms-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    tenant_id: log.tenant_id,
    contact_id: log.contact_id || null,
    project_id: log.project_id || null,
    recipient_number: log.recipient_number,
    sender_id: log.sender_id || null,
    message_body: log.message_body,
    provider_message_id: log.provider_message_id || null,
    status: log.status || 'sent',
    error_message: log.error_message || null,
    created_at: log.created_at || new Date().toISOString(),
    delivery_status: log.delivery_status || 'enroute',
    delivered_at: log.delivered_at || null
  };

  // Update fallback cache
  const existingList = readSmsLogsFallback();
  const updatedList = [finalLog, ...existingList.filter(l => l.id !== finalLog.id)];
  if (updatedList.length > 500) updatedList.length = 500;
  writeSmsLogsFallback(updatedList);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('sms_logs')
        .insert([{
          tenant_id: finalLog.tenant_id || null,
          contact_id: finalLog.contact_id || null,
          project_id: finalLog.project_id || null,
          recipient_number: finalLog.recipient_number,
          sender_id: finalLog.sender_id || null,
          message_body: finalLog.message_body,
          provider_message_id: finalLog.provider_message_id || null,
          status: finalLog.status,
          error_message: finalLog.error_message || null,
          created_at: finalLog.created_at,
          delivery_status: finalLog.delivery_status,
          delivered_at: finalLog.delivered_at || null
        }])
        .select('id')
        .single();

      if (!error && data?.id) {
        finalLog.id = data.id;
      }
    } catch (err: any) {
      console.warn('[Supabase] Warning writing sms_logs to Supabase:', err.message || err);
    }
  }

  return finalLog;
}

/**
 * Updates delivery status of an SMS log via provider_message_id
 */
export async function updateSmsDeliveryStatus(
  providerMessageId: string,
  deliveryStatus: string,
  deliveredAt?: string
): Promise<{ success: boolean; updated: boolean }> {
  const normStatus = deliveryStatus.toLowerCase().trim() as StoredSmsLog['delivery_status'];
  const finalDeliveredAt =
    normStatus === 'delivered'
      ? deliveredAt || new Date().toISOString()
      : undefined;

  // Update fallback cache
  const list = readSmsLogsFallback();
  let foundInCache = false;
  for (const item of list) {
    if (item.provider_message_id === providerMessageId) {
      item.delivery_status = normStatus;
      if (finalDeliveredAt) item.delivered_at = finalDeliveredAt;
      foundInCache = true;
    }
  }
  if (foundInCache) {
    writeSmsLogsFallback(list);
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const updateData: any = {
        delivery_status: normStatus
      };
      if (finalDeliveredAt) {
        updateData.delivered_at = finalDeliveredAt;
      }

      const { data, error } = await supabase
        .from('sms_logs')
        .update(updateData)
        .eq('provider_message_id', providerMessageId)
        .select('id');

      if (!error && data && data.length > 0) {
        return { success: true, updated: true };
      }
    } catch (err: any) {
      console.warn('[Supabase] Warning updating sms_logs delivery status:', err.message || err);
    }
  }

  return { success: true, updated: foundInCache };
}

/**
 * Queries SMS logs with optional filters
 */
export async function getSmsLogs(filter?: {
  contactId?: string;
  projectId?: string;
  tenantId?: string;
  limit?: number;
}): Promise<StoredSmsLog[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase.from('sms_logs').select('*').order('created_at', { ascending: false });
      if (filter?.contactId) query = query.eq('contact_id', filter.contactId);
      if (filter?.projectId) query = query.eq('project_id', filter.projectId);
      if (filter?.tenantId) query = query.eq('tenant_id', filter.tenantId);
      query = query.limit(filter?.limit || 50);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          tenant_id: d.tenant_id,
          contact_id: d.contact_id,
          project_id: d.project_id,
          recipient_number: d.recipient_number,
          sender_id: d.sender_id,
          message_body: d.message_body,
          provider_message_id: d.provider_message_id,
          status: d.status,
          error_message: d.error_message,
          created_at: d.created_at,
          delivery_status: d.delivery_status || 'enroute',
          delivered_at: d.delivered_at
        }));
      }
    } catch (err: any) {
      console.warn('[Supabase] Warning reading sms_logs from Supabase:', err.message || err);
    }
  }

  let list = readSmsLogsFallback();
  if (filter?.contactId) list = list.filter(l => l.contact_id === filter.contactId);
  if (filter?.projectId) list = list.filter(l => l.project_id === filter.projectId);
  if (filter?.tenantId) list = list.filter(l => l.tenant_id === filter.tenantId);
  return list.slice(0, filter?.limit || 50);
}

// ============================================================================
// VOIPLINE TELECOM AU VOICE & SMS MODELS & QUERIES
// ============================================================================

export interface StoredVoIPLineSettings {
  tenant_id: string;
  api_key: string;
  webhook_secret: string;
  created_at?: string;
  updated_at?: string;
}

export interface StoredUserPhoneNumber {
  id?: string;
  user_id: string;
  user_name?: string;
  assigned_number: string;
  created_at?: string;
  updated_at?: string;
}

export interface StoredCallLog {
  id: string;
  voipline_call_id: string;
  contact_id?: string | null;
  user_id?: string | null;
  direction: 'inbound' | 'outbound';
  status: string;
  duration?: number;
  recording_url?: string | null;
  caller_number?: string | null;
  callee_number?: string | null;
  message_body?: string | null;
  timestamp: string;
  created_at?: string;
}

export interface StoredInboundSmsLog {
  id: string;
  contact_id?: string | null;
  user_id?: string | null;
  sender_number: string;
  dest_number: string;
  direction?: string;
  message_body: string;
  timestamp: string;
  created_at?: string;
}

const VOIPLINE_CACHE_DIR = path.join(process.cwd(), '.voipline_cache');
const VOIPLINE_SETTINGS_FILE = path.join(VOIPLINE_CACHE_DIR, 'settings.json');
const VOIPLINE_USER_NUMBERS_FILE = path.join(VOIPLINE_CACHE_DIR, 'user_numbers.json');
const VOIPLINE_CALL_LOGS_FILE = path.join(VOIPLINE_CACHE_DIR, 'call_logs.json');
const VOIPLINE_INBOUND_SMS_FILE = path.join(VOIPLINE_CACHE_DIR, 'inbound_sms.json');

function ensureVoIPLineCacheDir() {
  if (!fs.existsSync(VOIPLINE_CACHE_DIR)) {
    fs.mkdirSync(VOIPLINE_CACHE_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.warn(`[VoIPLine] Error reading ${filePath}:`, err);
  }
  return fallback;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    ensureVoIPLineCacheDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn(`[VoIPLine] Error writing ${filePath}:`, err);
  }
}

/**
 * Retrieves VoIPLine Settings
 */
export async function getStoredVoIPLineSettings(tenantId = 'default-tenant'): Promise<StoredVoIPLineSettings | null> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('voipline_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          tenant_id: data.tenant_id,
          api_key: data.api_key,
          webhook_secret: data.webhook_secret,
          created_at: data.created_at,
          updated_at: data.updated_at
        };
      }
    } catch (err: any) {
      console.warn('[Supabase] Warning reading voipline_settings:', err.message || err);
    }
  }

  // Fallback to cache / environment variables
  const cached = readJsonFile<StoredVoIPLineSettings | null>(VOIPLINE_SETTINGS_FILE, null);
  if (cached) return cached;

  if (process.env.VOIPLINE_API_KEY || process.env.VOIPLINE_WEBHOOK_SECRET) {
    return {
      tenant_id: tenantId,
      api_key: process.env.VOIPLINE_API_KEY || 'vpl_live_demo_key_774921',
      webhook_secret: process.env.VOIPLINE_WEBHOOK_SECRET || 'sec_vpl_token_9941a8'
    };
  }

  return {
    tenant_id: tenantId,
    api_key: 'vpl_live_9f82b4a7e10c4921b790d6',
    webhook_secret: 'sec_8402a7b319f0049281a4b2c1'
  };
}

/**
 * Upserts VoIPLine Settings
 */
export async function upsertVoIPLineSettings(settings: {
  tenant_id?: string;
  api_key: string;
  webhook_secret: string;
}): Promise<{ success: boolean; data?: StoredVoIPLineSettings; error?: string }> {
  const finalSettings: StoredVoIPLineSettings = {
    tenant_id: settings.tenant_id || 'default-tenant',
    api_key: settings.api_key.trim(),
    webhook_secret: settings.webhook_secret.trim(),
    updated_at: new Date().toISOString()
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      // Check if existing record exists
      const { data: existing } = await supabase.from('voipline_settings').select('tenant_id').limit(1).maybeSingle();
      let query;
      if (existing?.tenant_id) {
        query = supabase
          .from('voipline_settings')
          .update({
            api_key: finalSettings.api_key,
            webhook_secret: finalSettings.webhook_secret,
            updated_at: finalSettings.updated_at
          })
          .eq('tenant_id', existing.tenant_id)
          .select('*')
          .single();
      } else {
        query = supabase
          .from('voipline_settings')
          .insert({
            api_key: finalSettings.api_key,
            webhook_secret: finalSettings.webhook_secret,
            updated_at: finalSettings.updated_at
          })
          .select('*')
          .single();
      }

      const { data, error } = await query;
      if (!error && data) {
        writeJsonFile(VOIPLINE_SETTINGS_FILE, data);
        return { success: true, data };
      }
    } catch (err: any) {
      console.warn('[Supabase] Could not persist to voipline_settings table, using cache:', err.message || err);
    }
  }

  writeJsonFile(VOIPLINE_SETTINGS_FILE, finalSettings);
  return { success: true, data: finalSettings };
}

/**
 * User Virtual Phone Number Assignments
 */
export async function getStoredUserPhoneNumbers(): Promise<StoredUserPhoneNumber[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('user_phone_numbers').select('*');
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (err: any) {
      console.warn('[Supabase] Warning reading user_phone_numbers:', err.message || err);
    }
  }

  const cached = readJsonFile<StoredUserPhoneNumber[]>(VOIPLINE_USER_NUMBERS_FILE, []);
  if (cached.length > 0) return cached;

  // Default seed assignments matching initial users
  const defaults: StoredUserPhoneNumber[] = [
    { user_id: 'usr-1', user_name: 'John Solar (Admin)', assigned_number: '+61 2 8311 4920' },
    { user_id: 'usr-2', user_name: 'Sarah Jenkins (Consultant)', assigned_number: '+61 2 8311 4921' },
    { user_id: 'usr-3', user_name: 'David Miller (Electrician)', assigned_number: '+61 2 8311 4922' },
    { user_id: 'usr-4', user_name: 'Liam Chen (Designer)', assigned_number: '+61 2 8311 4923' },
    { user_id: 'usr-5', user_name: 'Tom Harris (Commercial)', assigned_number: '+61 7 3184 8921' }
  ];
  writeJsonFile(VOIPLINE_USER_NUMBERS_FILE, defaults);
  return defaults;
}

export async function upsertUserPhoneNumber(entry: {
  user_id: string;
  assigned_number: string;
  user_name?: string;
}): Promise<StoredUserPhoneNumber> {
  const normalizedNumber = entry.assigned_number.trim();
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('user_phone_numbers')
        .upsert(
          {
            user_id: entry.user_id,
            assigned_number: normalizedNumber,
            user_name: entry.user_name || undefined,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        )
        .select('*')
        .single();

      if (!error && data) {
        // Sync local cache
        const all = await getStoredUserPhoneNumbers();
        const updated = all.filter(u => u.user_id !== entry.user_id).concat(data);
        writeJsonFile(VOIPLINE_USER_NUMBERS_FILE, updated);
        return data;
      }
    } catch (err: any) {
      console.warn('[Supabase] Warning upserting user_phone_numbers:', err.message || err);
    }
  }

  const cached = readJsonFile<StoredUserPhoneNumber[]>(VOIPLINE_USER_NUMBERS_FILE, []);
  const existingIdx = cached.findIndex(u => u.user_id === entry.user_id);
  const record: StoredUserPhoneNumber = {
    id: `num-${Date.now()}`,
    user_id: entry.user_id,
    assigned_number: normalizedNumber,
    user_name: entry.user_name,
    updated_at: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    cached[existingIdx] = { ...cached[existingIdx], ...record };
  } else {
    cached.push(record);
  }
  writeJsonFile(VOIPLINE_USER_NUMBERS_FILE, cached);
  return record;
}

export async function findUserByPhoneNumber(phone: string): Promise<StoredUserPhoneNumber | null> {
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  const all = await getStoredUserPhoneNumbers();
  return (
    all.find(u => {
      const uClean = u.assigned_number.replace(/[^0-9+]/g, '');
      return uClean.endsWith(cleanPhone.slice(-8)) || cleanPhone.endsWith(uClean.slice(-8));
    }) || null
  );
}

/**
 * Call Logs
 */
export async function insertCallLog(log: Omit<StoredCallLog, 'id'>): Promise<StoredCallLog> {
  const newLog: StoredCallLog = {
    ...log,
    id: `call-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    created_at: new Date().toISOString()
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('call_logs')
        .insert({
          voipline_call_id: newLog.voipline_call_id,
          contact_id: newLog.contact_id || null,
          user_id: newLog.user_id || null,
          direction: newLog.direction,
          status: newLog.status,
          duration: newLog.duration || 0,
          recording_url: newLog.recording_url || null,
          caller_number: newLog.caller_number || null,
          callee_number: newLog.callee_number || null,
          message_body: newLog.message_body || null,
          timestamp: newLog.timestamp || new Date().toISOString()
        })
        .select('*')
        .single();

      if (!error && data) {
        return data;
      }
    } catch (err: any) {
      console.warn('[Supabase] Warning inserting into call_logs:', err.message || err);
    }
  }

  // Fallback cache
  const cached = readJsonFile<StoredCallLog[]>(VOIPLINE_CALL_LOGS_FILE, []);
  cached.unshift(newLog);
  writeJsonFile(VOIPLINE_CALL_LOGS_FILE, cached.slice(0, 200));
  return newLog;
}

/**
 * Updates call status and duration by voipline_call_id
 */
export async function updateCallLogStatus(
  voiplineCallId: string,
  status: string,
  duration?: number
): Promise<boolean> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const updateData: any = { status };
      if (typeof duration === 'number') updateData.duration = duration;

      const { error } = await supabase
        .from('call_logs')
        .update(updateData)
        .eq('voipline_call_id', voiplineCallId);

      if (!error) return true;
    } catch (err: any) {
      console.warn('[Supabase] Warning updating call_logs status:', err.message || err);
    }
  }

  const cached = readJsonFile<StoredCallLog[]>(VOIPLINE_CALL_LOGS_FILE, []);
  const found = cached.find(c => c.voipline_call_id === voiplineCallId);
  if (found) {
    found.status = status;
    if (typeof duration === 'number') found.duration = duration;
    writeJsonFile(VOIPLINE_CALL_LOGS_FILE, cached);
    return true;
  }
  return false;
}

/**
 * Updates call recording URL by voipline_call_id
 */
export async function updateCallLogRecordingUrl(
  voiplineCallId: string,
  recordingUrl: string
): Promise<boolean> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('call_logs')
        .update({ recording_url: recordingUrl })
        .eq('voipline_call_id', voiplineCallId);

      if (!error) return true;
    } catch (err: any) {
      console.warn('[Supabase] Warning updating call recording_url:', err.message || err);
    }
  }

  const cached = readJsonFile<StoredCallLog[]>(VOIPLINE_CALL_LOGS_FILE, []);
  const found = cached.find(c => c.voipline_call_id === voiplineCallId);
  if (found) {
    found.recording_url = recordingUrl;
    writeJsonFile(VOIPLINE_CALL_LOGS_FILE, cached);
    return true;
  }
  return false;
}

/**
 * Queries Call Logs with optional filters
 */
export async function getCallLogs(filter?: {
  contactId?: string;
  userId?: string;
  limit?: number;
}): Promise<StoredCallLog[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase.from('call_logs').select('*').order('timestamp', { ascending: false });
      if (filter?.contactId) query = query.eq('contact_id', filter.contactId);
      if (filter?.userId) query = query.eq('user_id', filter.userId);
      query = query.limit(filter?.limit || 50);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (err: any) {
      console.warn('[Supabase] Warning reading call_logs:', err.message || err);
    }
  }

  let list = readJsonFile<StoredCallLog[]>(VOIPLINE_CALL_LOGS_FILE, []);
  if (filter?.contactId) list = list.filter(l => l.contact_id === filter.contactId);
  if (filter?.userId) list = list.filter(l => l.user_id === filter.userId);
  return list.slice(0, filter?.limit || 50);
}

/**
 * Inbound SMS Logs
 */
export async function insertInboundSmsLog(log: Omit<StoredInboundSmsLog, 'id'>): Promise<StoredInboundSmsLog> {
  const newLog: StoredInboundSmsLog = {
    ...log,
    id: `sms-in-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    created_at: new Date().toISOString()
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('inbound_sms_logs')
        .insert({
          contact_id: newLog.contact_id || null,
          user_id: newLog.user_id || null,
          sender_number: newLog.sender_number,
          dest_number: newLog.dest_number,
          direction: newLog.direction || 'inbound',
          message_body: newLog.message_body,
          timestamp: newLog.timestamp || new Date().toISOString()
        })
        .select('*')
        .single();

      if (!error && data) {
        return data;
      }
    } catch (err: any) {
      console.warn('[Supabase] Warning inserting inbound_sms_logs:', err.message || err);
    }
  }

  const cached = readJsonFile<StoredInboundSmsLog[]>(VOIPLINE_INBOUND_SMS_FILE, []);
  cached.unshift(newLog);
  writeJsonFile(VOIPLINE_INBOUND_SMS_FILE, cached.slice(0, 200));
  return newLog;
}

export async function getInboundSmsLogs(filter?: {
  contactId?: string;
  destNumber?: string;
  limit?: number;
}): Promise<StoredInboundSmsLog[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase.from('inbound_sms_logs').select('*').order('timestamp', { ascending: false });
      if (filter?.contactId) query = query.eq('contact_id', filter.contactId);
      if (filter?.destNumber) query = query.eq('dest_number', filter.destNumber);
      query = query.limit(filter?.limit || 50);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (err: any) {
      console.warn('[Supabase] Warning reading inbound_sms_logs:', err.message || err);
    }
  }

  let list = readJsonFile<StoredInboundSmsLog[]>(VOIPLINE_INBOUND_SMS_FILE, []);
  if (filter?.contactId) list = list.filter(l => l.contact_id === filter.contactId);
  if (filter?.destNumber) list = list.filter(l => l.dest_number === filter.destNumber);
  return list.slice(0, filter?.limit || 50);
}

// ============================================================================
// CER BRIDGESELECT STC PORTAL INTEGRATION
// Table: bridgeselect_credentials
// Columns: projects.bridgeselect_sync_status, projects.bridgeselect_synced_at
// ============================================================================

export interface StoredBridgeSelectCredentials {
  id?: string;
  tenant_id?: string;
  account_key: string;
  account_salt: string;
  updated_at?: string;
}

const FALLBACK_BRIDGESELECT_CREDS_FILE = path.join(FALLBACK_CACHE_DIR, 'bridgeselect_credentials.json');

function readBridgeSelectFallbackCache(): StoredBridgeSelectCredentials | null {
  try {
    if (fs.existsSync(FALLBACK_BRIDGESELECT_CREDS_FILE)) {
      const data = fs.readFileSync(FALLBACK_BRIDGESELECT_CREDS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('[BridgeSelect] Could not read fallback cache:', err);
  }
  return null;
}

function writeBridgeSelectFallbackCache(creds: StoredBridgeSelectCredentials): void {
  try {
    if (!fs.existsSync(FALLBACK_CACHE_DIR)) {
      fs.mkdirSync(FALLBACK_CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(FALLBACK_BRIDGESELECT_CREDS_FILE, JSON.stringify(creds, null, 2), 'utf8');
  } catch (err) {
    console.warn('[BridgeSelect] Could not write fallback cache:', err);
  }
}

function deleteBridgeSelectFallbackCache(): void {
  try {
    if (fs.existsSync(FALLBACK_BRIDGESELECT_CREDS_FILE)) {
      fs.unlinkSync(FALLBACK_BRIDGESELECT_CREDS_FILE);
    }
  } catch (err) {
    console.warn('[BridgeSelect] Could not delete fallback cache:', err);
  }
}

/**
 * Retrieves BridgeSelect credentials from Supabase or fallback cache
 */
export async function getStoredBridgeSelectCredentials(
  tenantId?: string
): Promise<StoredBridgeSelectCredentials | null> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase.from('bridgeselect_credentials').select('*');
      if (tenantId) {
        query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      }
      query = query.order('updated_at', { ascending: false }).limit(1);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const row = data[0];
        return {
          id: row.id,
          tenant_id: row.tenant_id,
          account_key: row.account_key,
          account_salt: row.account_salt,
          updated_at: row.updated_at
        };
      }
    } catch (err: any) {
      console.warn('[Supabase] Warning reading bridgeselect_credentials:', err.message || err);
    }
  }

  // Fallback to local cache or environment variables
  const cached = readBridgeSelectFallbackCache();
  if (cached) return cached;

  if (process.env.BRIDGESELECT_ACCOUNT_KEY && process.env.BRIDGESELECT_ACCOUNT_SALT) {
    return {
      account_key: process.env.BRIDGESELECT_ACCOUNT_KEY,
      account_salt: process.env.BRIDGESELECT_ACCOUNT_SALT,
      updated_at: new Date().toISOString()
    };
  }

  return null;
}

/**
 * Upserts BridgeSelect credentials into Supabase and fallback cache
 */
export async function upsertBridgeSelectCredentials(
  creds: {
    tenant_id?: string;
    account_key: string;
    account_salt: string;
  }
): Promise<{ success: boolean; id?: string; source: 'supabase' | 'fallback'; error?: string }> {
  const now = new Date().toISOString();
  const updatedCreds: StoredBridgeSelectCredentials = {
    ...readBridgeSelectFallbackCache(),
    ...creds,
    updated_at: now
  };
  writeBridgeSelectFallbackCache(updatedCreds);

  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase.from('bridgeselect_credentials').select('id');
      if (creds.tenant_id) {
        query = query.eq('tenant_id', creds.tenant_id);
      }
      const { data: existing } = await query.limit(1).maybeSingle();

      let resultId = existing?.id;
      if (existing?.id) {
        const { error: updateErr } = await supabase
          .from('bridgeselect_credentials')
          .update({
            account_key: creds.account_key,
            account_salt: creds.account_salt,
            tenant_id: creds.tenant_id || null,
            updated_at: now
          })
          .eq('id', existing.id);

        if (updateErr) throw updateErr;
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from('bridgeselect_credentials')
          .insert([{
            account_key: creds.account_key,
            account_salt: creds.account_salt,
            tenant_id: creds.tenant_id || null,
            updated_at: now
          }])
          .select('id')
          .single();

        if (insertErr) throw insertErr;
        resultId = inserted?.id;
      }

      return { success: true, id: resultId, source: 'supabase' };
    } catch (err: any) {
      console.warn('[Supabase] Failed to write bridgeselect_credentials to Supabase:', err.message || err);
      return { success: true, source: 'fallback', error: err.message };
    }
  }

  return { success: true, source: 'fallback' };
}

/**
 * Deletes BridgeSelect credentials
 */
export async function deleteBridgeSelectCredentials(tenantId?: string): Promise<boolean> {
  deleteBridgeSelectFallbackCache();
  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase.from('bridgeselect_credentials').delete();
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      } else {
        query = query.neq('account_key', '');
      }
      await query;
    } catch (err) {
      console.warn('[Supabase] Warning deleting bridgeselect_credentials:', err);
    }
  }
  return true;
}

/**
 * Updates a project/job record's bridgeselect_sync_status and bridgeselect_synced_at
 */
export async function updateProjectBridgeSelectStatus(
  projectId: string,
  syncStatus: string,
  syncedAt?: string | null
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    // Try projects table first
    await supabase
      .from('projects')
      .update({
        bridgeselect_sync_status: syncStatus,
        bridgeselect_synced_at: syncedAt !== undefined ? syncedAt : (syncStatus === 'synced' ? new Date().toISOString() : null)
      })
      .eq('id', projectId);
  } catch (err) {
    // Try jobs table if projects failed
    try {
      await supabase
        .from('jobs')
        .update({
          bridgeselect_sync_status: syncStatus,
          bridgeselect_synced_at: syncedAt !== undefined ? syncedAt : (syncStatus === 'synced' ? new Date().toISOString() : null)
        })
        .eq('id', projectId);
    } catch (innerErr) {
      console.warn('[Supabase] Could not update job/project bridgeselect_sync_status:', innerErr);
    }
  }
}

// ==============================================================================
// OPENSOLAR 2-WAY SYNCHRONIZATION & QUEUE HELPERS
// ==============================================================================

export interface StoredOpenSolarCredentials {
  id?: string;
  tenant_id?: string | null;
  org_id: string;
  api_token: string;
  webhook_id?: string | null;
  integration_user_id?: string | null;
  webhook_secret?: string | null;
  base_url?: string;
  updated_at?: string;
}

export interface ProjectDocument {
  id: string;
  project_id: string;
  file_name: string;
  storage_path: string;
  document_type: string; // 'Signed Contract'
  file_size?: string;
  mime_type?: string;
  download_url?: string;
  metadata?: any;
  created_at: string;
}

export interface SyncQueueItem {
  id: string;
  model_type: 'contact' | 'project' | 'company' | 'lead';
  model_id: string;
  action: 'create' | 'update' | 'delete';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retry_count: number;
  next_attempt_at: string;
  payload?: any;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

const FALLBACK_OPENSOLAR_CREDS_FILE = path.join(FALLBACK_CACHE_DIR, 'opensolar_credentials.json');
const FALLBACK_PROJECT_DOCS_FILE = path.join(FALLBACK_CACHE_DIR, 'project_documents.json');
const FALLBACK_SYNC_QUEUE_FILE = path.join(FALLBACK_CACHE_DIR, 'sync_queue.json');

function readOpenSolarFallbackCache(): StoredOpenSolarCredentials | null {
  try {
    if (fs.existsSync(FALLBACK_OPENSOLAR_CREDS_FILE)) {
      const data = fs.readFileSync(FALLBACK_OPENSOLAR_CREDS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('[OpenSolar] Could not read fallback cache:', err);
  }
  return null;
}

function writeOpenSolarFallbackCache(creds: StoredOpenSolarCredentials): void {
  try {
    if (!fs.existsSync(FALLBACK_CACHE_DIR)) {
      fs.mkdirSync(FALLBACK_CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(FALLBACK_OPENSOLAR_CREDS_FILE, JSON.stringify(creds, null, 2), 'utf8');
  } catch (err) {
    console.warn('[OpenSolar] Could not write fallback cache:', err);
  }
}

function deleteOpenSolarFallbackCache(): void {
  try {
    if (fs.existsSync(FALLBACK_OPENSOLAR_CREDS_FILE)) {
      fs.unlinkSync(FALLBACK_OPENSOLAR_CREDS_FILE);
    }
  } catch (err) {
    console.warn('[OpenSolar] Could not delete fallback cache:', err);
  }
}

function readProjectDocsFallback(): ProjectDocument[] {
  try {
    if (fs.existsSync(FALLBACK_PROJECT_DOCS_FILE)) {
      return JSON.parse(fs.readFileSync(FALLBACK_PROJECT_DOCS_FILE, 'utf8'));
    }
  } catch (err) {
    console.warn('[Project Docs] Could not read fallback docs:', err);
  }
  return [];
}

function writeProjectDocsFallback(docs: ProjectDocument[]): void {
  try {
    if (!fs.existsSync(FALLBACK_CACHE_DIR)) {
      fs.mkdirSync(FALLBACK_CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(FALLBACK_PROJECT_DOCS_FILE, JSON.stringify(docs, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Project Docs] Could not write fallback docs:', err);
  }
}

function readSyncQueueFallback(): SyncQueueItem[] {
  try {
    if (fs.existsSync(FALLBACK_SYNC_QUEUE_FILE)) {
      return JSON.parse(fs.readFileSync(FALLBACK_SYNC_QUEUE_FILE, 'utf8'));
    }
  } catch (err) {
    console.warn('[Sync Queue] Could not read fallback queue:', err);
  }
  return [];
}

function writeSyncQueueFallback(queue: SyncQueueItem[]): void {
  try {
    if (!fs.existsSync(FALLBACK_CACHE_DIR)) {
      fs.mkdirSync(FALLBACK_CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(FALLBACK_SYNC_QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Sync Queue] Could not write fallback queue:', err);
  }
}

/**
 * Retrieves OpenSolar credentials from Supabase or environment/fallback
 */
export async function getStoredOpenSolarCredentials(): Promise<StoredOpenSolarCredentials | null> {
  const envOrgId = process.env.OPENSOLAR_ORG_ID;
  const envApiToken = process.env.OPENSOLAR_API_TOKEN;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('opensolar_credentials')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          tenant_id: data.tenant_id,
          org_id: data.org_id || envOrgId || '',
          api_token: data.api_token || envApiToken || '',
          webhook_id: data.webhook_id,
          integration_user_id: data.integration_user_id,
          webhook_secret: data.webhook_secret,
          base_url: data.base_url || 'https://api.opensolar.com',
          updated_at: data.updated_at
        };
      }
    } catch (err) {
      console.warn('[Supabase] Warning reading opensolar_credentials table:', err);
    }
  }

  const cached = readOpenSolarFallbackCache();
  if (cached) {
    return {
      ...cached,
      org_id: cached.org_id || envOrgId || '',
      api_token: cached.api_token || envApiToken || ''
    };
  }

  if (envOrgId && envApiToken) {
    return {
      org_id: envOrgId,
      api_token: envApiToken,
      base_url: 'https://api.opensolar.com'
    };
  }

  return null;
}

/**
 * Saves or updates OpenSolar credentials
 */
export async function saveStoredOpenSolarCredentials(
  creds: {
    org_id: string;
    api_token: string;
    webhook_id?: string | null;
    integration_user_id?: string | null;
    webhook_secret?: string | null;
    base_url?: string;
  }
): Promise<{ success: boolean; source: 'supabase' | 'fallback' }> {
  writeOpenSolarFallbackCache({
    ...creds,
    updated_at: new Date().toISOString()
  });

  const supabase = getSupabase();
  if (!supabase) {
    return { success: true, source: 'fallback' };
  }

  try {
    const existing = await getStoredOpenSolarCredentials();
    if (existing?.id) {
      await supabase
        .from('opensolar_credentials')
        .update({
          org_id: creds.org_id,
          api_token: creds.api_token,
          webhook_id: creds.webhook_id,
          integration_user_id: creds.integration_user_id,
          webhook_secret: creds.webhook_secret,
          base_url: creds.base_url || 'https://api.opensolar.com',
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('opensolar_credentials')
        .insert({
          org_id: creds.org_id,
          api_token: creds.api_token,
          webhook_id: creds.webhook_id,
          integration_user_id: creds.integration_user_id,
          webhook_secret: creds.webhook_secret,
          base_url: creds.base_url || 'https://api.opensolar.com',
          updated_at: new Date().toISOString()
        });
    }
    return { success: true, source: 'supabase' };
  } catch (err) {
    console.warn('[Supabase] Warning writing opensolar_credentials table:', err);
    return { success: true, source: 'fallback' };
  }
}

/**
 * Updates a record's os_id and last_updated_by in Supabase
 */
export async function updateRecordOpenSolarId(
  table: 'contacts' | 'companies' | 'leads' | 'projects' | 'jobs',
  recordId: string,
  osId: string,
  lastUpdatedBy: 'crm_user' | 'webhook' = 'crm_user'
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    await supabase
      .from(table)
      .update({
        os_id: osId,
        last_synced_at: new Date().toISOString(),
        last_updated_by: lastUpdatedBy
      })
      .eq('id', recordId);
  } catch (err) {
    console.warn(`[Supabase] Could not update ${table}.os_id:`, err);
  }
}

/**
 * Queries a record from Supabase by its OpenSolar primary key (os_id)
 */
export async function getRecordByOpenSolarId(
  table: 'contacts' | 'companies' | 'leads' | 'projects' | 'jobs',
  osId: string
): Promise<any | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('os_id', osId)
      .maybeSingle();

    if (!error && data) return data;
  } catch (err) {
    console.warn(`[Supabase] Error finding ${table} by os_id=${osId}:`, err);
  }
  return null;
}

/**
 * Stores a project document (e.g. downloaded signed contract) in project_documents
 */
export async function createProjectDocument(doc: Omit<ProjectDocument, 'id' | 'created_at'>): Promise<ProjectDocument> {
  const newDoc: ProjectDocument = {
    ...doc,
    id: `pdoc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    created_at: new Date().toISOString()
  };

  const existingDocs = readProjectDocsFallback();
  writeProjectDocsFallback([newDoc, ...existingDocs]);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('project_documents').insert({
        id: newDoc.id,
        project_id: newDoc.project_id,
        file_name: newDoc.file_name,
        storage_path: newDoc.storage_path,
        document_type: newDoc.document_type,
        file_size: newDoc.file_size,
        mime_type: newDoc.mime_type || 'application/pdf',
        download_url: newDoc.download_url,
        metadata: newDoc.metadata || {},
        created_at: newDoc.created_at
      });
    } catch (err) {
      console.warn('[Supabase] Warning creating project_document:', err);
    }
  }

  return newDoc;
}

/**
 * Fetches project documents for a specific project
 */
export async function getProjectDocuments(projectId: string): Promise<ProjectDocument[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as ProjectDocument[];
      }
    } catch (err) {
      console.warn('[Supabase] Error reading project_documents:', err);
    }
  }

  const fallbackDocs = readProjectDocsFallback();
  return fallbackDocs.filter(d => d.project_id === projectId);
}

/**
 * Asynchronous Queueing: Inserts a row into sync_queue
 */
export async function enqueueSyncQueueItem(
  item: Omit<SyncQueueItem, 'id' | 'status' | 'retry_count' | 'next_attempt_at' | 'created_at' | 'updated_at'>
): Promise<SyncQueueItem> {
  const now = new Date().toISOString();
  const queueItem: SyncQueueItem = {
    id: `sq-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    model_type: item.model_type,
    model_id: item.model_id,
    action: item.action,
    payload: item.payload,
    error_message: null,
    status: 'pending',
    retry_count: 0,
    next_attempt_at: now,
    created_at: now,
    updated_at: now
  };

  const queue = readSyncQueueFallback();
  writeSyncQueueFallback([...queue, queueItem]);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('sync_queue').insert({
        id: queueItem.id,
        model_type: queueItem.model_type,
        model_id: queueItem.model_id,
        action: queueItem.action,
        status: queueItem.status,
        retry_count: queueItem.retry_count,
        next_attempt_at: queueItem.next_attempt_at,
        payload: queueItem.payload,
        created_at: queueItem.created_at,
        updated_at: queueItem.updated_at
      });
    } catch (err) {
      console.warn('[Supabase] Warning inserting into sync_queue:', err);
    }
  }

  return queueItem;
}

/**
 * Gets a batch of pending items from sync_queue (respects batch limit & time)
 */
export async function getPendingSyncQueueBatch(limit: number = 20): Promise<SyncQueueItem[]> {
  const now = new Date().toISOString();
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('sync_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('next_attempt_at', now)
        .order('next_attempt_at', { ascending: true })
        .limit(limit);

      if (!error && data && data.length > 0) {
        return data as SyncQueueItem[];
      }
    } catch (err) {
      console.warn('[Supabase] Error reading pending sync_queue batch:', err);
    }
  }

  const queue = readSyncQueueFallback();
  return queue
    .filter(item => item.status === 'pending' && new Date(item.next_attempt_at) <= new Date())
    .slice(0, limit);
}

/**
 * Updates a sync_queue item (e.g. status, retry_count, next_attempt_at, error_message)
 */
export async function updateSyncQueueItem(
  id: string,
  updates: Partial<SyncQueueItem>
): Promise<void> {
  const now = new Date().toISOString();
  const queue = readSyncQueueFallback();
  const updatedQueue = queue.map(item => {
    if (item.id === id) {
      return { ...item, ...updates, updated_at: now };
    }
    return item;
  });
  writeSyncQueueFallback(updatedQueue);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase
        .from('sync_queue')
        .update({
          ...updates,
          updated_at: now
        })
        .eq('id', id);
    } catch (err) {
      console.warn('[Supabase] Error updating sync_queue item:', err);
    }
  }
}

/**
 * Retrieves aggregate statistics from sync_queue
 */
export async function getSyncQueueStats(): Promise<{
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}> {
  const queue = readSyncQueueFallback();
  return {
    total: queue.length,
    pending: queue.filter(q => q.status === 'pending').length,
    processing: queue.filter(q => q.status === 'processing').length,
    completed: queue.filter(q => q.status === 'completed').length,
    failed: queue.filter(q => q.status === 'failed').length
  };
}




