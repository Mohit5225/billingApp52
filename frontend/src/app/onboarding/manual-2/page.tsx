"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/context/OnboardingContext";
import { getApiBaseUrl } from "@/lib/api";

export default function Manual2Page() {
  const router = useRouter();
  const { data, updateData, submitOnboarding, error } = useOnboarding();
  const apiBaseUrl = getApiBaseUrl();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    gstin: data.gstin || "",
    pan: data.pan || "",
    bank_name: data.bank_name || "",
    account_number: data.account_number || "",
    ifsc_code: data.ifsc_code || "",
    branch_name: data.branch_name || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateData(formData);
    
    // Slight hack: Wait a tick for context to update, then submit
    // Ideally we pass combined data to submit, but context update is async.
    // For now we can just rely on the submitOnboarding picking it up or merge it directly.
    try {
      setLoading(true);
      // Merging directly for the fetch call
      const finalData = { ...data, ...formData };
      
      // we need to call submitOnboarding. To ensure it has finalData, let's update context
      // and call the API. In the context, submitOnboarding uses `data` from state which might be stale.
      // So let's write a direct fetch here or update context to accept an override.
      // Since we need to follow the mock, I'll update Context's submitOnboarding to take optional payload.
      // But let's just do it directly here for reliability if context state hasn't flushed.
      
      const { createClient } = await import("@/supabaseConfig/client");
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`${apiBaseUrl}/api/firms/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(finalData),
      });

      if (!res.ok) throw new Error("Failed to save firm details");
      
      router.push("/onboarding/success");
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="space-y-2 pb-2 border-b border-gray-100">
        <h2 className="text-2xl font-semibold tracking-tight text-black">Financial Details</h2>
        <p className="text-gray-500 text-sm">Step 2 of 2: Tax & Banking Information</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-gray-700">GSTIN / UIN *</label>
            <input required type="text" name="gstin" value={formData.gstin} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all uppercase" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-gray-700">PAN Number</label>
            <input type="text" name="pan" value={formData.pan} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all uppercase" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Bank Name</label>
            <input type="text" name="bank_name" value={formData.bank_name} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Account Number</label>
            <input type="text" name="account_number" value={formData.account_number} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">IFSC Code</label>
            <input type="text" name="ifsc_code" value={formData.ifsc_code} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all uppercase" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Branch Name</label>
            <input type="text" name="branch_name" value={formData.branch_name} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm pt-2">{error}</p>}

        <div className="flex gap-4 pt-4 border-t border-gray-100">
          <button type="button" onClick={() => router.back()} disabled={loading} className="px-6 py-2.5 bg-white text-black rounded-lg font-medium border border-gray-200 hover:bg-gray-50 transition-colors">
            Back
          </button>
          <button type="submit" disabled={loading} className="flex-1 bg-black text-white py-2.5 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-md disabled:opacity-70">
            {loading ? "Saving..." : "Complete Setup"}
          </button>
        </div>
      </form>
    </div>
  );
}
