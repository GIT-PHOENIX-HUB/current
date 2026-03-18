---
name: servicefusion-operations
description: This skill should be used when the user asks to "check service fusion", "look up a customer", "create an estimate", "check the schedule", "morning briefing", "what jobs are open", "who's on call", "pull up customer", "update pricebook", "Rexel prices", "create invoice", "missed calls", "build a proposal", "draft a contract", or any Service Fusion / SF operations task. Provides complete operational control over Phoenix Electric's Service Fusion tenant.
---

# Service Fusion Operations

Operational skill for Phoenix Electric's Service Fusion tenant. 23 active tools across 8 categories (CRM, Jobs, Estimates, Invoices, Technicians, Calendar, Lookups, Meta). 34 additional deprecated stubs exist for endpoints that returned 404 during API discovery — these are kept for backward compatibility but will error if called.

## Authentication

OAuth 2.0 client_credentials via `POST https://api.servicefusion.com/oauth/access_token` with JSON body:
```json
{ "grant_type": "client_credentials", "client_id": "...", "client_secret": "..." }
```

Credentials sourced from Azure Key Vault (`PhoenixaAiVault`). Requires `az login` on the machine. The MCP server pulls:
- `SERVICEFUSION-CLIENT-ID` → `client_id`
- `SERVICEFUSION-SECRET` → `client_secret`

**No app key. No tenant ID.** SF v1 API uses flat paths, not tenant-scoped.

Token is cached with 60-second expiry buffer. Refresh tokens supported (`grant_type: "refresh_token"`).

## API Basics

- **Base URL:** `https://api.servicefusion.com/v1/{resource}`
- **Rate limit:** 60 requests/minute per token (429 on exceed, single retry)
- **Pagination:** `?page=N&per-page=N` (1-50, default 10)
- **Sorting:** `?sort=-name,description` (prefix `-` for descending)
- **Filtering:** `?filters[field]=value`
- **Field selection:** `?fields=name,email`
- **Response shape:** `{ items: [...], _meta: { totalCount, pageCount, currentPage, perPage } }`
- **Methods:** GET and POST only. No PUT, PATCH, or DELETE in the API.

## Tool Conventions

- All tools prefixed `servicefusion_*` (e.g. `servicefusion_list_customers`)
- **Read operations:** No approval needed — call freely
- **Write operations:** Require `SF_APPROVAL_TOKEN` env var or `ALLOW_SF_WRITES=true`
- Always confirm with user before write operations

## Active Tool Categories (23 Tools)

| Category | Count | Tools |
|----------|-------|-------|
| CRM | 5 | `servicefusion_list_customers`, `servicefusion_get_customer`, `servicefusion_get_customer_equipment`, `servicefusion_create_customer`, `servicefusion_search_customers` |
| Jobs | 5 | `servicefusion_list_jobs`, `servicefusion_get_job`, `servicefusion_create_job`, `servicefusion_list_job_statuses`, `servicefusion_list_job_categories` |
| Estimates | 3 | `servicefusion_list_estimates`, `servicefusion_get_estimate`, `servicefusion_create_estimate` |
| Invoices | 2 | `servicefusion_list_invoices`, `servicefusion_get_invoice` |
| Technicians | 2 | `servicefusion_list_technicians`, `servicefusion_get_technician` |
| Calendar | 2 | `servicefusion_list_calendar_tasks`, `servicefusion_create_calendar_task` |
| Lookups | 2 | `servicefusion_list_payment_types`, `servicefusion_list_sources` |
| Meta | 2 | `servicefusion_me`, `servicefusion_health` |

## Deprecated Tool Categories (34 Stubs — all return 404 errors)

These endpoints were confirmed unavailable during API discovery (2026-03-10). Calling them returns an error explaining the limitation. Use the SF web UI for these operations.

| Category | Tools |
|----------|-------|
| Dispatch | `get_capacity`, `list_technician_shifts`, `get_on_call_technician`, `list_zones` |
| Pricebook | `list_services`, `list_materials`, `create_material`, `update_material`, `list_equipment`, `list_categories`, `compare_prices` |
| Telecom | `list_calls`, `get_call`, `get_missed_calls`, `get_calls_with_recordings` |
| Memberships | `list_membership_types`, `list_customer_memberships`, `list_recurring_services` |
| Marketing | `list_campaigns`, `list_campaign_categories`, `list_campaign_costs` |
| Settings | `list_employees`, `list_business_units`, `list_tag_types` |
| CRM (sub) | `list_locations`, `list_bookings`, `create_booking` |
| Jobs (sub) | `cancel_job`, `list_appointments`, `reschedule_appointment`, `list_job_types`, `get_daily_job_summary` |
| Accounting (sub) | `list_payments`, `sell_estimate` |

## Common Workflows

### Morning Briefing (Limited)
1. `servicefusion_list_jobs` — today's jobs (filter by date if possible)
2. `servicefusion_list_estimates` with `filters[status]=Open` — open estimates
3. `servicefusion_list_technicians` — who's available
4. Format as executive summary table
5. **Note:** Missed calls, dispatch capacity, and on-call tech are NOT available via API. Check SF web UI.

### Customer Lookup
1. `servicefusion_search_customers` with customer name
2. `servicefusion_get_customer` for full details
3. `servicefusion_get_customer_equipment` for equipment history
4. `servicefusion_list_jobs` with `filters[customer_id]` for job history

### Estimate Creation
1. `servicefusion_search_customers` to find customer
2. `servicefusion_list_jobs` for customer's active jobs (or `servicefusion_create_job`)
3. Build line items manually (pricebook browsing is NOT available via API)
4. `servicefusion_create_estimate` with assembled data

### Contract/Proposal Generation
1. `servicefusion_get_customer` for customer details
2. `servicefusion_get_job` for scope of work
3. Compose document with Phoenix Electric branding, terms, scope, pricing
4. Write to file as markdown

## Additional Resources

### Reference Files
- **`references/api-reference.md`** — All 23 active tools with input schemas
- **`references/workflows.md`** — Detailed step-by-step operational workflows
- **`references/financials.md`** — Invoice lifecycle, payment tracking, estimate pipeline
- **`references/rexel-integration.md`** — Rexel vendor pricing (browser-only currently)
- **`references/browser-fallback.md`** — Chrome automation for API-limited operations
- **`references/future-gateway.md`** — Architecture for Studio/Gateway features

## Important Notes

- **Phoenix Electric is an ELECTRICAL company, NOT HVAC**
- SF v1 API uses flat paths: `/v1/customers`, `/v1/jobs` — NO tenant ID in URL
- Auth: `api.servicefusion.com/oauth/access_token` (NOT auth.servicefusion.com)
- Token format: `Authorization: Bearer {token}` header
- Rate limit: 60 req/min with single 429 retry
- Many operations available in the SF web UI are NOT available via API (dispatch, pricebook, telecom, memberships, marketing, settings). Use `references/browser-fallback.md` for those.
