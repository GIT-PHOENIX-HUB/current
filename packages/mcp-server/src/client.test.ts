import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock @phoenix/shared so we don't try to hit Key Vault in tests.
vi.mock('@phoenix/shared', async () => {
  const actual = await vi.importActual<typeof import('@phoenix/shared')>('@phoenix/shared');
  return {
    ...actual,
    getServiceFusionSecrets: vi.fn(async () => ({
      clientId: 'test-id',
      clientSecret: 'test-secret',
    })),
  };
});

import { ServiceFusionClient, resetClient } from './client.js';

type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

describe('ServiceFusionClient', () => {
  let client: ServiceFusionClient;
  let fetchMock: FetchMock;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
    client = new ServiceFusionClient();
    delete process.env.SF_APPROVAL_TOKEN;
    delete process.env.ALLOW_SF_WRITES;
    delete process.env.SF_DRY_RUN;
  });

  afterEach(() => {
    client.destroy();
    resetClient();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('token cache', () => {
    it('reuses cached token within the TTL window', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (String(url).includes('/oauth/access_token')) {
          return jsonResponse({ access_token: 'tok-1', expires_in: 3600, token_type: 'Bearer' });
        }
        return jsonResponse({ items: [] });
      });

      await client.get('/v1/customers');
      await client.get('/v1/customers', { page: 2 }); // distinct cache key, second API call

      // Auth call: 1; first /v1/customers: 1; second /v1/customers (different params): 1
      expect(fetchMock).toHaveBeenCalledTimes(3);

      const authCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/oauth/access_token'));
      expect(authCalls).toHaveLength(1); // token reused
    });

    it('refreshes the token when expiry is within the 60s buffer', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({
          access_token: 'tok-1',
          expires_in: 30, // less than the 60s buffer ⇒ next call must refresh
          token_type: 'Bearer',
        }))
        .mockResolvedValueOnce(jsonResponse({ items: [] }))
        .mockResolvedValueOnce(jsonResponse({
          access_token: 'tok-2',
          expires_in: 3600,
          token_type: 'Bearer',
        }))
        .mockResolvedValueOnce(jsonResponse({ items: [] }));

      await client.get('/v1/customers');
      // Force second call to skip cache so it actually hits the API.
      await client.request('/v1/customers', { method: 'GET', skipCache: true });

      const authCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/oauth/access_token'));
      expect(authCalls.length).toBe(2); // re-auth happened
    });

    it('falls back to client_credentials if the refresh token is rejected', async () => {
      // Initial auth issues a token with refresh_token set, but expires_in is short.
      fetchMock
        .mockResolvedValueOnce(jsonResponse({
          access_token: 'tok-1',
          expires_in: 30,
          token_type: 'Bearer',
          refresh_token: 'refresh-1',
        }))
        .mockResolvedValueOnce(jsonResponse({ items: [] }))
        // Refresh attempt fails
        .mockResolvedValueOnce(new Response('bad refresh', { status: 401 }))
        // Full re-auth succeeds
        .mockResolvedValueOnce(jsonResponse({
          access_token: 'tok-2',
          expires_in: 3600,
          token_type: 'Bearer',
        }))
        .mockResolvedValueOnce(jsonResponse({ items: [] }));

      await client.get('/v1/customers');
      await client.request('/v1/customers', { method: 'GET', skipCache: true });

      // Last successful auth used grant_type=client_credentials (not refresh_token)
      const authBodies = fetchMock.mock.calls
        .filter(([url]) => String(url).includes('/oauth/access_token'))
        .map(([, init]) => JSON.parse((init as RequestInit).body as string));
      expect(authBodies[0].grant_type).toBe('client_credentials');
      expect(authBodies[1].grant_type).toBe('refresh_token');
      expect(authBodies[2].grant_type).toBe('client_credentials');
    });
  });

  describe('429 retry', () => {
    it('retries once after honoring numeric Retry-After', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ access_token: 'tok', expires_in: 3600, token_type: 'Bearer' }))
        .mockResolvedValueOnce(new Response('Too Many', {
          status: 429,
          headers: { 'Retry-After': '1' },
        }))
        .mockResolvedValueOnce(jsonResponse({ items: ['retried'] }));

      const promise = client.get<{ items: string[] }>('/v1/customers');
      // Fast-forward the Retry-After wait.
      await vi.advanceTimersByTimeAsync(1_500);
      const result = await promise;

      expect(result).toEqual({ items: ['retried'] });
      // 1 auth + 1 first call + 1 retry
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('write gate', () => {
    it('blocks POST without an approval token or env override', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ access_token: 'tok', expires_in: 3600, token_type: 'Bearer' }));
      await expect(client.post('/v1/customers', { customer_name: 'Test' })).rejects.toThrow(
        /Service Fusion write blocked/,
      );
    });

    it('allows POST when ALLOW_SF_WRITES=true', async () => {
      process.env.ALLOW_SF_WRITES = 'true';
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ access_token: 'tok', expires_in: 3600, token_type: 'Bearer' }))
        .mockResolvedValueOnce(jsonResponse({ id: 99, customer_name: 'Test' }));

      const result = await client.post<{ id: number }>('/v1/customers', { customer_name: 'Test' });
      expect(result.id).toBe(99);
    });

    it('SF_DRY_RUN=true returns the would-send payload without calling SF', async () => {
      process.env.SF_DRY_RUN = 'true';
      fetchMock.mockResolvedValueOnce(jsonResponse({ access_token: 'tok', expires_in: 3600, token_type: 'Bearer' }));

      const result = await client.post<{ dryRun: true; method: string; path: string; body: unknown }>(
        '/v1/customers',
        { customer_name: 'DryTest' },
      );

      expect(result).toMatchObject({
        dryRun: true,
        method: 'POST',
        path: '/v1/customers',
        body: { customer_name: 'DryTest' },
      });

      // Only the auth call should be made (initialize() ⇒ token), nothing else.
      // Some impls may not even auth in dry_run; allow 0 or 1 auth calls.
      const apiCalls = fetchMock.mock.calls.filter(([url]) => !String(url).includes('/oauth/access_token'));
      expect(apiCalls).toHaveLength(0);
    });
  });

  describe('cache invalidation on POST', () => {
    it('invalidates GET cache for the path when a POST succeeds', async () => {
      process.env.ALLOW_SF_WRITES = 'true';

      fetchMock
        .mockResolvedValueOnce(jsonResponse({ access_token: 'tok', expires_in: 3600, token_type: 'Bearer' }))
        // First GET — populates cache
        .mockResolvedValueOnce(jsonResponse({ items: ['first'] }))
        // POST
        .mockResolvedValueOnce(jsonResponse({ id: 1 }))
        // Second GET (after invalidation) — must hit the network again
        .mockResolvedValueOnce(jsonResponse({ items: ['after-post'] }));

      const a = await client.get<{ items: string[] }>('/v1/customers');
      expect(a.items).toEqual(['first']);

      await client.post('/v1/customers', { customer_name: 'X' });

      const b = await client.get<{ items: string[] }>('/v1/customers');
      expect(b.items).toEqual(['after-post']);

      const customerCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/v1/customers'));
      // 2 GETs + 1 POST
      expect(customerCalls).toHaveLength(3);
    });
  });
});
