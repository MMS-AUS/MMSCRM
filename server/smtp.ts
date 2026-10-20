import nodemailer from 'nodemailer';

export interface SmtpConfig {
  smtpHost: string;
  smtpPort: number | string;
  smtpUsername: string;
  smtpPassword?: string;
  smtpSecure?: boolean;
  senderEmail?: string;
  senderName?: string;
  replyToEmail?: string;
}

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  smtpConfig?: Partial<SmtpConfig>;
}

/**
 * Creates a configured Nodemailer transporter from SMTP settings
 */
export function createSmtpTransporter(config: SmtpConfig) {
  const host = (config.smtpHost || '').trim();
  const port = parseInt(String(config.smtpPort || '587'), 10) || 587;
  const username = (config.smtpUsername || '').trim();
  
  // Clean password whitespace. Google App Passwords are 16 letters commonly copied with 4 groups of 4 (e.g. "abcd efgh ijkl mnop").
  // Stripping internal spaces ensures authentication succeeds with Gmail and Google Workspace relays.
  let password = (config.smtpPassword || '').trim();
  const hostLower = host.toLowerCase();
  const strippedPass = password.replace(/\s+/g, '');
  if ((hostLower.includes('gmail') || hostLower.includes('google')) && strippedPass.length === 16) {
    password = strippedPass;
  } else if (/^[a-zA-Z0-9]{4}\s+[a-zA-Z0-9]{4}\s+[a-zA-Z0-9]{4}\s+[a-zA-Z0-9]{4}$/.test(password)) {
    password = strippedPass;
  }

  // In Nodemailer & SMTP standards:
  // - Port 465 uses direct SMTPS TLS (secure: true)
  // - Port 587 and 25 connect in plaintext and negotiate TLS via STARTTLS (secure: false).
  //   Setting secure: true on port 587 causes OpenSSL error: "wrong version number" and immediate failure.
  const isSecure = port === 465 ? true : (port === 587 || port === 25 ? false : Boolean(config.smtpSecure));
  const requireTLS = port === 587 || port === 25 ? false : (Boolean(config.smtpSecure) && !isSecure);

  const transportOptions: any = {
    host,
    port,
    secure: isSecure,
    requireTLS,
    auth: (username || password) ? {
      user: username,
      pass: password
    } : undefined,
    tls: {
      // Allow self-signed or internal certificates without blocking
      rejectUnauthorized: false
    },
    connectionTimeout: 20000,
    greetingTimeout: 15000,
    socketTimeout: 25000
  };

  return nodemailer.createTransport(transportOptions);
}

/**
 * Verifies SMTP connection and authentication
 */
export async function testSmtpConnection(config: SmtpConfig): Promise<{ success: boolean; message: string; details?: any }> {
  if (!config.smtpHost || !config.smtpHost.trim()) {
    return { success: false, message: 'SMTP Host Server is required (e.g. smtp.gmail.com, smtp.mailgun.org)' };
  }
  if (!config.smtpUsername || !config.smtpUsername.trim()) {
    return { success: false, message: 'SMTP Username / Account is required' };
  }

  const transporter = createSmtpTransporter(config);
  try {
    await transporter.verify();
    const port = parseInt(String(config.smtpPort || '587'), 10) || 587;
    const isSecure = port === 465 ? true : (port === 587 || port === 25 ? false : Boolean(config.smtpSecure));
    const modeDesc = isSecure ? 'Direct SSL/TLS' : 'STARTTLS Encrypted';
    return {
      success: true,
      message: `Successfully connected and authenticated with SMTP server (${config.smtpHost}:${port} via ${modeDesc})`
    };
  } catch (err: any) {
    let errMsg = err.message || 'SMTP connection verification failed';
    const host = (config.smtpHost || '').toLowerCase();

    if (err.code === 'EAUTH' || err.responseCode === 535) {
      if (host.includes('gmail') || host.includes('google')) {
        errMsg = `Gmail Authentication Failed (535): Google requires a 16-character App Password (not your normal Google password). Generate one at https://myaccount.google.com/apppasswords with 2-Step Verification enabled.`;
      } else {
        errMsg = `SMTP Authentication failed (Invalid username or password). Server response: ${err.response || err.message}`;
      }
    } else if (err.code === 'ECONNREFUSED') {
      errMsg = `Could not connect to SMTP server at ${config.smtpHost}:${config.smtpPort || 587}. Connection refused. Please check the host address and port.`;
    } else if (err.code === 'ETIMEDOUT') {
      errMsg = `Connection to SMTP server timed out at ${config.smtpHost}:${config.smtpPort || 587}. Please verify port and firewall access.`;
    } else if (err.message && err.message.includes('wrong version number')) {
      errMsg = `TLS Handshake Error: Port ${config.smtpPort || 587} expects STARTTLS (secure: false), not direct SSL/TLS. Please use Port 587 without direct SSL or Port 465 with SSL.`;
    } else if (err.response) {
      errMsg = `SMTP server rejected request: ${err.response}`;
    }

    return {
      success: false,
      message: errMsg,
      details: {
        code: err.code,
        command: err.command,
        response: err.response,
        responseCode: err.responseCode
      }
    };
  }
}

/**
 * Sanitizes and extracts valid email addresses
 */
