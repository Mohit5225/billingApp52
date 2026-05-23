from enum import Enum
from typing import Optional

from pydantic import UUID4

from .base import BaseSchema, TimestampSchema


class UomBase(BaseSchema):
    firm_id: UUID4
    name: str
    uqc_code: str
    decimal_places: int = 0


class UomCreate(UomBase):
    pass


class UomUpdate(BaseSchema):
    name: Optional[str] = None
    uqc_code: Optional[str] = None
    decimal_places: Optional[int] = None


class Uom(TimestampSchema, UomBase):
    id: UUID4
