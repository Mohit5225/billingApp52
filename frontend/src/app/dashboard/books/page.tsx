"use client";

import ListRowItem from "../components/ListRowItem";

const BookIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);

const LedgerIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
  </svg>
);

const BOOKS = [
  { title: "Day Book", href: "/dashboard/books/day-book", description: "Chronological operational register", icon: <BookIcon /> },
  { title: "Cash Book", href: "/dashboard/books/cash-book", description: "Cash and bank facing vouchers", icon: <BookIcon /> },
  { title: "Ledger", href: "/dashboard/books/ledger", description: "Browse ledger masters and setup", icon: <LedgerIcon /> },
  { title: "Sales Register", href: "/dashboard/books/sales-register", description: "Review live sales vouchers", icon: <BookIcon /> },
  { title: "Purchase Register", href: "/dashboard/books/purchase-register", description: "Review live purchase vouchers", icon: <BookIcon /> },
  { title: "Receipt Register", href: "/dashboard/books/receipt-register", description: "Inward payment tracking", icon: <BookIcon /> },
  { title: "Payment Register", href: "/dashboard/books/payment-register", description: "Outward payment tracking", icon: <BookIcon /> },
  { title: "Debit Note Register", href: "/dashboard/books/debit-note-register", description: "Purchase returns & adjustments", icon: <BookIcon /> },
  { title: "Credit Note Register", href: "/dashboard/books/credit-note-register", description: "Sales returns & adjustments", icon: <BookIcon /> },
  { title: "Journal Register", href: "/dashboard/books/journal-register", description: "Accounting adjustments", icon: <BookIcon /> },
  { title: "Contra Register", href: "/dashboard/books/contra-register", description: "Internal bank & cash transfers", icon: <BookIcon /> },
];

export default function BooksHubPage() {
  return (
    <div className="mx-auto max-w-[1800px]">
      <section className="rounded-2xl sm:rounded-[32px] border border-white/80 bg-white/80 backdrop-blur-md p-4 sm:p-6 lg:p-10 shadow-[0_8px_40px_rgba(15,23,42,0.04)]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:mb-8 lg:mb-10">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] lg:text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Workspace</p>
            <h3 className="mt-1.5 text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">All Books & Registers</h3>
          </div>
        </div>

        <div className="grid gap-2 sm:gap-3 lg:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 rounded-2xl sm:rounded-[28px] border border-slate-100 bg-white/40 p-2 sm:p-3 lg:p-4">
          {BOOKS.map((book) => (
            <ListRowItem
              key={book.title}
              title={book.title}
              description={book.description}
              href={book.href}
              icon={book.icon}
              variant="card"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
