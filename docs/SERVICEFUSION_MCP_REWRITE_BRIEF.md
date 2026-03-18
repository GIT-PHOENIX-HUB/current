# ServiceFusion MCP Rewrite Brief
*For Codespace — Compiled 2026-03-05 by Echo Pro*

---

## THE PROBLEM

The existing `@phoenix/servicefusion-mcp` package at `phoenix-ai-core-staging/packages/servicefusion-mcp/` was built against **ServiceTitan's API structure**, not ServiceFusion's. Every single tool (37 tools, 74 with aliases) returns 404. The auth URLs are wrong. PUT/DELETE methods are used but ServiceFusion has NO PUT/PATCH/DELETE.

---

## CREDENTIALS (Azure Key Vault)

| What | Key Vault Secret Name | Notes |
|------|----------------------|-------|
| Client ID | `Service-Fusion-ClientID` | 18 chars — phoenixaaivault |
| Client Secret | `Service-Fusion-Clients-secret` | 32 chars — phoenixaaivault |
| Tenant ID | `4324869397` | Hardcoded in .env.example |

**Key Vault:** `phoenixaaivault` — requires Azure CLI login as `shane@phoenixelectric.life` against tenant `e7d8daef-fd5b-4e0b-bf8f-32f090c7c4d5`.

**CRITICAL:** The `.env.example` references WRONG names (`ServiceFusion-ClientId`, `ServiceFusion-ClientSecret-2025-11`). The actual vault secrets are `Service-Fusion-ClientID` and `Service-Fusion-Clients-secret`. Fix the `getServiceFusionSecrets()` function in `@phoenix/shared`.

---

## CORRECT API REFERENCE

### Base Info
- **Base URL:** `https://api.servicefusion.com/v1/{resource}`
- **Protocol:** HTTPS only (HTTP → 301)
- **Auth:** OAuth 2.0 Client Credentials
- **Token endpoint:** `POST https://api.servicefusion.com/oauth/access_token`
- **Content-Type:** `application/json`
- **Token lifetime:** 3600 seconds (1 hour), refresh token provided
- **Rate limit:** 120 req/min (docs say 60, live testing shows 120)
- **Operations:** GET (list/detail) and POST (create) ONLY. **NO PUT, PATCH, or DELETE.**

### Auth Flow (Client Credentials)
```bash
curl -s -X POST "https://api.servicefusion.com/oauth/access_token" \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"client_credentials","client_id":"YOUR_CLIENT_ID","client_secret":"YOUR_CLIENT_SECRET"}'
```

Response:
```json
{
  "access_token": "eyJz93a...k4laUWw",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "afGb76r...t8erDVe"
}
```

Token refresh:
```json
POST https://api.servicefusion.com/oauth/access_token
{"grant_type":"refresh_token","refresh_token":"YOUR_REFRESH_TOKEN"}
```

Send token as: `Authorization: Bearer {token}` header.

### ALL Working Endpoints (v1 — verified live against Phoenix Electric tenant)

| Endpoint | Method | Records | Notes |
|----------|--------|---------|-------|
| `/v1/me` | GET | N/A | Returns authorized user (Shane, id=980286724) |
| `/v1/customers` | GET, POST | 1,312 | Full customer list, paginated |
| `/v1/customers/{id}` | GET | N/A | 29 fields, expandable contacts/locations/custom_fields |
| `/v1/customers/{id}/equipment` | GET | varies | Equipment nested under customer |
| `/v1/customers/{id}/equipment/{eid}` | GET | N/A | Single equipment detail |
| `/v1/jobs` | GET, POST | 2,409 | Full job history, 49+ fields, 20 expandable arrays |
| `/v1/jobs/{id}` | GET | N/A | Massive detail — products, services, labor, payments, invoices, visits |
| `/v1/estimates` | GET, POST | 1,679 | Similar to jobs, has opportunity_rating |
| `/v1/estimates/{id}` | GET | N/A | Full estimate detail |
| `/v1/invoices` | GET | 1,814 | **READ-ONLY — no POST** |
| `/v1/invoices/{id}` | GET | N/A | Invoice detail |
| `/v1/techs` | GET | 94 | All technicians (active + inactive) |
| `/v1/techs/{id}` | GET | N/A | Tech detail |
| `/v1/calendar-tasks` | GET | 1,777 | Calendar/task entries |
| `/v1/calendar-tasks/{id}` | GET | N/A | Task detail |
| `/v1/job-statuses` | GET | 21 | Lookup table — status codes + categories |
| `/v1/job-statuses/{id}` | GET | N/A | Single status |
| `/v1/job-categories` | GET | 0 | Empty (categories embedded in jobs, not standalone) |
| `/v1/payment-types` | GET | 10 | BILL, CASH, CCOFF, CHECK, DON, FIN, OCC, OTH, TRD, ACH |
| `/v1/sources` | GET | 10 | Google, Website, Nextdoor, Generac, etc. |
| `/v1/sources/{id}` | GET | N/A | Single source |

