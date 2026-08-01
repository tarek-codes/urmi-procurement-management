"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { HistoricalRecord, AnalyticsSummary } from "@/lib/historicalTypes";
import { parseHistoricalFile, computeHistoricalAnalytics } from "@/lib/historicalParser";

interface HistoricalContextType {
  records: HistoricalRecord[];
  analytics: AnalyticsSummary | null;
  isLoading: boolean;
  error: string | null;
  loadCustomFile: (file: File) => Promise<void>;
  resetToDefaultDB: () => void;
}

const HistoricalContext = createContext<HistoricalContextType | null>(null);

export function HistoricalProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<HistoricalRecord[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load the built-in database Excel on initial mount
  const loadDefaultDB = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/historical-db");
      if (!res.ok) {
        throw new Error("Failed to fetch default historical database.");
      }
      const buffer = await res.arrayBuffer();
      const parsedRecords = parseHistoricalFile(buffer);
      const computedAnalytics = computeHistoricalAnalytics(parsedRecords);

      setRecords(parsedRecords);
      setAnalytics(computedAnalytics);
    } catch (err) {
      console.error("Error loading default DB:", err);
      setError("Failed to load historical database.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDefaultDB();
  }, [loadDefaultDB]);

  const loadCustomFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const parsedRecords = parseHistoricalFile(buffer);
      const computedAnalytics = computeHistoricalAnalytics(parsedRecords);

      setRecords(parsedRecords);
      setAnalytics(computedAnalytics);
    } catch (err) {
      console.error("Error loading custom file:", err);
      setError("Failed to parse custom file.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetToDefaultDB = useCallback(() => {
    loadDefaultDB();
  }, [loadDefaultDB]);

  return (
    <HistoricalContext.Provider
      value={{
        records,
        analytics,
        isLoading,
        error,
        loadCustomFile,
        resetToDefaultDB,
      }}
    >
      {children}
    </HistoricalContext.Provider>
  );
}

export function useHistorical() {
  const ctx = useContext(HistoricalContext);
  if (!ctx) {
    throw new Error("useHistorical must be used within a HistoricalProvider");
  }
  return ctx;
}
