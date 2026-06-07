"use client";

import { AccountGroup } from "@/interfaces/ledger";
import { SurfaceCard } from "@/app/dashboard/shared/WorkspaceUi";
import { Field, Input, Select } from "./LedgerFormPrimitives";
import { LedgerFormState, SelectFieldChangeEvent, TextFieldChangeEvent } from "../types";

interface Props {
  form: LedgerFormState;
  setForm: React.Dispatch<React.SetStateAction<LedgerFormState>>;
  groups: AccountGroup[];
  isLoading: boolean;
}

export function LedgerCoreSection({ form, setForm, groups, isLoading }: Props) {
  const selectedGroup = groups.find((g) => g.id === form.group_id) ?? null;

  return (
    <SurfaceCard
      title="Core Details"
      description="Start with the ledger identity, group, and opening balance."
    >
      <div className="space-y-6">
        <Field label="Ledger Name *">
          <Input
            placeholder="e.g. Mahalakshmi Enterprises"
            value={form.name}
            onChange={(e: TextFieldChangeEvent) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
          />
        </Field>

        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Alias">
            <Input
              placeholder="Optional short name"
              value={form.alias}
              onChange={(e: TextFieldChangeEvent) =>
                setForm((prev) => ({ ...prev, alias: e.target.value }))
              }
            />
          </Field>
          <Field label="Opening Balance">
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.opening_balance || ""}
                onChange={(e: TextFieldChangeEvent) =>
                  setForm((prev) => ({ ...prev, opening_balance: Number(e.target.value) }))
                }
                className="pr-12"
              />
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    opening_balance_type: prev.opening_balance_type === "Dr" ? "Cr" : "Dr",
                  }))
                }
                className="absolute inset-y-0 right-0 flex items-center px-3 text-sm font-bold text-slate-500 hover:text-slate-900 focus:outline-none transition-colors"
              >
                {form.opening_balance_type}
              </button>
            </div>
          </Field>
        </div>

        <Field label="Account Group *">
          <div className="relative">
            <Select
              value={form.group_id}
              onChange={(e: SelectFieldChangeEvent) =>
                setForm((prev) => ({ ...prev, group_id: e.target.value }))
              }
              className="pl-3 pr-24"
              disabled={isLoading}
            >
              <option value="">Select group</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
            {selectedGroup?.nature && (
              <div className="pointer-events-none absolute inset-y-0 right-10 flex items-center pr-2">
                <span className="rounded bg-[#EAF5F0] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#40916C]">
                  {selectedGroup.nature}
                </span>
              </div>
            )}
          </div>
        </Field>

        {selectedGroup &&
          (selectedGroup.name === "Purchase Accounts" ||
            selectedGroup.name === "Sales Accounts") && (
            <>
              <Field label="Type of Ledger">
                <Select
                  value={form.type_of_ledger || "Not Applicable"}
                  onChange={(e: SelectFieldChangeEvent) =>
                    setForm((prev) => ({
                      ...prev,
                      type_of_ledger: e.target.value as LedgerFormState["type_of_ledger"],
                      rounding_method: e.target.value === "Invoice Rounding" ? "Normal Rounding" : null,
                      rounding_limit: e.target.value === "Invoice Rounding" ? 1 : 0,
                    }))
                  }
                >
                  <option value="Not Applicable">Not Applicable</option>
                  <option value="Invoice Rounding">Invoice Rounding</option>
                </Select>
              </Field>

              {form.type_of_ledger === "Invoice Rounding" && (
                <div className="grid gap-6 md:grid-cols-2 mt-4">
                  <Field label="Rounding method">
                    <Select
                      value={form.rounding_method || "Normal Rounding"}
                      onChange={(e: SelectFieldChangeEvent) =>
                        setForm((prev) => ({
                          ...prev,
                          rounding_method: e.target.value as LedgerFormState["rounding_method"],
                        }))
                      }
                    >
                      <option value="Downward Rounding">Downward Rounding</option>
                      <option value="Normal Rounding">Normal Rounding</option>
                      <option value="Upward Rounding">Upward Rounding</option>
                    </Select>
                  </Field>
                  <Field label="Rounding limit">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={form.rounding_limit}
                      onChange={(e: TextFieldChangeEvent) =>
                        setForm((prev) => ({
                          ...prev,
                          rounding_limit: Number(e.target.value),
                        }))
                      }
                    />
                  </Field>
                </div>
              )}
            </>
          )}
      </div>
    </SurfaceCard>
  );
}
