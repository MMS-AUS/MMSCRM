import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sun, CheckCircle, Download, ExternalLink, ShieldAlert, Zap, FileCheck, Layers } from 'lucide-react';

export const OpenSolarModal: React.FC = () => {
  const { selectedPreviewProposalUrl, setSelectedPreviewProposalUrl, projects } = useApp();

  if (!selectedPreviewProposalUrl) return null;

  // Find project associated with this proposal
  const project = projects.find(
    p => p.openSolarProposalId === selectedPreviewProposalUrl || p.id === selectedPreviewProposalUrl
  ) || projects[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl bg-[#1e1e1e] rounded-xl shadow-2xl border border-[#2d2d2d] overflow-hidden max-h-[90vh] flex flex-col text-[#e5e7eb]">
        {/* Header */}
        <div className="p-4 bg-[#161616] text-white flex items-center justify-between border-b border-[#262626]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#bef2641a] text-[#bef264] border border-[#bef26433]">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">OpenSolar CRM Proposal Viewer</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                  Signed &amp; Synchronized
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Proposal ID: <span className="font-mono text-[#bef264] font-bold">{project.openSolarProposalId}</span> | {project.title}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedPreviewProposalUrl(null)}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#262626] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Contract Signoff banner */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FileCheck className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-300">Customer Contract Digitally Signed</p>
                <p className="text-xs text-gray-300">
                  Signed by {project.customerName} via OpenSolar e-Signature. Automatically attached to CRM Project record.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
              Contract Verified
            </span>
          </div>

          {/* 3D Roof Simulation Mockup */}
          <div className="rounded-xl border border-[#262626] overflow-hidden bg-[#121212] text-white p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <Layers className="w-4 h-4 text-[#bef264]" />
                <span className="font-semibold">OpenSolar 3D Aerial Array Simulation</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#1e1e1e] border border-[#262626] text-gray-400">High-Res Nearmap Lidar</span>
              </div>
              <span className="text-xs text-[#bef264] font-mono font-medium">98.2% Solar Access</span>
            </div>

            {/* Simulated Satellite Roof preview */}
            <div className="relative h-44 rounded-lg bg-[#161616] flex items-center justify-center border border-[#262626] overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#bef264_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="text-center z-10">
                <div className="inline-flex p-3 rounded-2xl bg-[#bef2641a] text-[#bef264] border border-[#bef26433] mb-2">
                  <Sun className="w-8 h-8 animate-spin" style={{ animationDuration: '16s' }} />
                </div>
                <h4 className="text-sm font-bold text-white">{project.address}, {project.suburb}</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  {project.panelCount} × {project.panelModel} ({project.systemSizeKw}kW) | True North Azimuth 12°
                </p>
              </div>
            </div>
          </div>

          {/* System Details & Financials */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-[#161616] border border-[#262626]">
              <p className="text-[11px] font-medium text-gray-400 uppercase">System Size</p>
              <p className="text-base font-bold text-white mt-1">{project.systemSizeKw} kW</p>
              <p className="text-[11px] text-gray-400">{project.panelCount} Panels</p>
            </div>
            <div className="p-3 rounded-xl bg-[#161616] border border-[#262626]">
              <p className="text-[11px] font-medium text-gray-400 uppercase">Est. Annual Output</p>
              <p className="text-base font-bold text-[#bef264] mt-1">
                {Math.round(project.systemSizeKw * 1480).toLocaleString()} kWh
              </p>
              <p className="text-[11px] text-gray-400">~{Math.round(project.systemSizeKw * 4.1)} kWh/day</p>
            </div>
            <div className="p-3 rounded-xl bg-[#161616] border border-[#262626]">
              <p className="text-[11px] font-medium text-gray-400 uppercase">Est. Annual Bill Cut</p>
              <p className="text-base font-bold text-[#bef264] mt-1">
                ${Math.round(project.systemSizeKw * 280 + (project.batteryCapacityKwh ? 800 : 0)).toLocaleString()} AUD
              </p>
              <p className="text-[11px] text-gray-400">Payback ~3.2 yrs</p>
            </div>
            <div className="p-3 rounded-xl bg-[#161616] border border-[#262626]">
              <p className="text-[11px] font-medium text-gray-400 uppercase">Net Contract Price</p>
              <p className="text-base font-bold text-white mt-1">
                ${project.contractValueAud.toLocaleString()} AUD
              </p>
              <p className="text-[11px] text-[#bef264] font-medium">STC Discount Applied</p>
            </div>
          </div>

          {/* Component Specifications */}
          <div className="p-4 rounded-xl border border-[#262626] bg-[#161616]">
            <h5 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">OpenSolar Hardware Bill of Materials</h5>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#262626]">
                <span className="text-gray-400">Solar Panels:</span>
                <span className="font-semibold text-white">{project.panelBrand} ({project.panelModel})</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#262626]">
                <span className="text-gray-400">Inverter:</span>
                <span className="font-semibold text-white">{project.inverterBrand} ({project.inverterModel})</span>
              </div>
              {project.batteryBrand && (
                <div className="flex justify-between py-1.5 border-b border-[#262626]">
                  <span className="text-gray-400">Battery Storage:</span>
                  <span className="font-semibold text-[#bef264]">{project.batteryBrand}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5">
                <span className="text-gray-400">Network DNSP Grid Connection:</span>
                <span className="font-semibold text-white">{project.dnsp} ({project.state})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-[#161616] border-t border-[#262626] flex items-center justify-between">
          <div className="text-xs text-gray-400">
            OpenSolar API Connected &bull; Real-time Proposal Sync
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedPreviewProposalUrl(null)}
              className="px-4 py-2 rounded-lg text-xs font-medium text-gray-400 hover:bg-[#262626] hover:text-white transition-colors"
            >
              Close
            </button>
            <a
              href={`/contracts/OpenSolar_Signed_Contract_${project.os_id || project.openSolarProposalId || 'signed'}.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              download={`OpenSolar_Signed_Contract_${project.customerName?.replace(/\s+/g, '_') || 'Customer'}.pdf`}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-[#bef264] hover:bg-[#a3e635] text-black flex items-center gap-2 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Signed PDF</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
