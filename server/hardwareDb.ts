import fs from 'fs';
import path from 'path';
import { PanelHierarchyItem, InverterHierarchyItem, BatteryHierarchyItem } from '../src/types/index.ts';
import { INITIAL_DROPDOWNS } from '../src/data/initialData.ts';
import { getSupabase } from './supabase.ts';

const HARDWARE_DB_FILE = path.join(process.cwd(), '.hardware_hierarchy.json');

export interface HardwareHierarchyData {
  panelHierarchy: PanelHierarchyItem[];
  inverterHierarchy: InverterHierarchyItem[];
  batteryHierarchy: BatteryHierarchyItem[];
}

/**
 * Strips any non-numeric unit characters (e.g. "440W" -> 440, "5.0 kW" -> 5.0)
 */
export function cleanNumeric(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Synchronous local read for resilience
 */
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

/**
 * Asynchronous Supabase fetch with fallback to local file
 */
export async function getDbHardwareHierarchyAsync(): Promise<HardwareHierarchyData> {
  const local = getDbHardwareHierarchy();
  const supabase = getSupabase();
  if (!supabase) return local;

  try {
    const [panelsRes, invertersRes, batteriesRes] = await Promise.allSettled([
      supabase.from('solar_panels').select('*').order('brand', { ascending: true }),
      supabase.from('solar_inverters').select('*').order('brand', { ascending: true }),
      supabase.from('battery_storage').select('*').order('brand', { ascending: true })
    ]);

    let panelHierarchy = local.panelHierarchy;
    let inverterHierarchy = local.inverterHierarchy;
    let batteryHierarchy = local.batteryHierarchy;

    if (panelsRes.status === 'fulfilled' && !panelsRes.value.error && Array.isArray(panelsRes.value.data) && panelsRes.value.data.length > 0) {
      panelHierarchy = panelsRes.value.data.map((r: any) => ({
        id: r.id || `p-${r.brand}-${r.watts}`,
        manufacturer: r.brand,
        sizeW: Number(r.watts) || 440,
        series: r.series || '',
        model: r.model || `${r.brand} ${r.watts}W`
      }));
    }

    if (invertersRes.status === 'fulfilled' && !invertersRes.value.error && Array.isArray(invertersRes.value.data) && invertersRes.value.data.length > 0) {
      inverterHierarchy = invertersRes.value.data.map((r: any) => ({
        id: r.id || `inv-${r.brand}-${r.rated_kw}`,
        manufacturer: r.brand,
        sizeKw: Number(r.rated_kw) || 5.0,
        series: r.series || '',
        model: r.model || `${r.brand} ${r.rated_kw}kW`
      }));
    }

    if (batteriesRes.status === 'fulfilled' && !batteriesRes.value.error && Array.isArray(batteriesRes.value.data) && batteriesRes.value.data.length > 0) {
      batteryHierarchy = batteriesRes.value.data.map((r: any) => ({
        id: r.id || `bat-${r.brand}-${r.capacity}`,
        manufacturer: r.brand,
        usableCapacityKwh: Number(r.capacity) || 10.0,
        series: r.series || '',
        model: r.model || `${r.brand} ${r.capacity}kWh`,
        size: `${r.capacity}kWh System`
      }));
    }

    const merged = { panelHierarchy, inverterHierarchy, batteryHierarchy };
    // Update local cache
    try {
      fs.writeFileSync(HARDWARE_DB_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    } catch {}

    return merged;
  } catch (err) {
    console.warn('[HardwareDb] Error querying Supabase hardware tables, using local fallback:', err);
    return local;
  }
}

/**
 * Persists hardware hierarchy to Supabase tables (stripping units) and local fallback
 */
export async function saveDbHardwareHierarchyAsync(data: Partial<HardwareHierarchyData>): Promise<boolean> {
  const current = getDbHardwareHierarchy();
  const updated: HardwareHierarchyData = {
    panelHierarchy: Array.isArray(data.panelHierarchy) ? data.panelHierarchy : current.panelHierarchy,
    inverterHierarchy: Array.isArray(data.inverterHierarchy) ? data.inverterHierarchy : current.inverterHierarchy,
    batteryHierarchy: Array.isArray(data.batteryHierarchy) ? data.batteryHierarchy : current.batteryHierarchy
  };

  // 1. Write local cache
  try {
    fs.writeFileSync(HARDWARE_DB_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.error('[HardwareDb] Error writing .hardware_hierarchy.json:', err);
  }

  // 2. Persist to Supabase if available
  const supabase = getSupabase();
  if (supabase) {
    try {
      if (Array.isArray(data.panelHierarchy)) {
        const panelRows = data.panelHierarchy.map(p => ({
          brand: p.manufacturer || 'Unknown',
          watts: cleanNumeric(p.sizeW), // Strips "W" and stores numeric value only
          series: p.series || '',
          model: p.model || '',
          updated_at: new Date().toISOString()
        }));

        if (panelRows.length > 0) {
          // Clear and reload
          await supabase.from('solar_panels').delete().neq('brand', '__keep_all__');
          for (let idx = 0; idx < panelRows.length; idx += 100) {
            const chunk = panelRows.slice(idx, idx + 100);
            const { error: pErr } = await supabase.from('solar_panels').insert(chunk);
            if (pErr) console.warn('[HardwareDb] Supabase solar_panels sync note:', pErr.message);
          }
        }
      }

      if (Array.isArray(data.inverterHierarchy)) {
        const inverterRows = data.inverterHierarchy.map(i => ({
          brand: i.manufacturer || 'Unknown',
          rated_kw: cleanNumeric(i.sizeKw), // Strips "kW" and stores numeric value only
          series: i.series || '',
          model: i.model || '',
          updated_at: new Date().toISOString()
        }));

        if (inverterRows.length > 0) {
          await supabase.from('solar_inverters').delete().neq('brand', '__keep_all__');
          for (let idx = 0; idx < inverterRows.length; idx += 100) {
            const chunk = inverterRows.slice(idx, idx + 100);
            const { error: iErr } = await supabase.from('solar_inverters').insert(chunk);
            if (iErr) console.warn('[HardwareDb] Supabase solar_inverters sync note:', iErr.message);
          }
        }
      }

      if (Array.isArray(data.batteryHierarchy)) {
        const batteryRows = data.batteryHierarchy.map(b => ({
          brand: b.manufacturer || 'Unknown',
          capacity: cleanNumeric(b.usableCapacityKwh), // Strips "kWh" and stores numeric value only
          series: b.series || '',
          model: b.model || '',
          updated_at: new Date().toISOString()
        }));

        if (batteryRows.length > 0) {
          await supabase.from('battery_storage').delete().neq('brand', '__keep_all__');
          for (let idx = 0; idx < batteryRows.length; idx += 100) {
            const chunk = batteryRows.slice(idx, idx + 100);
            const { error: bErr } = await supabase.from('battery_storage').insert(chunk);
            if (bErr) console.warn('[HardwareDb] Supabase battery_storage sync note:', bErr.message);
          }
        }
      }
    } catch (err: any) {
      console.warn('[HardwareDb] Non-blocking Supabase sync error:', err.message);
    }
  }

  return true;
}

export function saveDbHardwareHierarchy(data: Partial<HardwareHierarchyData>): boolean {
  // Fire and forget async sync, save local synchronously
  saveDbHardwareHierarchyAsync(data).catch(() => {});
  return true;
}
