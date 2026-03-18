---
description: "Job management — list, view, create jobs, check statuses and categories"
allowed-tools:
  - "mcp__servicefusion__*"
---

# Job Management

Manage jobs in Service Fusion — list, view details, create new.

## Instructions

Ask the user what they need:
- **List jobs:** Use `servicefusion_list_jobs` with optional filters (`filters[status]`, `filters[customer_id]`, `filters[tech_id]`)
- **Job details:** Use `servicefusion_get_job` with job ID
- **Create job:** Use `servicefusion_create_job` — needs `customer_id`, optional `description` and `status`. Look up statuses with `servicefusion_list_job_statuses` first. Confirm before creating (write operation).
- **Job categories:** Use `servicefusion_list_job_categories` to browse categories

Present jobs in a table with status, customer, technician, and dates.

## Limitations (SF v1 API)

These operations are NOT available via the API — use the SF web dashboard:
- Cancel or update existing jobs
- Reschedule appointments
- Daily job summary
- Job types listing
