import * as XLSX from 'xlsx';
import { PanelHierarchyItem, InverterHierarchyItem, BatteryHierarchyItem } from '../types';

export interface HardwareParsePreviewRow {
  type: 'panel' | 'inverter' | 'battery';
  manufacturer: string;
  size: string;
  series: string;
  model: string;
  extra?: string;
  status: 'valid' | 'warning' | 'invalid';
  notes?: string;
}

export interface HardwareParseResult {
  totalRows: number;
  validRows: number;
  warningRows: number;
  invalidRows: number;
  panels: PanelHierarchyItem[];
  inverters: InverterHierarchyItem[];
  batteries: BatteryHierarchyItem[];
  warnings: string[];
  errors: string[];
  previewRows: HardwareParsePreviewRow[];
}

/**
 * Clean & normalize numeric watts (e.g. "440W", "440 W", 440 -> 440)
 */
export function normalizeWatts(val: any): number {
  if (typeof val === 'number' && !isNaN(val)) return val;
  const str = String(val || '').replace(/[^0-9.]/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 440 : Math.round(parsed);
}

/**
 * Clean & normalize inverter power (e.g. "5.0kW", "5000W", "5.0" -> 5.0)
 */
export function normalizeKw(val: any): number {
  if (typeof val === 'number' && !isNaN(val)) {
    return val > 100 ? Number((val / 1000).toFixed(1)) : val;
  }
  const raw = String(val || '').trim();
  const lower = raw.toLowerCase();
  const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return 5.0;
  if (lower.includes('w') && !lower.includes('kw') && num > 100) {
    return Number((num / 1000).toFixed(1));
  }
  if (num > 100) return Number((num / 1000).toFixed(1));
  return Number(num.toFixed(1));
}

/**
 * Clean & normalize battery usable capacity in kWh (e.g. "13.5kWh", 13.5 -> 13.5)
 */
export function normalizeKwh(val: any): number {
  if (typeof val === 'number' && !isNaN(val)) return val;
  const str = String(val || '').replace(/[^0-9.]/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 13.5 : Number(parsed.toFixed(1));
}

/**
 * Trigger file download helper
 */
function downloadWorkbook(workbook: XLSX.WorkBook, filename: string) {
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 150);
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 150);
}

/**
 * Export active hardware catalog to Excel (.xlsx) with 4 sheets
 */
