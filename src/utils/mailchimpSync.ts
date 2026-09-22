/**
 * Mailchimp API v3.0 Synchronization Utility
 * 
 * Specifically addresses:
 * 1. MD5 hashing logic for subscriber_hash (strictly lowercase, trimmed email)
 * 2. RFC-compliant Mailchimp API member payload construction (merge_fields, status_if_new, tags)
 * 3. Base64 encoding for HTTP Basic Authentication headers (anystring:apiKey)
 * 4. Datacenter extraction & URL construction
 * 5. Universal execution (Browser and Node.js compatible)
 */

export interface MailchimpMergeFields {
  FNAME?: string;
  LNAME?: string;
  PHONE?: string;
  ADDRESS?: {
    addr1: string;
    addr2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  } | string;
  STATE?: string;
  POSTCODE?: string;
  COMPANY?: string;
  STAGE?: string;
  SYSTEM_KW?: string | number;
  [key: string]: any;
}

export interface MailchimpMemberPayload {
  email_address: string;
  status_if_new: 'subscribed' | 'unsubscribed' | 'cleaned' | 'pending' | 'transactional';
  status?: 'subscribed' | 'unsubscribed' | 'cleaned' | 'pending' | 'transactional';
  merge_fields: MailchimpMergeFields;
  tags?: string[];
  interests?: Record<string, boolean>;
  language?: string;
  vip?: boolean;
}

export interface SyncMemberResult {
  success: boolean;
  statusCode?: number;
  subscriberHash: string;
  email: string;
  id?: string;
  status?: string;
  tags?: string[];
  error?: string;
  rawResponse?: any;
}

export interface BatchSyncResult {
  total: number;
  successCount: number;
  failureCount: number;
  results: SyncMemberResult[];
  timestamp: string;
}

/**
 * Universal Base64 Encoder
 * Compatible with Node.js (Buffer) and browser (btoa with UTF-8 byte encoding)
 */
export function encodeBase64(input: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'utf-8').toString('base64');
  }
  if (typeof btoa === 'function') {
    // Handle UTF-8 characters safely for btoa
    try {
      return btoa(
        encodeURIComponent(input).replace(/%([0-9A-F]{2})/g, (_, p1) => {
          return String.fromCharCode(parseInt(p1, 16));
        })
      );
    } catch {
      return btoa(input);
    }
  }
  throw new Error('Base64 encoding is not supported in this runtime environment.');
}

/**
 * Pure TypeScript RFC 1321 MD5 Implementation
 * 
 * Works in any runtime (Browser, Node.js, Web Worker) without external libraries.
 * Produces the standard 32-character lowercase hex digest required by Mailchimp.
 */
