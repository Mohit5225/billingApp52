import { BaseEntity } from "./base";

export type DrCrType = "Dr" | "Cr";

export type AccountNature = "Asset" | "Liability" | "Income" | "Expense";

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

export type LedgerCreate = Omit<Ledger, "id" | "created_at" | "updated_at" | "is_system">;