/**
 * Microsoft Teams OAuth 2.0 Token Refresh Manager
 *
 * Implements token verification with a 5-minute buffer, automatic refresh
 * against https://login.microsoftonline.com/{AZURE_TENANT_ID}/oauth2/v2.0/token,
 * database updates, and revocation handling.
 */

export interface TeamsTokenRecord {
  tenant_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string; // ISO timestamp
  default_team_id?: string | null;
  default_channel_id?: string | null;
  default_team_name?: string | null;
  default_channel_name?: string | null;
  reconnect_required?: boolean;
}

const STORAGE_KEY_TEAMS_AUTH = 'solar_crm_teams_oauth_credentials';

/**
 * Checks if a token expiration timestamp is expired or will expire within the buffer window.
 * Default buffer: 5 minutes (300,000 ms) to prevent in-flight failures.
 */
export function isTeamsTokenExpired(expiresAt: string | number | Date, bufferMs: number = 5 * 60 * 1000): boolean {
  if (!expiresAt) return true;
  const expiryTime = new Date(expiresAt).getTime();
  if (isNaN(expiryTime)) return true;
  return Date.now() + bufferMs >= expiryTime;
}

/**
 * Client-side helper to get a valid token. If expired, calls server endpoint to refresh.
 */
export async function getValidTeamsToken(tenantId: string = 'default'): Promise<string> {
  // If running in browser, proxy through server /api/teams/token or local storage
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/teams/token?tenantId=${encodeURIComponent(tenantId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.accessToken) {
          return data.accessToken;
        }
      }
    } catch (e) {
      console.warn('[TeamsTokenManager] Error querying server token, using cached fallback:', e);
    }

    // LocalStorage fallback for preview environments
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TEAMS_AUTH);
      if (stored) {
        const record: TeamsTokenRecord = JSON.parse(stored);
        if (!isTeamsTokenExpired(record.token_expires_at)) {
          return record.access_token;
        }
      }
    } catch {}
  }

  // If server-side or fallback needed, invoke refresh endpoint
  const refreshed = await refreshTeamsTokenPair(tenantId);
  return refreshed.access_token;
}

/**
 * Executes a token refresh request to Microsoft Identity Platform
 */
export async function refreshTeamsTokenPair(
  tenantId: string = 'default',
  currentRefreshToken?: string
): Promise<{ access_token: string; refresh_token: string; token_expires_at: string }> {
  const azureTenantId =
    (typeof process !== 'undefined' && process.env?.AZURE_TENANT_ID) || 'common';
  const clientId =
    (typeof process !== 'undefined' && process.env?.AZURE_CLIENT_ID) || '';
  const clientSecret =
    (typeof process !== 'undefined' && process.env?.AZURE_CLIENT_SECRET) || '';

  let tokenToUse = currentRefreshToken;

  if (!tokenToUse && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TEAMS_AUTH);
      if (stored) {
        const record = JSON.parse(stored);
        tokenToUse = record.refresh_token;
      }
    } catch {}
  }

  if (!tokenToUse) {
    throw new Error('No Microsoft Teams refresh token found. Please connect your Teams account via OAuth.');
  }

  const tokenUrl = `https://login.microsoftonline.com/${azureTenantId}/oauth2/v2.0/token`;

  const bodyParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: tokenToUse,
    scope: 'offline_access Team.ReadBasic.All Channel.ReadBasic.All ChannelMessage.Send'
  });

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: bodyParams.toString()
    });

    const data = await response.json();

    if (!response.ok) {
      // 400 Bad Request or 401 Unauthorized indicates revoked or expired refresh token
      if (response.status === 400 || response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY_TEAMS_AUTH);
        }
        throw new Error(
          `Microsoft Teams OAuth session expired or was revoked (${data.error_description || data.error || 'invalid_grant'}). Please reconnect your Teams account.`
        );
      }
      throw new Error(data.error_description || data.error || 'Failed to refresh Microsoft Teams access token');
    }

    const newAccessToken = data.access_token;
    const newRefreshToken = data.refresh_token || tokenToUse;
    const expiresInSec = Number(data.expires_in) || 3599;
    const newExpiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

    // Cache updated credentials in localStorage if on client
    if (typeof window !== 'undefined') {
      try {
        const existing = localStorage.getItem(STORAGE_KEY_TEAMS_AUTH);
        const parsed = existing ? JSON.parse(existing) : {};
        localStorage.setItem(
          STORAGE_KEY_TEAMS_AUTH,
          JSON.stringify({
            ...parsed,
            tenant_id: tenantId,
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
            token_expires_at: newExpiresAt,
            reconnect_required: false
          })
        );
      } catch {}
    }

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_expires_at: newExpiresAt
    };
  } catch (err: any) {
    console.error('[TeamsTokenManager] Token refresh failed:', err.message);
    throw err;
  }
}
