"use client";

import React from "react";
import { useValidation } from "@/context/ValidationContext";

export default function ValidationSummary() {
  const { reports } = useValidation();

  if (reports.length === 0) return null;

  const totalCS = reports.length;
  const passedCS = reports.filter((r) => r.overallStatus === "passed").length;
  const failedCS = reports.filter((r) => r.overallStatus === "failed").length;
  const totalErrors = reports.reduce((s, r) => s + r.errorCount, 0);
  const totalWarnings = reports.reduce((s, r) => s + r.warningCount, 0);

  return (
    <div className="summary-grid">
      <div className="summary-card">
        <div className="summary-card-label">Total CS</div>
        <div className="summary-card-value">{totalCS}</div>
      </div>
      <div className="summary-card">
        <div className="summary-card-label">Passed</div>
        <div className="summary-card-value success">{passedCS}</div>
      </div>
      <div className="summary-card">
        <div className="summary-card-label">Review Needed</div>
        <div className="summary-card-value error">{failedCS}</div>
      </div>
      <div className="summary-card">
        <div className="summary-card-label">
          Errors / Warnings
        </div>
        <div className="summary-card-value">
          <span className="error">{totalErrors}</span>
          <span
            style={{
              color: "var(--text-tertiary)",
              margin: "0 6px",
              fontWeight: 400,
              fontSize: 18,
            }}
          >
            /
          </span>
          <span className="warning">{totalWarnings}</span>
        </div>
      </div>
    </div>
  );
}
