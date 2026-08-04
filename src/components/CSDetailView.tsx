"use client";

import React, { useState, useMemo } from "react";
import { CSValidationReport, ValidationResult } from "@/lib/types";
import { useHistorical } from "@/context/HistoricalContext";
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
  const { records: historicalRecords } = useHistorical();
  const [activeModalItem, setActiveModalItem] = useState<ItemRecommendationResult | null>(null);

  // Manual supplier selection overrides state keyed by item slNo
  const [overrides, setOverrides] = useState<
    Record<number, { supplierName: string; auditReason: string }>
  >({});

  // Active item pending override selection modal state
  const [overrideModal, setOverrideModal] = useState<{
    itemRec: ItemRecommendationResult;
    targetSupplierName: string;
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
                const activeOverride = overrides[itemRec.slNo];
                const displaySupplier = activeOverride
                  ? itemRec.evaluations.find((e) => e.vendorName === activeOverride.supplierName) || rec
                  : rec;

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
                          const isRec = ev.isRecommended;
                          const isSelected = displaySupplier?.vendorName === ev.vendorName;

                          let badgeStyle: React.CSSProperties = {
                            padding: "8px 12px",
                            borderRadius: "6px",
                            border: "1px solid var(--border)",
                            background: "var(--bg-subtle)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                            cursor: itemRec.evaluations.length > 1 ? "pointer" : "default",
                            transition: "all 0.15s ease",
                          };

                          if (isSelected) {
                            badgeStyle = {
                              ...badgeStyle,
                              background: activeOverride ? "#eff6ff" : "#f0fdf4",
                              borderColor: activeOverride ? "#3b82f6" : "#16a34a",
                              boxShadow: `0 2px 5px ${activeOverride ? "rgba(59, 130, 246, 0.25)" : "rgba(22, 163, 74, 0.2)"}`,
                            };
                          }

                          return (
                            <div
                              key={ev.vendorName}
                              style={badgeStyle}
                              title={itemRec.evaluations.length > 1 ? `Click to select ${ev.vendorName}` : ev.vendorName}
                              onClick={() => {
                                if (itemRec.evaluations.length <= 1) return;
                                if (ev.vendorName !== (rec?.vendorName || "")) {
                                  setOverrideModal({
                                    itemRec,
                                    targetSupplierName: ev.vendorName,
                                    reasonText: activeOverride?.supplierName === ev.vendorName ? activeOverride.auditReason : "",
                                  });
                                } else {
                                  // Reset override if user clicks AI recommended supplier back
                                  const copy = { ...overrides };
                                  delete copy[itemRec.slNo];
                                  setOverrides(copy);
                                }
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "4px" }}>
                                <span style={{ fontWeight: 700, fontSize: "12px", color: isSelected ? (activeOverride ? "#1e40af" : "#15803d") : "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px" }} title={ev.vendorName}>
                                  #{ev.rank} {ev.vendorName} {isSelected ? "✓" : ""}
                                </span>
                                <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: isSelected ? (activeOverride ? "#2563eb" : "#16a34a") : "#64748b", color: "#ffffff" }}>
                                  Score: {ev.finalScore}
                                </span>
                              </div>

                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: "12px", marginTop: "2px" }}>
                                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                  Rate: ${ev.quotation?.unitRate.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </span>
                                <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                                  Total: ${ev.quotation?.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
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
                      ) : (
                        <div style={{ background: activeOverride ? "#eff6ff" : "#f0fdf4", border: `1px solid ${activeOverride ? "#bfdbfe" : "#bbf7d0"}`, padding: "8px 10px", borderRadius: "6px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "11px", color: activeOverride ? "#1e40af" : "#166534", fontWeight: 700 }}>
                              {activeOverride ? "✍️ Manually Selected Supplier:" : "💡 Recommended Supplier:"}
                            </span>
                            <span style={{ fontSize: "10px", fontWeight: 700, background: activeOverride ? "#2563eb" : "#16a34a", color: "white", padding: "1px 5px", borderRadius: "3px" }}>
                              Score {displaySupplier?.finalScore}/100
                            </span>
                          </div>

                          <div style={{ fontSize: "13px", fontWeight: 700, color: activeOverride ? "#1e40af" : "#15803d", marginTop: "3px" }}>
                            {displaySupplier?.vendorName}
                          </div>

                          <div style={{ fontSize: "11px", color: activeOverride ? "#1e40af" : "#166534", marginTop: "1px", fontWeight: 600 }}>
                            ${displaySupplier?.quotation?.unitRate.toLocaleString("en-US", { minimumFractionDigits: 2 })} / unit (${displaySupplier?.quotation?.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} Total)
                          </div>

                          {activeOverride ? (
                            <div style={{ marginTop: "6px", fontSize: "10px", color: "#1e40af", borderTop: "1px dashed #bfdbfe", paddingTop: "4px" }}>
                              <strong>📝 Mandatory Audit Reason Note:</strong>
                              <div style={{ marginTop: "2px", fontStyle: "italic", background: "#ffffff", padding: "4px 6px", borderRadius: "3px", border: "1px solid #dbeafe" }}>
                                "{activeOverride.auditReason}"
                              </div>
                            </div>
                          ) : (
                            <div style={{ marginTop: "6px", fontSize: "10px", color: "#15803d", borderTop: "1px dashed #bbf7d0", paddingTop: "4px" }}>
                              <strong>Key Reasons:</strong>
                              <ul style={{ margin: "2px 0 0 12px", padding: 0 }}>
                                {rec?.reasonsForSelection.slice(0, 2).map((r, idx) => (
                                  <li key={idx}>{r}</li>
                                ))}
                              </ul>
                            </div>
                          )}
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
                            const rec = activeModalItem.recommendedVendor;
                            if (ev.vendorName !== (rec?.vendorName || "")) {
                              setOverrideModal({
                                itemRec: activeModalItem,
                                targetSupplierName: ev.vendorName,
                                reasonText: overrides[activeModalItem.slNo]?.supplierName === ev.vendorName ? overrides[activeModalItem.slNo].auditReason : "",
                              });
                            } else {
                              const copy = { ...overrides };
                              delete copy[activeModalItem.slNo];
                              setOverrides(copy);
                            }
                            setActiveModalItem(null);
                          }}
                          style={{
                            padding: "4px 10px",
                            fontSize: "11px",
                            fontWeight: 700,
                            borderRadius: "4px",
                            border: "none",
                            background: overrides[activeModalItem.slNo]?.supplierName === ev.vendorName || (!overrides[activeModalItem.slNo] && ev.isRecommended) ? "#16a34a" : "#2563eb",
                            color: "#ffffff",
                            cursor: "pointer",
                          }}
                        >
                          {overrides[activeModalItem.slNo]?.supplierName === ev.vendorName || (!overrides[activeModalItem.slNo] && ev.isRecommended) ? "✓ Selected" : "Select Supplier"}
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

      {/* Mandatory Audit Reason Note Modal for Manual Supplier Overrides */}
      {overrideModal && (
        <div
          className="modal-overlay"
          onClick={() => setOverrideModal(null)}
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
        >
          <div
            className="modal-card"
            style={{
              maxWidth: "500px",
              width: "100%",
              background: "#ffffff",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <span style={{ fontSize: "24px" }}>✍️</span>
              <div>
                <h3 style={{ fontSize: "17px", fontWeight: 700, margin: 0, color: "#1e293b" }}>
                  Mandatory Audit Reason Note
                </h3>
                <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" }}>
                  Item: <strong>{overrideModal.itemRec.itemName}</strong>
                </p>
              </div>
            </div>

            <div style={{ background: "#f1f5f9", padding: "10px 12px", borderRadius: "6px", marginBottom: "16px", fontSize: "12px", color: "#334155" }}>
              You are manually overriding the AI recommended supplier to select:
              <div style={{ fontWeight: 700, color: "#1e40af", fontSize: "13px", marginTop: "2px" }}>
                {overrideModal.targetSupplierName}
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                Audit Justification / Procurement Reason <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <textarea
                value={overrideModal.reasonText}
                onChange={(e) =>
                  setOverrideModal({
                    ...overrideModal,
                    reasonText: e.target.value,
                  })
                }
                placeholder="e.g. Urgent emergency delivery required within 24 hours / Specific technical brand sample approved by department head..."
                rows={4}
                style={{
                  width: "100%",
                  padding: "10px",
                  fontSize: "13px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  outline: "none",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
              <span style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>
                A mandatory justification note is required for internal & external procurement compliance audits.
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                className="btn-clear"
                onClick={() => setOverrideModal(null)}
                style={{ padding: "8px 14px", fontSize: "12px" }}
              >
                Cancel
              </button>
              <button
                disabled={!overrideModal.reasonText.trim()}
                onClick={() => {
                  if (!overrideModal.reasonText.trim()) return;
                  setOverrides({
                    ...overrides,
                    [overrideModal.itemRec.slNo]: {
                      supplierName: overrideModal.targetSupplierName,
                      auditReason: overrideModal.reasonText.trim(),
                    },
                  });
                  setOverrideModal(null);
                }}
                style={{
                  padding: "8px 16px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: overrideModal.reasonText.trim() ? "#1e40af" : "#94a3b8",
                  color: "#ffffff",
                  borderRadius: "6px",
                  border: "none",
                  cursor: overrideModal.reasonText.trim() ? "pointer" : "not-allowed",
                }}
              >
                Confirm & Save Audit Reason Note
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
