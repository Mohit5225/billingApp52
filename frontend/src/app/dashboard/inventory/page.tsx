"use client";

import { useQuery } from "@tanstack/react-query";
import { DashboardOverview } from "@/interfaces/workspace";
import { apiRequest } from "@/lib/http";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useFirmScope } from "../shared/useFirmScope";
import { useToast } from "@/context/ToastContext";

import KpiCard from "../components/KpiCard";
import ListRowItem from "../components/ListRowItem";

const BoxIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
);

const ScaleIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
  </svg>
);

const LINKS = [
  {
    title: "Item Masters",
    href: "/dashboard/inventory/items",
    description: "Maintain sellable and purchasable stock",
    icon: <BoxIcon />
  },
  {
    title: "Unit of Measure",
    href: "/dashboard/inventory/uom",
    description: "Keep GST-ready units clean",
    icon: <ScaleIcon />
  },
  {
    title: "Stock Summary",
    href: "/dashboard/inventory/stock-summary",
    description: "Live inward, outward, and closing balances",
    icon: <ChartIcon />
  },
];

export default function InventoryHubPage() {
  const { activeFirmId, supabase } = useFirmScope();
  const { showToast } = useToast();

  const { data: overview, isLoading } = useQuery({
    queryKey: ["overview", activeFirmId],
    queryFn: () =>
      apiRequest<DashboardOverview>(supabase, "/api/workspace/overview", {
        query: { firm_id: activeFirmId },
      }),
    enabled: !!activeFirmId,
  });

  return (
    <div className="mx-auto w-full space-y-6 lg:space-y-8">
      {/* KPIs */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Total Items"
          amount={String(overview?.inventory.items_count ?? 0)}
          subtitle="Active item masters"
          trend="up"
          accentColor="#40916C"
          isLoading={isLoading}
        />
        <KpiCard
          label="Measurement Units"
          amount={String(overview?.inventory.uom_count ?? 0)}
          subtitle="Configured UOMs"
          trend="flat"
          accentColor="#D49735"
          isLoading={isLoading}
        />
        <KpiCard
          label="Closing Stock Value"
          amount={formatCurrency(overview?.inventory.closing_value ?? 0)}
          subtitle={`${formatNumber(overview?.inventory.closing_quantity ?? 0)} units in stock flow`}
          trend="up"
          accentColor="#2563EB"
          isLoading={isLoading}
        />
      </div>

      {/* Links Surface */}
      <section className="rounded-2xl sm:rounded-[32px] border border-white/70 bg-white/78 p-4 sm:p-6 lg:p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:mb-8">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Inventory Workspace</p>
            <h3 className="mt-1 text-lg sm:text-2xl font-semibold tracking-tight text-slate-950">Management Actions</h3>
          </div>
        </div>

        <div className="grid gap-2 sm:gap-3 grid-cols-1 lg:grid-cols-3 rounded-2xl sm:rounded-[28px] border border-slate-100 bg-white/90 p-2 sm:p-3">
          {LINKS.map((link) => (
            <ListRowItem
              key={link.title}
              title={link.title}
              description={link.description}
              href={link.href}
              icon={link.icon}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
