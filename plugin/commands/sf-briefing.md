---
description: "Morning operations briefing — today's jobs, open estimates, technician availability"
allowed-tools:
  - "mcp__servicefusion__*"
---

# Morning Operations Briefing

Pull a morning briefing from Service Fusion for Phoenix Electric.

## Instructions

Execute these API calls in order, then format as an executive summary:

1. **Today's Jobs:** Call `servicefusion_list_jobs` with date filters if available. Report total jobs and breakdown by status.

2. **Open Estimates:** Call `servicefusion_list_estimates` with `filters[status]=Open`. Report count and any notable amounts.

3. **Technicians:** Call `servicefusion_list_technicians` to see who's available.

4. **Calendar Tasks:** Call `servicefusion_list_calendar_tasks` for scheduled tasks.

5. **System Health:** Call `servicefusion_health` to confirm API connectivity.

## Output Format

Present as a clean summary table with sections for each area. Highlight urgent items. End with recommended actions for the day.

## Limitations (SF v1 API)

The following briefing items are NOT available via API:
- **Missed calls** — telecom endpoints not available
- **Dispatch capacity** — dispatch endpoints not available
- **On-call technician** — not available
- Check the SF dashboard for these items.
