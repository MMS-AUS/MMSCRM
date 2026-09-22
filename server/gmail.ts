import {
  StoredGmailCredentials,
  StoredCrmEmail,
  upsertGmailCredentials,
  getStoredGmailCredentials,
  updateGmailLatestHistoryId,
  upsertCrmEmail,
  getSupabase
} from './supabase';

export const REQUIRED_GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'email',
  'profile'
];

export interface GmailConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  pubSubTopic: string;
  appUrl: string;
  isConfigured: boolean;
}

export function getGmailConfig(): GmailConfig {
  const clientId = process.env.GMAIL_CLIENT_ID || '';
  const clientSecret = process.env.GMAIL_CLIENT_SECRET || '';
  const appUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';

  let redirectUri = process.env.GMAIL_REDIRECT_URI || '';
  if (!redirectUri) {
    redirectUri = `${appUrl.replace(/\/$/, '')}/api/auth/gmail/callback`;
  }

  const pubSubTopic = process.env.GOOGLE_PUBSUB_TOPIC || '';

  return {
    clientId,
    clientSecret,
    redirectUri,
    pubSubTopic,
    appUrl,
    isConfigured: Boolean(clientId && clientSecret)
  };
}

/**
 * 3. Required Scopes & Authorization
 * Builds Google OAuth 2.0 consent URL with:
 * - access_type=offline (guarantees a refresh token)
 * - prompt=consent (forces consent screen to re-issue refresh token)
 * - required scopes: gmail.readonly, gmail.send, email, profile
 */
export function buildGmailAuthUrl(state: string): string {
  const config = getGmailConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: REQUIRED_GMAIL_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
    include_granted_scopes: 'true'
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * 4.A Exchanges authorization code for access_token and refresh_token
 */
export async function exchangeGmailCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  id_token?: string;
  token_type: string;
  scope: string;
}> {
  const config = getGmailConfig();
  const params = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code'
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google token exchange failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Fetches connected user email and profile from Google API
 */
export async function fetchGmailUserProfile(accessToken: string): Promise<{
  emailAddress: string;
  messagesTotal?: number;
  threadsTotal?: number;
  historyId?: string;
}> {
  if (!accessToken || typeof accessToken !== 'string' || !accessToken.startsWith('ya29.')) {
    return { emailAddress: '' };
  }

  // First try Gmail profile endpoint
  try {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return {
        emailAddress: data.emailAddress || '',
        messagesTotal: data.messagesTotal,
        threadsTotal: data.threadsTotal,
        historyId: data.historyId
      };
    }
  } catch {
    // Fall through to userinfo endpoint
  }

  // Fallback to Google Userinfo endpoint
  try {
    const userInfoResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (userInfoResp.ok) {
      const userInfo = await userInfoResp.json();
      return {
        emailAddress: userInfo.email || ''
      };
    }
  } catch {
    // Fall through
  }

  return { emailAddress: '' };
}

/**
 * 4.A Registers watch request to designated Pub/Sub topic
 * POST https://gmail.googleapis.com/gmail/v1/users/me/watch
 */
