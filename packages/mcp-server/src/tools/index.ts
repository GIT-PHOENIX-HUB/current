import { z } from 'zod';
import type { ServiceFusionClient } from '../client.js';
import type { SFPaginatedResponse } from '@phoenix/shared';

// =============================================================================
// Tool Interface
// =============================================================================

export interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  requiresApproval: boolean;
  category: string;
  deprecated?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (params: any) => Promise<unknown>;
}

// =============================================================================
// Common Schemas (SF v1 query params)
// =============================================================================

/** Standard pagination + sort + filter params supported by all SF v1 list endpoints. */
const listParams = {
  page: z.number().min(1).optional().describe('Page number (1-based, default 1)'),
  'per-page': z.number().min(1).max(50).optional().describe('Records per page (1-50, default 10)'),
  sort: z.string().optional().describe('Sort fields, prefix - for descending (e.g. "-name,description")'),
  fields: z.string().optional().describe('Comma-separated fields to return (e.g. "name,email")'),
};

// =============================================================================
// CRM TOOLS — /v1/customers
// =============================================================================

function createCrmTools(client: ServiceFusionClient): Tool[] {
  return [
    {
      name: 'servicefusion_list_customers',
      description: 'List customers with optional filters, sorting, and field selection',
      inputSchema: z.object({
        ...listParams,
        'filters[customer_name]': z.string().optional().describe('Filter by customer name'),
        'filters[email]': z.string().optional().describe('Filter by email'),
        'filters[phone]': z.string().optional().describe('Filter by phone'),
      }),
      requiresApproval: false,
      category: 'CRM',
      handler: async (params) => client.get<SFPaginatedResponse<unknown>>('/v1/customers', params),
    },
    {
      name: 'servicefusion_get_customer',
      description: 'Get a specific customer by ID',
      inputSchema: z.object({ customerId: z.number() }),
      requiresApproval: false,
      category: 'CRM',
      handler: async (params: { customerId: number }) =>
        client.get(`/v1/customers/${params.customerId}`),
    },
    {
      name: 'servicefusion_get_customer_equipment',
      description: 'Get equipment list for a specific customer',
      inputSchema: z.object({
        customerId: z.number(),
        ...listParams,
      }),
      requiresApproval: false,
      category: 'CRM',
      handler: async (params: { customerId: number; [key: string]: unknown }) => {
        const { customerId, ...rest } = params;
        return client.get(`/v1/customers/${customerId}/equipment`, rest);
      },
    },
    {
      name: 'servicefusion_create_customer',
      description: 'Create a new customer (requires approval)',
      inputSchema: z.object({
        customer_name: z.string().describe('Customer name (required)'),
        email: z.string().optional(),
        phone: z.string().optional(),
        address_line_1: z.string().optional(),
        address_line_2: z.string().optional(),
        city: z.string().optional(),
        state_prov: z.string().optional(),
        postal_code: z.string().optional(),
      }),
      requiresApproval: true,
      category: 'CRM',
      handler: async (params) => client.post('/v1/customers', params),
    },
    {
      name: 'servicefusion_search_customers',
      description: 'Search customers by name (convenience wrapper around list with filters)',
      inputSchema: z.object({
        query: z.string().describe('Customer name to search for'),
        limit: z.number().min(1).max(50).optional().default(10),
      }),
      requiresApproval: false,
      category: 'CRM',
      handler: async (params: { query: string; limit?: number }) =>
        client.get<SFPaginatedResponse<unknown>>('/v1/customers', {
          'filters[customer_name]': params.query,
          'per-page': params.limit,
        }),
    },
  ];
}

// =============================================================================
// JOBS TOOLS — /v1/jobs
// =============================================================================

