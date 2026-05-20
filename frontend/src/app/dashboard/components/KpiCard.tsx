/**
 * KPI Card — Displays a big number with a label and an inline sparkline.
 * Used for "Total Sales", "Total Purchases", etc.
 */

interface KpiCardProps {
  label: string;
  amount: string;
  subtitle?: string;
  trend?: "up" | "down" | "flat";
  accentColor?: string;
}

export default function KpiCard({
  label,
  amount,
  subtitle,
  trend = "up",
  accentColor = "#40916C",
}: KpiCardProps) {
  // Generate a simple SVG sparkline path
  const sparklinePoints =
    trend === "up"
      ? "M0,40 C20,35 30,30 50,25 C70,20 80,15 100,8 C120,12 130,10 150,5"
      : trend === "down"
      ? "M0,10 C20,12 30,15 50,20 C70,28 80,32 100,35 C120,33 130,38 150,40"
      : "M0,25 C20,22 30,28 50,25 C70,22 80,28 100,25 C120,22 130,28 150,25";

  return (
    <div className="relative bg-white rounded-2xl border border-slate-100 p-5 lg:p-6 overflow-hidden group hover:shadow-md transition-shadow duration-300">
      {/* Sparkline Background */}
      <div className="absolute right-0 bottom-0 w-[55%] h-[70%] opacity-15 pointer-events-none">
        <svg viewBox="0 0 150 45" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id={`grad-${label.replace(/\s/g, "")}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.4" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={sparklinePoints + " L150,45 L0,45 Z"}
            fill={`url(#grad-${label.replace(/\s/g, "")})`}
          />
          <path
            d={sparklinePoints}
            fill="none"
            stroke={accentColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center gap-1.5 mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
        </div>
        <p className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
          <span className="text-lg lg:text-xl font-semibold mr-0.5">₹</span>
          {amount}
        </p>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-1.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
