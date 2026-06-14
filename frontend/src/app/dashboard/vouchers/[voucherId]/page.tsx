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
      <div className="flex flex-col w-full min-h-[calc(100vh-var(--bottom-nav-height)-1rem)] lg:h-[calc(100vh-2rem)] lg:min-h-[800px] rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden p-6 space-y-6">
        <div className="flex justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-shimmer-fast rounded-md bg-slate-200" />
            <div className="h-6 w-48 animate-shimmer-fast rounded-full bg-slate-200" />
          </div>
          <div className="h-8 w-32 animate-shimmer-fast rounded-full bg-slate-200" />
        </div>
        <div className="h-px w-full bg-slate-100" />
        
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="h-5 w-24 animate-shimmer-fast rounded-full bg-slate-200" />
            <div className="h-12 w-full animate-shimmer-fast rounded-xl bg-slate-200" style={{ animationDelay: "0.1s" }} />
          </div>
          <div className="space-y-4">
            <div className="h-5 w-24 animate-shimmer-fast rounded-full bg-slate-200" />
            <div className="h-12 w-full animate-shimmer-fast rounded-xl bg-slate-200" style={{ animationDelay: "0.1s" }} />
          </div>
        </div>
        
        <div className="mt-8 space-y-4 flex-1">
          <div className="h-8 w-full animate-shimmer-fast rounded-xl bg-slate-100" style={{ animationDelay: "0.2s" }} />
          <div className="h-12 w-full animate-shimmer-fast rounded-xl bg-slate-100" style={{ animationDelay: "0.3s" }} />
          <div className="h-12 w-full animate-shimmer-fast rounded-xl bg-slate-100" style={{ animationDelay: "0.4s" }} />
          <div className="h-12 w-full animate-shimmer-fast rounded-xl bg-slate-100" style={{ animationDelay: "0.5s" }} />
        </div>
        
        <div className="h-px w-full bg-slate-100 mt-auto" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-10 w-48 animate-shimmer-fast rounded-xl bg-slate-200" />
          <div className="h-10 w-64 animate-shimmer-fast rounded-xl bg-slate-200" />
        </div>
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

  return <VoucherWorkbench key={params.voucherId} slug={slug} voucherId={params.voucherId} readOnly={true} />;
}
