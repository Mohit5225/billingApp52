import { BaseEntity } from "./base";
import { DrCrType } from "./ledger";

export type VoucherCategory =
  | "Sales"
  | "Purchase"
  | "Receipt"
  | "Payment"
  | "Contra"
  | "Journal"
  | "Debit Note"
  | "Credit Note";

export type BillRefType = "New Ref" | "Agst Ref" | "Advance" | "On Account";

export interface BillAllocationCreate {
  ref_type: BillRefType;
  ref_name: string;
  amount: number;
  amount_type: DrCrType;
  due_date?: string | null;
}

export interface BillAllocation extends BillAllocationCreate {
  id: string;
  voucher_id: string;
  firm_id: string;
  party_ledger_id: string;
  accounting_line_id: string;
}

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
  igst_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  item_name?: string;
  hsn_code?: string;
  uom?: string;
  taxability?: string;
}

export interface Voucher extends BaseEntity {
  firm_id: string;
  category: VoucherCategory;
  voucher_number: string;
  voucher_date: string;
  narration?: string | null;
  party_ledger_id?: string | null;
  is_cancelled: boolean;
  original_invoice_number?: string | null;
  original_invoice_date?: string | null;
  discount_type?: "percentage" | "amount";
}

export interface VoucherDetail extends Voucher {
  accounting_lines: AccountingLine[];
  inventory_lines: InventoryLine[];
  bill_allocations: BillAllocation[];
}

export interface VoucherWritePayload {
  firm_id: string;
  category: VoucherCategory;
  voucher_number: string;
  voucher_date: string;
  narration?: string | null;
  party_ledger_id?: string | null;
  original_invoice_number?: string | null;
  original_invoice_date?: string | null;
  discount_type?: "percentage" | "amount";
  accounting_lines: AccountingLine[];
  inventory_lines: InventoryLine[];
  bill_allocations?: BillAllocationCreate[];
}
