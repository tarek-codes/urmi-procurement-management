// ── Raw row from the Excel file ──────────────────────────────────────
export interface RawCSRow {
  SL_NO: number;
  COMPANY_NAME: string;
  REQUISITIONS: string;
  CS_NO: string;
  CS_DATE: string;
  PROCURER: string;
  ITEM_NAME: string;
  TS_ID: number | string;
  TECHNICAL_SPECIFICATION: string;
  // Up to 5 suppliers per row
  SUPPLIER_NAME_1?: string;
  UNIT_RATE_1?: number;
  QTY_1?: number;
  TOTAL_PRICE_1?: number;
  SUPPLIER_NAME_2?: string;
  UNIT_RATE_2?: number;
  QTY_2?: number;
  TOTAL_PRICE_2?: number;
  SUPPLIER_NAME_3?: string;
  UNIT_RATE_3?: number;
  QTY_3?: number;
  TOTAL_PRICE_3?: number;
  SUPPLIER_NAME_4?: string;
  UNIT_RATE_4?: number;
  QTY_4?: number;
  TOTAL_PRICE_4?: number;
  SUPPLIER_NAME_5?: string;
  UNIT_RATE_5?: number;
  QTY_5?: number;
  TOTAL_PRICE_5?: number;
  CS_MAIN_VALUE: number;
}

// ── Parsed supplier quotation for an item ────────────────────────────
export interface SupplierQuotation {
  supplierName: string;
  unitRate: number;
  quantity: number;
  totalPrice: number;
}

// ── Parsed item within a CS ──────────────────────────────────────────
export interface CSItem {
  slNo: number;
  itemName: string;
  tsId: number | string;
  technicalSpecification: string;
  quotations: SupplierQuotation[];
  /** The supplier with the lowest unit rate (auto-detected) */
  minQuotation: SupplierQuotation | null;
  /** The first supplier listed is treated as the "selected" supplier */
  selectedSupplier: SupplierQuotation | null;
  csMainValue: number;
}

// ── Parsed CS document (grouped from rows sharing the same CS_NO) ───
export interface CSDocument {
  id: string;
  csNo: string;
  companyName: string;
  requisitionNo: string;
  csDate: string;
  procurers: string[];
  items: CSItem[];
  suppliers: string[];
  csMainValue: number;
  calculatedTotal: number;
}

// ── Validation result ────────────────────────────────────────────────
export type ValidationSeverity = "error" | "warning";
export type ValidationStatus = "passed" | "failed";

export interface ValidationResult {
  ruleId: number;
  ruleName: string;
  status: ValidationStatus;
  severity: ValidationSeverity;
  message: string;
  /** Optional: affected items for drill-down */
  affectedItems?: {
    itemName: string;
    slNo: number;
    detail: string;
  }[];
}

// ── Complete validation report for a CS ──────────────────────────────
export interface CSValidationReport {
  csId: string;
  csNo: string;
  companyName: string;
  requisitionNo: string;
  csDate: string;
  procurer: string;
  overallStatus: ValidationStatus;
  errorCount: number;
  warningCount: number;
  results: ValidationResult[];
  items: CSItem[];
  suppliers: string[];
  csMainValue: number;
  calculatedTotal: number;
}

// ── Selected Supplier Audit Record ────────────────────────────────────
export interface CsSupplierSelectionRecord {
  id: string;
  csNo: string;
  procurer: string;
  selectedSupplier: string;
  reasonNote: string;
  selectedAt: string;
  status: "Pending" | "Approved" | "Rejected";
  auditNote?: string;
}
