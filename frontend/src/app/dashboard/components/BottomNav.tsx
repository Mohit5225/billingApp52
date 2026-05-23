"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BOTTOM_TABS = [
  {
    label: "Home",
    href: "/dashboard",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    label: "Create",
    href: "/dashboard/create",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    label: "Books",
    href: "/dashboard/books",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    label: "Inventory",
    href: "/dashboard/inventory",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5 12 3 3 7.5m18 0v9L12 21m9-13.5-9 4.5m0 9V12m0 0L3 7.5" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 lg:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-1 rounded-[28px] border border-white/70 bg-white/88 p-2 shadow-[0_18px_40px_rgba(15,23,42,0.18)] backdrop-blur-xl">
        {BOTTOM_TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 transition-all ${
                isActive
                  ? "bg-tally-50 text-tally-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <div className={`rounded-2xl p-1.5 transition-all ${isActive ? "bg-tally-100 text-tally-800" : ""}`}>
                {tab.icon}
              </div>
              <span className={`truncate text-[11px] ${isActive ? "font-semibold" : "font-medium"}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
