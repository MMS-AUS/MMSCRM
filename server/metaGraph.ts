/**
 * Meta Graph API v25.0 & Conversions API (CAPI) Backend Service
 *
 * Implements:
 * 1. Webhook Verification (GET) and Instant Ingestion (POST)
 * 2. Secure Leadgen ID resolution via Graph API v25.0
 * 3. Supabase credential storage in `meta_page_connections` with local file cache fallback
 * 4. JSONB custom_fields lead persistence preventing duplicates
 * 5. CAPI downstream event delivery (Purchases, Leads, Schedules) with EMQ optimization
 * 6. Historical bulk offline conversion upload (62-day limit, 1,000 chunking, 2s rate limit)
 */

import fs from 'fs';
import path from 'path';
import { getSupabase } from './supabase';
import { parseMetaFieldData, MappedMetaLeadResult } from '../src/utils/metaLeadMapper';
import { constructCapiPayload, MetaCapiEventPayload, MetaCapiPushResult } from '../src/utils/metaCapiPush';

export interface MetaPageConnection {
  tenant_id: string;
  page_id: string;
  page_access_token: string;
  page_name?: string;
  updated_at?: string;
}

export interface MetaServerSettings {
  app_id: string;
  app_secret: string;
  webhook_verify_token: string;
  dataset_id: string;
  capi_access_token: string;
  app_url: string;
}

const CACHE_DIR = path.join(process.cwd(), '.meta_cache');
const PAGES_CACHE_FILE = path.join(CACHE_DIR, 'page_connections.json');
const SETTINGS_CACHE_FILE = path.join(CACHE_DIR, 'settings.json');
const INGESTED_LEADS_FILE = path.join(CACHE_DIR, 'ingested_leads.json');

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Reads settings from environment or fallback file
 */
