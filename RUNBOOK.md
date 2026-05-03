# PCS Runbook

Operational reference for Phoenix Current Software (PCS) — how to run it, rotate secrets, enable writes, and recover.

---

## Prerequisites

- Node.js 20+
- npm 10+
- Azure CLI (`az login` must be active for vault access in production)
- A clone of this repo at a stable filesystem path (the plugin reads `${PHOENIX_PCS_ROOT}` from your shell)

---

## First-time setup

```bash
git clone https://github.com/GIT-PHOENIX-HUB/phoenix-current-software.git
cd phoenix-current-software
npm install
npm run build
npm test                                    # 42 tests should pass
```

Set the plugin path env var (add to your `~/.zshrc` or `~/.bashrc`):

```bash
export PHOENIX_PCS_ROOT="$HOME/path/to/phoenix-current-software"
```

Then install the plugin in Claude Code (it reads `plugin/.mcp.json`, which expands `${PHOENIX_PCS_ROOT}` at MCP-server-launch time).

---

## Environment variables

| Variable | Required? | Purpose |
|----------|-----------|---------|
| `AZURE_KEY_VAULT_URI` | Production | Vault to fetch SF + Graph secrets from. Default in `plugin/.mcp.json`: `https://phoenixaaivault.vault.azure.net/` |
| `AZURE_TENANT_ID` | Yes (Graph/SP only) | Azure tenant ID. Required for Graph and SharePoint flows; PCS no longer hardcodes a fallback. |
| `PHOENIX_PCS_ROOT` | Yes (for plugin) | Absolute path to the PCS checkout. Plugin's `.mcp.json` expands it. |
| `SERVICEFUSION_ENV` | No | `production` or `integration` (default: `integration`). Selects which secret name set is tried first. |
| `SF_APPROVAL_TOKEN` | Conditional | Per-call write approval token. Without this OR `ALLOW_SF_WRITES`, all `POST` calls error. |
| `ALLOW_SF_WRITES` | Conditional | Set to `"true"` to bypass the approval gate. Use sparingly. |
| `SF_DRY_RUN` | No | Set to `"true"` to make every write return the would-send payload without calling SF. Useful for "what would this do" testing. |
| `LOG_LEVEL` | No | `pino` log level — `debug`, `info` (default in prod), `warn`, `error`. |

Local-dev fallback: if `AZURE_KEY_VAULT_URI` is unset, PCS falls back to `SERVICEFUSION_CLIENT_ID` / `SERVICEFUSION_CLIENT_SECRET` env vars.

---

## Running the MCP server

### Stdio mode (Claude Code default)

```bash
node packages/mcp-server/dist/index.js
```

Or via the Claude Code plugin — Claude Code spawns this automatically when the `servicefusion` MCP entry is loaded.

### HTTP mode (Gateway, programmatic consumers)

```bash
node packages/mcp-server/dist/index.js --http
# defaults: 127.0.0.1:3100
MCP_PORT=3200 MCP_HOST=0.0.0.0 node packages/mcp-server/dist/index.js --http
```

Health endpoint: `GET http://localhost:3100/health` returns `{ authenticated, rateLimiter, cache }`.

---

## Vault secret rotation

PCS uses canonical secret names with legacy aliases as fallbacks. When a fallback is hit, PCS logs a warning so the vault can be cleaned up.

### Canonical names (Phoenix Electric SF tenant)

| Purpose | Secret name |
|---------|-------------|
| SF client ID (production) | `SERVICEFUSION-CLIENT-ID` |
| SF client secret (production) | `SERVICEFUSION-SECRET` |
| SF client ID (integration) | `SERVICEFUSION-CLIENT-ID-INTEGRATION` |
| SF client secret (integration) | `SERVICEFUSION-SECRET-INTEGRATION` |
| Azure tenant ID | `Azure-TenantId` (or `AZURE_TENANT_ID` env var) |
| Graph client ID | `Graph-ClientId` |
| Graph client secret | `Graph-ClientSecret` |

