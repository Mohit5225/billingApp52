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
}

export default function ListRowItem({
  title,
  description,
  href,
  icon,
  rightText,
  rightSubText,
  badge,
}: ListRowItemProps) {
  const badgeColors = {
    green: "bg-tally-100 text-tally-700",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-rose-100 text-rose-600",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-2xl px-4 py-4 transition-colors hover:bg-slate-50/90 sm:items-center sm:px-6 sm:gap-4"
    >
      {icon && (
        <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-tally-50 text-tally-700 transition-colors group-hover:bg-tally-100">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-base sm:text-lg font-semibold text-slate-900">{title}</p>
        {description && <p className="mt-1.5 truncate text-sm sm:text-[15px] text-slate-500">{description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3 self-center">
        {badge && (
          <span className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${badgeColors[badge.color || "slate"]}`}>
            {badge.label}
          </span>
        )}
        {rightText && (
          <div className="text-right min-w-0">
            <p className="text-sm sm:text-base font-semibold text-slate-700 truncate">{rightText}</p>
            {rightSubText && <p className="text-xs sm:text-sm text-slate-500 truncate">{rightSubText}</p>}
          </div>
        )}
        <svg className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </Link>
  );
}
