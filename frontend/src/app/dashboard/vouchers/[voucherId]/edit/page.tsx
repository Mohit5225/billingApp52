"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

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
  const { activeFirmId, supabase } = useFirmScope();

  const { data: voucher } = useQuery({
    queryKey: ["voucher", activeFirmId, params.voucherId],
    queryFn: () =>
      apiRequest<VoucherDetail>(supabase, `/api/vouchers/${params.voucherId}`),
    enabled: !!activeFirmId,
  });

  const slug = voucher ? CATEGORY_TO_SLUG[voucher.category] : null;

  if (!slug) {
    return null;
  }

  return <VoucherWorkbench slug={slug} voucherId={params.voucherId} />;
}
