"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { LedgerDetail } from "@/interfaces/ledger";
import { RegisterRow } from "@/interfaces/workspace";
import { apiRequest } from "@/lib/http";
import { formatCurrency, formatDate } from "@/lib/format";

import { EmptyState, PageHero, SurfaceCard } from "../../shared/WorkspaceUi";
import { useFirmScope } from "../../shared/useFirmScope";

const BOOK_LABELS: Record<string, { title: string; description: string }> = {
  "sales-register": {
    title: "Sales Register",
    description: "Review live sales vouchers with party and amount context.",
  },
  "purchase-register": {
    title: "Purchase Register",
    description: "Monitor inward invoices and supplier-facing voucher activity.",
  },
  "day-book": {
    title: "Day Book",
    description: "Chronological voucher stream for the active firm.",
  },
  "cash-book": {
    title: "Cash Book",
    description: "Operational vouchers touching cash and bank ledgers.",
  },
  ledger: {
    title: "Ledger",
    description: "Account masters with their group and configuration details.",
  },
};

export default function BookDetailPage() {
  const params = useParams<{ bookSlug: string }>();
  const bookSlug = params.bookSlug;
  const { activeFirmId, supabase } = useFirmScope();
  const [rows, setRows] = useState<RegisterRow[]>([]);
  const [ledgers, setLedgers] = useState<LedgerDetail[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const copy = BOOK_LABELS[bookSlug] || BOOK_LABELS["day-book"];

  useEffect(() => {
    if (!activeFirmId) return;

    let mounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (bookSlug === "ledger") {
          const data = await apiRequest<LedgerDetail[]>(supabase, "/api/ledgers/", {
            query: { firm_id: activeFirmId },
          });
          if (mounted) setLedgers(data);
        } else {
          const data = await apiRequest<RegisterRow[]>(supabase, `/api/workspace/books/${bookSlug}`, {
            query: { firm_id: activeFirmId },
          });
          if (mounted) setRows(data);
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Unable to load this book");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [activeFirmId, bookSlug, supabase]);

  return (
    <div className="space-y-6">
      <PageHero eyebrow="Book Detail" title={copy.title} description={copy.description} />

      {error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div> : null}

      <SurfaceCard title={copy.title} description={isLoading ? "Loading..." : "Live rows from the operational backend."}>
        {bookSlug === "ledger" ? (
          ledgers.length === 0 ? (
            <EmptyState title="No ledgers yet" description="Create ledgers first so books and voucher selectors have something real to work with." />
          ) : (
            <div className="space-y-3">
              {ledgers.map((ledger) => (
                <Link
                  key={ledger.id}
                  href={`/dashboard/create/ledger?ledger_id=${ledger.id}`}
                  className="block rounded-[24px] border border-slate-100 bg-white/92 p-5 shadow-sm transition hover:border-emerald-200"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{ledger.name}</p>
                      <p className="mt-2 text-sm text-slate-500">
                        {ledger.group_name || "Ungrouped"} {ledger.group_parent_name ? `• ${ledger.group_parent_name}` : ""} • {ledger.template_type}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                      <span>Opening: {formatCurrency(ledger.opening_balance)}</span>
                      <span>{ledger.opening_balance_type}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : rows.length === 0 ? (
          <EmptyState title="No entries yet" description="Once vouchers are created, this book will start filling with live rows." />
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <Link
                key={row.id}
                href={`/dashboard/vouchers/${row.id}`}
                className="block rounded-[24px] border border-slate-100 bg-white/92 p-5 shadow-sm transition hover:border-emerald-200"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-slate-950">{row.voucher_number}</p>
                      <span className="rounded-full bg-tally-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-tally-700">
                        {row.category}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {row.party_name || row.primary_ledger_name || "Voucher detail"} • {formatDate(row.voucher_date)}
                    </p>
                    {row.narration ? <p className="mt-2 text-sm text-slate-500">{row.narration}</p> : null}
                  </div>
                  <p className="text-lg font-semibold text-slate-950">{formatCurrency(row.amount)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
