/**
 * InvoiceEngine — Shared intelligence layer for invoice templates.
 *
 * Pure TypeScript. No React, no JSX, no DOM access.
 * Any template can import these functions to get:
 *   - Dynamic column detection
 *   - Auto-balanced column widths (3-bucket model)
 *   - Height-based page chunking
 *   - Centralized cell formatting
 *
 * Templates provide their own ChunkOptions (budgets, row height estimator)
 * so the engine stays accurate across different visual designs.
 */

import type { InvoiceData, InvoiceLineItem } from "./types";
import type {
  ColumnDef,
  ColumnFormat,
  ChunkOptions,
  PageChunk,
  PreparedInvoice,
} from "./engineTypes";

/* ═══════════════════════════════════════════════════
   1. DYNAMIC COLUMN DETECTION
   ═══════════════════════════════════════════════════ */

/**
 * Scans invoice data to determine which optional columns are active.
 * Returns columns in the legally correct GST order:
 *   Sr | Description | HSN* | Qty | Rate | Discount* | Taxable Amt | GST% | CESS* | Amount
 *
 * Uses parseFloat() for safety — form data may arrive as strings.
 */
export function detectColumns(data: InvoiceData): ColumnDef[] {
  const items = data.items;

  // Detect optional columns
  const hasHSN = items.some(
    (i) => i.hsnSac != null && String(i.hsnSac).trim() !== ""
  );
  const hasDiscount = items.some(
    (i) => i.discount != null && parseFloat(String(i.discount)) > 0
  );
  const hasCess = items.some(
    (i) =>
      (i.cessAmount != null && parseFloat(String(i.cessAmount)) > 0) ||
      (i.cessRate != null && parseFloat(String(i.cessRate)) > 0)
  );

  // Determine GST type: IGST (inter-state) vs CGST+SGST (intra-state)
  const isInterState = data.party?.state && data.company?.state && data.party.state.toLowerCase() !== data.company.state.toLowerCase();
  const hasIGST = (data.igstTotal != null && parseFloat(String(data.igstTotal)) > 0) || isInterState;

  // Build columns in canonical order
  const columns: ColumnDef[] = [
    {
      key: "srNo",
      label: "Sr.",
      width: "", // computed later
      align: "center",
      format: "integer",
      bucket: "fixed",
    },
    {
      key: "name",
      label: "Name of Product / Service",
      width: "",
      align: "left",
      format: "text",
      bucket: "flex",
    },
  ];

  if (hasHSN) {
    columns.push({
      key: "hsnSac",
      label: "HSN / SAC",
      width: "",
      align: "center",
      format: "text",
      bucket: "fixed",
    });
  }

  columns.push({
    key: "quantity",
    label: "Qty",
    width: "",
    align: "center",
    format: "text",
    bucket: "fixed",
    getValue: (item) => `${item.quantity} ${item.uom || ""}`.trim(),
  });

  columns.push({
    key: "rate",
    label: "Rate",
    width: "",
    align: "right",
    format: "currency",
    bucket: "amount",
  });

  if (hasDiscount) {
    columns.push({
      key: "discount",
      label: "Discount",
      width: "",
      align: "right",
      format: "currency",
      bucket: "amount",
    });
  }

  columns.push({
    key: "taxableAmount",
    label: "Taxable Value",
    width: "",
    align: "right",
    format: "currency",
    bucket: "amount",
  });

  // GST% column — show the applicable rate
  columns.push({
    key: "gstRate",
    label: hasIGST ? "IGST %" : "GST %",
    width: "",
    align: "center",
    format: "percent",
    bucket: "fixed",
    getValue: (item) => {
      if (hasIGST) return item.igstRate;
      // For CGST+SGST, show combined rate
      const cgst = parseFloat(String(item.cgstRate || 0));
      const sgst = parseFloat(String(item.sgstRate || 0));
      return cgst + sgst || undefined;
    },
  });

  if (hasCess) {
    columns.push({
      key: "cessAmount",
      label: "CESS",
      width: "",
      align: "right",
      format: "currency",
      bucket: "amount",
    });
  }

  // Final Amount = taxable + taxes
  columns.push({
    key: "lineTotal",
    label: "Amount",
    width: "",
    align: "right",
    format: "currency",
    bucket: "amount",
    getValue: (item) => {
      const taxable = item.taxableAmount || 0;
      const igst = parseFloat(String(item.igstAmount || 0));
      const cgst = parseFloat(String(item.cgstAmount || 0));
      const sgst = parseFloat(String(item.sgstAmount || 0));
      const cess = parseFloat(String(item.cessAmount || 0));
      return taxable + igst + cgst + sgst + cess;
    },
  });

  return columns;
}

