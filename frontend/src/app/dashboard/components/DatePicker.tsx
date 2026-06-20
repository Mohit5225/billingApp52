"use client";

import { useState, useRef, useEffect } from "react";
import { CustomCalendar } from "./CustomCalendar";

interface DatePickerProps {
  value: string;
  onChange: (val: string) => void;
  minDate?: string;
  maxDate?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({ value, onChange, minDate, maxDate, className = "", disabled = false }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Select Date";
    const [y, m, d] = dateStr.split("-");
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div ref={containerRef} className={`relative flex items-center justify-center w-full max-w-full rounded-2xl bg-white p-1.5 shadow-sm border border-slate-200/60 transition-all hover:border-slate-300 hover:shadow-md ${disabled ? "opacity-60 pointer-events-none" : ""} ${className}`}>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400/20 ${isOpen ? "bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20" : "bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900"}`}
      >
        <svg className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0 transition-colors ${isOpen ? "text-emerald-500" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="4" y="5" width="16" height="16" rx="4" ry="4" />
          <line x1="16" y1="3" x2="16" y2="7" />
          <line x1="8" y1="3" x2="8" y2="7" />
          <line x1="4" y1="11" x2="20" y2="11" />
        </svg>
        <span className="text-[13px] sm:text-[15px] font-semibold tracking-wide whitespace-nowrap">
          {formatDate(value)}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-3 z-50">
          <CustomCalendar 
            selectedDate={value} 
            minDate={minDate}
            maxDate={maxDate}
            onSelect={(val) => { onChange(val); }}
            onClose={() => setIsOpen(false)} 
          />
        </div>
      )}
    </div>
  );
}
