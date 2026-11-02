"use client";

import { useState, type FocusEvent, type PointerEvent, type ReactNode } from "react";

/**
 * Hover popup for the review charts. `bind(content)` goes on any mark (bar, segment, column); the popup
 * follows the pointer inside the chart's container, and also opens on keyboard focus. The container is
 * a callback ref kept in state (like usePopover), so render never reads a ref.
 *
 *   const { tipRef, ...tip } = useChartTip();
 *   <div ref={tipRef} className="relative">… <span {...tip.bind(<TipCard …/>)} /> … {tip.node}</div>
 */
export function useChartTip() {
  const [box, tipRef] = useState<HTMLDivElement | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; content: ReactNode } | null>(null);

  const place = (clientX: number, clientY: number, content: ReactNode) => {
    const r = box?.getBoundingClientRect();
    if (!r) return;
    // Keep the popup inside the chart: never closer than ~90px to its left or right edge.
    const x = Math.min(Math.max(clientX - r.left, 90), Math.max(90, r.width - 90));
    setTip({ x, y: clientY - r.top, content });
  };

  const bind = (content: ReactNode) => ({
    onPointerEnter: (e: PointerEvent<HTMLElement>) => place(e.clientX, e.clientY, content),
    onPointerMove: (e: PointerEvent<HTMLElement>) => place(e.clientX, e.clientY, content),
    onPointerLeave: () => setTip(null),
    onFocus: (e: FocusEvent<HTMLElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      place(r.left + r.width / 2, r.top, content);
    },
    onBlur: () => setTip(null),
  });

  const node = tip ? (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-30 min-w-[150px] max-w-[260px] rounded-lg bg-elevated px-3 py-2 text-[12.5px] shadow-menu"
      style={{ left: tip.x, top: tip.y, transform: "translate(-50%, calc(-100% - 12px))" }}
    >
      {tip.content}
    </div>
  ) : null;

  return { tipRef, bind, node };
}

export interface TipRow {
  /** Swatch colour (a CSS colour); omitted for plain rows. */
  color?: string;
  label: string;
  value: ReactNode;
  /** Small grey text after the label, e.g. "42%". */
  note?: string;
}

/** Popup body: a heading, then value-first rows, then optional detail lines (e.g. top projects). */
export function TipCard({ title, rows = [], details, footer }: { title: ReactNode; rows?: TipRow[]; details?: string[]; footer?: ReactNode }) {
  return (
    <div>
      <div className="mb-1 font-medium text-fg">{title}</div>
      {rows.length > 0 && (
        <div className="space-y-0.5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-2">
              {r.color ? <span className="h-[3px] w-3 shrink-0 rounded-full" style={{ background: r.color }} /> : <span className="w-3 shrink-0" />}
              <span className="font-semibold tabular text-fg">{r.value}</span>
              <span className="min-w-0 truncate text-fg-2">{r.label}</span>
              {r.note && <span className="ml-auto pl-2 tabular text-fg-3">{r.note}</span>}
            </div>
          ))}
        </div>
      )}
      {details && details.length > 0 && (
        <div className="mt-1.5 space-y-0.5 border-t border-line pt-1.5 text-fg-2">
          {details.map((d) => (
            <div key={d} className="truncate">
              {d}
            </div>
          ))}
        </div>
      )}
      {footer && <div className="mt-1.5 text-[11.5px] text-fg-3">{footer}</div>}
    </div>
  );
}

export const pct = (n: number, total: number) => (total ? `${Math.round((n / total) * 100)}%` : "");
