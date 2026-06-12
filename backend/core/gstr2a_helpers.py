import io
import re
from datetime import date, datetime
from typing import Any
import openpyxl
from openpyxl.styles import PatternFill, Font


COLUMNS = [
    "GSTIN of supplier",
    "Trade/Legal name",
    "Invoice number",
    "Invoice type",
    "Invoice Date",
    "Invoice Value(₹)",
    "Place of supply",
    "Taxable Value (₹)",
    "Integrated Tax(₹)",
    "Central Tax(₹)",
    "State/UT Tax(₹)"
]

# We need some flexiblity for exact header match since they might have spaces or (₹)
def _clean_header(h: str) -> str:
    if not h:
        return ""
    cleaned = str(h).upper()
    cleaned = re.sub(r"\([^)]*\)", "", cleaned) # Remove anything in parentheses e.g. (₹)
    cleaned = re.sub(r"[^A-Z0-9]", "", cleaned) # Keep only alphanumeric
    return cleaned

_EXPECTED_HEADERS = { _clean_header(c): c for c in COLUMNS }

def normalize_key_str(s: str | None) -> str:
    if not s:
        return ""
    return re.sub(r"\s+", "", str(s)).upper()

def normalize_state(s: str | None) -> str:
    if not s:
        return ""
    # Remove leading digits and hyphens, e.g. "09-Uttar Pradesh" -> "Uttar Pradesh"
    cleaned = re.sub(r"^[\d\-]+", "", str(s))
    return re.sub(r"\s+", "", cleaned).upper()

def _safe_float(val: Any) -> float:
    try:
        if val is None or str(val).strip() == "":
            return 0.0
        return float(val)
    except ValueError:
        return 0.0

def _safe_date_str(val: Any) -> str:
    if isinstance(val, datetime):
        return val.strftime("%d-%m-%Y")
    if isinstance(val, date):
        return val.strftime("%d-%m-%Y")
    if val:
        # Just return the string
        return str(val).strip()
    return ""

def build_software_rows(vouchers: list[dict[str, Any]], expected_type: str) -> list[dict[str, Any]]:
    """
    Transforms DB voucher records into normalized 11-column dicts.
    expected_type is either "purchases" or "debit_notes".
    """
    rows = []
    for v in vouchers:
        # Determine Invoice Type mapped string
        inv_type = "Regular"
        if v.get("category") == "Debit Note":
            inv_type = "Debit Note"
        elif v.get("category") == "Credit Note":
            inv_type = "Credit Note"

        # Calculate Grand Total from party accounting line
        # Assuming the query returns 'party_amount' or we calculate it
        # The query should join inventory lines and aggregate taxes
        taxable = v.get("total_taxable", 0.0)
        igst = v.get("total_igst", 0.0)
        cgst = v.get("total_cgst", 0.0)
        sgst = v.get("total_sgst", 0.0)
        
        # In a real scenario, grand total may include roundings or other ledgers.
        # Here we use party_amount if provided, else sum of items
        grand_total = v.get("party_amount", taxable + igst + cgst + sgst)

        rows.append({
            "GSTIN of supplier": v.get("gstin", ""),
            "Trade/Legal name": v.get("party_name", ""),
            "Invoice number": v.get("voucher_number", ""),
            "Invoice type": inv_type,
            "Invoice Date": _safe_date_str(v.get("voucher_date")),
            "Invoice Value(₹)": grand_total,
            "Place of supply": v.get("state", ""),
            "Taxable Value (₹)": taxable,
            "Integrated Tax(₹)": igst,
            "Central Tax(₹)": cgst,
            "State/UT Tax(₹)": sgst,
        })
    return rows


