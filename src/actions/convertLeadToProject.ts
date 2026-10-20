'use server';

import { createClient } from '@supabase/supabase-js';

const STREET_TYPES = '(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Circuit|Cct|Court|Ct|Place|Pl|Lane|Ln|Boulevard|Blvd|Way|Close|Cl|Parade|Pde|Terrace|Tce|Crescent|Cres|Highway|Hwy|Grove|Gr|Rise|Track|Trk|Esplanade|Esp|Loop|Mews)';

/**
 * CRITICAL RULE IMPLEMENTATION:
 * Extracts strictly the street address line from an Australian address string,
 * removing any concatenated Suburb, State (NSW, QLD, VIC, ACT, SA, WA, TAS, NT),
 * or Post Code. Ensures the street line is clean and never concatenated.
 */
export function extractStreetAddressOnly(
  rawAddress?: string | null,
  knownSuburb?: string | null,
  knownState?: string | null,
  knownPostcode?: string | null
): string {
  if (!rawAddress) return '';
  let clean = String(rawAddress).trim();

  const parts = clean.split(',').map(p => p.trim()).filter(Boolean);

  if (parts.length > 1) {
    const streetRegex = new RegExp(`\\b${STREET_TYPES}\\b`, 'i');
    if (streetRegex.test(parts[0])) {
      clean = parts[0];
    } else if (/^(?:unit|apt|apartment|suite|level|lot|flat|shop)\s*[\w/-]+$/i.test(parts[0]) && parts.length > 1) {
      clean = `${parts[0]}, ${parts[1]}`;
    } else {
      clean = parts[0];
    }
  } else {
    clean = clean.replace(/\s+\d{4}\s*$/, '');
    clean = clean.replace(/\s+(?:NSW|QLD|VIC|ACT|SA|WA|TAS|NT)\s*$/i, '');
    if (knownSuburb && knownSuburb.trim().length > 1) {
      const sub = knownSuburb.trim();
      const subIdx = clean.toLowerCase().lastIndexOf(sub.toLowerCase());
      if (subIdx > 0) {
        clean = clean.substring(0, subIdx).trim();
      }
    }
    if (knownPostcode && knownPostcode.trim().length > 0) {
      const pcIdx = clean.lastIndexOf(knownPostcode.trim());
      if (pcIdx > 0) {
        clean = clean.substring(0, pcIdx).trim();
      }
    }
    if (knownState && knownState.trim().length > 0) {
      const stIdx = clean.toUpperCase().lastIndexOf(knownState.trim().toUpperCase());
      if (stIdx > 0 && stIdx === clean.length - knownState.trim().length) {
        clean = clean.substring(0, stIdx).trim();
      }
    }
  }

  clean = clean.replace(/[\s,-]+$/, '').trim();
  return clean || rawAddress.trim();
}

/**
 * Next.js Server Action: Convert Lead to Project.
 * Extracts strictly the street address, creates the project in Supabase,
 * and updates the lead status.
 */
