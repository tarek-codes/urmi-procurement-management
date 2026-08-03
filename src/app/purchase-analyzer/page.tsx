"use client";

import PaginationControls from "@/components/PaginationControls";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { parseExcelFile } from "@/lib/excelParser";
import { parseHistoricalFile } from "@/lib/historicalParser";
import { CSDocument } from "@/lib/types";
import { HistoricalRecord } from "@/lib/historicalTypes";
import { analyzeFlopPurchases } from "@/lib/flopAnalyzer";
import { FlopPurchaseSummary, FlopCSAnalysis } from "@/lib/flopTypes";

export default function FlopPurchaseAnalyzerPage() {
  const [csDocuments, setCsDocuments] = useState<CSDocument[]>([]);
  const [csFileName, setCsFileName] = useState<string | null>(null);

  const [customHistRecords, setCustomHistRecords] = useState<HistoricalRecord[] | null>(null);
  const [histFileName, setHistFileName] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedCsNo, setSelectedCsNo] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");
  const [filterCompany, setFilterCompany] = useState<string>("ALL");
  const [filterProcurer, setFilterProcurer] = useState<string>("ALL");

  // Handle CS File upload
  const handleCsUpload = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const docs = parseExcelFile(buffer);
      if (docs.length === 0) {
        throw new Error("No Comparative Statement records found in CS Excel file.");
      }
      setCsDocuments(docs);
      setCsFileName(file.name);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process CS Excel file.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Item Cycle Report upload
  const handleHistUpload = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const records = parseHistoricalFile(buffer);
      if (records.length === 0) {
        throw new Error("No historical item cycle records found in uploaded file.");
      }
      setCustomHistRecords(records);
      setHistFileName(file.name);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process Item Cycle Report.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-load default DB file if user wants standard reference
  const loadDefaultHistDb = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const res = await fetch("/api/historical-db", {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (!res.ok) throw new Error("Failed to fetch default Item Cycle Report.");
      const buffer = await res.arrayBuffer();
      const records = parseHistoricalFile(buffer);
      setCustomHistRecords(records);
      setHistFileName("Previous_Item_Cycle_Report_Historical_DB_Data.xlsx (System Stored DB)");
    } catch (err: any) {
      setError("Failed to load default Item Cycle Report database.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Both CS File and Item Cycle Report must be loaded
  const isBothFilesReady = csDocuments.length > 0 && customHistRecords !== null && customHistRecords.length > 0;

  // Run Flop Purchase Analysis
  const flopSummary: FlopPurchaseSummary | null = useMemo(() => {
    if (!isBothFilesReady || !customHistRecords) return null;
    return analyzeFlopPurchases(csDocuments, customHistRecords);
  }, [csDocuments, customHistRecords, isBothFilesReady]);

  // Unique Companies and Procurers for Filter Dropdowns
  const companyOptions = useMemo(() => {
    if (!flopSummary) return [];
    const set = new Set(flopSummary.csAnalyses.map((c) => c.companyName).filter(Boolean));
    return Array.from(set).sort();
  }, [flopSummary]);

  const procurerOptions = useMemo(() => {
    if (!flopSummary) return [];
    const set = new Set(flopSummary.csAnalyses.map((c) => c.procurer).filter(Boolean));
    return Array.from(set).sort();
  }, [flopSummary]);

  // Filtered CS List
  const filteredCsAnalyses = useMemo(() => {
    if (!flopSummary) return [];
    return flopSummary.csAnalyses.filter((cs) => {
      const matchesSearch =
        cs.csNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cs.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cs.procurer.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSeverity =
        filterSeverity === "ALL" ||
        (filterSeverity === "FLOP" && cs.isCsFlop) ||
        (filterSeverity === "CLEAN" && !cs.isCsFlop) ||
        cs.severity === filterSeverity;

      const matchesCompany =
        filterCompany === "ALL" || cs.companyName === filterCompany;

      const matchesProcurer =
        filterProcurer === "ALL" || cs.procurer === filterProcurer;

      return matchesSearch && matchesSeverity && matchesCompany && matchesProcurer;
    });
  }, [flopSummary, searchQuery, filterSeverity, filterCompany, filterProcurer]);

  // Pagination for CS Table
  const [csPage, setCsPage] = useState(1);
  const [csPageSize, setCsPageSize] = useState(25);

  React.useEffect(() => {
    setCsPage(1);
  }, [searchQuery, filterSeverity, filterCompany, filterProcurer]);

  const totalCsPages = Math.ceil(filteredCsAnalyses.length / csPageSize);
  const paginatedCsAnalyses = useMemo(() => {
    const start = (csPage - 1) * csPageSize;
    return filteredCsAnalyses.slice(start, start + csPageSize);
  }, [filteredCsAnalyses, csPage, csPageSize]);

  const selectedCsAnalysis: FlopCSAnalysis | null = useMemo(() => {
    if (!flopSummary || !selectedCsNo) return null;
    return flopSummary.csAnalyses.find((c) => c.csNo === selectedCsNo) || null;
  }, [flopSummary, selectedCsNo]);

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
          Flop Purchase Analyzer
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
          Cross-reference Comparative Statements (CS) against Historical Item Cycle Reports to evaluate the complete procurement lifecycle (REQ → PO → GRN → Bill).
        </p>
      </div>

      {/* Dual File Upload Container */}
      {!isBothFilesReady && !isProcessing && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-lg)", marginBottom: "var(--space-2xl)" }}>
          {/* Box 1: CS Excel File */}
          <div
            className="upload-zone"
            style={{
              borderColor: csDocuments.length > 0 ? "var(--success)" : "var(--border)",
              background: csDocuments.length > 0 ? "#f0fdf4" : "var(--bg-card)",
              padding: "var(--space-xl)",
            }}
          >
            <div className="upload-icon" style={{ fontSize: "36px" }}>
              {csDocuments.length > 0 ? "✅" : "📋"}
            </div>
            <div className="upload-title" style={{ fontSize: "16px", fontWeight: 700 }}>
              1. Current CS Excel File
            </div>
            <div className="upload-subtitle" style={{ fontSize: "12px", marginBottom: "var(--space-md)" }}>
              Upload <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: "4px" }}>CS_Excel_Updated.xlsx</code> containing comparative quotation rows.
            </div>
            {csFileName ? (
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--success)", marginBottom: "var(--space-sm)" }}>
                ✓ {csFileName} ({csDocuments.length} CS docs)
              </div>
            ) : (
              <label className="btn-upload" style={{ cursor: "pointer", padding: "8px 16px", fontSize: "13px" }}>
                Select CS File
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
            )}
          </div>

          {/* Box 2: Item Cycle Report */}
          <div
            className="upload-zone"
            style={{
              borderColor: customHistRecords ? "var(--success)" : "var(--border)",
              background: customHistRecords ? "#f0fdf4" : "var(--bg-card)",
              padding: "var(--space-xl)",
            }}
          >
            <div className="upload-icon" style={{ fontSize: "36px" }}>
              {customHistRecords ? "✅" : "📑"}
            </div>
            <div className="upload-title" style={{ fontSize: "16px", fontWeight: 700 }}>
              2. Item Cycle Report (Historical DB)
            </div>
            <div className="upload-subtitle" style={{ fontSize: "12px", marginBottom: "var(--space-md)" }}>
              Upload <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: "4px" }}>Previous_Item_Cycle_Report_Historical_DB_Data.xlsx</code>.
            </div>

            {histFileName ? (
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--success)", marginBottom: "var(--space-sm)" }}>
                ✓ {histFileName} ({customHistRecords?.length} cycle lines)
              </div>
            ) : (
              <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                <label className="btn-upload" style={{ cursor: "pointer", padding: "8px 14px", fontSize: "12px" }}>
                  Upload Report File
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
                <button
                  className="btn-clear"
                  onClick={loadDefaultHistDb}
                  style={{ padding: "8px 14px", fontSize: "12px" }}
                >
                  ⚡ Use Stored DB
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Spinner */}
      {isProcessing && (
        <div className="spinner-container">
          <div className="spinner"></div>
          <div className="spinner-text">Cross-referencing CS items against Historical Item Cycle Report…</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="error-alert">
          <span>{error}</span>
        </div>
      )}

      {/* Results View when Both Files Loaded */}
      {flopSummary && !selectedCsAnalysis && (
        <>
          {/* File Status Bar */}
          <div className="file-info-bar">
            <div className="file-info-left" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <div>
                📋 <strong>CS File:</strong> {csFileName} ({flopSummary.totalCsAnalyzed} CS documents, {flopSummary.totalItemsAnalyzed} item lines)
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                📑 <strong>Historical DB:</strong> {histFileName} ({customHistRecords?.length} historical cycle records)
              </div>
            </div>
            <button
              className="btn-clear"
              onClick={() => {
                setCsDocuments([]);
                setCsFileName(null);
                setCustomHistRecords(null);
                setHistFileName(null);
              }}
            >
              Reset Both Files
            </button>
          </div>

          {/* Summary KPIs */}
          <div className="summary-grid" style={{ marginBottom: "var(--space-xl)" }}>
            <div className="summary-card">
              <div className="summary-card-label">Flop CS Ratio</div>
              <div className="summary-card-value error">
                {flopSummary.totalFlopCsCount} / {flopSummary.totalCsAnalyzed}
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-card-label">Flop Item Lines</div>
              <div className="summary-card-value error">
                {flopSummary.totalFlopItemsCount} / {flopSummary.totalItemsAnalyzed}
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-card-label">Total Potential Savings Lost</div>
              <div className="summary-card-value error">
                {formatCurr(flopSummary.totalPotentialSavingsLost)}
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-card-label">Clean CS Documents</div>
              <div className="summary-card-value success">
                {flopSummary.totalCsAnalyzed - flopSummary.totalFlopCsCount} CS
              </div>
            </div>
          </div>

          {/* Full Search & Filter Controls */}
          <div className="table-controls" style={{ marginBottom: "var(--space-md)", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search CS#, Company, Procurer..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, minWidth: "220px" }}
            />
            <select
              className="filter-select"
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="FLOP">Flop CS Only</option>
              <option value="High">High Severity Flop</option>
              <option value="Medium">Medium Severity Flop</option>
              <option value="CLEAN">Clean CS Only</option>
            </select>
            <select
              className="filter-select"
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
            >
              <option value="ALL">All Companies</option>
              {companyOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="filter-select"
              value={filterProcurer}
              onChange={(e) => setFilterProcurer(e.target.value)}
            >
              <option value="ALL">All Procurers</option>
              {procurerOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {(searchQuery || filterSeverity !== "ALL" || filterCompany !== "ALL" || filterProcurer !== "ALL") && (
              <button
                className="btn-reset-filters"
                onClick={() => {
                  setSearchQuery("");
                  setFilterSeverity("ALL");
                  setFilterCompany("ALL");
                  setFilterProcurer("ALL");
                }}
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* CS Level Table */}
          <div className="summary-card">
            <div className="section-title">
              <span>CS-Level Flop Analysis Results ({filteredCsAnalyses.length} CS Documents Shown)</span>
            </div>

            <div className="table-wrapper">
              <table className="cs-table">
                <thead>
                  <tr>
                    <th>CS Number</th>
                    <th>Company Name</th>
                    <th>Procurer</th>
                    <th style={{ textAlign: "center" }}>Flop / Total Items</th>
                    <th style={{ textAlign: "right" }}>Potential Savings Lost</th>
                    <th>Status</th>
                    <th style={{ textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCsAnalyses.map((cs) => (
                    <tr key={cs.csNo}>
                      <td style={{ fontWeight: 700, color: "var(--accent)" }}>{cs.csNo}</td>
                      <td>{cs.companyName}</td>
                      <td>{cs.procurer}</td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          className={`count-badge ${
                            cs.flopItemsCount > 0 ? "error-count" : "zero"
                          }`}
                        >
                          {cs.flopItemsCount} / {cs.totalItemsCount}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: cs.totalPotentialSavings > 0 ? "var(--error)" : "inherit" }}>
                        {formatCurr(cs.totalPotentialSavings)}
                      </td>
                      <td>
                        {cs.isCsFlop ? (
                          <span className="status-badge failed">
                            <span className="status-dot"></span> Flop Purchase ({cs.severity})
                          </span>
                        ) : (
                          <span className="status-badge passed">
                            <span className="status-dot"></span> Optimal Choice
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="btn-reset-filters"
                          onClick={() => setSelectedCsNo(cs.csNo)}
                          style={{ padding: "4px 10px", fontSize: "12px" }}
                        >
                          Item Deep Dive →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <PaginationControls
                currentPage={csPage}
                totalPages={totalCsPages}
                pageSize={csPageSize}
                totalItems={filteredCsAnalyses.length}
                onPageChange={setCsPage}
                onPageSizeChange={setCsPageSize}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            </div>
          </div>
        </>
      )}

      {/* Detail View for Selected CS */}
      {selectedCsAnalysis && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
          {/* Header Bar with Accurate Summary Numbers for this specific CS */}
          <div className="file-info-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button className="back-link" onClick={() => setSelectedCsNo(null)} style={{ marginBottom: 0 }}>
              ← Back to CS Summary List
            </button>
            <div style={{ fontWeight: 600, fontSize: "14px" }}>
              CS: <span style={{ color: "var(--accent)", fontWeight: 700 }}>{selectedCsAnalysis.csNo}</span> | {selectedCsAnalysis.companyName} | Procurer: {selectedCsAnalysis.procurer}
            </div>
          </div>

          {/* KPI Cards Specific to this CS */}
          <div className="summary-grid" style={{ marginBottom: "var(--space-xs)" }}>
            <div className="summary-card">
              <div className="summary-card-label">CS Status</div>
              <div className="summary-card-value">
                {selectedCsAnalysis.isCsFlop ? (
                  <span className="status-badge failed" style={{ fontSize: "14px" }}>
                    Flop Purchase ({selectedCsAnalysis.severity})
                  </span>
                ) : (
                  <span className="status-badge passed" style={{ fontSize: "14px" }}>
                    Optimal Choice
                  </span>
                )}
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-card-label">Flop Items / Total</div>
              <div className="summary-card-value error">
                {selectedCsAnalysis.flopItemsCount} / {selectedCsAnalysis.totalItemsCount}
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-card-label">CS Potential Savings Lost</div>
              <div className="summary-card-value error">
                {formatCurr(selectedCsAnalysis.totalPotentialSavings)}
              </div>
            </div>
          </div>

          {/* Item-Wise Breakdown Table & Cards */}
          <div className="summary-card">
            <div className="section-title">
              <span>Item-Wise Quotation Analysis & Vendor Evaluation for {selectedCsAnalysis.csNo}</span>
            </div>

            {/* Quick Items Quotation Summary Table */}
            <div className="table-wrapper" style={{ marginBottom: "var(--space-xl)" }}>
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Quoted Suppliers</th>
                    <th>Currently Selected Supplier</th>
                    <th style={{ textAlign: "right" }}>Selected Unit Rate</th>
                    <th style={{ textAlign: "right" }}>Selected Total Value</th>
                    <th>Recommended Supplier</th>
                    <th style={{ textAlign: "right" }}>Recommended Unit Rate</th>
                    <th style={{ textAlign: "right" }}>Potential Savings Lost</th>
                    <th>Item Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCsAnalysis.itemAnalyses.map((itemAns, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{itemAns.item.itemName}</td>
                      <td>
                        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                          {itemAns.item.quotations.map((q) => q.supplierName).join(", ")}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: itemAns.isFlop ? "var(--error)" : "inherit" }}>
                        {itemAns.selectedSupplierName}
                      </td>
                      <td style={{ textAlign: "right" }}>{formatCurr(itemAns.selectedUnitRate)}</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>{formatCurr(itemAns.selectedTotalValue)}</td>
                      <td style={{ fontWeight: 700, color: "var(--accent)" }}>
                        {itemAns.recommendedSupplierName}
                      </td>
                      <td style={{ textAlign: "right" }}>{formatCurr(itemAns.recommendedUnitRate)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: itemAns.potentialSavings > 0 ? "var(--error)" : "inherit" }}>
                        {formatCurr(itemAns.potentialSavings)}
                      </td>
                      <td>
                        {itemAns.isFlop ? (
                          <span className="status-badge failed">Flop Choice</span>
                        ) : (
                          <span className="status-badge passed">Optimal</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Detailed Item Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
              {selectedCsAnalysis.itemAnalyses.map((itemAns, idx) => (
                <div
                  key={idx}
                  style={{
                    background: itemAns.isFlop ? "#fef2f2" : "var(--bg-subtle)",
                    border: itemAns.isFlop ? "1px solid #fca5a5" : "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "var(--space-lg)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
                    <div style={{ fontWeight: 700, fontSize: "16px" }}>
                      Item #{idx + 1}: {itemAns.item.itemName} (TS-{itemAns.item.tsId})
                    </div>
                    {itemAns.isFlop ? (
                      <span className="status-badge failed">
                        Flop Choice — Savings Lost: {formatCurr(itemAns.potentialSavings)}
                      </span>
                    ) : (
                      <span className="status-badge passed">Optimal Supplier Selected</span>
                    )}
                  </div>

                  {/* All Quoted Prices Comparison Row */}
                  <div style={{ marginBottom: "var(--space-md)", background: "#ffffff", padding: "10px 14px", borderRadius: "6px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "6px" }}>
                      All Quoted Supplier Prices for this Item:
                    </div>
                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                      {itemAns.item.quotations.map((q, qIdx) => {
                        const isSelected = q.supplierName === itemAns.selectedSupplierName;
                        const isLowest = itemAns.item.minQuotation && q.supplierName === itemAns.item.minQuotation.supplierName;
                        return (
                          <div
                            key={qIdx}
                            style={{
                              padding: "6px 10px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              border: isSelected
                                ? itemAns.isFlop
                                  ? "1px solid var(--error)"
                                  : "1px solid var(--accent)"
                                : "1px solid var(--border)",
                              background: isSelected
                                ? itemAns.isFlop
                                  ? "#fee2e2"
                                  : "#eff6ff"
                                : "#f9fafb",
                            }}
                          >
                            <strong>{q.supplierName}</strong>: {formatCurr(q.unitRate)} / unit (Total: {formatCurr(q.totalPrice)})
                            {isSelected && (
                              <span style={{ marginLeft: "6px", color: itemAns.isFlop ? "var(--error)" : "var(--accent)", fontWeight: 700 }}>
                                {itemAns.isFlop ? "[Selected (Override)]" : "[Selected]"}
                              </span>
                            )}
                            {isLowest && !isSelected && (
                              <span style={{ marginLeft: "6px", color: "var(--success)", fontWeight: 700 }}>
                                [Lowest Rate]
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-lg)", marginBottom: "var(--space-md)" }}>
                    {/* Selected Supplier Card */}
                    <div
                      style={{
                        background: itemAns.isFlop ? "#ffffff" : "var(--bg-card)",
                        border: itemAns.isFlop ? "1px solid var(--error)" : "1px solid var(--border)",
                        borderRadius: "8px",
                        padding: "12px",
                      }}
                    >
                      <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-tertiary)", fontWeight: 700, marginBottom: "4px" }}>
                        Currently Selected Supplier
                      </div>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: itemAns.isFlop ? "var(--error)" : "var(--text-primary)" }}>
                        {itemAns.selectedSupplierName}
                      </div>
                      <div style={{ fontSize: "13px", marginTop: "4px" }}>
                        Unit Rate: <strong>{formatCurr(itemAns.selectedUnitRate)}</strong> | Total: {formatCurr(itemAns.selectedTotalValue)}
                      </div>
                      {itemAns.selectedSupplierRating ? (
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px" }}>
                          Historical Rating: Grade <strong>{itemAns.selectedSupplierRating.grade}</strong> (Score {itemAns.selectedSupplierRating.score}/100) | Lead Time: {itemAns.selectedSupplierRating.avgLeadTimeDays} days | Fulfillment: {itemAns.selectedSupplierRating.fulfillmentRatePct}%
                        </div>
                      ) : (
                        <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
                          No Historical DB rating recorded.
                        </div>
                      )}
                    </div>

                    {/* Recommended Supplier Card */}
                    <div
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--accent)",
                        borderRadius: "8px",
                        padding: "12px",
                      }}
                    >
                      <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--accent)", fontWeight: 700, marginBottom: "4px" }}>
                        Recommended Optimal Supplier
                      </div>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--accent)" }}>
                        {itemAns.recommendedSupplierName}
                      </div>
                      <div style={{ fontSize: "13px", marginTop: "4px" }}>
                        Unit Rate: <strong>{formatCurr(itemAns.recommendedUnitRate)}</strong> | Total: {formatCurr(itemAns.recommendedTotalValue)}
                      </div>
                      {itemAns.recommendedSupplierRating ? (
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px" }}>
                          Historical Rating: Grade <strong>{itemAns.recommendedSupplierRating.grade}</strong> (Score {itemAns.recommendedSupplierRating.score}/100) | Lead Time: {itemAns.recommendedSupplierRating.avgLeadTimeDays} days | Fulfillment: {itemAns.recommendedSupplierRating.fulfillmentRatePct}%
                        </div>
                      ) : (
                        <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
                          Recommended lowest quotation rate.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Explanation & Reason */}
                  <div style={{ background: "rgba(255,255,255,0.7)", padding: "10px", borderRadius: "6px", fontSize: "13px", lineHeight: "1.5" }}>
                    <strong>Full-Cycle Intelligence Recommendation:</strong> {itemAns.recommendationExplanation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
