import * as XLSX from "xlsx";
import { HistoricalRecord, AnalyticsSummary } from "./historicalTypes";

/** Format Excel Date serial number to YYYY-MM-DD */
export function formatExcelDate(val: unknown): string {
  if (val instanceof Date) {
    return val.toISOString().split("T")[0];
  }
  if (typeof val === "number" && val > 20000) {
    const date = new Date((val - 25569) * 86400 * 1000);
    return date.toISOString().split("T")[0];
  }
  if (typeof val === "string") {
    const str = val.trim();
    if (str.match(/\d{4}-\d{2}-\d{2}/)) return str;
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    return str;
  }
  return String(val || "");
}

/** Parse numeric safely */
function parseNum(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/,/g, "").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

/** Parse ArrayBuffer into HistoricalRecord[] */
export function parseHistoricalFile(buffer: ArrayBuffer): HistoricalRecord[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName =
    workbook.SheetNames.find((n) => n.includes("Report") || n.includes("Cycle")) ||
    workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
  });

  return rawRows.map((row) => ({
    slNo: parseNum(row["SL No"] || row["SL_NO"]),
    company: String(row["COMPANY"] || "").trim(),
    itemId: parseNum(row["ITEM_ID"]),
    itemName: String(row["ITEM_NAME"] || "").trim(),
    tsId: parseNum(row["TS_ID"]),
    tsName: String(row["TS_NAME"] || "").trim(),
    reqQty: parseNum(row["REQ_QTY"]),
    reqUnit: String(row["REQ_UNIT"] || "").trim(),
    csQty: parseNum(row["CS_QTY"]),
    csUnit: String(row["CS_UNIT"] || "").trim(),
    csRate: parseNum(row["CS_RATE"]),
    poQty: parseNum(row["PO_QTY"]),
    poUnit: String(row["PO_UNIT"] || "").trim(),
    poRate: parseNum(row["PO_RATE"]),
    grnQty: parseNum(row["GRN_QTY"]),
    grnUnit: String(row["GRN_UNIT"] || "").trim(),
    billQty: parseNum(row["BILL_QTY"]),
    billUnit: String(row["BILL_UNIT"] || "").trim(),
    billRate: parseNum(row["BILL_RATE"]),
    category: String(row["CATAGORY"] || row["CATEGORY"] || "").trim(),
    subCategory: String(row["SUB_CATAGORY"] || row["SUB_CATEGORY"] || "").trim(),
    supplierName: String(row["SUPPLIER_NAME"] || "").trim(),
    reqNo: String(row["REQ_NO"] || "").trim(),
    reqDate: formatDate(row["REQ_DATE"]),
    csNo: String(row["CS_NO"] || "").trim(),
    csTsId: parseNum(row["CS_TS_ID"]),
    csTs: String(row["CS_TS"] || "").trim(),
    csAmount: parseNum(row["CS_AMOUNT"]),
    poNo: String(row["PO_NO"] || "").trim(),
    poDate: formatDate(row["PO_DATE"]),
    poAmount: parseNum(row["PO_AMOUNT"]),
    grnNo: String(row["GRN_NO"] || "").trim(),
    grnDate: formatDate(row["GRN_DATE"]),
    challanNo: String(row["CHALLAN_NO"] || "").trim(),
    challanDate: formatDate(row["CHALLAN_DATE"]),
    grnAmount: parseNum(row["GRN_AMOUNT"]),
    billNo: String(row["BILL_NO"] || "").trim(),
    billDate: formatDate(row["BILL_DATE"]),
    billAmount: parseNum(row["BILL_AMOUNT"]),
    qtyAnomalyFlag: String(row["QTY_ANOMALY_FLAG"] || "").trim(),
    priceAnomalyFlag: String(row["PRICE_ANOMALY_FLAG"] || "").trim(),
    overallAnomalyFlag: String(row["OVERALL_ANOMALY_FLAG"] || "").trim(),
  }));
}

function formatDate(val: unknown): string {
  return formatExcelDate(val);
}

