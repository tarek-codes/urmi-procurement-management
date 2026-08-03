"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useHistorical } from "@/context/HistoricalContext";
import PaginationControls from "@/components/PaginationControls";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line, Pie, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function HistoricalDashboardPage() {
  const { analytics, isLoading, error, loadCustomFile, resetToDefaultDB, records } = useHistorical();
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Pagination state for Raw Records table (35k+ rows support)
  const [rawPage, setRawPage] = useState(1);
  const [rawPageSize, setRawPageSize] = useState(50);

  const paginatedRawRecords = React.useMemo(() => {
    const start = (rawPage - 1) * rawPageSize;
    return records.slice(start, start + rawPageSize);
  }, [records, rawPage, rawPageSize]);

  const rawTotalPages = Math.ceil(records.length / rawPageSize);


  if (isLoading) {
    return (
      <main className="page-container">
        <div className="spinner-container">
          <div className="spinner"></div>
          <div className="spinner-text">Loading Historical Database & Processing 18 Analytics...</div>
        </div>
      </main>
    );
  }

  if (error || !analytics) {
    return (
      <main className="page-container">
        <div className="error-alert">
          <span>{error || "Failed to load analytics"}</span>
        </div>
      </main>
    );
  }

  const formatCurr = (val: number) =>
    "$" + val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Chart Data Configurations ──────────────────────────────────────

  // 16. Spending Trend Line Chart
  const monthlyTrendChartData = {
    labels: analytics.monthlySpendingTrend.map((m) => m.monthYear),
    datasets: [
      {
        label: "PO Spend ($)",
        data: analytics.monthlySpendingTrend.map((m) => m.poAmount),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.1)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "Billed Amount ($)",
        data: analytics.monthlySpendingTrend.map((m) => m.billAmount),
        borderColor: "#059669",
        backgroundColor: "rgba(5, 150, 105, 0.05)",
        fill: true,
        tension: 0.3,
      },
    ],
  };

  // 9. Supplier Concentration Pie Chart
  const topSuppliers = analytics.supplierConcentration.slice(0, 6);
  const supplierConcentrationChartData = {
    labels: topSuppliers.map((s) => s.supplierName),
    datasets: [
      {
        data: topSuppliers.map((s) => s.totalSpend),
        backgroundColor: [
          "#2563eb",
          "#3b82f6",
          "#60a5fa",
          "#93c5fd",
          "#bfdbfe",
          "#dbeafe",
        ],
        borderWidth: 1,
      },
    ],
  };

  // 8. Category Spending Bar Chart
  const categoryChartData = {
    labels: analytics.categorySpending.map((c) => c.category),
    datasets: [
      {
        label: "Total Spend ($)",
        data: analytics.categorySpending.map((c) => c.totalSpending),
        backgroundColor: "#2563eb",
        borderRadius: 6,
      },
    ],
  };

  // 4, 5, 14. Cycle & Lead Time Stage Bar Chart
  const cycleTimeChartData = {
    labels: ["REQ → PO", "PO → GRN (Supplier Lead Time)", "GRN → Bill", "Total Cycle"],
    datasets: [
      {
        label: "Days",
        data: [
          analytics.cycleTimeAnalysis.avgReqToPoDays,
          analytics.cycleTimeAnalysis.avgPoToGrnDays,
          analytics.cycleTimeAnalysis.avgGrnToBillDays,
          analytics.cycleTimeAnalysis.avgTotalCycleDays,
        ],
        backgroundColor: ["#3b82f6", "#d97706", "#059669", "#111827"],
        borderRadius: 6,
      },
    ],
  };

  // 18. Supplier Efficiency Grades Doughnut Chart
  const gradeCounts = {
    A: analytics.supplierEfficiencyScores.filter((s) => s.grade === "A").length,
    B: analytics.supplierEfficiencyScores.filter((s) => s.grade === "B").length,
    C: analytics.supplierEfficiencyScores.filter((s) => s.grade === "C").length,
    D: analytics.supplierEfficiencyScores.filter((s) => s.grade === "D").length,
    F: analytics.supplierEfficiencyScores.filter((s) => s.grade === "F").length,
  };
  const supplierGradesChartData = {
    labels: ["Grade A (90-100)", "Grade B (80-89)", "Grade C (70-79)", "Grade D (60-69)", "Grade F (<60)"],
    datasets: [
      {
        data: [gradeCounts.A, gradeCounts.B, gradeCounts.C, gradeCounts.D, gradeCounts.F],
        backgroundColor: ["#059669", "#2563eb", "#d97706", "#f97316", "#dc2626"],
        borderWidth: 1,
      },
    ],
  };

  // 10. Item Purchase Frequency Bar Chart
  const itemFrequencyChartData = {
    labels: analytics.purchaseFrequency.slice(0, 6).map((f) => f.itemName),
    datasets: [
      {
        label: "Number of Orders",
        data: analytics.purchaseFrequency.slice(0, 6).map((f) => f.purchaseCount),
        backgroundColor: "#059669",
        borderRadius: 6,
      },
    ],
  };

  return (
    <main className="page-container">
      {/* Header & Breadcrumb */}
      <div style={{ marginBottom: "var(--space-md)" }}>
        <Link href="/" className="back-link" style={{ marginBottom: 0 }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Platform Hub
        </Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "var(--space-xl)" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Historical Data Dashboard
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            Procurement Analytics & Data Visualizations (300 Database Records)
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <label className="btn-clear" style={{ cursor: "pointer" }}>
            📁 Load Custom DB
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) loadCustomFile(f);
              }}
              style={{ display: "none" }}
            />
          </label>
          <button className="btn-reset-filters" onClick={resetToDefaultDB}>
            🔄 Reset DB
          </button>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="summary-grid" style={{ marginBottom: "var(--space-xl)" }}>
        <div className="summary-card">
          <div className="summary-card-label">Total Spend (PO)</div>
          <div className="summary-card-value">{formatCurr(analytics.totalPOAmount)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Price Savings Lost</div>
          <div className="summary-card-value error">{formatCurr(analytics.savingsAnalysis.totalSavingsLost)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Fulfillment Rate</div>
          <div className="summary-card-value success">{analytics.avgQuantityFulfillment}%</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Avg Lead Time</div>
          <div className="summary-card-value">{analytics.avgLeadTimeDays} Days</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="table-filters" style={{ marginBottom: "var(--space-lg)", flexWrap: "wrap" }}>
        <button
          className={`filter-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview & Savings
        </button>
        <button
          className={`filter-btn ${activeTab === "suppliers" ? "active" : ""}`}
          onClick={() => setActiveTab("suppliers")}
        >
          Supplier Performance & Efficiency
        </button>
        <button
          className={`filter-btn ${activeTab === "cycle" ? "active" : ""}`}
          onClick={() => setActiveTab("cycle")}
        >
          Cycle & Lead Times
        </button>
        <button
          className={`filter-btn ${activeTab === "category" ? "active" : ""}`}
          onClick={() => setActiveTab("category")}
        >
          Categories & Spend
        </button>
        <button
          className={`filter-btn ${activeTab === "raw" ? "active" : ""}`}
          onClick={() => setActiveTab("raw")}
        >
          Database Table
        </button>
      </div>

      {/* TAB 1: OVERVIEW & SAVINGS */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
          {/* 16. Monthly Spending Trend Line Chart */}
          <div className="summary-card">
            <div className="section-title">
              <span style={{ fontSize: "18px" }}>16. Spending Trend Analysis (Monthly Chart & Table)</span>
            </div>
            <div style={{ height: "260px", marginBottom: "var(--space-lg)" }}>
              <Line
                data={monthlyTrendChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "top" } },
                }}
              />
            </div>

            <div className="table-wrapper">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th style={{ textAlign: "right" }}>PO Spend</th>
                    <th style={{ textAlign: "right" }}>Billed Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.monthlySpendingTrend.map((m, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{m.monthYear}</td>
                      <td style={{ textAlign: "right" }}>{formatCurr(m.poAmount)}</td>
                      <td style={{ textAlign: "right" }}>{formatCurr(m.billAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 1. Purchase Price Savings Analysis */}
          <div className="summary-card">
            <div className="section-title">
              <span style={{ fontSize: "18px" }}>1. Purchase Price Savings Analysis</span>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "var(--space-md)" }}>
              Identifies instances where CS price exceeded PO price or where lower quotations existed, calculating total savings lost.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-md)", marginBottom: "var(--space-md)" }}>
              <div style={{ background: "var(--bg-subtle)", padding: "12px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Potential Savings Lost</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--error)" }}>
                  {formatCurr(analytics.savingsAnalysis.totalSavingsLost)}
                </div>
              </div>
              <div style={{ background: "var(--bg-subtle)", padding: "12px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Affected Purchase Lines</div>
                <div style={{ fontSize: "20px", fontWeight: 700 }}>
                  {analytics.savingsAnalysis.recordsWithSavingsLost} / {analytics.totalRecords}
                </div>
              </div>
              <div style={{ background: "var(--bg-subtle)", padding: "12px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Fulfillment Success Rate</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--success)" }}>
                  {analytics.reqToDeliverySuccess.successRatePct}%
                </div>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Supplier</th>
                    <th style={{ textAlign: "right" }}>Potential Savings Lost</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.savingsAnalysis.topSavingsLostItems.map((item, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{item.itemName}</td>
                      <td>{item.supplier}</td>
                      <td style={{ textAlign: "right", color: "var(--error)", fontWeight: 700 }}>
                        {formatCurr(item.savingsLost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2 & 13. Quantity Utilization & Delivery Success */}
          <div className="summary-card">
            <div className="section-title">
              <span style={{ fontSize: "18px" }}>2 & 13. Quantity Utilization & Delivery Success Rate</span>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "var(--space-md)" }}>
              Measures requested vs. ordered vs. received vs. billed quantity conversion efficiency.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-md)" }}>
              <div style={{ background: "var(--bg-subtle)", padding: "12px", borderRadius: "8px", textWrap: "nowrap" }}>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>REQ → PO Conversion</div>
                <div style={{ fontSize: "20px", fontWeight: 700 }}>{analytics.quantityUtilization.avgReqToPoPct}%</div>
              </div>
              <div style={{ background: "var(--bg-subtle)", padding: "12px", borderRadius: "8px", textWrap: "nowrap" }}>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>PO → GRN Delivery</div>
                <div style={{ fontSize: "20px", fontWeight: 700 }}>{analytics.quantityUtilization.avgPoToGrnPct}%</div>
              </div>
              <div style={{ background: "var(--bg-subtle)", padding: "12px", borderRadius: "8px", textWrap: "nowrap" }}>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>GRN → Bill Accuracy</div>
                <div style={{ fontSize: "20px", fontWeight: 700 }}>{analytics.quantityUtilization.avgGrnToBillPct}%</div>
              </div>
              <div style={{ background: "var(--bg-subtle)", padding: "12px", borderRadius: "8px", textWrap: "nowrap" }}>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Overall Fulfillment</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--success)" }}>
                  {analytics.quantityUtilization.overallFulfillmentPct}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUPPLIERS & EFFICIENCY */}
      {activeTab === "suppliers" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-lg)" }}>
            {/* 9. Supplier Concentration Pie Chart */}
            <div className="summary-card">
              <div className="section-title">
                <span style={{ fontSize: "16px" }}>9. Supplier Concentration (Pie Chart)</span>
              </div>
              <div style={{ height: "240px" }}>
                <Pie
                  data={supplierConcentrationChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "right" } },
                  }}
                />
              </div>
            </div>

            {/* 18. Supplier Grades Doughnut Chart */}
            <div className="summary-card">
              <div className="section-title">
                <span style={{ fontSize: "16px" }}>18. Supplier Grade Distribution (Doughnut)</span>
              </div>
              <div style={{ height: "240px" }}>
                <Doughnut
                  data={supplierGradesChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "right" } },
                  }}
                />
              </div>
            </div>
          </div>

          {/* 18. Procurement Efficiency Score per Supplier */}
          <div className="summary-card">
            <div className="section-title">
              <span style={{ fontSize: "18px" }}>18 & 3. Procurement Efficiency Score & Supplier Performance</span>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "var(--space-md)" }}>
              Evaluates each supplier based on delivery fulfillment (40%), lead time adherence (30%), and price competitiveness (30%).
            </p>
            <div className="table-wrapper">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Supplier Name</th>
                    <th>Grade</th>
                    <th style={{ textAlign: "right" }}>Efficiency Score</th>
                    <th style={{ textAlign: "right" }}>Fulfillment %</th>
                    <th style={{ textAlign: "right" }}>Lead Time Score</th>
                    <th style={{ textAlign: "right" }}>Price Score</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.supplierEfficiencyScores.map((s, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{s.supplierName}</td>
                      <td>
                        <span
                          className={`count-badge ${
                            s.grade === "A"
                              ? "zero"
                              : s.grade === "B"
                              ? "warning-count"
                              : "error-count"
                          }`}
                          style={{ fontSize: "12px", width: "24px", height: "24px" }}
                        >
                          {s.grade}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{s.score} / 100</td>
                      <td style={{ textAlign: "right" }}>{s.fulfillmentScore}%</td>
                      <td style={{ textAlign: "right" }}>{s.leadTimeScore}/100</td>
                      <td style={{ textAlign: "right" }}>{s.priceScore}/100</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 12. Supplier Price Consistency */}
          <div className="summary-card">
            <div className="section-title">
              <span style={{ fontSize: "18px" }}>12. Supplier Price Consistency</span>
            </div>
            <div className="table-wrapper">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Item Name</th>
                    <th style={{ textAlign: "right" }}>Min Rate</th>
                    <th style={{ textAlign: "right" }}>Max Rate</th>
                    <th style={{ textAlign: "right" }}>Variance %</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.priceConsistency.map((p, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{p.supplierName}</td>
                      <td>{p.itemName}</td>
                      <td style={{ textAlign: "right" }}>{formatCurr(p.minRate)}</td>
                      <td style={{ textAlign: "right" }}>{formatCurr(p.maxRate)}</td>
                      <td style={{ textAlign: "right", color: p.variancePct > 10 ? "var(--error)" : "inherit", fontWeight: 700 }}>
                        {p.variancePct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CYCLE & LEAD TIMES */}
      {activeTab === "cycle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
          {/* 4, 5, 14. Cycle & Lead Time Bar Chart */}
          <div className="summary-card">
            <div className="section-title">
              <span style={{ fontSize: "18px" }}>4, 5 & 14. Procurement Bottleneck & Stage Durations (Bar Chart)</span>
            </div>
            <div style={{ height: "260px", marginBottom: "var(--space-lg)" }}>
              <Bar
                data={cycleTimeChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-md)" }}>
              <div style={{ background: "var(--bg-subtle)", padding: "12px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>REQ → PO Stage</div>
                <div style={{ fontSize: "20px", fontWeight: 700 }}>{analytics.cycleTimeAnalysis.avgReqToPoDays} Days</div>
              </div>
              <div style={{ background: "var(--bg-subtle)", padding: "12px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>PO → GRN (Supplier Lead Time)</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--warning)" }}>
                  {analytics.cycleTimeAnalysis.avgPoToGrnDays} Days
                </div>
              </div>
              <div style={{ background: "var(--bg-subtle)", padding: "12px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>GRN → Bill Stage</div>
                <div style={{ fontSize: "20px", fontWeight: 700 }}>{analytics.cycleTimeAnalysis.avgGrnToBillDays} Days</div>
              </div>
              <div style={{ background: "var(--bg-subtle)", padding: "12px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Total Avg Cycle Time</div>
                <div style={{ fontSize: "20px", fontWeight: 700 }}>{analytics.cycleTimeAnalysis.avgTotalCycleDays} Days</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CATEGORY & PURCHASES */}
      {activeTab === "category" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
          {/* 8. Category-wise Spending Bar Chart */}
          <div className="summary-card">
            <div className="section-title">
              <span style={{ fontSize: "18px" }}>8 & 17. Category-wise Spending Analysis (Bar Chart & Table)</span>
            </div>
            <div style={{ height: "260px", marginBottom: "var(--space-lg)" }}>
              <Bar
                data={categoryChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                }}
              />
            </div>
            <div className="table-wrapper">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th style={{ textAlign: "right" }}>Order Lines</th>
                    <th style={{ textAlign: "right" }}>Total PO Spending</th>
                    <th style={{ textAlign: "right" }}>Avg Purchase Value</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.categorySpending.map((c, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{c.category}</td>
                      <td style={{ textAlign: "right" }}>{c.orderCount}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{formatCurr(c.totalSpending)}</td>
                      <td style={{ textAlign: "right" }}>{formatCurr(c.avgPurchaseValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 10. Item Purchase Frequency Bar Chart */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-lg)" }}>
            <div className="summary-card">
              <div className="section-title">
                <span style={{ fontSize: "16px" }}>10. Frequent Items (Bar Chart)</span>
              </div>
              <div style={{ height: "220px", marginBottom: "var(--space-md)" }}>
                <Bar
                  data={itemFrequencyChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                  }}
                />
              </div>
            </div>

            <div className="summary-card">
              <div className="section-title">
                <span style={{ fontSize: "16px" }}>11. TS ID Analysis</span>
              </div>
              <div className="table-wrapper">
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>TS ID</th>
                      <th style={{ textAlign: "right" }}>Purchases</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.tsAnalysis.map((t, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, color: "var(--accent)" }}>TS-{t.tsId}</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>{t.purchaseCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DATABASE TABLE */}
      {activeTab === "raw" && (
        <div className="summary-card">
          <div className="section-title">
            <span>Historical Database Records ({records.length.toLocaleString()})</span>
          </div>
          <div className="table-wrapper">
            <table className="cs-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Company</th>
                  <th>Item Name</th>
                  <th>Supplier</th>
                  <th>REQ Qty</th>
                  <th>PO Qty</th>
                  <th>GRN Qty</th>
                  <th>PO Amount</th>
                  <th>Bill Amount</th>
                  <th>Anomaly</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRawRecords.map((r, i) => (
                  <tr key={i}>
                    <td>{r.slNo}</td>
                    <td>{r.company}</td>
                    <td style={{ fontWeight: 600 }}>{r.itemName}</td>
                    <td>{r.supplierName}</td>
                    <td>{r.reqQty}</td>
                    <td>{r.poQty}</td>
                    <td>{r.grnQty}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurr(r.poAmount)}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurr(r.billAmount)}</td>
                    <td>
                      {r.overallAnomalyFlag === "Yes" ? (
                        <span className="status-badge failed">
                          <span className="status-dot"></span> Yes
                        </span>
                      ) : (
                        <span className="status-badge passed">
                          <span className="status-dot"></span> No
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationControls
              currentPage={rawPage}
              totalPages={rawTotalPages}
              pageSize={rawPageSize}
              totalItems={records.length}
              onPageChange={setRawPage}
              onPageSizeChange={setRawPageSize}
              pageSizeOptions={[25, 50, 100, 250, 500]}
            />
          </div>
        </div>
      )}
    </main>
  );
}
