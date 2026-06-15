"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useState, useRef, useCallback } from "react";

import { VoucherDetail } from "@/interfaces/voucher";
import { apiRequest } from "@/lib/http";
import { useToast } from "@/context/ToastContext";
import { useDashboardChrome } from "@/context/DashboardChromeContext";
import type { InvoiceData, InvoiceType } from "@/components/templates/types";

import { useFirmScope } from "./useFirmScope";
import { useFocusTraversal } from "./useFocusTraversal";
import { useDateFilter } from "@/context/DateFilterContext";
import { round2, numberToWords, recalcLine } from "./voucher/utils";
import { InvoicePreviewOverlay } from "./voucher/components/InvoicePreviewOverlay";
import { BillWiseDetailsModal } from "./voucher/components/BillWiseDetailsModal";
import { DebitCreditNoteDetailsModal } from "./voucher/components/DebitCreditNoteDetailsModal";

import {
  VoucherSlug,
  TaxMode,
  InvoiceLineState,
  JournalLineState,
  FormState,
  VOUCHER_META,
  getEmptyForm,
  EMPTY_INVOICE_LINE,
  EMPTY_JOURNAL_LINE,
} from "./voucher/types";
import { useVoucherData } from "./voucher/hooks/useVoucherData";
import { useVoucherHydration } from "./voucher/hooks/useVoucherHydration";
import { buildVoucherPayload } from "./voucher/buildPayload";
import { VoucherHeader } from "./voucher/components/VoucherHeader";
import { VoucherPartySection } from "./voucher/components/VoucherPartySection";
import { InvoiceItemsTable } from "./voucher/components/InvoiceItemsTable";
import { JournalLinesTable } from "./voucher/components/JournalLinesTable";
import { TotalsAndNarration } from "./voucher/components/TotalsAndNarration";
import { VoucherActionBar } from "./voucher/components/VoucherActionBar";


