import * as XLSX from 'xlsx';
import { DropdownCategoryConfig, DynamicDropdownConfig } from '../types';

export interface DropdownExcelRow {
  categoryKey: string;
  categoryLabel?: string;
  optionValue: string;
  action: 'ADD' | 'UPDATE' | 'DELETE' | 'KEEP';
  oldValue?: string;
  sortOrder?: number;
}

export interface DropdownImportRow extends DropdownExcelRow {
  sourceSheet: string;
  rowIndex: number;
  status: 'valid' | 'warning' | 'invalid';
  validationMessage?: string;
  existingMatch?: boolean;
}

export interface DropdownImportSummary {
  totalRows: number;
  validRows: number;
  addCount: number;
  updateCount: number;
  deleteCount: number;
  keepCount: number;
  warningCount: number;
  invalidCount: number;
  categoriesAffected: string[];
  rows: DropdownImportRow[];
}

export const DROPDOWN_CATEGORY_LABELS: Record<string, string> = {
  panelBrands: 'Solar PV Panel Brands (CEC Approved)',
  inverterBrands: 'Solar Inverter Brands',
  batteryBrands: 'Battery Storage Brands',
  leadSources: 'Lead Sources & Channels',
  roofTypes: 'Roof Types & Mounting Profiles',
  projectStatuses: 'Project Pipeline Stages',
  ticketCategories: 'Support & Post-Install Issue Categories',
  ticketPriorities: 'Ticket Priority Levels',
  dnspsNSW: 'NSW Electricity Distribution Networks (DNSPs)',
  dnspsQLD: 'QLD Electricity Distribution Networks (DNSPs)',
  employeeDepartments: 'Staff & Team Departments',
  referralPaymentStatuses: 'Referral Bonus Payment Statuses',
  states: 'Australian States & Territories (State Dropdown)',
  contactTypes: 'Contact Classifications & Types',
  companyTypes: 'Company Classifications & Types',
  platforms: 'Lead Inbound Platforms (Meta, Google, Forms, Referral)',
  salesPersons: 'Sales Representatives & Closers (Sale Person Name)',
  leadStatuses: 'Lead Pipeline Stages & Statuses (Lead Status)',
  houseStoreys: 'House Storey (Single, Double, Triple, Split Level)',
  phases: 'Electrical Grid Phase (Single Phase, Three Phase)',
  docsReceivedOptions: 'Documentation Received Status (Docs Received?)',
  existingSystemTemplates: 'Existing System Details Presets',
  projectStages: 'Project Stages (Project Stage)',
  electricityDistributors: 'Electricity Distributors / DNSPs',
  energyRetailers: 'Energy Retailers',
  gridApplicationStatuses: 'Grid Application Statuses',
  installationStatuses: 'Installation Statuses',
  installationBookedByOptions: 'Installation Booked By Options',
  installationMonths: 'Installation Completed Months',
  installationDocsStatuses: 'Installation Documents Statuses',
  installerInvoiceStatuses: 'Installer Invoice Statuses',
  warehouses: 'Warehouses & Logistics Hubs',
  warehouseInvoiceStatuses: 'Warehouse Invoice Statuses',
  stockStatuses: 'Stock & Warehouse Statuses',
  isFinanceOptions: 'Is On Finance Options',
  financeCompanies: 'Finance Companies',
  financeStatuses: 'Finance Application Statuses',
  stcPortals: 'STC Traded Portals',
  stcStatuses: 'STC Claims & CER Statuses',
  ebCustomerNameMatchOptions: 'EB Checklist: Customer Name Match',
  ebAddressMatchOptions: 'EB Checklist: Property Address Match',
  ebMeterMatchOptions: 'EB Checklist: Meter Number Match',
  ebMeterPhaseOptions: 'EB Checklist: Meter Phase Confirm',
  ebOpenSolarSystemMatchOptions: 'EB Checklist: OpenSolar System Match',
  ebOpenSolarPricingMatchOptions: 'EB Checklist: OpenSolar Pricing & STC Match',
  ticketIssueRecordedOptions: 'Ticket: Issue Recorded Options',
  ticketInitialCheckOptions: 'Ticket: Initial Check Options',
  ticketWorkRequiredOptions: 'Ticket: Work Required Presets',
  ticketIssueResolutionStatuses: 'Ticket: Issue Resolution Statuses',
  ticketWarrantyClaimStatuses: 'Ticket: Warranty Claim Statuses',
  ticketWarrantyClaimInvoiceStatuses: 'Ticket: Warranty Claim Invoice Statuses',
  ticketBrandNotesPresets: 'Ticket: Brand Notes Presets',
  ticketServiceIssueNotesPresets: 'Ticket: Service Issue Notes Presets',
  ticketInstallerNotesPresets: 'Ticket: Installer / Electrician Notes Presets'
};

