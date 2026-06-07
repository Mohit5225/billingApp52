"use client";

import { SurfaceCard } from "@/app/dashboard/shared/WorkspaceUi";
import { Field, Input, Select, LabeledToggle } from "./LedgerFormPrimitives";
import {
  BankSectionErrors,
  BankSectionMeta,
  LedgerFormState,
  TextFieldChangeEvent,
} from "../types";

interface Props {
  form: LedgerFormState;
  setForm: React.Dispatch<React.SetStateAction<LedgerFormState>>;
  bankMeta: BankSectionMeta;
  setBankMeta: React.Dispatch<React.SetStateAction<BankSectionMeta>>;
  bankErrors: BankSectionErrors;
  setBankErrors: React.Dispatch<React.SetStateAction<BankSectionErrors>>;
}

export function LedgerBankSection({
  form,
  setForm,
  bankMeta,
  setBankMeta,
  bankErrors,
  setBankErrors,
}: Props) {
  function updateBank(patch: Partial<LedgerFormState["bank_details"]>) {
    setForm((prev) => ({ ...prev, bank_details: { ...prev.bank_details, ...patch } }));
    setBankErrors({});
  }

  return (
    <SurfaceCard
      title="Bank Details"
      description="Specify the transaction type and related bank information."
    >
      <div className="space-y-6">
        <Field label="Transaction Type *">
          <Select
            value={bankMeta.transaction_type}
            onChange={(e) => {
              setBankMeta((prev) => ({ ...prev, transaction_type: e.target.value }));
              setBankErrors({});
            }}
          >
            <option value="">Select type...</option>
            <option value="NEFT / RTGS">NEFT / RTGS</option>
            <option value="Cheque / DD">Cheque / DD</option>
            <option value="Others">Others</option>
          </Select>
          {bankErrors.transaction_type && (
            <p className="text-xs font-medium text-red-600">{bankErrors.transaction_type}</p>
          )}
        </Field>

        <LabeledToggle
          checked={bankMeta.international_account}
          label="International / foreign currency account"
          description="Enable this when a SWIFT/BIC code is required."
          onChange={(next) => {
            setBankMeta((prev) => ({ ...prev, international_account: next }));
            setBankErrors({});
          }}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Account Number *">
            <Input
              placeholder="Account number"
              value={form.bank_details.account_number}
              inputMode="text"
              maxLength={18}
              onChange={(e: TextFieldChangeEvent) =>
                updateBank({ account_number: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })
              }
            />
            {bankErrors.account_number && (
              <p className="text-xs font-medium text-red-600">{bankErrors.account_number}</p>
            )}
          </Field>

          <Field label="IFSC Code *">
            <Input
              placeholder="IFSC code"
              value={form.bank_details.ifsc_code}
              maxLength={11}
              onChange={(e: TextFieldChangeEvent) =>
                updateBank({ ifsc_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })
              }
            />
            {bankErrors.ifsc_code && (
              <p className="text-xs font-medium text-red-600">{bankErrors.ifsc_code}</p>
            )}
          </Field>

          <Field label={bankMeta.international_account ? "SWIFT Code *" : "SWIFT Code"}>
            <Input
              placeholder="SWIFT code"
              value={form.bank_details.swift_code}
              maxLength={11}
              onChange={(e: TextFieldChangeEvent) =>
                updateBank({ swift_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })
              }
            />
            {bankErrors.swift_code && (
              <p className="text-xs font-medium text-red-600">{bankErrors.swift_code}</p>
            )}
          </Field>

          <Field label="Bank Name *">
            <Input
              placeholder="Bank name"
              value={form.bank_details.bank_name}
              onChange={(e: TextFieldChangeEvent) => updateBank({ bank_name: e.target.value })}
            />
            {bankErrors.bank_name && (
              <p className="text-xs font-medium text-red-600">{bankErrors.bank_name}</p>
            )}
          </Field>

          <Field label="Branch Name">
            <Input
              placeholder="Branch name"
              value={form.bank_details.branch_name}
              onChange={(e: TextFieldChangeEvent) => updateBank({ branch_name: e.target.value })}
            />
          </Field>
        </div>
      </div>
    </SurfaceCard>
  );
}
