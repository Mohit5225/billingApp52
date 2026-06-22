"use client";

import { useEffect, useState } from "react";
import { useProfile } from "@/context/ProfileContext";
import { useActiveFirm } from "@/app/dashboard/shared/FirmProvider";
import { getApiBaseUrl } from "@/lib/api";

const FY_MONTHS = [
  { name: "April", num: 4 },
  { name: "May", num: 5 },
  { name: "June", num: 6 },
  { name: "July", num: 7 },
  { name: "August", num: 8 },
  { name: "September", num: 9 },
  { name: "October", num: 10 },
  { name: "November", num: 11 },
  { name: "December", num: 12 },
  { name: "January", num: 1 },
  { name: "February", num: 2 },
  { name: "March", num: 3 },
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
  const { activeFirmId } = useActiveFirm();
  
  // Calculate current financial year start
  const currentMonth = new Date().getMonth() + 1;
  const currentCalendarYear = new Date().getFullYear();
  const currentFyStart = currentMonth >= 4 ? currentCalendarYear : currentCalendarYear - 1;

  const [selectedYear, setSelectedYear] = useState(currentFyStart);
  const [blocks, setBlocks] = useState<Record<number, PeriodBlock>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);

  const isMerchant = profile?.role === "merchant";

  const fetchBlocks = async (fyYear: number) => {
    if (!activeFirmId || !profile) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const [res1, res2] = await Promise.all([
        fetch(`${getApiBaseUrl()}/api/firms/${activeFirmId}/period-blocks?year=${fyYear}`, {
          headers: { "Authorization": `Bearer ${session?.access_token}` }
        }),
        fetch(`${getApiBaseUrl()}/api/firms/${activeFirmId}/period-blocks?year=${fyYear + 1}`, {
          headers: { "Authorization": `Bearer ${session?.access_token}` }
        })
      ]);

      const blockMap: Record<number, PeriodBlock> = {};
      
      if (res1.ok) {
        const data1: PeriodBlock[] = await res1.json();
        data1.forEach(b => {
          if (b.month >= 4) blockMap[b.month] = b;
        });
      }
      if (res2.ok) {
        const data2: PeriodBlock[] = await res2.json();
        data2.forEach(b => {
          if (b.month < 4) blockMap[b.month] = b;
        });
      }
      
      setBlocks(blockMap);
    } catch (e) {
      console.error("Failed to fetch blocks", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocks(selectedYear);
  }, [selectedYear, activeFirmId]);

  const handleToggle = async (monthNum: number, key: keyof Omit<PeriodBlock, 'year'|'month'>, currentValue: boolean) => {
    if (!activeFirmId) return;
    // Merchants cannot turn off (unblock)
    if (isMerchant && currentValue === true) return;

    const calendarYear = monthNum >= 4 ? selectedYear : selectedYear + 1;
    const newValue = !currentValue;
    const updateKey = `${monthNum}-${key}`;
    setUpdating(updateKey);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const payload = { [key]: newValue };

      const res = await fetch(`${getApiBaseUrl()}/api/firms/${activeFirmId}/period-blocks/${calendarYear}/${monthNum}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updatedBlock = await res.json();
        setBlocks(prev => ({ ...prev, [monthNum]: updatedBlock }));
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

  const years = Array.from({ length: 5 }, (_, i) => currentFyStart - 2 + i);

  return (
    <div className="w-full max-w-[95%] 2xl:max-w-[1600px] mx-auto py-8 px-4 sm:px-6">
      <div className="mb-6 border-b border-slate-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Period Block Settings</h1>
        <p className="mt-2 text-sm text-slate-500">
          Lock specific months to prevent changes to vouchers.
          {isMerchant && <span className="text-orange-600 font-medium ml-1">As a merchant, you can only block periods. Unblocking requires CA access.</span>}
        </p>
      </div>

      <div className="mb-8 flex items-center justify-between bg-white border border-slate-200/80 p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto">
          <label className="text-[13px] sm:text-sm font-bold text-slate-500 tracking-widest uppercase">Select Financial Year</label>
          <div className="relative flex-1 sm:flex-none">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full sm:w-48 appearance-none bg-slate-50/50 border border-slate-200 hover:border-slate-300 text-slate-900 font-bold py-2.5 pl-4 pr-10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-tally-500/30 focus:border-tally-500 transition-all cursor-pointer"
            >
              {years.map(y => (
                <option key={y} value={y}>{y} - {y+1}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-tally-500/20 border-t-tally-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden divide-y divide-slate-100">
          {FY_MONTHS.map(({ name: monthName, num: month }) => {
            const calendarYear = month >= 4 ? selectedYear : selectedYear + 1;
            const isExpanded = expandedMonth === month;

            return (
              <div key={month} className="group flex flex-col">
                <button 
                  onClick={() => setExpandedMonth(isExpanded ? null : month)}
                  className={`flex items-center justify-between w-full px-5 py-4 sm:px-6 sm:py-5 text-left transition-all duration-300 ${isExpanded ? 'bg-slate-50/80 shadow-inner' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-sm flex items-center justify-center text-[13px] font-bold">
                      {month}
                    </span>
                    <h3 className="text-[17px] font-bold text-slate-900 tracking-tight">
                      {monthName} <span className="text-slate-400 font-medium ml-1.5">{calendarYear}</span>
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <svg 
                      className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-slate-600' : 'group-hover:text-slate-600'}`} 
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-6 pt-3 sm:px-6 bg-slate-50/80 border-t border-slate-100/60 shadow-inner">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-2">
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
                          <div key={key} className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                            <span className={`text-sm font-medium ${isBlocked ? 'text-rose-600' : 'text-slate-700'}`}>
                              Block {label}
                            </span>
                            
                            <button
                              disabled={isDisabled || isUpdating}
                              onClick={() => handleToggle(month, key, isBlocked)}
                              className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-tally-500/50 ${(isDisabled || isUpdating) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isBlocked ? 'bg-rose-500' : 'bg-slate-300'}`}
                            >
                              <span
                                className={`absolute top-1/2 -translate-y-1/2 left-0.5 w-5 h-5 rounded-full transition-all duration-300 shadow-sm flex items-center justify-center ${isBlocked ? 'translate-x-5 bg-white' : 'translate-x-0 bg-white'}`}
                              >
                                {isUpdating && <div className="w-3 h-3 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin"></div>}
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
