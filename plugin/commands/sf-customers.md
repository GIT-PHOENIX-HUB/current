---
description: "Customer operations — search, view, create"
allowed-tools:
  - "mcp__servicefusion__*"
---

# Customer Operations

Search, view, or create customers in Service Fusion.

## Instructions

Ask the user what they need:

- **Search:** Use `servicefusion_search_customers` with the user's query (name) and optional `limit`. For email or phone matching, use `servicefusion_list_customers` with `filters[email]` or `filters[phone]`.
- **View details:** Use `servicefusion_get_customer` with `customerId`. For equipment history, follow up with `servicefusion_get_customer_equipment` (same `customerId`).
- **Create new:** Use `servicefusion_create_customer`. Required: `customer_name`. Optional: `email`, `phone`, `address_line_1`, `address_line_2`, `city`, `state_prov`, `postal_code`. **Write operation** — present the would-send payload and ask for explicit confirmation before calling. Writes also require `SF_APPROVAL_TOKEN` or `ALLOW_SF_WRITES=true` to be set in the MCP server's environment.
- **Job history:** Use `servicefusion_list_jobs` with `filters[customer_id]` to find jobs for a specific customer.

Present customer info as: name, primary contact (email/phone), full address, and a brief job-history summary if requested.

## Limitations (SF v1 API)

These customer-related operations are NOT available via the v1 API — use the SF web dashboard:
- Service locations (`/v1/locations` returned 404 during discovery)
- Customer memberships
- Booking requests
