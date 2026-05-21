import Link from "next/link";

interface ActionIconCardProps {
  label: string;
  href: string;
  icon: React.ReactNode;
  variant?: "default" | "green" | "red";
}

export default function ActionIconCard({ label, href, icon, variant = "default" }: ActionIconCardProps) {
  const variantStyles = {
    default: "bg-tally-50 text-tally-700 group-hover:bg-tally-100",
    green: "bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200/80",
    red: "bg-rose-50 text-rose-500 group-hover:bg-rose-100/80",
  };

  return (
    <Link
      href={href}
      className="group flex min-h-[136px] flex-col justify-between rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.8))] p-4 text-left shadow-[0_16px_34px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_24px_48px_rgba(15,23,42,0.1)] sm:min-h-[148px] sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${variantStyles[variant]}`}>
          {icon}
        </div>
        <svg className="h-5 w-5 text-slate-300 transition group-hover:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 16.5 16.5 7.5m0 0H9.75m6.75 0v6.75" />
        </svg>
      </div>
      <div className="space-y-1">
        <span className="block text-sm font-semibold leading-snug text-slate-900">{label}</span>
        <span className="block text-xs leading-5 text-slate-500">
          Jump into a focused creation flow.
        </span>
      </div>
    </Link>
  );
}
