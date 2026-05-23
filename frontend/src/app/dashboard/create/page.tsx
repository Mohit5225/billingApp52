"use client";

import Link from "next/link";

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
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 16.5 16.5 7.5m0 0H9.75m6.75 0v6.75" />
          </svg>
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
            Start from the right voucher shape, not a one-form compromise.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Invoice-grade workflows stay separate from payment, contra, and journal flows, while still sharing the same overall dashboard shell and mobile treatment.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <QuickLinkCard href="/dashboard/create/sales-invoice" title="Sales Invoice" description="Inventory lines, tax engine, and accounting lines generated for outward billing." />
        <QuickLinkCard href="/dashboard/create/purchase-invoice" title="Purchase Invoice" description="Supplier-facing invoice flow with stock, taxes, and purchase posting structure." />
        <QuickLinkCard href="/dashboard/create/debit-note" title="Debit Note" description="Inventory-backed return or reversal flow with invoice-style logic." />
        <QuickLinkCard href="/dashboard/create/credit-note" title="Credit Note" description="Reverse commercial impact with stock and tax kept explicit." />
        <QuickLinkCard href="/dashboard/create/receipt" title="Receipt Voucher" description="Party + cash or bank + amount in one compact payment family form." />
        <QuickLinkCard href="/dashboard/create/payment" title="Payment Voucher" description="Focused outgoing payment flow without invoice complexity." />
        <QuickLinkCard href="/dashboard/create/contra-entry" title="Contra Entry" description="Direct cash and bank movement between two financial ledgers." />
        <QuickLinkCard href="/dashboard/create/journal-entry" title="Journal Entry" description="Free-form accounting lines for adjustments, provisions, and internal postings." />
        <QuickLinkCard href="/dashboard/create/ledger" title="Ledger" description="Create or edit account masters with nested bank, party, or tax details." />
      </section>
    </div>
  );
}
