import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getSupabase } from './supabase';
import { formatToE164 } from './messagemedia';

// ============================================================================
// DATA MODELS & INTERFACES (Meta WhatsApp Cloud API v20.0 & Supabase)
// ============================================================================

export interface WhatsAppSettingsRow {
  tenant_id: string; // uuid
  phone_number_id: string;
  waba_id: string;
  access_token: string;
  webhook_verify_token: string;
  created_at?: string;
  updated_at?: string;
}

export interface WhatsAppMessageRow {
  id: string; // uuid
  tenant_id?: string;
  contact_id?: string | null;
  wa_message_id: string; // wamid.*
  direction: 'inbound' | 'outbound';
  message_body: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'received';
  timestamp: string;
  has_media: boolean;
  media_url?: string | null;
  media_type?: string | null;
  error_message?: string | null;
  created_at?: string;
  // CRM enrichment helpers
  contact_name?: string;
  contact_phone?: string;
  media_caption?: string;
  template_name?: string;
}

export interface WhatsAppTemplateParameter {
  type: 'text' | 'currency' | 'date_time';
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
}

export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'button';
  sub_type?: 'url' | 'quick_reply';
  index?: string | number;
  parameters: WhatsAppTemplateParameter[];
}

export interface WhatsAppTemplatePayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: {
      code: string;
    };
    components: WhatsAppTemplateComponent[];
  };
}

// ============================================================================
// LOCAL CACHE & STORAGE DIRECTORIES FOR DEVELOPMENT RESILIENCE
// ============================================================================

const CACHE_DIR = path.join(process.cwd(), '.whatsapp_cache');
const MEDIA_DIR = path.join(process.cwd(), '.whatsapp_media');
const SETTINGS_FILE = path.join(CACHE_DIR, 'settings.json');
const MESSAGES_FILE = path.join(CACHE_DIR, 'messages.json');

function ensureDirectories(): void {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

// Default initial settings
const DEFAULT_SETTINGS: WhatsAppSettingsRow = {
  tenant_id: '00000000-0000-0000-0000-000000000001',
  phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID || '109823749281726',
  waba_id: process.env.WHATSAPP_WABA_ID || '392019485019283',
  access_token: process.env.WHATSAPP_ACCESS_TOKEN || 'EAAGm0PX4ZBZB4BA...system_user_permanent_token_sec_9941',
  webhook_verify_token: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'solarflow_wa_verify_token_2026_australia',
  updated_at: new Date().toISOString()
};

// Seed default message history showcasing the 2-way CRM timeline with media
const SEED_MESSAGES: WhatsAppMessageRow[] = [
  {
    id: 'a1b2c3d4-1111-4000-8000-000000000001',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    contact_id: 'c1-marcus-vance',
    wa_message_id: 'wamid.HBgLMjY5MTI4ODQ5MTAVAgARGBI1N0Q2QTY5MjIzREQ0RTFFMQA=',
    direction: 'outbound',
    message_body: 'Hi Marcus, your CEC solar site assessment for 44 Ocean Avenue, Bondi Beach NSW 2026 is confirmed for tomorrow at 10:00 AM. Our accredited technician David Miller will inspect your switchboard.',
    status: 'read',
    timestamp: '2026-09-17T08:15:00Z',
    has_media: false,
    contact_name: 'Marcus Aurelius Vance',
    contact_phone: '+61 412 884 910',
    template_name: 'solar_survey_confirmation'
  },
  {
    id: 'a1b2c3d4-2222-4000-8000-000000000002',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    contact_id: 'c1-marcus-vance',
    wa_message_id: 'wamid.HBgLMjY5MTI4ODQ5MTAVAgASGBIzMzk1RTYzRDgzQjFFRDhGMQA=',
    direction: 'inbound',
    message_body: 'Here is the photo of our 3-phase meter box inside the garage.',
    status: 'received',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 mins ago -> WITHIN 24h window!
    has_media: true,
    media_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
    media_type: 'image/jpeg',
    media_caption: '3-phase meter box inside garage',
    contact_name: 'Marcus Aurelius Vance',
    contact_phone: '+61 412 884 910'
  },
  {
    id: 'a1b2c3d4-3333-4000-8000-000000000003',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    contact_id: 'c2-elena-rostova',
    wa_message_id: 'wamid.HBgLMjY0MDE1NTIxOTQVAgARGBIyMzQ5QTBCQzEwRkVFQTUzMAA=',
    direction: 'outbound',
    message_body: 'Thanks Elena! We verified your switchboard is 3-phase 63A. No upgrade needed for the Tesla Powerwall 3 installation.',
    status: 'delivered',
    timestamp: '2026-09-15T04:20:00Z', // 3 days ago -> Outside 24h window!
    has_media: false,
    contact_name: 'Elena Rostova',
    contact_phone: '+61 401 552 194'
  }
];

// ============================================================================
// SETTINGS REPOSITORY (Supabase with Local File Cache Fallback)
// ============================================================================

export async function getStoredWhatsAppSettings(tenantId?: string): Promise<WhatsAppSettingsRow> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const query = supabase
        .from('whatsapp_settings')
        .select('*');
      
      if (tenantId) {
        query.eq('tenant_id', tenantId);
      }
      
      const { data, error } = await query.order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (!error && data) {
        return data as WhatsAppSettingsRow;
      }
    } catch (err: any) {
      console.warn('[WhatsApp] Could not fetch settings from Supabase, using fallback:', err.message || err);
    }
  }

  ensureDirectories();
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const content = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(content) };
    }
  } catch (err) {
    console.warn('[WhatsApp] Failed to read fallback settings file:', err);
  }

  return DEFAULT_SETTINGS;
}

