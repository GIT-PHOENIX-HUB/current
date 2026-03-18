# Service Fusion Operational Workflows

> Step-by-step workflows for common Phoenix Electric operations.
> Each workflow lists the exact API calls, expected data, and output format.

---

## 1. Morning Briefing

**Purpose:** Executive summary of today's operations — jobs, calls, estimates, capacity.
**When:** Start of business day, or on-demand via `/sf-briefing`.

### Steps

1. **Today's Jobs**
   ```
   sf_get_daily_job_summary({ date: "YYYY-MM-DD" })
   ```
   - Extract: total jobs, breakdown by status, urgent/high priority list

2. **Missed Calls**
   ```
   sf_get_missed_calls({ since: "last business day ISO date" })
   ```
   - Skip weekends: if Monday, use Friday's date
   - Extract: count, caller names/numbers

3. **Open Estimates**
   ```
   sf_list_estimates({ status: "Open" })
   ```
   - Extract: count, total dollar value (sum of estimate amounts)

4. **Dispatch Capacity**
   ```
   sf_get_capacity({ startDate: "today", endDate: "tomorrow" })
   ```
   - Extract: available slots today and tomorrow

5. **On-Call Technician**
   ```
   sf_get_on_call_technician()
   ```
   - Extract: technician name and shift times

### Output Format

```
## Phoenix Electric — Morning Briefing (March 8, 2026)

### Today's Jobs (12 total)
| Status | Count |
|--------|-------|
| Scheduled | 5 |
| Working | 3 |
| Pending | 2 |
| Completed | 2 |

**Urgent/High Priority:**
- Job #1234: Panel upgrade at 123 Main St (Urgent)
- Job #1236: Service call at 456 Oak Ave (High)

### Missed Calls (3)
- (555) 012-3456 — 8:15 AM
- (555) 789-0123 — 9:42 AM
- (555) 456-7890 — 11:30 AM

### Open Estimates (5)
Total value: $23,450.00

### Dispatch Capacity
- Today: 3 slots available
- Tomorrow: 6 slots available

### On-Call
John Doe — until 6:00 AM tomorrow

### Recommended Actions
1. Follow up on 3 missed calls
2. Review urgent job #1234
3. Push oldest open estimate
```

---

## 2. Estimate Creation

**Purpose:** Build a professional estimate with pricebook items.
**When:** Customer requests a quote, technician identifies additional work.

### Steps

1. **Find Customer**
   ```
   sf_search_customers({ query: "customer name or phone" })
   ```
   - If not found, offer `sf_create_customer`

2. **Find or Create Job**
   ```
   sf_list_jobs({ customerId: <id>, status: "Pending" })
   ```
   - If no active job:
   ```
   sf_list_job_types({ active: true })
   sf_list_locations({ customerId: <id> })
   sf_create_job({ customerId, locationId, jobTypeId, priority, summary })
   ```

3. **Browse Pricebook**
   ```
   sf_list_categories()
   sf_list_services({ categoryId: <selected> })
   sf_list_materials({ categoryId: <selected> })
   sf_list_equipment({ active: true })
   ```
   - Present items with prices for user selection

4. **Build Line Items**
   - Assemble: `[{ description, quantity, unitPrice }]`
   - Calculate subtotal, apply markup if needed, compute total

5. **Create Estimate**
   ```
   sf_create_estimate({ jobId, name: "Estimate title", items: [...] })
   ```
   - Confirm with user before creating (write operation)

6. **Generate Document (Optional)**
   - Pull customer details, job scope, line items
   - Format as markdown proposal with Phoenix Electric branding
   - Write to file for PDF conversion

---

## 3. Contract/Proposal Generation

**Purpose:** Create a professional contract or proposal document from SF data.
**When:** After estimate approval, before starting large projects.

### Steps

1. **Gather Customer Data**
   ```
   sf_get_customer({ customerId: <id> })
   sf_list_locations({ customerId: <id> })
   ```

2. **Gather Job Data**
   ```
   sf_get_job({ jobId: <id> })
   ```

