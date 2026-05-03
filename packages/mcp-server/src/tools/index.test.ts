import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@phoenix/shared', async () => {
  const actual = await vi.importActual<typeof import('@phoenix/shared')>('@phoenix/shared');
  return {
    ...actual,
    getServiceFusionSecrets: vi.fn(async () => ({ clientId: 'x', clientSecret: 'y' })),
  };
});

import {
  createAllTools,
  getActiveTools,
  getDeprecatedTools,
  getToolByName,
  getProtectedTools,
  type Tool,
} from './index.js';
import { ServiceFusionClient } from '../client.js';

function buildTools(): { tools: Tool[]; getCalls: string[][]; postCalls: Array<[string, unknown]> } {
  const getCalls: string[][] = [];
  const postCalls: Array<[string, unknown]> = [];

  const stubClient = {
    get: vi.fn(async (path: string, params?: Record<string, unknown>) => {
      getCalls.push([path, JSON.stringify(params ?? {})]);
      return { items: [], _meta: { totalCount: 0, pageCount: 0, currentPage: 1, perPage: 10 } };
    }),
    post: vi.fn(async (path: string, body: unknown) => {
      postCalls.push([path, body]);
      return { id: 1 };
    }),
    healthCheck: vi.fn(async () => ({
      authenticated: true,
      rateLimiter: { remaining: 60, limit: 60 },
      cache: { size: 0 },
    })),
  } as unknown as ServiceFusionClient;

  return { tools: createAllTools(stubClient), getCalls, postCalls };
}

describe('tools registry', () => {
  let tools: Tool[];

  beforeEach(() => {
    tools = buildTools().tools;
  });

  it('has 23 active tools and 34 deprecated stubs (57 total)', () => {
    expect(tools.length).toBe(57);
    expect(getActiveTools(tools).length).toBe(23);
    expect(getDeprecatedTools(tools).length).toBe(34);
  });

  it('every tool name uses the servicefusion_ prefix', () => {
    for (const t of tools) {
      expect(t.name).toMatch(/^servicefusion_/);
    }
  });

  it('every active tool has a non-empty description and a category', () => {
    for (const t of getActiveTools(tools)) {
      expect(t.description.length).toBeGreaterThan(0);
      expect(t.category.length).toBeGreaterThan(0);
    }
  });

  it('protected tools (requiresApproval) are exactly the create_* tools', () => {
    const protectedNames = getProtectedTools(tools).map((t) => t.name).sort();
    expect(protectedNames).toEqual(
      [
        'servicefusion_create_calendar_task',
        'servicefusion_create_customer',
        'servicefusion_create_estimate',
        'servicefusion_create_job',
      ].sort(),
    );
  });

  it('deprecated stubs throw a descriptive error when called', async () => {
    const stub = getDeprecatedTools(tools)[0];
    expect(stub).toBeDefined();
    await expect(stub!.handler({})).rejects.toThrow(/not available on the Service Fusion v1 API/);
  });

  describe('input schema validation', () => {
    it('servicefusion_get_customer rejects non-numeric customerId', () => {
      const tool = getToolByName(tools, 'servicefusion_get_customer')!;
      const result = tool.inputSchema.safeParse({ customerId: 'abc' });
      expect(result.success).toBe(false);
    });

    it('servicefusion_get_customer accepts numeric customerId', () => {
      const tool = getToolByName(tools, 'servicefusion_get_customer')!;
      const result = tool.inputSchema.safeParse({ customerId: 42 });
      expect(result.success).toBe(true);
    });

    it('servicefusion_create_customer rejects missing customer_name', () => {
      const tool = getToolByName(tools, 'servicefusion_create_customer')!;
      const result = tool.inputSchema.safeParse({ email: 'a@b.com' });
      expect(result.success).toBe(false);
    });

    it('servicefusion_create_customer accepts a minimal valid payload', () => {
      const tool = getToolByName(tools, 'servicefusion_create_customer')!;
      const result = tool.inputSchema.safeParse({ customer_name: 'Phoenix Test LLC' });
      expect(result.success).toBe(true);
    });

    it('servicefusion_search_customers requires query', () => {
      const tool = getToolByName(tools, 'servicefusion_search_customers')!;
      expect(tool.inputSchema.safeParse({}).success).toBe(false);
      expect(tool.inputSchema.safeParse({ query: 'Phoenix' }).success).toBe(true);
    });

    it('servicefusion_list_customers per-page is bounded 1-50', () => {
      const tool = getToolByName(tools, 'servicefusion_list_customers')!;
      expect(tool.inputSchema.safeParse({ 'per-page': 0 }).success).toBe(false);
      expect(tool.inputSchema.safeParse({ 'per-page': 51 }).success).toBe(false);
      expect(tool.inputSchema.safeParse({ 'per-page': 50 }).success).toBe(true);
      expect(tool.inputSchema.safeParse({ 'per-page': 1 }).success).toBe(true);
    });
  });

  describe('handler routing (smoke check)', () => {
    it('list_customers handler calls client.get with /v1/customers', async () => {
      const built = buildTools();
      const tool = getToolByName(built.tools, 'servicefusion_list_customers')!;
      await tool.handler({ page: 1 });
      expect(built.getCalls[0]?.[0]).toBe('/v1/customers');
    });

    it('get_customer handler calls client.get with /v1/customers/:id', async () => {
      const built = buildTools();
      const tool = getToolByName(built.tools, 'servicefusion_get_customer')!;
      await tool.handler({ customerId: 7 });
      expect(built.getCalls[0]?.[0]).toBe('/v1/customers/7');
    });

    it('create_customer handler calls client.post with /v1/customers', async () => {
      const built = buildTools();
      const tool = getToolByName(built.tools, 'servicefusion_create_customer')!;
      await tool.handler({ customer_name: 'Test' });
      expect(built.postCalls[0]?.[0]).toBe('/v1/customers');
      expect(built.postCalls[0]?.[1]).toEqual({ customer_name: 'Test' });
    });

    it('list_jobs handler calls client.get with /v1/jobs', async () => {
      const built = buildTools();
      const tool = getToolByName(built.tools, 'servicefusion_list_jobs')!;
      await tool.handler({});
      expect(built.getCalls[0]?.[0]).toBe('/v1/jobs');
    });

    it('servicefusion_health combines healthCheck and /v1/me', async () => {
      const built = buildTools();
      const tool = getToolByName(built.tools, 'servicefusion_health')!;
      const result = await tool.handler({}) as { authenticated: boolean; apiBase: string; rateLimit: string };
      expect(result.authenticated).toBe(true);
      expect(result.apiBase).toBe('https://api.servicefusion.com/v1');
      expect(result.rateLimit).toBe('60 requests/minute');
    });
  });
});
