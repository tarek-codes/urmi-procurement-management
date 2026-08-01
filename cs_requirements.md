# Comparative Statement (CS) Validation Specification

**Version:** 2.0  
**Scope:** CS-Level (Document-Level) Validation

---

# 1. Purpose

This document defines the **Comparative Statement (CS) validation rules** that are executed at the **document level**.

A Comparative Statement represents a complete procurement comparison for a requisition and may contain **multiple items**, each with quotations from multiple suppliers.

The objective of CS Validation is **not to validate individual item calculations**, but to determine whether the **entire CS document is valid** and can proceed through the procurement workflow.

---

# 2. Validation Scope

The validation is performed **once per CS**.

```
CS
│
├── Header Information
├── Requisition Information
├── Supplier List
├── Multiple Items
│     ├── Item 1
│     ├── Item 2
│     ├── Item 3
│     └── ...
│
└── Overall CS Information
```

Item-specific issues are **not displayed in the CS validation list**.

Instead:

- The CS is marked as having validation issues.
- Users can open the CS to view detailed item-level validation results.

---

# 3. Validation Levels

The system contains two validation layers.

## Level 1 — CS Validation

Determines whether the entire CS is valid.

Examples

- Missing suppliers
- Invalid requisition
- Duplicate CS Number
- Incorrect CS Total
- Missing selected supplier(s)
- Approval issues

---

## Level 2 — Item Validation

Executed after opening a CS.

Examples

- Incorrect total calculation
- Missing quotation
- Invalid unit rate
- Quantity mismatch
- Duplicate item
- Missing specification

These validations are outside the scope of this document.

---

# 4. Validation Severity

## Error

Critical issue.

The CS cannot be submitted.

Example

```
CS Total does not match calculated total.
```

---

## Warning

Non-critical issue.

Submission may still be allowed depending on business rules.

Example

```
Supplier B did not quote all items.
```

---

# 5. CS Validation Rules

---

# Rule 1 — Header Information Validation

## Required Fields

- Company Name
- CS Number
- CS Date
- Procurer
- Requisition Number

Validation

- Required fields cannot be empty.

Severity

```
Error
```

---

# Rule 2 — CS Number Validation

Checks

- Not empty
- Unique
- Correct format (if applicable)

Examples

```
CS-2026-000145
```

Severity

```
Error
```

---

# Rule 3 — Requisition Validation

Verify

- Requisition exists.
- Requisition is approved.
- Requisition is active.
- CS belongs to the requisition.

Severity

```
Error
```

---

# Rule 4 — Supplier Validation

Collect all suppliers participating in the CS.

Validate

- No duplicate supplier.
- Supplier is active.
- Supplier is approved.
- Supplier is eligible for procurement.

Severity

```
Error
```

---

# Rule 5 — Minimum Supplier Count

Verify procurement policy.

Example

```
Minimum Required Suppliers

3
```

Current CS

```
2 Suppliers
```

Result

```
Error
```

---

# Rule 6 — Item Coverage Validation

Verify

Every requisition item exists in the CS.

Example

Requisition

```
Laptop
Printer
Router
```

CS

```
Laptop
Printer
```

Result

```
Router missing
```

Severity

```
Error
```

---

# Rule 7 — Selected Supplier Validation

Every item must have exactly one selected supplier.

The CS validation does not list which item failed.

Instead

```
CS has items without selected suppliers.
```

Users can open the CS to see the affected items.

Severity

```
Error
```

---

# Rule 8 — Supplier Quotation Coverage

Determine whether suppliers quoted for all items.

Example

```
Supplier A

15 / 15 Items

Supplier B

15 / 15 Items

Supplier C

12 / 15 Items
```

Result

```
Warning

One or more suppliers have incomplete quotations.
```

---

# Rule 9 — CS Total Validation

Calculate

```
Grand Total

=

Sum of Selected Item Totals
```

Compare against

```
CS Main Value
```

If mismatch

```
Error

Calculated CS total does not match CS Main Value.
```

---

# Rule 10 — Currency Validation

Entire CS must use one currency.

Example

Valid

```
USD
USD
USD
```

Invalid

```
USD
BDT
USD
```

Severity

```
Error
```

---

# Rule 11 — Approval Validation

Determine required approval level based on CS value.

Example

```
0 - 50,000

Manager

50,001 - 500,000

Department Head

500,001+

Director
```

Verify required approval exists.

Severity

```
Error
```

---

# Rule 12 — CS Status Validation

Verify CS is eligible for submission.

Example

Cannot submit if

- Draft not completed
- Required approval missing
- Validation errors exist

Severity

```
Error
```

---

# 6. CS Validation Response

Each validation returns

```
Validation Name
Status
Severity
Message
```

Example

```json
{
  "validation": "Supplier Count",
  "status": "Failed",
  "severity": "Error",
  "message": "Minimum 3 suppliers required."
}
```

---

# 7. Validation Summary

Each CS should display only a summary.

Example

```
CS-2026-0145

Status

Validation Failed

Errors

3

Warnings

2
```

The summary should **not** expose individual item violations.

---

# 8. Viewing Detailed Violations

Clicking a CS opens the detailed validation report.

Example

```
CS-2026-0145

↓

Item Validation

↓

Item 4

Missing quotation from Supplier C

Item 8

Incorrect total calculation

Item 11

No selected supplier
```

This document intentionally excludes these item-level validations.

---

# 9. Validation Workflow

```
User Opens CS List
        │
        ▼
Run CS Validation
        │
        ▼
Generate Validation Summary
        │
        ▼
Display

✓ Passed

or

✗ Failed

        │
        ▼
User Opens CS
        │
        ▼
Run / Load Item-Level Validation
        │
        ▼
Display Item-Specific Violations
```

