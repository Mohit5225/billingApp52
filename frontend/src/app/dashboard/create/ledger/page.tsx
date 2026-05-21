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

const GROUP_TEMPLATE_MAP: Record<string, LedgerFieldTemplate> = {
  "Bank Accounts": "bank",
  "Bank OD A/c": "bank",
  "Sundry Debtors": "party",
  "Sundry Creditors": "party",
  "Duties & Taxes": "tax",
};

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

function getGroupTemplate(group: AccountGroup | null): LedgerFieldTemplate {
  if (!group) return "default";

  const directTemplate = GROUP_TEMPLATE_MAP[group.name];
  if (directTemplate) {
    return directTemplate;
  }

  const parentTemplate = group.parent_name ? GROUP_TEMPLATE_MAP[group.parent_name] : undefined;
  if (parentTemplate) {
    return parentTemplate;
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
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);

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
    <div className="mx-auto max-w-4xl px-4 md:px-0 space-y-8 pb-32 md:pb-12 pt-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Create Ledger</h1>
        <p className="mt-2 text-sm text-slate-500">Configure a new account ledger with advanced categorization.</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 shadow-sm animate-in fade-in slide-in-from-top-2">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/80 bg-white p-8 sm:p-10 shadow-2xl shadow-slate-200/40">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 via-transparent to-slate-50/40 pointer-events-none" />
        
        <div className="relative z-10 grid gap-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Ledger Name *</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={() => markTouched("name")}
                placeholder="e.g. Mahalakshmi Enterprises"
                className={`peer w-full rounded-2xl border bg-slate-50/50 px-5 py-4 text-sm font-medium text-slate-900 outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 focus:bg-white focus:shadow-md ${
                  touched.name && fieldErrors.name
                    ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                    : "border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 hover:border-slate-300"
                }`}
              />
              {touched.name && fieldErrors.name && <p className="text-xs font-medium text-red-600">{fieldErrors.name}</p>}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Alias</label>
              <input
                name="alias"
                value={formData.alias}
                onChange={handleChange}
                onBlur={() => markTouched("alias")}
                placeholder="Optional short name"
                className="peer w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm font-medium text-slate-900 outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:shadow-md hover:border-slate-300"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Account Group *</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsGroupDropdownOpen((prev) => !prev)}
                  disabled={isLoadingGroups}
                  onBlur={() => markTouched("group_id")}
                  className={`flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-sm font-medium outline-none transition-all duration-300 focus:shadow-md ${
                    touched.group_id && fieldErrors.group_id
                      ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-white"
                      : "border-slate-200 bg-slate-50/50 hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  } ${isLoadingGroups ? "opacity-50 cursor-not-allowed" : "text-slate-900"}`}
                >
                  <span className="truncate">
                    {isLoadingGroups 
                      ? "Loading account groups..." 
                      : selectedGroup
                        ? formatGroupLabel(selectedGroup)
                        : <span className="text-slate-400 font-normal">Select an account group</span>
                    }
                  </span>
                  <svg className={`ml-3 h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${isGroupDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                
                {isGroupDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsGroupDropdownOpen(false)} />
                    <div className="absolute z-30 mt-2 w-full animate-in fade-in slide-in-from-top-2 overflow-hidden rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-xl backdrop-blur-xl max-h-72 overflow-y-auto">
                      {groups.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500">No groups found</div>
                      ) : (
                        groups.map((group) => (
                          <button
                            key={group.id}
                            type="button"
                            className={`w-full rounded-xl px-4 py-3 text-left text-sm transition-all whitespace-normal ${
                              formData.group_id === group.id 
                                ? "bg-emerald-50 text-emerald-700 font-semibold" 
                                : "text-slate-700 hover:bg-slate-100/80 font-medium"
                            }`}
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, group_id: group.id }));
                              setIsGroupDropdownOpen(false);
                              if (touched.group_id) {
                                setFieldErrors((prev) => ({ ...prev, group_id: "" }));
                              }
                            }}
                          >
                            {formatGroupLabel(group)}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
              {touched.group_id && fieldErrors.group_id && <p className="text-xs font-medium text-red-600">{fieldErrors.group_id}</p>}
            </div>

            {selectedTemplate !== "default" && (
              <div className="sm:col-span-2 rounded-2xl border border-amber-200/60 bg-amber-50/50 px-5 py-4 text-sm text-amber-900 shadow-sm">
                <p className="font-semibold">{TEMPLATE_COPY[selectedTemplate].title}</p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-amber-800/80">{TEMPLATE_COPY[selectedTemplate].description}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Opening Balance</label>
              <input
                name="opening_balance"
                type="number"
                step="0.01"
                value={formData.opening_balance}
                onChange={handleChange}
                onBlur={() => markTouched("opening_balance")}
                placeholder="0.00"
                className={`peer w-full rounded-2xl border bg-slate-50/50 px-5 py-4 text-sm font-medium text-slate-900 outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 focus:bg-white focus:shadow-md ${
                  touched.opening_balance && fieldErrors.opening_balance
                    ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                    : "border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 hover:border-slate-300"
                }`}
              />
              {touched.opening_balance && fieldErrors.opening_balance && <p className="text-xs font-medium text-red-600">{fieldErrors.opening_balance}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Balance Type</label>
              <div className="flex rounded-2xl border border-slate-200 bg-slate-50/50 p-1.5 shadow-inner shadow-slate-100">
                {(["Dr", "Cr"] as DrCrType[]).map((option) => (
                  <label
                    key={option}
                    className={`relative flex flex-1 cursor-pointer items-center justify-center rounded-xl py-2.5 text-sm font-semibold transition-all duration-300 ${
                      formData.opening_balance_type === option
                        ? "bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200/50"
                        : "text-slate-500 hover:bg-slate-100/50 hover:text-slate-700"
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

          <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-6 sm:p-8 shadow-sm">
            <h3 className="mb-6 text-sm font-bold tracking-wide text-slate-800">Advanced Settings</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="group flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-md hover:shadow-emerald-500/5">
                <div>
                  <span className="block text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">Inventory values affected</span>
                  <span className="mt-1.5 block text-[0.7rem] font-medium leading-relaxed text-slate-500">Use for ledgers that affect stock valuation.</span>
                </div>
                <div className="relative inline-flex h-7 w-12 shrink-0 items-center">
                  <input
                    type="checkbox"
                    name="inventory_values_affected"
                    checked={formData.inventory_values_affected}
                    onChange={handleChange}
                    className="peer sr-only"
                  />
                  <div className="h-full w-full rounded-full bg-slate-200 transition-all duration-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-500/20 peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-teal-500 peer-checked:after:translate-x-5 after:absolute after:left-[3px] after:top-[3px] after:h-[22px] after:w-[22px] after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-['']"></div>
                </div>
              </label>

              <label className="group flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-md hover:shadow-emerald-500/5">
                <div>
                  <span className="block text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">Cost centre applicable</span>
                  <span className="mt-1.5 block text-[0.7rem] font-medium leading-relaxed text-slate-500">Enable if this ledger should accept cost centre tracking.</span>
                </div>
                <div className="relative inline-flex h-7 w-12 shrink-0 items-center">
                  <input
                    type="checkbox"
                    name="cost_centre_applicable"
                    checked={formData.cost_centre_applicable}
                    onChange={handleChange}
                    className="peer sr-only"
                  />
                  <div className="h-full w-full rounded-full bg-slate-200 transition-all duration-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-500/20 peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-teal-500 peer-checked:after:translate-x-5 after:absolute after:left-[3px] after:top-[3px] after:h-[22px] after:w-[22px] after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-['']"></div>
                </div>
              </label>
            </div>
          </div>

          {selectedTemplate === "bank" && (
            <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-6 sm:p-8 shadow-sm">
              <h3 className="mb-6 text-sm font-bold tracking-wide text-slate-800">Bank Details</h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Account Number</label>
                  <input
                    name="bank_account_number"
                    value={formData.bank_account_number}
                    onChange={handleChange}
                    placeholder="Account number"
                    className="peer w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-900 outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:shadow-md hover:border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">IFSC Code</label>
                  <input
                    name="bank_ifsc_code"
                    value={formData.bank_ifsc_code}
                    onChange={handleChange}
                    placeholder="IFSC code"
                    className="peer w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-900 outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:shadow-md hover:border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Bank Name</label>
                  <input
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleChange}
                    placeholder="Bank name"
                    className="peer w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-900 outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:shadow-md hover:border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Branch Name</label>
                  <input
                    name="bank_branch_name"
                    value={formData.bank_branch_name}
                    onChange={handleChange}
                    placeholder="Branch name"
                    className="peer w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-900 outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:shadow-md hover:border-slate-300"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">SWIFT Code</label>
                  <input
                    name="bank_swift_code"
                    value={formData.bank_swift_code}
                    onChange={handleChange}
                    placeholder="Optional SWIFT / BIC"
                    className="peer w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-900 outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:shadow-md hover:border-slate-300"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedTemplate === "party" && (
            <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-6 sm:p-8 shadow-sm">
              <h3 className="mb-6 text-sm font-bold tracking-wide text-slate-800">Party Details</h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="group flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-md hover:shadow-emerald-500/5 sm:col-span-2">
                  <div>
                    <span className="block text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">Maintain bill-by-bill</span>
                    <span className="mt-1.5 block text-[0.7rem] font-medium leading-relaxed text-slate-500">Useful for receivables and payables tracking.</span>
                  </div>
                  <div className="relative inline-flex h-7 w-12 shrink-0 items-center">
                    <input
                      type="checkbox"
                      name="party_maintain_bill_by_bill"
                      checked={formData.party_maintain_bill_by_bill}
                      onChange={handleChange}
                      className="peer sr-only"
                    />
                    <div className="h-full w-full rounded-full bg-slate-200 transition-all duration-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-500/20 peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-teal-500 peer-checked:after:translate-x-5 after:absolute after:left-[3px] after:top-[3px] after:h-[22px] after:w-[22px] after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-['']"></div>
                  </div>
                </label>
                <div className="space-y-2">
                  <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Default Credit Days</label>
                  <input
                    name="party_default_credit_days"
                    type="number"
                    min="0"
                    value={formData.party_default_credit_days}
                    onChange={handleChange}
                    placeholder="0"
                    className="peer w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-900 outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:shadow-md hover:border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">PAN Number</label>
                  <input
                    name="party_pan_number"
                    value={formData.party_pan_number}
                    onChange={handleChange}
                    placeholder="PAN number"
                    className="peer w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-900 outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:shadow-md hover:border-slate-300"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Mailing Name</label>
                  <input
                    name="party_mailing_name"
                    value={formData.party_mailing_name}
                    onChange={handleChange}
                    placeholder="Mailing name"
                    className="peer w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-900 outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:shadow-md hover:border-slate-300"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Address</label>
                  <textarea
                    name="party_address"
                    value={formData.party_address}
                    onChange={handleChange}
                    placeholder="Billing address"
                    rows={3}
                    className="peer w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-900 outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:shadow-md hover:border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">State</label>
                  <input
                    name="party_state"
                    value={formData.party_state}
                    onChange={handleChange}
                    placeholder="State"
                    className="peer w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-900 outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:shadow-md hover:border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Country</label>
                  <input
                    name="party_country"
                    value={formData.party_country}
                    onChange={handleChange}
                    placeholder="Country"
                    className="peer w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-900 outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:shadow-md hover:border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Pincode</label>
                  <input
                    name="party_pincode"
                    value={formData.party_pincode}
                    onChange={handleChange}
                    placeholder="Pincode"
                    className="peer w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-900 outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:shadow-md hover:border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">GSTIN</label>
                  <input
                    name="party_gstin"
                    value={formData.party_gstin}
                    onChange={handleChange}
                    placeholder="GSTIN"
                    className="peer w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-900 outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:shadow-md hover:border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">GST Registration Type</label>
                  <div className="relative">
                    <select
                      name="party_gst_registration_type"
                      value={formData.party_gst_registration_type}
                      onChange={handleChange}
                      className="peer w-full appearance-none rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-900 outline-none transition-all duration-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:shadow-md hover:border-slate-300"
                    >
                      <option value="">Select type</option>
                      <option value="Regular">Regular</option>
                      <option value="Composition">Composition</option>
                      <option value="Unregistered">Unregistered</option>
                      <option value="Consumer">Consumer</option>
                    </select>
                    <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2">
                      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTemplate === "tax" && (
            <div className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-6 sm:p-8 shadow-sm">
              <h3 className="mb-6 text-sm font-bold tracking-wide text-slate-800">Tax Details</h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Duty / Tax Type</label>
                  <div className="relative">
                    <select
                      name="tax_duty_tax_type"
                      value={formData.tax_duty_tax_type}
                      onChange={handleChange}
                      className="peer w-full appearance-none rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-900 outline-none transition-all duration-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:shadow-md hover:border-slate-300"
                    >
                      <option value="">Select type</option>
                      <option value="GST">GST</option>
                      <option value="TDS">TDS</option>
                      <option value="TCS">TCS</option>
                      <option value="VAT">VAT</option>
                      <option value="Others">Others</option>
                    </select>
                    <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2">
                      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Tax Percentage</label>
                  <input
                    name="tax_tax_percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.tax_tax_percentage}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="peer w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-900 outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:shadow-md hover:border-slate-300"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-600 transition-all duration-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingGroups}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/40 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60"
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity hover:opacity-100"></div>
              {isSubmitting ? "Saving ledger..." : "Create Ledger"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
