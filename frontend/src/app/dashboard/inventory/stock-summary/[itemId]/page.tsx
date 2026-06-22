"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import { StockMonthlyRow } from "@/interfaces/inventory";
import { apiRequest } from "@/lib/http";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useFirmScope } from "../../../shared/useFirmScope";
import { PageHero, EmptyState } from "../../../shared/WorkspaceUi";
import { useDateFilter } from "@/context/DateFilterContext";

export default function StockItemMonthlyPage() {
  const { activeFirmId, supabase } = useFirmScope();
  const { fromDate: globalFromDate, toDate: globalToDate } = useDateFilter();
  const params = useParams<{ itemId: string }>();
  const searchParams = useSearchParams();
  const fromDate = searchParams?.get("from_date") || globalFromDate;
  const toDate = searchParams?.get("to_date") || globalToDate;

  const itemId = params.itemId;

  // We need item name, so let's fetch item details as well
  const { data: itemData } = useQuery({
    queryKey: ["item", activeFirmId, itemId],
    queryFn: () =>
      apiRequest<any>(supabase, `/api/items/${itemId}`, {
        query: { firm_id: activeFirmId },
      }),
    enabled: !!activeFirmId && !!itemId,
  });

  const { data: monthlyRows, isLoading } = useQuery({
    queryKey: ["stock-monthly", activeFirmId, itemId, fromDate, toDate],
    queryFn: () =>
      apiRequest<StockMonthlyRow[]>(supabase, `/api/workspace/stock-summary/${itemId}/monthly`, {
        query: {
          firm_id: activeFirmId,
          ...(fromDate ? { from_date: fromDate } : {}),
          ...(toDate ? { to_date: toDate } : {}),
        },
      }),
    enabled: !!activeFirmId && !!itemId,
  });

  const rows = monthlyRows || [];
  
  const totalInwardQty = rows.reduce((acc, row) => acc + row.inward_quantity, 0);
  const totalInwardVal = rows.reduce((acc, row) => acc + row.inward_value, 0);
  const totalOutwardQty = rows.reduce((acc, row) => acc + row.outward_quantity, 0);
  const totalOutwardVal = rows.reduce((acc, row) => acc + row.outward_value, 0);

  // Opening balance is from the first row
  const openingQty = rows.length > 0 ? rows[0].opening_quantity : 0;
  const openingVal = rows.length > 0 ? rows[0].opening_value : 0;

  // Closing balance is from the last row
  const closingQty = rows.length > 0 ? rows[rows.length - 1].closing_quantity : 0;
  const closingVal = rows.length > 0 ? rows[rows.length - 1].closing_value : 0;

  return (
    <div className="mx-auto w-full space-y-6 lg:space-y-8">
      <div className="mb-4">
        <Link
          href={`/dashboard/inventory/stock-summary${searchParams?.toString() ? "?" + searchParams.toString() : ""}`}
          className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition"
        >
          ← Back to Stock Summary
        </Link>
      </div>

      <PageHero
        eyebrow="Stock Summary"
        title={itemData?.name || "Item Monthly Summary"}
        description="Month-wise inward, outward, and closing balances for this item."
      />

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No Monthly Data"
          description="There is no monthly summary data available for this item."
        />
      ) : (
        <div className="rounded-3xl border border-slate-100 bg-white/92 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
              <thead className="bg-slate-50/50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Particulars</th>
                  <th className="px-6 py-4 text-right">Inwards</th>
                  <th className="px-6 py-4 text-right">Outwards</th>
                  <th className="px-6 py-4 text-right">Closing Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-slate-50/30">
                  <td className="px-6 py-4 font-semibold text-slate-500 italic">Opening Balance</td>
                  <td className="px-6 py-4 text-right"></td>
                  <td className="px-6 py-4 text-right"></td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-medium text-slate-900">{formatNumber(openingQty)} {itemData?.uom_name || ""}</div>
                    <div className="text-xs text-slate-400">{formatCurrency(openingVal)}</div>
                  </td>
                </tr>
                {rows.map((row) => {
                  // To view vouchers for a specific month, we pass from_date and to_date
                  // We can create a date range for the month
                  const monthStart = `${row.year}-${String(row.month_index > 12 ? row.month_index - 12 : row.month_index).padStart(2, "0")}-01`;
                  // End date is tricky without date libraries, but we can pass month and year, or just let Tally style 
                  // pass the month/year to the vouchers page and it filters there.
                  // For simplicity, let's just pass `month_start` query param.
                  const qs = new URLSearchParams(searchParams?.toString() || "");
                  qs.set("month_start", monthStart);
                  
                  return (
                    <tr
                      key={`${row.year}-${row.month}`}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 font-medium text-slate-900">
                        <Link
                          href={`/dashboard/inventory/stock-summary/${itemId}/vouchers?${qs.toString()}`}
                          className="hover:text-emerald-600 transition"
                        >
                          {row.month}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-medium text-slate-900">{formatNumber(row.inward_quantity)} {itemData?.uom_name || ""}</div>
                        <div className="text-xs text-slate-400">{formatCurrency(row.inward_value)}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-medium text-slate-900">{formatNumber(row.outward_quantity)} {itemData?.uom_name || ""}</div>
                        <div className="text-xs text-slate-400">{formatCurrency(row.outward_value)}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-medium text-slate-900">{formatNumber(row.closing_quantity)} {itemData?.uom_name || ""}</div>
                        <div className="text-xs text-slate-400">{formatCurrency(row.closing_value)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50/50 font-semibold text-slate-900">
                <tr>
                  <td className="px-6 py-4">Grand Total</td>
                  <td className="px-6 py-4 text-right">
                    <div>{formatNumber(totalInwardQty)}</div>
                    <div className="text-xs text-slate-500">{formatCurrency(totalInwardVal)}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div>{formatNumber(totalOutwardQty)}</div>
                    <div className="text-xs text-slate-500">{formatCurrency(totalOutwardVal)}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div>{formatNumber(closingQty)}</div>
                    <div className="text-xs text-slate-500">{formatCurrency(closingVal)}</div>
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
