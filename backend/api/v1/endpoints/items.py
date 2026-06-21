from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from core.helpers import get_profile_context, resolve_target_firm_id
from core.security import get_verified_jwt
from core.supabase import get_supabase
from models.item import Item, ItemCreate, ItemDetail, ItemUpdate

router = APIRouter()


async def _validate_cross_tenant_refs(
    uom_id: str,
    target_firm_id: str,
) -> None:
    """
    Ensure uom_id belongs to the same firm as the item being created.
    The DB FK will also block this, but this check gives a clean 403 instead of
    a cryptic constraint violation.
    """
    supabase = await get_supabase()
    uom_resp = (
        await supabase.table("uom")
        .select("firm_id")
        .eq("id", uom_id)
        .single()
        .execute()
    )
    if not uom_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="UOM not found")
    if str(uom_resp.data["firm_id"]) != target_firm_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="UOM does not belong to the target firm",
        )


async def _enrich_items(items: list[dict]) -> list[dict]:
    """
    Join uom_name onto raw item rows for display.
    Batch-fetches UOM records to avoid N+1 queries.
    """
    if not items:
        return items

    supabase = await get_supabase()
    uom_ids = list({str(i["uom_id"]) for i in items if i.get("uom_id")})

    uom_map: dict[str, str] = {}

    if uom_ids:
        uom_rows = (
            await supabase.table("uom")
            .select("id, name")
            .in_("id", uom_ids)
            .execute()
        ).data or []
        uom_map = {row["id"]: row["name"] for row in uom_rows}

    for item in items:
        item["uom_name"] = uom_map.get(str(item.get("uom_id")))

    return items


@router.get("/", response_model=list[ItemDetail])
async def list_items(
    firm_id: Optional[str] = None,
    search: Optional[str] = None,
    active_only: bool = True,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    """
    List items for a firm. Enriched with hsn_code and uom_name.
    Use ?search= to filter by name or alias (powers voucher entry typeahead).
    """
    supabase = await get_supabase()
    profile = await get_profile_context(jwt)
    target_firm_id = await resolve_target_firm_id(profile, firm_id)

    query = supabase.table("items").select("*").eq("firm_id", target_firm_id)

    if active_only:
        query = query.eq("is_active", True)

    if search:
        query = query.or_(f"name.ilike.%{search}%,alias.ilike.%{search}%")

    response = await query.order("name").execute()
    items = response.data or []

    return await _enrich_items(items)


@router.post("/", response_model=ItemDetail, status_code=status.HTTP_201_CREATED)
async def create_item(
    item_in: ItemCreate,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    """
    Create a new item. Validates that uom_id belongs to the same firm.
    """
    supabase = await get_supabase()
    profile = await get_profile_context(jwt)
    target_firm_id = await resolve_target_firm_id(profile, str(item_in.firm_id))

    await _validate_cross_tenant_refs(str(item_in.uom_id), target_firm_id)

    payload = item_in.model_dump(mode="json")
    payload["firm_id"] = target_firm_id
    # Serialize UUIDs to strings for Supabase client
    payload["uom_id"] = str(payload["uom_id"])

    response = await supabase.table("items").insert(payload).execute()
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create item. Name may already exist for this firm.",
        )

    return (await _enrich_items(response.data))[0]


@router.get("/{item_id}", response_model=ItemDetail)
async def get_item(
    item_id: str,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    """Fetch a single item with enriched HSN and UOM details."""
    supabase = await get_supabase()
    profile = await get_profile_context(jwt)

    response = (
        await supabase.table("items").select("*").eq("id", item_id).single().execute()
    )
    item = response.data
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    await resolve_target_firm_id(profile, str(item["firm_id"]))
    return (await _enrich_items([item]))[0]


@router.patch("/{item_id}", response_model=ItemDetail)
async def update_item(
    item_id: str,
    item_in: ItemUpdate,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    """Update an item. Re-validates cross-tenant refs if hsn_id or uom_id changes."""
    supabase = await get_supabase()
    profile = await get_profile_context(jwt)

    existing_resp = (
        await supabase.table("items")
        .select("firm_id, uom_id")
        .eq("id", item_id)
        .single()
        .execute()
    )
    if not existing_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    existing = existing_resp.data
    target_firm_id = await resolve_target_firm_id(profile, str(existing["firm_id"]))

    payload = item_in.model_dump(mode="json", exclude_none=True)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided to update",
        )

    # Re-validate cross-tenant refs if UOM FK is being changed
    new_uom_id = str(payload.get("uom_id", existing["uom_id"]))
    if "uom_id" in payload:
        await _validate_cross_tenant_refs(new_uom_id, target_firm_id)

    # Serialize UUIDs
    if "uom_id" in payload:
        payload["uom_id"] = str(payload["uom_id"])

    response = await supabase.table("items").update(payload).eq("id", item_id).execute()
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update item",
        )

    return (await _enrich_items(response.data))[0]


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: str,
    jwt: str = Depends(get_verified_jwt),
) -> None:
    """
    Delete an item. The DB will block this if any voucher inventory lines reference it.
    Consider soft-deleting via PATCH is_active=false for items that have been invoiced.
    """
    supabase = await get_supabase()
    profile = await get_profile_context(jwt)

    existing = (
        await supabase.table("items").select("firm_id").eq("id", item_id).single().execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    await resolve_target_firm_id(profile, str(existing.data["firm_id"]))

    try:
        await supabase.table("items").delete().eq("id", item_id).execute()
    except Exception as e:
        err_msg = str(e)
        if "violates foreign key constraint" in err_msg or "23503" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete this item because it is currently used in vouchers. You can disable it instead.",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {err_msg}",
        )
