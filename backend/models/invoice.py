from enum import Enum
from pydantic import UUID4
from .base import TimestampSchema

class InvoiceStatus(str, Enum):
    """Enumeration of invoice statuses."""
    pending = 'pending'
    paid = 'paid'
    overdue = 'overdue'
    cancelled = 'cancelled'

class InvoiceBase(TimestampSchema):
    """Base schema for Invoice data."""
    firm_id: UUID4
    amount: float
    status: InvoiceStatus

class InvoiceCreate(InvoiceBase):
    """Schema for creating a new Invoice."""
    pass

class Invoice(InvoiceBase):
    """Schema for representing an Invoice (includes ID)."""
    id: UUID4