export async function upsertStoredWhatsAppSettings(
  settings: Partial<WhatsAppSettingsRow>
): Promise<WhatsAppSettingsRow> {
  const current = await getStoredWhatsAppSettings(settings.tenant_id);
  const updated: WhatsAppSettingsRow = {
    ...current,
    ...settings,
    updated_at: new Date().toISOString()
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('whatsapp_settings')
        .upsert(updated, { onConflict: 'tenant_id' })
        .select()
        .maybeSingle();

      if (!error && data) {
        // Also sync local cache
        ensureDirectories();
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
        return data as WhatsAppSettingsRow;
      }
    } catch (err: any) {
      console.warn('[WhatsApp] Error saving settings to Supabase, falling back to local file:', err.message || err);
    }
  }

  ensureDirectories();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf8');
  return updated;
}

// ============================================================================
// MESSAGES REPOSITORY (whatsapp_messages Table)
// ============================================================================

export async function getStoredWhatsAppMessages(
  contactId?: string,
  limit = 100
): Promise<WhatsAppMessageRow[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase
        .from('whatsapp_messages')
        .select('*')
        .order('timestamp', { ascending: true })
        .limit(limit);

      if (contactId) {
        query = query.eq('contact_id', contactId);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as WhatsAppMessageRow[];
      }
    } catch (err: any) {
      console.warn('[WhatsApp] Error querying whatsapp_messages from Supabase:', err.message || err);
    }
  }

  // Fallback to local cache
  ensureDirectories();
  try {
    if (fs.existsSync(MESSAGES_FILE)) {
      const content = fs.readFileSync(MESSAGES_FILE, 'utf8');
      const messages: WhatsAppMessageRow[] = JSON.parse(content);
      if (contactId) {
        return messages.filter(m => m.contact_id === contactId);
      }
      return messages;
    } else {
      // Seed default messages
      fs.writeFileSync(MESSAGES_FILE, JSON.stringify(SEED_MESSAGES, null, 2), 'utf8');
      if (contactId) {
        return SEED_MESSAGES.filter(m => m.contact_id === contactId);
      }
      return SEED_MESSAGES;
    }
  } catch (err) {
    console.warn('[WhatsApp] Failed to read fallback messages file:', err);
    return SEED_MESSAGES;
  }
}

