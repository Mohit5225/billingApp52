"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useProfile } from "./ProfileContext";

interface DateFilterContextType {
  fromDate: string;
  toDate: string;
  setDateRange: (from: string, to: string) => void;
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

export const DateFilterProvider = ({ children }: { children: ReactNode }) => {
  const { profile, supabase } = useProfile();
  
  // Default to current financial year if no profile or no date set
  const [fromDate, setFromDate] = useState<string>("2026-04-01");
  const [toDate, setToDate] = useState<string>("2027-03-31");

  // Sync initial state from DB when profile loads
  useEffect(() => {
    if (profile?.filter_from_date) {
      setFromDate(profile.filter_from_date);
    }
    if (profile?.filter_to_date) {
      setToDate(profile.filter_to_date);
    }
  }, [profile]);

  const handleSetDateRange = (from: string, to: string) => {
    // 1. Update UI instantly
    setFromDate(from);
    setToDate(to);

    // 2. Silent PATCH to DB
    if (profile?.id) {
      void supabase
        .from("profiles")
        .update({ filter_from_date: from, filter_to_date: to })
        .eq("id", profile.id)
        .then();
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
