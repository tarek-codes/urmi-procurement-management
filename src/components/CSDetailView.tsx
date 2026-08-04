"use client";

import React, { useState, useMemo } from "react";
import { CSValidationReport, ValidationResult } from "@/lib/types";
import { useValidation } from "@/context/ValidationContext";
import {
  evaluateItemVendorRecommendations,
  ItemRecommendationResult,
  VendorItemEvaluation,
} from "@/lib/vendorScoringEngine";

interface Props {
  report: CSValidationReport;
  onBack: () => void;
}

export default function CSDetailView({ report, onBack }: Props) {
  const { historicalRecords } = useValidation();
  const [activeModalItem, setActiveModalItem] = useState<ItemRecommendationResult | null>(null);

  // Confirmed supplier selections keyed by item slNo (null means user hasn't confirmed yet)
  const [selections, setSelections] = useState<
    Record<number, { supplierName: string; auditReason: string; isRecommended: boolean }>
  >({});

  // Confirmation/audit modal state
  const [confirmModal, setConfirmModal] = useState<{
    itemRec: ItemRecommendationResult;
    targetSupplierName: string;
    isRecommended: boolean;
    reasonText: string;
  } | null>(null);

  const failedRules = report.results.filter((r) => r.status === "failed");
  const passedRules = report.results.filter((r) => r.status === "passed");

  // Compute 8-metric weighted recommendation engine results for all items in this CS
  const itemRecommendations = useMemo(() => {
    return evaluateItemVendorRecommendations(report.items, historicalRecords);
  }, [report.items, historicalRecords]);

  // Overall recommended total cost across all items
  const totalRecommendedCost = itemRecommendations.reduce(
    (sum, item) => sum + item.optimalTotalCost,
    0
  );

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
                ? "OK"
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
          <div className="detail-stat" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
            <div className="detail-stat-value" style={{ color: "#15803d" }}>
              ${totalRecommendedCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div className="detail-stat-label" style={{ color: "#166534" }}>Recommended Total Cost</div>
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
            Items & Suppliers List ({itemRecommendations.length} Items)
          </div>
          <div style={{ display: "flex", gap: "12px", fontSize: "11px", fontWeight: 500 }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ background: "#16a34a", color: "white", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>Rank #1 Recommended</span>
              <span style={{ color: "var(--text-tertiary)" }}>(Highest Composite Score)</span>
            </span>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>#</th>
                <th style={{ width: "220px" }}>Item Details</th>
                <th>Itemwise Supplier Bids & Composite Score</th>
                <th style={{ width: "240px" }}>Recommended Supplier & Reasons</th>
                <th style={{ textAlign: "center", width: "110px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {itemRecommendations.map((itemRec) => {
                const rec = itemRec.recommendedVendor;
                const confirmed = selections[itemRec.slNo];
                const displaySupplier = confirmed
                  ? itemRec.evaluations.find((e) => e.vendorName === confirmed.supplierName) || null
                  : null;

                return (
                  <tr key={itemRec.slNo}>
                    <td style={{ color: "var(--text-tertiary)", fontWeight: 500 }}>
                      {itemRec.slNo}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {itemRec.itemName}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-tertiary)",
                          marginTop: 2,
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={itemRec.technicalSpecification}
                      >
                        {itemRec.technicalSpecification || "N/A"}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "8px" }}>
                        {itemRec.evaluations.map((ev) => {
                          const isConfirmed = confirmed?.supplierName === ev.vendorName;
                          const isAiRec = ev.isRecommended;

                          let badgeStyle: React.CSSProperties = {
                            padding: "8px 12px",
                            borderRadius: "6px",
                            border: "1px solid var(--border)",
                            background: "var(--bg-subtle)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            outline: "none",
                          };

                          if (isConfirmed) {
                            badgeStyle = {
                              ...badgeStyle,
                              background: confirmed.isRecommended ? "#f0fdf4" : "#eff6ff",
                              borderColor: confirmed.isRecommended ? "#16a34a" : "#3b82f6",
                              boxShadow: `0 2px 5px ${confirmed.isRecommended ? "rgba(22, 163, 74, 0.2)" : "rgba(59, 130, 246, 0.25)"}`,
                            };
                          } else if (isAiRec && !confirmed) {
                            // Soft highlight AI recommended when nothing is selected yet
                            badgeStyle = {
                              ...badgeStyle,
                              borderColor: "#bbf7d0",
                              background: "#f9fefb",
                            };
                          }

                          return (
                            <div
                              key={ev.vendorName}
                              style={badgeStyle}
                              title={`Click to select ${ev.vendorName}`}
                              onClick={() => {
                                setConfirmModal({
                                  itemRec,
                                  targetSupplierName: ev.vendorName,
                                  isRecommended: ev.isRecommended,
                                  reasonText: confirmed?.supplierName === ev.vendorName ? confirmed.auditReason : "",
                                });
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "4px" }}>
                                <span style={{ fontWeight: 700, fontSize: "12px", color: isConfirmed ? (confirmed.isRecommended ? "#15803d" : "#1e40af") : "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px", display: "flex", alignItems: "center", gap: "3px" }} title={ev.vendorName}>
                                  #{ev.rank} {ev.vendorName}
                                  {isAiRec && !confirmed && <span style={{ fontSize: "9px", background: "#dcfce7", color: "#166534", padding: "1px 4px", borderRadius: "3px", fontWeight: 600 }}>AI Pick</span>}
                                  {isConfirmed && <span style={{ fontSize: "10px" }}>✓</span>}
                                </span>
                                <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: isConfirmed ? (confirmed.isRecommended ? "#16a34a" : "#2563eb") : "#64748b", color: "#ffffff", flexShrink: 0 }}>
                                  {ev.finalScore} pts
                                </span>
                              </div>

                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: "12px", marginTop: "2px" }}>
                                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                  ${ev.quotation?.unitRate.toLocaleString("en-US", { minimumFractionDigits: 2 })}/unit
                                </span>
                                <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                                  ${ev.quotation?.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} total
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td>
                      {itemRec.evaluations.length === 0 ? (
                        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "8px 10px", borderRadius: "6px" }}>
                          <span style={{ color: "#b91c1c", fontSize: "12px", fontWeight: 600 }}>⚠️ No supplier has quoted for this item</span>
                        </div>
                      ) : itemRec.evaluations.length === 1 ? (
                        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "8px 10px", borderRadius: "6px" }}>
                          <div style={{ fontSize: "11px", color: "#475569", fontWeight: 700 }}>ℹ️ Sole Bidder Offered:</div>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b", marginTop: "2px" }}>
                            {rec?.vendorName}
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "1px" }}>
                            ${rec?.quotation?.unitRate.toLocaleString("en-US", { minimumFractionDigits: 2 })} / unit
                          </div>
                          <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px", fontStyle: "italic" }}>
                            Single supplier quote available — no competitive comparison required.
                          </div>
                        </div>
                      ) : !confirmed ? (
                        // Nothing selected yet
                        <div style={{ background: "#fafafa", border: "1px dashed #cbd5e1", padding: "10px", borderRadius: "6px", textAlign: "center" }}>
                          <div style={{ fontSize: "18px", marginBottom: "4px" }}>👆</div>
                          <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>No supplier selected</div>
                          <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>Click a supplier card on the left to select</div>
                        </div>
                      ) : (
                        <div style={{ background: confirmed.isRecommended ? "#f0fdf4" : "#eff6ff", border: `1px solid ${confirmed.isRecommended ? "#bbf7d0" : "#bfdbfe"}`, padding: "8px 10px", borderRadius: "6px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "11px", color: confirmed.isRecommended ? "#166534" : "#1e40af", fontWeight: 700 }}>
                              {confirmed.isRecommended ? "💡 AI Recommended:" : "✍️ Manually Selected:"}
                            </span>
                            <span style={{ fontSize: "10px", fontWeight: 700, background: confirmed.isRecommended ? "#16a34a" : "#2563eb", color: "white", padding: "1px 5px", borderRadius: "3px" }}>
                              {displaySupplier?.finalScore} pts
                            </span>
                          </div>

                          <div style={{ fontSize: "13px", fontWeight: 700, color: confirmed.isRecommended ? "#15803d" : "#1e40af", marginTop: "3px" }}>
                            {displaySupplier?.vendorName}
                          </div>

                          <div style={{ fontSize: "11px", color: confirmed.isRecommended ? "#166534" : "#1e40af", marginTop: "1px", fontWeight: 600 }}>
                            ${displaySupplier?.quotation?.unitRate.toLocaleString("en-US", { minimumFractionDigits: 2 })}/unit · ${displaySupplier?.quotation?.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} total
                          </div>

                          {!confirmed.isRecommended && confirmed.auditReason && (
                            <div style={{ marginTop: "6px", fontSize: "10px", color: "#1e40af", borderTop: "1px dashed #bfdbfe", paddingTop: "4px" }}>
                              <strong>📝 Audit Reason Note:</strong>
                              <div style={{ marginTop: "2px", fontStyle: "italic", background: "#ffffff", padding: "4px 6px", borderRadius: "3px", border: "1px solid #dbeafe" }}>
                                "{confirmed.auditReason}"
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => {
                              const copy = { ...selections };
                              delete copy[itemRec.slNo];
                              setSelections(copy);
                            }}
                            style={{ marginTop: "6px", fontSize: "10px", color: "#64748b", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                          >
                            Change selection
                          </button>
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {rec ? (
                        <button
                          className="btn-reset-filters"
                          onClick={() => setActiveModalItem(itemRec)}
                          style={{ padding: "4px 8px", fontSize: "11px", whiteSpace: "nowrap" }}
                        >
                          📊 See Reasoning
                        </button>
                      ) : (
                        <span style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Drawer for 8-Metric Breakdown per Item */}
      {activeModalItem && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setActiveModalItem(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              maxWidth: "850px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              border: "1px solid var(--border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                  6-Metric Supplier Evaluation: {activeModalItem.itemName}
                </h3>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
                  Item Specifications: {activeModalItem.technicalSpecification || "Standard Procurement Item"}
                </p>
              </div>
              <button
                className="clear-search-btn"
                onClick={() => setActiveModalItem(null)}
                style={{ fontSize: "18px" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {activeModalItem.evaluations.map((ev) => (
                <div
                  key={ev.vendorName}
                  style={{
                    border: ev.isRecommended ? "2px solid #16a34a" : "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "16px",
                    background: ev.isRecommended ? "#f0fdf4" : "var(--bg-card)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
                        Rank #{ev.rank}: {ev.vendorName}
                      </span>
                      {ev.isRecommended && (
                        <span style={{ background: "#16a34a", color: "white", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>
                          💡 RECOMMENDED SUPPLIER
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {activeModalItem.evaluations.length > 1 && (
                        <button
                          onClick={() => {
                            setConfirmModal({
                              itemRec: activeModalItem,
                              targetSupplierName: ev.vendorName,
                              isRecommended: ev.isRecommended,
                              reasonText: selections[activeModalItem.slNo]?.supplierName === ev.vendorName ? selections[activeModalItem.slNo].auditReason : "",
                            });
                            setActiveModalItem(null);
                          }}
                          style={{
                            padding: "4px 10px",
                            fontSize: "11px",
                            fontWeight: 700,
                            borderRadius: "4px",
                            border: "none",
                            background: selections[activeModalItem.slNo]?.supplierName === ev.vendorName ? "#16a34a" : "#2563eb",
                            color: "#ffffff",
                            cursor: "pointer",
                          }}
                        >
                          {selections[activeModalItem.slNo]?.supplierName === ev.vendorName ? "✓ Selected" : "Select Supplier"}
                        </button>
                      )}
                      <div style={{ fontSize: "16px", fontWeight: 800, color: ev.isRecommended ? "#15803d" : "var(--text-primary)" }}>
                        Composite Score: {ev.finalScore} / 100
                      </div>
                    </div>
                  </div>

                  {/* 6-Metric Weighted Scores Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "12px" }}>
                    <div style={{ background: "#ffffff", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-light)" }}>
                      <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>Current Price (30%)</div>
                      <div style={{ fontSize: "14px", fontWeight: 700 }}>
                        {((ev.metrics.currentPriceScore * 0.30)).toFixed(2)} / 30
                      </div>
                    </div>
                    <div style={{ background: "#ffffff", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-light)" }}>
                      <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>Supplier Trust & Loyalty (20%)</div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#15803d" }}>
                        {((ev.metrics.trustScore * 0.20)).toFixed(2)} / 20
                      </div>
                    </div>
                    <div style={{ background: "#ffffff", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-light)" }}>
                      <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>Price Consistency (15%)</div>
                      <div style={{ fontSize: "14px", fontWeight: 700 }}>
                        {((ev.metrics.consistencyScore * 0.15)).toFixed(2)} / 15
                      </div>
                    </div>
                    <div style={{ background: "#ffffff", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-light)" }}>
                      <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>Item Experience (15%)</div>
                      <div style={{ fontSize: "14px", fontWeight: 700 }}>
                        {((ev.metrics.experienceScore * 0.15)).toFixed(2)} / 15
                      </div>
                    </div>
                    <div style={{ background: "#ffffff", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-light)" }}>
                      <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>Historical Win Rate (10%)</div>
                      <div style={{ fontSize: "14px", fontWeight: 700 }}>
                        {((ev.metrics.winRateScore * 0.10)).toFixed(2)} / 10
                      </div>
                    </div>
                    <div style={{ background: "#ffffff", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-light)" }}>
                      <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>Delivery Speed (10%)</div>
                      <div style={{ fontSize: "14px", fontWeight: 700 }}>
                        {((ev.metrics.deliveryScore * 0.10)).toFixed(2)} / 10
                      </div>
                    </div>
                  </div>

                  {/* Reasons Breakdown */}
                  {ev.isRecommended ? (
                    <div style={{ fontSize: "12px", color: "#15803d", background: "#ffffff", padding: "8px 12px", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                      <strong>Why Recommended:</strong>
                      <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                        {ev.reasonsForSelection.map((r, idx) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div style={{ fontSize: "12px", color: "#b91c1c", background: "#ffffff", padding: "8px 12px", borderRadius: "6px", border: "1px solid #fecaca" }}>
                      <strong>Reasons Why Not Selected:</strong>
                      <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                        {ev.reasonsAgainstSelection.map((r, idx) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
              <button className="btn-clear" onClick={() => setActiveModalItem(null)}>
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Confirmation / Audit Modal */}
      {confirmModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: "16px",
          }}
          onClick={() => setConfirmModal(null)}
        >
          <div
            style={{
              maxWidth: "500px",
              width: "100%",
              background: "#ffffff",
              borderRadius: "14px",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0,0,0,0.05)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <span style={{ fontSize: "26px" }}>{confirmModal.isRecommended ? "💡" : "✍️"}</span>
              <div>
                <h3 style={{ fontSize: "17px", fontWeight: 700, margin: 0, color: "#1e293b" }}>
                  {confirmModal.isRecommended ? "Confirm AI Recommended Supplier" : "Select Non-Recommended Supplier"}
                </h3>
                <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" }}>
                  Item: <strong>{confirmModal.itemRec.itemName}</strong>
                </p>
              </div>
            </div>

            {/* Supplier info pill */}
            <div
              style={{
                background: confirmModal.isRecommended ? "#f0fdf4" : "#eff6ff",
                border: `1px solid ${confirmModal.isRecommended ? "#bbf7d0" : "#bfdbfe"}`,
                padding: "10px 14px",
                borderRadius: "8px",
                marginBottom: "16px",
                fontSize: "13px",
                color: confirmModal.isRecommended ? "#166534" : "#1e40af",
                fontWeight: 600,
              }}
            >
              {confirmModal.isRecommended ? "✓ AI Recommended:" : "Selecting:"}{" "}
              <strong>{confirmModal.targetSupplierName}</strong>
            </div>

            {/* Mandatory audit reason — only for non-recommended */}
            {!confirmModal.isRecommended && (
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                  Selection Reason Note <span style={{ color: "#dc2626" }}>*</span>
                  <span style={{ fontWeight: 400, color: "#64748b", marginLeft: "4px" }}>(required for audit trail)</span>
                </label>
                <textarea
                  value={confirmModal.reasonText}
                  onChange={(e) => setConfirmModal({ ...confirmModal, reasonText: e.target.value })}
                  placeholder="e.g. Urgent delivery required within 24h, specific brand approved by department head, lower total cost after negotiation..."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "10px",
                    fontSize: "13px",
                    borderRadius: "6px",
                    border: `1px solid ${confirmModal.reasonText.trim() ? "#93c5fd" : "#fca5a5"}`,
                    outline: "none",
                    fontFamily: "inherit",
                    resize: "vertical",
                    boxSizing: "border-box",
                    transition: "border-color 0.15s",
                  }}
                />
                {!confirmModal.reasonText.trim() && (
                  <span style={{ fontSize: "11px", color: "#dc2626", marginTop: "4px", display: "block" }}>
                    ⚠ A reason note is required to select a non-recommended supplier.
                  </span>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: confirmModal.isRecommended ? "0" : undefined }}>
              <button
                className="btn-clear"
                onClick={() => setConfirmModal(null)}
                style={{ padding: "8px 14px", fontSize: "13px" }}
              >
                Cancel
              </button>
              <button
                disabled={!confirmModal.isRecommended && !confirmModal.reasonText.trim()}
                onClick={() => {
                  if (!confirmModal.isRecommended && !confirmModal.reasonText.trim()) return;
                  setSelections({
                    ...selections,
                    [confirmModal.itemRec.slNo]: {
                      supplierName: confirmModal.targetSupplierName,
                      auditReason: confirmModal.reasonText.trim(),
                      isRecommended: confirmModal.isRecommended,
                    },
                  });
                  setConfirmModal(null);
                }}
                style={{
                  padding: "8px 18px",
                  fontSize: "13px",
                  fontWeight: 700,
                  background: (!confirmModal.isRecommended && !confirmModal.reasonText.trim())
                    ? "#94a3b8"
                    : confirmModal.isRecommended ? "#16a34a" : "#1e40af",
                  color: "#ffffff",
                  borderRadius: "7px",
                  border: "none",
                  cursor: (!confirmModal.isRecommended && !confirmModal.reasonText.trim()) ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                }}
              >
                {confirmModal.isRecommended ? "✓ Confirm Selection" : "Confirm & Save Audit Note"}
              </button>
            </div>
          </div>
        </div>
      )}

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
  const [collapsed, setCollapsed] = useState(true);

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
