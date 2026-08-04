# Flop Purchase Analyzer Metric Guide

This guide explains the **Flop Purchase Analyzer Engine**, which cross-references active **Comparative Statements (CS)** against historical **Item Cycle Reports (REQ → PO → GRN → Bill)** to detect sub-optimal procurement decisions, price overrides, and historical supplier underperformance.

---

## 📊 Summary of Core Analysis Objectives

The Flop Purchase Analyzer evaluates active CS files against full lifecycle historical data to detect:

| # | Analysis Category | Focus & Objective | Detection Criteria |
|---|---|---|---|
| 1 | **Price Override Flops** | Identifies items where a higher unit rate was selected over a lower valid quote. | Quoted Unit Rate > Lowest Available Quote |
| 2 | **Low-Grade Supplier Flops** | Identifies items assigned to historically underperforming suppliers. | Selected Supplier Grade = **Grade F** |
| 3 | **Potential Savings Loss** | Calculates exact money lost due to non-optimal supplier selection. | $\text{Qty} \times (\text{Selected Rate} - \text{Lowest Rate})$ |
| 4 | **Supplier Lifecycle Rating** | Evaluates supplier performance across historical REQ, PO, GRN & Bill cycles. | Composite Rating (0–100) & Grade A–F |

---

## 🧮 How Supplier Historical Ratings Are Calculated

The analyzer evaluates every supplier in the **Historical Item Cycle Database** across 4 core lifecycle operational metrics to assign an overall **Historical Performance Grade (A, B, C, D, F)**:

### 1. Order Fulfillment Rate (40% Weight / Max 40 Points)
* **Purpose**: Measures quantity reliability by comparing Goods Received Note (GRN) quantities against Requisition (REQ) quantities.
* **Formula**:
  $$\text{Fulfillment Rate (\%)} = \left( \frac{\text{Total GRN Quantity}}{\text{Total REQ Quantity}} \right) \times 100$$
  $$\text{Score Contribution} = \left( \frac{\text{Fulfillment Rate}}{100} \right) \times 40$$

---

### 2. Average Lead-Time Speed (30% Weight / Max 30 Points)
* **Purpose**: Evaluates delivery speed from Purchase Order (PO) issue date to GRN receipt date.
* **Formula & Score Bands**:
  $$\text{Average Lead Time (Days)} = \frac{\sum (\text{GRN Date} - \text{PO Date})}{\text{Total Orders}}$$
  - **$< 15 \text{ Days}$**: **30.00 pts** (Fastest delivery)
  - **$15 - 16 \text{ Days}$**: **24.00 pts**
  - **$17 - 18 \text{ Days}$**: **16.00 pts**
  - **$\ge 19 \text{ Days}$**: **8.00 pts** (Slow delivery penalty)

---

### 3. On-Time & Full Delivery Rate (20% Weight / Max 20 Points)
* **Purpose**: Measures the percentage of orders delivered in full without short-shipments.
* **Formula**:
  $$\text{On-Time Delivery (\%)} = \left( \frac{\text{Total Full Deliveries}}{\text{Total PO Count}} \right) \times 100$$
  $$\text{Score Contribution} = \left( \frac{\text{On-Time Delivery (\%)}}{100} \right) \times 20$$

---

### 4. Historical Price Stability (10% Weight / Max 10 Points)
* **Purpose**: Penalizes post-CS price escalation (where PO rate exceeds CS rate).
* **Formula**:
  $$\text{Price Escalation (\%)} = \max\left(0, \frac{\text{PO Rate} - \text{CS Rate}}{\text{CS Rate}} \right) \times 100$$
  $$\text{Score Contribution} = \max\left(0, 10 - (\text{Price Escalation (\%)} \times 2)\right)$$

---

### 🏅 Grade Distribution Formula (Percentile Grading)
After calculating total composite scores ($0 - 100$), suppliers are ranked and assigned a Grade:

| Grade | Percentile Rank | Status & Meaning |
|---|---|---|
| **Grade A** | Top 25% | **Exceptional** — Fast delivery, 100% fulfillment, stable prices |
| **Grade B** | Next 30% (25% – 55%) | **Good** — Consistent performance with minor lead-time variance |
| **Grade C** | Next 25% (55% – 80%) | **Average** — Acceptable performance; occasional delays |
| **Grade D** | Next 12% (80% – 92%) | **Below Average** — Higher lead times or partial shipments |
| **Grade F** | Bottom 8% (92% – 100%) | **Unacceptable** — Severe delays, frequent short-shipments, or price spikes |

---

## 🚨 How Flop Purchases Are Flagged

An item line within a CS document is flagged as a **Flop Purchase** if it violates either of the following 2 rules:

### Rule 1: Price Override Flop
* **Condition**: The unit rate of the selected supplier is higher than the lowest valid quote available.
* **Formula**:
  $$\text{Price Difference per Unit} = \text{Selected Rate} - \text{Lowest Rate}$$
  $$\text{Potential Savings Lost} = \text{Price Difference per Unit} \times \text{Item Quantity}$$
* **Trigger**: Flagged if $\text{Price Difference} > \$0.01$.

---

### Rule 2: Low-Grade Supplier Flop (Grade F Selection)
* **Condition**: A supplier with an unacceptable historical performance rating (**Grade F**) is selected for procurement.
* **Trigger**: Flagged if $\text{Selected Supplier Grade} == \mathbf{\text{Grade F}}$.
* **Exemption**: Selecting a Grade D, C, B, or A supplier is acceptable as long as price criteria are met.

---

## 🚦 CS Document Severity Classification

Once all item lines in a CS document are analyzed, the CS document is assigned an overall **Flop Severity**:

| Severity Level | Trigger Condition | Visual Badge | Recommended Action |
|---|---|---|---|
| 🔴 **High Flop Severity** | Savings Lost $> \$5,000$ **OR** Flop Items $\ge 3$ | **HIGH** | Immediate Management Audit Required |
| 🟡 **Medium Flop Severity** | Savings Lost $> \$0$ **OR** Flop Items $\ge 1$ | **MEDIUM** | Procurer Review Recommended |
| 🟢 **Clean CS** | Savings Lost $= \$0$ **AND** Flop Items $= 0$ | **CLEAN** | Optimal Selection Verified |

---

## 💡 Recommendation & Alternative Supplier Selection Logic

When a supplier selection is flagged as a Flop, the analyzer automatically recommends the **Optimal Alternative Supplier**:

1. **Filtering**: Excludes Grade F suppliers from recommendation (unless all quotes are Grade F).
2. **Selection**: Recommends the supplier offering the **absolute lowest unit rate** among all non-Grade F bidders.
3. **Explanation Output Example**:
   > *Selected supplier "Supplier B" is flagged because price override: selected rate ($1,250.00) exceeds lowest quote ($1,050.00) by $200.00/unit. Recommended supplier "Supplier A" offers unit rate $1,050.00 with historical Grade A (12 days lead time).*
