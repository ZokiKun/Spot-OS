import type { ReactNode } from "react";
import { cn } from "@/directions/d3/lib/utils";

export interface Stat {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "danger" | "good";
  icon?: ReactNode;
}

/** Duolingo "Statistics" tiles: icon, big number, small label. */
export function StatRow({ stats, className, columns }: { stats: Stat[]; className?: string; columns?: 2 | 3 | 4 }) {
  const cols = columns ?? (stats.length >= 4 ? 4 : stats.length === 3 ? 3 : 2);
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3",
        cols === 4 && "lg:grid-cols-4",
        cols === 3 && "sm:grid-cols-3",
        className,
      )}
    >
      {stats.map((s) => (
        <div key={s.label} className="flex min-w-0 items-start gap-2.5 rounded-2xl border-2 border-line px-3.5 py-3">
          {s.icon && <span className="mt-0.5 shrink-0 text-[22px] leading-none">{s.icon}</span>}
          <div className="min-w-0">
            <div
              className={cn(
                "truncate text-[20px] font-black leading-tight tabular",
                s.tone === "danger" && "text-red",
                s.tone === "good" && "text-green-edge",
              )}
            >
              {s.value}
            </div>
            <div className="text-[13px] font-bold leading-snug text-fg-2">{s.label}</div>
            {s.sub && <div className="mt-0.5 truncate text-[12px] font-semibold text-fg-3">{s.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
