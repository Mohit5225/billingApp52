/**
 * ActionIconCard — A square quick-action button with an icon and label.
 * Used in the "CREATE TRANSACTIONS" grid.
 */

import Link from "next/link";

interface ActionIconCardProps {
  label: string;
  href: string;
  icon: React.ReactNode;
  variant?: "default" | "green" | "red";
}

export default function ActionIconCard({ label, href, icon, variant = "default" }: ActionIconCardProps) {
  const variantStyles = {
    default: "text-tally-700 bg-tally-50/50 group-hover:bg-tally-100/70",
    green: "text-tally-600 bg-tally-100 group-hover:bg-tally-200/70",
    red: "text-red-soft bg-red-50 group-hover:bg-red-100/70",
  };

  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-2.5 p-4 rounded-xl border border-slate-100 bg-white hover:border-tally-200 hover:shadow-sm transition-all duration-200"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${variantStyles[variant]}`}>
        {icon}
      </div>
      <span className="text-xs font-medium text-slate-600 text-center leading-tight group-hover:text-slate-900 transition-colors">
        {label}
      </span>
    </Link>
  );
}
