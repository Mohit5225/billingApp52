"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavChild {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: NavChild[];
}

const NAV_ITEMS: NavItem[] = [
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
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
    children: [
      { label: "Sales Invoice", href: "/dashboard/create/sales-invoice" },
      { label: "Purchase Invoice", href: "/dashboard/create/purchase-invoice" },
      { label: "Receipt", href: "/dashboard/create/receipt" },
      { label: "Payment", href: "/dashboard/create/payment" },
      { label: "Debit Note", href: "/dashboard/create/debit-note" },
      { label: "Credit Note", href: "/dashboard/create/credit-note" },
      { label: "Journal Entry", href: "/dashboard/create/journal-entry" },
      { label: "Contra Entry", href: "/dashboard/create/contra-entry" },
      { label: "Ledger", href: "/dashboard/create/ledger" },
    ],
  },
  {
    label: "Inventory",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5 12 3 3 7.5m18 0v9L12 21m9-13.5-9 4.5m0 9V12m0 0L3 7.5" />
      </svg>
    ),
    children: [
      { label: "Inventory Hub", href: "/dashboard/inventory" },
      { label: "Items", href: "/dashboard/inventory/items" },
      { label: "UOM", href: "/dashboard/inventory/uom" },
      { label: "Stock Position", href: "/dashboard/inventory/stock-position" },
    ],
  },
  {
    label: "Books",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    children: [
      { label: "Sales Register", href: "/dashboard/books/sales-register" },
      { label: "Purchase Register", href: "/dashboard/books/purchase-register" },
      { label: "Receipt Register", href: "/dashboard/books/receipt-register" },
      { label: "Payment Register", href: "/dashboard/books/payment-register" },
      { label: "Debit Note Reg.", href: "/dashboard/books/debit-note-register" },
      { label: "Credit Note Reg.", href: "/dashboard/books/credit-note-register" },
      { label: "Journal Register", href: "/dashboard/books/journal-register" },
      { label: "Contra Register", href: "/dashboard/books/contra-register" },
      { label: "Day Book", href: "/dashboard/books/day-book" },
      { label: "Cash Book", href: "/dashboard/books/cash-book" },
      { label: "Ledger", href: "/dashboard/books/ledger" },
    ],
  },
  {
    label: "Settings",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
    children: [
      { label: "Configure a bill template", href: "/dashboard/settings/bill-template" },
      { label: "Firm Details", href: "/dashboard/settings/firm-details" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const isActive = (href?: string) => Boolean(href && (pathname === href || pathname.startsWith(`${href}/`)));

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[320px] border-r border-white/10 bg-[linear-gradient(180deg,#173728_0%,#10281d_100%)] text-white shadow-[18px_0_48px_rgba(7,18,13,0.18)] lg:flex">
      <div className="flex w-full flex-col px-5 py-6">
        {/* Workspace Profile Dropdown Switcher */}
        <Link href="/dashboard" className="group rounded-2xl border border-white/10 bg-white/6 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 hover:bg-white/10 hover:border-white/20 active:scale-[0.98]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tally-400 font-bold text-tally-900 shadow-lg shadow-black/10">
                B
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/50">Workspace</p>
                <span className="mt-0.5 block truncate text-base font-semibold tracking-tight text-white group-hover:text-emerald-50">BillingApp</span>
              </div>
            </div>
            <svg className="h-4 w-4 text-white/30 transition-transform duration-200 group-hover:text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </Link>

        {/* Command Search Bar */}
        <button
          onClick={() => {}}
          className="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-[15px] text-white/50 transition-all hover:bg-white/10 hover:text-white hover:border-white/20"
        >
          <span className="flex items-center gap-2.5">
            <svg className="h-4 w-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" />
            </svg>
            Search or Command...
          </span>
          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-white/50 tracking-widest">⌘K</span>
        </button>

        <div className="mt-6 px-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/35">Navigation</p>
        </div>

        <nav className="mt-3 flex-1 space-y-1 overflow-y-auto px-1 pb-5 custom-scrollbar">
          {NAV_ITEMS.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const childIsActive = item.children?.some((child) => pathname.startsWith(child.href)) ?? false;
            const isOpen = expandedSections[item.label] ?? childIsActive;
            const active = isActive(item.href);

            if (hasChildren) {
              return (
                <div key={item.label} className="space-y-0.5">
                  <button
                    onClick={() => toggleSection(item.label)}
                    className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-[16px] font-medium transition-all ${isOpen || childIsActive
                        ? "text-white"
                        : "text-white/72 hover:bg-white/6 hover:text-white"
                      }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`transition-colors duration-200 ${childIsActive ? "text-tally-300" : "text-white/75 group-hover:text-white"}`}>
                        {item.icon}
                      </span>
                      {item.label}
                    </span>
                    <svg className={`h-4 w-4 text-white/30 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? "rotate-180 text-white/70" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>

                  <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"}`}>
                    <div className="overflow-hidden">
                      <div className="ml-[25px] border-l border-white/10 pl-4 space-y-0.5 pb-2 pt-1">
                        {item.children!.map((child) => {
                          const subActive = pathname.startsWith(child.href);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`group relative flex items-center rounded-lg px-3 py-2 text-[15px] leading-5 transition-all ${subActive
                                  ? "bg-white/10 font-semibold text-tally-200"
                                  : "text-white/55 hover:bg-white/6 hover:text-white/88"
                                }`}
                            >
                              {subActive && (
                                <div className="absolute left-[-17px] top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-tally-300 shadow-[0_0_6px_rgba(194,240,213,0.6)]" />
                              )}
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href!}
                className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-[16px] font-medium transition-all ${active
                    ? "bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    : "text-white/72 hover:bg-white/6 hover:text-white"
                  }`}
              >
                {active && (
                  <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-md bg-tally-300 shadow-[0_0_8px_rgba(194,240,213,0.6)]" />
                )}
                <span className={`transition-colors duration-200 ${active ? "text-tally-300" : "text-white/75 group-hover:text-white"}`}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Streamlined Footer Firm Switcher */}
        <div className="mt-auto space-y-3 border-t border-white/10 pt-5">
          <Link href="/firms" className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/6 px-4 py-3.5 text-[15px] font-medium text-white/75 transition-all hover:bg-white/10 hover:text-white">
            <span className="flex items-center gap-3">
              <svg className="h-4 w-4 text-white/60 group-hover:text-tally-300 transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
              Switch Firm
            </span>
            <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[8px] font-semibold text-white/40 tracking-wider">Ctrl+S</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
