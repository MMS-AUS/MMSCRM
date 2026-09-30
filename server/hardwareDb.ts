import fs from 'fs';
import path from 'path';
import { PanelHierarchyItem, InverterHierarchyItem, BatteryHierarchyItem } from '../src/types/index.ts';
import { INITIAL_DROPDOWNS } from '../src/data/initialData.ts';

const HARDWARE_DB_FILE = path.join(process.cwd(), '.hardware_hierarchy.json');

export interface HardwareHierarchyData {
  panelHierarchy: PanelHierarchyItem[];
  inverterHierarchy: InverterHierarchyItem[];
  batteryHierarchy: BatteryHierarchyItem[];
}

export function getDbHardwareHierarchy(): HardwareHierarchyData {
  try {
    if (fs.existsSync(HARDWARE_DB_FILE)) {
      const raw = fs.readFileSync(HARDWARE_DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          panelHierarchy: Array.isArray(parsed.panelHierarchy) && parsed.panelHierarchy.length > 0
            ? parsed.panelHierarchy
            : INITIAL_DROPDOWNS.panelHierarchy || [],
          inverterHierarchy: Array.isArray(parsed.inverterHierarchy) && parsed.inverterHierarchy.length > 0
            ? parsed.inverterHierarchy
            : INITIAL_DROPDOWNS.inverterHierarchy || [],
          batteryHierarchy: Array.isArray(parsed.batteryHierarchy) && parsed.batteryHierarchy.length > 0
            ? parsed.batteryHierarchy
            : INITIAL_DROPDOWNS.batteryHierarchy || []
        };
      }
    } else {
      // Auto-seed file with INITIAL_DROPDOWNS data
      const initial: HardwareHierarchyData = {
        panelHierarchy: INITIAL_DROPDOWNS.panelHierarchy || [],
        inverterHierarchy: INITIAL_DROPDOWNS.inverterHierarchy || [],
        batteryHierarchy: INITIAL_DROPDOWNS.batteryHierarchy || []
      };
      try {
        fs.writeFileSync(HARDWARE_DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      } catch {}
      return initial;
    }
  } catch (err) {
    console.error('[HardwareDb] Error reading .hardware_hierarchy.json:', err);
  }

  return {
    panelHierarchy: INITIAL_DROPDOWNS.panelHierarchy || [],
    inverterHierarchy: INITIAL_DROPDOWNS.inverterHierarchy || [],
    batteryHierarchy: INITIAL_DROPDOWNS.batteryHierarchy || []
  };
}

export function saveDbHardwareHierarchy(data: Partial<HardwareHierarchyData>): boolean {
  try {
    const current = getDbHardwareHierarchy();
    const updated: HardwareHierarchyData = {
      panelHierarchy: Array.isArray(data.panelHierarchy) ? data.panelHierarchy : current.panelHierarchy,
      inverterHierarchy: Array.isArray(data.inverterHierarchy) ? data.inverterHierarchy : current.inverterHierarchy,
      batteryHierarchy: Array.isArray(data.batteryHierarchy) ? data.batteryHierarchy : current.batteryHierarchy
    };

    fs.writeFileSync(HARDWARE_DB_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[HardwareDb] Error writing .hardware_hierarchy.json:', err);
    return false;
  }
}
