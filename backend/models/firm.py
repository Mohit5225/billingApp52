from pydantic import UUID4
from typing import Optional
from .base import TimestampSchema

class FirmBase(TimestampSchema):
    """Base schema for Firm data."""
    name: str
    parent_firm_id: Optional[UUID4] = None

class FirmCreate(FirmBase):
    """Schema for creating a new Firm."""
    pass

class Firm(FirmBase):
    """Schema for representing a Firm (includes ID)."""
    id: UUID4
