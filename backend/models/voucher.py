from datetime import date
from enum import Enum
from typing import List, Optional

from pydantic import UUID4

from .base import BaseSchema, TimestampSchema, DrCrType
from .item import GstTaxability


class VoucherCategory(str, Enum):
    SALES = "Sales"
    PURCHASE = "Purchase"
    RECEIPT = "Receipt"
    PAYMENT = "Payment"
    CONTRA = "Contra"
    JOURNAL = "Journal"
    DEBIT_NOTE = "Debit Note"
    CREDIT_NOTE = "Credit Note"


class BillRefType(str, Enum):
    NEW_REF = "New Ref"
    AGST_REF = "Agst Ref"
    ADVANCE = "Advance"
    ON_ACCOUNT = "On Account"


# ── Accounting Line ───────────────────────────────────────────────────────────

class AccountingLineCreate(BaseSchema):
    ledger_id: UUID4
    line_number: int
    debit_amount: float = 0.00
    credit_amount: float = 0.00


class AccountingLine(AccountingLineCreate):
    id: UUID4
    voucher_id: UUID4
    firm_id: UUID4


# ── Inventory Line ────────────────────────────────────────────────────────────

class InventoryLineCreate(BaseSchema):
    item_id: UUID4
    line_number: int

    # Quantities & pricing
    quantity: float
    unit_price: float
    discount_amount: float = 0.00
    taxable_amount: float  # Backend will validate: (qty * price) - discount

    # Tax — caller sends rates; backend snaps from item master
    # Caller also sends computed amounts; backend validates them
    igst_rate: float = 0.00
    cgst_rate: float = 0.00
    sgst_rate: float = 0.00
    cess_percent: float = 0.00
    cess_amount_per_unit: float = 0.00

    igst_amount: float = 0.00
    cgst_amount: float = 0.00
    sgst_amount: float = 0.00
    cess_amount: float = 0.00


class InventoryLine(InventoryLineCreate):
    id: UUID4
    voucher_id: UUID4
    firm_id: UUID4

    # Frozen master data (snapshotted at save time)
    item_name: str
    hsn_code: str
    uom: str
    taxability: GstTaxability
    is_rcm: bool


# ── Voucher Header ────────────────────────────────────────────────────────────

class VoucherBase(BaseSchema):
    firm_id: UUID4
    category: VoucherCategory
    voucher_number: str
    voucher_date: date
    narration: Optional[str] = None
    party_ledger_id: Optional[UUID4] = None


# ── Bill Allocation ───────────────────────────────────────────────────────────

class BillAllocationCreate(BaseSchema):
    ref_type: BillRefType
    ref_name: str
    amount: float
    amount_type: DrCrType
    due_date: Optional[date] = None


class BillAllocation(BillAllocationCreate):
    id: UUID4
    voucher_id: UUID4
    firm_id: UUID4
    party_ledger_id: UUID4
    accounting_line_id: UUID4


class VoucherCreate(VoucherBase):
    accounting_lines: List[AccountingLineCreate]
    inventory_lines: List[InventoryLineCreate] = []
    bill_allocations: List[BillAllocationCreate] = []


class VoucherUpdate(BaseSchema):
    voucher_number: Optional[str] = None
    voucher_date: Optional[date] = None
    narration: Optional[str] = None


class Voucher(TimestampSchema, VoucherBase):
    id: UUID4
    is_cancelled: bool = False


class VoucherDetail(Voucher):
    """Full voucher with all line items — used for GET /vouchers/{id}."""
    accounting_lines: List[AccountingLine] = []
    inventory_lines: List[InventoryLine] = []
    bill_allocations: List[BillAllocation] = []
