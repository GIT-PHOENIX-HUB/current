# Service Fusion v1 API Reference — 23 Active Tools

> Source of truth: `~/GitHub/phoenix-ai-core-staging/packages/servicefusion-mcp/src/tools/index.ts`
> MCP server prefix: `servicefusion_*`
> API base: `https://api.servicefusion.com/v1/`
> Auth: OAuth 2.0 Client Credentials (auto-managed)
> Rate limit: 60 req/min
> Methods: GET + POST only (no PUT/PATCH/DELETE)

### Common Parameters (all list endpoints)

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (1-based, default 1) |
| `per-page` | number | Records per page (1-50, default 10) |
| `sort` | string | Sort fields, prefix `-` for descending (e.g. `-name,description`) |
| `fields` | string | Comma-separated fields to return |

### Response Shape (all list endpoints)

```json
{ "items": [...], "_meta": { "totalCount": 200, "pageCount": 20, "currentPage": 1, "perPage": 10 } }
```

---

## CRM Tools (5)

### `servicefusion_list_customers`
List customers with optional filters.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filters[customer_name]` | string | No | Filter by customer name |
| `filters[email]` | string | No | Filter by email |
| `filters[phone]` | string | No | Filter by phone |
| + common params | | | |

**Approval:** Read — **API path:** `GET /v1/customers`

---

### `servicefusion_get_customer`
Get a specific customer by ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customerId` | number | Yes | Customer ID |

**Approval:** Read — **API path:** `GET /v1/customers/{id}`

---

### `servicefusion_get_customer_equipment`
Get equipment list for a specific customer.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customerId` | number | Yes | Customer ID |
| + common params | | | |

**Approval:** Read — **API path:** `GET /v1/customers/{id}/equipment`

---

### `servicefusion_create_customer`
Create a new customer. **Requires approval.**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customer_name` | string | Yes | Customer name |
| `email` | string | No | Email address |
| `phone` | string | No | Phone number |
| `address_line_1` | string | No | Street address |
| `address_line_2` | string | No | Suite/unit |
| `city` | string | No | City |
| `state_prov` | string | No | State/province |
| `postal_code` | string | No | ZIP/postal code |

**Approval:** Write — **API path:** `POST /v1/customers`

---

### `servicefusion_search_customers`
Search customers by name (convenience wrapper).

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | — | Customer name to search |
| `limit` | number | No | 10 | Max results (1-50) |

**Approval:** Read — **API path:** `GET /v1/customers?filters[customer_name]=...`

---

## Jobs Tools (5)

### `servicefusion_list_jobs`
List jobs with optional filters.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filters[status]` | string | No | Filter by status |
| `filters[customer_id]` | number | No | Filter by customer |
| `filters[tech_id]` | number | No | Filter by technician |
| + common params | | | |

**Approval:** Read — **API path:** `GET /v1/jobs`

---

### `servicefusion_get_job`
Get job details by ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `jobId` | number | Yes | Job ID |

**Approval:** Read — **API path:** `GET /v1/jobs/{id}`

---

### `servicefusion_create_job`
Create a new job. **Requires approval.**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customer_id` | number | Yes | Customer ID |
| `description` | string | No | Job description |
| `status` | string | No | Initial status |

**Approval:** Write — **API path:** `POST /v1/jobs`

---

### `servicefusion_list_job_statuses`
List available job statuses (lookup table).

| Parameter | Type | Description |
|-----------|------|-------------|
| + common params | | |

**Approval:** Read — **API path:** `GET /v1/job-statuses`

---

### `servicefusion_list_job_categories`
List job categories (lookup table).

| Parameter | Type | Description |
|-----------|------|-------------|
| + common params | | |

**Approval:** Read — **API path:** `GET /v1/job-categories`

---

## Estimates Tools (3)

