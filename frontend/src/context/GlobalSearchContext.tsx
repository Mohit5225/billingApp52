"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface GlobalSearchContextType {
  globalSearchQuery: string;
  setGlobalSearchQuery: (query: string) => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextType | undefined>(undefined);

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");

  return (
    <GlobalSearchContext.Provider value={{ globalSearchQuery, setGlobalSearchQuery }}>
      {children}
    </GlobalSearchContext.Provider>
  );
}

export function useGlobalSearch() {
  const context = useContext(GlobalSearchContext);
  if (context === undefined) {
    throw new Error("useGlobalSearch must be used within a GlobalSearchProvider");
  }
  return context;
}
