"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ItemDetail } from "@/interfaces/inventory";
import { LedgerDetail } from "@/interfaces/ledger";
import { VoucherCategory, VoucherDetail, VoucherWritePayload } from "@/interfaces/voucher";
import { apiRequest } from "@/lib/http";
import { formatCurrency } from "@/lib/format";

import { PageHero, SurfaceCard } from "./WorkspaceUi";
import { useFirmScope } from "./useFirmScope";

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

function SelectField({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function VoucherWorkbench({
  slug,
  voucherId,
}: {
  slug: VoucherSlug;
  voucherId?: string;
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
          apiRequest<LedgerDetail[]>(supabase, "/api/ledgers", { query: { firm_id: activeFirmId } }),
          apiRequest<ItemDetail[]>(supabase, "/api/items", {
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
        : await apiRequest<VoucherDetail>(supabase, "/api/vouchers", {
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
    <div className="space-y-6">
      <PageHero
        eyebrow={isEditing ? "Edit Voucher" : "Create Voucher"}
        title={meta.title}
        description={meta.description}
      >
        <Link href="/dashboard/create" className="self-start rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
          Back to create hub
        </Link>
      </PageHero>

      {error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div> : null}

      <SurfaceCard title="Header" description={isLoading ? "Loading..." : "Voucher identity, date, and high-level posting choices."}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input className="h-12 rounded-2xl border border-slate-200 bg-slate-50/85 px-4 text-sm" placeholder="Voucher number" value={form.voucher_number} onChange={(event) => setForm((prev) => ({ ...prev, voucher_number: event.target.value }))} />
          <input className="h-12 rounded-2xl border border-slate-200 bg-slate-50/85 px-4 text-sm" type="date" value={form.voucher_date} onChange={(event) => setForm((prev) => ({ ...prev, voucher_date: event.target.value }))} />
          {meta.family === "invoice" || meta.family === "payment" ? (
            <SelectField
              value={form.party_ledger_id}
              onChange={(value) => setForm((prev) => ({ ...prev, party_ledger_id: value }))}
              options={partyLedgers}
              placeholder="Select party ledger"
            />
          ) : null}
          {meta.family === "payment" ? (
            <SelectField
              value={form.cash_bank_ledger_id}
              onChange={(value) => setForm((prev) => ({ ...prev, cash_bank_ledger_id: value }))}
              options={cashBankLedgers}
              placeholder="Select cash / bank ledger"
            />
          ) : null}
          {meta.family === "contra" ? (
            <>
              <SelectField value={form.source_ledger_id} onChange={(value) => setForm((prev) => ({ ...prev, source_ledger_id: value }))} options={cashBankLedgers} placeholder="Transfer from" />
              <SelectField value={form.destination_ledger_id} onChange={(value) => setForm((prev) => ({ ...prev, destination_ledger_id: value }))} options={cashBankLedgers} placeholder="Transfer to" />
            </>
          ) : null}
          {meta.family === "invoice" ? (
            <>
              <SelectField
                value={form.main_ledger_id}
                onChange={(value) => setForm((prev) => ({ ...prev, main_ledger_id: value }))}
                options={mainLedgers}
                placeholder="Select main ledger"
              />
              {selectedPartyLedger?.party_details?.state ? (
                <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50/85 px-4 text-sm text-slate-600">
                  Tax mode: <span className="ml-2 font-semibold text-slate-900">{taxMode === "inter" ? "Inter-state / IGST" : "Intra-state / CGST + SGST"}</span>
                </div>
              ) : (
                <SelectField
                  value={form.manual_tax_mode}
                  onChange={(value) => setForm((prev) => ({ ...prev, manual_tax_mode: value as TaxMode }))}
                  options={[
                    { value: "intra", label: "Intra-state / CGST + SGST" },
                    { value: "inter", label: "Inter-state / IGST" },
                  ]}
                  placeholder="Select tax mode"
                />
              )}
              {taxMode === "inter" ? (
                <SelectField
                  value={form.igst_ledger_id}
                  onChange={(value) => setForm((prev) => ({ ...prev, igst_ledger_id: value }))}
                  options={taxLedgers}
                  placeholder="Select IGST ledger"
                />
              ) : (
                <>
                  <SelectField value={form.cgst_ledger_id} onChange={(value) => setForm((prev) => ({ ...prev, cgst_ledger_id: value }))} options={taxLedgers} placeholder="Select CGST ledger" />
                  <SelectField value={form.sgst_ledger_id} onChange={(value) => setForm((prev) => ({ ...prev, sgst_ledger_id: value }))} options={taxLedgers} placeholder="Select SGST ledger" />
                </>
              )}
            </>
          ) : null}
          {meta.family === "payment" || meta.family === "contra" ? (
            <input className="h-12 rounded-2xl border border-slate-200 bg-slate-50/85 px-4 text-sm" type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={(event) => setForm((prev) => ({ ...prev, amount: Number(event.target.value) }))} />
          ) : null}
          <div className="md:col-span-2 xl:col-span-4">
            <textarea className="min-h-[120px] w-full rounded-[24px] border border-slate-200 bg-slate-50/85 px-4 py-3 text-sm" placeholder="Narration" value={form.narration} onChange={(event) => setForm((prev) => ({ ...prev, narration: event.target.value }))} />
          </div>
        </div>
      </SurfaceCard>

      {meta.family === "invoice" ? (
        <>
          <SurfaceCard title="Inventory lines" description="Item rows carry quantity, pricing, tax rates, and computed amounts from the selected masters.">
            <div className="space-y-4">
              {invoiceLines.map((line, index) => (
                <div key={`${index}-${line.item_id}`} className="rounded-[24px] border border-slate-100 bg-white/92 p-4 shadow-sm">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <SelectField value={line.item_id} onChange={(value) => selectItem(index, value)} options={items.map((item) => ({ value: item.id, label: `${item.name} • ${item.hsn_code || "No HSN"}` }))} placeholder="Select item" />
                    <input className="h-12 rounded-2xl border border-slate-200 bg-slate-50/85 px-4 text-sm" type="number" step="0.01" placeholder="Qty" value={line.quantity} onChange={(event) => updateInvoiceLine(index, { quantity: Number(event.target.value) })} />
                    <input className="h-12 rounded-2xl border border-slate-200 bg-slate-50/85 px-4 text-sm" type="number" step="0.01" placeholder="Unit price" value={line.unit_price} onChange={(event) => updateInvoiceLine(index, { unit_price: Number(event.target.value) })} />
                    <input className="h-12 rounded-2xl border border-slate-200 bg-slate-50/85 px-4 text-sm" type="number" step="0.01" placeholder="Discount" value={line.discount_amount} onChange={(event) => updateInvoiceLine(index, { discount_amount: Number(event.target.value) })} />
                    <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50/85 px-4 text-sm text-slate-600">Taxable: <span className="ml-2 font-semibold text-slate-900">{formatCurrency(line.taxable_amount)}</span></div>
                    <button onClick={() => setInvoiceLines((prev) => prev.filter((_, rowIndex) => rowIndex !== index))} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">Remove</button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>IGST: {line.igst_rate}% / {formatCurrency(line.igst_amount)}</span>
                    <span>CGST: {line.cgst_rate}% / {formatCurrency(line.cgst_amount)}</span>
                    <span>SGST: {line.sgst_rate}% / {formatCurrency(line.sgst_amount)}</span>
                    <span>Cess: {formatCurrency(line.cess_amount)}</span>
                    <span>Total: {formatCurrency(line.taxable_amount + line.igst_amount + line.cgst_amount + line.sgst_amount + line.cess_amount)}</span>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setInvoiceLines((prev) => [...prev, { ...EMPTY_INVOICE_LINE }])} className="mt-5 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
              Add line
            </button>
          </SurfaceCard>

          <SurfaceCard title="Totals" description="A calm summary panel so the posting impact stays visible while you enter lines.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-[24px] border border-slate-100 bg-white/92 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Taxable</p>
                <p className="mt-3 text-xl font-semibold text-slate-950">{formatCurrency(invoiceTotals.taxable)}</p>
              </div>
              <div className="rounded-[24px] border border-slate-100 bg-white/92 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">IGST</p>
                <p className="mt-3 text-xl font-semibold text-slate-950">{formatCurrency(invoiceTotals.igst)}</p>
              </div>
              <div className="rounded-[24px] border border-slate-100 bg-white/92 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">CGST</p>
                <p className="mt-3 text-xl font-semibold text-slate-950">{formatCurrency(invoiceTotals.cgst)}</p>
              </div>
              <div className="rounded-[24px] border border-slate-100 bg-white/92 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">SGST / Cess</p>
                <p className="mt-3 text-xl font-semibold text-slate-950">{formatCurrency(invoiceTotals.sgst + invoiceTotals.cess)}</p>
              </div>
              <div className="rounded-[24px] border border-slate-100 bg-slate-950 p-4 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">Grand Total</p>
                <p className="mt-3 text-xl font-semibold">{formatCurrency(invoiceTotals.grandTotal)}</p>
              </div>
            </div>
          </SurfaceCard>
        </>
      ) : null}

      {meta.family === "journal" ? (
        <SurfaceCard title="Accounting lines" description="Direct debit and credit lines for pure accounting entries.">
          <div className="space-y-4">
            {journalLines.map((line, index) => (
              <div key={index} className="grid gap-4 rounded-[24px] border border-slate-100 bg-white/92 p-4 md:grid-cols-4">
                <SelectField value={line.ledger_id} onChange={(value) => setJournalLines((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, ledger_id: value } : entry))} options={allLedgerOptions} placeholder="Select ledger" />
                <input className="h-12 rounded-2xl border border-slate-200 bg-slate-50/85 px-4 text-sm" type="number" step="0.01" placeholder="Debit" value={line.debit_amount} onChange={(event) => setJournalLines((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, debit_amount: Number(event.target.value), credit_amount: 0 } : entry))} />
                <input className="h-12 rounded-2xl border border-slate-200 bg-slate-50/85 px-4 text-sm" type="number" step="0.01" placeholder="Credit" value={line.credit_amount} onChange={(event) => setJournalLines((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, credit_amount: Number(event.target.value), debit_amount: 0 } : entry))} />
                <button onClick={() => setJournalLines((prev) => prev.filter((_, entryIndex) => entryIndex !== index))} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">Remove</button>
              </div>
            ))}
          </div>
          <button onClick={() => setJournalLines((prev) => [...prev, { ...EMPTY_JOURNAL_LINE }])} className="mt-5 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
            Add accounting line
          </button>
        </SurfaceCard>
      ) : null}

      <div className="sticky bottom-4 z-20 rounded-[28px] border border-white/70 bg-white/88 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">{isEditing ? "Ready to update this voucher?" : "Ready to save this voucher?"}</p>
            <p className="mt-1 text-sm text-slate-500">
              {meta.family === "invoice" ? `Current total: ${formatCurrency(invoiceTotals.grandTotal)}` : "The accounting lines will be generated from the focused form shape."}
            </p>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button onClick={() => router.back()} className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600">
              Cancel
            </button>
            <button disabled={isSubmitting || isLoading} onClick={() => void submit()} className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {isSubmitting ? "Saving..." : isEditing ? "Update voucher" : "Create voucher"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
