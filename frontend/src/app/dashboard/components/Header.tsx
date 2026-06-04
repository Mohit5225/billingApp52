"use client";

import { useProfile } from "@/context/ProfileContext";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import SignOutButton from "../../components/SignOutButton";

import { useDateFilter } from "@/context/DateFilterContext";
import { useFirmScope } from "../shared/useFirmScope";

export default function Header() {
  const { fromDate, toDate, setDateRange } = useDateFilter();
  const { profile, isCA, activeFirmId, supabase } = useFirmScope();
  
  const [firmName, setFirmName] = useState("");
  const [firmDetails, setFirmDetails] = useState<{ gstin?: string; state?: string }>({});

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

    void fetchFirmName();
  }, [activeFirmId, supabase]);

  return (
    <header className="sticky top-0 z-30 border-b border-white/60 bg-[rgba(248,245,239,0.84)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex w-full flex-wrap items-start justify-between gap-4 lg:flex-nowrap lg:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-tally-400 font-bold text-tally-900 shadow-lg shadow-emerald-950/10 lg:hidden">
              B
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Active Workspace
              </p>
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                <h1 className="truncate text-base font-semibold tracking-tight text-slate-950 sm:text-xl lg:text-2xl">
                  {firmName || "Loading..."}
                </h1>
                <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-xs font-medium text-slate-500">
                {firmDetails.state && <span>{firmDetails.state}</span>}
                {firmDetails.gstin && (
                  <>
                    {firmDetails.state && <span className="text-slate-300">•</span>}
                    <span className="break-all">GSTIN: {firmDetails.gstin}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="hidden flex-1 px-6 lg:flex lg:max-w-xl">
            <div className="relative w-full">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search vouchers, ledgers, parties, or reports"
                className="h-12 w-full rounded-2xl border border-white/70 bg-white/78 pl-11 pr-20 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold tracking-[0.16em] text-slate-400">
                  CMD K
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-4 rounded-2xl border border-white/80 bg-white/90 px-5 py-2.5 text-[15px] font-semibold text-slate-700 shadow-sm shadow-emerald-950/5 xl:flex">
              <input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(e) => setDateRange(e.target.value, toDate)}
                className="bg-transparent outline-none cursor-pointer text-slate-900"
              />
              <span className="text-slate-400 text-sm font-medium">to</span>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => setDateRange(fromDate, e.target.value)}
                className="bg-transparent outline-none cursor-pointer text-slate-900"
              />
            </div>

            <button className="relative rounded-2xl border border-transparent bg-white/55 p-2.5 text-slate-500 transition hover:border-white/70 hover:bg-white/80 hover:text-slate-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-[rgba(248,245,239,0.84)] bg-red-soft" />
            </button>

            <div className="hidden items-center gap-3 rounded-2xl border border-white/70 bg-white/82 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] sm:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-tally-700 text-sm font-bold text-white shadow-sm">
                {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="hidden min-w-0 lg:block">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {profile?.full_name || "User"}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {isCA ? "CA workspace" : "Merchant workspace"}
                </p>
              </div>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-tally-700 text-sm font-bold text-white shadow-sm sm:hidden">
              {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
            </div>

            <div className="hidden xl:block">
              <SignOutButton />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:hidden">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search vouchers, ledgers, reports"
              className="h-11 w-full rounded-2xl border border-white/70 bg-white/78 pl-11 pr-4 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>
          
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/78 px-3 py-2.5 text-xs font-medium text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(e) => setDateRange(e.target.value, toDate)}
              className="bg-transparent outline-none cursor-pointer w-[115px] sm:w-auto"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(e) => setDateRange(fromDate, e.target.value)}
              className="bg-transparent outline-none cursor-pointer w-[115px] sm:w-auto"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
