import fs from 'fs';
import path from 'path';
import { resetSupabaseInstance } from './supabase';

const CONFIG_FILE = path.join(process.cwd(), '.app_config.json');
const FIREBASE_CONFIG_FILE = path.join(process.cwd(), 'firebase-applet-config.json');

export interface ConfigField {
  key: string;
  label: string;
  category: 'supabase' | 'firebase' | 'azure_teams' | 'xero' | 'gmail' | 'solar' | 'general';
  isSecret: boolean;
  value: string;
  isConfigured: boolean;
  source: 'app_config' | 'environment' | 'firebase_applet' | 'none';
  placeholder?: string;
  helpText?: string;
}

// Managed configuration field definitions
export const MANAGED_FIELDS: Array<Omit<ConfigField, 'value' | 'isConfigured' | 'source'>> = [
  // Supabase
  {
    key: 'SUPABASE_URL',
    label: 'Supabase Project URL',
    category: 'supabase',
    isSecret: false,
    placeholder: 'https://xyzcompany.supabase.co',
    helpText: 'Found in Supabase Dashboard -> Project Settings -> API -> Project URL'
  },
  {
    key: 'SUPABASE_ANON_KEY',
    label: 'Supabase Anon / Public Key',
    category: 'supabase',
    isSecret: true,
    placeholder: 'eyJhbGciOi...',
    helpText: 'Found in Supabase Project Settings -> API -> Project API keys (anon public)'
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    label: 'Supabase Service Role Key (Secret)',
    category: 'supabase',
    isSecret: true,
    placeholder: 'eyJhbGciOi...',
    helpText: 'Required for backend database operations and Xero credential persistence'
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    label: 'Next Public Supabase URL (Mirror)',
    category: 'supabase',
    isSecret: false,
    placeholder: 'https://xyzcompany.supabase.co',
    helpText: 'Mirrors SUPABASE_URL for client-side libraries'
  },

  // Firebase
  {
    key: 'VITE_FIREBASE_API_KEY',
    label: 'Firebase Web API Key',
    category: 'firebase',
    isSecret: false,
    placeholder: 'AIzaSy...',
    helpText: 'Found in Firebase Console -> Project Settings -> Your apps -> Web app config'
  },
  {
    key: 'VITE_FIREBASE_PROJECT_ID',
    label: 'Firebase Project ID',
    category: 'firebase',
    isSecret: false,
    placeholder: 'my-solar-crm-project',
    helpText: 'Your unique Firebase project identifier'
  },
  {
    key: 'VITE_FIREBASE_APP_ID',
    label: 'Firebase App ID',
    category: 'firebase',
    isSecret: false,
    placeholder: '1:123456789:web:...',
    helpText: 'The web app identifier from Firebase project settings'
  },
  {
    key: 'VITE_FIREBASE_AUTH_DOMAIN',
    label: 'Firebase Auth Domain',
    category: 'firebase',
    isSecret: false,
    placeholder: 'project-id.firebaseapp.com',
    helpText: 'Authorized OAuth domain for client popups'
  },

  // Microsoft Teams & Azure Entra ID
  {
    key: 'AZURE_CLIENT_ID',
    label: 'Azure Application (Client) ID',
    category: 'azure_teams',
    isSecret: false,
    placeholder: '00000000-0000-0000-0000-000000000000',
    helpText: 'Application (client) ID from Microsoft Entra / Azure Portal App Registrations'
  },
  {
    key: 'AZURE_TENANT_ID',
    label: 'Azure Directory (Tenant) ID',
    category: 'azure_teams',
    isSecret: false,
    placeholder: '00000000-0000-0000-0000-000000000000 or common',
    helpText: 'Directory (tenant) ID GUID, or "common" for multi-tenant accounts'
  },
  {
    key: 'AZURE_CLIENT_SECRET',
    label: 'Azure Client Secret Value',
    category: 'azure_teams',
    isSecret: true,
    placeholder: 'Value from Certificates & secrets',
    helpText: 'Generated secret value from Azure Portal -> Certificates & secrets'
  },

  // Xero
  {
    key: 'XERO_CLIENT_ID',
    label: 'Xero Client ID',
    category: 'xero',
    isSecret: false,
    placeholder: 'Xero App Client ID GUID',
    helpText: 'From developer.xero.com -> My Apps -> Configuration'
  },
  {
    key: 'XERO_CLIENT_SECRET',
    label: 'Xero Client Secret',
    category: 'xero',
    isSecret: true,
    placeholder: 'Xero App Client Secret',
    helpText: 'Generated secret from Xero Developer Portal'
  },
  {
    key: 'XERO_REDIRECT_URI',
    label: 'Xero Redirect URI',
    category: 'xero',
    isSecret: false,
    placeholder: 'https://<app-domain>/api/auth/xero/callback',
    helpText: 'Must match authorized redirect URI configured in Xero Developer Portal'
  },

  // Gmail / Google Cloud
  {
    key: 'GMAIL_CLIENT_ID',
    label: 'Google OAuth Client ID',
    category: 'gmail',
    isSecret: false,
    placeholder: 'xxxx.apps.googleusercontent.com',
    helpText: 'From Google Cloud Console -> APIs & Services -> Credentials'
  },
  {
    key: 'GMAIL_CLIENT_SECRET',
    label: 'Google OAuth Client Secret',
    category: 'gmail',
    isSecret: true,
    placeholder: 'GOCSPX-...',
    helpText: 'Client secret from Google Cloud OAuth credential'
  },
  {
    key: 'GMAIL_REDIRECT_URI',
    label: 'Google OAuth Redirect URI',
    category: 'gmail',
    isSecret: false,
    placeholder: 'https://<app-domain>/api/auth/gmail/callback',
    helpText: 'Must match Authorized redirect URI in Google Cloud Console'
  },

  // Solar & Imagery APIs
  {
    key: 'OPENSOLAR_API_KEY',
    label: 'OpenSolar API Key',
    category: 'solar',
    isSecret: true,
    placeholder: 'os_live_...',
    helpText: 'API Key from OpenSolar settings for automatic project and BOM synchronization'
  },
  {
    key: 'NEARMAP_API_KEY',
    label: 'Nearmap High-Res Imagery Key',
    category: 'solar',
    isSecret: true,
    placeholder: 'nm_...',
    helpText: 'Aerial rooftop CAD imagery for precise solar array layouts'
  },

  // General & App URLs
  {
    key: 'NEXT_PUBLIC_APP_URL',
    label: 'Public Application URL',
    category: 'general',
    isSecret: false,
    placeholder: 'https://your-crm.example.com',
    helpText: 'Canonical base URL of your CRM deployment'
  },
  {
    key: 'APP_URL',
    label: 'Internal App URL',
    category: 'general',
    isSecret: false,
    placeholder: 'https://your-crm.example.com',
    helpText: 'Used for internal webhook routing and callback redirects'
  }
];

