import { AccountGroup, LedgerTemplateType } from "@/interfaces/ledger";
import { BankSectionErrors, BankSectionMeta, LedgerFormState } from "./types";
import {
  BANK_ACCOUNT_NUMBER_REGEX,
  BANK_IFSC_REGEX,
  BANK_SWIFT_REGEX,
} from "./constants";

export function resolveTemplateType(group: AccountGroup | null): LedgerTemplateType {
  if (!group) return "default";
  if (group.name === "Bank Accounts" || group.name === "Bank OD A/c") return "bank";
  if (group.name === "Duties & Taxes") return "tax";
  if (
    group.name === "Sundry Debtors" ||
    group.name === "Sundry Creditors" ||
    group.parent_name === "Current Liabilities" ||
    group.parent_name === "Current Assets"
  ) {
    return "party";
  }
  return "default";
}

export function validateBankSection(
  bankDetails: LedgerFormState["bank_details"],
  bankMeta: BankSectionMeta,
): BankSectionErrors {
  const errors: BankSectionErrors = {};

  if (!bankMeta.transaction_type.trim()) {
    errors.transaction_type = "Select a transaction type.";
  }

  const accountNumber = bankDetails.account_number.trim().toUpperCase();
  if (!accountNumber) {
    errors.account_number = "Account number is required.";
  } else if (!BANK_ACCOUNT_NUMBER_REGEX.test(accountNumber)) {
    errors.account_number = "Use 9 to 18 alphanumeric characters for the account number.";
  }

  const ifscCode = bankDetails.ifsc_code.trim().toUpperCase();
  if (!ifscCode) {
    errors.ifsc_code = "IFSC code is required.";
  } else if (!BANK_IFSC_REGEX.test(ifscCode)) {
    errors.ifsc_code = "Enter a valid IFSC code, for example SBIN0001234.";
  }

  if (!bankDetails.bank_name.trim()) {
    errors.bank_name = "Bank name is required.";
  }

  if (bankMeta.international_account) {
    const swiftCode = bankDetails.swift_code.trim().toUpperCase();
    if (!swiftCode) {
      errors.swift_code = "SWIFT code is required for international accounts.";
    } else if (!BANK_SWIFT_REGEX.test(swiftCode)) {
      errors.swift_code = "Enter a valid SWIFT/BIC code (8 or 11 alphanumeric characters).";
    }
  }

  return errors;
}
