from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import UUID4
from core.supabase import get_supabase
from core.security import get_verified_jwt
from core.helpers import _extract_user_id_from_jwt
from models.period_block import PeriodBlock, PeriodBlockUpdate

router = APIRouter()

@router.get("/firms/{firm_id}/period-blocks", response_model=List[PeriodBlock])
async def get_period_blocks(
    firm_id: UUID4,
    year: Optional[int] = Query(None),
    jwt: str = Depends(get_verified_jwt)
):
    supabase = await get_supabase()
    
    query = supabase.table("period_blocks").select("*").eq("firm_id", str(firm_id))
    if year is not None:
        query = query.eq("year", year)
        
    resp = await query.execute()
    return resp.data

@router.put("/firms/{firm_id}/period-blocks/{year}/{month}", response_model=PeriodBlock)
async def update_period_block(
    firm_id: UUID4,
    year: int,
    month: int,
    block_data: PeriodBlockUpdate,
    jwt: str = Depends(get_verified_jwt)
):
    supabase = await get_supabase()
    current_uid = _extract_user_id_from_jwt(jwt)
    
    # 1. Fetch user profile role
    profile_resp = await supabase.table("profiles").select("role").eq("id", current_uid).single().execute()
    if not profile_resp.data:
        raise HTTPException(status_code=403, detail="Profile not found")
        
    role = profile_resp.data.get("role")
    
    # 2. Get existing block if any
    existing_resp = await supabase.table("period_blocks").select("*").eq("firm_id", str(firm_id)).eq("year", year).eq("month", month).execute()
    existing_block = existing_resp.data[0] if existing_resp.data else None
    
    # 3. Validation: Merchant can only update from false to true
    if role == "merchant":
        if existing_block:
            if block_data.block_sales is False and existing_block.get("block_sales", False):
                raise HTTPException(status_code=403, detail="Merchants cannot unblock sales")
            if block_data.block_purchases is False and existing_block.get("block_purchases", False):
                raise HTTPException(status_code=403, detail="Merchants cannot unblock purchases")
            if block_data.block_credit_notes is False and existing_block.get("block_credit_notes", False):
                raise HTTPException(status_code=403, detail="Merchants cannot unblock credit notes")
            if block_data.block_debit_notes is False and existing_block.get("block_debit_notes", False):
                raise HTTPException(status_code=403, detail="Merchants cannot unblock debit notes")
        else:
            # If no existing block, merchants can't explicitly pass False if they aren't allowed to unblock,
            # but since default is false, setting false -> false is fine.
            pass
            
    # 4. Upsert
    payload = {
        "firm_id": str(firm_id),
        "year": year,
        "month": month,
    }
    
    # Only update provided fields
    if block_data.block_sales is not None:
        payload["block_sales"] = block_data.block_sales
    if block_data.block_purchases is not None:
        payload["block_purchases"] = block_data.block_purchases
    if block_data.block_credit_notes is not None:
        payload["block_credit_notes"] = block_data.block_credit_notes
    if block_data.block_debit_notes is not None:
        payload["block_debit_notes"] = block_data.block_debit_notes
        
    upsert_resp = await supabase.table("period_blocks").upsert(
        payload,
        on_conflict="firm_id, year, month"
    ).execute()
    
    if not upsert_resp.data:
        raise HTTPException(status_code=500, detail="Failed to update period block")
        
    return upsert_resp.data[0]
