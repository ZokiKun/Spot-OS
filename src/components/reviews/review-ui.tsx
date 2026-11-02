"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { Profile, Review, UUID } from "@/lib/types";
import { useWorkspace } from "@/lib/store";
import { useFinance } from "@/lib/finance/use-finance";
import {
  blankMonthReview,
  findMonthReview,
  fmtCount,
  isReviewMember,
  monthName,
  monthStartOf,
  monthsLabel,
  quarterOfMonth,
  shiftMonth,
  tagCounts,
  TAG_META,
  WORK_TAGS,
  type Credit,
  type TagCounts,
  type WorkTag,
} from "@/lib/studio-review";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { ProjectIcon } from "@/components/ui/project-icon";
import { Popover, usePopover } from "@/components/ui/popover";
import { pct, TipCard, useChartTip } from "./chart-tip";

/** Members the review is about (view-only bots and the Push-to-fix Claude member are left out). */
export function useMembers() {
  const { data } = useWorkspace();
  return useMemo(() => data.profiles.filter(isReviewMember), [data.profiles]);
}

/** Creates in flight, so two quick first writes to the same month share one row (it's unique per period). */
const creating = new Map<string, Promise<Review>>();

/** Finds the month's reviews row, creating it on first write. */
export function useEnsureMonthReview(month: string) {
  const { data, create, me } = useWorkspace();
  const existing = findMonthReview(data, month);
  return useCallback(async () => {
    if (existing) return existing;
    let pending = creating.get(month);
    if (!pending) {
      pending = create("reviews", blankMonthReview(month, me?.id ?? null)).finally(() => setTimeout(() => creating.delete(month), 1000));
      creating.set(month, pending);
    }
    return pending;
  }, [existing, create, month, me]);
}

/** A month's revenue / burn: the typed-in number, else the finance sheet's. */
export function useMonthMoney() {
  const { data } = useWorkspace();
  const fin = useFinance();
  return useCallback(
    (month: string, field: "revenue" | "burn"): { value: number | null; source: "entered" | "sheet" | null } => {
      const entered = findMonthReview(data, month)?.[field];
      if (entered != null) return { value: entered, source: "entered" };
      const s = fin.summary?.months.find((x) => x.key === month.slice(0, 7));
      const fromSheet = s ? (field === "revenue" ? s.income : s.expenses) : null;
      return fromSheet != null ? { value: fromSheet, source: "sheet" } : { value: null, source: null };
    },
    [data, fin.summary],
  );
}

export const tagColor = (t: WorkTag) => `var(--dot-${TAG_META[t].color})`;

export function TagLegend({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-fg-2", className)}>
      {WORK_TAGS.map((t) => (
        <span key={t} className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-[2px]" style={{ background: tagColor(t) }} />
          {TAG_META[t].label}
        </span>
      ))}
    </span>
  );
}

