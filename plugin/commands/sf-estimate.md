---
description: "Build estimates and proposals — guided workflow with document generation"
allowed-tools:
  - "mcp__servicefusion__*"
  - Write
---

# Estimate Builder

Guided estimate creation with document generation.

## Instructions

Walk through the estimate creation process:

1. **Identify customer:** Ask for customer name/ID. Use `servicefusion_search_customers` to find them.
2. **Select or create job:** Use `servicefusion_list_jobs` filtered by `filters[customer_id]`. If no active job, offer to create one with `servicefusion_create_job`.
3. **Build line items:** Assemble description, quantity, and unit price for each item manually. Apply Phoenix Electric pricing tiers if applicable.
4. **Review:** Present the complete estimate with subtotal, any markup, and total.
5. **Create in SF:** Use `servicefusion_create_estimate` with the assembled data. Confirm before creating (write operation).
6. **Document (optional):** If requested, generate a formatted proposal/estimate document as markdown and write to a file. Include Phoenix Electric branding, scope of work, terms, and pricing table.

## Limitations (SF v1 API)

- **No pricebook browsing via API.** Services, materials, equipment, and categories are NOT available through the SF v1 API. Users must provide pricing manually or reference local pricebook files.
- **No sell/convert estimate.** The estimate-to-invoice conversion must be done in the SF dashboard.
