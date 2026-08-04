"use client";

import React, { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useValidation } from "@/context/ValidationContext";
import ValidationSummary from "@/components/ValidationSummary";
import CSTable from "@/components/CSTable";
import CSDetailView from "@/components/CSDetailView";

function DropZone({
  label,
  hint,
  icon,
  file,
  onFile,
  accent,
}: {
  label: string;
  hint: string;
  icon: string;
  file: File | null;
  onFile: (f: File) => void;
  accent: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (f: File) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      if (ext !== "xlsx" && ext !== "xls") {
        alert("Please upload an Excel file (.xlsx or .xls)");
        return;
      }
      onFile(f);
    },
    [onFile]
  );

  return (
    <div
      style={{
        border: `2px dashed ${file ? accent : dragOver ? accent : "var(--border)"}`,
        borderRadius: "10px",
        padding: "24px 20px",
        background: file ? `${accent}0d` : dragOver ? `${accent}08` : "var(--bg-subtle)",
        transition: "all 0.2s ease",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "10px",
        minHeight: "160px",
        justifyContent: "center",
        position: "relative",
      }}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      <div style={{ fontSize: "32px", lineHeight: 1 }}>{icon}</div>

      <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>
        {label}
      </div>

      {file ? (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "#ffffff",
            background: accent,
            padding: "3px 8px",
            borderRadius: "4px",
          }}>
            ✓ {file.name}
          </span>
        </div>
      ) : (
        <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
          {hint}
        </div>
      )}
    </div>
  );
}

export default function CSValidatorPage() {
  const { reports, csFileName, histFileName, isProcessing, error, selectedSuppliers, processFiles, clearData } = useValidation();
  const [selectedCsId, setSelectedCsId] = useState<string | null>(null);

  const [csFile, setCsFile] = useState<File | null>(null);
  const [histFile, setHistFile] = useState<File | null>(null);

  const selectedReport = selectedCsId
    ? reports.find((r) => r.csId === selectedCsId)
    : null;

  const handleClear = () => {
    clearData();
    setSelectedCsId(null);
    setCsFile(null);
    setHistFile(null);
  };

  const handleRunValidation = useCallback(async () => {
    if (!csFile || !histFile) return;
    await processFiles(csFile, histFile);
  }, [csFile, histFile, processFiles]);

  const bothReady = csFile !== null && histFile !== null;

  return (
    <main className="page-container">
      {/* Navigation breadcrumb */}
      <div style={{ marginBottom: "var(--space-md)" }}>
        <Link href="/" className="back-link" style={{ marginBottom: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Platform Hub
        </Link>
      </div>

      {/* Module Title */}
      <div style={{ marginBottom: "var(--space-md)" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.02em" }}>
          CS Validator
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
          Comparative Statement Validation & Rule Enforcement
        </p>
      </div>

      {/* Module Navigation Tabs */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "var(--space-xl)",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "12px",
        }}
      >
        <Link
          href="/cs-validator"
          style={{
            padding: "8px 18px",
            borderRadius: "6px",
            fontWeight: 700,
            fontSize: "13px",
            background: "#2563eb",
            color: "#ffffff",
            textDecoration: "none",
          }}
        >
          📋 CS Validator
        </Link>
        <Link
          href="/cs-validator/selected-suppliers"
          style={{
            padding: "8px 18px",
            borderRadius: "6px",
            fontWeight: 600,
            fontSize: "13px",
            background: "var(--bg-subtle)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>🏆 Selected Suppliers</span>
          <span
            style={{
              background: "#e2e8f0",
              color: "#334155",
              fontSize: "11px",
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: "10px",
            }}
          >
            {selectedSuppliers.length}
          </span>
        </Link>
      </div>

      {/* Two-file upload zone — only when no data loaded */}
      {reports.length === 0 && !isProcessing && (
        <div style={{ maxWidth: "680px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <DropZone
              label="CS Excel File"
              hint="Drop or click to upload the Comparative Statements Excel file"
              icon="📄"
              file={csFile}
              onFile={setCsFile}
              accent="#2563eb"
            />
            <DropZone
              label="Historical Data File"
              hint="Drop or click to upload the Item Cycle Deviation Report (historical data)"
              icon="📊"
              file={histFile}
              onFile={setHistFile}
              accent="#7c3aed"
            />
          </div>

          {/* Run button */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              disabled={!bothReady}
              onClick={handleRunValidation}
              style={{
                padding: "11px 32px",
                fontWeight: 700,
                fontSize: "14px",
                borderRadius: "8px",
                border: "none",
                background: bothReady ? "linear-gradient(135deg, #2563eb, #7c3aed)" : "var(--border)",
                color: bothReady ? "#ffffff" : "var(--text-tertiary)",
                cursor: bothReady ? "pointer" : "not-allowed",
                transition: "all 0.2s ease",
                boxShadow: bothReady ? "0 4px 14px rgba(37, 99, 235, 0.3)" : "none",
              }}
            >
              {bothReady ? "⚡ Run CS Validation" : "Upload both files to continue"}
            </button>
          </div>

          {!bothReady && (
            <div style={{ textAlign: "center", fontSize: "12px", color: "var(--text-tertiary)", marginTop: "12px" }}>
              {!csFile && !histFile ? "Both files are required to run validation." : !csFile ? "CS Excel file missing." : "Historical data file missing."}
            </div>
          )}
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="error-alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* Processing spinner */}
      {isProcessing && (
        <div className="spinner-container">
          <div className="spinner"></div>
          <div className="spinner-text">Processing files — validating CS data against historical records…</div>
        </div>
      )}

      {/* Results */}
      {reports.length > 0 && !selectedReport && (
        <>
          {/* File info bar */}
          <div className="file-info-bar">
            <div className="file-info-left" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span>CS: <strong>{csFileName}</strong></span>
                <span style={{ color: "var(--text-tertiary)", margin: "0 4px" }}>|</span>
                <span>History: <strong>{histFileName}</strong></span>
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                {reports.length} CS document{reports.length !== 1 ? "s" : ""} validated
              </div>
            </div>
            <button className="btn-clear" onClick={handleClear}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Clear
            </button>
          </div>

          {/* Summary cards */}
          <ValidationSummary />

          {/* CS Table */}
          <CSTable onSelectCS={setSelectedCsId} />
        </>
      )}

      {/* Detail view — replaces summary + table */}
      {selectedReport && (
        <CSDetailView
          report={selectedReport}
          onBack={() => setSelectedCsId(null)}
        />
      )}
    </main>
  );
}
