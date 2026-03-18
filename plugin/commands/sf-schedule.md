---
description: "View schedule — calendar tasks, technician list, job schedule"
allowed-tools:
  - "mcp__servicefusion__*"
---

# Schedule View

Display scheduling info from Service Fusion using available API endpoints.

## Instructions

1. Call `servicefusion_list_calendar_tasks` to see scheduled tasks
2. Call `servicefusion_list_technicians` to see available techs
3. Call `servicefusion_list_jobs` with date filters if available

Present calendar tasks grouped by date, showing tech assignments and job info where available.

## Limitations (SF v1 API)

The following dispatch features are NOT available via the SF v1 API — use the SF dashboard:
- **Appointments listing** — no appointments endpoint
- **Technician shifts** — no shifts endpoint
- **On-call technician** — no on-call endpoint
- **Dispatch capacity** — no capacity endpoint
- **Zone management** — no zones endpoint

For full dispatch scheduling, use the SF web dashboard or browser automation (see `references/browser-fallback.md`).
