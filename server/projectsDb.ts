import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Project } from '../src/types/index.ts';
import { getSupabase, getSupabaseUrl, getSupabaseKey } from './supabase.ts';
import { extractStreetAddressOnly } from './conversionLogic.ts';

const PROJECTS_DB_FILE = path.join(process.cwd(), '.projects_db.json');

let cachedProjectColumns: Set<string> | null = null;
let lastProjectColumnsFetch = 0;

async function getProjectTableColumns(): Promise<Set<string>> {
  const now = Date.now();
  if (cachedProjectColumns && (now - lastProjectColumnsFetch < 300000)) {
    return cachedProjectColumns;
  }
  try {
    const url = getSupabaseUrl();
    const key = getSupabaseKey();
    if (url && key) {
      const res = await fetch(`${url}/rest/v1/`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }
      });
      if (res.ok) {
        const spec = await res.json();
        const props = spec?.definitions?.projects?.properties;
        if (props && typeof props === 'object' && Object.keys(props).length > 0) {
          cachedProjectColumns = new Set(Object.keys(props));
          lastProjectColumnsFetch = now;
          return cachedProjectColumns;
        }
      }
    }
  } catch (e) {
    console.warn('[ProjectsDb] Could not inspect OpenAPI projects columns:', e);
  }
  return cachedProjectColumns || new Set([
    'id', 'title', 'project_number', 'contact_id', 'lead_id', 'customer_name',
    'customer_email', 'customer_phone', 'address', 'suburb', 'state', 'postcode',
    'system_size', 'system_size_kw', 'status', 'stage', 'total_price', 'deposit_paid', 'os_id',
    'bridgeselect_sync_status', 'bridgeselect_synced_at', 'installer_assigned',
    'system_price_aud', 'deposit_aud', 'deposit', 'deposit_received_date', 'sale_date', 'budget_aud',
    'created_at', 'updated_at'
  ]);
}

function toDeterministicUuid(id: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;
  const hash = crypto.createHash('md5').update(id || 'project-default').digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    '8' + hash.substring(17, 20),
    hash.substring(20, 32)
  ].join('-');
}

