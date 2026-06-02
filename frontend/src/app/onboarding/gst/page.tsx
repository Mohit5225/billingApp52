"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/context/OnboardingContext";

export default function GSTPage() {
  const router = useRouter();
  const { fetchGstDetails, isLoading, error, data } = useOnboarding();
  const [gstin, setGstin] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [submitLoading] = useState(false);

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (gstin.length !== 15) return;
    await fetchGstDetails(gstin);
    setIsReviewing(true);
  };

  const handleConfirm = () => {
    // Navigate to the manual details collection step
    router.push("/onboarding/details");
  };

  if (isReviewing && !isLoading && !error) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-3">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-black">Review Details</h2>
          <p className="text-lg text-gray-500">Please confirm the fetched business details.</p>
        </div>

        <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 space-y-5 text-base sm:text-lg">
          <div className="grid grid-cols-2 gap-5">
            <div><span className="text-gray-500 block mb-1">Firm Name</span><span className="font-semibold">{data.name}</span></div>
            <div><span className="text-gray-500 block mb-1">Mailing Name</span><span className="font-semibold">{data.mailing_name}</span></div>
            <div className="col-span-2"><span className="text-gray-500 block mb-1">Address</span><span className="font-semibold">{data.address_lane1}, {data.city}</span></div>
            <div><span className="text-gray-500 block mb-1">State</span><span className="font-semibold">{data.state}</span></div>
            <div><span className="text-gray-500 block mb-1">Pincode</span><span className="font-semibold">{data.pincode}</span></div>
            <div><span className="text-gray-500 block mb-1">GSTIN</span><span className="font-semibold">{data.gstin}</span></div>
            <div><span className="text-gray-500 block mb-1">PAN</span><span className="font-semibold">{data.pan}</span></div>
          </div>
        </div>

        {error && (
          <div className="p-5 rounded-xl bg-red-50 text-red-600 text-base">
            {error}
          </div>
        )}

        <div className="flex gap-5 pt-5">
          <button
            onClick={() => setIsReviewing(false)}
            className="flex-1 bg-white text-black py-4 px-5 text-lg rounded-xl font-semibold border border-gray-200 hover:bg-gray-50 transition-colors"
            disabled={submitLoading}
          >
            Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitLoading}
            className="flex-1 bg-black text-white py-4 px-5 text-lg rounded-xl font-semibold hover:bg-gray-800 transition-colors shadow-md disabled:opacity-70"
          >
            {submitLoading ? "Proceeding..." : "Confirm & Next"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-3">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-black">Enter GST Number</h2>
        <p className="text-lg text-gray-500">We&apos;ll fetch your business details automatically.</p>
      </div>

      <form onSubmit={handleFetch} className="space-y-8">
        <div className="space-y-3">
          <label htmlFor="gstin" className="text-base font-semibold text-gray-700">GSTIN *</label>
          <input
            id="gstin"
            type="text"
            required
            maxLength={15}
            minLength={15}
            value={gstin}
            onChange={(e) => setGstin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="e.g. 22AAAAA0000A1Z5"
            className="w-full px-5 py-4 text-lg rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all uppercase"
          />
          {error && <p className="text-red-500 text-base mt-2">{error}</p>}
        </div>

        <div className="flex gap-5 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-8 py-4 bg-white text-black rounded-xl text-lg font-semibold border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={isLoading || gstin.length !== 15}
            className="flex-1 bg-black text-white py-4 px-5 rounded-xl text-lg font-semibold hover:bg-gray-800 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="animate-pulse">Fetching...</span>
            ) : (
              "Fetch Details"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
