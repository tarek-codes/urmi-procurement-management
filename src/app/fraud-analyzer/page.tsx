"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
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
  const [companyFilter, setCompanyFilter] = useState<string>("ALL");
  const [procurerFilter, setProcurerFilter] = useState<string>("ALL");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Unified File Audit Handler (Supports CS Excel, Item Cycle Report, and 35k+ historical rows)
  const processUploadedFile = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setCompanyFilter("ALL");
    setProcurerFilter("ALL");
    try {
      const buffer = await file.arrayBuffer();
      const items: NumberItem[] = [];

      // 1. Try Historical Item Cycle Parser
      const records = parseHistoricalFile(buffer);
      if (records.length > 0) {
        records.forEach((r) => {
          const comp = r.company || "Unknown";
          const proc = (r as any).procurer || "Unknown";
          if (r.csAmount) {
            items.push({
              amount: r.csAmount,
              label: `CS Amount - ${r.csNo}`,
              context: `${r.company} (${r.supplierName})`,
              company: comp,
              procurer: proc,
            });
          }
          if (r.poAmount) {
            items.push({
              amount: r.poAmount,
              label: `PO Amount - ${r.poNo || "N/A"}`,
              context: `${r.company} (${r.supplierName})`,
              company: comp,
              procurer: proc,
            });
          }
          if (r.billAmount) {
            items.push({
              amount: r.billAmount,
              label: `Bill Amount - ${r.billNo || "N/A"}`,
              context: `${r.company} (${r.supplierName})`,
              company: comp,
              procurer: proc,
            });
          }
          if (r.csRate) {
            items.push({
              amount: r.csRate,
              label: `CS Rate - ${r.itemName}`,
              context: `${r.company} (${r.supplierName})`,
              company: comp,
              procurer: proc,
            });
          }
          if (r.poRate) {
            items.push({
              amount: r.poRate,
              label: `PO Rate - ${r.itemName}`,
              context: `${r.company} (${r.supplierName})`,
              company: comp,
              procurer: proc,
            });
          }
        });

        if (items.length > 0) {
          setExtractedNumbers(items);
          setHistFileName(file.name);
          setCsFileName(null);
          setIsProcessing(false);
          return;
        }
      }

      // 2. Try CS Excel Parser
      const docs = parseExcelFile(buffer);
      if (docs.length > 0) {
        docs.forEach((doc) => {
          const comp = doc.companyName || "Unknown";
          const proc = doc.procurers.join(", ") || "Unknown";
          if (doc.csMainValue) {
            items.push({
              amount: doc.csMainValue,
              label: `${doc.csNo} - Main Value`,
              context: `${doc.companyName} (${doc.procurers.join(", ")})`,
              company: comp,
              procurer: proc,
            });
          }
          doc.items.forEach((it) => {
            it.quotations.forEach((q) => {
              if (q.unitRate) {
                items.push({
                  amount: q.unitRate,
                  label: `${doc.csNo} - ${it.itemName} (${q.supplierName})`,
                  context: `Unit Rate: $${q.unitRate}`,
                  company: comp,
                  procurer: proc,
                });
              }
            });
          });
        });

        if (items.length > 0) {
          setExtractedNumbers(items);
          setCsFileName(file.name);
          setHistFileName(null);
          setIsProcessing(false);
          return;
        }
      }

      // 3. Robust Generic Fallback: Extract ANY numeric fields from all rows in the Excel sheet
      const workbook = XLSX.read(buffer, { type: "array" });
      for (const sName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sName];
        const rawJson: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        
        rawJson.forEach((row, rowIdx) => {
          const comp = String(row["COMPANY_NAME"] || row["COMPANY"] || row["Company"] || "Unknown").trim();
          const proc = String(row["PROCURER"] || row["PURCHASER"] || row["BUYER"] || "Unknown").trim();
          Object.entries(row).forEach(([colKey, val]) => {
            let num = 0;
            if (typeof val === "number") num = val;
            else if (typeof val === "string") {
              const cleaned = val.replace(/,/g, "").trim();
              num = parseFloat(cleaned);
            }
            const isSlNo = colKey.toUpperCase().includes("SL") || colKey.toUpperCase().includes("INDEX");
            if (!isNaN(num) && num > 0 && !isSlNo) {
              items.push({
                amount: num,
                label: `Row ${rowIdx + 1} - ${colKey}`,
                context: `${colKey}: ${num}`,
                company: comp,
                procurer: proc,
              });
            }
          });
        });

        if (items.length > 0) break;
      }

      if (items.length > 0) {
        setExtractedNumbers(items);
        setHistFileName(file.name);
        setCsFileName(null);
        setIsProcessing(false);
        return;
      }

      throw new Error("No valid financial numbers found in the uploaded file.");
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to parse uploaded Excel file.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-load Stored DB for Instant Benford Fraud Audit
  const loadStoredDbBenford = async () => {
    setIsProcessing(true);
    setError(null);
    setCompanyFilter("ALL");
    setProcurerFilter("ALL");
    try {
      const res = await fetch("/api/historical-db", {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (!res.ok) throw new Error("Failed to fetch stored database.");
      const buffer = await res.arrayBuffer();
      const records = parseHistoricalFile(buffer);

      const items: NumberItem[] = [];
      records.forEach((r) => {
        const comp = r.company || "Unknown";
        const proc = (r as any).procurer || "Unknown";
        if (r.csAmount) {
          items.push({
            amount: r.csAmount,
            label: `CS Amount - ${r.csNo}`,
            context: `${r.company} (${r.supplierName})`,
            company: comp,
            procurer: proc,
          });
        }
        if (r.poAmount) {
          items.push({
            amount: r.poAmount,
            label: `PO Amount - ${r.poNo}`,
            context: `${r.company} (${r.supplierName})`,
            company: comp,
            procurer: proc,
          });
        }
        if (r.billAmount) {
          items.push({
            amount: r.billAmount,
            label: `Bill Amount - ${r.billNo}`,
            context: `${r.company} (${r.supplierName})`,
            company: comp,
            procurer: proc,
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

  // List of unique companies in dataset
  const companyOptions = useMemo(() => {
    const set = new Set(extractedNumbers.map((i) => i.company).filter(Boolean));
    return Array.from(set).sort();
  }, [extractedNumbers]);

  // List of unique procurers in dataset
  const procurerOptions = useMemo(() => {
    const set = new Set(extractedNumbers.map((i) => i.procurer).filter(Boolean));
    return Array.from(set).sort();
  }, [extractedNumbers]);

  // Filtered numbers by selected company and procurer
  const filteredNumbers = useMemo(() => {
    return extractedNumbers.filter((i) => {
      if (companyFilter !== "ALL" && i.company !== companyFilter) return false;
      if (procurerFilter !== "ALL" && i.procurer !== procurerFilter) return false;
      return true;
    });
  }, [extractedNumbers, companyFilter, procurerFilter]);

  // Run Benford Analysis on filtered dataset
  const benfordResult: BenfordAnalysisResult | null = useMemo(() => {
    if (filteredNumbers.length === 0) return null;
    return analyzeBenfordLaw(filteredNumbers);
  }, [filteredNumbers]);

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
                  if (f) processUploadedFile(f);
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
                  if (f) processUploadedFile(f);
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
          {/* File Bar & Procurer Filter */}
          <div className="file-info-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div className="file-info-left" style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <span>
                🛡️ Audited File: <strong>{csFileName || histFileName}</strong> ({benfordResult.totalNumbersAnalyzed.toLocaleString()} figures)
              </span>

              {companyOptions.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--bg-subtle)", padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--border)" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                    Filter by Company:
                  </label>
                  <select
                    className="filter-select"
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    style={{ padding: "3px 8px", fontSize: "12px" }}
                  >
                    <option value="ALL">All Companies</option>
                    {companyOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {procurerOptions.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--bg-subtle)", padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--border)" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                    Filter by Procurer:
                  </label>
                  <select
                    className="filter-select"
                    value={procurerFilter}
                    onChange={(e) => setProcurerFilter(e.target.value)}
                    style={{ padding: "3px 8px", fontSize: "12px" }}
                  >
                    <option value="ALL">All Procurers</option>
                    {procurerOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button
              className="btn-clear"
              onClick={() => {
                setExtractedNumbers([]);
                setCsFileName(null);
                setHistFileName(null);
                setCompanyFilter("ALL");
                setProcurerFilter("ALL");
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

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-md)" }}>
              <div style={{ background: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>MAD Statistic (Primary)</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: benfordResult.madStat > 0.012 ? "var(--error)" : "var(--success)" }}>
                  {benfordResult.madStat}
                </div>
              </div>
              <div style={{ background: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>MAD Acceptable Limit</div>
                <div style={{ fontSize: "20px", fontWeight: 700 }}>≤ 0.0120</div>
              </div>
              <div style={{ background: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Chi-Square Statistic</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: benfordResult.chiSquareStat > 15.51 ? "var(--warning)" : "var(--text-primary)" }}>
                  {benfordResult.chiSquareStat}
                </div>
              </div>
              <div style={{ background: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Total Data Sample</div>
                <div style={{ fontSize: "20px", fontWeight: 700 }}>{benfordResult.totalNumbersAnalyzed.toLocaleString()} Figures</div>
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
