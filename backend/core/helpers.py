import base64
import json
from typing import Any, Optional

from fastapi import HTTPException, status
from supabase import AsyncClient

from core.supabase import get_supabase


def _extract_user_id_from_jwt(jwt: str) -> str:
    """Extract the user sub (ID) from a JWT without a network call.
    The token is already verified by get_verified_jwt before this runs."""
    try:
        payload_segment = jwt.split(".")[1]
        # Add padding if necessary
        padding = 4 - len(payload_segment) % 4
        if padding != 4:
            payload_segment += "=" * padding
        payload = json.loads(base64.urlsafe_b64decode(payload_segment))
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("No sub claim in JWT")
        return user_id
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not extract user ID from token: {e}",
        )


async def get_profile_context(jwt: str) -> dict[str, Any]:
    """Return the user's profile (id, firm_id, role).

    The JWT is already verified by the get_verified_jwt dependency.
    We extract the user ID directly from the token claims (no extra
    network call to the Auth server) and then query the profiles table.
    """
    supabase: AsyncClient = await get_supabase()

    # Fast local decode — no network round-trip needed here.
    # get_verified_jwt already validated the signature via get_claims().
    user_id = _extract_user_id_from_jwt(jwt)

    profile_resp = (
        await supabase.table("profiles")
        .select("id, firm_id, role, is_paused")
        .eq("id", user_id)
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


async def resolve_target_firm_id(
    profile: dict[str, Any],
    requested_firm_id: Optional[str],
) -> str:
    """
    Determine the effective firm_id for the request.

    - CA admin/employee: allowed to operate on their own firm, or any
      client firm. (God mode).
    - Merchant: must have an explicit row in user_firm_access for the requested firm.
    """
    supabase: AsyncClient = await get_supabase()
    active_firm_id = requested_firm_id or str(profile["firm_id"])

    # ── CA path (God Mode) ──────────────────────────────────────────────────
    if profile["role"] in ("ca_admin", "ca_employee"):
        if active_firm_id == str(profile["firm_id"]):
            return active_firm_id
        # Verify the requested firm actually exists
        firm_resp = (
            await supabase.table("firms")
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
        await supabase.table("user_firm_access")
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
