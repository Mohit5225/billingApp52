"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";

type DashboardChromeContextValue = {
  bottomNavVisible: boolean;
  setBottomNavVisible: (visible: boolean) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
};

const DashboardChromeContext = createContext<DashboardChromeContextValue | undefined>(undefined);

export function DashboardChromeProvider({ children }: { children: ReactNode }) {
  const [bottomNavVisible, setBottomNavVisible] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Load initial state from localStorage safely on the client side
  useEffect(() => {
    setIsClient(true);
    const savedState = localStorage.getItem("sidebarCollapsed");
    if (savedState) {
      setIsSidebarCollapsed(savedState === "true");
    }
  }, []);

  const handleSetSidebarCollapsed = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    localStorage.setItem("sidebarCollapsed", String(collapsed));
  };

  const value = useMemo(
    () => ({ 
      bottomNavVisible, 
      setBottomNavVisible,
      isSidebarCollapsed,
      setIsSidebarCollapsed: handleSetSidebarCollapsed
    }),
    [bottomNavVisible, isSidebarCollapsed],
  );

  return <DashboardChromeContext.Provider value={value}>{children}</DashboardChromeContext.Provider>;
}

export function useDashboardChrome() {
  const context = useContext(DashboardChromeContext);

  if (!context) {
    throw new Error("useDashboardChrome must be used within a DashboardChromeProvider");
  }

  return context;
}

export function DashboardChromeScope({
  bottomNavVisible,
  children,
}: {
  bottomNavVisible: boolean;
  children: ReactNode;
}) {
  const { setBottomNavVisible } = useDashboardChrome();

  useLayoutEffect(() => {
    setBottomNavVisible(bottomNavVisible);

    return () => {
      setBottomNavVisible(true);
    };
  }, [bottomNavVisible, setBottomNavVisible]);

  return <>{children}</>;
}