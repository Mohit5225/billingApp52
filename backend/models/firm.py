from pydantic import UUID4
from typing import Optional
from .base import TimestampSchema

class FirmBase(TimestampSchema):
    """Base schema for Firm data."""
    name: str
    mailing_name: str
    address_lane1: str
    city: str
    state: str
    pincode: str
    mobile: str
    email: Optional[str] = None
    registration_type: str = "Regular"
    gstin: str
    pan: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    branch_name: Optional[str] = None
    parent_firm_id: Optional[UUID4] = None

class FirmCreate(FirmBase):
    """Schema for creating a new Firm."""
    pass

class FirmUpdate(FirmBase):
    """Schema for updating a Firm."""
    name: Optional[str] = None

class Firm(FirmBase):
    """Schema for representing a Firm (includes ID)."""
    id: UUID4
