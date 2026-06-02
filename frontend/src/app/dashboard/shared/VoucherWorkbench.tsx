"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

import { ItemDetail } from "@/interfaces/inventory";
import { LedgerDetail } from "@/interfaces/ledger";
import { VoucherCategory, VoucherDetail, VoucherWritePayload } from "@/interfaces/voucher";
import { apiRequest } from "@/lib/http";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/context/ToastContext";
import { useDashboardChrome } from "@/context/DashboardChromeContext";
import { DashboardChromeScope } from "@/context/DashboardChromeContext";
import { getTemplateById } from "@/components/templates/TemplateRegistry";
import type { InvoiceData, InvoiceType } from "@/components/templates/types";

import { useFirmScope } from "./useFirmScope";
import { ComboboxField } from "./ComboboxField";

type VoucherSlug =
  | "sales-invoice"
  | "purchase-invoice"
  | "receipt"
  | "payment"
  | "debit-note"
  | "credit-note"
  | "journal-entry"
  | "contra-entry";

type VoucherFamily = "invoice" | "payment" | "journal" | "contra";
type TaxMode = "intra" | "inter";

type InvoiceLineState = {
  item_id: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  taxable_amount: number;
  igst_rate: number;
  cgst_rate: number;
  sgst_rate: number;
  cess_percent: number;
  cess_amount_per_unit: number;
  igst_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  cess_amount: number;
};

type JournalLineState = {
  ledger_id: string;
  debit_amount: number;
  credit_amount: number;
};

type FormState = {
  voucher_number: string;
  voucher_date: string;
  narration: string;
  party_ledger_id: string;
  main_ledger_id: string;
  cash_bank_ledger_id: string;
  source_ledger_id: string;
  destination_ledger_id: string;
  amount: number;
  manual_tax_mode: TaxMode;
};

const VOUCHER_META: Record<VoucherSlug, { category: VoucherCategory; family: VoucherFamily; title: string; description: string }> = {
  "sales-invoice": {
    category: "Sales",
    family: "invoice",
    title: "Sales Invoice",
    description: "Party, sales ledger, tax ledgers, and inventory lines stay in one focused invoice workflow.",
  },
  "purchase-invoice": {
    category: "Purchase",
    family: "invoice",
    title: "Purchase Invoice",
    description: "Capture inward goods or services without losing the accounting-side ledger structure.",
  },
  receipt: {
    category: "Receipt",
    family: "payment",
    title: "Receipt Voucher",
    description: "Keep party, cash or bank, amount, date, and narration tight and fast.",
  },
  payment: {
    category: "Payment",
    family: "payment",
    title: "Payment Voucher",
    description: "Move money out with a cleaner, two-ledger flow instead of a bloated invoice screen.",
  },
  "debit-note": {
    category: "Debit Note",
    family: "invoice",
    title: "Debit Note",
    description: "Inventory-backed debit note workflow with separate invoice logic and tax handling.",
  },
  "credit-note": {
    category: "Credit Note",
    family: "invoice",
    title: "Credit Note",
    description: "Bring returns or reversals into the same invoice-grade workflow without turning it into a monster form.",
  },
  "journal-entry": {
    category: "Journal",
    family: "journal",
    title: "Journal Entry",
    description: "Free-form accounting lines for cases that should not pretend to be invoices or payments.",
  },
  "contra-entry": {
    category: "Contra",
    family: "contra",
    title: "Contra Entry",
    description: "A focused two-ledger money movement flow for cash and bank transfers.",
  },
};

const EMPTY_FORM: FormState = {
  voucher_number: "",
  voucher_date: new Date().toISOString().slice(0, 10),
  narration: "",
  party_ledger_id: "",
  main_ledger_id: "",
  cash_bank_ledger_id: "",
  source_ledger_id: "",
  destination_ledger_id: "",
  amount: 0,
  manual_tax_mode: "intra",
};

const EMPTY_INVOICE_LINE: InvoiceLineState = {
  item_id: "",
  quantity: 1,
  unit_price: 0,
  discount_amount: 0,
  taxable_amount: 0,
  igst_rate: 0,
  cgst_rate: 0,
  sgst_rate: 0,
  cess_percent: 0,
  cess_amount_per_unit: 0,
  igst_amount: 0,
  cgst_amount: 0,
  sgst_amount: 0,
  cess_amount: 0,
};

const EMPTY_JOURNAL_LINE: JournalLineState = {
  ledger_id: "",
  debit_amount: 0,
  credit_amount: 0,
};

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isPartyLedger(ledger: LedgerDetail) {
  return ledger.template_type === "party";
}

function isCashBankLedger(ledger: LedgerDetail) {
  return ledger.template_type === "bank" || ledger.group_name === "Cash-in-Hand";
}

function isTaxLedger(ledger: LedgerDetail) {
  return ledger.template_type === "tax";
}

function isMainInvoiceLedger(ledger: LedgerDetail, category: VoucherCategory) {
  if (category === "Sales" || category === "Debit Note") {
    return ledger.group_name === "Sales Accounts" || ledger.group_nature === "Income";
  }
  return ledger.group_name === "Purchase Accounts" || ledger.group_nature === "Expense";
}

