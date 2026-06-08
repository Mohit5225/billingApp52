"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "../auth/login/actions";

export default function SignOutButton() {
  const [isConfirming, setIsConfirming] = useState(false);
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    if (!isConfirming) {
      setIsConfirming(true);
      setTimeout(() => setIsConfirming(false), 3000);
      return;
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("billingApp_activeFirmId");
    }
    queryClient.clear();
    await signOut();
  };

  return (
    <button
      onClick={handleSignOut}
      title={isConfirming ? "Click again to confirm" : "Sign out"}
      className={`group relative inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition-all duration-300 ${
        isConfirming
          ? "border-rose-200 bg-rose-50 text-rose-600 shadow-sm"
          : "border-white/70 bg-white/82 text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] hover:bg-white hover:text-slate-900"
      }`}
    >
      <div className={`transition-transform duration-300 ${isConfirming ? "rotate-180" : ""}`}>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </div>

      <span className="hidden xl:inline">{isConfirming ? "Tap again" : "Sign out"}</span>

      {isConfirming && (
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] xl:hidden">
          Confirm
        </span>
      )}

      {!isConfirming && (
        <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-500 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 xl:hidden">
          Sign Out
        </span>
      )}
    </button>
  );
}
