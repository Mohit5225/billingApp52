"use client";

import { useRouter } from "next/navigation";

export default function StartPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-black">
          Let's set up your business profile
        </h1>
        <p className="text-gray-500">
          We need a few details to get you started.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-4 pt-4">
        <p className="text-sm font-medium text-gray-700">Do you have a GST number?</p>
        
        <button
          onClick={() => router.push("/onboarding/gst")}
          className="w-full bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-md hover:shadow-lg"
        >
          Yes, I have a GST number
        </button>
        
        <button
          onClick={() => router.push("/onboarding/manual-1")}
          className="w-full bg-white text-black py-3 px-4 rounded-lg font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          No, I'll enter details manually
        </button>
      </div>
    </div>
  );
}
