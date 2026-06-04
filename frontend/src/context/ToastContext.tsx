"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

export type ToastType = "error" | "success" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  isExiting?: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_TITLES: Record<ToastType, string> = {
  success: "Success",
  error: "Error Occurred",
  warning: "Warning",
  info: "Notification"
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "error") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      hideToast(id);
    }, 5000);
  }, [hideToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {mounted && createPortal(
        <div className="fixed top-6 left-1/2 z-[9999] flex w-full max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col gap-4 pointer-events-none sm:w-[420px]">
          {toasts.map((toast) => {
            let titleText = toast.message;
            let bodyText = TOAST_TITLES[toast.type];

            if (toast.message.includes("\n")) {
              const parts = toast.message.split("\n");
              titleText = parts[0];
              bodyText = parts.slice(1).join("\n");
            } else {
              const voucherMatch = toast.message.match(/Voucher number '(.*?)' already exists for category '(.*?)'\./i);
              if (voucherMatch) {
                titleText = `Voucher #${voucherMatch[1]} already exists`;
                bodyText = `${voucherMatch[2]} • Duplicate Number`;
              }
            }

            return (
              <div
                key={toast.id}
                className={`pointer-events-auto relative flex w-full items-center gap-3 overflow-hidden rounded-xl bg-[#18181b] p-3 shadow-xl transition-all duration-300 sm:gap-4 sm:p-4 sm:rounded-2xl ${
                  toast.isExiting ? "animate-toast-exit" : "animate-toast-enter"
                }`}
              >
                {/* Icon */}
                <div className="flex shrink-0 items-center justify-center">
                  {toast.type === "error" && (
                    <svg className="h-5 w-5 text-rose-500 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                  {toast.type === "success" && (
                    <svg className="h-5 w-5 text-emerald-500 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {toast.type === "info" && (
                    <svg className="h-5 w-5 text-sky-500 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {toast.type === "warning" && (
                    <svg className="h-5 w-5 text-amber-500 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                </div>

                {/* Title & Message */}
                <div className="flex-1 pr-2 flex flex-col gap-0.5 select-text">
                  <span className="text-[14px] leading-snug font-bold text-white break-words sm:text-[15px]">
                    {titleText}
                  </span>
                  <span className="text-[12px] leading-relaxed font-semibold text-zinc-400 break-words sm:text-[13px]">
                    {bodyText}
                  </span>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => hideToast(toast.id)}
                  className="shrink-0 rounded p-1 text-zinc-500 hover:text-white transition-colors duration-200"
                >
                  <svg className="h-4.5 w-4.5 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Auto-Dismiss Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-transparent overflow-hidden">
                  <div
                    className={`h-full origin-left ${
                      toast.type === "error"
                        ? "bg-rose-500"
                        : toast.type === "success"
                        ? "bg-emerald-500"
                        : toast.type === "warning"
                        ? "bg-amber-500"
                        : "bg-sky-500"
                    } animate-toast-progress`}
                  />
                </div>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

