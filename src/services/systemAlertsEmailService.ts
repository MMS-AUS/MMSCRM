import {
  SystemEmailConfig,
  PersonalEmailIntegrationConfig,
  OutboundEmailLog,
  SystemAlertEvent,
  EmailSendResult,
  EmailDeliveryMode
} from '../types';

const SYSTEM_CONFIG_STORAGE_KEY = 'solar_system_default_email_config';
const LEGACY_CONFIG_STORAGE_KEY = 'solar_personal_email_config';
const OUTBOX_STORAGE_KEY = 'solar_system_outbound_email_ledger';

export const DEFAULT_SYSTEM_EMAIL_CONFIG: SystemEmailConfig = {
  deliveryMode: 'custom_smtp',
  smtpHost: '',
  smtpPort: 587,
  smtpUsername: '',
  smtpPassword: '',
  smtpSecure: false, // Default to false: Port 587 uses STARTTLS (secure=true causes TLS wrong version error)
  webhookUrl: '',
  webhookApiKey: '',
  webhookPayloadType: 'resend',
  senderEmail: '',
  senderName: 'Apex Solar Operations System',
  replyToEmail: '',
  adminAlertEmails: [],
  triggers: {
    newLeadAlert: true,
    leadProposalSentAlert: true,
    projectStageAlert: true,
    installOrderDispatchedAlert: true,
    serviceTicketAlert: true,
    xeroInvoiceAlert: true,
    staffInviteAlert: true,
    stcClaimAlert: true,
    customerPortalAlert: true
  },
  sendInAppNotification: true,
  sendBrowserPushNotification: true,
  lastUpdated: new Date().toISOString()
};

export const DEFAULT_PERSONAL_EMAIL_CONFIG = DEFAULT_SYSTEM_EMAIL_CONFIG;

/**
 * Retrieve system default email configuration
 */
export const getSystemEmailConfig = (): SystemEmailConfig => {
  try {
    const raw = localStorage.getItem(SYSTEM_CONFIG_STORAGE_KEY) || localStorage.getItem(LEGACY_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // If legacy cached config had port 587 with smtpSecure: true, normalize it to false
      const port = Number(parsed.smtpPort) || 587;
      const smtpSecure = port === 465 ? true : (port === 587 || port === 25 ? false : Boolean(parsed.smtpSecure));
      const hasSmtp = Boolean(parsed.smtpHost && parsed.smtpUsername);

      return {
        ...DEFAULT_SYSTEM_EMAIL_CONFIG,
        ...parsed,
        deliveryMode: parsed.deliveryMode || (hasSmtp ? 'custom_smtp' : DEFAULT_SYSTEM_EMAIL_CONFIG.deliveryMode),
        smtpPort: port,
        smtpSecure: smtpSecure,
        adminAlertEmails: Array.isArray(parsed.adminAlertEmails) ? parsed.adminAlertEmails : [],
        triggers: {
          ...DEFAULT_SYSTEM_EMAIL_CONFIG.triggers,
          ...(parsed.triggers || {})
        }
      };
    }
  } catch (e) {
    console.error('Failed to load system email config:', e);
  }
  return DEFAULT_SYSTEM_EMAIL_CONFIG;
};

export const getPersonalEmailConfig = getSystemEmailConfig;

/**
 * Save system default email configuration asynchronously (with guaranteed server sync)
 */