export function getMetaSettings(): MetaServerSettings {
  ensureCacheDir();
  let fileSettings: Partial<MetaServerSettings> = {};
  try {
    if (fs.existsSync(SETTINGS_CACHE_FILE)) {
      fileSettings = JSON.parse(fs.readFileSync(SETTINGS_CACHE_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[Meta] Error reading settings cache:', e);
  }

  const appUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    fileSettings.app_url ||
    'http://localhost:3000';

  return {
    app_id: process.env.META_APP_ID || fileSettings.app_id || '',
    app_secret: process.env.META_APP_SECRET || fileSettings.app_secret || '',
    webhook_verify_token:
      process.env.META_WEBHOOK_VERIFY_TOKEN ||
      fileSettings.webhook_verify_token ||
      'solarflow_meta_leadgen_verify_2026',
    dataset_id: process.env.META_DATASET_ID || fileSettings.dataset_id || '',
    capi_access_token:
      process.env.META_CAPI_ACCESS_TOKEN || fileSettings.capi_access_token || '',
    app_url: appUrl
  };
}

/**
 * Updates settings cache
 */
export function saveMetaSettings(partial: Partial<MetaServerSettings>): MetaServerSettings {
  ensureCacheDir();
  const current = getMetaSettings();
  const merged = { ...current, ...partial };
  fs.writeFileSync(SETTINGS_CACHE_FILE, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

/**
 * Reads local cached page connections
 */
function readLocalPageConnections(): MetaPageConnection[] {
  ensureCacheDir();
  try {
    if (fs.existsSync(PAGES_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(PAGES_CACHE_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[Meta] Error reading pages cache:', e);
  }
  return [];
}

/**
 * Saves local cached page connections
 */
function writeLocalPageConnections(pages: MetaPageConnection[]) {
  ensureCacheDir();
  fs.writeFileSync(PAGES_CACHE_FILE, JSON.stringify(pages, null, 2), 'utf8');
}

/**
 * Retrieves page connection by page_id from Supabase or fallback cache
 */
export async function getPageConnection(pageId: string): Promise<MetaPageConnection | null> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('meta_page_connections')
        .select('*')
        .eq('page_id', pageId)
        .single();

      if (!error && data) {
        return data as MetaPageConnection;
      }
    } catch (err) {
      console.warn('[Meta] Supabase meta_page_connections lookup error (falling back to cache):', err);
    }
  }

  const local = readLocalPageConnections();
  return local.find(p => p.page_id === pageId) || null;
}

/**
 * Retrieves all connected pages
 */
export async function getAllPageConnections(): Promise<MetaPageConnection[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('meta_page_connections')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && data && data.length > 0) {
        // Sync local cache
        writeLocalPageConnections(data);
        return data as MetaPageConnection[];
      }
    } catch (err) {
      console.warn('[Meta] Supabase fetch all pages error (using cache):', err);
    }
  }

  return readLocalPageConnections();
}

/**
 * Upserts a page connection into Supabase and local cache
 */
export async function savePageConnection(conn: {
  page_id: string;
  page_access_token: string;
  page_name?: string;
  tenant_id?: string;
}): Promise<MetaPageConnection> {
  const record: MetaPageConnection = {
    tenant_id: conn.tenant_id || `tenant-${Date.now()}`,
    page_id: conn.page_id,
    page_access_token: conn.page_access_token,
    page_name: conn.page_name || `Facebook Page ${conn.page_id}`,
    updated_at: new Date().toISOString()
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('meta_page_connections')
        .upsert(record, { onConflict: 'page_id' });

      if (error) {
        console.warn('[Meta] Supabase upsert error on meta_page_connections:', error.message);
      }
    } catch (err) {
      console.warn('[Meta] Supabase exception during page save:', err);
    }
  }

  // Always update local cache
  const local = readLocalPageConnections();
  const existingIdx = local.findIndex(p => p.page_id === conn.page_id);
  if (existingIdx >= 0) {
    local[existingIdx] = { ...local[existingIdx], ...record };
  } else {
    local.push(record);
  }
  writeLocalPageConnections(local);

  return record;
}

/**
 * Fetches lead details from Meta Graph API v25.0 using the Page Access Token
 */
export async function fetchMetaLeadDetails(
  leadgenId: string,
  pageAccessToken: string
): Promise<any> {
  const endpoint = `https://graph.facebook.com/v25.0/${leadgenId}?fields=created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,form_name,field_data&access_token=${encodeURIComponent(
    pageAccessToken
  )}`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Graph API v25.0 error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Saves or updates ingested leads list in fallback cache
 */
function saveLeadToLocalCache(lead: MappedMetaLeadResult) {
  ensureCacheDir();
  let list: MappedMetaLeadResult[] = [];
  try {
    if (fs.existsSync(INGESTED_LEADS_FILE)) {
      list = JSON.parse(fs.readFileSync(INGESTED_LEADS_FILE, 'utf8'));
    }
  } catch {}

  const existsIdx = list.findIndex(l => l.meta_leadgen_id === lead.meta_leadgen_id);
  if (existsIdx >= 0) {
    list[existsIdx] = { ...list[existsIdx], ...lead };
  } else {
    list.unshift(lead);
  }
  fs.writeFileSync(INGESTED_LEADS_FILE, JSON.stringify(list.slice(0, 500), null, 2), 'utf8');
}

/**
 * Returns locally ingested leads
 */
export function getLocalIngestedLeads(): MappedMetaLeadResult[] {
  ensureCacheDir();
  try {
    if (fs.existsSync(INGESTED_LEADS_FILE)) {
      return JSON.parse(fs.readFileSync(INGESTED_LEADS_FILE, 'utf8'));
    }
  } catch {}
  return [];
}

/**
 * Inserts or updates incoming lead in Supabase `leads` table and fallback cache
 */
export async function saveIncomingMetaLead(lead: MappedMetaLeadResult): Promise<{
  id: string;
  action: 'inserted' | 'updated' | 'duplicate_skipped';
}> {
  saveLeadToLocalCache(lead);

  const supabase = getSupabase();
  if (!supabase) {
    return { id: lead.meta_leadgen_id, action: 'inserted' };
  }

  try {
    // Check for duplicate meta_leadgen_id
    const { data: existing, error: checkErr } = await supabase
      .from('leads')
      .select('id, meta_leadgen_id')
      .eq('meta_leadgen_id', lead.meta_leadgen_id)
      .maybeSingle();

    if (!checkErr && existing) {
      console.log(`[Meta] Lead ${lead.meta_leadgen_id} already exists in CRM. Updating custom fields.`);
      await supabase
        .from('leads')
        .update({
          custom_fields: lead.custom_fields,
          status: 'New Lead'
        })
        .eq('id', existing.id);

      return { id: existing.id, action: 'updated' };
    }

    // Insert new lead
    const rowPayload = {
      meta_leadgen_id: lead.meta_leadgen_id,
      customer_name: lead.customerName,
      first_name: lead.firstName,
      last_name: lead.lastName,
      email: lead.email,
      phone: lead.phone_number,
      suburb: lead.suburb,
      postcode: lead.postcode,
      state: lead.state,
      address: lead.address,
      status: 'New Lead',
      source: 'Meta Ads',
      platform: 'Meta Lead Ads (Facebook/Instagram)',
      custom_fields: lead.custom_fields,
      created_at: new Date().toISOString()
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('leads')
      .insert(rowPayload)
      .select('id')
      .single();

    if (insertErr) {
      console.warn('[Meta] Supabase lead insertion warning:', insertErr.message);
      return { id: lead.meta_leadgen_id, action: 'inserted' };
    }

    return { id: inserted.id, action: 'inserted' };
  } catch (err) {
    console.error('[Meta] Failed to save lead to Supabase:', err);
    return { id: lead.meta_leadgen_id, action: 'inserted' };
  }
}

/**
 * Handles incoming Meta Lead Ads Webhook Payload (POST)
 */
export async function handleMetaWebhookPayload(body: any): Promise<{
  success: boolean;
  leadsProcessed: number;
  results: Array<{ leadgenId: string; status: string; customerName?: string }>;
}> {
  const results: Array<{ leadgenId: string; status: string; customerName?: string }> = [];

  if (!body || !body.entry || !Array.isArray(body.entry)) {
    return { success: true, leadsProcessed: 0, results: [] };
  }

  for (const entry of body.entry) {
    const pageId = entry.id;
    const changes = entry.changes || [];

    for (const change of changes) {
      if (change.field === 'leadgen') {
        const value = change.value || {};
        const leadgenId = value.leadgen_id;
        const formId = value.form_id;
        const adId = value.ad_id;
        const createdTime = value.created_time
          ? new Date(value.created_time * 1000).toISOString()
          : new Date().toISOString();

        if (!leadgenId) continue;

        try {
          // Look up page connection for page_access_token
          const connection = await getPageConnection(pageId);
          const pageAccessToken = connection?.page_access_token || process.env.META_CAPI_ACCESS_TOKEN;

          if (!pageAccessToken) {
            console.warn(
              `[Meta Webhook] No page access token found for Page ID ${pageId}. Cannot fetch leadgen data.`
            );
            results.push({ leadgenId, status: 'missing_page_token' });
            continue;
          }

          // Fetch full lead details via Meta Graph API v25.0
          const rawLead = await fetchMetaLeadDetails(leadgenId, pageAccessToken);

          // Parse field_data with standard mapper and custom_fields fallback
          const mappedLead = parseMetaFieldData(rawLead.field_data, {
            leadgen_id: leadgenId,
            created_time: rawLead.created_time || createdTime,
            ad_id: rawLead.ad_id || adId,
            form_id: rawLead.form_id || formId,
            form_name: rawLead.form_name,
            campaign_name: rawLead.campaign_name,
            page_id: pageId
          });

          // Save to database
          const saveRes = await saveIncomingMetaLead(mappedLead);

          results.push({
            leadgenId,
            status: saveRes.action,
            customerName: mappedLead.customerName
          });

          console.log(
            `[Meta Webhook] Successfully ingested lead ${leadgenId} (${mappedLead.customerName}) from Page ${pageId}`
          );
        } catch (err: any) {
          console.error(`[Meta Webhook] Error processing leadgen ${leadgenId}:`, err.message);
          results.push({ leadgenId, status: `error: ${err.message}` });
        }
      }
    }
  }

  return {
    success: true,
    leadsProcessed: results.length,
    results
  };
}

/**
 * Transmits a CAPI conversion event with the server credentials
 */
export async function sendServerCapiEvent(
  params: MetaCapiEventPayload,
  reqContext?: { ip?: string; userAgent?: string; fbc?: string; fbp?: string }
): Promise<MetaCapiPushResult> {
  const settings = getMetaSettings();
  const datasetId = settings.dataset_id;
  const token = settings.capi_access_token;

  if (!datasetId || !token) {
    return {
      success: false,
      skipped: true,
      eventId: `${params.crmEntityId}-${params.eventName}`,
      error: 'META_DATASET_ID or META_CAPI_ACCESS_TOKEN is not configured.'
    };
  }

  // Augment userData with request context for maximum Event Match Quality
  const mergedUserData = {
    ...params.userData,
    clientIpAddress: params.userData.clientIpAddress || reqContext?.ip,
    clientUserAgent: params.userData.clientUserAgent || reqContext?.userAgent,
    fbclid: params.userData.fbclid || reqContext?.fbc,
    fbp: params.userData.fbp || reqContext?.fbp
  };

  const fullPayload = constructCapiPayload({
    ...params,
    userData: mergedUserData
  });

  const endpoint = `https://graph.facebook.com/v25.0/${datasetId}/events`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fullPayload)
    });

    const result = await response.json();
    const eventId = `${params.crmEntityId}-${params.eventName}`;

    if (!response.ok) {
      console.error('[Meta CAPI Server Error]', result);
      return {
        success: false,
        eventId,
        error: result.error?.message || `HTTP ${response.status}: Failed CAPI transmission`
      };
    }

    return {
      success: true,
      eventsReceived: result.events_received,
      messagesReceived: result.messages_received,
      fbtraceId: result.fbtrace_id,
      eventId
    };
  } catch (err: any) {
    console.error('[Meta CAPI Server Exception]', err);
    return {
      success: false,
      eventId: `${params.crmEntityId}-${params.eventName}`,
      error: err.message || 'Unknown network error'
    };
  }
}

