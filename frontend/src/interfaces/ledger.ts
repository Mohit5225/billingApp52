import { BaseEntity } from "./base";

export type DrCrType = "Dr" | "Cr";
export type AccountNature = "Asset" | "Liability" | "Income" | "Expense";
export type LedgerTemplateType = "default" | "bank" | "party" | "tax";

export interface AccountGroup extends BaseEntity {
  firm_id: string | null;
  name: string;
  alias?: string | null;
  nature: AccountNature;
  is_primary: boolean;
  parent_id: string | null;
  parent_name?: string | null;
  affects_gross_profit: boolean;
  is_control_account: boolean;
  is_system: boolean;
  sort_order: number;
}

export interface LedgerBankDetails {
  ledger_id?: string;
  account_number?: string | null;
  ifsc_code?: string | null;
  swift_code?: string | null;
  bank_name?: string | null;
  branch_name?: string | null;
}

export interface LedgerPartyDetails {
  ledger_id?: string;
  maintain_bill_by_bill: boolean;
  default_credit_days?: number | null;
  mailing_name?: string | null;
  address?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  pan_number?: string | null;
  gst_registration_type?: "Regular" | "Composition" | "Unregistered" | "Consumer" | null;
  gstin?: string | null;
}

export interface LedgerTaxDetails {
  ledger_id?: string;
  duty_tax_type?: "GST" | "TDS" | "TCS" | "VAT" | "Others" | null;
  tax_percentage?: number | null;
}

export interface Ledger extends BaseEntity {
  firm_id: string;
  group_id: string;
  name: string;
  alias?: string | null;
  opening_balance: number;
  opening_balance_type: DrCrType;
  inventory_values_affected: boolean;
  cost_centre_applicable: boolean;
  is_system: boolean;
}

export interface LedgerDetail extends Ledger {
  group_name?: string | null;
  group_parent_name?: string | null;
  group_nature?: AccountNature | null;
  template_type: LedgerTemplateType;
  bank_details?: LedgerBankDetails | null;
  party_details?: LedgerPartyDetails | null;
  tax_details?: LedgerTaxDetails | null;
}

export interface LedgerStatementRow {
  voucher_id: string;
  voucher_number: string;
  voucher_date: string;
  category: string;
  particulars: string;
  narration?: string | null;
  debit_amount: number;
  credit_amount: number;
  balance_amount: number;
  balance_type: DrCrType;
}

export interface LedgerStatement {
  ledger: LedgerDetail;
  opening_balance: number;
  opening_balance_type: DrCrType;
  rows: LedgerStatementRow[];
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  closing_balance_type: DrCrType;
}

export interface LedgerWritePayload {
  firm_id: string;
  group_id: string;
  name: string;
  alias?: string | null;
  opening_balance: number;
  opening_balance_type: DrCrType;
  inventory_values_affected: boolean;
  cost_centre_applicable: boolean;
  bank_details?: LedgerBankDetails | null;
  party_details?: LedgerPartyDetails | null;
  tax_details?: LedgerTaxDetails | null;
}

export type LedgerUpdatePayload = Partial<Omit<LedgerWritePayload, "firm_id">> & {
  bank_details?: LedgerBankDetails | null;
  party_details?: LedgerPartyDetails | null;
  tax_details?: LedgerTaxDetails | null;
};
