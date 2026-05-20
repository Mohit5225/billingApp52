"use client";

import { useProfile } from "@/context/ProfileContext";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Firm } from "@/interfaces/firm";
import SignOutButton from "../../components/SignOutButton";

export default function Header() {
  const { profile, isCAAdmin, isCAEmployee, supabase } = useProfile();
  const searchParams = useSearchParams();
  const [firmName, setFirmName] = useState<string>("");
  const [firmDetails, setFirmDetails] = useState<{ gstin?: string; state?: string }>({});
  const isCA = isCAAdmin || isCAEmployee;
  const urlFirmId = searchParams.get("firm_id");
  const activeFirmId = (isCA && urlFirmId) ? urlFirmId : profile?.firm_id;

  useEffect(() => {
    async function fetchFirmName() {
      if (!activeFirmId) return;
      const { data } = await supabase
        .from("firms")
        .select("name, gstin, state")
        .eq("id", activeFirmId)
        .single();
      if (data) {
        setFirmName(data.name);
        setFirmDetails({ gstin: data.gstin, state: data.state });
      }
    }
    fetchFirmName();
  }, [activeFirmId, supabase]);

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/80">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left: Firm Name & Details */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile hamburger placeholder — we use bottom nav instead */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-7 h-7 bg-tally-500 rounded-md flex items-center justify-center font-bold text-tally-900 text-xs">
              B
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base lg:text-lg font-semibold text-slate-900 truncate">
                {firmName || "Loading..."}
              </h1>
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
            <p className="text-xs text-slate-400 truncate hidden sm:block">
              {firmDetails.state && <span>{firmDetails.state}</span>}
              {firmDetails.gstin && (
                <>
                  {firmDetails.state && <span className="mx-1.5">·</span>}
                  <span>GSTIN: {firmDetails.gstin}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Center: Search (Desktop only) */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search vouchers, ledgers, reports…"
              className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tally-500/30 focus:border-tally-500 transition-all placeholder-slate-400"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-[10px] text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded font-mono">⌘K</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Date Range Picker Stub */}
          <button className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            <span className="font-medium">Apr 2024 – Mar 2025</span>
          </button>

          {/* Notifications */}
          <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            {/* Notification dot */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-soft rounded-full"></span>
          </button>

          {/* User Avatar */}
          <div className="w-8 h-8 bg-tally-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          {/* Sign Out */}
          <div className="hidden lg:block">
            <SignOutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
