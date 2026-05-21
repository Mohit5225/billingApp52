"use client";

import Link from "next/link";

function LedgerIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75z" />
    </svg>
  );
}

function QuickLinkCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="group rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.82))] p-5 shadow-[0_16px_34px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_24px_46px_rgba(15,23,42,0.12)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-tally-50 text-tally-700 transition group-hover:bg-tally-100">
          <LedgerIcon />
        </div>
      </div>
    </Link>
  );
}

export default function CreateHubPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,255,248,0.88))] px-6 py-7 shadow-[0_24px_58px_rgba(15,23,42,0.08)] sm:px-8 sm:py-9">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(82,183,136,0.18),transparent_58%)]" />
        <div className="relative z-10 max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-tally-700">Create</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Start a new ledger with a cleaner workflow.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            The ledger flow now adapts better to mobile, gives more breathing room to grouped fields, and keeps the accounting context visible while you create.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <QuickLinkCard href="/dashboard/create/ledger" title="Ledger" description="Create a new account ledger with balance, group, and advanced classification fields." />
        <div className="rounded-[28px] border border-dashed border-slate-200 bg-white/55 p-5 text-sm leading-6 text-slate-500">
          More creation flows can plug into this layout without changing the navigation pattern or mobile treatment.
        </div>
      </section>
    </div>
  );
}
