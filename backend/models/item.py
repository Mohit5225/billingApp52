from enum import Enum
from typing import Optional

from pydantic import UUID4

from .base import BaseSchema, TimestampSchema
from .hsn import CessType, GstTaxability


class ItemType(str, Enum):
    GOODS = "Goods"
    SERVICES = "Services"


class ItemBase(BaseSchema):
    firm_id: UUID4
    hsn_id: UUID4
    uom_id: UUID4
    name: str
    alias: Optional[str] = None
    type: ItemType
    default_price: float = 0.00

    # GST flags
    is_gst_applicable: bool = True
    is_rcm: bool = False
    taxability: GstTaxability = GstTaxability.TAXABLE

    # Tax rates
    igst_rate: float = 0.00
    cgst_rate: float = 0.00
    sgst_rate: float = 0.00
    cess_type: CessType = CessType.NONE
    cess_percent: float = 0.00
    cess_amount_per_unit: float = 0.00

    # Opening balances (for Day-1 onboarding)
    opening_quantity: float = 0.00
    opening_rate: float = 0.00
    opening_value: float = 0.00

    is_active: bool = True


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseSchema):
    hsn_id: Optional[UUID4] = None
    uom_id: Optional[UUID4] = None
    name: Optional[str] = None
    alias: Optional[str] = None
    type: Optional[ItemType] = None
    default_price: Optional[float] = None
    is_gst_applicable: Optional[bool] = None
    is_rcm: Optional[bool] = None
    taxability: Optional[GstTaxability] = None
    igst_rate: Optional[float] = None
    cgst_rate: Optional[float] = None
    sgst_rate: Optional[float] = None
    cess_type: Optional[CessType] = None
    cess_percent: Optional[float] = None
    cess_amount_per_unit: Optional[float] = None
    opening_quantity: Optional[float] = None
    opening_rate: Optional[float] = None
    opening_value: Optional[float] = None
    is_active: Optional[bool] = None


class Item(TimestampSchema, ItemBase):
    id: UUID4


class ItemDetail(Item):
    """Enriched read model — includes resolved HSN code and UOM name for display."""
    hsn_code: Optional[str] = None
    uom_name: Optional[str] = None