export async function registerGmailWatch(
  accessToken: string,
  topicName: string
): Promise<{ historyId: string; expiration: string } | null> {
  if (!topicName) {
    console.warn('[Gmail Watch] No GOOGLE_PUBSUB_TOPIC configured. Skipping Pub/Sub watch registration.');
    return null;
  }

  try {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/watch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topicName,
        labelIds: ['INBOX', 'SENT']
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[Gmail Watch] Warning registering watch (${response.status}): ${errText}`);
      return null;
    }

    const data = await response.json();
    console.log('[Gmail Watch] Successfully registered Pub/Sub watch:', data);
    return data;
  } catch (err: any) {
    console.error('[Gmail Watch] Exception during watch registration:', err.message || err);
    return null;
  }
}

/**
 * Stops watch request on mailbox
 */
export async function stopGmailWatch(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/stop', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    return response.ok;
  } catch (err) {
    return false;
  }
}

/**
 * Refreshes access token using refresh_token
 */
export async function refreshGmailAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
  token_type: string;
}> {
  const config = getGmailConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google token refresh failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Ensures an active, unexpired access token, refreshing if necessary
 */
export async function getValidGmailAccessToken(
  creds?: StoredGmailCredentials | null
): Promise<string> {
  let activeCreds = creds || await getStoredGmailCredentials();

  if (!activeCreds) {
    throw new Error('No Gmail credentials found. Please connect your Gmail account via OAuth first.');
  }

  const expiresAt = new Date(activeCreds.expires_at).getTime();
  const now = Date.now();
  // If expiring within 4 minutes and refresh_token exists, refresh
  if (expiresAt - now < 4 * 60 * 1000) {
    if (!activeCreds.refresh_token) {
      if (now > expiresAt) {
        throw new Error('Gmail session has expired. Please reconnect your Gmail account with the "Connect with Google" button.');
      }
      // Token is still technically valid for a few minutes
      return activeCreds.access_token;
    }

    console.log('[Gmail] Access token expired or expiring soon. Refreshing token...');
    const refreshResult = await refreshGmailAccessToken(activeCreds.refresh_token);

    const newExpiresAt = new Date(Date.now() + refreshResult.expires_in * 1000).toISOString();
    activeCreds.access_token = refreshResult.access_token;
    activeCreds.expires_at = newExpiresAt;

    await upsertGmailCredentials(activeCreds);
  }

  return activeCreds.access_token;
}

/**
 * Fetches message details from Gmail API
 */
export async function fetchGmailMessage(accessToken: string, messageId: string): Promise<any> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch message ${messageId}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetches history changes since startHistoryId
 */
export async function fetchGmailHistory(
  accessToken: string,
  startHistoryId: string
): Promise<{ history?: any[]; historyId?: string }> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${startHistoryId}&historyTypes=messageAdded`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    }
  );

  if (!response.ok) {
    // If historyId is too old (404), fall back to fetching latest messages
    return { history: [] };
  }

  return response.json();
}

/**
 * Fetches recent messages list
 */
export async function fetchRecentGmailMessagesList(
  accessToken: string,
  maxResults = 25
): Promise<any[]> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    }
  );

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.messages || [];
}

/**
 * Helper to decode base64/base64url strings from Gmail payload
 */
function decodeBase64(input?: string): string {
  if (!input) return '';
  try {
    const sanitized = input.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(sanitized, 'base64').toString('utf-8');
  } catch (err) {
    return '';
  }
}

/**
 * Parses raw Gmail message object into clean metadata and body
 */
