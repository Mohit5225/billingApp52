"use client";

import Link from "next/link";

import { PageHero, SurfaceCard } from "../shared/WorkspaceUi";

const BOOKS = [
  {
    title: "Sales Register",
    href: "/dashboard/books/sales-register",
    description: "Review live sales vouchers with numbering, party context, and invoice value.",
  },
  {
    title: "Purchase Register",
    href: "/dashboard/books/purchase-register",
    description: "Track inward billing activity without leaving the dashboard shell.",
  },
  {
    title: "Day Book",
    href: "/dashboard/books/day-book",
    description: "Scan the chronological transaction stream across operational voucher types.",
  },
  {
    title: "Cash Book",
    href: "/dashboard/books/cash-book",
    description: "See vouchers that hit cash or bank ledgers and move quickly into the detail view.",
  },
  {
    title: "Ledger",
    href: "/dashboard/books/ledger",
    description: "Browse ledgers with group classification and configuration details from the aligned backend contract.",
  },
];

export default function BooksHubPage() {
  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Books"
        title="Operational books that are actually wired."
        description="These are the live working registers for the current accounting slice, not placeholders. Use them to review activity, jump into voucher detail, and stay close to day-to-day operations."
      />

      <SurfaceCard
        title="Available books"
        description="The broader reporting layer can come later. This pass focuses on books that need to work every day."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {BOOKS.map((book) => (
            <Link
              key={book.href}
              href={book.href}
              className="rounded-[28px] border border-slate-100 bg-white/92 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
            >
              <p className="text-lg font-semibold text-slate-950">{book.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{book.description}</p>
            </Link>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}
