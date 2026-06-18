from datetime import date
from typing import Optional

from pydantic import UUID4

from .base import BaseSchema
from .voucher import VoucherCategory


class DashboardMetric(BaseSchema):
    count: int
    amount: float


class InventorySummary(BaseSchema):
    items_count: int
    hsn_count: int
    uom_count: int
    stock_items_count: int
    closing_quantity: float
    closing_value: float


class RecentVoucher(BaseSchema):
    id: UUID4
    category: VoucherCategory
    voucher_number: str
    voucher_date: date
    narration: Optional[str] = None
    party_name: Optional[str] = None
    amount: float


class DashboardOverview(BaseSchema):
    total_vouchers: int
    sales: DashboardMetric
    purchases: DashboardMetric
    receipts: DashboardMetric
    payments: DashboardMetric
    inventory: InventorySummary
    recent_vouchers: list[RecentVoucher]


class RegisterRow(BaseSchema):
    id: UUID4
    category: VoucherCategory
    voucher_number: str
    voucher_date: date
    narration: Optional[str] = None
    party_name: Optional[str] = None
    primary_ledger_name: Optional[str] = None
    amount: float


class StockSummaryRow(BaseSchema):
    item_id: UUID4
    item_name: str
    alias: Optional[str] = None
    hsn_code: Optional[str] = None
    uom_name: Optional[str] = None
    opening_quantity: float
    opening_value: float
    inward_quantity: float
    outward_quantity: float
    closing_quantity: float
    closing_value: float
    default_price: float
    is_active: bool


class StockMonthlyRow(BaseSchema):
    month: str  # e.g. "April", "May"
    year: int
    month_index: int  # For sorting: 1 for April, ..., 12 for March
    opening_quantity: float
    opening_value: float
    inward_quantity: float
    inward_value: float
    outward_quantity: float
    outward_value: float
    closing_quantity: float
    closing_value: float


class StockVoucherRow(BaseSchema):
    voucher_id: UUID4
    voucher_date: date
    particulars: str
    voucher_type: str
    voucher_number: str
    inward_quantity: float
    inward_value: float
    outward_quantity: float
    outward_value: float
    closing_quantity: float
    closing_value: float
