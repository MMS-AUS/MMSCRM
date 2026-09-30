import { PortalAddressConfig } from '../types';

/**
 * Returns the production canonical URL for a given portal configuration
 */
export const getPortalProductionUrl = (config?: PortalAddressConfig | null): string => {
  if (!config) return '';
  const baseDomain = config.baseDomain || 'mysolarcrm.com.au';
  if (config.routingMode === 'custom_domain' && config.customDomain) {
    const clean = config.customDomain.replace(/^https?:\/\//, '').trim();
    return `https://${clean}`;
  }

  if (config.routingMode === 'path') {
    const cleanBase = baseDomain.replace(/^https?:\/\//, '').trim();
    const cleanPath = (config.path || '/portal').startsWith('/') ? (config.path || '/portal') : `/${config.path}`;
    return `https://${cleanBase}${cleanPath}`;
  }

  // Default: Subdomain mode
  const cleanSub = (config.subdomain || (config.portalType === 'customer' ? 'customer' : 'installers')).trim();
  const cleanBase = baseDomain.replace(/^https?:\/\//, '').trim();
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
export const detectPortalFromCurrentLocation = (portalConfig?: any): 'customer' | 'installer' | null => {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Check URL query parameters (e.g. ?portal=customer, ?portal=installer)
    const searchParams = new URLSearchParams(window.location.search);
    const portalParam = searchParams.get('portal')?.toLowerCase() || searchParams.get('role')?.toLowerCase();
    
    if (portalParam === 'customer' || portalParam === 'client') return 'customer';
    if (portalParam === 'installer' || portalParam === 'subcontractor' || portalParam === 'contractor') return 'installer';

    // 2. Check URL Hash (e.g. #customer, #installer, #portal=customer)
    const hash = window.location.hash.toLowerCase();
    if (hash.includes('customer') || hash.includes('client')) return 'customer';
    if (hash.includes('installer') || hash.includes('subcontractor') || hash.includes('contractor')) return 'installer';

    // 3. Check URL Pathname (e.g. /customer, /installer, /portal/customer)
    const pathname = window.location.pathname.toLowerCase();
    if (pathname.includes('/customer') || pathname.includes('/portal/customer')) return 'customer';
    if (pathname.includes('/installer') || pathname.includes('/portal/installer')) return 'installer';

    // Resolve portal config from parameter or localStorage
    let config = portalConfig;
    if (!config) {
      try {
        const raw = localStorage.getItem('solar_portal_addresses');
        if (raw) config = JSON.parse(raw);
      } catch {}
    }

    const hostname = window.location.hostname.toLowerCase();

    // 4. Exact match against configured Custom Domains
    if (config?.customerPortal?.customDomain) {
      const custClean = config.customerPortal.customDomain.toLowerCase().replace(/^https?:\/\//, '').split('/')[0].trim();
      if (custClean && (hostname === custClean || hostname.endsWith(`.${custClean}`))) {
        return 'customer';
      }
    }

    if (config?.installerPortal?.customDomain) {
      const instClean = config.installerPortal.customDomain.toLowerCase().replace(/^https?:\/\//, '').split('/')[0].trim();
      if (instClean && (hostname === instClean || hostname.endsWith(`.${instClean}`))) {
        return 'installer';
      }
    }

    // 5. Match against configured Subdomain + BaseDomain
    if (config?.customerPortal?.subdomain) {
      const sub = config.customerPortal.subdomain.toLowerCase().trim();
      const base = config.customerPortal.baseDomain?.toLowerCase()?.trim();
      if (sub && (hostname === `${sub}.${base}` || hostname.startsWith(`${sub}.`))) {
        return 'customer';
      }
    }

    if (config?.installerPortal?.subdomain) {
      const sub = config.installerPortal.subdomain.toLowerCase().trim();
      const base = config.installerPortal.baseDomain?.toLowerCase()?.trim();
      if (sub && (hostname === `${sub}.${base}` || hostname.startsWith(`${sub}.`))) {
        return 'installer';
      }
    }

    // 6. Generic subdomain heuristics (if not main ERP admin/app)
    const isMainAdmin = hostname.startsWith('crm.') || hostname.startsWith('erp.') || hostname.startsWith('admin.');
    if (!isMainAdmin) {
      if (hostname.startsWith('customer.') || hostname.startsWith('client.')) return 'customer';
      if (hostname.startsWith('installer.') || hostname.startsWith('installers.') || hostname.startsWith('contractor.')) return 'installer';
    }
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
    ? (config.customDomain?.replace(/^https?:\/\//, '').split('.')[0] || 'portal')
    : '@';

  // Target hostname for CNAME pointing
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'mysolarcrm.com.au';
  const cnameTarget = currentHost.includes('run.app') ? currentHost : 'ghs.googlehosted.com';

  return {
    type: 'CNAME',
    host: host || 'portal',
    value: cnameTarget,
    ttl: '300 (Auto)',
    description: `Points ${config.label} traffic to this application's SSL ingress endpoint (${cnameTarget})`
  };
};
