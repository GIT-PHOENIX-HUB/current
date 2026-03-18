# Phoenix Current Software (PCS)

Service Fusion replacement — built by Phoenix Electric LLC.

**"Current"** = electrical current + up to date.

## Repository Structure

```
current/
├── packages/
│   ├── mcp-server/           MCP server — 23 active SF API tools
│   │   ├── src/              TypeScript source (client, cache, rate-limiter, tools)
│   │   └── scripts/          API discovery/validation scripts
│   └── shared/               Shared utilities
│       └── src/              Key Vault integration, logger, type definitions
├── plugin/                   Claude Code plugin
│   ├── commands/             6 slash commands (/sf-briefing, /sf-jobs, etc.)
│   ├── agents/               sf-operations-agent (autonomous SF ops)
│   └── skills/               Operational skill + 6 reference docs
├── docs/                     Architecture and rewrite specifications
└── references/               Raw API specs (RAML, web scrape, processed reference)
```

## Service Fusion API

- **Base URL:** `https://api.servicefusion.com/v1/`
- **Auth:** OAuth 2.0 Client Credentials Grant
- **Token endpoint:** `POST https://api.servicefusion.com/oauth/access_token`
- **Operations:** GET + POST only. NO PUT, PATCH, or DELETE.
- **Rate limit:** 120 req/min
- **Credentials:** Azure Key Vault (`phoenixaaivault`)

## MCP Server (23 Active Tools)

| Category | Tools | Methods |
|----------|-------|---------|
| CRM | list_customers, get_customer, get_customer_equipment, create_customer, search_customers | GET, POST |
| Jobs | list_jobs, get_job, create_job, list_job_statuses, list_job_categories | GET, POST |
| Estimates | list_estimates, get_estimate, create_estimate | GET, POST |
| Invoices | list_invoices, get_invoice | GET (read-only) |
| Technicians | list_technicians, get_technician | GET |
| Calendar | list_calendar_tasks, create_calendar_task | GET, POST |
| Lookups | list_payment_types, list_sources | GET |
| Meta | me, health | GET |

## Plugin (6 Commands + 1 Agent)

| Command | Purpose |
|---------|---------|
| `/sf-briefing` | Morning operations summary |
| `/sf-jobs` | Job listing, creation, status lookup |
| `/sf-customers` | Customer search, view, create |
| `/sf-estimate` | Guided estimate/proposal creation |
| `/sf-schedule` | Calendar tasks, technician availability |
| `/sf-pricebook` | Pricebook reference and Rexel pricing |

**Agent:** `sf-operations-agent` — Autonomous orchestrator for multi-step SF operations.

## Key Documents

| File | Description |
|------|-------------|
| `docs/SERVICEFUSION_MCP_REWRITE_BRIEF.md` | MCP rewrite spec — correct endpoints, auth, what to build (compiled 2026-03-05) |
| `docs/api-surface.md` | Authoritative SF v1 API surface reference |
| `references/servicefusion-api-complete-spec.md` | 17,929-line processed API reference (75 types, 26 endpoints) |
| `references/servicefusion-api-spec.json` | Raw 4.3MB RAML specification |

## Status

Repository initialized 2026-03-17. All Service Fusion documentation, MCP server source, shared utilities, and Claude Code plugin consolidated from `phoenix-ai-core-staging` and `service-fusion` repos.

---
*Phoenix Electric LLC — Denver Metro / Douglas County, CO*