### Rotating an SF secret

1. Generate a new client secret in the SF developer portal.
2. Add it to the vault under the canonical name (replace the existing version):

   ```bash
   az keyvault secret set \
     --vault-name phoenixaaivault \
     --name SERVICEFUSION-SECRET \
     --value '...new-secret...'
   ```

3. Restart the MCP server (the in-process token cache will re-auth on next call).
4. After 24 h with no warnings, delete obsolete legacy aliases (`ServiceFusion-ClientSecret-2025-11`, `PhoenixAiCommandSecret`, etc.).

### Cleaning up legacy aliases

Watch the logs for:

```
[WARN] Vault secret resolved via legacy alias — clean up the vault to remove it
       canonical=SERVICEFUSION-SECRET fallbackHit=ServiceFusion-ClientSecret-2025-11
```

That tells you which legacy secret is still being read. Once the canonical name has the right value, the legacy alias can be deleted with `az keyvault secret delete`.

---

## Enabling writes

By default, every SF `POST` call is blocked at the client level. To enable:

### Per-session (recommended)

Generate an approval token on demand and pass it via env:

```bash
SF_APPROVAL_TOKEN="$(date +%s)-$(whoami)" claude code   # any string works as a marker
```

Every write logs an `approval` line including `tokenSource: env`.

### Bulk override (use sparingly)

```bash
ALLOW_SF_WRITES=true claude code
```

This bypasses the gate entirely. The approval log line will record `tokenSource: allow_writes_env`.

### Dry-run mode (always safe)

```bash
SF_DRY_RUN=true claude code
```

Writes return the would-send payload as JSON. No SF call is made. The `approval` log line records `mode: dry_run`.

---

## Recovery procedures

### Token cache poisoning

Symptom: every SF call fails with 401 even though credentials are correct.

Cause: stale token in the in-process cache after a credential rotation, or a corrupted refresh token.

Fix:
1. Restart the MCP server (the token cache is per-process).
2. If running via Claude Code plugin: kill the `node` process, Claude Code will respawn it on next tool call.
3. If symptoms persist after restart: check the vault contains the right secret value (`az keyvault secret show --vault-name phoenixaaivault --name SERVICEFUSION-SECRET --query value`).

### Rate limit queue exhaustion

Symptom: `Rate limiter queue full (100+ pending requests)`.

Cause: too many concurrent SF calls; tool is being called in a tight loop.

Fix: stop the runaway caller. The queue drains automatically after the rate-limit reset window (typically 60 s). No process restart needed.

### Vault unreachable

Symptom: startup logs `Service Fusion credentials not configured`.

Cause: `az login` not active, or `AZURE_KEY_VAULT_URI` not set.

Fix:
```bash
az login
az account show          # confirm correct subscription
```

If the user identity isn't a member of the vault's access policy, request a Reader+GetSecret grant from whoever owns the vault.

### Re-running api-discovery

If SF announces new endpoints (or Phoenix Electric's tenant gets enabled for previously-404 endpoints), re-run:

```bash
bash packages/mcp-server/scripts/api-discovery.sh
```

Compare output against the deprecated-stubs list in `tools/index.ts`. If a stub is no longer 404, promote it to an active tool in a follow-up PR.

---

## CI

GitHub Actions workflow at `.github/workflows/ci.yml` runs `typecheck`, `build`, and `test` on every PR to `main`. CODEOWNERS requires `@GIT-PHOENIX-HUB/humans-maintainers` review before merge.

No live SF API calls happen in CI. Tests mock `fetch` and `getServiceFusionSecrets`.

---

## Deployment targets

- **MacBook (stdio):** Claude Code plugin runs the MCP server in stdio mode. Default for Phoenix Electric internal use.
- **Phoenix Gateway (HTTP):** `--http` mode exposes `/mcp` (Streamable HTTP) and `/health`. Planned for future Gateway integration; not in active use as of 2026-05-02.