export const saveSystemEmailConfigAsync = async (config: Partial<SystemEmailConfig>): Promise<SystemEmailConfig> => {
  try {
    const current = getSystemEmailConfig();
    const port = config.smtpPort !== undefined ? Number(config.smtpPort) || 587 : current.smtpPort;
    const smtpSecure = config.smtpSecure !== undefined
      ? (port === 465 ? true : (port === 587 || port === 25 ? false : Boolean(config.smtpSecure)))
      : (port === 465 ? true : (port === 587 || port === 25 ? false : current.smtpSecure));

    const host = config.smtpHost !== undefined ? config.smtpHost : current.smtpHost;
    const user = config.smtpUsername !== undefined ? config.smtpUsername : current.smtpUsername;
    const hasSmtp = Boolean(host && user);
    const mode = config.deliveryMode || (hasSmtp ? 'custom_smtp' : current.deliveryMode);

    const updated: SystemEmailConfig = {
      ...current,
      ...config,
      deliveryMode: mode,
      smtpPort: port,
      smtpSecure,
      adminAlertEmails: Array.isArray(config.adminAlertEmails) ? config.adminAlertEmails : (current.adminAlertEmails || []),
      triggers: {
        ...current.triggers,
        ...(config.triggers || {})
      },
      lastUpdated: new Date().toISOString()
    };
    try {
      localStorage.setItem(SYSTEM_CONFIG_STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    // Synchronize to backend server database
    try {
      const res = await fetch('/api/settings/system-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: updated })
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data && data.config) {
          return { ...updated, ...data.config };
        }
      }
    } catch (netErr) {
      console.warn('[SystemEmail] Backend config sync warning:', netErr);
    }

    return updated;
  } catch (e) {
    console.error('Failed to save system email config:', e);
    return getSystemEmailConfig();
  }
};

/**
 * Save system default email configuration
 */
export const saveSystemEmailConfig = (config: Partial<SystemEmailConfig>): SystemEmailConfig => {
  try {
    const current = getSystemEmailConfig();
    const port = config.smtpPort !== undefined ? Number(config.smtpPort) || 587 : current.smtpPort;
    const smtpSecure = config.smtpSecure !== undefined
      ? (port === 465 ? true : (port === 587 || port === 25 ? false : Boolean(config.smtpSecure)))
      : (port === 465 ? true : (port === 587 || port === 25 ? false : current.smtpSecure));

    const host = config.smtpHost !== undefined ? config.smtpHost : current.smtpHost;
    const user = config.smtpUsername !== undefined ? config.smtpUsername : current.smtpUsername;
    const hasSmtp = Boolean(host && user);
    const mode = config.deliveryMode || (hasSmtp ? 'custom_smtp' : current.deliveryMode);

    const updated: SystemEmailConfig = {
      ...current,
      ...config,
      deliveryMode: mode,
      smtpPort: port,
      smtpSecure,
      adminAlertEmails: Array.isArray(config.adminAlertEmails) ? config.adminAlertEmails : (current.adminAlertEmails || []),
      triggers: {
        ...current.triggers,
        ...(config.triggers || {})
      },
      lastUpdated: new Date().toISOString()
    };
    try {
      localStorage.setItem(SYSTEM_CONFIG_STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    // Non-blocking sync to backend server database
    fetch('/api/settings/system-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: updated })
    }).catch(err => {
      console.warn('[SystemEmail] Backend config sync warning:', err);
    });

    return updated;
  } catch (e) {
    console.error('Failed to save system email config:', e);
    return getSystemEmailConfig();
  }
};

export const savePersonalEmailConfig = saveSystemEmailConfig;

/**
 * Fetch and hydrate system email configuration from backend server database
 */
export const fetchServerSystemEmailConfig = async (): Promise<SystemEmailConfig> => {
  try {
    const res = await fetch(`/api/settings/system-email?_t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      const srvConfig = data?.config || (data?.key === 'system-email' ? data?.value : null);
      if (srvConfig && typeof srvConfig === 'object' && Object.keys(srvConfig).length > 0) {
        const local = getSystemEmailConfig();
        const hasSmtp = Boolean(srvConfig.smtpHost && srvConfig.smtpUsername);
        const merged: SystemEmailConfig = {
          ...DEFAULT_SYSTEM_EMAIL_CONFIG,
          ...local,
          ...srvConfig,
          deliveryMode: srvConfig.deliveryMode || (hasSmtp ? 'custom_smtp' : local.deliveryMode),
          adminAlertEmails: Array.isArray(srvConfig.adminAlertEmails) ? srvConfig.adminAlertEmails : (local.adminAlertEmails || []),
          triggers: {
            ...DEFAULT_SYSTEM_EMAIL_CONFIG.triggers,
            ...(local.triggers || {}),
            ...(srvConfig.triggers || {})
          }
        };
        try {
          localStorage.setItem(SYSTEM_CONFIG_STORAGE_KEY, JSON.stringify(merged));
        } catch {}
        return merged;
      }
    }
  } catch (err) {
    console.warn('[SystemEmail] Failed to fetch server email config:', err);
  }
  return getSystemEmailConfig();
};

/**
 * Verify SMTP connection and credentials against remote mail server
 */
export const verifySmtpSettings = async (
  customConfig?: Partial<SystemEmailConfig>
): Promise<{ success: boolean; message: string; details?: any }> => {
  const current = getSystemEmailConfig();
  const effective = { ...current, ...(customConfig || {}) };
  try {
    const res = await fetch('/api/email/verify-smtp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ smtpConfig: effective })
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to communicate with SMTP verification service'
    };
  }
};


/**
 * Retrieve Outbound Email Logs
 */
export const getOutboundEmailLogs = (): OutboundEmailLog[] => {
  try {
    const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to read outbound email logs:', e);
  }
  return [];
};

/**
 * Append an entry to Outbound Email Logs
 */
export const logOutboundEmail = (log: OutboundEmailLog) => {
  try {
    const existing = getOutboundEmailLogs();
    const updated = [log, ...existing].slice(0, 100); // keep last 100
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to log outbound email:', e);
  }
};

/**
 * Clear email logs
 */
export const clearOutboundEmailLogs = () => {
  try {
    localStorage.removeItem(OUTBOX_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear email logs:', e);
  }
};

/**
 * Universal System Email Sender
 * Supports:
 * 1. Personal Webhook / REST Gateway (Resend, SendGrid, Mailgun, or custom webhook)
 * 2. Custom SMTP Relay
 * 3. High-Fidelity Simulation / Audit Ledger Mode
 */
export async function sendSystemEmail(options: {
  to: string | string[];
  subject: string;
  bodyHtml: string;
  cc?: string[];
  bcc?: string[];
  category?: string;
  referenceId?: string;
  senderName?: string;
  senderEmail?: string;
  customConfig?: Partial<SystemEmailConfig>;
}): Promise<EmailSendResult> {
  const config = { ...getPersonalEmailConfig(), ...(options.customConfig || {}) };

  const fromName = options.senderName || config.senderName || 'Apex Solar Operations';
  // Sender email resolution: prefer options -> custom user senderEmail -> authenticated username -> fallback
  let fromEmail = options.senderEmail;
  if (!fromEmail) {
    if (config.senderEmail && !config.senderEmail.includes('apexsolar.com.au') && config.senderEmail !== 'default@system') {
      fromEmail = config.senderEmail;
    } else if (config.smtpUsername && config.smtpUsername.includes('@')) {
      fromEmail = config.smtpUsername;
    } else {
      fromEmail = config.senderEmail || 'alerts@apexsolar.com.au';
    }
  }

  const fromHeader = `${fromName} <${fromEmail}>`;
  const toList = Array.isArray(options.to) ? options.to : [options.to];
  const toStr = toList.join(', ');

  const snippet = options.bodyHtml
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);

  const timestamp = new Date().toISOString();
  let result: EmailSendResult = {
    success: false,
    messageId: `msg-${Date.now()}`,
    status: 'sent',
    channel: 'system_relay',
    timestamp
  };

  // 1. Personal Webhook / REST Gateway (e.g. Resend, SendGrid, Mailgun)
  if (config.deliveryMode === 'webhook_gateway' && config.webhookUrl) {
    try {
      let payload: any = {};
      let headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (config.webhookApiKey) {
        headers['Authorization'] = `Bearer ${config.webhookApiKey}`;
      }

      if (config.webhookPayloadType === 'resend') {
        payload = {
          from: fromHeader,
          to: toList,
          subject: options.subject,
          html: options.bodyHtml,
          cc: options.cc,
          reply_to: config.replyToEmail || fromEmail
        };
      } else if (config.webhookPayloadType === 'sendgrid') {
        payload = {
          personalizations: [
            {
              to: toList.map(email => ({ email })),
              cc: options.cc?.map(email => ({ email }))
            }
          ],
          from: { email: fromEmail, name: fromName },
          subject: options.subject,
          content: [{ type: 'text/html', value: options.bodyHtml }]
        };
      } else {
        payload = {
          from: fromHeader,
          to: toStr,
          subject: options.subject,
          html: options.bodyHtml,
          category: options.category || 'system_alert',
          referenceId: options.referenceId
        };
      }

      const res = await fetch(config.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        result = {
          success: true,
          messageId: data.id || `wh-${Date.now()}`,
          status: 'delivered',
          channel: 'webhook_gateway',
          timestamp
        };
      } else {
        const errText = await res.text().catch(() => '');
        result = {
          success: false,
          messageId: `wh-err-${Date.now()}`,
          status: 'failed',
          channel: 'webhook_gateway',
          error: `Webhook returned HTTP ${res.status}: ${errText.slice(0, 100)}`,
          timestamp
        };
      }
    } catch (whErr: any) {
      result = {
        success: false,
        messageId: `wh-err-${Date.now()}`,
        status: 'failed',
        channel: 'webhook_gateway',
        error: whErr.message || 'Failed to dispatch to Webhook Gateway',
        timestamp
      };
    }
  }

  // 2. Custom SMTP Relay / Google App Password / Corporate Server
  // If deliveryMode is custom_smtp OR if user has configured SMTP parameters, dispatch via live SMTP server
  else if (config.deliveryMode === 'custom_smtp' || Boolean(config.smtpHost || config.smtpUsername || options.customConfig?.smtpHost)) {
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toList,
          cc: options.cc,
          bcc: options.bcc,
          subject: options.subject,
          html: options.bodyHtml,
          from: fromEmail,
          replyTo: config.replyToEmail || fromEmail,
          smtpConfig: {
            smtpHost: config.smtpHost,
            smtpPort: config.smtpPort,
            smtpUsername: config.smtpUsername,
            smtpPassword: config.smtpPassword,
            smtpSecure: config.smtpSecure,
            senderEmail: fromEmail,
            senderName: fromName,
            replyToEmail: config.replyToEmail || fromEmail
          }
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        result = {
          success: true,
          messageId: data.messageId || `smtp-${Date.now()}`,
          status: 'delivered',
          channel: 'custom_smtp',
          timestamp
        };
      } else {
        result = {
          success: false,
          messageId: `smtp-err-${Date.now()}`,
          status: 'failed',
          channel: 'custom_smtp',
          error: data.error || data.message || `SMTP dispatch returned HTTP ${res.status}`,
          timestamp
        };
      }
    } catch (sendErr: any) {
      result = {
        success: false,
        messageId: `smtp-err-${Date.now()}`,
        status: 'failed',
        channel: 'custom_smtp',
        error: sendErr.message || 'Network error communicating with SMTP mail server',
        timestamp
      };
    }
  }

  // 3. Simulation Audit Mode (only if explicitly selected without SMTP credentials)
  else {
    result = {
      success: true,
      messageId: `sim-${Date.now()}`,
      status: 'simulated',
      channel: 'system_relay',
      timestamp
    };
  }

  // Record in Outbound Email Ledger
  logOutboundEmail({
    id: result.messageId,
    timestamp,
    to: toStr,
    from: fromHeader,
    subject: options.subject,
    snippet,
    bodyHtml: options.bodyHtml,
    status: result.status,
    channel: result.channel,
    category: options.category || 'System Alert',
    referenceId: options.referenceId,
    errorMessage: result.error
  });

  // Trigger optional browser notification if permitted
  if (config.sendBrowserPushNotification && typeof window !== 'undefined' && 'Notification' in window) {
    try {
      if (Notification.permission === 'granted') {
        new Notification(options.subject, {
          body: `Sent to ${toStr}: ${snippet}`,
          icon: '/favicon.ico'
        });
      }
    } catch {
      // ignore notification errors
    }
  }

  return result;
}

/**
 * Dispatch an automated System Alert Event
 * Automatically verifies if the specific trigger is enabled in config,
 * compiles a responsive Australian Solar template, and dispatches the email.
 */
export async function dispatchSystemAlert(event: SystemAlertEvent): Promise<EmailSendResult | null> {
  const config = getPersonalEmailConfig();

  // Check if this trigger type is enabled
  const triggers = config.triggers || DEFAULT_SYSTEM_EMAIL_CONFIG.triggers;
  const triggerMap: Record<SystemAlertEvent['type'], boolean> = {
    new_lead: triggers?.newLeadAlert ?? true,
    proposal_sent: triggers?.leadProposalSentAlert ?? true,
    project_milestone: triggers?.projectStageAlert ?? true,
    install_dispatched: triggers?.installOrderDispatchedAlert ?? true,
    ticket_created: triggers?.serviceTicketAlert ?? true,
    invoice_issued: triggers?.xeroInvoiceAlert ?? true,
    payment_received: triggers?.xeroInvoiceAlert ?? true,
    staff_invite: triggers?.staffInviteAlert ?? true,
    portal_access: triggers?.customerPortalAlert ?? true
  };

  if (triggerMap[event.type] === false) {
    console.log(`Alert dispatch skipped for ${event.type} (disabled in user settings)`);
    return null;
  }

  const htmlBody = generateSystemEmailHtml(event);

  // Validate and sanitize recipient
  const recipient = (event.recipientEmail || '').trim();
  if (!recipient || !recipient.includes('@') || recipient === 'default@system') {
    console.warn(`[SystemAlert] Skipped alert dispatch: invalid recipient "${event.recipientEmail}"`);
    return null;
  }

  // Combine direct recipient with Admin Alert Emails if applicable (safe array filter)
  const recipients = [recipient];
  const adminEmails = Array.isArray(config.adminAlertEmails) ? config.adminAlertEmails : [];
  const adminCc = adminEmails.filter(
    adminEmail => adminEmail &&
      adminEmail.trim().length > 3 &&
      adminEmail.includes('@') &&
      adminEmail.toLowerCase() !== recipient.toLowerCase() &&
      adminEmail !== 'default@system'
  );

  return await sendSystemEmail({
    to: recipients,
    cc: adminCc.length > 0 ? adminCc : undefined,
    subject: event.title,
    bodyHtml: htmlBody,
    category: event.type,
    referenceId: event.data?.referenceId || event.data?.id
  });
}

/**
 * Clean, responsive Australian Solar branded email generator
 */
export function generateSystemEmailHtml(event: SystemAlertEvent): string {
  const dateStr = new Date().toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let contentRows = '';
  if (event.data) {
    contentRows = Object.entries(event.data)
      .filter(([key]) => !['id', 'body', 'referenceId', 'password'].includes(key))
      .map(([key, val]) => {
        const formattedKey = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase())
          .trim();
        return `
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px; font-weight: 500; width: 38%;">${formattedKey}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 13px; font-weight: 600;">${String(val)}</td>
          </tr>
        `;
      })
      .join('');
  }

  const specialActionLink =
    event.data?.inviteLink || event.data?.portalUrl || event.data?.proposalUrl || event.data?.invoiceUrl;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
      <div style="background-color: #0f172a; padding: 24px 28px; border-bottom: 4px solid #bef264;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">Apex Solar Energy Systems</h1>
              <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px; font-weight: 500;">Clean Energy Council Accredited Operations &bull; Australian Solar CRM</p>
            </td>
            <td align="right">
              <span style="display: inline-block; background-color: rgba(190, 242, 100, 0.15); color: #bef264; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; border: 1px solid rgba(190, 242, 100, 0.3);">
                SYSTEM ALERT
              </span>
            </td>
          </tr>
        </table>
      </div>

      <div style="padding: 28px;">
        <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 18px; font-weight: 700;">
          ${event.title}
        </h2>
        <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
          Hello <strong>${event.recipientName}</strong>,
        </p>
        <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
          ${event.data?.description || event.data?.message || 'This is an automated operational notification generated by your Apex Solar CRM platform.'}
        </p>

        ${
          contentRows
            ? `
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px; overflow: hidden;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${contentRows}
            </table>
          </div>
        `
            : ''
        }

        ${
          specialActionLink
            ? `
          <div style="text-align: center; margin: 28px 0;">
            <a href="${specialActionLink}" style="display: inline-block; background-color: #0f172a; color: #bef264; font-weight: 700; font-size: 14px; padding: 12px 28px; text-decoration: none; border-radius: 8px; border: 1px solid #334155;">
              View Document &amp; Access Portal &rarr;
            </a>
          </div>
        `
            : ''
        }

        <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px 16px; margin-top: 20px;">
          <p style="margin: 0; color: #065f46; font-size: 12px; font-weight: 500;">
            &bull; Clean Energy Council accredited installation standards applied.<br/>
            &bull; STC compliance and DNSP grid application monitored in real-time.
          </p>
        </div>
      </div>

      <div style="background-color: #f8fafc; padding: 16px 28px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; line-height: 1.5;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <strong>Apex Solar Australia Pty Ltd</strong> | ABN: 74 123 456 789<br/>
              Support: 1300 SOLAR AU | support@solarinstallers.com.au
            </td>
            <td align="right" style="color: #94a3b8;">
              Dispatched: ${dateStr}
            </td>
          </tr>
        </table>
      </div>
    </div>
  `;
}

/**
 * Execute an immediate test email dispatch to verify deliverability.
 * FIX: Sender and recipient are segregated so the authenticated SMTP user is NOT spoofed by the target email.
 */
export async function sendTestEmail(
  targetEmail: string,
  customNotes?: string,
  customConfig?: Partial<SystemEmailConfig>
): Promise<EmailSendResult> {
  const config = { ...getPersonalEmailConfig(), ...(customConfig || {}) };
  const effectiveRecipient = (targetEmail && targetEmail.trim()) || config.smtpUsername || config.senderEmail;

  if (!effectiveRecipient) {
    return {
      success: false,
      messageId: `test-err-${Date.now()}`,
      status: 'failed',
      channel: 'custom_smtp',
      error: 'Please enter a valid recipient email address to receive the test dispatch.',
      timestamp: new Date().toISOString()
    };
  }

  // Sender email resolution: do not use the recipient as sender
  let senderEmail = (config.senderEmail && !config.senderEmail.includes('apexsolar.com.au') ? config.senderEmail : config.smtpUsername) || config.senderEmail;
  if (!senderEmail || !senderEmail.includes('@')) {
    senderEmail = config.smtpUsername || effectiveRecipient;
  }

  const testSubject = `[Live Verification] Solar CRM Deliverability Test (${config.deliveryMode.replace('_', ' ').toUpperCase()})`;
  const bodyHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="border-bottom: 2px solid #bef264; padding-bottom: 12px; margin-bottom: 16px;">
        <h2 style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 800;">Solar CRM Deliverability Test</h2>
        <span style="font-size: 12px; color: #64748b; font-weight: 600;">Automated System Alerts &amp; Notification Engine</span>
      </div>
      <p style="font-size: 14px; color: #334155; line-height: 1.6;">
        Success! If you are reading this email, your <strong>${config.deliveryMode.replace('_', ' ').toUpperCase()}</strong> mail integration is verified and actively dispatching emails.
      </p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 16px 0; font-size: 13px;">
        <p style="margin: 0 0 6px 0;"><strong>Delivery Channel:</strong> ${config.deliveryMode}</p>
        <p style="margin: 0 0 6px 0;"><strong>Sender (From):</strong> ${senderEmail}</p>
        <p style="margin: 0 0 6px 0;"><strong>Recipient (To):</strong> ${effectiveRecipient}</p>
        <p style="margin: 0 0 6px 0;"><strong>SMTP Server:</strong> ${config.smtpHost || 'Standard Relay'}:${config.smtpPort || 587}</p>
        ${customNotes ? `<p style="margin: 0;"><strong>Notes:</strong> ${customNotes}</p>` : ''}
      </div>
      <p style="font-size: 12px; color: #94a3b8; margin: 20px 0 0 0; border-top: 1px solid #f1f5f9; padding-top: 12px;">
        Dispatched at ${new Date().toISOString()} from ${typeof window !== 'undefined' ? window.location.hostname : 'solar-crm'}.
      </p>
    </div>
  `;

  const result = await sendSystemEmail({
    to: effectiveRecipient,
    senderEmail: senderEmail,
    senderName: config.senderName || 'Solar Operations',
    subject: testSubject,
    bodyHtml,
    category: 'Test Dispatch',
    customConfig
  });

  return result;
}