export async function insertStoredWhatsAppMessage(
  msg: Partial<WhatsAppMessageRow>
): Promise<WhatsAppMessageRow> {
  const record: WhatsAppMessageRow = {
    id: msg.id || crypto.randomUUID(),
    tenant_id: msg.tenant_id || '00000000-0000-0000-0000-000000000001',
    contact_id: msg.contact_id || null,
    wa_message_id: msg.wa_message_id || `wamid.HBgL${crypto.randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '')}`,
    direction: msg.direction || 'outbound',
    message_body: msg.message_body || '',
    status: msg.status || (msg.direction === 'inbound' ? 'received' : 'sent'),
    timestamp: msg.timestamp || new Date().toISOString(),
    has_media: Boolean(msg.has_media),
    media_url: msg.media_url || null,
    media_type: msg.media_type || null,
    error_message: msg.error_message || null,
    contact_name: msg.contact_name,
    contact_phone: msg.contact_phone,
    media_caption: msg.media_caption,
    template_name: msg.template_name,
    created_at: new Date().toISOString()
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .insert([record])
        .select()
        .maybeSingle();

      if (!error && data) {
        await appendToLocalMessagesCache(record);
        return data as WhatsAppMessageRow;
      }
    } catch (err: any) {
      console.warn('[WhatsApp] Supabase insert failed, storing locally:', err.message || err);
    }
  }

  await appendToLocalMessagesCache(record);
  return record;
}

export async function updateStoredWhatsAppMessageStatus(
  waMessageId: string,
  status: WhatsAppMessageRow['status'],
  errorMessage?: string
): Promise<{ success: boolean; updatedCount: number }> {
  let updatedCount = 0;
  const supabase = getSupabase();

  if (supabase) {
    try {
      const updateData: any = { status };
      if (errorMessage) updateData.error_message = errorMessage;

      const { data, error } = await supabase
        .from('whatsapp_messages')
        .update(updateData)
        .eq('wa_message_id', waMessageId)
        .select();

      if (!error && data) {
        updatedCount = data.length;
      }
    } catch (err: any) {
      console.warn('[WhatsApp] Supabase update status failed:', err.message || err);
    }
  }

  // Update in local file cache as well
  ensureDirectories();
  try {
    let list: WhatsAppMessageRow[] = [];
    if (fs.existsSync(MESSAGES_FILE)) {
      list = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
    } else {
      list = [...SEED_MESSAGES];
    }

    const idx = list.findIndex(m => m.wa_message_id === waMessageId);
    if (idx >= 0) {
      list[idx].status = status;
      if (errorMessage) list[idx].error_message = errorMessage;
      fs.writeFileSync(MESSAGES_FILE, JSON.stringify(list, null, 2), 'utf8');
      updatedCount = Math.max(updatedCount, 1);
    }
  } catch (err) {
    console.warn('[WhatsApp] Could not update local message status:', err);
  }

  return { success: true, updatedCount };
}

async function appendToLocalMessagesCache(msg: WhatsAppMessageRow): Promise<void> {
  ensureDirectories();
  try {
    let list: WhatsAppMessageRow[] = [];
    if (fs.existsSync(MESSAGES_FILE)) {
      list = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
    } else {
      list = [...SEED_MESSAGES];
    }

    const existingIdx = list.findIndex(m => m.wa_message_id === msg.wa_message_id);
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...msg };
    } else {
      list.push(msg);
    }

    // Keep chronological
    list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    console.warn('[WhatsApp] Failed to append to local cache:', err);
  }
}

// ============================================================================
// THE 24-HOUR RULE ENGINE (Meta Customer Service Window)
// ============================================================================

export interface WhatsApp24HourCheckResult {
  isWithin24Hours: boolean;
  canSendFreeForm: boolean;
  lastInboundTimestamp?: string;
  remainingMinutes?: number;
  remainingHours?: number;
  reason?: string;
}

/**
 * Evaluates whether a contact is within Meta's 24-Hour Customer Care Window.
 * Free-form outbound text messages are only permitted if the customer replied within 24h.
 * Otherwise, Meta requires an approved WhatsApp Template Message.
 */
