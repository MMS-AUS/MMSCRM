import crypto from 'crypto';
import {
  getStoredXeroCredentials,
  upsertXeroCredentials,
  deleteXeroCredentials,
  StoredXeroCredentials,
  isSupabaseConfigured
} from './supabase';

const XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize';
const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token';
const XERO_CONNECTIONS_URL = 'https://api.xero.com/connections';
const XERO_REVOCATION_URL = 'https://identity.xero.com/connect/revocation';
const XERO_API_BASE = 'https://api.xero.com/api.xro/2.0';

export const REQUIRED_XERO_SCOPES = [
  'offline_access',
  'accounting.transactions',
  'accounting.contacts',
  'accounting.settings'
];

export function getXeroConfig() {
  const clientId = process.env.XERO_CLIENT_ID || '';
  const clientSecret = process.env.XERO_CLIENT_SECRET || '';
  
  // Resolve base app URL
  const appUrl = 
    process.env.APP_URL || 
    process.env.NEXT_PUBLIC_APP_URL || 
    process.env.VITE_APP_URL || 
    'http://localhost:3000';

  const redirectUri = 
    process.env.XERO_REDIRECT_URI || 
    `${appUrl.replace(/\/$/, '')}/api/auth/xero/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
    appUrl,
    isConfigured: Boolean(clientId && clientSecret)
  };
}

/**
 * Constructs the standard Xero OAuth 2.0 Authorization URL
 */
export function buildAuthorizationUrl(state: string): string {
  const config = getXeroConfig();
  if (!config.clientId) {
    throw new Error('XERO_CLIENT_ID is not configured in environment variables.');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: REQUIRED_XERO_SCOPES.join(' '),
    state: state
  });

  return `${XERO_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchanges authorization code for access and refresh tokens using HTTP Basic Auth
 */
export async function exchangeCodeForTokens(code: string, redirectUriOverride?: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}> {
  const config = getXeroConfig();
  if (!config.clientId || !config.clientSecret) {
    throw new Error('XERO_CLIENT_ID and XERO_CLIENT_SECRET are required.');
  }

  const redirectUri = redirectUriOverride || config.redirectUri;
  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri
  });

  const response = await fetch(XERO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Xero OAuth] Token exchange error:', response.status, errorText);
    throw new Error(`Xero token exchange failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Fetches connected tenants from Xero /connections endpoint
 */
export async function getTenantConnections(accessToken: string): Promise<Array<{
  id: string;
  tenantId: string;
  tenantType: string;
  tenantName: string;
  createdDateUtc: string;
  updatedDateUtc: string;
}>> {
  const response = await fetch(XERO_CONNECTIONS_URL, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Xero OAuth] Failed to get tenant connections:', response.status, errorText);
    throw new Error(`Failed to retrieve Xero connections: ${errorText}`);
  }

  return response.json();
}

/**
 * Refreshes the access token using the stored refresh_token
 */
export async function refreshAccessToken(storedCreds?: StoredXeroCredentials): Promise<StoredXeroCredentials> {
  const creds = storedCreds || await getStoredXeroCredentials();
  if (!creds || !creds.refresh_token) {
    throw new Error('No refresh token available. User must re-authenticate with Xero.');
  }

  const config = getXeroConfig();
  if (!config.clientId || !config.clientSecret) {
    throw new Error('XERO_CLIENT_ID and XERO_CLIENT_SECRET are required for token refresh.');
  }

  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: creds.refresh_token
  });

  const response = await fetch(XERO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Xero OAuth] Refresh token failed:', response.status, errorText);
    throw new Error(`Xero token refresh failed (${response.status}): ${errorText}`);
  }

  const tokenData = await response.json();
  const expiresAt = new Date(Date.now() + (tokenData.expires_in || 1800) * 1000).toISOString();

  const updated: StoredXeroCredentials = {
    ...creds,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || creds.refresh_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString()
  };

  await upsertXeroCredentials({
    access_token: updated.access_token,
    refresh_token: updated.refresh_token,
    expires_at: updated.expires_at,
    tenant_id: updated.tenant_id,
    tenant_name: updated.tenant_name
  });

  return updated;
}

/**
 * Internal Utility: Returns a guaranteed-valid access token and tenant ID.
 * Automatically refreshes token if it has expired or expires within 3 minutes.
 */
export async function getValidXeroClient(): Promise<{
  accessToken: string;
  tenantId: string;
  tenantName: string;
}> {
  let creds = await getStoredXeroCredentials();
  if (!creds || !creds.access_token) {
    throw new Error('Xero is not connected. Please connect your Xero account.');
  }

  const expiryTime = new Date(creds.expires_at).getTime();
  const now = Date.now();
  const safetyBufferMs = 3 * 60 * 1000; // 3 minutes buffer

  if (now >= expiryTime - safetyBufferMs) {
    console.log('[Xero OAuth] Access token is near expiry or expired, refreshing token pair...');
    creds = await refreshAccessToken(creds);
  }

  return {
    accessToken: creds.access_token,
    tenantId: creds.tenant_id,
    tenantName: creds.tenant_name || 'Active Xero Organization'
  };
}

/**
 * Revokes Xero token and deletes credentials from Supabase
 */
export async function disconnectXero(): Promise<{ success: boolean; message: string }> {
  const creds = await getStoredXeroCredentials();
  const config = getXeroConfig();

  if (creds?.refresh_token && config.clientId && config.clientSecret) {
    try {
      const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
      const body = new URLSearchParams({
        token: creds.refresh_token
      });

      await fetch(XERO_REVOCATION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });
    } catch (err) {
      console.warn('[Xero] Error revoking token with Xero endpoint (proceeding with local deletion):', err);
    }
  }

  await deleteXeroCredentials(creds?.tenant_id);

  return {
    success: true,
    message: 'Xero integration disconnected and credentials removed from Supabase.'
  };
}

/**
 * Queries Xero Organization info to verify active live connection
 */
export async function fetchXeroOrganisation(): Promise<any> {
  const { accessToken, tenantId } = await getValidXeroClient();

  const response = await fetch(`${XERO_API_BASE}/Organisations`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch Xero organisation (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.Organisations?.[0] || data;
}

/**
 * Fetches Invoices from live Xero tenant
 */
export async function fetchXeroInvoices(whereClause?: string): Promise<any[]> {
  const { accessToken, tenantId } = await getValidXeroClient();
  const url = new URL(`${XERO_API_BASE}/Invoices`);
  if (whereClause) {
    url.searchParams.set('where', whereClause);
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch Xero invoices: ${errorText}`);
  }

  const data = await response.json();
  return data.Invoices || [];
}

/**
 * Fetches Contacts from live Xero tenant
 */
export async function fetchXeroContacts(): Promise<any[]> {
  const { accessToken, tenantId } = await getValidXeroClient();

  const response = await fetch(`${XERO_API_BASE}/Contacts`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch Xero contacts: ${errorText}`);
  }

  const data = await response.json();
  return data.Contacts || [];
}

/**
 * Fetches Quotes from live Xero tenant
 */
export async function fetchXeroQuotes(): Promise<any[]> {
  const { accessToken, tenantId } = await getValidXeroClient();

  const response = await fetch(`${XERO_API_BASE}/Quotes`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch Xero quotes: ${errorText}`);
  }

  const data = await response.json();
  return data.Quotes || [];
}

/**
 * Creates or updates an Invoice in live Xero tenant
 */
export async function createXeroLiveInvoice(invoicePayload: any): Promise<any> {
  const { accessToken, tenantId } = await getValidXeroClient();

  const response = await fetch(`${XERO_API_BASE}/Invoices`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(invoicePayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Xero invoice: ${errorText}`);
  }

  const data = await response.json();
  return data.Invoices?.[0] || data;
}
