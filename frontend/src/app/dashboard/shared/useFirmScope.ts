"use client";

import { useSearchParams } from "next/navigation";

import { useProfile } from "@/context/ProfileContext";
import { resolveActiveFirmId } from "@/lib/firm";

export function useFirmScope() {
  const { profile, isCAAdmin, isCAEmployee, supabase, isLoading } = useProfile();
  const searchParams = useSearchParams();
  const isCA = isCAAdmin || isCAEmployee;
  const activeFirmId = resolveActiveFirmId({
    profile,
    isCA,
    urlFirmId: searchParams.get("firm_id"),
  });

  return {
    profile,
    supabase,
    isLoading,
    isCA,
    activeFirmId,
  };
}
