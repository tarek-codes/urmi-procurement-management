"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useValidation } from "@/context/ValidationContext";

export default function SelectedSuppliersPage() {
  const { selectedSuppliers, updateAuditStatus } = useValidation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Pending" | "Approved" | "Rejected">("ALL");

  // Rejection modal state for auditor
  const [rejectModal, setRejectModal] = useState<{ id: string; csNo: string; note: string } | null>(null);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return selectedSuppliers.filter((rec) => {
      const matchesSearch =
        rec.csNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.procurer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.selectedSupplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.reasonNote.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || rec.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [selectedSuppliers, searchQuery, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = selectedSuppliers.length;
    const pending = selectedSuppliers.filter((s) => s.status === "Pending").length;
    const approved = selectedSuppliers.filter((s) => s.status === "Approved").length;
    const rejected = selectedSuppliers.filter((s) => s.status === "Rejected").length;
    return { total, pending, approved, rejected };
  }, [selectedSuppliers]);

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
          Selected Suppliers
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
          Auditor Review & Decision Log for Procurer CS Supplier Selections
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
            fontWeight: 600,
            fontSize: "13px",
            background: "var(--bg-subtle)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
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
            fontWeight: 700,
            fontSize: "13px",
            background: "#2563eb",
            color: "#ffffff",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>🏆 Selected Suppliers</span>
          <span
            style={{
              background: "rgba(255, 255, 255, 0.25)",
              color: "#ffffff",
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

      {/* Stats Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: "#ffffff", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-tertiary)", fontWeight: 600 }}>Total Selections</div>
          <div style={{ fontSize: "22px", fontWeight: 700, marginTop: "4px", color: "#1e293b" }}>{stats.total}</div>
        </div>
        <div style={{ background: "#fdf8f6", border: "1px solid #fecdd3", borderRadius: "10px", padding: "16px" }}>
          <div style={{ fontSize: "11px", color: "#b45309", fontWeight: 600 }}>Pending Audit</div>
          <div style={{ fontSize: "22px", fontWeight: 700, marginTop: "4px", color: "#d97706" }}>{stats.pending}</div>
        </div>
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "16px" }}>
          <div style={{ fontSize: "11px", color: "#166534", fontWeight: 600 }}>Approved</div>
          <div style={{ fontSize: "22px", fontWeight: 700, marginTop: "4px", color: "#16a34a" }}>{stats.approved}</div>
        </div>
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "16px" }}>
          <div style={{ fontSize: "11px", color: "#991b1b", fontWeight: 600 }}>Rejected</div>
          <div style={{ fontSize: "22px", fontWeight: 700, marginTop: "4px", color: "#dc2626" }}>{stats.rejected}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", minWidth: "280px" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search CS#, Procurer, Supplier, or Reason..."
            style={{
              width: "100%",
              padding: "8px 12px 8px 32px",
              fontSize: "13px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              outline: "none",
            }}
          />
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          {(["ALL", "Pending", "Approved", "Rejected"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "6px",
                border: statusFilter === st ? "none" : "1px solid var(--border)",
                background: statusFilter === st ? "#1e293b" : "#ffffff",
                color: statusFilter === st ? "#ffffff" : "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Suppliers Audit Table */}
      <div className="table-wrapper">
        <table className="items-table">
          <thead>
            <tr>
              <th style={{ width: "130px" }}>CS Number</th>
              <th style={{ width: "140px" }}>Procurer Name</th>
              <th style={{ width: "160px" }}>Selected Supplier</th>
              <th>Selection Reason Note</th>
              <th style={{ width: "120px", textAlign: "center" }}>Audit Status</th>
              <th style={{ width: "170px", textAlign: "center" }}>Auditor Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--text-tertiary)" }}>
                  No selected supplier audit records found.
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec) => (
                <tr key={rec.id}>
                  <td>
                    <span style={{ fontWeight: 700, color: "#1e293b" }}>{rec.csNo}</span>
                    <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>{rec.selectedAt}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{rec.procurer}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: "#2563eb" }}>{rec.selectedSupplier}</span>
                  </td>
                  <td>
                    <div style={{ fontSize: "12px", color: "#334155", fontStyle: "italic", background: "#f8fafc", padding: "8px 10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                      "{rec.reasonNote}"
                    </div>
                    {rec.auditNote && (
                      <div style={{ fontSize: "11px", color: "#dc2626", marginTop: "4px" }}>
                        <strong>Auditor Note:</strong> {rec.auditNote}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background:
                          rec.status === "Approved"
                            ? "#dcfce7"
                            : rec.status === "Rejected"
                            ? "#fee2e2"
                            : "#fef3c7",
                        color:
                          rec.status === "Approved"
                            ? "#15803d"
                            : rec.status === "Rejected"
                            ? "#b91c1c"
                            : "#b45309",
                        display: "inline-block",
                      }}
                    >
                      {rec.status === "Approved" ? "✓ Approved" : rec.status === "Rejected" ? "✕ Rejected" : "⏳ Pending"}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                      <button
                        onClick={() => updateAuditStatus(rec.id, "Approved")}
                        disabled={rec.status === "Approved"}
                        style={{
                          padding: "5px 10px",
                          fontSize: "11px",
                          fontWeight: 700,
                          borderRadius: "4px",
                          border: "none",
                          background: rec.status === "Approved" ? "#cbd5e1" : "#16a34a",
                          color: "#ffffff",
                          cursor: rec.status === "Approved" ? "not-allowed" : "pointer",
                        }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectModal({ id: rec.id, csNo: rec.csNo, note: rec.auditNote || "" })}
                        disabled={rec.status === "Rejected"}
                        style={{
                          padding: "5px 10px",
                          fontSize: "11px",
                          fontWeight: 700,
                          borderRadius: "4px",
                          border: "none",
                          background: rec.status === "Rejected" ? "#cbd5e1" : "#dc2626",
                          color: "#ffffff",
                          cursor: rec.status === "Rejected" ? "not-allowed" : "pointer",
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Auditor Rejection Reason Modal */}
      {rejectModal && (
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
          onClick={() => setRejectModal(null)}
        >
          <div
            style={{
              maxWidth: "460px",
              width: "100%",
              background: "#ffffff",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "17px", fontWeight: 700, margin: "0 0 4px 0", color: "#1e293b" }}>
              Reject CS Selection
            </h3>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 16px 0" }}>
              CS Number: <strong>{rejectModal.csNo}</strong>
            </p>

            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
              Auditor Rejection Remark (Optional)
            </label>
            <textarea
              value={rejectModal.note}
              onChange={(e) => setRejectModal({ ...rejectModal, note: e.target.value })}
              placeholder="e.g. Mandatory brand approval missing, price exceeds budget tolerance..."
              rows={3}
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "13px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                outline: "none",
                fontFamily: "inherit",
                marginBottom: "16px",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                className="btn-clear"
                onClick={() => setRejectModal(null)}
                style={{ padding: "8px 14px", fontSize: "12px" }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateAuditStatus(rejectModal.id, "Rejected", rejectModal.note.trim());
                  setRejectModal(null);
                }}
                style={{
                  padding: "8px 16px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: "#dc2626",
                  color: "#ffffff",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
