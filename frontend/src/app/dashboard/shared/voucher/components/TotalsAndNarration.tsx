import { Dispatch, SetStateAction, useEffect } from "react";
import { AdditionalLedgerState, FormState, TaxMode, VoucherMeta } from "../types";
import { LedgerDetail } from "@/interfaces/ledger";
import { formatCurrency } from "@/lib/format";

type TotalsAndNarrationProps = {
  meta: VoucherMeta;
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  readOnly: boolean;
  taxMode: TaxMode;
  invoiceTotals: {
    taxable: number;
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
    grandTotal: number;
  };
  ledgers: LedgerDetail[];
};

function calculateRounding(total: number, method: string | null | undefined, limit: number | undefined): number {
  const safeLimit = Number(limit) || 1;
  if (safeLimit <= 0) return 0;
  
  const multiple = Math.round(total / safeLimit);
  const floorMultiple = Math.floor(total / safeLimit);
  const ceilMultiple = Math.ceil(total / safeLimit);
  
  let targetTotal = total;
  switch (method) {
    case "Upward Rounding":
      targetTotal = ceilMultiple * safeLimit;
      break;
    case "Downward Rounding":
      targetTotal = floorMultiple * safeLimit;
      break;
    case "Normal Rounding":
    default:
      targetTotal = multiple * safeLimit;
      break;
  }
  
  return Number((targetTotal - total).toFixed(2));
}

