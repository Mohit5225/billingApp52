"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { LedgerDetail } from "@/interfaces/ledger";
import { VoucherDetail } from "@/interfaces/voucher";
import { apiRequest } from "@/lib/http";
import { formatCurrency, formatDate } from "@/lib/format";

import { EmptyState, PageHero, SurfaceCard } from "../../shared/WorkspaceUi";
import { useFirmScope } from "../../shared/useFirmScope";

export default function VoucherDetailPage() {
  const params = useParams<{ voucherId: string }>();
  const router = useRouter();
  const { activeFirmId, supabase } = useFirmScope();
  const [voucher, setVoucher] = useState<VoucherDetail | null>(null);
  const [ledgers, setLedgers] = useState<LedgerDetail[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!activeFirmId) return;

    let mounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [voucherData, ledgerData] = await Promise.all([
          apiRequest<VoucherDetail>(supabase, `/api/vouchers/${params.voucherId}`),
          apiRequest<LedgerDetail[]>(supabase, "/api/ledgers", { query: { firm_id: activeFirmId } }),
        ]);
        if (!mounted) return;
        setVoucher(voucherData);
        setLedgers(ledgerData);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Unable to load voucher detail");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [activeFirmId, params.voucherId, supabase]);

  const ledgerNameById = useMemo(
    () => Object.fromEntries(ledgers.map((ledger) => [ledger.id, ledger.name])),
    [ledgers],
  );

  const total = useMemo(() => {
    if (!voucher) return 0;
    if (voucher.inventory_lines.length > 0) {
      return voucher.inventory_lines.reduce((sum, line) => (
        sum
        + line.taxable_amount
        + line.igst_amount
        + line.cgst_amount
        + line.sgst_amount
        + line.cess_amount
      ), 0);
    }
    return voucher.accounting_lines.reduce((sum, line) => sum + Math.max(line.debit_amount, line.credit_amount), 0) / 2;
  }, [voucher]);

  async function cancelVoucher() {
    if (!voucher) return;
    try {
      setIsCancelling(true);
      await apiRequest<void>(supabase, `/api/vouchers/${voucher.id}`, { method: "DELETE" });
      router.push("/dashboard/books/day-book");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel voucher");
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Voucher Detail"
        title={voucher ? `${voucher.category} • ${voucher.voucher_number}` : "Voucher detail"}
        description={voucher ? `Dated ${formatDate(voucher.voucher_date)} with live accounting and inventory snapshots.` : "Loading voucher detail."}
      >
        {voucher ? (
          <div className="flex flex-wrap gap-3">
            <Link href={`/dashboard/vouchers/${voucher.id}/edit`} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
              Edit voucher
            </Link>
            <button onClick={() => void cancelVoucher()} disabled={isCancelling} className="rounded-2xl border border-rose-200/40 bg-rose-500/15 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {isCancelling ? "Cancelling..." : "Cancel voucher"}
            </button>
          </div>
        ) : null}
      </PageHero>

      {error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div> : null}

      <SurfaceCard title="Header summary" description={isLoading ? "Loading..." : "Key posting choices and commercial context."}>
        {!voucher ? (
          <EmptyState title="Loading voucher" description="Please wait while the voucher details are fetched." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] border border-slate-100 bg-white/92 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Category</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">{voucher.category}</p>
            </div>
            <div className="rounded-[24px] border border-slate-100 bg-white/92 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Party</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">{voucher.party_ledger_id ? ledgerNameById[voucher.party_ledger_id] || "Selected party" : "Not applicable"}</p>
            </div>
            <div className="rounded-[24px] border border-slate-100 bg-white/92 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Date</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">{formatDate(voucher.voucher_date)}</p>
            </div>
            <div className="rounded-[24px] border border-slate-100 bg-slate-950 p-4 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">Total</p>
              <p className="mt-3 text-lg font-semibold">{formatCurrency(total)}</p>
            </div>
            <div className="md:col-span-2 xl:col-span-4 rounded-[24px] border border-slate-100 bg-white/92 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Narration</p>
              <p className="mt-3 text-sm leading-6 text-slate-700">{voucher.narration || "No narration added."}</p>
            </div>
          </div>
        )}
      </SurfaceCard>

      <SurfaceCard title="Accounting lines" description="Final debit and credit rows that hit the books.">
        {!voucher ? null : (
          <div className="space-y-3">
            {voucher.accounting_lines.map((line) => (
              <div key={`${line.ledger_id}-${line.line_number}`} className="grid gap-4 rounded-[24px] border border-slate-100 bg-white/92 p-4 md:grid-cols-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Ledger</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{ledgerNameById[line.ledger_id] || line.ledger_id}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Line</p>
                  <p className="mt-2 text-sm text-slate-700">{line.line_number}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Debit</p>
                  <p className="mt-2 text-sm text-slate-700">{formatCurrency(line.debit_amount)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Credit</p>
                  <p className="mt-2 text-sm text-slate-700">{formatCurrency(line.credit_amount)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>

      {voucher?.inventory_lines.length ? (
        <SurfaceCard title="Inventory snapshot" description="Item-level quantities and tax snapshot frozen at save time.">
          <div className="space-y-3">
            {voucher.inventory_lines.map((line) => (
              <div key={`${line.item_id}-${line.line_number}`} className="rounded-[24px] border border-slate-100 bg-white/92 p-4 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-950">{line.item_name || "Item"}</p>
                    <p className="mt-2 text-sm text-slate-500">{line.hsn_code || "No HSN"} • {line.uom || "No UOM"}</p>
                  </div>
                  <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-5">
                    <span>Qty: {line.quantity}</span>
                    <span>Rate: {formatCurrency(line.unit_price)}</span>
                    <span>Taxable: {formatCurrency(line.taxable_amount)}</span>
                    <span>Tax: {formatCurrency(line.igst_amount + line.cgst_amount + line.sgst_amount + line.cess_amount)}</span>
                    <span>Total: {formatCurrency(line.taxable_amount + line.igst_amount + line.cgst_amount + line.sgst_amount + line.cess_amount)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      ) : null}
    </div>
  );
}