export function Card({ title, subtitle, action, children, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl p-4 shadow-[0_0_0_1px_var(--border)] sm:p-5", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold">{title}</h2>
          {subtitle && <div className="mt-0.5 text-[12.5px] text-fg-3">{subtitle}</div>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// ─── Filters ───

/** The month to open on: this month, except in its first week, when last month is the one being reviewed. */
export function defaultMonth(today = new Date()) {
  const month = monthStartOf(today);
  return today.getDate() <= 7 ? shiftMonth(month, -1) : month;
}

function FilterButton({ setAnchor, onClick, children }: { setAnchor: (el: HTMLButtonElement | null) => void; onClick: () => void; children: ReactNode }) {
  return (
    <button
      ref={setAnchor}
      type="button"
      onClick={onClick}
      className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[14px] font-medium shadow-[inset_0_0_0_1px_var(--border-strong)] hover:bg-hover"
    >
      {children}
      <ChevronDown className="size-3.5 text-fg-3" />
    </button>
  );
}

/** One month, or several (tick more than one). Presets for the usual ranges. */
export function MonthPicker({ value, onChange }: { value: string[]; onChange: (months: string[]) => void }) {
  const { setAnchor, ...pop } = usePopover();
  const [now] = useState(() => new Date());
  const thisMonth = monthStartOf(now);
  const list = Array.from({ length: 18 }, (_, i) => shiftMonth(thisMonth, -i));
  const sorted = [...value].sort();
  const contiguous = sorted.every((m, i) => i === 0 || m === shiftMonth(sorted[i - 1]!, 1));
  const label = contiguous ? monthsLabel(sorted) : `${sorted.length} months`;
  const q = quarterOfMonth(thisMonth);
  const presets: [string, string[]][] = [
    ["This month", [thisMonth]],
    ["Last month", [shiftMonth(thisMonth, -1)]],
    ["Last 3 months", [shiftMonth(thisMonth, -2), shiftMonth(thisMonth, -1), thisMonth]],
    ["This quarter", [q, shiftMonth(q, 1), shiftMonth(q, 2)].filter((m) => m <= thisMonth)],
    ["Last quarter", [shiftMonth(q, -3), shiftMonth(q, -2), shiftMonth(q, -1)]],
  ];
  const toggle = (m: string) => {
    const next = value.includes(m) ? value.filter((x) => x !== m) : [...value, m];
    if (next.length) onChange(next.sort());
  };
  return (
    <>
      <FilterButton setAnchor={setAnchor} onClick={pop.toggle}>
        {label}
      </FilterButton>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor} width={260}>
        <div className="flex flex-wrap gap-1 border-b border-line p-2">
          {presets.map(([name, months]) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                onChange(months);
                pop.close();
              }}
              className="h-6 rounded-full px-2 text-[12px] text-fg-2 shadow-[inset_0_0_0_1px_var(--border)] hover:bg-hover hover:text-fg"
            >
              {name}
            </button>
          ))}
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          <div className="px-2 pb-1 pt-1.5 text-[11px] text-fg-3">Click a month, or tick several</div>
          {list.map((m) => {
            const on = value.includes(m);
            return (
              <div key={m} className={cn("flex items-center gap-1 rounded-md", on && "bg-selected")}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  aria-label={`Include ${monthName(m, "year")}`}
                  onClick={() => toggle(m)}
                  className="flex size-7 shrink-0 items-center justify-center"
                >
                  <span className={cn("flex size-4 items-center justify-center rounded-[3px]", on ? "bg-accent text-white" : "shadow-[inset_0_0_0_1.5px_var(--text-3)]")}>
                    {on && <Check className="size-3" strokeWidth={3} />}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange([m]);
                    pop.close();
                  }}
                  className="h-7 flex-1 rounded-md pr-2 text-left text-[14px] hover:bg-hover"
                >
                  {monthName(m, "year")}
                  {m === thisMonth && <span className="ml-1.5 text-[12px] text-fg-3">now</span>}
                </button>
              </div>
            );
          })}
        </div>
      </Popover>
    </>
  );
}

export function PersonPicker({ value, onChange }: { value: UUID | null; onChange: (id: UUID | null) => void }) {
  const members = useMembers();
  const { setAnchor, ...pop } = usePopover();
  const current = members.find((p) => p.id === value);
  const options: (Profile | null)[] = [null, ...members];
  return (
    <>
      <FilterButton setAnchor={setAnchor} onClick={pop.toggle}>
        {current ? (
          <>
            <Avatar profile={current} size={18} />
            {current.full_name.split(" ")[0]}
          </>
        ) : (
          "Everyone"
        )}
      </FilterButton>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor} width={220}>
        <div className="p-1">
          {options.map((p) => (
            <button
              key={p?.id ?? "all"}
              type="button"
              onClick={() => {
                onChange(p?.id ?? null);
                pop.close();
              }}
              className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[14px] hover:bg-hover"
            >
              {p ? <Avatar profile={p} size={20} /> : <span className="w-5" />}
              <span className="flex-1">{p ? p.full_name : "Everyone"}</span>
              {(p?.id ?? null) === value && <Check className="size-4 text-accent" />}
            </button>
          ))}
        </div>
      </Popover>
    </>
  );
}

// ─── Where the time went: one bar per person ───

/**
 * Tasks each person completed, split by Client / Studio / Personal. Bars share one scale, so a longer
 * bar is more done. Click a person for the projects behind it.
 */
