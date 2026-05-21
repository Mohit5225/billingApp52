from enum import Enum
from typing import Optional

from pydantic import UUID4

from .base import BaseSchema, TimestampSchema


class DrCrType(str, Enum):
    DR = "Dr"
    CR = "Cr"


class AccountNature(str, Enum):
    ASSET = "Asset"
    LIABILITY = "Liability"
    INCOME = "Income"
    EXPENSE = "Expense"


class GstRegistrationType(str, Enum):
    REGULAR = "Regular"
    COMPOSITION = "Composition"
    UNREGISTERED = "Unregistered"
    CONSUMER = "Consumer"


class TaxType(str, Enum):
    GST = "GST"
    TDS = "TDS"
    TCS = "TCS"
    VAT = "VAT"
    OTHERS = "Others"


class BankDetailsBase(BaseSchema):
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    swift_code: Optional[str] = None
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None


class BankDetailsCreate(BankDetailsBase):
    pass


class PartyDetailsBase(BaseSchema):
    maintain_bill_by_bill: bool = False
    default_credit_days: Optional[int] = None
    mailing_name: Optional[str] = None
    address: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    pan_number: Optional[str] = None
    gst_registration_type: Optional[GstRegistrationType] = None
    gstin: Optional[str] = None


class PartyDetailsCreate(PartyDetailsBase):
    pass


class TaxDetailsBase(BaseSchema):
    duty_tax_type: Optional[TaxType] = None
    tax_percentage: Optional[float] = None


class TaxDetailsCreate(TaxDetailsBase):
    pass


class AccountGroup(TimestampSchema):
    id: UUID4
    firm_id: Optional[UUID4] = None
    name: str
    alias: Optional[str] = None
    nature: AccountNature
    is_primary: bool
    parent_id: Optional[UUID4] = None
    parent_name: Optional[str] = None
    affects_gross_profit: bool
    is_control_account: bool
    is_system: bool
    sort_order: int


class LedgerBase(BaseSchema):
    firm_id: UUID4
    group_id: UUID4
    name: str
    alias: Optional[str] = None
    opening_balance: float = 0
    opening_balance_type: DrCrType
    inventory_values_affected: bool = False
    cost_centre_applicable: bool = False


class LedgerCreate(LedgerBase):
    bank_details: Optional[BankDetailsCreate] = None
    party_details: Optional[PartyDetailsCreate] = None
    tax_details: Optional[TaxDetailsCreate] = None


class Ledger(TimestampSchema, LedgerBase):
    id: UUID4
    is_system: bool = False