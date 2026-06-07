"use client";

import { SurfaceCard } from "@/app/dashboard/shared/WorkspaceUi";
import { Field, Input, Select } from "./LedgerFormPrimitives";
import { LedgerFormState, SelectFieldChangeEvent, TextFieldChangeEvent } from "../types";

interface Props {
  form: LedgerFormState;
  setForm: React.Dispatch<React.SetStateAction<LedgerFormState>>;
}

export function LedgerTaxSection({ form, setForm }: Props) {
  function updateTax(patch: Partial<LedgerFormState["tax_details"]>) {
    setForm((prev) => ({ ...prev, tax_details: { ...prev.tax_details, ...patch } }));
  }

  return (
    <SurfaceCard
      title="Tax Details"
      description="Configure duty type and calculation percentage."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Duty/Tax Type">
          <Select
            value={form.tax_details.duty_tax_type}
            onChange={(e: SelectFieldChangeEvent) =>
              updateTax({
                duty_tax_type: e.target.value as LedgerFormState["tax_details"]["duty_tax_type"],
              })
            }
          >
            <option value="">Select type...</option>
            <option value="GST">GST</option>
            <option value="TDS">TDS</option>
            <option value="TCS">TCS</option>
            <option value="VAT">VAT</option>
            <option value="Others">Others</option>
          </Select>
        </Field>
        <Field label="Tax Percentage">
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={form.tax_details.tax_percentage || ""}
            onChange={(e: TextFieldChangeEvent) =>
              updateTax({ tax_percentage: Number(e.target.value) })
            }
          />
        </Field>
      </div>
    </SurfaceCard>
  );
}
