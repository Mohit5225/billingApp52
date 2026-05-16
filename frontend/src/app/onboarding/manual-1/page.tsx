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
    state: data.state || "",
    pincode: data.pincode || "",
    mobile: data.mobile || "",
    email: data.email || "",
    registration_type: data.registration_type || "Regular",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = "Firm name is required";
    if (!formData.mobile.match(/^[6-9]\d{9}$/)) newErrors.mobile = "Invalid 10-digit mobile number";
    if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) newErrors.email = "Invalid email format";
    if (!formData.pincode.match(/^\d{6}$/)) newErrors.pincode = "Invalid 6-digit pincode";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when typing
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
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
            <input 
              required 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              className={`w-full px-3 py-2 rounded-lg border ${errors.name ? 'border-red-500' : 'border-gray-200'} focus:border-black focus:ring-1 focus:ring-black outline-none transition-all`} 
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Mailing Name *</label>
            <input 
              required 
              type="text" 
              name="mailing_name" 
              value={formData.mailing_name} 
              onChange={handleChange} 
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" 
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-gray-700">Address (Lane 1) *</label>
            <input 
              required 
              type="text" 
              name="address_lane1" 
              value={formData.address_lane1} 
              onChange={handleChange} 
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">City / Town *</label>
            <input 
              required 
              type="text" 
              name="city" 
              value={formData.city} 
              onChange={handleChange} 
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" 
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">State *</label>
              <input 
                required 
                type="text" 
                name="state" 
                value={formData.state} 
                onChange={handleChange} 
                placeholder="e.g. Delhi"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Pin Code *</label>
              <input 
                required 
                type="text" 
                name="pincode" 
                value={formData.pincode} 
                onChange={handleChange} 
                maxLength={6}
                placeholder="6 digits"
                className={`w-full px-3 py-2 rounded-lg border ${errors.pincode ? 'border-red-500' : 'border-gray-200'} focus:border-black focus:ring-1 focus:ring-black outline-none transition-all`} 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Mobile Number *</label>
            <input 
              required 
              type="text" 
              name="mobile" 
              value={formData.mobile} 
              onChange={handleChange} 
              maxLength={10}
              className={`w-full px-3 py-2 rounded-lg border ${errors.mobile ? 'border-red-500' : 'border-gray-200'} focus:border-black focus:ring-1 focus:ring-black outline-none transition-all`} 
            />
            {errors.mobile && <p className="text-xs text-red-500">{errors.mobile}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Email ID</label>
            <input 
              type="email" 
              name="email" 
              value={formData.email} 
              onChange={handleChange} 
              className={`w-full px-3 py-2 rounded-lg border ${errors.email ? 'border-red-500' : 'border-gray-200'} focus:border-black focus:ring-1 focus:ring-black outline-none transition-all`} 
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-gray-700">Registration Type</label>
            <select 
              name="registration_type" 
              value={formData.registration_type} 
              onChange={handleChange} 
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all bg-white"
            >
              <option value="Regular">Regular</option>
              <option value="Composition">Composition</option>
              <option value="Unregistered">Unregistered</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4 pt-4 border-t border-gray-100">
          <button 
            type="button" 
            onClick={() => router.back()} 
            className="px-6 py-2.5 bg-white text-black rounded-lg font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button 
            type="submit" 
            className="flex-1 bg-black text-white py-2.5 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-md"
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}
