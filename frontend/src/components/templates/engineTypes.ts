/**
 * Shared types for the Invoice Engine.
 *
 * These types define the contract between the engine (InvoiceEngine.ts)
 * and any visual template that consumes its output.
 */

import type { InvoiceData, InvoiceLineItem } from "./types";

/* ─── Column Definition ─────────────────────────── */

export type ColumnFormat = "currency" | "percent" | "integer" | "decimal" | "text";
export type ColumnAlign = "left" | "center" | "right";
export type ColumnBucket = "fixed" | "amount" | "flex";

export interface ColumnDef {
  /** Property key on InvoiceLineItem (e.g. "srNo", "discount") */
  key: string;
  /** Display label (e.g. "Sr.", "Discount") */
  label: string;
  /** Computed width as CSS string (e.g. "10%") */
  width: string;
  /** Text alignment */
  align: ColumnAlign;
  /** How to format the cell value */
  format: ColumnFormat;
  /** Width-calculation bucket */
  bucket: ColumnBucket;
  /**
   * Optional value extractor for computed/derived columns.
   * If provided, used instead of item[key].
   */
  getValue?: (item: InvoiceLineItem) => string | number | undefined;
}

/* ─── Page Chunk ────────────────────────────────── */

export interface PageChunk {
  /** Subset of line items for this page */
  items: InvoiceLineItem[];
  /** 1-indexed page number */
  pageNumber: number;
  /** Total number of pages */
  totalPages: number;
  /** Is this the first page? (renders full header) */
  isFirstPage: boolean;
  /** Is this the last page? (renders footer sections) */
  isLastPage: boolean;
  /** Pre-built label, e.g. "Page 2 of 4" */
  pageLabel: string;
}

/* ─── Chunk Options (template-provided) ─────────── */

export interface ChunkOptions {
  /**
   * Available pixel height for line items on the first page.
   * Should account for: full header, customer block, table header, padding.
   */
  page1Budget: number;
  /**
   * Available pixel height for line items on continuation pages.
   * Should account for: compact header, table header, padding.
   */
  pageNBudget: number;
  /**
   * Pixel height reserved on the last page for footer sections:
   * tax breakdown, bank details, signature, terms.
   */
  lastPageReserve: number;
  /**
   * Template-specific row height estimator.
   * The template knows its own font size, padding, and column widths,
   * so it provides the most accurate per-item estimate.
   */
  rowHeight: (item: InvoiceLineItem) => number;
}

/* ─── Prepared Invoice (engine output) ──────────── */

export interface PreparedInvoice {
  /** Active columns in canonical GST order, with computed widths */
  columns: ColumnDef[];
  /** Height-budgeted page chunks */
  pages: PageChunk[];
  /** Original unmodified invoice data (for header/footer rendering) */
  original: InvoiceData;
}
