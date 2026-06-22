"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { CustomCalendar } from "./CustomCalendar";

interface DatePickerProps {
  value: string;
  onChange: (val: string) => void;
  minDate?: string;
  maxDate?: string;
  className?: string;
  disabled?: boolean;
  variant?: "default" | "voucher";
}

export function DatePicker({ value, onChange, minDate, maxDate, className = "", disabled = false, variant = "default" }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Mount check and resize listener for responsive state
  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile(); // Check immediately on mount
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Manage body locking for mobile
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, isMobile]);

  // Click outside listener handling both trigger container and portal dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current && 
        !containerRef.current.contains(target) &&
        dropdownRef.current && 
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Select Date";
    const [y, m, d] = dateStr.split("-");
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  // The portal safely breaks out of all parent boundaries and clipping contexts for mobile only
  const portalContentMobile = isOpen && mounted && isMobile ? (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Premium backdrop for mobile views */}
      <div 
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        onClick={() => setIsOpen(false)}
      />
      <div 
        ref={dropdownRef} 
        className="relative z-10 w-full max-w-[320px] flex justify-center animate-in fade-in zoom-in-95 duration-200"
      >
        <CustomCalendar 
          selectedDate={value} 
          minDate={minDate}
          maxDate={maxDate}
          onSelect={onChange}
          onClose={() => setIsOpen(false)} 
        />
      </div>
    </div>
  ) : null;

  const isVoucher = variant === "voucher";

  const containerClasses = isVoucher
    ? `relative flex w-full max-w-full transition-all sm:items-center sm:justify-center sm:rounded-2xl sm:bg-white sm:p-1.5 sm:shadow-sm sm:border sm:border-slate-200/60 sm:hover:border-slate-300 sm:hover:shadow-md max-sm:h-[3.25rem] max-sm:rounded-xl max-sm:border max-sm:border-slate-200 max-sm:bg-slate-50/50 max-sm:shadow-sm max-sm:focus-within:border-emerald-400 max-sm:focus-within:ring-2 max-sm:focus-within:ring-emerald-400/20 max-sm:hover:border-slate-300 ${disabled ? "opacity-60 pointer-events-none max-sm:bg-slate-100" : ""} ${className}`
    : `relative flex items-center justify-center w-full max-w-full rounded-2xl bg-white p-1.5 shadow-sm border border-slate-200/60 transition-all hover:border-slate-300 hover:shadow-md ${disabled ? "opacity-60 pointer-events-none" : ""} ${className}`;

  const buttonClasses = isVoucher
    ? `w-full flex items-center transition-colors focus:outline-none sm:justify-center sm:gap-2 sm:px-4 sm:py-2.5 sm:rounded-xl max-sm:justify-between max-sm:px-3 max-sm:h-full max-sm:rounded-xl ${isOpen ? "sm:bg-emerald-50 sm:text-emerald-800 sm:ring-2 sm:ring-emerald-500/20 max-sm:bg-white max-sm:border-emerald-400" : "sm:bg-slate-50 sm:text-slate-700 sm:hover:bg-slate-100 sm:hover:text-slate-900 max-sm:bg-transparent"}`
    : `w-full flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400/20 ${isOpen ? "bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20" : "bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900"}`;

  const textClasses = isVoucher
    ? `tracking-wide whitespace-nowrap sm:text-[15px] sm:font-semibold max-sm:text-[17px] max-sm:font-medium max-sm:text-slate-900`
    : `text-[13px] sm:text-[15px] font-semibold tracking-wide whitespace-nowrap`;

  return (
    <>
      <div ref={containerRef} className={containerClasses}>
        
        <button
          type="button"
          tabIndex={0}
          onClick={() => setIsOpen(!isOpen)}
          className={buttonClasses}
        >
          {isVoucher && isMobile ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100/50 text-emerald-600">
                  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="4" y="5" width="16" height="16" rx="4" ry="4" />
                    <line x1="16" y1="3" x2="16" y2="7" />
                    <line x1="8" y1="3" x2="8" y2="7" />
                    <line x1="4" y1="11" x2="20" y2="11" />
                  </svg>
                </div>
                <span className={textClasses}>
                  {formatDate(value)}
                </span>
              </div>
              <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </>
          ) : (
            <>
              <svg className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0 transition-colors ${isOpen ? "text-emerald-500" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="4" y="5" width="16" height="16" rx="4" ry="4" />
                <line x1="16" y1="3" x2="16" y2="7" />
                <line x1="8" y1="3" x2="8" y2="7" />
                <line x1="4" y1="11" x2="20" y2="11" />
              </svg>
              <span className={textClasses}>
                {formatDate(value)}
              </span>
            </>
          )}
        </button>

        {mounted && !isMobile && isOpen && (
          <div 
            ref={dropdownRef}
            className="absolute z-[99999] top-[calc(100%+8px)] right-0 mt-1 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <CustomCalendar 
              selectedDate={value} 
              minDate={minDate}
              maxDate={maxDate}
              onSelect={onChange}
              onClose={() => setIsOpen(false)} 
            />
          </div>
        )}
      </div>
      {mounted && typeof document !== "undefined" && isMobile && createPortal(portalContentMobile, document.body)}
    </>
  );
}
