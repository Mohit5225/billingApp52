from collections import defaultdict
from datetime import date
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query

from core.helpers import get_profile_context, resolve_target_firm_id
from core.security import get_verified_jwt
from core.supabase import supabase
from models.voucher import VoucherCategory
from models.workspace import DashboardOverview, RegisterRow, StockPositionRow

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


def _build_stock_rows(target_firm_id: str, search: Optional[str] = None) -> list[dict[str, Any]]:
    items_query = supabase.table("items").select("*").eq("firm_id", target_firm_id)
    if search:
        items_query = items_query.or_(f"name.ilike.%{search}%,alias.ilike.%{search}%")
    items = items_query.order("name").execute().data or []

    item_ids = [str(item["id"]) for item in items]
    if not items:
        return []

    inventory_lines = (
        supabase.table("voucher_inventory_lines")
        .select("voucher_id, item_id, quantity, taxable_amount")
        .in_("item_id", item_ids)
        .eq("firm_id", target_firm_id)
        .execute()
    ).data or []

    voucher_ids = list({str(line["voucher_id"]) for line in inventory_lines})
    vouchers_by_id = {
        str(row["id"]): row
        for row in (
            supabase.table("vouchers")
            .select("id, category, is_cancelled")
            .in_("id", voucher_ids or ["00000000-0000-0000-0000-000000000000"])
            .execute()
        ).data or []
    }

    uom_ids = list({str(item["uom_id"]) for item in items if item.get("uom_id")})

    uom_map = {
        str(row["id"]): row["name"]
        for row in (
            supabase.table("uom").select("id, name").in_("id", uom_ids or ["00000000-0000-0000-0000-000000000000"]).execute()
        ).data or []
    }

    movements: dict[str, dict[str, float]] = defaultdict(lambda: {
        "inward_quantity": 0.0,
        "outward_quantity": 0.0,
        "inward_value": 0.0,
        "outward_value": 0.0,
    })

    for line in inventory_lines:
        voucher = vouchers_by_id.get(str(line["voucher_id"]))
        if not voucher or voucher.get("is_cancelled"):
            continue

        sign = INVENTORY_MOVEMENT_SIGNS.get(voucher["category"])
        if sign is None:
            continue

        item_movement = movements[str(line["item_id"])]
        quantity = _as_float(line["quantity"])
        taxable_value = _as_float(line["taxable_amount"])
        if sign > 0:
            item_movement["inward_quantity"] += quantity
            item_movement["inward_value"] += taxable_value
        else:
            item_movement["outward_quantity"] += quantity
            item_movement["outward_value"] += taxable_value

    rows: list[dict[str, Any]] = []
    for item in items:
        movement = movements[str(item["id"])]
        opening_quantity = _as_float(item["opening_quantity"])
        opening_value = _as_float(item["opening_value"])
        closing_quantity = opening_quantity + movement["inward_quantity"] - movement["outward_quantity"]
        closing_value = opening_value + movement["inward_value"] - movement["outward_value"]
        rows.append({
            "item_id": item["id"],
            "item_name": item["name"],
            "alias": item.get("alias"),
            "hsn_code": item.get("hsn_code"),
            "uom_name": uom_map.get(str(item["uom_id"])),
            "opening_quantity": round(opening_quantity, 2),
            "opening_value": round(opening_value, 2),
            "inward_quantity": round(movement["inward_quantity"], 2),
            "outward_quantity": round(movement["outward_quantity"], 2),
            "closing_quantity": round(closing_quantity, 2),
            "closing_value": round(closing_value, 2),
            "default_price": round(_as_float(item["default_price"]), 2),
            "is_active": bool(item["is_active"]),
        })

    return rows


@router.get("/overview", response_model=DashboardOverview)
async def get_overview(
    firm_id: Optional[str] = None,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    profile = get_profile_context(jwt)
    target_firm_id = resolve_target_firm_id(profile, firm_id)

    vouchers = _fetch_vouchers(target_firm_id)
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

    stock_rows = _build_stock_rows(target_firm_id)
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
async def get_book(
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


@router.get("/stock-position", response_model=list[StockPositionRow])
async def get_stock_position(
    firm_id: Optional[str] = None,
    search: Optional[str] = None,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    profile = get_profile_context(jwt)
    target_firm_id = resolve_target_firm_id(profile, firm_id)
    return _build_stock_rows(target_firm_id, search=search)
