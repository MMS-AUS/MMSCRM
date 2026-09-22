/**
 * Meta Conversions API (CAPI) Push Service (Graph API v25.0)
 *
 * Sends downstream CRM funnel events (e.g., Lead, Schedule, Qualified, Purchase)
 * to Meta's /events endpoint to optimize ad delivery for customer quality.
 * Implements strict event deduplication with browser Pixel events,
 * and handles resilient server fallback when ad-blockers block client pixels.
 */

import { buildMetaUserData, MetaUserDataInput } from './metaHashing';

export interface MetaCapiEventPayload {
  eventName: string; // Meta standard event: Lead, Schedule, ViewContent, Qualified, Purchase, etc.
  crmEntityId: string; // Lead ID or Project ID
  eventTime?: number; // Unix timestamp in seconds
  actionSource?: 'system_generated' | 'website' | 'physical_store';
  value?: number;
  currency?: string;
  userData: MetaUserDataInput;
  testEventCode?: string; // Optional test event code from Events Manager Test Events tab
}

export interface MetaCapiPushResult {
  success: boolean;
  eventsReceived?: number;
  messagesReceived?: number;
  fbtraceId?: string;
  eventId: string;
  error?: string;
  skipped?: boolean;
}

/**
 * Maps CRM pipeline stages to official Meta Standard Events (case-sensitive)
 */
export function mapCrmStageToMetaEvent(stageName: string): string {
  const normalized = (stageName || '').trim().toLowerCase();

  // Closed / Purchase / Contract Signed
  if (
    normalized.includes('contract signed') ||
    normalized.includes('closed won') ||
    normalized.includes('installation completed') ||
    normalized.includes('completed') ||
    normalized.includes('grid meter connected') ||
    normalized.includes('stc claimed')
  ) {
    return 'Purchase';
  }

  // Qualified / Deposit Received / High-intent
  if (
    normalized.includes('deposit received') ||
    normalized.includes('qualified') ||
    normalized.includes('install scheduled') ||
    normalized.includes('sales order dispatched')
  ) {
    return 'Qualified';
  }

  // Proposal / Quote / Engineering
  if (
    normalized.includes('quote') ||
    normalized.includes('proposal') ||
    normalized.includes('engineering') ||
    normalized.includes('approval') ||
    normalized.includes('rfq')
  ) {
    return 'ViewContent';
  }

  // Appointment / Site Survey / Contacted
  if (
    normalized.includes('site survey') ||
    normalized.includes('appointment') ||
    normalized.includes('meeting') ||
    normalized.includes('contacted')
  ) {
    return 'Schedule';
  }

  // Top of funnel
  return 'Lead';
}

/**
 * Builds a deterministic, stable Event ID for deduplication between Pixel and CAPI
 * Format: {entity_id}-{Event_Name}
 */
export function buildStableEventId(entityId: string, eventName: string): string {
  const cleanId = String(entityId || 'entity').replace(/[^a-zA-Z0-9_-]/g, '');
  return `${cleanId}-${eventName}`;
}

/**
 * Constructs the official Meta Graph API v25.0 CAPI JSON payload
 */
export function constructCapiPayload(params: MetaCapiEventPayload): {
  data: any[];
  test_event_code?: string;
} {
  const eventTime = params.eventTime || Math.floor(Date.now() / 1000);
  const eventId = buildStableEventId(params.crmEntityId, params.eventName);
  const actionSource = params.actionSource || 'system_generated';

  const formattedUserData = buildMetaUserData(params.userData);

  const eventObject: Record<string, any> = {
    event_name: params.eventName,
    event_time: eventTime,
    event_id: eventId,
    action_source: actionSource,
    user_data: formattedUserData
  };

  if (params.value !== undefined && params.value !== null) {
    eventObject.custom_data = {
      currency: params.currency || 'AUD',
      value: Number(params.value) || 0
    };
  }

  const payload: { data: any[]; test_event_code?: string } = {
    data: [eventObject]
  };

  if (params.testEventCode) {
    payload.test_event_code = params.testEventCode;
  }

  return payload;
}

/**
 * Sends a CAPI event via the backend API route /api/meta/capi/event or directly
 */
export async function pushMetaCapiEvent(
  params: MetaCapiEventPayload,
  config?: { datasetId?: string; capiAccessToken?: string }
): Promise<MetaCapiPushResult> {
  const eventId = buildStableEventId(params.crmEntityId, params.eventName);

  try {
    // Check if running on client: call CRM server proxy /api/meta/capi/event
    const isBrowser = typeof window !== 'undefined';
    if (isBrowser) {
      const res = await fetch('/api/meta/capi/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const data = await res.json();
      return {
        ...data,
        eventId
      };
    }

    // Direct server-side call
    const datasetId = config?.datasetId || process.env.META_DATASET_ID;
    const token = config?.capiAccessToken || process.env.META_CAPI_ACCESS_TOKEN;

    if (!datasetId || !token) {
      console.warn('[Meta CAPI] Dataset ID or Access Token not configured in environment. Skipping transmission.');
      return {
        success: false,
        skipped: true,
        eventId,
        error: 'Missing META_DATASET_ID or META_CAPI_ACCESS_TOKEN'
      };
    }

    const payload = constructCapiPayload(params);
    const endpoint = `https://graph.facebook.com/v25.0/${datasetId}/events`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Meta CAPI Error]', result);
      return {
        success: false,
        eventId,
        error: result.error?.message || `HTTP ${response.status}: Failed to transmit event`
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
    console.error('[Meta CAPI Exception]', err);
    return {
      success: false,
      eventId,
      error: err.message || 'Unknown network error'
    };
  }
}
