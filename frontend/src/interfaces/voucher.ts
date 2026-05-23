import { BaseEntity } from "./base";

export type VoucherCategory =
  | "Sales"
  | "Purchase"
  | "Receipt"
  | "Payment"
  | "Contra"
  | "Journal"
  | "Debit Note"
  | "Credit Note";

export interface AccountingLine {
  id?: string;
  voucher_id?: string;
  firm_id?: string;
  ledger_id: string;
  line_number: number;
  debit_amount: number;
  credit_amount: number;
}

export interface InventoryLine {
  id?: string;
  voucher_id?: string;
  firm_id?: string;
  item_id: string;
  line_number: number;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  taxable_amount: number;
  igst_rate: number;
  cgst_rate: number;
  sgst_rate: number;
  cess_percent: number;
  cess_amount_per_unit: number;
  igst_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  cess_amount: number;
  item_name?: string;
  hsn_code?: string;
  uom?: string;
  taxability?: string;
  is_rcm?: boolean;
}

export interface Voucher extends BaseEntity {
  firm_id: string;
  category: VoucherCategory;
  voucher_number: string;
  voucher_date: string;
  narration?: string | null;
  party_ledger_id?: string | null;
  is_cancelled: boolean;
}

export interface VoucherDetail extends Voucher {
  accounting_lines: AccountingLine[];
  inventory_lines: InventoryLine[];
}

export interface VoucherWritePayload {
  firm_id: string;
  category: VoucherCategory;
  voucher_number: string;
  voucher_date: string;
  narration?: string | null;
  party_ledger_id?: string | null;
  accounting_lines: AccountingLine[];
  inventory_lines: InventoryLine[];
}
