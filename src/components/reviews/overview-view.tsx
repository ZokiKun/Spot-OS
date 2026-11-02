"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PROJECT_STATUSES } from "@/lib/constants";
import { useWorkspace } from "@/lib/store";
import { useDomains, type Domain } from "@/lib/domains";
import { useFinance } from "@/lib/finance/use-finance";
import { fmtCount, monthName, monthStartOf, monthsBetween, quarterName, quarterOfMonth, shiftMonth, shiftQuarter, taskCredits, type Credit } from "@/lib/studio-review";
import { cn, formatMoney } from "@/lib/utils";
import { ViewTabs } from "@/components/ui/tabs";
import { IconButton } from "@/components/ui/button";
import { ProjectIcon } from "@/components/ui/project-icon";
import { Money, RevealToggle, useMoneyVisible } from "@/components/insights/money";
import { Card, PersonBars, TagLegend, topProjects, useMembers, useMonthMoney } from "./review-ui";
import { pct, TipCard, useChartTip } from "./chart-tip";

export type Range = "month" | "quarter" | "year";

/** The months a range covers, and the months its money chart shows (a month gets six for context). */
function periodMonths(range: Range, anchor: string) {
  if (range === "month") return { months: [anchor], trend: monthsBetween(shiftMonth(anchor, -5), anchor), label: monthName(anchor, "year") };
  if (range === "quarter") {
    const q = quarterOfMonth(anchor);
    const months = monthsBetween(q, shiftMonth(q, 2));
    return { months, trend: months, label: quarterName(q) };
  }
  const y = anchor.slice(0, 4);
  const months = monthsBetween(`${y}-01-01`, `${y}-12-01`);
  return { months, trend: months, label: y };
}

/** Reviews → Overview: the studio over a month, quarter or year — money, projects, domains and people. */
export function OverviewView({ range, anchor, onChange }: { range: Range; anchor: string; onChange: (patch: { range?: Range; anchor?: string }) => void }) {
  const { data } = useWorkspace();
  const members = useMembers();
  const domains = useDomains();
  const fin = useFinance();
  const money = useMonthMoney();
  const [thisMonth] = useState(() => monthStartOf(new Date()));
  const { months, trend, label } = periodMonths(range, anchor);
  const start = months[0]!;
  const end = shiftMonth(months.at(-1)!, 1);
  const credits = taskCredits(data, start, end);
  const step = (n: number) => onChange({ anchor: range === "month" ? shiftMonth(anchor, n) : range === "quarter" ? shiftQuarter(anchor, n) : shiftMonth(anchor, 12 * n) });

  const sum = (field: "revenue" | "burn") => {
    const vals = months.map((m) => money(m, field).value).filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  };
  const revenue = sum("revenue");
  const burn = sum("burn");
  const inRange = (iso: string | null) => !!iso && iso.slice(0, 10) >= start && iso.slice(0, 10) < end;
  const completed = data.projects.filter((p) => inRange(p.completed_at));
  const started = data.projects.filter((p) => inRange(p.created_at));
  const commitments = data.commitments.filter((c) => months.includes(c.month));
  const goals = data.goals.filter((g) => g.period === "quarter" && months.some((m) => quarterOfMonth(m) === g.period_start));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <ViewTabs<Range>
          value={range}
          onChange={(r) => onChange({ range: r })}
          items={[
            { value: "month", label: "Month" },
            { value: "quarter", label: "Quarter" },
            { value: "year", label: "Year" },
          ]}
        />
        <div className="flex items-center gap-1">
          <IconButton label="Previous" size="md" onClick={() => step(-1)}>
            <ChevronLeft className="size-4" />
          </IconButton>
          <span className="min-w-[120px] text-center text-[15px] font-semibold">{label}</span>
          <IconButton label="Next" size="md" onClick={() => step(1)} disabled={start > thisMonth}>
            <ChevronRight className="size-4" />
          </IconButton>
        </div>
        <div className="ml-auto">
          <RevealToggle />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-line shadow-[0_0_0_1px_var(--border)] md:grid-cols-4">
        <Stat label="Revenue collected" value={<Money value={revenue} currency={fin.currency} />} />
        <Stat label="Burn" value={<Money value={burn} currency={fin.currency} />} />
        <Stat label="Tasks completed" value={fmtCount(credits.reduce((n, c) => n + c.weight, 0))} />
        <Stat
          label="Commitments done"
          value={commitments.length ? `${commitments.filter((c) => c.status === "done").length}/${commitments.length}` : "—"}
          sub={goals.length ? `Quarter goals done ${goals.filter((g) => g.status === "done").length}/${goals.length}` : undefined}
        />
      </div>

      <Card title="Revenue and burn" subtitle={range === "month" ? "The last six months, ending with this one." : `Each month of ${label}.`} action={<MoneyLegend />}>
        <MoneyChart months={trend} highlight={months} />
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Projects" subtitle="Where every project stands now.">
          <ProjectStatus />
          <div className="mt-4 grid grid-cols-2 gap-4 text-[13px]">
            <ProjectList title={`Completed in ${label}`} projects={completed} />
            <ProjectList title={`Started in ${label}`} projects={started} />
          </div>
        </Card>
        <Card title="Domains" subtitle={`Tasks completed in ${label}, by domain.`}>
          <DomainBars credits={credits} domains={domains.list} />
        </Card>
      </div>

      <Card title="People" subtitle={`Tasks completed in ${label}. Click someone for their projects.`} action={<TagLegend />}>
        <PersonBars credits={credits} people={members} />
      </Card>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="bg-bg px-4 py-3.5">
      <div className="text-[12px] text-fg-2">{label}</div>
      <div className="mt-1 text-[22px] font-semibold leading-tight tabular">{value}</div>
      {sub && <div className="mt-1 text-[12px] text-fg-3">{sub}</div>}
    </div>
  );
}

