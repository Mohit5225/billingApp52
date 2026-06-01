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
  const sparklinePoints =
    trend === "up"
      ? "M0,40 C20,35 30,30 50,25 C70,20 80,15 100,8 C120,12 130,10 150,5"
      : trend === "down"
        ? "M0,10 C20,12 30,15 50,20 C70,28 80,32 100,35 C120,33 130,38 150,40"
        : "M0,25 C20,22 30,28 50,25 C70,22 80,28 100,25 C120,22 130,28 150,25";

  return (
    <div className="group relative overflow-hidden rounded-2xl sm:rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,255,255,0.78))] p-5 sm:p-7 shadow-[0_18px_38px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_26px_52px_rgba(15,23,42,0.12)]">
      <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(82,183,136,0.14),transparent_70%)] opacity-80" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[75%] w-[45%] sm:w-[60%] opacity-20">
        <svg viewBox="0 0 150 45" preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id={`grad-${label.replace(/\s/g, "")}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.4" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${sparklinePoints} L150,45 L0,45 Z`}
            fill={`url(#grad-${label.replace(/\s/g, "")})`}
          />
          <path
            d={sparklinePoints}
            fill="none"
            stroke={accentColor}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="relative z-10">
        <div className="mb-4 sm:mb-5 flex items-center gap-2.5">
          <p className="text-xs sm:text-[13px] font-semibold uppercase tracking-[0.24em] text-slate-500 truncate" title={label}>{label}</p>
          <svg className="h-5 w-5 sm:h-6 sm:w-6 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
        </div>
        <p className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-950 mono-num truncate" title={amount}>
          {amount}
        </p>
        {subtitle && <p className="mt-2.5 text-sm sm:text-base font-medium text-slate-500 truncate" title={subtitle}>{subtitle}</p>}
      </div>
    </div>
  );
}