3. **Gather Pricing**
   ```
   sf_list_services({ categoryId: <relevant> })
   sf_list_materials({ categoryId: <relevant> })
   ```
   - Or use existing estimate line items

4. **Compose Document**
   - Header: Phoenix Electric branding, date, contract number
   - Customer section: name, address, contact info
   - Scope of work: from job summary + details
   - Pricing table: itemized services, materials, labor
   - Terms and conditions: payment terms, warranty, permits
   - Signature block

5. **Write to File**
   - Save as markdown (convertible to PDF)
   - Suggested path: `~/Documents/Phoenix_Electric/Contracts/`

---

## 4. Customer Onboarding

**Purpose:** Add a new customer with location and first booking.
**When:** New customer calls or is referred.

### Steps

1. **Check for Existing Customer**
   ```
   sf_search_customers({ query: "name or phone" })
   ```
   - Prevent duplicates

2. **Create Customer**
   ```
   sf_create_customer({
     name: "Jane Smith",
     type: "Residential",
     address: { street: "789 Elm St", city: "Phoenix", state: "AZ", zip: "85001" },
     contacts: [
       { type: "Phone", value: "555-234-5678" },
       { type: "Email", value: "jane@example.com" }
     ]
   })
   ```

3. **Create Location** (if different from customer address)
   - Service locations may differ from billing address
   - Note: location creation may need browser fallback if not in API

4. **Create First Booking**
   ```
   sf_create_booking({
     customerId: <new_id>,
     start: "2026-03-10T09:00:00Z",
     summary: "Initial electrical inspection"
   })
   ```

---

## 5. Scheduling Operations

**Purpose:** View and manage the dispatch schedule.
**When:** Checking availability, rescheduling, finding coverage.

### Steps

1. **Check Capacity**
   ```
   sf_get_capacity({ startDate: "today", endDate: "end of week" })
   ```

2. **View Technician Shifts**
   ```
   sf_list_technician_shifts({ startsOnOrAfter: "today 00:00Z", startsOnOrBefore: "today 23:59Z" })
   ```

3. **View Appointments**
   ```
   sf_list_appointments({ startsOnOrAfter: "today 00:00Z" })
   ```

4. **Find On-Call**
   ```
   sf_get_on_call_technician()
   ```

5. **Reschedule (if needed)**
   ```
   sf_reschedule_appointment({
     appointmentId: <id>,
     start: "new start ISO",
     end: "new end ISO",
     technicianId: <optional new tech>
   })
   ```

---

## 6. Campaign ROI Analysis

**Purpose:** Evaluate marketing campaign effectiveness.
**When:** Monthly/quarterly marketing review.

### Steps

1. **List Campaigns**
   ```
   sf_list_campaigns({ active: true })
   ```

2. **Get Campaign Costs**
   ```
   sf_list_campaign_costs({ campaignId: <id> })
   ```

3. **Cross-Reference Jobs**
   ```
   sf_list_jobs({ createdOnOrAfter: "campaign start date" })
   ```
   - Match jobs to campaigns via campaign tags/source

4. **Calculate ROI**
   - Revenue from campaign-sourced jobs vs campaign costs
   - Cost per lead, cost per conversion
   - Present as table with campaign comparison

---

## 7. Job Lifecycle

**Purpose:** Full job lifecycle from creation to invoice.
**When:** Tracking a job from start to finish.

### Lifecycle Flow

```
Create Job → Dispatch → Working → Complete → Invoice → Payment
```

### Steps

1. **Create**
   ```
   sf_create_job({ customerId, locationId, jobTypeId, priority, summary })
   ```

2. **Monitor**
   ```
   sf_get_job({ jobId }) — check status progression
   sf_list_appointments({ jobId }) — check scheduling
   ```

3. **Invoicing**
   ```
   sf_list_invoices({ jobId }) — check if invoice exists
   sf_get_invoice({ invoiceId }) — view details
   ```

4. **Payment**
   ```
   sf_list_payments({ customerId }) — check payment status
   ```

---

*Built for Phoenix Electric operations | 2026-03-08*
