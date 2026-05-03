# Product Bible — Phoenix Current Software (PCS)
**Owner:** GIT-PHOENIX-HUB | **Last Updated:** 2026-05-02

## Purpose

Phoenix Current Software (PCS) is the Service Fusion integration stack for Phoenix Electric LLC. It exposes 23 active SF v1 API tools as an MCP server that Claude Code (and future Gateway consumers) can call to perform CRM, job, estimate, invoice, technician, and calendar operations. The name "Current" is intentional: electrical current + up to date. PCS is the long-term replacement layer for manual SF web UI work and the foundation for future Phoenix software that will eventually supersede Service Fusion entirely. It is consumed exclusively by Phoenix Electric internal users — Shane, Stephanie, Ash, and Phoenix Echo.

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js (ESM) | 20+ |
| Language | TypeScript | ^5.3.0 (strict mode) |
| MCP SDK | @modelcontextprotocol/sdk | ^1.25.1 |
| Schema validation | Zod + zod-to-json-schema | ^3.22.0 / ^3.22.0 |
| HTTP framework | Express (HTTP transport mode) | ^4.18.2 |
| Auth (secrets) | Azure Key Vault via DefaultAzureCredential (OIDC) | @azure/identity + @azure/keyvault-secrets |
| Build | TypeScript compiler (tsc) | ^5.3.0 |
| Dev runner | tsx watch | ^4.7.0 |
| Test | Vitest | ^1.0.0 |
| CI/CD | GitHub Actions — typecheck, build, test on PR to main | — |
| Deploy Target | MacBook (stdio, Claude Code plugin) / Gateway (HTTP) | — |
| Workspace | npm workspaces (monorepo) | — |

## Architecture

PCS is a TypeScript monorepo with two packages and a Claude Code plugin directory. Data flows from Claude Code → plugin commands/agent → MCP server (stdio or HTTP) → SF client → Service Fusion API v1. Secrets are fetched from Azure Key Vault on first request using DefaultAzureCredential (requires `az login` on the host machine).

```
current/
├── packages/
│   ├── mcp-server/               @phoenix/servicefusion-mcp v2.0.0
│   │   ├── src/
│   │   │   ├── index.ts          Server factory — stdio + HTTP transport, tool dispatch
│   │   │   ├── client.ts         ServiceFusionClient — OAuth 2.0 CC, token cache, rate limiter, response cache
│   │   │   ├── tools/
│   │   │   │   └── index.ts      23 active tools + 34 deprecated stubs, organized by category
│   │   │   ├── rate-limiter.ts   Token-bucket rate limiter (60 req/min initial, response headers override at runtime)
│   │   │   └── cache.ts          TTL response cache (60s general, 300s lookups, 600s /me)
│   └── shared/                   @phoenix/shared — workspace-internal utilities
│       └── src/
│           ├── keyvault.ts       Azure Key Vault secret fetcher (DefaultAzureCredential, OIDC)
│           ├── logger.ts         Structured logger (createLogger factory)
│           ├── types/index.ts    Shared SF types (SFPaginatedResponse, etc.)
│           └── index.ts          Package entry point
├── plugin/                       Claude Code plugin (installs to ~/.claude/plugins/)
│   ├── .claude-plugin/
│   │   └── plugin.json           Plugin manifest — name: servicefusion, version: 2.0.0
│   ├── .mcp.json                 Wires servicefusion MCP server via stdio (path uses ${PHOENIX_PCS_ROOT})
│   ├── commands/                 4 slash commands
│   │   ├── sf-briefing.md        Morning operations summary
│   │   ├── sf-jobs.md            Job listing / creation / status lookup
│   │   ├── sf-estimate.md        Guided estimate creation
│   │   └── sf-schedule.md        Calendar tasks, technician availability
│   ├── agents/
│   │   └── sf-operations-agent.md  Autonomous multi-step SF orchestrator
│   └── skills/
│       └── servicefusion-operations/
│           ├── SKILL.md          Trigger phrases + operational knowledge
│           └── references/       2 reference docs loaded on demand
│               ├── api-reference.md
│               └── browser-fallback.md
└── docs/
    ├── api-surface.md            Authoritative SF v1 API surface reference
    └── decisions/                ADRs (architecture decision records)
```

Archived material (oversized API dumps, broken commands, aspirational references) lives at `phoenix-archive/phoenix-current-software/` — see `MANIFEST_2026-05-02.md` in the archive repo.

**MCP Tool Categories (23 active tools):**

| Category | Tools |
|----------|-------|
| CRM | list_customers, get_customer, get_customer_equipment, create_customer, search_customers |
| Jobs | list_jobs, get_job, create_job, list_job_statuses, list_job_categories |
| Estimates | list_estimates, get_estimate, create_estimate |
| Invoices | list_invoices, get_invoice |
| Technicians | list_technicians, get_technician |
| Calendar | list_calendar_tasks, create_calendar_task |
| Lookups | list_payment_types, list_sources |
| Meta | me, health |

