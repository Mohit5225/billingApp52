"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type DashboardChromeContextValue = {
  bottomNavVisible: boolean;
  setBottomNavVisible: (visible: boolean) => void;
};

const DashboardChromeContext = createContext<DashboardChromeContextValue | undefined>(undefined);

export function DashboardChromeProvider({ children }: { children: ReactNode }) {
  const [bottomNavVisible, setBottomNavVisible] = useState(true);

  const value = useMemo(
    () => ({ bottomNavVisible, setBottomNavVisible }),
    [bottomNavVisible],
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