### Endpoints That DO NOT EXIST (remove from MCP)

These are ServiceTitan API paths that were incorrectly used:

| Fake Path | Why It's Wrong |
|-----------|---------------|
| `/crm/v2/tenant/{id}/customers` | ServiceTitan pattern. Use `/v1/customers` |
| `/crm/v2/tenant/{id}/locations` | No locations endpoint exists |
| `/crm/v2/tenant/{id}/bookings` | No bookings endpoint exists |
| `/jpm/v2/tenant/{id}/jobs` | ServiceTitan pattern. Use `/v1/jobs` |
| `/jpm/v2/tenant/{id}/appointments` | No appointments endpoint exists |
| `/jpm/v2/tenant/{id}/job-types` | No job-types endpoint exists |
| `/dispatch/v2/tenant/{id}/capacity` | No capacity/dispatch endpoint exists |
| `/dispatch/v2/tenant/{id}/technician-shifts` | No shifts endpoint exists |
| `/dispatch/v2/tenant/{id}/zones` | No zones endpoint exists |
| `/settings/v2/tenant/{id}/technicians` | ServiceTitan pattern. Use `/v1/techs` |
| `/settings/v2/tenant/{id}/employees` | No employees endpoint (only techs) |
| `/settings/v2/tenant/{id}/business-units` | No business-units endpoint |
| `/pricebook/v2/tenant/{id}/services` | No pricebook API at all |
| `/pricebook/v2/tenant/{id}/materials` | No pricebook API at all |
| `/pricebook/v2/tenant/{id}/equipment` | No pricebook API at all |
| `/pricebook/v2/tenant/{id}/categories` | No pricebook API at all |
| `/accounting/v2/tenant/{id}/invoices` | ServiceTitan pattern. Use `/v1/invoices` |
| `/accounting/v2/tenant/{id}/payments` | No payments endpoint |
| `/sales/v2/tenant/{id}/estimates` | ServiceTitan pattern. Use `/v1/estimates` |
| `/telecom/v2/tenant/{id}/calls` | No telecom/calls API at all |
| `/memberships/v2/tenant/{id}/*` | No memberships API at all |
| `/marketing/v2/tenant/{id}/*` | No marketing API at all |

### Operations That Are IMPOSSIBLE via API

- **No PUT/PATCH** — Cannot update existing records
- **No DELETE** — Cannot delete records
- `cancel_job` — IMPOSSIBLE (no PUT)
- `reschedule_appointment` — IMPOSSIBLE (no appointments endpoint, no PUT)
- `update_material` — IMPOSSIBLE (no pricebook endpoint, no PUT)
- `sell_estimate` — IMPOSSIBLE (no PUT)
- Job status changes — IMPOSSIBLE via API (must use SF UI or Zapier)

### Query Parameters (ALL GET list endpoints)

| Param | Example | Description |
|-------|---------|-------------|
| `page` | `?page=2` | Current page (1-based) |
| `per-page` | `?per-page=20` | Records per page |
| `sort` | `?sort=-name,description` | Sort fields, `-` prefix = descending |
| `filters` | `?filters[name]=John` | Field-level filtering |
| `fields` | `?fields=name,description` | Select specific fields |

### Pagination Response

`_meta` object in body + headers:

| Meta | Header | Description |
|------|--------|-------------|
| totalCount | X-Pagination-Total-Count | Total records |
| pageCount | X-Pagination-Page-Count | Total pages |
| currentPage | X-Pagination-Current-Page | Current page |
| perPage | X-Pagination-Per-Page | Per page |

