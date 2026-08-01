import { BenfordDigitStat, BenfordAnalysisResult } from "./benfordTypes";

/** Theoretical Benford's Law distribution probabilities for leading digits 1 through 9 */
export const BENFORD_EXPECTED: Record<number, number> = {
  1: 30.1,
  2: 17.6,
  3: 12.5,
  4: 9.7,
  5: 7.9,
  6: 6.7,
  7: 5.8,
  8: 5.1,
  9: 4.6,
};

/** Extract leading non-zero digit from a number */
export function getLeadingDigit(val: number): number | null {
  if (!val || isNaN(val)) return null;
  const absVal = Math.abs(val);
  const str = String(absVal).replace(/[^0-9.]/g, "");
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char >= "1" && char <= "9") {
      return parseInt(char, 10);
    }
  }
  return null;
}

export interface NumberItem {
  amount: number;
  label: string;
  context: string;
}

/** Analyze an array of financial numbers against Benford's Law */
export function analyzeBenfordLaw(items: NumberItem[]): BenfordAnalysisResult {
  const counts: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: 0,
    9: 0,
  };

  const validItems: { item: NumberItem; digit: number }[] = [];

  for (const it of items) {
    const d = getLeadingDigit(it.amount);
    if (d && d >= 1 && d <= 9) {
      counts[d]++;
      validItems.push({ item: it, digit: d });
    }
  }

  const total = validItems.length;
  if (total === 0) {
    return createEmptyBenfordResult();
  }

  let chiSquareSum = 0;
  const digitStats: BenfordDigitStat[] = [];
  const anomalousDigits: number[] = [];

  for (let d = 1; d <= 9; d++) {
    const expPct = BENFORD_EXPECTED[d];
    const obsCount = counts[d];
    const obsPct = Math.round((obsCount / total) * 1000) / 10;
    const diffPct = Math.round((obsPct - expPct) * 10) / 10;

    const expCount = total * (expPct / 100);
    if (expCount > 0) {
      const chiComponent = Math.pow(obsCount - expCount, 2) / expCount;
      chiSquareSum += chiComponent;
    }

    let digitStatus: "Normal" | "Caution" | "Anomalous" = "Normal";
    const absDiff = Math.abs(diffPct);
    if (absDiff > 6.0) {
      digitStatus = "Anomalous";
      anomalousDigits.push(d);
    } else if (absDiff > 5.0) {
      digitStatus = "Caution";
    }

    digitStats.push({
      digit: d,
      expectedPct: expPct,
      observedPct: obsPct,
      count: obsCount,
      differencePct: diffPct,
      status: digitStatus,
    });
  }

  const chiSquareStat = Math.round(chiSquareSum * 100) / 100;
  const criticalValue = 15.51; // 8 degrees of freedom at alpha = 0.05

  let conformityLevel: BenfordAnalysisResult["conformityLevel"] = "High Conformity (Natural)";
  let isPotentialForgery = false;

  if (chiSquareStat <= 15.51) {
    conformityLevel = "High Conformity (Natural)";
    isPotentialForgery = false;
  } else if (chiSquareStat <= 25.0) {
    conformityLevel = "Acceptable Conformity";
    isPotentialForgery = false;
  } else if (chiSquareStat <= 35.0) {
    conformityLevel = "Marginal Conformity";
    isPotentialForgery = true;
  } else {
    conformityLevel = "Non-Conforming (Potential Forgery / Fraud Risk)";
    isPotentialForgery = true;
  }

  // Extract suspicious numbers matching anomalous digits
  const suspiciousNumbers = validItems
    .filter((v) => anomalousDigits.includes(v.digit))
    .slice(0, 10)
    .map((v) => ({
      label: v.item.label,
      amount: v.item.amount,
      firstDigit: v.digit,
      context: v.item.context,
    }));

  let description = "";
  if (isPotentialForgery) {
    description = `Chi-Square test statistic (${chiSquareStat}) exceeds critical threshold (${criticalValue}). Significant deviation in leading digit frequencies (specifically digits ${anomalousDigits.join(
      ", "
    )}) indicates potential manual price manipulation, artificial rounding, or bidding collusion.`;
  } else {
    description = `Chi-Square test statistic (${chiSquareStat}) falls within acceptable boundaries (${criticalValue}). Leading digit frequencies closely follow standard logarithmic Benford distributions, indicating naturally generated financial dataset.`;
  }

  return {
    totalNumbersAnalyzed: total,
    chiSquareStat,
    criticalValue,
    conformityLevel,
    isPotentialForgery,
    anomalyDescription: description,
    digitStats,
    suspiciousNumbers,
  };
}

function createEmptyBenfordResult(): BenfordAnalysisResult {
  return {
    totalNumbersAnalyzed: 0,
    chiSquareStat: 0,
    criticalValue: 15.51,
    conformityLevel: "High Conformity (Natural)",
    isPotentialForgery: false,
    anomalyDescription: "No numeric data provided for analysis.",
    digitStats: [],
    suspiciousNumbers: [],
  };
}
