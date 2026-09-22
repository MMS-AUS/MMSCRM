export interface GmailStatus {
  connected: boolean;
  emailAddress?: string;
  sendEnabled?: boolean;
  expiresAt?: string;
  isExpired?: boolean;
  latestHistoryId?: string | null;
  tokenStorage?: string;
  pubSubTopic?: string;
  updatedAt?: string;
  isConfigured?: boolean;
  redirectUri?: string;
  supabaseConfigured?: boolean;
  error?: string;
}

export interface GmailSetupInfo {
  configured: boolean;
  hasClientId: boolean;
  hasClientSecret: boolean;
  redirectUri: string;
  pubSubTopic: string;
  hasPubSubTopic: boolean;
  appUrl: string;
  supabaseConfigured: boolean;
  scopes: string[];
}

export interface CrmEmail {
  id: string;
  message_id: string;
  thread_id?: string;
  gmail_credentials_id?: string;
  direction: 'inbound' | 'outbound';
  from_address: string;
  to_addresses: string[];
  cc_addresses?: string[];
  subject: string;
  snippet?: string;
  body_html?: string;
  body_text?: string;
  contact_id?: string;
  contact_name?: string;
  company_id?: string;
  project_id?: string;
  ticket_id?: string;
  lead_id?: string;
  received_at: string;
  created_at?: string;
}

export interface SendEmailPayload {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  contactId?: string;
  projectId?: string;
  leadId?: string;
}

/**
 * Loads current live status of Gmail integration from the backend
 */
export async function getGmailLiveStatus(): Promise<GmailStatus> {
  try {
    const res = await fetch('/api/gmail/status');
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    return {
      connected: false,
      error: err.message || 'Failed to communicate with backend'
    };
  }
}

/**
 * Fetches Gmail configuration setup & diagnostic status
 */
export async function getGmailSetupInfo(): Promise<GmailSetupInfo> {
  const res = await fetch('/api/gmail/setup-info');
  if (!res.ok) throw new Error('Failed to load Gmail setup info');
  return res.json();
}

/**
 * 5. Toggles the "Allow CRM to Send Emails" switch in Supabase
 */
export async function toggleGmailSendEnabled(sendEnabled: boolean): Promise<{ success: boolean; sendEnabled: boolean; message: string }> {
  const res = await fetch('/api/gmail/toggle-send', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sendEnabled })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update sending toggle');
  }
  return data;
}

/**
 * 4.C Dispatches outbound email conditionally through Gmail API
 */
export async function sendGmailEmail(payload: SendEmailPayload): Promise<{ success: boolean; messageId: string; threadId: string }> {
  const res = await fetch('/api/gmail/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    // Return structured error including 403 send_enabled check
    const error: any = new Error(data.error || 'Failed to dispatch email');
    error.status = res.status;
    error.code = data.code;
    throw error;
  }
  return data;
}

/**
 * Fetches synced CRM emails linked to contacts and projects
 */
export async function getSyncedCrmEmails(filter?: {
  contactId?: string;
  projectId?: string;
  leadId?: string;
  direction?: string;
  search?: string;
  limit?: number;
}): Promise<CrmEmail[]> {
  const params = new URLSearchParams();
  if (filter?.contactId) params.append('contactId', filter.contactId);
  if (filter?.projectId) params.append('projectId', filter.projectId);
  if (filter?.leadId) params.append('leadId', filter.leadId);
  if (filter?.direction) params.append('direction', filter.direction);
  if (filter?.search) params.append('search', filter.search);
  if (filter?.limit) params.append('limit', String(filter.limit));

  const res = await fetch(`/api/gmail/emails?${params.toString()}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.emails || [];
}

/**
 * Manually triggers immediate mailbox sync
 */
export async function triggerGmailSyncNow(): Promise<{ success: boolean; count: number; latestHistoryId?: string }> {
  const res = await fetch('/api/gmail/sync-now', { method: 'POST' });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Sync request failed');
  }
  return data;
}

/**
 * Disconnects Gmail account and purges credentials row in Supabase
 */
export async function disconnectGmailAccount(): Promise<boolean> {
  try {
    localStorage.removeItem('personal_gmail_account_override');
    const res = await fetch('/api/gmail/disconnect', { method: 'POST' });
    return res.ok;
  } catch {
    return true;
  }
}

/**
 * Builds a direct URL to open Google's Personal Gmail Web Application compose window
 * with pre-filled To, Subject, and Body.
 */
export function buildGmailComposeUrl(params: {
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
}): string {
  const url = new URL('https://mail.google.com/mail/u/0/');
  url.searchParams.set('view', 'cm');
  url.searchParams.set('fs', '1');
  if (params.to) url.searchParams.set('to', params.to);
  if (params.cc) url.searchParams.set('cc', params.cc);
  if (params.bcc) url.searchParams.set('bcc', params.bcc);
  if (params.subject) url.searchParams.set('su', params.subject);
  if (params.body) url.searchParams.set('body', params.body);
  return url.toString();
}

/**
 * Direct connection for personal Gmail account (@gmail.com)
 */
export async function setPersonalGmailAccount(emailAddress: string, sendEnabled: boolean = true): Promise<boolean> {
  try {
    localStorage.setItem('personal_gmail_account_override', JSON.stringify({
      emailAddress,
      sendEnabled,
      connectedAt: new Date().toISOString()
    }));
    
    // Also notify server to register active personal address in credentials store
    await fetch('/api/auth/gmail/store-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: 'personal_client_session_' + Date.now(),
        email: emailAddress,
        displayName: emailAddress.split('@')[0]
      })
    }).catch(() => {});

    return true;
  } catch (err) {
    console.warn('Failed to set personal Gmail account:', err);
    return false;
  }
}

export function getStoredPersonalGmailOverride(): { emailAddress: string; sendEnabled: boolean } | null {
  try {
    const raw = localStorage.getItem('personal_gmail_account_override');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
