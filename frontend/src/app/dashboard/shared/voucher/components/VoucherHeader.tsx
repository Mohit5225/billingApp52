import Link from "next/link";
import { Dispatch, SetStateAction } from "react";
import { FormState } from "../types";

type VoucherHeaderProps = {
  meta: { title: string };
  isEditing: boolean;
  readOnly: boolean;
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  globalFromDate: string;
  globalToDate: string;
};

export function VoucherHeader({
  meta,
  isEditing,
  readOnly,
  form,
  setForm,
  globalFromDate,
  globalToDate,
}: VoucherHeaderProps) {
  return (
    <div className="relative shrink-0 border-b border-slate-500 bg-white px-4 py-4 sm:px-6 sm:py-5 flex flex-row flex-wrap items-center justify-between gap-y-4 md:flex-nowrap md:justify-start md:gap-x-8">
      {/* Title and Badges */}
      <div className="flex flex-col gap-1 order-1 w-full md:w-auto md:flex-none items-center sm:items-start text-center sm:text-left mt-2 sm:mt-0">
        <div className="flex items-center justify-center sm:justify-start gap-3">
          <h1 className="text-2.5xl sm:text-2xl font-bold tracking-tight text-slate-900 whitespace-nowrap">
            {meta.title}
          </h1>
          {!isEditing ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-600">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              Draft
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-base font-semibold text-amber-600 ring-1 ring-inset ring-amber-500/20">
              Editing
            </span>
          )}
        </div>
        <p className="hidden sm:block text-xs sm:text-sm text-slate-500">
          Create and manage your {meta.title.toLowerCase()}
        </p>
      </div>

      {/* Elegant close / dashboard button */}
      <Link
        href="/dashboard"
        data-skip-enter="true"
        className="absolute right-4 top-4 sm:static sm:right-auto sm:top-auto group flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50/40 text-emerald-700 shadow-sm transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 active:scale-95 order-2 md:order-3 md:ml-auto"
        title="Back to Dashboard"
      >
        <svg
          className="h-4.5 w-4.5 transition-transform duration-300 group-hover:rotate-90"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </Link>

      {/* Inputs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto order-3 md:order-2 md:ml-12">
        <div className="flex flex-col gap-1.5 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-600">Invoice No.</label>
          <input
            className="h-10 w-full sm:w-auto sm:min-w-[140px] sm:max-w-[300px] rounded-lg border border-slate-500 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-tally-500 focus:ring-1 focus:ring-tally-500 disabled:opacity-60 disabled:bg-slate-50"
            placeholder="e.g. 1"
            size={Math.max(14, form.voucher_number.length + 2)}
            value={form.voucher_number}
            onChange={(e) => setForm((prev) => ({ ...prev, voucher_number: e.target.value }))}
            disabled={readOnly}
            data-mandatory="true"
          />
        </div>
        <div className="flex flex-col gap-1.5 w-full sm:w-40">
          <label className="text-xs font-semibold text-slate-600">Invoice Date</label>
          <input
            type="date"
            className="h-10 w-full rounded-lg border border-slate-500 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-tally-500 focus:ring-1 focus:ring-tally-500 disabled:opacity-60 disabled:bg-slate-50"
            value={form.voucher_date}
            min={globalFromDate}
            max={globalToDate}
            onChange={(e) => setForm((prev) => ({ ...prev, voucher_date: e.target.value }))}
            disabled={readOnly}
            data-mandatory="true"
          />
        </div>
      </div>
    </div>
  );
}
