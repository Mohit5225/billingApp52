import { useEffect, useState, Dispatch, SetStateAction } from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { LedgerDetail } from "@/interfaces/ledger";
import { VoucherDetail } from "@/interfaces/voucher";
import { apiRequest } from "@/lib/http";
import { FormState, InvoiceLineState, JournalLineState, TaxMode, VoucherFamily, EMPTY_INVOICE_LINE } from "../types";
import { isTaxLedger } from "./useVoucherData";

type UseVoucherHydrationParams = {
  depsReady: boolean;
  voucherId: string | undefined;
  ledgers: LedgerDetail[];
  family: VoucherFamily;
  supabase: SupabaseClient;
  setForm: Dispatch<SetStateAction<FormState>>;
  setInvoiceLines: Dispatch<SetStateAction<InvoiceLineState[]>>;
  setJournalLines: Dispatch<SetStateAction<JournalLineState[]>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  showToast: (message: string, type: "error" | "success" | "info") => void;
};

export function useVoucherHydration({
  depsReady,
  voucherId,
  ledgers,
  family,
  supabase,
  setForm,
  setInvoiceLines,
  setJournalLines,
  setIsLoading,
  showToast,
}: UseVoucherHydrationParams) {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    if (!depsReady || !voucherId || hasHydrated) return;

    let mounted = true;
    const hydrate = async () => {
      try {
        setIsLoading(true);
        const voucher = await apiRequest<VoucherDetail>(supabase, `/api/vouchers/${voucherId}`);
        if (!mounted) return;

        setForm((prev) => ({
          ...prev,
          voucher_number: voucher.voucher_number,
          voucher_date: voucher.voucher_date,
          narration: voucher.narration || "",
          party_ledger_id: voucher.party_ledger_id || "",
        }));

        if (family === "invoice") {
          const lines = voucher.inventory_lines.map((line) => ({
            item_id: line.item_id,
            quantity: line.quantity,
            unit_price: line.unit_price,
            discount_amount: line.discount_amount,
            taxable_amount: line.taxable_amount,
            igst_rate: line.igst_rate,
            cgst_rate: line.cgst_rate,
            sgst_rate: line.sgst_rate,
            cess_percent: line.cess_percent,
            cess_amount_per_unit: line.cess_amount_per_unit,
            igst_amount: line.igst_amount,
            cgst_amount: line.cgst_amount,
            sgst_amount: line.sgst_amount,
            cess_amount: line.cess_amount,
          }));
          setInvoiceLines(lines.length > 0 ? lines : [{ ...EMPTY_INVOICE_LINE }]);

          const nonPartyLines = voucher.accounting_lines.filter(
            (line) => line.ledger_id !== voucher.party_ledger_id,
          );
          const taxLedgerIds = new Set(ledgers.filter(isTaxLedger).map((ledger) => ledger.id));
          const mainLine = nonPartyLines.find((line) => !taxLedgerIds.has(line.ledger_id));
          const existingTaxMode: TaxMode = voucher.inventory_lines.some(
            (line) => line.igst_amount > 0,
          )
            ? "inter"
            : "intra";
          setForm((prev) => ({
            ...prev,
            main_ledger_id: mainLine?.ledger_id || "",
            manual_tax_mode: existingTaxMode,
          }));
        }

        if (family === "payment") {
          const bankLine = voucher.accounting_lines.find(
            (line) => line.ledger_id !== voucher.party_ledger_id,
          );
          const amount = Math.max(
            ...voucher.accounting_lines.map((line) =>
              Math.max(line.debit_amount, line.credit_amount),
            ),
          );

          // Hydrate bill allocations
          const billAllocations = (voucher.bill_allocations || []).map((a) => ({
            ref_type: a.ref_type as "New Ref" | "Agst Ref" | "Advance" | "On Account",
            ref_name: a.ref_name,
            amount: a.amount,
            amount_type: a.amount_type as "Dr" | "Cr",
            due_date: a.due_date || "",
          }));

          setForm((prev) => ({
            ...prev,
            cash_bank_ledger_id: bankLine?.ledger_id || "",
            amount,
            bill_allocations: billAllocations,
          }));
        }

        if (family === "contra") {
          const debitLine = voucher.accounting_lines.find((line) => line.debit_amount > 0);
          const creditLine = voucher.accounting_lines.find((line) => line.credit_amount > 0);
          setForm((prev) => ({
            ...prev,
            source_ledger_id: creditLine?.ledger_id || "",
            destination_ledger_id: debitLine?.ledger_id || "",
            amount: debitLine?.debit_amount || creditLine?.credit_amount || 0,
          }));
        }

        if (family === "journal") {
          setJournalLines(
            voucher.accounting_lines.map((line) => ({
              ledger_id: line.ledger_id,
              debit_amount: line.debit_amount,
              credit_amount: line.credit_amount,
            })),
          );
        }

        setHasHydrated(true);
      } catch (err) {
        if (mounted) {
          showToast(err instanceof Error ? err.message : "Unable to load voucher", "error");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void hydrate();
    return () => {
      mounted = false;
    };
  }, [depsReady, voucherId, hasHydrated, ledgers, family, showToast, supabase]);
}
