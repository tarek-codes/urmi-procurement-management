import { CSDocument, CSItem, SupplierQuotation } from "./types";
import { HistoricalRecord } from "./historicalTypes";
import {
  SupplierHistoricalRating,
  FlopItemAnalysis,
  FlopCSAnalysis,
  FlopPurchaseSummary,
} from "./flopTypes";

/** Compute supplier rating map from Historical Records */
export function computeSupplierRatingsMap(
  historicalRecords: HistoricalRecord[]
): Map<string, SupplierHistoricalRating> {
  const map = new Map<
    string,
    {
      reqQty: number;
      grnQty: number;
      leadDaysSum: number;
      count: number;
      fullDeliveries: number;
      csRateSum: number;
      poRateSum: number;
    }
  >();

  for (const r of historicalRecords) {
    const name = r.supplierName ? r.supplierName.trim() : "Unknown";
    if (!map.has(name)) {
      map.set(name, {
        reqQty: 0,
        grnQty: 0,
        leadDaysSum: 0,
        count: 0,
        fullDeliveries: 0,
        csRateSum: 0,
        poRateSum: 0,
      });
    }
    const s = map.get(name)!;
    s.count++;
    s.reqQty += r.reqQty;
    s.grnQty += r.grnQty;
    if (r.grnQty >= r.reqQty && r.reqQty > 0) {
      s.fullDeliveries++;
    }
    s.csRateSum += r.csRate;
    s.poRateSum += r.poRate;

    const reqD = new Date(r.reqDate);
    const poD = new Date(r.poDate);
    const grnD = new Date(r.grnDate);

    if (!isNaN(poD.getTime()) && !isNaN(grnD.getTime())) {
      const days = Math.round(
        (grnD.getTime() - poD.getTime()) / (1000 * 60 * 60 * 24)
      );
      s.leadDaysSum += days < 0 ? 0 : days;
    }
  }

  const rawScores: { name: string; score: number; stats: any }[] = [];

  map.forEach((s, name) => {
    const fulfillmentPct =
      s.reqQty > 0 ? (s.grnQty / s.reqQty) * 100 : 100;
    const avgLead = s.count > 0 ? s.leadDaysSum / s.count : 15;
    const onTimePct = s.count > 0 ? (s.fullDeliveries / s.count) * 100 : 100;
    const priceEscalationPct =
      s.csRateSum > 0
        ? Math.max(0, ((s.poRateSum - s.csRateSum) / s.csRateSum) * 100)
        : 0;

    const fScore = (fulfillmentPct / 100) * 40;
    let lScore = 30;
    if (avgLead >= 19) lScore = 8;
    else if (avgLead >= 17) lScore = 16;
    else if (avgLead >= 15) lScore = 24;

    const rScore =
      (onTimePct / 100) * 20 + Math.max(0, 10 - priceEscalationPct * 2);

    const score = Math.round(fScore + lScore + rScore);
    rawScores.push({
      name,
      score,
      stats: {
        fulfillmentRatePct: Math.round(fulfillmentPct * 10) / 10,
        avgLeadTimeDays: Math.round(avgLead),
        onTimeDeliveryPct: Math.round(onTimePct * 10) / 10,
        totalOrdersInHistory: s.count,
      },
    });
  });

  rawScores.sort((a, b) => b.score - a.score);
  const N = rawScores.length;
  const ratingMap = new Map<string, SupplierHistoricalRating>();

  rawScores.forEach((s, idx) => {
    const rankPct = N > 0 ? idx / N : 0;
    let grade: "A" | "B" | "C" | "D" | "F" = "F";

    if (rankPct < 0.25) grade = "A";
    else if (rankPct < 0.55) grade = "B";
    else if (rankPct < 0.80) grade = "C";
    else if (rankPct < 0.92) grade = "D";
    else grade = "F";

    ratingMap.set(s.name, {
      supplierName: s.name,
      score: s.score,
      grade,
      ...s.stats,
    });
  });

  return ratingMap;
}

