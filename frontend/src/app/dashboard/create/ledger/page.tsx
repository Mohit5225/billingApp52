"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  AccountGroup,
  DrCrType,
  LedgerDetail,
  LedgerTemplateType,
  LedgerWritePayload,
} from "@/interfaces/ledger";
import { apiRequest } from "@/lib/http";
import { useFirmScope } from "../../shared/useFirmScope";
import { PageHero, SurfaceCard } from "../../shared/WorkspaceUi";

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

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/85 px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 ${props.className || ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 ${props.className || ""}`}
    />
  );
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-emerald-200"
    >
      <span>{label}</span>
      <span className={`inline-flex h-6 w-11 items-center rounded-full p-1 transition ${checked ? "bg-emerald-500" : "bg-slate-200"}`}>
        <span className={`h-4 w-4 rounded-full bg-white transition ${checked ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

export default function LedgerCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ledgerId = searchParams.get("ledger_id");
  const { activeFirmId, supabase } = useFirmScope();
  const [groups, setGroups] = useState<AccountGroup[]>([]);
  const [form, setForm] = useState<LedgerFormState>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === form.group_id) || null,
    [form.group_id, groups],
  );
  const templateType = useMemo(() => resolveTemplateType(selectedGroup), [selectedGroup]);

  useEffect(() => {
    if (!activeFirmId) return;

    let mounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
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
        if (mounted) setError(err instanceof Error ? err.message : "Unable to load ledger setup");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [activeFirmId, ledgerId, supabase]);

  async function submit() {
    if (!activeFirmId) return;
    try {
      setIsSubmitting(true);
      setError(null);

      const payload: LedgerWritePayload = {
        firm_id: activeFirmId,
        group_id: form.group_id,
        name: form.name,
        alias: form.alias || null,
        opening_balance: Number(form.opening_balance || 0),
        opening_balance_type: form.opening_balance_type,
        inventory_values_affected: form.inventory_values_affected,
        cost_centre_applicable: form.cost_centre_applicable,
        bank_details: templateType === "bank" ? {
          ...form.bank_details,
          account_number: form.bank_details.account_number || null,
          ifsc_code: form.bank_details.ifsc_code || null,
          swift_code: form.bank_details.swift_code || null,
          bank_name: form.bank_details.bank_name || null,
          branch_name: form.bank_details.branch_name || null,
        } : null,
        party_details: templateType === "party" ? {
          ...form.party_details,
          default_credit_days: form.party_details.default_credit_days || null,
          mailing_name: form.party_details.mailing_name || null,
          address: form.party_details.address || null,
          state: form.party_details.state || null,
          country: form.party_details.country || null,
          pincode: form.party_details.pincode || null,
          pan_number: form.party_details.pan_number || null,
          gst_registration_type: form.party_details.gst_registration_type || null,
          gstin: form.party_details.gstin || null,
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
        await apiRequest<LedgerDetail>(supabase, "/api/ledgers", {
          method: "POST",
          body: payload,
        });
      }

      router.push("/dashboard/books/ledger");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save ledger");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={ledgerId ? "Edit Ledger" : "Create Ledger"}
        title={ledgerId ? "Update a ledger without breaking the master contract." : "Create a ledger with the aligned backend contract."}
        description="This version keeps the styling calm and the data model honest: group-aware fields only show when they actually apply, and the payload matches the backend’s nested detail objects."
      />

      {error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div> : null}

      <SurfaceCard title="Core details" description={isLoading ? "Loading..." : "Name, group, opening balance, and behavior flags."}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Input placeholder="Ledger name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          <Input placeholder="Alias" value={form.alias} onChange={(event) => setForm((prev) => ({ ...prev, alias: event.target.value }))} />
          <Select value={form.group_id} onChange={(event) => setForm((prev) => ({ ...prev, group_id: event.target.value }))}>
            <option value="">Select group</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </Select>
          <div className="grid grid-cols-[1fr_110px] gap-3">
            <Input type="number" step="0.01" placeholder="Opening balance" value={form.opening_balance} onChange={(event) => setForm((prev) => ({ ...prev, opening_balance: Number(event.target.value) }))} />
            <Select value={form.opening_balance_type} onChange={(event) => setForm((prev) => ({ ...prev, opening_balance_type: event.target.value as DrCrType }))}>
              <option value="Dr">Dr</option>
              <option value="Cr">Cr</option>
            </Select>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Toggle checked={form.inventory_values_affected} label="Affects inventory values" onChange={(next) => setForm((prev) => ({ ...prev, inventory_values_affected: next }))} />
          <Toggle checked={form.cost_centre_applicable} label="Cost centre applicable" onChange={(next) => setForm((prev) => ({ ...prev, cost_centre_applicable: next }))} />
        </div>
      </SurfaceCard>

      {templateType === "bank" ? (
        <SurfaceCard title="Bank details" description="Shown because the selected group behaves like a bank ledger.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Input placeholder="Account number" value={form.bank_details.account_number} onChange={(event) => setForm((prev) => ({ ...prev, bank_details: { ...prev.bank_details, account_number: event.target.value } }))} />
            <Input placeholder="IFSC code" value={form.bank_details.ifsc_code} onChange={(event) => setForm((prev) => ({ ...prev, bank_details: { ...prev.bank_details, ifsc_code: event.target.value } }))} />
            <Input placeholder="SWIFT code" value={form.bank_details.swift_code} onChange={(event) => setForm((prev) => ({ ...prev, bank_details: { ...prev.bank_details, swift_code: event.target.value } }))} />
            <Input placeholder="Bank name" value={form.bank_details.bank_name} onChange={(event) => setForm((prev) => ({ ...prev, bank_details: { ...prev.bank_details, bank_name: event.target.value } }))} />
            <Input placeholder="Branch name" value={form.bank_details.branch_name} onChange={(event) => setForm((prev) => ({ ...prev, bank_details: { ...prev.bank_details, branch_name: event.target.value } }))} />
          </div>
        </SurfaceCard>
      ) : null}

      {templateType === "party" ? (
        <SurfaceCard title="Party details" description="Shown because this ledger works like a debtor, creditor, or other party-facing account.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input placeholder="Mailing name" value={form.party_details.mailing_name} onChange={(event) => setForm((prev) => ({ ...prev, party_details: { ...prev.party_details, mailing_name: event.target.value } }))} />
            <Input placeholder="Default credit days" type="number" value={form.party_details.default_credit_days} onChange={(event) => setForm((prev) => ({ ...prev, party_details: { ...prev.party_details, default_credit_days: Number(event.target.value) } }))} />
            <Input placeholder="State" value={form.party_details.state} onChange={(event) => setForm((prev) => ({ ...prev, party_details: { ...prev.party_details, state: event.target.value } }))} />
            <Input placeholder="Country" value={form.party_details.country} onChange={(event) => setForm((prev) => ({ ...prev, party_details: { ...prev.party_details, country: event.target.value } }))} />
            <Input placeholder="Pincode" value={form.party_details.pincode} onChange={(event) => setForm((prev) => ({ ...prev, party_details: { ...prev.party_details, pincode: event.target.value } }))} />
            <Input placeholder="PAN number" value={form.party_details.pan_number} onChange={(event) => setForm((prev) => ({ ...prev, party_details: { ...prev.party_details, pan_number: event.target.value } }))} />
            <Select value={form.party_details.gst_registration_type} onChange={(event) => setForm((prev) => ({ ...prev, party_details: { ...prev.party_details, gst_registration_type: event.target.value as LedgerFormState["party_details"]["gst_registration_type"] } }))}>
              <option value="">GST registration type</option>
              <option value="Regular">Regular</option>
              <option value="Composition">Composition</option>
              <option value="Unregistered">Unregistered</option>
              <option value="Consumer">Consumer</option>
            </Select>
            <Input placeholder="GSTIN" value={form.party_details.gstin} onChange={(event) => setForm((prev) => ({ ...prev, party_details: { ...prev.party_details, gstin: event.target.value } }))} />
            <div className="md:col-span-2 xl:col-span-4">
              <textarea className="min-h-[120px] w-full rounded-[24px] border border-slate-200 bg-slate-50/85 px-4 py-3 text-sm" placeholder="Address" value={form.party_details.address} onChange={(event) => setForm((prev) => ({ ...prev, party_details: { ...prev.party_details, address: event.target.value } }))} />
            </div>
            <div className="md:col-span-2 xl:col-span-4">
              <Toggle checked={form.party_details.maintain_bill_by_bill} label="Maintain bill-by-bill" onChange={(next) => setForm((prev) => ({ ...prev, party_details: { ...prev.party_details, maintain_bill_by_bill: next } }))} />
            </div>
          </div>
        </SurfaceCard>
      ) : null}

      {templateType === "tax" ? (
        <SurfaceCard title="Tax details" description="Shown because the selected group is a tax ledger.">
          <div className="grid gap-4 md:grid-cols-2">
            <Select value={form.tax_details.duty_tax_type} onChange={(event) => setForm((prev) => ({ ...prev, tax_details: { ...prev.tax_details, duty_tax_type: event.target.value as LedgerFormState["tax_details"]["duty_tax_type"] } }))}>
              <option value="">Select tax type</option>
              <option value="GST">GST</option>
              <option value="TDS">TDS</option>
              <option value="TCS">TCS</option>
              <option value="VAT">VAT</option>
              <option value="Others">Others</option>
            </Select>
            <Input type="number" step="0.01" placeholder="Tax percentage" value={form.tax_details.tax_percentage} onChange={(event) => setForm((prev) => ({ ...prev, tax_details: { ...prev.tax_details, tax_percentage: Number(event.target.value) } }))} />
          </div>
        </SurfaceCard>
      ) : null}

      <div className="sticky bottom-4 z-20 rounded-[28px] border border-white/70 bg-white/88 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">{ledgerId ? "Ready to update this ledger?" : "Ready to create this ledger?"}</p>
            <p className="mt-1 text-sm text-slate-500">Template type: {templateType}. The payload will stay aligned with the backend detail contract.</p>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button onClick={() => router.back()} className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600">
              Cancel
            </button>
            <button disabled={isSubmitting || isLoading} onClick={() => void submit()} className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {isSubmitting ? "Saving..." : ledgerId ? "Update ledger" : "Create ledger"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
