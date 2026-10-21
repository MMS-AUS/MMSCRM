/**
 * Safe fetch and JSON parsing utilities to prevent
 * "Failed to execute 'json' on 'Response': Unexpected end of JSON input"
 */

export async function safeResponseJson<T = any>(
  response: Response | null | undefined,
  fallback: any = {}
): Promise<T> {
  if (!response) return fallback as T;
  try {
    const text = await response.text();
    if (!text || !text.trim()) {
      return fallback as T;
    }
    return JSON.parse(text) as T;
  } catch (err) {
    return fallback as T;
  }
}

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallback: any = {}
): Promise<T> {
  try {
    const res = await fetch(input, init);
    return await safeResponseJson<T>(res, fallback);
  } catch (err) {
    return fallback as T;
  }
}
