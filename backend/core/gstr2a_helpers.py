import io
import re
from datetime import date, datetime
from typing import Any
import openpyxl
import xlrd
from openpyxl.styles import PatternFill, Font


COLUMNS = [
    "Sr",
    "AS PER",
    "GSTN",
    "Recipient Name",
    "State",
    "Pos",
    "Invoice Num",
    "date",
    "Invoice Value",
    "Taxable Value",
    "IGST",
    "CGST",
    "SGST"
]

# We need some flexibility for exact header match since they might have spaces or (₹)
def _clean_header(h: str) -> str:
    if not h:
        return ""
    cleaned = str(h).upper()
    cleaned = re.sub(r"\([^)]*\)", "", cleaned)
    cleaned = re.sub(r"[^A-Z0-9]", "", cleaned)
    return cleaned

def _map_header(raw_header: str) -> str | None:
    """
    Fuzzy mapping from any portal/software column header to our internal standard column.
    Handles all GST portal variations without requiring exact key matches.
    """
    c = _clean_header(raw_header)
    if not c:
        return None
    # GSTIN
    if "GSTIN" in c or c == "GSTN" or "UIN" in c:
        return "GSTN"
    # Supplier/Party name
    if "TRADELEGAL" in c or "TRADENAME" in c or "LEGALNAME" in c or "RECIPIENTNAME" in c or "PARTYNAME" in c or "SUPPLIER" in c:
        return "Recipient Name"
    # Invoice Number
    if ("INVOICE" in c or "VOUCHER" in c or "BILL" in c or "DOCUMENT" in c or "NOTE" in c) and ("NUM" in c or c.endswith("NO") or "NO" in c and "DATE" not in c):
        return "Invoice Num"
    # Invoice Date
    if ("INVOICE" in c or "VOUCHER" in c or "BILL" in c or "DOCUMENT" in c or "NOTE" in c) and "DATE" in c:
        return "date"
    if c == "DATE":
        return "date"
    # Invoice Value (total) — check before TAXABLE
    if ("INVOICE" in c or "VOUCHER" in c or "BILL" in c or "NOTE" in c or "GROSS" in c) and ("VALUE" in c or "AMOUNT" in c or "TOTAL" in c):
        return "Invoice Value"
    # Taxable Value
    if "TAXABLE" in c:
        return "Taxable Value"
    # IGST
    if c == "IGST" or ("INTEGRATED" in c and "TAX" in c):
        return "IGST"
    # CGST
    if c == "CGST" or ("CENTRAL" in c and "TAX" in c):
        return "CGST"
    # SGST
    if c == "SGST" or "STATEUT" in c or ("STATE" in c and "TAX" in c):
        return "SGST"
    # Place of Supply / Pos / State
    if "PLACEOFSUPPLY" in c or "PLACEOFORIGIN" in c:
        return "Pos"
    if c in ("POS", "STATE"):
        return "Pos"
    return None

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
        s = str(val).strip()
        # Parse ISO date from DB (e.g. 2026-05-26)
        if len(s) >= 10 and s[4] == '-' and s[7] == '-':
            try:
                return datetime.strptime(s[:10], "%Y-%m-%d").strftime("%d-%m-%Y")
            except Exception:
                pass
        
        s = s.replace("/", "-")
        for fmt in ("%d-%m-%Y", "%d-%b-%Y", "%d-%b-%y", "%d-%m-%y"):
            try:
                return datetime.strptime(s, fmt).strftime("%d-%m-%Y")
            except ValueError:
                pass
        return s
    return ""

def build_software_rows(vouchers: list[dict[str, Any]], expected_type: str) -> list[dict[str, Any]]:
    """
    Transforms DB voucher records into normalized 11-column dicts.
    expected_type is either "purchases" or "debit_notes".
    """
    rows = []
    for idx, v in enumerate(vouchers, start=1):
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

        pos_str = v.get("state", "").upper()

        rows.append({
            "Sr": idx,
            "AS PER": "BOOKS",
            "GSTN": v.get("gstin", ""),
            "Recipient Name": v.get("party_name", ""),
            "State": pos_str,
            "Pos": pos_str,
            "Invoice Num": v.get("voucher_number", ""),
            "date": _safe_date_str(v.get("voucher_date")),
            "Invoice Value": grand_total,
            "Taxable Value": taxable,
            "IGST": igst,
            "CGST": cgst,
            "SGST": sgst,
        })
    return rows