export function parseGmailMessage(rawMessage: any, connectedEmail: string): StoredCrmEmail {
  const headers = rawMessage.payload?.headers || [];

  const getHeader = (name: string): string => {
    const found = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
    return found ? found.value : '';
  };

  const fromHeader = getHeader('From');
  const toHeader = getHeader('To');
  const ccHeader = getHeader('Cc');
  const subjectHeader = getHeader('Subject');
  const dateHeader = getHeader('Date');
  const messageIdHeader = getHeader('Message-ID');

  const extractEmails = (text: string): string[] => {
    if (!text) return [];
    const matches = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
    return matches ? Array.from(new Set(matches.map(m => m.toLowerCase()))) : [];
  };

  const fromEmails = extractEmails(fromHeader);
  const fromAddress = fromEmails[0] || fromHeader;
  const toAddresses = extractEmails(toHeader);
  const ccAddresses = extractEmails(ccHeader);

  // Determine direction: if From matches connected email or labelIds includes 'SENT', it's outbound
  const labels: string[] = rawMessage.labelIds || [];
  const isSent = labels.includes('SENT') || fromAddress.toLowerCase() === connectedEmail.toLowerCase();
  const direction: 'inbound' | 'outbound' = isSent ? 'outbound' : 'inbound';

  // Extract text and html bodies recursively
  let bodyText = '';
  let bodyHtml = '';

  const extractParts = (part: any) => {
    if (!part) return;
    const mimeType = part.mimeType || '';

    if (mimeType === 'text/plain' && part.body?.data) {
      bodyText += decodeBase64(part.body.data) + '\n';
    } else if (mimeType === 'text/html' && part.body?.data) {
      bodyHtml += decodeBase64(part.body.data) + '\n';
    }

    if (part.parts && Array.isArray(part.parts)) {
      part.parts.forEach(extractParts);
    }
  };

  if (rawMessage.payload) {
    if (rawMessage.payload.body?.data) {
      const mime = rawMessage.payload.mimeType || '';
      if (mime.includes('html')) {
        bodyHtml = decodeBase64(rawMessage.payload.body.data);
      } else {
        bodyText = decodeBase64(rawMessage.payload.body.data);
      }
    }
    if (rawMessage.payload.parts) {
      rawMessage.payload.parts.forEach(extractParts);
    }
  }

  let receivedAt = new Date().toISOString();
  if (rawMessage.internalDate) {
    receivedAt = new Date(parseInt(rawMessage.internalDate, 10)).toISOString();
  } else if (dateHeader) {
    const parsed = new Date(dateHeader);
    if (!isNaN(parsed.getTime())) {
      receivedAt = parsed.toISOString();
    }
  }

  return {
    message_id: rawMessage.id || messageIdHeader || `msg-${Date.now()}`,
    thread_id: rawMessage.threadId,
    direction,
    from_address: fromAddress,
    to_addresses: toAddresses.length > 0 ? toAddresses : [toHeader],
    cc_addresses: ccAddresses,
    subject: subjectHeader || '(No Subject)',
    snippet: rawMessage.snippet || '',
    body_html: bodyHtml.trim() || undefined,
    body_text: bodyText.trim() || rawMessage.snippet || '',
    received_at: receivedAt
  };
}

/**
 * Matches extracted email addresses against CRM Entities (Contacts, Leads, Projects, Tickets)
 */
export async function matchEmailToCrmEntities(emailData: StoredCrmEmail): Promise<{
  contact_id?: string;
  contact_name?: string;
  company_id?: string;
  project_id?: string;
  ticket_id?: string;
  lead_id?: string;
}> {
  const searchEmails = [
    emailData.from_address,
    ...(emailData.to_addresses || []),
    ...(emailData.cc_addresses || [])
  ].map(e => e.toLowerCase().trim()).filter(Boolean);

  const supabase = getSupabase();
  if (supabase) {
    try {
      // 1. Check contacts table
      const { data: contact } = await supabase
        .from('contacts')
        .select('id, name, company_id')
        .in('email', searchEmails)
        .limit(1)
        .maybeSingle();

      if (contact) {
        return {
          contact_id: contact.id,
          contact_name: contact.name,
          company_id: contact.company_id
        };
      }

      // 2. Check leads table
      const { data: lead } = await supabase
        .from('leads')
        .select('id, name, customer_email, project_id')
        .in('customer_email', searchEmails)
        .limit(1)
        .maybeSingle();

      if (lead) {
        return {
          lead_id: lead.id,
          contact_name: lead.name,
          project_id: lead.project_id
        };
      }

      // 3. Check projects table
      const { data: project } = await supabase
        .from('projects')
        .select('id, customer_name, customer_email')
        .in('customer_email', searchEmails)
        .limit(1)
        .maybeSingle();

      if (project) {
        return {
          project_id: project.id,
          contact_name: project.customer_name
        };
      }
    } catch (err) {
      // Non-blocking lookup error
    }
  }

  // Fallback: derive friendly contact name from email address if not in DB
  const primaryEmail = emailData.direction === 'inbound' ? emailData.from_address : (emailData.to_addresses[0] || '');
  const cleanName = primaryEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return {
    contact_name: cleanName || 'Solar Client'
  };
}

/**
 * Continuous Sync Runner: fetches and links messages for a mailbox
 */