export function PersonBars({ credits, people, openByDefault = false }: { credits: Credit[]; people: Profile[]; openByDefault?: boolean }) {
  const rows = people.map((p) => ({ person: p, credits: credits.filter((c) => c.profileId === p.id) })).map((r) => ({ ...r, counts: tagCounts(r.credits) }));
  const max = Math.max(1, ...rows.map((r) => r.counts.total));
  const [open, setOpen] = useState<Set<string>>(() => new Set(openByDefault ? people.map((p) => p.id) : []));
  const toggle = (id: string) => setOpen((s) => (s.has(id) ? new Set([...s].filter((x) => x !== id)) : new Set([...s, id])));
  const { tipRef, ...tip } = useChartTip();
  const summary = (name: string, counts: TagCounts) => (
    <TipCard
      title={`${name} · ${fmtCount(counts.total)} tasks`}
      rows={WORK_TAGS.map((t) => ({ color: tagColor(t), label: TAG_META[t].label, value: fmtCount(counts[t]), note: pct(counts[t], counts.total) }))}
      footer="Click for their projects"
    />
  );
  const segment = (name: string, t: WorkTag, counts: TagCounts, mine: Credit[]) => (
    <TipCard
      title={`${name} · ${TAG_META[t].label}`}
      rows={[{ color: tagColor(t), label: "tasks completed", value: fmtCount(counts[t]), note: `${pct(counts[t], counts.total)} of theirs` }]}
      details={topProjects(mine.filter((c) => c.tag === t))}
    />
  );

  return (
    <div ref={tipRef} className="relative space-y-1">
      {tip.node}
      {rows.map(({ person, counts, credits: mine }) => {
        const isOpen = open.has(person.id);
        return (
          <div key={person.id}>
            <button
              type="button"
              onClick={() => toggle(person.id)}
              aria-expanded={isOpen}
              className="grid w-full grid-cols-[112px_minmax(0,1fr)] items-center gap-3 rounded-md px-1.5 py-1.5 text-left hover:bg-hover sm:grid-cols-[140px_minmax(0,1fr)]"
            >
              <span className="flex min-w-0 items-center gap-2" {...tip.bind(summary(person.full_name.split(" ")[0]!, counts))}>
                <Avatar profile={person} size={22} />
                <span className="truncate text-[14px] font-medium">{person.full_name.split(" ")[0]}</span>
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="flex h-5 min-w-0 gap-[2px]" style={{ width: `${(counts.total / max) * 100}%` }}>
                    {WORK_TAGS.map((t) =>
                      counts[t] > 0 ? (
                        <span
                          key={t}
                          {...tip.bind(segment(person.full_name.split(" ")[0]!, t, counts, mine))}
                          className="h-full transition-[filter] first:rounded-l-[4px] last:rounded-r-[4px] hover:brightness-110"
                          style={{ width: `${(counts[t] / counts.total) * 100}%`, background: tagColor(t) }}
                        />
                      ) : null,
                    )}
                  </span>
                  <span className="shrink-0 text-[13px] font-semibold tabular" {...tip.bind(summary(person.full_name.split(" ")[0]!, counts))}>
                    {fmtCount(counts.total)}
                  </span>
                </span>
                <span className="mt-0.5 block text-[12px] tabular text-fg-3">
                  {counts.total
                    ? WORK_TAGS.filter((t) => counts[t] > 0)
                        .map((t) => `${TAG_META[t].label} ${fmtCount(counts[t])}`)
                        .join(" · ")
                    : "No completed tasks"}
                </span>
              </span>
            </button>
            {isOpen && mine.length > 0 && <ProjectBreakdown credits={mine} />}
          </div>
        );
      })}
    </div>
  );
}

/** "Northwind rebrand — 6" for the biggest projects in a set of credits. */
export function topProjects(credits: Credit[], n = 4) {
  const by = new Map<string, number>();
  credits.forEach((c) => by.set(c.project?.name ?? "No project", (by.get(c.project?.name ?? "No project") ?? 0) + c.weight));
  const list = [...by.entries()].sort((a, b) => b[1] - a[1]);
  return [...list.slice(0, n).map(([name, w]) => `${name} — ${fmtCount(w)}`), ...(list.length > n ? [`+${list.length - n} more`] : [])];
}

function ProjectBreakdown({ credits }: { credits: Credit[] }) {
  const groups = new Map<string, { name: string; icon: string | null; tag: WorkTag; weight: number; titles: string[] }>();
  credits.forEach((c) => {
    const key = c.project?.id ?? "none";
    const g = groups.get(key) ?? { name: c.project?.name ?? "No project", icon: c.project?.icon ?? "📋", tag: c.tag, weight: 0, titles: [] };
    g.weight += c.weight;
    g.titles.push(c.task.title);
    groups.set(key, g);
  });
  const list = [...groups.values()].sort((a, b) => b.weight - a.weight);
  return (
    <div className="mb-2 ml-[124px] mt-0.5 space-y-0.5 border-l border-line pl-3 max-sm:ml-4 sm:ml-[152px]">
      {list.map((g) => (
        <div key={g.name} className="flex items-center gap-2 text-[13px]" title={g.titles.join("\n")}>
          <span className="size-1.5 shrink-0 rounded-full" style={{ background: tagColor(g.tag) }} />
          <ProjectIcon icon={g.icon} className="w-4 text-center" />
          <span className="min-w-0 flex-1 truncate">{g.name}</span>
          <span className="tabular text-fg-2">{fmtCount(g.weight)}</span>
        </div>
      ))}
    </div>
  );
}
