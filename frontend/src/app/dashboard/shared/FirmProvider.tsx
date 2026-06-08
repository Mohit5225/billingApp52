"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useProfile } from "@/context/ProfileContext";
import { useQueryClient } from "@tanstack/react-query";

interface FirmContextType {
  activeFirmId: string | null;
  setActiveFirmId: (id: string | null) => void;
}

const FirmContext = createContext<FirmContextType | undefined>(undefined);
const ACTIVE_FIRM_STORAGE_KEY = "billingApp_activeFirmId";

export function FirmProvider({ children }: { children: ReactNode }) {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const searchParams = useSearchParams();
  const urlFirmId = searchParams.get("firm_id");
  const router = useRouter();
  const queryClient = useQueryClient();
  const prevFirmRef = useRef<string | null>(null);

  /**
   * Initial state resolution (runs once on hard load / tab open):
   *  1. URL param — explicit intent, always wins.
   *  2. sessionStorage — restores firm on hard refresh within the same
   *     browser session.
   *  3. null — no fallback to profile.firm_id. If neither URL nor session
   *     provides a firm, the redirect effect below sends the user to
   *     /firms to make an explicit choice.
   *
   * NOTE: sessionStorage is ONLY read here in the initializer. After that,
   * React state keeps the firm in memory across all client-side navigations.
   */
  const [activeFirmId, setActiveFirmId] = useState<string | null>(() => {
    if (urlFirmId) return urlFirmId;
    if (typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem(ACTIVE_FIRM_STORAGE_KEY);
      if (stored) return stored;
    }
    return null;
  });

  /**
   * When the URL param changes (user navigates to a URL that explicitly
   * carries ?firm_id=), update state to match. This handles:
   *  - CA user clicking a firm-scoped deep-link
   *  - Firm switcher pushing a new URL
   *
   * We do NOT clear the firm when urlFirmId becomes null (e.g. user
   * clicks a sidebar link that has no ?firm_id=). Clearing here was
   * the original regression introduced: it caused activeFirmId to
   * become null / wrong on every sidebar navigation.
   */
  useEffect(() => {
    if (urlFirmId && urlFirmId !== activeFirmId) {
      setActiveFirmId(urlFirmId);
    }
  }, [urlFirmId]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * If there is no active firm context at all (no URL, no session),
   * redirect to the firm selector so the user explicitly chooses.
   * We NEVER guess.
   */
  useEffect(() => {
    if (!activeFirmId && !isProfileLoading && profile) {
      router.replace("/firms");
    }
  }, [activeFirmId, isProfileLoading, profile, router]);

  /**
   * Nuclear Cache Clear: Ensure no cross-firm data leakage
   */
  useEffect(() => {
    if (prevFirmRef.current && activeFirmId && prevFirmRef.current !== activeFirmId) {
      // 💥 Firm changed — wipe every cached query result immediately.
      queryClient.clear();
    }
    prevFirmRef.current = activeFirmId;
  }, [activeFirmId, queryClient]);

  /**
   * Keep sessionStorage in sync with state so that hard-reloads restore
   * the correct firm. This is a write-only operation; the read only
   * happens during the useState initializer above.
   */
  useEffect(() => {
    if (activeFirmId) {
      window.sessionStorage.setItem(ACTIVE_FIRM_STORAGE_KEY, activeFirmId);
    } else {
      window.sessionStorage.removeItem(ACTIVE_FIRM_STORAGE_KEY);
    }
  }, [activeFirmId]);

  // ⚠️  The previous effect that injected ?firm_id= into every URL has
  // been removed. It was silently rewriting navigations and was the
  // root cause of the "browser guessing the URL" complaint.
  // The sidebar does not need ?firm_id= on links because React state
  // persists the active firm across all client-side navigations.

  return (
    <FirmContext.Provider value={{ activeFirmId, setActiveFirmId }}>
      {children}
    </FirmContext.Provider>
  );
}

export function useActiveFirm() {
  const context = useContext(FirmContext);
  if (context === undefined) {
    throw new Error("useActiveFirm must be used within a FirmProvider");
  }
  return context;
}
