"use client";

import { useProfile } from "@/context/ProfileContext";
import SignOutButton from "../components/SignOutButton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/supabaseConfig/client";
import { Firm } from "@/interfaces/firm";

export default function FirmsPage() {
  const { profile, isCAAdmin, isCAEmployee, isLoading: isProfileLoading, supabase } = useProfile();
  const [firms, setFirms] = useState<Firm[]>([]);
  const [isFirmsLoading, setIsFirmsLoading] = useState(true);
  const router = useRouter();
  const isCA = isCAAdmin || isCAEmployee;

  // Guard: Redirect non-CA users
  useEffect(() => {
    if (!isProfileLoading && profile && !isCA) {
      router.replace("/dashboard");
    }
  }, [isProfileLoading, profile, isCA, router]);

  // Fetch real firms from Supabase
  useEffect(() => {
    async function getFirms() {
      if (!profile) return;
      
      try {
        setIsFirmsLoading(true);
        const { data, error } = await supabase
          .from('firms')
          .select('*')
          .order('name');

        if (error) throw error;
        setFirms(data || []);
      } catch (err) {
        console.error("Error fetching firms:", err);
      } finally {
        setIsFirmsLoading(false);
      }
    }

    if (isCA && profile) {
      getFirms();
    }
  }, [isCA, profile, supabase]);

  if (isProfileLoading || (isFirmsLoading && firms.length === 0)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020617] text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 animate-pulse text-sm">Loading firms...</p>
        </div>
      </main>
    );
  }

  if (!isCA) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#020617] text-slate-100 p-6">
      <div className="flex flex-col items-center text-center space-y-8 w-full max-w-2xl">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Client Firms
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            Welcome, {profile?.full_name || 'CA'}. You have access to {firms.length} firm(s).
          </p>
        </div>

        <div className="w-full bg-slate-800 rounded-xl border border-slate-700 divide-y divide-slate-700 shadow-2xl overflow-hidden">
          {firms.length > 0 ? (
            firms.map((firm) => (
              <div key={firm.id} className="p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors group">
                <div className="text-left">
                  <p className="font-semibold text-white group-hover:text-emerald-400 transition-colors">{firm.name}</p>
                  <p className="text-xs text-slate-500 font-mono tracking-wider uppercase">GSTIN: {firm.gstin || 'No GSTIN'}</p>
                </div>
                <Link 
                  href={`/dashboard?firm_id=${firm.id}`} 
                  className="px-4 py-2 bg-slate-100 text-slate-900 text-sm font-bold rounded-lg hover:bg-white hover:scale-105 transition-all shadow-lg"
                >
                  View Dashboard
                </Link>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-slate-500">
              <p>No firms found in your account.</p>
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
