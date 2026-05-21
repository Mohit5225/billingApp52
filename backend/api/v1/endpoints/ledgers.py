from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from core.security import get_verified_jwt
from core.supabase import supabase
from models.ledger import AccountGroup, Ledger, LedgerCreate

router = APIRouter()


def _get_profile_context(jwt: str) -> dict[str, Any]:
    user_resp = supabase.auth.get_user(jwt)
    user = user_resp.user
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not identify user from token")

    profile_resp = (
        supabase.table("profiles")
        .select("firm_id, role")
        .eq("id", user.id)
        .single()
        .execute()
    )

    profile = profile_resp.data
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    return profile


def _resolve_target_firm_id(profile: dict[str, Any], requested_firm_id: Optional[str]) -> str:
    active_firm_id = requested_firm_id or str(profile["firm_id"])

    if active_firm_id == str(profile["firm_id"]):
        return active_firm_id

    if profile["role"] not in ("ca_admin", "ca_employee"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this firm")

    firm_resp = (
        supabase.table("firms")
        .select("id, parent_firm_id")
        .eq("id", active_firm_id)
        .single()
        .execute()
    )

    firm = firm_resp.data
    if not firm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requested firm not found")

    if str(firm.get("parent_firm_id")) != str(profile["firm_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this firm")

    return active_firm_id


def _insert_detail_row(table_name: str, ledger_id: str, detail_model: Any) -> None:
    if detail_model is None:
        return

    detail_payload = detail_model.model_dump(exclude_none=True)
    detail_payload["ledger_id"] = ledger_id
    supabase.table(table_name).insert(detail_payload).execute()


@router.get("/account-groups", response_model=list[AccountGroup])
async def list_account_groups(
    firm_id: Optional[str] = None,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    profile = _get_profile_context(jwt)
    target_firm_id = _resolve_target_firm_id(profile, firm_id)

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


@router.post("/", response_model=Ledger)
async def create_ledger(ledger_in: LedgerCreate, jwt: str = Depends(get_verified_jwt)) -> Any:
    profile = _get_profile_context(jwt)

    if profile["role"] != "ca_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only CA admins can create ledgers")

    target_firm_id = _resolve_target_firm_id(profile, str(ledger_in.firm_id))

    group_resp = (
        supabase.table("account_groups")
        .select("id, firm_id, is_primary, is_system")
        .eq("id", str(ledger_in.group_id))
        .single()
        .execute()
    )

    group = group_resp.data
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected account group was not found")

    group_firm_id = group.get("firm_id")

    if group_firm_id is not None and str(group_firm_id) != target_firm_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Selected account group is not available for this firm")

    payload = ledger_in.model_dump(exclude_none=True, exclude={"bank_details", "party_details", "tax_details"})
    payload["firm_id"] = target_firm_id

    response = supabase.table("ledgers").insert(payload).execute()
    if not response.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create ledger")

    ledger_id = response.data[0]["id"]
    _insert_detail_row("ledger_bank_details", ledger_id, ledger_in.bank_details)
    _insert_detail_row("ledger_party_details", ledger_id, ledger_in.party_details)
    _insert_detail_row("ledger_tax_details", ledger_id, ledger_in.tax_details)

    return response.data[0]