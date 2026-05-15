"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/context/OnboardingContext";

export default function Manual1Page() {
  const router = useRouter();
  const { data, updateData } = useOnboarding();
  const [formData, setFormData] = useState({
    name: data.name || "",
    mailing_name: data.mailing_name || "",
    address_lane1: data.address_lane1 || "",
    city: data.city || "",
    state_pincode: data.state_pincode || "",
    mobile: data.mobile || "",
    email: data.email || "",
    registration_type: data.registration_type || "Regular",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateData(formData);
    router.push("/onboarding/manual-2");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="space-y-2 pb-2 border-b border-gray-100">
        <h2 className="text-2xl font-semibold tracking-tight text-black">Business Details</h2>
        <p className="text-gray-500 text-sm">Step 1 of 2: Basic Information</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Firm Name *</label>
            <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Mailing Name *</label>
            <input required type="text" name="mailing_name" value={formData.mailing_name} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-gray-700">Address (Lane 1) *</label>
            <input required type="text" name="address_lane1" value={formData.address_lane1} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">City / Town *</label>
            <input required type="text" name="city" value={formData.city} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">State & Pin Code *</label>
            <input required type="text" name="state_pincode" value={formData.state_pincode} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Mobile Number *</label>
            <input required type="text" name="mobile" value={formData.mobile} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Email ID</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-gray-700">Registration Type</label>
            <select name="registration_type" value={formData.registration_type} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all bg-white">
              <option value="Regular">Regular</option>
              <option value="Composition">Composition</option>
              <option value="Unregistered">Unregistered</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4 pt-4 border-t border-gray-100">
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 bg-white text-black rounded-lg font-medium border border-gray-200 hover:bg-gray-50 transition-colors">
            Back
          </button>
          <button type="submit" className="flex-1 bg-black text-white py-2.5 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-md">
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}