export function md5(string: string): string {
  // If running in Node.js with native crypto available, use it for optimal speed
  try {
    // Dynamic check without direct import to keep client bundle clean
    if (typeof process !== 'undefined' && process.versions?.node) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const crypto = require('crypto');
      if (crypto && typeof crypto.createHash === 'function') {
        return crypto.createHash('md5').update(string).digest('hex');
      }
    }
  } catch {
    // Fall back to pure JS implementation
  }

  function rotateLeft(lValue: number, iShiftBits: number): number {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }

  function addUnsigned(lX: number, lY: number): number {
    const lX8 = lX & 0x80000000;
    const lY8 = lY & 0x80000000;
    const lX4 = lX & 0x40000000;
    const lY4 = lY & 0x40000000;
    const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
      else return lResult ^ 0x40000000 ^ lX8 ^ lY8;
    } else {
      return lResult ^ lX8 ^ lY8;
    }
  }

  function F(x: number, y: number, z: number): number {
    return (x & y) | (~x & z);
  }
  function G(x: number, y: number, z: number): number {
    return (x & z) | (y & ~z);
  }
  function H(x: number, y: number, z: number): number {
    return x ^ y ^ z;
  }
  function I(x: number, y: number, z: number): number {
    return y ^ (x | ~z);
  }

  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function convertToWordArray(str: string): number[] {
    let lWordCount: number;
    const lMessageLength = str.length;
    const lNumberOfWordsTempOne = lMessageLength + 8;
    const lNumberOfWordsTempTwo = (lNumberOfWordsTempOne - (lNumberOfWordsTempOne % 64)) / 64;
    const lNumberOfWords = (lNumberOfWordsTempTwo + 1) * 16;
    const lWordArray: number[] = new Array(lNumberOfWords - 1).fill(0);
    let lBytePosition = 0;
    let lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition);
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }

  function wordToHex(lValue: number): string {
    let WordToHexValue = '';
    let WordToHexValueTemp = '';
    for (let lCount = 0; lCount <= 3; lCount++) {
      const lByte = (lValue >>> (lCount * 8)) & 255;
      WordToHexValueTemp = '0' + lByte.toString(16);
      WordToHexValue = WordToHexValue + WordToHexValueTemp.substr(WordToHexValueTemp.length - 2, 2);
    }
    return WordToHexValue;
  }

  function utf8Encode(str: string): string {
    str = str.replace(/\r\n/g, '\n');
    let utftext = '';
    for (let n = 0; n < str.length; n++) {
      const c = str.charCodeAt(n);
      if (c < 128) {
        utftext += String.fromCharCode(c);
      } else if (c > 127 && c < 2048) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      } else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }
    }
    return utftext;
  }

  const encodedStr = utf8Encode(string);
  const x = convertToWordArray(encodedStr);
  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

  for (let k = 0; k < x.length; k += 16) {
    const AA = a;
    const BB = b;
    const CC = c;
    const DD = d;
    a = FF(a, b, c, d, x[k + 0] || 0, S11, 0xd76aa478);
    d = FF(d, a, b, c, x[k + 1] || 0, S12, 0xe8c7b756);
    c = FF(c, d, a, b, x[k + 2] || 0, S13, 0x242070db);
    b = FF(b, c, d, a, x[k + 3] || 0, S14, 0xc1bdceee);
    a = FF(a, b, c, d, x[k + 4] || 0, S11, 0xf57c0faf);
    d = FF(d, a, b, c, x[k + 5] || 0, S12, 0x4787c62a);
    c = FF(c, d, a, b, x[k + 6] || 0, S13, 0xa8304613);
    b = FF(b, c, d, a, x[k + 7] || 0, S14, 0xfd469501);
    a = FF(a, b, c, d, x[k + 8] || 0, S11, 0x698098d8);
    d = FF(d, a, b, c, x[k + 9] || 0, S12, 0x8b44f7af);
    c = FF(c, d, a, b, x[k + 10] || 0, S13, 0xffff5bb1);
    b = FF(b, c, d, a, x[k + 11] || 0, S14, 0x895cd7be);
    a = FF(a, b, c, d, x[k + 12] || 0, S11, 0x6b901122);
    d = FF(d, a, b, c, x[k + 13] || 0, S12, 0xfd987193);
    c = FF(c, d, a, b, x[k + 14] || 0, S13, 0xa679438e);
    b = FF(b, c, d, a, x[k + 15] || 0, S14, 0x49b40821);

    a = GG(a, b, c, d, x[k + 1] || 0, S21, 0xf61e2562);
    d = GG(d, a, b, c, x[k + 6] || 0, S22, 0xc040b340);
    c = GG(c, d, a, b, x[k + 11] || 0, S23, 0x265e5a51);
    b = GG(b, c, d, a, x[k + 0] || 0, S24, 0xe9b6c7aa);
    a = GG(a, b, c, d, x[k + 5] || 0, S21, 0xd62f105d);
    d = GG(d, a, b, c, x[k + 10] || 0, S22, 0x02441453);
    c = GG(c, d, a, b, x[k + 15] || 0, S23, 0xd8a1e681);
    b = GG(b, c, d, a, x[k + 4] || 0, S24, 0xe7d3fbc8);
    a = GG(a, b, c, d, x[k + 9] || 0, S21, 0x21e1cde6);
    d = GG(d, a, b, c, x[k + 14] || 0, S22, 0xc33707d6);
    c = GG(c, d, a, b, x[k + 3] || 0, S23, 0xf4d50d87);
    b = GG(b, c, d, a, x[k + 8] || 0, S24, 0x455a14ed);
    a = GG(a, b, c, d, x[k + 13] || 0, S21, 0xa9e3e905);
    d = GG(d, a, b, c, x[k + 2] || 0, S22, 0xfcefa3f8);
    c = GG(c, d, a, b, x[k + 7] || 0, S23, 0x676f02d9);
    b = GG(b, c, d, a, x[k + 12] || 0, S24, 0x8d2a4c8a);

    a = HH(a, b, c, d, x[k + 5] || 0, S31, 0xfffa3942);
    d = HH(d, a, b, c, x[k + 8] || 0, S32, 0x8771f681);
    c = HH(c, d, a, b, x[k + 11] || 0, S33, 0x6d9d6122);
    b = HH(b, c, d, a, x[k + 14] || 0, S34, 0xfde5380c);
    a = HH(a, b, c, d, x[k + 1] || 0, S31, 0xa4beeea44);
    d = HH(d, a, b, c, x[k + 4] || 0, S32, 0x4bdecfa9);
    c = HH(c, d, a, b, x[k + 7] || 0, S33, 0xf6bb4b60);
    b = HH(b, c, d, a, x[k + 10] || 0, S34, 0xbebfbc70);
    a = HH(a, b, c, d, x[k + 13] || 0, S31, 0x289b7ec6);
    d = HH(d, a, b, c, x[k + 0] || 0, S32, 0xeaa127fa);
    c = HH(c, d, a, b, x[k + 3] || 0, S33, 0xd4ef3085);
    b = HH(b, c, d, a, x[k + 6] || 0, S34, 0x04881d05);
    a = HH(a, b, c, d, x[k + 9] || 0, S31, 0xd9d4d039);
    d = HH(d, a, b, c, x[k + 12] || 0, S32, 0xe6db99e5);
    c = HH(c, d, a, b, x[k + 15] || 0, S33, 0x1fa27cf8);
    b = HH(b, c, d, a, x[k + 2] || 0, S34, 0xc4ac5665);

    a = II(a, b, c, d, x[k + 0] || 0, S41, 0xf4292244);
    d = II(d, a, b, c, x[k + 7] || 0, S42, 0x432aff97);
    c = II(c, d, a, b, x[k + 14] || 0, S43, 0xab9423a7);
    b = II(b, c, d, a, x[k + 5] || 0, S44, 0xfc93a039);
    a = II(a, b, c, d, x[k + 12] || 0, S41, 0x655b59c3);
    d = II(d, a, b, c, x[k + 3] || 0, S42, 0x8f0ccc92);
    c = II(c, d, a, b, x[k + 10] || 0, S43, 0xffeff47d);
    b = II(b, c, d, a, x[k + 1] || 0, S44, 0x85845dd1);
    a = II(a, b, c, d, x[k + 8] || 0, S41, 0x6fa87e4f);
    d = II(d, a, b, c, x[k + 15] || 0, S42, 0xfe2ce6e0);
    c = II(c, d, a, b, x[k + 6] || 0, S43, 0xa3014314);
    b = II(b, c, d, a, x[k + 13] || 0, S44, 0x4e0811a1);
    a = II(a, b, c, d, x[k + 4] || 0, S41, 0xf7537e82);
    d = II(d, a, b, c, x[k + 11] || 0, S42, 0xbd3af235);
    c = II(c, d, a, b, x[k + 2] || 0, S43, 0x2ad7d2bb);
    b = II(b, c, d, a, x[k + 9] || 0, S44, 0xeb86d391);

    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }

  const result = wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
  return result.toLowerCase();
}

