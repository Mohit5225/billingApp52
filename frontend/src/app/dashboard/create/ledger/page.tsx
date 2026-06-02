"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";

import {
  AccountGroup,
  DrCrType,
  LedgerDetail,
  LedgerTemplateType,
  LedgerWritePayload,
} from "@/interfaces/ledger";
import { apiRequest } from "@/lib/http";
import { useDashboardChrome } from "@/context/DashboardChromeContext";
import { useFirmScope } from "../../shared/useFirmScope";
import { PageHero, SurfaceCard } from "../../shared/WorkspaceUi";
import { useToast } from "@/context/ToastContext";

type LedgerFormState = {
  name: string;
  alias: string;
  group_id: string;
  opening_balance: number;
  opening_balance_type: DrCrType;
  inventory_values_affected: boolean;
  cost_centre_applicable: boolean;
  bank_details: {
    account_number: string;
    ifsc_code: string;
    swift_code: string;
    bank_name: string;
    branch_name: string;
  };
  party_details: {
    maintain_bill_by_bill: boolean;
    default_credit_days: number;
    mailing_name: string;
    address: string;
    state: string;
    country: string;
    pincode: string;
    pan_number: string;
    gst_registration_type: "" | "Regular" | "Composition" | "Unregistered" | "Consumer";
    gstin: string;
  };
  tax_details: {
    duty_tax_type: "" | "GST" | "TDS" | "TCS" | "VAT" | "Others";
    tax_percentage: number;
  };
};

type BankSectionMeta = {
  transaction_type: string;
  international_account: boolean;
};

type BankSectionErrors = Partial<{
  transaction_type: string;
  account_number: string;
  ifsc_code: string;
  swift_code: string;
  bank_name: string;
}>;

const EMPTY_FORM: LedgerFormState = {
  name: "",
  alias: "",
  group_id: "",
  opening_balance: 0,
  opening_balance_type: "Dr",
  inventory_values_affected: false,
  cost_centre_applicable: false,
  bank_details: {
    account_number: "",
    ifsc_code: "",
    swift_code: "",
    bank_name: "",
    branch_name: "",
  },
  party_details: {
    maintain_bill_by_bill: false,
    default_credit_days: 0,
    mailing_name: "",
    address: "",
    state: "",
    country: "India",
    pincode: "",
    pan_number: "",
    gst_registration_type: "",
    gstin: "",
  },
  tax_details: {
    duty_tax_type: "",
    tax_percentage: 0,
  },
};

