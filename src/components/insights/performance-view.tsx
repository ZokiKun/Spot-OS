"use client";

import { useMemo, useState } from "react";
import { addMonths, addQuarters, format, startOfMonth, startOfQuarter } from "date-fns";
import { BarChart3, Table2 } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { periodMetrics } from "@/lib/selectors";
import { useFinance } from "@/lib/finance/use-finance";
import { cn, formatMoney, parseDate, todayISO } from "@/lib/utils";
import { ViewTabs } from "@/components/ui/tabs";
import { Money, RevealToggle, useMoneyVisible } from "./money";
import { BarChart } from "./bar-chart";

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const quarterKey = (d: Date) => `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
const PERIODS = 6;

type Period = "month" | "quarter";
type Mode = "chart" | "table";

interface Metric {
  key: string;
  label: string;
  values: number[]; // oldest → current
  money?: boolean;
  invert?: boolean; // lower is better (expenses)
  tone: "blue" | "green" | "red" | "purple";
}

/** Period-over-period trends: Spot OS numbers plus revenue/expenses from the finance sheet. */
export function PerformanceView() {
  const { data } = useWorkspace();
  const fin = useFinance();
  const { visible } = useMoneyVisible();
  const [period, setPeriod] = useState<Period>("month");
  const [mode, setMode] = useState<Mode>("chart");
  const todayKey = todayISO();

  const periods = useMemo(() => {
    const now = parseDate(todayKey)!;
    const start = period === "month" ? startOfMonth(now) : startOfQuarter(now);
    const step = period === "month" ? addMonths : addQuarters;
    return Array.from({ length: PERIODS }, (_, i) => {
      const s = step(start, i - (PERIODS - 1));
      const e = step(s, 1);
      return period === "month"
        ? { key: format(s, "yyyy-MM"), short: format(s, "MMM"), long: format(s, "MMMM yyyy"), start: iso(s), end: iso(e) }
        : { key: quarterKey(s), short: `Q${Math.floor(s.getMonth() / 3) + 1}`, long: `Q${Math.floor(s.getMonth() / 3) + 1} ${s.getFullYear()}`, start: iso(s), end: iso(e) };
    });
  }, [period, todayKey]);

  const metrics = useMemo<Metric[]>(() => {
    const m = periods.map((p) => periodMetrics(data, p.start, p.end));
    const list = period === "month" ? fin.summary?.months : fin.summary?.quarters;
    const f = periods.map((p) => list?.find((x) => x.key === p.key));
    return [
      { key: "tasks", label: "Tasks completed", values: m.map((x) => x.tasksCompleted), tone: "blue" },
      { key: "done", label: "Projects completed", values: m.map((x) => x.projectsCompleted), tone: "green" },
      { key: "started", label: "Projects started", values: m.map((x) => x.projectsStarted), tone: "purple" },
      { key: "revenue", label: "Revenue", values: f.map((x) => x?.income ?? 0), money: true, tone: "green" },
      { key: "expenses", label: "Expenses", values: f.map((x) => x?.expenses ?? 0), money: true, invert: true, tone: "red" },
    ];
  }, [data, fin.summary, period, periods]);

  const cur = periods.at(-1)!;
  const prev = periods.at(-2)!;
  const fmt = (v: number, money?: boolean) => (money ? formatMoney(v, fin.currency, true) : String(v));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <ViewTabs<Period>
          value={period}
          onChange={setPeriod}
          items={[
            { value: "month", label: "Monthly" },
            { value: "quarter", label: "Quarterly" },
          ]}
        />
        <div className="ml-auto flex items-center gap-1">
          <ViewTabs<Mode>
            value={mode}
            onChange={setMode}
            items={[
              { value: "chart", label: "Chart", icon: <BarChart3 className="size-4" /> },
              { value: "table", label: "Table", icon: <Table2 className="size-4" /> },
            ]}
          />
          <RevealToggle />
        </div>
      </div>

      {mode === "chart" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((m) => {
            const c = m.values.at(-1)!;
            const p = m.values.at(-2)!;
            const delta = c - p;
            const hidden = Boolean(m.money && !visible);
            const good = m.invert ? delta < 0 : delta > 0;
            return (
              <section key={m.key} className="rounded-lg px-4 pb-3 pt-3.5 shadow-[0_0_0_1px_var(--border)]">
                <div className="text-[12px] font-medium text-fg-2">{m.label}</div>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className="text-[24px] font-semibold leading-tight tabular tracking-[-0.01em]">
                    {m.money ? <Money value={c} currency={fin.currency} /> : c}
                  </span>
                  <span className="text-[12px] text-fg-3">{cur.long} · so far</span>
                </div>
                <div className={cn("mb-3 text-[12px] tabular", hidden || delta === 0 ? "text-fg-3" : good ? "text-[var(--success)]" : "text-danger")}>
                  {hidden
                    ? `vs ${prev.long}`
                    : delta === 0
                      ? `Same as ${prev.long}`
                      : m.money
                        ? `${delta > 0 ? "+" : "−"}${formatMoney(Math.abs(delta), fin.currency, true)}${p ? ` (${delta > 0 ? "+" : ""}${Math.round((delta / p) * 100)}%)` : ""} vs ${prev.long}`
                        : `${delta > 0 ? "+" : ""}${delta} vs ${prev.long}`}
                </div>
                <BarChart
                  tone={m.tone}
                  hidden={hidden}
                  format={(v) => (m.money ? formatMoney(v, fin.currency) : String(v))}
                  data={periods.map((pp, i) => ({ key: pp.key, label: pp.short, title: pp.long, value: m.values[i]! }))}
                />
              </section>
            );
          })}
        </div>
      ) : (
        <div className="-mx-2 overflow-x-auto px-2">
          <table className="w-full min-w-[640px] text-[14px]">
            <thead>
              <tr className="border-y border-line text-[12px] text-fg-2">
                <th className="px-2 py-1.5 text-left font-normal">Metric</th>
                {periods.map((p) => (
                  <th key={p.key} className="px-2 py-1.5 text-right font-normal">
                    {p.long}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.key} className="border-b border-line">
                  <td className="px-2 py-2.5">{m.label}</td>
                  {m.values.map((v, i) => (
                    <td key={i} className={cn("px-2 py-2.5 text-right tabular", i === m.values.length - 1 ? "font-semibold" : "text-fg-2")}>
                      {m.money ? <Money value={v} currency={fin.currency} compact /> : fmt(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[12px] text-fg-3">Task and project numbers come from Spot OS; revenue and expenses come from the finance sheet. Hover a bar for the exact value.</p>
    </div>
  );
}
