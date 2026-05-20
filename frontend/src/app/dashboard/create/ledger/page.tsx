"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProfile } from "@/context/ProfileContext";
import { getApiBaseUrl } from "@/lib/api";
import { AccountGroup, DrCrType } from "@/interfaces/ledger";

type LedgerFormState = {
  name: string;
  alias: string;
  group_id: string;
  opening_balance: string;
  opening_balance_type: DrCrType;
  inventory_values_affected: boolean;
  cost_centre_applicable: boolean;
  bank_account_number: string;
  bank_ifsc_code: string;
  bank_swift_code: string;
  bank_name: string;
  bank_branch_name: string;
  party_maintain_bill_by_bill: boolean;
  party_default_credit_days: string;
  party_mailing_name: string;
  party_address: string;
  party_state: string;
  party_country: string;
  party_pincode: string;
  party_pan_number: string;
  party_gst_registration_type: string;
  party_gstin: string;
  tax_duty_tax_type: string;
  tax_tax_percentage: string;
};

type LedgerFieldTemplate = "default" | "bank" | "party" | "tax";

const EMPTY_FORM: LedgerFormState = {
  name: "",
  alias: "",
  group_id: "",
  opening_balance: "",
  opening_balance_type: "Dr",
  inventory_values_affected: false,
  cost_centre_applicable: false,
  bank_account_number: "",
  bank_ifsc_code: "",
  bank_swift_code: "",
  bank_name: "",
  bank_branch_name: "",
  party_maintain_bill_by_bill: false,
  party_default_credit_days: "",
  party_mailing_name: "",
  party_address: "",
  party_state: "",
  party_country: "India",
  party_pincode: "",
  party_pan_number: "",
  party_gst_registration_type: "",
  party_gstin: "",
  tax_duty_tax_type: "",
  tax_tax_percentage: "",
};

const TEMPLATE_COPY: Record<Exclude<LedgerFieldTemplate, "default">, { title: string; description: string }> = {
  bank: {
    title: "Bank ledger",
    description: "Bank-style ledgers expose bank account fields in addition to the core ledger data.",
  },
  party: {
    title: "Party ledger",
    description: "Party-style ledgers expose billing, address, and registration details.",
  },
  tax: {
    title: "Tax ledger",
    description: "Tax-style ledgers expose duty/tax classification fields.",
  },
};

function toTitleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatGroupLabel(group: AccountGroup) {
  const alias = group.alias ? ` · ${group.alias}` : "";
  return `${group.name}${alias} · ${toTitleCase(group.nature)}`;
}

function normalizeGroupText(value: string) {
  return value.toLowerCase().replace(/[\s.\/()_-]+/g, " ").trim();
}

function getGroupTemplate(group: AccountGroup | null): LedgerFieldTemplate {
  if (!group) return "default";

  const searchableText = normalizeGroupText([group.name, group.alias ?? "", group.nature].join(" "));

  if (/(bank|bank account)/.test(searchableText)) {
    return "bank";
  }

  if (/(sundry debtor|sundry creditor|creditor|debtor)/.test(searchableText)) {
    return "party";
  }

  if (/(duty|tax|tcs|tds|vat)/.test(searchableText)) {
    return "tax";
  }

  return "default";
}

