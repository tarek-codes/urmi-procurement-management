"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useValidation } from "@/context/ValidationContext";
import PaginationControls from "./PaginationControls";

type StatusFilter = "all" | "passed" | "failed";
type SortField = "csDate" | "errorCount" | "warningCount" | "csNo";
type SortOrder = "asc" | "desc";

interface Props {
  onSelectCS: (id: string) => void;
}

export default function CSTable({ onSelectCS }: Props) {
  const { reports } = useValidation();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [procurerFilter, setProcurerFilter] = useState("");
  const [itemCountFilter, setItemCountFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Sort state
  const [sortField, setSortField] = useState<SortField | "itemCount">("csDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Reset page to 1 when filters or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, companyFilter, procurerFilter, itemCountFilter, statusFilter, sortField, sortOrder]);

  // Extract unique companies, procurers, and item counts for dropdown filters
  const uniqueCompanies = useMemo(() => {
    const companies = new Set(reports.map((r) => r.companyName).filter(Boolean));
    return Array.from(companies).sort();
  }, [reports]);

  const uniqueProcurers = useMemo(() => {
    const procurers = new Set(reports.map((r) => r.procurer).filter(Boolean));
    return Array.from(procurers).sort();
  }, [reports]);

  const uniqueItemCounts = useMemo(() => {
    const counts = new Set(reports.map((r) => r.items.length));
    return Array.from(counts).sort((a, b) => a - b);
  }, [reports]);

  // Handle column header clicks for sorting
  const handleSort = (field: SortField | "itemCount") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Filter & Sort logic
  const filteredAndSortedReports = useMemo(() => {
    return reports
      .filter((r) => {
        // Status filter
        if (statusFilter !== "all" && r.overallStatus !== statusFilter) {
          return false;
        }

        // Company filter
        if (companyFilter && r.companyName !== companyFilter) {
          return false;
        }

        // Procurer filter
        if (procurerFilter && r.procurer !== procurerFilter) {
          return false;
        }

        // Item count filter
        if (itemCountFilter) {
          if (itemCountFilter.startsWith(">=")) {
            const min = parseInt(itemCountFilter.replace(">=", ""), 10);
            if (r.items.length < min) return false;
          } else if (parseInt(itemCountFilter, 10) !== r.items.length) {
            return false;
          }
        }

        // General search term
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matches =
            r.csNo.toLowerCase().includes(term) ||
            r.companyName.toLowerCase().includes(term) ||
            r.requisitionNo.toLowerCase().includes(term) ||
            r.procurer.toLowerCase().includes(term) ||
            r.csDate.toLowerCase().includes(term);

          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortField === "itemCount") {
          const valA = a.items.length;
          const valB = b.items.length;
          return sortOrder === "asc" ? valA - valB : valB - valA;
        }

        let valA: string | number = a[sortField];
        let valB: string | number = b[sortField];

        // Custom string comparison for date or csNo
        if (typeof valA === "string" && typeof valB === "string") {
          const comp = valA.localeCompare(valB);
          return sortOrder === "asc" ? comp : -comp;
        }

        // Numeric comparison for counts
        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [
    reports,
    statusFilter,
    companyFilter,
    procurerFilter,
    itemCountFilter,
    searchTerm,
    sortField,
    sortOrder,
  ]);

  const totalPages = Math.ceil(filteredAndSortedReports.length / pageSize);
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedReports.slice(start, start + pageSize);
  }, [filteredAndSortedReports, currentPage, pageSize]);

  if (reports.length === 0) return null;

  const resetFilters = () => {
    setSearchTerm("");
    setCompanyFilter("");
    setProcurerFilter("");
    setItemCountFilter("");
    setStatusFilter("all");
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    Boolean(companyFilter) ||
    Boolean(procurerFilter) ||
    Boolean(itemCountFilter) ||
    statusFilter !== "all";

  return (
    <div className="table-section">
      {/* Search & Filter Controls */}
      <div className="filter-controls-card">
        <div className="search-bar-wrapper">
          <svg
            className="search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search CS number, requisition, company, procurer, or date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={() => setSearchTerm("")}>
              ✕
            </button>
          )}
        </div>

        <div className="filter-dropdowns-row">
          <div className="filter-group">
            <label>Company</label>
            <select
              className="filter-select"
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
            >
              <option value="">All Companies</option>
              {uniqueCompanies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Procurer</label>
            <select
              className="filter-select"
              value={procurerFilter}
              onChange={(e) => setProcurerFilter(e.target.value)}
            >
              <option value="">All Procurers</option>
              {uniqueProcurers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Item Count</label>
            <select
              className="filter-select"
              value={itemCountFilter}
              onChange={(e) => setItemCountFilter(e.target.value)}
            >
              <option value="">All Item Counts</option>
              {uniqueItemCounts.map((cnt) => (
                <option key={cnt} value={String(cnt)}>
                  {cnt} {cnt === 1 ? "Item" : "Items"}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Sort By</label>
            <select
              className="filter-select"
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const parts = e.target.value.split("-");
                const field = parts[0] as SortField | "itemCount";
                const order = parts[1] as SortOrder;
                setSortField(field);
                setSortOrder(order);
              }}
            >
              <option value="csDate-desc">Date (Newest First)</option>
              <option value="csDate-asc">Date (Oldest First)</option>
              <option value="itemCount-desc">Items Count (Highest First)</option>
              <option value="itemCount-asc">Items Count (Lowest First)</option>
              <option value="errorCount-desc">Errors (Highest First)</option>
              <option value="warningCount-desc">Warnings (Highest First)</option>
              <option value="csNo-asc">CS Number (A-Z)</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button className="btn-reset-filters" onClick={resetFilters}>
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Table Header & Status Pills */}
      <div className="table-header">
        <div>
          <span className="table-title">Validation Results</span>
          <span className="table-count" style={{ marginLeft: 8 }}>
            {filteredAndSortedReports.length} of {reports.length}
          </span>
        </div>
        <div className="table-filters">
          <button
            className={`filter-btn ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            All
          </button>
          <button
            className={`filter-btn ${statusFilter === "passed" ? "active" : ""}`}
            onClick={() => setStatusFilter("passed")}
          >
            Passed
          </button>
          <button
            className={`filter-btn ${statusFilter === "failed" ? "active" : ""}`}
            onClick={() => setStatusFilter("failed")}
          >
            Review Needed
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="table-wrapper">
        <table className="cs-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("csNo")} className="sortable-th">
                CS Number {sortField === "csNo" && (sortOrder === "asc" ? "▲" : "▼")}
              </th>
              <th>Company</th>
              <th>Requisition</th>
              <th>Procurer</th>
              <th onClick={() => handleSort("csDate")} className="sortable-th">
                Date {sortField === "csDate" && (sortOrder === "asc" ? "▲" : "▼")}
              </th>
              <th onClick={() => handleSort("itemCount")} className="sortable-th">
                Items {sortField === "itemCount" && (sortOrder === "asc" ? "▲" : "▼")}
              </th>
              <th>Status</th>
              <th onClick={() => handleSort("errorCount")} className="sortable-th">
                Errors {sortField === "errorCount" && (sortOrder === "asc" ? "▲" : "▼")}
              </th>
              <th onClick={() => handleSort("warningCount")} className="sortable-th">
                Warnings {sortField === "warningCount" && (sortOrder === "asc" ? "▲" : "▼")}
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginatedReports.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: "32px", color: "var(--text-tertiary)" }}>
                  No Comparative Statements match your current filters.
                </td>
              </tr>
            ) : (
              paginatedReports.map((report) => (
                <tr
                  key={report.csId}
                  onClick={() => onSelectCS(report.csId)}
                >
                  <td className="cs-no-cell">{report.csNo}</td>
                  <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {report.companyName}
                  </td>
                  <td>{report.requisitionNo}</td>
                  <td className="td-procurer">{report.procurer}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{report.csDate}</td>
                  <td style={{ textAlign: "center", fontWeight: 600 }}>{report.items.length}</td>
                  <td>
                    {report.results.some((r) => r.ruleId === 4 && r.message.startsWith("No Supplier")) ? (
                      <span className="status-badge failed" style={{ background: "#fef2f2", color: "#dc2626", borderColor: "#fecaca" }}>
                        <span className="status-dot" style={{ background: "#dc2626" }}></span>
                        No Supplier Quotations
                      </span>
                    ) : (
                      <span className={`status-badge ${report.overallStatus}`}>
                        <span className="status-dot"></span>
                        {report.overallStatus === "passed" ? "Passed" : "Review Needed"}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`count-badge ${report.errorCount > 0 ? "error-count" : "zero"}`}>
                      {report.errorCount}
                    </span>
                  </td>
                  <td>
                    <span className={`count-badge ${report.warningCount > 0 ? "warning-count" : "zero"}`}>
                      {report.warningCount}
                    </span>
                  </td>
                  <td>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--text-tertiary)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredAndSortedReports.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 25, 50, 100, 250]}
        />
      </div>
    </div>
  );
}

