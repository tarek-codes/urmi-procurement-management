"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { parseExcelFile } from "@/lib/excelParser";
import { parseHistoricalFile } from "@/lib/historicalParser";
import { analyzeBenfordLaw, NumberItem } from "@/lib/benfordAnalyzer";
import { BenfordAnalysisResult } from "@/lib/benfordTypes";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function FraudAnalyzerPage() {
  const [csFileName, setCsFileName] = useState<string | null>(null);
  const [histFileName, setHistFileName] = useState<string | null>(null);
  const [extractedNumbers, setExtractedNumbers] = useState<NumberItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle CS Excel Upload
  const handleCsUpload = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const docs = parseExcelFile(buffer);
      if (docs.length === 0) {
        throw new Error("No Comparative Statement records found.");
      }

      const items: NumberItem[] = [];
      docs.forEach((doc) => {
        if (doc.csMainValue) {
          items.push({
            amount: doc.csMainValue,
            label: `${doc.csNo} - Main Value`,
            context: `${doc.companyName} (${doc.procurers.join(", ")})`,
          });
        }
        doc.items.forEach((it) => {
          it.quotations.forEach((q) => {
            if (q.unitRate) {
              items.push({
                amount: q.unitRate,
                label: `${doc.csNo} - ${it.itemName} (${q.supplierName})`,
                context: `Unit Rate: $${q.unitRate}`,
              });
            }
            if (q.totalPrice) {
              items.push({
                amount: q.totalPrice,
                label: `${doc.csNo} - ${it.itemName} (${q.supplierName})`,
                context: `Total Price: $${q.totalPrice}`,
              });
            }
          });
        });
      });

      setExtractedNumbers(items);
      setCsFileName(file.name);
      setHistFileName(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to parse CS file.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Historical DB Upload
  const handleHistUpload = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const records = parseHistoricalFile(buffer);
      if (records.length === 0) {
        throw new Error("No historical records found.");
      }

      const items: NumberItem[] = [];
      records.forEach((r) => {
        if (r.csAmount) {
          items.push({
            amount: r.csAmount,
            label: `CS Amount - ${r.csNo}`,
            context: `${r.company} (${r.supplierName})`,
          });
        }
        if (r.poAmount) {
          items.push({
            amount: r.poAmount,
            label: `PO Amount - ${r.poNo}`,
            context: `${r.company} (${r.supplierName})`,
          });
        }
        if (r.billAmount) {
          items.push({
            amount: r.billAmount,
            label: `Bill Amount - ${r.billNo}`,
            context: `${r.company} (${r.supplierName})`,
          });
        }
      });

      setExtractedNumbers(items);
      setHistFileName(file.name);
      setCsFileName(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to parse Item Cycle Report.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-load Stored DB for Instant Benford Fraud Audit
  const loadStoredDbBenford = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const res = await fetch("/api/historical-db");
      if (!res.ok) throw new Error("Failed to fetch stored database.");
      const buffer = await res.arrayBuffer();
      const records = parseHistoricalFile(buffer);

      const items: NumberItem[] = [];
      records.forEach((r) => {
        if (r.csAmount) {
          items.push({
            amount: r.csAmount,
            label: `CS Amount - ${r.csNo}`,
            context: `${r.company} (${r.supplierName})`,
          });
        }
        if (r.poAmount) {
          items.push({
            amount: r.poAmount,
            label: `PO Amount - ${r.poNo}`,
            context: `${r.company} (${r.supplierName})`,
          });
        }
        if (r.billAmount) {
          items.push({
            amount: r.billAmount,
            label: `Bill Amount - ${r.billNo}`,
            context: `${r.company} (${r.supplierName})`,
          });
        }
      });

      setExtractedNumbers(items);
      setHistFileName("Previous_Item_Cycle_Report_Historical_DB_Data.xlsx (Stored DB)");
      setCsFileName(null);
    } catch (err: any) {
      setError("Failed to load stored DB for Benford analysis.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Run Benford Analysis
  const benfordResult: BenfordAnalysisResult | null = useMemo(() => {
    if (extractedNumbers.length === 0) return null;
    return analyzeBenfordLaw(extractedNumbers);
  }, [extractedNumbers]);

  // Chart Data
  const chartData = useMemo(() => {
    if (!benfordResult) return null;
    return {
      labels: benfordResult.digitStats.map((d) => `Digit ${d.digit}`),
      datasets: [
        {
          label: "Observed Frequency (%)",
          data: benfordResult.digitStats.map((d) => d.observedPct),
          backgroundColor: benfordResult.isPotentialForgery ? "#dc2626" : "#2563eb",
          borderRadius: 4,
        },
        {
          label: "Benford's Law Expected (%)",
          data: benfordResult.digitStats.map((d) => d.expectedPct),
          backgroundColor: "#94a3b8",
          borderRadius: 4,
        },
      ],
    };
  }, [benfordResult]);

  const formatCurr = (val: number) =>
    "$" + val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <main className="page-container">
      {/* Header Breadcrumb */}
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

      {/* Title Header */}
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.02em" }}>
          Fraud Analyzer — Benford's Law Audit
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
          Detect financial data forgery, artificial price rounding, and fraudulent bid manipulations using leading-digit logarithmic probability analysis.
        </p>
      </div>

      {/* Upload Box */}
      {extractedNumbers.length === 0 && !isProcessing && (
        <div className="upload-zone" style={{ marginBottom: "var(--space-xl)" }}>
          <div className="upload-icon">🛡️</div>
          <div className="upload-title">Upload File to Audit for Data Forgery</div>
          <div className="upload-subtitle">
            Upload either a Comparative Statement Excel file (<code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: "4px" }}>CS_Excel_Updated.xlsx</code>) or an Item Cycle Report (<code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: "4px" }}>Previous_Item_Cycle_Report_Historical_DB_Data.xlsx</code>) to run instant Benford distribution audit.
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginTop: "var(--space-md)" }}>
            <label className="btn-upload" style={{ cursor: "pointer" }}>
              Upload CS Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleCsUpload(f);
                }}
                style={{ display: "none" }}
              />
            </label>
            <label className="btn-upload" style={{ cursor: "pointer", background: "var(--bg-subtle)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
              Upload Item Cycle Report
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleHistUpload(f);
                }}
                style={{ display: "none" }}
              />
            </label>
            <button className="btn-clear" onClick={loadStoredDbBenford} style={{ padding: "10px 18px" }}>
              ⚡ Audit Stored DB File
            </button>
          </div>
        </div>
      )}

      {/* Spinner */}
      {isProcessing && (
        <div className="spinner-container">
          <div className="spinner"></div>
          <div className="spinner-text">Extracting financial figures & calculating Benford Chi-Square distribution…</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="error-alert">
          <span>{error}</span>
        </div>
      )}

      {/* Results View */}
      {benfordResult && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
          {/* File Bar */}
          <div className="file-info-bar">
            <div className="file-info-left">
              🛡️ Audited File: <strong>{csFileName || histFileName}</strong> ({benfordResult.totalNumbersAnalyzed} financial numbers analyzed)
            </div>
            <button
              className="btn-clear"
              onClick={() => {
                setExtractedNumbers([]);
                setCsFileName(null);
                setHistFileName(null);
              }}
            >
              Audit Another File
            </button>
          </div>

          {/* Verdict Banner */}
          <div
            className="summary-card"
            style={{
              borderColor: benfordResult.isPotentialForgery ? "var(--error)" : "var(--success)",
              background: benfordResult.isPotentialForgery ? "#fef2f2" : "#f0fdf4",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-sm)" }}>
              <div style={{ fontSize: "18px", fontWeight: 700, color: benfordResult.isPotentialForgery ? "var(--error)" : "var(--success)" }}>
                {benfordResult.isPotentialForgery ? "⚠️ WARNING: Potential Data Forgery Detected" : "✅ PASSED: Data Follows Natural Benford Distribution"}
              </div>
              <span
                className={`status-badge ${benfordResult.isPotentialForgery ? "failed" : "passed"}`}
                style={{ fontSize: "13px", padding: "6px 12px" }}
              >
                {benfordResult.conformityLevel}
              </span>
            </div>

            <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.6", marginBottom: "var(--space-md)" }}>
              {benfordResult.anomalyDescription}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-md)" }}>
              <div style={{ background: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Chi-Square Statistic</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: benfordResult.chiSquareStat > 15.51 ? "var(--error)" : "var(--text-primary)" }}>
                  {benfordResult.chiSquareStat}
                </div>
              </div>
              <div style={{ background: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Critical Boundary (df=8, α=0.05)</div>
                <div style={{ fontSize: "20px", fontWeight: 700 }}>15.51</div>
              </div>
              <div style={{ background: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Total Data Sample</div>
                <div style={{ fontSize: "20px", fontWeight: 700 }}>{benfordResult.totalNumbersAnalyzed} Figures</div>
              </div>
            </div>
          </div>

          {/* Benford Bar Chart Comparison */}
          {chartData && (
            <div className="summary-card">
              <div className="section-title">
                <span style={{ fontSize: "18px" }}>Leading Digit Distribution vs. Benford's Law</span>
              </div>
              <div style={{ height: "280px", marginBottom: "var(--space-md)" }}>
                <Bar
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "top" } },
                  }}
                />
              </div>
            </div>
          )}

          {/* Digits Breakdown Table */}
          <div className="summary-card">
            <div className="section-title">
              <span style={{ fontSize: "18px" }}>Digit Frequency Breakdown Table</span>
            </div>
            <div className="table-wrapper">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>First Digit</th>
                    <th style={{ textAlign: "right" }}>Count</th>
                    <th style={{ textAlign: "right" }}>Observed %</th>
                    <th style={{ textAlign: "right" }}>Benford Expected %</th>
                    <th style={{ textAlign: "right" }}>Variance %</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {benfordResult.digitStats.map((stat) => (
                    <tr key={stat.digit}>
                      <td style={{ fontWeight: 700 }}>Digit {stat.digit}</td>
                      <td style={{ textAlign: "right" }}>{stat.count}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{stat.observedPct}%</td>
                      <td style={{ textAlign: "right" }}>{stat.expectedPct}%</td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 700,
                          color:
                            stat.status === "Anomalous"
                              ? "var(--error)"
                              : stat.status === "Caution"
                              ? "var(--warning)"
                              : "inherit",
                        }}
                      >
                        {stat.differencePct > 0 ? `+${stat.differencePct}%` : `${stat.differencePct}%`}
                      </td>
                      <td>
                        {stat.status === "Anomalous" ? (
                          <span className="status-badge failed">Anomalous Spike (&gt; 6%)</span>
                        ) : stat.status === "Caution" ? (
                          <span
                            className="status-badge"
                            style={{ background: "var(--warning-bg)", color: "var(--warning)" }}
                          >
                            ⚠️ Caution (&gt; 5%)
                          </span>
                        ) : (
                          <span className="status-badge passed">Normal</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
