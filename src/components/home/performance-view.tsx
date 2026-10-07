"use client";

import { useMemo } from "react";
import { addMonths, addQuarters, format, startOfMonth, startOfQuarter } from "date-fns";
import { useWorkspace } from "@/lib/store";
import { periodMetrics } from "@/lib/selectors";
import { useFinance } from "@/lib/finance/use-finance";
import { cn, parseDate, todayISO } from "@/lib/utils";
import { SectionHeading } from "@/components/ui/misc";
import { Money, RevealToggle, useMoneyVisible } from "./money";

const iso = (d: Date) => format(d, "yyyy-MM-dd");

/** Lightweight period comparison — deliberately not an analytics suite. */
export function PerformanceView() {
  const { data } = useWorkspace();
  const fin = useFinance();
  const { visible } = useMoneyVisible();
  const todayKey = todayISO();
  const periods = useMemo(() => {
    const now = parseDate(todayKey)!;
    const m0 = startOfMonth(now);
    const q0 = startOfQuarter(now);
    return [
      { key: "month", title: "This month", label: format(m0, "MMMM"), cur: [iso(m0), iso(addMonths(m0, 1))], prev: [iso(addMonths(m0, -1)), iso(m0)], finKey: format(m0, "yyyy-MM"), prevFinKey: format(addMonths(m0, -1), "yyyy-MM") },
      {
        key: "quarter",
        title: "This quarter",
        label: `Q${Math.floor(q0.getMonth() / 3) + 1} ${q0.getFullYear()}`,
        cur: [iso(q0), iso(addQuarters(q0, 1))],
        prev: [iso(addQuarters(q0, -1)), iso(q0)],
        finKey: `${q0.getFullYear()}-Q${Math.floor(q0.getMonth() / 3) + 1}`,
        prevFinKey: (() => {
          const p = addQuarters(q0, -1);
          return `${p.getFullYear()}-Q${Math.floor(p.getMonth() / 3) + 1}`;
        })(),
      },
    ];
  }, [todayKey]);

  return (
    <div className="space-y-10">
      <div className="flex justify-end">
        <RevealToggle />
      </div>
      {periods.map((p) => {
        const cur = periodMetrics(data, p.cur[0]!, p.cur[1]!);
        const prev = periodMetrics(data, p.prev[0]!, p.prev[1]!);
        const list = p.key === "month" ? fin.summary?.months : fin.summary?.quarters;
        const f = list?.find((x) => x.key === p.finKey);
        const pf = list?.find((x) => x.key === p.prevFinKey);
        const rows: { label: string; cur: number; prev: number; money?: boolean; invert?: boolean }[] = [
          { label: "Projects started", cur: cur.projectsStarted, prev: prev.projectsStarted },
          { label: "Projects completed", cur: cur.projectsCompleted, prev: prev.projectsCompleted },
          { label: "Tasks completed", cur: cur.tasksCompleted, prev: prev.tasksCompleted },
          { label: "Revenue", cur: f?.income ?? 0, prev: pf?.income ?? 0, money: true },
          { label: "Expenses", cur: f?.expenses ?? 0, prev: pf?.expenses ?? 0, money: true, invert: true },
        ];
        return (
          <section key={p.key}>
            <SectionHeading>
              {p.title} · {p.label}
            </SectionHeading>
            <div className="text-[14px]">
              <div className="grid grid-cols-[1fr_120px_120px_70px] gap-3 border-y border-line px-2 py-1.5 text-[12px] text-fg-2">
                <span>Metric</span>
                <span className="text-right">{p.key === "month" ? "This month" : "This quarter"}</span>
                <span className="text-right">Previous</span>
                <span className="text-right">Change</span>
              </div>
              {rows.map((r) => {
                const delta = r.cur - r.prev;
                const good = r.invert ? delta < 0 : delta > 0;
                return (
                  <div key={r.label} className="grid grid-cols-[1fr_120px_120px_70px] items-center gap-3 border-b border-line px-2 py-2.5">
                    <span>{r.label}</span>
                    <span className="text-right font-semibold tabular">{r.money ? <Money value={r.cur} currency={fin.currency} /> : r.cur}</span>
                    <span className="text-right text-fg-2 tabular">{r.money ? <Money value={r.prev} currency={fin.currency} /> : r.prev}</span>
                    <span className={cn("text-right text-[12px] tabular", delta === 0 ? "text-fg-3" : good ? "text-[var(--success)]" : "text-danger")}>
                      {r.money ? (r.prev && visible ? `${delta > 0 ? "+" : ""}${Math.round((delta / r.prev) * 100)}%` : "—") : `${delta > 0 ? "+" : ""}${delta}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      <p className="text-[12px] text-fg-3">Task and project numbers come from Spot OS; revenue and expenses come from the finance sheet.</p>
    </div>
  );
}
