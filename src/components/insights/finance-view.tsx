"use client";

import Link from "next/link";
import { Upload, TriangleAlert } from "lucide-react";
import { useFinance } from "@/lib/finance/use-finance";
import { cn, timeAgo } from "@/lib/utils";
import { EmptyState, SectionHeading } from "@/components/ui/misc";
import { Money, RevealToggle, useMoneyVisible } from "./money";
import { StatRow } from "./stat-row";
import type { PeriodTotals } from "@/lib/finance/normalize";

export function FinanceView() {
  const fin = useFinance();
  const { visible } = useMoneyVisible();
  const c = fin.currency;

  if (!fin.source)
    return (
      <EmptyState
        title="No finance numbers yet"
        description="Upload the studio finance spreadsheet (Excel or CSV) once a month. The sheet stays the source of truth."
        action={
          <Link href="/settings?section=finance" className="text-[14px] text-accent hover:underline">
            Upload the finance file
          </Link>
        }
      />
    );

  const s = fin.summary;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-[13px] text-fg-2">
          From <span className="font-medium text-fg">{fin.source.name}</span>
          {fin.updatedAt && <> · updated {timeAgo(fin.updatedAt)}</>}
          {fin.source.kind === "demo" && <span className="ml-1.5 rounded-[3px] bg-[var(--tag-orange-bg)] px-1 text-[11px] text-[var(--tag-text)]">Sample data</span>}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Link href="/settings?section=finance" className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-fg-2 hover:bg-hover">
            <Upload className="size-3.5" /> Upload new file
          </Link>
          <RevealToggle />
        </div>
      </div>

      {fin.stale && (
        <div className="flex items-start gap-2 rounded-md bg-[var(--tag-orange-bg)] px-3 py-2.5 text-[13px]">
          <TriangleAlert className="mt-px size-4 shrink-0" />
          <span>
            These numbers are from {timeAgo(fin.updatedAt!)}.{" "}
            <Link href="/settings?section=finance" className="font-medium underline">
              Upload this month’s file
            </Link>{" "}
            to bring them up to date.
          </span>
        </div>
      )}

      {!s ? (
        <EmptyState
          title="Nothing uploaded yet"
          description="Export the finance sheet as Excel or CSV and upload it in Settings → Finance."
          action={
            <Link href="/settings?section=finance" className="text-[14px] text-accent hover:underline">
              Upload the finance file
            </Link>
          }
        />
      ) : (
        <>
          <StatRow
            stats={[
              { label: "Available now", value: <Money value={s.available} currency={c} />, sub: "Current balance" },
              { label: "Outstanding", value: <Money value={s.outstanding} currency={c} />, sub: "Invoiced, not yet received" },
              {
                label: `Net · ${s.currentMonth?.label ?? "this month"}`,
                value: <Money value={s.currentMonth?.net ?? 0} currency={c} />,
                tone: visible ? ((s.currentMonth?.net ?? 0) < 0 ? "danger" : "good") : "default",
                sub: s.previousMonth && <>Last month <Money value={s.previousMonth.net} currency={c} compact /></>,
              },
              {
                label: `Net · ${s.currentQuarter?.label ?? "this quarter"}`,
                value: <Money value={s.currentQuarter?.net ?? 0} currency={c} />,
                tone: visible ? ((s.currentQuarter?.net ?? 0) < 0 ? "danger" : "good") : "default",
              },
            ]}
          />
          <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-[3fr_2fr]">
            <section>
              <SectionHeading>Monthly · last 6 months</SectionHeading>
              <PeriodTable rows={s.months.slice(-6).reverse()} currency={c} />
            </section>
            <section>
              <SectionHeading>Quarterly</SectionHeading>
              <PeriodTable rows={s.quarters.slice(-4).reverse()} currency={c} />
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function PeriodTable({ rows, currency }: { rows: PeriodTotals[]; currency: string }) {
  const { visible } = useMoneyVisible();
  const max = Math.max(1, ...rows.flatMap((r) => [r.income, r.expenses]));
  if (!rows.length) return <EmptyState title="No entries" className="py-6" />;
  return (
    <div className="text-[14px]">
      <div className="grid grid-cols-[1fr_repeat(3,minmax(84px,auto))] gap-3 border-y border-line px-2 py-1.5 text-[12px] text-fg-2">
        <span>Period</span>
        <span className="text-right">Income</span>
        <span className="text-right">Expenses</span>
        <span className="text-right">Net</span>
      </div>
      {rows.map((r) => (
        <div key={r.key} className="grid grid-cols-[1fr_repeat(3,minmax(84px,auto))] items-center gap-3 border-b border-line px-2 py-2">
          <div>
            <div>{r.label}</div>
            {visible && (
              <div className="mt-1 flex flex-col gap-0.5">
                <span className="h-1 rounded-full bg-[var(--dot-green)]" style={{ width: `${(r.income / max) * 100}%` }} />
                <span className="h-1 rounded-full bg-[var(--dot-red)] opacity-70" style={{ width: `${(r.expenses / max) * 100}%` }} />
              </div>
            )}
          </div>
          <span className="text-right tabular">
            <Money value={r.income} currency={currency} />
          </span>
          <span className="text-right tabular text-fg-2">
            <Money value={r.expenses} currency={currency} />
          </span>
          <span className={cn("text-right font-medium tabular", visible && r.net < 0 && "text-danger")}>
            <Money value={r.net} currency={currency} />
          </span>
        </div>
      ))}
    </div>
  );
}
