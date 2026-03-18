import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

// =============================================================================
// Types
// =============================================================================

export interface ServiceFusionSecrets {
  clientId: string;
  clientSecret: string;
}

export interface GraphSecrets {
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

export interface SharePointDirectorSecrets {
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

export interface AllSecrets {
  serviceFusion: ServiceFusionSecrets;
  graph: GraphSecrets;
  sharePointDirector: SharePointDirectorSecrets;
  anthropicApiKey: string;
  openaiApiKey: string;
}

// =============================================================================
// Secret Cache
// =============================================================================

let secretClient: SecretClient | null = null;
let cachedSecrets: Partial<AllSecrets> = {};

function getSecretClient(): SecretClient | null {
  if (secretClient) return secretClient;

  const vaultUrl = process.env.AZURE_KEY_VAULT_URI;
  if (!vaultUrl) return null;

  const credential = new DefaultAzureCredential();
  secretClient = new SecretClient(vaultUrl, credential);
  return secretClient;
}

async function fetchSecret(name: string): Promise<string> {
  const client = getSecretClient();
  if (!client) {
    throw new Error('Key Vault not configured. Set AZURE_KEY_VAULT_URI or use environment variables.');
  }

  const secret = await client.getSecret(name);
  return secret.value || '';
}

// =============================================================================
// Service Fusion Secrets
// =============================================================================

export async function getServiceFusionSecrets(): Promise<ServiceFusionSecrets> {
  if (cachedSecrets.serviceFusion) {
    return cachedSecrets.serviceFusion;
  }

  const vaultUrl = process.env.AZURE_KEY_VAULT_URI;
  const env = process.env.SERVICEFUSION_ENV === 'production' ? 'production' : 'integration';
  const envClientId =
    process.env.SERVICEFUSION_CLIENT_ID ||
    process.env[`SERVICEFUSION_CLIENT_ID_${env.toUpperCase()}`] ||
    process.env.PHOENIX_COMMAND_CLIENT_ID ||
    process.env[`PHOENIX_COMMAND_CLIENT_ID_${env.toUpperCase()}`];
  const envClientSecret =
    process.env.SERVICEFUSION_CLIENT_SECRET ||
    process.env[`SERVICEFUSION_CLIENT_SECRET_${env.toUpperCase()}`] ||
    process.env.PHOENIX_COMMAND_CLIENT_SECRET ||
    process.env[`PHOENIX_COMMAND_CLIENT_SECRET_${env.toUpperCase()}`];

  if (!vaultUrl) {
    // Fallback to environment variables for local development
    const secrets: ServiceFusionSecrets = {
      clientId: envClientId || '',
      clientSecret: envClientSecret || '',
    };

    if (!secrets.clientId || !secrets.clientSecret) {
      throw new Error(
        'Service Fusion credentials not configured. Set AZURE_KEY_VAULT_URI or provide SERVICEFUSION_* env vars.'
      );
    }

    cachedSecrets.serviceFusion = secrets;
    return secrets;
  }

  // Helper to try a list of secret names in order, then fallback to env
  const firstSecret = async (names: string[], envFallback: string): Promise<string> => {
    for (const name of names) {
      try {
        const value = await fetchSecret(name);
        if (value) return value.trim();
      } catch {
        // continue to next name
      }
    }
    return envFallback || '';
  };

  const nameSets =
    env === 'production'
      ? {
          clientId: ['SERVICEFUSION-CLIENT-ID', 'ServiceFusion-ClientId', 'PhoenixAiCommandClientId'],
          clientSecret: ['SERVICEFUSION-SECRET', 'ServiceFusion-ClientSecret-2025-11', 'PhoenixAiCommandSecret'],
        }
      : {
          clientId: [
            'SERVICEFUSION-CLIENT-ID-INTEGRATION',
            'ServiceFusion-ClientId-Integration',
            'PhoenixAiCommandClientIdIntegration',
            'SERVICEFUSION-CLIENT-ID',
            'ServiceFusion-ClientId',
            'PhoenixAiCommandClientId',
          ],
          clientSecret: [
            'SERVICEFUSION-SECRET-INTEGRATION',
            'ServiceFusion-ClientSecret-Integration',
            'PhoenixAiCommandSecretIntegration',
            'SERVICEFUSION-SECRET',
            'ServiceFusion-ClientSecret-2025-11',
            'PhoenixAiCommandSecret',
          ],
        };

  const [clientId, clientSecret] = await Promise.all([
    firstSecret(nameSets.clientId, envClientId || ''),
    firstSecret(nameSets.clientSecret, envClientSecret || ''),
  ]);

  const secrets: ServiceFusionSecrets = {
    clientId,
    clientSecret,
  };

  cachedSecrets.serviceFusion = secrets;
  return secrets;
}

// =============================================================================
// Graph Secrets
// =============================================================================

export async function getGraphSecrets(): Promise<GraphSecrets> {
  if (cachedSecrets.graph) {
    return cachedSecrets.graph;
  }

  const vaultUrl = process.env.AZURE_KEY_VAULT_URI;
  const envClientId = process.env.AZURE_CLIENT_ID || process.env.GRAPH_CLIENT_ID || process.env.PHOENIX_COMMAND_CLIENT_ID;

  if (!vaultUrl) {
    const secrets: GraphSecrets = {
      clientId: envClientId || '',
      clientSecret: process.env.GRAPH_CLIENT_SECRET || process.env.PHOENIX_COMMAND_CLIENT_SECRET || '',
      tenantId: process.env.AZURE_TENANT_ID || '',
    };

    cachedSecrets.graph = secrets;
    return secrets;
  }

  // Prefer dedicated Graph secrets; fallback to PhoenixAiCommand app secret when present.
  const [clientId, clientSecret] = await Promise.all([
    fetchSecret('Graph-ClientId').catch(async () => envClientId || fetchSecret('PhoenixAiCommandClientId')),
    fetchSecret('Graph-ClientSecret').catch(() => fetchSecret('PhoenixAiCommandSecret')),
  ]);

  const secrets: GraphSecrets = {
    clientId,
    clientSecret,
    tenantId: process.env.AZURE_TENANT_ID || 'e7d8daef-fd5b-4e0b-bf8f-32f090c7c4d5',
  };

  cachedSecrets.graph = secrets;
  return secrets;
}

// =============================================================================
// SharePoint Director Secrets
// =============================================================================

export async function getSharePointDirectorSecrets(): Promise<SharePointDirectorSecrets> {
  if (cachedSecrets.sharePointDirector) {
    return cachedSecrets.sharePointDirector;
  }

  const vaultUrl = process.env.AZURE_KEY_VAULT_URI;

  if (!vaultUrl) {
    const secrets: SharePointDirectorSecrets = {
      clientId: process.env.SHAREPOINT_DIRECTOR_CLIENT_ID || '',
      clientSecret: process.env.SHAREPOINT_DIRECTOR_CLIENT_SECRET || '',
      tenantId: process.env.SHAREPOINT_DIRECTOR_TENANT_ID || 'e7d8daef-fd5b-4e0b-bf8f-32f090c7c4d5',
    };

    cachedSecrets.sharePointDirector = secrets;
    return secrets;
  }

  const [clientId, clientSecret, tenantId] = await Promise.all([
    fetchSecret('SharePoint-Director-ClientId'),
    fetchSecret('SharePoint-Director-ClientSecret'),
    fetchSecret('SharePoint-Director-TenantId').catch(() => 'e7d8daef-fd5b-4e0b-bf8f-32f090c7c4d5'),
  ]);

  const secrets: SharePointDirectorSecrets = {
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
    tenantId: tenantId.trim(),
  };

  cachedSecrets.sharePointDirector = secrets;
  return secrets;
}

// =============================================================================
// AI API Keys
// =============================================================================

export async function getAnthropicApiKey(): Promise<string> {
  if (cachedSecrets.anthropicApiKey) {
    return cachedSecrets.anthropicApiKey;
  }

  const vaultUrl = process.env.AZURE_KEY_VAULT_URI;

  if (!vaultUrl) {
    const key = process.env.ANTHROPIC_API_KEY || '';
    cachedSecrets.anthropicApiKey = key;
    return key;
  }

  const key = await fetchSecret('Anthropic-API-Key');
  cachedSecrets.anthropicApiKey = key;
  return key;
}

export async function getOpenAIApiKey(): Promise<string> {
  if (cachedSecrets.openaiApiKey) {
    return cachedSecrets.openaiApiKey;
  }

  const vaultUrl = process.env.AZURE_KEY_VAULT_URI;

  if (!vaultUrl) {
    const key = process.env.OPENAI_API_KEY || '';
    cachedSecrets.openaiApiKey = key;
    return key;
  }

  const key = await fetchSecret('OpenAI-API-Key');
  cachedSecrets.openaiApiKey = key;
  return key;
}

// =============================================================================
// Utilities
// =============================================================================

export function clearSecretCache(): void {
  cachedSecrets = {};
}

export async function testKeyVaultConnection(): Promise<boolean> {
  try {
    const client = getSecretClient();
    if (!client) return false;

    // Try to list secrets (won't return values, just names)
    const iterator = client.listPropertiesOfSecrets();
    await iterator.next();
    return true;
  } catch {
    return false;
  }
}
