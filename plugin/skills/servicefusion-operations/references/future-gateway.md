# Future Gateway Features

> Architecture for Studio/Gateway features that require persistent server infrastructure.
> These features are DESIGNED but blocked until Gateway runs persistently on Studio.
> Documented here so any Echo can implement them when Studio is ready.

---

## Prerequisites

All features below require:
1. **Phoenix Echo Gateway** running persistently on Studio (`~/Phoenix-Echo-Gateway/`)
2. **Stable network access** (Tailscale for inter-device communication)
3. **Cron service** in Gateway for scheduled tasks
4. **Notification channels** (Telegram bot, push notifications)

## Feature 1: Crons with Alarms

### Architecture

```
Gateway Cron Service
  ├── Schedule: "Every weekday at 6:30 AM MST"
  ├── Action: Run morning briefing workflow
  │   ├── sf_get_daily_job_summary(today)
  │   ├── sf_get_missed_calls(since: yesterday)
  │   ├── sf_list_estimates({ status: "Open" })
  │   ├── sf_get_capacity(today, tomorrow)
  │   └── sf_get_on_call_technician()
  ├── Format: Compile executive summary
  └── Notify: Push to Telegram/Teams
```

### Implementation Notes

- Cron runs as a Gateway scheduled task
- Uses the same SF MCP tools as the plugin
- Formats output as a notification-friendly summary
- Pushes to configured notification channels
- Alarm escalation: if urgent jobs or missed calls exceed threshold, escalate notification priority

### Configuration

```json
{
  "crons": {
    "morning-briefing": {
      "schedule": "30 6 * * 1-5",
      "timezone": "America/Phoenix",
      "workflow": "morning-briefing",
      "notify": ["telegram", "teams"]
    }
  }
}
```

## Feature 2: GPS Auto-Logging

### Architecture

```
Tailscale Device API
  ├── Poll: Every 5 minutes during work hours
  ├── Devices: iPhone (Shane), technician devices
  ├── Location: Last-seen coordinates from Tailscale
  └── Compare: Against active job site addresses

Job Proximity Engine
  ├── Input: Device GPS + Job location addresses
  ├── Geocode: Convert addresses to lat/lon
  ├── Radius: 200m proximity trigger
  ├── Events:
  │   ├── Arrive: Auto-start time entry
  │   ├── Depart: Auto-stop time entry
  │   └── Linger: No action (already logging)
  └── Output: SF time entries via API
```

### Implementation Notes

- Tailscale provides device last-seen location via admin API
- Requires Tailscale API key with device read access
- Geocoding via a geocoding service (Nominatim, Google Maps, etc.)
- Proximity calculation: Haversine formula for distance
- Time entries created via SF API (if available) or browser fallback
- Privacy: Only tracks during configured work hours

### Devices on Tailnet

| Device | Tailscale IP | Role |
|--------|-------------|------|
| MacBook | 100.80.140.118 | Admin |
| Studio | 100.68.34.116 | Gateway host |
| VPS | 100.115.141.86 | Production |
| iPhone | 100.99.31.62 | GPS source (Shane) |
| iPad | 100.92.94.45 | Field tablet |

## Feature 3: Scheduled Briefings

### Architecture

Extends Feature 1 with additional scheduled reports:

| Schedule | Report | Channel |
|----------|--------|---------|
| Weekdays 6:30 AM | Morning briefing | Telegram |
| Weekdays 5:00 PM | End-of-day summary | Telegram |
| Fridays 4:00 PM | Weekly recap | Email + Teams |
| Monthly 1st | Month-end financials | Email |

### End-of-Day Summary

```
Workflow:
  1. sf_get_daily_job_summary(today) — compare to morning
  2. sf_list_invoices({ createdOnOrAfter: today }) — today's invoicing
  3. sf_list_payments({ createdOnOrAfter: today }) — today's payments
  4. Summary: jobs completed, revenue collected, outstanding items
```

### Weekly Recap

```
Workflow:
  1. Job stats for the week (completed, canceled, new)
  2. Estimate pipeline (new, sold, dismissed this week)
  3. Revenue summary (invoiced, collected)
  4. Technician utilization
  5. Marketing campaign performance
```

## Feature 4: Voice Call Routing

### Architecture

```
SF Telecom Webhooks
  ├── Event: Incoming call received
  ├── Payload: Caller ID, time, status
  └── Destination: Gateway webhook endpoint

Gateway Call Processor
  ├── Lookup: sf_search_customers({ query: callerPhone })
  ├── Context: sf_list_jobs({ customerId, status: "Working" })
  ├── Correlate: Match caller to active job
  └── Route: Forward context to dispatcher/technician

Notification
  ├── Telegram: "Incoming: Jane Smith (Job #1234 — Panel Upgrade)"
  └── Dashboard: Real-time call feed with customer context
```

### Implementation Notes

- Requires SF webhook configuration (admin setting)
- Gateway needs a public webhook endpoint (via Cloudflare Tunnel or Tailscale Funnel)
- Call context enrichment: pull customer name, active jobs, last service date
- Voicemail transcription: integrate with recording URL + speech-to-text

## Feature 5: Rexel Auto-Sync

### Architecture

```
Gateway Cron (Monthly)
  ├── Trigger: 1st of each month
  ├── Input: Rexel price data (file watch or manual trigger)
  ├── Process: sf_compare_prices(rexelItems)
  ├── Report: Generate diff report
  │   ├── Increases (flag > 5% for review)
  │   ├── Decreases (auto-apply or flag)
  │   └── New items (flag for categorization)
  └── Queue: Add to approval queue

Approval Queue
  ├── Dashboard: Show pending price changes
  ├── Actions: Approve / Reject / Modify per item
  ├── Apply: sf_update_material or sf_create_material
  └── Log: Record all changes with timestamps
```

### Implementation Notes

- Could watch a shared folder for Rexel invoice PDFs
- PDF parsing to extract part codes and prices
- Approval queue stored in Gateway memory/database
- Shane reviews and approves changes via dashboard or Telegram
- Change log for audit trail

## Feature 6: Auto Time Tracking

### Architecture

Builds on GPS Auto-Logging (Feature 2):

```
GPS Proximity + SF Appointments
  ├── Match: Device location + appointment times
  ├── Start: Tech arrives at job site → start time entry
  ├── Stop: Tech leaves job site → stop time entry
  ├── Verify: Cross-check with appointment schedule
  └── Submit: Create time entries in SF
```

### Time Entry Fields

- Technician ID
- Job ID
- Start time, end time
- Duration (calculated)
- Notes (auto-generated: "Auto-logged via GPS proximity")

---

## Implementation Priority

When Gateway is ready, implement in this order:

1. **Scheduled Briefings** — Highest value, simplest implementation
2. **Rexel Auto-Sync** — High value, moderate complexity
3. **Voice Call Routing** — High value, needs webhook infrastructure
4. **GPS Auto-Logging** — Medium value, needs Tailscale API integration
5. **Auto Time Tracking** — Builds on GPS, implement after GPS is proven

---

*Future Gateway Architecture | 2026-03-08*
*Implement when Studio Gateway is persistent and stable*
