"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CSValidationReport, CsSupplierSelectionRecord } from "@/lib/types";
import { HistoricalRecord } from "@/lib/historicalTypes";
import { parseExcelFile } from "@/lib/excelParser";
import { parseHistoricalFile } from "@/lib/historicalParser";
import { validateAllCS } from "@/lib/validator";

interface ValidationContextType {
  reports: CSValidationReport[];
  historicalRecords: HistoricalRecord[];
  csFileName: string | null;
  histFileName: string | null;
  isProcessing: boolean;
  error: string | null;
  selectedSuppliers: CsSupplierSelectionRecord[];
  processFiles: (csFile: File, histFile: File) => Promise<void>;
  clearData: () => void;
  getReportById: (id: string) => CSValidationReport | undefined;
  saveSelection: (record: { csNo: string; procurer: string; selectedSupplier: string; reasonNote: string }) => void;
  updateAuditStatus: (id: string, status: "Approved" | "Rejected", auditNote?: string) => void;
}

const ValidationContext = createContext<ValidationContextType | null>(null);

const DEFAULT_SELECTIONS: CsSupplierSelectionRecord[] = [
  {
    id: "sel-1",
    csNo: "CS251200123",
    procurer: "Procurer 10",
    selectedSupplier: "Supplier 758",
    reasonNote: "Lowest unit rates offered for primary steel items with verified delivery lead time.",
    selectedAt: "2026-08-04 10:15",
    status: "Approved",
  },
  {
    id: "sel-2",
    csNo: "CS251200124",
    procurer: "Procurer 12",
    selectedSupplier: "Supplier 576",
    reasonNote: "Sole bidder available with urgent 24-hour site delivery commitment.",
    selectedAt: "2026-08-04 11:30",
    status: "Pending",
  },
  {
    id: "sel-3",
    csNo: "CS251200125",
    procurer: "Procurer 15",
    selectedSupplier: "Supplier 219",
    reasonNote: "Overridden due to custom technical specification sample approval.",
    selectedAt: "2026-08-04 14:05",
    status: "Rejected",
    auditNote: "Specification sample approval documentation missing in archive.",
  },
];

export function ValidationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [reports, setReports] = useState<CSValidationReport[]>([]);
  const [historicalRecords, setHistoricalRecords] = useState<HistoricalRecord[]>([]);
  const [csFileName, setCsFileName] = useState<string | null>(null);
  const [histFileName, setHistFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedSuppliers, setSelectedSuppliers] = useState<CsSupplierSelectionRecord[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("cs_selected_suppliers");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // fallback
        }
      }
    }
    return DEFAULT_SELECTIONS;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("cs_selected_suppliers", JSON.stringify(selectedSuppliers));
    }
  }, [selectedSuppliers]);

  const processFiles = useCallback(async (csFile: File, histFile: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Parse both files in parallel
      const [csBuffer, histBuffer] = await Promise.all([
        csFile.arrayBuffer(),
        histFile.arrayBuffer(),
      ]);

      const documents = parseExcelFile(csBuffer);
      if (documents.length === 0) {
        setError("No valid CS data found in the CS file.");
        setReports([]);
        setCsFileName(null);
        setHistFileName(null);
        return;
      }

      const parsedHistorical = parseHistoricalFile(histBuffer);
      if (parsedHistorical.length === 0) {
        setError("No valid historical records found in the historical file.");
        return;
      }

      const validationReports = validateAllCS(documents);
      setReports(validationReports);
      setHistoricalRecords(parsedHistorical);
      setCsFileName(csFile.name);
      setHistFileName(histFile.name);
    } catch (err) {
      console.error("Error processing files:", err);
      setError(err instanceof Error ? err.message : "Failed to process the files.");
      setReports([]);
      setHistoricalRecords([]);
      setCsFileName(null);
      setHistFileName(null);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setReports([]);
    setHistoricalRecords([]);
    setCsFileName(null);
    setHistFileName(null);
    setError(null);
  }, []);

  const getReportById = useCallback(
    (id: string) => reports.find((r) => r.csId === id),
    [reports]
  );

  const saveSelection = useCallback(
    (record: { csNo: string; procurer: string; selectedSupplier: string; reasonNote: string }) => {
      setSelectedSuppliers((prev) => {
        // Check if selection already exists for this csNo
        const existingIndex = prev.findIndex((item) => item.csNo === record.csNo);
        const newRecord: CsSupplierSelectionRecord = {
          id: existingIndex >= 0 ? prev[existingIndex].id : `sel-${Date.now()}`,
          csNo: record.csNo,
          procurer: record.procurer || "Unknown Procurer",
          selectedSupplier: record.selectedSupplier,
          reasonNote: record.reasonNote,
          selectedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
          status: "Pending",
        };

        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newRecord;
          return updated;
        }
        return [newRecord, ...prev];
      });
    },
    []
  );

  const updateAuditStatus = useCallback(
    (id: string, status: "Approved" | "Rejected", auditNote?: string) => {
      setSelectedSuppliers((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status, auditNote: auditNote || item.auditNote } : item
        )
      );
    },
    []
  );

  return (
    <ValidationContext.Provider
      value={{
        reports,
        historicalRecords,
        csFileName,
        histFileName,
        isProcessing,
        error,
        selectedSuppliers,
        processFiles,
        clearData,
        getReportById,
        saveSelection,
        updateAuditStatus,
      }}
    >
      {children}
    </ValidationContext.Provider>
  );
}

export function useValidation() {
  const ctx = useContext(ValidationContext);
  if (!ctx) {
    throw new Error("useValidation must be used within a ValidationProvider");
  }
  return ctx;
}
