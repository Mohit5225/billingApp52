from datetime import date
from decimal import Decimal, ROUND_HALF_UP
import re
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from core.helpers import get_profile_context, resolve_target_firm_id
from core.security import get_verified_jwt
from core.supabase import supabase
from models.voucher import (
    AccountingLineCreate,
    InventoryLineCreate,
    Voucher,
    VoucherCategory,
    VoucherCreate,
    VoucherDetail,
    VoucherUpdate,
)

router = APIRouter()

_NO_PARTY_CATEGORIES = {VoucherCategory.JOURNAL, VoucherCategory.CONTRA}


def _validate_accounting_lines(
    lines: list[AccountingLineCreate],
    target_firm_id: str,
) -> None:
    if not lines:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A voucher must have at least one accounting line",
        )

    ledger_ids = [str(line.ledger_id) for line in lines]
    rows = (
        supabase.table("ledgers")
        .select("id, firm_id")
        .in_("id", ledger_ids)
        .execute()
    ).data or []

    found_ids = {row["id"] for row in rows}
    for ledger_id in ledger_ids:
        if ledger_id not in found_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ledger {ledger_id} not found",
            )

    for row in rows:
        if str(row["firm_id"]) != target_firm_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Ledger {row['id']} does not belong to the target firm",
            )

    total_debit = Decimal("0.00")
    total_credit = Decimal("0.00")

    for line in lines:
        if not (
            (line.debit_amount > 0 and line.credit_amount == 0)
            or (line.credit_amount > 0 and line.debit_amount == 0)
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Line {line.line_number}: exactly one of debit_amount or "
                    "credit_amount must be > 0"
                ),
            )
        total_debit += Decimal(str(line.debit_amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        total_credit += Decimal(str(line.credit_amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    if total_debit != total_credit:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Double entry failed: Total debits ({total_debit}) must equal "
                f"total credits ({total_credit})"
            ),
        )


def _validate_party_ledger(
    category: VoucherCategory,
    party_ledger_id: Any,
    target_firm_id: str,
) -> None:
    if category in _NO_PARTY_CATEGORIES:
        return

    if not party_ledger_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"party_ledger_id is required for {category} vouchers",
        )

    party_resp = (
        supabase.table("ledgers")
        .select("firm_id")
        .eq("id", str(party_ledger_id))
        .single()
        .execute()
    )
    if not party_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Party ledger not found",
        )
    if str(party_resp.data["firm_id"]) != target_firm_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Party ledger does not belong to the target firm",
        )


def _build_inventory_line_payloads(
    lines: list[InventoryLineCreate],
    target_firm_id: str,
    voucher_id: str,
) -> list[dict[str, Any]]:
    if not lines:
        return []

    item_ids = [str(line.item_id) for line in lines]
    items_resp = (
        supabase.table("items")
        .select("id, firm_id, name, hsn_code, uom_id, taxability, is_rcm")
        .in_("id", item_ids)
        .execute()
    ).data or []

    item_map = {row["id"]: row for row in items_resp}

    uom_ids = list({row["uom_id"] for row in items_resp if row.get("uom_id")})
    uom_map: dict[str, str] = {}

    if uom_ids:
        uom_rows = (
            supabase.table("uom")
            .select("id, name")
            .in_("id", uom_ids)
            .execute()
        ).data or []
        uom_map = {row["id"]: row["name"] for row in uom_rows}

    payloads: list[dict[str, Any]] = []
    for line in lines:
        item_id = str(line.item_id)
        item = item_map.get(item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item {item_id} not found",
            )

        if str(item["firm_id"]) != target_firm_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Item {item_id} does not belong to the target firm",
            )

        expected_taxable = max(
            Decimal("0.00"),
            (
                Decimal(str(line.quantity)) * Decimal(str(line.unit_price))
                - Decimal(str(line.discount_amount))
            )
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        actual_taxable = Decimal(str(line.taxable_amount)).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )

        if expected_taxable != actual_taxable:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Line {line.line_number}: taxable_amount mismatch. "
                    f"Expected {expected_taxable}, got {actual_taxable}"
                ),
            )

        hsn_code = item.get("hsn_code") or ""
        uom_name = uom_map.get(str(item["uom_id"])) or ""

        payloads.append({
            "voucher_id": voucher_id,
            "firm_id": target_firm_id,
            "item_id": item_id,
            "line_number": line.line_number,
            "item_name": item["name"],
            "hsn_code": hsn_code,
            "uom": uom_name,
            "taxability": item["taxability"],
            "is_rcm": item["is_rcm"],
            "quantity": float(line.quantity),
            "unit_price": float(line.unit_price),
            "discount_amount": float(line.discount_amount),
            "taxable_amount": float(actual_taxable),
            "igst_rate": line.igst_rate,
            "cgst_rate": line.cgst_rate,
            "sgst_rate": line.sgst_rate,
            "cess_percent": line.cess_percent,
            "cess_amount_per_unit": line.cess_amount_per_unit,
            "igst_amount": line.igst_amount,
            "cgst_amount": line.cgst_amount,
            "sgst_amount": line.sgst_amount,
            "cess_amount": line.cess_amount,
        })

    return payloads