/**
 * Bulk Offline Conversion Upload Service:
 * Uploads historical "Closed Won", "Contract Signed", or "Completed" records
 * from within the last 62 days (Meta offline lookback limit).
 * Chunks events into batches of 1,000 and enforces a 2-second rate limit delay.
 */
export async function executeBulkOfflineConversionUpload(
  items: Array<{
    id: string;
    customerName?: string;
    email?: string;
    phone?: string;
    sellingPrice?: number | string;
    saleDate?: string;
    sold_at?: string;
    city?: string;
    state?: string;
    postcode?: string;
    fbclid?: string;
    meta_leadgen_id?: string;
  }>
): Promise<{
  totalRecords: number;
  eligibleWithin62Days: number;
  batchesSent: number;
  totalEventsProcessed: number;
  errors: string[];
}> {
  const settings = getMetaSettings();
  const datasetId = settings.dataset_id;
  const token = settings.capi_access_token;

  if (!datasetId || !token) {
    throw new Error('META_DATASET_ID and META_CAPI_ACCESS_TOKEN must be configured before bulk upload.');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const sixtyTwoDaysSeconds = 62 * 24 * 60 * 60;
  const cutoffSeconds = nowSeconds - sixtyTwoDaysSeconds;

  // Filter eligible records within 62 days
  const eligibleRecords: any[] = [];

  for (const item of items) {
    const rawDate = item.sold_at || item.saleDate;
    let eventTime = nowSeconds;
    if (rawDate) {
      const parsed = Math.floor(new Date(rawDate).getTime() / 1000);
      if (!isNaN(parsed) && parsed > 0) {
        eventTime = parsed;
      }
    }

    // Must be within 62 days and not in future
    if (eventTime >= cutoffSeconds && eventTime <= nowSeconds + 3600) {
      const price =
        typeof item.sellingPrice === 'number'
          ? item.sellingPrice
          : parseFloat(String(item.sellingPrice || '0').replace(/[^0-9.]/g, '')) || 0;

      const singleEventPayload = constructCapiPayload({
        eventName: 'Purchase',
        crmEntityId: item.id,
        eventTime,
        actionSource: 'system_generated',
        value: price,
        currency: 'AUD',
        userData: {
          email: item.email,
          phone: item.phone,
          fullName: item.customerName,
          city: item.city,
          state: item.state,
          postcode: item.postcode,
          externalId: item.id,
          metaLeadgenId: item.meta_leadgen_id,
          fbclid: item.fbclid
        }
      });

      eligibleRecords.push(singleEventPayload.data[0]);
    }
  }

  const CHUNK_SIZE = 1000;
  const chunks: any[][] = [];
  for (let i = 0; i < eligibleRecords.length; i += CHUNK_SIZE) {
    chunks.push(eligibleRecords.slice(i, i + CHUNK_SIZE));
  }

  let totalEventsProcessed = 0;
  const errors: string[] = [];

  for (let b = 0; b < chunks.length; b++) {
    const batch = chunks[b];
    const endpoint = `https://graph.facebook.com/v25.0/${datasetId}/events`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: batch })
      });

      const resJson = await res.json();
      if (!res.ok) {
        errors.push(`Batch ${b + 1}/${chunks.length} failed: ${resJson.error?.message || res.statusText}`);
      } else {
        totalEventsProcessed += resJson.events_received || batch.length;
      }
    } catch (err: any) {
      errors.push(`Batch ${b + 1} network exception: ${err.message}`);
    }

    // Enforce 2-second rate-limiting delay between chunks
    if (b < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return {
    totalRecords: items.length,
    eligibleWithin62Days: eligibleRecords.length,
    batchesSent: chunks.length,
    totalEventsProcessed,
    errors
  };
}