/**
 * Calculates the Mailchimp subscriber_hash.
 * 
 * CRITICAL MAILCHIMP SPECIFICATION:
 * "The MD5 hash of the lowercase version of the list member's email address."
 * E.g., 'User@example.com' -> 'user@example.com' -> MD5 -> 'b58996c504c5638798eb6b511e6f49af'
 */
export function calculateSubscriberHash(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new Error('Valid email address is required to calculate Mailchimp subscriber_hash');
  }
  // Trim all whitespace and convert to strictly lowercase
  const normalizedEmail = email.trim().toLowerCase();
  return md5(normalizedEmail);
}

/**
 * Extracts datacenter prefix from Mailchimp API key.
 * Format: <key>-<dc> (e.g. 98bf31920acde881290312014-us21 -> us21)
 */
export function extractDatacenter(apiKey: string): string {
  if (!apiKey || typeof apiKey !== 'string') {
    return 'us1';
  }
  const parts = apiKey.trim().split('-');
  if (parts.length > 1 && parts[parts.length - 1]) {
    return parts[parts.length - 1];
  }
  return 'us1';
}

/**
 * Generates Base URL for Mailchimp API v3.0
 */
export function getMailchimpBaseUrl(apiKey: string): string {
  const dc = extractDatacenter(apiKey);
  return `https://${dc}.api.mailchimp.com/3.0`;
}

