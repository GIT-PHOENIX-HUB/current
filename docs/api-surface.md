# Service Fusion v1 API — Authoritative Reference

**Source:** Official SF API documentation (docs.servicefusion.com)
**Validated:** 2026-03-10 (live against Phoenix Electric tenant 4324869397)
**Auth:** Shane Warehime provided complete API docs

## Base URL

```
https://api.servicefusion.com/v1/{resource}
```

HTTPS only — HTTP gets 301 redirect.

## Authentication (OAuth 2.0 — Client Credentials)

```bash
curl -X POST 'https://api.servicefusion.com/oauth/access_token' \
  -H 'Content-Type: application/json' \
  -d '{"grant_type":"client_credentials","client_id":"XXX","client_secret":"XXX"}'
```

- **Token response:** `{ access_token, token_type: "Bearer", expires_in: 3600, refresh_token }`
- **Usage:** `Authorization: Bearer {token}` header OR `?access_token={token}` query param (not both)
- **Refresh:** POST same endpoint with `{"grant_type":"refresh_token","refresh_token":"XXX"}`
- **Credentials:** Azure Key Vault → `SERVICEFUSION-CLIENT-ID`, `SERVICEFUSION-SECRET`
- **Note:** Form-encoded also accepted as fallback

## Rate Limits

- **60 requests per minute** per access token
- Exceeding → HTTP 429 Too Many Requests
- Response headers: `X-Rate-Limit-Limit`, `X-Rate-Limit-Remaining`, `X-Rate-Limit-Reset`

## Query Parameters (all GET list endpoints)

| Param | Example | Description |
|-------|---------|-------------|
| `page` | `?page=2` | Pagination (1-based) |
| `per-page` | `?per-page=20` | Records per page (1-50, default 10) |
| `sort` | `?sort=-name,description` | Sort (prefix `-` for descending) |
| `filters` | `?filters[name]=John` | Field filtering |
| `fields` | `?fields=name,description` | Select specific fields |

## Response Shape

### List (GET /)
```json
{
  "items": [ { "id": 1, ... }, ... ],
  "_meta": {
    "totalCount": 200,
    "pageCount": 20,
    "currentPage": 1,
    "perPage": 10
  }
}
```

### Detail (GET /{id})
```json
{ "id": 1, "first_name": "Max", ... }
```

### Create (POST /)
Returns 201 on success with created record. 422 for validation errors.

## API Resources

| Resource | GET list | GET /{id} | POST | Sub-resources |
|----------|----------|-----------|------|---------------|
| `/v1/me` | 200 | — | — | Authenticated user info |
| `/v1/customers` | 200 | 200 | 201/422 | `/{id}/equipment` |
| `/v1/jobs` | 200 | 200 | 201/422 | — |
| `/v1/estimates` | 200 | 200 | 201/422 | — |
| `/v1/invoices` | 200 | 200 | — | Read-only |
| `/v1/techs` | 200 | 200 | — | Read-only |
| `/v1/calendar-tasks` | 200 | 200 | 201/422 | — |
| `/v1/job-statuses` | 200 | 200 | — | Lookup table |
| `/v1/payment-types` | 200 | 200 | — | Lookup table |
| `/v1/sources` | 200 | 200 | — | Lookup table |
| `/v1/job-categories` | 200 | 200 | — | Lookup table |

**Total: 11 resources, 21+ operations**

## Operations NOT Available

SF v1 has **no** PUT, PATCH, or DELETE. Read and create only.

Not exposed via API (use SF dashboard):
- Pricebook (services, materials, equipment, categories)
- Dispatch (zones, shifts, technician-shifts, capacity)
- Telecom (calls, voicemails, recordings)
- Memberships (types, customer memberships, recurring)
- Marketing (campaigns, costs, categories)
- Inventory, Financial sub-resources, Admin/Config, Field ops

## Key Data Types

**Customers:** Customer, CustomerBody, CustomerView, CustomerContact, CustomerEmail, CustomerLocation, CustomerPhone
**Jobs:** Job, JobBody, JobView, JobCategory, JobStatus, JobDocument, JobExpense, JobLaborCharge, JobNote, JobOtherCharge, JobProduct, JobService, JobSignature, JobTag, JobTask, JobVisit
**Other:** Agent, AssignedTech, CalendarTask, CustomField, Equipment, Estimate, Invoice, Payment, PaymentType, Source, Tech, Picture, Document

## Live Validation (2026-03-10)

Tested against production tenant 4324869397:
- 1,312 customers, 2,409 jobs, 1,679 estimates, 1,814 invoices, 94 techs
- Auth user: Shane Warehime (id: 980286724)
