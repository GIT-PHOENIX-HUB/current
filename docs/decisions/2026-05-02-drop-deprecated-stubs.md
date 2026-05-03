# ADR — Drop the 34 deprecated SF tool stubs

**Status:** Proposed (awaiting Shane approval)
**Date:** 2026-05-02
**Phase:** A
**Decision needed before:** Phase A merge — but stubs are NOT removed in this PR.

## Context

The MCP server exposes 23 active Service Fusion tools and 34 deprecated stubs. The stubs were created during the 2026-03-10 API discovery pass: each one targets an endpoint that returned 404 on Phoenix Electric's SF v1 tenant. Calling a deprecated stub today throws an error of the form:

> `<name> is not available on the Service Fusion v1 API. This endpoint returned 404 during API discovery (2026-03-10). Use the Service Fusion web UI for this operation.`

They occupy ~75 lines of `tools/index.ts` (lines 364-439 in current source) and inflate the `tools/list` MCP response by 148% (57 tools instead of 23). The agent file already lists them under "NOT Available via API" so the LLM is already routing these requests away.

## The 34 stubs (by category)

| Category | Stubs |
|----------|-------|
| Dispatch (4) | `servicefusion_get_capacity`, `servicefusion_list_technician_shifts`, `servicefusion_get_on_call_technician`, `servicefusion_list_zones` |
| Pricebook (7) | `servicefusion_list_services`, `servicefusion_list_materials`, `servicefusion_create_material`, `servicefusion_update_material`, `servicefusion_list_equipment`, `servicefusion_list_categories`, `servicefusion_compare_prices` |
| Telecom (4) | `servicefusion_list_calls`, `servicefusion_get_call`, `servicefusion_get_missed_calls`, `servicefusion_get_calls_with_recordings` |
| Memberships (3) | `servicefusion_list_membership_types`, `servicefusion_list_customer_memberships`, `servicefusion_list_recurring_services` |
| Marketing (3) | `servicefusion_list_campaigns`, `servicefusion_list_campaign_categories`, `servicefusion_list_campaign_costs` |
| Settings (3) | `servicefusion_list_employees`, `servicefusion_list_business_units`, `servicefusion_list_tag_types` |
| CRM sub-resources (3) | `servicefusion_list_locations`, `servicefusion_list_bookings`, `servicefusion_create_booking` |
| Jobs sub-resources (5) | `servicefusion_cancel_job`, `servicefusion_list_appointments`, `servicefusion_reschedule_appointment`, `servicefusion_list_job_types`, `servicefusion_get_daily_job_summary` |
| Accounting sub-resources (2) | `servicefusion_list_payments`, `servicefusion_sell_estimate` |

## Recommendation

**Drop them entirely.** The agent definition already routes "use the SF web UI for X" guidance for these capability gaps. Keeping erroring stubs as a "did you mean..." mechanism is worse than not exposing them at all because:

1. **They look real.** The MCP tools list shows them as valid tools with descriptions. An LLM (or human) reading the list reasonably tries to use them, then hits the runtime error.
2. **The error tells the same story the agent file already tells.** Anyone who reads the agent file already knows these are unavailable. The agent file is loaded into context; the stub list is consulted reflexively.
3. **They contribute zero capability.** No data path exists. They cannot be salvaged by a code change.
4. **They inflate every `tools/list` response.** ~75 unnecessary tool entries on every cold-start of the plugin, every time Claude re-fetches the tool list.

## Replacement guidance (in agent file)

The `sf-operations-agent.md` already contains this paragraph:

> **NOT Available via API** — Dispatch capacity, pricebook, telecom/calls, memberships, marketing campaigns, settings, locations, bookings, appointments, job cancellation, rescheduling, daily summary, payments, and estimate selling are all unavailable. If a user requests these, explain the limitation and suggest using the SF web UI directly or browser automation.

That paragraph is sufficient. No code-level guidance needs to replace the stubs.

## Action plan (if approved)

This PR (the one carrying this proposal) does **not** touch the stubs. Approval here unlocks a follow-up PR that:

1. **Archives** the stub block by moving the literal source to `phoenix-archive/phoenix-current-software/deprecated-stubs/tools-stub-block-2026-05-02.ts` with a manifest entry. (Per the global no-deletion rule.)
2. **Removes** the `createDeprecatedStubs()` function and its call site in `createAllTools()` from `packages/mcp-server/src/tools/index.ts`.
3. **Removes** the corresponding section from `plugin/skills/servicefusion-operations/SKILL.md` ("Deprecated Tool Categories (34 Stubs — all return 404 errors)") since the agent file already covers the routing.
4. Also drops the `getDeprecatedTools()` helper export, since nothing will call it.
5. Updates `PRODUCT_BIBLE.md` and `README.md` to remove the "34 deprecated stubs" callouts.
6. Documents the change in `CHANGELOG.md`.

The active-tool count stays 23. The repo loses 75 lines. No live behavior changes — the agent already routes around these.

## What stays

- The agent file's "NOT Available via API" paragraph (it is the actual user-facing routing).
- `plugin/skills/servicefusion-operations/references/browser-fallback.md` (the canonical "use the web UI / browser automation" reference).

## What I'd want before approving

If you want to be more conservative, an alternative is to **keep** them but mark them `hidden: true` so they're filtered out of `tools/list` while still callable internally. That preserves the option to re-expose them if SF ever ships v2 with these endpoints. Tradeoff: the code stays bloated, but the LLM-visible surface shrinks.

I prefer the full drop because (a) re-adding them is trivial if SF v2 ever ships, and (b) the archive copy is the durable record.

## Open question for Shane

Approve the drop? Or prefer the `hidden: true` middle path?
