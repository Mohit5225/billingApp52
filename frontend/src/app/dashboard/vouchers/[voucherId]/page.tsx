"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [voucher, setVoucher] = useState<VoucherDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!activeFirmId) return;

    let mounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const voucherData = await apiRequest<VoucherDetail>(supabase, `/api/vouchers/${params.voucherId}`);
        if (!mounted) return;
        setVoucher(voucherData);
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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div>
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