### `_expandable` Arrays

GET responses include `_expandable` listing nested objects that can be expanded. Example for customers: `["contacts","contacts.phones","contacts.emails","locations","custom_fields"]`

Job expandables (20 total): `agents, custom_fields, pictures, documents, equipment, equipment.custom_fields, techs_assigned, tasks, notes, products, services, other_charges, labor_charges, expenses, payments, invoices, signatures, printable_work_order, visits, visits.techs_assigned`

### Rate Limiting

- 120 req/min per token (live — docs say 60)
- Headers: `X-Rate-Limit-Limit`, `X-Rate-Limit-Remaining`, `X-Rate-Limit-Reset`
- 429 on exceeded

### Error Responses

Standard errors (400, 404, 405, 415, 429, 500):
```json
{"code": 400, "name": "Bad Request.", "message": "Your request is invalid."}
```

422 Validation (DIFFERENT FORMAT — array):
```json
[{"field": "name", "message": "Name is too long (maximum is 45 characters)."}]
```

404 returns **HTML**, not JSON. Handle this edge case.

Auth errors:
```json
{"error": "invalid_client", "error_description": "Invalid client's id or secret."}
```

### Data Format Gotchas

- **Dates:** ISO 8601 `"2018-08-07T18:31:28+00:00"`
- **Time fields:** `time_frame_promised_start/end` = strings like `"14:10"` (HH:MM), NOT datetimes
- **Duration:** In SECONDS (3600 = 1 hour)
- **String references, NOT foreign keys:** `status`, `category`, `source`, `payment_type`, `agent` are display name strings, not IDs
- **parent_customer pattern:** `"{first_name} {last_name}"`

---

## WHAT TO BUILD (Realistic Tool Surface — 16 tools)

### Read Tools (13)
| Tool Name | Endpoint | Method |
|-----------|----------|--------|
| `sf_me` | `/v1/me` | GET |
| `sf_list_customers` | `/v1/customers` | GET |
| `sf_get_customer` | `/v1/customers/{id}` | GET |
| `sf_get_customer_equipment` | `/v1/customers/{id}/equipment` | GET |
| `sf_list_jobs` | `/v1/jobs` | GET |
| `sf_get_job` | `/v1/jobs/{id}` | GET |
| `sf_list_estimates` | `/v1/estimates` | GET |
| `sf_get_estimate` | `/v1/estimates/{id}` | GET |
| `sf_list_invoices` | `/v1/invoices` | GET (read-only) |
| `sf_list_techs` | `/v1/techs` | GET |
| `sf_list_calendar_tasks` | `/v1/calendar-tasks` | GET |
| `sf_list_job_statuses` | `/v1/job-statuses` | GET |
| `sf_list_payment_types` | `/v1/payment-types` | GET |

### Write Tools (3)
| Tool Name | Endpoint | Method |
|-----------|----------|--------|
| `sf_create_customer` | `/v1/customers` | POST |
| `sf_create_job` | `/v1/jobs` | POST |
| `sf_create_estimate` | `/v1/estimates` | POST |

### Lookup Helpers (cached on startup)
- Job statuses (21 items)
- Payment types (10 items)
- Sources (10 items)

---

## WHAT TO FIX IN client.ts

### Auth URL — WRONG
```
// BROKEN (ServiceTitan pattern):
auth.servicefusion.com/connect/token
auth-integration.servicefusion.com/connect/token

// CORRECT:
https://api.servicefusion.com/oauth/access_token
```

### Content-Type for auth — WRONG
```
// BROKEN:
'Content-Type': 'application/x-www-form-urlencoded'
body: new URLSearchParams({...})

// CORRECT:
'Content-Type': 'application/json'
body: JSON.stringify({grant_type: 'client_credentials', client_id: '...', client_secret: '...'})
```

### Remove SF-App-Key header
ServiceFusion does not use an app key header. Remove `'SF-App-Key': this.secrets!.appKey`.

### Remove tenant ID from paths
ServiceFusion does not use tenant-scoped URL paths. Remove all `/tenant/${client.tenantId}` patterns.

