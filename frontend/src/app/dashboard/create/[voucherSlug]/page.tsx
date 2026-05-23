"use client";

import { notFound, useParams } from "next/navigation";

import { VoucherWorkbench } from "../../shared/VoucherWorkbench";

const VALID_SLUGS = new Set([
  "sales-invoice",
  "purchase-invoice",
  "receipt",
  "payment",
  "debit-note",
  "credit-note",
  "journal-entry",
  "contra-entry",
]);

export default function VoucherCreatePage() {
  const params = useParams<{ voucherSlug: string }>();
  const slug = params.voucherSlug;

  if (!VALID_SLUGS.has(slug)) {
    notFound();
  }

  return <VoucherWorkbench slug={slug as Parameters<typeof VoucherWorkbench>[0]["slug"]} />;
}
