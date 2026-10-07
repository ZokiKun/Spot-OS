import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Stat {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "danger" | "good";
}

/** Hairline-divided figures — calmer than cards, reads at a glance. */
export function StatRow({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <div
      className={cn(
        "grid gap-px overflow-hidden rounded-lg bg-line shadow-[0_0_0_1px_var(--border)]",
        stats.length >= 4 ? "grid-cols-2 lg:grid-cols-4" : stats.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2",
        className,
      )}
    >
      {stats.map((s) => (
        <div key={s.label} className="bg-bg px-4 py-3.5">
          <div className="text-[12px] text-fg-2">{s.label}</div>
          <div
            className={cn(
              "mt-1 text-[22px] font-semibold leading-tight tabular tracking-[-0.01em]",
              s.tone === "danger" && "text-danger",
              s.tone === "good" && "text-[var(--success)]",
            )}
          >
            {s.value}
          </div>
          {s.sub && <div className="mt-1 text-[12px] text-fg-3">{s.sub}</div>}
        </div>
      ))}
    </div>
  );
}