export async function syncGmailMailbox(
  emailAddress?: string
): Promise<{ syncedCount: number; latestHistoryId?: string }> {
  const creds = await getStoredGmailCredentials(emailAddress);
  if (!creds) {
    throw new Error('No Gmail credentials available for syncing');
  }

  const accessToken = await getValidGmailAccessToken(creds);
  let messagesToFetch: { id: string; threadId?: string }[] = [];

  // Try history sync first if latest_history_id exists
  if (creds.latest_history_id) {
    try {
      const historyData = await fetchGmailHistory(accessToken, creds.latest_history_id);
      if (historyData.history && historyData.history.length > 0) {
        for (const item of historyData.history) {
          if (item.messagesAdded) {
            for (const ma of item.messagesAdded) {
              if (ma.message?.id) messagesToFetch.push(ma.message);
            }
          }
        }
      }
      if (historyData.historyId) {
        await updateGmailLatestHistoryId(creds.email_address, historyData.historyId);
      }
    } catch (err) {
      // History ID may be expired, fallback to recent messages
    }
  }

  // If no history messages or first sync, fetch recent messages
  if (messagesToFetch.length === 0) {
    messagesToFetch = await fetchRecentGmailMessagesList(accessToken, 15);
  }

  let syncedCount = 0;
  for (const msgRef of messagesToFetch) {
    try {
      const raw = await fetchGmailMessage(accessToken, msgRef.id);
      const parsed = parseGmailMessage(raw, creds.email_address);
      parsed.gmail_credentials_id = creds.id;

      // Link to CRM entities
      const linked = await matchEmailToCrmEntities(parsed);
      parsed.contact_id = linked.contact_id;
      parsed.contact_name = linked.contact_name;
      parsed.company_id = linked.company_id;
      parsed.project_id = linked.project_id;
      parsed.ticket_id = linked.ticket_id;
      parsed.lead_id = linked.lead_id;

      await upsertCrmEmail(parsed);
      syncedCount++;
    } catch (err: any) {
      console.warn(`[Gmail Sync] Error processing message ${msgRef.id}:`, err.message || err);
    }
  }

  return { syncedCount, latestHistoryId: creds.latest_history_id };
}

/**
 * 4.C Conditional Sending: Constructs RFC 2822 MIME message and calls POST /users/me/messages/send
 */
export async function sendGmailMimeMessage(
  accessToken: string,
  options: {
    from: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    bodyHtml?: string;
    bodyText?: string;
    inReplyTo?: string;
    references?: string;
  }
): Promise<{ id: string; threadId: string }> {
  const boundary = `__crm_boundary_${Date.now().toString(16)}__`;

  const headers: string[] = [
    `From: ${options.from}`,
    `To: ${options.to.join(', ')}`,
    `Subject: =?UTF-8?B?${Buffer.from(options.subject, 'utf-8').toString('base64')}?=`
  ];

  if (options.cc && options.cc.length > 0) {
    headers.push(`Cc: ${options.cc.join(', ')}`);
  }
  if (options.bcc && options.bcc.length > 0) {
    headers.push(`Bcc: ${options.bcc.join(', ')}`);
  }
  if (options.inReplyTo) {
    headers.push(`In-Reply-To: <${options.inReplyTo}>`);
  }
  if (options.references) {
    headers.push(`References: <${options.references}>`);
  }

  headers.push('MIME-Version: 1.0');
  headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

  const plainText = options.bodyText || options.bodyHtml?.replace(/<[^>]*>/g, '') || '';
  const htmlContent = options.bodyHtml || `<p>${plainText.replace(/\n/g, '<br/>')}</p>`;

  const bodyParts = [
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(plainText, 'utf-8').toString('base64'),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(htmlContent, 'utf-8').toString('base64'),
    '',
    `--${boundary}--`
  ];

  const fullEmail = `${headers.join('\r\n')}\r\n\r\n${bodyParts.join('\r\n')}`;
  const base64UrlEncoded = Buffer.from(fullEmail)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      raw: base64UrlEncoded
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail send failed (${response.status}): ${errorText}`);
  }

  return response.json();
}
