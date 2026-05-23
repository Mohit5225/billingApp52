import { VoucherCategory } from "./voucher";

export interface DashboardMetric {
  count: number;
  amount: number;
}

export interface InventorySummary {
  items_count: number;
  hsn_count: number;
  uom_count: number;
  stock_items_count: number;
  closing_quantity: number;
  closing_value: number;
}

export interface RecentVoucher {
  id: string;
  category: VoucherCategory;
  voucher_number: string;
  voucher_date: string;
  narration?: string | null;
  party_name?: string | null;
  amount: number;
}

export interface DashboardOverview {
  total_vouchers: number;
  sales: DashboardMetric;
  purchases: DashboardMetric;
  receipts: DashboardMetric;
  payments: DashboardMetric;
  inventory: InventorySummary;
  recent_vouchers: RecentVoucher[];
}

export interface RegisterRow {
  id: string;
  category: VoucherCategory;
  voucher_number: string;
  voucher_date: string;
  narration?: string | null;
  party_name?: string | null;
  primary_ledger_name?: string | null;
  amount: number;
}