### `servicefusion_list_estimates`
List estimates/quotes with optional filters.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filters[status]` | string | No | Filter by status |
| `filters[customer_id]` | number | No | Filter by customer |
| + common params | | | |

**Approval:** Read — **API path:** `GET /v1/estimates`

---

### `servicefusion_get_estimate`
Get estimate details by ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `estimateId` | number | Yes | Estimate ID |

**Approval:** Read — **API path:** `GET /v1/estimates/{id}`

---

### `servicefusion_create_estimate`
Create a new estimate. **Requires approval.**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customer_id` | number | Yes | Customer ID |
| `description` | string | No | Estimate description |

**Approval:** Write — **API path:** `POST /v1/estimates`

---

## Invoices Tools (2) — Read-Only

### `servicefusion_list_invoices`
List invoices (no create/update via API).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filters[status]` | string | No | Filter by status |
| `filters[customer_id]` | number | No | Filter by customer |
| + common params | | | |

**Approval:** Read — **API path:** `GET /v1/invoices`

---

### `servicefusion_get_invoice`
Get invoice details by ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `invoiceId` | number | Yes | Invoice ID |

**Approval:** Read — **API path:** `GET /v1/invoices/{id}`

---

## Technicians Tools (2) — Read-Only

### `servicefusion_list_technicians`
List all technicians.

| Parameter | Type | Description |
|-----------|------|-------------|
| + common params | | |

**Approval:** Read — **API path:** `GET /v1/techs`

---

### `servicefusion_get_technician`
Get technician details by ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `techId` | number | Yes | Technician ID |

**Approval:** Read — **API path:** `GET /v1/techs/{id}`

---

## Calendar Tools (2)

### `servicefusion_list_calendar_tasks`
List calendar tasks.

| Parameter | Type | Description |
|-----------|------|-------------|
| + common params | | |

**Approval:** Read — **API path:** `GET /v1/calendar-tasks`

---

### `servicefusion_create_calendar_task`
Create a new calendar task. **Requires approval.**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Task title |
| `description` | string | No | Task description |
| `start_date` | string | No | Start date (ISO format) |
| `end_date` | string | No | End date (ISO format) |

**Approval:** Write — **API path:** `POST /v1/calendar-tasks`

---

## Lookup Tools (2)

### `servicefusion_list_payment_types`
List payment types (lookup table, cached 5 minutes).

**Approval:** Read — **API path:** `GET /v1/payment-types`

---

### `servicefusion_list_sources`
List lead/referral sources (lookup table, cached 5 minutes).

**Approval:** Read — **API path:** `GET /v1/sources`

---

## Meta Tools (2)

### `servicefusion_me`
Get authenticated user info (id, name, email). Cached 10 minutes.

**Approval:** Read — **API path:** `GET /v1/me`

---

### `servicefusion_health`
Check SF connection health: auth status, rate limit state, cache stats, user info.

**Approval:** Read — **Calls:** `/v1/me` + internal health check

---

## Deprecated Stubs (35)

These tools exist for backwards compatibility but throw errors directing users to the SF dashboard. They were confirmed 404 against the SF v1 API on 2026-03-10.

| Category | Tools |
|----------|-------|
| Dispatch (4) | `get_capacity`, `list_technician_shifts`, `get_on_call_technician`, `list_zones` |
| Pricebook (7) | `list_services`, `list_materials`, `create_material`, `update_material`, `list_equipment`, `list_categories`, `compare_prices` |
| Telecom (4) | `list_calls`, `get_call`, `get_missed_calls`, `get_calls_with_recordings` |
| Memberships (3) | `list_membership_types`, `list_customer_memberships`, `list_recurring_services` |
| Marketing (3) | `list_campaigns`, `list_campaign_categories`, `list_campaign_costs` |
| Settings (3) | `list_employees`, `list_business_units`, `list_tag_types` |
| CRM sub (3) | `list_locations`, `list_bookings`, `create_booking` |
| Jobs sub (5) | `cancel_job`, `list_appointments`, `reschedule_appointment`, `list_job_types`, `get_daily_job_summary` |
| Accounting (2) | `list_payments`, `sell_estimate` |

All prefixed with `servicefusion_`.
