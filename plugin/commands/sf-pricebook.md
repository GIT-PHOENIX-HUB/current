---
description: "Pricebook information — browse local files, Rexel pricing reference"
allowed-tools:
  - "mcp__servicefusion__*"
  - Read
  - Glob
---

# Pricebook Operations

Phoenix Electric's pricebook management — currently limited by SF v1 API.

## Instructions

The SF v1 API does NOT expose pricebook endpoints (services, materials, equipment, categories all return 404). For pricebook operations:

1. **Browse local pricebook files:** Check `~/GitHub/phoenix-ai-core-staging/pricebook/` for local data files
2. **Rexel pricing:** Reference vendor pricing data from local files
3. **SF dashboard:** Direct the user to the SF web UI for pricebook management

## What IS Available via API

- `servicefusion_list_invoices` — view invoice line items for pricing reference
- `servicefusion_list_estimates` — view estimate line items

## What is NOT Available (use SF dashboard)

- Browse services, materials, equipment, or categories
- Create or update pricebook items
- Price comparison across vendors
- Building services from Rexel parts

For Rexel integration details, read `references/rexel-integration.md` in the servicefusion-operations skill.