function resolveTemplateType(group: AccountGroup | null): LedgerTemplateType {
  if (!group) return "default";
  if (group.name === "Bank Accounts" || group.name === "Bank OD A/c") return "bank";
  if (group.name === "Duties & Taxes") return "tax";
  if (
    group.name === "Sundry Debtors"
    || group.name === "Sundry Creditors"
    || group.parent_name === "Current Liabilities"
    || group.parent_name === "Current Assets"
  ) {
    return "party";
  }
  return "default";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> | React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  if ("type" in props && props.type === "textarea") {
    return (
      <textarea
        {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        className={`min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 ${props.className || ""}`}
      />
    );
  }
  return (
    <input
      {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
      className={`h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 ${props.className || ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 ${props.className || ""}`}
    />
  );
}

const BANK_ACCOUNT_NUMBER_REGEX = /^[A-Z0-9]{9,18}$/;
const BANK_IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const BANK_SWIFT_REGEX = /^[A-Z0-9]{8}([A-Z0-9]{3})?$/;

type TextFieldChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type SelectFieldChangeEvent = React.ChangeEvent<HTMLSelectElement>;

function validateBankSection(bankDetails: LedgerFormState["bank_details"], bankMeta: BankSectionMeta): BankSectionErrors {
  const errors: BankSectionErrors = {};

  if (!bankMeta.transaction_type.trim()) {
    errors.transaction_type = "Select a transaction type.";
  }

  const accountNumber = bankDetails.account_number.trim().toUpperCase();
  if (!accountNumber) {
    errors.account_number = "Account number is required.";
  } else if (!BANK_ACCOUNT_NUMBER_REGEX.test(accountNumber)) {
    errors.account_number = "Use 9 to 18 alphanumeric characters for the account number.";
  }

  const ifscCode = bankDetails.ifsc_code.trim().toUpperCase();
  if (!ifscCode) {
    errors.ifsc_code = "IFSC code is required.";
  } else if (!BANK_IFSC_REGEX.test(ifscCode)) {
    errors.ifsc_code = "Enter a valid IFSC code, for example SBIN0001234.";
  }

  if (!bankDetails.bank_name.trim()) {
    errors.bank_name = "Bank name is required.";
  }

  if (bankMeta.international_account) {
    const swiftCode = bankDetails.swift_code.trim().toUpperCase();
    if (!swiftCode) {
      errors.swift_code = "SWIFT code is required for international accounts.";
    } else if (!BANK_SWIFT_REGEX.test(swiftCode)) {
      errors.swift_code = "Enter a valid SWIFT/BIC code (8 or 11 alphanumeric characters).";
    }
  }

  return errors;
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex h-11 w-full rounded-xl bg-slate-100 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded-lg text-sm font-semibold transition ${
            value === opt.value
              ? "bg-[#0B1021] text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function LabeledToggle({
  checked,
  label,
  description,
  onChange,
  className = "",
}: {
  checked: boolean;
  label: string;
  description?: string;
  onChange: (next: boolean) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-200 ${className}`}>
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
          checked ? "bg-[#0B1021]" : "bg-slate-200"
        }`}
      >
        <span className="sr-only">Use setting</span>
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export default function LedgerCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ledgerId = searchParams.get("ledger_id");
  const { activeFirmId, supabase } = useFirmScope();
  const [groups, setGroups] = useState<AccountGroup[]>([]);
  const [form, setForm] = useState<LedgerFormState>(EMPTY_FORM);
  const [bankMeta, setBankMeta] = useState<BankSectionMeta>({
    transaction_type: "Cheque / DD",
    international_account: false,
  });
  const [bankErrors, setBankErrors] = useState<BankSectionErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingGst, setIsFetchingGst] = useState(false);
  const { showToast } = useToast();
  const { setBottomNavVisible } = useDashboardChrome();

  useLayoutEffect(() => {
    setBottomNavVisible(false);

    return () => {
      setBottomNavVisible(true);
    };
  }, [setBottomNavVisible]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === form.group_id) || null,
    [form.group_id, groups],
  );
  const templateType = useMemo(() => resolveTemplateType(selectedGroup), [selectedGroup]);

  useEffect(() => {
    if (selectedGroup) {
      const drGroups = [
        "Sundry Debtors",
        "Bank Accounts",
        "Cash in Hand",
        "Direct Expenses",
        "Indirect Expenses",
        "Purchase Accounts",
      ];
      const crGroups = [
        "Sundry Creditors",
        "Loans (Liability)",
        "Loans (Liabilities)",
        "Duties & Taxes",
        "Duties and Taxes",
        "Sales Accounts",
      ];
      
      if (drGroups.includes(selectedGroup.name)) {
        setForm((prev) => ({ ...prev, opening_balance_type: "Dr" }));
      } else if (crGroups.includes(selectedGroup.name)) {
        setForm((prev) => ({ ...prev, opening_balance_type: "Cr" }));
      }
    }
  }, [selectedGroup]);

  useEffect(() => {
    if (templateType !== "bank") {
      setBankErrors({});
    }
  }, [templateType]);

  useEffect(() => {
    if (!activeFirmId) return;

    let mounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const accountGroups = await apiRequest<AccountGroup[]>(supabase, "/api/ledgers/account-groups", {
          query: { firm_id: activeFirmId },
        });
        if (!mounted) return;
        setGroups(accountGroups);
        if (!ledgerId && accountGroups[0]) {
          setForm((prev) => ({ ...prev, group_id: prev.group_id || accountGroups[0].id }));
        }

        if (ledgerId) {
          const ledger = await apiRequest<LedgerDetail>(supabase, `/api/ledgers/${ledgerId}`);
          if (!mounted) return;
          setForm({
            name: ledger.name,
            alias: ledger.alias || "",
            group_id: ledger.group_id,
            opening_balance: ledger.opening_balance,
            opening_balance_type: ledger.opening_balance_type,
            inventory_values_affected: ledger.inventory_values_affected,
            cost_centre_applicable: ledger.cost_centre_applicable,
            bank_details: {
              account_number: ledger.bank_details?.account_number || "",
              ifsc_code: ledger.bank_details?.ifsc_code || "",
              swift_code: ledger.bank_details?.swift_code || "",
              bank_name: ledger.bank_details?.bank_name || "",
              branch_name: ledger.bank_details?.branch_name || "",
            },
            party_details: {
              maintain_bill_by_bill: ledger.party_details?.maintain_bill_by_bill || false,
              default_credit_days: ledger.party_details?.default_credit_days || 0,
              mailing_name: ledger.party_details?.mailing_name || "",
              address: ledger.party_details?.address || "",
              state: ledger.party_details?.state || "",
              country: ledger.party_details?.country || "India",
              pincode: ledger.party_details?.pincode || "",
              pan_number: ledger.party_details?.pan_number || "",
              gst_registration_type: ledger.party_details?.gst_registration_type || "",
              gstin: ledger.party_details?.gstin || "",
            },
            tax_details: {
              duty_tax_type: ledger.tax_details?.duty_tax_type || "",
              tax_percentage: ledger.tax_details?.tax_percentage || 0,
            },
          });
        }
      } catch (err) {
        if (mounted) showToast(err instanceof Error ? err.message : "Unable to load ledger setup", "error");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [activeFirmId, ledgerId, supabase]);

  const handleFetchGstDetails = async () => {
    const gstin = form.party_details.gstin.trim();
    if (!gstin.match(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/)) {
      showToast("Invalid GSTIN format", "error");
      return;
    }
    
    setIsFetchingGst(true);
    try {
      const data = await apiRequest<any>(supabase, `/api/firms/gst/fetch?gstin=${gstin}`);
      
      setForm((prev) => ({
        ...prev,
        name: prev.name.trim() ? prev.name : (data.name || prev.name),
        party_details: {
          ...prev.party_details,
          mailing_name: data.name || prev.party_details.mailing_name,
          address: data.address_lane1 ? `${data.address_lane1}${data.city ? `, ${data.city}` : ''}` : prev.party_details.address,
          state: data.state || prev.party_details.state,
          pincode: data.pincode || prev.party_details.pincode,
          pan_number: data.pan || prev.party_details.pan_number,
          gst_registration_type: data.gstin ? "Regular" : prev.party_details.gst_registration_type,
        }
      }));
      showToast("GST details fetched successfully", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to fetch GST details", "error");
    } finally {
      setIsFetchingGst(false);
    }
  };

  async function submit() {
    if (!activeFirmId) return;
    try {
      setIsSubmitting(true);

      if (templateType === "bank") {
        const validationErrors = validateBankSection(form.bank_details, bankMeta);
        if (Object.keys(validationErrors).length > 0) {
          setBankErrors(validationErrors);
          showToast("Please complete the bank details before saving.", "error");
          return;
        }
      }

      if (templateType === "party") {
        if (!form.party_details.state.trim()) {
          showToast("State is mandatory for Party ledgers (Debtors/Creditors) to calculate GST.", "error");
          return;
        }
      }

      setBankErrors({});

      const payload: LedgerWritePayload = {
        firm_id: activeFirmId,
        group_id: form.group_id,
        name: form.name.trim(),
        alias: form.alias ? form.alias.trim() : null,
        opening_balance: Number(form.opening_balance || 0),
        opening_balance_type: form.opening_balance_type,
        inventory_values_affected: form.inventory_values_affected,
        cost_centre_applicable: form.cost_centre_applicable,
        bank_details: templateType === "bank" ? {
          ...form.bank_details,
          account_number: form.bank_details.account_number ? form.bank_details.account_number.trim() : null,
          ifsc_code: form.bank_details.ifsc_code ? form.bank_details.ifsc_code.trim() : null,
          swift_code: form.bank_details.swift_code ? form.bank_details.swift_code.trim() : null,
          bank_name: form.bank_details.bank_name ? form.bank_details.bank_name.trim() : null,
          branch_name: form.bank_details.branch_name ? form.bank_details.branch_name.trim() : null,
        } : null,
        party_details: templateType === "party" ? {
          ...form.party_details,
          default_credit_days: form.party_details.default_credit_days || null,
          mailing_name: form.party_details.mailing_name ? form.party_details.mailing_name.trim() : null,
          address: form.party_details.address ? form.party_details.address.trim() : null,
          state: form.party_details.state ? form.party_details.state.trim() : null,
          country: form.party_details.country ? form.party_details.country.trim() : null,
          pincode: form.party_details.pincode ? form.party_details.pincode.trim() : null,
          pan_number: form.party_details.pan_number ? form.party_details.pan_number.trim() : null,
          gst_registration_type: form.party_details.gst_registration_type || null,
          gstin: form.party_details.gstin ? form.party_details.gstin.trim() : null,
        } : null,
        tax_details: templateType === "tax" ? {
          duty_tax_type: form.tax_details.duty_tax_type || null,
          tax_percentage: form.tax_details.tax_percentage || null,
        } : null,
      };

      if (ledgerId) {
        await apiRequest<LedgerDetail>(supabase, `/api/ledgers/${ledgerId}`, {
          method: "PATCH",
          body: payload,
        });
      } else {
        await apiRequest<LedgerDetail>(supabase, "/api/ledgers/", {
          method: "POST",
          body: payload,
        });
      }

      router.push("/dashboard/books/ledger");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to save ledger", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 pb-20">
      <PageHero
        eyebrow="Ledger setup"
        title={ledgerId ? "Edit Ledger" : "Create Ledger"}
        description="Create or update the account master, then return to the dashboard when you’re done."
      >
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to dashboard</span>
        </Link>
      </PageHero>

      <SurfaceCard title="Core Details" description="Start with the ledger identity, group, and opening balance.">
        <div className="space-y-6">
          <Field label="Ledger Name *">
            <Input placeholder="e.g. Mahalakshmi Enterprises" value={form.name} onChange={(event: TextFieldChangeEvent) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          </Field>
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Alias">
              <Input placeholder="Optional short name" value={form.alias} onChange={(event: TextFieldChangeEvent) => setForm((prev) => ({ ...prev, alias: event.target.value }))} />
            </Field>
            <Field label="Opening Balance">
              <div className="relative">
                <Input type="number" step="0.01" placeholder="0.00" value={form.opening_balance || ""} onChange={(event: TextFieldChangeEvent) => setForm((prev) => ({ ...prev, opening_balance: Number(event.target.value) }))} className="pr-12" />
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, opening_balance_type: prev.opening_balance_type === "Dr" ? "Cr" : "Dr" }))}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-sm font-bold text-slate-500 hover:text-slate-900 focus:outline-none transition-colors"
                >
                  {form.opening_balance_type}
                </button>
              </div>
            </Field>
          </div>
          <Field label="Account Group *">
            <div className="relative">
              <Select value={form.group_id} onChange={(event: SelectFieldChangeEvent) => setForm((prev) => ({ ...prev, group_id: event.target.value }))} className="pl-3 pr-24">
                <option value="">Select group</option>
                {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </Select>
              {selectedGroup?.nature && (
                <div className="pointer-events-none absolute inset-y-0 right-10 flex items-center pr-2">
                  <span className="rounded bg-[#EAF5F0] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#40916C]">
                    {selectedGroup.nature}
                  </span>
                </div>
              )}
            </div>
          </Field>
        </div>
      </SurfaceCard>

      {templateType === "party" ? (
        <SurfaceCard title="Party Details" description="Capture billing, registration, and credit defaults for debtor or creditor ledgers.">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
              <div className="flex-1">
                <Field label="GSTIN">
                  <Input placeholder="15-digit GSTIN" value={form.party_details.gstin} onChange={(event: TextFieldChangeEvent) => setForm((prev) => ({ ...prev, party_details: { ...prev.party_details, gstin: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') } }))} maxLength={15} />
                </Field>
              </div>
              <button
                type="button"
                onClick={() => void handleFetchGstDetails()}
                disabled={isFetchingGst || form.party_details.gstin.length !== 15}
                className="h-11 w-full sm:w-auto rounded-xl bg-emerald-50 px-6 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:shadow-none disabled:cursor-not-allowed border border-emerald-200 shadow-sm flex items-center justify-center"
              >
                {isFetchingGst ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8v8H4z" fill="currentColor" className="opacity-75" />
                    </svg>
                    Fetching...
                  </span>
                ) : (
                  "Fetch Details"
                )}
              </button>
            </div>

            <Field label="Mailing Name">
              <Input placeholder="Mailing name" value={form.party_details.mailing_name} onChange={(event: TextFieldChangeEvent) => setForm((prev) => ({ ...prev, party_details: { ...prev.party_details, mailing_name: event.target.value } }))} />
            </Field>

            <Field label="Address">
              <Input type="textarea" placeholder="Billing address" value={form.party_details.address} onChange={(event: TextFieldChangeEvent) => setForm((prev) => ({ ...prev, party_details: { ...prev.party_details, address: event.target.value } }))} />
            </Field>

            <div className="grid gap-6 md:grid-cols-2">
              <Field label="State">
                <Input placeholder="State" value={form.party_details.state} onChange={(event: TextFieldChangeEvent) => setForm((prev) => ({ ...prev, party_details: { ...prev.party_details, state: event.target.value } }))} />
              </Field>
              <Field label="Country">
                <Input placeholder="Country" value={form.party_details.country} onChange={(event: TextFieldChangeEvent) => setForm((prev) => ({ ...prev, party_details: { ...prev.party_details, country: event.target.value } }))} />
              </Field>
              <Field label="Pincode">
                <Input placeholder="Pincode" value={form.party_details.pincode} onChange={(event: TextFieldChangeEvent) => setForm((prev) => ({ ...prev, party_details: { ...prev.party_details, pincode: event.target.value } }))} />
              </Field>
              <Field label="PAN Number">
                <Input placeholder="PAN number" value={form.party_details.pan_number} onChange={(event: TextFieldChangeEvent) => setForm((prev) => ({ ...prev, party_details: { ...prev.party_details, pan_number: event.target.value.toUpperCase() } }))} />
              </Field>
              <Field label="GST Registration Type">
                <Select value={form.party_details.gst_registration_type} onChange={(event: SelectFieldChangeEvent) => setForm((prev) => ({ ...prev, party_details: { ...prev.party_details, gst_registration_type: event.target.value as LedgerFormState["party_details"]["gst_registration_type"] } }))}>
                  <option value="">Select type</option>
                  <option value="Regular">Regular</option>
                  <option value="Composition">Composition</option>
                  <option value="Unregistered">Unregistered</option>
                  <option value="Consumer">Consumer</option>
                </Select>
              </Field>
            </div>

            <LabeledToggle
              checked={form.party_details.maintain_bill_by_bill}
              label="Maintain bill-by-bill"
              description="Useful for receivables and payables tracking."
              onChange={(next) => setForm((prev) => ({ ...prev, party_details: { ...prev.party_details, maintain_bill_by_bill: next } }))}
            />

            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Default Credit Days">
                <Input type="number" placeholder="0" value={form.party_details.default_credit_days || ""} onChange={(event: TextFieldChangeEvent) => setForm((prev) => ({ ...prev, party_details: { ...prev.party_details, default_credit_days: Number(event.target.value) } }))} />
              </Field>
            </div>
            
            <LabeledToggle
              checked={false} // Local UI only
              label="Check for credit days during voucher entry"
              onChange={() => {}}
            />

            <LabeledToggle
              checked={false} // Local UI only
              label="Set/Alter additional GST details"
              onChange={() => {}}
            />
          </div>
        </SurfaceCard>
      ) : null}

      {templateType === "bank" ? (
        <SurfaceCard title="Bank Details" description="Specify the transaction type and related bank information.">
          <div className="space-y-6">
            <Field label="Transaction Type *">
              <Select
                value={bankMeta.transaction_type}
                onChange={(event) => {
                  setBankMeta((prev) => ({ ...prev, transaction_type: event.target.value }));
                  setBankErrors({});
                }}
              >
                <option value="">Select type...</option>
                <option value="NEFT / RTGS">NEFT / RTGS</option>
                <option value="Cheque / DD">Cheque / DD</option>
                <option value="Others">Others</option>
              </Select>
              {bankErrors.transaction_type && <p className="text-xs font-medium text-red-600">{bankErrors.transaction_type}</p>}
            </Field>

            <LabeledToggle
              checked={bankMeta.international_account}
              label="International / foreign currency account"
              description="Enable this when a SWIFT/BIC code is required."
              onChange={(next) => {
                setBankMeta((prev) => ({ ...prev, international_account: next }));
                setBankErrors({});
              }}
            />

            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Account Number *">
                <Input
                  placeholder="Account number"
                  value={form.bank_details.account_number}
                  inputMode="text"
                  maxLength={18}
                  onChange={(event: TextFieldChangeEvent) => {
                    const value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                    setForm((prev) => ({ ...prev, bank_details: { ...prev.bank_details, account_number: value } }));
                    setBankErrors({});
                  }}
                />
                {bankErrors.account_number && <p className="text-xs font-medium text-red-600">{bankErrors.account_number}</p>}
              </Field>
              <Field label="IFSC Code *">
                <Input
                  placeholder="IFSC code"
                  value={form.bank_details.ifsc_code}
                  maxLength={11}
                  onChange={(event: TextFieldChangeEvent) => {
                    const value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                    setForm((prev) => ({ ...prev, bank_details: { ...prev.bank_details, ifsc_code: value } }));
                    setBankErrors({});
                  }}
                />
                {bankErrors.ifsc_code && <p className="text-xs font-medium text-red-600">{bankErrors.ifsc_code}</p>}
              </Field>
              <Field label={bankMeta.international_account ? "SWIFT Code *" : "SWIFT Code"}>
                <Input
                  placeholder="SWIFT code"
                  value={form.bank_details.swift_code}
                  maxLength={11}
                  onChange={(event: TextFieldChangeEvent) => {
                    const value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                    setForm((prev) => ({ ...prev, bank_details: { ...prev.bank_details, swift_code: value } }));
                    setBankErrors({});
                  }}
                />
                {bankErrors.swift_code && <p className="text-xs font-medium text-red-600">{bankErrors.swift_code}</p>}
              </Field>
              <Field label="Bank Name *">
                <Input
                  placeholder="Bank name"
                  value={form.bank_details.bank_name}
                  onChange={(event: TextFieldChangeEvent) => {
                    setForm((prev) => ({ ...prev, bank_details: { ...prev.bank_details, bank_name: event.target.value } }));
                    setBankErrors({});
                  }}
                />
                {bankErrors.bank_name && <p className="text-xs font-medium text-red-600">{bankErrors.bank_name}</p>}
              </Field>
              <Field label="Branch Name">
                <Input
                  placeholder="Branch name"
                  value={form.bank_details.branch_name}
                  onChange={(event: TextFieldChangeEvent) => {
                    setForm((prev) => ({ ...prev, bank_details: { ...prev.bank_details, branch_name: event.target.value } }));
                    setBankErrors({});
                  }}
                />
              </Field>
            </div>
          </div>
        </SurfaceCard>
      ) : null}

      {templateType === "tax" ? (
        <SurfaceCard title="Tax Details" description="Configure duty type and calculation percentage.">
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Duty/Tax Type">
              <Select value={form.tax_details.duty_tax_type} onChange={(event: SelectFieldChangeEvent) => setForm((prev) => ({ ...prev, tax_details: { ...prev.tax_details, duty_tax_type: event.target.value as LedgerFormState["tax_details"]["duty_tax_type"] } }))}>
                <option value="">Select type...</option>
                <option value="GST">GST</option>
                <option value="TDS">TDS</option>
                <option value="TCS">TCS</option>
                <option value="VAT">VAT</option>
                <option value="Others">Others</option>
              </Select>
            </Field>
            <Field label="Tax Percentage">
              <Input type="number" step="0.01" placeholder="0.00" value={form.tax_details.tax_percentage || ""} onChange={(event: TextFieldChangeEvent) => setForm((prev) => ({ ...prev, tax_details: { ...prev.tax_details, tax_percentage: Number(event.target.value) } }))} />
            </Field>
          </div>
        </SurfaceCard>
      ) : null}

      <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between border-t border-slate-200 bg-white/80 p-4 px-6 shadow-[0_-4px_24px_rgba(15,23,42,0.04)] backdrop-blur-md lg:left-[280px]">
        <div>
          <p className="text-sm font-semibold text-slate-900">{ledgerId ? "Ready to save this ledger?" : "Ready to save this ledger?"}</p>
        </div>
          <div className="flex gap-3">
            <Link href="/dashboard" className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
              Cancel
            </Link>
          <button disabled={isSubmitting || isLoading} onClick={() => void submit()} className="rounded-xl bg-[#0B1021] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60">
            {isSubmitting ? "Saving..." : ledgerId ? "Update ledger" : "Create ledger"}
          </button>
        </div>
      </div>
    </div>
  );
}