function recalcLine(line: InvoiceLineState, item: ItemDetail | undefined, taxMode: TaxMode) {
  const quantity = Number(line.quantity || 0);
  const unitPrice = Number(line.unit_price || 0);
  const discount = Number(line.discount_amount || 0);
  const taxable = round2(Math.max(quantity * unitPrice - discount, 0));

  let igstRate = 0;
  let cgstRate = 0;
  let sgstRate = 0;
  const cessPercent = item?.cess_percent || 0;
  const cessAmountPerUnit = item?.cess_amount_per_unit || 0;

  if (item?.taxability === "Taxable") {
    if (taxMode === "inter") {
      igstRate = item.igst_rate;
    } else {
      cgstRate = item.cgst_rate;
      sgstRate = item.sgst_rate;
    }
  }

  const igstAmount = round2((taxable * igstRate) / 100);
  const cgstAmount = round2((taxable * cgstRate) / 100);
  const sgstAmount = round2((taxable * sgstRate) / 100);
  const cessAmount = round2((taxable * cessPercent) / 100 + quantity * cessAmountPerUnit);

  return {
    ...line,
    taxable_amount: taxable,
    igst_rate: igstRate,
    cgst_rate: cgstRate,
    sgst_rate: sgstRate,
    cess_percent: cessPercent,
    cess_amount_per_unit: cessAmountPerUnit,
    igst_amount: igstAmount,
    cgst_amount: cgstAmount,
    sgst_amount: sgstAmount,
    cess_amount: cessAmount,
  };
}

function requireSelection(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`Select ${label} before saving the voucher`);
  }
  return trimmed;
}

