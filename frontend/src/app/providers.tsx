"use client";

import { useEffect } from "react";

import { ProfileProvider } from "@/context/ProfileContext";
import { ToastProvider } from "@/context/ToastContext";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const shouldRegister =
      process.env.NODE_ENV === "production" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (!shouldRegister) return;

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Ignore registration failures; the app still works as a normal web app.
    });
  }, []);

  return (
    <ToastProvider>
      <ProfileProvider>
        {children}
      </ProfileProvider>
    </ToastProvider>
  );
}