def _build_header_payload(voucher_in: VoucherCreate, target_firm_id: str) -> dict[str, Any]:
    payload = voucher_in.model_dump(mode="json", exclude={"accounting_lines", "inventory_lines"})
    payload["firm_id"] = target_firm_id
    payload["voucher_date"] = str(voucher_in.voucher_date)
    if voucher_in.party_ledger_id:
        payload["party_ledger_id"] = str(voucher_in.party_ledger_id)
    return payload


def _build_accounting_line_payloads(
    voucher_in: VoucherCreate,
    target_firm_id: str,
    voucher_id: str,
) -> list[dict[str, Any]]:
    return [
        {
            "voucher_id": voucher_id,
            "firm_id": target_firm_id,
            "ledger_id": str(line.ledger_id),
            "line_number": line.line_number,
            "debit_amount": line.debit_amount,
            "credit_amount": line.credit_amount,
        }
        for line in voucher_in.accounting_lines
    ]


def _replace_voucher_lines(
    voucher_id: str,
    voucher_in: VoucherCreate,
    target_firm_id: str,
) -> None:
    supabase.table("voucher_accounting_lines").delete().eq("voucher_id", voucher_id).execute()
    supabase.table("voucher_inventory_lines").delete().eq("voucher_id", voucher_id).execute()

    acc_payloads = _build_accounting_line_payloads(voucher_in, target_firm_id, voucher_id)
    if acc_payloads:
        supabase.table("voucher_accounting_lines").insert(acc_payloads).execute()

    if voucher_in.inventory_lines:
        inv_payloads = _build_inventory_line_payloads(
            voucher_in.inventory_lines,
            target_firm_id,
            voucher_id,
        )
        supabase.table("voucher_inventory_lines").insert(inv_payloads).execute()


def _fetch_voucher_detail(voucher_id: str) -> dict[str, Any]:
    voucher_resp = (
        supabase.table("vouchers")
        .select("*")
        .eq("id", voucher_id)
        .single()
        .execute()
    )
    acc_lines_resp = (
        supabase.table("voucher_accounting_lines")
        .select("*")
        .eq("voucher_id", voucher_id)
        .order("line_number")
        .execute()
    )
    inv_lines_resp = (
        supabase.table("voucher_inventory_lines")
        .select("*")
        .eq("voucher_id", voucher_id)
        .order("line_number")
        .execute()
    )

    result = voucher_resp.data
    result["accounting_lines"] = acc_lines_resp.data or []
    result["inventory_lines"] = inv_lines_resp.data or []
    return result


@router.get("/", response_model=list[Voucher])
async def list_vouchers(
    firm_id: Optional[str] = None,
    category: Optional[str] = None,
    from_date: Optional[date] = Query(default=None),
    to_date: Optional[date] = Query(default=None),
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    profile = get_profile_context(jwt)
    target_firm_id = resolve_target_firm_id(profile, firm_id)

    query = (
        supabase.table("vouchers")
        .select("*")
        .eq("firm_id", target_firm_id)
        .eq("is_cancelled", False)
    )

    if category:
        query = query.eq("category", category)
    if from_date:
        query = query.gte("voucher_date", str(from_date))
    if to_date:
        query = query.lte("voucher_date", str(to_date))

    return query.order("voucher_date", desc=True).execute().data or []


@router.post("/", response_model=VoucherDetail, status_code=status.HTTP_201_CREATED)
async def create_voucher(
    voucher_in: VoucherCreate,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    profile = get_profile_context(jwt)
    target_firm_id = resolve_target_firm_id(profile, str(voucher_in.firm_id))

    _validate_party_ledger(voucher_in.category, voucher_in.party_ledger_id, target_firm_id)
    _validate_accounting_lines(voucher_in.accounting_lines, target_firm_id)

    header_resp = supabase.table("vouchers").insert(
        _build_header_payload(voucher_in, target_firm_id)
    ).execute()
    if not header_resp.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create voucher. Voucher number may already exist.",
        )

    voucher_id = header_resp.data[0]["id"]
    try:
        _replace_voucher_lines(voucher_id, voucher_in, target_firm_id)
    except HTTPException:
        supabase.table("vouchers").delete().eq("id", voucher_id).execute()
        raise
    except Exception as exc:
        supabase.table("vouchers").delete().eq("id", voucher_id).execute()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Voucher creation failed: {exc}",
        ) from exc

    return _fetch_voucher_detail(voucher_id)


