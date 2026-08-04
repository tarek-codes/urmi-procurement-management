# CS Supplier Evaluation & Validation Metrics Guide

This guide explains the **6-Metric Supplier Evaluation System** used in Comparative Statement (CS) Validation. 

It helps procurement teams move beyond looking solely at the cheapest initial quote by balancing current prices with historical supplier performance, relationship trust, price stability, and delivery speed.

---

## 📊 Summary of Metrics & Weight Breakdown

The **Total Composite Score** is calculated out of **100 points** across 6 weighted evaluation criteria:

| # | Evaluation Metric | Weight | Max Points | Core Focus |
|---|---|---|---|---|
| 1 | **Current Price** | **30%** | **30.00 pts** | Compares current unit rates against the lowest quote offered |
| 2 | **Supplier Trust & Loyalty** | **20%** | **20.00 pts** | Long-term organizational relationship, total spend & PO history |
| 3 | **Price Consistency** | **15%** | **15.00 pts** | Historical price stability across past purchase orders |
| 4 | **Item Experience** | **15%** | **15.00 pts** | Historical experience supplying this specific line item |
| 5 | **Historical Win Rate** | **10%** | **10.00 pts** | Selection frequency for this item in past procurement cycles |
| 6 | **Delivery Speed** | **10%** | **10.00 pts** | Average delivery lead-time performance from past POs |
| **TOTAL** | **Composite Score** | **100%** | **100.00 pts** | **Overall Supplier Recommendation Score** |

---

## 🧮 How Each Metric is Calculated

### 1. Current Price Score (30% Weight / Max 30 Points)
* **Purpose**: Measures how competitive the supplier's current quoted unit rate is compared to the lowest quote submitted for this CS item.
* **Formula**:
  $$\text{Price Score (out of 100)} = \left( \frac{\text{Lowest Current Quote}}{\text{Supplier Quoted Rate}} \right) \times 100$$
  $$\text{Weighted Contribution} = \text{Price Score} \times 0.30$$
* **Example**: If the lowest quote is **$100.00** and a supplier quotes **$105.00**:
  $$\text{Score} = \left( \frac{100}{105} \right) \times 100 = 95.24 \quad \longrightarrow \quad \mathbf{28.57 \text{ / 30 pts}}$$

---

### 2. Supplier Trust & Loyalty Score (20% Weight / Max 20 Points)
* **Purpose**: Evaluates organizational relationship strength, long-term tenure, total past procurement spend, and order volume.
* **Formula**: Evaluated across 3 historical factors:
  - **Tenure (40%)**: Years working together relative to top supplier.
  - **Order Volume (30%)**: Total PO count relative to top supplier.
  - **Procurement Spend (30%)**: Total monetary spend relative to top supplier.
  $$\text{Trust Score (out of 100)} = 0.40(\text{Tenure Score}) + 0.30(\text{PO Count Score}) + 0.30(\text{Spend Score})$$
  $$\text{Weighted Contribution} = \text{Trust Score} \times 0.20$$
* **Example**: A supplier with a **78.50 / 100** trust rating gets:
  $$\mathbf{78.50} \times 0.20 = \mathbf{15.70 \text{ / 20 pts}}$$

---

### 3. Price Consistency Score (15% Weight / Max 15 Points)
* **Purpose**: Penalizes suppliers with high price volatility or sudden price spikes across historical orders.
* **Formula**: Based on the Coefficient of Variation ($CV = \frac{\text{Standard Deviation}}{\text{Mean Price}}$) across historical POs:
  $$\text{Consistency Score (out of 100)} = \left( 1 - \frac{CV}{\text{Max } CV \times 1.2} \right) \times 100$$
  $$\text{Weighted Contribution} = \text{Consistency Score} \times 0.15$$
* **Example**: A supplier with stable pricing scoring **92.40 / 100** gets:
  $$\mathbf{92.40} \times 0.15 = \mathbf{13.86 \text{ / 15 pts}}$$