/**
 * Constructs the HTTP Basic Authentication headers for Mailchimp API v3.0.
 * 
 * CRITICAL MAILCHIMP SPECIFICATION:
 * HTTP Basic Auth requires base64 encoding of 'anystring:<API_KEY>' or 'apikey:<API_KEY>'
 */
export function getMailchimpAuthHeader(apiKey: string): {
  Authorization: string;
  'Content-Type': string;
  Accept: string;
} {
  const cleanKey = (apiKey || '').trim();
  const authString = `anystring:${cleanKey}`;
  const encoded = encodeBase64(authString);

  return {
    Authorization: `Basic ${encoded}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };
}

/**
 * Builds the URL for adding/updating a specific list member by email.
 */
export function getMemberEndpoint(apiKey: string, listId: string, email: string): string {
  const baseUrl = getMailchimpBaseUrl(apiKey);
  const hash = calculateSubscriberHash(email);
  return `${baseUrl}/lists/${listId.trim()}/members/${hash}`;
}

/**
 * Verified Mailchimp API Member Payload Construction.
 * 
 * Handles CRM Contacts and Leads, constructing a schema-compliant payload
 * for PUT /3.0/lists/{list_id}/members/{subscriber_hash}
 */
export function buildMailchimpMemberPayload(
  record: any,
  options?: {
    status?: 'subscribed' | 'unsubscribed' | 'cleaned' | 'pending' | 'transactional';
    statusIfNew?: 'subscribed' | 'unsubscribed' | 'cleaned' | 'pending' | 'transactional';
    tags?: string[];
    extraMergeFields?: Record<string, any>;
  }
): MailchimpMemberPayload {
  if (!record) {
    throw new Error('Contact or Lead record is required to build Mailchimp payload');
  }

  // 1. Resolve email address
  const rawEmail = record.email || record.primaryEmail || record.contactEmail || '';
  if (!rawEmail || !rawEmail.includes('@')) {
    throw new Error(`Record ${record.id || record.name || 'unknown'} has no valid email address`);
  }
  const email_address = rawEmail.trim().toLowerCase();

  // 2. Parse First Name & Last Name
  let firstName = (record.firstName || '').trim();
  let lastName = (record.lastName || '').trim();

  if (!firstName && !lastName) {
    const rawFullName = (record.name || record.fullName || record.customerName || '').trim();
    if (rawFullName) {
      const parts = rawFullName.split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }
  }

  // 3. Resolve Phone
  const phone = (
    record.phone ||
    record.primaryMobile ||
    record.mobile ||
    record.secondaryMobile ||
    ''
  ).trim();

  // 4. Resolve Address components
  const state = (record.state || '').toString().trim();
  const postcode = (record.postcode || record.postalCode || '').toString().trim();
  const suburb = (record.suburb || record.city || '').toString().trim();
  const addressLine = (record.address || record.streetAddress || '').toString().trim();

  // 5. Construct Merge Fields
  const merge_fields: MailchimpMergeFields = {
    FNAME: firstName || undefined,
    LNAME: lastName || undefined,
    PHONE: phone || undefined,
    STATE: state || undefined,
    POSTCODE: postcode || undefined
  };

  // Company / Organization
  if (record.company || record.primaryCompany || record.companyName) {
    merge_fields.COMPANY = (record.company || record.primaryCompany || record.companyName).trim();
  }

  // Pipeline Stage or Status
  if (record.status || record.stage) {
    merge_fields.STAGE = (record.status || record.stage).toString().trim();
  }

  // Solar System kW
  if (record.systemSizeKw !== undefined && record.systemSizeKw !== null && record.systemSizeKw !== '') {
    merge_fields.SYSTEM_KW = String(record.systemSizeKw);
  }

  // If address parts exist, format full address string or object
  if (addressLine || suburb || state || postcode) {
    const fullAddrString = [addressLine, suburb, state, postcode].filter(Boolean).join(', ');
    merge_fields.ADDRESS = fullAddrString;
  }

  // Merge any caller-provided extra fields
  if (options?.extraMergeFields) {
    Object.assign(merge_fields, options.extraMergeFields);
  }

  // Clean undefined/empty keys from merge_fields
  for (const key of Object.keys(merge_fields)) {
    if (merge_fields[key] === undefined || merge_fields[key] === null || merge_fields[key] === '') {
      delete merge_fields[key];
    }
  }

  // 6. Build Tags
  const tagsSet = new Set<string>();

  // Determine entity tags
  if (record.type) {
    tagsSet.add(record.type === 'Residential' ? 'Residential Client' : 'Commercial Client');
  } else if (record.platform || record.leadDate) {
    tagsSet.add('CRM Lead');
    if (record.platform) {
      tagsSet.add(`Lead - ${record.platform}`);
    }
  } else {
    tagsSet.add('CRM Contact');
  }

  if (state) {
    tagsSet.add(`State - ${state}`);
  }

  if (options?.tags && Array.isArray(options.tags)) {
    for (const t of options.tags) {
      if (t) tagsSet.add(t.trim());
    }
  }

  // 7. Assemble Schema Payload
  const payload: MailchimpMemberPayload = {
    email_address,
    status_if_new: options?.statusIfNew || 'subscribed',
    status: options?.status || 'subscribed',
    merge_fields,
    tags: Array.from(tagsSet)
  };

  return payload;
}

/**
 * Syncs a single contact or lead to Mailchimp using the upsert endpoint
 * PUT /3.0/lists/{list_id}/members/{subscriber_hash}
 */
export async function syncMemberToMailchimp(options: {
  apiKey: string;
  listId: string;
  record: any;
  statusIfNew?: 'subscribed' | 'unsubscribed' | 'cleaned' | 'pending' | 'transactional';
  tags?: string[];
}): Promise<SyncMemberResult> {
  const { apiKey, listId, record, statusIfNew, tags } = options;

  if (!apiKey || !listId) {
    return {
      success: false,
      subscriberHash: '',
      email: record?.email || '',
      error: 'Mailchimp API Key and Audience ID are required'
    };
  }

  let payload: MailchimpMemberPayload;
  let subscriberHash = '';
  try {
    payload = buildMailchimpMemberPayload(record, { statusIfNew, tags });
    subscriberHash = calculateSubscriberHash(payload.email_address);
  } catch (err: any) {
    return {
      success: false,
      subscriberHash: '',
      email: record?.email || '',
      error: err.message || 'Failed to construct Mailchimp payload'
    };
  }

  const endpoint = getMemberEndpoint(apiKey, listId, payload.email_address);
  const headers = getMailchimpAuthHeader(apiKey);

  try {
    // If in browser, use server proxy to avoid CORS restrictions
    const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
    
    let res: Response;
    if (isBrowser) {
      res = await fetch('/api/mailchimp/sync-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          listId,
          subscriberHash,
          payload
        })
      });
    } else {
      res = await fetch(endpoint, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorDetail = data.detail || data.title || data.message || `HTTP ${res.status}`;
      return {
        success: false,
        statusCode: res.status,
        subscriberHash,
        email: payload.email_address,
        error: errorDetail,
        rawResponse: data
      };
    }

    return {
      success: true,
      statusCode: res.status,
      subscriberHash,
      email: payload.email_address,
      id: data.id || subscriberHash,
      status: data.status || 'subscribed',
      tags: payload.tags,
      rawResponse: data
    };
  } catch (err: any) {
    return {
      success: false,
      subscriberHash,
      email: payload.email_address,
      error: err.message || 'Network error syncing contact to Mailchimp'
    };
  }
}

/**
 * Batch sync multiple contacts or leads to Mailchimp
 */
export async function syncBatchToMailchimp(options: {
  apiKey: string;
  listId: string;
  records: any[];
  defaultTags?: string[];
  onProgress?: (completed: number, total: number) => void;
}): Promise<BatchSyncResult> {
  const { apiKey, listId, records, defaultTags, onProgress } = options;
  const results: SyncMemberResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const res = await syncMemberToMailchimp({
      apiKey,
      listId,
      record,
      tags: defaultTags
    });

    results.push(res);
    if (res.success) {
      successCount++;
    } else {
      failureCount++;
    }

    if (onProgress) {
      onProgress(i + 1, records.length);
    }
  }

  return {
    total: records.length,
    successCount,
    failureCount,
    results,
    timestamp: new Date().toISOString()
  };
}

/**
 * Tests Mailchimp API connection using GET /3.0/ping
 */
export async function testMailchimpApiConnection(apiKey: string): Promise<{
  success: boolean;
  message: string;
  serverPrefix: string;
  latencyMs: number;
}> {
  const startTime = Date.now();
  const serverPrefix = extractDatacenter(apiKey);

  if (!apiKey || !apiKey.includes('-')) {
    return {
      success: false,
      message: 'Invalid API Key format. Must be in the format key-dc (e.g. key-us21).',
      serverPrefix,
      latencyMs: 0
    };
  }

  try {
    const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
    let res: Response;

    if (isBrowser) {
      res = await fetch('/api/mailchimp/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey })
      });
    } else {
      const endpoint = `${getMailchimpBaseUrl(apiKey)}/ping`;
      const headers = getMailchimpAuthHeader(apiKey);
      res = await fetch(endpoint, { method: 'GET', headers });
    }

    const latencyMs = Date.now() - startTime;
    const data = await res.json().catch(() => ({}));

    if (res.ok && (data.health_status || data.success || data.message === "Everything's Chimpy!")) {
      return {
        success: true,
        message: data.message || `Connected to Mailchimp API v3.0 (${serverPrefix}.api.mailchimp.com). Everything's Chimpy!`,
        serverPrefix,
        latencyMs
      };
    }

    return {
      success: false,
      message: data.detail || data.message || `Mailchimp returned HTTP ${res.status}`,
      serverPrefix,
      latencyMs
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Connection to Mailchimp API failed',
      serverPrefix,
      latencyMs: Date.now() - startTime
    };
  }
}