/** Compute all 18 Analysis Metrics from Historical Dataset */
export function computeHistoricalAnalytics(records: HistoricalRecord[]): AnalyticsSummary {
  const totalRecords = records.length;
  if (totalRecords === 0) return createEmptyAnalytics();

  let totalCSAmount = 0;
  let totalPOAmount = 0;
  let totalBillAmount = 0;

  let totalSavingsLost = 0;
  let recordsWithSavingsLost = 0;
  const savingsLostList: { itemName: string; supplier: string; savingsLost: number }[] = [];

  let sumReqToPoPct = 0;
  let sumPoToGrnPct = 0;
  let sumGrnToBillPct = 0;

  let totalReqQty = 0;
  let totalGrnQty = 0;

  let sumReqToPoDays = 0;
  let sumPoToGrnDays = 0;
  let sumGrnToBillDays = 0;

  let totalEscalatedAmount = 0;
  let recordsWithEscalation = 0;

  // Supplier aggregations
  const supplierMap = new Map<
    string,
    {
      totalOrders: number;
      totalReqQty: number;
      totalGrnQty: number;
      totalPoAmount: number;
      fullDeliveries: number;
      leadTimeDaysSum: number;
      leadTimeCount: number;
      csRateSum: number;
      poRateSum: number;
    }
  >();

  // Category aggregations
  const categoryMap = new Map<
    string,
    { totalSpend: number; count: number }
  >();

  // Frequency aggregations
  const frequencyMap = new Map<
    string,
    { itemName: string; category: string; count: number; totalQty: number }
  >();

  // TS aggregations
  const tsMap = new Map<
    number,
    { tsId: number; tsName: string; count: number; totalSpend: number }
  >();

  // Price consistency by (Supplier + Item)
  const priceConsistencyMap = new Map<
    string,
    { supplierName: string; itemName: string; rates: number[] }
  >();

  // Monthly spending
  const monthlyMap = new Map<
    string,
    { poAmount: number; billAmount: number }
  >();

  for (const r of records) {
    totalCSAmount += r.csAmount;
    totalPOAmount += r.poAmount;
    totalBillAmount += r.billAmount;

    totalReqQty += r.reqQty;
    totalGrnQty += r.grnQty;

    // 1. Savings Lost Analysis (CS_RATE > PO_RATE or Price Anomalies)
    if (r.csRate > r.poRate) {
      const diff = (r.csRate - r.poRate) * r.poQty;
      totalSavingsLost += diff;
      recordsWithSavingsLost++;
      savingsLostList.push({
        itemName: r.itemName,
        supplier: r.supplierName,
        savingsLost: diff,
      });
    }

    // 2. Quantity Utilization
    const reqToPo = r.reqQty > 0 ? (r.poQty / r.reqQty) * 100 : 100;
    const poToGrn = r.poQty > 0 ? (r.grnQty / r.poQty) * 100 : 100;
    const grnToBill = r.grnQty > 0 ? (r.billQty / r.grnQty) * 100 : 100;
    sumReqToPoPct += reqToPo;
    sumPoToGrnPct += poToGrn;
    sumGrnToBillPct += grnToBill;

    // 4 & 5. Days Calculations
    const reqDate = new Date(r.reqDate);
    const poDate = new Date(r.poDate);
    const grnDate = new Date(r.grnDate);
    const billDate = new Date(r.billDate);

    const dReqPo = getDaysDiff(reqDate, poDate);
    const dPoGrn = getDaysDiff(poDate, grnDate);
    const dGrnBill = getDaysDiff(grnDate, billDate);

    sumReqToPoDays += dReqPo;
    sumPoToGrnDays += dPoGrn;
    sumGrnToBillDays += dGrnBill;

    // 6. Cost Escalation (Bill Amount > CS Amount)
    if (r.billAmount > r.csAmount) {
      recordsWithEscalation++;
      totalEscalatedAmount += r.billAmount - r.csAmount;
    }

    // Supplier aggregates
    const supName = r.supplierName || "Unknown";
    if (!supplierMap.has(supName)) {
      supplierMap.set(supName, {
        totalOrders: 0,
        totalReqQty: 0,
        totalGrnQty: 0,
        totalPoAmount: 0,
        fullDeliveries: 0,
        leadTimeDaysSum: 0,
        leadTimeCount: 0,
        csRateSum: 0,
        poRateSum: 0,
      });
    }
    const sup = supplierMap.get(supName)!;
    sup.totalOrders++;
    sup.totalReqQty += r.reqQty;
    sup.totalGrnQty += r.grnQty;
    sup.totalPoAmount += r.poAmount;
    if (r.grnQty >= r.reqQty && r.reqQty > 0) {
      sup.fullDeliveries++;
    }
    if (dPoGrn >= 0) {
      sup.leadTimeDaysSum += dPoGrn;
      sup.leadTimeCount++;
    }
    sup.csRateSum += r.csRate;
    sup.poRateSum += r.poRate;

    // Category aggregates
    const catName = r.category || "Uncategorized";
    if (!categoryMap.has(catName)) {
      categoryMap.set(catName, { totalSpend: 0, count: 0 });
    }
    const cat = categoryMap.get(catName)!;
    cat.totalSpend += r.poAmount;
    cat.count++;

    // Frequency aggregates
    const itemKey = r.itemName;
    if (!frequencyMap.has(itemKey)) {
      frequencyMap.set(itemKey, {
        itemName: r.itemName,
        category: catName,
        count: 0,
        totalQty: 0,
      });
    }
    const freq = frequencyMap.get(itemKey)!;
    freq.count++;
    freq.totalQty += r.poQty;

    // TS aggregates
    const tsId = r.tsId || 0;
    if (tsId > 0) {
      if (!tsMap.has(tsId)) {
        tsMap.set(tsId, {
          tsId,
          tsName: r.tsName || `TS-${tsId}`,
          count: 0,
          totalSpend: 0,
        });
      }
      const ts = tsMap.get(tsId)!;
      ts.count++;
      ts.totalSpend += r.poAmount;
    }

    // Price Consistency (Supplier + Item)
    const consistencyKey = `${supName}::${r.itemName}`;
    if (!priceConsistencyMap.has(consistencyKey)) {
      priceConsistencyMap.set(consistencyKey, {
        supplierName: supName,
        itemName: r.itemName,
        rates: [],
      });
    }
    priceConsistencyMap.get(consistencyKey)!.rates.push(r.poRate);

    // Monthly Spending
    const monthKey = r.poDate ? r.poDate.substring(0, 7) : "2024-01";
    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, { poAmount: 0, billAmount: 0 });
    }
    const m = monthlyMap.get(monthKey)!;
    m.poAmount += r.poAmount;
    m.billAmount += r.billAmount;
  }

  // 1. Top Savings Lost Items
  const topSavingsLostItems = savingsLostList
    .sort((a, b) => b.savingsLost - a.savingsLost)
    .slice(0, 5);

  // 3 & 15. Supplier Performance Array
  const supplierPerformance = Array.from(supplierMap.entries()).map(
    ([name, s]) => {
      const fulfillmentRate =
        s.totalReqQty > 0 ? (s.totalGrnQty / s.totalReqQty) * 100 : 100;
      const successRate = (s.fullDeliveries / s.totalOrders) * 100;
      const avgLeadTimeDays =
        s.leadTimeCount > 0 ? Math.round(s.leadTimeDaysSum / s.leadTimeCount) : 0;

      return {
        supplierName: name,
        totalOrders: s.totalOrders,
        totalReqQty: s.totalReqQty,
        totalGrnQty: s.totalGrnQty,
        fulfillmentRate: Math.round(fulfillmentRate * 10) / 10,
        totalPoAmount: s.totalPoAmount,
        successRate: Math.round(successRate * 10) / 10,
        avgLeadTimeDays,
      };
    }
  );

  // 7. Highest Value Purchases (Top 10)
  const highestValuePurchases = records
    .map((r) => ({
      poNo: r.poNo,
      company: r.company,
      supplierName: r.supplierName,
      itemName: r.itemName,
      poAmount: r.poAmount,
      poDate: r.poDate,
    }))
    .sort((a, b) => b.poAmount - a.poAmount)
    .slice(0, 10);

  // 8 & 17. Category Spending Array
  const categorySpending = Array.from(categoryMap.entries()).map(
    ([cat, val]) => ({
      category: cat,
      totalSpending: val.totalSpend,
      orderCount: val.count,
      avgPurchaseValue: Math.round(val.totalSpend / val.count),
    })
  );

  // 9. Supplier Concentration Array
  const supplierConcentration = Array.from(supplierMap.entries())
    .map(([name, val]) => ({
      supplierName: name,
      totalSpend: val.totalPoAmount,
      sharePercentage:
        totalPOAmount > 0
          ? Math.round((val.totalPoAmount / totalPOAmount) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.totalSpend - a.totalSpend);

  // 10. Purchase Frequency Array
  const purchaseFrequency = Array.from(frequencyMap.values())
    .map((f) => ({
      itemName: f.itemName,
      category: f.category,
      purchaseCount: f.count,
      totalQty: f.totalQty,
    }))
    .sort((a, b) => b.purchaseCount - a.purchaseCount)
    .slice(0, 10);

  // 11. TS Analysis Array
  const tsAnalysis = Array.from(tsMap.values())
    .map((t) => ({
      tsId: t.tsId,
      tsName: t.tsName,
      purchaseCount: t.count,
      totalSpend: t.totalSpend,
    }))
    .sort((a, b) => b.purchaseCount - a.purchaseCount)
    .slice(0, 10);

  // 12. Price Consistency Array
  const priceConsistency = Array.from(priceConsistencyMap.values())
    .filter((v) => v.rates.length >= 2)
    .map((v) => {
      const minRate = Math.min(...v.rates);
      const maxRate = Math.max(...v.rates);
      const avgRate = v.rates.reduce((a, b) => a + b, 0) / v.rates.length;
      const variancePct =
        minRate > 0 ? ((maxRate - minRate) / minRate) * 100 : 0;
      return {
        supplierName: v.supplierName,
        itemName: v.itemName,
        minRate,
        maxRate,
        avgRate: Math.round(avgRate * 100) / 100,
        variancePct: Math.round(variancePct * 10) / 10,
      };
    })
    .sort((a, b) => b.variancePct - a.variancePct)
    .slice(0, 10);

  // 16. Monthly Spending Trend
  const monthlySpendingTrend = Array.from(monthlyMap.entries())
    .map(([monthYear, val]) => ({
      monthYear,
      poAmount: val.poAmount,
      billAmount: val.billAmount,
    }))
    .sort((a, b) => a.monthYear.localeCompare(b.monthYear));

  // 18. Procurement Efficiency Score per Supplier (Relative Percentile Distribution)
  const rawSupplierScores = Array.from(supplierMap.entries()).map(
    ([name, s]) => {
      const fulfillmentPct =
        s.totalReqQty > 0 ? (s.totalGrnQty / s.totalReqQty) * 100 : 100;
      const avgLead =
        s.leadTimeCount > 0 ? s.leadTimeDaysSum / s.leadTimeCount : 15;
      const onTimePct =
        s.totalOrders > 0 ? (s.fullDeliveries / s.totalOrders) * 100 : 100;

      const priceEscalationPct =
        s.csRateSum > 0
          ? Math.max(0, ((s.poRateSum - s.csRateSum) / s.csRateSum) * 100)
          : 0;

      // Fulfillment Score (40 pts)
      const fScore = (fulfillmentPct / 100) * 40;

      // Lead Time Score (30 pts): <=14d -> 30, 15-16d -> 24, 17-18d -> 16, >=19d -> 8
      let lScore = 30;
      if (avgLead >= 19) lScore = 8;
      else if (avgLead >= 17) lScore = 16;
      else if (avgLead >= 15) lScore = 24;

      // Reliability & Price Stability (30 pts)
      const rScore =
        (onTimePct / 100) * 20 + Math.max(0, 10 - priceEscalationPct * 2);

      const score = Math.round(fScore + lScore + rScore);

      return {
        supplierName: name,
        score,
        fulfillmentScore: Math.round(fulfillmentPct),
        leadTimeScore: Math.round((lScore / 30) * 100),
        priceScore: Math.round((rScore / 30) * 100),
      };
    }
  );

  // Sort descending by efficiency score
  rawSupplierScores.sort((a, b) => b.score - a.score);

  // Assign relative percentile grades across supplier tiers
  const N = rawSupplierScores.length;
  const supplierEfficiencyScores = rawSupplierScores.map((s, idx) => {
    const rankPct = N > 0 ? idx / N : 0;
    let grade: "A" | "B" | "C" | "D" | "F" = "F";

    if (rankPct < 0.25) grade = "A";       // Top 25%
    else if (rankPct < 0.55) grade = "B";  // Next 30%
    else if (rankPct < 0.80) grade = "C";  // Next 25%
    else if (rankPct < 0.92) grade = "D";  // Next 12%
    else grade = "F";                      // Bottom 8%

    return {
      ...s,
      grade,
    };
  });

  return {
    totalRecords,
    totalCSAmount,
    totalPOAmount,
    totalBillAmount,
    totalPotentialSavingsLost: totalSavingsLost,
    avgQuantityFulfillment:
      totalReqQty > 0 ? Math.round((totalGrnQty / totalReqQty) * 1000) / 10 : 100,
    avgCycleTimeDays: Math.round(
      (sumReqToPoDays + sumPoToGrnDays + sumGrnToBillDays) / totalRecords
    ),
    avgLeadTimeDays: Math.round(sumPoToGrnDays / totalRecords),

    savingsAnalysis: {
      totalSavingsLost,
      recordsWithSavingsLost,
      topSavingsLostItems,
    },

    quantityUtilization: {
      avgReqToPoPct: Math.round((sumReqToPoPct / totalRecords) * 10) / 10,
      avgPoToGrnPct: Math.round((sumPoToGrnPct / totalRecords) * 10) / 10,
      avgGrnToBillPct: Math.round((sumGrnToBillPct / totalRecords) * 10) / 10,
      overallFulfillmentPct:
        totalReqQty > 0 ? Math.round((totalGrnQty / totalReqQty) * 1000) / 10 : 100,
    },

    supplierPerformance,

    cycleTimeAnalysis: {
      avgReqToPoDays: Math.round(sumReqToPoDays / totalRecords),
      avgPoToGrnDays: Math.round(sumPoToGrnDays / totalRecords),
      avgGrnToBillDays: Math.round(sumGrnToBillDays / totalRecords),
      avgTotalCycleDays: Math.round(
        (sumReqToPoDays + sumPoToGrnDays + sumGrnToBillDays) / totalRecords
      ),
    },

    costEscalation: {
      csToPoVariancePct:
        totalCSAmount > 0
          ? Math.round(((totalPOAmount - totalCSAmount) / totalCSAmount) * 1000) / 10
          : 0,
      poToBillVariancePct:
        totalPOAmount > 0
          ? Math.round(((totalBillAmount - totalPOAmount) / totalPOAmount) * 1000) / 10
          : 0,
      recordsWithEscalation,
      totalEscalatedAmount,
    },

    highestValuePurchases,
    categorySpending,
    supplierConcentration,
    purchaseFrequency,
    tsAnalysis,
    priceConsistency,

    reqToDeliverySuccess: {
      totalRequestedQty: totalReqQty,
      totalDeliveredQty: totalGrnQty,
      successRatePct:
        totalReqQty > 0 ? Math.round((totalGrnQty / totalReqQty) * 1000) / 10 : 100,
    },

    monthlySpendingTrend,
    supplierEfficiencyScores,
  };
}

function getDaysDiff(d1: Date, d2: Date): number {
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  const diffTime = d2.getTime() - d1.getTime();
  const days = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return days < 0 ? 0 : days;
}

function createEmptyAnalytics(): AnalyticsSummary {
  return {
    totalRecords: 0,
    totalCSAmount: 0,
    totalPOAmount: 0,
    totalBillAmount: 0,
    totalPotentialSavingsLost: 0,
    avgQuantityFulfillment: 0,
    avgCycleTimeDays: 0,
    avgLeadTimeDays: 0,
    savingsAnalysis: { totalSavingsLost: 0, recordsWithSavingsLost: 0, topSavingsLostItems: [] },
    quantityUtilization: { avgReqToPoPct: 0, avgPoToGrnPct: 0, avgGrnToBillPct: 0, overallFulfillmentPct: 0 },
    supplierPerformance: [],
    cycleTimeAnalysis: { avgReqToPoDays: 0, avgPoToGrnDays: 0, avgGrnToBillDays: 0, avgTotalCycleDays: 0 },
    costEscalation: { csToPoVariancePct: 0, poToBillVariancePct: 0, recordsWithEscalation: 0, totalEscalatedAmount: 0 },
    highestValuePurchases: [],
    categorySpending: [],
    supplierConcentration: [],
    purchaseFrequency: [],
    tsAnalysis: [],
    priceConsistency: [],
    reqToDeliverySuccess: { totalRequestedQty: 0, totalDeliveredQty: 0, successRatePct: 0 },
    monthlySpendingTrend: [],
    supplierEfficiencyScores: [],
  };
}