export async function check24HourCustomerWindow(
  contactId?: string,
  contactPhone?: string
): Promise<WhatsApp24HourCheckResult> {
  const allMessages = await getStoredWhatsAppMessages();
  
  // Find messages matching contactId or contactPhone
  const filtered = allMessages.filter(m => {
    if (contactId && m.contact_id === contactId) return true;
    if (contactPhone && m.contact_phone && formatToE164(m.contact_phone) === formatToE164(contactPhone)) return true;
    return false;
  });

  // Find the most recent inbound message
  const inboundMessages = filtered
    .filter(m => m.direction === 'inbound')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (inboundMessages.length === 0) {
    return {
      isWithin24Hours: false,
      canSendFreeForm: false,
      reason: 'No inbound message on file from this contact. Meta requires an approved WhatsApp Template message to initiate conversation.'
    };
  }

  const lastInbound = inboundMessages[0];
  const lastInboundTime = new Date(lastInbound.timestamp).getTime();
  const now = Date.now();
  const elapsedMs = now - lastInboundTime;
  const windowDurationMs = 24 * 60 * 60 * 1000; // 24 hours

  if (elapsedMs <= windowDurationMs) {
    const remainingMs = windowDurationMs - elapsedMs;
    const remainingMinutes = Math.floor(remainingMs / (60 * 1000));
    const remainingHours = Number((remainingMs / (60 * 60 * 1000)).toFixed(1));

    return {
      isWithin24Hours: true,
      canSendFreeForm: true,
      lastInboundTimestamp: lastInbound.timestamp,
      remainingMinutes,
      remainingHours
    };
  } else {
    return {
      isWithin24Hours: false,
      canSendFreeForm: false,
      lastInboundTimestamp: lastInbound.timestamp,
      reason: `Meta 24-Hour Customer Care Window expired ${Math.floor(elapsedMs / (60 * 60 * 1000))} hours ago. Free-form text is blocked by Meta. You must send a pre-approved WhatsApp Template Message.`
    };
  }
}

// ============================================================================
// THE TWO-STEP MEDIA DOWNLOAD & SUPABASE STORAGE RETRIEVAL
// ============================================================================

export interface DownloadedMediaResult {
  buffer: Buffer;
  mimeType: string;
  fileExtension: string;
  sourceUrl: string;
}

export function getFileExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/aac': 'aac',
    'audio/amr': 'amr',
    'video/mp4': 'mp4',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
  };
  return map[mimeType.toLowerCase()] || 'bin';
}

/**
 * Implements Meta's strict two-step media download protocol:
 * Step 1: GET https://graph.facebook.com/v20.0/{media_id} with Authorization: Bearer {access_token} -> extracts temporary CDN URL.
 * Step 2: GET that temporary CDN URL with Authorization: Bearer {access_token} -> downloads binary data arraybuffer.
 */
export async function downloadWhatsAppMedia(
  mediaId: string,
  accessToken: string
): Promise<DownloadedMediaResult> {
  // Graceful sandbox fallback for mock media IDs
  if (mediaId.startsWith('mock_')) {
    const isDoc = mediaId.includes('document') || mediaId.includes('pdf');
    const mimeType = isDoc ? 'application/pdf' : 'image/jpeg';
    const sampleBuffer = Buffer.from(
      isDoc
        ? '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000102 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF'
        : 'sample-jpeg-binary-buffer'
    );
    return {
      buffer: sampleBuffer,
      mimeType,
      fileExtension: isDoc ? 'pdf' : 'jpg',
      sourceUrl: isDoc
        ? 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
        : 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80'
    };
  }

  // Step 1: Retrieve the temporary CDN URL
  const step1Url = `https://graph.facebook.com/v20.0/${mediaId}`;
  const step1Response = await fetch(step1Url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!step1Response.ok) {
    const errorText = await step1Response.text();
    throw new Error(`Meta Media Step 1 failed (HTTP ${step1Response.status}): ${errorText}`);
  }

  const step1Data: any = await step1Response.json();
  const cdnUrl = step1Data.url;
  const mimeType = step1Data.mime_type || 'application/octet-stream';

  if (!cdnUrl) {
    throw new Error(`Meta Media Step 1 did not return a media URL: ${JSON.stringify(step1Data)}`);
  }

  // Step 2: Download the binary buffer directly using the extracted URL and the same Bearer header
  const step2Response = await fetch(cdnUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!step2Response.ok) {
    const errorText = await step2Response.text();
    throw new Error(`Meta Media Step 2 binary download failed (HTTP ${step2Response.status}): ${errorText}`);
  }

  const arrayBuffer = await step2Response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileExtension = getFileExtensionFromMimeType(mimeType);

  return {
    buffer,
    mimeType,
    fileExtension,
    sourceUrl: cdnUrl
  };
}

