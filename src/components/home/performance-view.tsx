"use client";

import { useMemo, useState } from "react";
import { addMonths, addQuarters, format, startOfMonth, startOfQuarter } from "date-fns";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { periodMetrics } from "@/lib/selectors";
import { useFinance } from "@/lib/finance/use-finance";
import { cn, parseDate, todayISO } from "@/lib/utils";
import { Page, PageTitle } from "@/components/shell/page";
import { Card, Eyebrow, PillTabs, type Tone } from "@/components/ui/chunk";
import { Money, RevealToggle, useMoneyVisible } from "./money";

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const qKey = (d: Date) => `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;

/** "Are we doing better than last time?" — one card per number, one arrow per card. */
export function PerformanceView() {
  const { data } = useWorkspace();
  const fin = useFinance();
  const { visible } = useMoneyVisible();
  const [period, setPeriod] = useState<"month" | "quarter">("month");
  const todayKey = todayISO();

  const p = useMemo(() => {
    const now = parseDate(todayKey)!;
    if (period === "month") {
      const m0 = startOfMonth(now);
      return { label: format(m0, "MMMM"), prevLabel: "last month", cur: [iso(m0), iso(addMonths(m0, 1))], prev: [iso(addMonths(m0, -1)), iso(m0)], finKey: format(m0, "yyyy-MM"), prevFinKey: format(addMonths(m0, -1), "yyyy-MM") };
    }
    const q0 = startOfQuarter(now);
    return { label: `Q${Math.floor(q0.getMonth() / 3) + 1}`, prevLabel: "last quarter", cur: [iso(q0), iso(addQuarters(q0, 1))], prev: [iso(addQuarters(q0, -1)), iso(q0)], finKey: qKey(q0), prevFinKey: qKey(addQuarters(q0, -1)) };
  }, [period, todayKey]);

  const cur = periodMetrics(data, p.cur[0]!, p.cur[1]!);
  const prev = periodMetrics(data, p.prev[0]!, p.prev[1]!);
  const list = period === "month" ? fin.summary?.months : fin.summary?.quarters;
  const f = list?.find((x) => x.key === p.finKey);
  const pf = list?.find((x) => x.key === p.prevFinKey);

  const rows: { label: string; cur: number; prev: number; money?: boolean; invert?: boolean; tone: Tone }[] = [
    { label: "Tasks done", cur: cur.tasksCompleted, prev: prev.tasksCompleted, tone: "lime" },
    { label: "Projects finished", cur: cur.projectsCompleted, prev: prev.projectsCompleted, tone: "sky" },
    { label: "Projects started", cur: cur.projectsStarted, prev: prev.projectsStarted, tone: "cream" },
    { label: "Money in", cur: f?.income ?? 0, prev: pf?.income ?? 0, money: true, tone: "ink" },
    { label: "Money out", cur: f?.expenses ?? 0, prev: pf?.expenses ?? 0, money: true, invert: true, tone: "ink" },
  ];

  return (
    <Page crumbs={[{ label: "Home", href: "/" }, { label: "How we’re doing" }]}>
      <PageTitle title={<>How we’re<br />doing</>} description={`${p.label} so far, compared with ${p.prevLabel}.`} aside={<RevealToggle />} />
      <PillTabs
        className="mb-6"
        value={period}
        onChange={setPeriod}
        items={[
          { value: "month", label: "This month" },
          { value: "quarter", label: "This quarter" },
        ]}
      />
      <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => {
          const delta = r.cur - r.prev;
          const good = r.invert ? delta < 0 : delta > 0;
          const hidden = r.money && !visible;
          const Icon = delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
          return (
            <Card key={r.label} tone={r.tone} className="min-h-[190px]">
              <Eyebrow>{r.label}</Eyebrow>
              <div className="mt-auto pt-6 text-[48px] font-medium leading-none tracking-[-0.045em] tabular">
                {r.money ? <Money value={r.cur} currency={fin.currency} compact /> : r.cur}
              </div>
              <div className="mt-3 flex items-center gap-2 text-[13px]">
                {!hidden && (
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full",
                      delta === 0 ? "bg-[var(--chunk-soft)]" : good ? "bg-[#3d8048] text-white" : "bg-[#c8431d] text-white",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                )}
                <span className="opacity-60">
                  {r.money ? <Money value={r.prev} currency={fin.currency} compact /> : r.prev} {p.prevLabel}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
      <p className="mt-6 text-[12.5px] text-fg-3">Tasks and projects come from Spot OS. Money comes from the finance sheet.</p>
    </Page>
  );
}
