import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Award, FileText, CheckCircle2, AlertTriangle, ExternalLink, Zap, X } from 'lucide-react';
import { Project } from '../../types';

export const BridgeSelectModal: React.FC = () => {
  const { activeBridgeSelectProject, setActiveBridgeSelectProject, updateProject, subContractors, systemRules, themeMode } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isLight = themeMode === 'corporate-slate';

  if (!activeBridgeSelectProject) return null;

  const project = activeBridgeSelectProject;
  const assignedSub = subContractors.find(s => s.id === project.subcontractorId);

  // STC Math (Australian Clean Energy Regulator formula)
  // Zone 3 rating: 1.382 (Sydney, Newcastle, Brisbane, Gold Coast are in Zone 3)
  // Deeming period: 5 years remaining
  const zoneMultiplier = 1.382;
  const deemingYears = 5;
  const calculatedSTCs = project.stcCount || Math.round(project.systemSizeKw * zoneMultiplier * deemingYears);
  
  const effectiveInternalRate = project.internalStcRateAud ?? systemRules.internalStcRateAud ?? 39.50;
  const effectiveCustomerRate = project.customerStcRateAud ?? systemRules.customerStcRateAud ?? 36.00;
  const internalStcValueAud = Math.round(calculatedSTCs * effectiveInternalRate);
  const customerStcValueAud = Math.round(calculatedSTCs * effectiveCustomerRate);
  const stcTradingMarginAud = internalStcValueAud - customerStcValueAud;

  const handleClaimSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      updateProject(project.id, {
        stcCount: calculatedSTCs,
        customerStcRateAud: effectiveCustomerRate,
        customerStcValueAud,
        internalStcRateAud: effectiveInternalRate,
        internalStcValueAud,
        stcValueAud: internalStcValueAud,
        bridgeSelectStatus: 'Submitted to Clean Energy Regulator'
      });
      setIsSubmitting(false);
      setSuccessMessage('BridgeSelect STC claim assigned and lodged with Clean Energy Regulator (REC Registry).');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-2xl rounded-2xl shadow-soft-lg border overflow-hidden transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
      }`}>
        {/* Header */}
        <div className={`p-4 sm:p-5 flex items-center justify-between border-b ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-soft-xs' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-bold text-base ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  BridgeSelect STC &amp; CEC Compliance Portal
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-mono' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-mono'
                }`}>
                  REC Registry Certified
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Project: <span className={`font-bold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>{project.projectCode}</span> ({project.customerName} - {project.state})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveBridgeSelectProject(null);
              setSuccessMessage(null);
            }}
            className={`p-1.5 rounded-lg border transition-colors ${
              isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200 border-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800 border-slate-700'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {successMessage && (
            <div className={`p-3 rounded-xl border flex items-center gap-3 text-xs font-medium ${
              isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
            }`}>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Compliance Checklist Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`p-3.5 rounded-xl border ${
              isLight ? 'bg-slate-50/80 border-slate-200 shadow-soft-xs' : 'bg-slate-950/60 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  CEC Accreditation
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {assignedSub ? assignedSub.cecAccreditationNumber : 'CEC-A8921034'}
              </p>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Design &amp; Installation</p>
            </div>

            <div className={`p-3.5 rounded-xl border ${
              isLight ? 'bg-slate-50/80 border-slate-200 shadow-soft-xs' : 'bg-slate-950/60 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  SAA License
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {assignedSub ? assignedSub.saaLicenseNumber : `SAA-${project.state}-44120`}
              </p>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Solar Accreditation AU</p>
            </div>

            <div className={`p-3.5 rounded-xl border ${
              isLight ? 'bg-slate-50/80 border-slate-200 shadow-soft-xs' : 'bg-slate-950/60 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  DNSP Approval
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{project.dnsp}</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Pre-approval Passed</p>
            </div>
          </div>

          {/* System & Calculation breakdown */}
          <div className={`p-4 rounded-xl border space-y-3 ${
            isLight ? 'bg-white border-slate-200 shadow-soft-xs' : 'bg-slate-950/70 border-slate-800 text-white'
          }`}>
            <div className={`flex items-center justify-between border-b pb-2 ${isLight ? 'border-slate-100' : 'border-slate-800'}`}>
              <span className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Clean Energy Regulator Rating Zone
              </span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Zone 3 (Rating: 1.382)</span>
            </div>
            <div className={`flex items-center justify-between border-b pb-2 ${isLight ? 'border-slate-100' : 'border-slate-800'}`}>
              <span className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                System Rated DC Capacity
              </span>
              <span className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {project.systemSizeKw} kW ({project.panelBrand})
              </span>
            </div>
            <div className={`flex items-center justify-between border-b pb-2 ${isLight ? 'border-slate-100' : 'border-slate-800'}`}>
              <span className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                STC Deeming Period Formula
              </span>
              <span className={`text-xs font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {project.systemSizeKw}kW × 1.382 × 5 yrs
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className={`p-3 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}>
                <p className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Eligible Certificates
                </p>
                <p className={`text-lg font-bold font-mono mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {calculatedSTCs} STCs
                </p>
                <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Clean Energy Regulator</p>
              </div>

              <div className={`p-3 rounded-xl border ${
                isLight ? 'bg-blue-50/70 border-blue-200' : 'bg-blue-950/30 border-blue-900/50'
              }`}>
                <p className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? 'text-blue-800' : 'text-blue-400'}`}>
                  Customer Rebate (@ ${effectiveCustomerRate.toFixed(2)})
                </p>
                <p className={`text-lg font-bold font-mono mt-0.5 ${isLight ? 'text-blue-900' : 'text-blue-400'}`}>
                  -${customerStcValueAud.toLocaleString()} AUD
                </p>
                <p className={`text-[10px] ${isLight ? 'text-blue-700' : 'text-blue-300'}`}>Invoiced on customer bill</p>
              </div>

              <div className={`p-3 rounded-xl border ${
                isLight ? 'bg-emerald-50/70 border-emerald-200' : 'bg-emerald-950/30 border-emerald-900/50'
              }`}>
                <p className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>
                  Internal CER Claim (@ ${effectiveInternalRate.toFixed(2)})
                </p>
                <p className={`text-lg font-bold font-mono mt-0.5 ${isLight ? 'text-emerald-900' : 'text-emerald-400'}`}>
                  +${internalStcValueAud.toLocaleString()} AUD
                </p>
                <p className={`text-[10px] font-semibold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                  Spread: +${stcTradingMarginAud.toLocaleString()} AUD
                </p>
              </div>
            </div>
          </div>

          {/* Status info */}
          <div className={`flex items-center justify-between p-3.5 rounded-xl border text-xs ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950/60 border-slate-800 text-slate-300'
          }`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Current Status in BridgeSelect: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{project.bridgeSelectStatus}</strong></span>
            </div>
            <span className={`text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>CER Compliance Audit Ready</span>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 sm:p-5 border-t flex items-center justify-end gap-2.5 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
        }`}>
          <button
            type="button"
            onClick={() => setActiveBridgeSelectProject(null)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              isLight ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            Close
          </button>
          <button
            type="button"
            disabled={isSubmitting || project.bridgeSelectStatus === 'STCs Approved & Paid'}
            onClick={handleClaimSubmit}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 text-white flex items-center gap-2 shadow-emerald-soft transition-all"
          >
            {isSubmitting ? (
              <span>Lodging to BridgeSelect...</span>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Submit CER Claim (+${internalStcValueAud.toLocaleString()} AUD)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
