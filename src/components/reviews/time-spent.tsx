"use client";

import { useState } from "react";
import { Pencil, Plus, Wand2, X } from "lucide-react";
import type { Profile, UUID } from "@/lib/types";
import { useWorkspace } from "@/lib/store";
import { monthName, monthStartOf, OTHER_WORK, shareLabel, sharesText, timeSplitAcross, WORK_TAGS, type Credit, type TimeShare } from "@/lib/studio-review";
import { cn } from "@/lib/utils";
import { Button, IconButton } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/misc";
import { Picker } from "@/components/ui/picker";
import { Popover, usePopover } from "@/components/ui/popover";
import { ProjectIcon } from "@/components/ui/project-icon";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import { TipCard, useChartTip } from "./chart-tip";
import { tagColor } from "./review-ui";

/** How many of these people have split the month to 100%. */
export function TimeSpentSummary({ month, people }: { month: string; people: Profile[] }) {
  const { data } = useWorkspace();
  const done = people.filter((p) => timeSplitAcross(data, [month], p.id).total === 100).length;
  return (
    <span className={cn("text-[12.5px]", done === people.length ? "text-[var(--success)]" : "text-fg-3")}>
      {done} of {people.length} filled in
    </span>
  );
}

/**
 * Reviews → Month → Time spent. Next to the task counts, each person says where their month actually
 * went: a split across projects (and other work) that adds up to 100%. Everyone sees everyone's; anyone
 * who can edit fills in their own, or a teammate's for them. Several months show each person's average over the months they filled in.
 */
