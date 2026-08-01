"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useValidation } from "@/context/ValidationContext";
import FileUpload from "@/components/FileUpload";
import ValidationSummary from "@/components/ValidationSummary";
import CSTable from "@/components/CSTable";
import CSDetailView from "@/components/CSDetailView";

export default function CSValidatorPage() {
  const { reports, fileName, isProcessing, error, clearData } = useValidation();
  const [selectedCsId, setSelectedCsId] = useState<string | null>(null);

  const selectedReport = selectedCsId
    ? reports.find((r) => r.csId === selectedCsId)
    : null;

  const handleClear = () => {
    clearData();
    setSelectedCsId(null);
  };

  return (
    <main className="page-container">
      {/* Navigation breadcrumb */}
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

      {/* Module Title */}
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.02em" }}>
          CS Validator
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
          Comparative Statement Validation & Rule Enforcement
        </p>
      </div>

      {/* Upload zone — only when no data */}
      {reports.length === 0 && !isProcessing && <FileUpload />}

      {/* Error alert */}
      {error && (
        <div className="error-alert">
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
          <div className="spinner-text">Processing your file…</div>
        </div>
      )}

      {/* Results */}
      {reports.length > 0 && !selectedReport && (
        <>
          {/* File info bar */}
          <div className="file-info-bar">
            <div className="file-info-left">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              {fileName} — {reports.length} CS document
              {reports.length !== 1 ? "s" : ""} found
            </div>
            <button className="btn-clear" onClick={handleClear}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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

      {/* Empty state */}
      {reports.length === 0 && !isProcessing && !error && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">No data yet</div>
          <div className="empty-state-text">
            Upload a Comparative Statement Excel file to begin validation
          </div>
        </div>
      )}
    </main>
  );
}
