import Link from "next/link";

interface ListRowItemProps {
  title: string;
  description?: string;
  href: string;
  icon?: React.ReactNode;
  rightText?: string;
  rightSubText?: string;
  badge?: {
    label: string;
    color?: "green" | "amber" | "red" | "slate";
  };
  variant?: "row" | "card";
}

export default function ListRowItem({
  title,
  description,
  href,
  icon,
  rightText,
  rightSubText,
  badge,
  variant = "row",
}: ListRowItemProps) {
  const badgeColors = {
    green: "bg-tally-100 text-tally-700",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-rose-100 text-rose-600",
    slate: "bg-slate-100 text-slate-600",
  };

  if (variant === "card") {
    return (
      <Link
        href={href}
        className="group flex flex-row lg:flex-col items-center lg:items-start gap-3 lg:gap-0 rounded-[20px] bg-white border border-slate-100 p-4 lg:p-5 transition-all duration-300 hover:bg-white hover:shadow-[0_12px_30px_rgba(82,183,136,0.08)] hover:border-tally-500/30 lg:hover:-translate-y-1 shadow-[0_2px_8px_rgba(15,23,42,0.01)]"
      >
        <div className="flex w-full items-center lg:items-start justify-between">
          <div className="flex items-center gap-3 lg:gap-0">
            {icon && (
              <div className="flex h-10 w-10 lg:h-11 lg:w-11 shrink-0 items-center justify-center rounded-xl lg:rounded-[14px] bg-tally-50 text-tally-700 transition-all duration-300 group-hover:scale-105 group-hover:bg-tally-100/80">
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1 lg:hidden">
              <p className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-snug">{title}</p>
              {description && <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-500 leading-normal">{description}</p>}
            </div>
          </div>
          
          <div className="flex shrink-0 items-center gap-2 lg:gap-3">
            {badge && (
              <span className={`rounded-full px-2.5 py-1 text-[10px] lg:text-xs font-bold uppercase tracking-[0.14em] ${badgeColors[badge.color || "slate"]}`}>
                {badge.label}
              </span>
            )}
            <svg className="h-5 w-5 lg:h-[22px] lg:w-[22px] shrink-0 text-slate-300 transition-all duration-300 group-hover:text-tally-600 lg:group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </div>
        
        <div className="hidden lg:block mt-3.5 w-full">
          <p className="text-base lg:text-[17px] xl:text-[18px] font-bold tracking-tight text-slate-900 group-hover:text-tally-700 transition-colors leading-tight">{title}</p>
          {description && <p className="mt-1 text-xs lg:text-[13px] font-medium text-slate-400 leading-normal">{description}</p>}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-2xl px-4 py-4 transition-all duration-300 hover:bg-white hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:items-center sm:px-6 sm:gap-4 lg:py-5 lg:px-6 xl:py-6 xl:px-8 lg:gap-5"
    >
      {icon && (
        <div className="flex h-11 w-11 sm:h-12 sm:w-12 lg:h-14 lg:w-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl lg:rounded-[20px] bg-tally-50 text-tally-700 transition-all duration-300 group-hover:scale-110 group-hover:bg-tally-100">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-base sm:text-lg lg:text-xl font-semibold tracking-tight text-slate-900">{title}</p>
        {description && <p className="mt-1 truncate text-sm sm:text-[15px] lg:text-base text-slate-500">{description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3 lg:gap-4 self-center">
        {badge && (
          <span className={`rounded-full px-3 py-1.5 lg:px-4 lg:py-2 text-xs lg:text-sm font-semibold uppercase tracking-[0.14em] ${badgeColors[badge.color || "slate"]}`}>
            {badge.label}
          </span>
        )}
        {rightText && (
          <div className="text-right min-w-0">
            <p className="text-sm sm:text-base lg:text-lg font-semibold text-slate-700 truncate">{rightText}</p>
            {rightSubText && <p className="text-xs sm:text-sm lg:text-[15px] text-slate-500 truncate">{rightSubText}</p>}
          </div>
        )}
        <svg className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </Link>
  );
}