**Transport modes:**
- `stdio` — default, used by Claude Code plugin
- `http` — HTTP/StreamableHTTP, for Gateway or programmatic consumers

**Write protection:** Write operations require `SF_APPROVAL_TOKEN` or `ALLOW_SF_WRITES=true` env var. Read operations are unrestricted.

## Auth & Security

- **SF API auth:** OAuth 2.0 Client Credentials grant. Credentials pulled from Azure Key Vault at startup via OIDC (`DefaultAzureCredential`). Host machine must have `az login` active. Token is cached in-process; refresh token flow is supported.
- **Secret management:** Azure Key Vault (OIDC). Vault URI passed via environment at runtime. No credentials committed to repo.
- **Write gate:** SF write tools require an approval token or explicit env flag — prevents accidental mutations in CLI sessions.
- **No secrets in repo:** All credentials, vault names, and env var values are excluded from version control.

## Integrations

| Integration | Type | Direction |
|------------|------|-----------|
| Service Fusion API v1 | REST / OAuth 2.0 | Outbound (GET + POST only) |
| Azure Key Vault | OIDC / REST | Outbound (secret fetch at startup) |
| Claude Code | MCP stdio / plugin | Inbound (tool calls) |
| Phoenix Gateway | MCP HTTP | Inbound (planned — HTTP transport mode exists) |
| Rexel pricebook | Reference via skill | Indirect (skill references Rexel integration docs) |

## File Structure

| Path | Purpose |
|------|---------|
| `packages/mcp-server/src/index.ts` | Server factory and entrypoint |
| `packages/mcp-server/src/client.ts` | SF API client (OAuth, rate limiting, caching) |
| `packages/mcp-server/src/tools/index.ts` | All 23 active tools + 34 deprecated stubs |
| `packages/mcp-server/src/rate-limiter.ts` | Token-bucket rate limiter (60 req/min) |
| `packages/mcp-server/src/cache.ts` | TTL GET response cache |
| `packages/mcp-server/package.json` | Package config — `@phoenix/servicefusion-mcp` |
| `packages/shared/src/keyvault.ts` | Azure Key Vault secret fetcher |
| `packages/shared/src/logger.ts` | Structured logger factory |
| `packages/shared/src/types/index.ts` | Shared TypeScript types (SFPaginatedResponse, etc.) |
| `plugin/.claude-plugin/plugin.json` | Plugin manifest |
| `plugin/.mcp.json` | MCP server wiring for Claude Code (uses `${PHOENIX_PCS_ROOT}`) |
| `plugin/commands/*.md` | 4 slash command definitions |
| `plugin/agents/sf-operations-agent.md` | Autonomous SF operations agent |
| `plugin/skills/servicefusion-operations/SKILL.md` | Skill — triggers and operational knowledge |
| `plugin/skills/servicefusion-operations/references/` | 2 on-demand reference docs (api-reference, browser-fallback) |
| `docs/api-surface.md` | Authoritative SF v1 API surface |
| `docs/decisions/` | ADRs (architecture decision records) |
| `RUNBOOK.md` | Run, vault rotation, recovery procedures |
| `CHANGELOG.md` | Versioned change log |

## Current State

- **Status:** active — Phase A stabilization landed 2026-05-02
- **Last stable:** Phase A PR (post-archive sweep, build orchestration, strict TS, CI, tests)
- **Open PRs:** Phase A PR pending Shane review
- **Known Issues:**
  - 34 deprecated stubs in `tools/index.ts` — proposal pending in `docs/decisions/2026-05-02-drop-deprecated-stubs.md`
  - SF auth currently uses fallback secret names alongside the canonical `SERVICEFUSION-CLIENT-ID` / `SERVICEFUSION-SECRET`. Vault cleanup is a follow-up.
  - `dist/` is not committed — `npm run build` required before installing the plugin

## Branding & UI

N/A — backend MCP server and CLI plugin only. No UI.

## Action Log

| Date (approx) | Commit | Description |
|---------------|--------|-------------|
| 2026-03-17 | 0406c56 | Add MCP server, shared package, and Claude Code plugin |
| 2026-03-17 | 5ab2e8a | Initial commit — SF documentation and API references |

## Key Milestones

| Date | Milestone |
|------|-----------|
| 2026-03-05 | SF MCP rewrite brief compiled (correct endpoints, auth model) |
| 2026-03-17 | Repo initialized — SF docs, MCP server, shared package, and Claude Code plugin consolidated from `phoenix-ai-core-staging` and `service-fusion` |
| 2026-03-17 | 23 active tools confirmed via API discovery script |
| 2026-03-27 | Product Bible + Build Doc added (governance phase) |
