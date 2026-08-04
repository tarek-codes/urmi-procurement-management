"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CSValidationReport } from "@/lib/types";
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
  processFiles: (csFile: File, histFile: File) => Promise<void>;
  clearData: () => void;
  getReportById: (id: string) => CSValidationReport | undefined;
}

const ValidationContext = createContext<ValidationContextType | null>(null);

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

  return (
    <ValidationContext.Provider
      value={{
        reports,
        historicalRecords,
        csFileName,
        histFileName,
        isProcessing,
        error,
        processFiles,
        clearData,
        getReportById,
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
