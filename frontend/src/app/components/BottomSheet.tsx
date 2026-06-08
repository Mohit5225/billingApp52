"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export default function BottomSheet({ isOpen, onClose, children, title }: BottomSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
      document.body.style.overflow = "hidden";
    } else {
      const timer = setTimeout(() => setShow(false), 300); // Wait for exit animation
      document.body.style.overflow = "";
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!mounted || (!isOpen && !show)) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center sm:justify-center">
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`} 
        onClick={onClose}
      />
      
      {/* Sheet / Modal */}
      <div 
        className={`relative w-full sm:w-[400px] sm:max-w-[90vw] transform bg-white sm:rounded-[32px] rounded-t-[32px] shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col max-h-[85vh] ${isOpen ? "translate-y-0 sm:scale-100" : "translate-y-full sm:translate-y-8 sm:scale-95"}`}
      >
        {/* Mobile drag handle indicator */}
        <div className="absolute left-1/2 top-3 -translate-x-1/2 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />
        
        {title && (
          <div className="flex shrink-0 items-center justify-between px-6 pb-4 pt-8 sm:pt-6 border-b border-slate-100">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100 text-slate-500 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
