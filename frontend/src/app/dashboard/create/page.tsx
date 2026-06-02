"use client";

import ListRowItem from "../components/ListRowItem";

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

const LedgerIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
  </svg>
);

const CREATE_ACTIONS = [
  { title: "Sales Invoice", href: "/dashboard/create/sales-invoice", description: "Inventory lines, tax engine, and accounting lines generated for outward billing.", icon: <InvoiceIcon /> },
  { title: "Purchase Invoice", href: "/dashboard/create/purchase-invoice", description: "Supplier-facing invoice flow with stock, taxes, and purchase posting structure.", icon: <InvoiceIcon /> },
  { title: "Debit Note", href: "/dashboard/create/debit-note", description: "Inventory-backed return or reversal flow with invoice-style logic.", icon: <InvoiceIcon /> },
  { title: "Credit Note", href: "/dashboard/create/credit-note", description: "Reverse commercial impact with stock and tax kept explicit.", icon: <InvoiceIcon /> },
  { title: "Receipt Voucher", href: "/dashboard/create/receipt", description: "Party + cash or bank + amount in one compact payment family form.", icon: <ReceiptIcon /> },
  { title: "Payment Voucher", href: "/dashboard/create/payment", description: "Focused outgoing payment flow without invoice complexity.", icon: <ReceiptIcon /> },
  { title: "Contra Entry", href: "/dashboard/create/contra-entry", description: "Direct cash and bank movement between two financial ledgers.", icon: <ReceiptIcon /> },
  { title: "Journal Entry", href: "/dashboard/create/journal-entry", description: "Free-form accounting lines for adjustments, provisions, and internal postings.", icon: <JournalIcon /> },
  { title: "Ledger", href: "/dashboard/create/ledger", description: "Create or edit account masters with nested bank, party, or tax details.", icon: <LedgerIcon /> },
];

export default function CreateHubPage() {
  return (
    <div className="mx-auto max-w-[1800px]">
      <section className="rounded-2xl sm:rounded-[32px] border border-white/70 bg-white/78 p-4 sm:p-6 lg:p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:mb-8">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Workspace</p>
            <h3 className="mt-1 text-lg sm:text-2xl font-semibold tracking-tight text-slate-950">Create Voucher</h3>
          </div>
        </div>

        <div className="grid gap-2 sm:gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 rounded-2xl sm:rounded-[28px] border border-slate-100 bg-white/90 p-2 sm:p-3">
          {CREATE_ACTIONS.map((action) => (
            <ListRowItem
              key={action.title}
              title={action.title}
              description={action.description}
              href={action.href}
              icon={action.icon}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
