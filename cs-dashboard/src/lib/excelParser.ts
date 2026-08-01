import * as XLSX from "xlsx";
import { RawCSRow, CSDocument, CSItem, SupplierQuotation } from "./types";

/**
 * Parse an Excel file (ArrayBuffer) into structured CSDocument[].
 * Handles the column layout:
 *   SL NO, COMPANY_NAME, REQUISITIONS, CS_NO, CS_DATE, PROCURER,
 *   ITEM_NAME, TS ID, TECHNICAL_SPECIFICATION,
 *   SUPPLIER_NAME_1..5, UNIT_RATE_1..5, QTY_1..5, TOTAL_PRICE_1..5,
 *   CS_MAIN_VALUE
 */
export function parseExcelFile(buffer: ArrayBuffer): CSDocument[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to JSON rows
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
  });

  if (rawRows.length === 0) return [];

  // Normalise column keys (trim whitespace, replace spaces with underscores)
  const rows: RawCSRow[] = rawRows.map((row) => {
    const normalised: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const normKey = key.trim().replace(/\s+/g, "_").toUpperCase();
      normalised[normKey] = value;
    }
    return mapToRawCSRow(normalised);
  });

  // Group rows by CS_NO
  const groups = new Map<string, RawCSRow[]>();
  for (const row of rows) {
    const csNo = String(row.CS_NO || "").trim();
    if (!csNo) continue;
    if (!groups.has(csNo)) groups.set(csNo, []);
    groups.get(csNo)!.push(row);
  }

  // Build CSDocument for each group
  const documents: CSDocument[] = [];
  let idCounter = 0;

  for (const [csNo, csRows] of groups) {
    idCounter++;
    const firstRow = csRows[0];

    const items: CSItem[] = csRows.map((row) => {
      const quotations = extractQuotations(row);
      const minQuotation =
        quotations.length > 0
          ? quotations.reduce((min, q) =>
              q.unitRate < min.unitRate ? q : min
            )
          : null;

      const itemCsMainValue = parseNumeric(row.CS_MAIN_VALUE);

      // Find the supplier quotation that matches CS_MAIN_VALUE (either by totalPrice or unitRate * qty)
      const matchingSelected = quotations.find((q) => {
        const matchesTotal = Math.abs(q.totalPrice - itemCsMainValue) < 0.05;
        const matchesRate = Math.abs(q.unitRate * q.quantity - itemCsMainValue) < 0.05;
        return matchesTotal || matchesRate;
      });

      const selectedSupplier = matchingSelected || (quotations.length > 0 ? quotations[0] : null);

      return {
        slNo: Number(row.SL_NO) || 0,
        itemName: String(row.ITEM_NAME || "").trim(),
        tsId: row.TS_ID,
        technicalSpecification: String(
          row.TECHNICAL_SPECIFICATION || ""
        ).trim(),
        quotations,
        minQuotation,
        selectedSupplier,
        csMainValue: itemCsMainValue,
      };
    });

    // Collect all unique suppliers across all items
    const allSuppliers = new Set<string>();
    for (const item of items) {
      for (const q of item.quotations) {
        allSuppliers.add(q.supplierName);
      }
    }

    // Collect all procurers
    const procurers = [
      ...new Set(csRows.map((r) => String(r.PROCURER || "").trim())),
    ].filter(Boolean);

    // Calculate total from item CS_MAIN_VALUE columns
    const calculatedTotal = items.reduce(
      (sum, item) => sum + item.csMainValue,
      0
    );

    // The CS_MAIN_VALUE on the first row is sometimes the CS-level total,
    // but in this dataset each row has its own item-level CS_MAIN_VALUE.
    // We sum all item values as the calculated total.
    const csMainValue = calculatedTotal;

    documents.push({
      id: `cs-${idCounter}`,
      csNo,
      companyName: String(firstRow.COMPANY_NAME || "").trim(),
      requisitionNo: String(firstRow.REQUISITIONS || "").trim(),
      csDate: String(firstRow.CS_DATE || "").trim(),
      procurers,
      items,
      suppliers: [...allSuppliers],
      csMainValue,
      calculatedTotal,
    });
  }

  return documents;
}