function cleanNumeric(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

function cleanDate(val: any): string | null {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.substring(0, 10);
  }
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const p1 = parseInt(slashMatch[1], 10);
    const p2 = parseInt(slashMatch[2], 10);
    const y = slashMatch[3];
    return `${y}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return null;
}

export function normalizeProjectStatus(raw?: any): Project['status'] {
  if (!raw) return 'Site Survey';
  const s = String(raw).trim();
  const validStatuses: Project['status'][] = [
    'Site Survey',
    'Engineering & DNSP Approval',
    'Sales Order Dispatched',
    'RFQ Sent to Installers',
    'Install Scheduled',
    'Installation in Progress',
    'Installation Completed',
    'BridgeSelect STC Claimed',
    'Grid Meter Connected',
    'Completed'
  ];
  if (validStatuses.includes(s as Project['status'])) {
    return s as Project['status'];
  }
  if (s === 'Design' || s === 'Draft' || s === 'Site Survey' || s === 'Site Survey Scheduled') return 'Site Survey';
  if (
    s === 'Engineering & DNSP Approval' ||
    s === 'Engineering & DNSP' ||
    s === 'DNSP Application Submitted' ||
    s === 'DNSP Approved' ||
    s === 'Sold'
  ) return 'Engineering & DNSP Approval';
  if (
    s === 'Sales Order Dispatched' ||
    s === 'Sales Order Created (Warehouse)' ||
    s === 'Sales Order Created' ||
    s === 'Stock Allocated' ||
    s === 'Warehouse & Equipment'
  ) return 'Sales Order Dispatched';
  if (
    s === 'RFQ Sent to Installers' ||
    s === 'Subcontractor RFQ / Quoting' ||
    s === 'Subcontractor RFQ' ||
    s === 'Quoting'
  ) return 'RFQ Sent to Installers';
  if (
    s === 'Install Scheduled' ||
    s === 'Installation Scheduled' ||
    s === 'Booked / Scheduled' ||
    s === 'Booked'
  ) return 'Install Scheduled';
  if (
    s === 'Installation in Progress' ||
    s === 'Installation Active' ||
    s === 'Installation Scheduled/Active' ||
    s === 'In Progress' ||
    s === 'Active'
  ) return 'Installation in Progress';
  if (s === 'Installation Completed' || s === 'Installed' || s === 'Install Done') return 'Installation Completed';
  if (
    s === 'BridgeSelect STC Claimed' ||
    s === 'BridgeSelect Claimed' ||
    s === 'Clean Energy Regulator (STC Claim)' ||
    s === 'STC Compliance' ||
    s === 'STC Compliance & Grid' ||
    s === 'STC Claimed'
  ) return 'BridgeSelect STC Claimed';
  if (
    s === 'Grid Meter Connected' ||
    s === 'DNSP Grid Inspection & Metering' ||
    s === 'Grid Connected' ||
    s === 'Meter Connected'
  ) return 'Grid Meter Connected';
  if (s === 'Completed' || s === 'Completed & Handover' || s === 'Closed' || s === 'Handover') return 'Completed';

  const lower = s.toLowerCase();
  const matched = validStatuses.find(st => st.toLowerCase() === lower);
  if (matched) return matched;

  return (s as Project['status']) || 'Site Survey';
}

export function normalizeProjectStage(raw?: any): string {
  if (!raw) return 'Site Survey';
  const s = String(raw).trim();
  if (s === 'Design' || s === 'Draft') return 'Site Survey';
  return s;
}

function mapSupabaseRowToProject(row: any, linkedLead?: any, existingCached?: Partial<Project>): Project {
  const systemKw = cleanNumeric(row.system_size_kw ?? row.system_size ?? existingCached?.systemSizeKw) 
    || cleanNumeric(linkedLead?.system_size_kw ?? linkedLead?.system_size ?? linkedLead?.metadata?.system_size_kw) 
    || 6.65;
  const priceVal = Number(row.total_price || row.contract_value_aud || row.system_price_aud || row.system_price || existingCached?.contractValueAud) || 4550;
  const projNum = row.project_number || row.project_code || existingCached?.projectNumber || existingCached?.projectCode || linkedLead?.project_number || `SOL-${row.state || 'NSW'}-001`;

  const streetAddressOnly = row.street_address 
    || existingCached?.streetAddress 
    || extractStreetAddressOnly(row.address || linkedLead?.address, row.suburb || linkedLead?.suburb, row.state || linkedLead?.state, row.postcode || linkedLead?.postcode);

  const invManuf = row.inverter_manufacturer 
    || existingCached?.inverterManufacturer 
    || (existingCached as any)?.inverterBrand 
    || linkedLead?.inverter_manufacturer 
    || linkedLead?.metadata?.inverter_manufacturer 
    || 'SolaX Power Network Technology (Zhe jiang) Co Ltd';

  const invModel = row.inverter_model 
    || existingCached?.inverterModel 
    || linkedLead?.inverter_model 
    || linkedLead?.metadata?.inverter_model 
    || 'X1-BOOST-5K-G4 (AS4777-2 2020)';

  const invSize = cleanNumeric(row.inverter_size_kw ?? existingCached?.inverterSizeKw) 
    || cleanNumeric(linkedLead?.inverter_size_kw ?? linkedLead?.metadata?.inverter_size_kw) 
    || 5;

  const invSeries = row.inverter_series 
    || existingCached?.inverterSeries 
    || linkedLead?.inverter_series 
    || linkedLead?.metadata?.inverter_series 
    || 'X1-BOOST G4';

  const noOfInv = String(row.no_of_inverters || existingCached?.noOfInverters || linkedLead?.no_of_inverters || '1');

  const pManuf = row.panel_manufacturer 
    || existingCached?.panelManufacturer 
    || (existingCached as any)?.panelBrand 
    || linkedLead?.panel_manufacturer 
    || linkedLead?.metadata?.panel_manufacturer 
    || 'LONGi Green Energy Technology Co Ltd';

  const pSize = String(row.panel_size_w || existingCached?.panelSizeW || linkedLead?.panel_size_w || linkedLead?.panel_size || '475');
  const pSeries = row.panel_series || existingCached?.panelSeries || linkedLead?.panel_series || 'LR7';
  const pModel = row.panel_model || existingCached?.panelModel || linkedLead?.panel_model || 'LR7-54HTH-475M (IEC 61215-2021)';
  const pCount = Number(row.no_of_panels || existingCached?.panelCount || existingCached?.noOfPanels || linkedLead?.no_of_panels || linkedLead?.panel_count || 14);

  const fName = row.first_name || existingCached?.firstName || linkedLead?.first_name || (row.customer_name ? row.customer_name.split(' ')[0] : 'Rojin');
  const lName = row.last_name || existingCached?.lastName || linkedLead?.last_name || (row.customer_name ? row.customer_name.split(' ').slice(1).join(' ') : 'Piya');
  const fullCustName = row.customer_name || existingCached?.customerName || `${fName} ${lName}`.trim() || 'Rojin Piya';
  const primaryPhone = row.primary_mobile || row.customer_phone || existingCached?.primaryMobile || linkedLead?.primary_mobile || linkedLead?.phone || '0422 401 402';
  const custEmail = row.email || row.customer_email || existingCached?.email || linkedLead?.email || 'restoration.kr@gmail.com';

  const depVal = Number(row.deposit_aud ?? row.deposit ?? row.deposit_paid ?? existingCached?.deposit) || 455.05;
  const depDate = row.deposit_received_date || existingCached?.depositReceivedDate || linkedLead?.deposit_received_date || '2026-10-03';
  const sDate = row.sale_date || existingCached?.saleDate || linkedLead?.sale_date || '2026-09-16';

  const stcCnt = typeof row.solar_stcs_count === 'number' ? row.solar_stcs_count : (typeof existingCached?.stcCount === 'number' ? existingCached.stcCount : Math.round(systemKw * 10));

  return {
    ...(existingCached || {}),
    id: row.id,
    projectCode: projNum,
    projectNumber: projNum,
    title: (row.title && !row.title.startsWith('0kW')) ? row.title : `${systemKw}kW Solar System`,
    customerId: row.contact_id || row.lead_id || existingCached?.customerId || '',
    customerName: fullCustName,
    customerEmail: custEmail,
    customerPhone: primaryPhone,
    address: row.address || existingCached?.address || `${streetAddressOnly}, ${row.suburb || 'Edens Landing'} ${row.state || 'QLD'} ${row.postcode || '4207'}`,
    streetAddress: streetAddressOnly,
    suburb: row.suburb || existingCached?.suburb || 'Edens Landing',
    state: row.state || existingCached?.state || 'QLD',
    postcode: row.postcode || existingCached?.postcode || '4207',
    area: row.area || existingCached?.area || 'Metro',
    nearestBigCity: row.nearest_big_city || existingCached?.nearestBigCity || 'Brisbane',
    dnsp: row.electricity_distributor || row.dnsp || existingCached?.dnsp || (row.state === 'QLD' ? 'Energex' : 'Ausgrid'),
    electricityDistributor: row.electricity_distributor || existingCached?.electricityDistributor || (row.state === 'QLD' ? 'Energex' : 'Ausgrid'),
    status: normalizeProjectStatus(row.status || existingCached?.status || row.stage || existingCached?.projectStage),
    projectStage: normalizeProjectStage(row.stage || existingCached?.projectStage || row.status || existingCached?.status),
    
    // Customer Details
    firstName: fName,
    lastName: lName,
    managerRenteeFirstName: row.manager_rentee_first_name || existingCached?.managerRenteeFirstName || '',
    managerRenteeLastName: row.manager_rentee_last_name || existingCached?.managerRenteeLastName || '',
    primaryMobile: primaryPhone,
    secondaryMobile: row.secondary_mobile || existingCached?.secondaryMobile || '',
    email: custEmail,
    salesPersonName: row.sales_person_name || existingCached?.salesPersonName || 'Mitchell Barnes',
    saleDate: sDate,
    salesTeamNotes: row.sales_team_notes || existingCached?.salesTeamNotes || '',

    // Technical Hardware
    systemSizeKw: systemKw,
    noOfPanels: String(pCount),
    panelManufacturer: pManuf,
    panelSizeW: pSize,
    panelSeries: pSeries,
    panelModel: pModel,
    panelBrand: pManuf,
    panelCount: pCount,

    noOfInverters: noOfInv,
    inverterManufacturer: invManuf,
    inverterSizeKw: String(invSize),
    inverterSeries: invSeries,
    inverterModel: invModel,
    inverterBrand: invManuf,

    noOfBatteries: String(row.no_of_batteries ?? existingCached?.noOfBatteries ?? 0),
    batteryManufacturer: row.battery_manufacturer || existingCached?.batteryManufacturer || '',
    batteryModel: row.battery_model || existingCached?.batteryModel || '',
    usableCapacity: String(row.battery_usable_capacity_kwh ?? existingCached?.usableCapacity ?? ''),
    batterySize: row.battery_size || existingCached?.batterySize || '',
    roofType: row.roof_type || existingCached?.roofType || 'Colorbond / Metal Sheet',
    houseStorey: row.house_storey || existingCached?.houseStorey || 'Single Storey',
    phase: row.electrical_phase || existingCached?.phase || 'Single Phase',
    existingSystemDetails: row.existing_system_details || existingCached?.existingSystemDetails || 'No existing solar installed (Brand new installation)',
    docsReceived: row.docs_received !== undefined && row.docs_received !== null ? (row.docs_received ? 'Yes' : 'No') : (existingCached?.docsReceived || 'Yes'),
    docsReceivedDate: row.docs_received_date || existingCached?.docsReceivedDate || '',

    // Checklist
    q1CustomerNameMatch: row.q1_customer_name_match !== undefined ? (row.q1_customer_name_match ? 'Yes' : 'No') : (existingCached?.q1CustomerNameMatch || 'Yes'),
    q2AddressMatch: row.q2_address_match !== undefined ? (row.q2_address_match ? 'Yes' : 'No') : (existingCached?.q2AddressMatch || 'Yes'),
    q3MeterMatch: row.q3_meter_match !== undefined ? (row.q3_meter_match ? 'Yes' : 'No') : (existingCached?.q3MeterMatch || 'Yes'),
    q4MeterPhase: row.q4_meter_phase || existingCached?.q4MeterPhase || 'Single Phase',
    q5OpenSolarSystemMatch: row.q5_opensolar_system_match !== undefined ? (row.q5_opensolar_system_match ? 'Yes' : 'No') : (existingCached?.q5OpenSolarSystemMatch || 'Yes'),
    q6OpenSolarPricingMatch: row.q6_opensolar_pricing_match !== undefined ? (row.q6_opensolar_pricing_match ? 'Yes' : 'No') : (existingCached?.q6OpenSolarPricingMatch || 'Yes'),

    // Grid
    nmi: row.nmi || existingCached?.nmi || '41020000001',
    gridAppRef: row.grid_app_ref || existingCached?.gridAppRef || 'DNSP-APP-001',
    energyRetailer: row.energy_retailer || existingCached?.energyRetailer || 'Origin Energy',
    retailerRef: row.retailer_ref || existingCached?.retailerRef || '',
    gridAppStatus: row.grid_app_status || existingCached?.gridAppStatus || 'Grid App Approved',
    gridAppliedDate: row.grid_applied_date || existingCached?.gridAppliedDate || '',
    gridRejectedDate: row.grid_rejected_date || existingCached?.gridRejectedDate || '',
    gridApprovalDate: row.grid_approval_date || existingCached?.gridApprovalDate || '',

    // Installation
    installationDate: row.installation_date || existingCached?.installationDate || '',
    installationStatus: row.installation_status || existingCached?.installationStatus || 'Site Survey',
    installationBookingDate: row.booking_date || existingCached?.installationBookingDate || '',
    installationBookedBy: row.booked_by || existingCached?.installationBookedBy || 'Operations Coordinator',
    installationCompletedMonth: row.completed_month || existingCached?.installationCompletedMonth || '',
    installationDocsStatus: row.installation_docs_status || existingCached?.installationDocsStatus || 'Pending',
    installationDocsReceivedDate: row.install_docs_received_date || existingCached?.installationDocsReceivedDate || '',
    installerName: row.installer_name || existingCached?.installerName || 'Direct Solar Contractors QLD',
    installerInvoiceDate: row.installer_invoice_date || existingCached?.installerInvoiceDate || '',
    installerInvoiceNumber: row.installer_invoice_number || existingCached?.installerInvoiceNumber || '',
    installerInvoiceAmount: row.installer_invoice_amount_aud ? String(row.installer_invoice_amount_aud) : (existingCached?.installerInvoiceAmount || ''),
    installerInvoiceStatus: row.installer_invoice_status || existingCached?.installerInvoiceStatus || 'Pending Approval',
    customerInvoiceNumber: row.customer_final_invoice_number || existingCached?.customerInvoiceNumber || 'INV-9979467',

    // Warehouse
    warehouse: row.warehouse_location || existingCached?.warehouse || 'Brisbane Distribution Centre',
    salesOrderNo: row.sales_order_number || existingCached?.salesOrderNo || 'SO-9979467',
    warehouseInvoiceDate: row.warehouse_invoice_date || existingCached?.warehouseInvoiceDate || '',
    warehouseInvoiceNumber: row.warehouse_invoice_number || existingCached?.warehouseInvoiceNumber || '',
    warehouseInvoiceAmount: row.warehouse_invoice_amount_aud ? String(row.warehouse_invoice_amount_aud) : (existingCached?.warehouseInvoiceAmount || ''),
    warehouseInvoiceStatus: row.warehouse_invoice_status || existingCached?.warehouseInvoiceStatus || 'Draft',
    stockStatus: row.stock_status || existingCached?.stockStatus || 'In Stock',
    stockUsedProject: row.stock_used_project || existingCached?.stockUsedProject || '',

    // Financials
    contractValueAud: priceVal,
    sellingPrice: row.selling_price_aud != null ? String(row.selling_price_aud) : (existingCached?.sellingPrice || String(priceVal)),
    systemPrice: row.system_price_aud != null ? String(row.system_price_aud) : (row.system_price != null ? String(row.system_price) : (existingCached?.systemPrice || String(priceVal))),
    deposit: row.deposit_aud != null ? String(row.deposit_aud) : (row.deposit != null ? String(row.deposit) : (existingCached?.deposit || String(depVal))),
    depositReceivedDate: row.deposit_received_date || existingCached?.depositReceivedDate || depDate,
    balancePayable: row.balance_payable_aud != null ? String(row.balance_payable_aud) : (existingCached?.balancePayable || String(Math.max(0, priceVal - depVal))),
    balancePayableDate: row.balance_payable_date || existingCached?.balancePayableDate || '',
    remainingPayment: row.remaining_payment_aud != null ? String(row.remaining_payment_aud) : (existingCached?.remainingPayment || String(Math.max(0, priceVal - depVal))),
    isOnFinance: row.is_on_finance !== undefined && row.is_on_finance !== null ? (row.is_on_finance ? 'Yes' : 'No') : (existingCached?.isOnFinance || 'No (Cash / Direct Payment)'),
    financeCompanyName: row.finance_company_name || existingCached?.financeCompanyName || '',
    financeStatus: row.finance_status || existingCached?.financeStatus || 'Not Applicable',
    financeAppliedDate: row.finance_applied_date || existingCached?.financeAppliedDate || '',
    financeApprovedDate: row.finance_approved_date || existingCached?.financeApprovedDate || '',
    financeApprovedAmount: row.finance_approved_amount_aud != null ? String(row.finance_approved_amount_aud) : (existingCached?.financeApprovedAmount || ''),

    // STC
    stcCount: stcCnt,
    customerStcRateAud: 36.00,
    customerStcValueAud: Math.round(stcCnt * 36.00),
    internalStcRateAud: 39.50,
    internalStcValueAud: Math.round(stcCnt * 39.50),
    stcValueAud: Math.round(stcCnt * 39.50),
    bridgeSelectStatus: existingCached?.bridgeSelectStatus || 'Pending Verification',
    openSolarProposalId: existingCached?.openSolarProposalId || '',
    openSolarContractSigned: Boolean(existingCached?.openSolarContractSigned),
    stcTradedPortal: row.stc_traded_portal || existingCached?.stcTradedPortal || 'BridgeSelect',
    stcJobNo: row.stc_job_no || existingCached?.stcJobNo || 'STC-9979467',
    solarStcs: row.solar_stcs_count != null ? String(row.solar_stcs_count) : (existingCached?.solarStcs || String(stcCnt)),
    solarStcsAmount: row.solar_stcs_amount_aud != null ? String(row.solar_stcs_amount_aud) : (existingCached?.solarStcsAmount || String(Math.round(stcCnt * 36.00))),
    solarStcReceivedDate: row.solar_stc_received_date || existingCached?.solarStcReceivedDate || '',
    batteryStcs: row.battery_stcs_count != null ? String(row.battery_stcs_count) : (existingCached?.batteryStcs || '0'),
    batteryStcsAmount: row.battery_stcs_amount_aud != null ? String(row.battery_stcs_amount_aud) : (existingCached?.batteryStcsAmount || '0.00'),
    batteryStcReceivedDate: row.battery_stc_received_date || existingCached?.batteryStcReceivedDate || '',
    totalStcAmountReceived: row.total_stc_amount_received_aud != null ? String(row.total_stc_amount_received_aud) : (existingCached?.totalStcAmountReceived || String(Math.round(stcCnt * 36.00))),
    adminCharges: row.admin_charges_aud != null ? String(row.admin_charges_aud) : (existingCached?.adminCharges || '150.00'),
    stcStatus: row.stc_status || existingCached?.stcStatus || 'Approved & Traded',
    stcSubmittedDate: row.stc_submitted_date || existingCached?.stcSubmittedDate || '',

    leadId: row.lead_id || existingCached?.leadId || ''
  };
}

export async function getDbProjects(): Promise<Project[]> {
  let fileProjects: Project[] = [];
  try {
    if (fs.existsSync(PROJECTS_DB_FILE)) {
      fileProjects = JSON.parse(fs.readFileSync(PROJECTS_DB_FILE, 'utf8'));
    }
  } catch (err) {
    console.warn('[ProjectsDb] Could not read .projects_db.json:', err);
  }

  // Also query Supabase if available
  const supabase = getSupabase();
  if (supabase) {
    try {
      // 1. Fetch leads map so hardware specifications and customer details are never lost
      const { data: dbLeads } = await supabase.from('leads').select('*');
      const leadsById = new Map<string, any>();
      const leadsByProjNum = new Map<string, any>();
      (dbLeads || []).forEach(l => {
        if (l.id) leadsById.set(l.id, l);
        if (l.metadata?.original_id) leadsById.set(l.metadata.original_id, l);
        if (l.project_number) leadsByProjNum.set(String(l.project_number).trim(), l);
      });

      // 2. Fetch projects from Supabase
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        const fileProjectsMap = new Map<string, Project>();
        fileProjects.forEach(p => {
          fileProjectsMap.set(p.id, p);
          if (p.projectCode) fileProjectsMap.set(p.projectCode, p);
          if (p.projectNumber) fileProjectsMap.set(p.projectNumber, p);
        });

        const mergedProjects: Project[] = [];
        const seenIds = new Set<string>();

        data.forEach(row => {
          const cached = fileProjectsMap.get(row.id) || (row.project_number ? fileProjectsMap.get(row.project_number) : undefined);
          const matchedLead = (row.lead_id && leadsById.get(row.lead_id)) || (row.project_number && leadsByProjNum.get(String(row.project_number).trim()));
          const projObj = mapSupabaseRowToProject(row, matchedLead, cached);

          mergedProjects.push(projObj);
          seenIds.add(projObj.id);
          seenIds.add(toDeterministicUuid(projObj.id));
          if (projObj.projectCode) seenIds.add(projObj.projectCode);
          if (projObj.projectNumber) seenIds.add(projObj.projectNumber);
        });

        // Add any cached projects that weren't in Supabase
        fileProjects.forEach(p => {
          if (!seenIds.has(p.id) && (!p.projectCode || !seenIds.has(p.projectCode)) && (!p.projectNumber || !seenIds.has(p.projectNumber))) {
            mergedProjects.push(p);
          }
        });

        fileProjects = mergedProjects;
        // Keep file cache in sync
        try {
          fs.writeFileSync(PROJECTS_DB_FILE, JSON.stringify(fileProjects, null, 2), 'utf8');
        } catch {}
      }
    } catch (err: any) {
      console.warn('[ProjectsDb] Error querying Supabase projects table:', err.message || err);
    }
  }

  // Ensure every project has complete numeric defaults so no undefined property errors occur
  return fileProjects.map(p => {
    const systemKw = Number(p.systemSizeKw) || 6.65;
    const contractVal = Number(p.contractValueAud ?? (p as any).amount ?? (p as any).totalContractAud) || 4550;
    const stcCount = typeof p.stcCount === 'number' ? p.stcCount : Math.round(systemKw * 10);
    const custRate = p.customerStcRateAud ?? 36.00;
    const intRate = p.internalStcRateAud ?? 39.50;
    const custVal = p.customerStcValueAud ?? Math.round(stcCount * custRate);
    const intVal = p.internalStcValueAud ?? Math.round(stcCount * intRate);
    return {
      ...p,
      contractValueAud: contractVal,
      stcCount,
      customerStcRateAud: custRate,
      customerStcValueAud: custVal,
      internalStcRateAud: intRate,
      internalStcValueAud: intVal,
      stcValueAud: p.stcValueAud ?? intVal,
      suburb: p.suburb || ''
    };
  });
}

/**
 * Fetches a single project directly from Supabase by ID or UUID.
 */
export async function getDbProjectById(id: string): Promise<Project | null> {
  if (!id) return null;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const targetUuid = toDeterministicUuid(id);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isIdUuid = uuidRegex.test(id);
      const isTargetUuid = uuidRegex.test(targetUuid);

      let query = supabase.from('projects').select('*');

      if (isIdUuid && targetUuid === id) {
        query = query.eq('id', id);
      } else if (isTargetUuid && isIdUuid) {
        query = query.or(`id.eq.${targetUuid},id.eq.${id}`);
      } else if (isTargetUuid) {
        query = query.eq('id', targetUuid);
      } else if (isIdUuid) {
        query = query.eq('id', id);
      }

      let { data, error } = await query.limit(1);

      if ((error || !data || data.length === 0) && !isIdUuid) {
        // Fallback: check by project_number or lead_id
        const fallback = await supabase
          .from('projects')
          .select('*')
          .or(`project_number.eq.${id},lead_id.eq.${id}`)
          .limit(1);
        if (!fallback.error && fallback.data && fallback.data.length > 0) {
          data = fallback.data;
          error = null;
        }
      }
      if (!error && Array.isArray(data) && data.length > 0) {
        const row = data[0];

        // Fetch associated lead to ensure complete hardware resolution
        let matchedLead: any = null;
        if (row.lead_id) {
          const { data: leadData } = await supabase.from('leads').select('*').eq('id', row.lead_id).limit(1);
          if (leadData && leadData.length > 0) {
            matchedLead = leadData[0];
          }
        }
        if (!matchedLead && row.project_number) {
          const { data: leadData } = await supabase.from('leads').select('*').eq('project_number', row.project_number).limit(1);
          if (leadData && leadData.length > 0) {
            matchedLead = leadData[0];
          }
        }

        const all = await getDbProjects();
        const existing = all.find(p => p.id === row.id || toDeterministicUuid(p.id) === targetUuid || p.projectCode === row.project_number || p.projectNumber === row.project_number);

        return mapSupabaseRowToProject(row, matchedLead, existing || undefined);
      }
    } catch (err: any) {
      console.warn('[ProjectsDb] Error fetching single project from Supabase:', err.message || err);
    }
  }

  const all = await getDbProjects();
  return all.find(p => p.id === id || toDeterministicUuid(p.id) === toDeterministicUuid(id) || p.projectCode === id || p.projectNumber === id) || null;
}

function convertProjectToDbRow(
  p: Project,
  allowed: Set<string>,
  validLeadIds: Set<string>,
  validContactIds: Set<string>,
  leadIdByOriginal: Map<string, string>
): Record<string, any> {
  let leadUuid: string | null = null;
  if (p.leadId) {
    if (validLeadIds.has(p.leadId)) {
      leadUuid = p.leadId;
    } else if (leadIdByOriginal.has(p.leadId)) {
      leadUuid = leadIdByOriginal.get(p.leadId) || null;
    } else {
      const computed = toDeterministicUuid(p.leadId);
      if (validLeadIds.has(computed)) {
        leadUuid = computed;
      }
    }
  }

  let contactUuid: string | null = null;
  const rawContactId = p.customerId || (p as any).contactId;
  if (rawContactId) {
    if (validContactIds.has(rawContactId)) {
      contactUuid = rawContactId;
    } else {
      const computedContact = toDeterministicUuid(rawContactId);
      if (validContactIds.has(computedContact)) {
        contactUuid = computedContact;
      }
    }
  }

  const systemKw = Number(p.systemSizeKw) || 6.6;
  const contractVal = Number(p.contractValueAud) || 0;
  const addressVal = p.address ? p.address.trim() : (p.suburb ? `${p.suburb}, ${p.state || 'NSW'}` : 'Australia');
  const projNum = p.projectCode || p.projectNumber || `SOL-${p.state || 'NSW'}-${Math.floor(1000 + Math.random() * 9000)}`;
  const depVal = parseFloat(String(p.deposit || '').replace(/[^0-9.]/g, '')) || 0;
  const depDate = p.depositReceivedDate || null;

  const fName = (p.firstName && p.firstName.trim()) || (p.customerName ? p.customerName.split(' ')[0] : 'Customer');
  const lName = (p.lastName && p.lastName.trim()) || (p.customerName ? p.customerName.split(' ').slice(1).join(' ') : 'Client') || 'Client';
  const custName = (p.customerName && p.customerName.trim()) || `${fName} ${lName}`.trim() || 'Valued Customer';
  const streetAddr = (p.streetAddress && p.streetAddress.trim()) || extractStreetAddressOnly(addressVal, p.suburb, p.state, p.postcode) || addressVal || 'Installation Site';
  const sub = (p.suburb && p.suburb.trim()) || 'Sydney';
  const pMobile = (p.primaryMobile && p.primaryMobile.trim()) || p.customerPhone || (p as any).phone || '0400000000';
  const pEmail = (p.email && p.email.trim()) || p.customerEmail || (p as any).email || 'customer@example.com';
  const nmiVal = (p.nmi && p.nmi.trim()) || '41020000001';
  const dnspVal = (p.electricityDistributor && p.electricityDistributor.trim()) || (p.dnsp && p.dnsp.trim()) || (p.state === 'QLD' ? 'Energex' : 'Ausgrid');

  const candidateRow: Record<string, any> = {
    id: toDeterministicUuid(p.id),
    title: p.title || `${systemKw}kW Solar System`,
    project_number: projNum,
    contact_id: contactUuid,
    lead_id: leadUuid,
    customer_name: custName,
    customer_email: pEmail,
    customer_phone: pMobile,
    street_address: streetAddr,
    address: addressVal,
    suburb: sub,
    state: p.state || 'NSW',
    postcode: p.postcode || null,
    area: p.area || 'Metro',
    nearest_big_city: p.nearestBigCity || null,
    first_name: fName,
    last_name: lName,
    manager_rentee_first_name: p.managerRenteeFirstName || null,
    manager_rentee_last_name: p.managerRenteeLastName || null,
    primary_mobile: pMobile,
    secondary_mobile: p.secondaryMobile || null,
    email: pEmail,
    sales_team_notes: p.salesTeamNotes || null,
    sales_person_name: p.salesPersonName || null,
    system_size: systemKw,
    system_size_kw: systemKw,
    no_of_panels: cleanNumeric(p.noOfPanels || (p as any).panelCount) || null,
    panel_manufacturer: p.panelManufacturer || (p as any).panelBrand || null,
    panel_size_w: cleanNumeric(p.panelSizeW) || null,
    panel_series: p.panelSeries || null,
    panel_model: p.panelModel || null,
    no_of_inverters: cleanNumeric(p.noOfInverters) || 1,
    inverter_manufacturer: p.inverterManufacturer || (p as any).inverterBrand || null,
    inverter_size_kw: cleanNumeric(p.inverterSizeKw) || null,
    inverter_series: p.inverterSeries || null,
    inverter_model: p.inverterModel || null,
    no_of_batteries: cleanNumeric(p.noOfBatteries) || 0,
    battery_manufacturer: p.batteryManufacturer || (p as any).batteryBrand || null,
    battery_usable_capacity_kwh: cleanNumeric(p.usableCapacity || (p as any).batteryCapacityKwh) || null,
    battery_model: p.batteryModel || null,
    battery_size: p.batterySize || null,
    roof_type: p.roofType || null,
    house_storey: p.houseStorey || null,
    electrical_phase: p.phase || null,
    existing_system_details: p.existingSystemDetails || null,
    docs_received: p.docsReceived === 'Yes' || (p.docsReceived as any) === true,
    docs_received_date: cleanDate(p.docsReceivedDate),
    q1_customer_name_match: p.q1CustomerNameMatch === 'Yes' || (p.q1CustomerNameMatch as any) === true,
    q2_address_match: p.q2AddressMatch === 'Yes' || (p.q2AddressMatch as any) === true,
    q3_meter_match: p.q3MeterMatch === 'Yes' || (p.q3MeterMatch as any) === true,
    q4_meter_phase: p.q4MeterPhase || 'Single Phase',
    q5_opensolar_system_match: p.q5OpenSolarSystemMatch === 'Yes' || (p.q5OpenSolarSystemMatch as any) === true,
    q6_opensolar_pricing_match: p.q6OpenSolarPricingMatch === 'Yes' || (p.q6OpenSolarPricingMatch as any) === true,
    nmi: nmiVal,
    electricity_distributor: dnspVal,
    grid_app_ref: p.gridAppRef || null,
    energy_retailer: p.energyRetailer || null,
    retailer_ref: p.retailerRef || null,
    grid_app_status: p.gridAppStatus || null,
    grid_applied_date: cleanDate(p.gridAppliedDate),
    grid_rejected_date: cleanDate(p.gridRejectedDate),
    grid_approval_date: cleanDate(p.gridApprovalDate),
    installation_date: cleanDate(p.installationDate),
    installation_status: p.installationStatus || null,
    booking_date: cleanDate(p.installationBookingDate || (p as any).booking_date),
    booked_by: p.installationBookedBy || null,
    completed_month: p.installationCompletedMonth || null,
    installation_docs_status: p.installationDocsStatus || null,
    install_docs_received_date: cleanDate(p.installationDocsReceivedDate || (p as any).install_docs_received_date),
    installer_name: p.installerName || null,
    installer_invoice_date: cleanDate(p.installerInvoiceDate),
    installer_invoice_number: p.installerInvoiceNumber || null,
    installer_invoice_amount_aud: cleanNumeric(p.installerInvoiceAmount) || 0,
    installer_invoice_status: p.installerInvoiceStatus || null,
    customer_final_invoice_number: p.customerInvoiceNumber || null,
    warehouse_location: p.warehouse || null,
    sales_order_number: p.salesOrderNo || null,
    warehouse_invoice_date: cleanDate(p.warehouseInvoiceDate),
    warehouse_invoice_number: p.warehouseInvoiceNumber || null,
    warehouse_invoice_amount_aud: cleanNumeric(p.warehouseInvoiceAmount) || 0,
    warehouse_invoice_status: p.warehouseInvoiceStatus || null,
    stock_status: p.stockStatus || null,
    stock_used_project: p.stockUsedProject || null,
    selling_price_aud: cleanNumeric(p.sellingPrice) || contractVal,
    status: normalizeProjectStatus(p.status || p.projectStage),
    stage: normalizeProjectStage(p.projectStage || p.status),
    total_price: contractVal,
    system_price_aud: cleanNumeric(p.systemPrice) || contractVal,
    system_price: cleanNumeric(p.systemPrice) || contractVal,
    budget_aud: contractVal,
    deposit_paid: depVal,
    deposit_aud: depVal,
    deposit: depVal,
    deposit_received_date: cleanDate(depDate),
    sale_date: cleanDate((p as any).saleDate || (p as any).sale_date),
    balance_payable_aud: cleanNumeric(p.balancePayable) || 0,
    balance_payable_date: cleanDate(p.balancePayableDate),
    remaining_payment_aud: cleanNumeric(p.remainingPayment) || 0,
    is_on_finance: p.isOnFinance === 'Yes' || (p.isOnFinance as any) === true,
    finance_company_name: p.financeCompanyName || null,
    finance_status: p.financeStatus || null,
    finance_applied_date: cleanDate(p.financeAppliedDate),
    finance_approved_date: cleanDate(p.financeApprovedDate),
    finance_approved_amount_aud: cleanNumeric(p.financeApprovedAmount) || 0,
    stc_traded_portal: p.stcTradedPortal || null,
    stc_job_no: p.stcJobNo || null,
    solar_stcs_count: cleanNumeric(p.solarStcs || p.stcCount) || 0,
    solar_stcs_amount_aud: cleanNumeric(p.solarStcsAmount) || 0,
    solar_stc_received_date: cleanDate(p.solarStcReceivedDate),
    battery_stcs_count: cleanNumeric(p.batteryStcs) || 0,
    battery_stcs_amount_aud: cleanNumeric(p.batteryStcsAmount) || 0,
    battery_stc_received_date: cleanDate(p.batteryStcReceivedDate),
    total_stc_amount_received_aud: cleanNumeric(p.totalStcAmountReceived) || 0,
    admin_charges_aud: cleanNumeric(p.adminCharges) || 0,
    stc_status: p.stcStatus || null,
    stc_submitted_date: cleanDate(p.stcSubmittedDate),
    updated_at: new Date().toISOString()
  };

  const filteredRow: Record<string, any> = {};
  for (const [k, v] of Object.entries(candidateRow)) {
    if (allowed.has(k)) {
      filteredRow[k] = v;
    }
  }
  return filteredRow;
}

export async function saveDbProjects(projects: Project[]): Promise<boolean> {
  try {
    fs.writeFileSync(PROJECTS_DB_FILE, JSON.stringify(projects, null, 2), 'utf8');
  } catch (err) {
    console.warn('[ProjectsDb] Could not write .projects_db.json:', err);
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: dbLeads } = await supabase.from('leads').select('id, metadata');
      const validLeadIds = new Set<string>((dbLeads || []).map(l => l.id));
      const leadIdByOriginal = new Map<string, string>();
      (dbLeads || []).forEach(l => {
        if (l.metadata && typeof l.metadata === 'object' && l.metadata.original_id) {
          leadIdByOriginal.set(l.metadata.original_id, l.id);
        }
      });

      const { data: dbContacts } = await supabase.from('contacts').select('id');
      const validContactIds = new Set<string>((dbContacts || []).map(c => c.id));

      const allowed = await getProjectTableColumns();
      const rows = projects.map(p => convertProjectToDbRow(p, allowed, validLeadIds, validContactIds, leadIdByOriginal));

      const uniqueRowsMap = new Map<string, any>();
      const seenProjNumbers = new Set<string>();

      for (const row of rows) {
        if (uniqueRowsMap.has(row.id)) continue;
        if (row.project_number && seenProjNumbers.has(row.project_number)) {
          row.project_number = `${row.project_number}-${row.id.substring(0, 4)}`;
        }
        if (row.project_number) seenProjNumbers.add(row.project_number);
        uniqueRowsMap.set(row.id, row);
      }

      const uniqueRows = Array.from(uniqueRowsMap.values());
      if (uniqueRows.length === 0) return true;

      const { error: upsertErr } = await supabase.from('projects').upsert(uniqueRows, { onConflict: 'id' });
      if (upsertErr) {
        console.warn('[ProjectsDb] Error upserting projects to Supabase:', upsertErr.message, upsertErr.code);
      } else {
        console.log(`[ProjectsDb] Successfully synced ${uniqueRows.length} project(s) to Supabase`);
      }
    } catch (err: any) {
      console.warn('[ProjectsDb] Warning updating Supabase projects:', err.message || err);
    }
  }

  return true;
}

export async function saveSingleDbProject(project: Project): Promise<Project> {
  const current = await getDbProjects();
  const targetUuid = toDeterministicUuid(project.id);
  const existingIdx = current.findIndex(p =>
    p.id === project.id ||
    toDeterministicUuid(p.id) === targetUuid ||
    (project.projectNumber && (p.projectNumber === project.projectNumber || p.projectCode === project.projectNumber)) ||
    (project.projectCode && (p.projectCode === project.projectCode || p.projectNumber === project.projectCode))
  );

  let savedProject: Project;
  let next: Project[];
  if (existingIdx >= 0) {
    savedProject = {
      ...current[existingIdx],
      ...project,
      id: current[existingIdx].id,
      status: normalizeProjectStatus(project.status || current[existingIdx].status),
      projectStage: normalizeProjectStage(project.projectStage || project.status || current[existingIdx].projectStage)
    };
    next = [...current];
    next[existingIdx] = savedProject;
  } else {
    savedProject = {
      ...project,
      status: normalizeProjectStatus(project.status),
      projectStage: normalizeProjectStage(project.projectStage || project.status)
    };
    next = [savedProject, ...current];
  }

  // 1. Update local cache
  try {
    fs.writeFileSync(PROJECTS_DB_FILE, JSON.stringify(next, null, 2), 'utf8');
  } catch (err) {
    console.warn('[ProjectsDb] Could not write .projects_db.json:', err);
  }

  // 2. Persist directly and reliably to Supabase
  const supabase = getSupabase();
  if (supabase) {
    try {
      const allowed = await getProjectTableColumns();

      const { data: dbLeads } = await supabase.from('leads').select('id, metadata');
      const validLeadIds = new Set<string>((dbLeads || []).map(l => l.id));
      const leadIdByOriginal = new Map<string, string>();
      (dbLeads || []).forEach(l => {
        if (l.metadata && typeof l.metadata === 'object' && l.metadata.original_id) {
          leadIdByOriginal.set(l.metadata.original_id, l.id);
        }
      });

      const { data: dbContacts } = await supabase.from('contacts').select('id');
      const validContactIds = new Set<string>((dbContacts || []).map(c => c.id));

      const row = convertProjectToDbRow(savedProject, allowed, validLeadIds, validContactIds, leadIdByOriginal);

      // Check for existing DB row safely by valid UUID or project_number
      let existingDbId: string | null = null;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const candidateUuids = [row.id, savedProject.id, project.id].filter(u => u && typeof u === 'string' && uuidRegex.test(u));

      if (candidateUuids.length > 0) {
        const { data: idMatches } = await supabase
          .from('projects')
          .select('id, project_number')
          .in('id', candidateUuids)
          .limit(1);
        if (idMatches && idMatches.length > 0) {
          existingDbId = idMatches[0].id;
        }
      }

      if (!existingDbId) {
        const pNumbers = [savedProject.projectNumber, savedProject.projectCode, project.projectNumber, project.projectCode].filter(Boolean);
        if (pNumbers.length > 0) {
          const { data: numMatches } = await supabase
            .from('projects')
            .select('id, project_number')
            .in('project_number', pNumbers)
            .limit(1);
          if (numMatches && numMatches.length > 0) {
            existingDbId = numMatches[0].id;
          }
        }
      }

      if (existingDbId) {
        row.id = existingDbId;
        savedProject.id = existingDbId;
      }

      console.log(`[ProjectsDb] Persisting single project to Supabase: id=${row.id}, project_number=${row.project_number}`);

      let saveError: any = null;
      if (existingDbId) {
        const { error: updateErr } = await supabase
          .from('projects')
          .update(row)
          .eq('id', existingDbId);
        if (updateErr) {
          saveError = updateErr;
        }
      } else {
        const { error: upsertErr } = await supabase
          .from('projects')
          .upsert(row, { onConflict: 'id' });
        if (upsertErr) {
          saveError = upsertErr;
        }
      }

      if (saveError) {
        console.error('[ProjectsDb] Failed to save project to Supabase:', saveError.message, saveError.code);
        throw new Error(`Failed to save project to Supabase: ${saveError.message}`);
      }

      console.log(`[ProjectsDb] Successfully saved project ${row.id} to Supabase`);
    } catch (err: any) {
      console.error('[ProjectsDb] Error in saveSingleDbProject Supabase sync:', err.message || err);
      throw err;
    }
  }

  return savedProject;
}

export async function deleteDbProject(id: string): Promise<boolean> {
  const current = await getDbProjects();
  const next = current.filter(p => p.id !== id && p.projectCode !== id);
  await saveDbProjects(next);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const uuid = toDeterministicUuid(id);
      await supabase.from('projects').delete().or(`id.eq.${uuid},id.eq.${id}`);
    } catch (err: any) {
      console.warn('[ProjectsDb] Warning deleting project from Supabase:', err.message || err);
    }
  }
  return true;
}

export async function deleteDbProjects(ids: string[]): Promise<boolean> {
  const idSet = new Set(ids);
  const current = await getDbProjects();
  const next = current.filter(p => !idSet.has(p.id) && (!p.projectCode || !idSet.has(p.projectCode)));
  await saveDbProjects(next);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const uuids = ids.map(toDeterministicUuid);
      await supabase.from('projects').delete().in('id', [...uuids, ...ids]);
    } catch (err: any) {
      console.warn('[ProjectsDb] Warning batch deleting projects from Supabase:', err.message || err);
    }
  }
  return true;
}

export async function clearAllDbProjects(): Promise<boolean> {
  await saveDbProjects([]);

  const supabase = getSupabase();
  if (supabase) {
    try {
      // First delete dependent jobs
      await supabase.from('jobs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (e) {}
    try {
      await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      console.log('[ProjectsDb] All projects permanently cleared from Supabase');
    } catch (err: any) {
      console.warn('[ProjectsDb] Warning clearing projects from Supabase:', err.message || err);
    }
  }
  return true;
}

