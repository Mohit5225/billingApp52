"use client";

import { useProfile } from "@/context/ProfileContext";
import SignOutButton from "../components/SignOutButton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Firm } from "@/interfaces/firm";

export default function FirmsPage() {
  const { profile, isCAAdmin, isCAEmployee, isLoading: isProfileLoading, supabase } = useProfile();
  const [firms, setFirms] = useState<Firm[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFirmsLoading, setIsFirmsLoading] = useState(true);
  const router = useRouter();
  const isCA = isCAAdmin || isCAEmployee;

  // Guard: Redirect non-CA users
  useEffect(() => {
    if (!isProfileLoading && profile && !isCA) {
      router.replace("/dashboard");
    }
  }, [isProfileLoading, profile, isCA, router]);

  // Fetch real firms from Supabase
  useEffect(() => {
    async function getFirms() {
      if (!profile) return;
      
      try {
        setIsFirmsLoading(true);
        const { data, error } = await supabase
          .from('firms')
          .select('*')
          .order('name');

        if (error) throw error;
        setFirms(data || []);
      } catch (err) {
        console.error("Error fetching firms:", err);
      } finally {
        setIsFirmsLoading(false);
      }
    }

    if (isCA && profile) {
      getFirms();
    }
  }, [isCA, profile, supabase]);

  const filteredFirms = firms.filter(firm => 
    firm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (firm.gstin && firm.gstin.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isProfileLoading || (isFirmsLoading && firms.length === 0)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F9F7F4] text-slate-800">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-[#1B4332] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 animate-pulse text-sm">Loading firms...</p>
        </div>
      </main>
    );
  }

  if (!isCA) return null;

  return (
    <main className="flex min-h-screen flex-col bg-[#F9F7F4] text-slate-800 font-sans">
      <div className="max-w-4xl w-full mx-auto p-8 flex flex-col min-h-screen">
        
        {/* Header Section */}
        <header className="mb-10 space-y-6 pt-12">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Welcome back, {profile?.full_name?.split(' ')[0] || 'CA'}
            </h1>
            <div className="flex-shrink-0">
              <SignOutButton />
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search firms by name or GSTIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-all placeholder-slate-400"
            />
          </div>
        </header>

        {/* List Body */}
        <div className="flex-1 overflow-y-auto pb-12 space-y-4">
          {filteredFirms.length > 0 ? (
            filteredFirms.map((firm) => (
              <div 
                key={firm.id} 
                className="bg-white border-l-[3px] border-l-[#1B4332] p-6 flex flex-col sm:flex-row sm:items-center justify-between group hover:bg-slate-50 transition-colors"
              >
                <div className="text-left mb-4 sm:mb-0">
                  <h3 className="text-lg font-medium text-slate-900 mb-1">{firm.name}</h3>
                  <p className="text-sm text-slate-500 font-mono">GSTIN: {firm.gstin || 'Not Provided'}</p>
                </div>
                <Link 
                  href={`/dashboard?firm_id=${firm.id}`} 
                  className="inline-flex items-center justify-center px-6 py-2.5 bg-slate-900 text-white text-sm font-medium rounded hover:bg-slate-800 transition-colors"
                >
                  Open Workspace
                </Link>
              </div>
            ))
          ) : (
            <div className="py-16 text-center bg-white border border-slate-100 rounded-lg">
              <p className="text-slate-500">No firms found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