export function VoucherWorkbench({
  slug,
  voucherId,
  readOnly = false,
}: {
  slug: VoucherSlug;
  voucherId?: string;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const { activeFirmId, supabase } = useFirmScope();
  const { showToast } = useToast();
  const meta = VOUCHER_META[slug];
  const isEditing = Boolean(voucherId);
  const { setBottomNavVisible } = useDashboardChrome();
  const { fromDate: globalFromDate, toDate: globalToDate } = useDateFilter();

  useLayoutEffect(() => {
    setBottomNavVisible(false);

    return () => {
      setBottomNavVisible(true);
    };
  }, [setBottomNavVisible]);

  const [form, setForm] = useState<FormState>(() => getEmptyForm(globalFromDate, globalToDate));
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLineState[]>([{ ...EMPTY_INVOICE_LINE }]);
  const [journalLines, setJournalLines] = useState<JournalLineState[]>([
    { ...EMPTY_JOURNAL_LINE },
    { ...EMPTY_JOURNAL_LINE },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showBillWise, setShowBillWise] = useState(false);
  const [showNoteDetailsModal, setShowNoteDetailsModal] = useState(false);

  const itemsScrollRef = useRef<HTMLDivElement>(null);
  const prevInvoiceLinesLength = useRef(invoiceLines.length);
  const prevJournalLinesLength = useRef(journalLines.length);
  const prevAdditionalLedgersLength = useRef(form.additional_ledgers?.length || 0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { initFocus, handleKeyDown } = useFocusTraversal(containerRef);

  useEffect(() => {
    if (!isLoading && activeFirmId) {
      initFocus();
    }
  }, [isLoading, activeFirmId, initFocus]);

  useEffect(() => {
    if (
      invoiceLines.length > prevInvoiceLinesLength.current ||
      journalLines.length > prevJournalLinesLength.current ||
      (form.additional_ledgers?.length || 0) > prevAdditionalLedgersLength.current
    ) {
      if (itemsScrollRef.current) {
        setTimeout(() => {
          if (itemsScrollRef.current) {
            itemsScrollRef.current.scrollTo({
              top: itemsScrollRef.current.scrollHeight,
              behavior: "smooth"
            });
          }
        }, 50);
      }
    }
    prevInvoiceLinesLength.current = invoiceLines.length;
    prevJournalLinesLength.current = journalLines.length;
    prevAdditionalLedgersLength.current = form.additional_ledgers?.length || 0;
  }, [invoiceLines.length, journalLines.length, form.additional_ledgers?.length]);

  // ── Data fetching via React Query ──
  const {
    ledgers,
    items,
    firmDetails,
    firmState,
    permanentDiscountToggle,
    depsReady,
    partyLedgers,
    cashBankLedgers,
    mainLedgers,
    allLedgerOptions,
    nextNumberData,
  } = useVoucherData(activeFirmId, supabase, meta.category, isEditing);

  const selectedPartyLedger = useMemo(
    () => ledgers.find((ledger) => ledger.id === form.party_ledger_id) || null,
    [form.party_ledger_id, ledgers],
  );

  const taxMode = useMemo<TaxMode>(() => {
    const partyState = selectedPartyLedger?.party_details?.state?.trim().toLowerCase();
    const normalizedFirmState = firmState.trim().toLowerCase();
    if (partyState && normalizedFirmState) {
      return partyState === normalizedFirmState ? "intra" : "inter";
    }
    // We no longer fallback to manual_tax_mode. Validation in buildPayload will catch missing states.
    return "intra";
  }, [firmState, selectedPartyLedger]);

  useEffect(() => {
    if (meta.family !== "invoice") return;

    setInvoiceLines((prevLines) => {
      let hasChanges = false;
      const newLines = prevLines.map((line) => {
        if (!line.item_id) return line;
        const item = items.find((i) => i.id === line.item_id);
        const newLine = recalcLine(line, item, taxMode);
        
        if (
          newLine.igst_amount !== line.igst_amount ||
          newLine.cgst_amount !== line.cgst_amount ||
          newLine.sgst_amount !== line.sgst_amount ||
          newLine.igst_rate !== line.igst_rate ||
          newLine.cgst_rate !== line.cgst_rate ||
          newLine.sgst_rate !== line.sgst_rate
        ) {
          hasChanges = true;
        }
        
        return newLine;
      });

      return hasChanges ? newLines : prevLines;
    });
  }, [taxMode, items, meta.family]);

  const invoiceTotals = useMemo(() => {
    const taxable = round2(invoiceLines.reduce((sum, line) => sum + line.taxable_amount, 0));
    const igst = round2(invoiceLines.reduce((sum, line) => sum + line.igst_amount, 0));
    const cgst = round2(invoiceLines.reduce((sum, line) => sum + line.cgst_amount, 0));
    const sgst = round2(invoiceLines.reduce((sum, line) => sum + line.sgst_amount, 0));
    return {
      taxable,
      igst,
      cgst,
      sgst,
      grandTotal: round2(taxable + igst + cgst + sgst),
    };
  }, [invoiceLines]);

  // ── Voucher hydration (only when editing an existing voucher) ──
  useVoucherHydration({
    depsReady,
    voucherId,
    ledgers,
    family: meta.family,
    supabase,
    setForm,
    setInvoiceLines,
    setJournalLines,
    setIsLoading,
    showToast,
  });



  useEffect(() => {
    if (nextNumberData?.next_number && !isEditing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm((prev) => {
        // Only set it once if it's currently empty, avoiding reset on user erase
        if (prev.voucher_number === "") {
          return { ...prev, voucher_number: nextNumberData.next_number };
        }
        return prev;
      });
    }
  }, [nextNumberData, isEditing]);

  useEffect(() => {
    if (!isEditing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm((prev) => {
        let changed = false;
        const next = { ...prev };

        if (meta.family === "invoice" && mainLedgers.length > 0 && !prev.main_ledger_id) {
          next.main_ledger_id = mainLedgers[0].value;
          changed = true;
        }

        if (meta.family === "payment" && cashBankLedgers.length > 0 && !prev.cash_bank_ledger_id) {
          next.cash_bank_ledger_id = cashBankLedgers[0].value;
          changed = true;
        }

        if (meta.family === "contra" && cashBankLedgers.length > 0) {
          if (!prev.source_ledger_id) {
            next.source_ledger_id = cashBankLedgers[0].value;
            changed = true;
          }
          if (!prev.destination_ledger_id) {
            next.destination_ledger_id = cashBankLedgers.length > 1 ? cashBankLedgers[1].value : cashBankLedgers[0].value;
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    }
  }, [meta.family, isEditing, mainLedgers, cashBankLedgers]);

  /** Serialize live form state into InvoiceData for template preview */
  const buildPreviewData = useCallback((): InvoiceData | null => {
    if (!firmDetails) return null;

    const categoryToType: Record<string, InvoiceType> = {
      Sales: "TAX INVOICE",
      Purchase: "PURCHASE INVOICE",
      "Debit Note": "DEBIT NOTE",
      "Credit Note": "CREDIT NOTE",
    };

    const lineItems = invoiceLines
      .filter((line) => {
        const isPristine = !line.item_id && (line.quantity === 1 || !line.quantity) && !line.unit_price && !line.discount_amount;
        return !isPristine;
      })
      .map((line, idx) => {
        const item = items.find((i) => i.id === line.item_id);
        return {
          srNo: idx + 1,
          name: item?.name || "(unnamed item)",
          hsnSac: item?.hsn_code || "",
          quantity: line.quantity,
          uom: item?.uom_name || "NOS",
          rate: line.unit_price,
          discount: line.discount_amount,
          taxableAmount: line.taxable_amount,
          igstRate: line.igst_rate || undefined,
          cgstRate: line.cgst_rate || undefined,
          sgstRate: line.sgst_rate || undefined,
          igstAmount: line.igst_amount || undefined,
          cgstAmount: line.cgst_amount || undefined,
          sgstAmount: line.sgst_amount || undefined,
        };
      });

    // Build HSN-level tax breakdown
    const hsnMap = new Map<string, { taxableValue: number; igstRate: number; igstAmount: number; cgstRate: number; cgstAmount: number; sgstRate: number; sgstAmount: number }>();
    for (const line of lineItems) {
      const hsn = line.hsnSac || "—";
      const existing = hsnMap.get(hsn) || { taxableValue: 0, igstRate: 0, igstAmount: 0, cgstRate: 0, cgstAmount: 0, sgstRate: 0, sgstAmount: 0 };
      existing.taxableValue += line.taxableAmount;
      existing.igstRate = line.igstRate || existing.igstRate;
      existing.igstAmount += line.igstAmount || 0;
      existing.cgstRate = line.cgstRate || existing.cgstRate;
      existing.cgstAmount += line.cgstAmount || 0;
      existing.sgstRate = line.sgstRate || existing.sgstRate;
      existing.sgstAmount += line.sgstAmount || 0;
      hsnMap.set(hsn, existing);
    }

    const taxBreakdown = Array.from(hsnMap.entries()).map(([hsn, data]) => ({
      hsnSac: hsn,
      taxableValue: data.taxableValue,
      igstRate: data.igstRate || undefined,
      igstAmount: data.igstAmount || undefined,
      cgstRate: data.cgstRate || undefined,
      cgstAmount: data.cgstAmount || undefined,
      sgstRate: data.sgstRate || undefined,
      sgstAmount: data.sgstAmount || undefined,
      totalTax: data.igstAmount + data.cgstAmount + data.sgstAmount,
    }));

    const partyLedger = ledgers.find((l) => l.id === form.party_ledger_id);

    return {
      type: categoryToType[meta.category] || "TAX INVOICE",
      invoiceNumber: form.voucher_number || "—",
      invoiceDate: form.voucher_date
        ? new Date(form.voucher_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "—",
      company: {
        name: firmDetails.name,
        address: firmDetails.address,
        phone: firmDetails.phone,
        email: firmDetails.email,
        gstin: firmDetails.gstin,
        pan: firmDetails.pan,
        state: firmDetails.state,
      },
      party: {
        name: partyLedger?.name || "—",
        address: partyLedger?.party_details?.address || undefined,
        phone: undefined,
        gstin: partyLedger?.party_details?.gstin || undefined,
        state: partyLedger?.party_details?.state || undefined,
        placeOfSupply: partyLedger?.party_details?.state || undefined,
      },
      items: lineItems,
      taxBreakdown,
      subtotal: invoiceTotals.taxable,
      igstTotal: invoiceTotals.igst || undefined,
      cgstTotal: invoiceTotals.cgst || undefined,
      sgstTotal: invoiceTotals.sgst || undefined,
      grandTotal: invoiceTotals.grandTotal + (form.additional_ledgers?.reduce((sum, l) => sum + (Number(l.amount) || 0), 0) || 0),
      totalInWords: numberToWords(invoiceTotals.grandTotal + (form.additional_ledgers?.reduce((sum, l) => sum + (Number(l.amount) || 0), 0) || 0)),
      bankDetails: firmDetails.bankName
        ? {
          bankName: firmDetails.bankName,
          branch: firmDetails.branchName || "",
          accountNumber: firmDetails.accountNumber || "",
          ifsc: firmDetails.ifscCode || "",
        }
        : undefined,
    };
  }, [firmDetails, invoiceLines, items, invoiceTotals, form, ledgers, meta.category]);

  function buildPayload() {
    if (!activeFirmId) throw new Error("No active firm selected");
    return buildVoucherPayload({
      activeFirmId,
      form,
      family: meta.family,
      category: meta.category,
      invoiceLines,
      invoiceTotals,
      journalLines,
      ledgers,
      firmState,
    });
  }

  async function submit() {
    try {
      setIsSubmitting(true);
      const payload = buildPayload();

      const result = isEditing
        ? await apiRequest<VoucherDetail>(supabase, `/api/vouchers/${voucherId}`, {
          method: "PUT",
          body: payload,
        })
        : await apiRequest<VoucherDetail>(supabase, "/api/vouchers/", {
          method: "POST",
          body: payload,
        });

      showToast(`Voucher ${isEditing ? "updated" : "saved"} successfully!`, "success");

      if (isEditing) {
        router.push(`/dashboard/vouchers/${result.id}`);
      } else {
        setForm((prev) => ({
          ...getEmptyForm(globalFromDate, globalToDate),
          voucher_date: prev.voucher_date,
        }));
        setInvoiceLines([{ ...EMPTY_INVOICE_LINE }]);
        setJournalLines([
          { ...EMPTY_JOURNAL_LINE },
          { ...EMPTY_JOURNAL_LINE },
        ]);

        setTimeout(() => {
          initFocus();
        }, 50);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to save voucher", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAutoFill(invoiceNo: string) {
    if (!activeFirmId || !form.party_ledger_id) return;
    try {
      setIsLoading(true);
      const categoryToFetch = meta.category === "Debit Note" ? "Purchase" : "Sales";
      const params = new URLSearchParams({
        firm_id: activeFirmId,
        category: categoryToFetch,
        voucher_number: invoiceNo,
        party_ledger_id: form.party_ledger_id,
      });

      const response = await apiRequest<any[]>(supabase, `/api/vouchers/?${params.toString()}`);
      if (response && response.length > 0) {
        const originalInvoiceId = response[0].id;
        const detail = await apiRequest<VoucherDetail>(supabase, `/api/vouchers/${originalInvoiceId}`);
        
        // Auto-fill form details
        setForm((prev) => ({
          ...prev,
        }));

        if (detail.inventory_lines && detail.inventory_lines.length > 0) {
          setInvoiceLines(detail.inventory_lines.map(line => ({
            ...EMPTY_INVOICE_LINE,
            item_id: line.item_id,
            quantity: line.quantity,
            unit_price: line.unit_price,
            discount_amount: line.discount_amount,
            taxable_amount: line.taxable_amount,
            igst_rate: line.igst_rate,
            cgst_rate: line.cgst_rate,
            sgst_rate: line.sgst_rate,
            igst_amount: line.igst_amount,
            cgst_amount: line.cgst_amount,
            sgst_amount: line.sgst_amount,
          })));
        }
        showToast("Auto-filled from original invoice successfully!", "success");
      } else {
        showToast("Original invoice not found. Please verify the number.", "error");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to fetch original invoice", "error");
    } finally {
      setIsLoading(false);
    }
  }

  if (!depsReady || isLoading) {
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

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown} className="voucher-container flex flex-col w-full min-h-[calc(100vh-var(--bottom-nav-height)-1rem)] lg:h-[calc(100vh-2rem)] lg:min-h-[800px] rounded-xl border border-slate-300 bg-white shadow-sm overflow-y-auto scroll-pb-[300px] lg:scroll-pb-[450px]">
      {/* ── Voucher Command Ribbon ── */}
      <VoucherHeader
        meta={meta}
        isEditing={isEditing}
        readOnly={readOnly}
        form={form}
        setForm={setForm}
        globalFromDate={globalFromDate}
        globalToDate={globalToDate}
        onOpenNoteDetails={() => setShowNoteDetailsModal(true)}
      />

      {/* ── Zone B: Party / Ledger / Payment Table ── */}
      <VoucherPartySection
        meta={meta}
        form={form}
        setForm={setForm}
        cashBankLedgers={cashBankLedgers}
        partyLedgers={partyLedgers}
        mainLedgers={mainLedgers}
        allLedgerOptions={allLedgerOptions}
        selectedPartyLedger={selectedPartyLedger}
        taxMode={taxMode}
        readOnly={readOnly}
        onOpenBillWise={() => setShowBillWise(true)}
        onPartySelected={() => setShowNoteDetailsModal(true)}
      />

      {/* ── Zone C: Items Table ── */}
      {meta.family === "invoice" ? (
        <InvoiceItemsTable
          invoiceLines={invoiceLines}
          setInvoiceLines={setInvoiceLines}
          items={items}
          taxMode={taxMode}
          readOnly={readOnly}
          itemsScrollRef={itemsScrollRef}
          showDiscount={permanentDiscountToggle}
        />
      ) : null}

      {meta.family === "journal" ? (
        <JournalLinesTable
          journalLines={journalLines}
          setJournalLines={setJournalLines}
          allLedgerOptions={allLedgerOptions}
          readOnly={readOnly}
          itemsScrollRef={itemsScrollRef}
        />
      ) : null}

      {/* ── Zone D: Narration + Totals ── */}
      <TotalsAndNarration
        meta={meta}
        form={form}
        setForm={setForm}
        readOnly={readOnly}
        taxMode={taxMode}
        invoiceTotals={invoiceTotals}
        ledgers={ledgers}
      />

      {/* ── Zone E: Footer Actions ── */}
      <VoucherActionBar
        meta={meta}
        isEditing={isEditing}
        readOnly={readOnly}
        isSubmitting={isSubmitting}
        isLoading={isLoading}
        voucherId={voucherId}
        onCancel={() => router.back()}
        onSubmit={() => void submit()}
        onPreview={() => setShowPreview(true)}
        onOpenNoteDetails={() => setShowNoteDetailsModal(true)}
      />

      {/* ── Invoice Preview Overlay ── */}
      {showPreview && meta.family === "invoice" && (
        <InvoicePreviewOverlay
          buildPreviewData={buildPreviewData}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* ── Debit/Credit Note Details Modal ── */}
      {(meta.category === "Debit Note" || meta.category === "Credit Note") && (
        <DebitCreditNoteDetailsModal
          open={showNoteDetailsModal}
          onClose={() => setShowNoteDetailsModal(false)}
          form={form}
          setForm={setForm}
          onAutoFill={handleAutoFill}
          isCreditNote={meta.category === "Credit Note"}
        />
      )}

      {/* ── Bill-wise Details Modal ── */}
      {showBillWise && meta.family === "payment" && activeFirmId && (
        <BillWiseDetailsModal
          open={showBillWise}
          onClose={() => setShowBillWise(false)}
          onSave={(allocations) => {
            setForm((prev) => ({ ...prev, bill_allocations: allocations }));
          }}
          partyName={selectedPartyLedger?.name || "Party"}
          totalAmount={form.amount}
          allocationAmountType={meta.category === "Receipt" ? "Cr" : "Dr"}
          firmId={activeFirmId}
          partyLedgerId={form.party_ledger_id}
          supabase={supabase}
          existingAllocations={form.bill_allocations}
          voucherDate={form.voucher_date}
        />
      )}
    </div>
  );
}



