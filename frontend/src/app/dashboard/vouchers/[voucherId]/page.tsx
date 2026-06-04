"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { VoucherCategory, VoucherDetail } from "@/interfaces/voucher";
import { apiRequest } from "@/lib/http";

import { useFirmScope } from "../../shared/useFirmScope";
import { VoucherWorkbench } from "../../shared/VoucherWorkbench";

const CATEGORY_TO_SLUG: Record<VoucherCategory, any> = {
  "Sales": "sales-invoice",
  "Purchase": "purchase-invoice",
  "Receipt": "receipt",
  "Payment": "payment",
  "Debit Note": "debit-note",
  "Credit Note": "credit-note",
  "Journal": "journal-entry",
  "Contra": "contra-entry",
};

export default function VoucherDetailPage() {
  const params = useParams<{ voucherId: string }>();
  const router = useRouter();
  const { activeFirmId, supabase } = useFirmScope();

  const { data: voucher, isLoading, error } = useQuery({
    queryKey: ["voucher", activeFirmId, params.voucherId],
    queryFn: () =>
      apiRequest<VoucherDetail>(supabase, `/api/vouchers/${params.voucherId}`),
    enabled: !!activeFirmId,
  });

  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error.message}</div>
      </div>
    );
  }

  if (isLoading || !voucher) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-slate-200 bg-white">
        <p className="text-sm text-slate-500">Loading voucher details...</p>
      </div>
    );
  }

  const slug = CATEGORY_TO_SLUG[voucher.category];
  
  if (!slug) {
    return (
      <div className="space-y-6">
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          Unsupported voucher category: {voucher.category}
        </div>
      </div>
    );
  }

  return <VoucherWorkbench slug={slug} voucherId={params.voucherId} readOnly={true} />;
}
