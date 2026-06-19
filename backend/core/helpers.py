from typing import Any, Optional

from fastapi import HTTPException, status

from core.supabase import supabase


def get_profile_context(jwt: str) -> dict[str, Any]:
    """Validate the JWT and return the user's profile (id, firm_id, role)."""
    user_resp = supabase.auth.get_user(jwt)
    user = user_resp.user
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not identify user from token",
        )

    profile_resp = (
        supabase.table("profiles")
        .select("id, firm_id, role, is_paused")
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

    if profile.get("is_paused"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your access has been paused.",
        )

    return profile


def resolve_target_firm_id(
    profile: dict[str, Any],
    requested_firm_id: Optional[str],
) -> str:
    """
    Determine the effective firm_id for the request.
    
    - CA admin/employee: allowed to operate on their own firm, or any
      client firm. (God mode).
    - Merchant: must have an explicit row in user_firm_access for the requested firm.
    """
    active_firm_id = requested_firm_id or str(profile["firm_id"])

    # ── CA path (God Mode) ──────────────────────────────────────────────────
    if profile["role"] in ("ca_admin", "ca_employee"):
        if active_firm_id == str(profile["firm_id"]):
            return active_firm_id
        # Verify the requested firm actually exists
        firm_resp = (
            supabase.table("firms")
            .select("id")
            .eq("id", active_firm_id)
            .maybe_single()
            .execute()
        )
        if not firm_resp or not firm_resp.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Requested firm not found",
            )
        return active_firm_id

    # ── Merchant path (explicit access check via junction table) ────────────
    access = (
        supabase.table("user_firm_access")
        .select("id")
        .eq("user_id", str(profile["id"]))
        .eq("firm_id", active_firm_id)
        .maybe_single()
        .execute()
    )
    
    if not access or not access.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this firm",
        )
    
    return active_firm_id
