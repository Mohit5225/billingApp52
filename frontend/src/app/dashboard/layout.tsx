"use client";

import { useDashboardChrome, DashboardChromeProvider } from "@/context/DashboardChromeContext";
import { DateFilterProvider } from "@/context/DateFilterContext";
import { useProfile } from "@/context/ProfileContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, Suspense, useRef } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import BottomNav from "./components/BottomNav";
import { FirmProvider } from "./shared/FirmProvider";
import { GlobalSearchProvider } from "@/context/GlobalSearchContext";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { profile, isLoading, refreshProfile, supabase, isPaused } = useProfile();
  const router = useRouter();
  const pathname = usePathname();
  const hasRetriedProfile = useRef(false);
  const { isSidebarCollapsed } = useDashboardChrome();
  
  const isVoucherScreen = pathname.includes("/dashboard/create/") || pathname.includes("/dashboard/vouchers/");
  const isPeriodBlockScreen = pathname.includes("/dashboard/settings/period-block");
  const hideHeader = isVoucherScreen || isPeriodBlockScreen;

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

  const getLoadingText = (path: string) => {
    if (!path || path === "/dashboard") return "dashboard";
    const parts = path.split("/").filter(Boolean);
    if (parts.length > 1 && parts[0] === "dashboard") {
      const section = parts[1];
      return section.replace(/-/g, " ");
    }
    return "dashboard";
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-6">
          {/* Orbital glowing loader */}
          <div className="relative flex items-center justify-center w-24 h-24">
            {/* Soft background glow (removed animate-pulse as pulsing blurs cause severe frame drops/hiccups) */}
            <div className="absolute w-20 h-20 rounded-full bg-tally-500/10 blur-xl" />
            
            {/* Ring Track */}
            <div className="absolute w-16 h-16 rounded-full border border-tally-500/10" />
            
            {/* Outer Orbiting Dot (Green) */}
            <div className="absolute w-16 h-16 animate-[spin_2s_linear_infinite]">
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-tally-600 shadow-[0_0_12px_rgba(82,183,136,0.8)]" />
            </div>

            {/* Inner Orbiting Dot (Orange) - Counter-rotating */}
            <div className="absolute w-16 h-16 animate-[spin_3s_linear_infinite_reverse]">
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
            </div>
            
            {/* Core pulse */}
            <div className="absolute w-6 h-6 rounded-full bg-tally-500/5 border border-tally-500/10 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-tally-600 animate-pulse shadow-[0_0_8px_rgba(82,183,136,0.6)]" />
            </div>
          </div>

          {/* Elegant Loading Typography */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold tracking-[0.3em] text-tally-600/80 uppercase">Loading System</span>
            <div className="flex items-center text-sm font-medium text-slate-500 dark:text-slate-400 capitalize">
              <span>{getLoadingText(pathname)}</span>
              <span className="inline-flex gap-1 ml-1.5">
                <span className="w-1 h-1 rounded-full bg-tally-500 animate-[bounce_1.2s_infinite_-0.3s]" />
                <span className="w-1 h-1 rounded-full bg-tally-500 animate-[bounce_1.2s_infinite_-0.15s]" />
                <span className="w-1 h-1 rounded-full bg-tally-500 animate-[bounce_1.2s_infinite]" />
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />

      <div className={`min-h-screen transition-all duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isSidebarCollapsed ? "lg:pl-[var(--sidebar-space-collapsed)]" : "lg:pl-[var(--sidebar-space-expanded)]"}`}>
        {!hideHeader && (
          <Suspense
            fallback={<div className="h-[88px] border-b border-white/60 bg-white/70 backdrop-blur-xl" />}
          >
            <Header />
          </Suspense>
        )}

        <div className="relative isolate">
          {!hideHeader && (
            <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(circle_at_top,rgba(82,183,136,0.14),transparent_58%)]" />
          )}
          <main 
            className={`mx-auto flex flex-col min-h-screen w-full max-w-[var(--content-max-w)] transition-[max-width] duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
              hideHeader 
                ? "p-2 sm:p-4 lg:p-4" 
                : "px-4 pb-28 pt-1.5 sm:px-6 sm:pb-32 sm:pt-6 lg:px-8 lg:pb-10 lg:pt-8 min-h-[calc(100vh-88px)]"
            }`}
            style={{ "--content-max-w": hideHeader ? "100%" : isSidebarCollapsed ? "2400px" : "1800px" } as React.CSSProperties}
          >
            {children}
          </main>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <FirmProvider>
        <GlobalSearchProvider>
          <DashboardChromeProvider>
            <DateFilterProvider>
              <DashboardShell>{children}</DashboardShell>
            </DateFilterProvider>
          </DashboardChromeProvider>
        </GlobalSearchProvider>
      </FirmProvider>
    </Suspense>
  );
}
