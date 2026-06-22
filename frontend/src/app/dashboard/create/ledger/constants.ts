import { LedgerFormState, BankSectionMeta } from "./types";

export const EMPTY_FORM: LedgerFormState = {
  name: "",
  alias: "",
  group_id: "",
  type_of_ledger: "Not Applicable",
  rounding_method: null,
  rounding_limit: 1,
  opening_balance: 0,
  opening_balance_type: "Dr",
  inventory_values_affected: false,
  cost_centre_applicable: false,
  bank_details: {
    account_number: "",
    ifsc_code: "",
    swift_code: "",
    bank_name: "",
    branch_name: "",
  },
  party_details: {
    maintain_bill_by_bill: false,
    default_credit_days: 0,
    mailing_name: "",
    address: "",
    state: "",
    country: "India",
    pincode: "",
    pan_number: "",
    gst_registration_type: "",
    gstin: "",
  },
  tax_details: {
    duty_tax_type: "",
    tax_percentage: 0,
  },
};

export const EMPTY_BANK_META: BankSectionMeta = {
  transaction_type: "Cheque / DD",
  international_account: false,
};

export const BANK_ACCOUNT_NUMBER_REGEX = /^[A-Z0-9]{9,18}$/;
export const BANK_IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const BANK_SWIFT_REGEX = /^[A-Z0-9]{8}([A-Z0-9]{3})?$/;

export const DR_GROUPS = [
  "Sundry Debtors",
  "Bank Accounts",
  "Cash-in-Hand",
  "Direct Expenses",
  "Indirect Expenses",
  "Purchase Accounts",
];

export const CR_GROUPS = [
  "Sundry Creditors",
  "Loans (Liability)",
  "Loans (Liabilities)",
  "Duties & Taxes",
  "Duties and Taxes",
  "Sales Accounts",
];