export function TimeSpent({ months, people, credits }: { months: string[]; people: Profile[]; credits: Credit[] }) {
  const { data, me, canEdit } = useWorkspace();
  const [editing, setEditing] = useState<UUID | null>(null);
  const [thisMonth] = useState(() => monthStartOf(new Date()));
  const { tipRef, ...tip } = useChartTip();
  const single = months.length === 1;
  const month = months[0]!;
  const segmentTip = (name: string, s: TimeShare) => (
    <TipCard title={`${name} · ${shareLabel(s)}`} rows={[{ color: tagColor(s.tag), label: single ? "of their month" : "of their months, on average", value: `${Math.round(s.percent)}%` }]} />
  );

  return (
    <div ref={tipRef} className="relative space-y-1">
      {tip.node}
      {people.map((person) => {
        const name = person.full_name.split(" ")[0]!;
        const { shares, total, filled } = timeSplitAcross(data, months, person.id);
        const mine = person.id === me?.id;
        const status = single
          ? total === 100
            ? sharesText(shares)
            : total
              ? `${total}% filled in, ${100 - total}% to go`
              : month < thisMonth
                ? "Not filled in"
                : "Not filled in yet"
          : filled
            ? `${sharesText(shares)} · average of ${filled} of ${months.length} months`
            : "Not filled in for these months";
        return (
          <div key={person.id}>
            <div className="grid grid-cols-[112px_minmax(0,1fr)] items-start gap-3 rounded-md px-1.5 py-1.5 sm:grid-cols-[140px_minmax(0,1fr)]">
              <span className="flex h-5 min-w-0 items-center gap-2">
                <Avatar profile={person} size={22} />
                <span className="truncate text-[14px] font-medium">{name}</span>
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="flex h-5 min-w-0 flex-1 gap-[2px] overflow-hidden rounded-[4px] bg-subtle shadow-[inset_0_0_0_1px_var(--border)]">
                    {/* Grouped Client → Studio → Personal, like the task bars above; the text below goes biggest first. */}
                    {[...shares].sort((a, b) => WORK_TAGS.indexOf(a.tag) - WORK_TAGS.indexOf(b.tag) || b.percent - a.percent).map((s) => (
                      <span
                        key={s.projectId ?? "other"}
                        {...tip.bind(segmentTip(name, s))}
                        className="h-full shrink-0 transition-[filter] hover:brightness-110"
                        style={{ width: `${Math.min(s.percent, 100)}%`, background: tagColor(s.tag) }}
                      />
                    ))}
                  </span>
                  <span className={cn("w-10 shrink-0 text-right text-[13px] font-semibold tabular", total !== 100 && "text-fg-3")}>{total ? `${Math.round(total)}%` : "—"}</span>
                </span>
                <span className="mt-0.5 flex items-center gap-2">
                  <span className={cn("min-w-0 flex-1 truncate text-[12px] tabular", total === 100 ? "text-fg-3" : "text-[var(--dot-orange)]")} title={total === 100 || !single ? status : undefined}>
                    {status}
                  </span>
                  {canEdit && single && editing !== person.id && (
                    <Button size="sm" variant={total === 100 || !mine ? "ghost" : "primary"} onClick={() => setEditing(person.id)}>
                      <Pencil className="size-3" /> {mine ? (total ? "Edit yours" : "Fill in yours") : total ? `Edit ${name}'s` : `Fill in for ${name}`}
                    </Button>
                  )}
                </span>
              </span>
            </div>
            {editing === person.id && single && (
              <SplitEditor month={month} person={person} credits={credits.filter((c) => c.profileId === person.id)} onDone={() => setEditing(null)} />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface Item {
  projectId: UUID | null;
  percent: number;
}

const keyOf = (id: UUID | null) => id ?? "other";

/** Task counts per project, rounded to 5% steps that add up to 100. */
function splitByTasks(credits: Credit[]): Item[] {
  const by = new Map<UUID | null, number>();
  credits.forEach((c) => by.set(c.project?.id ?? null, (by.get(c.project?.id ?? null) ?? 0) + c.weight));
  const total = [...by.values()].reduce((a, b) => a + b, 0);
  const raw = [...by].map(([projectId, w]) => ({ projectId, exact: (w / total) * 20 }));
  const items = raw.map((r) => ({ projectId: r.projectId, steps: Math.floor(r.exact), rest: r.exact - Math.floor(r.exact) }));
  let left = 20 - items.reduce((a, b) => a + b.steps, 0);
  [...items].sort((a, b) => b.rest - a.rest).forEach((i) => {
    if (left > 0) {
      i.steps += 1;
      left -= 1;
    }
  });
  return items.filter((i) => i.steps > 0).sort((a, b) => b.steps - a.steps).map((i) => ({ projectId: i.projectId, percent: i.steps * 5 }));
}

/** A person's split for the month (yours, or a teammate's): a row per project with a slider and a number; saves only at exactly 100%. */
function SplitEditor({ month, person, credits, onDone }: { month: string; person: Profile; credits: Credit[]; onDone: () => void }) {
  const { data, me, create, update, remove } = useWorkspace();
  const toast = useToast();
  const { setAnchor, ...pop } = usePopover();
  const mine = person.id === me?.id;
  const name = person.full_name.split(" ")[0]!;
  const whose = mine ? "your" : `${name}'s`;
  const saved = data.time_splits.filter((r) => r.month === month && r.profile_id === person.id);
  const [items, setItems] = useState<Item[]>(() => {
    if (saved.length) return timeSplitAcross(data, [month], person.id).shares.map((s) => ({ projectId: s.projectId, percent: s.percent }));
    // Start from the projects they finished tasks on this month, at 0%.
    return splitByTasks(credits).map((i) => ({ ...i, percent: 0 }));
  });
  const [busy, setBusy] = useState(false);
  const projects = new Map(data.projects.map((p) => [p.id, p]));
  const total = items.reduce((a, b) => a + b.percent, 0);
  const set = (id: UUID | null, percent: number) =>
    setItems((list) => list.map((i) => (i.projectId === id ? { ...i, percent: Math.max(0, Math.min(100, Math.round(percent) || 0)) } : i)));
  const taken = new Set(items.map((i) => keyOf(i.projectId)));
  const choices = [
    ...data.projects.filter((p) => p.status !== "archived" && !taken.has(p.id)).map((p) => ({ value: p.id, label: p.name, render: <ProjectLabel icon={p.icon} name={p.name} /> })),
    ...(taken.has("other") ? [] : [{ value: "other", label: `${OTHER_WORK} (admin, meetings, learning)`, render: <ProjectLabel icon="📋" name={`${OTHER_WORK} — admin, meetings, learning`} /> }]),
  ];

  const save = async () => {
    if (!me || total !== 100) return;
    setBusy(true);
    const want = new Map(items.filter((i) => i.percent > 0).map((i) => [keyOf(i.projectId), i]));
    const kept = new Set<string>();
    const ops: (() => Promise<unknown>)[] = [];
    for (const r of saved) {
      const k = keyOf(r.project_id);
      const w = want.get(k);
      if (!w || kept.has(k)) ops.push(() => remove("time_splits", r.id));
      else {
        kept.add(k);
        if (w.percent !== r.percent) ops.push(() => update("time_splits", r.id, { percent: w.percent }));
      }
    }
    for (const [k, w] of want)
      if (!kept.has(k)) ops.push(() => create("time_splits", { month, profile_id: person.id, project_id: w.projectId, percent: w.percent, created_by: me.id }));
    // One at a time, stopping at the first failure: the store has already shown its toast, so a broken
    // save gives one error (not one per row) and the editor stays open with your numbers.
    let ok = true;
    for (const op of ops) {
      ok = (await op().catch(() => false)) !== false;
      if (!ok) break;
    }
    setBusy(false);
    if (!ok) return;
    toast.show({ title: `${mine ? "Your" : `${name}'s`} ${monthName(month)} is filled in`, tone: "success" });
    onDone();
  };

  return (
    <div className="mb-3 ml-[124px] mt-1 rounded-lg bg-subtle p-3 max-sm:ml-0 sm:ml-[152px]">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <p className="text-[13px] text-fg-2">
          Where did {whose} {monthName(month)} go? Give each project its share of {mine ? "your" : "their"} time, to 100%.
        </p>
        {credits.length > 0 && (
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setItems(splitByTasks(credits))} title={`Fill in from how many tasks ${mine ? "you" : name} finished on each project — then adjust`}>
            <Wand2 className="size-3" /> Start from {mine ? "my" : `${name}'s`} tasks
          </Button>
        )}
      </div>
      <div className="divide-y divide-line">
        {items.map((i) => {
          const p = i.projectId ? projects.get(i.projectId) : undefined;
          const label = p?.name ?? OTHER_WORK;
          return (
            <div key={keyOf(i.projectId)} className="flex items-center gap-2 py-1.5 sm:gap-3">
              <span className="min-w-0 flex-1 text-[14px]">
                <ProjectLabel icon={p?.icon ?? "📋"} name={label} />
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={i.percent}
                aria-label={`${label}: share of ${whose} month`}
                onChange={(e) => set(i.projectId, Number(e.target.value))}
                className="w-24 accent-[var(--accent)] sm:w-40"
              />
              <span className="flex items-center gap-0.5">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  value={i.percent}
                  aria-label={`${label}: percent`}
                  onChange={(e) => set(i.projectId, Number(e.target.value))}
                  className="h-7 w-12 rounded-md bg-input px-1.5 text-right text-[13px] tabular shadow-[inset_0_0_0_1px_var(--border-strong)] outline-none focus:shadow-[inset_0_0_0_1px_var(--accent)]"
                />
                <span className="text-[13px] text-fg-3">%</span>
              </span>
              <IconButton label={`Remove ${label}`} onClick={() => setItems((list) => list.filter((x) => x !== i))}>
                <X className="size-3.5" />
              </IconButton>
            </div>
          );
        })}
      </div>
      <button ref={setAnchor} type="button" onClick={pop.toggle} className="mt-1 flex h-8 items-center gap-2 text-[13.5px] text-fg-3 hover:text-fg">
        <Plus className="size-4" /> Add a project or other work
      </button>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor} width={300}>
        <Picker
          items={choices}
          placeholder="Search projects…"
          onSelect={(v) => {
            setItems((list) => [...list, { projectId: v === "other" ? null : v, percent: 0 }]);
            pop.close();
          }}
        />
      </Popover>
      <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-line pt-3">
        <span className="flex items-center gap-2 whitespace-nowrap text-[13px]">
          <ProgressBar value={Math.min(total, 100) / 100} tone={total === 100 ? "green" : total > 100 ? "red" : "default"} className="w-24 shrink-0" />
          <span className={cn("tabular", total === 100 ? "text-[var(--success)]" : total > 100 ? "text-danger" : "text-fg-2")}>
            {total === 100 ? "100%, all placed" : total < 100 ? `${total}% placed, ${100 - total}% to go` : `${total}%, ${total - 100}% too much`}
          </span>
        </span>
        <span className="ml-auto flex gap-1.5">
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button variant="primary" disabled={total !== 100 || busy} onClick={() => void save()}>
            Save
          </Button>
        </span>
      </div>
    </div>
  );
}

function ProjectLabel({ icon, name }: { icon: string | null; name: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <ProjectIcon icon={icon} className="w-4 shrink-0 text-center" />
      <span className="truncate">{name}</span>
    </span>
  );
}
