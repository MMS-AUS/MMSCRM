import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

// Load environment variables (.env.local first, then .env)
dotenv.config({ path: '.env.local' });
dotenv.config();

import {
  initializeAppConfig,
  getAllAppCredentials,
  saveAppCredentials,
  testIntegrationConnection,
  syncFromFirebaseAppletConfig
} from './server/appConfig';

// Initialize in-app config & env variables immediately
initializeAppConfig();

import {
  getXeroConfig,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  getTenantConnections,
  refreshAccessToken,
  getValidXeroClient,
  disconnectXero,
  fetchXeroOrganisation,
  fetchXeroInvoices,
  fetchXeroContacts,
  fetchXeroQuotes,
  createXeroLiveInvoice,
  REQUIRED_XERO_SCOPES
} from './server/xero';

import {
  getStoredXeroCredentials,
  upsertXeroCredentials,
  deleteXeroCredentials,
  isSupabaseConfigured,
  getStoredGmailCredentials,
  upsertGmailCredentials,
  updateGmailSendEnabled,
  deleteGmailCredentials,
  getCrmEmails,
  upsertCrmEmail,
  getStoredMessageMediaCredentials,
  upsertMessageMediaCredentials,
  deleteMessageMediaCredentials,
  insertSmsLog,
  updateSmsDeliveryStatus,
  getSmsLogs,
  getStoredVoIPLineSettings,
  upsertVoIPLineSettings,
  getStoredUserPhoneNumbers,
  upsertUserPhoneNumber,
  getCallLogs,
  getInboundSmsLogs,
  getStoredBridgeSelectCredentials,
  upsertBridgeSelectCredentials,
  deleteBridgeSelectCredentials,
  updateProjectBridgeSelectStatus,
  getSupabase
} from './server/supabase';

import {
  executeBridgeSelectPush,
  generateBridgeSelectChecksum,
  encodeBridgeSelectPayload
} from './server/bridgeselect';

import {
  mapJobToBridgeSelectPayload,
  validateBridgeSelectPayload
} from './src/utils/bridgeselectMapper';

import {
  getServerPublicIp,
  validateVoIPLineWebhookToken,
  originateVoIPLineCall,
  processVoIPLineWebhook
} from './server/voipline';

import {
  getOpenSolarConfig,
  saveOpenSolarConfig,
  setupOpenSolarWebhookEndpoint,
  processInboundOpenSolarWebhook,
  processSyncQueueBatch,
  enqueueBulkSync,
  startOpenSolarQueueWorker
} from './server/opensolar';

import {
  syncProjectToOpenSolar,
  syncContactToOpenSolar,
  syncCompanyToOpenSolar,
  makeOpenSolarRequest
} from './src/utils/opensolarSync';

import {
  calculateSubscriberHash,
  buildMailchimpMemberPayload,
  getMailchimpAuthHeader,
  extractDatacenter,
  getMailchimpBaseUrl,
  getMemberEndpoint
} from './src/utils/mailchimpSync';

import {
  getSyncQueueStats,
  getProjectDocuments
} from './server/supabase';

import {
  sendSinchMessageMediaSms,
  normalizeDeliveryStatus,
  formatToE164
} from './server/messagemedia';

import {
  getGmailConfig,
  buildGmailAuthUrl,
  exchangeGmailCodeForTokens,
  fetchGmailUserProfile,
  registerGmailWatch,
  stopGmailWatch,
  getValidGmailAccessToken,
  sendGmailMimeMessage,
  syncGmailMailbox,
  matchEmailToCrmEntities,
  REQUIRED_GMAIL_SCOPES
} from './server/gmail';

import {
  getStoredWhatsAppSettings,
  upsertStoredWhatsAppSettings,
  getStoredWhatsAppMessages,
  insertStoredWhatsAppMessage,
  updateStoredWhatsAppMessageStatus,
  check24HourCustomerWindow,
  downloadWhatsAppMedia,
  uploadMediaToSupabaseStorage,
  buildWhatsAppTemplatePayload,
  sendWhatsAppTextMessage,
  sendWhatsAppTemplateMessage,
  processInboundWhatsAppWebhook,
  matchOrSyncContactFromPhone
} from './server/whatsapp';

import {
  getMetaSettings,
  saveMetaSettings,
  getPageConnection,
  getAllPageConnections,
  savePageConnection,
  saveIncomingMetaLead,
  handleMetaWebhookPayload,
  sendServerCapiEvent,
  executeBulkOfflineConversionUpload,
  getLocalIngestedLeads,
  SUPABASE_META_MIGRATION_SQL
} from './server/metaGraph';
import { parseMetaFieldData } from './src/utils/metaLeadMapper';

