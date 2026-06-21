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
}

export function DatePicker({ value, onChange, minDate, maxDate, className = "", disabled = false }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, origin: "top" });

  // Mount check and resize listener for responsive state
  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile(); // Check immediately on mount
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Recalculate popup coordinates dynamically to prevent any clipping/overlap
  const updatePosition = () => {
    if (!isOpen || isMobile || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const dropdownHeight = 420; // Estimated max height of CustomCalendar
    const dropdownWidth = 300; // Fixed width of CustomCalendar
    
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    let top = 0;
    let origin = "top";
    
    // Intelligently decide whether to display above or below
    if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
      top = rect.top + window.scrollY - dropdownHeight - 8;
      origin = "bottom";
    } else {
      top = rect.bottom + window.scrollY + 8;
      origin = "top";
    }
    
    let left = rect.left + window.scrollX;
    
    // Intelligently restrict horizontal positioning to keep it in the viewport
    if (left + dropdownWidth > window.innerWidth - 16) {
      left = window.innerWidth - dropdownWidth - 16;
    }
    if (left < 16) {
      left = 16;
    }
    
    setCoords({ top, left, origin });
  };

  // Manage positioning lifecycle, scroll pinning, and body locking for mobile
  useEffect(() => {
    if (isOpen && !isMobile) {
      updatePosition();
      // Use capture phase to catch scroll events from any nested scrollable parent containers
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
    }
    
    if (isOpen && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
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

  // The portal safely breaks out of all parent boundaries and clipping contexts
  const portalContent = isOpen && mounted ? (
    isMobile ? (
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
    ) : (
      <div 
        ref={dropdownRef}
        className={`absolute z-[99999] animate-in fade-in duration-200 ${coords.origin === "bottom" ? "slide-in-from-bottom-2" : "slide-in-from-top-2"}`}
        style={{ top: coords.top, left: coords.left }}
      >
        <CustomCalendar 
          selectedDate={value} 
          minDate={minDate}
          maxDate={maxDate}
          onSelect={onChange}
          onClose={() => setIsOpen(false)} 
        />
      </div>
    )
  ) : null;

  return (
    <>
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
      </div>
      {mounted && typeof document !== "undefined" && createPortal(portalContent, document.body)}
    </>
  );
}
