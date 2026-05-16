"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { createClient } from '@/supabaseConfig/client';
import { Profile, UserRole } from '@/interfaces/profile';

interface ProfileContextType {
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  isCAAdmin: boolean;
  isCAEmployee: boolean;
  isMerchant: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fix 1: Memoize so the client isn't recreated on every render
  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setProfile(null);
        // Fix 2: Must call setIsLoading(false) here, not just in finally,
        // because early returns skip the finally block in some JS runtimes.
        // Actually finally DOES run on return, but being explicit is safer.
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No profile found yet — user is mid-onboarding
          setProfile(null);
        } else {
          throw fetchError;
        }
      } else {
        setProfile(data as Profile);
      }
    } catch (err: any) {
      console.error("Error fetching profile:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setIsLoading(false);
      } else if (event === 'SIGNED_IN') {
        fetchProfile();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    profile,
    isLoading,
    error,
    refreshProfile: fetchProfile,
    isCAAdmin: profile?.role === UserRole.CA_ADMIN,
    isCAEmployee: profile?.role === UserRole.CA_EMPLOYEE,
    isMerchant: profile?.role === UserRole.MERCHANT,
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
