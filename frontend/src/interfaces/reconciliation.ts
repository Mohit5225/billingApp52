/**
 * Matches the internal COLUMNS list produced by gstr2a_helpers.py:
 * ["Sr","AS PER","GSTN","Recipient Name","State","Pos",
 *  "Invoice Num","date","Invoice Value","Taxable Value","IGST","CGST","SGST"]
 */
export interface ReconciliationRow {
  Sr: number;
  "AS PER": string;
  GSTN: string;
  "Recipient Name": string;
  State: string;
  Pos: string;
  "Invoice Num": string;
  date: string;
  "Invoice Value": number;
  "Taxable Value": number;
  IGST: number;
  CGST: number;
  SGST: number;
  Remark?: string;
  [key: string]: unknown; // allow deviation field access via string index
}

export interface PartiallyMatchedRow {
  software_row: ReconciliationRow;
  portal_row: ReconciliationRow;
  deviations: string[];
}

/**
 * Result shape from POST /api/reconciliation/gstr2a
 * Each key is a normalised GSTIN string → list of entries for that party.
 */
export interface ReconciliationResult {
  /** gstin → matched rows (from books) */
  matched_grouped: Record<string, ReconciliationRow[]>;
  /** gstin → partially matched pairs */
  partial_grouped: Record<string, PartiallyMatchedRow[]>;
  /** gstin → rows in books but not on portal */
  not_at_site_grouped: Record<string, ReconciliationRow[]>;
  /** gstin → rows on portal but not in books */
  not_in_software_grouped: Record<string, ReconciliationRow[]>;
  /** gstin → portal rows whose date falls outside the selected range */
  outside_range_grouped: Record<string, ReconciliationRow[]>;
  warnings: string[];
  summary: {
    matched: number;
    partially_matched: number;
    not_at_site: number;
    not_in_software: number;
    outside_range: number;
  };
  /** Actual date span found in the uploaded sheet (ISO yyyy-mm-dd) */
  sheet_date_range: { min: string; max: string } | null;
}

