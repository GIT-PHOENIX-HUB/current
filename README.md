# Phoenix Current Software (PCS)

Service Fusion v1 API integration for Phoenix Electric LLC — an **electrical** company.

**"Current"** = electrical current + up to date.

## Repository Structure

```
phoenix-current-software/
├── package.json                 npm workspaces root
├── packages/
│   ├── mcp-server/              @phoenix/servicefusion-mcp — 23 active SF API tools
│   │   └── src/                 client, cache, rate-limiter, tools
│   └── shared/                  @phoenix/shared — Key Vault, logger, types
├── plugin/                      Claude Code plugin (servicefusion v2.0.0)
│   ├── .claude-plugin/          plugin.json manifest
│   ├── .mcp.json                MCP wiring (uses ${PHOENIX_PCS_ROOT})
│   ├── commands/                4 slash commands (sf-briefing, sf-jobs, sf-estimate, sf-schedule)
│   ├── agents/                  sf-operations-agent
│   └── skills/                  servicefusion-operations skill
├── docs/                        api-surface.md, decisions/
├── RUNBOOK.md                   How to run, secrets, recovery
└── CHANGELOG.md                 Versioned change log
```

## Service Fusion API

- **Base URL:** `https://api.servicefusion.com/v1/`
- **Auth:** OAuth 2.0 Client Credentials Grant (`POST https://api.servicefusion.com/oauth/access_token`)
- **Operations:** GET + POST only — no PUT, PATCH, or DELETE
- **Rate limit:** 60 req/min (initial); response headers override at runtime
- **Credentials:** Azure Key Vault `phoenixaaivault` — secrets `SERVICEFUSION-CLIENT-ID` and `SERVICEFUSION-SECRET`

## MCP Server (23 active tools, 34 deprecated stubs)

All tools prefixed `servicefusion_*`.

| Category | Active Tools |
|----------|--------------|
| CRM | list_customers, get_customer, get_customer_equipment, create_customer, search_customers |
| Jobs | list_jobs, get_job, create_job, list_job_statuses, list_job_categories |
| Estimates | list_estimates, get_estimate, create_estimate |
| Invoices | list_invoices, get_invoice |
| Technicians | list_technicians, get_technician |
| Calendar | list_calendar_tasks, create_calendar_task |
| Lookups | list_payment_types, list_sources |
| Meta | me, health |

34 additional tools exist as deprecated stubs (endpoints returned 404 during 2026-03-10 API discovery). Calling one returns an error directing the user to the SF web UI. See [docs/decisions/2026-05-02-drop-deprecated-stubs.md](docs/decisions/2026-05-02-drop-deprecated-stubs.md) for the proposal to drop them.

## Plugin

| Slash command | Purpose |
|---------------|---------|
| `/sf-briefing` | Morning operations summary |
| `/sf-jobs` | Job listing, creation, status lookup |
| `/sf-estimate` | Guided estimate creation |
| `/sf-schedule` | Calendar tasks, technician availability |

**Agent:** `sf-operations-agent` — autonomous orchestrator for multi-step SF operations.

## Build & Run

```bash
npm install
npm run build
npm test
```

See [RUNBOOK.md](RUNBOOK.md) for vault setup, write enablement, and recovery procedures.

## Status

- Repository initialized 2026-03-17
- Phase A stabilization landed 2026-05-02 — archive sweep, build orchestration, strict TS, CI, structured approval logging
- Active branch: `main`

---
*Phoenix Electric LLC — Denver Metro / Douglas County, CO*
