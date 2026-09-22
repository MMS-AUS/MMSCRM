/**
 * Google Sheets Lead Template Specification & Downloader
 * Generates official CSV & XLSX-compatible formats mapping accurately to the
 * 23-field dynamic Lead Architecture in MySolarCRM.
 */

export interface GoogleSheetLeadColumn {
  header: string;
  key: string;
  example: string;
  description: string;
  required: boolean;
  type: string;
}

export const GOOGLE_SHEET_LEAD_COLUMNS: GoogleSheetLeadColumn[] = [
  {
    header: 'Lead Date',
    key: 'leadDate',
    example: '2026-09-16',
    description: 'Date the lead was generated (YYYY-MM-DD or DD/MM/YYYY)',
    required: true,
    type: 'Date'
  },
  {
    header: 'Platform',
    key: 'platform',
    example: 'Meta Lead Ads (Facebook/Instagram)',
    description: 'Inbound marketing source (Meta, Google Search, TikTok, Referral, etc.)',
    required: false,
    type: 'Text'
  },
  {
    header: 'Sales Rep',
    key: 'salesPersonName',
    example: 'Mitchell Barnes',
    description: 'Assigned Solar Sales Consultant in CRM',
    required: false,
    type: 'Text'
  },
  {
    header: 'Status',
    key: 'status',
    example: 'New',
    description: 'Pipeline Stage: New, Contacted, Site Survey Scheduled, Proposal Sent, Contract Signed, Deposit Received',
    required: false,
    type: 'Text'
  },
  {
    header: 'First Name',
    key: 'firstName',
    example: 'Ashleigh',
    description: 'Homeowner or decision maker first name',
    required: true,
    type: 'Text'
  },
  {
    header: 'Last Name',
    key: 'lastName',
    example: 'Miller',
    description: 'Homeowner or decision maker last name',
    required: true,
    type: 'Text'
  },
  {
    header: 'Primary Mobile',
    key: 'primaryMobile',
    example: '0433 112 998',
    description: 'Australian mobile number (auto-formatted with 0 prefix)',
    required: true,
    type: 'Phone'
  },
  {
    header: 'Secondary Mobile',
    key: 'secondaryMobile',
    example: '0433 998 112',
    description: 'Secondary mobile or partner contact number',
    required: false,
    type: 'Phone'
  },
  {
    header: 'Email',
    key: 'email',
    example: 'ashleigh.m@outlook.com.au',
    description: 'Customer email address for solar quotes & customer portal',
    required: true,
    type: 'Email'
  },
  {
    header: 'Street Address',
    key: 'address',
    example: '50 Brisbane Street',
    description: 'Physical installation property address',
    required: true,
    type: 'Address'
  },
  {
    header: 'Suburb',
    key: 'suburb',
    example: 'Ipswich',
    description: 'Property suburb (used to auto-detect nearest Australian major city)',
    required: true,
    type: 'Text'
  },
  {
    header: 'State',
    key: 'state',
    example: 'QLD',
    description: 'Australian State: NSW, QLD, VIC, WA, SA, TAS, ACT, NT',
    required: true,
    type: 'State'
  },
  {
    header: 'Postcode',
    key: 'postcode',
    example: '4305',
    description: '4-digit Australian postcode (auto-classifies Metro vs Regional)',
    required: true,
    type: 'Postcode'
  },
  {
    header: 'Area',
    key: 'area',
    example: 'Metro',
    description: 'Metro or Regional (leave blank to auto-calculate from postcode)',
    required: false,
    type: 'Calculated'
  },
  {
    header: 'Nearest Big City',
    key: 'nearestBigCity',
    example: 'Brisbane',
    description: 'Closest metropolitan capital (leave blank to auto-calculate)',
    required: false,
    type: 'Calculated'
  },
  {
    header: 'System Size kW',
    key: 'systemSizeKw',
    example: '10.4',
    description: 'Desired solar PV capacity in kilowatts',
    required: false,
    type: 'Number'
  },
  {
    header: 'Battery Required',
    key: 'batteryRequired',
    example: 'Yes',
    description: 'Whether energy storage is requested (Yes/No)',
    required: false,
    type: 'Boolean'
  },
  {
    header: 'Property Type',
    key: 'propertyType',
    example: 'Residential Single-Storey',
    description: 'Residential Single-Storey, Double-Storey, Commercial, Multi-dwelling',
    required: false,
    type: 'Text'
  },
  {
    header: 'Roof Type',
    key: 'roofType',
    example: 'Colorbond / Metal Sheet',
    description: 'Colorbond, Tile, Tin, Klip-Lok, Slate, Terracotta',
    required: false,
    type: 'Text'
  },
  {
    header: 'System Price AUD',
    key: 'systemPrice',
    example: '14900',
    description: 'Gross turnkey solar proposal price ($)',
    required: false,
    type: 'Currency'
  },
  {
    header: 'Selling Price AUD',
    key: 'sellingPrice',
    example: '10800',
    description: 'Net price after STC rebate discount ($)',
    required: false,
    type: 'Currency'
  },
  {
    header: 'Deposit AUD',
    key: 'deposit',
    example: '1500',
    description: 'Initial deposit amount received or agreed ($)',
    required: false,
    type: 'Currency'
  },
  {
    header: 'Sales Notes',
    key: 'salesTeamNotes',
    example: 'DNSP pre-approval submitted. Customer interested in 9.6kWh battery upgrade.',
    description: 'Internal consultation notes and customer requirements',
    required: false,
    type: 'Text'
  }
];

