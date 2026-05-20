/**
 * ListRowItem — A clickable row with an icon, title/description, and a chevron.
 * Used in "ACCOUNT BOOKS", "RECENT ACTIVITY", and "PENDING ATTENTION".
 */

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
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-600",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors group"
    >
      {icon && (
        <div className="w-9 h-9 rounded-lg bg-tally-50 flex items-center justify-center text-tally-700 flex-shrink-0 group-hover:bg-tally-100 transition-colors">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{title}</p>
        {description && (
          <p className="text-xs text-slate-400 truncate mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {badge && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeColors[badge.color || "slate"]}`}>
            {badge.label}
          </span>
        )}
        {rightText && (
          <div className="text-right">
            <p className="text-xs font-medium text-slate-600">{rightText}</p>
            {rightSubText && <p className="text-[10px] text-slate-400">{rightSubText}</p>}
          </div>
        )}
        <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </Link>
  );
}
