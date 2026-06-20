"use client";

import { useState } from "react";

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

export interface CustomCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
  minDate?: string;
  maxDate?: string;
  onClose: () => void;
}

export function CustomCalendar({ selectedDate, onSelect, minDate, maxDate, onClose }: CustomCalendarProps) {
  const [tempDate, setTempDate] = useState(selectedDate);
  const initialDate = tempDate ? new Date(tempDate) : new Date();
  const [viewDate, setViewDate] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const [currentView, setCurrentView] = useState<"days" | "months" | "years">("days");

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const startYear = year - (year % 12);
  const years = Array.from({ length: 12 }, (_, i) => startYear + i);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  const handleSelectDay = (day: number) => {
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setTempDate(formattedDate);
  };

  const handleSave = () => {
    onSelect(tempDate);
    onClose();
  };

  return (
    <div className="w-[300px] p-4 bg-white rounded-[24px] shadow-2xl shadow-slate-900/10 border border-slate-200/80 z-50 animate-in fade-in zoom-in-95 duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <button 
          onClick={(e) => { e.preventDefault(); setCurrentView(currentView === "months" ? "days" : "months"); }}
          className={`px-4 py-2 rounded-xl text-[16px] font-bold transition-colors ${currentView === "months" ? "bg-slate-100 text-slate-900" : "text-slate-800 hover:bg-slate-50"}`}
        >
          {monthNames[month]}
        </button>
        <button 
          onClick={(e) => { e.preventDefault(); setCurrentView(currentView === "years" ? "days" : "years"); }}
          className={`px-4 py-2 rounded-xl text-[16px] font-bold transition-colors ${currentView === "years" ? "bg-slate-100 text-slate-900" : "text-slate-800 hover:bg-slate-50"}`}
        >
          {year}
        </button>
      </div>

      {/* Grid */}
      <div className="min-h-[230px]">
        {currentView === "days" && (
          <>
            <div className="grid grid-cols-7 gap-1 mb-3">
              {dayNames.map(d => (
                <div key={d} className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} />;
                
                const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                let isSelected = formattedDate === tempDate;
                let isDisabled = false;
                if (minDate && formattedDate < minDate) isDisabled = true;
                if (maxDate && formattedDate > maxDate) isDisabled = true;
                const isToday = formattedDate === new Date().toISOString().split('T')[0];

                return (
                  <button
                    key={day}
                    disabled={isDisabled}
                    onClick={(e) => { e.preventDefault(); handleSelectDay(day); }}
                    className={`
                      h-9 w-full rounded-xl text-sm font-semibold flex items-center justify-center transition-all
                      ${isDisabled ? "text-slate-300 cursor-not-allowed" : "hover:bg-slate-100 cursor-pointer"}
                      ${isSelected && !isDisabled ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-500/30" : "text-slate-700"}
                      ${isToday && !isSelected ? "text-emerald-600" : ""}
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {currentView === "months" && (
          <div className="grid grid-cols-3 gap-2 h-full content-center pt-2">
            {monthNames.map((m, i) => (
              <button
                key={m}
                onClick={(e) => { 
                  e.preventDefault(); 
                  setViewDate(new Date(year, i, 1));
                  setTempDate(`${year}-${String(i + 1).padStart(2, '0')}-01`);
                  setCurrentView("days");
                }}
                className={`
                  h-12 w-full rounded-xl text-sm font-bold flex items-center justify-center transition-all
                  ${i === month ? "bg-slate-800 text-white shadow-md shadow-slate-900/20" : "text-slate-700 hover:bg-slate-100"}
                `}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {currentView === "years" && (
          <div className="flex flex-col h-full pt-2">
            <div className="grid grid-cols-3 gap-2 flex-1">
              {years.map(y => (
                <button
                  key={y}
                  onClick={(e) => { 
                    e.preventDefault(); 
                    setViewDate(new Date(y, month, 1));
                    setTempDate(`${y}-${String(month + 1).padStart(2, '0')}-01`);
                    setCurrentView("days");
                  }}
                  className={`
                    h-12 w-full rounded-xl text-sm font-bold flex items-center justify-center transition-all
                    ${y === year ? "bg-slate-800 text-white shadow-md shadow-slate-900/20" : "text-slate-700 hover:bg-slate-100"}
                  `}
                >
                  {y}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-3 pt-3 border-t border-slate-100">
              <button onClick={(e) => { e.preventDefault(); setViewDate(new Date(startYear - 12, month, 1)); }} className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">Previous</button>
              <button onClick={(e) => { e.preventDefault(); setViewDate(new Date(startYear + 12, month, 1)); }} className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Apply Button */}
      {currentView === "days" && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <button
            onClick={(e) => { e.preventDefault(); handleSave(); }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-3 px-4 rounded-[14px] transition-all shadow-sm shadow-emerald-900/10 active:scale-[0.98]"
          >
            Apply Date
          </button>
        </div>
      )}
    </div>
  );
}