def parse_gstr2a_excel(file_bytes: bytes, filename: str) -> list[dict[str, Any]]:
    """
    Parses uploaded GSTR-2A Excel and extracts rows matching our 11 columns across all sheets.
    Handles both .xlsx (via openpyxl) and .xls (via xlrd).
    """
    results = []
    is_old_xls = filename.lower().endswith('.xls') and not filename.lower().endswith('.xlsx')
    print(f"[GSTR2A DEBUG] Filename: {filename}, is_old_xls: {is_old_xls}, file_size: {len(file_bytes)} bytes")

    def sheet_iterator():
        if is_old_xls:
            print("[GSTR2A DEBUG] Using xlrd for .xls file")
            wb = xlrd.open_workbook(file_contents=file_bytes)
            print(f"[GSTR2A DEBUG] xlrd sheets: {wb.sheet_names()}")
            for sheet_name in wb.sheet_names():
                ws = wb.sheet_by_name(sheet_name)
                print(f"[GSTR2A DEBUG] Sheet '{sheet_name}': {ws.nrows} rows x {ws.ncols} cols")
                def row_iterator():
                    for r_idx in range(ws.nrows):
                        row_vals = []
                        for c_idx in range(ws.ncols):
                            cell = ws.cell(r_idx, c_idx)
                            val = cell.value
                            if cell.ctype == xlrd.XL_CELL_DATE:
                                try:
                                    dt_tuple = xlrd.xldate_as_tuple(val, wb.datemode)
                                    val = datetime(*dt_tuple)
                                except Exception:
                                    pass
                            row_vals.append(val.strip("'") if isinstance(val, str) else val)
                        yield row_vals
                yield sheet_name, row_iterator()
        else:
            print("[GSTR2A DEBUG] Using openpyxl for .xlsx file")
            wb = openpyxl.load_workbook(filename=io.BytesIO(file_bytes), data_only=True)
            print(f"[GSTR2A DEBUG] openpyxl sheets: {wb.sheetnames}")
            for sheet_name in wb.sheetnames:
                ws = wb[sheet_name]
                print(f"[GSTR2A DEBUG] Sheet '{sheet_name}': {ws.max_row} rows x {ws.max_column} cols")
                def row_iterator():
                    for row in ws.iter_rows(values_only=True):
                        yield row
                yield sheet_name, row_iterator()

    for sheet_name, row_iter in sheet_iterator():
        rows = list(row_iter)
        header_last_row_idx = -1
        col_map = {}

        # Print first 10 rows for debugging
        print(f"[GSTR2A DEBUG] Sheet '{sheet_name}' first 10 rows:")
        for i, row in enumerate(rows[:10]):
            print(f"  Row {i}: {[str(c)[:40] if c is not None else None for c in row]}")

        # Find headers - scan first 20 rows because GST portal has multi-row headers
        for r_idx, row in enumerate(rows[:20]):
            if not any(row):
                continue

            row_map = {}
            for c_idx, cell_val in enumerate(row):
                mapped = _map_header(cell_val)
                if mapped:
                    row_map[c_idx] = mapped
                    print(f"[GSTR2A DEBUG]   Header mapped: col {c_idx} '{cell_val}' -> '{mapped}'")

            if len(row_map) >= 3:
                col_map = row_map
                header_last_row_idx = r_idx
                print(f"[GSTR2A DEBUG]   Found header row at index {r_idx} with {len(row_map)} mapped columns")
                break

        has_gstin = any(v == "GSTN" for v in col_map.values())
        has_inv = any(v == "Invoice Num" for v in col_map.values())
        print(f"[GSTR2A DEBUG] Sheet '{sheet_name}': col_map={col_map}, has_gstin={has_gstin}, has_inv={has_inv}, header_last_row_idx={header_last_row_idx}")

        if header_last_row_idx == -1 or not has_inv:
            print(f"[GSTR2A DEBUG] SKIPPING sheet '{sheet_name}' - no Invoice Num header found")
            continue  # Skip this sheet, couldn't find minimum required headers

        # Parse data rows
        data_row_count = 0
        for r_idx, row in enumerate(rows):
            if r_idx <= header_last_row_idx:
                continue
            if not any(row):
                continue

            row_data = {col: "" for col in COLUMNS}
            row_data["AS PER"] = "GSTN"
            for col in ["Invoice Value", "Taxable Value", "IGST", "CGST", "SGST"]:
                row_data[col] = 0.0

            for c_idx, standard_col in col_map.items():
                if c_idx >= len(row):
                    continue
                val = row[c_idx]
                if standard_col in ["Invoice Value", "Taxable Value", "IGST", "CGST", "SGST"]:
                    row_data[standard_col] = _safe_float(val)
                elif standard_col == "date":
                    row_data[standard_col] = _safe_date_str(val)
                else:
                    row_data[standard_col] = str(val).strip() if val is not None else ""

            pos_str = row_data["Pos"]
            if pos_str:
                pos_str = re.sub(r'^\d+\s*-\s*', '', pos_str).strip().upper()
                row_data["Pos"] = pos_str
                row_data["State"] = pos_str

            gstin = row_data["GSTN"]
            inv_no = row_data["Invoice Num"]
            if inv_no:
                results.append(row_data)
                data_row_count += 1

        print(f"[GSTR2A DEBUG] Sheet '{sheet_name}': extracted {data_row_count} data rows")

    print(f"[GSTR2A DEBUG] TOTAL extracted rows: {len(results)}")
    if not results:
        raise ValueError("Could not extract any data rows. Please ensure the file has the standard columns like Invoice Number, etc.")

    return results



