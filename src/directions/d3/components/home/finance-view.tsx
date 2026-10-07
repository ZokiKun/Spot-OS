"use client";

import { RefreshCw, Settings2, TriangleAlert } from "lucide-react";
import { useFinance } from "@/directions/d3/lib/finance/use-finance";
import { cn, timeAgo } from "@/directions/d3/lib/utils";
import { Button, buttonClasses } from "@/directions/d3/components/ui/button";
import { Card, EmptyState, SectionHeading, Skeleton } from "@/directions/d3/components/ui/misc";
import { Money, RevealToggle, useMoneyVisible } from "./money";
import { StatRow } from "./stat-row";
import type { PeriodTotals } from "@/directions/d3/lib/finance/normalize";
import Link from "next/link";

/** Money, at a glance: four tiles, then each month as two bars (in vs. out). */
export function FinanceView() {
  const fin = useFinance();
  const { visible } = useMoneyVisible();
  const c = fin.currency;

  if (!fin.source)
    return (
      <Card>
        <EmptyState
          mood="think"
          title="No finance sheet connected"
          description="Point Spot OS at the studio’s finance spreadsheet. The sheet stays the source of truth — Spot OS only reads it."
          action={
            <Link href="/settings?section=finance" className={buttonClasses("blue", "md")}>
              Connect a sheet
            </Link>
          }
        />
      </Card>
    );

  const s = fin.summary;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1 text-[13.5px] font-semibold text-fg-2">
          From <span className="font-extrabold text-fg">{fin.source.name}</span>
          {fin.fetchedAt && <> · updated {timeAgo(fin.fetchedAt)}</>}
          {fin.source.kind === "demo" && <span className="label-caps ml-2 rounded-md bg-orange-soft px-1.5 text-[10.5px] leading-5 text-orange-edge">Sample data</span>}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" onClick={fin.refresh} disabled={fin.loading}>
            <RefreshCw className={cn("size-4", fin.loading && "animate-spin")} strokeWidth={3} /> Refresh
          </Button>
          <Link href="/settings?section=finance" className={buttonClasses("ghost")}>
            <Settings2 className="size-4" strokeWidth={3} /> Sheet
          </Link>
          <RevealToggle />
        </div>
      </div>

      {fin.error && (
        <div className="flex items-start gap-2 rounded-2xl border-2 border-red/30 bg-red-soft px-4 py-3 text-[14px] font-bold text-red-edge">
          <TriangleAlert className="mt-px size-5 shrink-0" strokeWidth={2.5} /> {fin.error}
        </div>
      )}

      {!s ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <>
          <StatRow
            columns={2}
            stats={[
              { icon: "🏦", label: "In the bank", value: <Money value={s.available} currency={c} /> },
              { icon: "📨", label: "Waiting to be paid", value: <Money value={s.outstanding} currency={c} /> },
              {
                icon: "📅",
                label: `Left over · ${s.currentMonth?.label ?? "this month"}`,
                value: <Money value={s.currentMonth?.net ?? 0} currency={c} />,
                tone: visible ? ((s.currentMonth?.net ?? 0) < 0 ? "danger" : "good") : "default",
              },
              {
                icon: "📊",
                label: `Left over · ${s.currentQuarter?.label ?? "this quarter"}`,
                value: <Money value={s.currentQuarter?.net ?? 0} currency={c} />,
                tone: visible ? ((s.currentQuarter?.net ?? 0) < 0 ? "danger" : "good") : "default",
              },
            ]}
          />
          <section>
            <SectionHeading size="md">Month by month</SectionHeading>
            <PeriodBars rows={s.months.slice(-6).reverse()} currency={c} />
          </section>
          <section>
            <SectionHeading size="md">Quarter by quarter</SectionHeading>
            <PeriodBars rows={s.quarters.slice(-4).reverse()} currency={c} />
          </section>
        </>
      )}
    </div>
  );
}

function PeriodBars({ rows, currency }: { rows: PeriodTotals[]; currency: string }) {
  const { visible } = useMoneyVisible();
  const max = Math.max(1, ...rows.flatMap((r) => [r.income, r.expenses]));
  if (!rows.length)
    return (
      <Card>
        <EmptyState title="No entries yet" className="py-6" />
      </Card>
    );
  return (
    <Card className="divide-y-2 divide-line">
      {rows.map((r) => (
        <div key={r.key} className="px-5 py-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[15px] font-extrabold">{r.label}</span>
            <span className={cn("text-[15px] font-black tabular", visible && (r.net < 0 ? "text-red" : "text-green-edge"))}>
              <Money value={r.net} currency={currency} />
            </span>
          </div>
          {visible && (
            <div className="mt-2 space-y-1.5">
              <Bar label="In" value={r.income} max={max} currency={currency} className="bg-green" />
              <Bar label="Out" value={r.expenses} max={max} currency={currency} className="bg-red/80" />
            </div>
          )}
        </div>
      ))}
    </Card>
  );
}

function Bar({ label, value, max, currency, className }: { label: string; value: number; max: number; currency: string; className: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[12.5px] font-bold text-fg-2">
      <span className="label-caps w-8 shrink-0 text-[10.5px]">{label}</span>
      <span className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-active">
        <span className={cn("block h-full rounded-full", className)} style={{ width: `${(value / max) * 100}%` }} />
      </span>
      <span className="w-20 shrink-0 text-right tabular">
        <Money value={value} currency={currency} compact />
      </span>
    </div>
  );
}