---

### 4. Item Experience Score (15% Weight / Max 15 Points)
* **Purpose**: Evaluates how many times the supplier has successfully delivered this exact or similar item in historical POs.
* **Formula**:
  $$\text{Experience Score (out of 100)} = \left( \frac{\text{Supplier Item PO Count}}{\text{Highest Supplier Item PO Count}} \right) \times 100$$
  $$\text{Weighted Contribution} = \text{Experience Score} \times 0.15$$
* **Example**: If a supplier has **8 past POs** for an item and the top supplier has **10**:
  $$\text{Experience Score} = \left( \frac{8}{10} \right) \times 100 = 80.00 \quad \longrightarrow \quad \mathbf{12.00 \text{ / 15 pts}}$$

---

### 5. Historical Win Rate Score (10% Weight / Max 10 Points)
* **Purpose**: Measures how frequently this supplier won contracts for this item in past CS evaluations.
* **Formula**:
  $$\text{Win Rate Score (out of 100)} = \left( \frac{\text{Supplier Winning POs for Item}}{\text{Total Historical POs for Item}} \right) \times 100$$
  $$\text{Weighted Contribution} = \text{Win Rate Score} \times 0.10$$
* **Example**: A supplier with a **45.00%** win rate gets:
  $$\mathbf{45.00} \times 0.10 = \mathbf{4.50 \text{ / 10 pts}}$$

---

### 6. Delivery Speed Score (10% Weight / Max 10 Points)
* **Purpose**: Rewards suppliers with fast, dependable historical delivery lead times.
* **Formula**:
  $$\text{Delivery Score (out of 100)} = \left( \frac{\text{Fastest Historical Average Delivery Days}}{\text{Supplier Average Delivery Days}} \right) \times 100$$
  $$\text{Weighted Contribution} = \text{Delivery Score} \times 0.10$$
* **Example**: A supplier scoring **85.00 / 100** on delivery speed gets:
  $$\mathbf{85.00} \times 0.10 = \mathbf{8.50 \text{ / 10 pts}}$$

---

## 🏆 Final Composite Score Calculation

To get the **Total Composite Score (out of 100)**, sum the 6 weighted scores directly:

$$\begin{aligned}
\text{Total Composite Score} &= \text{Current Price (out of 30)} \\
&+ \text{Trust \& Loyalty (out of 20)} \\
&+ \text{Price Consistency (out of 15)} \\
&+ \text{Item Experience (out of 15)} \\
&+ \text{Historical Win Rate (out of 10)} \\
&+ \text{Delivery Speed (out of 10)}
\end{aligned}$$

### 💡 Example Calculation Breakdown

| Metric | Score / 100 | Weight | Score Contribution |
|---|---|---|---|
| Current Price | 95.24 | 30% | **28.57 / 30** |
| Supplier Trust & Loyalty | 78.50 | 20% | **15.70 / 20** |
| Price Consistency | 92.40 | 15% | **13.86 / 15** |
| Item Experience | 80.00 | 15% | **12.00 / 15** |
| Historical Win Rate | 45.00 | 10% | **4.50 / 10** |
| Delivery Speed | 85.00 | 10% | **8.50 / 10** |
| **FINAL TOTAL COMPOSITE SCORE** | | | **83.13 / 100** |

---

## 📌 Special Recommendation Displays

1. **Multiple Suppliers (2+ Suppliers)**:
   - Evaluates all suppliers across the 6 metrics.
   - The supplier with the **highest Total Composite Score (out of 100)** is tagged as **`💡 RECOMMENDED SUPPLIER`**.
2. **Single Supplier (1 Supplier)**:
   - Displays **`ℹ️ Sole Bidder Offered`** with a notice: *"Single supplier quote available — no competitive comparison required."*
3. **Zero Suppliers (0 Suppliers)**:
   - Displays **`⚠️ No supplier has quoted for this item`**.