def reconcile(software_rows: list[dict[str, Any]], gstr2a_rows: list[dict[str, Any]]) -> dict[str, Any]:
    software_map = {}
    software_inv_only_map = {}
    for r in software_rows:
        gstin = normalize_key_str(r["GSTN"])
        inv = normalize_key_str(r["Invoice Num"])
        key = gstin + "|" + inv
        software_map[key] = r
        if not gstin and inv:
            software_inv_only_map[inv] = r

    gstr2a_map = {}
    for r in gstr2a_rows:
        gstin = normalize_key_str(r["GSTN"])
        inv = normalize_key_str(r["Invoice Num"])
        key = gstin + "|" + inv
        if key in gstr2a_map:
            existing = gstr2a_map[key]
            existing["Taxable Value"] += r["Taxable Value"]
            existing["IGST"] += r["IGST"]
            existing["CGST"] += r["CGST"]
            existing["SGST"] += r["SGST"]
            existing["Invoice Value"] = max(existing["Invoice Value"], r["Invoice Value"])
        else:
            gstr2a_map[key] = r

    matched = []
    partially_matched = []
    unmatched = []

    matched_s_keys = set()
    matched_g_keys = set()
    
    # PASS 1: Exact match by GSTIN + Invoice Num
    for g_key, g_row in gstr2a_map.items():
        if g_key in software_map:
            s_row = software_map[g_key]
            matched_s_keys.add(g_key)
            matched_g_keys.add(g_key)
            
            deviations = []
            for col in ["Invoice Value", "Taxable Value", "IGST", "CGST", "SGST"]:
                if abs(s_row[col] - g_row[col]) > 1.0:
                    deviations.append(col)
            if s_row["date"] != g_row["date"]:
                deviations.append("date")
            if normalize_state(s_row["State"]) != normalize_state(g_row["State"]):
                deviations.append("State")

            if not deviations:
                matched.append(s_row)
            else:
                partially_matched.append({"software_row": s_row, "portal_row": g_row, "deviations": deviations})

    # PASS 2: Match by Invoice Num only (for software rows with no GSTIN)
    for g_key, g_row in gstr2a_map.items():
        if g_key in matched_g_keys:
            continue
            
        inv = normalize_key_str(g_row["Invoice Num"])
        if inv in software_inv_only_map:
            s_row = software_inv_only_map[inv]
            s_key = normalize_key_str(s_row["GSTN"]) + "|" + inv
            
            if s_key not in matched_s_keys:
                matched_s_keys.add(s_key)
                matched_g_keys.add(g_key)
                
                deviations = []
                # Also add GSTN to deviations since they matched without it
                deviations.append("GSTN")
                
                for col in ["Invoice Value", "Taxable Value", "IGST", "CGST", "SGST"]:
                    if abs(s_row[col] - g_row[col]) > 1.0:
                        deviations.append(col)
                if s_row["date"] != g_row["date"]:
                    deviations.append("date")
                
                # We won't strictly deviation-check State if GSTN was blank, but we can
                if normalize_state(s_row["State"]) != normalize_state(g_row["State"]):
                    deviations.append("State")

                partially_matched.append({"software_row": s_row, "portal_row": g_row, "deviations": deviations})

    # Unmatched - Not in Software
    for key, row in gstr2a_map.items():
        if key not in matched_g_keys:
            r_copy = row.copy()
            r_copy["Remark"] = "Not in Software"
            unmatched.append(r_copy)

    # Unmatched - Not at Site
    for key, row in software_map.items():
        if key not in matched_s_keys:
            r_copy = row.copy()
            r_copy["Remark"] = "Not at Site"
            unmatched.append(r_copy)

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

    # 0. Summary Sheet
    ws_summary = wb.create_sheet("Summary", 0)  # Insert at position 0
    ws_summary.append(["Reconciliation Summary"])
    ws_summary.cell(row=1, column=1).font = Font(bold=True, size=14)
    ws_summary.append([])
    ws_summary.append(["Matched", reconciliation_result["summary"]["matched"]])
    ws_summary.append(["Partially Matched", reconciliation_result["summary"]["partially_matched"]])
    ws_summary.append(["Unmatched", reconciliation_result["summary"]["unmatched"]])
    
    # 1. Matched Sheet
    ws_matched = wb.create_sheet("Matched")
    ws_matched.append(COLUMNS)
    for col_idx in range(1, len(COLUMNS) + 1):
        ws_matched.cell(row=1, column=col_idx).font = header_font
    
    sr_matched = 1
    for row_data in reconciliation_result["matched"]:
        rd = row_data.copy()
        rd["Sr"] = sr_matched
        ws_matched.append([rd[c] for c in COLUMNS])
        sr_matched += 1

    # 2. Partially Matched Sheet
    ws_partial = wb.create_sheet("Partially Matched")
    partial_headers = COLUMNS + ["Deviation"]
    ws_partial.append(partial_headers)
    for col_idx in range(1, len(partial_headers) + 1):
        ws_partial.cell(row=1, column=col_idx).font = header_font

    current_row = 2
    sr_partial = 1
    for p_match in reconciliation_result["partially_matched"]:
        s_row = p_match["software_row"].copy()
        g_row = p_match["portal_row"]
        deviations = p_match["deviations"]
        
        # We will print the software row, but highlight deviated cells in red.
        # And add a Deviation column explaining it.
        dev_texts = []
        for d in deviations:
            s_val = s_row[d]
            g_val = g_row[d]
            dev_texts.append(f"{d}: Ours {s_val} vs Portal {g_val}")
            
        s_row["Sr"] = sr_partial
        row_values = [s_row[c] for c in COLUMNS] + ["\n".join(dev_texts)]
        
        for c_idx, val in enumerate(row_values, start=1):
            cell = ws_partial.cell(row=current_row, column=c_idx, value=val)
            if c_idx <= len(COLUMNS):
                col_name = COLUMNS[c_idx - 1]
                if col_name in deviations:
                    cell.fill = red_fill
                    
        current_row += 1
        sr_partial += 1

    # 3. Unmatched Sheet
    ws_unmatched = wb.create_sheet("Unmatched")
    unmatch_headers = COLUMNS + ["Remark"]
    ws_unmatched.append(unmatch_headers)
    for col_idx in range(1, len(unmatch_headers) + 1):
        ws_unmatched.cell(row=1, column=col_idx).font = header_font

    sr_unmatched = 1
    for row_data in reconciliation_result["unmatched"]:
        rd = row_data.copy()
        rd["Sr"] = sr_unmatched
        ws_unmatched.append([rd[c] for c in COLUMNS] + [rd["Remark"]])
        sr_unmatched += 1

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