/**
 * Uploads downloaded media buffer into Supabase Storage bucket `whatsapp_media`
 * Path convention: ${tenant_id}/${wa_message_id}.${file_extension}
 */
export async function uploadMediaToSupabaseStorage(
  buffer: Buffer,
  mimeType: string,
  tenantId: string,
  waMessageId: string
): Promise<{ storagePath: string; publicOrSignedUrl: string }> {
  const ext = getFileExtensionFromMimeType(mimeType);
  const cleanMessageId = waMessageId.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const storagePath = `${tenantId}/${cleanMessageId}.${ext}`;

  const supabase = getSupabase();
  if (supabase) {
    try {
      // Upload to bucket
      const { error: uploadError } = await supabase.storage
        .from('whatsapp_media')
        .upload(storagePath, buffer, {
          contentType: mimeType,
          upsert: true
        });

      if (!uploadError) {
        // Try generating a 7-day signed URL
        const { data: signedData } = await supabase.storage
          .from('whatsapp_media')
          .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7 days

        if (signedData?.signedUrl) {
          return {
            storagePath,
            publicOrSignedUrl: signedData.signedUrl
          };
        }

        // Or fallback to public URL
        const { data: publicData } = supabase.storage
          .from('whatsapp_media')
          .getPublicUrl(storagePath);

        return {
          storagePath,
          publicOrSignedUrl: publicData.publicUrl
        };
      } else {
        console.warn('[WhatsApp] Supabase storage upload error:', uploadError.message);
      }
    } catch (err: any) {
      console.warn('[WhatsApp] Supabase storage exception:', err.message || err);
    }
  }

  // Fallback: save to local media directory
  ensureDirectories();
  const localFileName = `${cleanMessageId}.${ext}`;
  const localFilePath = path.join(MEDIA_DIR, localFileName);
  fs.writeFileSync(localFilePath, buffer);

  const fallbackUrl = `/api/whatsapp/media/${tenantId}/${localFileName}`;
  return {
    storagePath,
    publicOrSignedUrl: fallbackUrl
  };
}

// ============================================================================
// TEMPLATE PAYLOAD BUILDER & VALIDATOR
// ============================================================================

export interface BuildTemplatePayloadParams {
  to: string;
  template_name: string;
  language_code?: string;
  parameters: Array<string | WhatsAppTemplateParameter>;
  buttons?: Array<{
    sub_type: 'url' | 'quick_reply';
    index: number | string;
    parameters: WhatsAppTemplateParameter[];
  }>;
}

/**
 * Constructs the strict JSON payload required by Meta WhatsApp Cloud API
 * for pre-approved template messages with sequential parameters.
 */
export function buildWhatsAppTemplatePayload(
  params: BuildTemplatePayloadParams
): WhatsAppTemplatePayload {
  const languageCode = params.language_code || 'en_AU';

  // Build sequential body parameters array
  // Order matters: first object replaces {{1}}, second replaces {{2}}, etc.
  const bodyParameters: WhatsAppTemplateParameter[] = params.parameters.map(param => {
    if (typeof param === 'string') {
      return {
        type: 'text',
        text: param
      };
    }
    return param;
  });

  const components: WhatsAppTemplateComponent[] = [
    {
      type: 'body',
      parameters: bodyParameters
    }
  ];

  // If dynamic buttons are specified (e.g. dynamic URL button)
  if (params.buttons && params.buttons.length > 0) {
    for (const btn of params.buttons) {
      components.push({
        type: 'button',
        sub_type: btn.sub_type,
        index: btn.index.toString(),
        parameters: btn.parameters
      });
    }
  }

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formatToE164(params.to),
    type: 'template',
    template: {
      name: params.template_name,
      language: {
        code: languageCode
      },
      components
    }
  };
}

