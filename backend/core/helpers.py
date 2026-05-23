from typing import Any, Optional

from fastapi import HTTPException, status

from core.supabase import supabase


def get_profile_context(jwt: str) -> dict[str, Any]:
    """Validate the JWT and return the user's profile (firm_id, role)."""
    user_resp = supabase.auth.get_user(jwt)
    user = user_resp.user
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not identify user from token",
        )

    profile_resp = (
        supabase.table("profiles")
        .select("firm_id, role")
        .eq("id", user.id)
        .single()
        .execute()
    )

    profile = profile_resp.data
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    return profile


def resolve_target_firm_id(
    profile: dict[str, Any],
    requested_firm_id: Optional[str],
) -> str:
    """
    Determine the effective firm_id for the request.

    - If no firm_id is requested, default to the caller's own firm.
    - If a different firm_id is requested, the caller must be ca_admin or
      ca_employee AND that firm must be a direct child of their firm.
    """
    active_firm_id = requested_firm_id or str(profile["firm_id"])

    # Caller is operating on their own firm — always allowed
    if active_firm_id == str(profile["firm_id"]):
        return active_firm_id

    # Caller wants to act on a client firm — must be CA staff
    if profile["role"] not in ("ca_admin", "ca_employee"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this firm",
        )

    firm_resp = (
        supabase.table("firms")
        .select("id, parent_firm_id")
        .eq("id", active_firm_id)
        .single()
        .execute()
    )

    firm = firm_resp.data
    if not firm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requested firm not found",
        )

    if str(firm.get("parent_firm_id")) != str(profile["firm_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this firm",
        )

    return active_firm_id
