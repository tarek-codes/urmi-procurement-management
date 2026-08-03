import { CSItem, SupplierQuotation } from "./types";
import { HistoricalRecord } from "./historicalTypes";

export interface VendorMetricBreakdown {
  currentPriceScore: number;       // 30%
  historicalPriceScore: number;    // 20%
  winRateScore: number;            // 15%
  deliveryScore: number;           // 10%
  consistencyScore: number;        // 8%
  trustScore: number;              // 7%
  experienceScore: number;         // 5%
  recentPerformanceScore: number;  // 5%
}

export interface VendorItemEvaluation {
  vendorName: string;
  finalScore: number;
  rank: number;
  isRecommended: boolean;
  quotation: SupplierQuotation | null;
  metrics: VendorMetricBreakdown;
  reasonsForSelection: string[];
  reasonsAgainstSelection: string[];
}

export interface ItemRecommendationResult {
  slNo: number;
  itemName: string;
  tsId: number | string;
  technicalSpecification: string;
  evaluations: VendorItemEvaluation[];
  recommendedVendor: VendorItemEvaluation | null;
  optimalTotalCost: number;
}

/**
 * Compute Vendor Recommendation & CS Validation Scoring Engine
 * Implements exact metrics and weights specified in cs-metric.md
 */
export function evaluateItemVendorRecommendations(
  items: CSItem[],
  historicalRecords: HistoricalRecord[]
): ItemRecommendationResult[] {
  // Pre-calculate Global Vendor Trust metrics (Metric 6 - not item-specific)
  const globalTrustScores = computeGlobalTrustScores(historicalRecords);

  return items.map((item) => {
    if (!item.quotations || item.quotations.length === 0) {
      return {
        slNo: item.slNo,
        itemName: item.itemName,
        tsId: item.tsId,
        technicalSpecification: item.technicalSpecification,
        evaluations: [],
        recommendedVendor: null,
        optimalTotalCost: 0,
      };
    }

    // Filter historical records for this specific item (by TS_ID or ITEM_NAME)
    const itemHistRecords = historicalRecords.filter(
      (r) =>
        (r.tsId && item.tsId && String(r.tsId) === String(item.tsId)) ||
        (r.itemName && item.itemName && r.itemName.toLowerCase() === item.itemName.toLowerCase())
    );

    // 1. Metric 1: Current CS Price Competitiveness (30%)
    const lowestCurrentQuote = Math.min(...item.quotations.map((q) => q.unitRate));

    // 2. Metric 2: Historical Item-wise Price Competitiveness (20%)
    const vendorHistAvgRates: Record<string, number> = {};
    item.quotations.forEach((q) => {
      const vRecords = itemHistRecords.filter(
        (r) => r.supplierName.toLowerCase() === q.supplierName.toLowerCase() && r.poRate > 0
      );
      if (vRecords.length > 0) {
        const sum = vRecords.reduce((s, r) => s + r.poRate, 0);
        vendorHistAvgRates[q.supplierName] = sum / vRecords.length;
      }
    });
    const histAvgRatesList = Object.values(vendorHistAvgRates);
    const lowestHistAvgRate = histAvgRatesList.length > 0 ? Math.min(...histAvgRatesList) : 0;

    // 3. Metric 3: Historical Win Rate (15%)
    const totalItemPOs = itemHistRecords.filter((r) => r.poNo).length;
    const vendorWins: Record<string, number> = {};
    item.quotations.forEach((q) => {
      const wins = itemHistRecords.filter(
        (r) => r.supplierName.toLowerCase() === q.supplierName.toLowerCase() && r.poNo
      ).length;
      vendorWins[q.supplierName] = wins;
    });

    // 4. Metric 4: Delivery Performance (10%)
    const vendorAvgDeliveries: Record<string, number> = {};
    item.quotations.forEach((q) => {
      const delRecords = itemHistRecords.filter(
        (r) =>
          r.supplierName.toLowerCase() === q.supplierName.toLowerCase() &&
          r.poDate &&
          r.grnDate
      );
      if (delRecords.length > 0) {
        const totalDays = delRecords.reduce((sum, r) => {
          const d1 = new Date(r.poDate).getTime();
          const d2 = new Date(r.grnDate).getTime();
          const diffDays = Math.max(1, Math.round((d2 - d1) / (1000 * 3600 * 24)));
          return sum + diffDays;
        }, 0);
        vendorAvgDeliveries[q.supplierName] = totalDays / delRecords.length;
      }
    });
    const deliveryDaysList = Object.values(vendorAvgDeliveries);
    const fastestDelivery = deliveryDaysList.length > 0 ? Math.min(...deliveryDaysList) : 0;

    // 5. Metric 5: Price Consistency (8%)
    const vendorCVs: Record<string, number> = {};
    item.quotations.forEach((q) => {
      const rates = itemHistRecords
        .filter((r) => r.supplierName.toLowerCase() === q.supplierName.toLowerCase() && r.poRate > 0)
        .map((r) => r.poRate);
      if (rates.length > 1) {
        const mean = rates.reduce((s, r) => s + r, 0) / rates.length;
        const variance = rates.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / rates.length;
        const stdDev = Math.sqrt(variance);
        vendorCVs[q.supplierName] = stdDev / mean;
      } else {
        vendorCVs[q.supplierName] = 0; // perfectly consistent if 0 or 1 PO
      }
    });
    const maxCV = Math.max(...Object.values(vendorCVs), 0.01);

    // 7. Metric 7: Item Experience (5%)
    const maxItemPOCount = Math.max(...Object.values(vendorWins), 1);

    // 8. Metric 8: Recent Performance (5%) - Last 12 Months
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).getTime();

    // Evaluate each vendor
    const rawEvaluations: Omit<VendorItemEvaluation, "rank">[] = item.quotations.map((q) => {
      const vName = q.supplierName;

      // 1. Current Price Score (30%)
      const currentPriceScore = q.unitRate > 0 ? Math.round((lowestCurrentQuote / q.unitRate) * 1000) / 10 : 0;

      // 2. Historical Price Score (20%)
      let historicalPriceScore = 75; // Default score for new vendor
      if (vendorHistAvgRates[vName] && lowestHistAvgRate > 0) {
        historicalPriceScore = Math.round((lowestHistAvgRate / vendorHistAvgRates[vName]) * 1000) / 10;
      }

      // 3. Win Rate Score (15%)
      let winRateScore = 50; // Neutral default
      if (totalItemPOs > 0) {
        winRateScore = Math.round(((vendorWins[vName] || 0) / totalItemPOs) * 1000) / 10;
      }

      // 4. Delivery Score (10%)
      let deliveryScore = 75;
      if (vendorAvgDeliveries[vName] && fastestDelivery > 0) {
        deliveryScore = Math.round((fastestDelivery / vendorAvgDeliveries[vName]) * 1000) / 10;
      }

      // 5. Consistency Score (8%)
      const cv = vendorCVs[vName] || 0;
      const consistencyScore = Math.round((1 - cv / (maxCV * 1.2)) * 1000) / 10;

      // 6. Trust Score (7%) - Global
      const trustScore = globalTrustScores[vName] || 50;

      // 7. Experience Score (5%)
      const expCount = vendorWins[vName] || 0;
      const experienceScore = Math.round((expCount / maxItemPOCount) * 1000) / 10;

      // 8. Recent Performance (5%)
      const recentRecords = itemHistRecords.filter(
        (r) =>
          r.supplierName.toLowerCase() === vName.toLowerCase() &&
          r.poDate &&
          new Date(r.poDate).getTime() >= oneYearAgo
      );
      const recentPerformanceScore = recentRecords.length > 0 ? Math.min(100, recentRecords.length * 25) : 50;

      // Weighted Final Score
      const finalScore = Math.round(
        (0.30 * currentPriceScore +
          0.20 * historicalPriceScore +
          0.15 * winRateScore +
          0.10 * deliveryScore +
          0.08 * Math.max(0, consistencyScore) +
          0.07 * trustScore +
          0.05 * experienceScore +
          0.05 * recentPerformanceScore) *
          100
      ) / 100;

      const metrics: VendorMetricBreakdown = {
        currentPriceScore,
        historicalPriceScore,
        winRateScore,
        deliveryScore,
        consistencyScore: Math.max(0, consistencyScore),
        trustScore,
        experienceScore,
        recentPerformanceScore,
      };

      return {
        vendorName: vName,
        finalScore,
        isRecommended: false,
        quotation: q,
        metrics,
        reasonsForSelection: [],
        reasonsAgainstSelection: [],
      };
    });

    // Sort descending by Final Score
    rawEvaluations.sort((a, b) => b.finalScore - a.finalScore);

    // Assign Rank and Generate Reasons
    const evaluations: VendorItemEvaluation[] = rawEvaluations.map((ev, index) => {
      const rank = index + 1;
      const isRecommended = rank === 1;
      const reasonsForSelection: string[] = [];
      const reasonsAgainstSelection: string[] = [];

      const topEv = rawEvaluations[0];

      if (isRecommended) {
        if (ev.quotation?.unitRate === lowestCurrentQuote) {
          reasonsForSelection.push(`Offered the lowest current unit rate ($${ev.quotation.unitRate.toLocaleString()}).`);
        } else {
          const diffPct = Math.round(((ev.quotation!.unitRate - lowestCurrentQuote) / lowestCurrentQuote) * 100);
          reasonsForSelection.push(`Quotations are competitive (${diffPct}% above absolute minimum rate), offset by superior historical reliability.`);
        }

        if (ev.metrics.historicalPriceScore >= 90) {
          reasonsForSelection.push(`Strong historical pricing competitiveness (${ev.metrics.historicalPriceScore}/100).`);
        }
        if (ev.metrics.winRateScore >= 40) {
          reasonsForSelection.push(`Proven procurement track record for this item (${ev.metrics.winRateScore}% historical win rate).`);
        }
        if (ev.metrics.deliveryScore >= 85) {
          reasonsForSelection.push(`Exceptional delivery speed & fulfillment record (${ev.metrics.deliveryScore}/100 score).`);
        }
        if (ev.metrics.trustScore >= 80) {
          reasonsForSelection.push(`High organizational vendor trust & loyalty rating (${ev.metrics.trustScore}/100).`);
        }
        if (reasonsForSelection.length === 0) {
          reasonsForSelection.push(`Highest overall composite score (${ev.finalScore}/100) balancing cost, delivery, and reliability.`);
        }
      } else {
        // Reasons against selection compared to top recommended vendor
        if (ev.quotation && topEv.quotation && ev.quotation.unitRate > topEv.quotation.unitRate) {
          const diffPct = (
            ((ev.quotation.unitRate - topEv.quotation.unitRate) / topEv.quotation.unitRate) *
            100
          ).toFixed(1);
          reasonsAgainstSelection.push(`Current quotation ($${ev.quotation.unitRate.toLocaleString()}) is ${diffPct}% higher than recommended supplier.`);
        } else if (ev.quotation && topEv.quotation && ev.quotation.unitRate < topEv.quotation.unitRate) {
          reasonsAgainstSelection.push(`Quoted lower rate ($${ev.quotation.unitRate.toLocaleString()}), but has lower historical delivery/reliability scores.`);
        }

        if (ev.metrics.historicalPriceScore < topEv.metrics.historicalPriceScore - 10) {
          reasonsAgainstSelection.push(`Historical pricing is less competitive (${ev.metrics.historicalPriceScore} vs ${topEv.metrics.historicalPriceScore}).`);
        }
        if (ev.metrics.deliveryScore < topEv.metrics.deliveryScore - 15) {
          reasonsAgainstSelection.push(`Slower historical lead times & delivery performance.`);
        }
        if (ev.metrics.winRateScore < topEv.metrics.winRateScore - 15) {
          reasonsAgainstSelection.push(`Lower historical procurement win rate for this item.`);
        }
        if (ev.metrics.experienceScore < topEv.metrics.experienceScore - 20) {
          reasonsAgainstSelection.push(`Less historical experience supplying this specific item code.`);
        }
        if (reasonsAgainstSelection.length === 0) {
          reasonsAgainstSelection.push(`Overall composite score (${ev.finalScore}/100) is lower than recommended supplier (${topEv.finalScore}/100).`);
        }
      }

      return {
        ...ev,
        rank,
        isRecommended,
        reasonsForSelection,
        reasonsAgainstSelection,
      };
    });

    const recommendedVendor = evaluations.find((e) => e.isRecommended) || null;
    const optimalTotalCost = recommendedVendor?.quotation ? recommendedVendor.quotation.totalPrice : 0;

    return {
      slNo: item.slNo,
      itemName: item.itemName,
      tsId: item.tsId,
      technicalSpecification: item.technicalSpecification,
      evaluations,
      recommendedVendor,
      optimalTotalCost,
    };
  });
}

