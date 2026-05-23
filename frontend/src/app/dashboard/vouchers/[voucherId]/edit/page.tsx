"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { VoucherDetail } from "@/interfaces/voucher";
import { apiRequest } from "@/lib/http";

import { VoucherWorkbench } from "../../../shared/VoucherWorkbench";
import { useFirmScope } from "../../../shared/useFirmScope";

const CATEGORY_TO_SLUG: Record<string, Parameters<typeof VoucherWorkbench>[0]["slug"]> = {
  Sales: "sales-invoice",
  Purchase: "purchase-invoice",
  Receipt: "receipt",
  Payment: "payment",
  "Debit Note": "debit-note",
  "Credit Note": "credit-note",
  Journal: "journal-entry",
  Contra: "contra-entry",
};

export default function VoucherEditPage() {
  const params = useParams<{ voucherId: string }>();
  const { supabase } = useFirmScope();
  const [slug, setSlug] = useState<Parameters<typeof VoucherWorkbench>[0]["slug"] | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const voucher = await apiRequest<VoucherDetail>(supabase, `/api/vouchers/${params.voucherId}`);
      if (mounted) {
        setSlug(CATEGORY_TO_SLUG[voucher.category]);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [params.voucherId, supabase]);

  if (!slug) {
    return null;
  }

  return <VoucherWorkbench slug={slug} voucherId={params.voucherId} />;
}
