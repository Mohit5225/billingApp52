import type { ReactNode } from "react";

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,rgba(18,58,41,0.96),rgba(33,92,70,0.92))] px-6 py-7 text-white shadow-[0_24px_60px_rgba(15,23,42,0.14)] sm:px-8 sm:py-9">
      <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(216,243,220,0.28),transparent_58%)]" />
      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-white/72 sm:text-base">{description}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

export function SurfaceCard({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
          {description ? <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function MetricTile({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-100 bg-white/90 p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
      {helper ? <p className="mt-2 text-sm text-slate-500">{helper}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-12 text-center">
      <p className="text-base font-semibold text-slate-800">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}