/** Compute Metric 6: Global Vendor Trust / Loyalty (7%) across all historical POs */
function computeGlobalTrustScores(records: HistoricalRecord[]): Record<string, number> {
  const vendorStats: Record<
    string,
    { firstDate: number; lastDate: number; poCount: number; totalSpend: number }
  > = {};

  records.forEach((r) => {
    if (!r.supplierName) return;
    const vName = r.supplierName;
    const pDate = r.poDate ? new Date(r.poDate).getTime() : Date.now();

    if (!vendorStats[vName]) {
      vendorStats[vName] = {
        firstDate: pDate,
        lastDate: pDate,
        poCount: 0,
        totalSpend: 0,
      };
    }
    const stat = vendorStats[vName];
    if (pDate < stat.firstDate) stat.firstDate = pDate;
    if (pDate > stat.lastDate) stat.lastDate = pDate;
    if (r.poNo) stat.poCount += 1;
    stat.totalSpend += r.poAmount || 0;
  });

  const maxYears = Math.max(
    ...Object.values(vendorStats).map((s) => (s.lastDate - s.firstDate) / (1000 * 3600 * 24 * 365)),
    1
  );
  const maxPOs = Math.max(...Object.values(vendorStats).map((s) => s.poCount), 1);
  const maxSpend = Math.max(...Object.values(vendorStats).map((s) => s.totalSpend), 1);

  const trustScores: Record<string, number> = {};
  Object.entries(vendorStats).forEach(([vName, s]) => {
    const years = (s.lastDate - s.firstDate) / (1000 * 3600 * 24 * 365);
    const yearsScore = (years / maxYears) * 100;
    const poScore = (s.poCount / maxPOs) * 100;
    const spendScore = (s.totalSpend / maxSpend) * 100;

    trustScores[vName] = Math.round(0.4 * yearsScore + 0.3 * poScore + 0.3 * spendScore);
  });

  return trustScores;
}
