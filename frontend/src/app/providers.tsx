"use client";

import { ProfileProvider } from "@/context/ProfileContext";
import { ToastProvider } from "@/context/ToastContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ProfileProvider>
        {children}
      </ProfileProvider>
    </ToastProvider>
  );
}
