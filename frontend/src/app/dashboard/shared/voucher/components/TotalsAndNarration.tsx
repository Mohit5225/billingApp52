import { Dispatch, SetStateAction } from "react";
import { FormState, TaxMode, VoucherMeta } from "../types";
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
};

export function TotalsAndNarration({
  meta,
  form,
  setForm,
  readOnly,
  taxMode,
  invoiceTotals,
}: TotalsAndNarrationProps) {
  return (
    <div className="shrink-0 mt-auto flex flex-col-reverse border-b border-slate-100 bg-white sm:grid sm:grid-cols-2 sm:items-start">
      {/* Narration */}
      <div className="border-t border-slate-100 p-5 sm:border-r sm:border-t-0 sm:p-6 flex flex-col">
        <label className="mb-2 block text-base font-semibold uppercase tracking-wider text-slate-500">
          Narration
        </label>
        <div className="relative">
          <textarea
            data-escape-target="true"
            disabled={readOnly}
            maxLength={250}
            className="min-h-[80px] w-full rounded-lg border border-slate-500 bg-white p-3 pb-8 text-base text-slate-700 outline-none transition-all placeholder:text-slate-400 hover:border-tally-400 focus:border-tally-500 focus:ring-2 focus:ring-tally-500/[0.18]"
            placeholder="Enter narration for this voucher…"
            value={form.narration}
            onChange={(e) => setForm((prev) => ({ ...prev, narration: e.target.value }))}
          />
          <div className="absolute bottom-3 right-3 text-xs text-slate-400">
            {form.narration.length} / 250
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="p-5 sm:p-6">
        {meta.family === "invoice" ? (
          <div className="ml-auto w-full sm:max-w-md">
            <div className="space-y-1 px-2">
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-slate-500">Taxable Amount</span>
                <span className="mono-num text-sm font-semibold text-slate-900">
                  {formatCurrency(invoiceTotals.taxable)}
                </span>
              </div>

              {taxMode === "inter" && invoiceTotals.igst > 0 && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-500">IGST</span>
                  <span className="mono-num text-sm font-semibold text-slate-900">
                    {formatCurrency(invoiceTotals.igst)}
                  </span>
                </div>
              )}
              {taxMode === "intra" && (invoiceTotals.cgst > 0 || invoiceTotals.sgst > 0) && (
                <>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-slate-500">CGST</span>
                    <span className="mono-num text-sm font-semibold text-slate-900">
                      {formatCurrency(invoiceTotals.cgst)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-slate-500">SGST</span>
                    <span className="mono-num text-sm font-semibold text-slate-900">
                      {formatCurrency(invoiceTotals.sgst)}
                    </span>
                  </div>
                </>
              )}
              {invoiceTotals.cess > 0 && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-500">Cess</span>
                  <span className="mono-num text-sm font-semibold text-slate-900">
                    {formatCurrency(invoiceTotals.cess)}
                  </span>
                </div>
              )}

              {invoiceTotals.igst === 0 &&
                invoiceTotals.cgst === 0 &&
                invoiceTotals.sgst === 0 &&
                invoiceTotals.cess === 0 && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-slate-500">Total Tax (0%)</span>
                    <span className="mono-num text-sm font-semibold text-slate-900">₹0.00</span>
                  </div>
                )}
            </div>
            <div className="mt-3 border-t border-dashed border-slate-500 px-2 pt-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-700">
                  <svg className="h-5 w-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Grand Total
                </span>
                <span className="mono-num text-xl font-bold text-emerald-700">
                  {formatCurrency(invoiceTotals.grandTotal)}
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
