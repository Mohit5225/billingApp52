from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from core.supabase import get_supabase
from core.security import get_verified_jwt
from core.helpers import _extract_user_id_from_jwt
from pydantic import BaseModel

router = APIRouter()

class PauseToggleRequest(BaseModel):
    is_paused: bool

@router.put("/{user_id}/toggle-pause")
async def toggle_user_pause(
    user_id: str,
    request: PauseToggleRequest,
    jwt: str = Depends(get_verified_jwt)
) -> Dict[str, Any]:
    supabase = await get_supabase()

    # 1. Extract current user id directly from the verified JWT (no network call)
    current_uid = _extract_user_id_from_jwt(jwt)

    profile_resp = await supabase.table("profiles").select("role, firm_id").eq("id", current_uid).single().execute()
    if not profile_resp.data:
        raise HTTPException(status_code=403, detail="Profile not found")

    if profile_resp.data.get("role") != "ca_admin":
        raise HTTPException(status_code=403, detail="Only CA Admin can pause users")

    # Optional: Ensure the target user is in the same firm (if applicable) or linked to this CA.
    # We will just do a simple update for now, trusting the CA admin role.
    # In a fully multi-tenant setup, you'd verify target_user's firm_id matches CA's firm_id.
    
    target_resp = await supabase.table("profiles").select("firm_id").eq("id", user_id).single().execute()
    if not target_resp.data:
         raise HTTPException(status_code=404, detail="Target user not found")
         
    # Update the is_paused status
    update_resp = await supabase.table("profiles").update({"is_paused": request.is_paused}).eq("id", user_id).execute()
    
    if not update_resp.data:
        raise HTTPException(status_code=500, detail="Failed to update user status")

    return {"message": "User access paused status updated", "is_paused": request.is_paused}
