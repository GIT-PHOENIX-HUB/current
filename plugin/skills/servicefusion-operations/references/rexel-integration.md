# Rexel Integration Reference

> Rexel invoice-to-pricebook workflow, vendor cost analysis, markup rules.
> Rexel is Phoenix Electric's primary electrical supply vendor.

---

## Overview

Rexel provides electrical materials (wire, breakers, panels, connectors, etc.) at wholesale/distributor pricing. The integration workflow syncs Rexel pricing into the Service Fusion pricebook to keep sell prices aligned with current vendor costs.

## Rexel Account Structure

- **Account type:** Commercial electrical contractor
- **Pricing:** Distributor/wholesale pricing (not retail)
- **Invoices:** Contain part codes, descriptions, quantities, unit costs
- **Part codes:** Manufacturer part numbers that map to SF material codes

## Invoice Data Extraction

Rexel invoices provide the raw data for price sync. Input format for `sf_compare_prices`:

```json
{
  "items": [
    { "code": "14-2NM-250", "newPrice": 89.99, "newCost": 62.50 },
    { "code": "20A-GFCI-TR", "newPrice": 18.75, "newCost": 11.25 },
    { "code": "200A-MAIN-BRK", "newPrice": 245.00, "newCost": 168.00 }
  ]
}
```

### Getting Data from Rexel Invoices

1. **Manual input:** Shane provides part codes and prices from Rexel invoice
2. **File input:** Read from invoice document/spreadsheet
3. **Key fields:** Part code, description, unit cost, quantity (for reference)

## Price Comparison Workflow

### Step 1: Compare Against Current Pricebook

```
sf_compare_prices({ items: [{ code, newPrice, newCost }, ...] })
```

Returns:
```json
{
  "compared": 15,
  "increases": 3,
  "decreases": 1,
  "notFound": 2,
  "details": [
    { "code": "14-2NM-250", "found": true, "currentPrice": 85.00, "newPrice": 89.99, "change": 4.99, "changePercent": 5.87 },
    { "code": "NEW-ITEM", "found": false, "newPrice": 18.75 }
  ]
}
```

### Step 2: Review Changes

Present to user as a summary table:

| Code | Current | New | Change | % |
|------|---------|-----|--------|---|
| 14-2NM-250 | $85.00 | $89.99 | +$4.99 | +5.9% |
| 12-2NM-250 | $112.00 | $109.50 | -$2.50 | -2.2% |
| NEW-ITEM | — | $18.75 | NEW | — |

**Highlight:**
- Red/attention for increases > 5%
- Green for decreases
- Blue for new items not in pricebook

### Step 3: Apply Approved Changes

For **updates** (existing materials):
```
sf_update_material({ materialId: <id>, price: <new_sell_price>, cost: <new_vendor_cost> })
```

For **new materials** (not found in pricebook):
```
sf_create_material({
  name: "Item description",
  code: "PART-CODE",
  price: <sell_price_with_markup>,
  cost: <vendor_cost>,
  vendor: "Rexel"
})
```

**Always confirm each update/create with the user.**

## Vendor Cost → Phoenix Markup Calculation

The core formula for setting sell prices from Rexel costs:

```
Sell Price = Rexel Cost × Markup Multiplier
```

### Markup Guidelines

| Material Category | Typical Multiplier | Notes |
|-------------------|-------------------|-------|
| Wire & Cable | 1.4 - 1.6x | High-volume, competitive |
| Breakers & Panels | 1.3 - 1.5x | Brand-dependent |
| Connectors & Fittings | 1.5 - 2.0x | Small items, higher markup |
| Specialty Items | 1.5 - 2.5x | Low volume, higher margins |
| Commodity Items | 1.2 - 1.4x | Price-sensitive, competitive |

**Important:** These are guidelines. Shane approves final markup decisions. Never auto-apply markup without confirmation.

## Building Services from Rexel Parts

When creating a new pricebook service that bundles materials:

1. **Identify required materials** from Rexel catalog
2. **Look up or create** each material in SF pricebook
3. **Calculate material total** (sum of all parts × quantities)
4. **Add labor component** (estimated hours × hourly rate)
5. **Add overhead** if applicable
6. **Create service** in pricebook with bundled pricing

### Example: Build "Install 200A Panel" Service

Materials from Rexel:
| Part | Qty | Unit Cost | Extended |
|------|-----|-----------|----------|
| 200A Main Panel | 1 | $168.00 | $168.00 |
| 200A Main Breaker | 1 | $85.00 | $85.00 |
| 4/0 Wire (ft) | 20 | $4.50 | $90.00 |
| Ground Rod Kit | 1 | $25.00 | $25.00 |
| **Material Total** | | | **$368.00** |

Service pricing:
```
Materials (at markup): $368.00 × 1.5 = $552.00
Labor (estimated 6 hrs): 6 × $95 = $570.00
Total Service Price: $1,122.00
```

## Sync Frequency

- **Recommended:** Monthly, aligned with Rexel billing cycle
- **Trigger:** When Shane receives Rexel invoices or notices price changes
- **Future automation:** Gateway cron → scheduled Rexel price pull → diff report → approval queue (see `future-gateway.md`)

---

*Phoenix Electric × Rexel Integration | 2026-03-08*
