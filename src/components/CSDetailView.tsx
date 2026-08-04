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

  // Single confirmed CS supplier selection state for the entire CS
  const [csSelection, setCsSelection] = useState<{
    supplierName: string;
    auditReason: string;
    isRecommended: boolean;
  } | null>(null);

  // Confirmation/audit modal state for CS supplier selection
  const [confirmModal, setConfirmModal] = useState<{
    targetSupplierName: string;
    isRecommended: boolean;
    reasonText: string;
  } | null>(null);

  const failedRules = report.results.filter((r) => r.status === "failed");
  const passedRules = report.results.filter((r) => r.status === "passed");

  // Compute 6-metric weighted recommendation engine results for all items in this CS
  const itemRecommendations = useMemo(() => {
    return evaluateItemVendorRecommendations(report.items, historicalRecords);
  }, [report.items, historicalRecords]);

  // Collect unique suppliers and calculate CS-wide aggregate metrics
  const csSuppliersSummary = useMemo(() => {
    const map = new Map<
      string,
      { supplierName: string; totalCost: number; totalScore: number; count: number; aiPickCount: number }
    >();

    itemRecommendations.forEach((itemRec) => {
      itemRec.evaluations.forEach((ev) => {
        const name = ev.vendorName;
        const existing = map.get(name) || {
          supplierName: name,
          totalCost: 0,
          totalScore: 0,
          count: 0,
          aiPickCount: 0,
        };
        existing.totalCost += ev.quotation?.totalPrice || 0;
        existing.totalScore += ev.finalScore;
        existing.count += 1;
        if (ev.isRecommended) existing.aiPickCount += 1;
        map.set(name, existing);
      });
    });

    const list = Array.from(map.values()).map((s) => ({
      ...s,
      avgScore: Math.round((s.totalScore / (s.count || 1)) * 10) / 10,
    }));

    list.sort((a, b) => b.aiPickCount - a.aiPickCount || b.avgScore - a.avgScore);
    const overallAiPick = list.length > 0 ? list[0].supplierName : null;

    return { suppliers: list, overallAiPick };
  }, [itemRecommendations]);

  // Overall recommended total cost across all items
  const totalRecommendedCost = itemRecommendations.reduce(
    (sum, item) => sum + item.optimalTotalCost,
    0
  );

  // Total CS cost for the selected CS supplier
  const totalSelectedCsCost = useMemo(() => {
    if (!csSelection) return null;
    return itemRecommendations.reduce((sum, itemRec) => {
      const ev = itemRec.evaluations.find((e) => e.vendorName === csSelection.supplierName);
      return sum + (ev?.quotation?.totalPrice || 0);
    }, 0);
  }, [csSelection, itemRecommendations]);

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
              {report.overallStatus === "passed" ? "OK" : "Review Needed"}
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
        <div className="detail-stats" style={{ display: "flex", gap: "12px" }}>
          <div className="detail-stat" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
            <div className="detail-stat-value" style={{ color: "#15803d" }}>
              ${totalRecommendedCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div className="detail-stat-label" style={{ color: "#166534" }}>Recommended Total Cost</div>
          </div>
          {csSelection && totalSelectedCsCost !== null && (
            <div className="detail-stat" style={{ background: csSelection.isRecommended ? "#f0fdf4" : "#eff6ff", borderColor: csSelection.isRecommended ? "#bbf7d0" : "#bfdbfe" }}>
              <div className="detail-stat-value" style={{ color: csSelection.isRecommended ? "#15803d" : "#1e40af" }}>
                ${totalSelectedCsCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <div className="detail-stat-label" style={{ color: csSelection.isRecommended ? "#166534" : "#1e40af" }}>
                Awarded CS Total ({csSelection.supplierName})
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CS Supplier Award & Selection Card */}
      <div
        style={{
          background: csSelection ? (csSelection.isRecommended ? "#f0fdf4" : "#eff6ff") : "#f8fafc",
          border: `1px solid ${csSelection ? (csSelection.isRecommended ? "#bbf7d0" : "#bfdbfe") : "#e2e8f0"}`,
          borderRadius: "10px",
          padding: "16px 20px",
          marginBottom: "var(--space-xl)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>🏆 CS Supplier Award & Selection</span>
            </h3>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" }}>
              Select <strong>one supplier</strong> for this Comparative Statement (CS {report.csNo}).
            </p>
          </div>
          {csSelection && (
            <button
              onClick={() => setCsSelection(null)}
              style={{
                fontSize: "12px",
                color: "#475569",
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                padding: "4px 10px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Change CS Selection
            </button>
          )}
        </div>

        {/* Supplier Cards List for CS Selection */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px" }}>
          {csSuppliersSummary.suppliers.map((sup) => {
            const isSelected = csSelection?.supplierName === sup.supplierName;
            const isOverallAiPick = csSuppliersSummary.overallAiPick === sup.supplierName;

            return (
              <div
                key={sup.supplierName}
                onClick={() => {
                  setConfirmModal({
                    targetSupplierName: sup.supplierName,
                    isRecommended: isOverallAiPick,
                    reasonText: isSelected ? csSelection?.auditReason || "" : "",
                  });
                }}
                style={{
                  background: isSelected
                    ? (csSelection?.isRecommended ? "#dcfce7" : "#dbeafe")
                    : "#ffffff",
                  border: `2px solid ${
                    isSelected
                      ? (csSelection?.isRecommended ? "#16a34a" : "#2563eb")
                      : isOverallAiPick
                      ? "#86efac"
                      : "#cbd5e1"
                  }`,
                  borderRadius: "8px",
                  padding: "10px 14px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: isSelected ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: "13px", color: "#1e293b" }}>
                    {sup.supplierName}
                  </span>
                  {isSelected && (
                    <span style={{ fontSize: "11px", fontWeight: 700, color: csSelection?.isRecommended ? "#166534" : "#1e40af" }}>
                      ✓ Selected
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                  <span>Total: <strong>${sup.totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></span>
                  <span>Avg: <strong>{sup.avgScore} pts</strong></span>
                </div>

                {isOverallAiPick && (
                  <div style={{ marginTop: "6px" }}>
                    <span style={{ fontSize: "10px", background: "#16a34a", color: "#ffffff", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                      💡 Overall CS AI Pick ({sup.aiPickCount}/{itemRecommendations.length} Items)
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selection Details */}
        {csSelection ? (
          <div style={{ marginTop: "12px", background: "#ffffff", padding: "10px 14px", borderRadius: "6px", border: "1px solid rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: "12px", color: "#334155" }}>
              <strong>Confirmed Awarded Supplier for CS:</strong>{" "}
              <span style={{ color: csSelection.isRecommended ? "#15803d" : "#1e40af", fontWeight: 700 }}>
                {csSelection.supplierName}
              </span>
              {" · "}Total CS Amount: <strong>${totalSelectedCsCost?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
            </div>
            {!csSelection.isRecommended && csSelection.auditReason && (
              <div style={{ fontSize: "11px", color: "#1e40af", marginTop: "4px", fontStyle: "italic" }}>
                <strong>📝 Mandatory Selection Reason Note:</strong> "{csSelection.auditReason}"
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginTop: "10px", fontSize: "11px", color: "#64748b", fontStyle: "italic", textAlign: "center" }}>
            👆 Click a supplier card above or any bid card in the table below to select the supplier for this CS.
          </div>
        )}
      </div>

      {/* Items Section */}
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
            Items & Bids Breakdown ({itemRecommendations.length} Items)
          </div>
          <div style={{ display: "flex", gap: "12px", fontSize: "11px", fontWeight: 500 }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ background: "#16a34a", color: "white", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>
                AI Pick
              </span>
              <span style={{ color: "var(--text-tertiary)" }}>(Highest Composite Score per Item)</span>
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
                <th style={{ width: "260px" }}>Recommended Supplier & Reasons</th>
                <th style={{ textAlign: "center", width: "110px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {itemRecommendations.map((itemRec) => {
                const rec = itemRec.recommendedVendor;

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
                          const isCsSelected = csSelection?.supplierName === ev.vendorName;
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

                          if (isCsSelected) {
                            badgeStyle = {
                              ...badgeStyle,
                              background: csSelection?.isRecommended ? "#f0fdf4" : "#eff6ff",
                              borderColor: csSelection?.isRecommended ? "#16a34a" : "#3b82f6",
                              boxShadow: `0 2px 5px ${csSelection?.isRecommended ? "rgba(22, 163, 74, 0.2)" : "rgba(59, 130, 246, 0.25)"}`,
                            };
                          } else if (isAiRec) {
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
                              title={`Click to select ${ev.vendorName} for CS`}
                              onClick={() => {
                                const isOverallAiPick = csSuppliersSummary.overallAiPick === ev.vendorName;
                                setConfirmModal({
                                  targetSupplierName: ev.vendorName,
                                  isRecommended: isOverallAiPick,
                                  reasonText: isCsSelected ? csSelection?.auditReason || "" : "",
                                });
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "4px" }}>
                                <span
                                  style={{
                                    fontWeight: 700,
                                    fontSize: "12px",
                                    color: isCsSelected
                                      ? (csSelection?.isRecommended ? "#15803d" : "#1e40af")
                                      : "var(--text-primary)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    maxWidth: "120px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                  title={ev.vendorName}
                                >
                                  {ev.vendorName}
                                  {isAiRec && (
                                    <span style={{ fontSize: "9px", background: "#dcfce7", color: "#166534", padding: "1px 4px", borderRadius: "3px", fontWeight: 700 }}>
                                      AI Pick
                                    </span>
                                  )}
                                  {isCsSelected && <span style={{ fontSize: "10px" }}>✓</span>}
                                </span>
                                <span
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    background: isCsSelected
                                      ? (csSelection?.isRecommended ? "#16a34a" : "#2563eb")
                                      : "#64748b",
                                    color: "#ffffff",
                                    flexShrink: 0,
                                  }}
                                >
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
                      ) : (
                        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "8px 10px", borderRadius: "6px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "11px", color: "#166534", fontWeight: 700 }}>
                              💡 AI Recommended Item Supplier:
                            </span>
                            <span style={{ fontSize: "10px", fontWeight: 700, background: "#16a34a", color: "white", padding: "1px 5px", borderRadius: "3px" }}>
                              {rec?.finalScore} pts
                            </span>
                          </div>

                          <div style={{ fontSize: "13px", fontWeight: 700, color: "#15803d", marginTop: "3px" }}>
                            {rec?.vendorName}
                          </div>

                          <div style={{ fontSize: "11px", color: "#166534", marginTop: "1px", fontWeight: 600 }}>
                            ${rec?.quotation?.unitRate.toLocaleString("en-US", { minimumFractionDigits: 2 })}/unit · ${rec?.quotation?.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} total
                          </div>

                          <div style={{ marginTop: "6px", fontSize: "10px", color: "#15803d", borderTop: "1px dashed #bbf7d0", paddingTop: "4px" }}>
                            <strong>Key Reasons:</strong>
                            <ul style={{ margin: "2px 0 0 12px", padding: 0 }}>
                              {rec?.reasonsForSelection.slice(0, 2).map((r, idx) => (
                                <li key={idx}>{r}</li>
                              ))}
                            </ul>
                          </div>

                          {csSelection && csSelection.supplierName !== rec?.vendorName && (
                            <div style={{ marginTop: "6px", paddingTop: "4px", borderTop: "1px solid #dbeafe", fontSize: "10px", color: "#1e40af" }}>
                              ✍️ CS Awarded to: <strong>{csSelection.supplierName}</strong>
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

      {/* Modal / Drawer for 6-Metric Breakdown per Item */}
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
              {activeModalItem.evaluations.map((ev) => {
                const isCsSelected = csSelection?.supplierName === ev.vendorName;

                return (
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
                          {ev.vendorName}
                        </span>
                        {ev.isRecommended && (
                          <span style={{ background: "#16a34a", color: "white", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>
                            💡 RECOMMENDED ITEM SUPPLIER
                          </span>
                        )}
                        {isCsSelected && (
                          <span style={{ background: "#2563eb", color: "white", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>
                            ✓ CS AWARDED
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <button
                          onClick={() => {
                            const isOverallAiPick = csSuppliersSummary.overallAiPick === ev.vendorName;
                            setConfirmModal({
                              targetSupplierName: ev.vendorName,
                              isRecommended: isOverallAiPick,
                              reasonText: isCsSelected ? csSelection?.auditReason || "" : "",
                            });
                            setActiveModalItem(null);
                          }}
                          style={{
                            padding: "4px 10px",
                            fontSize: "11px",
                            fontWeight: 700,
                            borderRadius: "4px",
                            border: "none",
                            background: isCsSelected ? "#16a34a" : "#2563eb",
                            color: "#ffffff",
                            cursor: "pointer",
                          }}
                        >
                          {isCsSelected ? "✓ CS Selected" : "Select for CS"}
                        </button>
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
                        <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>Supplier Trust & Loyalty (32%)</div>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "#15803d" }}>
                          {((ev.metrics.trustScore * 0.32)).toFixed(2)} / 32
                        </div>
                      </div>
                      <div style={{ background: "#ffffff", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-light)" }}>
                        <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>Price Consistency (8%)</div>
                        <div style={{ fontSize: "14px", fontWeight: 700 }}>
                          {((ev.metrics.consistencyScore * 0.08)).toFixed(2)} / 8
                        </div>
                      </div>
                      <div style={{ background: "#ffffff", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-light)" }}>
                        <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>Item Experience (5%)</div>
                        <div style={{ fontSize: "14px", fontWeight: 700 }}>
                          {((ev.metrics.experienceScore * 0.05)).toFixed(2)} / 5
                        </div>
                      </div>
                      <div style={{ background: "#ffffff", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-light)" }}>
                        <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>Historical Win Rate (15%)</div>
                        <div style={{ fontSize: "14px", fontWeight: 700 }}>
                          {((ev.metrics.winRateScore * 0.15)).toFixed(2)} / 15
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
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
              <button className="btn-clear" onClick={() => setActiveModalItem(null)}>
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Confirmation / Audit Modal for CS Selection */}
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
                  {confirmModal.isRecommended ? "Confirm AI Recommended CS Supplier" : "Select Non-Recommended CS Supplier"}
                </h3>
                <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" }}>
                  Awarding Comparative Statement: <strong>{report.csNo}</strong>
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
              {confirmModal.isRecommended ? "✓ AI Recommended CS Supplier:" : "Selected CS Supplier:"}{" "}
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
                  placeholder="e.g. Supplier offers single-source procurement convenience, urgent delivery timeline, consolidated shipping rates..."
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
                  setCsSelection({
                    supplierName: confirmModal.targetSupplierName,
                    auditReason: confirmModal.reasonText.trim(),
                    isRecommended: confirmModal.isRecommended,
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
                {confirmModal.isRecommended ? "✓ Confirm CS Selection" : "Confirm & Save Audit Note"}
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