// ============================================================================
// OUTBOUND DISPATCHERS (Free-form Text & Template Messages)
// ============================================================================

export interface SendWhatsAppTextMessageParams {
  to: string;
  message_body: string;
  contact_id?: string;
  tenant_id?: string;
  forceBypassWindowCheck?: boolean;
}

export async function sendWhatsAppTextMessage(
  params: SendWhatsAppTextMessageParams
): Promise<{ success: boolean; wa_message_id: string; message: WhatsAppMessageRow }> {
  const settings = await getStoredWhatsAppSettings(params.tenant_id);

  if (!settings.phone_number_id || !settings.access_token) {
    throw new Error('WhatsApp Phone Number ID and Access Token are not configured.');
  }

  // 1. Enforce Meta 24-Hour Rule
  if (!params.forceBypassWindowCheck) {
    const windowCheck = await check24HourCustomerWindow(params.contact_id, params.to);
    if (!windowCheck.canSendFreeForm) {
      throw new Error(windowCheck.reason || 'Meta 24-Hour Customer Care Window expired. Template message required.');
    }
  }

  const endpoint = `https://graph.facebook.com/v20.0/${settings.phone_number_id}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formatToE164(params.to),
    type: 'text',
    text: {
      body: params.message_body
    }
  };

  let waMessageId = `wamid.HBgL${crypto.randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '')}`;
  let isMetaSuccess = false;
  let metaErrorText: string | null = null;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data: any = await response.json().catch(() => ({}));

    if (response.ok && data.messages?.[0]?.id) {
      waMessageId = data.messages[0].id;
      isMetaSuccess = true;
    } else {
      metaErrorText = data.error?.message || `HTTP ${response.status}: ${JSON.stringify(data)}`;
      console.warn('[WhatsApp] Meta Cloud API error dispatching text:', metaErrorText);
    }
  } catch (err: any) {
    metaErrorText = err.message;
    console.warn('[WhatsApp] Network error dispatching text:', err);
  }

  // 2. Log outbound message to database
  const logged = await insertStoredWhatsAppMessage({
    tenant_id: settings.tenant_id,
    contact_id: params.contact_id,
    contact_phone: params.to,
    wa_message_id: waMessageId,
    direction: 'outbound',
    message_body: params.message_body,
    status: isMetaSuccess ? 'sent' : 'failed',
    has_media: false,
    error_message: metaErrorText || undefined,
    timestamp: new Date().toISOString()
  });

  if (!isMetaSuccess && metaErrorText) {
    // Return the logged record with error
    return {
      success: false,
      wa_message_id: waMessageId,
      message: logged
    };
  }

  return {
    success: true,
    wa_message_id: waMessageId,
    message: logged
  };
}

export interface SendWhatsAppTemplateMessageParams {
  to: string;
  template_name: string;
  language_code?: string;
  parameters: Array<string | WhatsAppTemplateParameter>;
  buttons?: any[];
  contact_id?: string;
  tenant_id?: string;
}

export async function sendWhatsAppTemplateMessage(
  params: SendWhatsAppTemplateMessageParams
): Promise<{ success: boolean; wa_message_id: string; message: WhatsAppMessageRow }> {
  const settings = await getStoredWhatsAppSettings(params.tenant_id);

  if (!settings.phone_number_id || !settings.access_token) {
    throw new Error('WhatsApp Phone Number ID and Access Token are not configured.');
  }

  // 1. Build Payload
  const payload = buildWhatsAppTemplatePayload({
    to: params.to,
    template_name: params.template_name,
    language_code: params.language_code || 'en_AU',
    parameters: params.parameters,
    buttons: params.buttons
  });

  const endpoint = `https://graph.facebook.com/v20.0/${settings.phone_number_id}/messages`;

  let waMessageId = `wamid.HBgL${crypto.randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '')}`;
  let isMetaSuccess = false;
  let metaErrorText: string | null = null;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data: any = await response.json().catch(() => ({}));

    if (response.ok && data.messages?.[0]?.id) {
      waMessageId = data.messages[0].id;
      isMetaSuccess = true;
    } else {
      metaErrorText = data.error?.message || `HTTP ${response.status}: ${JSON.stringify(data)}`;
      console.warn('[WhatsApp] Meta Cloud API error dispatching template:', metaErrorText);
    }
  } catch (err: any) {
    metaErrorText = err.message;
    console.warn('[WhatsApp] Network error dispatching template:', err);
  }

  // 2. Synthesize readable body for CRM chat display
  const readableBody = `[Template: ${params.template_name}] Parameters: ${params.parameters.map(p => typeof p === 'string' ? p : p.text || '').join(', ')}`;

  // 3. Log to database
  const logged = await insertStoredWhatsAppMessage({
    tenant_id: settings.tenant_id,
    contact_id: params.contact_id,
    contact_phone: params.to,
    wa_message_id: waMessageId,
    direction: 'outbound',
    message_body: readableBody,
    status: isMetaSuccess ? 'sent' : 'failed',
    has_media: false,
    error_message: metaErrorText || undefined,
    template_name: params.template_name,
    timestamp: new Date().toISOString()
  });

  return {
    success: isMetaSuccess,
    wa_message_id: waMessageId,
    message: logged
  };
}