def parse_gstr2a_excel(file_bytes: bytes) -> list[dict[str, Any]]:
    """
    Parses uploaded GSTR-2A Excel and extracts rows matching our 11 columns across all sheets.
    """
    wb = openpyxl.load_workbook(filename=io.BytesIO(file_bytes), data_only=True)
    results = []

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        header_last_row_idx = -1
        col_map = {}

        # Find headers - scan first 20 rows because GST portal has multi-row headers
        for r_idx, row in enumerate(ws.iter_rows(min_row=1, max_row=20, values_only=True)):
            if not any(row):
                continue

            found_expected = False
            for c_idx, cell_val in enumerate(row):
                cleaned = _clean_header(cell_val)
                if cleaned and cleaned in _EXPECTED_HEADERS:
                    col_map[c_idx] = _EXPECTED_HEADERS[cleaned]
                    found_expected = True
            
            if found_expected:
                header_last_row_idx = max(header_last_row_idx, r_idx)

        has_gstin = any(v == "GSTIN of supplier" for v in col_map.values())
        has_inv = any(v == "Invoice number" for v in col_map.values())

        if header_last_row_idx == -1 or not has_gstin or not has_inv:
            continue # Skip this sheet, couldn't find minimum required headers

        # Parse data rows
        for r_idx, row in enumerate(ws.iter_rows(values_only=True)):
            if r_idx <= header_last_row_idx:
                continue
            if not any(row):
                continue

            row_data = {col: "" for col in COLUMNS}
            for col in ["Invoice Value(₹)", "Taxable Value (₹)", "Integrated Tax(₹)", "Central Tax(₹)", "State/UT Tax(₹)"]:
                row_data[col] = 0.0

            for c_idx, standard_col in col_map.items():
                if c_idx >= len(row):
                    continue
                val = row[c_idx]
                if standard_col in ["Invoice Value(₹)", "Taxable Value (₹)", "Integrated Tax(₹)", "Central Tax(₹)", "State/UT Tax(₹)"]:
                    row_data[standard_col] = _safe_float(val)
                elif standard_col == "Invoice Date":
                    row_data[standard_col] = _safe_date_str(val)
                else:
                    row_data[standard_col] = str(val).strip() if val is not None else ""

            gstin = row_data["GSTIN of supplier"]
            inv_no = row_data["Invoice number"]
            if gstin and inv_no:
                results.append(row_data)

    return results



def reconcile(software_rows: list[dict[str, Any]], gstr2a_rows: list[dict[str, Any]]) -> dict[str, Any]:
    software_map = {}
    for r in software_rows:
        key = normalize_key_str(r["GSTIN of supplier"]) + "|" + normalize_key_str(r["Invoice number"])
        software_map[key] = r

    gstr2a_map = {}
    for r in gstr2a_rows:
        key = normalize_key_str(r["GSTIN of supplier"]) + "|" + normalize_key_str(r["Invoice number"])
        if key in gstr2a_map:
            existing = gstr2a_map[key]
            existing["Taxable Value (₹)"] += r["Taxable Value (₹)"]
            existing["Integrated Tax(₹)"] += r["Integrated Tax(₹)"]
            existing["Central Tax(₹)"] += r["Central Tax(₹)"]
            existing["State/UT Tax(₹)"] += r["State/UT Tax(₹)"]
            # Invoice value is repeated in GSTR-2A per item line, take max
            existing["Invoice Value(₹)"] = max(existing["Invoice Value(₹)"], r["Invoice Value(₹)"])
        else:
            gstr2a_map[key] = r

    matched = []
    partially_matched = []
    unmatched = []

    matched_keys = set()

    common_keys = set(software_map.keys()).intersection(set(gstr2a_map.keys()))

    numeric_cols = [
        "Invoice Value(₹)", "Taxable Value (₹)", 
        "Integrated Tax(₹)", "Central Tax(₹)", "State/UT Tax(₹)"
    ]

    for key in common_keys:
        s_row = software_map[key]
        g_row = gstr2a_map[key]

        deviations = []
        # Check numeric
        for col in numeric_cols:
            if abs(s_row[col] - g_row[col]) > 1.0: # ₹1 tolerance
                deviations.append(col)
                
        # Check date
        if s_row["Invoice Date"] != g_row["Invoice Date"]:
            deviations.append("Invoice Date")
            
        # Check Place of Supply
        if normalize_state(s_row["Place of supply"]) != normalize_state(g_row["Place of supply"]):
            deviations.append("Place of supply")

        if not deviations:
            matched.append(s_row) # They are practically identical, use software row
        else:
            partially_matched.append({
                "software_row": s_row,
                "portal_row": g_row,
                "deviations": deviations
            })
        matched_keys.add(key)

    # Unmatched - Not in Software
    for key in gstr2a_map.keys():
        if key not in matched_keys:
            row = gstr2a_map[key].copy()
            row["Remark"] = "Not in Software"
            unmatched.append(row)

    # Unmatched - Not at Site
    for key in software_map.keys():
        if key not in matched_keys:
            row = software_map[key].copy()
            row["Remark"] = "Not at Site"
            unmatched.append(row)

    return {
        "matched": matched,
        "partially_matched": partially_matched,
        "unmatched": unmatched,
        "summary": {
            "matched": len(matched),
            "partially_matched": len(partially_matched),
            "unmatched": len(unmatched)
        }
    }


