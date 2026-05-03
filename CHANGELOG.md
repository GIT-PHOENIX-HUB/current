# Changelog

All notable changes to Phoenix Current Software (PCS).

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). PCS is internal software for Phoenix Electric LLC; "version" here corresponds to the Phase milestones from `DESIGN_2026-05-02.md`.

## [Phase A] — 2026-05-02

Stabilization pass. Fixes the blocking path bug, makes the build reproducible from a cold clone, adds tests and CI, formalizes the approval log, and cleans up secret name drift. No live behavior changes for read operations; write operations now emit a structured approval log line for every call.

### Added
- Root `package.json` with npm workspaces (`packages/*`).
- Top-level `.gitignore` covering build output, secrets, OS, and editor artifacts.
- Top-level `npm run build`, `npm run typecheck`, `npm run test` orchestration.
- Vitest test suite — 42 tests across `cache`, `rate-limiter`, `client`, and `tools/index`. All `fetch` and vault calls are mocked. No live SF traffic in CI.
- GitHub Actions CI (`.github/workflows/ci.yml`) — typecheck + build + test on PR to `main`.
- `RUNBOOK.md` — first-time setup, env vars, vault rotation, write enablement, recovery.
- `CHANGELOG.md` (this file).
- `docs/decisions/2026-05-02-drop-deprecated-stubs.md` — proposal to drop the 34 deprecated stub tools (awaiting Shane approval).
- `SF_DRY_RUN=true` mode — write calls return the would-send payload without contacting SF. Approval log records `mode: dry_run`.
- Structured `approval` log line per write call — emitted via the previously-dead `logApproval()` hook from `@phoenix/shared`. Records method, path, params, body, approval-token source, and mode (`dry_run` or `commit`). Phase A: pino stdout. Phase B/C: log destination becomes the `audit_log` table.
- `Azure-TenantId` is now resolvable from the vault (in addition to the `AZURE_TENANT_ID` env var). Required when no env var is set.

### Changed
- `plugin/.mcp.json` — replaces the hardcoded `/Users/.../...` filesystem path with `${PHOENIX_PCS_ROOT}` env-var expansion. Plugin now works from any clone path.
- `packages/mcp-server/tsconfig.json` — `strict: true` (was `strict: false` + `noImplicitAny: false`). No source changes needed; code already type-checks under strict mode.
- `packages/mcp-server/package.json` — description corrected from "21 active tools" to "23 active tools"; `@phoenix/shared` dependency uses `*` (npm workspace syntax) instead of `workspace:*` (yarn/pnpm syntax).
- `packages/shared/src/keyvault.ts` — vault secret resolution now logs a warning when a legacy alias is hit, so the vault can be cleaned up incrementally. Canonical names: `SERVICEFUSION-CLIENT-ID`, `SERVICEFUSION-SECRET`, `Azure-TenantId`.
- `README.md`, `PRODUCT_BIBLE.md`, `plugin/skills/.../SKILL.md`, `plugin/agents/sf-operations-agent.md` — reconciled to a single set of canonical values: 23 active tools, 34 deprecated stubs, `servicefusion_*` prefix, 60 req/min initial (response headers override at runtime), `phoenixaaivault`.

### Removed
- Hardcoded Azure tenant ID `e7d8daef-fd5b-4e0b-bf8f-32f090c7c4d5` from `keyvault.ts` (3 call sites). Now requires `AZURE_TENANT_ID` env var or `Azure-TenantId` vault secret. Throws a clear error if neither is configured.
- (Already removed in 9f1fbc5, the archive-sweep commit; mentioned here for completeness):
  - `packages/mcp-server/src/mcp-sdk.d.ts` — confirmed redundant once SDK type defs land via npm. Strict-mode build passes without it.
  - 14 other archived files — see `phoenix-archive/phoenix-current-software/MANIFEST_2026-05-02.md`.

### Rewritten
- `plugin/commands/sf-customers.md` — new draft against the real `servicefusion_*` tool surface. Original was using non-existent `sf_*` prefixes and tools that turned out to be 404 stubs.
- `plugin/commands/sf-pricebook.md` — new draft that explains the API gap and routes to the SF web UI / browser-fallback reference. Original referenced an archived path.

### Pending (not in this PR)
- Drop the 34 deprecated stub tools (proposal in `docs/decisions/2026-05-02-drop-deprecated-stubs.md`). Awaiting Shane's approval before the follow-up PR moves them to `phoenix-archive/phoenix-current-software/deprecated-stubs/`.

---

## [Pre-Phase A] — 2026-05-02 — Archive sweep (9f1fbc5)

Moved 15 stale, broken, oversized, or aspirational artifacts to `phoenix-archive`. See `MANIFEST_2026-05-02.md` in the archive repo for the canonical list. No source material deleted without an archive copy. Replacement `plugin/.mcp.json` shipped pointing at PCS-local path (further fixed in Phase A above).

## [Initial] — 2026-03-17

Repo initialized — SF docs, MCP server, shared package, and Claude Code plugin consolidated from `phoenix-ai-core-staging` and `service-fusion`.
