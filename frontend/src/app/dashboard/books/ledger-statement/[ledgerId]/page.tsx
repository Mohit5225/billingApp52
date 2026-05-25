"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useToast } from "@/context/ToastContext";
import { LedgerStatement as LedgerStatementData } from "@/interfaces/ledger";
import { apiRequest } from "@/lib/http";
import { formatCurrency, formatDate } from "@/lib/format";

import { EmptyState, MetricTile, PageHero, SurfaceCard } from "../../../shared/WorkspaceUi";
import { useFirmScope } from "../../../shared/useFirmScope";

function formatBalance(amount: number, balanceType: string) {
  return `${balanceType} ${formatCurrency(amount)}`;
}

export default function LedgerStatementPage() {
  const params = useParams<{ ledgerId: string }>();
  const ledgerId = params.ledgerId;
  const { activeFirmId, supabase } = useFirmScope();
  const { showToast } = useToast();
  const [statement, setStatement] = useState<LedgerStatementData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({ fromDate: "", toDate: "" });
  const [appliedFilters, setAppliedFilters] = useState({ fromDate: "", toDate: "" });

  useEffect(() => {
    if (!activeFirmId || !ledgerId) return;

    let mounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await apiRequest<LedgerStatementData>(supabase, `/api/ledgers/${ledgerId}/statement`, {
          query: {
            firm_id: activeFirmId,
            from_date: appliedFilters.fromDate || undefined,
            to_date: appliedFilters.toDate || undefined,
          },
        });
        if (mounted) setStatement(data);
      } catch (err) {
        if (mounted) showToast(err instanceof Error ? err.message : "Unable to load ledger statement", "error");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [activeFirmId, appliedFilters.fromDate, appliedFilters.toDate, ledgerId, showToast, supabase]);

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  function clearFilters() {
    const emptyFilters = { fromDate: "", toDate: "" };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }

  const openingBalanceLabel = statement ? formatBalance(statement.opening_balance, statement.opening_balance_type) : "";
  const closingBalanceLabel = statement ? formatBalance(statement.closing_balance, statement.closing_balance_type) : "";

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Ledger Statement"
        title={statement?.ledger.name || "Ledger"}
        description={statement ? `${statement.ledger.group_name || "Ungrouped"}${statement.ledger.group_parent_name ? ` • ${statement.ledger.group_parent_name}` : ""} • ${statement.ledger.template_type}` : "View the running Dr and Cr movement for this party ledger."}
      >
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/books/ledger"
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-white/15"
          >
            Back to books
          </Link>
          {ledgerId ? (
            <Link
              href={`/dashboard/create/ledger?ledger_id=${ledgerId}`}
              className="rounded-full border border-white/20 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-900 transition hover:bg-slate-50"
            >
              Edit ledger
            </Link>
          ) : null}
        </div>
      </PageHero>

      <SurfaceCard
        title="Balance summary"
        description={isLoading ? "Loading..." : "Opening balance and the current running position for the selected ledger."}
      >
        {statement ? (
          <div className="grid gap-4 md:grid-cols-3">
            <MetricTile label="Opening balance" value={openingBalanceLabel} helper="Carried forward from the ledger master." />
            <MetricTile label="Current balance" value={closingBalanceLabel} helper="After applying all posted voucher lines." />
            <MetricTile label="Total movement" value={formatCurrency(statement.total_debit + statement.total_credit)} helper="Combined Dr and Cr activity in the visible range." />
          </div>
        ) : (
          <EmptyState title="No statement loaded" description="Select a ledger from Books to inspect its voucher movement." />
        )}
      </SurfaceCard>

      <SurfaceCard
        title="Ledger rows"
        description="Date-wise voucher movement with debit, credit, particulars, and a live running balance."
      >
        {statement ? (
          <div className="space-y-4">
            <form onSubmit={handleFilterSubmit} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                From date
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(event) => setFilters((prev) => ({ ...prev, fromDate: event.target.value }))}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-300"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                To date
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(event) => setFilters((prev) => ({ ...prev, toDate: event.target.value }))}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-300"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="h-11 rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
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
