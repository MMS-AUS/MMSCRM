import { PortalAddressConfig } from '../types';

/**
 * Returns the production canonical URL for a given portal configuration
 */
export const getPortalProductionUrl = (config: PortalAddressConfig): string => {
  if (config.routingMode === 'custom_domain' && config.customDomain) {
    const clean = config.customDomain.replace(/^https?:\/\//, '').trim();
    return `https://${clean}`;
  }

  if (config.routingMode === 'path') {
    const cleanBase = config.baseDomain.replace(/^https?:\/\//, '').trim();
    const cleanPath = config.path.startsWith('/') ? config.path : `/${config.path}`;
    return `https://${cleanBase}${cleanPath}`;
  }

  // Default: Subdomain mode
  const cleanSub = (config.subdomain || (config.portalType === 'customer' ? 'customer' : 'installers')).trim();
  const cleanBase = config.baseDomain.replace(/^https?:\/\//, '').trim();
  return `https://${cleanSub}.${cleanBase}`;
};

/**
 * Returns the live working preview URL for the current environment
 * so users can click or test in the preview container or iframe.
 */
export const getPortalPreviewUrl = (portalType: 'customer' | 'installer'): string => {
  if (typeof window === 'undefined') return `?portal=${portalType}`;
  
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}?portal=${portalType}`;
};

/**
 * Returns the hash-based deep link for the current environment
 */
export const getPortalHashUrl = (portalType: 'customer' | 'installer'): string => {
  if (typeof window === 'undefined') return `#${portalType}`;
  
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}#portal=${portalType}`;
};

/**
 * Detects if the current browser window is accessed via a dedicated customer or installer portal address
 */
export const detectPortalFromCurrentLocation = (): 'customer' | 'installer' | null => {
  if (typeof window === 'undefined') return null;

  try {
    const searchParams = new URLSearchParams(window.location.search);
    const portalParam = searchParams.get('portal')?.toLowerCase() || searchParams.get('role')?.toLowerCase();
    
    if (portalParam === 'customer' || portalParam === 'client') return 'customer';
    if (portalParam === 'installer' || portalParam === 'subcontractor' || portalParam === 'contractor') return 'installer';

    const hash = window.location.hash.toLowerCase();
    if (hash.includes('customer') || hash.includes('client')) return 'customer';
    if (hash.includes('installer') || hash.includes('subcontractor') || hash.includes('contractor')) return 'installer';

    const pathname = window.location.pathname.toLowerCase();
    if (pathname.includes('/customer') || pathname.includes('/portal/customer')) return 'customer';
    if (pathname.includes('/installer') || pathname.includes('/portal/installer')) return 'installer';

    const hostname = window.location.hostname.toLowerCase();
    // Exclude standard ERP/CRM hostnames from portal redirection
    if (
      hostname.startsWith('crm.') ||
      hostname.startsWith('erp.') ||
      hostname.startsWith('app.') ||
      hostname.startsWith('admin.') ||
      hostname.startsWith('solar.') ||
      hostname.startsWith('portal.')
    ) {
      return null;
    }

    if (hostname.startsWith('customer.') || hostname.startsWith('client.')) return 'customer';
    if (hostname.startsWith('installer.') || hostname.startsWith('installers.') || hostname.startsWith('contractor.') || hostname.startsWith('contractors.')) return 'installer';
  } catch (e) {
    console.error('Error detecting portal from location', e);
  }

  return null;
};

/**
 * Formats DNS CNAME records required for the configured portal domain
 */
export const getPortalDnsRequirements = (config: PortalAddressConfig) => {
  const host = config.routingMode === 'subdomain'
    ? config.subdomain
    : config.routingMode === 'custom_domain'
    ? (config.customDomain?.split('.')[0] || 'portal')
    : '@';

  return {
    type: 'CNAME',
    host: host,
    value: 'ingress.mysolarcrm.com.au',
    ttl: '300 (Auto)',
    description: `Routes ${config.label} traffic to My Solar CRM multi-tenant SSL ingress`
  };
};