export function exportHardwareToExcel(
  data: {
    panelHierarchy: PanelHierarchyItem[];
    inverterHierarchy: InverterHierarchyItem[];
    batteryHierarchy: BatteryHierarchyItem[];
  },
  filename = 'Solar_Hardware_Equipment_Catalog.xlsx'
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Solar Panels
  const panelRows = data.panelHierarchy.map(p => ({
    'Manufacturer / Brand': p.manufacturer,
    'Watts (W)': p.sizeW,
    'Series Name': p.series,
    'Model Number & Description': p.model
  }));
  const wsPanels = XLSX.utils.json_to_sheet(
    panelRows.length > 0
      ? panelRows
      : [{ 'Manufacturer / Brand': 'AIKO Solar', 'Watts (W)': 440, 'Series Name': 'Neostar 2P', 'Model Number & Description': 'AIKO-A440-MAH54Mb (All-Black N-Type ABC)' }]
  );
  wsPanels['!cols'] = [{ wch: 26 }, { wch: 14 }, { wch: 24 }, { wch: 48 }];
  XLSX.utils.book_append_sheet(wb, wsPanels, 'Solar Panels');

  // Sheet 2: Solar Inverters
  const inverterRows = data.inverterHierarchy.map(i => ({
    'Manufacturer / Brand': i.manufacturer,
    'Rated Power (kW)': i.sizeKw,
    'Series Name': i.series || '',
    'Model Number & Description': i.model
  }));
  const wsInverters = XLSX.utils.json_to_sheet(
    inverterRows.length > 0
      ? inverterRows
      : [{ 'Manufacturer / Brand': 'Sungrow', 'Rated Power (kW)': 5.0, 'Series Name': 'SG Series Single Phase', 'Model Number & Description': 'SG5.0RS-ADA (Single Phase Dual MPPT String)' }]
  );
  wsInverters['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 26 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsInverters, 'Inverters');

  // Sheet 3: Battery Storage
  const batteryRows = data.batteryHierarchy.map(b => ({
    'Manufacturer / Brand': b.manufacturer,
    'Usable Capacity (kWh)': b.usableCapacityKwh,
    'Series Name': b.series || '',
    'Model Number & Description': b.model,
    'Physical Form Factor / Enclosure': b.size || ''
  }));
  const wsBatteries = XLSX.utils.json_to_sheet(
    batteryRows.length > 0
      ? batteryRows
      : [{ 'Manufacturer / Brand': 'Tesla Powerwall 3 (13.5kWh)', 'Usable Capacity (kWh)': 13.5, 'Series Name': 'Powerwall 3', 'Model Number & Description': 'Tesla Powerwall 3 Integrated Inverter', 'Physical Form Factor / Enclosure': '13.5kWh Wall Mounted Slimline' }]
  );
  wsBatteries['!cols'] = [{ wch: 30 }, { wch: 22 }, { wch: 24 }, { wch: 48 }, { wch: 38 }];
  XLSX.utils.book_append_sheet(wb, wsBatteries, 'Battery Storage');

  // Sheet 4: Guide & Column Field Instructions
  const guideRows = [
    {
      'Hardware Type': 'Solar Panels',
      'Required Columns': 'Manufacturer / Brand, Watts (W), Series Name, Model Number & Description',
      'Dependent Dropdown Flow': '1. Brand -> 2. Watts -> 3. Series -> 4. Model',
      'Field Notes': 'Watts can be 415, 440, 475, 500, etc. Model is what gets saved to Leads, OpenSolar, & Projects.'
    },
    {
      'Hardware Type': 'Inverters',
      'Required Columns': 'Manufacturer / Brand, Rated Power (kW), Series Name, Model Number & Description',
      'Dependent Dropdown Flow': '1. Brand -> 2. Rated kW -> 3. Series -> 4. Model',
      'Field Notes': 'Rated Power can be 5.0, 6.0, 8.2, 10.0 or Watts e.g. 5000. CEC approved inverters for Australian DNSPs.'
    },
    {
      'Hardware Type': 'Battery Storage',
      'Required Columns': 'Manufacturer / Brand, Usable Capacity (kWh), Series Name, Model Number & Description, Physical Form Factor / Enclosure',
      'Dependent Dropdown Flow': '1. Brand -> 2. Usable Capacity -> 3. Series -> 4. Model',
      'Field Notes': 'Usable Capacity e.g. 9.6, 13.5, 16.0. Form factor describes tower stack or wall mount.'
    }
  ];
  const wsGuide = XLSX.utils.json_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 18 }, { wch: 55 }, { wch: 40 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Field Guide & Instructions');

  downloadWorkbook(wb, filename);
}

/**
 * Export Starter Template (.xlsx or .csv)
 */
export function exportHardwareTemplate(type: 'master_xlsx' | 'panels_csv' | 'inverters_csv' | 'batteries_csv') {
  if (type === 'master_xlsx') {
    const wb = XLSX.utils.book_new();

    const samplePanels = [
      { 'Manufacturer / Brand': 'AIKO Solar', 'Watts (W)': 440, 'Series Name': 'Neostar 2P', 'Model Number & Description': 'AIKO-A440-MAH54Mb (All-Black N-Type ABC)' },
      { 'Manufacturer / Brand': 'AIKO Solar', 'Watts (W)': 475, 'Series Name': 'Stellar Series', 'Model Number & Description': 'AIKO-A475-MAH60Mb (High Output N-Type)' },
      { 'Manufacturer / Brand': 'Trina Solar', 'Watts (W)': 440, 'Series Name': 'Vertex S+ Dual Glass', 'Model Number & Description': 'TSM-440NEG9R.28 (Clear Black N-Type)' },
      { 'Manufacturer / Brand': 'Jinko Solar', 'Watts (W)': 440, 'Series Name': 'Tiger Neo N-Type', 'Model Number & Description': 'JKM440N-54HL4R-B (Full Black)' }
    ];
    const wsPanels = XLSX.utils.json_to_sheet(samplePanels);
    wsPanels['!cols'] = [{ wch: 24 }, { wch: 14 }, { wch: 24 }, { wch: 46 }];
    XLSX.utils.book_append_sheet(wb, wsPanels, 'Solar Panels');

    const sampleInverters = [
      { 'Manufacturer / Brand': 'Fronius', 'Rated Power (kW)': 5.0, 'Series Name': 'Primo GEN24 Plus', 'Model Number & Description': 'Primo GEN24 5.0 Plus (Single Phase Hybrid Ready)' },
      { 'Manufacturer / Brand': 'Fronius', 'Rated Power (kW)': 10.0, 'Series Name': 'Symo GEN24 Plus', 'Model Number & Description': 'Symo GEN24 10.0 Plus (Three Phase Hybrid)' },
      { 'Manufacturer / Brand': 'Sungrow', 'Rated Power (kW)': 5.0, 'Series Name': 'SG Series Single Phase', 'Model Number & Description': 'SG5.0RS-ADA (Single Phase Dual MPPT String)' },
      { 'Manufacturer / Brand': 'Sungrow', 'Rated Power (kW)': 10.0, 'Series Name': 'SH Series Three Phase', 'Model Number & Description': 'SH10RT-20 (Three Phase High Voltage Hybrid)' }
    ];
    const wsInverters = XLSX.utils.json_to_sheet(sampleInverters);
    wsInverters['!cols'] = [{ wch: 24 }, { wch: 18 }, { wch: 24 }, { wch: 48 }];
    XLSX.utils.book_append_sheet(wb, wsInverters, 'Inverters');

    const sampleBatteries = [
      { 'Manufacturer / Brand': 'Tesla Powerwall 3 (13.5kWh)', 'Usable Capacity (kWh)': 13.5, 'Series Name': 'Powerwall 3', 'Model Number & Description': 'Tesla Powerwall 3 Integrated Inverter', 'Physical Form Factor / Enclosure': '13.5kWh Wall Mounted Slimline' },
      { 'Manufacturer / Brand': 'Sungrow SBR Battery', 'Usable Capacity (kWh)': 9.6, 'Series Name': 'SBR High Voltage', 'Model Number & Description': 'SBR096 High Voltage Modular', 'Physical Form Factor / Enclosure': '3 Modules (9.6kWh Floor Mounted Tower)' },
      { 'Manufacturer / Brand': 'Sungrow SBR Battery', 'Usable Capacity (kWh)': 12.8, 'Series Name': 'SBR High Voltage', 'Model Number & Description': 'SBR128 High Voltage Modular', 'Physical Form Factor / Enclosure': '4 Modules (12.8kWh Floor Mounted Tower)' }
    ];
    const wsBatteries = XLSX.utils.json_to_sheet(sampleBatteries);
    wsBatteries['!cols'] = [{ wch: 26 }, { wch: 22 }, { wch: 24 }, { wch: 46 }, { wch: 38 }];
    XLSX.utils.book_append_sheet(wb, wsBatteries, 'Battery Storage');

    downloadWorkbook(wb, 'Solar_Hardware_Starter_Template.xlsx');
    return;
  }

  if (type === 'panels_csv') {
    const csv = `Manufacturer,Watts,Series,Model\nAIKO Solar,440,Neostar 2P,AIKO-A440-MAH54Mb (All-Black N-Type ABC)\nAIKO Solar,475,Stellar Series,AIKO-A475-MAH60Mb (High Output)\nTrina Solar,440,Vertex S+ Dual Glass,TSM-440NEG9R.28 (Clear Black N-Type)\nJinko Solar,440,Tiger Neo N-Type,JKM440N-54HL4R-B (Full Black)`;
    downloadCsv(csv, 'Solar_Panels_Template.csv');
    return;
  }

  if (type === 'inverters_csv') {
    const csv = `Manufacturer,Rated_kW,Series,Model\nFronius,5.0,Primo GEN24 Plus,Primo GEN24 5.0 Plus (Single Phase Hybrid Ready)\nFronius,10.0,Symo GEN24 Plus,Symo GEN24 10.0 Plus (Three Phase Hybrid)\nSungrow,5.0,SG Series Single Phase,SG5.0RS-ADA (Single Phase Dual MPPT String)\nSungrow,10.0,SH Series Three Phase,SH10RT-20 (Three Phase High Voltage Hybrid)`;
    downloadCsv(csv, 'Solar_Inverters_Template.csv');
    return;
  }

  if (type === 'batteries_csv') {
    const csv = `Manufacturer,Usable_Capacity_kWh,Series,Model,Form_Factor\nTesla Powerwall 3 (13.5kWh),13.5,Powerwall 3,Tesla Powerwall 3 Integrated Inverter,13.5kWh Wall Mounted Slimline\nSungrow SBR Battery,9.6,SBR High Voltage,SBR096 High Voltage Modular,3 Modules (9.6kWh Floor Mounted Tower)\nSungrow SBR Battery,12.8,SBR High Voltage,SBR128 High Voltage Modular,4 Modules (12.8kWh Floor Mounted Tower)`;
    downloadCsv(csv, 'Battery_Storage_Template.csv');
    return;
  }
}

/**
 * Flexible header matching helper
 */
function findColValue(row: Record<string, any>, possibleNames: string[]): any {
  for (const name of possibleNames) {
    const lowerName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [key, val] of Object.entries(row)) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanKey === lowerName || cleanKey.includes(lowerName)) {
        return val;
      }
    }
  }
  return undefined;
}

