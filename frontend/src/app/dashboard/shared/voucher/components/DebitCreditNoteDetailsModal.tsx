import { FormState } from "../types";
import { Dispatch, SetStateAction, useState, useEffect } from "react";
import { ConfirmModal } from "../../WorkspaceUi";
import { DatePicker } from "../../../components/DatePicker";

type DebitCreditNoteDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  onAutoFill: (invoiceNo: string) => void;
  isCreditNote: boolean;
  onVerifyInvoice?: (invoiceNo: string) => Promise<boolean>;
};

export function DebitCreditNoteDetailsModal({
  open,
  onClose,
  form,
  setForm,
  onAutoFill,
  isCreditNote,
  onVerifyInvoice,
}: DebitCreditNoteDetailsModalProps) {
  const [localInvoiceNo, setLocalInvoiceNo] = useState(form.original_invoice_number || "");
  const [localInvoiceDate, setLocalInvoiceDate] = useState(form.original_invoice_date || "");
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (open) {
      setLocalInvoiceNo(form.original_invoice_number || "");
      setLocalInvoiceDate(form.original_invoice_date || "");
      setShowConfirm(false);
      setErrorMsg("");
    }
  }, [open, form.original_invoice_number, form.original_invoice_date]);

  if (!open) return null;

  const handleInitialSave = async () => {
    setErrorMsg("");
    setForm((prev) => ({
      ...prev,
      original_invoice_number: localInvoiceNo,
      original_invoice_date: localInvoiceDate,
    }));

    if (localInvoiceNo && onVerifyInvoice) {
      setIsVerifying(true);
      try {
        const isValid = await onVerifyInvoice(localInvoiceNo);
        if (isValid) {
          setShowConfirm(true);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to verify invoice");
      } finally {
        setIsVerifying(false);
      }
    } else if (localInvoiceNo) {
      setShowConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmAutoFill = () => {
    onAutoFill(localInvoiceNo);
    setShowConfirm(false);
    onClose();
  };

  const handleCancelAutoFill = () => {
    setShowConfirm(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 sm:p-6 backdrop-blur-sm">
        <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl flex flex-col max-h-full">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50 rounded-t-2xl">
            <h2 className="text-lg font-bold text-slate-800">
              Original Invoice Details
            </h2>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto">
            <div className="space-y-6">
              {errorMsg && (
                <div className="rounded-md bg-red-50 p-4 border border-red-100">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">{errorMsg}</h3>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-700">
                    Original Invoice No.<span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 font-semibold text-slate-900 shadow-sm outline-none transition focus:border-tally-500 focus:ring-2 focus:ring-tally-500/20"
                    placeholder="e.g. INV-001"
                    value={localInvoiceNo}
                    onChange={(e) => setLocalInvoiceNo(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-700">Original Invoice Date</label>
                  <DatePicker
                    value={localInvoiceDate}
                    onChange={(val) => setLocalInvoiceDate(val)}
                  />
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider text-center">Dispatch Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600">Tracking No(s):</label>
                    <input type="text" className="h-9 rounded-md border border-slate-300 px-2.5 text-sm outline-none focus:border-tally-500 focus:ring-1 focus:ring-tally-500/20" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600">Carrier Agent:</label>
                    <input type="text" className="h-9 rounded-md border border-slate-300 px-2.5 text-sm outline-none focus:border-tally-500 focus:ring-1 focus:ring-tally-500/20" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600">LR/RR No.:</label>
                    <input type="text" className="h-9 rounded-md border border-slate-300 px-2.5 text-sm outline-none focus:border-tally-500 focus:ring-1 focus:ring-tally-500/20" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600">Motor Vehicle:</label>
                    <input type="text" className="h-9 rounded-md border border-slate-300 px-2.5 text-sm outline-none focus:border-tally-500 focus:ring-1 focus:ring-tally-500/20" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-3 text-center italic">Dispatch details are optional and will not be saved permanently in this demo.</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-[15px] font-bold text-slate-700 transition hover:bg-slate-200"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isVerifying}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-[15px] font-bold text-white shadow-sm transition hover:bg-emerald-700 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleInitialSave}
            >
              {isVerifying ? "Verifying..." : "Save & Continue"}
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        title="Auto-fill Details?"
        message={`Do you want to auto-fill ${isCreditNote ? "credit" : "debit"} note items and details according to the original invoice bill?`}
        confirmLabel="Yes, Auto-fill"
        cancelLabel="No, Skip"
        isDanger={false}
        onConfirm={handleConfirmAutoFill}
        onCancel={handleCancelAutoFill}
      />
    </>
  );
}
