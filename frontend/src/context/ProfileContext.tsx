"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { Profile, UserRole } from "@/interfaces/profile";
import { createClient } from "@/supabaseConfig/client";
import { useToast } from "@/context/ToastContext";

interface ProfileContextType {
  profile: Profile | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  isCAAdmin: boolean;
  isCAEmployee: boolean;
  isMerchant: boolean;
  isPaused: boolean;
  supabase: ReturnType<typeof createClient>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          setProfile(null);
        } else {
          throw fetchError;
        }
      } else {
        setProfile(data as Profile);
      }
    } catch (err: unknown) {
      console.error("Error fetching profile:", err);
      showToast(err instanceof Error ? err.message : "Unable to load profile", "error");
    } finally {
      setIsLoading(false);
    }
  }, [supabase, showToast]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchProfile(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setIsLoading(false);
      } else if (event === "SIGNED_IN") {
        void fetchProfile(true);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfile, supabase]);

  const value = {
    profile,
    isLoading,
    refreshProfile: () => fetchProfile(false),
    isCAAdmin: profile?.role === UserRole.CA_ADMIN,
    isCAEmployee: profile?.role === UserRole.CA_EMPLOYEE,
    isMerchant: profile?.role === UserRole.MERCHANT,
    isPaused: profile?.is_paused ?? false,
    supabase,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
};
