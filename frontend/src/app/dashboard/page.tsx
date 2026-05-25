"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import ActionIconCard from "./components/ActionIconCard";
import KpiCard from "./components/KpiCard";
import ListRowItem from "./components/ListRowItem";
import { useFirmScope } from "./shared/useFirmScope";
import { apiRequest } from "@/lib/http";
import { DashboardOverview } from "@/interfaces/workspace";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/context/ToastContext";

const InvoiceIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const ReceiptIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const JournalIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
  </svg>
);

const InventoryIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5 12 3 3 7.5m18 0v9L12 21m9-13.5-9 4.5m0 9V12m0 0L3 7.5" />
  </svg>
);

const BookIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);

const LedgerIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
  </svg>
);

export default function DashboardPage() {
  const { activeFirmId, supabase } = useFirmScope();
  const { showToast } = useToast();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);

  useEffect(() => {
    if (!activeFirmId) return;

    let mounted = true;
    const load = async () => {
      try {
        const data = await apiRequest<DashboardOverview>(supabase, "/api/workspace/overview", {
          query: { firm_id: activeFirmId },
        });
        if (mounted) setOverview(data);
      } catch (err) {
        if (mounted) showToast(err instanceof Error ? err.message : "Unable to load dashboard", "error");
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [activeFirmId, supabase]);

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="relative overflow-hidden rounded-2xl sm:rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,rgba(18,58,41,0.96),rgba(33,92,70,0.92))] px-4 py-5 sm:px-8 sm:py-9 text-white shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(216,243,220,0.28),transparent_58%)]" />
        <div className="relative z-10 max-w-3xl">
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">Overview</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">
            Day-to-day billing, inventory, and books in one real workspace.
          </h2>
          <p className="mt-2.5 max-w-2xl text-xs sm:text-base leading-relaxed text-white/72">
            The dashboard now pulls live voucher and inventory data so the main shortcuts, books, and recent activity all land on working screens.
          </p>
        </div>
      </section>


      <div className="grid gap-3 sm:gap-4 grid-cols-2">
        <KpiCard
          label="Total Sales"
          amount={formatCurrency(overview?.sales.amount ?? 0)}
          subtitle={`${overview?.sales.count ?? 0} sales vouchers`}
          trend="up"
          accentColor="#40916C"
        />
        <KpiCard
          label="Total Purchases"
          amount={formatCurrency(overview?.purchases.amount ?? 0)}
          subtitle={`${overview?.purchases.count ?? 0} purchase vouchers`}
          trend="up"
          accentColor="#D49735"
        />
      </div>

      <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl sm:rounded-[32px] border border-white/70 bg-white/78 p-3.5 sm:p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Create</p>
              <h3 className="mt-1 text-lg sm:text-xl font-semibold tracking-tight text-slate-950">Voucher families</h3>
            </div>
            <Link href="/dashboard/create" className="rounded-full border border-slate-200 bg-white px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-semibold text-slate-600">
              View all
            </Link>
          </div>
          <div className="grid gap-2 sm:gap-3 grid-cols-2 xl:grid-cols-3">
            <ActionIconCard label="Sales Invoice" href="/dashboard/create/sales-invoice" icon={<InvoiceIcon />} />
            <ActionIconCard label="Purchase Invoice" href="/dashboard/create/purchase-invoice" icon={<InvoiceIcon />} />
            <ActionIconCard label="Receipt Voucher" href="/dashboard/create/receipt" icon={<ReceiptIcon />} variant="green" />
            <ActionIconCard label="Payment Voucher" href="/dashboard/create/payment" icon={<ReceiptIcon />} />
            <ActionIconCard label="Journal Entry" href="/dashboard/create/journal-entry" icon={<JournalIcon />} />
            <ActionIconCard label="Create Ledger" href="/dashboard/create/ledger" icon={<LedgerIcon />} />
            <ActionIconCard label="Manage Inventory" href="/dashboard/inventory" icon={<InventoryIcon />} className="col-span-2 xl:col-span-1" />
          </div>
        </section>

        <section className="rounded-2xl sm:rounded-[32px] border border-white/70 bg-white/78 p-4 sm:p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Books</p>
              <h3 className="mt-1 text-lg sm:text-xl font-semibold tracking-tight text-slate-950">Operational books</h3>
            </div>
            <Link href="/dashboard/books" className="rounded-full border border-slate-200 bg-white px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-semibold text-slate-600">
              View all
            </Link>
          </div>
          <div className="space-y-2 rounded-2xl sm:rounded-[28px] border border-slate-100 bg-white/90 p-1.5 sm:p-2">
            <ListRowItem title="Sales Register" description="Review live sales vouchers" href="/dashboard/books/sales-register" icon={<BookIcon />} />
            <ListRowItem title="Purchase Register" description="Review live purchase vouchers" href="/dashboard/books/purchase-register" icon={<BookIcon />} />
            <ListRowItem title="Day Book" description="Chronological operational register" href="/dashboard/books/day-book" icon={<BookIcon />} />
            <ListRowItem title="Cash Book" description="Cash and bank facing vouchers" href="/dashboard/books/cash-book" icon={<BookIcon />} />
            <ListRowItem title="Ledger" description="Browse ledger masters and setup" href="/dashboard/books/ledger" icon={<LedgerIcon />} />
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl sm:rounded-[32px] border border-white/70 bg-white/78 p-4 sm:p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Timeline</p>
              <h3 className="mt-1 text-lg sm:text-xl font-semibold tracking-tight text-slate-950">Recent activity</h3>
            </div>
          </div>
          <div className="space-y-2 rounded-2xl sm:rounded-[28px] border border-slate-100 bg-white/90 p-1.5 sm:p-2">
            {(overview?.recent_vouchers || []).map((voucher) => (
              <ListRowItem
                key={voucher.id}
                title={`${voucher.category} • ${voucher.voucher_number}`}
                description={voucher.party_name || "Voucher detail"}
                href={`/dashboard/vouchers/${voucher.id}`}
                rightText={formatCurrency(voucher.amount)}
                rightSubText={new Date(voucher.voucher_date).toLocaleDateString("en-IN")}
                icon={<BookIcon />}
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl sm:rounded-[32px] border border-white/70 bg-white/78 p-4 sm:p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Inventory</p>
              <h3 className="mt-1 text-lg sm:text-xl font-semibold tracking-tight text-slate-950">Stock at a glance</h3>
            </div>
            <Link href="/dashboard/inventory/stock-position" className="text-[11px] sm:text-xs font-semibold text-tally-700">
              Open stock position
            </Link>
          </div>
          <div className="grid gap-3 sm:gap-4 grid-cols-2">
            <div className="rounded-xl sm:rounded-[24px] border border-slate-100 bg-white/92 p-3 sm:p-4 shadow-sm">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Item Masters</p>
              <p className="mt-2.5 text-xl sm:text-2xl font-semibold tracking-tight text-slate-950">{overview?.inventory.items_count ?? 0}</p>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-500">{overview?.inventory.uom_count ?? 0} UOM</p>
            </div>
            <div className="rounded-xl sm:rounded-[24px] border border-slate-100 bg-white/92 p-3 sm:p-4 shadow-sm">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Closing Stock Value</p>
              <p className="mt-2.5 text-xl sm:text-2xl font-semibold tracking-tight text-slate-950">{formatCurrency(overview?.inventory.closing_value ?? 0)}</p>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-500">{overview?.inventory.stock_items_count ?? 0} tracked items in stock flow</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