def build_result_excel(reconciliation_result: dict[str, Any]) -> bytes:
    wb = openpyxl.Workbook()
    
    # Remove default sheet
    if "Sheet" in wb.sheetnames:
        wb.remove(wb["Sheet"])

    header_font = Font(bold=True)
    red_fill = PatternFill(start_color="FFCCCC", end_color="FFCCCC", fill_type="solid")

    # 1. Matched Sheet
    ws_matched = wb.create_sheet("Matched")
    ws_matched.append(COLUMNS)
    for col_idx in range(1, len(COLUMNS) + 1):
        ws_matched.cell(row=1, column=col_idx).font = header_font
    
    for row_data in reconciliation_result["matched"]:
        ws_matched.append([row_data[c] for c in COLUMNS])

    # 2. Partially Matched Sheet
    ws_partial = wb.create_sheet("Partially Matched")
    partial_headers = COLUMNS + ["Deviation"]
    ws_partial.append(partial_headers)
    for col_idx in range(1, len(partial_headers) + 1):
        ws_partial.cell(row=1, column=col_idx).font = header_font

    current_row = 2
    for p_match in reconciliation_result["partially_matched"]:
        s_row = p_match["software_row"]
        g_row = p_match["portal_row"]
        deviations = p_match["deviations"]
        
        # We will print the software row, but highlight deviated cells in red.
        # And add a Deviation column explaining it.
        dev_texts = []
        for d in deviations:
            s_val = s_row[d]
            g_val = g_row[d]
            dev_texts.append(f"{d}: Ours {s_val} vs Portal {g_val}")
            
        row_values = [s_row[c] for c in COLUMNS] + ["\n".join(dev_texts)]
        
        for c_idx, val in enumerate(row_values, start=1):
            cell = ws_partial.cell(row=current_row, column=c_idx, value=val)
            if c_idx <= len(COLUMNS):
                col_name = COLUMNS[c_idx - 1]
                if col_name in deviations:
                    cell.fill = red_fill
                    
        current_row += 1

    # 3. Unmatched Sheet
    ws_unmatched = wb.create_sheet("Unmatched")
    unmatch_headers = COLUMNS + ["Remark"]
    ws_unmatched.append(unmatch_headers)
    for col_idx in range(1, len(unmatch_headers) + 1):
        ws_unmatched.cell(row=1, column=col_idx).font = header_font

    for row_data in reconciliation_result["unmatched"]:
        ws_unmatched.append([row_data[c] for c in COLUMNS] + [row_data["Remark"]])

    # Adjust column widths
    for ws in wb.worksheets:
        for col in ws.columns:
            max_length = 0
            column = col[0].column_letter # Get the column name
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column].width = adjusted_width

    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()