/**
 * Parse an uploaded hardware Excel or CSV file
 */
export async function parseHardwareFile(file: File): Promise<HardwareParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const result: HardwareParseResult = {
    totalRows: 0,
    validRows: 0,
    warningRows: 0,
    invalidRows: 0,
    panels: [],
    inverters: [],
    batteries: [],
    warnings: [],
    errors: [],
    previewRows: []
  };

  const sheetNames = workbook.SheetNames;

  for (const sheetName of sheetNames) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if (!rawRows || rawRows.length === 0) continue;

    const lowerSheet = sheetName.toLowerCase();
    const isExplicitPanelSheet = lowerSheet.includes('panel');
    const isExplicitInverterSheet = lowerSheet.includes('inverter');
    const isExplicitBatterySheet = lowerSheet.includes('battery');

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      // Skip guide / instruction rows if any
      const firstVal = String(Object.values(row)[0] || '').toLowerCase();
      if (firstVal.includes('guide') || firstVal.includes('required columns') || firstVal.includes('dependent dropdown')) {
        continue;
      }

      // Check explicit category column if sheet is consolidated
      const categoryCol = findColValue(row, ['category', 'type', 'hardware_type', 'equipment_type', 'kind']);
      const categoryStr = String(categoryCol || '').toLowerCase();

      // Determine target equipment type
      let type: 'panel' | 'inverter' | 'battery' | null = null;
      if (isExplicitPanelSheet || categoryStr.includes('panel')) {
        type = 'panel';
      } else if (isExplicitInverterSheet || categoryStr.includes('inverter')) {
        type = 'inverter';
      } else if (isExplicitBatterySheet || categoryStr.includes('battery') || categoryStr.includes('storage')) {
        type = 'battery';
      } else {
        // Auto-detect based on presence of distinctive columns
        const hasWatts = findColValue(row, ['watts', 'sizew', 'watt', 'panel_watts', 'w']) !== undefined;
        const hasCapacity = findColValue(row, ['capacity', 'kwh', 'usablecapacity', 'usablecapacitykwh', 'battery_capacity']) !== undefined;
        const hasKw = findColValue(row, ['sizekw', 'kw', 'inverter_kw', 'rated_power']) !== undefined;

        if (hasWatts) type = 'panel';
        else if (hasCapacity) type = 'battery';
        else if (hasKw) type = 'inverter';
        else {
          // Fallback to checking first sheet or manufacturer hints
          type = isExplicitInverterSheet ? 'inverter' : isExplicitBatterySheet ? 'battery' : 'panel';
        }
      }

      // Extract fields
      const rawManuf = findColValue(row, ['manufacturer', 'brand', 'make', 'supplier', 'vendor', 'panel_brand', 'inverter_brand', 'battery_brand']);
      const rawModel = findColValue(row, ['model', 'model_number', 'model_name', 'description', 'part_number', 'sku']);
      const rawSeries = findColValue(row, ['series', 'series_name', 'family', 'product_line', 'line']);
      const rawSize = findColValue(row, ['size', 'watts', 'sizew', 'sizekw', 'capacity', 'usablecapacity', 'usablecapacitykwh', 'kw', 'w', 'rating']);
      const rawFormFactor = findColValue(row, ['form_factor', 'enclosure', 'physical_size', 'mount_type', 'formfactor', 'mounting']);

      const manufacturer = String(rawManuf || '').trim();
      const model = String(rawModel || '').trim();
      const series = String(rawSeries || '').trim();

      if (!manufacturer && !model) {
        // Empty row, skip silently
        continue;
      }

      result.totalRows++;

      if (!manufacturer || !model) {
        result.invalidRows++;
        result.previewRows.push({
          type: type || 'panel',
          manufacturer: manufacturer || '(Missing Manufacturer)',
          size: String(rawSize || '-'),
          series: series || '-',
          model: model || '(Missing Model)',
          status: 'invalid',
          notes: 'Row is missing required Manufacturer/Brand or Model name'
        });
        result.errors.push(`Row ${i + 2} in "${sheetName}": Missing Manufacturer or Model`);
        continue;
      }

      if (type === 'panel') {
        const sizeW = normalizeWatts(rawSize);
        const resolvedSeries = series || `${sizeW}W High Efficiency`;
        const item: PanelHierarchyItem = {
          id: `ph-imp-${Date.now()}-${result.panels.length + 1}`,
          manufacturer,
          sizeW,
          series: resolvedSeries,
          model
        };
        result.panels.push(item);
        result.validRows++;
        result.previewRows.push({
          type: 'panel',
          manufacturer,
          size: `${sizeW}W`,
          series: resolvedSeries,
          model,
          status: 'valid'
        });
      } else if (type === 'inverter') {
        const sizeKw = normalizeKw(rawSize);
        const resolvedSeries = series || `${sizeKw}kW Series`;
        const item: InverterHierarchyItem = {
          id: `ih-imp-${Date.now()}-${result.inverters.length + 1}`,
          manufacturer,
          sizeKw,
          series: resolvedSeries,
          model
        };
        result.inverters.push(item);
        result.validRows++;
        result.previewRows.push({
          type: 'inverter',
          manufacturer,
          size: `${sizeKw} kW`,
          series: resolvedSeries,
          model,
          status: 'valid'
        });
      } else if (type === 'battery') {
        const usableCapacityKwh = normalizeKwh(rawSize);
        const resolvedSeries = series || `${usableCapacityKwh}kWh Storage`;
        const resolvedSize = String(rawFormFactor || rawSize || `${usableCapacityKwh}kWh Enclosure`).trim();
        const item: BatteryHierarchyItem = {
          id: `bh-imp-${Date.now()}-${result.batteries.length + 1}`,
          manufacturer,
          usableCapacityKwh,
          series: resolvedSeries,
          model,
          size: resolvedSize
        };
        result.batteries.push(item);
        result.validRows++;
        result.previewRows.push({
          type: 'battery',
          manufacturer,
          size: `${usableCapacityKwh} kWh`,
          series: resolvedSeries,
          model,
          extra: resolvedSize,
          status: 'valid'
        });
      }
    }
  }

  return result;
}