/** Analyze CS documents for Flop Purchases based on Historical Database intelligence */
export function analyzeFlopPurchases(
  csDocuments: CSDocument[],
  historicalRecords: HistoricalRecord[]
): FlopPurchaseSummary {
  const supplierRatings = computeSupplierRatingsMap(historicalRecords);

  let totalFlopCsCount = 0;
  let totalItemsAnalyzed = 0;
  let totalFlopItemsCount = 0;
  let totalPotentialSavingsLost = 0;

  const csAnalyses: FlopCSAnalysis[] = [];

  for (const doc of csDocuments) {
    let csSavings = 0;
    let csFlopItemsCount = 0;
    const itemAnalyses: FlopItemAnalysis[] = [];

    for (const item of doc.items) {
      totalItemsAnalyzed++;
      const quotes = item.quotations || [];
      if (quotes.length === 0) continue;

      // Identify currently selected supplier
      const selected =
        item.selectedSupplier || (quotes.length > 0 ? quotes[0] : null);
      if (!selected) continue;

      const lowestQuote = quotes.reduce(
        (min, q) => (q.unitRate < min.unitRate ? q : min),
        quotes[0]
      );

      const selRating = supplierRatings.get(selected.supplierName) || null;

      // Lowest price is given the highest priority.
      // Filter out only vendors with grade below D (i.e. Grade F)
      const ratedQuotes = quotes.map((q) => ({
        quote: q,
        rating: supplierRatings.get(q.supplierName) || null,
      }));

      const nonFQuotes = ratedQuotes.filter(
        (rq) => !rq.rating || rq.rating.grade !== "F"
      );

      // Best recommended vendor: absolute lowest price among non-F vendors (or pure lowest if all F)
      const bestQuoteObj =
        nonFQuotes.length > 0
          ? nonFQuotes.reduce(
              (best, current) =>
                current.quote.unitRate < best.quote.unitRate ? current : best,
              nonFQuotes[0]
            )
          : ratedQuotes.reduce(
              (best, current) =>
                current.quote.unitRate < best.quote.unitRate ? current : best,
              ratedQuotes[0]
            );

      const recommended = bestQuoteObj.quote;
      const recRating = bestQuoteObj.rating;

      let isFlop = false;
      const flopReasons: string[] = [];
      let explanation = "";

      // Rule 1: Price Override (Selected rate exceeds lowest available quote)
      const priceDiffPerUnit = selected.unitRate - lowestQuote.unitRate;
      const potentialSavings = Math.max(0, priceDiffPerUnit * selected.quantity);

      if (priceDiffPerUnit > 0.01) {
        isFlop = true;
        flopReasons.push(
          `Price Override: Selected rate ($${selected.unitRate.toFixed(
            2
          )}) exceeds lowest quote ($${lowestQuote.unitRate.toFixed(2)}) by $${priceDiffPerUnit.toFixed(2)}/unit.`
        );
      }

      // Rule 2: Low-grade supplier selected ONLY if grade is below D (Grade F)
      if (selRating && selRating.grade === "F") {
        isFlop = true;
        flopReasons.push(
          `Unacceptable Supplier Rating: ${selected.supplierName} holds Grade F in historical performance (${selRating.avgLeadTimeDays} days avg lead time, ${selRating.fulfillmentRatePct}% fulfillment).`
        );
      }

      if (isFlop) {
        csFlopItemsCount++;
        totalFlopItemsCount++;
        totalPotentialSavingsLost += potentialSavings;
        csSavings += potentialSavings;

        explanation = `Selected supplier "${
          selected.supplierName
        }" is flagged because ${flopReasons
          .join(" ")
          .toLowerCase()} Recommended supplier "${
          recommended.supplierName
        }" offers unit rate $${recommended.unitRate.toFixed(
          2
        )} with historical Grade ${
          recRating ? recRating.grade : "N/A"
        } (${recRating ? recRating.avgLeadTimeDays : "N/A"} days lead time).`;
      } else {
        explanation = `Selected supplier "${selected.supplierName}" is optimal (Lowest price option selected at $${selected.unitRate.toFixed(2)}/unit, Grade ${
          selRating ? selRating.grade : "Normal"
        }).`;
      }

      itemAnalyses.push({
        item,
        selectedSupplierName: selected.supplierName,
        selectedUnitRate: selected.unitRate,
        selectedTotalValue: selected.totalPrice,
        selectedSupplierRating: selRating,
        recommendedSupplierName: recommended.supplierName,
        recommendedUnitRate: recommended.unitRate,
        recommendedTotalValue: recommended.totalPrice,
        recommendedSupplierRating: recRating,
        isFlop,
        potentialSavings,
        flopReasons,
        recommendationExplanation: explanation,
      });
    }

    const isCsFlop = csFlopItemsCount > 0;
    if (isCsFlop) totalFlopCsCount++;

    let severity: "High" | "Medium" | "Low" | "Clean" = "Clean";
    if (csSavings > 5000 || csFlopItemsCount >= 3) severity = "High";
    else if (csSavings > 0 || csFlopItemsCount >= 1) severity = "Medium";

    csAnalyses.push({
      csNo: doc.csNo,
      companyName: doc.companyName,
      csDate: doc.csDate,
      procurer: doc.procurers.join(", "),
      totalItemsCount: doc.items.length,
      flopItemsCount: csFlopItemsCount,
      isCsFlop,
      totalPotentialSavings: csSavings,
      severity,
      itemAnalyses,
    });
  }

  return {
    totalCsAnalyzed: csDocuments.length,
    totalFlopCsCount,
    totalItemsAnalyzed,
    totalFlopItemsCount,
    totalPotentialSavingsLost,
    csAnalyses,
  };
}
