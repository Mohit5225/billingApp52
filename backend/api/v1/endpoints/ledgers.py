from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from core.helpers import get_profile_context, resolve_target_firm_id
from core.security import get_verified_jwt
from core.supabase import supabase
from models.ledger import (
    AccountGroup,
    Ledger,
    LedgerCreate,
    LedgerDetail,
    LedgerUpdate,
)

router = APIRouter()


GROUP_TEMPLATE_MAP: dict[str, str] = {
    "Bank Accounts": "bank",
    "Bank OD A/c": "bank",
    "Sundry Debtors": "party",
    "Sundry Creditors": "party",
    "Duties & Taxes": "tax",
    "Loans & Advances (Asset)": "party",
    "Loans (Liability)": "party",
    "Secured Loans": "party",
    "Unsecured Loans": "party",
}


def _get_groups_by_id() -> dict[str, dict[str, Any]]:
    groups = (
        supabase.table("account_groups")
        .select("id, firm_id, name, parent_id, nature, affects_gross_profit, is_control_account, is_system, sort_order, alias, is_primary, created_at, updated_at")
        .execute()
    ).data or []
    return {str(group["id"]): group for group in groups}


def _resolve_template_type(group: Optional[dict[str, Any]], groups_by_id: dict[str, dict[str, Any]]) -> str:
    if not group:
        return "default"

    direct_template = GROUP_TEMPLATE_MAP.get(group["name"])
    if direct_template:
        return direct_template

    parent_id = group.get("parent_id")
    parent_group = groups_by_id.get(str(parent_id)) if parent_id else None
    if parent_group:
        return GROUP_TEMPLATE_MAP.get(parent_group["name"], "default")

    return "default"


def _build_ledger_detail_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not rows:
        return []

    groups_by_id = _get_groups_by_id()
    ledger_ids = [str(row["id"]) for row in rows]

    bank_rows = (
        supabase.table("ledger_bank_details")
        .select("*")
        .in_("ledger_id", ledger_ids)
        .execute()
    ).data or []
    party_rows = (
        supabase.table("ledger_party_details")
        .select("*")
        .in_("ledger_id", ledger_ids)
        .execute()
    ).data or []
    tax_rows = (
        supabase.table("ledger_tax_details")
        .select("*")
        .in_("ledger_id", ledger_ids)
        .execute()
    ).data or []

    bank_by_ledger = {str(row["ledger_id"]): row for row in bank_rows}
    party_by_ledger = {str(row["ledger_id"]): row for row in party_rows}
    tax_by_ledger = {str(row["ledger_id"]): row for row in tax_rows}

    details: list[dict[str, Any]] = []
    for row in rows:
        group = groups_by_id.get(str(row["group_id"]))
        parent_group = groups_by_id.get(str(group.get("parent_id"))) if group and group.get("parent_id") else None
        ledger_id = str(row["id"])
        details.append({
            **row,
            "group_name": group["name"] if group else None,
            "group_parent_name": parent_group["name"] if parent_group else None,
            "group_nature": group["nature"] if group else None,
            "template_type": _resolve_template_type(group, groups_by_id),
            "bank_details": bank_by_ledger.get(ledger_id),
            "party_details": party_by_ledger.get(ledger_id),
            "tax_details": tax_by_ledger.get(ledger_id),
        })

    return details


def _get_ledger_or_404(ledger_id: str) -> dict[str, Any]:
    response = (
        supabase.table("ledgers")
        .select("*")
        .eq("id", ledger_id)
        .single()
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ledger not found")
    return response.data


def _validate_group_access(group_id: str, target_firm_id: str) -> None:
    group = (
        supabase.table("account_groups")
        .select("id, firm_id")
        .eq("id", group_id)
        .single()
        .execute()
    ).data
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected account group was not found")

    group_firm_id = group.get("firm_id")
    if group_firm_id is not None and str(group_firm_id) != target_firm_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Selected account group is not available for this firm",
        )


def _replace_detail_row(table_name: str, ledger_id: str, detail_model: Any) -> None:
    supabase.table(table_name).delete().eq("ledger_id", ledger_id).execute()

    if detail_model is None:
        return

    payload = detail_model.model_dump(exclude_none=True)
    if not payload:
        return

    payload["ledger_id"] = ledger_id
    supabase.table(table_name).insert(payload).execute()


