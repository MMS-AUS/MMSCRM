import { ProjectStatus } from '../types/index.ts';

export const ALL_PROJECT_STATUSES: ProjectStatus[] = [
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

export function normalizeProjectStatus(raw?: any): ProjectStatus {
  if (!raw) return 'Site Survey';
  const s = String(raw).trim();
  if (ALL_PROJECT_STATUSES.includes(s as ProjectStatus)) {
    return s as ProjectStatus;
  }
  if (s === 'Site Survey' || s === 'Design' || s === 'Draft' || s === 'Site Survey Scheduled') return 'Site Survey';
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

  // Case-insensitive check
  const lower = s.toLowerCase();
  const matched = ALL_PROJECT_STATUSES.find(st => st.toLowerCase() === lower);
  if (matched) return matched;

  // Fallback to s if non-empty string, else Site Survey
  return (s as ProjectStatus) || 'Site Survey';
}

export function normalizeProjectStage(raw?: any): string {
  if (!raw) return 'Site Survey';
  const s = String(raw).trim();
  if (s === 'Design' || s === 'Draft') return 'Site Survey';
  return s;
}