export function generateGoogleSheetLeadTemplateCsv(): string {
  const headers = GOOGLE_SHEET_LEAD_COLUMNS.map(c => `"${c.header.replace(/"/g, '""')}"`).join(',');
  
  // Row 1: Example Row 1 (Metro QLD)
  const sample1 = [
    '2026-09-16',
    'Meta Lead Ads (Facebook/Instagram)',
    'Mitchell Barnes',
    'New',
    'Ashleigh',
    'Miller',
    '0433 112 998',
    '0433 998 112',
    'ashleigh.m@outlook.com.au',
    '50 Brisbane Street',
    'Ipswich',
    'QLD',
    '4305',
    'Metro',
    'Brisbane',
    '10.4',
    'Yes',
    'Residential Single-Storey',
    'Colorbond / Metal Sheet',
    '14900',
    '10800',
    '1500',
    'Signed commercial solar agreement. Needs Energex DNSP fast-track.'
  ].map(val => `"${val.replace(/"/g, '""')}"`).join(',');

  // Row 2: Example Row 2 (Regional NSW)
  const sample2 = [
    '2026-09-15',
    'Meta Lead Ads (Facebook/Instagram)',
    'Chloe Gallagher',
    'Proposal Sent',
    'Declan',
    'Macarthur',
    '0455 223 881',
    '',
    'declan.m@geelongsolar.com.au',
    '82 Moorabool Street',
    'Geelong',
    'VIC',
    '3220',
    'Regional',
    'Geelong',
    '13.2',
    'Yes',
    'Residential Double-Storey',
    'Concrete Tile',
    '16800',
    '12400',
    '2000',
    'Requested Sungrow hybrid inverter with backup gateway.'
  ].map(val => `"${val.replace(/"/g, '""')}"`).join(',');

  // Row 3: Minimal Row (Testing blank defaults)
  const sample3 = [
    '2026-09-14',
    'Website Contact Form',
    'Liam Evans',
    'New',
    'Sarah',
    'Jenkins',
    '0412 345 678',
    '',
    'sarah.jenkins@gmail.com',
    '142 Pacific Highway',
    'North Sydney',
    'NSW',
    '2060',
    '',
    '',
    '6.6',
    'No',
    'Residential Single-Storey',
    'Colorbond / Metal Sheet',
    '6990',
    '4800',
    '500',
    'Interested in 6.6kW single phase system with Ausgrid connection.'
  ].map(val => `"${val.replace(/"/g, '""')}"`).join(',');

  return `${headers}\r\n${sample1}\r\n${sample2}\r\n${sample3}\r\n`;
}

/**
 * Trigger direct in-browser download of the Google Sheet Lead Format
 */
export function downloadGoogleSheetLeadFormat(filename = 'MySolarCRM_Leads_GoogleSheet_Format.csv') {
  const csvContent = generateGoogleSheetLeadTemplateCsv();
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
