"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/context/OnboardingContext";

export default function Manual2Page() {
  const router = useRouter();
  const { data, submitOnboarding, error: contextError } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    gstin: data.gstin || "",
    pan: data.pan || "",
    bank_name: data.bank_name || "",
    account_number: data.account_number || "",
    ifsc_code: data.ifsc_code || "",
    branch_name: data.branch_name || "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    
    // GSTIN Validation (15 chars, standard regex)
    if (!formData.gstin.match(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)) {
      newErrors.gstin = "Invalid GSTIN format (e.g. 22AAAAA0000A1Z5)";
    }
    
    // PAN Validation (10 chars, standard regex)
    if (formData.pan && !formData.pan.match(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)) {
      newErrors.pan = "Invalid PAN format (e.g. ABCDE1234F)";
    }

    // Account Number (9-18 digits)
    if (formData.account_number && !formData.account_number.match(/^[0-9]{9,18}$/)) {
      newErrors.account_number = "Account number must be 9-18 digits";
    }

    // IFSC Code (11 chars)
    if (formData.ifsc_code && !formData.ifsc_code.match(/^[A-Z]{4}0[A-Z0-9]{6}$/)) {
      newErrors.ifsc_code = "Invalid IFSC format (e.g. SBIN0001234)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const upperValue = ["gstin", "pan", "ifsc_code"].includes(name) ? value.toUpperCase() : value;
    
    setFormData((prev) => ({ ...prev, [name]: upperValue }));
    
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    try {
      setLoading(true);
      // We pass formData directly to ensure context has the latest values before submission
      await submitOnboarding(formData);
      router.push("/onboarding/success");
    } catch (err: unknown) {
      console.error(err);
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
            <input 
              required 
              type="text" 
              name="gstin" 
              value={formData.gstin} 
              onChange={handleChange} 
              maxLength={15}
              placeholder="15-digit GSTIN"
              className={`w-full px-3 py-2 rounded-lg border ${errors.gstin ? 'border-red-500' : 'border-gray-200'} focus:border-black focus:ring-1 focus:ring-black outline-none transition-all uppercase`} 
            />
            {errors.gstin && <p className="text-xs text-red-500">{errors.gstin}</p>}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-gray-700">PAN Number</label>
            <input 
              type="text" 
              name="pan" 
              value={formData.pan} 
              onChange={handleChange} 
              maxLength={10}
              placeholder="10-digit PAN"
              className={`w-full px-3 py-2 rounded-lg border ${errors.pan ? 'border-red-500' : 'border-gray-200'} focus:border-black focus:ring-1 focus:ring-black outline-none transition-all uppercase`} 
            />
            {errors.pan && <p className="text-xs text-red-500">{errors.pan}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Bank Name</label>
            <input 
              type="text" 
              name="bank_name" 
              value={formData.bank_name} 
              onChange={handleChange} 
              placeholder="e.g. HDFC Bank"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Account Number</label>
            <input 
              type="text" 
              name="account_number" 
              value={formData.account_number} 
              onChange={handleChange} 
              placeholder="9-18 digits"
              className={`w-full px-3 py-2 rounded-lg border ${errors.account_number ? 'border-red-500' : 'border-gray-200'} focus:border-black focus:ring-1 focus:ring-black outline-none transition-all`} 
            />
            {errors.account_number && <p className="text-xs text-red-500">{errors.account_number}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">IFSC Code</label>
            <input 
              type="text" 
              name="ifsc_code" 
              value={formData.ifsc_code} 
              onChange={handleChange} 
              maxLength={11}
              placeholder="e.g. HDFC0001234"
              className={`w-full px-3 py-2 rounded-lg border ${errors.ifsc_code ? 'border-red-500' : 'border-gray-200'} focus:border-black focus:ring-1 focus:ring-black outline-none transition-all uppercase`} 
            />
            {errors.ifsc_code && <p className="text-xs text-red-500">{errors.ifsc_code}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Branch Name</label>
            <input 
              type="text" 
              name="branch_name" 
              value={formData.branch_name} 
              onChange={handleChange} 
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" 
            />
          </div>
        </div>

        {contextError && <p className="text-red-500 text-sm pt-2 bg-red-50 p-2 rounded-lg">{contextError}</p>}

        <div className="flex gap-4 pt-4 border-t border-gray-100">
          <button 
            type="button" 
            onClick={() => router.back()} 
            disabled={loading} 
            className="px-6 py-2.5 bg-white text-black rounded-lg font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button 
            type="submit" 
            disabled={loading} 
            className="flex-1 bg-black text-white py-2.5 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-md disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Saving...
              </>
            ) : "Complete Setup"}
          </button>
        </div>
      </form>
    </div>
  );
}
