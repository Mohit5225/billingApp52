"use client";

import { useEffect, useState } from "react";
import { useProfile } from "@/context/ProfileContext";
import { useFirm } from "@/app/dashboard/shared/FirmProvider";
import { getApiBaseUrl } from "@/lib/api";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface PeriodBlock {
  year: number;
  month: number;
  block_sales: boolean;
  block_purchases: boolean;
  block_credit_notes: boolean;
  block_debit_notes: boolean;
}

export default function PeriodBlockPage() {
  const { profile, supabase } = useProfile();
  const { activeFirm } = useFirm();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [blocks, setBlocks] = useState<Record<number, PeriodBlock>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const isMerchant = profile?.role === "merchant";

  const fetchBlocks = async (year: number) => {
    if (!activeFirm || !profile) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${getApiBaseUrl()}/api/firms/${activeFirm.id}/period-blocks?year=${year}`, {
        headers: { "Authorization": `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        const data: PeriodBlock[] = await res.json();
        const blockMap: Record<number, PeriodBlock> = {};
        data.forEach(b => {
          blockMap[b.month] = b;
        });
        setBlocks(blockMap);
      }
    } catch (e) {
      console.error("Failed to fetch blocks", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocks(selectedYear);
  }, [selectedYear, activeFirm]);

  const handleToggle = async (month: number, key: keyof Omit<PeriodBlock, 'year'|'month'>, currentValue: boolean) => {
    if (!activeFirm) return;
    // Merchants cannot turn off (unblock)
    if (isMerchant && currentValue === true) return;

    const newValue = !currentValue;
    const updateKey = `${month}-${key}`;
    setUpdating(updateKey);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const payload = { [key]: newValue };

      const res = await fetch(`${getApiBaseUrl()}/api/firms/${activeFirm.id}/period-blocks/${selectedYear}/${month}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updatedBlock = await res.json();
        setBlocks(prev => ({ ...prev, [month]: updatedBlock }));
      }
    } catch (e) {
      console.error("Failed to update block", e);
    } finally {
      setUpdating(null);
    }
  };

  const getBlockValue = (month: number, key: keyof Omit<PeriodBlock, 'year'|'month'>) => {
    return blocks[month]?.[key] ?? false;
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-8 relative z-10">
        <h1 className="text-3xl font-bold tracking-tight text-white/90">Period Block Settings</h1>
        <p className="mt-2 text-sm text-white/50">
          Lock specific months to prevent changes to vouchers.
          {isMerchant && <span className="text-orange-400/80 ml-2">As a merchant, you can only block periods. Unblocking requires CA access.</span>}
        </p>
      </div>

      <div className="mb-8 flex items-center justify-between bg-white/[0.02] border border-white/[0.05] p-4 rounded-2xl backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-4">
          <label className="text-sm font-semibold text-white/60 tracking-wider uppercase">Select Year</label>
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="appearance-none bg-black/30 border border-white/10 text-white font-medium py-2 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-tally-500/50 transition-all cursor-pointer"
            >
              {years.map(y => (
                <option key={y} value={y} className="bg-[#122b1e] text-white">{y} - {y+1}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-white/40">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-tally-500/20 border-t-tally-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MONTHS.map((monthName, index) => {
            const month = index + 1;
            return (
              <div key={month} className="group relative bg-white/[0.02] border border-white/[0.04] rounded-2xl p-5 hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300 shadow-lg">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-white/90 tracking-wide">{monthName} <span className="text-white/30 text-sm font-medium">{selectedYear}</span></h3>
                </div>

                <div className="space-y-4">
                  {[
                    { label: "Sales", key: "block_sales" as const },
                    { label: "Purchases", key: "block_purchases" as const },
                    { label: "Debit Notes", key: "block_debit_notes" as const },
                    { label: "Credit Notes", key: "block_credit_notes" as const },
                  ].map(({ label, key }) => {
                    const isBlocked = getBlockValue(month, key);
                    const isUpdating = updating === `${month}-${key}`;
                    const isDisabled = isMerchant && isBlocked; // Merchant cannot unblock

                    return (
                      <div key={key} className="flex items-center justify-between group/toggle">
                        <span className={`text-sm font-medium transition-colors ${isBlocked ? 'text-red-400/80' : 'text-emerald-400/80'}`}>
                          Block {label}
                        </span>
                        
                        <button
                          disabled={isDisabled || isUpdating}
                          onClick={() => handleToggle(month, key, isBlocked)}
                          className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-canvas focus:ring-tally-500/50 ${(isDisabled || isUpdating) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isBlocked ? 'bg-red-500/80' : 'bg-black/40 border border-white/10'}`}
                        >
                          <span
                            className={`absolute top-1/2 -translate-y-1/2 left-0.5 w-5 h-5 rounded-full transition-all duration-300 shadow-md flex items-center justify-center ${isBlocked ? 'translate-x-5 bg-white' : 'translate-x-0 bg-white/60'}`}
                          >
                            {isUpdating && <div className="w-3 h-3 border-2 border-black/10 border-t-black/60 rounded-full animate-spin"></div>}
                            {!isUpdating && isBlocked && <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
