"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";

import { useToast } from "@/context/ToastContext";
import { LedgerStatement as LedgerStatementData } from "@/interfaces/ledger";
import { getApiBaseUrl } from "@/lib/api";
import { apiRequest } from "@/lib/http";
import { formatCurrency, formatDate } from "@/lib/format";

import { EmptyState, MetricTile, PageHero, SurfaceCard } from "../../../shared/WorkspaceUi";
import { useFirmScope } from "../../../shared/useFirmScope";
import { useDateFilter } from "@/context/DateFilterContext";

function formatBalance(amount: number, balanceType: string) {
  return `${balanceType} ${formatCurrency(amount)}`;
}

export default function LedgerStatementPage() {
  const params = useParams<{ ledgerId: string }>();
  const ledgerId = params.ledgerId;
  const { activeFirmId, supabase } = useFirmScope();
  const { fromDate: globalFromDate, toDate: globalToDate } = useDateFilter();
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  
  const [filters, setFilters] = useState({ fromDate: globalFromDate, toDate: globalToDate });
  const [appliedFilters, setAppliedFilters] = useState({ fromDate: globalFromDate, toDate: globalToDate });

  useEffect(() => {
    // Sync filters if global changes and we haven't touched local ones
    setFilters({ fromDate: globalFromDate, toDate: globalToDate });
    setAppliedFilters({ fromDate: globalFromDate, toDate: globalToDate });
  }, [globalFromDate, globalToDate]);

  const { data: statement, isLoading } = useQuery({
    queryKey: ["ledger-statement", ledgerId, activeFirmId, appliedFilters.fromDate, appliedFilters.toDate],
    queryFn: () =>
      apiRequest<LedgerStatementData>(supabase, `/api/ledgers/${ledgerId}/statement`, {
        query: {
          firm_id: activeFirmId,
          from_date: appliedFilters.fromDate || undefined,
          to_date: appliedFilters.toDate || undefined,
        },
      }),
    enabled: !!activeFirmId && !!ledgerId,
  });

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  function clearFilters() {
    const emptyFilters = { fromDate: globalFromDate, toDate: globalToDate };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }

  async function exportLedgerExcel() {
    if (!ledgerId || !activeFirmId) return;
    setIsExporting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      const url = new URL(`${getApiBaseUrl()}/api/ledgers/${ledgerId}/statement/export`);
      url.searchParams.set("firm_id", activeFirmId);
      if (appliedFilters.fromDate) url.searchParams.set("from_date", appliedFilters.fromDate);
      if (appliedFilters.toDate) url.searchParams.set("to_date", appliedFilters.toDate);

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const downloadName = `${(statement?.ledger.name || "ledger").replace(/[^A-Za-z0-9._-]+/g, "_")}-statement.xlsx`;
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = downloadName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
      showToast("Ledger exported to Excel", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to export ledger", "error");
    } finally {
      setIsExporting(false);
    }
  }

  const openingBalanceLabel = statement ? formatBalance(statement.opening_balance, statement.opening_balance_type) : "";
  const closingBalanceLabel = statement ? formatBalance(statement.closing_balance, statement.closing_balance_type) : "";

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Ledger Statement"
        title={statement?.ledger.name || "Ledger"}
        description={statement ? `${statement.ledger.group_name || "Ungrouped"}${statement.ledger.group_parent_name ? ` • ${statement.ledger.group_parent_name}` : ""} • ${statement.ledger.template_type}` : "View the running Dr and Cr movement for this party ledger."}
        backHref="/dashboard/books/ledger"
      >
        <div className="flex flex-wrap gap-2">
          {ledgerId ? (
            <Link
              href={`/dashboard/create/ledger?ledger_id=${ledgerId}`}
              className="rounded-full border border-white/20 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-900 transition hover:bg-slate-50"
            >
              Edit ledger
            </Link>
          ) : null}
          <button
            type="button"
            onClick={exportLedgerExcel}
            disabled={!statement || isExporting}
            className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isExporting ? "Exporting..." : "Export Excel"}
          </button>
        </div>
      </PageHero>
        ) : (
          <EmptyState title="No statement loaded" description="Select a ledger from Books to inspect its voucher movement." />
        )}
      </SurfaceCard>

      <SurfaceCard
        title="Ledger rows"
        description="Date-wise voucher movement with debit, credit, particulars, and a live running balance."
      >
        {isLoading ? (
          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left">
                <thead className="bg-slate-50/90">
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Date</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Voucher</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Particulars</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Dr</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Cr</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...Array(4)].map((_, i) => (
                    <tr key={i} className="align-top">
                      <td className="px-4 py-4"><div className="h-4 w-16 animate-shimmer-fast rounded-full" style={{ animationDelay: `${i * 0.1}s` }} /></td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="h-4 w-20 animate-shimmer-fast rounded-full" style={{ animationDelay: `${i * 0.1 + 0.02}s` }} />
                          <div className="h-3 w-16 animate-shimmer-fast rounded-full" style={{ animationDelay: `${i * 0.1 + 0.04}s` }} />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="h-4 w-48 animate-shimmer-fast rounded-full" style={{ animationDelay: `${i * 0.1 + 0.02}s` }} />
                          <div className="h-3 w-32 animate-shimmer-fast rounded-full" style={{ animationDelay: `${i * 0.1 + 0.04}s` }} />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right"><div className="h-4 w-16 animate-shimmer-fast rounded-full ml-auto" style={{ animationDelay: `${i * 0.1 + 0.06}s` }} /></td>
                      <td className="px-4 py-4 text-right"><div className="h-4 w-16 animate-shimmer-fast rounded-full ml-auto" style={{ animationDelay: `${i * 0.1 + 0.06}s` }} /></td>
                      <td className="px-4 py-4 text-right"><div className="h-4 w-20 animate-shimmer-fast rounded-full ml-auto" style={{ animationDelay: `${i * 0.1 + 0.08}s` }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : statement ? (
          <div className="space-y-4">
            <form onSubmit={handleFilterSubmit} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                From date
                <input
                  type="date"
                  value={filters.fromDate}
                  min={globalFromDate}
                  max={globalToDate}
                  onChange={(event) => setFilters((prev) => ({ ...prev, fromDate: event.target.value }))}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-300"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                To date
                <input
                  type="date"
                  value={filters.toDate}
                  min={globalFromDate}
                  max={globalToDate}
                  onChange={(event) => setFilters((prev) => ({ ...prev, toDate: event.target.value }))}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-300"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="h-11 rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500 flex-1 md:flex-initial"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 flex-1 md:flex-initial"
                >
                  Clear
                </button>
              </div>
            </form>

            <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-left">
                  <thead className="bg-slate-50/90">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Date</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Voucher</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Particulars</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Dr</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Cr</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-emerald-50/40">
                      <td className="px-4 py-3 text-sm font-medium text-slate-500">Opening</td>
                      <td className="px-4 py-3 text-sm text-slate-400">-</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">Opening balance</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-400">-</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-400">-</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{openingBalanceLabel}</td>
                    </tr>
                    {statement.rows.length === 0 ? (
                      <tr>
                        <td className="px-4 py-4 text-sm text-slate-500" colSpan={6}>
                          No posted voucher lines yet for this ledger.
                        </td>
                      </tr>
                    ) : (
                      statement.rows.map((row) => (
                        <tr key={row.voucher_id} className="align-top hover:bg-slate-50/80">
                          <td className="px-4 py-3 text-sm text-slate-600">{formatDate(row.voucher_date)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">
                            <div className="flex flex-col gap-1">
                              <span>{row.voucher_number}</span>
                              <span className="w-fit rounded-full bg-tally-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-tally-700">
                                {row.category}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm leading-6 text-slate-600">
                            <p className="font-medium text-slate-800">{row.particulars}</p>
                            {row.narration && row.narration !== row.particulars ? (
                              <p className="mt-1 text-xs leading-5 text-slate-400">{row.narration}</p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                            {row.debit_amount > 0 ? formatCurrency(row.debit_amount) : "-"}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                            {row.credit_amount > 0 ? formatCurrency(row.credit_amount) : "-"}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                            {formatBalance(row.balance_amount, row.balance_type)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="border-t border-slate-100 bg-slate-50/80">
                    <tr>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900" colSpan={3}>
                        Closing balance
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                        {formatCurrency(statement.total_debit)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                        {formatCurrency(statement.total_credit)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                        {closingBalanceLabel}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState title="No ledger activity" description="This ledger does not yet have posted vouchers, so the statement is empty aside from opening balance." />
        )}
      </SurfaceCard>
    </div>
  );
}