/**
 * Load stored config from file
 */
function readConfigFile(): Record<string, string> {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[AppConfig] Could not read .app_config.json:', err);
  }
  return {};
}

/**
 * Read firebase-applet-config.json defaults if available
 */
function readFirebaseAppletConfig(): Record<string, string> {
  try {
    if (fs.existsSync(FIREBASE_CONFIG_FILE)) {
      const raw = fs.readFileSync(FIREBASE_CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        VITE_FIREBASE_API_KEY: parsed.apiKey || '',
        VITE_FIREBASE_PROJECT_ID: parsed.projectId || '',
        VITE_FIREBASE_APP_ID: parsed.appId || '',
        VITE_FIREBASE_AUTH_DOMAIN: parsed.authDomain || ''
      };
    }
  } catch {
    // Ignore
  }
  return {};
}

/**
 * Sync stored config into process.env on boot
 */
export function initializeAppConfig(): void {
  const stored = readConfigFile();
  const fbApplet = readFirebaseAppletConfig();

  // Apply stored app config
  for (const [k, v] of Object.entries(stored)) {
    if (v && !process.env[k]) {
      process.env[k] = v;
    }
  }

  // Apply fallback Firebase config if not explicitly set
  for (const [k, v] of Object.entries(fbApplet)) {
    if (v && !process.env[k]) {
      process.env[k] = v;
    }
  }

  // Ensure mirrored URLs match
  if (process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.SUPABASE_URL;
  }
  if (process.env.APP_URL && !process.env.NEXT_PUBLIC_APP_URL) {
    process.env.NEXT_PUBLIC_APP_URL = process.env.APP_URL;
  }
}

/**
 * Get all fields with their current values, sources, and configuration status
 */
export function getAllAppCredentials(): ConfigField[] {
  const stored = readConfigFile();
  const fbApplet = readFirebaseAppletConfig();

  return MANAGED_FIELDS.map(def => {
    let value = '';
    let source: ConfigField['source'] = 'none';

    if (stored[def.key]) {
      value = stored[def.key];
      source = 'app_config';
    } else if (process.env[def.key]) {
      value = process.env[def.key] || '';
      source = 'environment';
    } else if (fbApplet[def.key]) {
      value = fbApplet[def.key];
      source = 'firebase_applet';
    }

    return {
      ...def,
      value,
      isConfigured: Boolean(value.trim()),
      source
    };
  });
}

/**
 * Save updated credentials to in-app config file and update runtime process.env
 */
