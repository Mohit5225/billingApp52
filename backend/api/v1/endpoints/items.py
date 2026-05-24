from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from core.helpers import get_profile_context, resolve_target_firm_id
from core.security import get_verified_jwt
from core.supabase import supabase
from models.item import Item, ItemCreate, ItemDetail, ItemUpdate

router = APIRouter()


def _validate_cross_tenant_refs(
    hsn_id: str,
    uom_id: str,
    target_firm_id: str,
) -> None:
    """
    Ensure hsn_id and uom_id both belong to the same firm as the item being created.
    The DB FK will also block this, but this check gives a clean 403 instead of
    a cryptic constraint violation.
    """
    hsn_resp = (
        supabase.table("hsn_codes")
        .select("firm_id")
        .eq("id", hsn_id)
        .single()
        .execute()
    )
    if not hsn_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HSN code not found")
    if str(hsn_resp.data["firm_id"]) != target_firm_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="HSN code does not belong to the target firm",
        )

    uom_resp = (
        supabase.table("uom")
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


def _enrich_items(items: list[dict]) -> list[dict]:
    """
    Join hsn_code text and uom_name onto raw item rows for display.
    Batch-fetches HSN and UOM records to avoid N+1 queries.
    """
    if not items:
        return items

    hsn_ids = list({str(i["hsn_id"]) for i in items if i.get("hsn_id")})
    uom_ids = list({str(i["uom_id"]) for i in items if i.get("uom_id")})

    hsn_map: dict[str, str] = {}
    uom_map: dict[str, str] = {}

    if hsn_ids:
        hsn_rows = (
            supabase.table("hsn_codes")
            .select("id, hsn_code")
            .in_("id", hsn_ids)
            .execute()
        ).data or []
        hsn_map = {row["id"]: row["hsn_code"] for row in hsn_rows}

    if uom_ids:
        uom_rows = (
            supabase.table("uom")
            .select("id, name")
            .in_("id", uom_ids)
            .execute()
        ).data or []
        uom_map = {row["id"]: row["name"] for row in uom_rows}

    for item in items:
        item["hsn_code"] = hsn_map.get(str(item.get("hsn_id")))
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
    profile = get_profile_context(jwt)
    target_firm_id = resolve_target_firm_id(profile, firm_id)

    query = supabase.table("items").select("*").eq("firm_id", target_firm_id)

    if active_only:
        query = query.eq("is_active", True)

    if search:
        query = query.or_(f"name.ilike.%{search}%,alias.ilike.%{search}%")

    response = query.order("name").execute()
    items = response.data or []

    return _enrich_items(items)


@router.post("/", response_model=ItemDetail, status_code=status.HTTP_201_CREATED)
async def create_item(
    item_in: ItemCreate,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    """
    Create a new item. Validates that hsn_id and uom_id belong to the same firm.
    """
    profile = get_profile_context(jwt)
    target_firm_id = resolve_target_firm_id(profile, str(item_in.firm_id))

    _validate_cross_tenant_refs(str(item_in.hsn_id), str(item_in.uom_id), target_firm_id)

    payload = item_in.model_dump(mode="json")
    payload["firm_id"] = target_firm_id
    # Serialize UUIDs to strings for Supabase client
    for key in ("hsn_id", "uom_id"):
        payload[key] = str(payload[key])

    response = supabase.table("items").insert(payload).execute()
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create item. Name may already exist for this firm.",
        )

    return _enrich_items(response.data)[0]


@router.get("/{item_id}", response_model=ItemDetail)
async def get_item(
    item_id: str,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    """Fetch a single item with enriched HSN and UOM details."""
    profile = get_profile_context(jwt)

    response = (
        supabase.table("items").select("*").eq("id", item_id).single().execute()
    )
    item = response.data
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    resolve_target_firm_id(profile, str(item["firm_id"]))
    return _enrich_items([item])[0]


@router.patch("/{item_id}", response_model=ItemDetail)
async def update_item(
    item_id: str,
    item_in: ItemUpdate,
    jwt: str = Depends(get_verified_jwt),
) -> Any:
    """Update an item. Re-validates cross-tenant refs if hsn_id or uom_id changes."""
    profile = get_profile_context(jwt)

    existing_resp = (
        supabase.table("items")
        .select("firm_id, hsn_id, uom_id")
        .eq("id", item_id)
        .single()
        .execute()
    )
    if not existing_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    existing = existing_resp.data
    target_firm_id = resolve_target_firm_id(profile, str(existing["firm_id"]))

    payload = item_in.model_dump(mode="json", exclude_none=True)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided to update",
        )

    # Re-validate cross-tenant refs if either FK is being changed
    new_hsn_id = str(payload.get("hsn_id", existing["hsn_id"]))
    new_uom_id = str(payload.get("uom_id", existing["uom_id"]))
    if "hsn_id" in payload or "uom_id" in payload:
        _validate_cross_tenant_refs(new_hsn_id, new_uom_id, target_firm_id)

    # Serialize UUIDs
    for key in ("hsn_id", "uom_id"):
        if key in payload:
            payload[key] = str(payload[key])

    response = supabase.table("items").update(payload).eq("id", item_id).execute()
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update item",
        )

    return _enrich_items(response.data)[0]


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: str,
    jwt: str = Depends(get_verified_jwt),
) -> None:
    """
    Delete an item. The DB will block this if any voucher inventory lines reference it.
    Consider soft-deleting via PATCH is_active=false for items that have been invoiced.
    """
    profile = get_profile_context(jwt)

    existing = (
        supabase.table("items").select("firm_id").eq("id", item_id).single().execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    resolve_target_firm_id(profile, str(existing.data["firm_id"]))

    supabase.table("items").delete().eq("id", item_id).execute()
