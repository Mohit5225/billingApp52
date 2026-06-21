from typing import Optional
from pydantic import BaseModel, UUID4
from .base import TimestampSchema

class PeriodBlockBase(BaseModel):
    firm_id: UUID4
    year: int
    month: int
    block_sales: bool = False
    block_purchases: bool = False
    block_credit_notes: bool = False
    block_debit_notes: bool = False

class PeriodBlockCreate(PeriodBlockBase):
    pass

class PeriodBlockUpdate(BaseModel):
    block_sales: Optional[bool] = None
    block_purchases: Optional[bool] = None
    block_credit_notes: Optional[bool] = None
    block_debit_notes: Optional[bool] = None

class PeriodBlock(PeriodBlockBase, TimestampSchema):
    id: UUID4
