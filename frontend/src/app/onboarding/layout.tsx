"use client";

import { OnboardingProvider } from "@/context/OnboardingContext";
import { ReactNode } from "react";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <OnboardingProvider>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 selection:bg-black selection:text-white">
        <div className="w-full max-w-2xl bg-white shadow-xl rounded-2xl border border-gray-100 p-8 sm:p-12 transition-all duration-300">
          {children}
        </div>
      </div>
    </OnboardingProvider>
  );
}
