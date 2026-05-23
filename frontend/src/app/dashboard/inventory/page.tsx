"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { DashboardOverview } from "@/interfaces/workspace";
import { apiRequest } from "@/lib/http";
import { formatCurrency, formatNumber } from "@/lib/format";

import { MetricTile, PageHero, SurfaceCard } from "../shared/WorkspaceUi";
import { useFirmScope } from "../shared/useFirmScope";

const LINKS = [
  {
    title: "Items",
    href: "/dashboard/inventory/items",
    description: "Maintain sellable and purchasable stock masters with GST defaults, UOM, and opening balances.",
  },
  {
    title: "HSN / SAC",
    href: "/dashboard/inventory/hsn",
    description: "Curate statutory code masters that item setup and invoice entry depend on.",
  },
  {
    title: "UOM",
    href: "/dashboard/inventory/uom",
    description: "Keep GST-ready units clean so voucher quantity entry stays consistent across devices.",
  },
  {
    title: "Stock Position",
    href: "/dashboard/inventory/stock-position",
    description: "See opening balances, inward, outward, and live closing quantity without browser-side math.",
  },
];

export default function InventoryHubPage() {
  const { activeFirmId, supabase } = useFirmScope();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeFirmId) return;

    let mounted = true;
    const load = async () => {
      try {
        setError(null);
        const data = await apiRequest<DashboardOverview>(supabase, "/api/workspace/overview", {
          query: { firm_id: activeFirmId },
        });
        if (mounted) setOverview(data);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Unable to load inventory overview");
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [activeFirmId, supabase]);

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Inventory"
        title="Manage stock masters without losing accounting context."
        description="Inventory stays close to vouchers here: build clean item masters, lock HSN and UOM, then step into stock position with the same warm dashboard treatment."
      />

      {error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Items"
          value={String(overview?.inventory.items_count ?? 0)}
          helper="Active item masters"
        />
        <MetricTile
          label="Codes"
          value={String(overview?.inventory.hsn_count ?? 0)}
          helper="HSN / SAC records"
        />
        <MetricTile
          label="Units"
          value={String(overview?.inventory.uom_count ?? 0)}
          helper="Measurement definitions"
        />
        <MetricTile
          label="Closing Stock"
          value={formatCurrency(overview?.inventory.closing_value ?? 0)}
          helper={`${formatNumber(overview?.inventory.closing_quantity ?? 0)} units across tracked items`}
        />
      </div>

      <SurfaceCard
        title="Inventory workspace"
        description="Jump into the exact master or operational view you need. Each page is tuned for quick edits on desktop and phone."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-[28px] border border-slate-100 bg-white/92 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-slate-950">{link.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{link.description}</p>
                </div>
                <div className="rounded-2xl bg-tally-50 p-3 text-tally-700 transition group-hover:bg-tally-100">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 16.5 16.5 7.5m0 0H9.75m6.75 0v6.75" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}
