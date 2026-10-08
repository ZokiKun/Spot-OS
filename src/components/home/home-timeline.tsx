"use client";

import { useState } from "react";
import Link from "next/link";
import { addDays, format, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { useProfiles, useWorkspace } from "@/lib/store";
import { addDaysISO, cn, parseDate, toISODate } from "@/lib/utils";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { taskAssignees } from "@/lib/selectors";
import { Button, IconButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { useTaskPeek } from "@/components/tasks/task-peek";
import { DatedRow, GroupLabel, relativeDue } from "./home-blocks";
import type { DatedItem } from "./home-data";

/** Day-by-day agenda: overdue items first, then one block per day that has something. */
export function Agenda({
  items,
  today,
  until,
  showAssignee,
  emptyTitle,
}: {
  items: DatedItem[];
  today: string;
  until: string;
  showAssignee?: boolean;
  emptyTitle: string;
}) {
  const late = items.filter((i) => i.date < today);
  const days = new Map<string, DatedItem[]>();
  items
    .filter((i) => i.date >= today && i.date <= until)
    .forEach((i) => days.set(i.date, [...(days.get(i.date) ?? []), i]));
  // Always show today, even when empty, so the timeline has an anchor.
  if (!days.has(today)) days.set(today, []);
  const ordered = [...days.entries()].sort(([a], [b]) => a.localeCompare(b));

  if (!late.length && ordered.every(([, list]) => !list.length)) return <EmptyState title={emptyTitle} className="py-8" />;

  return (
    <ol className="space-y-1">
      {late.length > 0 && (
        <AgendaDay label="Overdue" sub={`${late.length}`} tone="danger">
          {late.map((i) => (
            <DatedRow key={key(i)} item={i} showAssignee={showAssignee} />
          ))}
        </AgendaDay>
      )}
      {ordered.map(([date, list]) => {
        const d = parseDate(date)!;
        const isToday = date === today;
        return (
          <AgendaDay
            key={date}
            label={isToday ? "Today" : date === addDaysISO(today, 1) ? "Tomorrow" : format(d, "EEE")}
            sub={format(d, "MMM d")}
            current={isToday}
          >
            {list.length ? list.map((i) => <DatedRow key={key(i)} item={i} showAssignee={showAssignee} />) : <div className="px-2 py-2 text-[13px] text-fg-3">Nothing due today</div>}
          </AgendaDay>
        );
      })}
    </ol>
  );
}

function AgendaDay({
  label,
  sub,
  tone,
  current,
  children,
}: {
  label: string;
  sub: string;
  tone?: "danger";
  current?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 sm:grid-cols-[96px_minmax(0,1fr)]">
      <div className="pt-2 text-right">
        <div className={cn("text-[13px] font-medium", tone === "danger" ? "text-danger" : current ? "text-fg" : "text-fg-2")}>{label}</div>
        <div className="text-[12px] text-fg-3 tabular">{sub}</div>
      </div>
      <div className={cn("border-l-2 py-1 pl-2", tone === "danger" ? "border-[var(--dot-red)]" : current ? "border-fg" : "border-line")}>{children}</div>
    </li>
  );
}

const key = (i: DatedItem) => (i.kind === "task" ? `t-${i.task.id}` : `p-${i.project.id}`);

/** Seven-day strip with week paging. Overdue items ride along above the current week. */
export function WeekStrip({ items, today, showAssignee }: { items: DatedItem[]; today: string; showAssignee?: boolean }) {
  const [offset, setOffset] = useState(0);
  const start = addDays(startOfWeek(parseDate(today)!, { weekStartsOn: 1 }), offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => toISODate(addDays(start, i)));
  const late = offset === 0 ? items.filter((i) => i.date < days[0]! || (i.date < today && i.kind === "task")) : [];
  const lateIds = new Set(late.map(key));
  const end = addDays(start, 6);

  return (
    <div>
      <div className="mb-3 flex items-center gap-1">
        <IconButton label="Previous week" onClick={() => setOffset((o) => o - 1)}>
          <ChevronLeft className="size-4" />
        </IconButton>
        <IconButton label="Next week" onClick={() => setOffset((o) => o + 1)}>
          <ChevronRight className="size-4" />
        </IconButton>
        <span className="ml-1 text-[14px] font-medium">
          {format(start, "MMM d")} – {format(end, start.getMonth() === end.getMonth() ? "d" : "MMM d")}
        </span>
        {offset !== 0 && (
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setOffset(0)}>
            This week
          </Button>
        )}
      </div>

      {late.length > 0 && (
        <div className="mb-3 rounded-lg bg-danger-soft px-2 py-1.5">
          <GroupLabel label="Overdue" count={late.length} tone="danger" />
          <div className="flex flex-wrap gap-1.5 px-1 pb-1">
            {late.map((i) => (
              <WeekChip key={key(i)} item={i} showAssignee={showAssignee} late />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-1.5 md:grid-cols-7">
        {days.map((date, idx) => {
          const list = items.filter((i) => i.date === date && !lateIds.has(key(i)));
          const isToday = date === today;
          const weekend = idx >= 5;
          const d = parseDate(date)!;
          return (
            <div
              key={date}
              className={cn(
                "flex min-w-0 flex-col rounded-lg p-1.5 md:min-h-[180px]",
                isToday ? "shadow-[inset_0_0_0_1.5px_var(--text)]" : "shadow-[inset_0_0_0_1px_var(--border)]",
                weekend && !isToday && "bg-subtle",
                !list.length && "max-md:hidden",
              )}
            >
              <div className="mb-1 flex items-baseline gap-1.5 px-1">
                <span className={cn("text-[12px]", isToday ? "font-semibold text-fg" : "text-fg-2")}>{format(d, "EEE")}</span>
                <span className={cn("text-[12px] tabular", isToday ? "font-semibold text-fg" : "text-fg-3")}>{format(d, "d")}</span>
                {isToday && <span className="ml-auto text-[11px] font-medium text-fg-2">Today</span>}
              </div>
              <div className="flex flex-col gap-1">
                {list.map((i) => (
                  <WeekChip key={key(i)} item={i} showAssignee={showAssignee} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-4 px-1 text-[11px] text-fg-3">
        <span>Solid = task</span>
        <span className="flex items-center gap-1">
          <Flag className="size-3" /> Dashed = project deadline
        </span>
      </div>
    </div>
  );
}

function WeekChip({ item, showAssignee, late }: { item: DatedItem; showAssignee?: boolean; late?: boolean }) {
  const { data } = useWorkspace();
  const people = useProfiles();
  const { openTask } = useTaskPeek();

  if (item.kind === "deadline") {
    const p = item.project;
    return (
      <Link
        href={`/projects/${p.id}`}
        title={`${p.name} — deadline`}
        className="flex min-w-0 items-center gap-1.5 rounded-md border border-dashed border-line-strong px-1.5 py-1 text-[12px] hover:bg-hover"
      >
        <Flag className="size-3 shrink-0 text-fg-3" />
        <span className="min-w-0 truncate font-medium">{p.name}</span>
      </Link>
    );
  }

  const t = item.task;
  const project = t.project_id ? data.projects.find((p) => p.id === t.project_id) : undefined;
  return (
    <button
      type="button"
      onClick={() => openTask(t.id)}
      title={t.title}
      className={cn(
        "flex min-w-0 items-start gap-1.5 rounded-md bg-active px-1.5 py-1 text-left text-[12px] leading-4 transition-colors hover:bg-hover",
        late && "max-w-[260px] bg-bg",
      )}
    >
      {project?.icon && <span className="shrink-0">{project.icon}</span>}
      <span className={cn("min-w-0 flex-1", late ? "truncate" : "line-clamp-2 break-words")}>{t.title}</span>
      {late && <span className="shrink-0 font-medium text-danger tabular">{relativeDue(item.date)}</span>}
      {showAssignee && (taskAssignees(t).length ? <AvatarStack profiles={taskAssignees(t).map((id) => people.get(id))} size={16} /> : <Avatar profile={null} size={16} />)}
    </button>
  );
}