/** Extract up to 5 supplier quotations from a raw row */
function extractQuotations(row: RawCSRow): SupplierQuotation[] {
  const quotations: SupplierQuotation[] = [];

  for (let i = 1; i <= 5; i++) {
    const nameKey = `SUPPLIER_NAME_${i}` as keyof RawCSRow;
    const rateKey = `UNIT_RATE_${i}` as keyof RawCSRow;
    const qtyKey = `QTY_${i}` as keyof RawCSRow;
    const totalKey = `TOTAL_PRICE_${i}` as keyof RawCSRow;

    const name = String(row[nameKey] || "").trim();
    if (!name) continue;

    const unitRate = parseNumeric(row[rateKey]);
    const quantity = parseNumeric(row[qtyKey]);
    const totalPrice = parseNumeric(row[totalKey]);

    quotations.push({
      supplierName: name,
      unitRate,
      quantity,
      totalPrice: totalPrice || unitRate * quantity,
    });
  }

  return quotations;
}

/** Parse a numeric value that may include commas or be a string */
function parseNumeric(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/,/g, "").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

/** Format an Excel date value (serial number, Date object, or string) */
function formatDate(val: unknown): string {
  if (val instanceof Date) {
    return val.toISOString().split("T")[0];
  }
  if (typeof val === "number") {
    // Excel serial date number — convert to JS Date
    const date = new Date((val - 25569) * 86400 * 1000);
    return date.toISOString().split("T")[0];
  }
  if (typeof val === "string") {
    const str = val.trim();
    // If it looks like a date string already, return as-is
    if (str.match(/\d{4}-\d{2}-\d{2}/)) return str;
    // Try parsing
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    return str;
  }
  return String(val || "");
}

/** Map normalised keys to RawCSRow */
function mapToRawCSRow(obj: Record<string, unknown>): RawCSRow {
  return {
    SL_NO: Number(obj["SL_NO"] || obj["SL NO"] || 0),
    COMPANY_NAME: String(obj["COMPANY_NAME"] || ""),
    REQUISITIONS: String(obj["REQUISITIONS"] || ""),
    CS_NO: String(obj["CS_NO"] || ""),
    CS_DATE: formatDate(obj["CS_DATE"]),
    PROCURER: String(obj["PROCURER"] || ""),
    ITEM_NAME: String(obj["ITEM_NAME"] || ""),
    TS_ID: (obj["TS_ID"] ?? obj["TS_ID"] ?? "") as string | number,
    TECHNICAL_SPECIFICATION: String(obj["TECHNICAL_SPECIFICATION"] || ""),
    SUPPLIER_NAME_1: String(obj["SUPPLIER_NAME_1"] || ""),
    UNIT_RATE_1: parseNumeric(obj["UNIT_RATE_1"]),
    QTY_1: parseNumeric(obj["QTY_1"]),
    TOTAL_PRICE_1: parseNumeric(obj["TOTAL_PRICE_1"]),
    SUPPLIER_NAME_2: String(obj["SUPPLIER_NAME_2"] || ""),
    UNIT_RATE_2: parseNumeric(obj["UNIT_RATE_2"]),
    QTY_2: parseNumeric(obj["QTY_2"]),
    TOTAL_PRICE_2: parseNumeric(obj["TOTAL_PRICE_2"]),
    SUPPLIER_NAME_3: String(obj["SUPPLIER_NAME_3"] || ""),
    UNIT_RATE_3: parseNumeric(obj["UNIT_RATE_3"]),
    QTY_3: parseNumeric(obj["QTY_3"]),
    TOTAL_PRICE_3: parseNumeric(obj["TOTAL_PRICE_3"]),
    SUPPLIER_NAME_4: String(obj["SUPPLIER_NAME_4"] || ""),
    UNIT_RATE_4: parseNumeric(obj["UNIT_RATE_4"]),
    QTY_4: parseNumeric(obj["QTY_4"]),
    TOTAL_PRICE_4: parseNumeric(obj["TOTAL_PRICE_4"]),
    SUPPLIER_NAME_5: String(obj["SUPPLIER_NAME_5"] || ""),
    UNIT_RATE_5: parseNumeric(obj["UNIT_RATE_5"]),
    QTY_5: parseNumeric(obj["QTY_5"]),
    TOTAL_PRICE_5: parseNumeric(obj["TOTAL_PRICE_5"]),
    CS_MAIN_VALUE: parseNumeric(obj["CS_MAIN_VALUE"]),
  };
}
