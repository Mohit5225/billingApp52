from collections import defaultdict
from datetime import date
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query, Response, Request

from core.helpers import get_profile_context, resolve_target_firm_id
from core.security import get_verified_jwt
from core.supabase import supabase
from .ledgers import _build_xlsx, _safe_filename_component
from models.voucher import VoucherCategory
from models.workspace import DashboardOverview, RegisterRow, StockSummaryRow, StockMonthlyRow, StockVoucherRow
from core.limiter import limiter
from core.rate_limits import LIMIT_EXPORTS, LIMIT_AGGREGATIONS

router = APIRouter()


INVENTORY_MOVEMENT_SIGNS: dict[str, int] = {
    VoucherCategory.PURCHASE.value: 1,
    VoucherCategory.CREDIT_NOTE.value: 1,
    VoucherCategory.SALES.value: -1,
    VoucherCategory.DEBIT_NOTE.value: -1,
}

CASH_BANK_GROUPS = {"Cash-in-Hand", "Bank Accounts", "Bank OD A/c"}


def _as_float(value: Any) -> float:
    if value is None:
        return 0.0
    return float(value)


def _fetch_vouchers(
    target_firm_id: str,
    *,
    categories: Optional[list[str]] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
) -> list[dict[str, Any]]:
    query = (
        supabase.table("vouchers")
        .select("*")
        .eq("firm_id", target_firm_id)
        .eq("is_cancelled", False)
    )

    if categories:
        query = query.in_("category", categories)
    if from_date:
        query = query.gte("voucher_date", str(from_date))
    if to_date:
        query = query.lte("voucher_date", str(to_date))

    return query.order("voucher_date", desc=True).execute().data or []


def _fetch_accounting_lines(voucher_ids: list[str]) -> dict[str, list[dict[str, Any]]]:
    if not voucher_ids:
        return {}

    rows = (
        supabase.table("voucher_accounting_lines")
        .select("*")
        .in_("voucher_id", voucher_ids)
        .order("line_number")
        .execute()
    ).data or []

    lines_by_voucher: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        lines_by_voucher[str(row["voucher_id"])].append(row)
    return lines_by_voucher


def _fetch_inventory_lines(voucher_ids: list[str]) -> dict[str, list[dict[str, Any]]]:
    if not voucher_ids:
        return {}

    rows = (
        supabase.table("voucher_inventory_lines")
        .select("*")
        .in_("voucher_id", voucher_ids)
        .order("line_number")
        .execute()
    ).data or []

    lines_by_voucher: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        lines_by_voucher[str(row["voucher_id"])].append(row)
    return lines_by_voucher


def _fetch_ledger_name_map(ledger_ids: list[str]) -> dict[str, str]:
    if not ledger_ids:
        return {}

    rows = (
        supabase.table("ledgers")
        .select("id, name")
        .in_("id", ledger_ids)
        .execute()
    ).data or []
    return {str(row["id"]): row["name"] for row in rows}


def _fetch_group_name_map() -> dict[str, str]:
    rows = (
        supabase.table("account_groups")
        .select("id, name")
        .execute()
    ).data or []
    return {str(row["id"]): row["name"] for row in rows}


def _fetch_ledgers(ledger_ids: list[str]) -> dict[str, dict[str, Any]]:
    if not ledger_ids:
        return {}
    rows = (
        supabase.table("ledgers")
        .select("id, name, party_details:ledger_party_details(gstin, gst_registration_type, address, state, pincode)")
        .in_("id", ledger_ids)
        .execute()
    ).data or []
    
    # Flatten the party_details list to a dict since it's a one-to-one relationship but PostgREST returns a list
    result = {}
    for row in rows:
        p_details = row.get("party_details")
        if isinstance(p_details, list) and len(p_details) > 0:
            row["party_details"] = p_details[0]
        elif isinstance(p_details, list):
            row["party_details"] = {}
        result[str(row["id"])] = row
        
    return result


def _fetch_cash_bank_ledger_ids(target_firm_id: str) -> set[str]:
    group_name_by_id = _fetch_group_name_map()
    ledgers = (
        supabase.table("ledgers")
        .select("id, group_id")
        .eq("firm_id", target_firm_id)
        .execute()
    ).data or []

    ids = set()
    for ledger in ledgers:
        group_name = group_name_by_id.get(str(ledger["group_id"]))
        if group_name in CASH_BANK_GROUPS:
            ids.add(str(ledger["id"]))
    return ids


def _voucher_amount(
    voucher_id: str,
    accounting_lines_by_voucher: dict[str, list[dict[str, Any]]],
    inventory_lines_by_voucher: dict[str, list[dict[str, Any]]],
) -> float:
    inventory_lines = inventory_lines_by_voucher.get(voucher_id, [])
    if inventory_lines:
        return round(sum(
            _as_float(line["taxable_amount"])
            + _as_float(line["igst_amount"])
            + _as_float(line["cgst_amount"])
            + _as_float(line["sgst_amount"])
            + _as_float(line["cess_amount"])
            for line in inventory_lines
        ), 2)

    accounting_lines = accounting_lines_by_voucher.get(voucher_id, [])
    total_debit = sum(_as_float(line["debit_amount"]) for line in accounting_lines)
    total_credit = sum(_as_float(line["credit_amount"]) for line in accounting_lines)
    return round(max(total_debit, total_credit), 2)


