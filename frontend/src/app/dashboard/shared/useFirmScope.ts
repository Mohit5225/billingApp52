"use client";

import { useProfile } from "@/context/ProfileContext";
import { useActiveFirm } from "./FirmProvider";

export function useFirmScope() {
  const { profile, isCAAdmin, isCAEmployee, supabase, isLoading } = useProfile();
  const { activeFirmId } = useActiveFirm();
  const isCA = isCAAdmin || isCAEmployee;

  return {
    profile,
    supabase,
    isLoading,
    isCA,
    activeFirmId,
  };
}
