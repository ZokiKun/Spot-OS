"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface BarDatum {
  key: string;
  label: string; // short axis label, e.g. "Oct"
  value: number;
  title?: string; // tooltip heading, e.g. "October 2026"
}

const H = 132; // plot height (px)
const AXIS = 20;

/**
 * Single-series column chart: thin rounded bars on a recessive baseline,
 * the last (current) period full-strength and earlier periods muted.
 * One series → no legend; the card title names it. Hover shows the exact value.
 */
export function BarChart({
  data,
  format = (v) => String(v),
  hidden = false,
  tone = "blue",
  className,
}: {
  data: BarDatum[];
  format?: (v: number) => string;
  /** Finance values hidden: draw nothing but the frame. */
  hidden?: boolean;
  tone?: "blue" | "green" | "red" | "purple";
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => Math.abs(d.value)));
  const last = data.length - 1;
  const color = `var(--dot-${tone})`;
  const h = hover != null ? data[hover] : null;

  return (
    <div className={cn("relative", className)} onMouseLeave={() => setHover(null)}>
      <div className="flex items-end gap-[2px]" style={{ height: H }} role="img" aria-label={data.map((d) => `${d.title ?? d.label}: ${hidden ? "hidden" : format(d.value)}`).join(", ")}>
        {data.map((d, i) => {
          const pct = hidden ? 0 : (Math.max(0, d.value) / max) * 100;
          return (
            <div
              key={d.key}
              className="group relative flex h-full flex-1 cursor-default items-end justify-center"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              tabIndex={0}
            >
              {/* hit target is the whole column, bigger than the mark */}
              <span
                className={cn("w-full max-w-[34px] rounded-t-[4px] transition-[height,opacity] duration-300", d.value > 0 && !hidden && "min-h-[2px]")}
                style={{ height: `${pct}%`, background: color, opacity: i === last ? 1 : hover === i ? 0.75 : 0.4 }}
              />
            </div>
          );
        })}
      </div>
      {hidden && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center text-[12px] text-fg-3" style={{ height: H }}>
          Values hidden — use Reveal values
        </div>
      )}
      <div className="border-t border-line-strong" />
      <div className="flex gap-[2px]" style={{ height: AXIS }}>
        {data.map((d, i) => (
          <span key={d.key} className={cn("flex-1 pt-1 text-center text-[11px] tabular", i === last ? "font-medium text-fg-2" : "text-fg-3")}>
            {d.label}
          </span>
        ))}
      </div>
      {h && hover != null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-elevated px-2 py-1 text-[12px] shadow-menu"
          style={{ left: `${((hover + 0.5) / data.length) * 100}%`, bottom: AXIS + H * (hidden ? 0 : Math.max(0, h.value) / max) + 6 }}
        >
          <div className="text-fg-2">{h.title ?? h.label}</div>
          <div className="font-semibold tabular text-fg">{hidden ? "Hidden" : format(h.value)}</div>
        </div>
      )}
    </div>
  );
}
