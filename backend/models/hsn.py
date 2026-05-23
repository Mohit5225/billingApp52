from enum import Enum
from typing import Optional

from pydantic import UUID4

from .base import BaseSchema, TimestampSchema


class GstTaxability(str, Enum):
    TAXABLE = "Taxable"
    NIL_RATED = "Nil Rated"
    EXEMPT = "Exempt"
    ZERO_RATED = "Zero Rated"
    NON_GST = "Non-GST"


class CessType(str, Enum):
    NONE = "none"
    AD_VALOREM = "ad_valorem"
    SPECIFIC = "specific"
    COMPOUND = "compound"


class HsnBase(BaseSchema):
    firm_id: UUID4
    hsn_code: str
    description: Optional[str] = None
    code_type: str = "HSN"  # HSN | SAC
    is_active: bool = True


class HsnCreate(HsnBase):
    pass


class HsnUpdate(BaseSchema):
    hsn_code: Optional[str] = None
    description: Optional[str] = None
    code_type: Optional[str] = None
    is_active: Optional[bool] = None


class Hsn(TimestampSchema, HsnBase):
    id: UUID4
