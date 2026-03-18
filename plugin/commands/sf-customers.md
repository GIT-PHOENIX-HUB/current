---
description: "Customer lookup and management — search, view details, create new customers"
allowed-tools:
  - "mcp__servicefusion__*"
---

# Customer Operations

Search, view, or create customers in Service Fusion.

## Instructions

Ask the user what they need:
- **Search:** Use `sf_search_customers` with the user's query (name, phone, or email)
- **View details:** Use `sf_get_customer` with customer ID, then `sf_list_locations` for their service locations
- **Create new:** Use `sf_create_customer` — gather name, type (Residential/Commercial), address, and contact info. Confirm before creating (write operation).
- **Job history:** Use `sf_list_jobs` filtered by `customerId`
- **Memberships:** Use `sf_list_customer_memberships` filtered by `customerId`

Present customer info in a readable format with address, contacts, location count, and recent job summary.
