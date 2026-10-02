import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Project } from '../src/types';
import { getSupabase } from './supabase';

const PROJECTS_DB_FILE = path.join(process.cwd(), '.projects_db.json');

function toDeterministicUuid(seed: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(seed)) {
    return seed;
  }
  const hash = crypto.createHash('sha256').update(seed || 'project-default').digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    'a' + hash.substring(17, 20),
    hash.substring(20, 32)
  ].join('-');
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
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        // Map Supabase rows into Project objects
        const existingIds = new Set(fileProjects.map(p => p.id));
        data.forEach(row => {
          if (!existingIds.has(row.id)) {
            const systemKw = Number(row.system_size || row.system_size_kw) || 6.6;
            const priceVal = Number(row.total_price || row.contract_value_aud) || 9400;
            fileProjects.push({
              id: row.id,
              projectCode: row.project_number || row.project_code || `SOL-${row.state || 'NSW'}-001`,
              title: row.title || `${systemKw}kW Solar System`,
              customerId: row.lead_id || '',
              customerName: row.customer_name || 'Customer',
              customerEmail: row.customer_email || '',
              customerPhone: row.customer_phone || '',
              address: row.address || '',
              suburb: row.suburb || '',
              state: row.state || 'NSW',
              dnsp: row.state === 'QLD' ? 'Energex' : 'Ausgrid',
              status: row.status || 'Site Survey',
              systemSizeKw: systemKw,
              panelBrand: 'AIKO Solar',
              panelModel: 'Neostar 440W All-Black',
              panelCount: 15,
              inverterBrand: 'Sungrow (SG/SH Series)',
              inverterModel: 'SG5.0RS Single Phase',
              contractValueAud: priceVal,
              stcCount: Math.round(systemKw * 10),
              customerStcRateAud: 36.00,
              customerStcValueAud: Math.round(systemKw * 360),
              internalStcRateAud: 39.50,
              internalStcValueAud: Math.round(systemKw * 395),
              stcValueAud: Math.round(systemKw * 395),
              bridgeSelectStatus: 'Pending Verification',
              openSolarProposalId: '',
              openSolarContractSigned: false,
              leadId: row.lead_id || ''
            });
          }
        });
      }
    } catch (err: any) {
      console.warn('[ProjectsDb] Error querying Supabase projects table:', err.message || err);
    }
  }

  return fileProjects;
}

export async function saveDbProjects(projects: Project[]): Promise<boolean> {
  try {
    fs.writeFileSync(PROJECTS_DB_FILE, JSON.stringify(projects, null, 2), 'utf8');
  } catch (err) {
    console.error('[ProjectsDb] Error writing .projects_db.json:', err);
    return false;
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const rows = projects.map(p => {
        const leadUuid = p.leadId ? toDeterministicUuid(p.leadId) : null;
        const systemKw = Number(p.systemSizeKw) || 6.6;
        const contractVal = Number(p.contractValueAud) || 0;
        const addressVal = p.address ? p.address.trim() : (p.suburb ? `${p.suburb}, ${p.state || 'NSW'}` : 'Australia');
        const projNum = p.projectCode || p.projectNumber || `SOL-${p.state || 'NSW'}-${Math.floor(1000 + Math.random() * 9000)}`;

        return {
          id: toDeterministicUuid(p.id),
          title: p.title || `${systemKw}kW Solar System`,
          project_number: projNum,
          lead_id: leadUuid,
          customer_name: p.customerName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Valued Customer',
          customer_email: p.customerEmail || (p as any).email || null,
          customer_phone: p.customerPhone || p.primaryMobile || (p as any).phone || null,
          address: addressVal,
          suburb: p.suburb || null,
          state: p.state || 'NSW',
          postcode: p.postcode || null,
          system_size: systemKw,
          status: p.status || 'Site Survey',
          stage: (p as any).stage || 'Design',
          total_price: contractVal,
          deposit_paid: parseFloat(String(p.deposit || '').replace(/[^0-9.]/g, '')) || 0,
          created_at: p.projectCreatedDate || new Date().toISOString()
        };
      });

      const { error: upsertErr } = await supabase.from('projects').upsert(rows, { onConflict: 'id' });
      if (upsertErr) {
        console.warn('[ProjectsDb] Error upserting projects to Supabase:', upsertErr.message, upsertErr.code);
      } else {
        console.log(`[ProjectsDb] Successfully synced ${rows.length} project(s) to Supabase`);
      }
    } catch (err: any) {
      console.warn('[ProjectsDb] Warning updating Supabase projects:', err.message || err);
    }
  }

  return true;
}

export async function saveSingleDbProject(project: Project): Promise<Project> {
  const current = await getDbProjects();
  const existingIdx = current.findIndex(p => p.id === project.id || (p.projectCode && p.projectCode === project.projectCode));
  let next: Project[];
  if (existingIdx >= 0) {
    next = [...current];
    next[existingIdx] = { ...next[existingIdx], ...project };
  } else {
    next = [project, ...current];
  }
  await saveDbProjects(next);
  return project;
}