function createJobsTools(client: ServiceFusionClient): Tool[] {
  return [
    {
      name: 'servicefusion_list_jobs',
      description: 'List jobs with optional filters and sorting',
      inputSchema: z.object({
        ...listParams,
        'filters[status]': z.string().optional().describe('Filter by job status'),
        'filters[customer_id]': z.number().optional().describe('Filter by customer ID'),
        'filters[tech_id]': z.number().optional().describe('Filter by technician ID'),
      }),
      requiresApproval: false,
      category: 'Jobs',
      handler: async (params) => client.get<SFPaginatedResponse<unknown>>('/v1/jobs', params),
    },
    {
      name: 'servicefusion_get_job',
      description: 'Get detailed information about a specific job',
      inputSchema: z.object({ jobId: z.number() }),
      requiresApproval: false,
      category: 'Jobs',
      handler: async (params: { jobId: number }) =>
        client.get(`/v1/jobs/${params.jobId}`),
    },
    {
      name: 'servicefusion_create_job',
      description: 'Create a new job (requires approval)',
      inputSchema: z.object({
        customer_id: z.number().describe('Customer ID (required)'),
        description: z.string().optional(),
        status: z.string().optional(),
      }),
      requiresApproval: true,
      category: 'Jobs',
      handler: async (params) => client.post('/v1/jobs', params),
    },
    {
      name: 'servicefusion_list_job_statuses',
      description: 'List available job statuses (lookup table)',
      inputSchema: z.object({ ...listParams }),
      requiresApproval: false,
      category: 'Jobs',
      handler: async (params) => client.get<SFPaginatedResponse<unknown>>('/v1/job-statuses', params),
    },
    {
      name: 'servicefusion_list_job_categories',
      description: 'List job categories (lookup table — may be empty)',
      inputSchema: z.object({ ...listParams }),
      requiresApproval: false,
      category: 'Jobs',
      handler: async (params) => client.get<SFPaginatedResponse<unknown>>('/v1/job-categories', params),
    },
  ];
}

// =============================================================================
// ESTIMATES TOOLS — /v1/estimates
// =============================================================================

function createEstimatesTools(client: ServiceFusionClient): Tool[] {
  return [
    {
      name: 'servicefusion_list_estimates',
      description: 'List estimates/quotes with optional filters',
      inputSchema: z.object({
        ...listParams,
        'filters[status]': z.string().optional().describe('Filter by estimate status'),
        'filters[customer_id]': z.number().optional().describe('Filter by customer ID'),
      }),
      requiresApproval: false,
      category: 'Estimates',
      handler: async (params) => client.get<SFPaginatedResponse<unknown>>('/v1/estimates', params),
    },
    {
      name: 'servicefusion_get_estimate',
      description: 'Get detailed information about a specific estimate',
      inputSchema: z.object({ estimateId: z.number() }),
      requiresApproval: false,
      category: 'Estimates',
      handler: async (params: { estimateId: number }) =>
        client.get(`/v1/estimates/${params.estimateId}`),
    },
    {
      name: 'servicefusion_create_estimate',
      description: 'Create a new estimate (requires approval)',
      inputSchema: z.object({
        customer_id: z.number().describe('Customer ID'),
        description: z.string().optional(),
      }),
      requiresApproval: true,
      category: 'Estimates',
      handler: async (params) => client.post('/v1/estimates', params),
    },
  ];
}

// =============================================================================
// INVOICES TOOLS — /v1/invoices (READ-ONLY)
// =============================================================================

function createInvoicesTools(client: ServiceFusionClient): Tool[] {
  return [
    {
      name: 'servicefusion_list_invoices',
      description: 'List invoices (read-only — no create/update via API)',
      inputSchema: z.object({
        ...listParams,
        'filters[status]': z.string().optional().describe('Filter by invoice status'),
        'filters[customer_id]': z.number().optional().describe('Filter by customer ID'),
      }),
      requiresApproval: false,
      category: 'Invoices',
      handler: async (params) => client.get<SFPaginatedResponse<unknown>>('/v1/invoices', params),
    },
    {
      name: 'servicefusion_get_invoice',
      description: 'Get detailed information about a specific invoice',
      inputSchema: z.object({ invoiceId: z.number() }),
      requiresApproval: false,
      category: 'Invoices',
      handler: async (params: { invoiceId: number }) =>
        client.get(`/v1/invoices/${params.invoiceId}`),
    },
  ];
}

// =============================================================================
// TECHNICIANS TOOLS — /v1/techs (READ-ONLY)
// =============================================================================

function createTechTools(client: ServiceFusionClient): Tool[] {
  return [
    {
      name: 'servicefusion_list_technicians',
      description: 'List all technicians (read-only)',
      inputSchema: z.object({ ...listParams }),
      requiresApproval: false,
      category: 'Technicians',
      handler: async (params) => client.get<SFPaginatedResponse<unknown>>('/v1/techs', params),
    },
    {
      name: 'servicefusion_get_technician',
      description: 'Get technician details by ID',
      inputSchema: z.object({ techId: z.number() }),
      requiresApproval: false,
      category: 'Technicians',
      handler: async (params: { techId: number }) =>
        client.get(`/v1/techs/${params.techId}`),
    },
  ];
}

