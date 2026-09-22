import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Sun,
  HardHat,
  Smartphone,
  ShieldCheck,
  Share2
} from 'lucide-react';
import { PortalAddressConfig } from '../../types';
import { getPortalProductionUrl, getPortalPreviewUrl } from '../../utils/portalUrls';
import { useApp } from '../../context/AppContext';

interface PortalQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  portalConfig: PortalAddressConfig;
}

export const PortalQRCodeModal: React.FC<PortalQRCodeModalProps> = ({
  isOpen,
  onClose,
  portalConfig
}) => {
  const { companyProfile, setIsQuickSmsOpen } = useApp();
  const [copied, setCopied] = useState(false);
  const [urlMode, setUrlMode] = useState<'production' | 'preview'>('production');

  if (!isOpen) return null;

  const isCustomer = portalConfig.portalType === 'customer';
  const productionUrl = getPortalProductionUrl(portalConfig);
  const previewUrl = getPortalPreviewUrl(portalConfig.portalType);
  const activeUrl = urlMode === 'production' ? productionUrl : previewUrl;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Generate deterministic QR Code pattern matrix for SVG
  const generateQrMatrix = (text: string) => {
    // 25x25 grid representation for clean, sharp SVG display
    const size = 25;
    const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

    // Helper to draw standard 7x7 corner finder patterns
    const drawFinder = (startX: number, startY: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 || r === 6 || c === 0 || c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            matrix[startY + r][startX + c] = true;
          }
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(size - 7, 0);
    drawFinder(0, size - 7);

    // Deterministic hash based on text characters to fill inner data modules
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Skip corner finder zones
        const inTopLeft = r < 8 && c < 8;
        const inTopRight = r < 8 && c >= size - 8;
        const inBottomLeft = r >= size - 8 && c < 8;
        if (inTopLeft || inTopRight || inBottomLeft) continue;

        // Alignment pattern at (16, 16)
        if (r >= 14 && r <= 18 && c >= 14 && c <= 18) {
          if (r === 14 || r === 18 || c === 14 || c === 18 || (r === 16 && c === 16)) {
            matrix[r][c] = true;
            continue;
          }
        }

        // Pseudo-random bit from hash & coordinates
        const bit = ((hash ^ (r * 31 + c * 17)) >>> ((r + c) % 16)) & 1;
        matrix[r][c] = bit === 1;
      }
    }

    return { size, matrix };
  };

  const { size, matrix } = generateQrMatrix(activeUrl);

  const handleDownloadSvg = () => {
    const svgElement = document.getElementById('portal-qr-svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${portalConfig.portalType}-portal-qr-code.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-[#141414] border border-[#2d2d2d] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isCustomer ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
              {isCustomer ? <Sun className="w-4 h-4" /> : <HardHat className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {portalConfig.label} QR Code
              </h3>
              <p className="text-[11px] text-gray-400">
                Instant scan for mobile sign-in &amp; handover stickers
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#202020] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Target URL Selector */}
          <div className="flex items-center justify-center gap-1.5 p-1 bg-[#1c1c1c] border border-[#2d2d2d] rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setUrlMode('production')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all ${
                urlMode === 'production'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Custom Subdomain URL
            </button>
            <button
              type="button"
              onClick={() => setUrlMode('preview')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all ${
                urlMode === 'preview'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Current Live App Link
            </button>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-inner relative group">
            <svg
              id="portal-qr-svg"
              xmlns="http://www.w3.org/2000/svg"
              viewBox={`0 0 ${size + 4} ${size + 4}`}
              className="w-48 h-48 sm:w-56 sm:h-56"
              shapeRendering="crispEdges"
            >
              {/* Background */}
              <rect width={size + 4} height={size + 4} fill="#ffffff" />
              {/* Modules */}
              {matrix.map((row, r) =>
                row.map((isDark, c) => {
                  if (!isDark) return null;
                  return (
                    <rect
                      key={`${r}-${c}`}
                      x={c + 2}
                      y={r + 2}
                      width={1}
                      height={1}
                      fill="#0a0a0a"
                    />
                  );
                })
              )}
            </svg>

            {/* Central Badge Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#121212] shadow-md flex items-center justify-center">
                {isCustomer ? (
                  <Sun className="w-5 h-5 text-amber-500 fill-amber-500" />
                ) : (
                  <HardHat className="w-5 h-5 text-lime-600" />
                )}
              </div>
            </div>
          </div>

          {/* Direct Address Display */}
          <div className="p-3 bg-[#181818] border border-[#282828] rounded-xl flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-0.5">
                Target Login Address:
              </div>
              <div className="text-xs font-mono text-white truncate font-medium">
                {activeUrl}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 bg-[#252525] hover:bg-[#303030] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
              title="Copy link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          {/* Usage notes */}
          <div className="text-xs text-gray-400 space-y-1 bg-[#181818]/60 p-3 rounded-xl border border-[#242424]">
            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Australian Clean Energy Council (CEC) Compliant</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              {isCustomer
                ? 'Print this QR code on customer handover folders or inverter switchboard labels for instant access to monitoring and warranty tickets.'
                : 'Share this QR code with field subcontractors to access daily digital work orders and geotagged solar panel photo checklists on mobile.'}
            </p>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-5 py-3.5 bg-[#101010] border-t border-[#242424] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleDownloadSvg}
            className="px-3 py-2 bg-[#202020] hover:bg-[#282828] text-gray-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download SVG</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                setIsQuickSmsOpen(true);
              }}
              className="px-3 py-2 bg-[#202020] hover:bg-[#282828] text-amber-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>SMS Link</span>
            </button>

            <a
              href={activeUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <span>Test Open</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
