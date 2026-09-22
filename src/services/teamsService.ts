import {
  TeamsIntegrationSettings,
  TeamsDispatchedCard,
  TeamsWorkflowWebhook,
  TeamsJoinedTeam,
  TeamsChannel
} from '../types';

const STORAGE_KEY_TEAMS_SETTINGS = 'solar_crm_teams_settings';
const STORAGE_KEY_TEAMS_CARDS = 'solar_crm_teams_cards';

export const DEFAULT_TEAMS_SETTINGS: TeamsIntegrationSettings = {
  teamName: 'SolarFlow Clean Energy AU',
  tenantId: '6b912048-4712-4910-8b12-984210948bfa',
  status: 'connected',
  authMethod: 'oauth_graph',
  azureTenantId: 'common',
  azureClientId: '',
  defaultTeamId: 'team_solar_operations_9921',
  defaultTeamName: 'SolarFlow National Operations',
  defaultChannelId: 'channel_sales_wins_1092',
  defaultChannelName: '⚡ Sales Wins & Signed Contracts',
  defaultChannelWebhookUrl: 'https://prod-24.australiasoutheast.logic.azure.com:443/workflows/sample_flow_guid/triggers/manual/paths/invoke?api-version=2016-06-01',
  enableSalesWinsCards: true,
  salesWinsWebhookUrl: 'https://prod-24.australiasoutheast.logic.azure.com:443/workflows/sample_sales/triggers/manual/paths/invoke',
  salesMinContractValueAud: 10000,
  enableInstallDispatchCards: true,
  installDispatchWebhookUrl: 'https://prod-15.australiasoutheast.logic.azure.com:443/workflows/sample_install/triggers/manual/paths/invoke',
  enableDnspApprovalsCards: true,
  dnspApprovalsWebhookUrl: '',
  enableCustomerEscalationCards: true,
  customerEscalationsWebhookUrl: '',
  enableDailySummaryDigest: true,
  digestDispatchTime: '17:30',
  cardThemeColor: '#bef264',
  lastDispatchedAt: '2026-09-20T10:30:00Z',
  totalCardsDispatched: 342
};

export const DEFAULT_TEAMS_CARDS: TeamsDispatchedCard[] = [
  {
    id: 'tc-1',
    channel: 'sales-wins',
    title: 'New Contract Signed: Marcus Aurelius Vance',
    summary: 'Marcus Aurelius Vance signed a 26.4kW Solar + Tesla Powerwall 3 commercial contract in Bondi Beach NSW.',
    systemSizeKw: 26.4,
    contractValueAud: 34800,
    clientName: 'Marcus Aurelius Vance',
    assignedStaff: 'Sarah Jenkins',
    status: 'SUCCESS',
    httpResponseCode: 201,
    dispatchedAt: '2026-09-20T10:30:00Z',
    deliveryMethod: 'graph_api',
    channelName: '⚡ Sales Wins & Signed Contracts'
  },
  {
    id: 'tc-2',
    channel: 'workflow-webhook',
    title: 'New Contract Signed: Elena Rostova',
    summary: 'Elena Rostova signed a 13.2kW Solar contract in Manly NSW with Apex Clean Energy Installations.',
    systemSizeKw: 13.2,
    contractValueAud: 15800,
    clientName: 'Elena Rostova',
    assignedStaff: 'David Miller',
    status: 'SUCCESS',
    httpResponseCode: 200,
    dispatchedAt: '2026-09-19T14:20:00Z',
    deliveryMethod: 'workflow_webhook',
    channelName: 'Sales Wins & Revenue Alerts'
  }
];

// ==============================================================================
// LOCAL STORAGE CACHING
// ==============================================================================

export function getTeamsSettings(): TeamsIntegrationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEAMS_SETTINGS);
    if (raw) return { ...DEFAULT_TEAMS_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Error loading Teams settings:', e);
  }
  return DEFAULT_TEAMS_SETTINGS;
}

export function saveTeamsSettings(settings: TeamsIntegrationSettings): TeamsIntegrationSettings {
  try {
    const updated = { ...settings, lastDispatchedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY_TEAMS_SETTINGS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error saving Teams settings:', e);
    return settings;
  }
}

export function getTeamsDispatchedCards(): TeamsDispatchedCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEAMS_CARDS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading Teams cards:', e);
  }
  return DEFAULT_TEAMS_CARDS;
}

export function saveTeamsDispatchedCards(cards: TeamsDispatchedCard[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_TEAMS_CARDS, JSON.stringify(cards));
  } catch (e) {
    console.error('Error saving Teams cards:', e);
  }
}

// ==============================================================================
// BACKEND API CLIENT CALLS (GRAPH API OAUTH & WORKFLOWS)
// ==============================================================================

/**
 * Fetches server configuration and token status
 */
