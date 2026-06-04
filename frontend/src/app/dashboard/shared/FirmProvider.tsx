"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useProfile } from "@/context/ProfileContext";
import { resolveActiveFirmId } from "@/lib/firm";

interface FirmContextType {
  activeFirmId: string | null;
  setActiveFirmId: (id: string | null) => void;
}

const FirmContext = createContext<FirmContextType | undefined>(undefined);
const ACTIVE_FIRM_STORAGE_KEY = "billingApp_activeFirmId";

export function FirmProvider({ children }: { children: ReactNode }) {
  const { profile } = useProfile();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlFirmId = searchParams.get("firm_id");

  const [activeFirmId, setActiveFirmId] = useState<string | null>(() =>
    resolveActiveFirmId({
      profile,
      urlFirmId,
      storedFirmId: typeof window !== "undefined"
        ? window.sessionStorage.getItem(ACTIVE_FIRM_STORAGE_KEY)
        : null,
    }),
  );

  useEffect(() => {
    const resolvedFirmId = resolveActiveFirmId({
      profile,
      urlFirmId,
      storedFirmId: window.sessionStorage.getItem(ACTIVE_FIRM_STORAGE_KEY),
    });

    if (resolvedFirmId && resolvedFirmId !== activeFirmId) {
      setActiveFirmId(resolvedFirmId);
      return;
    }

    if (!resolvedFirmId && activeFirmId) {
      setActiveFirmId(null);
    }
  }, [profile, urlFirmId, activeFirmId]);

  useEffect(() => {
    if (!activeFirmId) {
      window.sessionStorage.removeItem(ACTIVE_FIRM_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(ACTIVE_FIRM_STORAGE_KEY, activeFirmId);
  }, [activeFirmId]);

  useEffect(() => {
    if (!activeFirmId || urlFirmId) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("firm_id", activeFirmId);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }, [activeFirmId, pathname, router, searchParams, urlFirmId]);

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
