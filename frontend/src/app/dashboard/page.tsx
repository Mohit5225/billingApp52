"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import ActionIconCard from "./components/ActionIconCard";
import EwayBillModal from "./components/EwayBillModal";
import KpiCard from "./components/KpiCard";
import ListRowItem from "./components/ListRowItem";
import { useFirmScope } from "./shared/useFirmScope";
import { useDateFilter } from "@/context/DateFilterContext";
import { apiRequest } from "@/lib/http";
import { DashboardOverview } from "@/interfaces/workspace";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/context/ToastContext";

const InvoiceIcon = () => (
  <svg className="h-7 w-7 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const ReceiptIcon = () => (
  <svg className="h-7 w-7 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const JournalIcon = () => (
  <svg className="h-7 w-7 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
  </svg>
);

const InventoryIcon = () => (
  <svg className="h-7 w-7 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5 12 3 3 7.5m18 0v9L12 21m9-13.5-9 4.5m0 9V12m0 0L3 7.5" />
  </svg>
);

const EwayBillIcon = () => (
  <svg className="h-7 w-7 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
  </svg>
);

const BookIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);

const LedgerIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
  </svg>
);

export default function DashboardPage() {
  const { activeFirmId, supabase } = useFirmScope();
  const { fromDate, toDate } = useDateFilter();
  const { showToast } = useToast();
  const [showEwayModal, setShowEwayModal] = useState(false);

  const { data: overview, isLoading } = useQuery({
    queryKey: ["overview", activeFirmId, fromDate, toDate],
    queryFn: () =>
      apiRequest<DashboardOverview>(supabase, "/api/workspace/overview", {
        query: { firm_id: activeFirmId, from_date: fromDate, to_date: toDate },
      }),
    enabled: !!activeFirmId,
  });

  return (
    <div className="mx-auto w-full space-y-6 lg:space-y-8">
      <section className="relative rounded-2xl sm:rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,rgba(18,58,41,0.96),rgba(33,92,70,0.92))] px-4 py-5 sm:px-8 sm:py-6 lg:px-10 lg:py-8 text-white shadow-[0_12px_40px_rgba(15,23,42,0.12)]">
        <div className="absolute inset-0 overflow-hidden rounded-2xl sm:rounded-[28px] pointer-events-none">
          <div className="absolute inset-y-0 right-0 w-full md:w-3/4 bg-[radial-gradient(circle_at_center_right,rgba(216,243,220,0.15),transparent_70%)]" />
        </div>
        
        <div className="relative z-10 flex flex-row items-center justify-between gap-3 sm:gap-8 pr-2 sm:pr-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-[19px] sm:text-3xl md:text-4xl lg:text-5xl xl:text-[52px] font-semibold tracking-tight leading-[1.2] sm:leading-[1.15] xl:leading-[1.1] text-balance">
              Day-to-day billing, inventory, and books in one real workspace.
            </h2>
          </div>

          <div className="relative flex shrink-0 items-center justify-center">
            {/* Main Floating Card - Responsive explicitly for mobile/pc */}
            <div className="relative w-[135px] sm:w-[240px] lg:w-[320px] rounded-[14px] sm:rounded-3xl bg-white p-2.5 sm:p-5 shadow-2xl shadow-emerald-950/40 border border-white">
              
              {/* Top Section: Charts */}
              <div className="flex gap-1.5 sm:gap-4">
                {/* Bar Chart Box */}
                <div className="flex flex-1 items-end gap-1 sm:gap-2 rounded-[10px] sm:rounded-2xl border border-slate-100 bg-slate-50 p-1.5 sm:p-4 h-[45px] sm:h-[90px]">
                  <div className="w-full bg-emerald-300 rounded-[1px] sm:rounded-sm h-[40%]" />
                  <div className="w-full bg-emerald-500 rounded-[1px] sm:rounded-sm h-[80%]" />
                  <div className="w-full bg-emerald-600 rounded-[1px] sm:rounded-sm h-[60%]" />
                  <div className="w-full bg-emerald-400 rounded-[1px] sm:rounded-sm h-[95%]" />
                </div>
                {/* Pie Chart Box */}
                <div className="flex w-[45px] sm:w-[90px] shrink-0 items-center justify-center rounded-[10px] sm:rounded-2xl border border-slate-100 bg-slate-50">
                  <div className="h-6 w-6 sm:h-12 sm:w-12 rounded-full" style={{ background: 'conic-gradient(#EAB308 0deg 80deg, #10B981 80deg 360deg)' }} />
                </div>
              </div>

              {/* Bottom Section: List Rows */}
              <div className="mt-2 sm:mt-4 space-y-1 sm:space-y-2 rounded-[10px] sm:rounded-2xl border border-slate-100 bg-white p-1.5 sm:p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-1.5 sm:gap-3">
                    <svg className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    <div className="h-1 sm:h-2 w-full rounded-full bg-slate-200" />
                    <div className="h-1 sm:h-2 w-1/3 rounded-full bg-slate-100" />
                  </div>
                ))}
              </div>

              {/* Floating Dark Green "Phone" overlay */}
              <div className="absolute -bottom-3 -right-2.5 sm:-bottom-8 sm:-right-6 w-[55px] sm:w-[100px] rounded-lg sm:rounded-2xl border-[2px] sm:border-4 border-[#254A39] bg-[#163326] p-1.5 sm:p-3 shadow-xl shadow-emerald-950/50 rotate-[-12deg] transform transition-transform hover:rotate-[-8deg]">
                <div className="h-1.5 sm:h-3 w-full rounded-full bg-white/20 mb-3 sm:mb-6" />
                <div className="flex items-center justify-center rounded-md sm:rounded-xl bg-emerald-500/20 p-1.5 sm:p-3 mb-1.5 sm:mb-4">
                  <BookIcon />
                </div>
                <div className="h-0.5 sm:h-1.5 w-3/4 rounded-full bg-white/30 mb-0.5 sm:mb-2" />
                <div className="h-0.5 sm:h-1.5 w-1/2 rounded-full bg-white/20" />
              </div>
            </div>
          </div>
        </div>
      </section>


      <div className="grid gap-3 sm:gap-4 grid-cols-2">
        <KpiCard
          label="Total Sales"
          amount={formatCurrency(overview?.sales.amount ?? 0)}
          subtitle={`${overview?.sales.count ?? 0} sales vouchers`}
          trend="up"
          accentColor="#40916C"
          isLoading={isLoading}
        />
        <KpiCard
          label="Total Purchases"
          amount={formatCurrency(overview?.purchases.amount ?? 0)}
          subtitle={`${overview?.purchases.count ?? 0} purchase vouchers`}
          trend="up"
          accentColor="#D49735"
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="flex h-full flex-col min-w-0 rounded-2xl sm:rounded-[32px] border border-white/70 bg-white/78 p-4 sm:p-7 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs sm:text-[14px] font-semibold uppercase tracking-[0.24em] text-slate-500">Quick actions</p>
              <h3 className="mt-1.5 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-950">Voucher families</h3>
            </div>
            <Link href="/dashboard/create" className="rounded-full border border-slate-200 bg-white px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-600">
              View all
            </Link>
          </div>
          <div className="grid flex-1 gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <ActionIconCard label="Sales Invoice" href="/dashboard/create/sales-invoice" icon={<InvoiceIcon />} />
            <ActionIconCard label="Purchase Invoice" href="/dashboard/create/purchase-invoice" icon={<InvoiceIcon />} />
            <ActionIconCard label="Receipt Voucher" href="/dashboard/create/receipt" icon={<ReceiptIcon />} variant="green" />
            <ActionIconCard label="Payment Voucher" href="/dashboard/create/payment" icon={<ReceiptIcon />} />
            <ActionIconCard label="Journal Entry" href="/dashboard/create/journal-entry" icon={<JournalIcon />} />
            <ActionIconCard label="Create Ledger" href="/dashboard/create/ledger" icon={<LedgerIcon />} />
            <ActionIconCard label="Manage Inventory" href="/dashboard/inventory" icon={<InventoryIcon />} />
            <ActionIconCard label="E-way Bill" onClick={() => setShowEwayModal(true)} icon={<EwayBillIcon />} variant="green" />
          </div>
        </section>

        <section className="hidden xl:flex h-full flex-col rounded-2xl sm:rounded-[32px] border border-white/70 bg-white/78 p-4 sm:p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs sm:text-[14px] font-semibold uppercase tracking-[0.24em] text-slate-500">Books</p>
              <h3 className="mt-1.5 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-950">Operational books</h3>
            </div>
            <Link href="/dashboard/books" className="rounded-full border border-slate-200 bg-white px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-600">
              View all
            </Link>
          </div>
          <div className="flex flex-1 flex-col justify-between space-y-2 rounded-2xl sm:rounded-[28px] border border-slate-100 bg-white/90 p-1.5 sm:p-2">
            <ListRowItem title="Sales Register" description="Review live sales vouchers" href="/dashboard/books/sales-register" icon={<BookIcon />} />
            <ListRowItem title="Purchase Register" description="Review live purchase vouchers" href="/dashboard/books/purchase-register" icon={<BookIcon />} />
            <ListRowItem title="Day Book" description="Chronological operational register" href="/dashboard/books/day-book" icon={<BookIcon />} />
            <ListRowItem title="Cash Book" description="Cash and bank facing vouchers" href="/dashboard/books/cash-book" icon={<BookIcon />} />
            <ListRowItem title="Ledger" description="Browse ledger masters and setup" href="/dashboard/books/ledger" icon={<LedgerIcon />} />
          </div>
        </section>
      </div>

      <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
        <section className="min-w-0 rounded-2xl sm:rounded-[32px] border border-white/70 bg-white/78 p-5 sm:p-7 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm sm:text-[14px] font-semibold uppercase tracking-[0.24em] text-slate-500">Timeline</p>
              <h3 className="mt-1.5 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950">Recent activity</h3>
            </div>
          </div>
          <div className="space-y-3 rounded-2xl sm:rounded-[28px] border border-slate-100 bg-white/90 p-2 sm:p-3">
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

        <section className="rounded-2xl sm:rounded-[32px] border border-white/70 bg-white/78 p-5 sm:p-7 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm sm:text-[14px] font-semibold uppercase tracking-[0.24em] text-slate-500">Inventory</p>
              <h3 className="mt-1.5 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950">Stock at a glance</h3>
            </div>
            <Link href="/dashboard/inventory/stock-summary" className="text-sm sm:text-base font-semibold text-tally-700 hover:text-tally-800">
              Open stock summary
            </Link>
          </div>
          <div className="grid gap-4 sm:gap-5 grid-cols-2">
            <div className="min-w-0 rounded-xl sm:rounded-[26px] border border-slate-100 bg-white/92 p-4 sm:p-5 shadow-sm">
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 truncate" title="Item Masters">Item Masters</p>
              <p className="mt-3 text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-950 truncate" title={String(overview?.inventory.items_count ?? 0)}>
                {overview?.inventory.items_count ?? 0}
              </p>
              <p className="mt-2.5 text-sm sm:text-base lg:text-lg font-medium text-slate-500 truncate" title={`${overview?.inventory.uom_count ?? 0} UOM`}>
                {overview?.inventory.uom_count ?? 0} UOM
              </p>
            </div>
            <div className="min-w-0 rounded-xl sm:rounded-[26px] border border-slate-100 bg-white/92 p-4 sm:p-5 shadow-sm">
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 truncate" title="Closing Stock Value">Closing Stock Value</p>
              <p className="mt-3 text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-950 truncate" title={formatCurrency(overview?.inventory.closing_value ?? 0)}>
                {formatCurrency(overview?.inventory.closing_value ?? 0)}
              </p>
              <p className="mt-2.5 text-sm sm:text-base lg:text-lg font-medium text-slate-500 truncate" title={`${overview?.inventory.stock_items_count ?? 0} tracked items`}>
                {overview?.inventory.stock_items_count ?? 0} tracked items
              </p>
            </div>
          </div>
        </section>
      </div>

      <EwayBillModal isOpen={showEwayModal} onClose={() => setShowEwayModal(false)} />
    </div>
  );
}
