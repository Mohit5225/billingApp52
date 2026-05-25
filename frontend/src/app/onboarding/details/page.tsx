"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/context/OnboardingContext";
import { useToast } from "@/context/ToastContext";

export default function DetailsPage() {
  const router = useRouter();
  const { data, updateData, submitOnboarding, isLoading: isSubmitting } = useOnboarding();
  const { showToast } = useToast();

  // Redirect if no GSTIN data is present (user skipped previous step)
  useEffect(() => {
    if (!data.gstin) {
      router.replace("/onboarding/gst");
    }
  }, [data.gstin, router]);

  const [formData, setFormData] = useState({
    account_number: data.account_number || "",
    ifsc_code: data.ifsc_code || "",
    bank_name: data.bank_name || "",
    branch_name: data.branch_name || "",
    mobile: data.mobile || "",
    email: data.email || "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case "account_number":
        if (!/^[0-9]{9,18}$/.test(value)) {
          return "Account number must contain only digits (9 to 18 characters).";
        }
        break;
      case "ifsc_code":
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value)) {
          return "Enter a valid 11-digit IFSC code (e.g. SBIN0001234).";
        }
        break;
      case "mobile":
        if (!/^[6-9]\d{9}$/.test(value)) {
          return "Enter a valid 10-digit Indian mobile number.";
        }
        break;
      case "email":
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
          return "Enter a valid email address.";
        }
        break;
      case "bank_name":
        if (value.trim().length < 2) return "Bank name is required.";
        break;
      case "branch_name":
        if (value.trim().length < 2) return "Branch name is required.";
        break;
      default:
        break;
    }
    return "";
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Auto format on blur
    let formattedValue = value;
    if (name === "email") formattedValue = value.toLowerCase();
    if (name === "ifsc_code") formattedValue = value.toUpperCase();
    
    if (formattedValue !== value) {
      setFormData(prev => ({ ...prev, [name]: formattedValue }));
    }

    setTouched(prev => ({ ...prev, [name]: true }));
    const errorMsg = validateField(name, formattedValue);
    setErrors(prev => ({ ...prev, [name]: errorMsg }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Formatting during typing
    let updatedValue = value;
    if (name === "account_number") {
      updatedValue = value.replace(/[^0-9]/g, ""); // Strip non-digits
    } else if (name === "ifsc_code") {
      updatedValue = value.toUpperCase(); // Force uppercase
    }

    setFormData(prev => ({ ...prev, [name]: updatedValue }));

    // Re-validate if touched
    if (touched[name]) {
      const errorMsg = validateField(name, updatedValue);
      setErrors(prev => ({ ...prev, [name]: errorMsg }));
    }
  };

  const isFormValid = () => {
    const fields = Object.keys(formData) as Array<keyof typeof formData>;
    // Check if any field is empty or has an error
    for (const field of fields) {
      if (!formData[field] || validateField(field, formData[field]) !== "") {
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) {
      // Touch all fields to show errors
      const allTouched = Object.keys(formData).reduce((acc, key) => ({...acc, [key]: true}), {});
      setTouched(allTouched);
      showToast("Please correct the highlighted fields before submitting.", "error");
      return;
    }

    try {
      updateData(formData);
      // Wait for state to update, or pass directly. 
      // Context might take a render cycle. 
      // It's safer to just submit onboarding, but we need to ensure the latest data is used.
      // We can update the context state synchronously and then submit.
      // However, submitOnboarding uses the state inside the context.
      // We pass the formData directly to submitOnboarding to avoid 
      // the race condition with React's async state updates.
      await submitOnboarding(formData);
      router.push("/onboarding/success");
    } catch (err) {
      console.error("Submission failed:", err);
    }
  };

  if (!data.gstin) return null; // Avoid flashing while redirecting

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-black">Complete Your Profile</h2>
        <p className="text-gray-500">Just a few more details to get your firm set up securely.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Banking Details Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Banking Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Account Number *</label>
              <input
                name="account_number"
                type="text"
                value={formData.account_number}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="9 to 18 digits"
                className={`w-full px-4 py-3 rounded-lg border focus:ring-1 outline-none transition-all ${
                  touched.account_number && errors.account_number 
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                    : touched.account_number && !errors.account_number
                    ? "border-green-500 focus:border-green-500 focus:ring-green-500"
                    : "border-gray-200 focus:border-black focus:ring-black"
                }`}
              />
              {touched.account_number && errors.account_number && (
                <p className="text-red-500 text-xs mt-1">{errors.account_number}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">IFSC Code *</label>
              <input
                name="ifsc_code"
                type="text"
                value={formData.ifsc_code}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. SBIN0001234"
                maxLength={11}
                className={`w-full px-4 py-3 rounded-lg border focus:ring-1 outline-none transition-all uppercase ${
                  touched.ifsc_code && errors.ifsc_code 
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                    : touched.ifsc_code && !errors.ifsc_code
                    ? "border-green-500 focus:border-green-500 focus:ring-green-500"
                    : "border-gray-200 focus:border-black focus:ring-black"
                }`}
              />
              {touched.ifsc_code && errors.ifsc_code && (
                <p className="text-red-500 text-xs mt-1">{errors.ifsc_code}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Bank Name *</label>
              <input
                name="bank_name"
                type="text"
                value={formData.bank_name}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. State Bank of India"
                className={`w-full px-4 py-3 rounded-lg border focus:ring-1 outline-none transition-all ${
                  touched.bank_name && errors.bank_name ? "border-red-500" : "border-gray-200 focus:border-black focus:ring-black"
                }`}
              />
              {touched.bank_name && errors.bank_name && <p className="text-red-500 text-xs mt-1">{errors.bank_name}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Branch Name *</label>
              <input
                name="branch_name"
                type="text"
                value={formData.branch_name}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. Main Branch"
                className={`w-full px-4 py-3 rounded-lg border focus:ring-1 outline-none transition-all ${
                  touched.branch_name && errors.branch_name ? "border-red-500" : "border-gray-200 focus:border-black focus:ring-black"
                }`}
              />
              {touched.branch_name && errors.branch_name && <p className="text-red-500 text-xs mt-1">{errors.branch_name}</p>}
            </div>
          </div>
        </div>

        {/* Personal Details Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Personal Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Mobile Number *</label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-gray-500">+91</span>
                <input
                  name="mobile"
                  type="text"
                  value={formData.mobile}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="9876543210"
                  maxLength={10}
                  className={`w-full pl-12 pr-4 py-3 rounded-lg border focus:ring-1 outline-none transition-all ${
                    touched.mobile && errors.mobile 
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                      : touched.mobile && !errors.mobile
                      ? "border-green-500 focus:border-green-500 focus:ring-green-500"
                      : "border-gray-200 focus:border-black focus:ring-black"
                  }`}
                />
              </div>
              {touched.mobile && errors.mobile && (
                <p className="text-red-500 text-xs mt-1">{errors.mobile}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email Address *</label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="contact@yourbusiness.com"
                className={`w-full px-4 py-3 rounded-lg border focus:ring-1 outline-none transition-all lowercase ${
                  touched.email && errors.email 
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                    : touched.email && !errors.email
                    ? "border-green-500 focus:border-green-500 focus:ring-green-500"
                    : "border-gray-200 focus:border-black focus:ring-black"
                }`}
              />
              {touched.email && errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 bg-white text-black rounded-lg font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Back
          </button>
          <button
            type="submit"
            disabled={!isFormValid() || isSubmitting}
            className="flex-1 bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span className="animate-pulse">Saving Profile...</span>
            ) : (
              "Save & Complete Onboarding"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
