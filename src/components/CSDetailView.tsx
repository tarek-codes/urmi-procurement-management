"use client";

import React, { useState } from "react";
import { CSValidationReport, ValidationResult } from "@/lib/types";

interface Props {
  report: CSValidationReport;
  onBack: () => void;
}

export default function CSDetailView({ report, onBack }: Props) {
  const failedRules = report.results.filter((r) => r.status === "failed");
  const passedRules = report.results.filter((r) => r.status === "passed");

  return (
    <div className="detail-page">
      <button className="back-link" onClick={onBack}>
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
        Back to results
      </button>

      {/* Header */}
      <div className="detail-header">
        <div className="detail-header-left">
          <h1>
            {report.csNo}
            <span
              className={`status-badge ${report.overallStatus}`}
              style={{ marginLeft: 12, verticalAlign: "middle", fontSize: 13 }}
            >
              <span className="status-dot"></span>
              {report.overallStatus === "passed"
                ? "Validation Passed"
                : "Review Needed"}
            </span>
          </h1>
          <div className="detail-meta">
            <div className="detail-meta-item">
              <strong>Company:</strong> {report.companyName}
            </div>
            <div className="detail-meta-item">
              <strong>Requisition:</strong> {report.requisitionNo}
            </div>
            <div className="detail-meta-item">
              <strong>Procurer:</strong> {report.procurer}
            </div>
            <div className="detail-meta-item">
              <strong>Date:</strong> {report.csDate}
            </div>
          </div>
        </div>
        <div className="detail-stats">
          <div className="detail-stat errors">
            <div className="detail-stat-value">{report.errorCount}</div>
            <div className="detail-stat-label">Errors</div>
          </div>
          <div className="detail-stat warnings">
            <div className="detail-stat-value">{report.warningCount}</div>
            <div className="detail-stat-label">Warnings</div>
          </div>
        </div>
      </div>

      {/* Items section on top */}
      <div className="items-section" style={{ marginTop: 0, marginBottom: "var(--space-xl)" }}>
        <div className="section-title" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
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
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            Itemwise Supplier Price Comparison & Recommendations ({report.items.length} Items)
          </div>
          <div style={{ display: "flex", gap: "12px", fontSize: "11px", fontWeight: 500 }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ background: "#16a34a", color: "white", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>Recommended L1</span>
              <span style={{ color: "var(--text-tertiary)" }}>(Lowest Price Supplier)</span>
            </span>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>#</th>
                <th style={{ width: "240px" }}>Item Details</th>
                <th>Supplier Bids (Unit Rates & Totals)</th>
                <th style={{ width: "220px" }}>Recommended Supplier</th>
                <th style={{ textAlign: "right", width: "130px" }}>Lowest Total</th>
              </tr>
            </thead>
            <tbody>
              {report.items.map((item) => {
                const rec = item.minQuotation;

                return (
                  <tr key={item.slNo}>
                    <td style={{ color: "var(--text-tertiary)", fontWeight: 500 }}>
                      {item.slNo}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {item.itemName}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-tertiary)",
                          marginTop: 2,
                          maxWidth: 220,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={item.technicalSpecification}
                      >
                        {item.technicalSpecification || "N/A"}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "8px" }}>
                        {item.quotations.map((q) => {
                          const isLowest = rec?.supplierName === q.supplierName;

                          let badgeStyle: React.CSSProperties = {
                            padding: "8px 12px",
                            borderRadius: "6px",
                            border: "1px solid var(--border)",
                            background: "var(--bg-subtle)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                          };

                          if (isLowest) {
                            badgeStyle = {
                              ...badgeStyle,
                              background: "#f0fdf4",
                              borderColor: "#16a34a",
                              boxShadow: "0 1px 3px rgba(22, 163, 74, 0.15)",
                            };
                          }

                          return (
                            <div key={q.supplierName} style={badgeStyle}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "4px" }}>
                                <span style={{ fontWeight: 700, fontSize: "12px", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "110px" }} title={q.supplierName}>
                                  {q.supplierName}
                                </span>
                                {isLowest && (
                                  <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: "#16a34a", color: "#ffffff" }}>
                                    ✓ Lowest
                                  </span>
                                )}
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: "12px", marginTop: "2px" }}>
                                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                  Rate: ${q.unitRate.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </span>
                                <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                                  Qty: {q.quantity}
                                </span>
                              </div>
                              <div style={{ fontSize: "11px", fontWeight: 700, color: isLowest ? "#15803d" : "var(--text-secondary)", borderTop: "1px dashed var(--border)", paddingTop: "4px", marginTop: "2px" }}>
                                Total: ${q.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td>
                      {rec ? (
                        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "8px 10px", borderRadius: "6px" }}>
                          <div style={{ fontSize: "11px", color: "#166534", fontWeight: 600 }}>💡 Recommended:</div>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "#15803d", marginTop: "2px" }}>
                            {rec.supplierName}
                          </div>
                          <div style={{ fontSize: "11px", color: "#166534", marginTop: "2px" }}>
                            ${rec.unitRate.toLocaleString("en-US", { minimumFractionDigits: 2 })} / unit
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>No quotes available</span>
                      )}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                        fontSize: "14px",
                        color: "#15803d",
                      }}
                    >
                      {rec
                        ? `$${rec.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Failed validations */}
      {failedRules.length > 0 && (
        <>
          <div className="section-title">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--error)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            Issues Found ({failedRules.length})
          </div>
          <div className="validation-list">
            {failedRules.map((result) => (
              <ValidationItem key={result.ruleId} result={result} />
            ))}
          </div>
        </>
      )}

      {/* Passed validations */}
      {passedRules.length > 0 && (
        <PassedRulesSection passedRules={passedRules} />
      )}
    </div>
  );
}

// ── Validation Item (individual rule result) ────────────────────

function ValidationItem({ result }: { result: ValidationResult }) {
  const [expanded, setExpanded] = useState(false);

  const itemClass =
    result.status === "failed"
      ? result.severity === "error"
        ? "validation-item failed-error"
        : "validation-item failed-warning"
      : "validation-item passed-item";

  const iconClass =
    result.status === "failed"
      ? result.severity === "error"
        ? "validation-icon error-icon"
        : "validation-icon warning-icon"
      : "validation-icon pass-icon";

  const iconSymbol =
    result.status === "failed"
      ? result.severity === "error"
        ? "✕"
        : "!"
      : "✓";

  return (
    <div className={itemClass}>
      <div className={iconClass}>{iconSymbol}</div>
      <div className="validation-content">
        <div className="validation-rule-name">{result.ruleName}</div>
        <div className="validation-message">{result.message}</div>
        {result.affectedItems && result.affectedItems.length > 0 && (
          <div className="affected-items">
            <button
              className="affected-items-toggle"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "▾" : "▸"} {result.affectedItems.length} affected
              item(s)
            </button>
            {expanded && (
              <div className="affected-items-list">
                {result.affectedItems.map((item, i) => (
                  <div key={i} className="affected-item">
                    <span className="affected-item-name">
                      {item.slNo > 0 ? `#${item.slNo}` : ""} {item.itemName}
                    </span>
                    <span>{item.detail}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <span className="validation-rule-id">Rule {result.ruleId}</span>
    </div>
  );
}

function PassedRulesSection({ passedRules }: { passedRules: ValidationResult[] }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <div className="section-title" style={{ justifyContent: "space-between", marginTop: "var(--space-xl)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--success)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          Passed Checks ({passedRules.length})
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-secondary)",
            fontSize: "12px",
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "var(--font)",
          }}
        >
          {collapsed ? "Show passed checks ▾" : "Hide passed checks ▴"}
        </button>
      </div>

      {!collapsed && (
        <div className="validation-list">
          {passedRules.map((result) => (
            <ValidationItem key={result.ruleId} result={result} />
          ))}
        </div>
      )}
    </>
  );
}