def _build_register_rows(
    vouchers: list[dict[str, Any]],
    accounting_lines_by_voucher: dict[str, list[dict[str, Any]]],
    inventory_lines_by_voucher: dict[str, list[dict[str, Any]]],
    ledger_name_by_id: dict[str, str],
    *,
    primary_ledger_filter: Optional[set[str]] = None,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []

    for voucher in vouchers:
        voucher_id = str(voucher["id"])
        accounting_lines = accounting_lines_by_voucher.get(voucher_id, [])
        party_id = str(voucher["party_ledger_id"]) if voucher.get("party_ledger_id") else None
        party_name = ledger_name_by_id.get(party_id) if party_id else None

        primary_line_name = None
        for line in accounting_lines:
            ledger_id = str(line["ledger_id"])
            if primary_ledger_filter and ledger_id not in primary_ledger_filter:
                continue
            if party_id and ledger_id == party_id:
                continue
            primary_line_name = ledger_name_by_id.get(ledger_id)
            if primary_line_name:
                break

        if primary_line_name is None and accounting_lines:
            primary_line_name = ledger_name_by_id.get(str(accounting_lines[0]["ledger_id"]))

        rows.append({
            "id": voucher["id"],
            "category": voucher["category"],
            "voucher_number": voucher["voucher_number"],
            "voucher_date": voucher["voucher_date"],
            "narration": voucher.get("narration"),
            "party_name": party_name,
            "primary_ledger_name": primary_line_name,
            "amount": _voucher_amount(voucher_id, accounting_lines_by_voucher, inventory_lines_by_voucher),
        })

    return rows


def _build_stock_summary_rows(
    target_firm_id: str,
    search: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    active_only_filter: bool = True,
) -> list[dict[str, Any]]:
    items_query = supabase.table("items").select("*").eq("firm_id", target_firm_id)
    if search:
        items_query = items_query.or_(f"name.ilike.%{search}%,alias.ilike.%{search}%")
    items = items_query.order("name").execute().data or []

    if not items:
        return []

    item_ids = [str(item["id"]) for item in items]
    uom_ids = list({str(item["uom_id"]) for item in items if item.get("uom_id")})
    uom_map = {
        str(row["id"]): row["name"]
        for row in (
            supabase.table("uom").select("id, name").in_("id", uom_ids or ["00000000-0000-0000-0000-000000000000"]).execute()
        ).data or []
    }

    # Fetch all vouchers to know their dates
    vouchers = (
        supabase.table("vouchers")
        .select("id, category, is_cancelled, voucher_date")
        .eq("firm_id", target_firm_id)
        .eq("is_cancelled", False)
        .execute()
    ).data or []
    vouchers_by_id = {str(v["id"]): v for v in vouchers}
    voucher_ids = list(vouchers_by_id.keys())

    inventory_lines = (
        supabase.table("voucher_inventory_lines")
        .select("voucher_id, item_id, quantity, taxable_amount")
        .in_("item_id", item_ids)
        .in_("voucher_id", voucher_ids or ["00000000-0000-0000-0000-000000000000"])
        .execute()
    ).data or []

    movements: dict[str, dict[str, float]] = defaultdict(lambda: {
        "opening_inward_qty": 0.0,
        "opening_inward_val": 0.0,
        "opening_outward_qty": 0.0,
        "opening_outward_val": 0.0,
        "period_inward_qty": 0.0,
        "period_inward_val": 0.0,
        "period_outward_qty": 0.0,
        "period_outward_val": 0.0,
    })

    for line in inventory_lines:
        voucher = vouchers_by_id.get(str(line["voucher_id"]))
        if not voucher:
            continue
        
        sign = INVENTORY_MOVEMENT_SIGNS.get(voucher["category"])
        if sign is None:
            continue

        v_date = voucher["voucher_date"]
        is_before_from = from_date is not None and v_date < str(from_date)
        is_after_to = to_date is not None and v_date > str(to_date)
        
        if is_after_to:
            continue

        item_movement = movements[str(line["item_id"])]
        quantity = _as_float(line["quantity"])
        taxable_value = _as_float(line["taxable_amount"])

        if is_before_from:
            if sign > 0:
                item_movement["opening_inward_qty"] += quantity
                item_movement["opening_inward_val"] += taxable_value
            else:
                item_movement["opening_outward_qty"] += quantity
                item_movement["opening_outward_val"] += taxable_value
        else:
            if sign > 0:
                item_movement["period_inward_qty"] += quantity
                item_movement["period_inward_val"] += taxable_value
            else:
                item_movement["period_outward_qty"] += quantity
                item_movement["period_outward_val"] += taxable_value

    rows: list[dict[str, Any]] = []
    for item in items:
        movement = movements[str(item["id"])]
        
        # Item master opening balances
        master_opening_qty = _as_float(item["opening_quantity"])
        master_opening_val = _as_float(item["opening_value"])
        
        # Calculate opening balance at from_date
        total_open_inward_qty = master_opening_qty + movement["opening_inward_qty"]
        total_open_inward_val = master_opening_val + movement["opening_inward_val"]
        
        if total_open_inward_qty > 0:
            avg_open_cost = total_open_inward_val / total_open_inward_qty
        else:
            avg_open_cost = _as_float(item.get("default_price"))
            if avg_open_cost == 0 and movement["opening_outward_qty"] > 0:
                avg_open_cost = movement["opening_outward_val"] / movement["opening_outward_qty"]
                
        opening_quantity = total_open_inward_qty - movement["opening_outward_qty"]
        opening_value = opening_quantity * avg_open_cost

        # Calculate closing balance at to_date
        total_closing_inward_qty = total_open_inward_qty + movement["period_inward_qty"]
        total_closing_inward_val = total_open_inward_val + movement["period_inward_val"]
        
        if total_closing_inward_qty > 0:
            avg_closing_cost = total_closing_inward_val / total_closing_inward_qty
        else:
            avg_closing_cost = _as_float(item.get("default_price"))
            if avg_closing_cost == 0 and (movement["opening_outward_qty"] + movement["period_outward_qty"]) > 0:
                avg_closing_cost = (movement["opening_outward_val"] + movement["period_outward_val"]) / (movement["opening_outward_qty"] + movement["period_outward_qty"])
        
        total_outward_qty = movement["opening_outward_qty"] + movement["period_outward_qty"]
        closing_quantity = total_closing_inward_qty - total_outward_qty
        closing_value = closing_quantity * avg_closing_cost
        
        has_period_movement = movement["period_inward_qty"] > 0 or movement["period_outward_qty"] > 0
        has_closing_balance = round(closing_quantity, 2) != 0 or round(closing_value, 2) != 0
        is_active = bool(item["is_active"])
        
        if active_only_filter:
            # Active items are returned if they are active, OR if they have closing balance/movement.
            if not is_active and not has_period_movement and not has_closing_balance:
                continue

        rows.append({
            "item_id": item["id"],
            "item_name": item["name"],
            "alias": item.get("alias"),
            "hsn_code": item.get("hsn_code"),
            "uom_name": uom_map.get(str(item["uom_id"])),
            "opening_quantity": round(opening_quantity, 2),
            "opening_value": round(opening_value, 2),
            "inward_quantity": round(movement["period_inward_qty"], 2),
            "outward_quantity": round(movement["period_outward_qty"], 2),
            "closing_quantity": round(closing_quantity, 2),
            "closing_value": round(closing_value, 2),
            "default_price": round(_as_float(item["default_price"]), 2),
            "is_active": is_active,
        })

    return rows


def _build_register_export_rows(book_slug: str, rows: list[dict[str, Any]]) -> list[list[Any]]:
    title_map = {
        "sales-register": "Sales Register Export",
        "purchase-register": "Purchase Register Export",
        "receipt-register": "Receipt Register Export",
        "payment-register": "Payment Register Export",
        "journal-register": "Journal Register Export",
        "contra-register": "Contra Register Export",
        "debit-note-register": "Debit Note Register Export",
        "credit-note-register": "Credit Note Register Export",
        "day-book": "Day Book Export",
        "cash-book": "Cash Book Export",
    }
    heading = title_map.get(book_slug, "Register Export")

    export_rows: list[list[Any]] = [
        [heading],
        [],
        ["Date", "Voucher No", "Category", "Party", "Primary Ledger", "Narration", "Amount"],
    ]

    for row in rows:
        export_rows.append([
            row["voucher_date"],
            row["voucher_number"],
            row["category"],
            row.get("party_name") or "",
            row.get("primary_ledger_name") or "",
            row.get("narration") or "",
            row.get("amount") or 0,
        ])

    return export_rows


def _build_tally_export_rows(
    vouchers: list[dict[str, Any]],
    accounting_lines_by_voucher: dict[str, list[dict[str, Any]]],
    inventory_lines_by_voucher: dict[str, list[dict[str, Any]]],
    ledgers_by_id: dict[str, dict[str, Any]],
) -> list[list[Any]]:
    
    export_rows: list[list[Any]] = [
        ["Vch No.", "Vch Type", "Date", "Code", "Name", "Address1", "Address2", "State", 
         "Pin Code", "Regn Type", "GST No.", "Place Of Supply/party Type", 
         "use ledger as common party/Ecommerce", "Item Name", "Godown Name", "Unit", 
         "Qty", "Rate", "Amt", "Tax Type", "TaxRate", "IGST", "CGST", "SGST", 
         "Round-Off", "Other Charges", "tax unit"]
    ]

    for voucher in vouchers:
        voucher_id = str(voucher["id"])
        acc_lines = accounting_lines_by_voucher.get(voucher_id, [])
        inv_lines = inventory_lines_by_voucher.get(voucher_id, [])
        party_id = str(voucher["party_ledger_id"]) if voucher.get("party_ledger_id") else None
        
        party_name = ledgers_by_id.get(party_id, {}).get("name", "") if party_id else ""
        
        reg_type = ""
        gst_no = ""
        address = ""
        state = ""
        pincode = ""
        if party_id and ledgers_by_id.get(party_id):
            party_details = ledgers_by_id[party_id].get("party_details") or {}
            reg_type = party_details.get("gst_registration_type") or ""
            gst_no = party_details.get("gstin") or ""
            address = party_details.get("address") or ""
            state = party_details.get("state") or ""
            pincode = party_details.get("pincode") or ""

        primary_ledger_name = ""
        other_charges = 0.0
        round_off = 0.0
        
        for line in acc_lines:
            lid = str(line["ledger_id"])
            lname = ledgers_by_id.get(lid, {}).get("name", "")
            
            if lid == party_id:
                continue
                
            # If not assigned yet, use as primary
            if not primary_ledger_name and "sales" in lname.lower():
                primary_ledger_name = lname
                continue
                
            if not primary_ledger_name and "purchase" in lname.lower():
                primary_ledger_name = lname
                continue

            if not primary_ledger_name:
                 primary_ledger_name = lname
                 continue

            amt = _as_float(line["debit_amount"]) or _as_float(line["credit_amount"])
            lname_lower = lname.lower()
            if "round" in lname_lower:
                if _as_float(line["debit_amount"]) > 0:
                    round_off -= amt
                else:
                    round_off += amt
            elif any(tax in lname_lower for tax in ["igst", "cgst", "sgst", "utgst", "cess"]):
                pass # Skip tax ledgers from being added to other charges
            else:
                other_charges += amt
        
        if not inv_lines:
            other_charges = 0.0 # Don't dump secondary journal legs into other charges
        
        net_amount = _voucher_amount(voucher_id, accounting_lines_by_voucher, inventory_lines_by_voucher)
        
        # Format dates as DD-MM-YYYY
        vdate = ""
        if voucher.get("voucher_date"):
             parts = str(voucher["voucher_date"]).split("-")
             if len(parts) == 3:
                 vdate = f"{parts[2]}-{parts[1]}-{parts[0]}"
             else:
                 vdate = voucher["voucher_date"]
                 
        if not inv_lines:
            # Output single line for accounting only voucher
            export_rows.append([
                voucher["voucher_number"],
                voucher["category"], # Vch Type
                vdate,
                "", # Code
                party_name,
                address, # Address1
                "", # Address2
                state, # State
                pincode, # Pin Code
                reg_type,
                gst_no,
                state, # Place Of Supply/party Type
                "", # use ledger as common party/Ecommerce
                "", # Item Name
                "", # Godown Name
                "", # Unit
                "", # Qty
                "", # Rate
                "", # Amt
                "", # Tax Type
                "", # TaxRate
                "", # IGST
                "", # CGST
                "", # SGST
                round(round_off, 2) or "",
                round(other_charges, 2) or "",
                "", # tax unit
            ])
            continue
            
        for i, inv in enumerate(inv_lines):
            tax_type = inv.get("taxability") or ""
            igst_amt = _as_float(inv.get("igst_amount"))
            cgst_amt = _as_float(inv.get("cgst_amount"))
            sgst_amt = _as_float(inv.get("sgst_amount"))
            
            if tax_type.lower() == "exempt":
                tax_type = ""
            elif tax_type.lower() == "taxable":
                if cgst_amt > 0 or sgst_amt > 0:
                    tax_type = "LOC"
                elif igst_amt > 0:
                    tax_type = "CEN"
            
            tax_pct = 0.0
            
            if igst_amt > 0:
                tax_pct = _as_float(inv.get("igst_rate"))
            elif cgst_amt > 0 or sgst_amt > 0:
                tax_pct = _as_float(inv.get("cgst_rate")) + _as_float(inv.get("sgst_rate"))
                
            export_rows.append([
                voucher["voucher_number"],
                voucher["category"],
                vdate,
                "",
                party_name,
                address,
                "",
                state,
                pincode,
                reg_type,
                gst_no,
                state,
                "",
                inv.get("item_name") or "",
                "",
                inv.get("uom") or "",
                inv.get("quantity") or 0,
                inv.get("unit_price") or 0,
                inv.get("taxable_amount") or 0,
                tax_type,
                tax_pct or "",
                igst_amt or "",
                cgst_amt or "",
                sgst_amt or "",
                round(round_off, 2) if i == 0 else "",
                round(other_charges, 2) if i == 0 else "",
                "", # tax unit
            ])

    return export_rows


@router.get("/overview", response_model=DashboardOverview)
@limiter.limit(LIMIT_AGGREGATIONS)
async def get_overview(
    request: Request,
    firm_id: Optional[str] = None,
    from_date: Optional[date] = Query(default=None),
    to_date: Optional[date] = Query(default=None),
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    profile = get_profile_context(jwt)
    target_firm_id = resolve_target_firm_id(profile, firm_id)

    vouchers = _fetch_vouchers(target_firm_id, from_date=from_date, to_date=to_date)
    voucher_ids = [str(voucher["id"]) for voucher in vouchers]
    accounting_lines_by_voucher = _fetch_accounting_lines(voucher_ids)
    inventory_lines_by_voucher = _fetch_inventory_lines(voucher_ids)

    ledger_ids = {str(line["ledger_id"]) for lines in accounting_lines_by_voucher.values() for line in lines}
    party_ids = {str(voucher["party_ledger_id"]) for voucher in vouchers if voucher.get("party_ledger_id")}
    ledger_name_by_id = _fetch_ledger_name_map(list(ledger_ids | party_ids))

    def metric_for(category: str) -> dict[str, Any]:
        category_vouchers = [voucher for voucher in vouchers if voucher["category"] == category]
        return {
            "count": len(category_vouchers),
            "amount": round(sum(
                _voucher_amount(str(voucher["id"]), accounting_lines_by_voucher, inventory_lines_by_voucher)
                for voucher in category_vouchers
            ), 2),
        }

    stock_rows = _build_stock_summary_rows(target_firm_id, from_date=from_date, to_date=to_date)
    recent_vouchers = [
        {
            "id": voucher["id"],
            "category": voucher["category"],
            "voucher_number": voucher["voucher_number"],
            "voucher_date": voucher["voucher_date"],
            "narration": voucher.get("narration"),
            "party_name": ledger_name_by_id.get(str(voucher["party_ledger_id"])) if voucher.get("party_ledger_id") else None,
            "amount": _voucher_amount(str(voucher["id"]), accounting_lines_by_voucher, inventory_lines_by_voucher),
        }
        for voucher in vouchers[:6]
    ]

    items = supabase.table("items").select("id").eq("firm_id", target_firm_id).execute().data or []
    uom = supabase.table("uom").select("id").eq("firm_id", target_firm_id).execute().data or []
    hsn = supabase.table("hsn_codes").select("id").eq("firm_id", target_firm_id).execute().data or []

    return {
        "total_vouchers": len(vouchers),
        "sales": metric_for(VoucherCategory.SALES.value),
        "purchases": metric_for(VoucherCategory.PURCHASE.value),
        "receipts": metric_for(VoucherCategory.RECEIPT.value),
        "payments": metric_for(VoucherCategory.PAYMENT.value),
        "inventory": {
            "items_count": len(items),
            "hsn_count": len(hsn),
            "uom_count": len(uom),
            "stock_items_count": len(stock_rows),
            "closing_quantity": round(sum(row["closing_quantity"] for row in stock_rows), 2),
            "closing_value": round(sum(row["closing_value"] for row in stock_rows), 2),
        },
        "recent_vouchers": recent_vouchers,
    }


@router.get("/books/{book_slug}", response_model=list[RegisterRow])
@limiter.limit(LIMIT_AGGREGATIONS)
async def get_book(
    request: Request,
    book_slug: str,
    firm_id: Optional[str] = None,
    from_date: Optional[date] = Query(default=None),
    to_date: Optional[date] = Query(default=None),
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    profile = get_profile_context(jwt)
    target_firm_id = resolve_target_firm_id(profile, firm_id)

    category_filters: Optional[list[str]] = None
    primary_ledger_filter: Optional[set[str]] = None

    if book_slug == "sales-register":
        category_filters = [VoucherCategory.SALES.value]
    elif book_slug == "purchase-register":
        category_filters = [VoucherCategory.PURCHASE.value]
    elif book_slug == "receipt-register":
        category_filters = [VoucherCategory.RECEIPT.value]
    elif book_slug == "payment-register":
        category_filters = [VoucherCategory.PAYMENT.value]
    elif book_slug == "journal-register":
        category_filters = [VoucherCategory.JOURNAL.value]
    elif book_slug == "contra-register":
        category_filters = [VoucherCategory.CONTRA.value]
    elif book_slug == "debit-note-register":
        category_filters = [VoucherCategory.DEBIT_NOTE.value]
    elif book_slug == "credit-note-register":
        category_filters = [VoucherCategory.CREDIT_NOTE.value]
    elif book_slug == "day-book":
        category_filters = None
    elif book_slug == "cash-book":
        category_filters = None
        primary_ledger_filter = _fetch_cash_bank_ledger_ids(target_firm_id)
    else:
        return []

    vouchers = _fetch_vouchers(
        target_firm_id,
        categories=category_filters,
        from_date=from_date,
        to_date=to_date,
    )
    voucher_ids = [str(voucher["id"]) for voucher in vouchers]
    accounting_lines_by_voucher = _fetch_accounting_lines(voucher_ids)
    inventory_lines_by_voucher = _fetch_inventory_lines(voucher_ids)

    if book_slug == "cash-book" and primary_ledger_filter is not None:
        vouchers = [
            voucher
            for voucher in vouchers
            if any(
                str(line["ledger_id"]) in primary_ledger_filter
                for line in accounting_lines_by_voucher.get(str(voucher["id"]), [])
            )
        ]

    ledger_ids = {str(line["ledger_id"]) for lines in accounting_lines_by_voucher.values() for line in lines}
    party_ids = {str(voucher["party_ledger_id"]) for voucher in vouchers if voucher.get("party_ledger_id")}
    ledger_name_by_id = _fetch_ledger_name_map(list(ledger_ids | party_ids))

    return _build_register_rows(
        vouchers,
        accounting_lines_by_voucher,
        inventory_lines_by_voucher,
        ledger_name_by_id,
        primary_ledger_filter=primary_ledger_filter,
    )


@router.get("/books/{book_slug}/export")
@limiter.limit(LIMIT_EXPORTS)
async def export_book(
    request: Request,
    book_slug: str,
    firm_id: Optional[str] = None,
    from_date: Optional[date] = Query(default=None),
    to_date: Optional[date] = Query(default=None),
    format: Optional[str] = Query(default=None),
    jwt: str = Depends(get_verified_jwt),
) -> Response:
    profile = get_profile_context(jwt)
    target_firm_id = resolve_target_firm_id(profile, firm_id)
    
    print(f"EXPORT REQUEST RECEIVED: book_slug={book_slug}, format={format}")

    if format == "tally":
        category_filters = None
        primary_ledger_filter = None
        
        if book_slug == "sales-register":
            category_filters = [VoucherCategory.SALES.value]
        elif book_slug == "purchase-register":
            category_filters = [VoucherCategory.PURCHASE.value]
        elif book_slug == "cash-book":
            primary_ledger_filter = _fetch_cash_bank_ledger_ids(target_firm_id)
            
        vouchers = _fetch_vouchers(
            target_firm_id,
            categories=category_filters,
            from_date=from_date,
            to_date=to_date,
        )
        voucher_ids = [str(voucher["id"]) for voucher in vouchers]
        accounting_lines_by_voucher = _fetch_accounting_lines(voucher_ids)
        inventory_lines_by_voucher = _fetch_inventory_lines(voucher_ids)
        
        if book_slug == "cash-book" and primary_ledger_filter is not None:
            vouchers = [
                voucher
                for voucher in vouchers
                if any(
                    str(line["ledger_id"]) in primary_ledger_filter
                    for line in accounting_lines_by_voucher.get(str(voucher["id"]), [])
                )
            ]
            
        ledger_ids = {str(line["ledger_id"]) for lines in accounting_lines_by_voucher.values() for line in lines}
        party_ids = {str(voucher["party_ledger_id"]) for voucher in vouchers if voucher.get("party_ledger_id")}
        ledgers_by_id = _fetch_ledgers(list(ledger_ids | party_ids))
        
        export_rows = _build_tally_export_rows(
            vouchers,
            accounting_lines_by_voucher,
            inventory_lines_by_voucher,
            ledgers_by_id,
        )
    else:
        rows = await get_book(book_slug, firm_id=target_firm_id, from_date=from_date, to_date=to_date, jwt=jwt)
        if not isinstance(rows, list):
            rows = []
        export_rows = _build_register_export_rows(book_slug, rows)

    sheet_name = _safe_filename_component(book_slug.replace("-", " ").title())
    xlsx_bytes = _build_xlsx(sheet_name, export_rows)
    
    filename_bits = [_safe_filename_component(book_slug), "export"]
    if format == "tally":
        filename_bits.append("tally")
    if from_date:
        filename_bits.append(from_date.isoformat())
    if to_date:
        filename_bits.append(to_date.isoformat())

    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{"_".join(filename_bits)}.xlsx"',
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


@router.get("/stock-summary", response_model=list[StockSummaryRow])
@limiter.limit(LIMIT_AGGREGATIONS)
async def get_stock_summary(
    request: Request,
    firm_id: Optional[str] = None,
    search: Optional[str] = None,
    from_date: Optional[date] = Query(default=None),
    to_date: Optional[date] = Query(default=None),
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    profile = get_profile_context(jwt)
    target_firm_id = resolve_target_firm_id(profile, firm_id)
    return _build_stock_summary_rows(target_firm_id, search=search, from_date=from_date, to_date=to_date)

@router.get("/stock-summary/{item_id}/monthly", response_model=list[StockMonthlyRow])
@limiter.limit(LIMIT_AGGREGATIONS)
async def get_stock_item_monthly_summary(
    request: Request,
    item_id: str,
    firm_id: Optional[str] = None,
    from_date: Optional[date] = Query(default=None),
    to_date: Optional[date] = Query(default=None),
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    profile = get_profile_context(jwt)
    target_firm_id = resolve_target_firm_id(profile, firm_id)
    
    item = supabase.table("items").select("*").eq("id", item_id).eq("firm_id", target_firm_id).single().execute().data
    if not item:
        return []

    vouchers = (
        supabase.table("vouchers")
        .select("id, category, is_cancelled, voucher_date")
        .eq("firm_id", target_firm_id)
        .eq("is_cancelled", False)
        .execute()
    ).data or []
    vouchers_by_id = {str(v["id"]): v for v in vouchers}
    voucher_ids = list(vouchers_by_id.keys())

    inventory_lines = (
        supabase.table("voucher_inventory_lines")
        .select("voucher_id, quantity, taxable_amount")
        .eq("item_id", item_id)
        .in_("voucher_id", voucher_ids or ["00000000-0000-0000-0000-000000000000"])
        .execute()
    ).data or []

    from collections import defaultdict
    from datetime import datetime
    import calendar
    
    monthly_data = defaultdict(lambda: {
        "inward_qty": 0.0,
        "inward_val": 0.0,
        "outward_qty": 0.0,
        "outward_val": 0.0,
    })

    opening_inward_qty = 0.0
    opening_inward_val = 0.0
    opening_outward_qty = 0.0
    opening_outward_val = 0.0

    for line in inventory_lines:
        voucher = vouchers_by_id.get(str(line["voucher_id"]))
        if not voucher: continue
        sign = INVENTORY_MOVEMENT_SIGNS.get(voucher["category"])
        if sign is None: continue

        v_date_str = voucher["voucher_date"]
        v_date_obj = datetime.strptime(v_date_str, "%Y-%m-%d").date()
        
        is_before_from = from_date is not None and v_date_obj < from_date
        is_after_to = to_date is not None and v_date_obj > to_date
        if is_after_to: continue

        quantity = _as_float(line["quantity"])
        taxable_value = _as_float(line["taxable_amount"])

        if is_before_from:
            if sign > 0:
                opening_inward_qty += quantity
                opening_inward_val += taxable_value
            else:
                opening_outward_qty += quantity
                opening_outward_val += taxable_value
        else:
            month_key = v_date_obj.strftime("%Y-%m")
            month_dict = monthly_data[month_key]
            if sign > 0:
                month_dict["inward_qty"] += quantity
                month_dict["inward_val"] += taxable_value
            else:
                month_dict["outward_qty"] += quantity
                month_dict["outward_val"] += taxable_value

    start_date = from_date
    end_date = to_date
    if not start_date or not end_date:
        if monthly_data:
            keys = sorted(monthly_data.keys())
            start_date = datetime.strptime(keys[0] + "-01", "%Y-%m-%d").date()
            end_date = datetime.strptime(keys[-1] + "-01", "%Y-%m-%d").date()
        else:
            start_date = date.today().replace(month=4, day=1)
            if start_date > date.today():
                start_date = start_date.replace(year=start_date.year - 1)
            end_date = start_date.replace(year=start_date.year + 1, month=3, day=31)

    months_list = []
    curr = start_date.replace(day=1)
    while curr <= end_date:
        months_list.append(curr.strftime("%Y-%m"))
        if curr.month == 12:
            curr = curr.replace(year=curr.year + 1, month=1)
        else:
            curr = curr.replace(month=curr.month + 1)

    master_opening_qty = _as_float(item["opening_quantity"])
    master_opening_val = _as_float(item["opening_value"])
    
    current_inward_qty = master_opening_qty + opening_inward_qty
    current_inward_val = master_opening_val + opening_inward_val
    current_outward_qty = opening_outward_qty
    current_outward_val = opening_outward_val

    results = []
    for m_key in months_list:
        year, month = map(int, m_key.split("-"))
        m_data = monthly_data.get(m_key, {"inward_qty": 0.0, "inward_val": 0.0, "outward_qty": 0.0, "outward_val": 0.0})
        
        if current_inward_qty > 0:
            avg_open_cost = current_inward_val / current_inward_qty
        else:
            avg_open_cost = _as_float(item.get("default_price"))
            if avg_open_cost == 0 and current_outward_qty > 0:
                avg_open_cost = current_outward_val / current_outward_qty
                
        open_qty = current_inward_qty - current_outward_qty
        open_val = open_qty * avg_open_cost

        current_inward_qty += m_data["inward_qty"]
        current_inward_val += m_data["inward_val"]
        current_outward_qty += m_data["outward_qty"]
        current_outward_val += m_data["outward_val"]

        if current_inward_qty > 0:
            avg_close_cost = current_inward_val / current_inward_qty
        else:
            avg_close_cost = _as_float(item.get("default_price"))
            if avg_close_cost == 0 and current_outward_qty > 0:
                avg_close_cost = current_outward_val / current_outward_qty

        close_qty = current_inward_qty - current_outward_qty
        close_val = close_qty * avg_close_cost

        results.append({
            "month": calendar.month_name[month],
            "year": year,
            "month_index": month if month >= 4 else month + 12,
            "opening_quantity": round(open_qty, 2),
            "opening_value": round(open_val, 2),
            "inward_quantity": round(m_data["inward_qty"], 2),
            "inward_value": round(m_data["inward_val"], 2),
            "outward_quantity": round(m_data["outward_qty"], 2),
            "outward_value": round(m_data["outward_val"], 2),
            "closing_quantity": round(close_qty, 2),
            "closing_value": round(close_val, 2),
        })

    return results

@router.get("/stock-summary/{item_id}/vouchers", response_model=list[StockVoucherRow])
@limiter.limit(LIMIT_AGGREGATIONS)
async def get_stock_item_vouchers(
    request: Request,
    item_id: str,
    firm_id: Optional[str] = None,
    from_date: Optional[date] = Query(default=None),
    to_date: Optional[date] = Query(default=None),
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    profile = get_profile_context(jwt)
    target_firm_id = resolve_target_firm_id(profile, firm_id)

    item = supabase.table("items").select("*").eq("id", item_id).eq("firm_id", target_firm_id).single().execute().data
    if not item:
        return []

    vouchers_query = (
        supabase.table("vouchers")
        .select("id, category, is_cancelled, voucher_date, voucher_number, party_ledger_id")
        .eq("firm_id", target_firm_id)
        .eq("is_cancelled", False)
    )
    if from_date:
        vouchers_query = vouchers_query.gte("voucher_date", str(from_date))
    if to_date:
        vouchers_query = vouchers_query.lte("voucher_date", str(to_date))

    vouchers = vouchers_query.order("voucher_date").execute().data or []
    if not vouchers:
        return []
        
    vouchers_by_id = {str(v["id"]): v for v in vouchers}
    voucher_ids = list(vouchers_by_id.keys())

    party_ledger_ids = list({str(v["party_ledger_id"]) for v in vouchers if v.get("party_ledger_id")})
    ledger_name_map = _fetch_ledger_name_map(party_ledger_ids)

    inventory_lines = (
        supabase.table("voucher_inventory_lines")
        .select("voucher_id, quantity, taxable_amount")
        .eq("item_id", item_id)
        .in_("voucher_id", voucher_ids)
        .execute()
    ).data or []

    lines_by_voucher = defaultdict(list)
    for line in inventory_lines:
        lines_by_voucher[str(line["voucher_id"])].append(line)

    opening_inward_qty = 0.0
    opening_inward_val = 0.0
    opening_outward_qty = 0.0
    opening_outward_val = 0.0
    
    if from_date:
        past_vouchers = (
            supabase.table("vouchers")
            .select("id, category")
            .eq("firm_id", target_firm_id)
            .eq("is_cancelled", False)
            .lt("voucher_date", str(from_date))
            .execute()
        ).data or []
        past_voucher_ids = [str(v["id"]) for v in past_vouchers]
        past_vouchers_by_id = {str(v["id"]): v for v in past_vouchers}
        
        if past_voucher_ids:
            past_lines = (
                supabase.table("voucher_inventory_lines")
                .select("voucher_id, quantity, taxable_amount")
                .eq("item_id", item_id)
                .in_("voucher_id", past_voucher_ids)
                .execute()
            ).data or []
            
            for line in past_lines:
                pv = past_vouchers_by_id.get(str(line["voucher_id"]))
                if not pv: continue
                sign = INVENTORY_MOVEMENT_SIGNS.get(pv["category"])
                if sign is None: continue
                
                if sign > 0:
                    opening_inward_qty += _as_float(line["quantity"])
                    opening_inward_val += _as_float(line["taxable_amount"])
                else:
                    opening_outward_qty += _as_float(line["quantity"])
                    opening_outward_val += _as_float(line["taxable_amount"])

    master_opening_qty = _as_float(item["opening_quantity"])
    master_opening_val = _as_float(item["opening_value"])
    
    current_inward_qty = master_opening_qty + opening_inward_qty
    current_inward_val = master_opening_val + opening_inward_val
    current_outward_qty = opening_outward_qty
    current_outward_val = opening_outward_val

    results = []
    
    for v in vouchers:
        v_id = str(v["id"])
        v_lines = lines_by_voucher.get(v_id)
        if not v_lines:
            continue
            
        sign = INVENTORY_MOVEMENT_SIGNS.get(v["category"])
        if sign is None:
            continue
            
        party_name = ledger_name_map.get(str(v.get("party_ledger_id"))) or "Cash"
            
        in_qty = 0.0
        in_val = 0.0
        out_qty = 0.0
        out_val = 0.0
        
        for line in v_lines:
            qty = _as_float(line["quantity"])
            val = _as_float(line["taxable_amount"])
            if sign > 0:
                in_qty += qty
                in_val += val
            else:
                out_qty += qty
                out_val += val
                
        current_inward_qty += in_qty
        current_inward_val += in_val
        current_outward_qty += out_qty
        current_outward_val += out_val
        
        if current_inward_qty > 0:
            avg_close_cost = current_inward_val / current_inward_qty
        else:
            avg_close_cost = _as_float(item.get("default_price"))
            if avg_close_cost == 0 and current_outward_qty > 0:
                avg_close_cost = current_outward_val / current_outward_qty

        close_qty = current_inward_qty - current_outward_qty
        close_val = close_qty * avg_close_cost
        
        results.append({
            "voucher_id": v_id,
            "voucher_date": v["voucher_date"],
            "particulars": party_name,
            "voucher_type": v["category"],
            "voucher_number": v["voucher_number"],
            "inward_quantity": round(in_qty, 2),
            "inward_value": round(in_val, 2),
            "outward_quantity": round(out_qty, 2),
            "outward_value": round(out_val, 2),
            "closing_quantity": round(close_qty, 2),
            "closing_value": round(close_val, 2),
        })

    return results

