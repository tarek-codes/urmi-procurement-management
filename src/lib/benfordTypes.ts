export interface BenfordDigitStat {
  digit: number;
  expectedPct: number;
  observedPct: number;
  count: number;
  differencePct: number;
  status: "Normal" | "Caution" | "Anomalous";
}

export interface BenfordAnalysisResult {
  totalNumbersAnalyzed: number;
  chiSquareStat: number; // Chi-square goodness-of-fit
  criticalValue: number; // Critical value for d.f. 8 (15.51 at alpha=0.05)
  conformityLevel: "High Conformity (Natural)" | "Acceptable Conformity" | "Marginal Conformity" | "Non-Conforming (Potential Forgery / Fraud Risk)";
  isPotentialForgery: boolean;
  anomalyDescription: string;
  digitStats: BenfordDigitStat[];
  suspiciousNumbers: { label: string; amount: number; firstDigit: number; context: string }[];
}
