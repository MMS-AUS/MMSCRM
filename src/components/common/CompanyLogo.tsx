import React from 'react';
import { Sun, Zap, Shield, Leaf, Grid } from 'lucide-react';
import { CompanyProfile } from '../../types';

interface CompanyLogoProps {
  profile?: CompanyProfile;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  variant?: 'header' | 'login' | 'default';
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  profile,
  size = 'md',
  className = '',
  showText = false,
  variant = 'header'
}) => {
  const isLoginVariant = variant === 'login';
  const logoUrl = isLoginVariant
    ? (profile?.loginLogoUrl || profile?.logoUrl)
    : (profile?.headerLogoUrl || profile?.logoUrl);

  const preset = isLoginVariant
    ? (profile?.loginLogoPreset || profile?.logoPreset || 'sun')
    : (profile?.headerLogoPreset || profile?.logoPreset || 'sun');

  const companyName = profile?.companyName || 'My Solar CRM';

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
    xl: 'w-14 h-14 text-xl'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const loginMaxHeights = {
    sm: 'max-h-6',
    md: 'max-h-7 sm:max-h-8',
    lg: 'max-h-8 sm:max-h-9',
    xl: 'max-h-9 sm:max-h-10'
  };

  const renderPresetIcon = () => {
    switch (preset) {
      case 'solar-panel':
        return <Grid className={`${iconSizes[size]} font-bold`} />;
      case 'energy':
        return <Zap className={`${iconSizes[size]} font-bold fill-current`} />;
      case 'leaf':
        return <Leaf className={`${iconSizes[size]} font-bold`} />;
      case 'modern':
        return <Shield className={`${iconSizes[size]} font-bold`} />;
      case 'sun':
      default:
        return <Sun className={`${iconSizes[size]} font-bold`} />;
    }
  };

  // Login page logo: Keep aspect ratio natural, clean, and scaled proportionally (never oversized)
  if (isLoginVariant) {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        {logoUrl ? (
          <div className="flex items-center justify-center max-w-[140px] sm:max-w-[160px] w-auto h-auto py-0.5">
            <img
              src={logoUrl}
              alt={companyName}
              className={`${loginMaxHeights[size]} max-w-full w-auto h-auto object-contain transition-all`}
              referrerPolicy="no-referrer"
              onError={e => {
                // Fallback to preset icon if custom logo url fails to load
                (e.currentTarget.parentElement as HTMLElement).innerHTML = `
                  <div class="w-9 h-9 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-xs">
                    ☀️
                  </div>
                `;
              }}
            />
          </div>
        ) : (
          <div
            className="w-9 h-9 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-xs shrink-0 transition-transform"
            style={profile?.primaryColor ? { backgroundColor: profile.primaryColor } : undefined}
          >
            {renderPresetIcon()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {logoUrl ? (
        <div
          className={`${sizeClasses[size]} rounded-lg overflow-hidden border border-[#2d2d2d] bg-[#161616] flex items-center justify-center shrink-0 shadow-xs`}
        >
          <img
            src={logoUrl}
            alt={companyName}
            className="w-full h-full object-contain p-0.5"
            referrerPolicy="no-referrer"
            onError={e => {
              // Fallback to sun icon if image url fails to load
              (e.currentTarget.parentElement as HTMLElement).innerHTML = `<div class="w-full h-full bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold">☀️</div>`;
            }}
          />
        </div>
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-xs shrink-0 transition-transform`}
          style={profile?.primaryColor ? { backgroundColor: profile.primaryColor } : undefined}
        >
          {renderPresetIcon()}
        </div>
      )}

      {showText && (
        <div className="min-w-0">
          <span className="font-bold text-white text-base tracking-tight truncate block">
            {companyName}
          </span>
          {profile?.tagline && (
            <span className="text-[10px] text-gray-400 truncate block">
              {profile.tagline}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
