import { getSupabase } from './supabase.ts';
import { getDbLeadById } from './leadsDb.ts';
import { toDeterministicUuid } from './contactsDb.ts';
import { saveSingleDbProject } from './projectsDb.ts';
import { Lead, Project } from '../src/types/index.ts';

/**
 * Australian street suffix patterns.
 */
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

  // If already separated by commas:
  // e.g. "57 Grove Rd, Edens Landing QLD 4207" or "Unit 2/14 Kangaroo Point Rd, Kangaroo Point, QLD 4169"
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
    // Single string without commas: e.g. "12 King St Brisbane QLD 4000"
    // 1. Remove 4-digit postcode at end
    clean = clean.replace(/\s+\d{4}\s*$/, '');
    // 2. Remove Australian state abbreviations at end
    clean = clean.replace(/\s+(?:NSW|QLD|VIC|ACT|SA|WA|TAS|NT)\s*$/i, '');
    // 3. Remove known suburb if it appears after street name
    if (knownSuburb && knownSuburb.trim().length > 1) {
      const sub = knownSuburb.trim();
      const subIdx = clean.toLowerCase().lastIndexOf(sub.toLowerCase());
      if (subIdx > 0) {
        clean = clean.substring(0, subIdx).trim();
      }
    }
    // 4. Remove known postcode if still attached
    if (knownPostcode && knownPostcode.trim().length > 0) {
      const pcIdx = clean.lastIndexOf(knownPostcode.trim());
      if (pcIdx > 0) {
        clean = clean.substring(0, pcIdx).trim();
      }
    }
    // 5. Remove known state if still attached
    if (knownState && knownState.trim().length > 0) {
      const stIdx = clean.toUpperCase().lastIndexOf(knownState.trim().toUpperCase());
      if (stIdx > 0 && stIdx === clean.length - knownState.trim().length) {
        clean = clean.substring(0, stIdx).trim();
      }
    }
  }

  // Strip trailing punctuation / hyphens
  clean = clean.replace(/[\s,-]+$/, '').trim();
  return clean || rawAddress.trim();
}

/**
 * Server-side lead-to-project conversion logic.
 */