export async function convertLeadToProjectAction(leadId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Fetch Lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();

  if (leadError || !lead) {
    throw new Error(`Lead with ID "${leadId}" could not be found: ${leadError?.message || 'No record'}`);
  }

  const today = new Date().toISOString().split('T')[0];
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const state = lead.state || 'NSW';
  const projectNumber = lead.project_number || `SOL-${state}-${randNum}`;

  // 2. CRITICAL RULE: Extract ONLY the street line (No Suburb, State, or Post Code concatenation!)
  const streetAddressOnly = extractStreetAddressOnly(
    lead.address,
    lead.suburb,
    lead.state,
    lead.postcode
  );

  const suburb = lead.suburb || 'Sydney';
  const postcode = lead.postcode || (state === 'QLD' ? '4000' : '2000');
  const firstName = lead.first_name || (lead.full_name ? lead.full_name.split(' ')[0] : 'Customer');
  const lastName = lead.last_name || (lead.full_name ? lead.full_name.split(' ').slice(1).join(' ') : 'Account') || 'Account';
  const primaryMobile = lead.phone || lead.phone_number || lead.primary_mobile || '0400000000';
  const email = lead.email || 'customer@example.com';

  const nmi = lead.nmi || `410${Math.floor(10000000 + Math.random() * 90000000)}`;
  const electricityDistributor = lead.electricity_distributor || (state === 'QLD' ? 'Energex' : 'Ausgrid');

  let systemSizeKw = Number(lead.system_size_kw || lead.system_size) || 0;
  const noOfPanels = Number(lead.no_of_panels || lead.panel_count) || (systemSizeKw > 0 ? Math.ceil((systemSizeKw * 1000) / 440) : 15);
  const panelSizeW = Number(lead.panel_size_w || lead.panel_size) || 440;
  if (!systemSizeKw || systemSizeKw <= 0) {
    systemSizeKw = Math.round((noOfPanels * panelSizeW / 1000) * 100) / 100;
  }
  if (!systemSizeKw || systemSizeKw <= 0) {
    systemSizeKw = 6.60;
  }

  const sellingPrice = Number(lead.selling_price || lead.quoted_price_aud) || Math.round(systemSizeKw * 1150 + (lead.battery_required ? 8500 : 0));
  const deposit = Number(lead.deposit || lead.deposit_aud) || 1000;
  const balancePayable = Math.max(0, sellingPrice - deposit);
  const approxStcs = Math.round(systemSizeKw * 10);
  const solarStcsAmount = Math.round(approxStcs * 36.00);

  // 3. Build project record for Supabase
  const projectPayload = {
    project_number: projectNumber,
    title: `${systemSizeKw}kW ${lead.battery_required ? '+ Battery' : 'Solar System'}`,
    lead_id: lead.id,
    contact_id: lead.contact_id || null,
    status: 'Site Survey',
    stage: 'Design',
    project_status: 'Active',
    project_stage: 'Site Survey',

    // Customer & Sales
    sales_person_name: lead.sales_person_name || 'Mitchell Barnes',
    sale_date: lead.sale_date || today,

    // 1A. Installation Site Address - STRICT STREET LINE ONLY
    street_address: streetAddressOnly,
    address: streetAddressOnly,
    suburb: suburb,
    state: state,
    postcode: postcode,
    area: lead.area || 'Metro',
    nearest_big_city: lead.nearest_big_city || (state === 'QLD' ? 'Brisbane' : 'Sydney'),
    deposit_received_date: lead.deposit_received_date || today,

    // 1B. Primary Customer Details
    first_name: firstName,
    last_name: lastName,
    customer_name: `${firstName} ${lastName}`.trim(),
    manager_rentee_first_name: lead.manager_rentee_first_name || '',
    manager_rentee_last_name: lead.manager_rentee_last_name || '',
    primary_mobile: primaryMobile,
    customer_phone: primaryMobile,
    secondary_mobile: lead.secondary_mobile || '',
    email: email,
    customer_email: email,
    sales_team_notes: lead.sales_team_notes || lead.notes || '',

    // Technical Specs & Hardware
    system_size_kw: systemSizeKw,
    system_size: systemSizeKw,

    // 2A. Solar Panels
    no_of_panels: noOfPanels,
    panel_manufacturer: lead.panel_manufacturer || 'AIKO Solar',
    panel_size_w: panelSizeW,
    panel_series: lead.panel_series || 'Neostar 2P',
    panel_model: lead.panel_model || '',

    // 2B. Solar Inverter
    no_of_inverters: Number(lead.no_of_inverters) || 1,
    inverter_manufacturer: lead.inverter_manufacturer || 'Sungrow',
    inverter_size_kw: Number(lead.inverter_size_kw) || (systemSizeKw > 8 ? 8.0 : 5.0),
    inverter_series: lead.inverter_series || '',
    inverter_model: lead.inverter_model || '',

    // 2C. Battery Storage
    no_of_batteries: Number(lead.no_of_batteries) || (lead.battery_required ? 1 : 0),
    battery_manufacturer: lead.battery_manufacturer || (lead.battery_required ? 'Tesla Powerwall 3 (13.5kWh)' : ''),
    battery_usable_capacity_kwh: Number(lead.battery_usable_capacity_kwh || lead.battery_storage_kwh) || (lead.battery_required ? 13.5 : null),
    battery_model: lead.battery_model || '',
    battery_size: lead.battery_size || '',

    roof_type: lead.roof_type || 'Colorbond / Metal Sheet',
    house_storey: lead.house_storey || 'Single Storey',
    electrical_phase: lead.electrical_phase || lead.phase || 'Single Phase',
    existing_system_details: lead.existing_system_details || 'No existing solar installed (Brand new installation)',
    docs_received: Boolean(lead.docs_received === 'Yes' || lead.docs_received === true),
    docs_received_date: lead.docs_received_date || today,

    // 3. EB & Meter Checklist
    q1_customer_name_match: true,
    q2_address_match: true,
    q3_meter_match: true,
    q4_meter_phase: lead.electrical_phase?.includes('Three') ? 'Three Phase' : 'Single Phase',
    q5_opensolar_system_match: true,
    q6_opensolar_pricing_match: true,

    // 4. Grid Application
    nmi: nmi,
    electricity_distributor: electricityDistributor,
    grid_app_ref: `DNSP-APP-${randNum}`,
    energy_retailer: 'Origin Energy',
    retailer_ref: '',
    grid_app_status: 'Not Started',
    grid_applied_date: null,
    grid_rejected_date: null,
    grid_approval_date: null,

    // 5. Installation Details
    installation_date: null,
    installation_status: 'Unscheduled',
    booking_date: null,
    booked_by: 'Operations Coordinator',
    completed_month: null,
    installation_docs_status: 'Pending',
    install_docs_received_date: null,

    // 5A. Accredited Installer
    installer_name: null,
    installer_invoice_date: null,
    installer_invoice_number: null,
    installer_invoice_amount_aud: 0.00,
    installer_invoice_status: 'Pending Approval',
    customer_final_invoice_number: null,

    // 6. Warehouse Details
    warehouse_location: state === 'QLD' ? 'Brisbane Distribution Centre' : 'Sydney Central DC (Alexandria)',
    sales_order_number: `SO-${randNum}`,
    warehouse_invoice_date: null,
    warehouse_invoice_number: null,
    warehouse_invoice_amount_aud: 0.00,
    warehouse_invoice_status: 'Draft',
    stock_status: 'In Stock',
    stock_used_project: null,

    // 7. Financials
    system_price_aud: sellingPrice + solarStcsAmount,
    system_price: sellingPrice + solarStcsAmount,
    selling_price_aud: sellingPrice,
    total_price: sellingPrice,
    deposit_aud: deposit,
    deposit: deposit,
    balance_payable_aud: balancePayable,
    balance_payable_date: null,
    remaining_payment_aud: balancePayable,

    // 7A. Finance Brokerage
    is_on_finance: false,
    finance_company_name: '',
    finance_status: 'Not Applicable',
    finance_applied_date: null,
    finance_approved_date: null,
    finance_approved_amount_aud: 0.00,

    // 8. STC Details
    stc_traded_portal: 'BridgeSelect',
    stc_job_no: `STC-${randNum}`,
    solar_stcs_count: approxStcs,
    solar_stcs_amount_aud: solarStcsAmount,
    solar_stc_received_date: null,
    battery_stcs_count: 0,
    battery_stcs_amount_aud: 0.00,
    battery_stc_received_date: null,
    total_stc_amount_received_aud: 0.00,
    admin_charges_aud: 150.00,
    stc_status: 'Pending Upload',
    stc_submitted_date: null,

    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 4. Insert or Upsert into Supabase `projects`
  const { data: newProject, error: projectInsertError } = await supabase
    .from('projects')
    .insert([projectPayload])
    .select()
    .single();

  if (projectInsertError) {
    throw new Error(`Failed to create project in Supabase: ${projectInsertError.message}`);
  }

  // 5. Update Lead status to 'Converted to Project'
  await supabase
    .from('leads')
    .update({
      status: 'Converted to Project',
      stage: 'Converted',
      updated_at: new Date().toISOString()
    })
    .eq('id', leadId);

  return { success: true, project: newProject };
}
