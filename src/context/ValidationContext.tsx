"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CSValidationReport } from "@/lib/types";
import { parseExcelFile } from "@/lib/excelParser";
import { validateAllCS } from "@/lib/validator";

interface ValidationContextType {
  reports: CSValidationReport[];
  fileName: string | null;
  isProcessing: boolean;
  error: string | null;
  processFile: (file: File) => Promise<void>;
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
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      const documents = parseExcelFile(buffer);

      if (documents.length === 0) {
        setError("No valid CS data found in the uploaded file.");
        setReports([]);
        setFileName(null);
        return;
      }

      const validationReports = validateAllCS(documents);
      setReports(validationReports);
      setFileName(file.name);
    } catch (err) {
      console.error("Error processing file:", err);
      setError(
        err instanceof Error ? err.message : "Failed to process the file."
      );
      setReports([]);
      setFileName(null);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setReports([]);
    setFileName(null);
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
        fileName,
        isProcessing,
        error,
        processFile,
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
