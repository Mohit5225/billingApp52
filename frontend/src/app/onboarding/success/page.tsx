"use client";

import { useProfile } from "@/context/ProfileContext";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SuccessPage() {
  const router = useRouter();
  const { refreshProfile } = useProfile();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleGoToDashboard = async () => {
    setIsRedirecting(true);

    try {
      await refreshProfile();
    } finally {
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-black">
          You are all set!
        </h1>
        <p className="text-gray-500">
          Your business profile has been successfully created.
        </p>
      </div>

      <div className="w-full pt-6">
        <button
          onClick={handleGoToDashboard}
          disabled={isRedirecting}
          className="w-full bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-md hover:shadow-lg"
        >
          {isRedirecting ? "Loading Dashboard..." : "Go to Dashboard"}
        </button>
      </div>
    </div>
  );
}