/**
 * Normalizes a category key or label string to a known category key
 */
export function normalizeCategoryKey(rawKeyOrLabel: string): string {
  if (!rawKeyOrLabel) return 'panelBrands';
  const trimmed = rawKeyOrLabel.trim();

  // Direct match
  if (trimmed in DROPDOWN_CATEGORY_LABELS) {
    return trimmed;
  }

  // Label match
  const foundByLabel = Object.entries(DROPDOWN_CATEGORY_LABELS).find(
    ([_, label]) => label.toLowerCase() === trimmed.toLowerCase()
  );
  if (foundByLabel) return foundByLabel[0];

  // Partial or slug match
  const lower = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [key, label] of Object.entries(DROPDOWN_CATEGORY_LABELS)) {
    const keyLower = key.toLowerCase();
    const labelLower = label.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (keyLower === lower || labelLower === lower || lower.includes(keyLower) || keyLower.includes(lower)) {
      return key;
    }
  }

  // Common aliases
  if (lower.includes('panel') || lower.includes('module')) return 'panelBrands';
  if (lower.includes('inverter')) return 'inverterBrands';
  if (lower.includes('battery') || lower.includes('storage')) return 'batteryBrands';
  if (lower.includes('leadstatus') || lower.includes('leadstage')) return 'leadStatuses';
  if (lower.includes('projectstatus') || lower.includes('projectstage')) return 'projectStatuses';
  if (lower.includes('dnsp') && lower.includes('qld')) return 'dnspsQLD';
  if (lower.includes('dnsp') || lower.includes('distributor')) return 'dnspsNSW';
  if (lower.includes('state')) return 'states';
  if (lower.includes('sales')) return 'salesPersons';
  if (lower.includes('roof')) return 'roofTypes';
  if (lower.includes('warehouse')) return 'warehouses';
  if (lower.includes('finance')) return 'financeCompanies';
  if (lower.includes('ticket')) return 'ticketCategories';

  return trimmed;
}

/**
 * Trigger file download in browser
 */
