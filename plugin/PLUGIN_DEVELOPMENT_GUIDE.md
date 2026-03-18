# Claude Code Plugin Development Guide

> **Team reference for Phoenix Electric — Shane, Stephanie, Ash, and future Echos.**
> Built from first-hand experience creating the Service Fusion plugin.

---

## 1. Plugin System Overview

Claude Code plugins are directory-based extensions that add capabilities to Claude Code sessions. A plugin can provide any combination of:

- **Skills** — Contextual knowledge and workflows loaded when relevant triggers match
- **Commands** — Slash commands (`/command-name`) for quick-access operations
- **Agents** — Autonomous subagents with specific tool access and behavior rules
- **Hooks** — Event-driven automation (session start, tool use, compaction, etc.)
- **MCP Servers** — Model Context Protocol servers that expose tools (APIs, databases, etc.)

### Local vs Marketplace Plugins

| Type | Location | Install Method |
|------|----------|----------------|
| **Local** | `~/.claude/plugins/plugin-name/` | Copy directory + register in `installed_plugins.json` |
| **Marketplace** | `~/.claude/plugins/cache/` | `claude plugin install author/repo` |

### Auto-Discovery

Claude Code scans plugin directories for components automatically:
- `commands/*.md` → registered as slash commands
- `skills/*/SKILL.md` → registered as skills (description loaded, content on trigger)
- `agents/*.md` → registered as autonomous agents
- `hooks/hooks.json` → event handlers registered
- `.mcp.json` → MCP servers started on plugin load
- `.claude-plugin/plugin.json` → plugin metadata (required)

---

## 2. Directory Structure

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json          # REQUIRED — manifest (name, description, version, author)
├── .mcp.json                # OPTIONAL — register MCP servers (stdio, SSE, HTTP)
├── commands/                # OPTIONAL — slash commands (one .md per command)
│   └── command-name.md
├── skills/                  # OPTIONAL — skills (subdirectory per skill)
│   └── skill-name/
│       ├── SKILL.md         # REQUIRED for skill — frontmatter + instructions
│       └── references/      # OPTIONAL — detailed reference docs (loaded on demand)
│           └── topic.md
├── agents/                  # OPTIONAL — autonomous agents (one .md per agent)
│   └── agent-name.md
└── hooks/                   # OPTIONAL — event-driven automation
    ├── hooks.json           # Hook event definitions
    └── *.sh                 # Hook scripts (referenced from hooks.json)
```

**Key rules:**
- Every plugin MUST have `.claude-plugin/plugin.json`
- All other directories are optional — include only what you need
- File names become identifiers (e.g., `commands/my-tool.md` → `/my-tool`)
- Skill directories can contain `references/` subdirectories for detailed docs

---

## 3. plugin.json — Plugin Manifest

**Location:** `.claude-plugin/plugin.json`

```json
{
  "name": "plugin-name",
  "description": "What this plugin does — be descriptive, this shows in plugin listings",
  "version": "1.0.0",
  "author": {
    "name": "Author Name",
    "email": "author@example.com"
  },
  "keywords": ["tag1", "tag2", "tag3"]
}
```

**Fields:**
| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Plugin identifier (lowercase, hyphens OK) |
| `description` | Yes | Human-readable description |
| `version` | Yes | Semver version string |
| `author` | No | Author info object |
| `keywords` | No | Array of search tags |

---

## 4. .mcp.json — MCP Server Registration

**Location:** `.mcp.json` (plugin root)

This tells Claude Code to start MCP servers when the plugin loads. Each server exposes tools that become available in sessions.

```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["/absolute/path/to/server.js"],
      "env": {
        "ENV_VAR": "value",
        "ANOTHER_VAR": "value"
      }
    }
  }
}
```

**Transport types:**
| Type | Config |
|------|--------|
| **stdio** | `command` + `args` — server communicates via stdin/stdout |
| **SSE** | `url` field pointing to Server-Sent Events endpoint |
| **HTTP** | `url` field pointing to HTTP endpoint |

**Important:**
- Use absolute paths in `args` — relative paths break when Claude Code resolves from different directories
- Environment variables in `env` are passed to the server process
- The server name (e.g., `"server-name"`) becomes the tool prefix: `mcp__server-name__tool_name`
- Multiple servers can be registered in one `.mcp.json`

---

## 5. Commands — Slash Commands

**Location:** `commands/command-name.md` (one file per command)

Commands are markdown files with YAML frontmatter that define slash commands accessible via `/command-name`.

```markdown
---
description: "Short description shown in autocomplete"
allowed-tools:
  - "mcp__server__*"       # Wildcard: all tools from this MCP server
  - Read                    # Specific built-in tool
  - Write
  - Bash
