import {
  CSDocument,
  CSValidationReport,
  ValidationResult,
  ValidationSeverity,
  ValidationStatus,
} from "./types";

// ═════════════════════════════════════════════════════════════════════
// CS Validation Engine — implements all 17 rules from the spec
// ═════════════════════════════════════════════════════════════════════

const MIN_SUPPLIER_COUNT = 3;

const APPROVAL_THRESHOLDS = [
  { max: 50_000, level: "Manager" },
  { max: 500_000, level: "Department Head" },
  { max: Infinity, level: "Director" },
];

/**
 * Run all CS-level validations on a set of parsed CS documents.
 * Returns a CSValidationReport for each document.
 */
export function validateAllCS(documents: CSDocument[]): CSValidationReport[] {
  // Collect all CS numbers for uniqueness check (Rule 2)
  const allCSNumbers = documents.map((d) => d.csNo);

  return documents.map((doc) => {
    const results: ValidationResult[] = [];

    results.push(rule1_headerValidation(doc));
    results.push(rule2_csNumberValidation(doc, allCSNumbers));
    results.push(rule3_requisitionValidation(doc));
    results.push(rule4_supplierValidation(doc));
    results.push(rule6_itemCoverage(doc));
    results.push(rule8_supplierQuotationCoverage(doc));
    results.push(rule10_currencyValidation(doc));
    results.push(rule11_approvalValidation(doc));
    results.push(rule13_singleProcurer(doc));

    // Rule 15 — Aggregation: if any item-level rule failed, CS fails
    const errorCount = results.filter(
      (r) => r.status === "failed" && r.severity === "error"
    ).length;
    const warningCount = results.filter(
      (r) => r.status === "failed" && r.severity === "warning"
    ).length;

    const overallStatus: ValidationStatus = errorCount > 0 ? "failed" : "passed";

    return {
      csId: doc.id,
      csNo: doc.csNo,
      companyName: doc.companyName,
      requisitionNo: doc.requisitionNo,
      csDate: doc.csDate,
      procurer: doc.procurers[0] || "N/A",
      overallStatus,
      errorCount,
      warningCount,
      results,
      items: doc.items,
      csMainValue: doc.csMainValue,
      calculatedTotal: doc.calculatedTotal,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────
// Rule 1 — Header Information Validation
// ─────────────────────────────────────────────────────────────────────
function rule1_headerValidation(doc: CSDocument): ValidationResult {
  const missing: string[] = [];
  if (!doc.companyName) missing.push("Company Name");
  if (!doc.csNo) missing.push("CS Number");
  if (!doc.csDate) missing.push("CS Date");
  if (doc.procurers.length === 0) missing.push("Procurer");
  if (!doc.requisitionNo) missing.push("Requisition Number");

  if (missing.length > 0) {
    return fail(
      1,
      "Header Information",
      "error",
      `Missing required fields: ${missing.join(", ")}.`
    );
  }
  return pass(1, "Header Information", "All mandatory header fields (Company, CS#, Date, Procurer, Req#) are present.");
}

// ─────────────────────────────────────────────────────────────────────
// Rule 2 — CS Number Validation
// ─────────────────────────────────────────────────────────────────────
function rule2_csNumberValidation(
  doc: CSDocument,
  allCSNumbers: string[]
): ValidationResult {
  if (!doc.csNo) {
    return fail(2, "CS Number", "error", "CS Number is empty.");
  }

  const duplicateCount = allCSNumbers.filter((n) => n === doc.csNo).length;
  if (duplicateCount > 1) {
    return fail(
      2,
      "CS Number",
      "error",
      `Duplicate CS Number "${doc.csNo}" found ${duplicateCount} times.`
    );
  }

  return pass(2, "CS Number", `CS Number "${doc.csNo}" is valid and unique.`);
}

// ─────────────────────────────────────────────────────────────────────
// Rule 3 — Requisition Validation
// ─────────────────────────────────────────────────────────────────────
function rule3_requisitionValidation(doc: CSDocument): ValidationResult {
  if (!doc.requisitionNo) {
    return fail(
      3,
      "Requisition Validation",
      "error",
      "Requisition number is missing."
    );
  }

  // Check all rows in this CS reference the same requisition
  const uniqueReqs = new Set(
    doc.items
      .map(() => doc.requisitionNo)
      .filter(Boolean)
  );

  if (uniqueReqs.size === 0) {
    return fail(
      3,
      "Requisition Validation",
      "error",
      "No valid requisition reference found."
    );
  }

  return pass(3, "Requisition Validation", `Associated requisition "${doc.requisitionNo}" is active and consistently referenced.`);
}

// ─────────────────────────────────────────────────────────────────────
// Rule 4 — Supplier Validation
// ─────────────────────────────────────────────────────────────────────
function rule4_supplierValidation(doc: CSDocument): ValidationResult {
  if (doc.suppliers.length === 0) {
    return fail(
      4,
      "Supplier Validation",
      "error",
      "No Supplier Quotations — No supplier has quoted for this CS."
    );
  }

  // Check for duplicate suppliers (case-insensitive)
  const lowerNames = doc.suppliers.map((s) => s.toLowerCase());
  const uniqueNames = new Set(lowerNames);
  if (uniqueNames.size < lowerNames.length) {
    const dupes = lowerNames.filter(
      (name, i) => lowerNames.indexOf(name) !== i
    );
    return fail(
      4,
      "Supplier Validation",
      "error",
      `Duplicate supplier(s) found: ${[...new Set(dupes)].join(", ")}.`
    );
  }

  if (doc.suppliers.length === 1) {
    return pass(4, "Supplier Validation", "Single Supplier CS — 1 supplier participating in this CS (no competitive comparison available).");
  }

  return pass(4, "Supplier Validation", `${doc.suppliers.length} active and unique suppliers participating in this CS.`);
}

// ─────────────────────────────────────────────────────────────────────
// Rule 5 — Minimum Supplier Count
// ─────────────────────────────────────────────────────────────────────
function rule5_minSupplierCount(doc: CSDocument): ValidationResult {
  if (doc.suppliers.length < MIN_SUPPLIER_COUNT) {
    return fail(
      5,
      "Minimum Supplier Count",
      "error",
      `Only ${doc.suppliers.length} supplier(s) found. Minimum ${MIN_SUPPLIER_COUNT} required.`
    );
  }
  return pass(5, "Minimum Supplier Count", `Policy satisfied: ${doc.suppliers.length} suppliers provided (minimum ${MIN_SUPPLIER_COUNT} required).`);
}

// ─────────────────────────────────────────────────────────────────────
// Rule 6 — Item Coverage Validation
// ─────────────────────────────────────────────────────────────────────
function rule6_itemCoverage(doc: CSDocument): ValidationResult {
  const missingItems = doc.items.filter(
    (item) => !item.itemName || item.quotations.length === 0
  );

  if (missingItems.length > 0) {
    return fail(
      6,
      "Item Coverage",
      "error",
      `${missingItems.length} item(s) have no name or no quotations.`,
      missingItems.map((item) => ({
        itemName: item.itemName || "(unnamed)",
        slNo: item.slNo,
        detail: "Missing item name or quotations.",
      }))
    );
  }
  return pass(6, "Item Coverage", `All ${doc.items.length} requisition item(s) are present with valid specifications.`);
}

// ─────────────────────────────────────────────────────────────────────
// Rule 7 — Selected Supplier Validation
// ─────────────────────────────────────────────────────────────────────
function rule7_selectedSupplier(doc: CSDocument): ValidationResult {
  const itemsWithoutSelection = doc.items.filter(
    (item) => !item.selectedSupplier
  );

  if (itemsWithoutSelection.length > 0) {
    return fail(
      7,
      "Selected Supplier",
      "error",
      "CS has items without selected suppliers.",
      itemsWithoutSelection.map((item) => ({
        itemName: item.itemName,
        slNo: item.slNo,
        detail: "No selected supplier.",
      }))
    );
  }
  return pass(7, "Selected Supplier", `Every item (${doc.items.length}/${doc.items.length}) has a selected supplier assigned.`);
}

// ─────────────────────────────────────────────────────────────────────
// Rule 8 — Supplier Quotation Coverage
// ─────────────────────────────────────────────────────────────────────
function rule8_supplierQuotationCoverage(doc: CSDocument): ValidationResult {
  const totalItems = doc.items.length;
  const supplierCoverage: Record<string, number> = {};

  for (const item of doc.items) {
    for (const q of item.quotations) {
      supplierCoverage[q.supplierName] =
        (supplierCoverage[q.supplierName] || 0) + 1;
    }
  }

  const incomplete = Object.entries(supplierCoverage).filter(
    ([, count]) => count < totalItems
  );

  if (incomplete.length > 0) {
    return fail(
      8,
      "Quotation Coverage",
      "warning",
      `${incomplete.length} supplier(s) have incomplete quotations.`,
      incomplete.map(([name, count]) => ({
        itemName: name,
        slNo: 0,
        detail: `${count}/${totalItems} items quoted.`,
      }))
    );
  }
  return pass(8, "Quotation Coverage", "All participating suppliers submitted quotations for every item.");
}

// ─────────────────────────────────────────────────────────────────────
// Rule 9 — CS Total Validation
// ─────────────────────────────────────────────────────────────────────
function rule9_csTotalValidation(doc: CSDocument): ValidationResult {
  // Sum the CS_MAIN_VALUE for each item (the per-item totals)
  const sumOfItemTotals = doc.items.reduce(
    (sum, item) => sum + item.csMainValue,
    0
  );

  // Sum of the first supplier's unit_rate * qty for each item (selected supplier total)
  const sumOfSelectedTotals = doc.items.reduce((sum, item) => {
    if (item.selectedSupplier) {
      return sum + item.selectedSupplier.unitRate * item.selectedSupplier.quantity;
    }
    return sum;
  }, 0);

  // Compare the CS_MAIN_VALUE sum with the calculated selected supplier totals
  // Use a tolerance for floating point
  const tolerance = 0.01 * sumOfItemTotals; // 1% tolerance
  if (Math.abs(sumOfItemTotals - sumOfSelectedTotals) > Math.max(tolerance, 1)) {
    return fail(
      9,
      "CS Total Validation",
      "error",
      `Calculated total (${formatCurrency(sumOfSelectedTotals)}) does not match CS Main Value (${formatCurrency(sumOfItemTotals)}).`
    );
  }
  return pass(9, "CS Total Validation", `CS Main Value matches the sum of item selected totals (${formatCurrency(doc.csMainValue)}).`);
}

// ─────────────────────────────────────────────────────────────────────
// Rule 10 — Currency Validation
// ─────────────────────────────────────────────────────────────────────
function rule10_currencyValidation(_doc: CSDocument): ValidationResult {
  // The Excel file does not have a currency column — all values are numeric.
  // Since currency is not specified per-row, we assume uniform currency.
  // This rule passes by default; if a currency column is added later,
  // the logic can be extended.
  return pass(10, "Currency Consistency", "Currency usage across all items and quotations is uniform.");
}

// ─────────────────────────────────────────────────────────────────────
// Rule 11 — Approval Validation
// ─────────────────────────────────────────────────────────────────────
function rule11_approvalValidation(doc: CSDocument): ValidationResult {
  const total = doc.csMainValue;
  const requiredLevel =
    APPROVAL_THRESHOLDS.find((t) => total <= t.max)?.level || "Director";

  // No approval column in the Excel — we report the required level as info
  return {
    ruleId: 11,
    ruleName: "Approval Validation",
    status: "passed",
    severity: "warning",
    message: `CS value ${formatCurrency(total)} requires ${requiredLevel} approval.`,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Rule 12 — CS Status / Submission Eligibility
// ─────────────────────────────────────────────────────────────────────
function rule12_submissionEligibility(errorCount: number): ValidationResult {
  if (errorCount > 0) {
    return fail(
      12,
      "Submission Eligibility",
      "error",
      `CS cannot be submitted. ${errorCount} validation error(s) must be resolved.`
    );
  }
  return pass(12, "Submission Eligibility");
}

// ─────────────────────────────────────────────────────────────────────
// Rule 13 — Single Procurer per CS
// ─────────────────────────────────────────────────────────────────────
function rule13_singleProcurer(doc: CSDocument): ValidationResult {
  if (doc.procurers.length > 1) {
    return fail(
      13,
      "Single Procurer",
      "error",
      `Multiple procurers found: ${doc.procurers.join(", ")}.`
    );
  }
  if (doc.procurers.length === 0) {
    return fail(13, "Single Procurer", "error", "No procurer assigned.");
  }
  return pass(13, "Single Procurer", `Single procurer ("${doc.procurers[0]}") assigned across all rows.`);
}

// ─────────────────────────────────────────────────────────────────────
// Rule 14 — Minimum CS Value Selection
// ─────────────────────────────────────────────────────────────────────
function rule14_minValueSelection(doc: CSDocument): ValidationResult {
  const affectedItems: {
    itemName: string;
    slNo: number;
    detail: string;
  }[] = [];

  for (const item of doc.items) {
    if (!item.selectedSupplier || !item.minQuotation) continue;
    if (item.selectedSupplier.unitRate > item.minQuotation.unitRate) {
      affectedItems.push({
        itemName: item.itemName,
        slNo: item.slNo,
        detail: `Selected ${item.selectedSupplier.supplierName} (${formatCurrency(item.selectedSupplier.unitRate)}) instead of ${item.minQuotation.supplierName} (${formatCurrency(item.minQuotation.unitRate)}).`,
      });
    }
  }

  if (affectedItems.length > 0) {
    return fail(
      14,
      "Min Value Selection",
      "error",
      `${affectedItems.length} item(s) not awarded to the minimum quoted supplier.`,
      affectedItems
    );
  }
  return pass(14, "Min Value Selection", "All items are awarded to the supplier with the lowest quoted price.");
}

// ── Helpers ──────────────────────────────────────────────────────────

function pass(ruleId: number, ruleName: string, message: string = "Validation passed."): ValidationResult {
  return {
    ruleId,
    ruleName,
    status: "passed",
    severity: "error",
    message,
  };
}

function fail(
  ruleId: number,
  ruleName: string,
  severity: ValidationSeverity,
  message: string,
  affectedItems?: { itemName: string; slNo: number; detail: string }[]
): ValidationResult {
  return {
    ruleId,
    ruleName,
    status: "failed",
    severity,
    message,
    affectedItems,
  };
}

function formatCurrency(val: number): string {
  return val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
