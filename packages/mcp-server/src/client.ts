import { getServiceFusionSecrets, createLogger, logApproval, type ServiceFusionSecrets } from '@phoenix/shared';
import { RateLimiter } from './rate-limiter.js';
import { ResponseCache } from './cache.js';

const logger = createLogger('servicefusion-client');
const approvalLogger = createLogger('servicefusion-approval');

// =============================================================================
// Types
// =============================================================================

interface TokenCache {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  requiresApproval?: boolean;
  approvalToken?: string;
  skipCache?: boolean;
}

// =============================================================================
// Service Fusion v1 Client
// =============================================================================

const AUTH_URL = 'https://api.servicefusion.com/oauth/access_token';
const API_BASE = 'https://api.servicefusion.com';

export class ServiceFusionClient {
  private tokenCache: TokenCache | null = null;
  private secrets: ServiceFusionSecrets | null = null;
  private initialized = false;
  readonly rateLimiter: RateLimiter;
  readonly cache: ResponseCache;

  constructor() {
    this.rateLimiter = new RateLimiter(60);
    this.cache = new ResponseCache(60);
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.secrets = await getServiceFusionSecrets();
    this.initialized = true;

    logger.info('Service Fusion client initialized');
  }

  // ---------------------------------------------------------------------------
  // Authentication (JSON body per SF v1 docs)
  // ---------------------------------------------------------------------------

  private async getToken(): Promise<string> {
    if (!this.initialized) await this.initialize();

    const now = Date.now();

    // Return cached token if still valid (60s buffer)
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60_000) {
      return this.tokenCache.accessToken;
    }

    // Try refresh token first if available
    if (this.tokenCache?.refreshToken) {
      try {
        return await this.refreshAccessToken(this.tokenCache.refreshToken);
      } catch (err) {
        logger.warn({ error: (err as Error).message }, 'Refresh token failed, re-authenticating');
      }
    }

    // Full client_credentials grant
    logger.debug('Fetching new Service Fusion access token');