---

# Command Title

## Instructions

[What Claude should do when this command is invoked. Write in imperative form.
Be specific about:
- Which API calls to make and in what order
- How to format the output
- When to ask for confirmation (write operations)]
```

**Frontmatter fields:**
| Field | Required | Description |
|-------|----------|-------------|
| `description` | Yes | Shown in `/` autocomplete (keep short) |
| `allowed-tools` | No | Tools the command can use (whitelist). Wildcards with `*` |

**Tips:**
- File name = command name: `sf-briefing.md` → `/sf-briefing`
- Commands can reference skill reference files for detailed context
- Keep instructions focused — one clear workflow per command
- Use `allowed-tools` to scope tool access (prevents accidental use of unrelated tools)

---

## 6. Skills — Contextual Knowledge

**Location:** `skills/skill-name/SKILL.md`

Skills are loaded when their trigger phrases match user intent. They provide domain knowledge and workflow guidance.

```markdown
---
name: skill-name
description: This skill should be used when the user asks to "trigger phrase 1", "trigger phrase 2", "trigger phrase 3", or any related task. Provides [what the skill covers].
---

# Skill Title

[Instructions in imperative form — tell Claude what to do, not "you should".
Include:
- Authentication/setup requirements
- Tool conventions and naming
- Common workflows with step-by-step instructions
- Links to reference files for detailed info]

## Additional Resources

### Reference Files
- **`references/topic.md`** — Detailed documentation on [topic]
```

**Key concepts:**
| Concept | Details |
|---------|---------|
| **Progressive disclosure** | Metadata always loaded → SKILL.md on trigger → references on demand |
| **Size limit** | Keep SKILL.md under 3,000 words. Move details to `references/` |
| **Trigger phrases** | Put ALL trigger phrases in the `description` field — this is what Claude matches against |
| **References** | Files in `references/` subdirectory are loaded only when Claude needs them |

**Writing good trigger phrases:**
- Include the exact words users will say: "check my schedule", "create an estimate"
- Include abbreviations and aliases: "SF", "Service Fusion"
- Cast a wide net — more triggers = better matching

---

## 7. Agents — Autonomous Subagents

**Location:** `agents/agent-name.md`

Agents are autonomous workers that can be dispatched to handle complex tasks independently.

```markdown
---
name: agent-name
description: Use this agent when the user asks to "trigger 1", "trigger 2"...
tools:
  - "mcp__server__*"
  - Read
  - Write
  - Glob
  - Grep
---

# Agent Title

## System Prompt

