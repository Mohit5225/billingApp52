"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { StockSummaryRow } from "@/interfaces/inventory";
import { apiRequest } from "@/lib/http";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useFirmScope } from "../../shared/useFirmScope";
import { PageHero, EmptyState } from "../../shared/WorkspaceUi";

export default function StockSummaryPage() {
  const { activeFirmId, supabase } = useFirmScope();
  const searchParams = useSearchParams();
  const fromDate = searchParams?.get("from_date");
  const toDate = searchParams?.get("to_date");

  const { data: stockRows, isLoading } = useQuery({
    queryKey: ["stock-summary", activeFirmId, fromDate, toDate],
    queryFn: () =>
      apiRequest<StockSummaryRow[]>(supabase, "/api/workspace/stock-summary", {
        query: {
          firm_id: activeFirmId,
          ...(fromDate ? { from_date: fromDate } : {}),
          ...(toDate ? { to_date: toDate } : {}),
        },
      }),
    enabled: !!activeFirmId,
  });

  const rows = stockRows || [];
  
  const totalOpeningQty = rows.reduce((acc, row) => acc + row.opening_quantity, 0);
  const totalOpeningVal = rows.reduce((acc, row) => acc + row.opening_value, 0);
  const totalInwardQty = rows.reduce((acc, row) => acc + row.inward_quantity, 0);
  const totalOutwardQty = rows.reduce((acc, row) => acc + row.outward_quantity, 0);
  const totalClosingQty = rows.reduce((acc, row) => acc + row.closing_quantity, 0);
  const totalClosingVal = rows.reduce((acc, row) => acc + row.closing_value, 0);

  return (
    <div className="mx-auto w-full space-y-6 lg:space-y-8">
      <PageHero
        title="Stock Summary"
        description="View inward, outward, and closing balances for all items."
      />

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No Stock Items"
          description="There are no items with stock balances or transactions in this period."
        />
      ) : (
        <div className="rounded-3xl border border-slate-100 bg-white/92 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
              <thead className="bg-slate-50/50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Particulars</th>
                  <th className="px-6 py-4 text-right">Opening Balance</th>
                  <th className="px-6 py-4 text-right">Inwards</th>
                  <th className="px-6 py-4 text-right">Outwards</th>
                  <th className="px-6 py-4 text-right">Closing Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr
                    key={row.item_id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <Link
                        href={`/dashboard/inventory/stock-summary/${row.item_id}${
                          searchParams?.toString() ? "?" + searchParams.toString() : ""
                        }`}
                        className="hover:text-emerald-600 transition"
                      >
                        {row.item_name}
                      </Link>
                      {!row.is_active && (
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-medium text-slate-900">{formatNumber(row.opening_quantity)} {row.uom_name || ""}</div>
                      <div className="text-xs text-slate-400">{formatCurrency(row.opening_value)}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-medium text-slate-900">{formatNumber(row.inward_quantity)} {row.uom_name || ""}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-medium text-slate-900">{formatNumber(row.outward_quantity)} {row.uom_name || ""}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-medium text-slate-900">{formatNumber(row.closing_quantity)} {row.uom_name || ""}</div>
                      <div className="text-xs text-slate-400">{formatCurrency(row.closing_value)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50/50 font-semibold text-slate-900">
                <tr>
                  <td className="px-6 py-4">Grand Total</td>
                  <td className="px-6 py-4 text-right">
                    <div>{formatNumber(totalOpeningQty)}</div>
                    <div className="text-xs text-slate-500">{formatCurrency(totalOpeningVal)}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div>{formatNumber(totalInwardQty)}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div>{formatNumber(totalOutwardQty)}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div>{formatNumber(totalClosingQty)}</div>
                    <div className="text-xs text-slate-500">{formatCurrency(totalClosingVal)}</div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
