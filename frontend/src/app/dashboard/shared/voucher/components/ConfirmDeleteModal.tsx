import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/format";

type ConfirmDeleteModalProps = {
  isOpen: boolean;
  itemName: string;
  itemAmount: number;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmDeleteModal({ isOpen, itemName, itemAmount, onClose, onConfirm }: ConfirmDeleteModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-[2px] px-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[20px] w-full max-w-[340px] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header with Close Button */}
        <div className="flex justify-end p-4 pb-0">
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="px-6 pb-6">
          <h3 className="text-[22px] font-bold text-slate-900 mb-2 tracking-tight">Remove Item?</h3>
          <p className="text-[15px] text-slate-600 leading-snug mb-5">
            Are you sure you want to remove <br/>
            <span className="font-bold text-orange-600">{itemName}</span> from the invoice?
          </p>
          
          {/* Item Preview Card */}
          <div className="flex items-center p-3 rounded-xl border border-slate-200 mb-5 gap-3">
            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] bg-orange-50 text-orange-500">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-bold text-slate-900 leading-tight mb-0.5">{itemName}</span>
              <span className="text-[14px] font-medium text-slate-700 leading-tight">{formatCurrency(itemAmount)}</span>
            </div>
          </div>
          
          {/* Warning Message */}
          <div className="flex items-center gap-2 mb-6 text-orange-500">
            <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-[14px] text-slate-600">This action cannot be undone.</span>
          </div>

          <div className="flex w-full gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold active:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 rounded-xl bg-[#dc4c47] text-white font-semibold active:bg-[#c93a35] shadow-sm transition-colors"
            >
              Remove Item
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
