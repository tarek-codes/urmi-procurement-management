import { CSItem } from "./types";

export interface SupplierHistoricalRating {
  supplierName: string;
  score: number; // 0 - 100
  grade: "A" | "B" | "C" | "D" | "F";
  fulfillmentRatePct: number;
  avgLeadTimeDays: number;
  onTimeDeliveryPct: number;
  totalOrdersInHistory: number;
}

export interface FlopItemAnalysis {
  item: CSItem;
  selectedSupplierName: string;
  selectedUnitRate: number;
  selectedTotalValue: number;
  selectedSupplierRating: SupplierHistoricalRating | null;

  recommendedSupplierName: string;
  recommendedUnitRate: number;
  recommendedTotalValue: number;
  recommendedSupplierRating: SupplierHistoricalRating | null;

  isFlop: boolean;
  potentialSavings: number;
  flopReasons: string[];
  recommendationExplanation: string;
}

export interface FlopCSAnalysis {
  csNo: string;
  companyName: string;
  csDate: string;
  procurer: string;
  totalItemsCount: number;
  flopItemsCount: number;
  isCsFlop: boolean;
  totalPotentialSavings: number;
  severity: "High" | "Medium" | "Low" | "Clean";
  itemAnalyses: FlopItemAnalysis[];
}

export interface FlopPurchaseSummary {
  totalCsAnalyzed: number;
  totalFlopCsCount: number;
  totalItemsAnalyzed: number;
  totalFlopItemsCount: number;
  totalPotentialSavingsLost: number;
  csAnalyses: FlopCSAnalysis[];
}
