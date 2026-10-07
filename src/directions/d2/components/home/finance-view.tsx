"use client";

import Link from "next/link";
import { RefreshCw, Settings2, TriangleAlert, CalendarRange } from "lucide-react";
import { useFinance } from "@/directions/d2/lib/finance/use-finance";
import { cn, timeAgo } from "@/directions/d2/lib/utils";
import { Page, PageTitle } from "@/directions/d2/components/shell/page";
import { Skeleton } from "@/directions/d2/components/ui/misc";
import { Card, CircleButton, CircleLink, Eyebrow, Fold, type Tone } from "@/directions/d2/components/ui/chunk";
import type { PeriodTotals } from "@/directions/d2/lib/finance/normalize";
import { Money, RevealToggle, useMoneyVisible } from "./money";

/** Money in four answers: what we have, what we're owed, this month, this quarter. */
export function FinanceView() {
  const fin = useFinance();
  const { visible } = useMoneyVisible();
  const c = fin.currency;
  const crumbs = [{ label: "Home", href: "/" }, { label: "Money" }];

  if (!fin.source)
    return (
      <Page crumbs={crumbs} width="doc">
        <PageTitle title="Money" />
        <Card tone="cream" className="items-start gap-3 p-8">
          <div className="text-[22px] font-medium tracking-[-0.02em]">No finance sheet connected</div>
          <p className="max-w-md text-[14px] text-[var(--on-chunk-2)]">Point Spot OS at the studio spreadsheet. The sheet stays the source of truth; Spot OS only reads it.</p>
          <Link href="/settings?section=finance" className="mt-2 inline-flex h-10 items-center rounded-full bg-[#151515] px-5 text-[14px] text-[#f7f3ea]">
            Connect a sheet
          </Link>
        </Card>
      </Page>
    );

  const s = fin.summary;
  const netTone = (n: number | undefined): Tone => (!visible ? "surface" : (n ?? 0) < 0 ? "coral" : "lime");

  return (
    <Page
      crumbs={crumbs}
      actions={
        <>
          <CircleButton label="Refresh from the sheet" onClick={fin.refresh} disabled={fin.loading} size={44}>
            <RefreshCw className={cn(fin.loading && "animate-spin")} />
          </CircleButton>
          <CircleLink href="/settings?section=finance" label="Finance source settings" size={44}>
            <Settings2 />
          </CircleLink>
        </>
      }
    >
      <PageTitle
        title="Money"
        description={
          <>
            From {fin.source.name}
            {fin.fetchedAt && <> · updated {timeAgo(fin.fetchedAt)}</>}
            {fin.source.kind === "demo" && " · sample data"}
          </>
        }
        aside={<RevealToggle />}
      />

      {fin.error && (
        <div className="mb-4 flex items-start gap-2 rounded-[22px] bg-danger-soft px-5 py-4 text-[13.5px] text-danger">
          <TriangleAlert className="mt-px size-4 shrink-0" /> {fin.error}
        </div>
      )}

      {!s ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-[28px]" />
          ))}
        </div>
      ) : (
        <>
          <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <BigNumber tone="ink" label="In the bank now" value={<Money value={s.available} currency={c} />} note="Current balance" />
            <BigNumber tone="cream" label="Waiting to be paid" value={<Money value={s.outstanding} currency={c} />} note="Invoiced, not yet received" />
            <BigNumber
              tone={netTone(s.currentMonth?.net)}
              label={`${s.currentMonth?.label ?? "This month"} · net`}
              value={<Money value={s.currentMonth?.net ?? 0} currency={c} />}
              note={
                s.previousMonth && (
                  <>
                    Last month <Money value={s.previousMonth.net} currency={c} compact />
                  </>
                )
              }
            />
            <BigNumber tone={netTone(s.currentQuarter?.net)} label={`${s.currentQuarter?.label ?? "This quarter"} · net`} value={<Money value={s.currentQuarter?.net ?? 0} currency={c} />} />
          </div>

          <Card tone="surface" className="mt-3 p-6">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[22px] font-medium tracking-[-0.02em]">Last 6 months</h2>
              <div className="flex items-center gap-4 text-[12.5px] text-fg-2">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-lime" /> In
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-coral" /> Out
                </span>
              </div>
            </div>
            <PeriodBars rows={s.months.slice(-6)} currency={c} />
          </Card>

          <Fold className="mt-3" icon={<CalendarRange />} title="By quarter" summary="Income, spending and what was left, per quarter">
            <PeriodBars rows={s.quarters.slice(-4)} currency={c} />
          </Fold>
        </>
      )}
    </Page>
  );
}

function BigNumber({ tone, label, value, note }: { tone: Tone; label: string; value: React.ReactNode; note?: React.ReactNode }) {
  return (
    <Card tone={tone} className="min-h-[170px]">
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-auto truncate pt-6 text-[34px] font-medium leading-none tracking-[-0.035em] tabular">{value}</div>
      {note && <div className="mt-2 text-[12.5px] opacity-60">{note}</div>}
    </Card>
  );
}

/** One row per period: two bars, one number. Easier to read than a four-column table. */
function PeriodBars({ rows, currency }: { rows: PeriodTotals[]; currency: string }) {
  const { visible } = useMoneyVisible();
  const max = Math.max(1, ...rows.flatMap((r) => [r.income, r.expenses]));
  if (!rows.length) return <div className="py-6 text-center text-[14px] text-fg-3">No entries yet</div>;
  return (
    <div className="flex flex-col gap-4">
      {rows.map((r) => (
        <div key={r.key} className="grid grid-cols-[72px_1fr_auto] items-center gap-4 max-sm:grid-cols-[56px_1fr_auto]">
          <span className="text-[14px] text-fg-2">{r.label.split(" ")[0]}</span>
          <div className="flex flex-col gap-1.5">
            <span className="h-3 rounded-full bg-lime transition-[width] duration-500" style={{ width: visible ? `${Math.max(2, (r.income / max) * 100)}%` : "60%", opacity: visible ? 1 : 0.25 }} />
            <span className="h-3 rounded-full bg-coral transition-[width] duration-500" style={{ width: visible ? `${Math.max(2, (r.expenses / max) * 100)}%` : "45%", opacity: visible ? 1 : 0.25 }} />
          </div>
          <span className={cn("min-w-[88px] text-right text-[15px] font-medium tabular", visible && r.net < 0 && "text-danger")}>
            <Money value={r.net} currency={currency} compact />
          </span>
        </div>
      ))}
    </div>
  );
}

