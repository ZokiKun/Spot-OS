"use client";

import { useMemo } from "react";
import { addMonths, addQuarters, format, startOfMonth, startOfQuarter } from "date-fns";
import { useWorkspace } from "@/directions/d3/lib/store";
import { periodMetrics } from "@/directions/d3/lib/selectors";
import { useFinance } from "@/directions/d3/lib/finance/use-finance";
import { cn, parseDate, todayISO } from "@/directions/d3/lib/utils";
import { SectionHeading } from "@/directions/d3/components/ui/misc";
import { Money, RevealToggle, useMoneyVisible } from "./money";

const iso = (d: Date) => format(d, "yyyy-MM-dd");

/** This period vs. the last one — each number as a tile with a simple up/down chip. */
export function PerformanceView() {
  const { data } = useWorkspace();
  const fin = useFinance();
  const { visible } = useMoneyVisible();
  const todayKey = todayISO();
  const periods = useMemo(() => {
    const now = parseDate(todayKey)!;
    const m0 = startOfMonth(now);
    const q0 = startOfQuarter(now);
    const qKey = (d: Date) => `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
    return [
      { key: "month", title: `This month · ${format(m0, "MMMM")}`, prevLabel: "last month", cur: [iso(m0), iso(addMonths(m0, 1))], prev: [iso(addMonths(m0, -1)), iso(m0)], finKey: format(m0, "yyyy-MM"), prevFinKey: format(addMonths(m0, -1), "yyyy-MM") },
      { key: "quarter", title: `This quarter · Q${Math.floor(q0.getMonth() / 3) + 1}`, prevLabel: "last quarter", cur: [iso(q0), iso(addQuarters(q0, 1))], prev: [iso(addQuarters(q0, -1)), iso(q0)], finKey: qKey(q0), prevFinKey: qKey(addQuarters(q0, -1)) },
    ];
  }, [todayKey]);

  return (
    <div className="space-y-10">
      <div className="-mb-6 flex justify-end">
        <RevealToggle />
      </div>
      {periods.map((p) => {
        const cur = periodMetrics(data, p.cur[0]!, p.cur[1]!);
        const prev = periodMetrics(data, p.prev[0]!, p.prev[1]!);
        const list = p.key === "month" ? fin.summary?.months : fin.summary?.quarters;
        const f = list?.find((x) => x.key === p.finKey);
        const pf = list?.find((x) => x.key === p.prevFinKey);
        const rows: { icon: string; label: string; cur: number; prev: number; money?: boolean; invert?: boolean }[] = [
          { icon: "🚀", label: "Projects started", cur: cur.projectsStarted, prev: prev.projectsStarted },
          { icon: "🏁", label: "Projects finished", cur: cur.projectsCompleted, prev: prev.projectsCompleted },
          { icon: "✅", label: "Tasks done", cur: cur.tasksCompleted, prev: prev.tasksCompleted },
          { icon: "💰", label: "Money in", cur: f?.income ?? 0, prev: pf?.income ?? 0, money: true },
          { icon: "🧾", label: "Money out", cur: f?.expenses ?? 0, prev: pf?.expenses ?? 0, money: true, invert: true },
        ];
        return (
          <section key={p.key}>
            <SectionHeading size="md">{p.title}</SectionHeading>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {rows.map((r) => {
                const delta = r.cur - r.prev;
                const good = r.invert ? delta < 0 : delta > 0;
                const hidden = r.money && !visible;
                return (
                  <div key={r.label} className="flex items-center gap-3.5 rounded-2xl border-2 border-line px-4 py-3">
                    <span className="text-[24px] leading-none">{r.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[20px] font-black leading-tight tabular">{r.money ? <Money value={r.cur} currency={fin.currency} compact /> : r.cur}</div>
                      <div className="truncate text-[13px] font-bold text-fg-2">
                        {r.label} · <span className="text-fg-3">{r.money ? (hidden ? "—" : <>was <Money value={r.prev} currency={fin.currency} compact /></>) : `was ${r.prev}`}</span>
                      </div>
                    </div>
                    {!hidden && delta !== 0 && (
                      <span className={cn("label-caps shrink-0 rounded-lg px-2 text-[11.5px] leading-6", good ? "bg-green-soft text-green-edge" : "bg-red-soft text-red-edge")}>
                        {delta > 0 ? "▲" : "▼"} {r.money ? (r.prev ? `${Math.abs(Math.round((delta / r.prev) * 100))}%` : "new") : Math.abs(delta)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-2 px-1 text-[12.5px] font-semibold text-fg-3">Compared with {p.prevLabel}.</p>
          </section>
        );
      })}
      <p className="text-[12.5px] font-semibold text-fg-3">Task and project numbers come from Spot OS; money comes from the finance sheet.</p>
    </div>
  );
}
