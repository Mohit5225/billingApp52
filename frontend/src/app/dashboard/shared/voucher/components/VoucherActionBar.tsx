import Link from "next/link";
import { VoucherMeta } from "../types";

type VoucherActionBarProps = {
  meta: VoucherMeta;
  isEditing: boolean;
  readOnly: boolean;
  isSubmitting: boolean;
  isLoading: boolean;
  voucherId?: string;
  onCancel: () => void;
  onSubmit: () => void;
  onPreview: () => void;
  onOpenNoteDetails?: () => void;
};

export function VoucherActionBar({
  meta,
  isEditing,
  readOnly,
  isSubmitting,
  isLoading,
  voucherId,
  onCancel,
  onSubmit,
  onPreview,
  onOpenNoteDetails,
}: VoucherActionBarProps) {
  return (
    <div className="shrink-0 flex items-center justify-between border-t border-slate-500 bg-white px-5 py-4 sm:px-7 sm:py-5">
      {/* Mobile cancel */}
      <button
        type="button"
        data-skip-enter="true"
        onClick={onCancel}
        className="text-sm font-medium text-slate-600 hover:text-slate-900 sm:hidden"
      >
        Cancel
      </button>
      <div className="hidden sm:block" />
      <div className="flex items-center gap-3">
        {onOpenNoteDetails && isEditing && (meta.category === "Debit Note" || meta.category === "Credit Note") && (
          <button
            type="button"
            onClick={onOpenNoteDetails}
            className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 sm:px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition-all hover:bg-emerald-100 hover:shadow"
          >
            <svg className="h-4 w-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">Edit Original Invoice Details</span>
            <span className="sm:hidden">Orig. Inv.</span>
          </button>
        )}
        {meta.family === "invoice" && (
          <button
            data-entry-action="true"
            onClick={onPreview}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-500 bg-white p-3 sm:px-4 sm:py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow"
            title="Preview Invoice"
          >
            <svg
              className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            <span className="hidden sm:inline">Preview</span>
          </button>
        )}
        <button
          data-entry-action="true"
          onClick={onCancel}
          className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-500 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow"
        >
          <svg
            className="h-4 w-4 shrink-0 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancel
        </button>
        {!readOnly ? (
          <button
            data-entry-action="true"
            disabled={isSubmitting || isLoading}
            onClick={onSubmit}
            className="group relative flex items-center gap-3 overflow-hidden rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-px hover:bg-emerald-800 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Saving…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.5 3H6.5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V5.5L17.5 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 3v5H9V3m-1 11h8v6H8v-6z" />
                </svg>
                {isEditing ? "Update Voucher" : "Save Voucher"}
                <kbd className="hidden sm:flex items-center justify-center rounded bg-black/10 px-1.5 py-0.5 font-sans text-xs font-medium text-emerald-100 ring-1 ring-black/10 ml-2">
                  ⌘S
                </kbd>
              </span>
            )}
          </button>
        ) : (
          <Link
            href={`/dashboard/vouchers/${voucherId}/edit`}
            className="flex items-center gap-2 rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-px hover:bg-emerald-800 hover:shadow"
          >
            Edit Voucher
          </Link>
        )}
      </div>
    </div>
  );
}
