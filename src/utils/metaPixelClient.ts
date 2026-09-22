/**
 * Client-Side Meta Pixel Integration & Event Deduplication Helper
 *
 * Implements client-side Pixel tracking that works in unison with the
 * Conversions API (CAPI) backend. Uses identical event names and matching eventID
 * values to ensure Meta's deduplication engine counts only a single conversion.
 */

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
  }
}

/**
 * Reads a cookie value by name
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

/**
 * Returns the Meta browser pixel cookie (_fbp)
 */
export function getFbpCookie(): string | null {
  return getCookie('_fbp');
}

/**
 * Returns the Meta click ID cookie (_fbc)
 */
export function getFbcCookie(): string | null {
  return getCookie('_fbc');
}

/**
 * Extracts fbclid from current browser URL query parameters
 */
export function getFbclidFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('fbclid');
  } catch {
    return null;
  }
}

/**
 * Fires a Meta Pixel event with strict eventID deduplication parameter
 */
export function trackMetaPixelEvent(
  eventName: string,
  params: Record<string, any> = {},
  eventId?: string
) {
  if (typeof window === 'undefined') return;

  const resolvedEventId = eventId || `crm_${Date.now()}`;

  if (typeof window.fbq === 'function') {
    // Standard Meta Pixel call with deduplication eventID
    window.fbq('track', eventName, params, { eventID: resolvedEventId });
    console.info(
      `[Meta Pixel] Sent '${eventName}' with eventID: ${resolvedEventId}`,
      params
    );
  } else {
    console.debug(
      `[Meta Pixel] Pixel script blocked or not initialized. CAPI backend will serve as sole signal. eventID: ${resolvedEventId}`
    );
  }
}
