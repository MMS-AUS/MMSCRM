/**
 * Sinch MessageMedia Outbound SMS & Delivery Receipts Service
 * Calls the Next.js / Express backend endpoints connected to Supabase:
 * - /api/settings/messagemedia
 * - /api/sms/send
 * - /api/webhooks/sms/delivery
 * - /api/sms/logs
 */

export interface MessageMediaSettingsResponse {
  success: boolean;
  configured: boolean;
  apiKeyMasked?: string;
  defaultSenderId?: string;
  updatedAt?: string | null;
  webhookUrl?: string;
  error?: string;
}

export interface SmsLogEntry {
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

export interface SendSmsPayload {
  recipient_number: string;
  message_body: string;
  contact_id?: string | null;
  project_id?: string | null;
  sender_id?: string | null;
  tenant_id?: string;
}

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  status: 'sent' | 'failed_to_send';
  delivery_status?: 'enroute' | 'submitted' | 'delivered' | 'expired' | 'rejected' | 'failed';
  log?: SmsLogEntry;
  error?: string;
}

/**
 * Fetch MessageMedia configuration status from Supabase
 */
export async function getMessageMediaConfig(tenantId?: string): Promise<MessageMediaSettingsResponse> {
  try {
    const url = tenantId
      ? `/api/settings/messagemedia?tenantId=${encodeURIComponent(tenantId)}`
      : '/api/settings/messagemedia';
    const res = await fetch(url);
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('[MessageMedia Service] Error fetching config:', err);
    return {
      success: false,
      configured: false,
      error: err.message || 'Failed to connect to backend'
    };
  }
}

/**
 * Save / Update MessageMedia credentials in Supabase
 */
export async function saveMessageMediaConfig(params: {
  apiKey: string;
  apiSecret: string;
  defaultSenderId?: string;
  tenantId?: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/settings/messagemedia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to save credentials');
    }
    return data;
  } catch (err: any) {
    console.error('[MessageMedia Service] Error saving config:', err);
    return {
      success: false,
      error: err.message || 'Failed to save credentials'
    };
  }
}

/**
 * Disconnect and purge credentials from Supabase
 */
export async function disconnectMessageMedia(tenantId?: string): Promise<{ success: boolean; message?: string }> {
  try {
    const url = tenantId
      ? `/api/settings/messagemedia?tenantId=${encodeURIComponent(tenantId)}`
      : '/api/settings/messagemedia';
    const res = await fetch(url, { method: 'DELETE' });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('[MessageMedia Service] Error disconnecting:', err);
    return { success: false };
  }
}

/**
 * Trigger outbound SMS via Sinch MessageMedia
 * Logs immediately to Supabase `sms_logs` table
 */
export async function sendOutboundSms(payload: SendSmsPayload): Promise<SendSmsResult> {
  try {
    const res = await fetch('/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        status: 'failed_to_send',
        error: data.error || 'Failed to send SMS',
        log: data.log
      };
    }

    return {
      success: true,
      messageId: data.messageId,
      status: 'sent',
      delivery_status: data.delivery_status || 'enroute',
      log: data.log
    };
  } catch (err: any) {
    console.error('[MessageMedia Service] Network error sending SMS:', err);
    return {
      success: false,
      status: 'failed_to_send',
      error: err.message || 'Network error communicating with server'
    };
  }
}

/**
 * Fetch SMS logs from Supabase
 */
export async function fetchSmsLogs(filter?: {
  contact_id?: string;
  project_id?: string;
  tenant_id?: string;
  limit?: number;
}): Promise<SmsLogEntry[]> {
  try {
    const params = new URLSearchParams();
    if (filter?.contact_id) params.set('contact_id', filter.contact_id);
    if (filter?.project_id) params.set('project_id', filter.project_id);
    if (filter?.tenant_id) params.set('tenant_id', filter.tenant_id);
    if (filter?.limit) params.set('limit', String(filter.limit));

    const res = await fetch(`/api/sms/logs?${params.toString()}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.logs)) {
      return data.logs;
    }
    return [];
  } catch (err) {
    console.error('[MessageMedia Service] Error loading SMS logs:', err);
    return [];
  }
}

/**
 * Test Delivery Webhook helper (allows simulating a live carrier delivery receipt)
 */
export async function simulateWebhookDeliveryReport(
  messageId: string,
  status: 'delivered' | 'rejected' | 'failed' | 'submitted' | 'enroute'
): Promise<boolean> {
  try {
    const res = await fetch('/api/webhooks/sms/delivery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message_id: messageId,
        status,
        date_received: new Date().toISOString()
      })
    });
    return res.ok;
  } catch (e) {
    console.warn('[MessageMedia Service] Error simulating webhook:', e);
    return false;
  }
}
