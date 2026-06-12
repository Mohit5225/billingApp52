export interface ReconciliationRow {
  "GSTIN of supplier": string;
  "Trade/Legal name": string;
  "Invoice number": string;
  "Invoice type": string;
  "Invoice Date": string;
  "Invoice Value(₹)": number;
  "Place of supply": string;
  "Taxable Value (₹)": number;
  "Integrated Tax(₹)": number;
  "Central Tax(₹)": number;
  "State/UT Tax(₹)": number;
}

export interface PartiallyMatchedRow {
  software_row: ReconciliationRow;
  portal_row: ReconciliationRow;
  deviations: string[];
}

export interface UnmatchedRow extends ReconciliationRow {
  Remark: "Not in Software" | "Not at Site";
}

export interface ReconciliationResult {
  matched: ReconciliationRow[];
  partially_matched: PartiallyMatchedRow[];
  unmatched: UnmatchedRow[];
  summary: {
    matched: number;
    partially_matched: number;
    unmatched: number;
  };
}
