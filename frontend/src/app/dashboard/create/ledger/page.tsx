"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
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
  party_check_credit_days: boolean;
  party_set_gst_details: boolean;
  tax_duty_tax_type: string;
  tax_tax_percentage: string;
  transaction_type: string;
  upi_id: string;
  cross_using: string;
};

type LedgerFieldTemplate = "default" | "bank" | "party" | "tax";

const GROUP_TEMPLATE_MAP: Record<string, LedgerFieldTemplate> = {
  "Bank Accounts": "bank",
  "Bank OD A/c": "bank",
  "Sundry Debtors": "party",
  "Sundry Creditors": "party",
  "Duties & Taxes": "tax",
  "Loans & Advances (Asset)": "party",
  "Loans (Liability)": "party",
  "Secured Loans": "party",
  "Unsecured Loans": "party",
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
  party_check_credit_days: false,
  party_set_gst_details: false,
  tax_duty_tax_type: "",
  tax_tax_percentage: "",
  transaction_type: "",
  upi_id: "",
  cross_using: "A/c Payee",
};



const LABEL_CLASS = "block text-[0.68rem] md:text-xs font-bold uppercase tracking-[0.18em] text-slate-500";
const BASE_INPUT_CLASS =
  "w-full rounded-2xl border bg-white px-4 py-3.5 text-sm md:text-[15px] font-medium text-slate-900 outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 focus:bg-white focus:shadow-md";
const DEFAULT_INPUT_CLASS =
  "border-slate-200 bg-slate-50/70 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";
const ERROR_INPUT_CLASS =
  "border-red-400 bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10";
const SECTION_CARD_CLASS =
  "rounded-[28px] border border-slate-200/80 bg-white/94 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-6 lg:p-7";
const SELECT_CLASS =
  "w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm md:text-[15px] font-medium text-slate-900 outline-none transition-all duration-300 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:shadow-md";

function toTitleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function GroupLabel({ group, isSelected = false }: { group: AccountGroup; isSelected?: boolean }) {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <span className="truncate min-w-0">{group.name}</span>
      <span
        className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${
          isSelected
            ? "border-emerald-200 bg-emerald-100/50 text-emerald-700"
            : "border-slate-200 bg-slate-50 text-slate-500"
        }`}
      >
        {group.nature}
      </span>
    </div>
  );
}

function getGroupTemplate(group: AccountGroup | null): LedgerFieldTemplate {
  if (!group) return "default";

  const directTemplate = GROUP_TEMPLATE_MAP[group.name];
  if (directTemplate) return directTemplate;

  const parentTemplate = group.parent_name ? GROUP_TEMPLATE_MAP[group.parent_name] : undefined;
  if (parentTemplate) return parentTemplate;

  return "default";
}

function validateField(name: string, value: string | boolean): string {
  if (name === "name" && !String(value).trim()) return "Ledger name is required.";
  if (name === "group_id" && !value) return "Account group is required.";
  if (name === "opening_balance" && value !== "" && isNaN(Number(value))) return "Must be a valid number.";
  if (name === "party_pan_number" && value) {
    const pan = String(value).toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) return "Invalid PAN format (e.g. ABCDE1234F).";
  }
  if (name === "party_gstin" && value) {
    if (String(value).length !== 15) return "GSTIN must be 15 characters.";
  }
  if (name === "bank_ifsc_code" && value) {
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(value).toUpperCase())) {
      return "Invalid IFSC format (e.g. SBIN0001234).";
    }
  }
  return "";
}

function fieldClass(hasError = false) {
  return `${BASE_INPUT_CLASS} ${hasError ? ERROR_INPUT_CLASS : DEFAULT_INPUT_CLASS}`;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className={LABEL_CLASS}>{children}</label>;
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-xs font-medium text-red-600">{error}</p>;
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className={SECTION_CARD_CLASS}>
      <div className="mb-6">
        <h3 className="text-lg md:text-[19px] font-semibold tracking-tight text-slate-900">{title}</h3>
        {description && <p className="mt-2 text-sm md:text-[15px] leading-6 text-slate-500">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function ToggleTile({
  name,
  checked,
  title,
  description,
  onChange,
}: {
  name: keyof LedgerFormState;
  checked: boolean;
  title: string;
  description: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="group flex cursor-pointer flex-col items-start justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-md hover:shadow-emerald-500/5 sm:flex-row sm:items-center">
      <div>
        <span className="block text-sm md:text-[15px] font-semibold text-slate-900 transition-colors group-hover:text-emerald-700">
          {title}
        </span>
        <span className="mt-1.5 block text-[0.78rem] md:text-[0.82rem] leading-relaxed text-slate-500">{description}</span>
      </div>
      <div className="relative inline-flex h-7 w-12 shrink-0 items-center">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
        />
        <div className="h-full w-full rounded-full bg-slate-200 transition-all duration-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-500/20 peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-teal-500 peer-checked:after:translate-x-5 after:absolute after:left-[3px] after:top-[3px] after:h-[22px] after:w-[22px] after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-['']" />
      </div>
    </label>
  );
}

function InlineToggle({
  name,
  checked,
  title,
  onChange,
}: {
  name: keyof LedgerFormState;
  checked: boolean;
  title: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-[16px] border border-slate-200 bg-white px-4 py-3.5 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-md hover:shadow-emerald-500/5">
      <span className="text-sm md:text-[15px] font-semibold text-slate-700 transition-colors group-hover:text-emerald-700">{title}</span>
      <div className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input type="checkbox" name={name} checked={checked} onChange={onChange} className="peer sr-only" />
        <div className="h-full w-full rounded-full bg-slate-200 transition-all duration-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-500/20 peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-teal-500 peer-checked:after:translate-x-5 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-['']" />
      </div>
    </label>
  );
}

function SelectChevron() {
  return (
    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}

export default function LedgerCreatePage() {
  const { profile, isCAAdmin, isCAEmployee, supabase } = useProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  const isCA = isCAAdmin || isCAEmployee;
  const urlFirmId = searchParams.get("firm_id");
  const activeFirmId = isCA && urlFirmId ? urlFirmId : profile?.firm_id;

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
    if (!activeFirmId) return;

    let isMounted = true;

    const loadGroups = async () => {
      setIsLoadingGroups(true);
      setError(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("No active session");

        const url = new URL(`${apiBaseUrl}/api/ledgers/account-groups`);
        url.searchParams.set("firm_id", activeFirmId);

        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to load account groups");
        }

        const data = (await response.json()) as AccountGroup[];
        if (isMounted) {
          setGroups(data);
          setFormData((prev) =>
            prev.group_id || data.length === 0 ? prev : { ...prev, group_id: data[0].id },
          );
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load account groups");
        }
      } finally {
        if (isMounted) setIsLoadingGroups(false);
      }
    };

    void loadGroups();

    return () => {
      isMounted = false;
    };
  }, [activeFirmId, apiBaseUrl, supabase]);

  function markTouched(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const value = formData[field as keyof LedgerFormState];
    const err = validateField(field, value as string | boolean);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
  }

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, type } = event.target;
    const value = type === "checkbox" ? (event.target as HTMLInputElement).checked : event.target.value;

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (touched[name]) {
      const err = validateField(name, value as string | boolean);
      setFieldErrors((prev) => ({ ...prev, [name]: err }));
    }
  }

  function validateAll(): boolean {
    const requiredFields: (keyof LedgerFormState)[] = ["name", "group_id"];
    const errors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = { ...touched };

    for (const field of requiredFields) {
      newTouched[field] = true;
      const err = validateField(field, formData[field] as string | boolean);
      if (err) errors[field] = err;
    }

    setTouched(newTouched);
    setFieldErrors((prev) => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!validateAll()) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const url = new URL(`${apiBaseUrl}/api/ledgers`);
      if (activeFirmId) url.searchParams.set("firm_id", activeFirmId);

      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        alias: formData.alias.trim() || null,
        group_id: formData.group_id,
        opening_balance: formData.opening_balance ? Number(formData.opening_balance) : 0,
        opening_balance_type: formData.opening_balance_type,
        inventory_values_affected: formData.inventory_values_affected,
        cost_centre_applicable: formData.cost_centre_applicable,
      };

      if (selectedTemplate === "bank") {
        payload.bank_account_number = formData.bank_account_number || null;
        payload.bank_ifsc_code = formData.bank_ifsc_code || null;
        payload.bank_swift_code = formData.bank_swift_code || null;
        payload.bank_name = formData.bank_name || null;
        payload.bank_branch_name = formData.bank_branch_name || null;
      }

      if (selectedTemplate === "party") {
        payload.party_maintain_bill_by_bill = formData.party_maintain_bill_by_bill;
        payload.party_default_credit_days = formData.party_default_credit_days
          ? Number(formData.party_default_credit_days)
          : null;
        payload.party_check_credit_days = formData.party_check_credit_days;
        payload.party_mailing_name = formData.party_mailing_name || null;
        payload.party_address = formData.party_address || null;
        payload.party_state = formData.party_state || null;
        payload.party_country = formData.party_country || null;
        payload.party_pincode = formData.party_pincode || null;
        payload.party_pan_number = formData.party_pan_number || null;
        payload.party_gst_registration_type = formData.party_gst_registration_type || null;
        payload.party_gstin = formData.party_gstin || null;
        payload.party_set_gst_details = formData.party_set_gst_details;

        payload.transaction_type = formData.transaction_type || null;
        if (formData.transaction_type === "Cheque") {
          payload.cross_using = formData.cross_using || null;
        } else if (formData.transaction_type === "e-Fund Transfer") {
          payload.bank_account_number = formData.bank_account_number || null;
          payload.bank_ifsc_code = formData.bank_ifsc_code || null;
          payload.bank_name = formData.bank_name || null;
        } else if (formData.transaction_type === "UPI") {
          payload.upi_id = formData.upi_id || null;
          payload.bank_account_number = formData.bank_account_number || null;
          payload.bank_ifsc_code = formData.bank_ifsc_code || null;
          payload.bank_name = formData.bank_name || null;
        }
      }

      if (selectedTemplate === "tax") {
        payload.tax_duty_tax_type = formData.tax_duty_tax_type || null;
        payload.tax_tax_percentage = formData.tax_tax_percentage
          ? Number(formData.tax_tax_percentage)
          : null;
      }

      const response = await fetch(url.toString(), {
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
      setFormData(EMPTY_FORM);
      setTouched({});
      setFieldErrors({});

      setTimeout(() => router.back(), 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full px-4 pb-32 pt-2 sm:px-6 md:pb-12 lg:px-8">
      <div className="w-full">
        <div className="space-y-6">
          {error && (
            <div className="rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 shadow-sm animate-in fade-in slide-in-from-top-2">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <SectionCard
              title="Core Details"
              description="Start with the ledger identity, group, and opening balance."
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <FieldLabel>Ledger Name *</FieldLabel>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={() => markTouched("name")}
                    placeholder="e.g. Mahalakshmi Enterprises"
                    className={fieldClass(Boolean(touched.name && fieldErrors.name))}
                  />
                  <FieldError error={touched.name ? fieldErrors.name : ""} />
                </div>

                <div className="space-y-2">
                  <FieldLabel>Alias</FieldLabel>
                  <input
                    name="alias"
                    value={formData.alias}
                    onChange={handleChange}
                    onBlur={() => markTouched("alias")}
                    placeholder="Optional short name"
                    className={fieldClass()}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>Opening Balance</FieldLabel>
                  <input
                    name="opening_balance"
                    type="number"
                    step="0.01"
                    value={formData.opening_balance}
                    onChange={handleChange}
                    onBlur={() => markTouched("opening_balance")}
                    placeholder="0.00"
                    className={fieldClass(Boolean(touched.opening_balance && fieldErrors.opening_balance))}
                  />
                  <FieldError error={touched.opening_balance ? fieldErrors.opening_balance : ""} />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <FieldLabel>Account Group *</FieldLabel>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsGroupDropdownOpen((prev) => !prev)}
                      disabled={isLoadingGroups}
                      onBlur={() => markTouched("group_id")}
                      className={`flex w-full items-start justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm md:text-[15px] font-medium outline-none transition-all duration-300 focus:shadow-md ${touched.group_id && fieldErrors.group_id
                          ? ERROR_INPUT_CLASS
                          : DEFAULT_INPUT_CLASS
                        } ${isLoadingGroups ? "cursor-not-allowed opacity-50" : "text-slate-900"}`}
                    >
                      <span className="min-w-0 flex-1 break-words pr-2">
                        {isLoadingGroups ? (
                          "Loading account groups..."
                        ) : selectedGroup ? (
                          <GroupLabel group={selectedGroup} isSelected={true} />
                        ) : (
                          <span className="font-normal text-slate-400">Select an account group</span>
                        )}
                      </span>
                      <svg
                        className={`mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${isGroupDropdownOpen ? "rotate-180" : ""
                          }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isGroupDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setIsGroupDropdownOpen(false)} />
                        <div className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-[24px] border border-slate-200 bg-white/96 p-2 shadow-[0_24px_48px_rgba(15,23,42,0.14)] backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
                          {groups.length === 0 ? (
                            <div className="p-4 text-center text-sm md:text-[15px] text-slate-500">No groups found</div>
                          ) : (
                            groups.map((group) => (
                              <button
                                key={group.id}
                                type="button"
                                className={`w-full rounded-2xl px-4 py-3 text-left text-sm md:text-[15px] leading-6 transition-all ${formData.group_id === group.id
                                    ? "bg-emerald-50 font-semibold text-emerald-700"
                                    : "font-medium text-slate-700 hover:bg-slate-100/90"
                                  }`}
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, group_id: group.id }));
                                  setIsGroupDropdownOpen(false);
                                  if (touched.group_id) {
                                    setFieldErrors((prev) => ({ ...prev, group_id: "" }));
                                  }
                                }}
                              >
                                <GroupLabel group={group} isSelected={formData.group_id === group.id} />
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <FieldError error={touched.group_id ? fieldErrors.group_id : ""} />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <FieldLabel>Balance Type</FieldLabel>
                  <div className="grid grid-cols-2 rounded-2xl border border-slate-200 bg-slate-100/80 p-1.5">
                    {(["Dr", "Cr"] as DrCrType[]).map((option) => (
                      <label
                        key={option}
                        className={`relative flex cursor-pointer items-center justify-center rounded-xl py-3 text-sm md:text-[15px] font-semibold transition-all ${formData.opening_balance_type === option
                            ? "bg-slate-950 text-white shadow-[0_10px_20px_rgba(15,23,42,0.18)]"
                            : "text-slate-500 hover:text-slate-800"
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
            </SectionCard>

            <SectionCard
              title="Advanced Settings"
              description="Optional controls for stock valuation and cost centre tracking."
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <ToggleTile
                  name="inventory_values_affected"
                  checked={formData.inventory_values_affected}
                  title="Inventory values affected"
                  description="Use for ledgers that affect stock valuation."
                  onChange={handleChange}
                />
                <ToggleTile
                  name="cost_centre_applicable"
                  checked={formData.cost_centre_applicable}
                  title="Cost centre applicable"
                  description="Enable if this ledger should accept cost centre tracking."
                  onChange={handleChange}
                />
              </div>
            </SectionCard>

            {selectedTemplate === "bank" && (
              <SectionCard
                title="Bank Details"
                description="These fields are shown for bank-oriented ledgers."
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel>Account Number</FieldLabel>
                    <input
                      name="bank_account_number"
                      value={formData.bank_account_number}
                      onChange={handleChange}
                      placeholder="Account number"
                      className={fieldClass()}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>IFSC Code</FieldLabel>
                    <input
                      name="bank_ifsc_code"
                      value={formData.bank_ifsc_code}
                      onChange={handleChange}
                      onBlur={() => markTouched("bank_ifsc_code")}
                      placeholder="IFSC code"
                      className={fieldClass(Boolean(touched.bank_ifsc_code && fieldErrors.bank_ifsc_code))}
                    />
                    <FieldError error={touched.bank_ifsc_code ? fieldErrors.bank_ifsc_code : ""} />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Bank Name</FieldLabel>
                    <input
                      name="bank_name"
                      value={formData.bank_name}
                      onChange={handleChange}
                      placeholder="Bank name"
                      className={fieldClass()}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Branch Name</FieldLabel>
                    <input
                      name="bank_branch_name"
                      value={formData.bank_branch_name}
                      onChange={handleChange}
                      placeholder="Branch name"
                      className={fieldClass()}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <FieldLabel>SWIFT Code</FieldLabel>
                    <input
                      name="bank_swift_code"
                      value={formData.bank_swift_code}
                      onChange={handleChange}
                      placeholder="Optional SWIFT / BIC"
                      className={fieldClass()}
                    />
                  </div>
                </div>
              </SectionCard>
            )}

            {selectedTemplate === "party" && (
              <>
                <SectionCard
                  title="Party Details"
                  description="Capture billing, registration, and credit defaults for debtor or creditor ledgers."
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <ToggleTile
                        name="party_maintain_bill_by_bill"
                        checked={formData.party_maintain_bill_by_bill}
                        title="Maintain bill-by-bill"
                        description="Useful for receivables and payables tracking."
                        onChange={handleChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>Default Credit Days</FieldLabel>
                      <div className="flex flex-col gap-3">
                        <input
                          name="party_default_credit_days"
                          type="number"
                          min="0"
                          value={formData.party_default_credit_days}
                          onChange={handleChange}
                          placeholder="0"
                          className={fieldClass()}
                        />
                        <InlineToggle
                          name="party_check_credit_days"
                          checked={formData.party_check_credit_days}
                          title="Check for credit days during voucher entry"
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>PAN Number</FieldLabel>
                      <input
                        name="party_pan_number"
                        value={formData.party_pan_number}
                        onChange={handleChange}
                        onBlur={() => markTouched("party_pan_number")}
                        placeholder="PAN number"
                        className={fieldClass(Boolean(touched.party_pan_number && fieldErrors.party_pan_number))}
                      />
                      <FieldError error={touched.party_pan_number ? fieldErrors.party_pan_number : ""} />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <FieldLabel>Mailing Name</FieldLabel>
                      <input
                        name="party_mailing_name"
                        value={formData.party_mailing_name}
                        onChange={handleChange}
                        placeholder="Mailing name"
                        className={fieldClass()}
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <FieldLabel>Address</FieldLabel>
                      <textarea
                        name="party_address"
                        value={formData.party_address}
                        onChange={handleChange}
                        placeholder="Billing address"
                        rows={3}
                        className={`${fieldClass()} resize-y`}
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>State</FieldLabel>
                      <input
                        name="party_state"
                        value={formData.party_state}
                        onChange={handleChange}
                        placeholder="State"
                        className={fieldClass()}
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>Country</FieldLabel>
                      <input
                        name="party_country"
                        value={formData.party_country}
                        onChange={handleChange}
                        placeholder="Country"
                        className={fieldClass()}
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>Pincode</FieldLabel>
                      <input
                        name="party_pincode"
                        value={formData.party_pincode}
                        onChange={handleChange}
                        placeholder="Pincode"
                        className={fieldClass()}
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>GSTIN</FieldLabel>
                      <input
                        name="party_gstin"
                        value={formData.party_gstin}
                        onChange={handleChange}
                        onBlur={() => markTouched("party_gstin")}
                        placeholder="GSTIN"
                        className={fieldClass(Boolean(touched.party_gstin && fieldErrors.party_gstin))}
                      />
                      <FieldError error={touched.party_gstin ? fieldErrors.party_gstin : ""} />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>GST Registration Type</FieldLabel>
                      <div className="relative">
                        <select
                          name="party_gst_registration_type"
                          value={formData.party_gst_registration_type}
                          onChange={handleChange}
                          className={SELECT_CLASS}
                        >
                          <option value="">Select type</option>
                          <option value="Regular">Regular</option>
                          <option value="Composition">Composition</option>
                          <option value="Unregistered">Unregistered</option>
                          <option value="Consumer">Consumer</option>
                        </select>
                        <SelectChevron />
                      </div>
                    </div>

                    <div className="sm:col-span-2 pt-2">
                      <InlineToggle
                        name="party_set_gst_details"
                        checked={formData.party_set_gst_details}
                        title="Set/Alter additional GST details"
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Bank Details"
                  description="Specify the transaction type and related bank information."
                >
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <FieldLabel>Transaction Type</FieldLabel>
                      <div className="relative">
                        <select
                          name="transaction_type"
                          value={formData.transaction_type}
                          onChange={handleChange}
                          className={SELECT_CLASS}
                        >
                          <option value="">Select type...</option>
                          <option value="Cheque">Cheque</option>
                          <option value="e-Fund Transfer">e-Fund Transfer</option>
                          <option value="UPI">UPI</option>
                          <option value="Others">Others</option>
                        </select>
                        <SelectChevron />
                      </div>
                    </div>

                    <div
                      className={`grid transition-[grid-template-rows,opacity,margin] duration-500 ease-in-out ${formData.transaction_type && formData.transaction_type !== "Others"
                          ? "grid-rows-[1fr] opacity-100 mt-5"
                          : "grid-rows-[0fr] opacity-0 mt-0"
                        }`}
                    >
                      <div className="overflow-hidden">
                        <div className="grid gap-5 sm:grid-cols-2 pb-1">
                          {formData.transaction_type === "Cheque" && (
                            <div className="space-y-2 sm:col-span-2 animate-in fade-in slide-in-from-top-2">
                              <FieldLabel>Cross Using</FieldLabel>
                              <input
                                name="cross_using"
                                value={formData.cross_using}
                                onChange={handleChange}
                                placeholder="e.g. A/c Payee"
                                className={fieldClass()}
                              />
                            </div>
                          )}

                          {formData.transaction_type === "e-Fund Transfer" && (
                            <>
                              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <FieldLabel>Account Number</FieldLabel>
                                <input
                                  name="bank_account_number"
                                  value={formData.bank_account_number}
                                  onChange={handleChange}
                                  placeholder="Account number"
                                  className={fieldClass()}
                                />
                              </div>
                              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <FieldLabel>IFSC Code</FieldLabel>
                                <input
                                  name="bank_ifsc_code"
                                  value={formData.bank_ifsc_code}
                                  onChange={handleChange}
                                  placeholder="IFSC code"
                                  className={fieldClass()}
                                />
                              </div>
                              <div className="space-y-2 sm:col-span-2 animate-in fade-in slide-in-from-top-2">
                                <FieldLabel>Bank Name</FieldLabel>
                                <input
                                  name="bank_name"
                                  value={formData.bank_name}
                                  onChange={handleChange}
                                  placeholder="Bank name"
                                  className={fieldClass()}
                                />
                              </div>
                            </>
                          )}

                          {formData.transaction_type === "UPI" && (
                            <>
                              <div className="space-y-2 sm:col-span-2 animate-in fade-in slide-in-from-top-2">
                                <FieldLabel>UPI ID</FieldLabel>
                                <input
                                  name="upi_id"
                                  value={formData.upi_id}
                                  onChange={handleChange}
                                  placeholder="e.g. user@bank"
                                  className={fieldClass()}
                                />
                              </div>
                              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <FieldLabel>Account Number</FieldLabel>
                                <input
                                  name="bank_account_number"
                                  value={formData.bank_account_number}
                                  onChange={handleChange}
                                  placeholder="Account number"
                                  className={fieldClass()}
                                />
                              </div>
                              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <FieldLabel>IFSC Code</FieldLabel>
                                <input
                                  name="bank_ifsc_code"
                                  value={formData.bank_ifsc_code}
                                  onChange={handleChange}
                                  placeholder="IFSC code"
                                  className={fieldClass()}
                                />
                              </div>
                              <div className="space-y-2 sm:col-span-2 animate-in fade-in slide-in-from-top-2">
                                <FieldLabel>Bank Name</FieldLabel>
                                <input
                                  name="bank_name"
                                  value={formData.bank_name}
                                  onChange={handleChange}
                                  placeholder="Bank name"
                                  className={fieldClass()}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </>
            )}

            {selectedTemplate === "tax" && (
              <SectionCard
                title="Tax Details"
                description="Capture the classification and percentage used by this tax ledger."
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel>Duty / Tax Type</FieldLabel>
                    <div className="relative">
                      <select
                        name="tax_duty_tax_type"
                        value={formData.tax_duty_tax_type}
                        onChange={handleChange}
                        className={SELECT_CLASS}
                      >
                        <option value="">Select type</option>
                        <option value="GST">GST</option>
                        <option value="TDS">TDS</option>
                        <option value="TCS">TCS</option>
                        <option value="VAT">VAT</option>
                        <option value="Others">Others</option>
                      </select>
                      <SelectChevron />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Tax Percentage</FieldLabel>
                    <input
                      name="tax_tax_percentage"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.tax_tax_percentage}
                      onChange={handleChange}
                      placeholder="0.00"
                      className={fieldClass()}
                    />
                  </div>
                </div>
              </SectionCard>
            )}

            <div className="rounded-[28px] border border-slate-200/80 bg-white/94 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Ready to save this ledger?</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Review the summary on the right, then create the ledger when the details look correct.
                  </p>
                </div>
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
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
                    className="rounded-2xl bg-slate-950 px-8 py-3.5 text-sm font-bold text-white shadow-[0_18px_38px_rgba(15,23,42,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-900 disabled:pointer-events-none disabled:opacity-60"
                  >
                    {isSubmitting ? "Saving ledger..." : "Create Ledger"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