/* ═══════════════════════════════════════════════════
   2. THREE-BUCKET COLUMN WIDTH CALCULATION
   ═══════════════════════════════════════════════════

   FIXED columns  → Small, hardcoded percentages (Sr, Qty, HSN, GST%)
   AMOUNT columns → Medium, hardcoded minimums (Rate, Discount, Taxable, CESS, Amount)
   FLEX columns   → Description gets whatever remains

   This produces a reasonable table at any column count (4 to 10+).
*/

const FIXED_WIDTHS: Record<string, number> = {
  srNo: 4,
  hsnSac: 8,
  quantity: 7,
  gstRate: 6,
};

const AMOUNT_WIDTHS: Record<string, number> = {
  rate: 10,
  discount: 8,
  taxableAmount: 11,
  cessAmount: 7,
  lineTotal: 11,
};

export function calcWidths(columns: ColumnDef[]): ColumnDef[] {
  let fixedTotal = 0;
  let amountTotal = 0;
  let flexCount = 0;

  for (const col of columns) {
    if (col.bucket === "fixed" && FIXED_WIDTHS[col.key]) {
      fixedTotal += FIXED_WIDTHS[col.key];
    } else if (col.bucket === "amount" && AMOUNT_WIDTHS[col.key]) {
      amountTotal += AMOUNT_WIDTHS[col.key];
    } else if (col.bucket === "flex") {
      flexCount++;
    }
  }

  const flexRemaining = Math.max(10, 100 - fixedTotal - amountTotal);
  const flexEach = flexRemaining / Math.max(1, flexCount);

  return columns.map((col) => {
    let w: number;
    if (col.bucket === "fixed" && FIXED_WIDTHS[col.key]) {
      w = FIXED_WIDTHS[col.key];
    } else if (col.bucket === "amount" && AMOUNT_WIDTHS[col.key]) {
      w = AMOUNT_WIDTHS[col.key];
    } else {
      w = flexEach;
    }
    return { ...col, width: `${w}%` };
  });
}

/* ═══════════════════════════════════════════════════
   3. HEIGHT-BASED PAGE CHUNKING
   ═══════════════════════════════════════════════════ */

/** Default chunk options — sensible for the Classic template at 12.5px base */
export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = {
  // Reduced to account for browser default margins
  page1Budget: 600,
  pageNBudget: 850,
  lastPageReserve: 540,
  rowHeight: (item: InvoiceLineItem) => {
    const nameLen = (item.name || "").length;
    if (nameLen > 150) return 85;
    if (nameLen > 90) return 68;
    if (nameLen > 45) return 48;
    return 33;
  },
};

