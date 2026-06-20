"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import { StockVoucherRow } from "@/interfaces/inventory";
import { apiRequest } from "@/lib/http";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useFirmScope } from "../../../../shared/useFirmScope";
import { PageHero, EmptyState } from "../../../../shared/WorkspaceUi";

export default function StockItemVouchersPage() {
  const { activeFirmId, supabase } = useFirmScope();
  const params = useParams<{ itemId: string }>();
  const searchParams = useSearchParams();
  
  // The month_start is passed from the monthly page
  const monthStart = searchParams?.get("month_start");
  let fromDate = searchParams?.get("from_date");
  let toDate = searchParams?.get("to_date");

  // If monthStart is present, we calculate fromDate and toDate for that month
  if (monthStart) {
    const [yearStr, monthStr] = monthStart.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    
    fromDate = monthStart;
    
    const lastDay = new Date(Date.UTC(year, month, 0));
    const lastDateStr = String(lastDay.getUTCDate()).padStart(2, "0");
    toDate = `${yearStr}-${monthStr.padStart(2, "0")}-${lastDateStr}`;
  }

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

  const { data: voucherRows, isLoading } = useQuery({
    queryKey: ["stock-vouchers", activeFirmId, itemId, fromDate, toDate],
    queryFn: () =>
      apiRequest<StockVoucherRow[]>(supabase, `/api/workspace/stock-summary/${itemId}/vouchers`, {
        query: {
          firm_id: activeFirmId,
          ...(fromDate ? { from_date: fromDate } : {}),
          ...(toDate ? { to_date: toDate } : {}),
        },
      }),
    enabled: !!activeFirmId && !!itemId,
  });

  const rows = voucherRows || [];
  
  const totalInwardQty = rows.reduce((acc, row) => acc + row.inward_quantity, 0);
  const totalInwardVal = rows.reduce((acc, row) => acc + row.inward_value, 0);
  const totalOutwardQty = rows.reduce((acc, row) => acc + row.outward_quantity, 0);
  const totalOutwardVal = rows.reduce((acc, row) => acc + row.outward_value, 0);

  return (
    <div className="mx-auto w-full space-y-6 lg:space-y-8">
      <div className="mb-4">
        <Link
          href={`/dashboard/inventory/stock-summary/${itemId}${searchParams?.toString() ? "?" + searchParams.toString() : ""}`}
          className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition"
        >
          ← Back to Monthly Summary
        </Link>
      </div>

      <PageHero
        eyebrow="Stock Summary"
        title={`Item Vouchers: ${itemData?.name || ""}`}
        description="Detailed inward and outward transactions for this item."
      />

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No Vouchers"
          description="There are no transactions for this item in the selected period."
        />
      ) : (
        <div className="rounded-3xl border border-slate-100 bg-white/92 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
              <thead className="bg-slate-50/50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Particulars</th>
                  <th className="px-6 py-4">Vch Type</th>
                  <th className="px-6 py-4">Vch No.</th>
                  <th className="px-6 py-4 text-right">Inwards</th>
                  <th className="px-6 py-4 text-right">Outwards</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr
                    key={row.voucher_id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4 text-slate-900">
                      {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(row.voucher_date)).replace(/ /g, "-")}
                    </td>
                    <td className="px-6 py-4 font-medium text-emerald-600">
                      <Link href={`/dashboard/vouchers/${row.voucher_id}`}>
                        {row.particulars}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{row.voucher_type}</td>
                    <td className="px-6 py-4 text-slate-500">{row.voucher_number}</td>
                    
                    <td className="px-6 py-4 text-right">
                      {row.inward_quantity > 0 ? (
                        <>
                          <div className="font-medium text-slate-900">{formatNumber(row.inward_quantity)} {itemData?.uom_name || ""}</div>
                          <div className="text-xs text-slate-400">{formatCurrency(row.inward_value)}</div>
                        </>
                      ) : null}
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                      {row.outward_quantity > 0 ? (
                        <>
                          <div className="font-medium text-slate-900">{formatNumber(row.outward_quantity)} {itemData?.uom_name || ""}</div>
                          <div className="text-xs text-slate-400">{formatCurrency(row.outward_value)}</div>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50/50 font-semibold text-slate-900">
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-right">Grand Total</td>
                  <td className="px-6 py-4 text-right">
                    <div>{formatNumber(totalInwardQty)}</div>
                    <div className="text-xs text-slate-500">{formatCurrency(totalInwardVal)}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div>{formatNumber(totalOutwardQty)}</div>
                    <div className="text-xs text-slate-500">{formatCurrency(totalOutwardVal)}</div>
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
