"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { FirmCreate } from "@/interfaces/firm";
import { createClient } from "@/supabaseConfig/client";
import { getApiBaseUrl } from "@/lib/api";
import { useToast } from "@/context/ToastContext";

type OnboardingData = Partial<FirmCreate>;

interface OnboardingContextType {
  data: OnboardingData;
  updateData: (newData: Partial<OnboardingData>) => void;
  fetchGstDetails: (gstin: string) => Promise<void>;
  submitOnboarding: (manualData?: Partial<OnboardingData>) => Promise<void>;
  isLoading: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<OnboardingData>({});
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const apiBaseUrl = getApiBaseUrl();

  const updateData = (newData: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...newData }));
  };

  const getAuthToken = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No active session");
    return session.access_token;
  };

  const fetchGstDetails = async (gstin: string) => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(`${apiBaseUrl}/api/firms/gst/fetch?gstin=${gstin}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch GST details");
      }

      const fetchedData = await response.json();
      updateData(fetchedData);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "An error occurred", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const submitOnboarding = async (manualData?: Partial<OnboardingData>) => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      // Merge context data with any final manual data passed in to ensure we have the latest
      const finalData = { ...data, ...manualData };
      
      const response = await fetch(`${apiBaseUrl}/api/firms/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(finalData),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to save firm details: ${errText}`);
      }
      
      // Update local context state with the final merged data after successful submission
      setData(finalData);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "An error occurred", "error");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{ data, updateData, fetchGstDetails, submitOnboarding, isLoading }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
};