// ============================================================================
// CONTACT SYNCING & AUTO-LEAD GENERATION
// ============================================================================

export interface MatchedContact {
  contact_id?: string;
  contact_name?: string;
  is_new_lead?: boolean;
}

/**
 * Searches CRM contacts for a phone number match.
 * If not found, creates a new "Lead" using the sender's WhatsApp profile name and phone number.
 */
export async function matchOrSyncContactFromPhone(
  rawPhone: string,
  profileName?: string
): Promise<MatchedContact> {
  const normalizedPhone = formatToE164(rawPhone);
  const supabase = getSupabase();

  if (supabase) {
    try {
      // 1. Check contacts table
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, name, phone, mobile_phone');

      if (contacts && contacts.length > 0) {
        const found = contacts.find(c => {
          if (c.phone && formatToE164(c.phone) === normalizedPhone) return true;
          if (c.mobile_phone && formatToE164(c.mobile_phone) === normalizedPhone) return true;
          return false;
        });

        if (found) {
          return {
            contact_id: found.id,
            contact_name: found.name,
            is_new_lead: false
          };
        }
      }

      // 2. Check existing leads table
      const { data: leads } = await supabase
        .from('leads')
        .select('id, name, customer_phone, phone');

      if (leads && leads.length > 0) {
        const foundLead = leads.find(l => {
          if (l.customer_phone && formatToE164(l.customer_phone) === normalizedPhone) return true;
          if (l.phone && formatToE164(l.phone) === normalizedPhone) return true;
          return false;
        });

        if (foundLead) {
          return {
            contact_id: foundLead.id,
            contact_name: foundLead.name,
            is_new_lead: false
          };
        }
      }

      // 3. Not found: create a new Lead record in Supabase
      const newLeadName = profileName || `WhatsApp User ${normalizedPhone.slice(-4)}`;
      const newLeadRecord = {
        name: newLeadName,
        customer_phone: normalizedPhone,
        phone: normalizedPhone,
        source: 'Meta WhatsApp Inbound',
        stage: 'New Inquiry',
        created_at: new Date().toISOString()
      };

      const { data: createdLead } = await supabase
        .from('leads')
        .insert([newLeadRecord])
        .select()
        .maybeSingle();

      if (createdLead) {
        return {
          contact_id: createdLead.id,
          contact_name: createdLead.name,
          is_new_lead: true
        };
      }
    } catch (err: any) {
      console.warn('[WhatsApp] Error in contact matching query:', err.message || err);
    }
  }

  // Fallback contact resolution
  return {
    contact_id: `contact-wa-${normalizedPhone.replace(/[^0-9]/g, '')}`,
    contact_name: profileName || `WhatsApp Lead (${normalizedPhone})`,
    is_new_lead: true
  };
}

// ============================================================================
// INBOUND WEBHOOK INTAKE HANDLER (/api/webhooks/whatsapp)
// ============================================================================

export interface ProcessWebhookResult {
  processedMessagesCount: number;
  processedStatusesCount: number;
  syncedContacts: string[];
}

