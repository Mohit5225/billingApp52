"use client";

import { usePathname } from "next/navigation";

export default function DashboardLoading() {
  const pathname = usePathname();

  const getLoadingText = (path: string) => {
    if (!path || path === "/dashboard") return "dashboard";
    const parts = path.split("/").filter(Boolean);
    if (parts.length > 1 && parts[0] === "dashboard") {
      const section = parts[1];
      return section.replace(/-/g, " ");
    }
    return "dashboard";
  };

  return (
    <div className="flex flex-1 min-h-[50vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* Orbital glowing loader */}
        <div className="relative flex items-center justify-center w-24 h-24">
          {/* Soft background glow (removed animate-pulse to fix frame drops) */}
          <div className="absolute w-20 h-20 rounded-full bg-tally-500/10 blur-xl" />
          
          {/* Ring Track */}
          <div className="absolute w-16 h-16 rounded-full border border-tally-500/10" />
          
          {/* Outer Orbiting Dot (Green) */}
          <div className="absolute w-16 h-16 animate-[spin_2s_linear_infinite]">
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-tally-600 shadow-[0_0_12px_rgba(82,183,136,0.8)]" />
          </div>

          {/* Inner Orbiting Dot (Orange) - Counter-rotating */}
          <div className="absolute w-16 h-16 animate-[spin_3s_linear_infinite_reverse]">
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
          </div>
          
          {/* Core pulse */}
          <div className="absolute w-6 h-6 rounded-full bg-tally-500/5 border border-tally-500/10 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-tally-600 animate-pulse shadow-[0_0_8px_rgba(82,183,136,0.6)]" />
          </div>
        </div>

        {/* Elegant Loading Typography */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-bold tracking-[0.3em] text-tally-600/80 uppercase">Loading System</span>
          <div className="flex items-center text-sm font-medium text-slate-500 dark:text-slate-400 capitalize">
            <span>{getLoadingText(pathname)}</span>
            <span className="inline-flex gap-1 ml-1.5">
              <span className="w-1 h-1 rounded-full bg-tally-500 animate-[bounce_1.2s_infinite_-0.3s]" />
              <span className="w-1 h-1 rounded-full bg-tally-500 animate-[bounce_1.2s_infinite_-0.15s]" />
              <span className="w-1 h-1 rounded-full bg-tally-500 animate-[bounce_1.2s_infinite]" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
