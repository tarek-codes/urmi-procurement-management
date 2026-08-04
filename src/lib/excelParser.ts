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
      const quotations = extractQuotations(row as unknown as Record<string, unknown>);
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

/** Extract up to 10 supplier quotations from a raw row (supporting various column naming conventions) */
function extractQuotations(row: Record<string, unknown>): SupplierQuotation[] {
  const quotations: SupplierQuotation[] = [];

  // Normalise row keys to uppercase with underscores
  const normObj: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    normObj[k.trim().replace(/\s+/g, "_").toUpperCase()] = v;
  }

  // Helper to find value by exact normalized key or pattern
  const getVal = (exactKey: string, ...fallbackKeys: string[]): unknown => {
    if (normObj[exactKey] !== undefined && normObj[exactKey] !== "" && normObj[exactKey] !== null) {
      return normObj[exactKey];
    }
    for (const fb of fallbackKeys) {
      if (normObj[fb] !== undefined && normObj[fb] !== "" && normObj[fb] !== null) {
        return normObj[fb];
      }
      for (const [k, v] of Object.entries(normObj)) {
        if ((k === fb || k.endsWith(fb) || k.includes(fb)) && v !== undefined && v !== "" && v !== null) {
          return v;
        }
      }
    }
    return undefined;
  };

  for (let i = 1; i <= 10; i++) {
    const rawName = i === 1
      ? getVal("SUPPLIER_NAME_1", "SUPPLIER_NAME", "SUPPLIER_1", "VENDOR_NAME_1", "VENDOR_1")
      : getVal(`SUPPLIER_NAME_${i}`, `SUPPLIER_${i}`, `VENDOR_NAME_${i}`, `VENDOR_${i}`);

    const rawRate = i === 1
      ? getVal("UNIT_RATE_1", "UNIT_RATE", "RATE_1", "RATE")
      : getVal(`UNIT_RATE_${i}`, `RATE_${i}`, `UNIT_PRICE_${i}`, `PRICE_${i}`);
    const unitRate = parseNumeric(rawRate);

    const rawQty = i === 1
      ? getVal("QTY_1", "QTY", "QUANTITY_1", "QUANTITY")
      : getVal(`QTY_${i}`, `QUANTITY_${i}`, `QTY${i}`);
    const quantity = parseNumeric(rawQty) || 1;

    const rawTotal = i === 1
      ? getVal("TOTAL_PRICE_1", "TOTAL_PRICE", "TOTAL_1", "TOTAL", "AMOUNT_1")
      : getVal(`TOTAL_PRICE_${i}`, `TOTAL_AMOUNT_${i}`, `TOTAL_${i}`, `AMOUNT_${i}`);
    const totalPrice = parseNumeric(rawTotal) || (unitRate * quantity);

    let name = String(rawName || "").trim();
    
    // If supplier name is blank but valid rate or total price exists (>0), generate fallback supplier label
    if ((!name || name.toUpperCase() === "N/A" || name.toUpperCase() === "UNDEFINED") && (unitRate > 0 || totalPrice > 0)) {
      name = `Supplier ${String.fromCharCode(64 + i)}`; // e.g. Supplier A, Supplier B, Supplier C
    }

    if (!name || name.toUpperCase() === "N/A" || name.toUpperCase() === "UNDEFINED") continue;

    quotations.push({
      supplierName: name,
      unitRate,
      quantity,
      totalPrice,
    });
  }

  // Deduplicate by supplier name (case-insensitive) — keep first occurrence.
  // The flexible column-key fallback matching can sometimes resolve the same
  // column for multiple slot indices, producing duplicate entries.
  const seen = new Set<string>();
  const deduped = quotations.filter((q) => {
    const key = q.supplierName.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped;
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

/** Map normalised keys to RawCSRow */
function mapToRawCSRow(obj: Record<string, unknown>): RawCSRow {
  const getStr = (...keys: string[]) => {
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== "") {
        return String(obj[k]).trim();
      }
    }
    return "";
  };

  return {
    SL_NO: Number(obj["SL_NO"] || obj["SL NO"] || obj["SL"] || 0),
    COMPANY_NAME: getStr("COMPANY_NAME", "COMPANY", "COMP"),
    REQUISITIONS: getStr("REQUISITIONS", "REQUISITION", "REQ_NO", "REQUISITION_NO"),
    CS_NO: getStr("CS_NO", "CS_NUMBER", "CS_NUM", "CS"),
    CS_DATE: formatDate(obj["CS_DATE"] || obj["CS_DT"]),
    PROCURER: getStr("PROCURER", "PROCURER_NAME", "PURCHASER", "BUYER"),
    ITEM_NAME: getStr("ITEM_NAME", "ITEM", "DESCRIPTION", "PRODUCT_NAME"),
    TS_ID: (obj["TS_ID"] || obj["TS ID"] || obj["SPEC_ID"] || "") as string | number,
    TECHNICAL_SPECIFICATION: getStr("TECHNICAL_SPECIFICATION", "TECH_SPEC", "SPECIFICATION", "SPECS"),
    SUPPLIER_NAME_1: getStr("SUPPLIER_NAME_1", "SUPPLIER_1", "VENDOR_1"),
    UNIT_RATE_1: parseNumeric(obj["UNIT_RATE_1"] || obj["RATE_1"]),
    QTY_1: parseNumeric(obj["QTY_1"] || obj["QUANTITY_1"]),
    TOTAL_PRICE_1: parseNumeric(obj["TOTAL_PRICE_1"] || obj["TOTAL_1"]),
    SUPPLIER_NAME_2: getStr("SUPPLIER_NAME_2", "SUPPLIER_2", "VENDOR_2"),
    UNIT_RATE_2: parseNumeric(obj["UNIT_RATE_2"] || obj["RATE_2"]),
    QTY_2: parseNumeric(obj["QTY_2"] || obj["QUANTITY_2"]),
    TOTAL_PRICE_2: parseNumeric(obj["TOTAL_PRICE_2"] || obj["TOTAL_2"]),
    SUPPLIER_NAME_3: getStr("SUPPLIER_NAME_3", "SUPPLIER_3", "VENDOR_3"),
    UNIT_RATE_3: parseNumeric(obj["UNIT_RATE_3"] || obj["RATE_3"]),
    QTY_3: parseNumeric(obj["QTY_3"] || obj["QUANTITY_3"]),
    TOTAL_PRICE_3: parseNumeric(obj["TOTAL_PRICE_3"] || obj["TOTAL_3"]),
    SUPPLIER_NAME_4: getStr("SUPPLIER_NAME_4", "SUPPLIER_4", "VENDOR_4"),
    UNIT_RATE_4: parseNumeric(obj["UNIT_RATE_4"] || obj["RATE_4"]),
    QTY_4: parseNumeric(obj["QTY_4"] || obj["QUANTITY_4"]),
    TOTAL_PRICE_4: parseNumeric(obj["TOTAL_PRICE_4"] || obj["TOTAL_4"]),
    SUPPLIER_NAME_5: getStr("SUPPLIER_NAME_5", "SUPPLIER_5", "VENDOR_5"),
    UNIT_RATE_5: parseNumeric(obj["UNIT_RATE_5"] || obj["RATE_5"]),
    QTY_5: parseNumeric(obj["QTY_5"] || obj["QUANTITY_5"]),
    TOTAL_PRICE_5: parseNumeric(obj["TOTAL_PRICE_5"] || obj["TOTAL_5"]),
    CS_MAIN_VALUE: parseNumeric(obj["CS_MAIN_VALUE"] || obj["CS_VALUE"] || obj["TOTAL_VALUE"]),
  };
}