// =============================================================================
// CALENDAR TOOLS — /v1/calendar-tasks
// =============================================================================

function createCalendarTools(client: ServiceFusionClient): Tool[] {
  return [
    {
      name: 'servicefusion_list_calendar_tasks',
      description: 'List calendar tasks with optional filters',
      inputSchema: z.object({ ...listParams }),
      requiresApproval: false,
      category: 'Calendar',
      handler: async (params) => client.get<SFPaginatedResponse<unknown>>('/v1/calendar-tasks', params),
    },
    {
      name: 'servicefusion_create_calendar_task',
      description: 'Create a new calendar task (requires approval)',
      inputSchema: z.object({
        title: z.string().describe('Task title'),
        description: z.string().optional(),
        start_date: z.string().optional().describe('Start date (ISO format)'),
        end_date: z.string().optional().describe('End date (ISO format)'),
      }),
      requiresApproval: true,
      category: 'Calendar',
      handler: async (params) => client.post('/v1/calendar-tasks', params),
    },
  ];
}

// =============================================================================
// LOOKUP TOOLS — /v1/payment-types, /v1/sources
// =============================================================================

function createLookupTools(client: ServiceFusionClient): Tool[] {
  return [
    {
      name: 'servicefusion_list_payment_types',
      description: 'List payment types (lookup table)',
      inputSchema: z.object({ ...listParams }),
      requiresApproval: false,
      category: 'Lookups',
      handler: async (params) => client.get<SFPaginatedResponse<unknown>>('/v1/payment-types', params),
    },
    {
      name: 'servicefusion_list_sources',
      description: 'List lead/referral sources (lookup table)',
      inputSchema: z.object({ ...listParams }),
      requiresApproval: false,
      category: 'Lookups',
      handler: async (params) => client.get<SFPaginatedResponse<unknown>>('/v1/sources', params),
    },
  ];
}

// =============================================================================
// META TOOLS — /v1/me, health
// =============================================================================

function createMetaTools(client: ServiceFusionClient): Tool[] {
  return [
    {
      name: 'servicefusion_me',
      description: 'Get authenticated user info (id, name, email)',
      inputSchema: z.object({}),
      requiresApproval: false,
      category: 'Meta',
      handler: async () => client.get('/v1/me'),
    },
    {
      name: 'servicefusion_health',
      description: 'Check Service Fusion connection health: auth status, rate limit state, cache stats',
      inputSchema: z.object({}),
      requiresApproval: false,
      category: 'Meta',
      handler: async () => {
        const health = await client.healthCheck();
        let meResult: unknown = null;

        if (health.authenticated) {
          try {
            meResult = await client.get('/v1/me');
          } catch (err) {
            meResult = { error: (err as Error).message };
          }
        }

        return {
          ...health,
          me: meResult,
          apiBase: 'https://api.servicefusion.com/v1',
          rateLimit: '60 requests/minute',
        };
      },
    },
  ];
}

// =============================================================================
// DEPRECATED STUBS — Endpoints confirmed 404 on SF v1
// =============================================================================

function deprecatedStub(name: string, description: string, category: string): Tool {
  return {
    name,
    description: `[DEPRECATED] ${description} — not available on Service Fusion v1 API`,
    inputSchema: z.object({}),
    requiresApproval: false,
    category,
    deprecated: true,
    handler: async () => {
      throw new Error(
        `${name} is not available on the Service Fusion v1 API. ` +
        `This endpoint returned 404 during API discovery (2026-03-10). ` +
        `Use the Service Fusion web UI for this operation.`
      );
    },
  };
}

