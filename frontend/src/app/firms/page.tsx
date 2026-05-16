"use client";

import { useProfile } from "@/context/ProfileContext";
import SignOutButton from "../components/SignOutButton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function FirmsPage() {
  const { profile, isCAAdmin, isCAEmployee, isLoading } = useProfile();
  const router = useRouter();
  const isCA = isCAAdmin || isCAEmployee;

  // Bug Fix 3: Guard — merchants who manually type /firms are redirected to their dashboard
  useEffect(() => {
    if (!isLoading && profile && !isCA) {
      router.replace("/dashboard");
    }
  }, [isLoading, profile, isCA, router]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020617] text-slate-100">
        Loading...
      </main>
    );
  }

  // Prevent flash of content while redirecting
  if (!isCA) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#020617] text-slate-100 p-6">
      <div className="flex flex-col items-center text-center space-y-8 w-full max-w-2xl">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Client Firms
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            Welcome, {profile?.full_name || 'CA'}. Here are the firms you manage.
          </p>
        </div>

        <div className="w-full bg-slate-800 rounded-xl border border-slate-700 divide-y divide-slate-700">
          {/* Placeholder — replace with a real Supabase query later */}
          <div className="p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors">
            <div className="text-left">
              <p className="font-medium text-white">Example Client Firm</p>
              <p className="text-xs text-slate-400">GSTIN: 22AAAAA0000A1Z5</p>
            </div>
            <Link
              href={`/dashboard?firm_id=example-id`}
              className="px-4 py-2 bg-white text-black text-sm font-medium rounded-md hover:bg-slate-200 transition-colors"
            >
              View Dashboard
            </Link>
          </div>
        </div>

        <div className="pt-8">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