function requireLines<T>(lines: T[], label: string) {
  if (lines.length === 0) {
    throw new Error(`Add at least one ${label}`);
  }
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  step,
  disabled,
}: {
  label?: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  step?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
      {label && (
        <label className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:mb-0 sm:w-1/3">
          {label}
        </label>
      )}
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-11 sm:h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-tally-400 focus:border-tally-500 focus:ring-2 focus:ring-tally-500/[0.15] disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  );
}

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

  useLayoutEffect(() => {
    setBottomNavVisible(false);

    return () => {
      setBottomNavVisible(true);
    };
  }, [setBottomNavVisible]);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLineState[]>([{ ...EMPTY_INVOICE_LINE }]);
  const [journalLines, setJournalLines] = useState<JournalLineState[]>([
    { ...EMPTY_JOURNAL_LINE },
    { ...EMPTY_JOURNAL_LINE },
  ]);
  const [ledgers, setLedgers] = useState<LedgerDetail[]>([]);
  const [items, setItems] = useState<ItemDetail[]>([]);
  const [firmState, setFirmState] = useState<string>("");
  const [firmDetails, setFirmDetails] = useState<{ name: string; address: string; phone?: string; email?: string; gstin?: string; pan?: string; state?: string; bankName?: string; accountNumber?: string; ifscCode?: string; branchName?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const itemsScrollRef = useRef<HTMLDivElement>(null);
  const prevInvoiceLinesLength = useRef(invoiceLines.length);
  const prevJournalLinesLength = useRef(journalLines.length);

  useEffect(() => {
    if (itemsScrollRef.current) {
      if (
        invoiceLines.length > prevInvoiceLinesLength.current ||
        journalLines.length > prevJournalLinesLength.current
      ) {
        itemsScrollRef.current.scrollTop = itemsScrollRef.current.scrollHeight;
      }
    }
    prevInvoiceLinesLength.current = invoiceLines.length;
    prevJournalLinesLength.current = journalLines.length;
  }, [invoiceLines.length, journalLines.length]);

  const partyLedgers = useMemo(
    () => ledgers.filter(isPartyLedger).map((ledger) => ({ value: ledger.id, label: `${ledger.name} • ${ledger.group_name || "Party"}` })),
    [ledgers],
  );
  const cashBankLedgers = useMemo(
    () => ledgers.filter(isCashBankLedger).map((ledger) => ({ value: ledger.id, label: ledger.name })),
    [ledgers],
  );
  const mainLedgers = useMemo(
    () => ledgers.filter((ledger) => isMainInvoiceLedger(ledger, meta.category)).map((ledger) => ({ value: ledger.id, label: `${ledger.name} • ${ledger.group_name || "Main ledger"}` })),
    [ledgers, meta.category],
  );
  const allLedgerOptions = useMemo(
    () => ledgers.map((ledger) => ({ value: ledger.id, label: `${ledger.name} • ${ledger.group_name || "Ledger"}` })),
    [ledgers],
  );

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
    return form.manual_tax_mode;
  }, [firmState, form.manual_tax_mode, selectedPartyLedger]);

  const invoiceTotals = useMemo(() => {
    const taxable = round2(invoiceLines.reduce((sum, line) => sum + line.taxable_amount, 0));
    const igst = round2(invoiceLines.reduce((sum, line) => sum + line.igst_amount, 0));
    const cgst = round2(invoiceLines.reduce((sum, line) => sum + line.cgst_amount, 0));
    const sgst = round2(invoiceLines.reduce((sum, line) => sum + line.sgst_amount, 0));
    const cess = round2(invoiceLines.reduce((sum, line) => sum + line.cess_amount, 0));
    return {
      taxable,
      igst,
      cgst,
      sgst,
      cess,
      grandTotal: round2(taxable + igst + cgst + sgst + cess),
    };
  }, [invoiceLines]);

  useEffect(() => {
    if (!activeFirmId) return;

    let mounted = true;
    const load = async () => {
      try {
        setIsLoading(true);

        const [ledgerData, itemData] = await Promise.all([
          apiRequest<LedgerDetail[]>(supabase, "/api/ledgers/", { query: { firm_id: activeFirmId } }),
          apiRequest<ItemDetail[]>(supabase, "/api/items/", {
            query: { firm_id: activeFirmId, active_only: false },
          }),
        ]);

        const { data: firmData } = await supabase
          .from("firms")
          .select("name, mailing_name, address_lane1, city, state, pincode, mobile, email, gstin, pan, bank_name, account_number, ifsc_code, branch_name")
          .eq("id", activeFirmId)
          .single();

        if (!mounted) return;

        setLedgers(ledgerData);
        setItems(itemData);
        setFirmState(firmData?.state || "");
        if (firmData) {
          setFirmDetails({
            name: firmData.mailing_name || firmData.name || "",
            address: [firmData.address_lane1, firmData.city, firmData.state ? `${firmData.state} - ${firmData.pincode || ""}` : firmData.pincode].filter(Boolean).join(",\n"),
            phone: firmData.mobile || undefined,
            email: firmData.email || undefined,
            gstin: firmData.gstin || undefined,
            pan: firmData.pan || undefined,
            state: firmData.state || undefined,
            bankName: firmData.bank_name || undefined,
            accountNumber: firmData.account_number || undefined,
            ifscCode: firmData.ifsc_code || undefined,
            branchName: firmData.branch_name || undefined,
          });
        }

        if (voucherId) {
          const voucher = await apiRequest<VoucherDetail>(supabase, `/api/vouchers/${voucherId}`);
          if (!mounted) return;

          setForm((prev) => ({
            ...prev,
            voucher_number: voucher.voucher_number,
            voucher_date: voucher.voucher_date,
            narration: voucher.narration || "",
            party_ledger_id: voucher.party_ledger_id || "",
          }));

          if (meta.family === "invoice") {
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

            const nonPartyLines = voucher.accounting_lines.filter((line) => line.ledger_id !== voucher.party_ledger_id);
            const taxLedgerIds = new Set(ledgerData.filter(isTaxLedger).map((ledger) => ledger.id));
            const mainLine = nonPartyLines.find((line) => !taxLedgerIds.has(line.ledger_id));
            const existingTaxMode: TaxMode = voucher.inventory_lines.some((line) => line.igst_amount > 0) ? "inter" : "intra";
            setForm((prev) => ({
              ...prev,
              main_ledger_id: mainLine?.ledger_id || "",
              manual_tax_mode: existingTaxMode,
            }));
          }

          if (meta.family === "payment") {
            const bankLine = voucher.accounting_lines.find((line) => line.ledger_id !== voucher.party_ledger_id);
            const amount = Math.max(...voucher.accounting_lines.map((line) => Math.max(line.debit_amount, line.credit_amount)));
            setForm((prev) => ({
              ...prev,
              cash_bank_ledger_id: bankLine?.ledger_id || "",
              amount,
            }));
          }

          if (meta.family === "contra") {
            const debitLine = voucher.accounting_lines.find((line) => line.debit_amount > 0);
            const creditLine = voucher.accounting_lines.find((line) => line.credit_amount > 0);
            setForm((prev) => ({
              ...prev,
              source_ledger_id: creditLine?.ledger_id || "",
              destination_ledger_id: debitLine?.ledger_id || "",
              amount: debitLine?.debit_amount || creditLine?.credit_amount || 0,
            }));
          }

          if (meta.family === "journal") {
            setJournalLines(
              voucher.accounting_lines.map((line) => ({
                ledger_id: line.ledger_id,
                debit_amount: line.debit_amount,
                credit_amount: line.credit_amount,
              })),
            );
          }
        } else {
          if (meta.family === "journal") {
            setJournalLines([{ ...EMPTY_JOURNAL_LINE }, { ...EMPTY_JOURNAL_LINE }]);
          }
        }
      } catch (err) {
        if (mounted) {
          showToast(err instanceof Error ? err.message : "Unable to load voucher dependencies", "error");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [activeFirmId, meta.family, meta.category, showToast, supabase, voucherId]);

  function updateInvoiceLine(index: number, partial: Partial<InvoiceLineState>) {
    setInvoiceLines((prev) =>
      prev.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        const merged = { ...line, ...partial };
        const item = items.find((entry) => entry.id === merged.item_id);
        return recalcLine(merged, item, taxMode);
      }),
    );
  }

  function selectItem(index: number, itemId: string) {
    const item = items.find((entry) => entry.id === itemId);
    updateInvoiceLine(index, {
      item_id: itemId,
      unit_price: item?.default_price || 0,
    });
  }

  /** Serialize live form state into InvoiceData for template preview */
  const buildPreviewData = useCallback((): InvoiceData | null => {
    if (!firmDetails) return null;

    const categoryToType: Record<string, InvoiceType> = {
      Sales: "TAX INVOICE",
      Purchase: "PURCHASE INVOICE",
      "Debit Note": "DEBIT NOTE",
      "Credit Note": "CREDIT NOTE",
    };

    const lineItems = invoiceLines.map((line, idx) => {
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
        cessAmount: line.cess_amount || undefined,
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
      cessTotal: invoiceTotals.cess || undefined,
      grandTotal: invoiceTotals.grandTotal,
      totalInWords: numberToWords(invoiceTotals.grandTotal),
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

  function buildPayload(): VoucherWritePayload {
    if (!activeFirmId) {
      throw new Error("No active firm selected");
    }

    const voucherNumber = requireSelection(form.voucher_number, "voucher number");

    if (meta.family === "invoice") {
      const partyLedgerId = requireSelection(form.party_ledger_id, "party ledger");
      const mainLedgerId = requireSelection(form.main_ledger_id, "sales/purchase ledger");
      requireLines(invoiceLines, "invoice line");

      const getTaxLedgerId = (type: string) => {
        const found = ledgers.find((l) => isTaxLedger(l) && l.name.toLowerCase().includes(type));
        if (!found) throw new Error(`Could not automatically find tax ledger for ${type.toUpperCase()}. Please create a tax ledger containing '${type}' in its name.`);
        return found.id;
      };

      for (const [index, line] of invoiceLines.entries()) {
        requireSelection(line.item_id, `item on line ${index + 1}`);
      }

      const accountingLines = [];
      if (meta.category === "Sales" || meta.category === "Debit Note") {
        accountingLines.push({
          ledger_id: partyLedgerId,
          line_number: 1,
          debit_amount: invoiceTotals.grandTotal,
          credit_amount: 0,
        });
        accountingLines.push({
          ledger_id: mainLedgerId,
          line_number: 2,
          debit_amount: 0,
          credit_amount: invoiceTotals.taxable,
        });
        let lineNumber = 3;
        if (invoiceTotals.igst > 0) {
          accountingLines.push({
            ledger_id: getTaxLedgerId("igst"),
            line_number: lineNumber++,
            debit_amount: 0,
            credit_amount: invoiceTotals.igst,
          });
        } else {
          if (invoiceTotals.cgst > 0) {
            accountingLines.push({
              ledger_id: getTaxLedgerId("cgst"),
              line_number: lineNumber++,
              debit_amount: 0,
              credit_amount: invoiceTotals.cgst,
            });
          }
          if (invoiceTotals.sgst > 0) {
            accountingLines.push({
              ledger_id: getTaxLedgerId("sgst"),
              line_number: lineNumber,
              debit_amount: 0,
              credit_amount: invoiceTotals.sgst,
            });
          }
        }
      } else {
        accountingLines.push({
          ledger_id: mainLedgerId,
          line_number: 1,
          debit_amount: invoiceTotals.taxable,
          credit_amount: 0,
        });
        let lineNumber = 2;
        if (invoiceTotals.igst > 0) {
          accountingLines.push({
            ledger_id: getTaxLedgerId("igst"),
            line_number: lineNumber++,
            debit_amount: invoiceTotals.igst,
            credit_amount: 0,
          });
        } else {
          if (invoiceTotals.cgst > 0) {
            accountingLines.push({
              ledger_id: getTaxLedgerId("cgst"),
              line_number: lineNumber++,
              debit_amount: invoiceTotals.cgst,
              credit_amount: 0,
            });
          }
          if (invoiceTotals.sgst > 0) {
            accountingLines.push({
              ledger_id: getTaxLedgerId("sgst"),
              line_number: lineNumber++,
              debit_amount: invoiceTotals.sgst,
              credit_amount: 0,
            });
          }
        }
        accountingLines.push({
          ledger_id: partyLedgerId,
          line_number: lineNumber,
          debit_amount: 0,
          credit_amount: invoiceTotals.grandTotal,
        });
      }

      return {
        firm_id: activeFirmId,
        category: meta.category,
        voucher_number: voucherNumber,
        voucher_date: form.voucher_date,
        narration: form.narration || null,
        party_ledger_id: partyLedgerId,
        accounting_lines: accountingLines,
        inventory_lines: invoiceLines.map((line, index) => ({
          ...line,
          item_id: line.item_id,
          line_number: index + 1,
        })),
      };
    }

    if (meta.family === "payment") {
      const partyLedgerId = requireSelection(form.party_ledger_id, "party ledger");
      const cashBankLedgerId = requireSelection(form.cash_bank_ledger_id, "cash or bank ledger");

      const isReceipt = meta.category === "Receipt";
      return {
        firm_id: activeFirmId,
        category: meta.category,
        voucher_number: voucherNumber,
        voucher_date: form.voucher_date,
        narration: form.narration || null,
        party_ledger_id: partyLedgerId,
        accounting_lines: [
          {
            ledger_id: isReceipt ? cashBankLedgerId : partyLedgerId,
            line_number: 1,
            debit_amount: isReceipt ? form.amount : 0,
            credit_amount: isReceipt ? 0 : form.amount,
          },
          {
            ledger_id: isReceipt ? partyLedgerId : cashBankLedgerId,
            line_number: 2,
            debit_amount: isReceipt ? 0 : form.amount,
            credit_amount: isReceipt ? form.amount : 0,
          },
        ],
        inventory_lines: [],
      };
    }

    if (meta.family === "contra") {
      const sourceLedgerId = requireSelection(form.source_ledger_id, "transfer-from ledger");
      const destinationLedgerId = requireSelection(form.destination_ledger_id, "transfer-to ledger");

      return {
        firm_id: activeFirmId,
        category: meta.category,
        voucher_number: voucherNumber,
        voucher_date: form.voucher_date,
        narration: form.narration || null,
        party_ledger_id: null,
        accounting_lines: [
          {
            ledger_id: destinationLedgerId,
            line_number: 1,
            debit_amount: form.amount,
            credit_amount: 0,
          },
          {
            ledger_id: sourceLedgerId,
            line_number: 2,
            debit_amount: 0,
            credit_amount: form.amount,
          },
        ],
        inventory_lines: [],
      };
    }

    requireLines(journalLines, "journal line");
    for (const [index, line] of journalLines.entries()) {
      requireSelection(line.ledger_id, `ledger on line ${index + 1}`);
    }

    return {
      firm_id: activeFirmId,
      category: meta.category,
      voucher_number: voucherNumber,
      voucher_date: form.voucher_date,
      narration: form.narration || null,
      party_ledger_id: null,
      accounting_lines: journalLines.map((line, index) => ({
        ...line,
        line_number: index + 1,
      })),
      inventory_lines: [],
    };
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
      router.push(`/dashboard/vouchers/${result.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to save voucher", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-var(--header-height)-var(--bottom-nav-height)-1rem)] lg:h-[calc(100vh-var(--header-height)-2rem)] rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden lg:overflow-visible">
      {/* ── Voucher Command Ribbon ── */}
      <div
        className="shrink-0 relative flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-2 sm:px-6 sm:py-4 overflow-hidden"
        style={{ background: `linear-gradient(135deg, var(--voucher-ribbon-from) 0%, var(--voucher-ribbon-to) 100%)` }}
      >
        {/* Faint radial glow */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-2/3 bg-[radial-gradient(circle_at_top_right,rgba(216,243,220,0.22),transparent_55%)]" />

        {/* Top row on mobile / Left side on desktop — type pill + title + close on mobile */}
        <div className="relative z-10 flex items-center justify-between w-full sm:w-auto gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/80 ring-1 ring-white/20">
              {meta.category}
            </span>
            <span className="h-3.5 w-px bg-white/20" />
            <h1 className="text-sm font-semibold tracking-tight text-white sm:text-base">{meta.title}</h1>
            {isEditing && (
              <span className="hidden sm:inline-flex items-center rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-semibold text-amber-200 ring-1 ring-amber-400/30">
                Editing
              </span>
            )}
          </div>

          {/* Close button ONLY on mobile (right side of title) */}
          <Link
            href="/dashboard"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white sm:hidden"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Link>
        </div>

        {/* Bottom row on mobile / Right side on desktop — number, date, close */}
        <div className="relative z-10 flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/50">No.</label>
            <input
              className="h-11 w-full sm:h-8 sm:w-20 rounded-md border border-white/20 bg-white/10 px-2 text-xs font-medium text-white outline-none placeholder:text-white/40 transition focus:border-white/50 focus:bg-white/15 disabled:opacity-60"
              placeholder="e.g. 1"
              value={form.voucher_number}
              onChange={(e) => setForm((prev) => ({ ...prev, voucher_number: e.target.value }))}
              disabled={readOnly}
            />
          </div>
          <div className="flex items-center gap-1.5 flex-[2] sm:flex-initial">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Date</label>
            <input
              type="date"
              className="h-11 w-full sm:h-8 sm:w-[135px] rounded-md border border-white/20 bg-white/10 px-2 text-xs font-medium text-white outline-none transition focus:border-white/50 focus:bg-white/15 disabled:opacity-60"
              value={form.voucher_date}
              onChange={(e) => setForm((prev) => ({ ...prev, voucher_date: e.target.value }))}
              disabled={readOnly}
            />
          </div>

          {/* Close button ONLY on desktop */}
          <Link
            href="/dashboard"
            className="hidden sm:flex items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/20 hover:text-white"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Dashboard</span>
          </Link>
        </div>
      </div>

      {/* ── Zone B: Party / Ledger ── */}
      <div
        className="shrink-0 relative border-b border-slate-100"
        style={{ background: "var(--voucher-zone-ledger)" }}
      >
        {/* Left accent bar */}
        <div className="absolute inset-y-0 left-0 w-[3px] rounded-r-full bg-tally-500/40" />
        <div className="grid gap-6 p-5 pl-7 sm:p-6 sm:pl-8 md:grid-cols-2 lg:gap-8">
          <div className="space-y-4">
            {meta.family === "invoice" || meta.family === "payment" ? (
              <ComboboxField
                label="Party A/c Name"
                value={form.party_ledger_id}
                onChange={(value) => setForm((prev) => ({ ...prev, party_ledger_id: value }))}
                options={partyLedgers}
                placeholder="Type to search party…"
                createHref="/dashboard/create/ledger"
                disabled={readOnly}
              />
            ) : null}
            {meta.family === "payment" ? (
              <ComboboxField
                label="Cash/Bank Ledger"
                value={form.cash_bank_ledger_id}
                onChange={(value) => setForm((prev) => ({ ...prev, cash_bank_ledger_id: value }))}
                options={cashBankLedgers}
                placeholder="Type to search account…"
                createHref="/dashboard/create/ledger"
                disabled={readOnly}
              />
            ) : null}
            {meta.family === "contra" ? (
              <>
                <ComboboxField label="Transfer From" value={form.source_ledger_id} onChange={(value) => setForm((prev) => ({ ...prev, source_ledger_id: value }))} options={cashBankLedgers} placeholder="Type to search…" createHref="/dashboard/create/ledger" disabled={readOnly} />
                <ComboboxField label="Transfer To" value={form.destination_ledger_id} onChange={(value) => setForm((prev) => ({ ...prev, destination_ledger_id: value }))} options={cashBankLedgers} placeholder="Type to search…" createHref="/dashboard/create/ledger" disabled={readOnly} />
              </>
            ) : null}
          </div>
          <div className="space-y-4">
            {meta.family === "invoice" ? (
              <>
                <ComboboxField
                  label="Sales/Purchase Ledger"
                  value={form.main_ledger_id}
                  onChange={(value) => setForm((prev) => ({ ...prev, main_ledger_id: value }))}
                  options={mainLedgers}
                  placeholder="Type to search ledger…"
                  createHref="/dashboard/create/ledger"
                  disabled={readOnly}
                />
                {selectedPartyLedger?.party_details?.state && firmState ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                    <label className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:mb-0 sm:w-1/3">Tax Mode</label>
                    <div className="flex h-11 w-full items-center rounded-lg border border-slate-200 bg-white/80 px-3 text-sm font-medium text-slate-700 sm:w-2/3">
                      {taxMode === "inter" ? "Inter-state / IGST" : "Intra-state / CGST + SGST"}
                    </div>
                  </div>
                ) : (
                  <ComboboxField
                    label="Tax Mode"
                    value={form.manual_tax_mode}
                    onChange={(value) => setForm((prev) => ({ ...prev, manual_tax_mode: value as TaxMode }))}
                    options={[
                      { value: "intra", label: "Intra-state / CGST + SGST" },
                      { value: "inter", label: "Inter-state / IGST" },
                    ]}
                    placeholder="Type intra or inter…"
                    disabled={readOnly}
                  />
                )}
              </>
            ) : null}
            {meta.family === "payment" || meta.family === "contra" ? (
              <InputField
                label="Amount"
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(value) => setForm((prev) => ({ ...prev, amount: Number(value) }))}
                placeholder="0.00"
                disabled={readOnly}
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Zone C: Items Table ── */}
      {meta.family === "invoice" ? (
        <div className="border-b border-slate-100 bg-white flex-1 min-h-0 overflow-y-auto" ref={itemsScrollRef}>
          {/* Sticky table header */}
          <div
            className="sticky top-0 z-10 hidden grid-cols-[3fr_1fr_1fr_1fr_1.5fr_auto] gap-2 border-b border-slate-200 px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 md:grid"
          >
            <div>Name of Item</div>
            <div>Qty</div>
            <div>Rate</div>
            <div>Discount</div>
            <div className="text-right">Amount</div>
            <div className="w-10" />
          </div>
          <div className="divide-y divide-slate-100">
            {invoiceLines.map((line, index) => (
              <div
                key={`${index}-${line.item_id}`}
                className="group grid grid-cols-2 gap-4 p-4 transition-colors duration-100 md:grid-cols-[3fr_1fr_1fr_1fr_1.5fr_auto] md:items-center md:gap-2 md:p-5 md:py-2.5"
                style={{ ['--tw-bg-opacity' as string]: '1' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--voucher-row-hover)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
              >
                <div className="col-span-2 md:col-span-1 flex flex-col md:block">
                  <span className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:hidden">Item</span>
                  <ComboboxField
                    inline
                    value={line.item_id}
                    onChange={(id) => selectItem(index, id)}
                    options={items.map((item) => ({ value: item.id, label: item.name }))}
                    placeholder="Type to search item…"
                    disabled={readOnly}
                  />
                </div>
                <div className="flex flex-col md:block">
                  <span className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:hidden">Qty</span>
                  <input
                    disabled={readOnly}
                    type="number"
                    step="0.01"
                    value={line.quantity || ""}
                    onChange={(e) => updateInvoiceLine(index, { quantity: Number(e.target.value) })}
                    placeholder="0"
                    className="mono-num h-11 w-full rounded-lg border border-transparent bg-transparent px-2 text-sm text-slate-700 outline-none transition-all hover:border-slate-200 focus:border-tally-400 focus:bg-white focus:ring-2 focus:ring-tally-500/[0.16] md:h-9"
                  />
                </div>
                <div className="flex flex-col md:block">
                  <span className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:hidden">Rate</span>
                  <input
                    disabled={readOnly}
                    type="number"
                    step="0.01"
                    value={line.unit_price || ""}
                    onChange={(e) => updateInvoiceLine(index, { unit_price: Number(e.target.value) })}
                    placeholder="0.00"
                    className="mono-num h-11 w-full rounded-lg border border-transparent bg-transparent px-2 text-sm text-slate-700 outline-none transition-all hover:border-slate-200 focus:border-tally-400 focus:bg-white focus:ring-2 focus:ring-tally-500/[0.16] md:h-9"
                  />
                </div>
                <div className="flex flex-col md:block">
                  <span className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:hidden">Discount</span>
                  <input
                    disabled={readOnly}
                    type="number"
                    step="0.01"
                    value={line.discount_amount || ""}
                    onChange={(e) => updateInvoiceLine(index, { discount_amount: Number(e.target.value) })}
                    placeholder="0.00"
                    className="mono-num h-11 w-full rounded-lg border border-transparent bg-transparent px-2 text-sm text-slate-700 outline-none transition-all hover:border-slate-200 focus:border-tally-400 focus:bg-white focus:ring-2 focus:ring-tally-500/[0.16] md:h-9"
                  />
                </div>
                <div className="flex items-center justify-between md:justify-end md:pr-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:hidden">Amount</span>
                  <span className="mono-num font-semibold text-slate-900">{formatCurrency(line.taxable_amount)}</span>
                </div>
                <div className="col-span-2 md:col-span-1 flex justify-end">
                  {!readOnly && (
                    <button
                      onClick={() => setInvoiceLines((prev) => prev.filter((_, i) => i !== index))}
                      title="Remove line"
                      className="flex h-11 w-11 md:h-7 md:w-7 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                    >
                      <svg className="h-5 w-5 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 px-5 py-3">
            {!readOnly && (
              <button
                onClick={() => setInvoiceLines((prev) => [...prev, { ...EMPTY_INVOICE_LINE }])}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-tally-600 transition-colors hover:bg-tally-50 hover:text-tally-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Line
              </button>
            )}
          </div>
        </div>
      ) : null}

      {meta.family === "journal" ? (
        <div className="border-b border-slate-100 bg-white flex-1 min-h-0 overflow-y-auto" ref={itemsScrollRef}>
          <div
            className="sticky top-0 z-10 hidden grid-cols-[2fr_1fr_1fr_auto] gap-4 border-b border-slate-200 px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 md:grid"
          >
            <div>Ledger</div>
            <div>Debit (Dr)</div>
            <div>Credit (Cr)</div>
            <div className="w-10" />
          </div>
          <div className="divide-y divide-slate-100">
            {journalLines.map((line, index) => (
              <div
                key={index}
                className="grid grid-cols-2 gap-4 p-4 transition-colors duration-100 md:grid-cols-[2fr_1fr_1fr_auto] md:items-center md:gap-4 md:p-5 md:py-2.5"
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--voucher-row-hover)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
              >
                <div className="col-span-2 md:col-span-1 flex flex-col md:block">
                  <span className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:hidden">Ledger</span>
                  <ComboboxField
                    inline
                    value={line.ledger_id}
                    onChange={(id) => setJournalLines((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, ledger_id: id } : entry))}
                    options={allLedgerOptions}
                    placeholder="Type to search ledger…"
                    createHref="/dashboard/create/ledger"
                    disabled={readOnly}
                  />
                </div>
                <div className="flex flex-col md:block">
                  <span className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:hidden">Debit</span>
                  <input
                    disabled={readOnly}
                    type="number"
                    step="0.01"
                    value={line.debit_amount || ""}
                    onChange={(e) => setJournalLines((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, debit_amount: Number(e.target.value), credit_amount: 0 } : entry))}
                    placeholder="0.00"
                    className="mono-num h-11 w-full rounded-lg border border-transparent bg-transparent px-2 text-sm font-medium text-slate-800 outline-none transition-all hover:border-slate-200 focus:border-tally-400 focus:bg-white focus:ring-2 focus:ring-tally-500/[0.16] md:h-9"
                  />
                </div>
                <div className="flex flex-col md:block">
                  <span className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:hidden">Credit</span>
                  <input
                    disabled={readOnly}
                    type="number"
                    step="0.01"
                    value={line.credit_amount || ""}
                    onChange={(e) => setJournalLines((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, credit_amount: Number(e.target.value), debit_amount: 0 } : entry))}
                    placeholder="0.00"
                    className="mono-num h-11 w-full rounded-lg border border-transparent bg-transparent px-2 text-sm font-medium text-slate-800 outline-none transition-all hover:border-slate-200 focus:border-tally-400 focus:bg-white focus:ring-2 focus:ring-tally-500/[0.16] md:h-9"
                  />
                </div>
                <div className="col-span-2 md:col-span-1 flex justify-end">
                  {!readOnly && (
                    <button
                      onClick={() => setJournalLines((prev) => prev.filter((_, entryIndex) => entryIndex !== index))}
                      title="Remove line"
                      className="flex h-11 w-11 md:h-7 md:w-7 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                    >
                      <svg className="h-5 w-5 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 px-5 py-3">
            {!readOnly && (
              <button
                onClick={() => setJournalLines((prev) => [...prev, { ...EMPTY_JOURNAL_LINE }])}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-tally-600 transition-colors hover:bg-tally-50 hover:text-tally-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Accounting Line
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* ── Zone D: Narration + Totals ── */}
      <div className="shrink-0 mt-auto flex flex-col-reverse border-b border-slate-100 bg-white md:grid md:grid-cols-2 md:items-start">
        {/* Narration */}
        <div className="border-t border-slate-100 p-5 md:border-r md:border-t-0 sm:p-6">
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Narration</label>
          <textarea
            disabled={readOnly}
            className="min-h-[120px] w-full rounded-lg border border-slate-200 bg-white/80 p-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 hover:border-tally-400 focus:border-tally-500 focus:ring-2 focus:ring-tally-500/[0.18]"
            placeholder="Enter narration for this voucher…"
            value={form.narration}
            onChange={(e) => setForm((prev) => ({ ...prev, narration: e.target.value }))}
          />
        </div>

        {/* Totals */}
        <div className="p-5 sm:p-6">
          {meta.family === "invoice" ? (
            <div
              className="ml-auto w-full overflow-hidden rounded-xl shadow-lg md:max-w-sm"
              style={{ background: "var(--voucher-zone-totals-bg)" }}
            >
              {/* Line items */}
              <div className="space-y-0 divide-y divide-white/8 px-5 pt-4 pb-3">
                <div className="flex items-center justify-between py-2">
                  <span className="text-[13px] text-white/65">Taxable Amount</span>
                  <span className="mono-num text-[13px] font-medium text-white/80">{formatCurrency(invoiceTotals.taxable)}</span>
                </div>
                {taxMode === "inter" && invoiceTotals.igst > 0 && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[13px] text-white/65">IGST</span>
                    <span className="mono-num text-[13px] text-white/80">{formatCurrency(invoiceTotals.igst)}</span>
                  </div>
                )}
                {taxMode === "intra" && (invoiceTotals.cgst > 0 || invoiceTotals.sgst > 0) && (
                  <>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-[13px] text-white/65">CGST</span>
                      <span className="mono-num text-[13px] text-white/80">{formatCurrency(invoiceTotals.cgst)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-[13px] text-white/65">SGST</span>
                      <span className="mono-num text-[13px] text-white/80">{formatCurrency(invoiceTotals.sgst)}</span>
                    </div>
                  </>
                )}
                {invoiceTotals.cess > 0 && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[13px] text-white/65">Cess</span>
                    <span className="mono-num text-[13px] text-white/80">{formatCurrency(invoiceTotals.cess)}</span>
                  </div>
                )}
              </div>
              {/* Grand Total row — darkened inset */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ background: "var(--voucher-zone-totals-row)" }}
              >
                <span className="text-[14px] font-bold uppercase tracking-wider text-white/90">Grand Total</span>
                <span className="mono-num text-xl font-bold text-white">{formatCurrency(invoiceTotals.grandTotal)}</span>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-end justify-end">
              <p className="text-sm text-slate-400">Total impact will be computed from accounting lines.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Zone E: Footer Actions ── */}
      <div
        className="shrink-0 flex items-center justify-between px-5 py-4 sm:px-7 sm:py-5"
        style={{ background: "var(--voucher-zone-ledger)" }}
      >
        {/* Mobile cancel */}
        <Link href="/dashboard/create" className="text-sm font-medium text-slate-600 hover:text-slate-900 sm:hidden">
          Cancel
        </Link>
        <div className="hidden sm:block" />
        <div className="flex items-center gap-3">
          {meta.family === "invoice" && (
            <button
              onClick={() => setShowPreview(true)}
              className="hidden items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow sm:flex"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              Preview
            </button>
          )}
          <button
            onClick={() => router.back()}
            className="hidden rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow sm:block"
          >
            Cancel
          </button>
          {!readOnly ? (
            <button
              disabled={isSubmitting || isLoading}
              onClick={() => void submit()}
              className="group relative flex items-center gap-3 overflow-hidden rounded-xl bg-tally-700 px-7 py-3 text-sm font-semibold text-white shadow-md transition-all duration-150 hover:-translate-y-px hover:bg-tally-600 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tally-600 disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving…
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  {isEditing ? "Update Voucher" : "Save Voucher"}
                  <kbd className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[11px] font-normal tracking-wider text-white/55 ring-1 ring-white/15">
                    ⌘S
                  </kbd>
                </span>
              )}
            </button>
          ) : (
            <Link
              href={`/dashboard/vouchers/${voucherId}/edit`}
              className="flex items-center gap-2 rounded-xl bg-tally-700 px-7 py-3 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-px hover:bg-tally-600 hover:shadow-lg"
            >
              Edit Voucher
            </Link>
          )}
        </div>
      </div>

      {/* ── Invoice Preview Overlay ── */}
      {showPreview && meta.family === "invoice" && (
        <InvoicePreviewOverlay
          buildPreviewData={buildPreviewData}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Invoice Preview Overlay — renders live form data
   through the firm's default template
───────────────────────────────────────────────── */
function InvoicePreviewOverlay({
  buildPreviewData,
  onClose,
}: {
  buildPreviewData: () => InvoiceData | null;
  onClose: () => void;
}) {
  const previewData = buildPreviewData();
  const templateId = typeof window !== "undefined" ? localStorage.getItem("billingApp_defaultTemplate") || "classic" : "classic";
  const template = getTemplateById(templateId);
  const TemplateComp = template.component;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    function calcScale() {
      const container = containerRef.current;
      if (!container) return;
      const availableWidth = container.clientWidth;
      // 794px is A4 width in pixels at 96dpi
      setScale(Math.min(1, availableWidth / 794));
    }
    calcScale();
    window.addEventListener("resize", calcScale);
    return () => window.removeEventListener("resize", calcScale);
  }, []);

  if (!previewData) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
          <p className="text-slate-600">Unable to generate preview. Make sure a firm is selected.</p>
          <button onClick={onClose} className="mt-4 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">
            Close
          </button>
        </div>
      </div>
    );
  }

  const overlayContent = (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-900/90 backdrop-blur-sm">
      {/* Top bar */}
      <div className="no-print flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-4 sm:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Edit
          </button>
          <div className="h-5 w-px bg-white/20 hidden sm:block" />
          <h2 className="hidden text-sm font-semibold text-white sm:block">
            Invoice Preview
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-tally-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-tally-500 active:scale-[0.97]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
            </svg>
            Print
          </button>
        </div>
      </div>

      {/* Scrollable preview — ref measures available width */}
      <div ref={containerRef} className="flex-1 overflow-auto p-4 sm:p-8">
        <div
          className="mx-auto shadow-2xl bg-white"
          style={{
            width: "794px",
            minHeight: "1123px",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            /* Collapse the dead space left by scale so the scroll area
               wraps tightly around the visually-shrunken invoice */
            marginRight: scale < 1 ? `${-(794 * (1 - scale))}px` : undefined,
            marginBottom: scale < 1 ? `${-(1123 * (1 - scale))}px` : undefined,
          }}
        >
          <TemplateComp data={previewData} />
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlayContent, document.body);
}

/* ─────────────────────────────────────────────────
   Number to words — basic Indian-style converter
───────────────────────────────────────────────── */
function numberToWords(num: number): string {
  if (num === 0) return "ZERO ONLY";

  const ones = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
    "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

  function twoDigits(n: number): string {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  }

  function threeDigits(n: number): string {
    if (n === 0) return "";
    if (n < 100) return twoDigits(n);
    return ones[Math.floor(n / 100)] + " HUNDRED" + (n % 100 ? " AND " + twoDigits(n % 100) : "");
  }

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let result = "";
  if (rupees >= 10000000) {
    result += twoDigits(Math.floor(rupees / 10000000)) + " CRORE ";
  }
  const afterCrore = rupees % 10000000;
  if (afterCrore >= 100000) {
    result += twoDigits(Math.floor(afterCrore / 100000)) + " LAKH ";
  }
  const afterLakh = afterCrore % 100000;
  if (afterLakh >= 1000) {
    result += twoDigits(Math.floor(afterLakh / 1000)) + " THOUSAND ";
  }
  const afterThousand = afterLakh % 1000;
  if (afterThousand > 0) {
    result += threeDigits(afterThousand);
  }

  result = result.trim();
  if (paise > 0) {
    result += " RUPEES AND " + twoDigits(paise) + " PAISE ONLY";
  } else {
    result += " RUPEES ONLY";
  }

  return result;
}
