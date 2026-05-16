"use client";

import { useProfile } from "@/context/ProfileContext";
import SignOutButton from "../components/SignOutButton";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function DashboardContent() {
  const { profile, isCAAdmin, isCAEmployee, isLoading } = useProfile();
  const searchParams = useSearchParams();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020617] text-slate-100">
        Loading...
      </main>
    );
  }

  // Determine which firm we are looking at
  const urlFirmId = searchParams.get("firm_id");
  const isCA = isCAAdmin || isCAEmployee;
  
  // A merchant always sees their own firm. A CA sees the URL firm, or falls back to their own if none provided.
  const activeFirmId = (isCA && urlFirmId) ? urlFirmId : profile?.firm_id;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#020617] text-slate-100 p-6">
      <div className="flex flex-col items-center text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Firm Dashboard
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            Welcome, {profile?.full_name || 'User'}. Role: <span className="uppercase text-emerald-400">{profile?.role}</span>
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-md text-left space-y-4 shadow-xl">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Firm ID</p>
            <p className="font-mono text-sm text-slate-300 bg-slate-900 p-2 rounded-md">{activeFirmId || 'Unknown'}</p>
          </div>
          
          <p className="text-sm text-slate-400 border-t border-slate-700 pt-4">
            This is where invoices, reports, and billing data for this specific firm will be displayed.
          </p>
          
          {/* Step 4: Conditionally rendering secure UI elements */}
          {/* ONLY a CA Admin can delete a firm. Employees and Merchants cannot. */}
          {isCAAdmin && (
            <div className="pt-4 border-t border-slate-700 mt-4">
              <button className="w-full px-4 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-md hover:bg-red-500/20 transition-colors font-medium">
                Delete Firm (CA Admin Only)
              </button>
            </div>
          )}
        </div>

        <div className="pt-8">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#020617] text-slate-100">Loading Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