function downloadWorkbook(workbook: XLSX.WorkBook, filename: string) {
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * EXPORT: Generates a multi-sheet Excel file containing all dropdown categories and options
 */
export function exportDropdownsToExcel(
  configs: DropdownCategoryConfig[],
  filename: string = `Solar_CRM_Dropdowns_Export_${new Date().toISOString().slice(0, 10)}.xlsx`
) {
  const wb = XLSX.utils.book_new();

  // 1. Consolidated Master Table (All Categories)
  const masterRows: any[] = [];
  configs.forEach(cat => {
    cat.options.forEach((opt, idx) => {
      masterRows.push({
        'Category Key': cat.key,
        'Category Name': cat.label,
        'Option Value': opt,
        'Action': 'KEEP', // User can change to ADD, UPDATE, or DELETE
        'Old Value': '',
        'Sort Order': idx + 1
      });
    });
  });

  const masterSheet = XLSX.utils.json_to_sheet(masterRows);
  masterSheet['!cols'] = [
    { wch: 22 }, // Category Key
    { wch: 42 }, // Category Name
    { wch: 38 }, // Option Value
    { wch: 12 }, // Action
    { wch: 30 }, // Old Value
    { wch: 12 }  // Sort Order
  ];
  XLSX.utils.book_append_sheet(wb, masterSheet, 'All_Dropdowns');

  // 2. High-value category-specific sheets for rapid focused editing
  const featuredCategories = [
    { key: 'panelBrands', sheetName: 'Solar_Panels', colHeader: 'Solar PV Panel Model / Brand' },
    { key: 'inverterBrands', sheetName: 'Inverters', colHeader: 'Solar Inverter Model / Brand' },
    { key: 'batteryBrands', sheetName: 'Batteries', colHeader: 'Battery Storage Model / Brand' },
    { key: 'leadStatuses', sheetName: 'Lead_Statuses', colHeader: 'Lead Pipeline Status' },
    { key: 'projectStatuses', sheetName: 'Project_Statuses', colHeader: 'Project Stage' },
    { key: 'roofTypes', sheetName: 'Roof_Types', colHeader: 'Roof Type / Profile' },
    { key: 'salesPersons', sheetName: 'Sales_Consultants', colHeader: 'Salesperson Name' },
    { key: 'warehouses', sheetName: 'Warehouses', colHeader: 'Warehouse & Logistics Hub' }
  ];

  featuredCategories.forEach(feat => {
    const found = configs.find(c => c.key === feat.key);
    const rows = (found?.options || []).map((opt, i) => ({
      'Option Value': opt,
      'Action': 'KEEP',
      'Old Value': '',
      'Sort Order': i + 1
    }));

    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet['!cols'] = [{ wch: 38 }, { wch: 12 }, { wch: 28 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, sheet, feat.sheetName);
  });

  // 3. User Guide & Categories Reference Sheet
  const guideRows = [
    {
      'Instructions': 'HOW TO USE THIS EXCEL FILE TO ADD, UPDATE, AND DELETE DROPDOWNS',
      'Example': '',
      'Notes': ''
    },
    {
      'Instructions': '1. TO ADD AN OPTION: Enter the Category Key, the Option Value, and set Action to ADD (or leave blank).',
      'Example': 'Category Key: panelBrands | Option Value: Jinko Tiger Neo 475W | Action: ADD',
      'Notes': 'Duplicate names in the same category are automatically filtered.'
    },
    {
      'Instructions': '2. TO UPDATE AN OPTION: Set Action to UPDATE, put the original name in Old Value, and the updated name in Option Value.',
      'Example': 'Category Key: panelBrands | Option Value: Jinko 475W (CEC) | Action: UPDATE | Old Value: Jinko Tiger Neo 475W',
      'Notes': 'Replaces the previous option across all forms in the CRM.'
    },
    {
      'Instructions': '3. TO DELETE AN OPTION: Set Action to DELETE and provide the exact Option Value you want removed.',
      'Example': 'Category Key: panelBrands | Option Value: Discontinued Solar Panel Model | Action: DELETE',
      'Notes': 'Removes the item from the dropdown choices.'
    },
    {
      'Instructions': '4. MULTI-CATEGORY SUPPORT: You can put items for multiple categories in the All_Dropdowns sheet, or edit category sheets directly.',
      'Example': 'All_Dropdowns sheet includes rows for panelBrands, inverterBrands, leadStatuses, etc.',
      'Notes': 'One single Excel file can update all 50+ dropdown lists in the ERP at once.'
    }
  ];

  const guideSheet = XLSX.utils.json_to_sheet(guideRows);
  guideSheet['!cols'] = [{ wch: 80 }, { wch: 50 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, guideSheet, 'Instructions_and_Help');

  // Categories Reference Sheet
  const refRows = configs.map(c => ({
    'Category Key (Use this in column A)': c.key,
    'Human Readable Category Name': c.label,
    'Current Options Count': c.options.length,
    'Sample Values': c.options.slice(0, 3).join(', ')
  }));
  const refSheet = XLSX.utils.json_to_sheet(refRows);
  refSheet['!cols'] = [{ wch: 30 }, { wch: 45 }, { wch: 22 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, refSheet, 'Categories_Reference');

  downloadWorkbook(wb, filename);
}

/**
 * EXPORT TEMPLATE: Download a starter Excel template for adding new dropdown options
 */
export function exportDropdownTemplate(
  filename: string = 'Solar_CRM_Dropdowns_Import_Template.xlsx'
) {
  const wb = XLSX.utils.book_new();

  const starterRows = [
    {
      'Category Key': 'panelBrands',
      'Category Name': 'Solar PV Panel Brands (CEC Approved)',
      'Option Value': 'Canadian Solar HiKu7 660W Bifacial',
      'Action': 'ADD',
      'Old Value': '',
      'Notes': 'Example: Add a new Tier 1 CEC-approved panel'
    },
    {
      'Category Key': 'inverterBrands',
      'Category Name': 'Solar Inverter Brands',
      'Option Value': 'Sigenergy SigenStor 10kW Hybrid 3P',
      'Action': 'ADD',
      'Old Value': '',
      'Notes': 'Example: Add a new hybrid inverter'
    },
    {
      'Category Key': 'batteryBrands',
      'Category Name': 'Battery Storage Brands',
      'Option Value': 'Tesla Powerwall 3 (13.5kWh)',
      'Action': 'UPDATE',
      'Old Value': 'Tesla Powerwall 2 (13.5kWh)',
      'Notes': 'Example: Rename or upgrade an existing hardware option'
    },
    {
      'Category Key': 'leadStatuses',
      'Category Name': 'Lead Pipeline Stages & Statuses (Lead Status)',
      'Option Value': 'Awaiting Grid Study Assessment',
      'Action': 'ADD',
      'Old Value': '',
      'Notes': 'Example: Add custom sales pipeline milestone'
    },
    {
      'Category Key': 'panelBrands',
      'Category Name': 'Solar PV Panel Brands (CEC Approved)',
      'Option Value': 'Obsolete Legacy Panel 250W',
      'Action': 'DELETE',
      'Old Value': '',
      'Notes': 'Example: Mark an obsolete panel to be removed from the system'
    }
  ];

  const sheet = XLSX.utils.json_to_sheet(starterRows);
  sheet['!cols'] = [
    { wch: 22 },
    { wch: 42 },
    { wch: 38 },
    { wch: 12 },
    { wch: 30 },
    { wch: 45 }
  ];
  XLSX.utils.book_append_sheet(wb, sheet, 'Import_Template');

  // Add categories reference sheet
  const catRef = Object.entries(DROPDOWN_CATEGORY_LABELS).map(([k, label]) => ({
    'Category Key': k,
    'Category Label': label
  }));
  const catSheet = XLSX.utils.json_to_sheet(catRef);
  catSheet['!cols'] = [{ wch: 25 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, catSheet, 'Valid_Category_Keys');

  downloadWorkbook(wb, filename);
}

/**
 * PARSE: Reads an uploaded Excel (.xlsx, .xls) or CSV file and validates rows
 */
export async function parseDropdownsExcelFile(
  file: File,
  existingConfigs: DropdownCategoryConfig[]
): Promise<DropdownImportSummary> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const rows: DropdownImportRow[] = [];
  const existingMap = new Map<string, string[]>();
  existingConfigs.forEach(c => {
    existingMap.set(c.key, c.options);
  });

  // Sheet names to process
  // If 'All_Dropdowns' or 'Import_Template' exists, prefer that.
  // Otherwise, process all sheets in the workbook!
  const hasConsolidated = workbook.SheetNames.some(
    s => s === 'All_Dropdowns' || s === 'Import_Template' || s === 'Sheet1'
  );

  for (const sheetName of workbook.SheetNames) {
    if (sheetName === 'Instructions_and_Help' || sheetName === 'Categories_Reference' || sheetName === 'Valid_Category_Keys') {
      continue; // Skip reference/help sheets
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
    if (!rawJson || rawJson.length === 0) continue;

    // Check if this sheet is dedicated to a specific category (e.g. 'Solar_Panels', 'Inverters', 'panelBrands')
    const sheetNormalizedKey = normalizeCategoryKey(sheetName);
    const isCategorySpecificSheet = sheetNormalizedKey in DROPDOWN_CATEGORY_LABELS && sheetName !== 'All_Dropdowns' && sheetName !== 'Import_Template' && sheetName !== 'Sheet1';

    rawJson.forEach((rawRow, idx) => {
      // Find field names flexibly
      let catKey = '';
      let catLabel = '';
      let optValue = '';
      let action: 'ADD' | 'UPDATE' | 'DELETE' | 'KEEP' = 'ADD';
      let oldValue = '';
      let sortOrder: number | undefined;

      for (const [col, val] of Object.entries(rawRow)) {
        const colClean = col.toLowerCase().replace(/[^a-z0-9]/g, '');
        const valStr = String(val || '').trim();

        if (colClean.includes('categorykey') || colClean === 'category' || colClean === 'key') {
          catKey = valStr;
        } else if (colClean.includes('categoryname') || colClean.includes('categorylabel')) {
          catLabel = valStr;
        } else if (colClean.includes('optionvalue') || colClean === 'value' || colClean === 'option' || colClean === 'name' || colClean.includes('model') || colClean.includes('brand')) {
          optValue = valStr;
        } else if (colClean === 'action' || colClean === 'operation' || colClean === 'type') {
          const actStr = valStr.toUpperCase();
          if (actStr === 'DELETE' || actStr === 'REMOVE') action = 'DELETE';
          else if (actStr === 'UPDATE' || actStr === 'REPLACE' || actStr === 'EDIT') action = 'UPDATE';
          else if (actStr === 'KEEP' || actStr === 'NOOP') action = 'KEEP';
          else action = 'ADD';
        } else if (colClean.includes('oldvalue') || colClean.includes('previous') || colClean.includes('target')) {
          oldValue = valStr;
        } else if (colClean.includes('sort') || colClean.includes('order')) {
          const num = Number(valStr);
          if (!isNaN(num)) sortOrder = num;
        }
      }

      // If category key was not in row, but sheet is category-specific, use sheet category
      if (!catKey && isCategorySpecificSheet) {
        catKey = sheetNormalizedKey;
      } else if (catKey) {
        catKey = normalizeCategoryKey(catKey);
      } else if (catLabel) {
        catKey = normalizeCategoryKey(catLabel);
      }

      if (!optValue && !oldValue) {
        return; // Skip empty row
      }

      const finalKey = catKey || 'panelBrands';
      const finalLabel = catLabel || DROPDOWN_CATEGORY_LABELS[finalKey] || finalKey;

      const currentOptions = existingMap.get(finalKey) || [];
      const exists = currentOptions.includes(optValue);

      // Validation logic
      let status: 'valid' | 'warning' | 'invalid' = 'valid';
      let validationMessage = '';

      if (!optValue && action !== 'DELETE') {
        status = 'invalid';
        validationMessage = 'Option value cannot be empty.';
      } else if (action === 'UPDATE' && !oldValue && !exists) {
        status = 'warning';
        validationMessage = 'Updating option without specifying an Old Value or matching an existing item.';
      } else if (action === 'DELETE' && !exists && (!oldValue || !currentOptions.includes(oldValue))) {
        status = 'warning';
        validationMessage = `Option "${optValue}" not found in current list to delete (will be ignored).`;
      } else if (action === 'ADD' && exists) {
        status = 'warning';
        validationMessage = `Option "${optValue}" already exists in ${finalLabel}.`;
      }

      rows.push({
        categoryKey: finalKey,
        categoryLabel: finalLabel,
        optionValue: optValue,
        action,
        oldValue: oldValue || undefined,
        sortOrder,
        sourceSheet: sheetName,
        rowIndex: idx + 2,
        status,
        validationMessage,
        existingMatch: exists
      });
    });
  }

  // Deduplicate and tally summary
  const validRows = rows.filter(r => r.status !== 'invalid').length;
  const invalidCount = rows.filter(r => r.status === 'invalid').length;
  const warningCount = rows.filter(r => r.status === 'warning').length;
  const addCount = rows.filter(r => r.action === 'ADD' && r.status !== 'invalid').length;
  const updateCount = rows.filter(r => r.action === 'UPDATE' && r.status !== 'invalid').length;
  const deleteCount = rows.filter(r => r.action === 'DELETE' && r.status !== 'invalid').length;
  const keepCount = rows.filter(r => r.action === 'KEEP').length;

  const categoriesSet = new Set<string>();
  rows.forEach(r => {
    if (r.categoryKey) categoriesSet.add(r.categoryKey);
  });

  return {
    totalRows: rows.length,
    validRows,
    addCount,
    updateCount,
    deleteCount,
    keepCount,
    warningCount,
    invalidCount,
    categoriesAffected: Array.from(categoriesSet),
    rows
  };
}

/**
 * APPLY: Applies the parsed import rows to the system dropdowns configuration
 * Supports both 'merge' (apply ADD, UPDATE, DELETE actions) and 'replace' (replace entire category with file items)
 */
export function applyDropdownImport(
  currentDropdowns: DynamicDropdownConfig,
  summary: DropdownImportSummary,
  mode: 'merge' | 'replace' = 'merge'
): {
  updatedDropdowns: DynamicDropdownConfig;
  addedCount: number;
  updatedCount: number;
  deletedCount: number;
  categoriesModified: number;
} {
  const result: any = { ...currentDropdowns };
  let addedCount = 0;
  let updatedCount = 0;
  let deletedCount = 0;
  const modifiedCategories = new Set<string>();

  if (mode === 'replace') {
    // Group all valid rows by category
    const grouped = new Map<string, string[]>();
    summary.rows.forEach(r => {
      if (r.status === 'invalid' || r.action === 'DELETE') return;
      const list = grouped.get(r.categoryKey) || [];
      if (r.optionValue && !list.includes(r.optionValue)) {
        list.push(r.optionValue);
      }
      grouped.set(r.categoryKey, list);
    });

    grouped.forEach((newOptions, catKey) => {
      result[catKey] = newOptions;
      modifiedCategories.add(catKey);
    });

    return {
      updatedDropdowns: result as DynamicDropdownConfig,
      addedCount: summary.validRows,
      updatedCount: 0,
      deletedCount: 0,
      categoriesModified: modifiedCategories.size
    };
  }

  // Merge Mode: process ADD, UPDATE, DELETE actions
  summary.rows.forEach(r => {
    if (r.status === 'invalid' || r.action === 'KEEP') return;

    const catKey = r.categoryKey;
    const currentList: string[] = Array.isArray(result[catKey]) ? [...result[catKey]] : [];

    if (r.action === 'ADD') {
      if (r.optionValue && !currentList.includes(r.optionValue)) {
        currentList.push(r.optionValue);
        addedCount++;
        modifiedCategories.add(catKey);
      }
    } else if (r.action === 'UPDATE') {
      const targetOld = r.oldValue || r.optionValue;
      const idx = currentList.findIndex(item => item.toLowerCase() === targetOld.toLowerCase());
      if (idx !== -1) {
        currentList[idx] = r.optionValue;
        updatedCount++;
        modifiedCategories.add(catKey);
      } else if (!currentList.includes(r.optionValue)) {
        // Fallback: If old value not found, add the new value
        currentList.push(r.optionValue);
        addedCount++;
        modifiedCategories.add(catKey);
      }
    } else if (r.action === 'DELETE') {
      const targetVal = r.optionValue || r.oldValue;
      if (targetVal) {
        const filtered = currentList.filter(item => item.toLowerCase() !== targetVal.toLowerCase());
        if (filtered.length !== currentList.length) {
          deletedCount++;
          modifiedCategories.add(catKey);
        }
        result[catKey] = filtered;
        return;
      }
    }

    result[catKey] = currentList;
  });

  return {
    updatedDropdowns: result as DynamicDropdownConfig,
    addedCount,
    updatedCount,
    deletedCount,
    categoriesModified: modifiedCategories.size
  };
}