function sanitizeEmails(input: any): string[] {
  if (!input) return [];
  const list = Array.isArray(input) ? input : String(input).split(',');
  const results: string[] = [];

  for (const raw of list) {
    if (!raw) continue;
    const str = String(raw).trim();
    if (!str) continue;
    // Extract email from "Name <email@domain.com>"
    const match = str.match(/<([^>]+)>/);
    const email = match ? match[1].trim() : str;
    if (email.includes('@') && email.length > 3 && email !== 'default@system') {
      results.push(email);
    }
  }
  return results;
}

/**
 * Dispatches an email via SMTP
 */
export async function sendSmtpEmail(
  payload: SendEmailPayload,
  fallbackConfig?: SmtpConfig
): Promise<{ success: boolean; messageId?: string; error?: string; details?: any }> {
  const cfg = {
    ...(fallbackConfig || {}),
    ...(payload.smtpConfig || {})
  } as SmtpConfig;

  if (!cfg.smtpHost || !cfg.smtpUsername) {
    return {
      success: false,
      error: 'SMTP Host and Username must be configured before dispatching emails.'
    };
  }

  const transporter = createSmtpTransporter(cfg);

  // Sender Email Resolution:
  // If the user authenticated with e.g. "myaccount@gmail.com" or "sales@mycompany.com",
  // strict SMTP relays (Gmail, Outlook, Zoho, SendGrid) will reject messages whose "From"
  // does not match the authenticated account.
  const host = (cfg.smtpHost || '').toLowerCase();
  const username = (cfg.smtpUsername || '').trim();
  let senderEmail = (cfg.senderEmail || '').trim();

  // If senderEmail is unset or dummy placeholder, prefer authenticated username
  if (!senderEmail || senderEmail === 'default@system' || (!senderEmail.includes('@') && username.includes('@'))) {
    if (username.includes('@')) {
      senderEmail = username;
    }
  }

  // Strict single-user mailboxes (Gmail, Google Workspace, Outlook/Office365, Zoho, Yahoo):
  // Envelope FROM must match authenticated user
  const isStrictMailbox = username.includes('@') && (
    host.includes('gmail') ||
    host.includes('google') ||
    host.includes('outlook') ||
    host.includes('office365') ||
    host.includes('live.com') ||
    host.includes('zoho') ||
    host.includes('yahoo')
  );

  if (isStrictMailbox && username.includes('@')) {
    senderEmail = username;
  }

  if (!senderEmail) {
    senderEmail = username.includes('@') ? username : 'notifications@mysolarcrm.com.au';
  }

  const senderName = cfg.senderName || 'Apex Solar Operations';
  const fromHeader = `"${senderName}" <${senderEmail}>`;

  // Sanitize recipient lists
  const toList = sanitizeEmails(payload.to);
  if (toList.length === 0) {
    return {
      success: false,
      error: 'At least one valid recipient "to" email address is required.'
    };
  }

  const ccList = payload.cc ? sanitizeEmails(payload.cc).filter(e => !toList.includes(e)) : [];
  const bccList = payload.bcc ? sanitizeEmails(payload.bcc).filter(e => !toList.includes(e) && !ccList.includes(e)) : [];
  const replyTo = payload.replyTo || cfg.replyToEmail || senderEmail;

  // Plaintext fallback if none provided
  const textContent = payload.text || payload.html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  try {
    const allEnvelopeRecipients = Array.from(new Set([...toList, ...ccList, ...bccList]));
    const info = await transporter.sendMail({
      from: fromHeader,
      to: toList.join(', '),
      cc: ccList.length > 0 ? ccList.join(', ') : undefined,
      bcc: bccList.length > 0 ? bccList.join(', ') : undefined,
      replyTo,
      subject: payload.subject,
      html: payload.html,
      text: textContent,
      envelope: {
        from: senderEmail,
        to: allEnvelopeRecipients
      }
    });

    console.info(`[SMTP] Email successfully dispatched to "${toList.join(', ')}". Message ID: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
      details: {
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
        sender: senderEmail
      }
    };
  } catch (err: any) {
    console.error(`[SMTP] Failed to send email to "${toList.join(', ')}":`, err.message || err);

    let friendlyError = err.message || 'SMTP transmission failed';
    if (err.code === 'EAUTH' || err.responseCode === 535) {
      if (host.includes('gmail') || host.includes('google')) {
        friendlyError = `Authentication failed: For Gmail, please generate and use a 16-character Google App Password (https://myaccount.google.com/apppasswords).`;
      } else {
        friendlyError = `Authentication failed: Please verify your SMTP username and password/app-password. (${err.response || err.message})`;
      }
    } else if (err.code === 'EENVELOPE') {
      friendlyError = `Recipient address rejected by SMTP server: ${err.message}`;
    } else if (err.code === 'ECONNREFUSED') {
      friendlyError = `Could not connect to SMTP server at ${cfg.smtpHost}:${cfg.smtpPort || 587}. Connection refused.`;
    } else if (err.code === 'ETIMEDOUT') {
      friendlyError = `Connection to SMTP server timed out at ${cfg.smtpHost}:${cfg.smtpPort || 587}.`;
    }

    return {
      success: false,
      error: friendlyError,
      details: {
        code: err.code,
        command: err.command,
        response: err.response,
        responseCode: err.responseCode
      }
    };
  }
}