export function chunkPages(
  data: InvoiceData,
  options: ChunkOptions = DEFAULT_CHUNK_OPTIONS
): PageChunk[] {
  const items = data.items;
  if (items.length === 0) {
    return [
      {
        items: [],
        pageNumber: 1,
        totalPages: 1,
        isFirstPage: true,
        isLastPage: true,
        pageLabel: "Page 1 of 1",
      },
    ];
  }

  const chunks: InvoiceLineItem[][] = [];
  let currentChunk: InvoiceLineItem[] = [];
  let currentHeight = 0;
  let isFirstPage = true;

  for (let i = 0; i < items.length; i++) {
    const rowH = options.rowHeight(items[i]);
    const budget = isFirstPage ? options.page1Budget : options.pageNBudget;

    // Check if remaining items might be the last page — reserve footer space
    const remainingItems = items.slice(i);
    const remainingHeight = remainingItems.reduce(
      (sum, item) => sum + options.rowHeight(item),
      0
    );
    const isLikelyLastPage =
      currentHeight + remainingHeight + options.lastPageReserve <= budget;

    // If adding this row would exceed budget (accounting for last-page reserve
    // if this could be the last page), start a new page
    const effectiveBudget = isLikelyLastPage
      ? budget - options.lastPageReserve
      : budget;

    if (currentHeight + rowH > effectiveBudget && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentHeight = 0;
      isFirstPage = false;
    }

    currentChunk.push(items[i]);
    currentHeight += rowH;
  }

  // Push final chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  // Now verify the last chunk actually fits with the footer.
  // If not, we need to split it further.
  const lastChunkIdx = chunks.length - 1;
  if (lastChunkIdx > 0) {
    const lastBudget = options.pageNBudget - options.lastPageReserve;
    let lastHeight = 0;
    const lastItems = chunks[lastChunkIdx];
    const fitsInOnePage = lastItems.every((item) => {
      lastHeight += options.rowHeight(item);
      return lastHeight <= lastBudget;
    });

    if (!fitsInOnePage) {
      // Split the last chunk
      const overflow: InvoiceLineItem[] = [];
      const kept: InvoiceLineItem[] = [];
      let h = 0;
      for (const item of lastItems) {
        const rh = options.rowHeight(item);
        if (h + rh <= lastBudget) {
          kept.push(item);
          h += rh;
        } else {
          overflow.push(item);
        }
      }
      chunks[lastChunkIdx] = kept;
      if (overflow.length > 0) {
        chunks.push(overflow);
      }
    }
  }

  const totalPages = chunks.length;

  return chunks.map((chunkItems, idx) => ({
    items: chunkItems,
    pageNumber: idx + 1,
    totalPages,
    isFirstPage: idx === 0,
    isLastPage: idx === totalPages - 1,
    pageLabel: `Page ${idx + 1} of ${totalPages}`,
  }));
}

/* ═══════════════════════════════════════════════════
   4. CELL FORMATTING
   ═══════════════════════════════════════════════════ */

/**
 * Centralized cell formatter. Templates call this in their render loop
 * instead of implementing their own formatting logic.
 */
export function formatCell(
  value: string | number | undefined | null,
  format: ColumnFormat
): string {
  if (value == null || value === "") return "";

  switch (format) {
    case "currency": {
      const n = typeof value === "string" ? parseFloat(value) : value;
      if (isNaN(n)) return "";
      return n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    case "percent": {
      const n = typeof value === "string" ? parseFloat(value) : value;
      if (isNaN(n) || n === 0) return "";
      return `${n}%`;
    }
    case "integer": {
      const n = typeof value === "string" ? parseInt(value, 10) : Math.floor(value as number);
      if (isNaN(n)) return "";
      return String(n);
    }
    case "decimal": {
      const n = typeof value === "string" ? parseFloat(value) : value;
      if (isNaN(n)) return "";
      return n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    case "text":
    default:
      return String(value);
  }
}

/**
 * Extracts the display value for a given column from a line item.
 * Uses the column's getValue() if defined, otherwise reads item[key].
 */
export function getCellValue(
  item: InvoiceLineItem,
  col: ColumnDef
): string | number | undefined {
  if (col.getValue) return col.getValue(item);
  return (item as unknown as Record<string, unknown>)[col.key] as
    | string
    | number
    | undefined;
}

/* ═══════════════════════════════════════════════════
   5. CONVENIENCE WRAPPER
   ═══════════════════════════════════════════════════ */

/**
 * One-call entry point for templates.
 *
 * Usage in a template:
 *   const prepared = prepareInvoice(data, myChunkOptions);
 *   // prepared.columns  → dynamic column definitions
 *   // prepared.pages    → height-budgeted page chunks
 *   // prepared.original → raw data for header/footer rendering
 */
export function prepareInvoice(
  data: InvoiceData,
  options?: ChunkOptions
): PreparedInvoice {
  const rawColumns = detectColumns(data);
  const columns = calcWidths(rawColumns);
  const pages = chunkPages(data, options);

  return { columns, pages, original: data };
}
