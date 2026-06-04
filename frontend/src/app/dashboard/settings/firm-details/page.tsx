"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFirmScope } from "../../shared/useFirmScope";
import { useToast } from "@/context/ToastContext";

interface FormFields {
  name: string;
  mailing_name: string;
  address_lane1: string;
  city: string;
  state: string;
  pincode: string;
  mobile: string;
  email: string;
  registration_type: string;
  gstin: string;
  pan: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  branch_name: string;
  sales_prefix: string;
  purchase_prefix: string;
  payment_prefix: string;
  receipt_prefix: string;
}

const INITIAL_FIELDS: FormFields = {
  name: "",
  mailing_name: "",
  address_lane1: "",
  city: "",
  state: "",
  pincode: "",
  mobile: "",
  email: "",
  registration_type: "Regular",
  gstin: "",
  pan: "",
  bank_name: "",
  account_number: "",
  ifsc_code: "",
  branch_name: "",
  sales_prefix: "",
  purchase_prefix: "",
  payment_prefix: "",
  receipt_prefix: "",
};

export default function FirmDetailsPage() {
  const { activeFirmId, supabase } = useFirmScope();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormFields>(INITIAL_FIELDS);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch firm details from Supabase
  const { data: firmData, isLoading } = useQuery({
    queryKey: ["firm-settings", activeFirmId],
    queryFn: async () => {
      if (!activeFirmId) return null;
      const { data, error } = await supabase
        .from("firms")
        .select("*")
        .eq("id", activeFirmId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!activeFirmId,
  });

  // Hydrate form state when data is loaded
  useEffect(() => {
    if (firmData) {
      setForm({
        name: firmData.name || "",
        mailing_name: firmData.mailing_name || "",
        address_lane1: firmData.address_lane1 || "",
        city: firmData.city || "",
        state: firmData.state || "",
        pincode: firmData.pincode || "",
        mobile: firmData.mobile || "",
        email: firmData.email || "",
        registration_type: firmData.registration_type || "Regular",
        gstin: firmData.gstin || "",
        pan: firmData.pan || "",
        bank_name: firmData.bank_name || "",
        account_number: firmData.account_number || "",
        ifsc_code: firmData.ifsc_code || "",
        branch_name: firmData.branch_name || "",
        sales_prefix: firmData.sales_prefix || "",
        purchase_prefix: firmData.purchase_prefix || "",
        payment_prefix: firmData.payment_prefix || "",
        receipt_prefix: firmData.receipt_prefix || "",
      });
    }
  }, [firmData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFirmId) return;

    if (!form.name.trim()) {
      showToast("Firm name is required", "error");
      return;
    }

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from("firms")
        .update({
          name: form.name.trim(),
          mailing_name: form.mailing_name.trim(),
          address_lane1: form.address_lane1.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
          mobile: form.mobile.trim(),
          email: form.email.trim() || null,
          registration_type: form.registration_type,
          gstin: form.gstin.trim(),
          pan: form.pan.trim() || null,
          bank_name: form.bank_name.trim() || null,
          account_number: form.account_number.trim() || null,
          ifsc_code: form.ifsc_code.trim() || null,
          branch_name: form.branch_name.trim() || null,
          sales_prefix: form.sales_prefix.trim() || null,
          purchase_prefix: form.purchase_prefix.trim() || null,
          payment_prefix: form.payment_prefix.trim() || null,
          receipt_prefix: form.receipt_prefix.trim() || null,
        })
        .eq("id", activeFirmId);

      if (error) throw error;

      showToast("Firm details updated successfully!", "success");
      // Invalidate the cache to trigger refetching elsewhere
      void queryClient.invalidateQueries({ queryKey: ["firm-details", activeFirmId] });
      void queryClient.invalidateQueries({ queryKey: ["firm-settings", activeFirmId] });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update firm details", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-tally-500 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading firm details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Firm Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your firm profile, GST registration, bank account details, and voucher/invoice number prefixes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 pb-16">
        {/* Card 1: General Profile */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-5 uppercase tracking-wide text-xs text-slate-500">
            1. General Profile
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Firm Legal Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Acme Corporation Pvt Ltd"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[15px] font-medium text-slate-900 outline-none transition focus:border-tally-500 focus:ring-2 focus:ring-tally-500/10"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Mailing Name
              </label>
              <input
                type="text"
                name="mailing_name"
                value={form.mailing_name}
                onChange={handleChange}
                placeholder="Name to print on invoices..."
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[15px] font-medium text-slate-900 outline-none transition focus:border-tally-500 focus:ring-2 focus:ring-tally-500/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                name="mobile"
                value={form.mobile}
                onChange={handleChange}
                placeholder="e.g. +91 98765 43210"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[15px] font-medium text-slate-900 outline-none transition focus:border-tally-500 focus:ring-2 focus:ring-tally-500/10"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="e.g. contact@acme.com"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[15px] font-medium text-slate-900 outline-none transition focus:border-tally-500 focus:ring-2 focus:ring-tally-500/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                GSTIN <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="gstin"
                value={form.gstin}
                onChange={handleChange}
                placeholder="15-digit GSTIN..."
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[15px] font-mono text-slate-900 outline-none transition focus:border-tally-500 focus:ring-2 focus:ring-tally-500/10"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                PAN
              </label>
              <input
                type="text"
                name="pan"
                value={form.pan}
                onChange={handleChange}
                placeholder="10-digit Permanent Account Number..."
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[15px] font-mono text-slate-900 outline-none transition focus:border-tally-500 focus:ring-2 focus:ring-tally-500/10"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Address & Registration */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-5 uppercase tracking-wide text-xs text-slate-500">
            2. Address & Registration
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Address (Lane 1) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="address_lane1"
                value={form.address_lane1}
                onChange={handleChange}
                placeholder="Building name, street address..."
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[15px] font-medium text-slate-900 outline-none transition focus:border-tally-500 focus:ring-2 focus:ring-tally-500/10"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                City <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="e.g. Mumbai"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[15px] font-medium text-slate-900 outline-none transition focus:border-tally-500 focus:ring-2 focus:ring-tally-500/10"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                State <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="state"
                value={form.state}
                onChange={handleChange}
                placeholder="e.g. Maharashtra"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[15px] font-medium text-slate-900 outline-none transition focus:border-tally-500 focus:ring-2 focus:ring-tally-500/10"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Pincode <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="pincode"
                value={form.pincode}
                onChange={handleChange}
                placeholder="e.g. 400001"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[15px] font-medium text-slate-900 outline-none transition focus:border-tally-500 focus:ring-2 focus:ring-tally-500/10"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                GST Registration Type
              </label>
              <select
                name="registration_type"
                value={form.registration_type}
                onChange={handleChange}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[15px] font-medium text-slate-900 outline-none transition focus:border-tally-500 focus:ring-2 focus:ring-tally-500/10"
              >
                <option value="Regular">Regular taxpayer</option>
                <option value="Composition">Composition scheme</option>
                <option value="Unregistered">Unregistered</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card 3: Bank Details */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-5 uppercase tracking-wide text-xs text-slate-500">
            3. Bank Details
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Bank Name
              </label>
              <input
                type="text"
                name="bank_name"
                value={form.bank_name}
                onChange={handleChange}
                placeholder="e.g. HDFC Bank"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[15px] font-medium text-slate-900 outline-none transition focus:border-tally-500 focus:ring-2 focus:ring-tally-500/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Account Number
              </label>
              <input
                type="text"
                name="account_number"
                value={form.account_number}
                onChange={handleChange}
                placeholder="Account number..."
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[15px] font-mono text-slate-900 outline-none transition focus:border-tally-500 focus:ring-2 focus:ring-tally-500/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                IFSC Code
              </label>
              <input
                type="text"
                name="ifsc_code"
                value={form.ifsc_code}
                onChange={handleChange}
                placeholder="e.g. HDFC0000001"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[15px] font-mono text-slate-900 outline-none transition focus:border-tally-500 focus:ring-2 focus:ring-tally-500/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Branch Name
              </label>
              <input
                type="text"
                name="branch_name"
                value={form.branch_name}
                onChange={handleChange}
                placeholder="Branch address/name..."
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[15px] font-medium text-slate-900 outline-none transition focus:border-tally-500 focus:ring-2 focus:ring-tally-500/10"
              />
            </div>
          </div>
        </div>

        {/* Card 4: Voucher Number Prefixes */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-5 uppercase tracking-wide text-xs text-slate-500">
            4. Voucher Number Prefixes
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            Configure default prefix sequences. New vouchers will automatically increment from the last saved voucher with this prefix, while still allowing you to override manually.
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Sales Invoice Prefix
              </label>
              <input
                type="text"
                name="sales_prefix"
                value={form.sales_prefix}
                onChange={handleChange}
                placeholder="e.g. INV/26-27/"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[15px] font-mono text-slate-900 outline-none transition focus:border-tally-500 focus:ring-2 focus:ring-tally-500/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Purchase Invoice Prefix
              </label>
              <input
                type="text"
                name="purchase_prefix"
                value={form.purchase_prefix}
                onChange={handleChange}
                placeholder="e.g. PUR-"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[15px] font-mono text-slate-900 outline-none transition focus:border-tally-500 focus:ring-2 focus:ring-tally-500/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Payment Voucher Prefix
              </label>
              <input
                type="text"
                name="payment_prefix"
                value={form.payment_prefix}
                onChange={handleChange}
                placeholder="e.g. PMT/"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[15px] font-mono text-slate-900 outline-none transition focus:border-tally-500 focus:ring-2 focus:ring-tally-500/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Receipt Voucher Prefix
              </label>
              <input
                type="text"
                name="receipt_prefix"
                value={form.receipt_prefix}
                onChange={handleChange}
                placeholder="e.g. RCPT/"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[15px] font-mono text-slate-900 outline-none transition focus:border-tally-500 focus:ring-2 focus:ring-tally-500/10"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-tally-600 px-8 text-base font-semibold text-white transition hover:bg-tally-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg shadow-tally-600/10"
          >
            {isSaving ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving Changes...
              </>
            ) : (
              "Save Settings"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
