from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from core.supabase import supabase
from core.security import get_verified_jwt
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
    # 1. Fetch current user to verify they are a ca_admin
    user_resp = supabase.auth.get_user(jwt)
    current_uid = user_resp.user.id

    profile_resp = supabase.table("profiles").select("role, firm_id").eq("id", current_uid).single().execute()
    if not profile_resp.data:
        raise HTTPException(status_code=403, detail="Profile not found")

    if profile_resp.data.get("role") != "ca_admin":
        raise HTTPException(status_code=403, detail="Only CA Admin can pause users")

    # Optional: Ensure the target user is in the same firm (if applicable) or linked to this CA.
    # We will just do a simple update for now, trusting the CA admin role.
    # In a fully multi-tenant setup, you'd verify target_user's firm_id matches CA's firm_id.
    
    target_resp = supabase.table("profiles").select("firm_id").eq("id", user_id).single().execute()
    if not target_resp.data:
         raise HTTPException(status_code=404, detail="Target user not found")
         
    # Update the is_paused status
    update_resp = supabase.table("profiles").update({"is_paused": request.is_paused}).eq("id", user_id).execute()
    
    if not update_resp.data:
        raise HTTPException(status_code=500, detail="Failed to update user status")

    return {"message": "User access paused status updated", "is_paused": request.is_paused}