/**
 * Handles incoming webhook payloads from Meta:
 * 1. Delivery & read receipts (statuses array)
 * 2. Inbound text & media messages (messages array)
 * 3. Media detection, two-step download, and storage in Supabase bucket whatsapp_media
 */
export async function processInboundWhatsAppWebhook(
  payload: any
): Promise<ProcessWebhookResult> {
  let processedMessagesCount = 0;
  let processedStatusesCount = 0;
  const syncedContacts: string[] = [];

  const settings = await getStoredWhatsAppSettings();
  const entry = payload?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;

  if (!value) {
    return { processedMessagesCount: 0, processedStatusesCount: 0, syncedContacts: [] };
  }

  // 1. Process Status Receipts (sent, delivered, read, failed)
  if (Array.isArray(value.statuses) && value.statuses.length > 0) {
    for (const statusObj of value.statuses) {
      const waMessageId = statusObj.id;
      const status = statusObj.status; // 'sent', 'delivered', 'read', 'failed'
      const errorMsg = statusObj.errors?.[0]?.message;

      if (waMessageId && status) {
        await updateStoredWhatsAppMessageStatus(waMessageId, status, errorMsg);
        processedStatusesCount++;
      }
    }
  }

  // 2. Process Inbound Messages
  if (Array.isArray(value.messages) && value.messages.length > 0) {
    // Extract profile name from contacts array if available
    const profileName = value.contacts?.[0]?.profile?.name;

    for (const incoming of value.messages) {
      const senderPhone = incoming.from;
      const waMessageId = incoming.id;
      const msgType = incoming.type; // 'text', 'image', 'document', 'audio', 'video', 'sticker', etc.
      const timestamp = incoming.timestamp 
        ? new Date(Number(incoming.timestamp) * 1000).toISOString()
        : new Date().toISOString();

      // Contact Syncing: match phone or create new Lead
      const contactMatch = await matchOrSyncContactFromPhone(senderPhone, profileName);
      if (contactMatch.contact_name) {
        syncedContacts.push(contactMatch.contact_name);
      }

      let messageBody = '';
      let hasMedia = false;
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;
      let mediaCaption: string | undefined = undefined;

      // Handle plain text
      if (msgType === 'text') {
        messageBody = incoming.text?.body || '';
      } 
      // Handle Media Attachments (images, documents, audio, video, sticker)
      else if (['image', 'document', 'audio', 'video', 'sticker'].includes(msgType)) {
        hasMedia = true;
        const mediaObj = incoming[msgType];
        const mediaId = mediaObj?.id;
        mediaType = mediaObj?.mime_type || `${msgType}/octet-stream`;
        mediaCaption = mediaObj?.caption || incoming.caption;
        messageBody = mediaCaption || `[Incoming ${msgType.toUpperCase()}]`;

        // Execute the Two-Step Media Download & Supabase Storage upload
        if (mediaId && settings.access_token) {
          try {
            const downloaded = await downloadWhatsAppMedia(mediaId, settings.access_token);
            const uploadResult = await uploadMediaToSupabaseStorage(
              downloaded.buffer,
              downloaded.mimeType,
              settings.tenant_id,
              waMessageId
            );
            mediaUrl = uploadResult.publicOrSignedUrl;
          } catch (downloadErr: any) {
            console.warn(`[WhatsApp] Failed to download media ${mediaId}:`, downloadErr.message);
            messageBody += ` (Media download error: ${downloadErr.message})`;
          }
        }
      } else {
        messageBody = `[Received ${msgType} message]`;
      }

      // Insert message into whatsapp_messages table
      await insertStoredWhatsAppMessage({
        tenant_id: settings.tenant_id,
        contact_id: contactMatch.contact_id,
        contact_name: contactMatch.contact_name,
        contact_phone: formatToE164(senderPhone),
        wa_message_id: waMessageId,
        direction: 'inbound',
        message_body: messageBody,
        status: 'received',
        timestamp,
        has_media: hasMedia,
        media_url: mediaUrl,
        media_type: mediaType,
        media_caption: mediaCaption
      });

      processedMessagesCount++;
    }
  }

  return {
    processedMessagesCount,
    processedStatusesCount,
    syncedContacts
  };
}
