from enum import Enum
from typing import Optional

from pydantic import UUID4

from .base import BaseSchema, TimestampSchema
from .voucher import VoucherCategory


class DrCrType(str, Enum):
    DR = "Dr"
    CR = "Cr"


class AccountNature(str, Enum):
    ASSET = "Asset"
    LIABILITY = "Liability"
    INCOME = "Income"
    EXPENSE = "Expense"


class LedgerType(str, Enum):
    NOT_APPLICABLE = "Not Applicable"
    INVOICE_ROUNDING = "Invoice Rounding"


class RoundingMethod(str, Enum):
    DOWNWARD = "Downward Rounding"
    NORMAL = "Normal Rounding"
    UPWARD = "Upward Rounding"


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


class BankDetails(BankDetailsBase):
    ledger_id: UUID4


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


class PartyDetails(PartyDetailsBase):
    ledger_id: UUID4


class TaxDetailsBase(BaseSchema):
    duty_tax_type: Optional[TaxType] = None
    tax_percentage: Optional[float] = None


class TaxDetailsCreate(TaxDetailsBase):
    pass


class TaxDetails(TaxDetailsBase):
    ledger_id: UUID4


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
    type_of_ledger: LedgerType = LedgerType.NOT_APPLICABLE
    opening_balance: float = 0
    opening_balance_type: DrCrType
    inventory_values_affected: bool = False
    cost_centre_applicable: bool = False
    rounding_method: Optional[RoundingMethod] = None
    rounding_limit: Optional[float] = 1.0


class LedgerCreate(LedgerBase):
    bank_details: Optional[BankDetailsCreate] = None
    party_details: Optional[PartyDetailsCreate] = None
    tax_details: Optional[TaxDetailsCreate] = None


class LedgerUpdate(BaseSchema):
    group_id: Optional[UUID4] = None
    name: Optional[str] = None
    alias: Optional[str] = None
    type_of_ledger: Optional[LedgerType] = None
    opening_balance: Optional[float] = None
    opening_balance_type: Optional[DrCrType] = None
    inventory_values_affected: Optional[bool] = None
    cost_centre_applicable: Optional[bool] = None
    bank_details: Optional[BankDetailsCreate] = None
    party_details: Optional[PartyDetailsCreate] = None
    tax_details: Optional[TaxDetailsCreate] = None
    rounding_method: Optional[RoundingMethod] = None
    rounding_limit: Optional[float] = None


class Ledger(TimestampSchema, LedgerBase):
    id: UUID4
    is_system: bool = False


class LedgerDetail(Ledger):
    group_name: Optional[str] = None
    group_parent_name: Optional[str] = None
    group_nature: Optional[AccountNature] = None
    template_type: str = "default"
    bank_details: Optional[BankDetails] = None
    party_details: Optional[PartyDetails] = None
    tax_details: Optional[TaxDetails] = None


class LedgerStatementRow(BaseSchema):
    voucher_id: UUID4
    voucher_number: str
    voucher_date: str
    category: VoucherCategory
    particulars: str
    narration: Optional[str] = None
    debit_amount: float = 0.0
    credit_amount: float = 0.0
    balance_amount: float = 0.0
    balance_type: DrCrType


class LedgerStatement(BaseSchema):
    ledger: LedgerDetail
    opening_balance: float = 0.0
    opening_balance_type: DrCrType
    rows: list[LedgerStatementRow]
    total_debit: float = 0.0
    total_credit: float = 0.0
    closing_balance: float = 0.0
    closing_balance_type: DrCrType
