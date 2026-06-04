"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { LedgerDetail } from "@/interfaces/ledger";
import { RegisterRow } from "@/interfaces/workspace";
import { getApiBaseUrl } from "@/lib/api";
import { apiRequest } from "@/lib/http";
import { formatCurrency, formatDate } from "@/lib/format";
import { useToast } from "@/context/ToastContext";

import { EmptyState, PageHero, SurfaceCard } from "../../shared/WorkspaceUi";
import { useFirmScope } from "../../shared/useFirmScope";
import { useDateFilter } from "@/context/DateFilterContext";

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
  const { fromDate, toDate } = useDateFilter();
  const { showToast } = useToast();
  const [exportingLedgerId, setExportingLedgerId] = useState<string | null>(null);
  const [isExportingBook, setIsExportingBook] = useState(false);

  const copy = BOOK_LABELS[bookSlug] || BOOK_LABELS["day-book"];

  const { data: ledgers = [], isLoading: ledgersLoading } = useQuery({
    queryKey: ["ledgers", activeFirmId],
    queryFn: () =>
      apiRequest<LedgerDetail[]>(supabase, "/api/ledgers/", {
        query: { firm_id: activeFirmId },
      }),
    enabled: !!activeFirmId && bookSlug === "ledger",
  });

  const { data: rows = [], isLoading: rowsLoading } = useQuery({
    queryKey: ["register", bookSlug, activeFirmId, fromDate, toDate],
    queryFn: () =>
      apiRequest<RegisterRow[]>(supabase, `/api/workspace/books/${bookSlug}`, {
        query: { firm_id: activeFirmId, from_date: fromDate, to_date: toDate },
      }),
    enabled: !!activeFirmId && bookSlug !== "ledger",
  });

  const isLoading = ledgersLoading || rowsLoading;

  async function downloadXlsx(url: string, downloadName: string) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("No active session");
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = downloadName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(blobUrl);
  }

  async function exportLedgerExcel(ledger: LedgerDetail) {
    if (!activeFirmId) return;
    setExportingLedgerId(ledger.id);
    try {
      const url = new URL(`${getApiBaseUrl()}/api/ledgers/${ledger.id}/statement/export`);
      url.searchParams.set("firm_id", activeFirmId);
      const downloadName = `${ledger.name.replace(/[^A-Za-z0-9._-]+/g, "_")}-statement.xlsx`;
      await downloadXlsx(url.toString(), downloadName);
      showToast(`${ledger.name} exported to Excel`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to export ledger", "error");
    } finally {
      setExportingLedgerId(null);
    }
  }

  async function exportBookExcel() {
    if (!activeFirmId || bookSlug === "ledger") return;
    setIsExportingBook(true);
    try {
      const url = new URL(`${getApiBaseUrl()}/api/workspace/books/${bookSlug}/export`);
      url.searchParams.set("firm_id", activeFirmId);
      if (fromDate) url.searchParams.set("from_date", fromDate);
      if (toDate) url.searchParams.set("to_date", toDate);
      const downloadName = `${bookSlug.replace(/[^A-Za-z0-9._-]+/g, "_")}-export.xlsx`;
      await downloadXlsx(url.toString(), downloadName);
      showToast(`${copy.title} exported to Excel`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to export register", "error");
    } finally {
      setIsExportingBook(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHero eyebrow="Book Detail" title={copy.title} description={copy.description} />
      {bookSlug !== "ledger" ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={exportBookExcel}
            disabled={isExportingBook || rows.length === 0}
            className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isExportingBook ? "Exporting..." : "Export Excel"}
          </button>
        </div>
      ) : null}


      <SurfaceCard title={copy.title} description="Live rows from the operational backend.">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="rounded-3xl border border-slate-100 bg-white/92 p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-32 animate-shimmer-fast rounded-full" style={{ animationDelay: `${i * 0.1}s` }} />
                      <div className="h-5 w-16 animate-shimmer-fast rounded-full" style={{ animationDelay: `${i * 0.1 + 0.02}s` }} />
                    </div>
                    <div className="h-4 w-48 animate-shimmer-fast rounded-full" style={{ animationDelay: `${i * 0.1 + 0.04}s` }} />
                    <div className="h-3 w-64 animate-shimmer-fast rounded-full" style={{ animationDelay: `${i * 0.1 + 0.06}s` }} />
                  </div>
                  <div className="h-6 w-24 animate-shimmer-fast rounded-full" style={{ animationDelay: `${i * 0.1 + 0.08}s` }} />
                </div>
              </div>
            ))}
          </div>
        ) : bookSlug === "ledger" ? (
          ledgers.length === 0 ? (
            <EmptyState title="No ledgers yet" description="Create ledgers first so books and voucher selectors have something real to work with." />
          ) : (
            <div className="space-y-3">
              {ledgers.map((ledger) => (
                <div
                  key={ledger.id}
                  className="rounded-3xl border border-slate-100 bg-white/92 p-5 shadow-sm transition hover:border-emerald-200"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{ledger.name}</p>
                      <p className="mt-2 text-sm text-slate-500">
                        {ledger.group_name || "Ungrouped"} {ledger.group_parent_name ? `• ${ledger.group_parent_name}` : ""} • {ledger.template_type}
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:items-end">
                      <div className="flex flex-wrap gap-3 text-sm text-slate-600 sm:justify-end">
                        <span>Opening: {formatCurrency(ledger.opening_balance)}</span>
                        <span>{ledger.opening_balance_type}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/dashboard/books/ledger-statement/${ledger.id}`}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 transition hover:bg-emerald-100"
                        >
                          View ledger
                        </Link>
                        <button
                          type="button"
                          onClick={() => exportLedgerExcel(ledger)}
                          disabled={exportingLedgerId === ledger.id}
                          className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {exportingLedgerId === ledger.id ? "Exporting..." : "Export Excel"}
                        </button>
                        <Link
                          href={`/dashboard/create/ledger?ledger_id=${ledger.id}`}
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-slate-50"
                        >
                          Edit ledger
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
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
                className="block rounded-3xl border border-slate-100 bg-white/92 p-5 shadow-sm transition hover:border-emerald-200"
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
