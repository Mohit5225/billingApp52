"use client";

import Link from "next/link";

function LedgerIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75z" />
    </svg>
  );
}

function QuickLinkCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-tally-200 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-tally-50 text-tally-700">
          <LedgerIcon />
        </div>
      </div>
    </Link>
  );
}

export default function CreateHubPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative isolate px-6 py-8 sm:px-8 sm:py-10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_rgba(31,111,113,0.10),_transparent_36%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.08),_transparent_32%)]" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tally-700">Create</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Create a new ledger</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Use the ledger flow to capture account name, opening balance, and the subgroup it belongs to. The form writes to the real Supabase tables.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuickLinkCard href="/dashboard/create/ledger" title="Ledger" description="Create a new account ledger" />
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
          More create flows can be added here without changing the navigation.
        </div>
      </section>
    </div>
  );
}