export default function LedgerCreatePage() {
  const { profile, isCAAdmin, isCAEmployee, supabase } = useProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  const isCA = isCAAdmin || isCAEmployee;
  const urlFirmId = searchParams.get("firm_id");
  const activeFirmId = (isCA && urlFirmId) ? urlFirmId : profile?.firm_id;

  const [formData, setFormData] = useState<LedgerFormState>(EMPTY_FORM);
  const [groups, setGroups] = useState<AccountGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === formData.group_id) || null,
    [formData.group_id, groups],
  );

  const selectedTemplate = useMemo(() => getGroupTemplate(selectedGroup), [selectedGroup]);

  useEffect(() => {
    if (!groups.length || formData.group_id) return;
    setFormData((prev) => ({ ...prev, group_id: groups[0].id }));
  }, [groups, formData.group_id]);

  useEffect(() => {
    if (!activeFirmId || !isCAAdmin) return;

    let isMounted = true;

    const loadGroups = async () => {
      setIsLoadingGroups(true);
      setError(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("No active session");
        }

        const url = new URL(`${apiBaseUrl}/api/ledgers/account-groups`);
        url.searchParams.set("firm_id", activeFirmId);

        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to load account groups");
        }

        const data = (await response.json()) as AccountGroup[];
        if (isMounted) {
          setGroups(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || "Unable to load account groups");
        }
      } finally {
        if (isMounted) {
          setIsLoadingGroups(false);
        }
      }
    };

    void loadGroups();

    return () => {
      isMounted = false;
    };
  }, [activeFirmId, apiBaseUrl, isCAAdmin, supabase]);

  if (profile && !isCAAdmin) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tally-700">Create Ledger</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Ledger creation is restricted</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Only CA admins can create ledgers in Supabase. CA employees and merchants can view the flow, but submission is blocked by the backend policy.
        </p>
      </div>
    );
  }

  if (!activeFirmId) {
    return null;
  }

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      nextErrors.name = "Ledger name is required.";
    }

    if (!formData.group_id) {
      nextErrors.group_id = "Choose an account group.";
    }

    if (formData.opening_balance.trim()) {
      const parsedValue = Number(formData.opening_balance);
      if (Number.isNaN(parsedValue)) {
        nextErrors.opening_balance = "Enter a valid opening balance.";
      }
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = event.target;

    if (type === "checkbox") {
      const input = event.target as HTMLInputElement;
      setFormData((prev) => ({ ...prev, [name]: input.checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (touched[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const markTouched = (name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(null);

    if (!validateForm()) {
      setTouched({ name: true, alias: true, group_id: true, opening_balance: true, opening_balance_type: true });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      const payload = {
        firm_id: activeFirmId,
        group_id: formData.group_id,
        name: formData.name.trim(),
        alias: formData.alias.trim() || null,
        opening_balance: formData.opening_balance.trim() ? Number(formData.opening_balance) : 0,
        opening_balance_type: formData.opening_balance_type,
        inventory_values_affected: formData.inventory_values_affected,
        cost_centre_applicable: formData.cost_centre_applicable,
        ...(selectedTemplate === "bank"
          ? {
              bank_details: {
                account_number: formData.bank_account_number.trim() || null,
                ifsc_code: formData.bank_ifsc_code.trim() || null,
                swift_code: formData.bank_swift_code.trim() || null,
                bank_name: formData.bank_name.trim() || null,
                branch_name: formData.bank_branch_name.trim() || null,
              },
            }
          : {}),
        ...(selectedTemplate === "party"
          ? {
              party_details: {
                maintain_bill_by_bill: formData.party_maintain_bill_by_bill,
                default_credit_days: formData.party_default_credit_days.trim()
                  ? Number(formData.party_default_credit_days)
                  : null,
                mailing_name: formData.party_mailing_name.trim() || null,
                address: formData.party_address.trim() || null,
                state: formData.party_state.trim() || null,
                country: formData.party_country.trim() || null,
                pincode: formData.party_pincode.trim() || null,
                pan_number: formData.party_pan_number.trim() || null,
                gst_registration_type: formData.party_gst_registration_type || null,
                gstin: formData.party_gstin.trim() || null,
              },
            }
          : {}),
        ...(selectedTemplate === "tax"
          ? {
              tax_details: {
                duty_tax_type: formData.tax_duty_tax_type || null,
                tax_percentage: formData.tax_tax_percentage.trim()
                  ? Number(formData.tax_tax_percentage)
                  : null,
              },
            }
          : {}),
      };

      const response = await fetch(`${apiBaseUrl}/api/ledgers/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to create ledger");
      }

      setSuccess("Ledger created successfully.");
      router.push(`/dashboard${activeFirmId ? `?firm_id=${activeFirmId}` : ""}`);
    } catch (err: any) {
      setError(err?.message || "Unable to create ledger");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tally-700">Create Ledger</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">New ledger entry</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Account groups are loaded from the real Supabase schema. Pick a subgroup, set the opening balance, and save the ledger for the active firm.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Active firm: <span className="font-medium text-slate-700">{activeFirmId}</span>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.8fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-slate-700">Ledger Name *</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={() => markTouched("name")}
                placeholder="e.g. Mahalakshmi Enterprises"
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors ${
                  touched.name && fieldErrors.name
                    ? "border-red-400 focus:border-red-500"
                    : "border-slate-200 focus:border-tally-500"
                }`}
              />
              {touched.name && fieldErrors.name && <p className="text-xs text-red-600">{fieldErrors.name}</p>}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-slate-700">Alias</label>
              <input
                name="alias"
                value={formData.alias}
                onChange={handleChange}
                onBlur={() => markTouched("alias")}
                placeholder="Optional short name"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-tally-500"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-slate-700">Account Group *</label>
              <select
                name="group_id"
                value={formData.group_id}
                onChange={handleChange}
                onBlur={() => markTouched("group_id")}
                disabled={isLoadingGroups}
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors ${
                  touched.group_id && fieldErrors.group_id
                    ? "border-red-400 focus:border-red-500"
                    : "border-slate-200 focus:border-tally-500"
                }`}
              >
                {isLoadingGroups ? (
                  <option>Loading account groups...</option>
                ) : (
                  <>
                    <option value="">Select a subgroup</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {formatGroupLabel(group)}
                      </option>
                    ))}
                  </>
                )}
              </select>
              {touched.group_id && fieldErrors.group_id && <p className="text-xs text-red-600">{fieldErrors.group_id}</p>}
              <p className="text-xs text-slate-500">
                Primary root groups are filtered out. Ledgers should sit under a subgroup.
              </p>
            </div>

            {selectedTemplate !== "default" && (
              <div className="sm:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium">{TEMPLATE_COPY[selectedTemplate].title}</p>
                <p className="mt-1 text-xs leading-5 text-amber-800">{TEMPLATE_COPY[selectedTemplate].description}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Opening Balance</label>
              <input
                name="opening_balance"
                type="number"
                step="0.01"
                value={formData.opening_balance}
                onChange={handleChange}
                onBlur={() => markTouched("opening_balance")}
                placeholder="0.00"
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors ${
                  touched.opening_balance && fieldErrors.opening_balance
                    ? "border-red-400 focus:border-red-500"
                    : "border-slate-200 focus:border-tally-500"
                }`}
              />
              {touched.opening_balance && fieldErrors.opening_balance && <p className="text-xs text-red-600">{fieldErrors.opening_balance}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Balance Type</label>
              <div className="grid grid-cols-2 gap-3">
                {(["Dr", "Cr"] as DrCrType[]).map((option) => (
                  <label
                    key={option}
                    className={`flex cursor-pointer items-center justify-center rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                      formData.opening_balance_type === option
                        ? "border-tally-500 bg-tally-50 text-tally-800"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="opening_balance_type"
                      value={option}
                      checked={formData.opening_balance_type === option}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-800">Advanced Flags</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="inventory_values_affected"
                  checked={formData.inventory_values_affected}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-tally-700 focus:ring-tally-500"
                />
                <span>
                  <span className="block font-medium text-slate-900">Inventory values affected</span>
                  <span className="mt-1 block text-xs text-slate-500">Use for ledgers that affect stock valuation.</span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="cost_centre_applicable"
                  checked={formData.cost_centre_applicable}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-tally-700 focus:ring-tally-500"
                />
                <span>
                  <span className="block font-medium text-slate-900">Cost centre applicable</span>
                  <span className="mt-1 block text-xs text-slate-500">Enable if this ledger should accept cost centre tracking.</span>
                </span>
              </label>
            </div>
          </div>

          {selectedTemplate === "bank" && (
            <div className="mt-6 space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">Bank Details</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Account Number</label>
                  <input
                    name="bank_account_number"
                    value={formData.bank_account_number}
                    onChange={handleChange}
                    placeholder="Account number"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-tally-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">IFSC Code</label>
                  <input
                    name="bank_ifsc_code"
                    value={formData.bank_ifsc_code}
                    onChange={handleChange}
                    placeholder="IFSC code"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-tally-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Bank Name</label>
                  <input
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleChange}
                    placeholder="Bank name"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-tally-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Branch Name</label>
                  <input
                    name="bank_branch_name"
                    value={formData.bank_branch_name}
                    onChange={handleChange}
                    placeholder="Branch name"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-tally-500"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium text-slate-700">SWIFT Code</label>
                  <input
                    name="bank_swift_code"
                    value={formData.bank_swift_code}
                    onChange={handleChange}
                    placeholder="Optional SWIFT / BIC"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-tally-500"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedTemplate === "party" && (
            <div className="mt-6 space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">Party Details</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 sm:col-span-2">
                  <input
                    type="checkbox"
                    name="party_maintain_bill_by_bill"
                    checked={formData.party_maintain_bill_by_bill}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-tally-700 focus:ring-tally-500"
                  />
                  <span>
                    <span className="block font-medium text-slate-900">Maintain bill-by-bill</span>
                    <span className="mt-1 block text-xs text-slate-500">Useful for receivables and payables tracking.</span>
                  </span>
                </label>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Default Credit Days</label>
                  <input
                    name="party_default_credit_days"
                    type="number"
                    min="0"
                    value={formData.party_default_credit_days}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-tally-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">PAN Number</label>
                  <input
                    name="party_pan_number"
                    value={formData.party_pan_number}
                    onChange={handleChange}
                    placeholder="PAN number"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-tally-500"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Mailing Name</label>
                  <input
                    name="party_mailing_name"
                    value={formData.party_mailing_name}
                    onChange={handleChange}
                    placeholder="Mailing name"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-tally-500"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Address</label>
                  <textarea
                    name="party_address"
                    value={formData.party_address}
                    onChange={handleChange}
                    placeholder="Billing address"
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-tally-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">State</label>
                  <input
                    name="party_state"
                    value={formData.party_state}
                    onChange={handleChange}
                    placeholder="State"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-tally-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Country</label>
                  <input
                    name="party_country"
                    value={formData.party_country}
                    onChange={handleChange}
                    placeholder="Country"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-tally-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Pincode</label>
                  <input
                    name="party_pincode"
                    value={formData.party_pincode}
                    onChange={handleChange}
                    placeholder="Pincode"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-tally-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">GSTIN</label>
                  <input
                    name="party_gstin"
                    value={formData.party_gstin}
                    onChange={handleChange}
                    placeholder="GSTIN"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-tally-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">GST Registration Type</label>
                  <select
                    name="party_gst_registration_type"
                    value={formData.party_gst_registration_type}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-tally-500"
                  >
                    <option value="">Select type</option>
                    <option value="Regular">Regular</option>
                    <option value="Composition">Composition</option>
                    <option value="Unregistered">Unregistered</option>
                    <option value="Consumer">Consumer</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {selectedTemplate === "tax" && (
            <div className="mt-6 space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">Tax Details</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Duty / Tax Type</label>
                  <select
                    name="tax_duty_tax_type"
                    value={formData.tax_duty_tax_type}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-tally-500"
                  >
                    <option value="">Select type</option>
                    <option value="GST">GST</option>
                    <option value="TDS">TDS</option>
                    <option value="TCS">TCS</option>
                    <option value="VAT">VAT</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Tax Percentage</label>
                  <input
                    name="tax_tax_percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.tax_tax_percentage}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-tally-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingGroups}
              className="rounded-xl bg-tally-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-tally-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving ledger..." : "Create Ledger"}
            </button>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Summary</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Firm</dt>
                <dd className="text-right font-medium text-slate-900">{activeFirmId}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Group</dt>
                <dd className="text-right font-medium text-slate-900">{selectedGroup ? selectedGroup.name : "Not selected"}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Template</dt>
                <dd className="text-right font-medium text-slate-900">
                  {selectedTemplate === "default" ? "Core ledger" : TEMPLATE_COPY[selectedTemplate].title}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Opening</dt>
                <dd className="text-right font-medium text-slate-900">
                  {formData.opening_balance || "0.00"} {formData.opening_balance_type}
                </dd>
              </div>
            </dl>
          </div>

          {selectedGroup && (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-semibold text-slate-900">Selected group</p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>{selectedGroup.name}</p>
                {selectedGroup.alias && <p>Alias: {selectedGroup.alias}</p>}
                <p>Nature: {selectedGroup.nature}</p>
                <p>Primary: {selectedGroup.is_primary ? "Yes" : "No"}</p>
                <p>Template: {selectedTemplate === "default" ? "Core ledger" : TEMPLATE_COPY[selectedTemplate].title}</p>
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-sm leading-6 text-slate-600 shadow-sm">
            This form writes to the <span className="font-medium text-slate-900">ledgers</span> table and uses account-group data loaded from Supabase.
          </div>
        </aside>
      </form>
    </div>
  );
}