export async function convertLeadToProjectOnServer(leadId: string): Promise<Project> {
  const lead = await getDbLeadById(leadId);
  if (!lead) {
    throw new Error(`Lead with ID "${leadId}" was not found.`);
  }

  const today = new Date().toISOString().split('T')[0];
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const state = lead.state || 'NSW';
  const projectCode = lead.projectNumber?.trim() || `SOL-${state}-${randNum}`;

  // 1. CRITICAL ADDRESS EXTRACTION (STRICTLY STREET LINE ONLY)
  const streetAddressOnly = extractStreetAddressOnly(
    lead.address,
    lead.suburb,
    lead.state,
    lead.postcode
  );

  const suburb = lead.suburb || 'Sydney';
  const postcode = lead.postcode || (state === 'QLD' ? '4000' : '2000');
  const area = lead.area || 'Metro';
  const nearestBigCity = lead.nearestBigCity || (state === 'QLD' ? 'Brisbane' : 'Sydney');

  // Customer Name resolution
  const firstName = lead.firstName || (lead.customerName ? lead.customerName.split(' ')[0] : 'Customer');
  const lastName = lead.lastName || (lead.customerName ? lead.customerName.split(' ').slice(1).join(' ') : 'Account') || 'Account';
  const fullName = `${firstName} ${lastName}`.trim();
  const primaryMobile = lead.primaryMobile || lead.phone || '0400000000';
  const email = lead.email || 'customer@example.com';

  // System Size & Hardware resolution
  let systemSizeKw = Number(lead.systemSizeKw) || 0;
  const noOfPanels = Number(lead.noOfPanels) || (systemSizeKw > 0 ? Math.ceil((systemSizeKw * 1000) / 440) : 15);
  const panelSizeW = Number(lead.panelSizeW) || 440;
  if (!systemSizeKw || systemSizeKw <= 0) {
    systemSizeKw = Math.round((noOfPanels * panelSizeW / 1000) * 100) / 100;
  }
  if (!systemSizeKw || systemSizeKw <= 0) {
    systemSizeKw = 6.6;
  }

  // Financials
  const parseNum = (v: any) => {
    if (typeof v === 'number') return v;
    const n = parseFloat(String(v || '').replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  };

  const sellingPrice = parseNum(lead.sellingPrice) || Math.round(systemSizeKw * 1150 + (lead.batteryRequired ? 8500 : 0));
  const deposit = parseNum(lead.deposit) || 1000;
  const balancePayable = Math.max(0, sellingPrice - deposit);
  const approxStcs = Math.round(systemSizeKw * 10);
  const solarStcsAmount = Math.round(approxStcs * 36.00);
  const systemPrice = parseNum(lead.systemPrice) || (sellingPrice + solarStcsAmount);

  // Grid / NMI
  const nmi = `410${Math.floor(10000000 + Math.random() * 90000000)}`;
  const electricityDistributor = state === 'QLD' ? 'Energex' : 'Ausgrid';

  // Build clean Project object
  const newProject: Project = {
    id: `proj-${Date.now()}`,
    projectCode,
    projectNumber: projectCode,
    title: `${systemSizeKw}kW ${lead.batteryRequired ? '+ Battery' : 'Solar System'}`,
    customerId: lead.contactId || `cnt-${Date.now()}`,
    customerName: fullName,
    customerEmail: email,
    customerPhone: primaryMobile,

    // STREET ADDRESS - STRICTLY STREET LINE ONLY (NO SUBURB/STATE/POSTCODE CONCATENATION!)
    address: streetAddressOnly,
    streetAddress: streetAddressOnly,
    suburb,
    state: state as any,
    postcode,
    area,
    nearestBigCity,
    depositReceivedDate: lead.depositReceivedDate || today,

    // Customer & Rentee Details
    firstName,
    lastName,
    managerRenteeFirstName: lead.managerRenteeFirstName || '',
    managerRenteeLastName: lead.managerRenteeLastName || '',
    primaryMobile,
    secondaryMobile: lead.secondaryMobile || '',
    email,
    salesTeamNotes: lead.salesTeamNotes || '',
    salesPersonName: lead.salesPersonName || 'Mitchell Barnes',
    saleDate: lead.saleDate || today,

    // Technical Hardware
    systemSizeKw,
    noOfPanels: String(noOfPanels),
    panelManufacturer: lead.panelManufacturer || 'AIKO Solar',
    panelSizeW: String(panelSizeW),
    panelSeries: lead.panelSeries || 'Neostar 2P',
    panelModel: lead.panelModel || '',
    panelBrand: lead.panelManufacturer || 'AIKO Solar',
    panelCount: noOfPanels,

    noOfInverters: String(lead.noOfInverters || 1),
    inverterManufacturer: lead.inverterManufacturer || 'Sungrow',
    inverterSizeKw: String(lead.inverterSizeKw || (systemSizeKw > 8 ? 8.0 : 5.0)),
    inverterSeries: lead.inverterSeries || '',
    inverterModel: lead.inverterModel || '',
    inverterBrand: lead.inverterManufacturer || 'Sungrow',

    noOfBatteries: String(lead.noOfBatteries || (lead.batteryRequired ? 1 : 0)),
    batteryManufacturer: lead.batteryManufacturer || (lead.batteryRequired ? 'Tesla Powerwall 3 (13.5kWh)' : ''),
    batteryBrand: lead.batteryManufacturer || '',
    usableCapacity: String(lead.batteryUsableCapacityKwh || (lead.batteryRequired ? 13.5 : '')),
    batteryCapacityKwh: Number(lead.batteryUsableCapacityKwh) || (lead.batteryRequired ? 13.5 : undefined),
    batteryModel: lead.batteryModel || '',
    batterySize: lead.batterySize || '',

    roofType: lead.roofType || 'Colorbond / Metal Sheet',
    houseStorey: lead.houseStorey || 'Single Storey',
    phase: lead.phase || 'Single Phase',
    existingSystemDetails: lead.existingSystemDetails || 'No existing solar installed (Brand new installation)',
    docsReceived: lead.docsReceived || 'Yes',
    docsReceivedDate: lead.docsReceivedDate || today,

    // EB & Meter Checklist
    q1CustomerNameMatch: 'Yes',
    q2AddressMatch: 'Yes',
    q3MeterMatch: 'Yes',
    q4MeterPhase: lead.phase?.includes('Three') ? 'Three Phase' : 'Single Phase',
    q5OpenSolarSystemMatch: 'Yes',
    q6OpenSolarPricingMatch: 'Yes',

    // Grid Application
    nmi,
    electricityDistributor,
    dnsp: electricityDistributor,
    gridAppRef: `DNSP-APP-${randNum}`,
    energyRetailer: 'Origin Energy',
    retailerRef: '',
    gridAppStatus: 'Not Started',
    gridAppliedDate: '',
    gridRejectedDate: '',
    gridApprovalDate: '',

    // Installation & Installer Details
    status: 'Site Survey',
    installationDate: '',
    installationStatus: 'Unscheduled',
    installationBookingDate: '',
    installationBookedBy: 'Operations Coordinator',
    installationCompletedMonth: '',
    installationDocsStatus: 'Pending',
    installationDocsReceivedDate: '',
    installerName: '',
    installerInvoiceDate: '',
    installerInvoiceNumber: '',
    installerInvoiceAmount: '',
    installerInvoiceStatus: 'Pending Approval',
    customerInvoiceNumber: lead.xeroInvoiceNumber || `INV-${randNum}`,

    // Warehouse & Equipment Dispatch
    warehouse: state === 'QLD' ? 'Brisbane Distribution Centre' : 'Sydney Central DC (Alexandria)',
    salesOrderNo: `SO-${randNum}`,
    warehouseInvoiceDate: '',
    warehouseInvoiceNumber: '',
    warehouseInvoiceAmount: '',
    warehouseInvoiceStatus: 'Draft',
    stockStatus: 'In Stock',
    stockUsedProject: '',
    warehouseInvoicePaidDate: '',

    // Financials
    contractValueAud: sellingPrice,
    systemPrice: `$${systemPrice.toLocaleString()}`,
    sellingPrice: `$${sellingPrice.toLocaleString()}`,
    deposit: `$${deposit.toLocaleString()}`,
    balancePayable: `$${balancePayable.toLocaleString()}`,
    balancePayableDate: '',
    remainingPayment: `$${balancePayable.toLocaleString()}`,
    isOnFinance: 'No (Cash / Direct Payment)',
    financeCompanyName: '',
    financeStatus: 'Not Applicable',
    financeAppliedDate: '',
    financeApprovedDate: '',
    financeApprovedAmount: '',

    // STC Details
    stcCount: approxStcs,
    customerStcRateAud: 36.00,
    customerStcValueAud: solarStcsAmount,
    internalStcRateAud: 39.50,
    internalStcValueAud: Math.round(approxStcs * 39.50),
    stcValueAud: Math.round(approxStcs * 39.50),
    bridgeSelectStatus: 'Pending Verification',
    openSolarProposalId: `OS-PROP-${randNum}`,
    openSolarContractSigned: false,
    stcTradedPortal: 'BridgeSelect',
    stcJobNo: `STC-${randNum}`,
    solarStcs: String(approxStcs),
    solarStcsAmount: `$${solarStcsAmount.toLocaleString()}`,
    solarStcReceivedDate: '',
    batteryStcs: '',
    batteryStcsAmount: '',
    batteryStcReceivedDate: '',
    totalStcAmountReceived: '',
    adminCharges: '$150.00',
    stcStatus: 'Pending Upload',
    stcSubmittedDate: '',

    leadId: lead.id,
    projectCreatedDate: today,
    projectStage: 'Site Survey'
  };

  // Persist project using authoritative projects database function
  await saveSingleDbProject(newProject);

  // Update lead in Supabase database
  const supabase = getSupabase();
  if (supabase) {
    try {
      const targetUuid = toDeterministicUuid(lead.id);
      await supabase
        .from('leads')
        .update({
          status: 'Converted to Project',
          stage: 'Converted',
          updated_at: new Date().toISOString()
        })
        .or(`id.eq.${targetUuid},id.eq.${lead.id}`);
    } catch (e: any) {
      console.warn('[ConversionLogic] Failed to update lead status in Supabase:', e.message);
    }
  }

  return newProject;
}
