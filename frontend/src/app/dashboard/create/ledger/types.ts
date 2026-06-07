import { AccountGroup, DrCrType, LedgerTemplateType } from "@/interfaces/ledger";

export type LedgerFormState = {
  name: string;
  alias: string;
  group_id: string;
  opening_balance: number;
  opening_balance_type: DrCrType;
  inventory_values_affected: boolean;
  cost_centre_applicable: boolean;
  bank_details: {
    account_number: string;
    ifsc_code: string;
    swift_code: string;
    bank_name: string;
    branch_name: string;
  };
  party_details: {
    maintain_bill_by_bill: boolean;
    default_credit_days: number;
    mailing_name: string;
    address: string;
    state: string;
    country: string;
    pincode: string;
    pan_number: string;
    gst_registration_type: "" | "Regular" | "Composition" | "Unregistered" | "Consumer";
    gstin: string;
  };
  tax_details: {
    duty_tax_type: "" | "GST" | "TDS" | "TCS" | "VAT" | "Others";
    tax_percentage: number;
  };
};

export type BankSectionMeta = {
  transaction_type: string;
  international_account: boolean;
};

export type BankSectionErrors = Partial<{
  transaction_type: string;
  account_number: string;
  ifsc_code: string;
  swift_code: string;
  bank_name: string;
}>;

export type TextFieldChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
export type SelectFieldChangeEvent = React.ChangeEvent<HTMLSelectElement>;