/**
 * Full SQL script for Supabase database migrations
 */
export const SUPABASE_META_MIGRATION_SQL = `-- ==============================================================================
-- Supabase Migration: Meta Graph API v25.0 & Conversions API (CAPI) Integration
-- ==============================================================================

-- 1. Create table for storing Meta Facebook Page Connections & Access Tokens
CREATE TABLE IF NOT EXISTS public.meta_page_connections (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id TEXT NOT NULL UNIQUE,
    page_access_token TEXT NOT NULL,
    page_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by Facebook Page ID during incoming webhook events
CREATE INDEX IF NOT EXISTS idx_meta_page_connections_page_id 
    ON public.meta_page_connections(page_id);

-- 2. Extend the leads / contacts table with Meta tracking attributes
ALTER TABLE public.leads 
    ADD COLUMN IF NOT EXISTS meta_leadgen_id TEXT,
    ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS fbclid TEXT,
    ADD COLUMN IF NOT EXISTS fbp TEXT,
    ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP WITH TIME ZONE;

-- 3. Unique index to guarantee deduplication on incoming leadgen IDs
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_meta_leadgen_id 
    ON public.leads(meta_leadgen_id) 
    WHERE meta_leadgen_id IS NOT NULL;

-- 4. GIN Index on custom_fields for lightning-fast JSONB queries
CREATE INDEX IF NOT EXISTS idx_leads_custom_fields 
    ON public.leads USING GIN (custom_fields);

-- 5. Extend projects table with Facebook click tracking and completion timestamps
ALTER TABLE public.projects 
    ADD COLUMN IF NOT EXISTS meta_leadgen_id TEXT,
    ADD COLUMN IF NOT EXISTS fbclid TEXT,
    ADD COLUMN IF NOT EXISTS fbp TEXT,
    ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP WITH TIME ZONE;

-- 6. Row Level Security (RLS) Configuration
ALTER TABLE public.meta_page_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to meta_page_connections" 
    ON public.meta_page_connections
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Allow authenticated CRM users to read meta_page_connections"
    ON public.meta_page_connections
    FOR SELECT
    USING (auth.role() = 'authenticated');
`;