const REVENUE = "var(--dot-blue)";
const BURN = "var(--dot-gray)";

function MoneyLegend() {
  return (
    <span className="flex items-center gap-3 text-[12px] text-fg-2">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-[2px]" style={{ background: REVENUE }} /> Revenue
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-[2px]" style={{ background: BURN }} /> Burn
      </span>
    </span>
  );
}

/** Two bars per month on one money scale. Hidden until values are revealed. */
function MoneyChart({ months, highlight }: { months: string[]; highlight: string[] }) {
  const fin = useFinance();
  const money = useMonthMoney();
  const { visible } = useMoneyVisible();
  const { tipRef, ...tip } = useChartTip();
  const rows = months.map((m) => ({ m, revenue: money(m, "revenue"), burn: money(m, "burn") }));
  const max = Math.max(1, ...rows.flatMap((r) => [r.revenue.value ?? 0, r.burn.value ?? 0]));
  const H = 140;
  const fmt = (v: number | null) => (v == null ? "—" : visible ? formatMoney(v, fin.currency) : "••••••");
  if (!rows.some((r) => r.revenue.value != null || r.burn.value != null))
    return <p className="py-6 text-center text-[13px] text-fg-3">No money entered for these months — add it on the Month tab, or upload the finance sheet.</p>;
  const card = (r: (typeof rows)[number]) => {
    const net = r.revenue.value != null && r.burn.value != null ? r.revenue.value - r.burn.value : null;
    const sources = [r.revenue.source, r.burn.source];
    return (
      <TipCard
        title={monthName(r.m, "year")}
        rows={[
          { color: REVENUE, label: "Revenue", value: fmt(r.revenue.value) },
          { color: BURN, label: "Burn", value: fmt(r.burn.value) },
          { label: "Net", value: fmt(net) },
        ]}
        footer={!visible ? "Reveal values to see the amounts" : sources.includes("sheet") ? (sources.includes("entered") ? "Partly from the finance sheet" : "From the finance sheet") : sources.includes("entered") ? "Entered on the Month tab" : undefined}
      />
    );
  };
  return (
    <div ref={tipRef} className="relative">
      {tip.node}
      <div className="flex items-end gap-1.5" style={{ height: H }}>
        {rows.map((r) => (
          <div
            key={r.m}
            tabIndex={0}
            aria-label={`${monthName(r.m, "year")}: revenue ${fmt(r.revenue.value)}, burn ${fmt(r.burn.value)}`}
            {...tip.bind(card(r))}
            className={cn("flex h-full flex-1 items-end justify-center gap-[2px] rounded-t-md outline-none hover:bg-hover focus-visible:bg-hover", !highlight.includes(r.m) && "opacity-45 hover:opacity-100")}
          >
            {visible &&
              (["revenue", "burn"] as const).map((k) =>
                r[k].value != null ? (
                  <span key={k} className="flex h-full w-full max-w-[22px] flex-col items-center justify-end">
                    <span className="mb-0.5 hidden text-[10.5px] tabular text-fg-3 sm:block">{months.length <= 6 ? formatMoney(r[k].value, fin.currency, true) : ""}</span>
                    <span className="w-full rounded-t-[4px]" style={{ height: `${(r[k].value! / max) * (H - 18)}px`, background: k === "revenue" ? REVENUE : BURN }} />
                  </span>
                ) : (
                  <span key={k} className="w-full max-w-[22px]" />
                ),
              )}
          </div>
        ))}
      </div>
      {!visible && <div className="pointer-events-none absolute inset-x-0 top-12 text-center text-[12px] text-fg-3">Values hidden — use Reveal values</div>}
      <div className="border-t border-line-strong" />
      <div className="flex gap-1.5">
        {rows.map((r) => (
          <span key={r.m} className={cn("flex-1 pt-1 text-center text-[11px]", highlight.includes(r.m) ? "font-medium text-fg-2" : "text-fg-3")}>
            {monthName(r.m, "short")}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProjectStatus() {
  const { data } = useWorkspace();
  const { tipRef, ...tip } = useChartTip();
  const counts = PROJECT_STATUSES.map((s) => ({ ...s, projects: data.projects.filter((p) => p.status === s.value) })).filter((s) => s.projects.length > 0);
  const total = counts.reduce((a, s) => a + s.projects.length, 0);
  if (!total) return <p className="text-[13px] text-fg-3">No projects yet.</p>;
  const card = (s: (typeof counts)[number]) => (
    <TipCard
      title={s.label}
      rows={[{ color: `var(--dot-${s.color})`, label: s.projects.length === 1 ? "project" : "projects", value: s.projects.length, note: pct(s.projects.length, total) }]}
      details={[...s.projects.slice(0, 6).map((p) => p.name), ...(s.projects.length > 6 ? [`+${s.projects.length - 6} more`] : [])]}
    />
  );
  return (
    <div ref={tipRef} className="relative">
      {tip.node}
      <div className="flex h-3 gap-[2px] rounded-full">
        {counts.map((s) => (
          <span
            key={s.value}
            tabIndex={0}
            aria-label={`${s.label}: ${s.projects.length}`}
            {...tip.bind(card(s))}
            className={`dot-${s.color} outline-none first:rounded-l-full last:rounded-r-full hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[var(--accent)]`}
            style={{ width: `${(s.projects.length / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-fg-2">
        {counts.map((s) => (
          <span key={s.value} className="inline-flex cursor-default items-center gap-1.5" {...tip.bind(card(s))}>
            <span className={`dot-${s.color} size-2 rounded-full`} />
            {s.label} <span className="font-semibold tabular text-fg">{s.projects.length}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ProjectList({ title, projects }: { title: string; projects: { id: string; name: string; icon: string | null }[] }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[12px] font-medium text-fg-2">
        {title} · {projects.length}
      </div>
      {projects.length === 0 && <div className="text-fg-3">None</div>}
      {projects.slice(0, 6).map((p) => (
        <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-hover">
          <ProjectIcon icon={p.icon} className="w-4 text-center" />
          <span className="truncate">{p.name}</span>
        </Link>
      ))}
      {projects.length > 6 && <div className="px-1 text-fg-3">+{projects.length - 6} more</div>}
    </div>
  );
}

function DomainBars({ credits, domains }: { credits: Credit[]; domains: Domain[] }) {
  const members = useMembers();
  const { tipRef, ...tip } = useChartTip();
  const known = new Set(domains.map((d) => d.id));
  const rows = [
    ...domains.map((d) => ({ key: d.id, name: d.name, color: `var(--dot-${d.color})`, owner: d.owner_id, credits: credits.filter((c) => c.domain === d.id) })),
    { key: "none", name: "No domain", color: "var(--dot-default)", owner: null, credits: credits.filter((c) => !c.domain || !known.has(c.domain)) },
  ]
    .map((r) => ({ ...r, n: r.credits.reduce((a, c) => a + c.weight, 0) }))
    .filter((r) => r.n > 0 || r.key !== "none");
  const total = rows.reduce((a, r) => a + r.n, 0);
  const max = Math.max(1, ...rows.map((r) => r.n));
  if (!domains.length) return <p className="text-[13px] text-fg-3">No domains yet — add them in Settings → Workspace.</p>;
  const card = (r: (typeof rows)[number]) => {
    const owner = members.find((p) => p.id === r.owner);
    const byPerson = members
      .map((p) => ({ p, n: r.credits.filter((c) => c.profileId === p.id).reduce((a, c) => a + c.weight, 0) }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n);
    return (
      <TipCard
        title={`${r.name}${owner ? ` · owned by ${owner.full_name.split(" ")[0]}` : ""}`}
        rows={[
          { color: r.color, label: "tasks completed", value: fmtCount(r.n), note: pct(r.n, total) },
          ...byPerson.map((x) => ({ label: x.p.full_name.split(" ")[0]!, value: fmtCount(x.n), note: pct(x.n, r.n) })),
        ]}
        details={topProjects(r.credits, 3)}
      />
    );
  };
  return (
    <div ref={tipRef} className="relative space-y-1">
      {tip.node}
      {rows.map((r) => (
        <div
          key={r.key}
          tabIndex={0}
          aria-label={`${r.name}: ${fmtCount(r.n)} tasks`}
          {...tip.bind(card(r))}
          className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3 rounded-md px-1 py-1 text-[13px] outline-none hover:bg-hover focus-visible:bg-hover"
        >
          <span className="truncate text-fg-2">{r.name}</span>
          <span className="flex items-center gap-2">
            <span className="h-3 rounded-r-[4px]" style={{ width: `${(r.n / max) * 85}%`, minWidth: r.n ? 3 : 0, background: r.color }} />
            <span className="shrink-0 tabular">
              <span className="font-semibold">{fmtCount(r.n)}</span>
              {total > 0 && <span className="ml-1 text-fg-3">{Math.round((r.n / total) * 100)}%</span>}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