@router.get("/next-number")
async def get_next_number(
    firm_id: str,
    category: VoucherCategory,
    jwt: str = Depends(get_verified_jwt),
) -> dict[str, str]:
    profile = get_profile_context(jwt)
    target_firm_id = resolve_target_firm_id(profile, firm_id)

    # 1. Fetch the prefix setting from the firm
    firm_resp = supabase.table("firms").select("*").eq("id", target_firm_id).maybe_single().execute()
    if not firm_resp or not firm_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Firm not found")
    firm = firm_resp.data

    prefix = ""
    if category == VoucherCategory.SALES:
        prefix = firm.get("sales_prefix") or ""
    elif category == VoucherCategory.PURCHASE:
        prefix = firm.get("purchase_prefix") or ""
    elif category == VoucherCategory.PAYMENT:
        prefix = firm.get("payment_prefix") or ""
    elif category == VoucherCategory.RECEIPT:
        prefix = firm.get("receipt_prefix") or ""

    # 2. Query existing vouchers for this firm and category
    vouchers_resp = (
        supabase.table("vouchers")
        .select("voucher_number")
        .eq("firm_id", target_firm_id)
        .eq("category", category.value)
        .execute()
    )
    existing_numbers = [v["voucher_number"] for v in vouchers_resp.data or []]

    # 3. Parse the prefix — the user may include a starting number at the end
    #    e.g. "SALE/26-27/1" → base_prefix="SALE/26-27/", start_val=1, padding=1
    #    e.g. "INV-"         → base_prefix="INV-",          start_val=1, padding=1
    match = re.search(r"(\d+)$", prefix)
    if match:
        base_prefix = prefix[:match.start()]
        start_num_str = match.group(1)
        start_val = int(start_num_str)
        padding = len(start_num_str)
    else:
        base_prefix = prefix
        start_val = 1
        padding = 1

    # 4. If NO prefix is configured at all, just increment from the highest
    #    purely-numeric voucher number (ignore non-numeric ones).
    if not prefix:
        max_bare = 0
        for num in existing_numbers:
            if num.isdigit():
                max_bare = max(max_bare, int(num))
        return {"next_number": str(max_bare + 1)}

    # 5. A prefix IS configured — only consider vouchers that already use it.
    #    This prevents old bare-number vouchers from polluting the counter.
    matching_numbers = [num for num in existing_numbers if num.startswith(base_prefix)]

    if not matching_numbers:
        # No vouchers with this prefix yet — return the configured starting point.
        return {"next_number": prefix if match else f"{base_prefix}1"}

    max_val = start_val - 1
    best_padding = padding

    for num in matching_numbers:
        suffix = num[len(base_prefix):]
        m = re.match(r"^(\d+)", suffix)
        if m:
            val_str = m.group(1)
            val = int(val_str)
            if val > max_val:
                max_val = val
                best_padding = len(val_str)

    next_val = max_val + 1
    next_val_str = str(next_val).zfill(best_padding)
    return {"next_number": f"{base_prefix}{next_val_str}"}


