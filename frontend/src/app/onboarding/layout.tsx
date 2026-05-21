"use client";

import { OnboardingProvider } from "@/context/OnboardingContext";
import { ReactNode } from "react";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <OnboardingProvider>
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8f4ed_0%,#eef7f0_100%)] px-4 py-8 selection:bg-black selection:text-white sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
          <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <section className="hidden space-y-5 lg:block">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/70 bg-white/72 px-4 py-2 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-tally-400 font-bold text-tally-900">
                  B
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">BillingApp</p>
                  <p className="text-sm font-medium text-slate-700">Guided setup</p>
                </div>
              </div>
              <div className="max-w-xl">
                <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
                  Set up your workspace once, then move faster every day.
                </h1>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  The onboarding flow now sits in the same visual system as the rest of the app, so the transition into the dashboard feels consistent.
                </p>
              </div>
            </section>

            <div className="w-full rounded-[36px] border border-white/75 bg-white/84 p-6 shadow-[0_28px_72px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-8 lg:p-10">
              {children}
            </div>
          </div>
        </div>
      </div>
    </OnboardingProvider>
  );
}
