from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from core.helpers import get_profile_context, resolve_target_firm_id
from core.security import get_verified_jwt
from core.supabase import supabase
from models.hsn import Hsn, HsnCreate, HsnUpdate

router = APIRouter()


@router.get("/", response_model=list[Hsn])
async def list_hsn_codes(
    firm_id: Optional[str] = None,
    search: Optional[str] = None,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    """
    List HSN/SAC codes for a firm.
    Use ?search= for typeahead — matches against hsn_code or description.
    """
    profile = get_profile_context(jwt)
    target_firm_id = resolve_target_firm_id(profile, firm_id)

    query = (
        supabase.table("hsn_codes")
        .select("*")
        .eq("firm_id", target_firm_id)
        .eq("is_active", True)
    )

    if search:
        # Supabase supports OR filters with the or_ syntax
        query = query.or_(f"hsn_code.ilike.%{search}%,description.ilike.%{search}%")

    response = query.order("hsn_code").execute()
    return response.data or []


@router.post("/", response_model=Hsn, status_code=status.HTTP_201_CREATED)
async def create_hsn_code(
    hsn_in: HsnCreate,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    """Create a new HSN or SAC code."""
    profile = get_profile_context(jwt)
    target_firm_id = resolve_target_firm_id(profile, str(hsn_in.firm_id))

    payload = hsn_in.model_dump(mode="json")
    payload["firm_id"] = target_firm_id

    response = supabase.table("hsn_codes").insert(payload).execute()
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create HSN code. It may already exist for this firm.",
        )
    return response.data[0]


@router.get("/{hsn_id}", response_model=Hsn)
async def get_hsn_code(
    hsn_id: str,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    """Fetch a single HSN/SAC code by ID."""
    profile = get_profile_context(jwt)

    response = (
        supabase.table("hsn_codes").select("*").eq("id", hsn_id).single().execute()
    )
    hsn = response.data
    if not hsn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HSN code not found")

    resolve_target_firm_id(profile, str(hsn["firm_id"]))
    return hsn


@router.patch("/{hsn_id}", response_model=Hsn)
async def update_hsn_code(
    hsn_id: str,
    hsn_in: HsnUpdate,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    """Update an existing HSN/SAC code."""
    profile = get_profile_context(jwt)

    existing = (
        supabase.table("hsn_codes").select("firm_id").eq("id", hsn_id).single().execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HSN code not found")

    resolve_target_firm_id(profile, str(existing.data["firm_id"]))

    payload = hsn_in.model_dump(mode="json", exclude_none=True)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided to update",
        )

    response = supabase.table("hsn_codes").update(payload).eq("id", hsn_id).execute()
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update HSN code",
        )
    return response.data[0]


@router.delete("/{hsn_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_hsn_code(
    hsn_id: str,
    jwt: str = Depends(get_verified_jwt),
) -> None:
    """
    Delete an HSN code. The DB will reject if any items reference it.
    Consider soft-deleting via PATCH is_active=false instead.
    """
    profile = get_profile_context(jwt)

    existing = (
        supabase.table("hsn_codes").select("firm_id").eq("id", hsn_id).single().execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HSN code not found")

    resolve_target_firm_id(profile, str(existing.data["firm_id"]))

    supabase.table("hsn_codes").delete().eq("id", hsn_id).execute()
