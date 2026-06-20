"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useProfile } from "./ProfileContext";
import { useActiveFirm } from "@/app/dashboard/shared/FirmProvider";

interface DateFilterContextType {
  fromDate: string;
  toDate: string;
  setDateRange: (from: string, to: string) => void;
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

export const DateFilterProvider = ({ children }: { children: ReactNode }) => {
  const { profile } = useProfile();
  const { activeFirmId } = useActiveFirm();
  
  // Default to current financial year if no profile or no date set
  const [fromDate, setFromDate] = useState<string>("2026-04-01");
  const [toDate, setToDate] = useState<string>("2027-03-31");

  // Sync initial state from localStorage or DB fallback when activeFirmId loads
  useEffect(() => {
    if (!activeFirmId) return;

    const storedFrom = localStorage.getItem(`billingApp_fromDate_${activeFirmId}`);
    const storedTo = localStorage.getItem(`billingApp_toDate_${activeFirmId}`);

    if (storedFrom && storedTo) {
      setFromDate(storedFrom);
      setToDate(storedTo);
    } else {
      if (profile?.filter_from_date) {
        setFromDate(profile.filter_from_date);
      }
      if (profile?.filter_to_date) {
        setToDate(profile.filter_to_date);
      }
    }
  }, [activeFirmId, profile]);

  const handleSetDateRange = (from: string, to: string) => {
    // 1. Update UI instantly
    setFromDate(from);
    setToDate(to);

    // 2. Save locally for the specific firm
    if (activeFirmId) {
      localStorage.setItem(`billingApp_fromDate_${activeFirmId}`, from);
      localStorage.setItem(`billingApp_toDate_${activeFirmId}`, to);
    }
  };

  return (
    <DateFilterContext.Provider
      value={{
        fromDate,
        toDate,
        setDateRange: handleSetDateRange,
      }}
    >
      {children}
    </DateFilterContext.Provider>
  );
};

export const useDateFilter = () => {
  const context = useContext(DateFilterContext);
  if (context === undefined) {
    throw new Error("useDateFilter must be used within a DateFilterProvider");
  }
  return context;
};