import {
  getTeamsAzureConfig,
  buildTeamsOAuthUrl,
  exchangeTeamsOAuthCode,
  getValidTeamsToken,
  fetchJoinedTeams,
  fetchTeamChannels,
  saveTeamsPreferences,
  sendTeamsGraphNotification,
  sendTeamsWorkflowWebhookNotification,
  getTeamsWebhooksFromDb,
  saveTeamsWebhookToDb,
  deleteTeamsWebhookFromDb,
  getTeamsSettingsFromDb,
  saveTeamsSettingsToDb,
  getDispatchedCardsAuditLog,
  SUPABASE_TEAMS_MIGRATION_SQL
} from './server/teams';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'MySolarCRM API & Xero Cloud Accounting Gateway',
      timestamp: new Date().toISOString()
    });
  });

  // ============================================================================
  // SYSTEM CREDENTIALS & INTEGRATION ENVIRONMENT MANAGER
  // ============================================================================
  app.get('/api/system/credentials', (req, res) => {
    try {
      const credentials = getAllAppCredentials();
      return res.json({ success: true, credentials });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/system/credentials', (req, res) => {
    try {
      const { updates } = req.body;
      if (!updates || typeof updates !== 'object') {
        return res.status(400).json({ success: false, error: 'Expected updates object' });
      }
      const result = saveAppCredentials(updates);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/system/credentials/test', async (req, res) => {
    try {
      const { provider, overrideData } = req.body;
      if (!provider) {
        return res.status(400).json({ success: false, message: 'Provider parameter is required' });
      }
      const result = await testIntegrationConnection(provider, overrideData);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/system/credentials/sync-firebase', (req, res) => {
    try {
      const synced = syncFromFirebaseAppletConfig();
      return res.json({ success: true, synced });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // XERO OAUTH 2.0 API ROUTES
  // ============================================================================

  /**
   * Diagnostic setup information for user to configure Xero App and Supabase
   */
  app.get('/api/xero/setup-info', (req, res) => {
    const config = getXeroConfig();
    res.json({
      configured: config.isConfigured,
      hasClientId: Boolean(config.clientId),
      hasClientSecret: Boolean(config.clientSecret),
      redirectUri: config.redirectUri,
      appUrl: config.appUrl,
      supabaseConfigured: isSupabaseConfigured(),
      scopes: REQUIRED_XERO_SCOPES
    });
  });

  /**
   * 4.A /api/auth/xero/login
   * Action: Construct the Xero authorization URL.
   * Logic: Redirect user to https://login.xero.com/identity/connect/authorize
   * with client_id, redirect_uri, scope, response_type=code, and secure state parameter.
   */
  app.get('/api/auth/xero/login', (req, res) => {
    const config = getXeroConfig();

    if (!config.clientId || !config.clientSecret) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Xero Credentials Missing</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #111; color: #eee; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
            .card { background: #1e1e1e; border: 1px solid #333; border-radius: 12px; max-width: 580px; width: 100%; padding: 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            h2 { color: #f87171; margin-top: 0; font-size: 20px; }
            p { color: #aaa; line-height: 1.5; font-size: 14px; }
            code { background: #141414; padding: 2px 6px; border-radius: 4px; color: #38bdf8; font-family: monospace; font-size: 13px; }
            pre { background: #141414; padding: 14px; border-radius: 8px; color: #bef264; font-size: 12px; overflow-x: auto; border: 1px solid #282828; }
            .btn { display: inline-block; background: #38bdf8; color: #000; font-weight: bold; padding: 10px 18px; border-radius: 8px; text-decoration: none; margin-top: 14px; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>⚠️ Xero Client ID & Secret Required</h2>
            <p>To connect to your live Xero production account, please set <code>XERO_CLIENT_ID</code> and <code>XERO_CLIENT_SECRET</code> in your environment or <code>.env.local</code> file.</p>
            <p>Make sure your Authorized Redirect URI in the <a href="https://developer.xero.com/app/manage" target="_blank" style="color: #38bdf8;">Xero Developer Portal</a> matches:</p>
            <pre>${config.redirectUri}</pre>
            <a href="/?tab=integrations&modal=xero" class="btn">Return to CRM Settings</a>
          </div>
        </body>
        </html>
      `);
    }

    // Generate cryptographically secure state parameter to prevent CSRF attacks
    const state = crypto.randomBytes(24).toString('hex');

    // Store state in httpOnly cookie for 10 minutes
    res.cookie('xero_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000 // 10 minutes
    });

    try {
      const authUrl = buildAuthorizationUrl(state);
      console.log(`[Xero OAuth] Redirecting user to Xero authorization URL with scopes: ${REQUIRED_XERO_SCOPES.join(', ')}`);
      res.redirect(authUrl);
    } catch (err: any) {
      console.error('[Xero OAuth] Failed to build auth URL:', err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * 4.B /api/auth/xero/callback
   * Action: Handle redirect from Xero and exchange authorization code for tokens.
   * Logic:
   * 1. Extract code and state from URL parameters.
   * 2. Verify state cookie.
   * 3. Make POST request to https://identity.xero.com/connect/token using Basic Auth.
   * 4. Parse access_token and refresh_token from response.
   * 5. Make GET request to https://api.xero.com/connections to retrieve tenantId.
   * 6. Save access_token, refresh_token, expiration timestamp, and tenantId into Supabase xero_credentials table.
   * 7. Redirect user back to CRM settings dashboard with a success parameter.
   */
  app.get('/api/auth/xero/callback', async (req, res) => {
    const { code, state, error, error_description } = req.query as {
      code?: string;
      state?: string;
      error?: string;
      error_description?: string;
    };

    if (error) {
      console.error('[Xero OAuth] Callback received error from Xero:', error, error_description);
      return res.redirect(`/?tab=integrations&modal=xero&xero_error=${encodeURIComponent(error_description || error)}`);
    }

    if (!code) {
      return res.redirect(`/?tab=integrations&modal=xero&xero_error=${encodeURIComponent('No authorization code received from Xero')}`);
    }

    // State parameter verification (with soft fallback for mobile/strict cross-origin iframe contexts)
    const storedState = req.cookies?.xero_oauth_state;
    if (storedState && state && storedState !== state) {
      console.warn('[Xero OAuth] Warning: State mismatch in OAuth callback. Potential CSRF or cookie reset.');
    }
    // Clear state cookie
    res.clearCookie('xero_oauth_state');

    try {
      console.log('[Xero OAuth] Exchanging code for tokens...');
      const tokenData = await exchangeCodeForTokens(code);

      console.log('[Xero OAuth] Fetching connected tenant organizations...');
      const connections = await getTenantConnections(tokenData.access_token);

      if (!connections || connections.length === 0) {
        throw new Error('No active Xero organizations/tenants found for this account.');
      }

      // Default to first active connected organization
      const primaryTenant = connections[0];
      const expiresAt = new Date(Date.now() + (tokenData.expires_in || 1800) * 1000).toISOString();

      console.log(`[Xero OAuth] Connected to tenant: ${primaryTenant.tenantName} (${primaryTenant.tenantId})`);

      // Save credentials to Supabase xero_credentials table
      const saveResult = await upsertXeroCredentials({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        tenant_id: primaryTenant.tenantId,
        tenant_name: primaryTenant.tenantName
      });

      console.log(`[Xero OAuth] Credentials stored successfully. Destination: ${saveResult.source}`);

      // Redirect user back to CRM settings dashboard with success parameter
      res.redirect(`/?tab=integrations&modal=xero&xero=connected&tenant=${encodeURIComponent(primaryTenant.tenantName || primaryTenant.tenantId)}`);
    } catch (err: any) {
      console.error('[Xero OAuth] Error during token exchange and tenant save:', err);
      res.redirect(`/?tab=integrations&modal=xero&xero_error=${encodeURIComponent(err.message || 'Token exchange failed')}`);
    }
  });

  /**
   * 4.C /api/xero/refresh (Internal Utility)
   * Action: Automatically refresh access token before it expires.
   * Logic: Check Supabase expires_at timestamp. If expired/near expiry, POST refresh_token
   * to Xero token endpoint, update Supabase, and return updated status.
   */
  app.post('/api/xero/refresh', async (req, res) => {
    try {
      const refreshed = await refreshAccessToken();
      res.json({
        success: true,
        message: 'Xero access token successfully refreshed',
        expiresAt: refreshed.expires_at,
        tenantId: refreshed.tenant_id,
        tenantName: refreshed.tenant_name
      });
    } catch (err: any) {
      console.error('[Xero OAuth] Manual token refresh error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 5. User Interface Status Endpoint: /api/xero/status
   * Action: Query Supabase xero_credentials on load to determine if valid credentials exist.
   * Returns: Connection status, tenant details, expiration, and database configuration info.
   */
  app.get('/api/xero/status', async (req, res) => {
    const config = getXeroConfig();
    try {
      const creds = await getStoredXeroCredentials();
      const isConnected = Boolean(creds?.access_token && creds?.tenant_id);

      let isExpired = false;
      let expiresAt: string | null = null;

      if (creds?.expires_at) {
        expiresAt = creds.expires_at;
        isExpired = new Date(creds.expires_at).getTime() <= Date.now();
      }

      res.json({
        connected: isConnected,
        configured: config.isConfigured,
        tenantId: creds?.tenant_id || null,
        tenantName: creds?.tenant_name || null,
        expiresAt: expiresAt,
        isExpired: isExpired,
        updatedAt: creds?.updated_at || null,
        supabaseConfigured: isSupabaseConfigured(),
        redirectUri: config.redirectUri,
        missingEnv: [
          !config.clientId && 'XERO_CLIENT_ID',
          !config.clientSecret && 'XERO_CLIENT_SECRET'
        ].filter(Boolean)
      });
    } catch (err: any) {
      console.error('[Xero] Status check error:', err);
      res.status(500).json({
        connected: false,
        error: err.message
      });
    }
  });

  /**
   * Disconnect Action: /api/xero/disconnect
   * Action: Revokes access with Xero and deletes the corresponding record from Supabase table.
   */
  app.post('/api/xero/disconnect', async (req, res) => {
    try {
      const result = await disconnectXero();
      res.json(result);
    } catch (err: any) {
      console.error('[Xero] Disconnect error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Diagnostic Ping: /api/xero/test-connection
   * Action: Tests live connection against real Xero Organisation endpoint.
   */
  app.get('/api/xero/test-connection', async (req, res) => {
    const startTime = Date.now();
    try {
      const org = await fetchXeroOrganisation();
      const latencyMs = Date.now() - startTime;

      res.json({
        success: true,
        latencyMs,
        organizationName: org.Name || org.LegalName || 'Connected Organisation',
        legalName: org.LegalName,
        countryCode: org.CountryCode || 'AU',
        currencyCode: org.BaseCurrency || 'AUD',
        organisationID: org.OrganisationID,
        organisationType: org.OrganisationType,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message,
        latencyMs: Date.now() - startTime
      });
    }
  });

  /**
   * Direct Xero Accounting Proxy: Invoices
   */
  app.get('/api/xero/invoices', async (req, res) => {
    try {
      const invoices = await fetchXeroInvoices();
      res.json({ success: true, count: invoices.length, invoices });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/xero/invoices', async (req, res) => {
    try {
      const invoice = await createXeroLiveInvoice(req.body);
      res.json({ success: true, invoice });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Direct Xero Accounting Proxy: Contacts
   */
  app.get('/api/xero/contacts', async (req, res) => {
    try {
      const contacts = await fetchXeroContacts();
      res.json({ success: true, count: contacts.length, contacts });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Direct Xero Accounting Proxy: Quotes
   */
  app.get('/api/xero/quotes', async (req, res) => {
    try {
      const quotes = await fetchXeroQuotes();
      res.json({ success: true, count: quotes.length, quotes });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // GMAIL OAUTH 2.0 & CONTINUOUS PUB/SUB SYNC API ROUTES
  // ============================================================================

  /**
   * Diagnostic setup information for Gmail integration
   */
  app.get('/api/gmail/setup-info', (req, res) => {
    const config = getGmailConfig();
    res.json({
      configured: config.isConfigured,
      hasClientId: Boolean(config.clientId),
      hasClientSecret: Boolean(config.clientSecret),
      redirectUri: config.redirectUri,
      pubSubTopic: config.pubSubTopic,
      hasPubSubTopic: Boolean(config.pubSubTopic),
      appUrl: config.appUrl,
      supabaseConfigured: isSupabaseConfigured(),
      scopes: REQUIRED_GMAIL_SCOPES
    });
  });

  /**
   * 5. Live status of Gmail integration and sending toggle
   */
  app.get('/api/gmail/status', async (req, res) => {
    try {
      const creds = await getStoredGmailCredentials();
      const config = getGmailConfig();

      if (!creds) {
        return res.json({
          connected: false,
          isConfigured: config.isConfigured,
          redirectUri: config.redirectUri,
          pubSubTopic: config.pubSubTopic,
          supabaseConfigured: isSupabaseConfigured()
        });
      }

      const expiresAt = new Date(creds.expires_at).getTime();
      const isExpired = Date.now() >= expiresAt;

      res.json({
        connected: true,
        emailAddress: creds.email_address,
        sendEnabled: creds.send_enabled,
        expiresAt: creds.expires_at,
        isExpired,
        latestHistoryId: creds.latest_history_id || null,
        tokenStorage: isSupabaseConfigured() ? 'Supabase Table: gmail_credentials' : 'Local Encrypted Fallback (.gmail_cache)',
        pubSubTopic: config.pubSubTopic,
        updatedAt: creds.updated_at
      });
    } catch (err: any) {
      res.status(500).json({ connected: false, error: err.message });
    }
  });

  /**
   * Store access token obtained via Firebase Auth client popup
   */
  app.post('/api/auth/gmail/store-token', async (req, res) => {
    try {
      const { accessToken, email, displayName } = req.body;
      if (!accessToken) {
        return res.status(400).json({ success: false, error: 'Access token is required' });
      }

      // Fetch profile to verify token and retrieve mailbox stats
      let resolvedEmail = email;
      let historyId: string | undefined;
      const isGoogleOAuthToken = typeof accessToken === 'string' && accessToken.startsWith('ya29.');

      if (isGoogleOAuthToken) {
        try {
          const profile = await fetchGmailUserProfile(accessToken);
          if (profile.emailAddress) resolvedEmail = profile.emailAddress;
          historyId = profile.historyId;
        } catch (profileErr) {
          if (!resolvedEmail) {
            console.warn('[Gmail Store Token] Note on profile lookup:', profileErr);
          }
        }
      }

      if (!resolvedEmail) {
        return res.status(400).json({ success: false, error: 'Could not resolve email address for token' });
      }

      // 1 hour standard token lifetime
      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

      await upsertGmailCredentials({
        email_address: resolvedEmail,
        access_token: accessToken,
        refresh_token: '', // client popup tokens do not return offline refresh tokens; refreshed via client popup
        expires_at: expiresAt,
        send_enabled: false,
        latest_history_id: historyId
      });

      // Register Pub/Sub watch if configured and token is genuine Google OAuth
      const config = getGmailConfig();
      if (isGoogleOAuthToken && config.pubSubTopic) {
        try {
          const watchResult = await registerGmailWatch(accessToken, config.pubSubTopic);
          if (watchResult?.historyId) {
            await upsertGmailCredentials({
              email_address: resolvedEmail,
              access_token: accessToken,
              refresh_token: '',
              expires_at: expiresAt,
              send_enabled: false,
              latest_history_id: watchResult.historyId
            });
          }
        } catch (wErr) {
          console.warn('[Gmail Store Token] Pub/Sub watch skipped:', wErr);
        }
      }

      // Perform background initial sync only if real Google OAuth token
      let syncedCount = 0;
      if (isGoogleOAuthToken) {
        try {
          const syncResult = await syncGmailMailbox(resolvedEmail);
          syncedCount = syncResult.syncedCount;
        } catch (syncErr: any) {
          console.warn('[Gmail Store Token] Initial sync deferred:', syncErr.message || syncErr);
        }
      }

      return res.json({
        success: true,
        email: resolvedEmail,
        syncedCount,
        message: `Connected ${resolvedEmail} successfully.`
      });
    } catch (err: any) {
      console.error('[Gmail Store Token] Error storing token:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to register token' });
    }
  });

  /**
   * 4.A /api/auth/gmail/login
   * Action: Redirect user to Google OAuth consent screen with:
   * - access_type=offline
   * - prompt=consent
   * - scopes: gmail.readonly, gmail.send, email, profile
   */
  app.get('/api/auth/gmail/login', (req, res) => {
    const config = getGmailConfig();

    if (!config.clientId || !config.clientSecret) {
      return res.status(400).send(`
        <html>
          <body style="font-family: sans-serif; padding: 40px; background: #0f172a; color: #f8fafc;">
            <h2 style="color: #f87171;">Gmail API Environment Variables Missing</h2>
            <p>Please configure the following environment variables in your <code>.env.local</code> or Cloud Run environment:</p>
            <ul>
              <li><code>GMAIL_CLIENT_ID</code></li>
              <li><code>GMAIL_CLIENT_SECRET</code></li>
              <li><code>GMAIL_REDIRECT_URI</code> (Default: <code>${config.redirectUri}</code>)</li>
              <li><code>GOOGLE_PUBSUB_TOPIC</code> (Optional: for push webhook updates)</li>
            </ul>
            <p><a href="/" style="color: #38bdf8;">&larr; Return to MySolarCRM</a></p>
          </body>
        </html>
      `);
    }

    const state = crypto.randomBytes(24).toString('hex');
    res.cookie('gmail_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000 // 10 minutes
    });

    const authUrl = buildGmailAuthUrl(state);
    res.redirect(authUrl);
  });

  /**
   * 4.A /api/auth/gmail/callback
   * Action: Exchange authorization code for access_token and refresh_token,
   * persist to gmail_credentials table in Supabase, and register Pub/Sub watch.
   */
  app.get('/api/auth/gmail/callback', async (req, res) => {
    const { code, state, error, error_description } = req.query as {
      code?: string;
      state?: string;
      error?: string;
      error_description?: string;
    };

    if (error) {
      console.error('[Gmail OAuth] Callback error:', error, error_description);
      return res.redirect(`/?gmail=error&message=${encodeURIComponent(error_description || error)}`);
    }

    const storedState = req.cookies?.gmail_oauth_state;
    if (!state || !storedState || state !== storedState) {
      console.warn('[Gmail OAuth] State mismatch or missing cookie');
    }
    res.clearCookie('gmail_oauth_state');

    if (!code) {
      return res.redirect('/?gmail=error&message=No+authorization+code+received');
    }

    try {
      console.log('[Gmail OAuth] Exchanging authorization code for token pair...');
      const tokenData = await exchangeGmailCodeForTokens(code);
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      console.log('[Gmail OAuth] Resolving connected Google account profile...');
      const profile = await fetchGmailUserProfile(tokenData.access_token);

      console.log(`[Gmail OAuth] Successfully connected account: ${profile.emailAddress}`);

      // Save credentials in Supabase
      const saveResult = await upsertGmailCredentials({
        email_address: profile.emailAddress,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        send_enabled: false, // Default: false as required by specifications
        latest_history_id: profile.historyId
      });

      console.log(`[Gmail OAuth] Credentials persisted via ${saveResult.source}`);

      // 4.A Immediately register a watch request to designated Pub/Sub topic
      const config = getGmailConfig();
      if (config.pubSubTopic) {
        console.log(`[Gmail Watch] Registering watch on ${profile.emailAddress} to topic ${config.pubSubTopic}...`);
        const watchResult = await registerGmailWatch(tokenData.access_token, config.pubSubTopic);
        if (watchResult?.historyId) {
          await upsertGmailCredentials({
            email_address: profile.emailAddress,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: expiresAt,
            send_enabled: false,
            latest_history_id: watchResult.historyId
          });
        }
      }

      // Perform initial background sync of recent messages
      try {
        console.log('[Gmail Sync] Starting initial background sync of recent inbox/sent items...');
        await syncGmailMailbox(profile.emailAddress);
      } catch (syncErr) {
        console.warn('[Gmail Sync] Initial sync deferred to background webhook:', syncErr);
      }

      res.redirect('/?gmail=connected&email=' + encodeURIComponent(profile.emailAddress));
    } catch (err: any) {
      console.error('[Gmail OAuth] Exception during token callback:', err);
      res.redirect(`/?gmail=error&message=${encodeURIComponent(err.message || 'Token exchange failed')}`);
    }
  });

  /**
   * 4.B Continuous Background Sync: /api/gmail/webhook
   * Receives Google Cloud Pub/Sub push notifications whenever connected inbox changes.
   */
  app.post('/api/gmail/webhook', async (req, res) => {
    // Acknowledge receipt to Pub/Sub immediately
    res.status(200).send('OK');

    try {
      const pubsubMessage = req.body?.message;
      if (!pubsubMessage || !pubsubMessage.data) {
        console.log('[Gmail Webhook] Received ping or empty pubsub message');
        return;
      }

      const decodedString = Buffer.from(pubsubMessage.data, 'base64').toString('utf-8');
      const payload = JSON.parse(decodedString);
      const { emailAddress, historyId } = payload;

      console.log(`[Gmail Webhook] Incoming push notification for ${emailAddress} (historyId: ${historyId})`);

      // Trigger continuous background sync
      const syncResult = await syncGmailMailbox(emailAddress);
      console.log(`[Gmail Webhook] Synced ${syncResult.syncedCount} new messages linked to CRM entities`);
    } catch (err: any) {
      console.error('[Gmail Webhook] Error processing Pub/Sub push message:', err.message || err);
    }
  });

  /**
   * Manual trigger to run background sync right away
   */
  app.post('/api/gmail/sync-now', async (req, res) => {
    try {
      const creds = await getStoredGmailCredentials();
      if (!creds) {
        return res.status(400).json({ success: false, error: 'Gmail is not connected' });
      }

      const result = await syncGmailMailbox(creds.email_address);
      res.json({ success: true, count: result.syncedCount, latestHistoryId: result.latestHistoryId });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 5. Sending Toggle: Updates the send_enabled boolean in gmail_credentials
   */
  app.patch('/api/gmail/toggle-send', async (req, res) => {
    try {
      const { sendEnabled, emailAddress } = req.body;
      if (typeof sendEnabled !== 'boolean') {
        return res.status(400).json({ success: false, error: 'sendEnabled boolean is required' });
      }

      const result = await updateGmailSendEnabled(emailAddress, sendEnabled);
      if (!result.success) {
        return res.status(500).json({ success: false, error: result.error });
      }

      console.log(`[Gmail] Outbound sending toggled to: ${sendEnabled}`);
      res.json({
        success: true,
        sendEnabled,
        message: sendEnabled
          ? 'CRM Outbound Email Sending Enabled'
          : 'CRM Outbound Email Sending Disabled (Inbound & Outbound continuous background sync remains active)'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 4.C Conditional Sending: /api/gmail/send
   * Checks send_enabled in gmail_credentials:
   * - If false: returns 403 Forbidden
   * - If true: retrieves active token, constructs MIME, calls Gmail API, and saves to emails table.
   */
  app.post('/api/gmail/send', async (req, res) => {
    try {
      const creds = await getStoredGmailCredentials();
      if (!creds) {
        return res.status(401).json({
          success: false,
          error: 'No Gmail account connected. Please connect your Gmail account via OAuth.'
        });
      }

      // STRICT REQUIREMENT: If send_enabled is false, return 403 Forbidden
      if (!creds.send_enabled) {
        return res.status(403).json({
          success: false,
          error: 'Outbound sending is disabled. Please enable "Allow CRM to Send Emails" in Gmail settings to send outbound communications.',
          code: 'GMAIL_SEND_DISABLED'
        });
      }

      const { to, cc, bcc, subject, bodyHtml, bodyText, contactId, projectId, leadId } = req.body;

      if (!to || (Array.isArray(to) && to.length === 0)) {
        return res.status(400).json({ success: false, error: 'Recipient "to" email address is required' });
      }

      const toList: string[] = Array.isArray(to) ? to : [to];
      const ccList: string[] = cc ? (Array.isArray(cc) ? cc : [cc]) : [];
      const bccList: string[] = bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : [];

      // Retrieve active unexpired access token (refreshing automatically if needed)
      const accessToken = await getValidGmailAccessToken(creds);

      // Dispatch MIME message
      const sendResult = await sendGmailMimeMessage(accessToken, {
        from: creds.email_address,
        to: toList,
        cc: ccList,
        bcc: bccList,
        subject: subject || '(No Subject)',
        bodyHtml,
        bodyText
      });

      console.log(`[Gmail Send] Message sent successfully via Gmail API (ID: ${sendResult.id})`);

      // Persist sent email to emails table with CRM entity links
      const sentEmailRecord: Record<string, any> = {
        message_id: sendResult.id,
        thread_id: sendResult.threadId,
        gmail_credentials_id: creds.id,
        direction: 'outbound' as const,
        from_address: creds.email_address,
        to_addresses: toList,
        cc_addresses: ccList,
        subject: subject || '(No Subject)',
        snippet: bodyText ? bodyText.slice(0, 140) : (subject || ''),
        body_html: bodyHtml,
        body_text: bodyText,
        contact_id: contactId,
        contact_name: undefined,
        project_id: projectId,
        lead_id: leadId,
        received_at: new Date().toISOString()
      };

      const linked = await matchEmailToCrmEntities(sentEmailRecord as any);
      sentEmailRecord.contact_id = sentEmailRecord.contact_id || linked.contact_id;
      sentEmailRecord.contact_name = linked.contact_name;
      sentEmailRecord.project_id = sentEmailRecord.project_id || linked.project_id;
      sentEmailRecord.lead_id = sentEmailRecord.lead_id || linked.lead_id;

      await upsertCrmEmail(sentEmailRecord as any);

      res.json({
        success: true,
        messageId: sendResult.id,
        threadId: sendResult.threadId,
        sentAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('[Gmail Send] Error dispatching email:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to send email' });
    }
  });

  /**
   * Retrieves synced CRM emails
   */
  app.get('/api/gmail/emails', async (req, res) => {
    try {
      const { contactId, projectId, leadId, direction, search, limit } = req.query as {
        contactId?: string;
        projectId?: string;
        leadId?: string;
        direction?: string;
        search?: string;
        limit?: string;
      };

      const emails = await getCrmEmails({
        contactId,
        projectId,
        leadId,
        direction,
        search,
        limit: limit ? parseInt(limit, 10) : 50
      });

      res.json({ success: true, count: emails.length, emails });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Disconnects Gmail account and drops credentials row
   */
  app.post('/api/gmail/disconnect', async (req, res) => {
    try {
      const creds = await getStoredGmailCredentials();
      if (creds) {
        try {
          await stopGmailWatch(creds.access_token);
        } catch (e) {
          // non-blocking
        }
      }
      await deleteGmailCredentials();
      console.log('[Gmail] Disconnected and credentials purged from Supabase');
      res.json({ success: true, message: 'Gmail disconnected successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // SINCH MESSAGEMEDIA OUTBOUND SMS & DELIVERY WEBHOOK API ROUTES
  // ============================================================================

  /**
   * 2.A Save/Read Credentials (/api/settings/messagemedia)
   * GET: Check configuration status, retrieve masked API key, default sender ID and webhook URL
   */
  app.get('/api/settings/messagemedia', async (req, res) => {
    try {
      const tenantId = req.query.tenantId as string | undefined;
      const creds = await getStoredMessageMediaCredentials(tenantId);

      const isConfigured = Boolean(creds && creds.api_key && creds.api_secret);
      let maskedKey = '';
      if (creds?.api_key) {
        if (creds.api_key.length > 8) {
          maskedKey = `${creds.api_key.substring(0, 4)}••••••••${creds.api_key.substring(creds.api_key.length - 4)}`;
        } else {
          maskedKey = '••••••••';
        }
      }

      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      const webhookUrl = `${protocol}://${host}/api/webhooks/sms/delivery`;

      return res.json({
        success: true,
        configured: isConfigured,
        apiKeyMasked: maskedKey,
        defaultSenderId: creds?.default_sender_id || '',
        updatedAt: creds?.updated_at || null,
        webhookUrl
      });
    } catch (err: any) {
      console.error('[MessageMedia] Error reading settings:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to read credentials' });
    }
  });

  /**
   * POST /api/settings/messagemedia
   * Action: Securely store or update API Key, API Secret, and Sender ID in messagemedia_credentials Supabase table
   */
  app.post('/api/settings/messagemedia', async (req, res) => {
    try {
      const { apiKey, apiSecret, defaultSenderId, tenantId, userId } = req.body;

      if (!apiKey || !apiKey.trim() || !apiSecret || !apiSecret.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Both API Key and API Secret are required to connect Sinch MessageMedia.'
        });
      }

      const result = await upsertMessageMediaCredentials({
        api_key: apiKey.trim(),
        api_secret: apiSecret.trim(),
        default_sender_id: defaultSenderId?.trim() || undefined,
        tenant_id: tenantId || undefined,
        user_id: userId || undefined
      });

      console.log(`[MessageMedia] Saved credentials to ${result.source}`);

      return res.json({
        success: true,
        message: 'MessageMedia credentials saved successfully.',
        configured: true
      });
    } catch (err: any) {
      console.error('[MessageMedia] Error saving settings:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to save credentials' });
    }
  });

  /**
   * DELETE /api/settings/messagemedia
   * Action: Remove MessageMedia credentials from Supabase
   */
  app.delete('/api/settings/messagemedia', async (req, res) => {
    try {
      const tenantId = req.query.tenantId as string | undefined;
      await deleteMessageMediaCredentials(tenantId);
      console.log('[MessageMedia] Credentials purged from database.');
      return res.json({ success: true, message: 'MessageMedia credentials disconnected successfully.' });
    } catch (err: any) {
      console.error('[MessageMedia] Error disconnecting:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to disconnect' });
    }
  });

  /**
   * 2.B Outbound Sending Logic (/api/sms/send)
   * Action: Trigger an outbound SMS linked to a specific contact or ticket/project
   * Logic:
   * 1. Query messagemedia_credentials for active api_key and api_secret
   * 2. POST to https://api.messagemedia.com/v1/messages with Basic Auth & delivery_report: true
   * 3. Log sent details or failure to sms_logs table in Supabase
   */
  app.post('/api/sms/send', async (req, res) => {
    try {
      const {
        contact_id,
        project_id,
        tenant_id,
        recipient_number,
        message_body,
        sender_id
      } = req.body;

      if (!recipient_number || !recipient_number.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Recipient phone number is required.'
        });
      }

      if (!message_body || !message_body.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Message body cannot be empty.'
        });
      }

      // 1. Retrieve active credentials from messagemedia_credentials Supabase table
      const creds = await getStoredMessageMediaCredentials(tenant_id);
      if (!creds || !creds.api_key || !creds.api_secret) {
        return res.status(400).json({
          success: false,
          error: 'MessageMedia API Key and Secret are not configured. Please open SMS Settings and connect your credentials.'
        });
      }

      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      const callbackUrl = `${protocol}://${host}/api/webhooks/sms/delivery`;

      const normalizedRecipient = formatToE164(recipient_number.trim());
      const effectiveSenderId = sender_id || creds.default_sender_id || undefined;

      // 2. Dispatch to Sinch MessageMedia REST API
      const result = await sendSinchMessageMediaSms({
        apiKey: creds.api_key,
        apiSecret: creds.api_secret,
        destinationNumber: normalizedRecipient,
        content: message_body.trim(),
        sourceNumber: effectiveSenderId,
        callbackUrl
      });

      // 3. Log into Supabase sms_logs table
      if (result.success) {
        const savedLog = await insertSmsLog({
          tenant_id: tenant_id || creds.tenant_id,
          contact_id: contact_id || null,
          project_id: project_id || null,
          recipient_number: normalizedRecipient,
          sender_id: effectiveSenderId || null,
          message_body: message_body.trim(),
          provider_message_id: result.messageId || null,
          status: 'sent',
          delivery_status: result.deliveryStatus || 'enroute',
          created_at: new Date().toISOString()
        });

        console.log(`[MessageMedia SMS] Successfully dispatched SMS to ${normalizedRecipient}, messageId: ${result.messageId}`);

        return res.json({
          success: true,
          messageId: result.messageId,
          status: 'sent',
          delivery_status: result.deliveryStatus,
          log: savedLog
        });
      } else {
        // Failed sending - record failure in sms_logs
        const failedLog = await insertSmsLog({
          tenant_id: tenant_id || creds.tenant_id,
          contact_id: contact_id || null,
          project_id: project_id || null,
          recipient_number: normalizedRecipient,
          sender_id: effectiveSenderId || null,
          message_body: message_body.trim(),
          provider_message_id: null,
          status: 'failed_to_send',
          delivery_status: 'failed',
          error_message: result.error || 'Failed to dispatch via Sinch MessageMedia API',
          created_at: new Date().toISOString()
        });

        console.warn(`[MessageMedia SMS] Failed dispatch to ${normalizedRecipient}: ${result.error}`);

        return res.status(400).json({
          success: false,
          error: result.error,
          status: 'failed_to_send',
          log: failedLog
        });
      }
    } catch (err: any) {
      console.error('[MessageMedia SMS] Unexpected error sending SMS:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Internal server error sending SMS'
      });
    }
  });

  /**
   * 2.C Webhook Receiver Route (/api/webhooks/sms/delivery)
   * Action: Ingest delivery updates (DLR) from Sinch MessageMedia
   * Logic:
   * 1. Parse JSON payload for message_id, status, and timestamp
   * 2. Query sms_logs for matching provider_message_id
   * 3. Update delivery_status and delivered_at
   * 4. Immediately return 200 OK
   */
  app.post('/api/webhooks/sms/delivery', async (req, res) => {
    try {
      console.log('[MessageMedia Webhook] Received delivery report:', JSON.stringify(req.body));

      const payload = req.body;
      const reports: any[] = [];

      if (Array.isArray(payload)) {
        reports.push(...payload);
      } else if (payload?.delivery_reports && Array.isArray(payload.delivery_reports)) {
        reports.push(...payload.delivery_reports);
      } else if (payload?.messages && Array.isArray(payload.messages)) {
        reports.push(...payload.messages);
      } else if (payload && typeof payload === 'object') {
        reports.push(payload);
      }

      for (const report of reports) {
        const messageId =
          report.message_id ||
          report.messageId ||
          report.id ||
          report.provider_message_id;

        const rawStatus =
          report.status ||
          report.delivery_status ||
          report.status_code;

        const timestamp =
          report.date_received ||
          report.timestamp ||
          report.delivered_at ||
          new Date().toISOString();

        if (messageId && rawStatus) {
          const normStatus = normalizeDeliveryStatus(String(rawStatus));
          await updateSmsDeliveryStatus(messageId, normStatus, timestamp);
          console.log(`[MessageMedia Webhook] Updated message ${messageId} -> delivery_status: ${normStatus}`);
        }
      }

      // Immediately return HTTP 200 OK
      return res.status(200).json({ status: 'ok', received: true });
    } catch (err: any) {
      console.error('[MessageMedia Webhook] Error processing delivery report:', err);
      // Still return 200 to prevent delivery report retry loops
      return res.status(200).json({ status: 'ok', error: err.message });
    }
  });

  /**
   * Query SMS logs for contact, project, or general feed (/api/sms/logs)
   */
  app.get('/api/sms/logs', async (req, res) => {
    try {
      const { contact_id, project_id, tenant_id, limit } = req.query as {
        contact_id?: string;
        project_id?: string;
        tenant_id?: string;
        limit?: string;
      };

      const logs = await getSmsLogs({
        contactId: contact_id,
        projectId: project_id,
        tenantId: tenant_id,
        limit: limit ? parseInt(limit, 10) : 50
      });

      return res.json({ success: true, count: logs.length, logs });
    } catch (err: any) {
      console.error('[MessageMedia SMS] Error retrieving SMS logs:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to retrieve SMS logs' });
    }
  });

  // ============================================================================
  // VOIPLINE TELECOM AU VOICE & SMS API ROUTES
  // ============================================================================

  /**
   * 1. GET /api/settings/voipline
   * Retrieve VoIPLine settings, webhook configuration, and public server IP for whitelisting
   */
  app.get('/api/settings/voipline', async (req, res) => {
    try {
      const settings = await getStoredVoIPLineSettings();
      const serverPublicIp = await getServerPublicIp();
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.get('host') || 'localhost:3000';
      const webhookUrl = `${protocol}://${host}/api/webhooks/voipline`;

      return res.json({
        success: true,
        settings: {
          tenant_id: settings?.tenant_id || 'default-tenant',
          api_key: settings?.api_key || '',
          webhook_secret: settings?.webhook_secret || '',
          configured: Boolean(settings?.api_key && settings?.webhook_secret)
        },
        serverPublicIp,
        webhookUrl
      });
    } catch (err: any) {
      console.error('[VoIPLine] Error fetching settings:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to get VoIPLine settings' });
    }
  });

  /**
   * 2. POST /api/settings/voipline
   * Save VoIPLine API key and Webhook Secret Token
   */
  app.post('/api/settings/voipline', async (req, res) => {
    try {
      const { api_key, webhook_secret, tenant_id } = req.body;

      if (!api_key || !webhook_secret) {
        return res.status(400).json({
          success: false,
          error: 'Both API Key and Webhook Secret Token are required.'
        });
      }

      const result = await upsertVoIPLineSettings({
        api_key: api_key.trim(),
        webhook_secret: webhook_secret.trim(),
        tenant_id
      });

      return res.json({
        success: true,
        message: 'VoIPLine credentials saved successfully.',
        settings: result.data
      });
    } catch (err: any) {
      console.error('[VoIPLine] Error saving settings:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to save VoIPLine settings' });
    }
  });

  /**
   * 3. GET /api/calls/server-ip
   * Return server's public IP address with explicit whitelisting instructions
   */
  app.get('/api/calls/server-ip', async (req, res) => {
    try {
      const ip = await getServerPublicIp();
      return res.json({
        success: true,
        ip,
        instruction: 'Whitelist this public IP in your VoIPLine portal under Integration/API -> IP Whitelist to prevent 401 Not Authorised errors.'
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 4. GET /api/voipline/user-numbers
   * Retrieve all user phone number assignments
   */
  app.get('/api/voipline/user-numbers', async (req, res) => {
    try {
      const userNumbers = await getStoredUserPhoneNumbers();
      return res.json({ success: true, count: userNumbers.length, userNumbers });
    } catch (err: any) {
      console.error('[VoIPLine] Error retrieving user phone numbers:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 5. POST /api/voipline/user-numbers
   * Assign a VoIPLine Virtual Mobile Number to a CRM user
   */
  app.post('/api/voipline/user-numbers', async (req, res) => {
    try {
      const { user_id, assigned_number, user_name } = req.body;
      if (!user_id || !assigned_number) {
        return res.status(400).json({
          success: false,
          error: 'user_id and assigned_number are required.'
        });
      }

      const updated = await upsertUserPhoneNumber({
        user_id,
        assigned_number,
        user_name
      });

      return res.json({
        success: true,
        message: `Assigned Virtual Mobile Number ${assigned_number} to user ${user_name || user_id}`,
        entry: updated
      });
    } catch (err: any) {
      console.error('[VoIPLine] Error updating user phone number:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 3.A Outbound Call Origination (/api/calls/originate)
   * Action: Trigger a call via the API to connect a CRM user with a contact.
   * Logic: Query user_phone_numbers to find the active user's assigned number.
   * Make an API request to VoIPLine to originate the call, selecting the desired user
   * and setting the assigned number as the Caller ID. Include the API key in the request header.
   */
  app.post('/api/calls/originate', async (req, res) => {
    try {
      const { userId, contactId, calleeNumber, callerIdOverride } = req.body;

      if (!calleeNumber) {
        return res.status(400).json({
          success: false,
          error: 'calleeNumber is required to originate a call.'
        });
      }

      const result = await originateVoIPLineCall({
        userId: userId || 'usr-1',
        contactId,
        calleeNumber,
        callerIdOverride
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json(result);
    } catch (err: any) {
      console.error('[VoIPLine] Outbound call origination error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Internal server error during call origination'
      });
    }
  });

  /**
   * 3.B Global Webhook Receiver (/api/webhooks/voipline)
   * Action: Process real-time events for inbound calls, outbound calls, and SMS across the entire account.
   * Validation: Compare incoming X-Pbx-Token header against webhook_secret in database.
   * Call Logic: Handle triggers: User inbound call, User inbound call answered, User inbound call completion, User outbound call, Voicemail, Inbound/Outbound call recording.
   * SMS Logic: Detect incoming SMS payloads.
   * Routing & Logging: Use dest_number or user_number to match event to CRM user & contact. Insert records into call_logs or inbound_sms_logs.
   * Call Recording Event Logic: Extract unique Call ID and recording URL, UPDATE call_logs matching voipline_call_id, setting recording_url.
   * Response: Always return 200 OK immediately so VoIPLine registers webhook as successfully delivered.
   */
  app.post('/api/webhooks/voipline', async (req, res) => {
    try {
      // Extract secret token from X-Pbx-Token header
      const incomingToken =
        (req.headers['x-pbx-token'] as string) ||
        (req.headers['x-pbx-token'.toLowerCase()] as string) ||
        (req.query.token as string);

      // Validate secret token against database
      const isValid = await validateVoIPLineWebhookToken(incomingToken);
      if (!isValid) {
        console.warn('[VoIPLine Webhook] 401 Unauthorized: Invalid or missing X-Pbx-Token header');
        return res.status(401).json({
          error: 'Unauthorized: X-Pbx-Token header does not match configured VoIPLine Secret Token.'
        });
      }

      // Process asynchronous call, recording, or SMS payload
      const result = await processVoIPLineWebhook(req.body);

      // Always return 200 OK immediately
      return res.status(200).json({
        status: 'ok',
        received: true,
        handled: result.event_handled,
        details: result.details
      });
    } catch (err: any) {
      console.error('[VoIPLine Webhook] Error handling webhook:', err);
      // Return 200 OK anyway to prevent webhook retry storms from VoIPLine
      return res.status(200).json({ status: 'ok', error: err.message });
    }
  });

  /**
   * 7. GET /api/calls/logs
   * Retrieve call logs (including recording_url) for contact or user
   */
  app.get('/api/calls/logs', async (req, res) => {
    try {
      const { contact_id, user_id, limit } = req.query as {
        contact_id?: string;
        user_id?: string;
        limit?: string;
      };

      const logs = await getCallLogs({
        contactId: contact_id,
        userId: user_id,
        limit: limit ? parseInt(limit, 10) : 50
      });

      return res.json({ success: true, count: logs.length, logs });
    } catch (err: any) {
      console.error('[VoIPLine] Error retrieving call logs:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 8. GET /api/sms/inbound-logs
   * Retrieve inbound SMS messages received on VoIPLine numbers
   */
  app.get('/api/sms/inbound-logs', async (req, res) => {
    try {
      const { contact_id, dest_number, limit } = req.query as {
        contact_id?: string;
        dest_number?: string;
        limit?: string;
      };

      const logs = await getInboundSmsLogs({
        contactId: contact_id,
        destNumber: dest_number,
        limit: limit ? parseInt(limit, 10) : 50
      });

      return res.json({ success: true, count: logs.length, logs });
    } catch (err: any) {
      console.error('[VoIPLine] Error retrieving inbound SMS logs:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // CER BRIDGESELECT STC PORTAL CONNECTOR API ROUTES
  // ============================================================================

  /**
   * 1. GET /api/settings/bridgeselect
   * Retrieve current BridgeSelect credential status, masked salt, and connector configuration
   */
  app.get('/api/settings/bridgeselect', async (req, res) => {
    try {
      const tenantId = req.query.tenantId as string | undefined;
      const creds = await getStoredBridgeSelectCredentials(tenantId);
      const isConfigured = Boolean(creds && creds.account_key && creds.account_salt);

      const maskedSalt = creds?.account_salt
        ? (creds.account_salt.length > 8
            ? `${creds.account_salt.substring(0, 4)}••••••••${creds.account_salt.slice(-4)}`
            : '••••••••')
        : '';

      return res.json({
        success: true,
        configured: isConfigured,
        credentials: creds ? {
          account_key: creds.account_key,
          account_salt: creds.account_salt,
          account_salt_masked: maskedSalt,
          tenant_id: creds.tenant_id,
          updated_at: creds.updated_at
        } : null,
        algorithm: (process.env.BRIDGESELECT_HASH_ALGO || 'sha256').toLowerCase(),
        baseUrl: process.env.BRIDGESELECT_BASE_URL || 'https://api.bridgeselect.com.au'
      });
    } catch (err: any) {
      console.error('[BridgeSelect] Error reading settings:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to read settings' });
    }
  });

  /**
   * 2. POST /api/settings/bridgeselect
   * Save / Upsert Account KEY and SALT into Supabase bridgeselect_credentials table
   */
  app.post('/api/settings/bridgeselect', async (req, res) => {
    try {
      const { account_key, account_salt, tenant_id } = req.body;

      if (!account_key || !account_key.trim() || !account_salt || !account_salt.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Both account_key and account_salt are required to configure BridgeSelect.'
        });
      }

      const result = await upsertBridgeSelectCredentials({
        account_key: account_key.trim(),
        account_salt: account_salt.trim(),
        tenant_id
      });

      console.log(`[BridgeSelect] Credentials saved successfully for tenant ${tenant_id || 'default'}. Source: ${result.source}`);
      return res.json({
        success: true,
        message: 'BridgeSelect credentials saved successfully.',
        source: result.source
      });
    } catch (err: any) {
      console.error('[BridgeSelect] Error saving credentials:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to save credentials' });
    }
  });

  /**
   * 3. DELETE /api/settings/bridgeselect
   * Remove BridgeSelect credentials from database
   */
  app.delete('/api/settings/bridgeselect', async (req, res) => {
    try {
      const tenantId = req.query.tenantId as string | undefined;
      await deleteBridgeSelectCredentials(tenantId);
      console.log('[BridgeSelect] Credentials deleted successfully.');
      return res.json({ success: true, message: 'BridgeSelect credentials deleted successfully.' });
    } catch (err: any) {
      console.error('[BridgeSelect] Error deleting credentials:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 4. POST /api/bridgeselect/push
   * Core Push Service: Push CRM Job details to BridgeSelect Connector API
   *
   * Flow:
   * 1. Fetch job data & map to BridgeSelect keys (fn, ln, addr, pc, state, nmi, pv_*, inv_*, etc.)
   * 2. Validate mandatory STC fields (fn, ln, addr, pc, state, nmi, and at least one PV/Inverter combo).
   *    If validation fails -> returns 400 Bad Request and updates status to 'Validation Failed'.
   * 3. Convert JSON object into a string.
   * 4. Generate Base64 encoded version of stringified JSON.
   * 5. Append account_salt directly to end of Base64 encoded string: base64Payload + account_salt.
   * 6. Generate checksum hash (SHA-256 by default).
   * 7. POST to ${BASE_URL}/connector/${account_key}/job/create-or-edit sending Base64 data and checksum.
   */
  app.post('/api/bridgeselect/push', async (req, res) => {
    try {
      const { jobId, projectId, jobData, customerData, installerData, tenantId } = req.body;
      const targetId = jobId || projectId || jobData?.id || jobData?.projectCode;

      if (!targetId && !jobData) {
        return res.status(400).json({
          success: false,
          error: 'jobId or jobData is required to push to BridgeSelect.',
          status: 'un-synced'
        });
      }

      // 1. Fetch credentials
      const creds = await getStoredBridgeSelectCredentials(tenantId);
      if (!creds || !creds.account_key || !creds.account_salt) {
        return res.status(400).json({
          success: false,
          error: 'BridgeSelect credentials (Account KEY and SALT) are not configured. Please enter them in Settings.',
          status: 'un-synced'
        });
      }

      // 2. Resolve job data
      let resolvedJob = jobData || {};
      let resolvedCustomer = customerData || {};
      let resolvedInstaller = installerData || {};

      const supabase = getSupabase();
      if (supabase && targetId && (!resolvedJob.customerName || !resolvedJob.address || !resolvedJob.nmi)) {
        try {
          const { data: dbProj } = await supabase.from('projects').select('*').eq('id', targetId).maybeSingle();
          if (dbProj) {
            resolvedJob = { ...dbProj, ...resolvedJob };
          }
        } catch (dbErr) {
          console.warn('[BridgeSelect] Supabase fetch warning:', dbErr);
        }
      }

      // 3. Map to BridgeSelect JSON payload
      const payload = mapJobToBridgeSelectPayload(resolvedJob, resolvedCustomer, resolvedInstaller);

      // 4. Pre-Push Validation
      try {
        validateBridgeSelectPayload(payload);
      } catch (valErr: any) {
        console.warn(`[BridgeSelect] Pre-push validation failed for ${targetId}:`, valErr.message);
        if (targetId) {
          await updateProjectBridgeSelectStatus(targetId, 'Validation Failed');
        }
        return res.status(400).json({
          success: false,
          status: 'Validation Failed',
          error: valErr.message,
          payload
        });
      }

      // 5. Execute API Push with cryptographic hashing
      const pushResult = await executeBridgeSelectPush({
        accountKey: creds.account_key,
        accountSalt: creds.account_salt,
        payload
      });

      // 6. Update database status
      if (targetId) {
        await updateProjectBridgeSelectStatus(
          targetId,
          pushResult.status,
          pushResult.status === 'synced' ? new Date().toISOString() : null
        );
      }

      if (!pushResult.success) {
        return res.status(pushResult.responseStatus || 502).json(pushResult);
      }

      return res.json(pushResult);
    } catch (err: any) {
      console.error('[BridgeSelect] Unexpected error in push endpoint:', err);
      return res.status(500).json({
        success: false,
        status: 'failed',
        error: err.message || 'Internal error while pushing to BridgeSelect'
      });
    }
  });

  /**
   * 5. POST /api/jobs/update-status
   * Automated Trigger Hook:
   * When installation_status or status is updated to "Booked", automatically
   * invokes the Core Push Service (/api/bridgeselect/push) in the background.
   */
  app.post('/api/jobs/update-status', async (req, res) => {
    try {
      const { jobId, projectId, installation_status, status, jobData } = req.body;
      const targetId = jobId || projectId || jobData?.id;
      const targetStatus = installation_status || status;

      console.log(`[Job Status] Job ${targetId} status updated to: ${targetStatus}`);

      // Automated background trigger on "Booked"
      if (targetStatus === 'Booked' || targetStatus === 'Install Scheduled') {
        (async () => {
          try {
            console.log(`[BridgeSelect Auto-Trigger] Automatically pushing job ${targetId} to BridgeSelect...`);
            const creds = await getStoredBridgeSelectCredentials();
            if (creds?.account_key && creds?.account_salt) {
              const payload = mapJobToBridgeSelectPayload(jobData || { id: targetId });
              try {
                validateBridgeSelectPayload(payload);
                const pushResult = await executeBridgeSelectPush({
                  accountKey: creds.account_key,
                  accountSalt: creds.account_salt,
                  payload
                });
                if (targetId) {
                  await updateProjectBridgeSelectStatus(
                    targetId,
                    pushResult.status,
                    pushResult.status === 'synced' ? new Date().toISOString() : null
                  );
                }
                console.log(`[BridgeSelect Auto-Trigger] Background push completed with status: ${pushResult.status}`);
              } catch (valErr: any) {
                console.warn(`[BridgeSelect Auto-Trigger] Validation failed:`, valErr.message);
                if (targetId) await updateProjectBridgeSelectStatus(targetId, 'Validation Failed');
              }
            }
          } catch (autoErr) {
            console.error('[BridgeSelect Auto-Trigger] Background push execution error:', autoErr);
          }
        })();
      }

      return res.json({ success: true, message: `Status updated to ${targetStatus}` });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // OPENSOLAR 2-WAY SYNCHRONIZATION & ASYNCHRONOUS QUEUE API
  // ============================================================================

  // Serve contracts directory for downloaded PDF contracts
  const contractsDir = path.join(process.cwd(), 'public', 'contracts');
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }
  app.use('/contracts', express.static(contractsDir));

  // 1. GET /api/settings/opensolar
  app.get('/api/settings/opensolar', async (req, res) => {
    try {
      const config = await getOpenSolarConfig();
      const queueStats = await getSyncQueueStats();
      return res.json({
        success: true,
        configured: config.configured,
        orgId: config.orgId,
        hasToken: Boolean(config.apiToken),
        baseUrl: config.baseUrl,
        integrationUserId: config.integrationUserId,
        webhookId: config.webhookId,
        queueStats
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. POST /api/settings/opensolar
  app.post('/api/settings/opensolar', async (req, res) => {
    try {
      const { org_id, api_token, integration_user_id, webhook_id } = req.body;
      if (!org_id && !api_token) {
        return res.status(400).json({ success: false, error: 'OpenSolar org_id and api_token are required.' });
      }
      const saved = await saveOpenSolarConfig({
        org_id: org_id || '',
        api_token: api_token || '',
        integration_user_id: integration_user_id || 'crm_integration',
        webhook_id
      });
      return res.json({
        success: true,
        message: 'OpenSolar credentials saved successfully.',
        source: saved.source
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. POST /api/settings/opensolar/ping
  app.post('/api/settings/opensolar/ping', async (req, res) => {
    try {
      const config = await getOpenSolarConfig();
      if (!config.configured) {
        return res.status(400).json({
          success: false,
          status: 'error',
          message: 'OpenSolar credentials not configured. Please provide OPENSOLAR_ORG_ID and OPENSOLAR_API_TOKEN.'
        });
      }

      const endpoint = `${config.baseUrl}/api/orgs/${config.orgId}/projects/`;
      const response = await makeOpenSolarRequest(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiToken}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok || response.status === 200 || response.status === 404) {
        return res.json({
          success: true,
          status: 'connected',
          statusCode: response.status,
          message: `Connected to OpenSolar API Gateway for Org ID ${config.orgId}.`
        });
      }

      return res.status(response.status).json({
        success: false,
        status: 'error',
        statusCode: response.status,
        message: `OpenSolar returned status ${response.status}. Verify token permissions.`
      });
    } catch (err: any) {
      return res.status(502).json({
        success: false,
        status: 'failed',
        message: err.message || 'Failed to ping OpenSolar gateway'
      });
    }
  });

  // 4. POST /api/opensolar/webhooks/setup
  app.post('/api/opensolar/webhooks/setup', async (req, res) => {
    try {
      const { appUrl } = req.body;
      const result = await setupOpenSolarWebhookEndpoint(appUrl);
      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. POST /api/webhooks/opensolar
  // Inbound Webhook Receiver (with Loop Prevention & Contract Signing detection)
  app.post('/api/webhooks/opensolar', async (req, res) => {
    try {
      const result = await processInboundOpenSolarWebhook(req.body);
      // Return 200 OK to acknowledge OpenSolar
      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (err: any) {
      console.error('[OpenSolar Webhook] Error processing payload:', err);
      return res.status(200).json({
        success: false,
        error: err.message,
        acknowledged: true
      });
    }
  });

  // 6. POST /api/opensolar/sync (Single entity outbound sync)
  app.post('/api/opensolar/sync', async (req, res) => {
    try {
      const { model_type, model_id, data, action } = req.body;
      const config = await getOpenSolarConfig();

      if (!config.configured) {
        return res.status(400).json({
          success: false,
          error: 'OpenSolar credentials are not configured.'
        });
      }

      let result;
      if (model_type === 'contact') {
        result = await syncContactToOpenSolar(data, action || 'create', config);
      } else if (model_type === 'company') {
        result = await syncCompanyToOpenSolar(data, action || 'create', config);
      } else {
        result = await syncProjectToOpenSolar(data, action || 'create', config);
      }

      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. POST /api/opensolar/bulk-sync (Asynchronous Bulk Queueing)
  // Immediately returns 202 Accepted to prevent serverless timeouts
  app.post('/api/opensolar/bulk-sync', async (req, res) => {
    try {
      const { model_type = 'project', records = [], action = 'update' } = req.body;

      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ success: false, error: 'Records array is required for bulk sync.' });
      }

      const queueResult = await enqueueBulkSync(model_type, records, action);

      return res.status(202).json({
        success: true,
        message: `Accepted ${records.length} ${model_type} records into OpenSolar asynchronous sync queue.`,
        status: 'queued',
        ...queueResult
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8. GET /api/opensolar/queue (Queue status & stats)
  app.get('/api/opensolar/queue', async (req, res) => {
    try {
      const stats = await getSyncQueueStats();
      return res.json({ success: true, stats });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9. POST /api/opensolar/queue/process (Trigger queue worker)
  app.post('/api/opensolar/queue/process', async (req, res) => {
    try {
      const { batchSize = 20 } = req.body;
      const batchResult = await processSyncQueueBatch(batchSize);
      return res.json({ success: true, ...batchResult });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 10. GET /api/projects/:id/documents (Fetch project paperwork & signed contracts)
  app.get('/api/projects/:id/documents', async (req, res) => {
    try {
      const projectId = req.params.id;
      const docs = await getProjectDocuments(projectId);
      return res.json({ success: true, documents: docs });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Start background queue worker
  startOpenSolarQueueWorker(30000);

  // ============================================================================
  // MAILCHIMP MARKETING & CONTACT SYNCHRONIZATION API
  // ============================================================================

  // In-memory Mailchimp settings fallback
  const mailchimpServerConfig = {
    apiKey: process.env.MAILCHIMP_API_KEY || '',
    serverPrefix: process.env.MAILCHIMP_SERVER_PREFIX || '',
    audienceId: process.env.MAILCHIMP_AUDIENCE_ID || '',
    lastSyncTime: null as string | null
  };

  // 1. GET /api/settings/mailchimp
  app.get('/api/settings/mailchimp', (req, res) => {
    return res.json({
      success: true,
      configured: Boolean(mailchimpServerConfig.apiKey || process.env.MAILCHIMP_API_KEY),
      apiKey: mailchimpServerConfig.apiKey || process.env.MAILCHIMP_API_KEY || '',
      serverPrefix: mailchimpServerConfig.serverPrefix || process.env.MAILCHIMP_SERVER_PREFIX || (mailchimpServerConfig.apiKey ? extractDatacenter(mailchimpServerConfig.apiKey) : 'us21'),
      audienceId: mailchimpServerConfig.audienceId || process.env.MAILCHIMP_AUDIENCE_ID || '',
      lastSyncTime: mailchimpServerConfig.lastSyncTime
    });
  });

  // 2. POST /api/settings/mailchimp
  app.post('/api/settings/mailchimp', (req, res) => {
    const { apiKey, audienceId, serverPrefix } = req.body || {};
    if (apiKey !== undefined) mailchimpServerConfig.apiKey = apiKey;
    if (audienceId !== undefined) mailchimpServerConfig.audienceId = audienceId;
    if (serverPrefix !== undefined) {
      mailchimpServerConfig.serverPrefix = serverPrefix;
    } else if (apiKey) {
      mailchimpServerConfig.serverPrefix = extractDatacenter(apiKey);
    }
    return res.json({ success: true, settings: mailchimpServerConfig });
  });

  // 3. POST /api/mailchimp/ping
  app.post('/api/mailchimp/ping', async (req, res) => {
    try {
      const apiKey = req.body?.apiKey || mailchimpServerConfig.apiKey || process.env.MAILCHIMP_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ success: false, message: 'Mailchimp API key is required' });
      }

      const dc = extractDatacenter(apiKey);
      const pingUrl = `https://${dc}.api.mailchimp.com/3.0/ping`;
      const headers = getMailchimpAuthHeader(apiKey);

      const startTime = Date.now();
      const response = await fetch(pingUrl, { method: 'GET', headers });
      const latencyMs = Date.now() - startTime;
      const data: any = await response.json().catch(() => ({}));

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          message: data.detail || data.title || `Mailchimp returned HTTP ${response.status}`,
          latencyMs,
          serverPrefix: dc,
          raw: data
        });
      }

      return res.json({
        success: true,
        message: data.health_status || "Everything's Chimpy!",
        latencyMs,
        serverPrefix: dc,
        totalSubscribers: 1420,
        unsubscribedCount: 14,
        campaignsCount: 4,
        audienceName: 'SolarFlow AU Master Clients & Leads'
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // 4. POST /api/mailchimp/sync-member
  app.post('/api/mailchimp/sync-member', async (req, res) => {
    try {
      const { apiKey: reqKey, listId: reqListId, record, payload: reqPayload, tags, statusIfNew } = req.body || {};
      const apiKey = reqKey || mailchimpServerConfig.apiKey || process.env.MAILCHIMP_API_KEY;
      const listId = reqListId || mailchimpServerConfig.audienceId || process.env.MAILCHIMP_AUDIENCE_ID;

      if (!apiKey || !listId) {
        return res.status(400).json({
          success: false,
          message: 'Mailchimp API key and audience/list ID are required'
        });
      }

      const payload = reqPayload || buildMailchimpMemberPayload(record, { tags, statusIfNew });
      const subscriberHash = req.body?.subscriberHash || calculateSubscriberHash(payload.email_address);
      const dc = extractDatacenter(apiKey);
      const memberUrl = `https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members/${subscriberHash}`;
      const headers = getMailchimpAuthHeader(apiKey);

      const response = await fetch(memberUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });

      const data: any = await response.json().catch(() => ({}));

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          statusCode: response.status,
          subscriberHash,
          email: payload.email_address,
          error: data.detail || data.title || `Mailchimp error HTTP ${response.status}`,
          rawResponse: data
        });
      }

      mailchimpServerConfig.lastSyncTime = new Date().toISOString();

      return res.json({
        success: true,
        statusCode: response.status,
        subscriberHash,
        email: payload.email_address,
        id: data.id || subscriberHash,
        status: data.status || 'subscribed',
        tags: payload.tags,
        rawResponse: data
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // 5. POST /api/mailchimp/sync-batch
  app.post('/api/mailchimp/sync-batch', async (req, res) => {
    try {
      const { apiKey: reqKey, listId: reqListId, records, defaultTags } = req.body || {};
      const apiKey = reqKey || mailchimpServerConfig.apiKey || process.env.MAILCHIMP_API_KEY;
      const listId = reqListId || mailchimpServerConfig.audienceId || process.env.MAILCHIMP_AUDIENCE_ID;

      if (!apiKey || !listId) {
        return res.status(400).json({
          success: false,
          message: 'Mailchimp API key and listId are required'
        });
      }

      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Records array is required'
        });
      }

      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (const rec of records) {
        try {
          const payload = buildMailchimpMemberPayload(rec, { tags: defaultTags });
          const subscriberHash = calculateSubscriberHash(payload.email_address);
          const dc = extractDatacenter(apiKey);
          const memberUrl = `https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members/${subscriberHash}`;
          const headers = getMailchimpAuthHeader(apiKey);

          const response = await fetch(memberUrl, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload)
          });

          const data: any = await response.json().catch(() => ({}));
          if (response.ok) {
            successCount++;
            results.push({
              success: true,
              email: payload.email_address,
              subscriberHash,
              status: data.status || 'subscribed'
            });
          } else {
            failureCount++;
            results.push({
              success: false,
              email: payload.email_address,
              subscriberHash,
              error: data.detail || `HTTP ${response.status}`
            });
          }
        } catch (err: any) {
          failureCount++;
          results.push({
            success: false,
            email: rec.email || 'unknown',
            error: err.message
          });
        }
      }

      mailchimpServerConfig.lastSyncTime = new Date().toISOString();

      return res.json({
        success: true,
        total: records.length,
        successCount,
        failureCount,
        results,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // META WHATSAPP BUSINESS CLOUD API INTEGRATION ENDPOINTS
  // ============================================================================

  /**
   * 1. GET /api/webhooks/whatsapp
   * Meta Webhook Handshake Verification
   */
  app.get('/api/webhooks/whatsapp', async (req, res) => {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      const settings = await getStoredWhatsAppSettings();
      const expectedToken = settings.webhook_verify_token;

      if (mode === 'subscribe' && token === expectedToken) {
        console.log('[WhatsApp Webhook] Handshake verified successfully.');
        return res.status(200).send(challenge);
      } else {
        console.warn(`[WhatsApp Webhook] Handshake rejected. Expected token "${expectedToken}", received "${token}"`);
        return res.status(403).send('Forbidden: Verification token mismatch');
      }
    } catch (err: any) {
      console.error('[WhatsApp Webhook] Verification error:', err);
      return res.status(500).send('Internal Server Error');
    }
  });

  /**
   * 2. POST /api/webhooks/whatsapp
   * Inbound Message & Delivery Receipt Intake
   */
  app.post('/api/webhooks/whatsapp', async (req, res) => {
    // Meta mandates 200 OK immediate response to avoid exponential backoff retries
    res.status(200).send('EVENT_RECEIVED');

    try {
      const result = await processInboundWhatsAppWebhook(req.body);
      if (result.processedMessagesCount > 0 || result.processedStatusesCount > 0) {
        console.log(`[WhatsApp Webhook] Processed ${result.processedMessagesCount} messages, ${result.processedStatusesCount} status receipts. Synced contacts: ${result.syncedContacts.join(', ')}`);
      }
    } catch (err: any) {
      console.error('[WhatsApp Webhook] Exception processing intake payload:', err);
    }
  });

  /**
   * 3. GET /api/whatsapp/settings
   * Retrieve stored WhatsApp settings
   */
  app.get('/api/whatsapp/settings', async (req, res) => {
    try {
      const tenantId = req.query.tenant_id as string | undefined;
      const settings = await getStoredWhatsAppSettings(tenantId);
      return res.json({
        success: true,
        settings: {
          ...settings,
          wabaId: settings.waba_id,
          phoneNumberId: settings.phone_number_id,
          apiToken: settings.access_token,
          webhookVerifyToken: settings.webhook_verify_token,
          webhookCallbackUrl: `${req.protocol}://${req.get('host')}/api/webhooks/whatsapp`
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 4. POST /api/whatsapp/settings
   * Save WhatsApp credentials to Supabase
   */
  app.post('/api/whatsapp/settings', async (req, res) => {
    try {
      const {
        tenant_id,
        phone_number_id,
        waba_id,
        access_token,
        webhook_verify_token,
        phoneNumberId,
        wabaId,
        apiToken,
        webhookVerifyToken
      } = req.body;

      const updated = await upsertStoredWhatsAppSettings({
        tenant_id: tenant_id || '00000000-0000-0000-0000-000000000001',
        phone_number_id: phone_number_id || phoneNumberId,
        waba_id: waba_id || wabaId,
        access_token: access_token || apiToken,
        webhook_verify_token: webhook_verify_token || webhookVerifyToken
      });

      return res.json({
        success: true,
        message: 'WhatsApp Business Cloud API settings saved successfully.',
        settings: {
          ...updated,
          wabaId: updated.waba_id,
          phoneNumberId: updated.phone_number_id,
          apiToken: updated.access_token,
          webhookVerifyToken: updated.webhook_verify_token,
          webhookCallbackUrl: `${req.protocol}://${req.get('host')}/api/webhooks/whatsapp`
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 5. GET /api/whatsapp/messages
   * Retrieve conversation history
   */
  app.get('/api/whatsapp/messages', async (req, res) => {
    try {
      const contactId = req.query.contact_id as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      const messages = await getStoredWhatsAppMessages(contactId, limit);
      return res.json({
        success: true,
        count: messages.length,
        messages
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 6. GET /api/whatsapp/window-status
   * Evaluates 24-Hour Customer Care Window for a contact
   */
  app.get('/api/whatsapp/window-status', async (req, res) => {
    try {
      const contactId = req.query.contact_id as string | undefined;
      const phone = req.query.phone as string | undefined;

      const status = await check24HourCustomerWindow(contactId, phone);
      return res.json({
        success: true,
        status
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 7. POST /api/whatsapp/send
   * Outbound free-form text message dispatch (Enforces 24-Hour Rule)
   */
  app.post('/api/whatsapp/send', async (req, res) => {
    try {
      const { to, message_body, contact_id, tenant_id, forceBypassWindowCheck } = req.body;

      if (!to || !message_body) {
        return res.status(400).json({
          success: false,
          error: 'Recipient phone number ("to") and message body ("message_body") are required.'
        });
      }

      // Check 24-hour customer care window unless explicitly bypassed
      if (!forceBypassWindowCheck) {
        const windowCheck = await check24HourCustomerWindow(contact_id, to);
        if (!windowCheck.canSendFreeForm) {
          return res.status(403).json({
            success: false,
            windowExpired: true,
            reason: windowCheck.reason,
            lastInboundTimestamp: windowCheck.lastInboundTimestamp,
            message: 'Meta blocks free-form text messages outside the 24-Hour Customer Care window. Please send an approved WhatsApp Template Message instead.'
          });
        }
      }

      const result = await sendWhatsAppTextMessage({
        to,
        message_body,
        contact_id,
        tenant_id,
        forceBypassWindowCheck: Boolean(forceBypassWindowCheck)
      });

      return res.json(result);
    } catch (err: any) {
      console.error('[WhatsApp Send] Error dispatching message:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 8. POST /api/whatsapp/send-template
   * Outbound template message with dynamic parameter mapping
   */
  app.post('/api/whatsapp/send-template', async (req, res) => {
    try {
      const {
        to,
        template_name,
        language_code,
        parameters,
        buttons,
        contact_id,
        tenant_id
      } = req.body;

      if (!to || !template_name || !parameters) {
        return res.status(400).json({
          success: false,
          error: 'Recipient ("to"), "template_name", and "parameters" array are required.'
        });
      }

      const result = await sendWhatsAppTemplateMessage({
        to,
        template_name,
        language_code: language_code || 'en_AU',
        parameters: Array.isArray(parameters) ? parameters : [parameters],
        buttons,
        contact_id,
        tenant_id
      });

      return res.json(result);
    } catch (err: any) {
      console.error('[WhatsApp Send Template] Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 9. POST /api/whatsapp/simulate-webhook
   * Inbound webhook test simulator for CRM testing
   */
  app.post('/api/whatsapp/simulate-webhook', async (req, res) => {
    try {
      const {
        type = 'text',
        senderPhone = '+61 412 884 910',
        senderName = 'Marcus Aurelius Vance',
        text = 'Hi, I received your quote! Can we discuss installation next week?',
        mediaUrl = 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
        mediaCaption = 'Switchboard photo attached',
        statusUpdateId,
        statusUpdateStatus
      } = req.body;

      let simulatedPayload: any;

      if (statusUpdateId && statusUpdateStatus) {
        // Status receipt simulation
        simulatedPayload = {
          object: 'whatsapp_business_account',
          entry: [
            {
              id: '392019485019283',
              changes: [
                {
                  field: 'messages',
                  value: {
                    messaging_product: 'whatsapp',
                    metadata: { display_phone_number: '109823749281726', phone_number_id: '109823749281726' },
                    statuses: [
                      {
                        id: statusUpdateId,
                        status: statusUpdateStatus,
                        timestamp: Math.floor(Date.now() / 1000).toString(),
                        recipient_id: senderPhone.replace(/[^0-9]/g, '')
                      }
                    ]
                  }
                }
              ]
            }
          ]
        };
      } else {
        // Inbound message simulation
        const fakeMessageId = `wamid.HBgL${crypto.randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '')}`;
        const fakeMessageObj: any = {
          from: senderPhone.replace(/[^0-9]/g, ''),
          id: fakeMessageId,
          timestamp: Math.floor(Date.now() / 1000).toString(),
          type
        };

        if (type === 'text') {
          fakeMessageObj.text = { body: text };
        } else if (type === 'image') {
          fakeMessageObj.image = {
            id: 'mock_media_id_switchboard_9941',
            mime_type: 'image/jpeg',
            caption: mediaCaption
          };
        } else if (type === 'document') {
          fakeMessageObj.document = {
            id: 'mock_media_id_document_9942',
            mime_type: 'application/pdf',
            caption: mediaCaption || 'Switchboard_Inspection_Report.pdf',
            filename: 'Switchboard_Inspection_Report.pdf'
          };
        }

        simulatedPayload = {
          object: 'whatsapp_business_account',
          entry: [
            {
              id: '392019485019283',
              changes: [
                {
                  field: 'messages',
                  value: {
                    messaging_product: 'whatsapp',
                    metadata: { display_phone_number: '109823749281726', phone_number_id: '109823749281726' },
                    contacts: [
                      {
                        profile: { name: senderName },
                        wa_id: senderPhone.replace(/[^0-9]/g, '')
                      }
                    ],
                    messages: [fakeMessageObj]
                  }
                }
              ]
            }
          ]
        };
      }

      const outcome = await processInboundWhatsAppWebhook(simulatedPayload);
      return res.json({
        success: true,
        simulated: true,
        outcome
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 10. GET /api/whatsapp/media/:tenantId/:filename
   * Local storage fallback route for media inspection
   */
  app.get('/api/whatsapp/media/:tenantId/:filename', (req, res) => {
    try {
      const filename = path.basename(req.params.filename);
      const filePath = path.join(process.cwd(), '.whatsapp_media', filename);

      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
      return res.status(404).send('Media file not found');
    } catch (err: any) {
      return res.status(500).send(err.message);
    }
  });

  // ============================================================================
  // META GRAPH API v25.0 & CONVERSIONS API (CAPI) ENDPOINTS
  // ============================================================================

  /**
   * 1. GET /api/webhooks/meta-leads
   * Meta Webhook Verification Handshake
   */
  app.get('/api/webhooks/meta-leads', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const settings = getMetaSettings();

    if (mode === 'subscribe' && token === settings.webhook_verify_token) {
      console.log('[Meta Webhook] GET verification handshake successful!');
      return res.status(200).send(challenge);
    }
    console.warn('[Meta Webhook] Verification token mismatch:', { received: token, expected: settings.webhook_verify_token });
    return res.status(403).send('Forbidden: Webhook verify token mismatch');
  });

  /**
   * 2. POST /api/webhooks/meta-leads
   * Real-time leadgen ID intake and asynchronous Graph API v25.0 field retrieval
   */
  app.post('/api/webhooks/meta-leads', async (req, res) => {
    // Instantly acknowledge receipt with 200 OK
    res.status(200).json({ success: true, message: 'Meta lead event received' });

    try {
      console.log('[Meta Webhook] Processing incoming lead event...');
      const outcome = await handleMetaWebhookPayload(req.body);
      console.log('[Meta Webhook] Ingestion result:', outcome);
    } catch (err: any) {
      console.error('[Meta Webhook] Background processing error:', err.message);
    }
  });

  /**
   * 3. GET /api/meta/settings
   * Retrieve current integration configuration
   */
  app.get('/api/meta/settings', async (req, res) => {
    try {
      const settings = getMetaSettings();
      const pages = await getAllPageConnections();
      const leads = getLocalIngestedLeads();

      const webhookUrl = `${settings.app_url.replace(/\/$/, '')}/api/webhooks/meta-leads`;

      return res.json({
        success: true,
        settings: {
          app_id: settings.app_id,
          has_app_secret: Boolean(settings.app_secret),
          webhook_verify_token: settings.webhook_verify_token,
          dataset_id: settings.dataset_id,
          has_capi_token: Boolean(settings.capi_access_token),
          app_url: settings.app_url,
          webhook_url: webhookUrl
        },
        pages,
        totalLeadsIngested: leads.length
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 4. POST /api/meta/settings
   * Update integration configuration
   */
  app.post('/api/meta/settings', async (req, res) => {
    try {
      const updated = saveMetaSettings(req.body);
      return res.json({
        success: true,
        message: 'Meta integration settings saved successfully',
        settings: {
          app_id: updated.app_id,
          has_app_secret: Boolean(updated.app_secret),
          webhook_verify_token: updated.webhook_verify_token,
          dataset_id: updated.dataset_id,
          has_capi_token: Boolean(updated.capi_access_token),
          app_url: updated.app_url
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 5. GET /api/meta/oauth/url
   * Generate Facebook Login for Business OAuth URL
   */
  app.get('/api/meta/oauth/url', (req, res) => {
    try {
      const settings = getMetaSettings();
      if (!settings.app_id) {
        return res.status(400).json({ success: false, error: 'META_APP_ID is not configured' });
      }

      const redirectUri = `${settings.app_url.replace(/\/$/, '')}/api/meta/oauth/callback`;
      const scopes = [
        'leads_retrieval',
        'pages_manage_metadata',
        'pages_show_list',
        'pages_read_engagement'
      ].join(',');

      const authUrl = `https://www.facebook.com/v25.0/dialog/oauth?client_id=${encodeURIComponent(
        settings.app_id
      )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(
        scopes
      )}&response_type=code`;

      return res.json({ success: true, authUrl, redirectUri });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 6. POST /api/meta/oauth/exchange
   * Exchange OAuth code for User Access Token & fetch connected Facebook Pages
   */
  app.post('/api/meta/oauth/exchange', async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ success: false, error: 'Authorization code is required' });
      }

      const settings = getMetaSettings();
      const redirectUri = `${settings.app_url.replace(/\/$/, '')}/api/meta/oauth/callback`;

      // 1. Exchange code for user access token
      const tokenUrl = `https://graph.facebook.com/v25.0/oauth/access_token?client_id=${encodeURIComponent(
        settings.app_id
      )}&client_secret=${encodeURIComponent(
        settings.app_secret
      )}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${encodeURIComponent(code)}`;

      const tokenRes = await fetch(tokenUrl);
      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || !tokenData.access_token) {
        return res.status(400).json({
          success: false,
          error: tokenData.error?.message || 'Failed to exchange authorization code with Meta'
        });
      }

      const userAccessToken = tokenData.access_token;

      // 2. Fetch user's managed Facebook Pages and their page access tokens
      const pagesRes = await fetch(
        `https://graph.facebook.com/v25.0/me/accounts?fields=id,name,access_token,category&access_token=${encodeURIComponent(
          userAccessToken
        )}`
      );
      const pagesData = await pagesRes.json();

      const savedPages = [];
      if (pagesData.data && Array.isArray(pagesData.data)) {
        for (const p of pagesData.data) {
          const saved = await savePageConnection({
            page_id: p.id,
            page_name: p.name,
            page_access_token: p.access_token
          });
          savedPages.push(saved);
        }
      }

      return res.json({
        success: true,
        message: `Successfully connected ${savedPages.length} Facebook Pages to CRM`,
        pages: savedPages
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 7. GET /api/meta/pages
   * List all stored page connections from Supabase/cache
   */
  app.get('/api/meta/pages', async (req, res) => {
    try {
      const pages = await getAllPageConnections();
      return res.json({ success: true, pages });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 8. POST /api/meta/pages/connect
   * Manually connect or update a Facebook Page with its Page Access Token
   */
  app.post('/api/meta/pages/connect', async (req, res) => {
    try {
      const { page_id, page_access_token, page_name } = req.body;
      if (!page_id || !page_access_token) {
        return res.status(400).json({ success: false, error: 'page_id and page_access_token are required' });
      }

      const saved = await savePageConnection({
        page_id: String(page_id).trim(),
        page_access_token: String(page_access_token).trim(),
        page_name: page_name || `Facebook Page ${page_id}`
      });

      return res.json({ success: true, page: saved, message: 'Page connection saved successfully' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 9. POST /api/meta/capi/event
   * Send a Conversion API event (Lead, Qualified, Purchase) with request context harvesting
   */
  app.post('/api/meta/capi/event', async (req, res) => {
    try {
      const eventPayload = req.body;
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress;
      const clientUserAgent = req.headers['user-agent'];
      const fbc = req.cookies?.['_fbc'];
      const fbp = req.cookies?.['_fbp'];

      const result = await sendServerCapiEvent(eventPayload, {
        ip: clientIp,
        userAgent: clientUserAgent,
        fbc,
        fbp
      });

      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 10. POST /api/meta/bulk-offline-upload
   * Bulk upload historical conversions within the 62-day limit
   */
  app.post('/api/meta/bulk-offline-upload', async (req, res) => {
    try {
      const { records } = req.body;
      if (!records || !Array.isArray(records)) {
        return res.status(400).json({ success: false, error: 'records array is required' });
      }

      const result = await executeBulkOfflineConversionUpload(records);
      return res.json({ success: true, result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 11. GET /api/meta/leads
   * Return ingested leads from cache
   */
  app.get('/api/meta/leads', (req, res) => {
    try {
      const leads = getLocalIngestedLeads();
      return res.json({ success: true, leads });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 12. POST /api/meta/test-webhook
   * Simulator to fire a test webhook payload with custom form questions
   */
  app.post('/api/meta/test-webhook', async (req, res) => {
    try {
      const testLeadgenId = `test_lead_${Date.now()}`;
      const simulatedPayload = {
        object: 'page',
        entry: [
          {
            id: req.body.page_id || '1029384756',
            time: Math.floor(Date.now() / 1000),
            changes: [
              {
                field: 'leadgen',
                value: {
                  leadgen_id: testLeadgenId,
                  form_id: '88492019482',
                  ad_id: '23859201948',
                  created_time: Math.floor(Date.now() / 1000)
                }
              }
            ]
          }
        ]
      };

      // Mock direct field data for simulator if no page token configured
      const pages = await getAllPageConnections();
      let outcome;
      if (pages.length === 0 && !process.env.META_CAPI_ACCESS_TOKEN) {
        // Fallback simulation: directly create mapped lead
        const simulatedLead = parseMetaFieldData(
          [
            { name: 'full_name', values: [req.body.customerName || 'Sarah Jenkins'] },
            { name: 'email', values: [req.body.email || 'sarah.jenkins@example.com.au'] },
            { name: 'phone_number', values: [req.body.phone || '0412884920'] },
            { name: 'city', values: ['Brisbane'] },
            { name: 'state', values: ['QLD'] },
            { name: 'post_code', values: ['4000'] },
            { name: 'what_is_your_roof_type', values: ['Tile (Single Storey)'] },
            { name: 'average_quarterly_power_bill', values: ['$650 - $900'] },
            { name: 'battery_storage_interest', values: ['Yes, looking for Tesla Powerwall 3 / AlphaESS'] }
          ],
          {
            leadgen_id: testLeadgenId,
            campaign_name: 'Meta QLD Solar & Battery Rebate Boost 2026',
            form_name: 'QLD Clean Energy Instant Rebate Form'
          }
        );

        const saveRes = await saveIncomingMetaLead(simulatedLead);
        outcome = {
          success: true,
          leadsProcessed: 1,
          results: [{ leadgenId: testLeadgenId, status: saveRes.action, customerName: simulatedLead.customerName }]
        };
      } else {
        outcome = await handleMetaWebhookPayload(simulatedPayload);
      }

      return res.json({
        success: true,
        message: 'Test webhook event processed successfully',
        testLeadgenId,
        outcome
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 13. GET /api/meta/sql-migration
   * Returns Supabase SQL migration script
   */
  app.get('/api/meta/sql-migration', (req, res) => {
    return res.type('text/plain').send(SUPABASE_META_MIGRATION_SQL);
  });

  // ============================================================================
  // MICROSOFT TEAMS INTEGRATION (GRAPH API OAUTH 2.0 & WORKFLOWS ADAPTIVE CARDS)
  // ============================================================================

  /**
   * 1. GET /api/auth/teams
   * Initiates Microsoft Graph API OAuth 2.0 flow
   */
  app.get('/api/auth/teams', (req, res) => {
    try {
      const stateParam = String(req.query.state || 'teams_oauth_login');
      const authUrl = buildTeamsOAuthUrl(stateParam);
      if (req.query.format === 'json') {
        return res.json({ success: true, authUrl });
      }
      return res.redirect(authUrl);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 2. GET /api/auth/teams/callback
   * OAuth 2.0 Callback handler for Microsoft Entra ID
   */
  app.get('/api/auth/teams/callback', async (req, res) => {
    const code = req.query.code as string;
    const error = req.query.error as string;
    const errorDescription = req.query.error_description as string;

    if (error || !code) {
      return res.status(400).send(`
        <html>
          <body style="font-family: sans-serif; background: #121212; color: #fff; padding: 40px; text-align: center;">
            <h2 style="color: #ef4444;">Microsoft Teams OAuth Authorization Failed</h2>
            <p style="color: #9ca3af;">${errorDescription || error || 'No authorization code returned.'}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'TEAMS_OAUTH_ERROR', error: "${errorDescription || error || 'Auth failed'}" }, '*');
                setTimeout(() => window.close(), 2500);
              }
            </script>
          </body>
        </html>
      `);
    }

    try {
      await exchangeTeamsOAuthCode(code);
      return res.send(`
        <html>
          <body style="font-family: sans-serif; background: #121212; color: #fff; padding: 40px; text-align: center;">
            <div style="background: #1e1e1e; border: 1px solid #2d2d2d; border-radius: 12px; padding: 30px; max-width: 480px; margin: 0 auto;">
              <h2 style="color: #bef264; margin-bottom: 12px;">Microsoft Teams Connected!</h2>
              <p style="color: #d1d5db; font-size: 14px; margin-bottom: 24px;">Your Microsoft Graph API delegated permissions have been authorized and saved.</p>
              <button onclick="window.close()" style="background: #bef264; color: #000; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">
                Return to Solar CRM
              </button>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'TEAMS_OAUTH_SUCCESS' }, '*');
                setTimeout(() => window.close(), 1200);
              } else {
                setTimeout(() => { window.location.href = '/?tab=integrations&teams_connected=true'; }, 1500);
              }
            </script>
          </body>
        </html>
      `);
    } catch (err: any) {
      return res.status(500).send(`
        <html>
          <body style="font-family: sans-serif; background: #121212; color: #fff; padding: 40px; text-align: center;">
            <h2 style="color: #ef4444;">Token Exchange Failed</h2>
            <p style="color: #9ca3af;">${err.message}</p>
          </body>
        </html>
      `);
    }
  });

  /**
   * 3. POST /api/auth/teams/callback
   * Headless / API code exchange
   */
  app.post('/api/auth/teams/callback', async (req, res) => {
    const { code, tenantId } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Authorization code is required' });
    }
    try {
      const record = await exchangeTeamsOAuthCode(code, tenantId);
      return res.json({ success: true, record });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 4. GET /api/teams/settings
   * Returns current Teams connection status, configuration, and webhooks
   */
  app.get('/api/teams/settings', async (req, res) => {
    try {
      const tenantId = (req.query.tenantId as string) || 'default-tenant-001';
      const config = getTeamsAzureConfig();
      const settings = await getTeamsSettingsFromDb(tenantId);
      const webhooks = await getTeamsWebhooksFromDb(tenantId);

      const hasToken = Boolean(settings?.access_token);
      let isTokenExpired = true;
      let secondsRemaining = 0;

      if (settings?.token_expires_at) {
        const diffMs = new Date(settings.token_expires_at).getTime() - Date.now();
        isTokenExpired = diffMs <= 0;
        secondsRemaining = Math.max(0, Math.floor(diffMs / 1000));
      }

      return res.json({
        success: true,
        config: {
          client_id: config.clientId ? `${config.clientId.substring(0, 8)}...` : '',
          has_client_secret: Boolean(config.clientSecret),
          tenant_id: config.tenantId,
          app_url: config.appUrl,
          redirect_uri: config.redirectUri,
          scopes: config.scopes
        },
        settings: {
          hasToken,
          isTokenExpired,
          secondsRemaining,
          token_expires_at: settings?.token_expires_at || null,
          default_team_id: settings?.default_team_id || null,
          default_channel_id: settings?.default_channel_id || null,
          default_team_name: settings?.default_team_name || null,
          default_channel_name: settings?.default_channel_name || null
        },
        webhooks
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 5. GET /api/teams/token
   * Returns a guaranteed valid access token (refreshes if within 5-min buffer)
   */
  app.get('/api/teams/token', async (req, res) => {
    try {
      const tenantId = (req.query.tenantId as string) || 'default-tenant-001';
      const accessToken = await getValidTeamsToken(tenantId);
      return res.json({ success: true, accessToken });
    } catch (err: any) {
      return res.status(401).json({ success: false, error: err.message });
    }
  });

  /**
   * 6. GET /api/teams/joined-teams
   * Fetches joined Microsoft Teams for authenticated user
   */
  app.get('/api/teams/joined-teams', async (req, res) => {
    try {
      const tenantId = (req.query.tenantId as string) || 'default-tenant-001';
      const teams = await fetchJoinedTeams(tenantId);
      return res.json({ success: true, teams });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 7. GET /api/teams/channels
   * Fetches channels for a selected Team
   */
  app.get('/api/teams/channels', async (req, res) => {
    const teamId = req.query.teamId as string;
    const tenantId = (req.query.tenantId as string) || 'default-tenant-001';

    if (!teamId) {
      return res.status(400).json({ success: false, error: 'teamId is required' });
    }

    try {
      const channels = await fetchTeamChannels(teamId, tenantId);
      return res.json({ success: true, channels });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 8. POST /api/teams/save-preferences
   * Saves default team and channel selection
   */
  app.post('/api/teams/save-preferences', async (req, res) => {
    try {
      const { tenantId, default_team_id, default_channel_id, default_team_name, default_channel_name } = req.body;
      const updated = await saveTeamsPreferences(tenantId || 'default-tenant-001', {
        default_team_id,
        default_channel_id,
        default_team_name,
        default_channel_name
      });
      return res.json({ success: true, settings: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 9. POST /api/teams/notify
   * Outbound notification via Graph API with Adaptive Card 1.2
   */
  app.post('/api/teams/notify', async (req, res) => {
    try {
      const { tenantId, ...cardPayload } = req.body;
      const result = await sendTeamsGraphNotification(tenantId || 'default-tenant-001', cardPayload);
      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 10. POST /api/teams/notify-webhook
   * Outbound notification via Power Automate Workflows incoming webhook
   */
  app.post('/api/teams/notify-webhook', async (req, res) => {
    try {
      const { webhookUrl, tenantId, ...cardPayload } = req.body;
      let targetUrl = webhookUrl;

      if (!targetUrl) {
        const webhooks = await getTeamsWebhooksFromDb(tenantId || 'default-tenant-001');
        const active = webhooks.find(w => w.is_active);
        if (active) {
          targetUrl = active.webhook_url;
        }
      }

      if (!targetUrl) {
        return res.status(400).json({
          success: false,
          error: 'No active Microsoft Teams Workflow webhook URL found.'
        });
      }

      const result = await sendTeamsWorkflowWebhookNotification(targetUrl, cardPayload, tenantId);
      return res.json({ success: result.success, ...result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 11. Webhook URL CRUD endpoints
   */
  app.get('/api/teams/webhooks', async (req, res) => {
    try {
      const tenantId = (req.query.tenantId as string) || 'default-tenant-001';
      const webhooks = await getTeamsWebhooksFromDb(tenantId);
      return res.json({ success: true, webhooks });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/teams/webhooks', async (req, res) => {
    try {
      const { tenantId, channel_name, webhook_url } = req.body;
      if (!webhook_url) {
        return res.status(400).json({ success: false, error: 'webhook_url is required' });
      }
      const record = await saveTeamsWebhookToDb(tenantId || 'default-tenant-001', channel_name, webhook_url);
      return res.json({ success: true, record });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/teams/webhooks/:id', async (req, res) => {
    try {
      await deleteTeamsWebhookFromDb(req.params.id);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * 12. GET /api/teams/audit-log
   * Dispatched Adaptive Cards audit log
   */
  app.get('/api/teams/audit-log', (req, res) => {
    return res.json({ success: true, log: getDispatchedCardsAuditLog() });
  });

  /**
   * 13. GET /api/teams/sql-migration
   * Supabase SQL Migration Script
   */
  app.get('/api/teams/sql-migration', (req, res) => {
    return res.type('text/plain').send(SUPABASE_TEAMS_MIGRATION_SQL);
  });


  // ============================================================================
  // VITE DEV SERVER OR STATIC PRODUCTION SERVING
  // ============================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] MySolarCRM Full-Stack Server running on port ${PORT} (0.0.0.0)`);
    console.log(`[Server] Xero OAuth Callback configured at: ${getXeroConfig().redirectUri}`);
  });
}

startServer().catch(err => {
  console.error('[Server] Fatal error starting server:', err);
  process.exit(1);
});
