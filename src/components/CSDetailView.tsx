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
            Items & Quoted Prices ({report.items.length})
          </div>
          <div style={{ display: "flex", gap: "12px", fontSize: "11px", fontWeight: 500 }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span className="supplier-tag selected" style={{ margin: 0 }}>Selected</span>
              <span style={{ color: "var(--text-tertiary)" }}>(Awarded)</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span className="supplier-tag min" style={{ margin: 0 }}>Lowest</span>
              <span style={{ color: "var(--text-tertiary)" }}>(Min Quote)</span>
            </span>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>#</th>
                <th style={{ width: "260px" }}>Item Details</th>
                <th>Supplier Quotations (Unit Rate & Total)</th>
                <th style={{ textAlign: "right", width: "120px" }}>CS Value</th>
                <th style={{ width: "90px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {report.items.map((item) => {
                const isMinSelected =
                  item.selectedSupplier &&
                  item.minQuotation &&
                  item.selectedSupplier.unitRate <= item.minQuotation.unitRate;

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
                          maxWidth: 240,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={item.technicalSpecification}
                      >
                        {item.technicalSpecification}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {item.quotations.map((q) => {
                          const isSelected = item.selectedSupplier?.supplierName === q.supplierName;
                          const isLowest = item.minQuotation?.supplierName === q.supplierName;

                          let badgeClass = "supplier-quote-badge";
                          if (isSelected) {
                            badgeClass += isLowest ? " selected-min" : " selected-override";
                          } else if (isLowest) {
                            badgeClass += " min";
                          }

                          return (
                            <div key={q.supplierName} className={badgeClass}>
                              <div className="sq-name-row">
                                <span className="sq-name" title={q.supplierName}>
                                  {q.supplierName}
                                </span>
                                {isSelected && (
                                  <span className={`sq-tag ${isLowest ? "selected-tag" : "override-tag"}`}>
                                    {isLowest ? "Selected" : "Selected (Higher)"}
                                  </span>
                                )}
                                {isLowest && !isSelected && <span className="sq-tag lowest-tag">Lowest</span>}
                              </div>
                              <div className="sq-price-row">
                                <span className="sq-rate">
                                  ${q.unitRate.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                  <span className="sq-qty"> × {q.quantity}</span>
                                </span>
                                <span className="sq-total">
                                  Total: ${q.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                        fontSize: "13px",
                        color: isMinSelected ? "var(--text-primary)" : "var(--error)",
                      }}
                    >
                      ${item.csMainValue.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td>
                      {isMinSelected ? (
                        <span className="status-badge passed">
                          <span className="status-dot"></span>
                          Valid
                        </span>
                      ) : (
                        <span className="status-badge failed" title="Selected supplier is higher than the minimum quote">
                          <span className="status-dot"></span>
                          Override
                        </span>
                      )}
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