function createDeprecatedStubs(): Tool[] {
  return [
    // Dispatch — confirmed 404
    deprecatedStub('servicefusion_get_capacity', 'Get dispatch capacity', 'Dispatch'),
    deprecatedStub('servicefusion_list_technician_shifts', 'List technician shifts', 'Dispatch'),
    deprecatedStub('servicefusion_get_on_call_technician', 'Find on-call technician', 'Dispatch'),
    deprecatedStub('servicefusion_list_zones', 'List dispatch zones', 'Dispatch'),

    // Pricebook — confirmed 404
    deprecatedStub('servicefusion_list_services', 'List pricebook services', 'Pricebook'),
    deprecatedStub('servicefusion_list_materials', 'List pricebook materials', 'Pricebook'),
    deprecatedStub('servicefusion_create_material', 'Create a pricebook material', 'Pricebook'),
    deprecatedStub('servicefusion_update_material', 'Update a pricebook material', 'Pricebook'),
    deprecatedStub('servicefusion_list_equipment', 'List pricebook equipment', 'Pricebook'),
    deprecatedStub('servicefusion_list_categories', 'List pricebook categories', 'Pricebook'),
    deprecatedStub('servicefusion_compare_prices', 'Compare vendor prices', 'Pricebook'),

    // Telecom — confirmed 404
    deprecatedStub('servicefusion_list_calls', 'List phone calls', 'Telecom'),
    deprecatedStub('servicefusion_get_call', 'Get call details', 'Telecom'),
    deprecatedStub('servicefusion_get_missed_calls', 'Get missed calls', 'Telecom'),
    deprecatedStub('servicefusion_get_calls_with_recordings', 'Get calls with recordings', 'Telecom'),

    // Memberships — confirmed 404
    deprecatedStub('servicefusion_list_membership_types', 'List membership types', 'Memberships'),
    deprecatedStub('servicefusion_list_customer_memberships', 'List customer memberships', 'Memberships'),
    deprecatedStub('servicefusion_list_recurring_services', 'List recurring services', 'Memberships'),

    // Marketing — confirmed 404
    deprecatedStub('servicefusion_list_campaigns', 'List campaigns', 'Marketing'),
    deprecatedStub('servicefusion_list_campaign_categories', 'List campaign categories', 'Marketing'),
    deprecatedStub('servicefusion_list_campaign_costs', 'List campaign costs', 'Marketing'),

    // Settings — confirmed 404
    deprecatedStub('servicefusion_list_employees', 'List employees', 'Settings'),
    deprecatedStub('servicefusion_list_business_units', 'List business units', 'Settings'),
    deprecatedStub('servicefusion_list_tag_types', 'List tag types', 'Settings'),

    // CRM sub-resources — confirmed 404
    deprecatedStub('servicefusion_list_locations', 'List service locations', 'CRM'),
    deprecatedStub('servicefusion_list_bookings', 'List booking requests', 'CRM'),
    deprecatedStub('servicefusion_create_booking', 'Create a booking', 'CRM'),

    // Jobs sub-resources — confirmed 404
    deprecatedStub('servicefusion_cancel_job', 'Cancel a job', 'Jobs'),
    deprecatedStub('servicefusion_list_appointments', 'List appointments', 'Jobs'),
    deprecatedStub('servicefusion_reschedule_appointment', 'Reschedule appointment', 'Jobs'),
    deprecatedStub('servicefusion_list_job_types', 'List job types', 'Jobs'),
    deprecatedStub('servicefusion_get_daily_job_summary', 'Daily job summary', 'Jobs'),

    // Accounting sub-resources — confirmed 404
    deprecatedStub('servicefusion_list_payments', 'List payments', 'Accounting'),
    deprecatedStub('servicefusion_sell_estimate', 'Mark estimate as sold', 'Accounting'),
  ];
}

// =============================================================================
// Export All Tools
// =============================================================================

export function createAllTools(client: ServiceFusionClient): Tool[] {
  return [
    ...createCrmTools(client),
    ...createJobsTools(client),
    ...createEstimatesTools(client),
    ...createInvoicesTools(client),
    ...createTechTools(client),
    ...createCalendarTools(client),
    ...createLookupTools(client),
    ...createMetaTools(client),
    ...createDeprecatedStubs(),
  ];
}

export function getToolByName(tools: Tool[], name: string): Tool | undefined {
  return tools.find(t => t.name === name);
}

export function getToolsByCategory(tools: Tool[], category: string): Tool[] {
  return tools.filter(t => t.category === category);
}

export function getActiveTools(tools: Tool[]): Tool[] {
  return tools.filter(t => !t.deprecated);
}

export function getDeprecatedTools(tools: Tool[]): Tool[] {
  return tools.filter(t => t.deprecated === true);
}

export function getProtectedTools(tools: Tool[]): Tool[] {
  return tools.filter(t => t.requiresApproval);
}
