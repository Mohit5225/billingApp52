"use client";

import { useProfile } from "@/context/ProfileContext";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import KpiCard from "./components/KpiCard";
import ActionIconCard from "./components/ActionIconCard";
import ListRowItem from "./components/ListRowItem";
import Link from "next/link";

/* ──────────────────────────────────────
   ICON HELPERS
   ────────────────────────────────────── */

const InvoiceIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const PurchaseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
  </svg>
);

const ReceiptIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const PaymentIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
  </svg>
);

const DebitNoteIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const CreditNoteIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9.75m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const JournalIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

const ContraIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
  </svg>
);

const BookIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);

const LedgerIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
  </svg>
);

const CashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const DayBookIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);

const TrialBalanceIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
  </svg>
);

/* ──────────────────────────────────────
   DASHBOARD CONTENT
   ────────────────────────────────────── */

function DashboardContent() {
  const { profile, isCAAdmin, isCAEmployee } = useProfile();
  const searchParams = useSearchParams();
  const isCA = isCAAdmin || isCAEmployee;
  const urlFirmId = searchParams.get("firm_id");
  const activeFirmId = (isCA && urlFirmId) ? urlFirmId : profile?.firm_id;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-4 animate-fade-in-up">
        <KpiCard
          label="Total Sales"
          amount="4,25,000"
          subtitle="Apr 2024 to Mar 2025"
          trend="up"
          accentColor="#40916C"
        />
        <KpiCard
          label="Total Purchases"
          amount="2,15,000"
          subtitle="Apr 2024 to Mar 2025"
          trend="up"
          accentColor="#E8A838"
        />
      </div>

      {/* ── Middle Section: Transactions + Account Books ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CREATE TRANSACTIONS */}
        <section className="animate-fade-in-up stagger-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Create Transactions</h2>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <ActionIconCard label="Sales Invoice" href="/dashboard/create/sales-invoice" icon={<InvoiceIcon />} />
            <ActionIconCard label="Purchase Invoice" href="/dashboard/create/purchase-invoice" icon={<PurchaseIcon />} />
            <ActionIconCard label="Receipt" href="/dashboard/create/receipt" icon={<ReceiptIcon />} variant="green" />
            <ActionIconCard label="Payment" href="/dashboard/create/payment" icon={<PaymentIcon />} />
            <ActionIconCard label="Debit Note" href="/dashboard/create/debit-note" icon={<DebitNoteIcon />} variant="red" />
            <ActionIconCard label="Credit Note" href="/dashboard/create/credit-note" icon={<CreditNoteIcon />} variant="red" />
            <ActionIconCard label="Journal Entry" href="/dashboard/create/journal-entry" icon={<JournalIcon />} />
            <ActionIconCard label="Contra Entry" href="/dashboard/create/contra-entry" icon={<ContraIcon />} />
            <ActionIconCard label="Ledger" href="/dashboard/create/ledger" icon={<LedgerIcon />} />
          </div>
          <Link
            href="/dashboard/create"
            className="flex items-center gap-1 mt-4 text-xs font-medium text-tally-700 hover:text-tally-800 transition-colors"
          >
            View All Transactions
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </section>

        {/* ACCOUNT BOOKS */}
        <section className="animate-fade-in-up stagger-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Account Books</h2>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50 overflow-hidden">
            <ListRowItem
              title="Sales Register"
              description="View all sales transactions"
              href="/dashboard/books/sales-register"
              icon={<BookIcon />}
            />
            <ListRowItem
              title="Purchase Register"
              description="View all purchase transactions"
              href="/dashboard/books/purchase-register"
              icon={<BookIcon />}
            />
            <ListRowItem
              title="Ledger"
              description="View ledger of all accounts"
              href="/dashboard/books/ledger"
              icon={<LedgerIcon />}
            />
            <ListRowItem
              title="Cash Book"
              description="View cash in hand & bank books"
              href="/dashboard/books/cash-book"
              icon={<CashIcon />}
            />
            <ListRowItem
              title="Day Book"
              description="View all day to day entries"
              href="/dashboard/books/day-book"
              icon={<DayBookIcon />}
            />
            <ListRowItem
              title="Trial Balance"
              description="View trial balance report"
              href="/dashboard/books/trial-balance"
              icon={<TrialBalanceIcon />}
            />
          </div>
          <Link
            href="/dashboard/books"
            className="flex items-center gap-1 mt-4 text-xs font-medium text-tally-700 hover:text-tally-800 transition-colors"
          >
            View All Books
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </section>
      </div>

      {/* ── Bottom Section: Recent Activity + Pending Attention ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RECENT ACTIVITY */}
        <section className="animate-fade-in-up stagger-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Recent Activity</h2>
            <button className="text-xs font-medium text-tally-700 hover:text-tally-800 transition-colors">
              View All
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50 overflow-hidden">
            <ListRowItem
              title="Sales Invoice #1045"
              description="Mahalakshmi Enterprises"
              href="#"
              rightText="Today, 11:30 AM"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                </svg>
              }
            />
            <ListRowItem
              title="Purchase Invoice #221"
              description="Shree Ram Suppliers"
              href="#"
              rightText="Today, 10:15 AM"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 4.5l-15 15m0 0h11.25m-11.25 0V8.25" />
                </svg>
              }
            />
            <ListRowItem
              title="Payment to Mahalakshmi Enterprises"
              description="Payment Voucher #309"
              href="#"
              rightText="Yesterday, 04:45 PM"
              icon={<CashIcon />}
            />
            <ListRowItem
              title="Receipt from Real Traders"
              description="Receipt Voucher #112"
              href="#"
              rightText="Yesterday, 03:20 PM"
              icon={<CashIcon />}
            />
          </div>
        </section>

        {/* PENDING ATTENTION */}
        <section className="animate-fade-in-up stagger-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Pending Attention</h2>
            <button className="text-xs font-medium text-tally-700 hover:text-tally-800 transition-colors">
              View All
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50 overflow-hidden">
            <ListRowItem
              title="3 Unpaid Invoices"
              description="₹ 82,500"
              href="#"
              badge={{ label: "Action", color: "amber" }}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              }
            />
            <ListRowItem
              title="2 GST Mismatches"
              description="Review required"
              href="#"
              badge={{ label: "Review", color: "red" }}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              }
            />
            <ListRowItem
              title="1 Draft Voucher"
              description="Completion pending"
              href="#"
              badge={{ label: "Draft", color: "slate" }}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              }
            />
          </div>
        </section>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   PAGE EXPORT
   ────────────────────────────────────── */

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="h-32 rounded-2xl animate-shimmer" />
            <div className="h-32 rounded-2xl animate-shimmer" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 rounded-2xl animate-shimmer" />
            <div className="h-64 rounded-2xl animate-shimmer" />
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
