export interface HistoricalRecord {
  slNo: number;
  company: string;
  itemId: number;
  itemName: string;
  tsId: number;
  tsName: string;
  reqQty: number;
  reqUnit: string;
  csQty: number;
  csUnit: string;
  csRate: number;
  poQty: number;
  poUnit: string;
  poRate: number;
  grnQty: number;
  grnUnit: string;
  billQty: number;
  billUnit: string;
  billRate: number;
  category: string;
  subCategory: string;
  supplierName: string;
  reqNo: string;
  reqDate: string;
  csNo: string;
  csTsId: number;
  csTs: string;
  csAmount: number;
  poNo: string;
  poDate: string;
  poAmount: number;
  grnNo: string;
  grnDate: string;
  challanNo: string;
  challanDate: string;
  grnAmount: number;
  billNo: string;
  billDate: string;
  billAmount: number;
  qtyAnomalyFlag: string;
  priceAnomalyFlag: string;
  overallAnomalyFlag: string;
}

export interface AnalyticsSummary {
  totalRecords: number;
  totalCSAmount: number;
  totalPOAmount: number;
  totalBillAmount: number;
  totalPotentialSavingsLost: number;
  avgQuantityFulfillment: number;
  avgCycleTimeDays: number;
  avgLeadTimeDays: number;

  // 1. Savings Analysis
  savingsAnalysis: {
    totalSavingsLost: number;
    recordsWithSavingsLost: number;
    topSavingsLostItems: { itemName: string; supplier: string; savingsLost: number }[];
  };

  // 2. Quantity Utilization Analysis
  quantityUtilization: {
    avgReqToPoPct: number;
    avgPoToGrnPct: number;
    avgGrnToBillPct: number;
    overallFulfillmentPct: number;
  };

  // 3 & 15. Supplier Performance & Success Rate
  supplierPerformance: {
    supplierName: string;
    totalOrders: number;
    totalReqQty: number;
    totalGrnQty: number;
    fulfillmentRate: number;
    totalPoAmount: number;
    successRate: number; // % of orders with 100% GRN vs REQ
    avgLeadTimeDays: number;
  }[];

  // 4, 5, 14. Cycle Time & Lead Time & Bottlenecks
  cycleTimeAnalysis: {
    avgReqToPoDays: number;
    avgPoToGrnDays: number;
    avgGrnToBillDays: number;
    avgTotalCycleDays: number;
  };

  // 6. Cost Escalation Analysis
  costEscalation: {
    csToPoVariancePct: number;
    poToBillVariancePct: number;
    recordsWithEscalation: number;
    totalEscalatedAmount: number;
  };

  // 7. Purchase Value Analysis
  highestValuePurchases: {
    poNo: string;
    company: string;
    supplierName: string;
    itemName: string;
    poAmount: number;
    poDate: string;
  }[];

  // 8 & 17. Category-wise Spending
  categorySpending: {
    category: string;
    totalSpending: number;
    orderCount: number;
    avgPurchaseValue: number;
  }[];

  // 9. Supplier Concentration
  supplierConcentration: {
    supplierName: string;
    totalSpend: number;
    sharePercentage: number;
  }[];

  // 10. Purchase Frequency
  purchaseFrequency: {
    itemName: string;
    category: string;
    purchaseCount: number;
    totalQty: number;
  }[];

  // 11. Technical Specification Analysis
  tsAnalysis: {
    tsId: number;
    tsName: string;
    purchaseCount: number;
    totalSpend: number;
  }[];

  // 12. Supplier Price Consistency
  priceConsistency: {
    supplierName: string;
    itemName: string;
    minRate: number;
    maxRate: number;
    avgRate: number;
    variancePct: number;
  }[];

  // 13. Requisition to Delivery Success
  reqToDeliverySuccess: {
    totalRequestedQty: number;
    totalDeliveredQty: number;
    successRatePct: number;
  };

  // 16. Monthly Spending Trend
  monthlySpendingTrend: {
    monthYear: string;
    poAmount: number;
    billAmount: number;
  }[];

  // 18. Procurement Efficiency Score per Supplier / PO
  supplierEfficiencyScores: {
    supplierName: string;
    score: number; // 0 - 100
    fulfillmentScore: number;
    leadTimeScore: number;
    priceScore: number;
    grade: "A" | "B" | "C" | "D" | "F";
  }[];
}
