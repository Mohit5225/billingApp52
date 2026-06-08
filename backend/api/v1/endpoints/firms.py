from fastapi import APIRouter, Depends, HTTPException, status
from typing import Any
# pyrefly: ignore [missing-import]
from postgrest.exceptions import APIError
from core.security import get_verified_jwt
from core.supabase import supabase
from models.firm import FirmCreate, Firm, FirmUpdate
from core.helpers import get_profile_context, resolve_target_firm_id
import uuid

import httpx
from core.config import settings

router = APIRouter()

@router.get("/my-firms")
async def list_my_firms(jwt: str = Depends(get_verified_jwt)) -> Any:
    """
    Returns only the firms the current user has access to.
    """
    profile = get_profile_context(jwt)

    if profile["role"] in ("ca_admin", "ca_employee"):
        # CA God Mode: sees all firms without restriction
        firms = (
            supabase.table("firms")
            .select("*")
            .order("name")
            .execute()
        )
        return firms.data or []

    # Merchant: only firms they have explicit access to
    access_rows = (
        supabase.table("user_firm_access")
        .select("firm_id")
        .eq("user_id", str(profile["id"]))
        .execute()
    )
    firm_ids = [row["firm_id"] for row in (access_rows.data or [])]
    if not firm_ids:
        return []

    return (
        supabase.table("firms")
        .select("*")
        .in_("id", firm_ids)
        .order("name")
        .execute()
    ).data or []