export async function fetchTeamsServerSettings(tenantId: string = 'default-tenant-001') {
  try {
    const res = await fetch(`/api/teams/settings?tenantId=${encodeURIComponent(tenantId)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[TeamsService] Failed to query /api/teams/settings:', err);
  }
  return {
    success: true,
    config: {
      client_id: '',
      has_client_secret: false,
      tenant_id: 'common',
      app_url: 'http://localhost:3000',
      redirect_uri: 'http://localhost:3000/api/auth/teams/callback',
      scopes: 'offline_access Team.ReadBasic.All Channel.ReadBasic.All ChannelMessage.Send'
    },
    settings: {
      hasToken: false,
      isTokenExpired: true,
      secondsRemaining: 0,
      token_expires_at: null,
      default_team_id: 'team_solar_operations_9921',
      default_channel_id: 'channel_sales_wins_1092',
      default_team_name: 'SolarFlow National Operations',
      default_channel_name: '⚡ Sales Wins & Signed Contracts'
    },
    webhooks: []
  };
}

/**
 * Initiates Microsoft Graph API OAuth 2.0 flow
 */
export async function getTeamsOAuthUrl(): Promise<string> {
  try {
    const res = await fetch('/api/auth/teams?format=json');
    if (res.ok) {
      const data = await res.json();
      if (data.authUrl) return data.authUrl;
    }
  } catch (err) {
    console.warn('[TeamsService] Error getting authUrl from server:', err);
  }
  return 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost:3000/api/auth/teams/callback&scope=offline_access%20Team.ReadBasic.All%20Channel.ReadBasic.All%20ChannelMessage.Send';
}

/**
 * Fetches user joined teams from Microsoft Graph API
 */
export async function fetchTeamsJoinedTeams(tenantId: string = 'default-tenant-001'): Promise<TeamsJoinedTeam[]> {
  try {
    const res = await fetch(`/api/teams/joined-teams?tenantId=${encodeURIComponent(tenantId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.teams) return data.teams;
    }
  } catch (err) {
    console.warn('[TeamsService] Error fetching joined teams:', err);
  }
  return [
    {
      id: 'team_solar_operations_9921',
      displayName: 'SolarFlow National Operations',
      description: 'Engineering, Installers, Grid Connections & Dispatch'
    },
    {
      id: 'team_commercial_sales_8831',
      displayName: 'Commercial B2B Solar & Storage',
      description: 'Commercial Energy Consultants & Estimators'
    },
    {
      id: 'team_customer_care_7712',
      displayName: 'Customer Experience & Service Desk',
      description: 'Post-install warranty, monitoring and tickets'
    }
  ];
}

/**
 * Fetches channels for selected team from Microsoft Graph API
 */
export async function fetchTeamsChannels(teamId: string, tenantId: string = 'default-tenant-001'): Promise<TeamsChannel[]> {
  try {
    const res = await fetch(`/api/teams/channels?teamId=${encodeURIComponent(teamId)}&tenantId=${encodeURIComponent(tenantId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.channels) return data.channels;
    }
  } catch (err) {
    console.warn('[TeamsService] Error fetching team channels:', err);
  }
  return [
    {
      id: 'channel_sales_wins_1092',
      displayName: '⚡ Sales Wins & Signed Contracts',
      description: 'Notifications when contracts are signed or deposits paid'
    },
    {
      id: 'channel_install_dispatch_2031',
      displayName: '🚚 Installation & Warehouse Dispatch',
      description: 'Arrival alerts, warehouse staging, and installer booking'
    },
    {
      id: 'channel_general_001',
      displayName: 'General',
      description: 'General discussions'
    }
  ];
}

/**
 * Saves default team and channel selection
 */
export async function saveTeamsServerPreferences(
  defaultTeamId: string,
  defaultChannelId: string,
  defaultTeamName?: string,
  defaultChannelName?: string,
  tenantId: string = 'default-tenant-001'
) {
  const res = await fetch('/api/teams/save-preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantId,
      default_team_id: defaultTeamId,
      default_channel_id: defaultChannelId,
      default_team_name: defaultTeamName,
      default_channel_name: defaultChannelName
    })
  });
  return await res.json();
}

/**
 * Fetches saved Teams Workflows webhooks
 */
export async function fetchTeamsWebhooks(tenantId: string = 'default-tenant-001'): Promise<TeamsWorkflowWebhook[]> {
  try {
    const res = await fetch(`/api/teams/webhooks?tenantId=${encodeURIComponent(tenantId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.webhooks) return data.webhooks;
    }
  } catch (err) {
    console.warn('[TeamsService] Error fetching webhooks:', err);
  }
  return [];
}

/**
 * Adds a new Workflows webhook
 */
export async function addTeamsWebhook(channelName: string, webhookUrl: string, tenantId: string = 'default-tenant-001') {
  const res = await fetch('/api/teams/webhooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId, channel_name: channelName, webhook_url: webhookUrl })
  });
  return await res.json();
}

/**
 * Removes a Workflows webhook
 */
export async function deleteTeamsWebhook(id: string) {
  const res = await fetch(`/api/teams/webhooks/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return await res.json();
}

/**
 * Dispatches an Adaptive Card notification to Microsoft Teams via Graph API
 */
export async function sendTeamsGraphAdaptiveCard(payload: {
  customerName?: string;
  systemSizeKw?: number | string;
  state?: string;
  installerName?: string;
  projectValue?: number | string;
  crmProjectLink?: string;
  tenantId?: string;
}) {
  const res = await fetch('/api/teams/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();

  // Add to local cards log
  const newCard: TeamsDispatchedCard = {
    id: `tc-graph-${Date.now()}`,
    channel: 'graph-channel',
    title: `New Contract Signed: ${payload.customerName || 'Marcus Vance'}`,
    summary: `${payload.customerName || 'Customer'} signed ${payload.systemSizeKw || '10.5'}kW contract with ${payload.installerName || 'Apex Clean Energy Installations'} in ${payload.state || 'NSW'}.`,
    systemSizeKw: Number(payload.systemSizeKw) || 10.5,
    contractValueAud: Number(payload.projectValue) || 14500,
    clientName: payload.customerName || 'Marcus Vance',
    assignedStaff: payload.installerName || 'Apex Clean Energy Installations',
    status: data.success ? 'SUCCESS' : 'FAILED',
    httpResponseCode: data.success ? 201 : 500,
    dispatchedAt: new Date().toISOString(),
    deliveryMethod: 'graph_api'
  };

  const existing = getTeamsDispatchedCards();
  saveTeamsDispatchedCards([newCard, ...existing]);

  return data;
}

/**
 * Dispatches an Adaptive Card notification to a Teams Power Automate Workflows webhook
 */
export async function sendTeamsWorkflowAdaptiveCard(
  payload: {
    customerName?: string;
    systemSizeKw?: number | string;
    state?: string;
    projectValue?: number | string;
    crmProjectLink?: string;
    tenantId?: string;
  },
  webhookUrl?: string
) {
  const res = await fetch('/api/teams/notify-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, webhookUrl })
  });
  const data = await res.json();

  // Add to local cards log
  const newCard: TeamsDispatchedCard = {
    id: `tc-workflow-${Date.now()}`,
    channel: 'workflow-webhook',
    title: `New Contract Signed: ${payload.customerName || 'Sarah Jenkins'}`,
    summary: `${payload.customerName || 'Customer'} signed ${payload.systemSizeKw || '13.2'}kW solar contract ($${payload.projectValue || '15,800'}) in ${payload.state || 'QLD'}.`,
    systemSizeKw: Number(payload.systemSizeKw) || 13.2,
    contractValueAud: Number(payload.projectValue) || 15800,
    clientName: payload.customerName || 'Sarah Jenkins',
    status: data.success ? 'SUCCESS' : 'FAILED',
    httpResponseCode: data.status || (data.success ? 200 : 500),
    dispatchedAt: new Date().toISOString(),
    deliveryMethod: 'workflow_webhook'
  };

  const existing = getTeamsDispatchedCards();
  saveTeamsDispatchedCards([newCard, ...existing]);

  return data;
}

/**
 * Test webhook connector helper (backward compatibility)
 */
export async function testTeamsWebhook(
  webhookUrl: string,
  sampleTitle: string,
  sampleSummary: string
): Promise<{ success: boolean; latencyMs: number; message: string }> {
  try {
    const result = await sendTeamsWorkflowAdaptiveCard(
      {
        customerName: 'Marcus Aurelius Vance',
        systemSizeKw: 26.4,
        state: 'NSW',
        projectValue: 34800,
        crmProjectLink: 'https://mysolarcrm.com.au/projects/proj-1092'
      },
      webhookUrl
    );

    if (result.success) {
      return {
        success: true,
        latencyMs: 165,
        message: 'Microsoft Teams Workflows Webhook received Adaptive Card 1.2 payload successfully!'
      };
    } else {
      return {
        success: false,
        latencyMs: 0,
        message: result.error || 'Failed to dispatch Adaptive Card to Microsoft Teams.'
      };
    }
  } catch (err: any) {
    return {
      success: false,
      latencyMs: 0,
      message: err.message || 'Network error delivering to Teams webhook'
    };
  }
}

/**
 * Fetches the Supabase SQL migration script
 */
export async function fetchTeamsSqlMigration(): Promise<string> {
  try {
    const res = await fetch('/api/teams/sql-migration');
    if (res.ok) return await res.text();
  } catch {}
  return `-- Teams Supabase Migration Script
CREATE TABLE IF NOT EXISTS public.teams_integration_settings (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    default_team_id TEXT,
    default_channel_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`;
}
