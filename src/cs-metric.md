# Supplier Recommendation & CS Validation Scoring Engine

## Objective

Build a historical data-driven supplier recommendation engine for Comparative Statement (CS) validation.

The objective is **not** to always recommend the lowest-priced supplier. Instead, the model should recommend the supplier that procurement professionals would most likely select by balancing current quotation competitiveness with historical supplier performance.

The engine should:

- Calculate a weighted score for every supplier for each item.
- Rank suppliers item-wise.
- Recommend the supplier with the highest score.
- Display individual metric scores.
- Explain why the selected supplier was recommended.
- Explain why the remaining suppliers were not selected.

---

# Data Sources

## Current CS File

Used for evaluating the current quotations.

### Columns Used

- ITEM_ID
- ITEM_NAME
- SUPPLIER_NAME_1 ... SUPPLIER_NAME_5
- UNIT_RATE_1 ... UNIT_RATE_5

---

## Historical Item Cycle Report

Used for evaluating historical supplier performance.

### Columns Used

- ITEM_ID
- ITEM_NAME
- SUPPLIER_NAME
- PO_DATE
- GRN_DATE
- PO_UNIT_RATE
- PO_AMOUNT
- PO_NO

---

# Overall Scoring Formula

```
Final Score =
Σ (Metric Score × Metric Weight)
```

| Metric | Weight |
|---------|--------|
| Current CS Price Competitiveness | 30 |
| Historical Win Rate | 15 |
| Delivery Performance | 10 |
| Price Consistency | 8 |
| Supplier Trust / Loyalty | 32 |
| Item Experience | 5 |

**Total Weight = 100**

---

# Metric 1: Current CS Price Competitiveness (30%)

## Purpose

Reward suppliers who quote lower prices in the current Comparative Statement.

## Columns Used

Current CS

- ITEM_ID
- UNIT_RATE

## Calculation

For every item,

```
Lowest Price =
Minimum(Unit Rate of all suppliers)
```

For every supplier,

```
Price Score =
(Lowest Price / Supplier Price) × 100
```

### Example

| Supplier | Unit Rate | Price Score |
|----------|----------:|------------:|
| A | 100 | 100.00 |
| B | 102 | 98.04 |
| C | 110 | 90.91 |

---

# Metric 2: Historical Win Rate (15%)

## Purpose

Measure how often the supplier was historically selected for the same item.

## Columns Used

Historical Data

- ITEM_ID
- SUPPLIER_NAME
- PO_NO

## Calculation

```
Supplier Wins =
Number of Purchase Orders received for the item
```

```
Total Item POs =
Total Purchase Orders for the item
```

```
Win Rate =
Supplier Wins / Total Item POs
```

```
Win Rate Score =
Win Rate × 100
```

### Example

Supplier won 40 out of 50 historical purchases.

```
Win Rate = 40 / 50 = 0.80

Win Rate Score = 80
```

---

# Metric 3: Delivery Performance (10%)

## Purpose

Reward suppliers who historically delivered items faster.

## Columns Used

Historical Data

- PO_DATE
- GRN_DATE
- ITEM_ID
- SUPPLIER_NAME

## Calculation

```
Delivery Days =
GRN_DATE − PO_DATE
```

```
Average Delivery =
Average(Delivery Days)
```

```
Fastest Average =
Lowest Average Delivery among suppliers
```

```
Delivery Score =
(Fastest Average / Supplier Average Delivery) × 100
```

Lower delivery days receive higher scores.

---

# Metric 4: Price Consistency (8%)

## Purpose

Reward suppliers whose prices remain stable over time.

## Columns Used

Historical Data

- ITEM_ID
- SUPPLIER_NAME
- PO_UNIT_RATE

## Calculation

```
Average Price =
Average(PO Unit Rate)
```

```
Price Variation =
Standard Deviation(PO Unit Rate)
```

```
Consistency =
Price Variation / Average Price
```

Lower consistency value indicates more stable pricing.

Suppliers with lower variation receive higher scores.

---

# Metric 5: Supplier Trust / Loyalty (32%)

## Purpose

Reward suppliers with a long and successful procurement relationship.

## Columns Used

Historical Data

- SUPPLIER_NAME
- PO_DATE
- PO_AMOUNT
- PO_NO

## Calculations

### Years Working

```
Years Working =
Last PO Date − First PO Date
```

### Total Purchase Orders

```
PO Count =
Count(PO_NO)
```

### Total Procurement Value

```
Total PO Amount =
Sum(PO_AMOUNT)
```

Normalize each component to a score between 0 and 100.

Then calculate

```
Trust Score =
40% × Years Working Score
+
30% × PO Count Score
+
30% × Total PO Amount Score
```

---

# Metric 6: Item Experience (5%)

## Purpose

Reward suppliers who have supplied the same item many times.

## Columns Used

Historical Data

- ITEM_ID
- SUPPLIER_NAME

## Calculation

```
Supplier Item Count =
Number of Purchase Orders for the item
```

```
Highest Item Count =
Maximum Purchase Order count among all suppliers
```

```
Experience Score =
(Supplier Item Count /
Highest Item Count) × 100
```

---

# Final Supplier Score

```
Final Score =
(Current Price Score × 30%)
+
(Historical Win Rate Score × 15%)
+
(Delivery Score × 10%)
+
(Price Consistency Score × 8%)
+
(Supplier Trust Score × 32%)
+
(Item Experience Score × 5%)
```

---

# Ranking Process

For every item in the current CS:

1. Calculate all six metric scores for every supplier.
2. Apply the corresponding weights.
3. Calculate the Final Score.
4. Rank suppliers from highest to lowest.
5. Recommend the supplier with the highest Final Score.

---

# Explainability

For every supplier, display:

- Current Price Score
- Historical Win Rate Score
- Delivery Performance Score
- Price Consistency Score
- Supplier Trust Score
- Item Experience Score
- Final Weighted Score
- Rank

### Recommended Supplier

Generate reasons such as:

- Lowest or near-lowest quotation in the current CS.
- Strong historical selection rate for this item.
- Fast historical delivery performance.
- Stable historical pricing.
- Long-term trusted supplier with significant procurement history.
- Extensive experience supplying the same item.

### Non-Recommended Suppliers

Generate reasons such as:

- Higher quotation than competing suppliers.
- Lower historical win rate.
- Slower average delivery.
- Greater price fluctuations.
- Shorter procurement relationship.
- Less historical experience supplying the item.

This provides a transparent and explainable recommendation process for procurement officers during Comparative Statement (CS) validation.