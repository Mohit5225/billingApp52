"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ItemDetail } from "@/interfaces/inventory";
import { LedgerDetail } from "@/interfaces/ledger";
import { VoucherCategory, VoucherDetail, VoucherWritePayload } from "@/interfaces/voucher";
import { apiRequest } from "@/lib/http";
import { formatCurrency } from "@/lib/format";

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
  igst_ledger_id: string;
  cgst_ledger_id: string;
  sgst_ledger_id: string;
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
  igst_ledger_id: "",
  cgst_ledger_id: "",
  sgst_ledger_id: "",
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

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  step,
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
    <div className="flex flex-col sm:flex-row sm:items-center">
      {label && <label className="mb-1 text-sm font-medium text-slate-600 sm:mb-0 sm:w-1/3">{label}</label>}
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 sm:w-2/3"
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
  const meta = VOUCHER_META[slug];
  const isEditing = Boolean(voucherId);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLineState[]>([{ ...EMPTY_INVOICE_LINE }]);
  const [journalLines, setJournalLines] = useState<JournalLineState[]>([
    { ...EMPTY_JOURNAL_LINE },
    { ...EMPTY_JOURNAL_LINE },
  ]);
  const [ledgers, setLedgers] = useState<LedgerDetail[]>([]);
  const [items, setItems] = useState<ItemDetail[]>([]);
  const [firmState, setFirmState] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const partyLedgers = useMemo(
    () => ledgers.filter(isPartyLedger).map((ledger) => ({ value: ledger.id, label: `${ledger.name} • ${ledger.group_name || "Party"}` })),
    [ledgers],
  );
  const cashBankLedgers = useMemo(
    () => ledgers.filter(isCashBankLedger).map((ledger) => ({ value: ledger.id, label: ledger.name })),
    [ledgers],
  );
  const taxLedgers = useMemo(
    () => ledgers.filter(isTaxLedger).map((ledger) => ({ value: ledger.id, label: ledger.name })),
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
        setError(null);

        const [ledgerData, itemData] = await Promise.all([
          apiRequest<LedgerDetail[]>(supabase, "/api/ledgers/", { query: { firm_id: activeFirmId } }),
          apiRequest<ItemDetail[]>(supabase, "/api/items/", {
            query: { firm_id: activeFirmId, active_only: false },
          }),
        ]);

        const { data: firmData } = await supabase
          .from("firms")
          .select("state")
          .eq("id", activeFirmId)
          .single();

        if (!mounted) return;

        setLedgers(ledgerData);
        setItems(itemData);
        setFirmState(firmData?.state || "");

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
            const taxLines = nonPartyLines.filter((line) => taxLedgerIds.has(line.ledger_id));
            const existingTaxMode: TaxMode = voucher.inventory_lines.some((line) => line.igst_amount > 0) ? "inter" : "intra";
            setForm((prev) => ({
              ...prev,
              main_ledger_id: mainLine?.ledger_id || "",
              manual_tax_mode: existingTaxMode,
              igst_ledger_id: existingTaxMode === "inter" ? (taxLines[0]?.ledger_id || "") : "",
              cgst_ledger_id: existingTaxMode === "intra" ? (taxLines[0]?.ledger_id || "") : "",
              sgst_ledger_id: existingTaxMode === "intra" ? (taxLines[1]?.ledger_id || "") : "",
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
          setError(err instanceof Error ? err.message : "Unable to load voucher dependencies");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [activeFirmId, meta.family, supabase, voucherId, meta.category]);

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

  function buildPayload(): VoucherWritePayload {
    if (!activeFirmId) {
      throw new Error("No active firm selected");
    }

    if (meta.family === "invoice") {
      const accountingLines = [];
      if (meta.category === "Sales" || meta.category === "Debit Note") {
        accountingLines.push({
          ledger_id: form.party_ledger_id,
          line_number: 1,
          debit_amount: invoiceTotals.grandTotal,
          credit_amount: 0,
        });
        accountingLines.push({
          ledger_id: form.main_ledger_id,
          line_number: 2,
          debit_amount: 0,
          credit_amount: invoiceTotals.taxable,
        });
        let lineNumber = 3;
        if (invoiceTotals.igst > 0) {
          accountingLines.push({
            ledger_id: form.igst_ledger_id,
            line_number: lineNumber++,
            debit_amount: 0,
            credit_amount: invoiceTotals.igst,
          });
        } else {
          if (invoiceTotals.cgst > 0) {
            accountingLines.push({
              ledger_id: form.cgst_ledger_id,
              line_number: lineNumber++,
              debit_amount: 0,
              credit_amount: invoiceTotals.cgst,
            });
          }
          if (invoiceTotals.sgst > 0) {
            accountingLines.push({
              ledger_id: form.sgst_ledger_id,
              line_number: lineNumber,
              debit_amount: 0,
              credit_amount: invoiceTotals.sgst,
            });
          }
        }
      } else {
        accountingLines.push({
          ledger_id: form.main_ledger_id,
          line_number: 1,
          debit_amount: invoiceTotals.taxable,
          credit_amount: 0,
        });
        let lineNumber = 2;
        if (invoiceTotals.igst > 0) {
          accountingLines.push({
            ledger_id: form.igst_ledger_id,
            line_number: lineNumber++,
            debit_amount: invoiceTotals.igst,
            credit_amount: 0,
          });
        } else {
          if (invoiceTotals.cgst > 0) {
            accountingLines.push({
              ledger_id: form.cgst_ledger_id,
              line_number: lineNumber++,
              debit_amount: invoiceTotals.cgst,
              credit_amount: 0,
            });
          }
          if (invoiceTotals.sgst > 0) {
            accountingLines.push({
              ledger_id: form.sgst_ledger_id,
              line_number: lineNumber++,
              debit_amount: invoiceTotals.sgst,
              credit_amount: 0,
            });
          }
        }
        accountingLines.push({
          ledger_id: form.party_ledger_id,
          line_number: lineNumber,
          debit_amount: 0,
          credit_amount: invoiceTotals.grandTotal,
        });
      }

      return {
        firm_id: activeFirmId,
        category: meta.category,
        voucher_number: form.voucher_number,
        voucher_date: form.voucher_date,
        narration: form.narration || null,
        party_ledger_id: form.party_ledger_id,
        accounting_lines: accountingLines,
        inventory_lines: invoiceLines.map((line, index) => ({
          ...line,
          item_id: line.item_id,
          line_number: index + 1,
        })),
      };
    }

    if (meta.family === "payment") {
      const isReceipt = meta.category === "Receipt";
      return {
        firm_id: activeFirmId,
        category: meta.category,
        voucher_number: form.voucher_number,
        voucher_date: form.voucher_date,
        narration: form.narration || null,
        party_ledger_id: form.party_ledger_id,
        accounting_lines: [
          {
            ledger_id: isReceipt ? form.cash_bank_ledger_id : form.party_ledger_id,
            line_number: 1,
            debit_amount: isReceipt ? form.amount : 0,
            credit_amount: isReceipt ? 0 : form.amount,
          },
          {
            ledger_id: isReceipt ? form.party_ledger_id : form.cash_bank_ledger_id,
            line_number: 2,
            debit_amount: isReceipt ? 0 : form.amount,
            credit_amount: isReceipt ? form.amount : 0,
          },
        ],
        inventory_lines: [],
      };
    }

    if (meta.family === "contra") {
      return {
        firm_id: activeFirmId,
        category: meta.category,
        voucher_number: form.voucher_number,
        voucher_date: form.voucher_date,
        narration: form.narration || null,
        party_ledger_id: null,
        accounting_lines: [
          {
            ledger_id: form.destination_ledger_id,
            line_number: 1,
            debit_amount: form.amount,
            credit_amount: 0,
          },
          {
            ledger_id: form.source_ledger_id,
            line_number: 2,
            debit_amount: 0,
            credit_amount: form.amount,
          },
        ],
        inventory_lines: [],
      };
    }

    return {
      firm_id: activeFirmId,
      category: meta.category,
      voucher_number: form.voucher_number,
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
      setError(null);
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

      router.push(`/dashboard/vouchers/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save voucher");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-col border-b border-slate-200 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{meta.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{isEditing ? "Editing voucher" : "New voucher"}</p>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 sm:mt-0">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">No.</label>
            <input 
              className="h-9 w-24 rounded-md border border-slate-200 bg-white px-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition disabled:opacity-75 disabled:bg-slate-50" 
              placeholder="e.g. 1" 
              value={form.voucher_number} 
              onChange={(e) => setForm((prev) => ({ ...prev, voucher_number: e.target.value }))} 
              disabled={readOnly}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Date</label>
            <input 
              type="date"
              className="h-9 w-[135px] rounded-md border border-slate-200 bg-white px-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition disabled:opacity-75 disabled:bg-slate-50" 
              value={form.voucher_date} 
              onChange={(e) => setForm((prev) => ({ ...prev, voucher_date: e.target.value }))} 
              disabled={readOnly}
            />
          </div>
          <Link href={readOnly ? `/dashboard/vouchers/${voucherId}` : "/dashboard/create"} className="hidden sm:block text-sm font-medium text-emerald-600 hover:text-emerald-700">Close</Link>
        </div>
      </div>

      {error && <div className="border-b border-rose-200 bg-rose-50 px-6 py-4 text-sm font-medium text-rose-700">{error}</div>}

      {/* Ledger Block */}
      <div className="grid gap-6 border-b border-slate-100 p-4 sm:p-6 md:grid-cols-2 lg:gap-8 bg-white">
        <div className="space-y-4">
          {meta.family === "invoice" || meta.family === "payment" ? (
            <ComboboxField
              label="Party A/c Name"
              value={form.party_ledger_id}
              onChange={(value) => setForm((prev) => ({ ...prev, party_ledger_id: value }))}
              options={partyLedgers}
              placeholder="Type to search party…"
              createHref="/dashboard/create/ledger"
             disabled={readOnly} />
          ) : null}
          {meta.family === "payment" ? (
            <ComboboxField
              label="Cash/Bank Ledger"
              value={form.cash_bank_ledger_id}
              onChange={(value) => setForm((prev) => ({ ...prev, cash_bank_ledger_id: value }))}
              options={cashBankLedgers}
              placeholder="Type to search account…"
              createHref="/dashboard/create/ledger"
             disabled={readOnly} />
          ) : null}
          {meta.family === "contra" ? (
            <>
              <ComboboxField label="Transfer From" value={form.source_ledger_id} onChange={(value) => setForm((prev) => ({ ...prev, source_ledger_id: value }))} options={cashBankLedgers} placeholder="Type to search…" createHref="/dashboard/create/ledger"  disabled={readOnly} />
              <ComboboxField label="Transfer To" value={form.destination_ledger_id} onChange={(value) => setForm((prev) => ({ ...prev, destination_ledger_id: value }))} options={cashBankLedgers} placeholder="Type to search…" createHref="/dashboard/create/ledger"  disabled={readOnly} />
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
               disabled={readOnly} />
              {selectedPartyLedger?.party_details?.state ? (
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <label className="mb-1 text-sm font-medium text-slate-600 sm:mb-0 sm:w-1/3">Tax Mode</label>
                  <div className="flex h-10 w-full items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 sm:w-2/3">
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
                 disabled={readOnly} />
              )}
              {taxMode === "inter" ? (
                <ComboboxField
                  label="IGST Ledger"
                  value={form.igst_ledger_id}
                  onChange={(value) => setForm((prev) => ({ ...prev, igst_ledger_id: value }))}
                  options={taxLedgers}
                  placeholder="Type to search tax ledger…"
                  createHref="/dashboard/create/ledger"
                 disabled={readOnly} />
              ) : (
                <>
                  <ComboboxField label="CGST Ledger" value={form.cgst_ledger_id} onChange={(value) => setForm((prev) => ({ ...prev, cgst_ledger_id: value }))} options={taxLedgers} placeholder="Type to search…" createHref="/dashboard/create/ledger"  disabled={readOnly} />
                  <ComboboxField label="SGST Ledger" value={form.sgst_ledger_id} onChange={(value) => setForm((prev) => ({ ...prev, sgst_ledger_id: value }))} options={taxLedgers} placeholder="Type to search…" createHref="/dashboard/create/ledger"  disabled={readOnly} />
                </>
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
             disabled={readOnly} />
          ) : null}
        </div>
      </div>

      {/* Lines Block */}
      {meta.family === "invoice" ? (
        <div className="border-b border-slate-100 bg-white">
          <div className="hidden grid-cols-[3fr_1fr_1fr_1fr_1.5fr_auto] gap-2 border-b border-slate-200 bg-slate-50/50 px-6 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:grid">
            <div>Name of Item</div>
            <div>Qty</div>
            <div>Rate</div>
            <div>Discount</div>
            <div className="text-right">Amount</div>
            <div className="w-10"></div>
          </div>
          <div className="divide-y divide-slate-100">
            {invoiceLines.map((line, index) => (
              <div key={`${index}-${line.item_id}`} className="grid gap-4 p-4 md:grid-cols-[3fr_1fr_1fr_1fr_1.5fr_auto] md:items-center md:gap-2 md:p-6 md:py-3">
                <div className="flex flex-col md:block">
                  <span className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:hidden">Item</span>
                  <ComboboxField
                    inline
                    value={line.item_id}
                    onChange={(id) => selectItem(index, id)}
                    options={items.map((item) => ({ value: item.id, label: item.name }))}
                    placeholder="Type to search item…"
                   disabled={readOnly} />
                </div>
                <div className="flex flex-col md:block">
                  <span className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:hidden">Qty</span>
                  <input disabled={readOnly} type="number" step="0.01" value={line.quantity || ""} onChange={(e) => updateInvoiceLine(index, { quantity: Number(e.target.value) })} placeholder="0" className="h-10 w-full rounded-md border border-slate-200 px-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 md:h-9 md:border-transparent md:hover:border-slate-200" />
                </div>
                <div className="flex flex-col md:block">
                  <span className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:hidden">Rate</span>
                  <input disabled={readOnly} type="number" step="0.01" value={line.unit_price || ""} onChange={(e) => updateInvoiceLine(index, { unit_price: Number(e.target.value) })} placeholder="0.00" className="h-10 w-full rounded-md border border-slate-200 px-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 md:h-9 md:border-transparent md:hover:border-slate-200" />
                </div>
                <div className="flex flex-col md:block">
                  <span className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:hidden">Discount</span>
                  <input disabled={readOnly} type="number" step="0.01" value={line.discount_amount || ""} onChange={(e) => updateInvoiceLine(index, { discount_amount: Number(e.target.value) })} placeholder="0.00" className="h-10 w-full rounded-md border border-slate-200 px-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 md:h-9 md:border-transparent md:hover:border-slate-200" />
                </div>
                <div className="flex items-center justify-between md:justify-end md:pr-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:hidden">Amount</span>
                  <span className="font-medium text-slate-900">{formatCurrency(line.taxable_amount)}</span>
                </div>
                <div className="flex justify-end">
                  <button disabled={readOnly} className={readOnly ? "hidden" : "text-sm font-medium text-rose-500 hover:text-rose-700"} onClick={() => setInvoiceLines((prev) => prev.filter((_, i) => i !== index))}>Remove</button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 px-4 py-3 sm:px-6">
            <button disabled={readOnly} className={readOnly ? "hidden" : "text-sm font-medium text-emerald-600 hover:text-emerald-700"} onClick={() => setInvoiceLines((prev) => [...prev, { ...EMPTY_INVOICE_LINE }])}>
              + Add Line
            </button>
          </div>
        </div>
      ) : null}

      {meta.family === "journal" ? (
        <div className="border-b border-slate-100 bg-white">
           <div className="hidden grid-cols-[2fr_1fr_1fr_auto] gap-4 border-b border-slate-200 bg-slate-50/50 px-6 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:grid">
            <div>Ledger</div>
            <div>Debit</div>
            <div>Credit</div>
            <div className="w-10"></div>
          </div>
          <div className="divide-y divide-slate-100">
            {journalLines.map((line, index) => (
              <div key={index} className="grid gap-4 p-4 md:grid-cols-[2fr_1fr_1fr_auto] md:items-center md:gap-4 md:p-6 md:py-3">
                 <div className="flex flex-col md:block">
                  <span className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:hidden">Ledger</span>
                  <ComboboxField
                    inline
                    value={line.ledger_id}
                    onChange={(id) => setJournalLines((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, ledger_id: id } : entry))}
                    options={allLedgerOptions}
                    placeholder="Type to search ledger…"
                    createHref="/dashboard/create/ledger"
                   disabled={readOnly} />
                </div>
                <div className="flex flex-col md:block">
                  <span className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:hidden">Debit</span>
                  <input disabled={readOnly} type="number" step="0.01" value={line.debit_amount || ""} onChange={(e) => setJournalLines((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, debit_amount: Number(e.target.value), credit_amount: 0 } : entry))} placeholder="0.00" className="h-10 w-full rounded-md border border-slate-200 px-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 md:h-9 md:border-transparent md:hover:border-slate-200" />
                </div>
                <div className="flex flex-col md:block">
                  <span className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:hidden">Credit</span>
                  <input disabled={readOnly} type="number" step="0.01" value={line.credit_amount || ""} onChange={(e) => setJournalLines((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, credit_amount: Number(e.target.value), debit_amount: 0 } : entry))} placeholder="0.00" className="h-10 w-full rounded-md border border-slate-200 px-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 md:h-9 md:border-transparent md:hover:border-slate-200" />
                </div>
                <div className="flex justify-end">
                  <button disabled={readOnly} className={readOnly ? "hidden" : "text-sm font-medium text-rose-500 hover:text-rose-700"} onClick={() => setJournalLines((prev) => prev.filter((_, entryIndex) => entryIndex !== index))}>Remove</button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 px-4 py-3 sm:px-6">
            <button disabled={readOnly} className={readOnly ? "hidden" : "text-sm font-medium text-emerald-600 hover:text-emerald-700"} onClick={() => setJournalLines((prev) => [...prev, { ...EMPTY_JOURNAL_LINE }])}>
              + Add Accounting Line
            </button>
          </div>
        </div>
      ) : null}

      {/* Totals & Narration Flow */}
      <div className="flex flex-col-reverse md:grid md:grid-cols-2 md:items-start border-b border-slate-100 bg-white">
         <div className="p-4 sm:p-6 border-t border-slate-100 md:border-t-0 md:border-r">
           <label className="mb-2 block text-sm font-medium text-slate-600">Narration</label>
           <textarea disabled={readOnly}  
             className="min-h-[100px] w-full rounded-md border border-slate-200 p-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" 
             placeholder="Enter narration for this voucher..." 
             value={form.narration} 
             onChange={(e) => setForm((prev) => ({ ...prev, narration: e.target.value }))} 
           />
         </div>
         <div className="p-4 sm:p-6 bg-slate-50/30">
            {meta.family === "invoice" ? (
              <div className="ml-auto w-full space-y-3 md:max-w-sm">
                 <div className="flex justify-between text-sm text-slate-600">
                    <span>Taxable Amount</span>
                    <span className="font-medium text-slate-900">{formatCurrency(invoiceTotals.taxable)}</span>
                 </div>
                 {taxMode === 'inter' && invoiceTotals.igst > 0 && (
                   <div className="flex justify-between text-sm text-slate-600">
                      <span>IGST</span>
                      <span>{formatCurrency(invoiceTotals.igst)}</span>
                   </div>
                 )}
                 {taxMode === 'intra' && (invoiceTotals.cgst > 0 || invoiceTotals.sgst > 0) && (
                   <>
                     <div className="flex justify-between text-sm text-slate-600">
                        <span>CGST</span>
                        <span>{formatCurrency(invoiceTotals.cgst)}</span>
                     </div>
                     <div className="flex justify-between text-sm text-slate-600">
                        <span>SGST</span>
                        <span>{formatCurrency(invoiceTotals.sgst)}</span>
                     </div>
                   </>
                 )}
                 {invoiceTotals.cess > 0 && (
                   <div className="flex justify-between text-sm text-slate-600">
                      <span>Cess</span>
                      <span>{formatCurrency(invoiceTotals.cess)}</span>
                   </div>
                 )}
                 <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-base font-bold text-slate-900">
                    <span>Grand Total</span>
                    <span className="text-xl">{formatCurrency(invoiceTotals.grandTotal)}</span>
                 </div>
              </div>
            ) : (
              <div className="flex h-full flex-col justify-end">
                <p className="text-right text-sm text-slate-500">Total impact will be computed from lines.</p>
              </div>
            )}
         </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between p-4 sm:p-6 bg-slate-50/50">
        <Link href="/dashboard/create" className="text-sm font-medium text-slate-600 hover:text-slate-900 sm:hidden">
           Cancel
        </Link>
        <div className="hidden sm:block" />
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="hidden rounded-md border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:block">
            Cancel
          </button>
          {!readOnly ? (
            <button disabled={isSubmitting || isLoading} onClick={() => void submit()} className="rounded-md bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-60">
              {isSubmitting ? "Saving..." : isEditing ? "Update voucher" : "Save voucher"}
            </button>
          ) : (
            <Link href={`/dashboard/vouchers/${voucherId}/edit`} className="rounded-md bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500">
              Edit voucher
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
