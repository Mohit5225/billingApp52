import { notFound } from "next/navigation";
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

export default async function VoucherCreatePage({ params }: { params: Promise<{ voucherSlug: string }> }) {
  const { voucherSlug } = await params;

  if (!voucherSlug || !VALID_SLUGS.has(voucherSlug)) {
    notFound();
  }

  return <VoucherWorkbench key={voucherSlug} slug={voucherSlug as Parameters<typeof VoucherWorkbench>[0]["slug"]} />;
}