### Remove PUT and DELETE methods
ServiceFusion has no PUT/PATCH/DELETE. Remove `put()` and `delete()` convenience methods.

---

## EXISTING BROKEN SOURCE (for reference)

### Package location
`phoenix-ai-core-staging/packages/servicefusion-mcp/`

### File structure
```
src/
  client.ts      — Auth + HTTP client (WRONG auth URLs, WRONG content-type, has PUT/DELETE)
  index.ts       — MCP server setup (structure is fine, reusable)
  tools/
    index.ts     — All 37 tools (ALL use wrong v2 paths, many use PUT/DELETE that don't exist)
```

### What's salvageable
- `index.ts` (MCP server setup) — structure is correct, keep it
- `client.ts` — retry logic, timeout handling, token caching are good patterns. Fix URLs, auth format, remove PUT/DELETE
- `tools/index.ts` — REWRITE from scratch. Every path is wrong. Every ServiceTitan-specific tool must go.

---

## LIVE DATA SNAPSHOT (Phoenix Electric Tenant)

| Entity | Count | Notes |
|--------|-------|-------|
| Customers | 1,312 | Active customer database |
| Jobs | 2,409 | Full job history |
| Estimates | 1,679 | Quote records |
| Invoices | 1,814 | Read-only via API |
| Technicians | 94 | Active + inactive |
| Job Statuses | 21 | Custom + default |
| Payment Types | 10 | BILL, CASH, CC, CHECK, ACH, etc. |
| Sources | 10 | Google, Website, Nextdoor, etc. |
| Calendar Tasks | 1,777 | Scheduled tasks |

### Job Status Codes (Live)
| Code | Name | Category |
|------|------|----------|
| 01_UNS | Tentative/Unconfirmd | OPEN |
| 02_SCH | Scheduled | OPEN |
| 04_DEL | Delayed | OPEN_ACTIVE |
| 05_OTW | On The Way | OPEN_ACTIVE |
| 07_STA | Started | OPEN_ACTIVE |
| 08_PAU | Paused | OPEN_ACTIVE |
| 10_CMP | Job Fully Completed | OPEN_ACTIVE |
| 11_CXL | Cancelled | OPEN |
| 12_CLS | Job Closed | CLOSED |
| 13_BLL | To be invoiced | CLOSED |

---

## WORKING CURL COMMANDS (verified against production)

```bash
# Get OAuth token
TOKEN=$(curl -s -X POST "https://api.servicefusion.com/oauth/access_token" \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"client_credentials","client_id":"'$SF_CLIENT_ID'","client_secret":"'$SF_CLIENT_SECRET'"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Authenticated user
curl -s -H "Authorization: Bearer $TOKEN" "https://api.servicefusion.com/v1/me"

# Customers (paginated)
curl -s -H "Authorization: Bearer $TOKEN" "https://api.servicefusion.com/v1/customers?per-page=20&page=1"

# Jobs (newest first)
curl -s -H "Authorization: Bearer $TOKEN" "https://api.servicefusion.com/v1/jobs?per-page=20&sort=-created_at"

# Jobs filtered by status
curl -s -H "Authorization: Bearer $TOKEN" "https://api.servicefusion.com/v1/jobs?filters[status]=Scheduled&per-page=50"

# Estimates
curl -s -H "Authorization: Bearer $TOKEN" "https://api.servicefusion.com/v1/estimates?per-page=20"

# Invoices (read-only)
curl -s -H "Authorization: Bearer $TOKEN" "https://api.servicefusion.com/v1/invoices?per-page=20"

# Technicians
curl -s -H "Authorization: Bearer $TOKEN" "https://api.servicefusion.com/v1/techs"

# Lookup tables
curl -s -H "Authorization: Bearer $TOKEN" "https://api.servicefusion.com/v1/job-statuses"
curl -s -H "Authorization: Bearer $TOKEN" "https://api.servicefusion.com/v1/payment-types"
curl -s -H "Authorization: Bearer $TOKEN" "https://api.servicefusion.com/v1/sources"
```

---

*Compiled from: AGENT1_SERVICEFUSION.md (live validation), SERVICE_FUSION_API_COMPLETE_REFERENCE.md (full scrape), and broken MCP source code. All endpoints verified against production.*
