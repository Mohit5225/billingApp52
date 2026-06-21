from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from core.helpers import get_profile_context, resolve_target_firm_id
from core.security import get_verified_jwt
from core.supabase import get_supabase
from models.uom import Uom, UomCreate, UomUpdate

router = APIRouter()


@router.get("/", response_model=list[Uom])
async def list_uoms(
    firm_id: Optional[str] = None,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    """List all UOMs for a firm."""
    supabase = await get_supabase()
    profile = await get_profile_context(jwt)
    target_firm_id = await resolve_target_firm_id(profile, firm_id)

    response = (
        await supabase.table("uom")
        .select("*")
        .eq("firm_id", target_firm_id)
        .order("name")
        .execute()
    )
    return response.data or []


@router.post("/", response_model=Uom, status_code=status.HTTP_201_CREATED)
async def create_uom(
    uom_in: UomCreate,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    """Create a new Unit of Measure."""
    supabase = await get_supabase()
    profile = await get_profile_context(jwt)
    target_firm_id = await resolve_target_firm_id(profile, str(uom_in.firm_id))

    payload = uom_in.model_dump(mode="json")
    payload["firm_id"] = target_firm_id

    response = await supabase.table("uom").insert(payload).execute()
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create UOM",
        )
    return response.data[0]


@router.get("/{uom_id}", response_model=Uom)
async def get_uom(
    uom_id: str,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    """Fetch a single UOM by ID."""
    supabase = await get_supabase()
    profile = await get_profile_context(jwt)

    response = (
        await supabase.table("uom")
        .select("*")
        .eq("id", uom_id)
        .single()
        .execute()
    )
    uom = response.data
    if not uom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="UOM not found")

    await resolve_target_firm_id(profile, str(uom["firm_id"]))
    return uom


@router.patch("/{uom_id}", response_model=Uom)
async def update_uom(
    uom_id: str,
    uom_in: UomUpdate,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    """Update an existing UOM."""
    supabase = await get_supabase()
    profile = await get_profile_context(jwt)

    existing = (
        await supabase.table("uom").select("firm_id").eq("id", uom_id).single().execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="UOM not found")

    await resolve_target_firm_id(profile, str(existing.data["firm_id"]))

    payload = uom_in.model_dump(mode="json", exclude_none=True)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided to update",
        )

    response = await supabase.table("uom").update(payload).eq("id", uom_id).execute()
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update UOM",
        )
    return response.data[0]


@router.delete("/{uom_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_uom(
    uom_id: str,
    jwt: str = Depends(get_verified_jwt),
) -> None:
    """
    Delete a UOM. The DB will reject this with a 409 if any items reference it
    (ON DELETE RESTRICT on the FK from items.uom_id).
    """
    supabase = await get_supabase()
    profile = await get_profile_context(jwt)

    existing = (
        await supabase.table("uom").select("firm_id").eq("id", uom_id).single().execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="UOM not found")

    await resolve_target_firm_id(profile, str(existing.data["firm_id"]))

    try:
        await supabase.table("uom").delete().eq("id", uom_id).execute()
    except Exception as e:
        err_msg = str(e)
        if "violates foreign key constraint" in err_msg or "23503" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete this UOM because it is currently referenced by items. Please update or delete those items first.",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {err_msg}",
        )
