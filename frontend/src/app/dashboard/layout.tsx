"use client";

import { DashboardChromeProvider } from "@/context/DashboardChromeContext";
import { DateFilterProvider } from "@/context/DateFilterContext";
import { useProfile } from "@/context/ProfileContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, Suspense, useRef } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import BottomNav from "./components/BottomNav";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { profile, isLoading, refreshProfile, supabase } = useProfile();
  const router = useRouter();
  const pathname = usePathname();
  const hasRetriedProfile = useRef(false);
  
  const isVoucherScreen = pathname.includes("/dashboard/create/") || pathname.includes("/dashboard/vouchers/");

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (profile) {
      hasRetriedProfile.current = false;
      return;
    }

    const recoverProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/auth/login");
        return;
      }

      if (!hasRetriedProfile.current) {
        hasRetriedProfile.current = true;
        await refreshProfile();
        return;
      }

      router.replace("/onboarding/start");
    };

    void recoverProfile();
  }, [isLoading, profile, refreshProfile, router, supabase]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent border-tally-600" />
          <p className="animate-pulse text-sm text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <DashboardChromeProvider>
      <DateFilterProvider>
        <div className="min-h-screen bg-canvas">
          <Sidebar />

          <div className="min-h-screen lg:pl-[288px]">
            {!isVoucherScreen && (
              <Suspense
                fallback={<div className="h-[88px] border-b border-white/60 bg-white/70 backdrop-blur-xl" />}
              >
                <Header />
              </Suspense>
            )}

            <div className="relative isolate">
              {!isVoucherScreen && (
                <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(circle_at_top,rgba(82,183,136,0.14),transparent_58%)]" />
              )}
              <main className={`mx-auto flex flex-col min-h-screen w-full max-w-[1800px] ${
                isVoucherScreen 
                  ? "p-2 sm:p-4 lg:p-6" 
                  : "px-4 pb-28 pt-5 sm:px-6 sm:pb-32 sm:pt-6 lg:px-8 lg:pb-10 lg:pt-8 min-h-[calc(100vh-88px)]"
              }`}>
                {children}
              </main>
            </div>
          </div>

          <BottomNav />
        </div>
      </DateFilterProvider>
    </DashboardChromeProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
