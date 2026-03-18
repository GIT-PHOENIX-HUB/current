# Service Fusion Financials Reference

> Invoice lifecycle, payment tracking, estimate pipeline, pricebook tier structure.

---

## Invoice Lifecycle

Invoices in Service Fusion follow a strict status progression:

```
Pending → Posted → Exported → Void
```

| Status | Meaning | Actions Available |
|--------|---------|-------------------|
| **Pending** | Invoice created, not yet finalized | Edit line items, adjust amounts |
| **Posted** | Finalized, visible to customer | Accept payments, export |
| **Exported** | Sent to external accounting (QuickBooks, etc.) | View only |
| **Void** | Canceled/voided | No further actions |

### Key API Calls

```
sf_list_invoices({ status: "Pending" })     — Find invoices needing review
sf_list_invoices({ status: "Posted" })      — Find invoices awaiting payment
sf_list_invoices({ customerId: <id> })      — Customer invoice history
sf_get_invoice({ invoiceId: <id> })         — Full invoice details with line items
```

### Invoice Structure

An invoice contains:
- **Header:** Invoice number, date, customer, job reference
- **Line items:** Description, quantity, unit price, total
- **Totals:** Subtotal, tax, total, amount paid, balance due
- **Payments:** Linked payment records

---

## Payment Tracking

```
sf_list_payments({ customerId: <id> })    — All payments for a customer
```

Payment records include:
- Amount, date, method (Check, Credit Card, Cash, ACH)
- Invoice reference
- Applied vs unapplied amounts

### Reconciliation Workflow

1. List invoices with status `Posted`
2. Cross-reference with payments
3. Identify unpaid invoices (balance due > 0)
4. Calculate aging: 30/60/90 day buckets

---

## Estimate Pipeline

Estimates follow a simpler lifecycle:

```
Open → Sold → Dismissed
```

| Status | Meaning |
|--------|---------|
| **Open** | Estimate sent to customer, awaiting decision |
| **Sold** | Customer accepted, estimate converted to work |
| **Dismissed** | Customer declined or estimate expired |

### Key API Calls

```
sf_list_estimates({ status: "Open" })           — Active pipeline
sf_list_estimates({ status: "Sold" })           — Won estimates
sf_create_estimate({ jobId, name, items })      — New estimate
sf_sell_estimate({ estimateId, soldById })       — Mark as won
```

### Estimate → Invoice Conversion

When an estimate is sold:
1. Job associated with the estimate becomes active
2. Work is performed
3. Invoice is created from job (may include additional items beyond estimate)
4. Estimate serves as the pricing record

### Pipeline Metrics

From the estimate list, calculate:
- **Open pipeline value:** Sum of all Open estimate totals
- **Win rate:** Sold / (Sold + Dismissed)
- **Average estimate value:** Total / Count
- **Age analysis:** Days since estimate creation

---

## Pricebook Tier Structure

Phoenix Electric uses a 7-tier pricing structure in the Service Fusion pricebook:

| Tier | Use Case | Typical Markup |
|------|----------|----------------|
| **Tier 1** | Residential standard | Base retail |
| **Tier 2** | Residential premium/emergency | Higher markup |
| **Tier 3** | Commercial standard | Volume-adjusted |
| **Tier 4** | Commercial contract | Discounted |
| **Tier 5** | Builder/contractor | Cost-plus |
| **Tier 6** | Internal/warranty | Cost only |
| **Tier 7** | Special/custom | Negotiated |

### Pricebook Structure

The pricebook contains three types of items:

1. **Services** — Labor and complete service packages
   - Includes labor time, overhead, profit margin
   - May bundle materials and equipment

2. **Materials** — Physical parts and supplies
   - Tracks cost (vendor price) and sell price separately
   - Supports vendor field for supply chain tracking (Rexel, etc.)
   - Has part codes for cross-referencing with vendor catalogs

3. **Equipment** — Major equipment items
   - Larger items (panels, fixtures, generators)
   - May have serial numbers, warranty tracking

### Key API Calls

```
sf_list_categories()                          — All pricebook categories
sf_list_services({ categoryId: <id> })        — Services in a category
sf_list_materials({ vendor: "Rexel" })        — Materials from Rexel
sf_list_equipment({ active: true })           — Active equipment
sf_compare_prices({ items: [...] })           — Vendor price comparison
```

### Pricebook Statistics

- Total items: 1,040+
- Categories: Organized by electrical trade (Wire, Panels, Fixtures, etc.)
- Materials with vendor codes: Cross-referenced with Rexel part numbers

---

## Markup Rules

### Standard Markup Calculation

```
Sell Price = (Vendor Cost × Markup Multiplier) + Labor Component
```

### By Item Type

| Item Type | Typical Approach |
|-----------|-----------------|
| Materials | Vendor cost + percentage markup (varies by category) |
| Services | Flat rate or hourly rate including labor + overhead |
| Equipment | Cost + installation + markup |

### When Building Estimates

1. Look up materials at vendor cost
2. Apply category-appropriate markup
3. Add labor time × hourly rate
4. Include equipment at marked-up price
5. Total = Sum of all line items

---

*Phoenix Electric Financial Reference | 2026-03-08*