@router.get("/account-groups", response_model=list[AccountGroup])
async def list_account_groups(
    firm_id: Optional[str] = None,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    profile = get_profile_context(jwt)
    target_firm_id = resolve_target_firm_id(profile, firm_id)

    response = (
        supabase.table("account_groups")
        .select("id, firm_id, name, alias, nature, is_primary, parent_id, affects_gross_profit, is_control_account, is_system, sort_order, created_at, updated_at")
        .execute()
    )

    all_groups = response.data or []
    group_name_by_id = {
        str(group["id"]): group["name"]
        for group in all_groups
        if group.get("id") is not None and group.get("name") is not None
    }

    groups = [
        group
        for group in all_groups
        if group.get("firm_id") is None or str(group.get("firm_id")) == target_firm_id
    ]

    for group in groups:
        parent_id = group.get("parent_id")
        group["parent_name"] = group_name_by_id.get(str(parent_id)) if parent_id is not None else None

    groups.sort(key=lambda group: (
        group.get("nature") or "",
        group.get("sort_order") or 999,
        (group.get("name") or "").lower(),
    ))
    return groups


@router.get("/", response_model=list[LedgerDetail])
async def list_ledgers(
    firm_id: Optional[str] = None,
    search: Optional[str] = None,
    group_id: Optional[str] = None,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    profile = get_profile_context(jwt)
    target_firm_id = resolve_target_firm_id(profile, firm_id)

    query = supabase.table("ledgers").select("*").eq("firm_id", target_firm_id)
    if group_id:
        query = query.eq("group_id", group_id)
    if search:
        query = query.or_(f"name.ilike.%{search}%,alias.ilike.%{search}%")

    response = query.order("name").execute()
    return _build_ledger_detail_rows(response.data or [])


@router.get("/{ledger_id}", response_model=LedgerDetail)
async def get_ledger(
    ledger_id: str,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    profile = get_profile_context(jwt)
    ledger = _get_ledger_or_404(ledger_id)
    resolve_target_firm_id(profile, str(ledger["firm_id"]))
    return _build_ledger_detail_rows([ledger])[0]


@router.post("/", response_model=LedgerDetail, status_code=status.HTTP_201_CREATED)
async def create_ledger(ledger_in: LedgerCreate, jwt: str = Depends(get_verified_jwt)) -> Any:
    profile = get_profile_context(jwt)
    target_firm_id = resolve_target_firm_id(profile, str(ledger_in.firm_id))

    _validate_group_access(str(ledger_in.group_id), target_firm_id)

    payload = ledger_in.model_dump(
        exclude_none=True,
        exclude={"bank_details", "party_details", "tax_details"},
    )
    payload["firm_id"] = target_firm_id

    response = supabase.table("ledgers").insert(payload).execute()
    if not response.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create ledger")

    ledger_id = response.data[0]["id"]
    _replace_detail_row("ledger_bank_details", ledger_id, ledger_in.bank_details)
    _replace_detail_row("ledger_party_details", ledger_id, ledger_in.party_details)
    _replace_detail_row("ledger_tax_details", ledger_id, ledger_in.tax_details)

    return _build_ledger_detail_rows([_get_ledger_or_404(ledger_id)])[0]


@router.patch("/{ledger_id}", response_model=LedgerDetail)
async def update_ledger(
    ledger_id: str,
    ledger_in: LedgerUpdate,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    profile = get_profile_context(jwt)
    existing = _get_ledger_or_404(ledger_id)
    target_firm_id = resolve_target_firm_id(profile, str(existing["firm_id"]))

    if ledger_in.group_id:
        _validate_group_access(str(ledger_in.group_id), target_firm_id)

    payload = ledger_in.model_dump(
        exclude_none=True,
        exclude={"bank_details", "party_details", "tax_details"},
    )
    if payload:
        response = supabase.table("ledgers").update(payload).eq("id", ledger_id).execute()
        if not response.data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update ledger")

    if "bank_details" in ledger_in.model_fields_set:
        _replace_detail_row("ledger_bank_details", ledger_id, ledger_in.bank_details)
    if "party_details" in ledger_in.model_fields_set:
        _replace_detail_row("ledger_party_details", ledger_id, ledger_in.party_details)
    if "tax_details" in ledger_in.model_fields_set:
        _replace_detail_row("ledger_tax_details", ledger_id, ledger_in.tax_details)

    return _build_ledger_detail_rows([_get_ledger_or_404(ledger_id)])[0]


@router.delete("/{ledger_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ledger(
    ledger_id: str,
    jwt: str = Depends(get_verified_jwt),
) -> None:
    profile = get_profile_context(jwt)
    existing = _get_ledger_or_404(ledger_id)
    resolve_target_firm_id(profile, str(existing["firm_id"]))

    supabase.table("ledgers").delete().eq("id", ledger_id).execute()