@router.get("/{voucher_id}", response_model=VoucherDetail)
async def get_voucher(
    voucher_id: str,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    profile = get_profile_context(jwt)
    voucher_resp = (
        supabase.table("vouchers")
        .select("*")
        .eq("id", voucher_id)
        .single()
        .execute()
    )
    if not voucher_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voucher not found")

    resolve_target_firm_id(profile, str(voucher_resp.data["firm_id"]))
    return _fetch_voucher_detail(voucher_id)


@router.put("/{voucher_id}", response_model=VoucherDetail)
async def replace_voucher(
    voucher_id: str,
    voucher_in: VoucherCreate,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    profile = get_profile_context(jwt)
    existing_resp = (
        supabase.table("vouchers")
        .select("*")
        .eq("id", voucher_id)
        .single()
        .execute()
    )
    existing = existing_resp.data
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voucher not found")
    if existing["is_cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot edit a cancelled voucher",
        )

    target_firm_id = resolve_target_firm_id(profile, str(existing["firm_id"]))
    if str(voucher_in.firm_id) != target_firm_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="firm_id cannot be changed during edit",
        )

    _validate_party_ledger(voucher_in.category, voucher_in.party_ledger_id, target_firm_id)
    _validate_accounting_lines(voucher_in.accounting_lines, target_firm_id)

    previous_accounting = (
        supabase.table("voucher_accounting_lines")
        .select("*")
        .eq("voucher_id", voucher_id)
        .order("line_number")
        .execute()
    ).data or []
    previous_inventory = (
        supabase.table("voucher_inventory_lines")
        .select("*")
        .eq("voucher_id", voucher_id)
        .order("line_number")
        .execute()
    ).data or []
    previous_header = {
        "party_ledger_id": existing.get("party_ledger_id"),
        "category": existing["category"],
        "voucher_number": existing["voucher_number"],
        "voucher_date": existing["voucher_date"],
        "narration": existing.get("narration"),
    }

    try:
        supabase.table("vouchers").update(
            _build_header_payload(voucher_in, target_firm_id)
        ).eq("id", voucher_id).execute()
        _replace_voucher_lines(voucher_id, voucher_in, target_firm_id)
    except HTTPException:
        supabase.table("vouchers").update(previous_header).eq("id", voucher_id).execute()
        # No need to restore lines since _replace_voucher_lines deletes them AFTER validation now
        raise
    except Exception as exc:
        supabase.table("vouchers").update(previous_header).eq("id", voucher_id).execute()
        # If a DB error happened during insert, some lines might be deleted, so we should restore
        supabase.table("voucher_accounting_lines").delete().eq("voucher_id", voucher_id).execute()
        supabase.table("voucher_inventory_lines").delete().eq("voucher_id", voucher_id).execute()
        if previous_accounting:
            supabase.table("voucher_accounting_lines").insert(previous_accounting).execute()
        if previous_inventory:
            supabase.table("voucher_inventory_lines").insert(previous_inventory).execute()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Voucher replacement failed: {exc}",
        ) from exc

    return _fetch_voucher_detail(voucher_id)


def _replace_voucher_lines(
    voucher_id: str,
    voucher_in: VoucherCreate,
    target_firm_id: str,
) -> None:
    # Build payloads first to trigger any validation errors BEFORE deleting existing lines
    acc_payloads = _build_accounting_line_payloads(voucher_in, target_firm_id, voucher_id)
    
    inv_payloads = []
    if voucher_in.inventory_lines:
        inv_payloads = _build_inventory_line_payloads(
            voucher_in.inventory_lines,
            target_firm_id,
            voucher_id,
        )

    supabase.table("voucher_accounting_lines").delete().eq("voucher_id", voucher_id).execute()
    supabase.table("voucher_inventory_lines").delete().eq("voucher_id", voucher_id).execute()

    if acc_payloads:
        supabase.table("voucher_accounting_lines").insert(acc_payloads).execute()

    if inv_payloads:
        supabase.table("voucher_inventory_lines").insert(inv_payloads).execute()


@router.patch("/{voucher_id}", response_model=Voucher)
async def update_voucher(
    voucher_id: str,
    voucher_in: VoucherUpdate,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    profile = get_profile_context(jwt)

    existing = (
        supabase.table("vouchers")
        .select("firm_id, is_cancelled")
        .eq("id", voucher_id)
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voucher not found")
    if existing.data["is_cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot edit a cancelled voucher",
        )

    resolve_target_firm_id(profile, str(existing.data["firm_id"]))

    payload = voucher_in.model_dump(mode="json", exclude_none=True)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided to update",
        )
    if "voucher_date" in payload:
        payload["voucher_date"] = str(payload["voucher_date"])

    response = supabase.table("vouchers").update(payload).eq("id", voucher_id).execute()
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update voucher",
        )
    return response.data[0]


@router.delete("/{voucher_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_voucher(
    voucher_id: str,
    jwt: str = Depends(get_verified_jwt),
) -> None:
    profile = get_profile_context(jwt)

    existing = (
        supabase.table("vouchers")
        .select("firm_id, is_cancelled")
        .eq("id", voucher_id)
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voucher not found")
    if existing.data["is_cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Voucher is already cancelled",
        )

    resolve_target_firm_id(profile, str(existing.data["firm_id"]))
    supabase.table("vouchers").update({"is_cancelled": True}).eq("id", voucher_id).execute()

