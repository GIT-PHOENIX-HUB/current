---
description: "Pricebook reference — explains why this is web-UI only and routes to fallback"
allowed-tools:
  - "mcp__servicefusion__*"
  - Read
---

# Pricebook (web-UI only)

The Service Fusion v1 API does **not** expose pricebook endpoints. `/v1/services`, `/v1/materials`, `/v1/equipment`, and `/v1/categories` all returned 404 during the 2026-03-10 API discovery. These operations live in the SF web dashboard exclusively.

## Instructions

If the user asks about pricebook, services, materials, equipment, categories, or vendor pricing:

1. **Acknowledge the gap.** Pricebook is not on the SF v1 API — the web UI is the only authoritative source.
2. **Offer the available indirect signals:**
   - `servicefusion_list_invoices` and `servicefusion_get_invoice` — line items on closed invoices show what was actually billed.
   - `servicefusion_list_estimates` and `servicefusion_get_estimate` — line items on estimates show proposed pricing.
3. **Browser fallback:** Direct the user to `plugin/skills/servicefusion-operations/references/browser-fallback.md` for Chrome-automation patterns that scrape pricebook pages from the web UI.

For Phoenix Electric's vendor (Rexel) integration: that is a separate workstream not currently wired into this plugin. Treat as out of scope for this command.

## What this command does NOT do

- Create or update pricebook items (no API)
- Compare vendor prices (no API)
- Browse local pricebook files (no path is canonical in this repo — that was an artifact of the earlier `phoenix-ai-core-staging` layout that has since been archived)
