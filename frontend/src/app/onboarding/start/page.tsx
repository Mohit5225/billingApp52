"use client";

import { useRouter } from "next/navigation";

export default function StartPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center text-center space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-black">
          Let&apos;s set up your business profile
        </h1>
        <p className="text-lg text-gray-500">
          We need a few details to get you started.
        </p>
      </div>

      <div className="w-full max-w-md space-y-5 pt-5">
        <p className="text-base font-semibold text-gray-700">Do you have a GST number?</p>
        
        <button
          onClick={() => router.push("/onboarding/gst")}
          className="w-full bg-black text-white py-4 px-5 text-lg rounded-xl font-semibold hover:bg-gray-800 transition-colors shadow-md hover:shadow-lg"
        >
          Yes, I have a GST number
        </button>
        
        <button
          onClick={() => router.push("/onboarding/manual-1")}
          className="w-full bg-white text-black py-4 px-5 text-lg rounded-xl font-semibold border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          No, I&apos;ll enter details manually
        </button>
      </div>
    </div>
  );
}