    const response = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.secrets!.clientId,
        client_secret: this.secrets!.clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, 'Service Fusion auth failed');
      throw new Error(`Service Fusion auth failed: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as TokenResponse;

    this.tokenCache = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || null,
      expiresAt: now + data.expires_in * 1000,
    };

    logger.debug({ expiresIn: data.expires_in, hasRefreshToken: !!data.refresh_token }, 'Token obtained');
    return this.tokenCache.accessToken;
  }

  private async refreshAccessToken(refreshToken: string): Promise<string> {
    logger.debug('Refreshing Service Fusion access token');

    const response = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.secrets!.clientId,
        client_secret: this.secrets!.clientSecret,
      }),
    });

    if (!response.ok) {
      this.tokenCache = null;
      throw new Error(`Refresh failed: ${response.status}`);
    }

    const data = (await response.json()) as TokenResponse;
    const now = Date.now();

    this.tokenCache = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: now + data.expires_in * 1000,
    };

    logger.debug({ expiresIn: data.expires_in }, 'Token refreshed');
    return this.tokenCache.accessToken;
  }

  // ---------------------------------------------------------------------------
  // API Request
  // ---------------------------------------------------------------------------

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (!this.initialized) await this.initialize();

    const { params, skipCache, ...fetchOptions } = options;
    const method = (fetchOptions.method || 'GET').toUpperCase();
    const isWrite = (options.requiresApproval ?? method !== 'GET');

    // Enforce approval on writes — and emit a structured approval log line for every write.
    // Modes: dry_run (SF_DRY_RUN=true) returns payload without calling SF.
    //        commit (approval token present OR ALLOW_SF_WRITES=true) calls SF normally.
    if (isWrite) {
      const approvalToken = options.approvalToken || process.env.SF_APPROVAL_TOKEN;
      const allowWithoutApproval = process.env.ALLOW_SF_WRITES === 'true';
      const dryRun = process.env.SF_DRY_RUN === 'true';

      if (!dryRun && !allowWithoutApproval && !approvalToken) {
        throw new Error('Service Fusion write blocked: approval token required (set SF_APPROVAL_TOKEN or ALLOW_SF_WRITES=true, or SF_DRY_RUN=true)');
      }

      const tokenSource = approvalToken
        ? (options.approvalToken ? 'argument' : 'env')
        : (allowWithoutApproval ? 'allow_writes_env' : 'none');

      let parsedBody: unknown = undefined;
      if (typeof fetchOptions.body === 'string') {
        try { parsedBody = JSON.parse(fetchOptions.body); } catch { parsedBody = fetchOptions.body; }
      }

      logApproval(approvalLogger, `sf.${method.toLowerCase()} ${path}`, tokenSource, {
        mode: dryRun ? 'dry_run' : 'commit',
        method,
        path,
        params,
        body: parsedBody,
      });

      if (dryRun) {
        // Don't call SF. Return a structured envelope so the tool can surface it to the user.
        return {
          dryRun: true,
          method,
          path,
          params,
          body: parsedBody,
        } as T;
      }
    }

    const token = await this.getToken();

    // Check cache for GET requests
    if (method === 'GET' && !skipCache) {
      const cached = this.cache.get<T>(path, params as Record<string, unknown>);
      if (cached !== undefined) return cached;
    }

    // Build URL with query params
    let url = `${API_BASE}${path}`;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          searchParams.set(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) url += `?${queryString}`;
    }

    // Rate limit: wait for a slot
    await this.rateLimiter.acquire();

    const startTime = Date.now();

    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...fetchOptions.headers,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const duration = Date.now() - startTime;

    // Update rate limiter from response headers
    this.rateLimiter.updateFromHeaders(response.headers);

    // Handle 429 with retry
    if (response.status === 429) {
      const waitMs = this.rateLimiter.handle429(response.headers);
      logger.warn({ path, waitMs }, 'Rate limited (429). Retrying after wait.');
      await new Promise(resolve => setTimeout(resolve, waitMs));

      // Retry once
      await this.rateLimiter.acquire();
      const retryResponse = await fetch(url, {
        ...fetchOptions,
        headers: {
          ...fetchOptions.headers,
          Authorization: `Bearer ${await this.getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      this.rateLimiter.updateFromHeaders(retryResponse.headers);

      if (!retryResponse.ok) {
        const errorText = await retryResponse.text();
        throw new Error(`Service Fusion API error after retry: ${retryResponse.status} - ${errorText}`);
      }

      const data = (await retryResponse.json()) as T;
      if (method === 'GET') this.cache.set(path, params as Record<string, unknown>, data);
      return data;
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ path, status: response.status, duration, error: errorText }, 'API request failed');
      throw new Error(`Service Fusion API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as T;

    // Cache GET responses
    if (method === 'GET') {
      this.cache.set(path, params as Record<string, unknown>, data);
    }

    // Invalidate cache on writes
    if (method === 'POST') {
      // Invalidate list cache for the resource (e.g. POST /v1/customers → invalidate /v1/customers)
      this.cache.invalidate(path);
    }

    logger.debug({ path, status: response.status, duration }, 'API request completed');
    return data;
  }

  // ---------------------------------------------------------------------------
  // Convenience Methods
  // ---------------------------------------------------------------------------

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>(path, { method: 'GET', params, requiresApproval: false });
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      requiresApproval: true,
      body: JSON.stringify(body),
    });
  }

  // ---------------------------------------------------------------------------
  // Health Check
  // ---------------------------------------------------------------------------

  async healthCheck(): Promise<{ authenticated: boolean; authError?: string; rateLimiter: { remaining: number; limit: number }; cache: { size: number } }> {
    const rlState = this.rateLimiter.getState();
    const cacheStats = this.cache.getStats();
    try {
      await this.getToken();
      return {
        authenticated: true,
        rateLimiter: { remaining: rlState.remaining, limit: rlState.limit },
        cache: { size: cacheStats.size },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ error: message }, 'Health check: authentication failed');
      return {
        authenticated: false,
        authError: message,
        rateLimiter: { remaining: rlState.remaining, limit: rlState.limit },
        cache: { size: cacheStats.size },
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  destroy(): void {
    this.rateLimiter.destroy();
    this.cache.destroy();
    this.tokenCache = null;
    this.initialized = false;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let clientInstance: ServiceFusionClient | null = null;

export function getClient(): ServiceFusionClient {
  if (!clientInstance) {
    clientInstance = new ServiceFusionClient();
  }
  return clientInstance;
}

export function resetClient(): void {
  if (clientInstance) {
    clientInstance.destroy();
    clientInstance = null;
  }
}
