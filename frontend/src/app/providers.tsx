"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { ProfileProvider } from "@/context/ProfileContext";
import { ToastProvider } from "@/context/ToastContext";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
        refetchOnWindowFocus: false, // Optional, depending on preference
      },
    },
  }));

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
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ProfileProvider>
          {children}
        </ProfileProvider>
      </ToastProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