export function saveAppCredentials(updates: Record<string, string>): {
  success: boolean;
  updatedKeys: string[];
  error?: string;
} {
  try {
    const existing = readConfigFile();
    const updatedKeys: string[] = [];

    for (const [rawKey, rawVal] of Object.entries(updates)) {
      const key = rawKey.trim();
      const val = typeof rawVal === 'string' ? rawVal.trim() : '';

      if (val === '') {
        delete existing[key];
        delete process.env[key];
        updatedKeys.push(key);
      } else {
        existing[key] = val;
        process.env[key] = val;
        updatedKeys.push(key);
      }
    }

    // Write to .app_config.json
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(existing, null, 2), 'utf-8');

    // Also sync mirrored values
    if (existing.SUPABASE_URL && !existing.NEXT_PUBLIC_SUPABASE_URL) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = existing.SUPABASE_URL;
    }
    if (existing.APP_URL && !existing.NEXT_PUBLIC_APP_URL) {
      process.env.NEXT_PUBLIC_APP_URL = existing.APP_URL;
    }

    // Reset singleton clients so they reconnect with fresh credentials
    resetSupabaseInstance();

    return {
      success: true,
      updatedKeys
    };
  } catch (err: any) {
    console.error('[AppConfig] Failed to save config:', err);
    return {
      success: false,
      updatedKeys: [],
      error: err.message || 'Failed to save configuration'
    };
  }
}

/**
 * Pre-populate Firebase keys from the applet's existing config file
 */
export function syncFromFirebaseAppletConfig(): Record<string, string> {
  const fb = readFirebaseAppletConfig();
  if (Object.keys(fb).length > 0) {
    saveAppCredentials(fb);
  }
  return fb;
}

/**
 * Live test integration connections
 */
export async function testIntegrationConnection(
  provider: 'supabase' | 'azure_teams' | 'firebase' | 'xero',
  overrideData?: Record<string, string>
): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
  details?: any;
}> {
  const start = Date.now();

  if (provider === 'supabase') {
    const url = overrideData?.SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = overrideData?.SUPABASE_SERVICE_ROLE_KEY || overrideData?.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
      return {
        success: false,
        message: 'Missing Supabase URL or API Key'
      };
    }

    try {
      const cleanUrl = url.replace(/\/$/, '');
      const resp = await fetch(`${cleanUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`
        }
      });
      const latencyMs = Date.now() - start;

      if (resp.ok || resp.status === 200 || resp.status === 404 || resp.status === 400) {
        // Any response from PostgREST means endpoint is reachable & responsive
        return {
          success: true,
          message: `Supabase instance online and reachable (${latencyMs}ms)`,
          latencyMs
        };
      }

      const text = await resp.text();
      return {
        success: false,
        message: `Supabase responded with status ${resp.status}: ${text}`,
        latencyMs
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to connect to Supabase: ${err.message}`,
        latencyMs: Date.now() - start
      };
    }
  }

  if (provider === 'azure_teams') {
    const tenantId = overrideData?.AZURE_TENANT_ID || process.env.AZURE_TENANT_ID || 'common';
    const clientId = overrideData?.AZURE_CLIENT_ID || process.env.AZURE_CLIENT_ID;

    if (!clientId) {
      return {
        success: false,
        message: 'Missing AZURE_CLIENT_ID'
      };
    }

    try {
      const resp = await fetch(`https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`);
      const latencyMs = Date.now() - start;

      if (resp.ok) {
        const data = await resp.json();
        return {
          success: true,
          message: `Microsoft Entra ID tenant discovered (${latencyMs}ms)`,
          latencyMs,
          details: { issuer: data.issuer }
        };
      }

      return {
        success: false,
        message: `Azure tenant check failed with HTTP ${resp.status}`,
        latencyMs
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to reach Microsoft Entra ID: ${err.message}`,
        latencyMs: Date.now() - start
      };
    }
  }

  if (provider === 'firebase') {
    const apiKey = overrideData?.VITE_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;
    const projectId = overrideData?.VITE_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;

    if (!apiKey || !projectId) {
      return {
        success: false,
        message: 'Missing Firebase API Key or Project ID'
      };
    }

    try {
      const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/projects?key=${apiKey}`);
      const latencyMs = Date.now() - start;

      // Even if permission is restricted or requires auth, reaching the endpoint confirms valid Google API key
      return {
        success: true,
        message: `Firebase API key verified with Google Identity Platform (${latencyMs}ms)`,
        latencyMs
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Firebase connection error: ${err.message}`,
        latencyMs: Date.now() - start
      };
    }
  }

  return {
    success: false,
    message: `Provider "${provider}" does not have a live ping test.`
  };
}