[Agent behavior instructions:
- What the agent does
- How it formats output
- When to ask for confirmation
- Error handling rules
- Domain-specific knowledge]
```

**Frontmatter fields:**
| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Agent identifier |
| `description` | Yes | Trigger conditions (when to use this agent) |
| `tools` | Yes | Array of tools the agent can access |

**Agent vs Command vs Skill:**
| Component | Use When |
|-----------|----------|
| **Command** | User wants a quick, specific workflow (`/sf-briefing`) |
| **Skill** | Claude needs domain knowledge to handle a conversation topic |
| **Agent** | Task needs autonomous execution with multiple tool calls and decisions |

---

## 8. Hooks — Event-Driven Automation

**Location:** `hooks/hooks.json` + `hooks/*.sh`

Hooks run shell commands or prompt-based checks in response to Claude Code events.

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/on-start.sh",
            "timeout": 15
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "mcp__server__dangerous_tool",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Warning: dangerous tool invoked'",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

**Available events:**
| Event | When It Fires |
|-------|---------------|
| `SessionStart` | New Claude Code session begins |
| `SessionEnd` | Session ends |
| `Stop` | Claude finishes a response |
| `SubagentStop` | A subagent finishes |
| `PreToolUse` | Before a tool is called (can block) |
| `PostToolUse` | After a tool returns |
| `PreCompact` | Before context compaction |
| `UserPromptSubmit` | When user sends a message |
| `Notification` | When a notification is generated |

**Special variables:**
- `${CLAUDE_PLUGIN_ROOT}` — resolves to the plugin's install directory at runtime
- Use this for referencing hook scripts: `bash ${CLAUDE_PLUGIN_ROOT}/hooks/script.sh`

**Hook types:**
- `command` — runs a shell command, returns stdout as hook output
- Prompt-based hooks use `type: "prompt"` with natural language matcher

---

## 9. Plugin Registration

**Location:** `~/.claude/plugins/installed_plugins.json`

After creating a plugin, register it so Claude Code discovers it on session start.

```json
{
  "plugins": {
    "plugin-name@local": [
      {
        "scope": "project",
        "projectPath": "/Users/username",
        "installPath": "/Users/username/.claude/plugins/plugin-name",
        "version": "1.0.0",
        "installedAt": "2026-01-01T00:00:00.000Z",
        "lastUpdated": "2026-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

**Fields:**
| Field | Description |
|-------|-------------|
| `scope` | `"project"` scopes to a specific working directory |
| `projectPath` | Working directory where this plugin activates |
| `installPath` | Absolute path to the plugin directory |
| `version` | Plugin version |
| `installedAt` | ISO timestamp of installation |
| `lastUpdated` | ISO timestamp of last update |

**Multiple scopes:** Register the same plugin for different project directories by adding multiple entries to the array.

---

## 10. Testing Your Plugin

### Quick Test (No Registration)

```bash
claude --plugin-dir /path/to/your/plugin
```

This loads the plugin for one session without modifying `installed_plugins.json`.

### Verification Checklist

1. **Skills appear:** Your skill should show in the skill list. Check the `description` triggers match what users say.
2. **Commands autocomplete:** Type `/` and your commands should appear.
3. **MCP server starts:** Check for auth errors (expected without credentials) vs code errors (actual bugs).
4. **Agent triggers:** Test agent trigger phrases.
5. **Hooks fire:** Start a session and verify hook scripts run.

### Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| Plugin not loading | Not in `installed_plugins.json` | Add registration entry |
| MCP tools missing | Server crash on start | Check server logs, verify `dist/index.js` path |
| Skills not triggering | Description doesn't match user phrases | Add more trigger phrases |
| Commands not showing | Missing frontmatter | Add `---` block with `description` |
| Hooks not firing | Wrong event name | Check event name matches exactly |

---

## 11. Sharing Plugins

### Local Sharing (Team Members)

1. Copy the plugin directory to the recipient's machine
2. Update paths in `.mcp.json` if needed (absolute paths)
3. Register in recipient's `~/.claude/plugins/installed_plugins.json`
4. Recipient runs `az login` (or whatever auth is needed)
5. Plugin auto-discovers and loads

### Marketplace Publishing

1. Push plugin to a git repository
2. Others install via `claude plugin install author/repo`
3. Plugin goes to `~/.claude/plugins/cache/`

---

## 12. Best Practices

1. **One plugin per domain** — Don't mix unrelated capabilities
2. **Progressive disclosure** — Keep SKILL.md concise, put details in `references/`
3. **Absolute paths** — Always use absolute paths in `.mcp.json` args
4. **Explicit tool scoping** — Use `allowed-tools` in commands to prevent tool sprawl
5. **Confirm writes** — Always confirm with user before write operations
6. **Version bumps** — Update `plugin.json` version when making changes
7. **Test without registering** — Use `--plugin-dir` during development

---

*Written by Echo Pro | Phoenix Electric | 2026-03-08*
*Built from the servicefusion plugin development experience*
