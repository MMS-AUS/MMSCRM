/**
 * Sinch MessageMedia (formerly Wholesale SMS) Integration Module
 * Outbound-only SMS dispatch with Delivery Receipt (DR) Webhook Tracking
 */

export interface SendSmsParams {
  apiKey: string;
  apiSecret: string;
  destinationNumber: string;
  content: string;
  sourceNumber?: string;
  callbackUrl?: string;
}

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  status: 'sent' | 'failed_to_send';
  deliveryStatus: 'enroute' | 'submitted' | 'delivered' | 'expired' | 'rejected' | 'failed';
  rawResponse?: any;
  error?: string;
}

/**
 * Normalizes phone numbers to standard E.164 format
 * Handles Australian numbers (e.g. 0412345678 -> +61412345678) and international formats
 */
export function formatToE164(phone: string): string {
  if (!phone) return '';
  // Remove spaces, dashes, dots, brackets
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  // If already in E.164 format with leading +
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // Australian mobile: 04XXXXXXXX -> +614XXXXXXXX
  if (/^04\d{8}$/.test(cleaned)) {
    return `+61${cleaned.substring(1)}`;
  }

  // Australian landline: 02/03/07/08 -> +612/3/7/8
  if (/^0[2378]\d{8}$/.test(cleaned)) {
    return `+61${cleaned.substring(1)}`;
  }

  // If starts with 61 without +
  if (/^61\d{9}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // Default fallback: ensure leading + if looks like international number
  if (/^\d{10,15}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  return cleaned;
}

/**
 * Normalizes delivery status strings from MessageMedia delivery reports
 */
export function normalizeDeliveryStatus(
  status: string | undefined
): 'enroute' | 'submitted' | 'delivered' | 'expired' | 'rejected' | 'failed' {
  if (!status) return 'enroute';
  const s = status.toLowerCase().trim();

  if (s === 'delivered') return 'delivered';
  if (s === 'submitted') return 'submitted';
  if (s === 'enroute' || s === 'pending') return 'enroute';
  if (s === 'expired') return 'expired';
  if (s === 'rejected') return 'rejected';
  if (s === 'failed' || s === 'undelivered') return 'failed';

  return 'enroute';
}

/**
 * Dispatches an outbound SMS message via Sinch MessageMedia REST API
 * POST https://api.messagemedia.com/v1/messages
 */
export async function sendSinchMessageMediaSms(params: SendSmsParams): Promise<SendSmsResult> {
  const { apiKey, apiSecret, destinationNumber, content, sourceNumber, callbackUrl } = params;

  if (!apiKey || !apiSecret) {
    return {
      success: false,
      status: 'failed_to_send',
      deliveryStatus: 'failed',
      error: 'MessageMedia API Key and API Secret are required. Please configure credentials in SMS Settings.'
    };
  }

  const e164Destination = formatToE164(destinationNumber);
  if (!e164Destination || e164Destination.length < 8) {
    return {
      success: false,
      status: 'failed_to_send',
      deliveryStatus: 'failed',
      error: `Invalid recipient phone number: "${destinationNumber}". Phone must be valid E.164 format.`
    };
  }

  // Construct Basic Auth header
  const authHeader = `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`;

  // Construct message payload
  const messageItem: Record<string, any> = {
    content,
    destination_number: e164Destination,
    delivery_report: true
  };

  if (sourceNumber && sourceNumber.trim()) {
    messageItem.source_number = sourceNumber.trim();
  }

  if (callbackUrl && callbackUrl.trim()) {
    messageItem.callback_url = callbackUrl.trim();
  }

  const payload = {
    messages: [messageItem]
  };

  try {
    const response = await fetch('https://api.messagemedia.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { rawText: responseText };
    }

    if (response.ok || response.status === 202 || response.status === 200) {
      const messageId =
        data?.messages?.[0]?.message_id ||
        data?.messages?.[0]?.id ||
        data?.message_id ||
        `mm-${Date.now()}`;

      const rawStatus = data?.messages?.[0]?.status || 'enroute';

      return {
        success: true,
        messageId,
        status: 'sent',
        deliveryStatus: normalizeDeliveryStatus(rawStatus),
        rawResponse: data
      };
    } else {
      let errorMsg = 'MessageMedia API call failed';
      if (data?.details && Array.isArray(data.details)) {
        errorMsg = data.details.join(', ');
      } else if (data?.message) {
        errorMsg = data.message;
      } else if (data?.description) {
        errorMsg = data.description;
      } else if (response.status === 401) {
        errorMsg = 'HTTP 401 Unauthorized: Invalid MessageMedia API Key or Secret';
      } else if (response.status === 403) {
        errorMsg = 'HTTP 403 Forbidden: Account suspended or insufficient credits';
      } else if (response.status === 400) {
        errorMsg = `HTTP 400 Bad Request: ${responseText}`;
      }

      return {
        success: false,
        status: 'failed_to_send',
        deliveryStatus: 'failed',
        error: errorMsg,
        rawResponse: data
      };
    }
  } catch (networkErr: any) {
    console.error('[MessageMedia] Network error calling API:', networkErr);
    return {
      success: false,
      status: 'failed_to_send',
      deliveryStatus: 'failed',
      error: networkErr.message || 'Network error communicating with Sinch MessageMedia'
    };
  }
}