export function TotalsAndNarration({
  meta,
  form,
  setForm,
  readOnly,
  taxMode,
  invoiceTotals,
  ledgers,
}: TotalsAndNarrationProps) {
  const additionalLedgerOptions = ledgers.filter(
    (l) =>
      l.type_of_ledger === "Invoice Rounding" ||
      l.group_name === "Direct Expenses" ||
      l.group_name === "Indirect Expenses" ||
      l.group_parent_name === "Direct Expenses" ||
      l.group_parent_name === "Indirect Expenses"
  );

  const addAdditionalLedger = () => {
    setForm((prev) => ({
      ...prev,
      additional_ledgers: [
        ...prev.additional_ledgers,
        { ledger_id: "", amount: 0, is_manual: false },
      ],
    }));
  };

  const updateAdditionalLedger = (index: number, field: keyof AdditionalLedgerState, value: any) => {
    setForm((prev) => {
      const newLedgers = [...prev.additional_ledgers];
      newLedgers[index] = { ...newLedgers[index], [field]: value };
      if (field === "amount") {
        newLedgers[index].is_manual = true;
      } else if (field === "ledger_id") {
        // Reset manual flag if they change the ledger
        newLedgers[index].is_manual = false;
      }
      return { ...prev, additional_ledgers: newLedgers };
    });
  };

  const removeAdditionalLedger = (index: number) => {
    setForm((prev) => {
      const newLedgers = [...prev.additional_ledgers];
      newLedgers.splice(index, 1);
      return { ...prev, additional_ledgers: newLedgers };
    });
  };

  const totalAdditionalAmount = form.additional_ledgers?.reduce((sum, l) => sum + (Number(l.amount) || 0), 0) || 0;
  const finalGrandTotal = invoiceTotals.grandTotal + totalAdditionalAmount;

  // Auto-calculate rounding
  useEffect(() => {
    if (!form.additional_ledgers || form.additional_ledgers.length === 0) return;

    setForm((prev) => {
      let changed = false;
      const newLedgers = [...prev.additional_ledgers];
      
      // We calculate the running total so multiple ledgers can be applied sequentially
      let currentRunningTotal = invoiceTotals.grandTotal;

      for (let i = 0; i < newLedgers.length; i++) {
        const al = newLedgers[i];
        const lDetail = ledgers.find(l => l.id === al.ledger_id);
        
        if (lDetail && lDetail.type_of_ledger === "Invoice Rounding" && !al.is_manual) {
          const expectedAmount = calculateRounding(
            currentRunningTotal, 
            lDetail.rounding_method, 
            lDetail.rounding_limit
          );
          if (expectedAmount !== al.amount) {
            newLedgers[i] = { ...al, amount: expectedAmount };
            changed = true;
          }
        }
        
        // Add this ledger's amount to running total for the next ledger to evaluate against
        currentRunningTotal += (Number(newLedgers[i].amount) || 0);
      }

      if (changed) {
        return { ...prev, additional_ledgers: newLedgers };
      }
      return prev;
    });
  }, [invoiceTotals.grandTotal, ledgers, form.additional_ledgers, setForm]);

  return (
    <div
      className={`shrink-0 mt-auto flex flex-col-reverse border-b border-slate-200 bg-white sm:grid sm:grid-cols-2 ${
        form.additional_ledgers && form.additional_ledgers.length > 0 ? "border-t border-slate-400" : ""
      }`}
    >
      {/* Narration */}
      <div className="p-5 sm:p-6 flex flex-col justify-end">
        <div className="mt-auto">
          <label className="mb-2 block text-[17px] font-extrabold uppercase tracking-wider text-slate-800">
            Narration
          </label>
          <div className="relative">
          <textarea
            data-escape-target="true"
            disabled={readOnly}
            maxLength={250}
            className="min-h-[80px] w-full rounded-lg border border-slate-400 bg-white p-3 pb-8 text-[17px] font-semibold text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 hover:border-tally-400 focus:border-tally-500 focus:ring-2 focus:ring-tally-500/20"
            placeholder="Enter narration for this voucher…"
            value={form.narration}
            onChange={(e) => setForm((prev) => ({ ...prev, narration: e.target.value }))}
          />
          <div className="absolute bottom-3 right-3 text-xs text-slate-400">
            {form.narration.length} / 250
          </div>
        </div>
        </div>
      </div>

      {/* Totals */}
      <div className="p-5 sm:p-6">
        {meta.family === "invoice" ? (
          <div className="ml-auto w-full sm:max-w-md">
            <div className="space-y-1 px-2">
              <div className="flex items-center justify-between py-1">
                <span className="text-[15px] font-bold text-slate-600">Taxable Amount</span>
                <span className="mono-num text-[17px] font-bold text-slate-900">
                  {formatCurrency(invoiceTotals.taxable)}
                </span>
              </div>

              {taxMode === "inter" && invoiceTotals.igst > 0 && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-[15px] font-bold text-slate-600">IGST</span>
                  <span className="mono-num text-[17px] font-bold text-slate-900">
                    {formatCurrency(invoiceTotals.igst)}
                  </span>
                </div>
              )}
              {taxMode === "intra" && (invoiceTotals.cgst > 0 || invoiceTotals.sgst > 0) && (
                <>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[15px] font-bold text-slate-600">CGST</span>
                    <span className="mono-num text-[17px] font-bold text-slate-900">
                      {formatCurrency(invoiceTotals.cgst)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[15px] font-bold text-slate-600">SGST</span>
                    <span className="mono-num text-[17px] font-bold text-slate-900">
                      {formatCurrency(invoiceTotals.sgst)}
                    </span>
                  </div>
                </>
              )}
              {invoiceTotals.cess > 0 && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-[15px] font-bold text-slate-600">Cess</span>
                  <span className="mono-num text-[17px] font-bold text-slate-900">
                    {formatCurrency(invoiceTotals.cess)}
                  </span>
                </div>
              )}

              {invoiceTotals.igst === 0 &&
                invoiceTotals.cgst === 0 &&
                invoiceTotals.sgst === 0 &&
                invoiceTotals.cess === 0 && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[15px] font-bold text-slate-600">Total Tax (0%)</span>
                    <span className="mono-num text-[17px] font-bold text-slate-900">₹0.00</span>
                  </div>
                )}

              {/* Additional Ledgers */}
              {form.additional_ledgers?.map((al, idx) => (
                <div key={idx} className="flex items-center justify-between py-1.5 gap-3 group relative">
                  <div className="flex-1 relative">
                    <select
                      disabled={readOnly}
                      value={al.ledger_id}
                      onChange={(e) => updateAdditionalLedger(idx, "ledger_id", e.target.value)}
                      className="h-10 w-full appearance-none rounded-lg border border-slate-400 bg-white pl-3 pr-8 text-[15px] font-semibold text-slate-800 shadow-sm outline-none transition focus:border-tally-500 focus:ring-2 focus:ring-tally-500/20 disabled:opacity-60 disabled:bg-slate-50 cursor-pointer"
                    >
                      <option value="">Select Ledger…</option>
                      {additionalLedgerOptions.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-[15px]">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      disabled={readOnly}
                      value={al.amount || ""}
                      onChange={(e) => updateAdditionalLedger(idx, "amount", parseFloat(e.target.value))}
                      placeholder="0.00"
                      className="h-10 w-[110px] sm:w-[130px] rounded-lg border border-slate-400 bg-white pl-8 pr-3 text-right text-[16px] font-bold text-slate-900 shadow-sm outline-none transition focus:border-tally-500 focus:ring-2 focus:ring-tally-500/20 disabled:opacity-60 disabled:bg-slate-50 mono-num"
                    />
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => removeAdditionalLedger(idx)}
                      title="Remove Ledger"
                      className="absolute -right-8 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              {!readOnly && (
                <button
                  type="button"
                  onClick={addAdditionalLedger}
                  className="mt-1 text-[15px] font-bold text-tally-600 hover:text-tally-700 flex items-center gap-1"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Ledger
                </button>
              )}
            </div>
            <div className="mt-3 border-t border-dashed border-slate-300 px-2 pt-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[15px] font-extrabold uppercase tracking-wider text-emerald-700">
                  <svg className="h-5 w-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Grand Total
                </span>
                <span className="mono-num text-[22px] font-extrabold text-emerald-700">
                  {formatCurrency(finalGrandTotal)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-end justify-end">
            <p className="text-base text-slate-400">Total impact will be computed from accounting lines.</p>
          </div>
        )}
      </div>
    </div>
  );
}
