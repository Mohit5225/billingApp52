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
        /**
         * Caching lifecycle for firm-scoped queries:
         *
         * - staleTime: data is considered fresh for 1 min after fetch.
         *   Within this window, navigating to the same route re-uses cached
         *   data without a network round-trip.
         *
         * - gcTime: after a query becomes inactive (component unmounts),
         *   TanStack keeps it in memory for 5 min.  If the user comes back
         *   to the same (firmId, route) within that window it still
         *   benefits from the cache.
         *
         * - refetchOnMount: 'always' guarantees a background refetch every
         *   time a component mounts, even if the cache entry is still
         *   within staleTime.  This is the key safeguard against a stale
         *   firm's data being shown when the user switches firms.
         *
         * Because every firm-scoped query key includes activeFirmId
         *   e.g. ['account-groups', activeFirmId]
         * switching firm naturally creates a new cache entry, so old firm
         * data is never served.  The gcTime just controls how long those
         * old entries stay in memory before being garbage-collected.
         */
        staleTime: 60 * 1000,       // 1 minute
        gcTime: 5 * 60 * 1000,      // 5 minutes (matches TanStack default)
        refetchOnMount: true,        // always re-validate on mount
        refetchOnWindowFocus: false, // don't refetch when tab regains focus
        retry: 1,
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