---

# 10. Validation Checklist

| Validation | Scope | Severity |
|------------|-------|----------|
| Header Information | CS | Error |
| CS Number | CS | Error |
| Requisition Exists | CS | Error |
| Supplier Validation | CS | Error |
| Minimum Supplier Count | CS | Error |
| Item Coverage | CS | Error |
| Selected Supplier Exists for Every Item | CS | Error |
| Supplier Quotation Coverage | CS | Warning |
| CS Total Validation | CS | Error |
| Currency Consistency | CS | Error |
| Approval Validation | CS | Error |
| Submission Eligibility | CS | Error |

---

# 11. Relationship with Item Validation

The validation architecture is divided into two independent layers.

| Layer | Responsibility |
|--------|----------------|
| **CS Validation** | Determines whether the overall Comparative Statement is valid for submission and provides a summary of errors/warnings. |
| **Item Validation** | Identifies specific issues within individual items (e.g., missing quotations, incorrect calculations, quantity mismatches, invalid specifications). These details are displayed only after the user opens the selected CS. |

---

# 12. Acceptance Criteria

A Comparative Statement is considered **Valid** only if:

- All mandatory header information is present.
- The CS Number is unique.
- The associated requisition is valid.
- The required number of suppliers is present.
- All requisition items are included in the CS.
- Every item has a selected supplier.
- The calculated CS total matches the stored CS Main Value.
- Currency usage is consistent.
- Required approvals are satisfied.
- No CS-level validation errors remain.

If any of the above checks fail, the CS status should be **Validation Failed**, while the detailed item-level violations remain accessible only from within the CS details page.

# Additional Business Rules

## Rule 13 — Single Procurer per CS

### Description

A Comparative Statement (CS) must have exactly **one Procurer**.

All records belonging to the same `CS_ID` must contain the same `PROCURER`.

### Validation Logic

```
GROUP BY CS_ID

COUNT(DISTINCT PROCURER)
```

Expected Result

```
COUNT(DISTINCT PROCURER) == 1
```

### Example (Valid)

| CS_ID | Procurer |
|-------|----------|
| CS001 | John Doe |
| CS001 | John Doe |
| CS001 | John Doe |

Result

```
PASS
```

### Example (Invalid)

| CS_ID | Procurer |
|-------|----------|
| CS001 | John Doe |
| CS001 | Jane Smith |
| CS001 | John Doe |

Result

```
FAIL
```

### Error Message

```
Multiple procurers found for the same CS.
```

Severity

```
Error
```

---

# Rule 14 — Minimum CS Value Selection (Per Item)

### Description

Each item within a CS should be awarded to the supplier with the **minimum quoted value** (Min_CS_Value), unless procurement policy explicitly allows an override.

The validation is performed for every item, but reported at the CS level.

### Validation Logic

For every Item

```
Selected Supplier Price

==

Minimum Supplier Price
```

Example

| Item | Supplier A | Supplier B | Supplier C | Selected |
|------|-----------:|-----------:|-----------:|----------|
| Laptop | 52,000 | 49,000 | 50,500 | Supplier B |

```
PASS
```

Invalid

| Item | Supplier A | Supplier B | Supplier C | Selected |
|------|-----------:|-----------:|-----------:|----------|
| Laptop | 52,000 | 49,000 | 50,500 | Supplier A |

```
FAIL
```

### Error Message

```
One or more items are not awarded to the minimum quoted supplier.
```

Severity

```
Error
```

---

# Rule 15 — CS Validation Aggregation

### Description

CS validation is determined by aggregating the validation results of all items.

The validator evaluates every item under a CS.

If **any item** violates a critical business rule, the **entire CS is marked as Failed**.

### Validation Logic

```
FOR EACH ITEM

    Run Item Validation

IF Any Item Fails

    CS Status = Validation Failed

ELSE

    CS Status = Validation Passed
```

Example

```
CS-1001

Item 1

PASS

Item 2

PASS

Item 3

FAIL

Item 4

PASS
```

Overall Result

```
CS Status

FAILED
```

---

# Rule 16 — CS Summary Validation

The CS List page should display only the overall validation status.

Example

| CS_ID | Status | Errors | Warnings |
|--------|--------|--------|----------|
| CS001 | Passed | 0 | 1 |
| CS002 | Failed | 2 | 1 |
| CS003 | Passed | 0 | 0 |

The summary does **not** display item-specific violations.

---

# Rule 17 — Drill-Down Validation Details

Selecting a CS opens the detailed validation report.

Example

```
CS002

Validation Summary

Errors: 2

Warnings: 1

--------------------------------

Item 4

×

Selected supplier is not the minimum quoted supplier.

--------------------------------

Item 9

×

Missing selected supplier.

--------------------------------

Item 12

⚠

Supplier C did not submit a quotation.
```

Only after opening the CS are individual item violations displayed.

---

# Validation Decision Rule

A CS is considered **Valid** only when:

- Exactly one Procurer exists for the CS.
- The CS Number is unique.
- The associated Requisition is valid.
- The required number of suppliers exists.
- Every requisition item is present in the CS.
- Every item has exactly one selected supplier.
- Every selected supplier corresponds to the minimum quoted value for that item (unless an approved override exists).
- The calculated CS total matches the stored CS Main Value.
- Required approvals are complete.
- No item-level critical validation failures exist.

If **one or more items** fail any critical validation, the **entire CS is flagged as "Validation Failed"**, while the specific item violations are available only in the CS detail view.
