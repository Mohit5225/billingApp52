"use client";

import React from "react";
import { useProfile } from "@/context/ProfileContext";

export function GlobalAccessCheck({ children }: { children: React.ReactNode }) {
  const { isPaused } = useProfile();
  return (
    <>
      {children}
      {isPaused && <AccessPausedOverlay />}
    </>
  );
}

export function AccessPausedOverlay() {
  return (
    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center">
      <div className="max-w-md p-8 text-center space-y-6">
        <div className="mx-auto w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-destructive"
          >
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-destructive">
            YOUR ACCESS HAS BEEN PAUSED
          </h1>
          <p className="text-lg text-muted-foreground">
            You cannot interact with your workspace. Please contact your CA administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
