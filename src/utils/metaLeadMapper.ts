/**
 * Meta Lead Ads Data Mapping Utility
 *
 * Parses Meta Graph API v25.0 field_data responses, mapping standard Meta keys
 * to structured CRM columns and gracefully storing all variable/custom questions
 * into a JSONB custom_fields object without schema migrations.
 */

export interface MetaFieldDataItem {
  name: string;
  values: string[];
}

export interface MetaGraphLeadPayload {
  id?: string;
  created_time?: string;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  form_id?: string;
  form_name?: string;
  page_id?: string;
  field_data?: MetaFieldDataItem[];
}

export interface MappedMetaLeadResult {
  // Standard structured CRM fields
  meta_leadgen_id: string;
  email: string;
  phone_number: string;
  primaryMobile?: string;
  customerName: string;
  firstName: string;
  lastName: string;
  suburb: string;
  postcode: string;
  state: string;
  address: string;
  companyName: string;

  // Unstructured JSONB custom questions
  custom_fields: Record<string, string>;

  // Additional CRM metadata
  leadDate: string;
  platform: string;
  source: string;
  status: string; // Initial project stage "New Lead"
  assignedTo?: string;

  // Ad tracking context
  ad_id?: string;
  form_id?: string;
  campaign_name?: string;
}

// Predefined standard keys recognized by Meta Instant Forms
const STANDARD_KEYS = new Set([
  'email',
  'full_name',
  'first_name',
  'last_name',
  'phone_number',
  'phone',
  'mobile_phone',
  'city',
  'suburb',
  'zip',
  'post_code',
  'postal_code',
  'postcode',
  'state',
  'province',
  'street_address',
  'address',
  'company_name',
  'business_name',
  'job_title'
]);

/**
 * Normalizes phone numbers, ensuring Australian mobile leading zeros and standard formatting
 */
export function normalizePhone(raw?: string): string {
  if (!raw) return '';
  const cleaned = raw.trim();
  // If Australian mobile without leading zero or with +61
  if (cleaned.startsWith('+61')) {
    const local = cleaned.slice(3).trim();
    return local.startsWith('4') ? `0${local}` : `+61 ${local}`;
  }
  if (cleaned.startsWith('4') && cleaned.length === 9) {
    return `0${cleaned}`;
  }
  return cleaned;
}

/**
 * Converts snake_case, kebab-case, or parameter names into clean Human Readable Titles.
 * Example: "what_is_your_roof_type" -> "What Is Your Roof Type"
 */
export function formatCustomFieldName(key: string): string {
  if (!key) return '';
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Parses Meta Graph API v25.0 field_data into structured fields + custom_fields JSONB object.
 */
export function parseMetaFieldData(
  fieldData: MetaFieldDataItem[] = [],
  metaInfo: {
    leadgen_id?: string;
    created_time?: string;
    ad_id?: string;
    form_id?: string;
    form_name?: string;
    campaign_name?: string;
    page_id?: string;
  } = {}
): MappedMetaLeadResult {
  const standard: Record<string, string> = {};
  const custom_fields: Record<string, string> = {};

  for (const item of fieldData) {
    if (!item || !item.name) continue;
    const nameKey = item.name.toLowerCase().trim();
    const val = (item.values && item.values.length > 0) ? String(item.values[0]).trim() : '';

    if (STANDARD_KEYS.has(nameKey)) {
      standard[nameKey] = val;
    } else {
      // Custom questions fallback
      custom_fields[item.name] = val;
    }
  }

  // Extract explicit standard fields
  const email = standard['email'] || '';
  const rawPhone = standard['phone_number'] || standard['phone'] || standard['mobile_phone'] || '';
  const phone_number = normalizePhone(rawPhone);

  let firstName = standard['first_name'] || '';
  let lastName = standard['last_name'] || '';
  let customerName = standard['full_name'] || '';

  if (!customerName && (firstName || lastName)) {
    customerName = `${firstName} ${lastName}`.trim();
  } else if (customerName && (!firstName || !lastName)) {
    const parts = customerName.split(/\s+/);
    firstName = firstName || parts[0] || '';
    lastName = lastName || parts.slice(1).join(' ') || '';
  }

  const suburb = standard['city'] || standard['suburb'] || '';
  const postcode = standard['zip'] || standard['post_code'] || standard['postal_code'] || standard['postcode'] || '';
  const state = standard['state'] || standard['province'] || 'NSW';
  const address = standard['street_address'] || standard['address'] || '';
  const companyName = standard['company_name'] || standard['business_name'] || '';

  const today = new Date().toISOString().split('T')[0];
  const leadDate = metaInfo.created_time ? metaInfo.created_time.split('T')[0] : today;

  return {
    meta_leadgen_id: metaInfo.leadgen_id || `meta_lead_${Date.now()}`,
    email,
    phone_number,
    primaryMobile: phone_number,
    customerName: customerName || 'Meta Lead Customer',
    firstName,
    lastName,
    suburb,
    postcode,
    state,
    address,
    companyName,
    custom_fields,
    leadDate,
    platform: 'Meta Lead Ads (Facebook/Instagram)',
    source: 'Meta Ads',
    status: 'New Lead',
    ad_id: metaInfo.ad_id,
    form_id: metaInfo.form_id,
    campaign_name: metaInfo.campaign_name || metaInfo.form_name || 'Facebook / Instagram Instant Lead Form'
  };
}