@router.get("/gst/fetch")
async def fetch_gst_details(gstin: str, jwt: str = Depends(get_verified_jwt)) -> Any:
    """
    Fetch GST details using RapidAPI.
    """
    if len(gstin) != 15:
        raise HTTPException(status_code=400, detail="Invalid GSTIN format")
        
    url = f"https://gst-verification-api-get-profile-returns-data.p.rapidapi.com/v1/gstin/{gstin}/details"
    headers = {
        "x-rapidapi-key": settings.RAPIDAPI_KEY,
        "x-rapidapi-host": "gst-verification-api-get-profile-returns-data.p.rapidapi.com",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            print(f"Fetching GST from New Provider for: {gstin}")
            response = await client.get(url, headers=headers, timeout=15.0)
            print(f"Response Status: {response.status_code}")
            
            if response.status_code != 200:
                try:
                    err_data = response.json()
                except:
                    err_data = {"message": response.text}
                print(f"Error Response: {err_data}")
                detail = err_data.get("message") or f"API error: {response.status_code}"
                raise HTTPException(status_code=response.status_code, detail=detail)

            res_json = response.json()
            print(f"API Full Response: {res_json}")
            
            # 1. Extract the core data object (flexible)
            # Some APIs wrap in 'data', some don't.
            raw_data = res_json.get("data") if isinstance(res_json.get("data"), dict) else res_json
            
            # 2. Extract Address Object (highly flexible)
            # Try Principal Address first (common in detailed APIs), then root address
            addr_obj = raw_data.get("place_of_business_principal", {}).get("address", {}) if isinstance(raw_data.get("place_of_business_principal"), dict) else {}
            if not addr_obj:
                # Fallback to a root 'address' field if it's a dict
                if isinstance(raw_data.get("address"), dict):
                    addr_obj = raw_data.get("address")
            
            # 3. Construct Address String (Lane 1)
            # If addr_obj is a dict, join parts. If it was just a string, use it.
            addr_lane1 = "N/A"
            if isinstance(raw_data.get("address"), str):
                addr_lane1 = raw_data.get("address")
            elif addr_obj:
                parts = [
                    addr_obj.get("door_num"),
                    addr_obj.get("building_name"),
                    addr_obj.get("street"),
                    addr_obj.get("location")
                ]
                addr_lane1 = ", ".join([str(p) for p in parts if p]) or "N/A"

            # 4. Extract State and Pincode
            state = addr_obj.get("state") or raw_data.get("state") or raw_data.get("state_jurisdiction") or ""
            pincode = addr_obj.get("pin_code") or addr_obj.get("pincode") or ""

            # 5. Extract City (fallback to district or location)
            city = addr_obj.get("city") or addr_obj.get("district") or addr_obj.get("location") or ""

            # 6. Final Mapping (Flexible & Safe)
            mapped_data = {
                "name": raw_data.get("legal_name") or raw_data.get("legalName") or raw_data.get("trade_name") or raw_data.get("tradeName") or "N/A",
                "mailing_name": raw_data.get("legal_name") or raw_data.get("legalName") or "N/A",
                "address_lane1": addr_lane1,
                "city": city, 
                "state": state or "N/A",
                "pincode": pincode or "N/A",
                "mobile": raw_data.get("mobile") or "", 
                "email": raw_data.get("email") or "",
                "registration_type": raw_data.get("type") or raw_data.get("taxpayer_type") or raw_data.get("taxpayerType") or raw_data.get("dealerType") or "Regular",
                "gstin": gstin,
                "pan": raw_data.get("pan") or (gstin[2:12] if len(gstin) >= 12 else ""),
                "bank_name": "",
                "account_number": "",
                "ifsc_code": "",
                "branch_name": ""
            }
            
            print(f"Final Mapped Data: {mapped_data}")
            return mapped_data
            
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="GST API request timed out")
        except HTTPException as he:
            raise he
        except Exception as e:
            print(f"GST Fetch Exception: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.post("/", response_model=Firm)
async def create_firm(firm_in: FirmCreate, jwt: str = Depends(get_verified_jwt)) -> Any:
    """
    Endpoint to create a firm and automatically link the user to it 
    by creating their initial profile.
    """
    # Pre-insertion uniqueness checks
    gstin = (firm_in.gstin or "").strip()
    pan = (firm_in.pan or "").strip()
    
    if gstin:
        gstin_check = supabase.table("firms").select("id").ilike("gstin", gstin).execute()
        if gstin_check.data:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A firm with this GSTIN already exists.")
            
    if pan:
        pan_check = supabase.table("firms").select("id").ilike("pan", pan).execute()
        if pan_check.data:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A firm with this PAN number already exists.")

    try:
        # Exclude unset fields
        firm_data = firm_in.model_dump(mode="json", exclude_unset=True)
        
        # 1. Identify the user from the JWT
        user_resp = supabase.auth.get_user(jwt)
        user = user_resp.user
        if not user:
            raise HTTPException(status_code=401, detail="Could not identify user from token")

        try:
            # 2. Insert firm using the admin client
            response = supabase.table("firms").insert(firm_data).execute()
        except APIError as e:
            error_message = e.message or str(e)
            if "A firm with this GSTIN already exists" in error_message or "uq_firm_gstin_trim_lower" in error_message:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A firm with this GSTIN already exists.")
            if "A firm with this PAN number already exists" in error_message or "uq_firm_pan_trim_lower" in error_message:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A firm with this PAN number already exists.")
            raise

        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create firm")
            
        new_firm = response.data[0]
        
        # 3. Handle Profile and Access Link
        existing_profile = supabase.table("profiles").select("id").eq("id", user.id).maybe_single().execute()
        
        if existing_profile and existing_profile.data:
            # User already exists, they are just adding a second firm
            # DO NOT overwrite profile.firm_id. Just add to junction table.
            access_resp = supabase.table("user_firm_access").insert({
                "user_id": user.id,
                "firm_id": new_firm["id"],
            }).execute()
            
            if not access_resp.data:
                supabase.table("firms").delete().eq("id", new_firm["id"]).execute()
                raise HTTPException(status_code=500, detail="Failed to link user to firm. Firm creation rolled back.")
        else:
            # First time user signup. Create profile AND access link.
            profile_data = {
                "id": user.id,
                "firm_id": new_firm["id"],
                "role": "merchant",
                "full_name": user.user_metadata.get("full_name", "") if user.user_metadata else "User",
                "email": user.email
            }
            prof_response = supabase.table("profiles").upsert(profile_data).execute()
            if not prof_response.data:
                supabase.table("firms").delete().eq("id", new_firm["id"]).execute()
                raise HTTPException(status_code=500, detail="Failed to create user profile. Firm creation rolled back.")
            
            supabase.table("user_firm_access").insert({
                "user_id": user.id,
                "firm_id": new_firm["id"],
            }).execute()
            
        return new_firm
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{firm_id}", response_model=Firm)
async def update_firm(firm_id: str, firm_in: FirmUpdate, jwt: str = Depends(get_verified_jwt)) -> Any:
    """
    Update firm details.
    """
    profile = get_profile_context(jwt)
    target_firm_id = resolve_target_firm_id(profile, firm_id)

    # Convert the pydantic model to a dict, excluding None/unset values
    firm_data = firm_in.model_dump(mode="json", exclude_unset=True)

    try:
        response = supabase.table("firms").update(firm_data).eq("id", target_firm_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to update firm")
            
        return response.data[0]
    except HTTPException as he:
        raise he
    except Exception as e:
        error_msg = str(e)
        if "uq_firm_gstin_trim_lower" in error_msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A firm with this GSTIN already exists.")
        if "uq_firm_pan_trim_lower" in error_msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A firm with this PAN number already exists.")
        raise HTTPException(status_code=400, detail=str(e))
