"use client";

import { useProfile } from "@/context/ProfileContext";
import { useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import BottomNav from "./components/BottomNav";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useProfile();
  const router = useRouter();

  // Guard: redirect unauthenticated users
  useEffect(() => {
    if (!isLoading && !profile) {
      router.replace("/auth/login");
    }
  }, [isLoading, profile, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-tally-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400 animate-pulse">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area — offset for sidebar on desktop */}
      <div className="lg:ml-[220px] flex flex-col min-h-screen">
        {/* Sticky Header */}
        <Suspense fallback={
          <div className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/80" />
        }>
          <Header />
        </Suspense>

        {/* Page Content — padded for bottom nav on mobile */}
        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <BottomNav />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
