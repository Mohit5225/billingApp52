from enum import Enum
from pydantic import UUID4, EmailStr
from .base import BaseSchema
from typing import Optional

class RoleEnum(str, Enum):
    """Enumeration of user roles."""
    ca_admin = 'ca_admin'
    ca_employee = 'ca_employee'
    merchant = 'merchant'

class ProfileBase(BaseSchema):
    """Base schema for User Profile data."""
    firm_id: UUID4
    role: RoleEnum
    full_name: str
    email: str
    is_paused: bool = False

class ProfileUpdate(BaseSchema):
    """Schema for updating a User Profile."""
    full_name: Optional[str] = None
    email: Optional[str] = None

class Profile(ProfileBase):
    """Schema for representing a User Profile (includes ID)."""
    id: UUID4
