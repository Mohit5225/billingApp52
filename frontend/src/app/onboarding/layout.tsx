"use client";

import { OnboardingProvider } from "@/context/OnboardingContext";
import { ReactNode } from "react";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <OnboardingProvider>
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8f4ed_0%,#eef7f0_100%)] px-4 py-8 selection:bg-black selection:text-white sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1400px] items-center">
          <div className="grid w-full gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <section className="hidden space-y-6 lg:block">
              <div className="inline-flex items-center gap-3.5 rounded-full border border-white/70 bg-white/72 px-5 py-2.5 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tally-400 font-bold text-tally-900 text-lg">
                  B
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">BillingApp</p>
                  <p className="text-base font-semibold text-slate-700">Guided setup</p>
                </div>
              </div>
              <div className="max-w-2xl">
                <h1 className="text-5xl font-bold tracking-tight text-slate-950 leading-[1.15]">
                  Set up your workspace once, then move faster every day.
                </h1>
                <p className="mt-5 text-lg leading-relaxed text-slate-600">
                  The onboarding flow now sits in the same visual system as the rest of the app, so the transition into the dashboard feels consistent.
                </p>
              </div>
            </section>

            <div className="w-full rounded-[40px] border border-white/75 bg-white/84 p-8 shadow-[0_28px_72px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-10 lg:p-12">
              {children}
            </div>
          </div>
        </div>
      </div>
    </OnboardingProvider>
  );
}
