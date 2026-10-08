"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarClock, CalendarRange, Flag, LayoutDashboard, LayoutGrid, List, Table2 } from "lucide-react";
import type { Project } from "@/lib/types";
import type { Workload } from "@/lib/selectors";
import { PROJECT_STATUSES, PROJECT_TYPES, optionFor } from "@/lib/constants";
import { hasClient, projectProgress, taskAssignees } from "@/lib/selectors";
import { useProfiles, useWorkspace } from "@/lib/store";
import { cn, daysUntil, formatDay } from "@/lib/utils";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/input";
import { EmptyState, ProgressBar } from "@/components/ui/misc";
import { StatusTag, Tag } from "@/components/ui/tag";
import { statusPatch, useTaskPeek } from "@/components/tasks/task-peek";
import { NextStepText } from "@/components/projects/project-timeline";
import type { DatedItem, HomeLayout } from "./home-data";

const LAYOUT_META: Record<HomeLayout, { label: string; icon: ReactNode }> = {
  table: { label: "Table", icon: <Table2 className="size-4" /> },
  list: { label: "List", icon: <List className="size-4" /> },
  grid: { label: "Grid", icon: <LayoutGrid className="size-4" /> },
  agenda: { label: "Agenda", icon: <CalendarClock className="size-4" /> },
  week: { label: "Week", icon: <CalendarRange className="size-4" /> },
  bento: { label: "Bento", icon: <LayoutDashboard className="size-4" /> },
};

/** Icon segmented control; the selected layout also shows its name. */
export function LayoutSwitcher({ value, onChange, layouts }: { value: HomeLayout; onChange: (v: HomeLayout) => void; layouts: HomeLayout[] }) {
  return (
    <div role="radiogroup" aria-label="Home layout" className="flex shrink-0 items-center gap-0.5 rounded-md p-0.5 shadow-[inset_0_0_0_1px_var(--border)]">
      {layouts.map((l) => {
        const selected = l === value;
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={LAYOUT_META[l].label}
            title={LAYOUT_META[l].label}
            onClick={() => onChange(l)}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-[5px] px-1.5 text-[13px] transition-colors duration-100",
              selected ? "bg-active font-medium text-fg" : "text-fg-3 hover:bg-hover hover:text-fg-2",
            )}
          >
            {LAYOUT_META[l].icon}
            {selected && <span className="hidden pr-0.5 sm:inline">{LAYOUT_META[l].label}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Bordered widget used by the grid and bento layouts. */
export function Panel({
  title,
  icon,
  action,
  children,
  className,
}: {
  title: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-lg p-3 shadow-[inset_0_0_0_1px_var(--border)]", className)}>
      <div className="mb-2 flex h-6 items-center gap-1.5 px-1 text-[12px] font-medium text-fg-2">
        {icon && <span className="flex size-3.5 items-center justify-center">{icon}</span>}
        <span className="min-w-0 truncate">{title}</span>
        {action && <span className="ml-auto flex shrink-0 items-center">{action}</span>}
      </div>
      {children}
    </section>
  );
}

export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="rounded px-1 hover:bg-hover">
      {children}
    </Link>
  );
}

/** Big-number tile. Tone colours the number only when it matters (e.g. overdue > 0). */
export function StatTile({ label, value, hint, tone, href }: { label: string; value: ReactNode; hint?: string; tone?: "danger"; href?: string }) {
  const body = (
    <>
      <div className={cn("text-[12px]", tone === "danger" ? "text-danger" : "text-fg-2")}>{label}</div>
      <div className={cn("mt-0.5 text-[26px] font-semibold leading-tight tabular", tone === "danger" && "text-danger")}>{value}</div>
      {hint && <div className="mt-0.5 truncate text-[12px] text-fg-3">{hint}</div>}
    </>
  );
  const cls = "block min-w-0 rounded-lg px-3.5 py-3 shadow-[inset_0_0_0_1px_var(--border)]";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:bg-hover")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** "3d late" / "in 4d" — overdue states are spelled out, never colour alone. */
export function relativeDue(date: string) {
  const d = daysUntil(date)!;
  if (d < 0) return `${-d}d late`;
  if (d === 0) return "today";
  return `in ${d}d`;
}

/** One row on a dated timeline: a task (checkbox) or a project deadline (flag). */
export function DatedRow({ item, showDate, showAssignee }: { item: DatedItem; showDate?: boolean; showAssignee?: boolean }) {
  const { data, update } = useWorkspace();
  const people = useProfiles();
  const { openTask } = useTaskPeek();
  const late = (daysUntil(item.date) ?? 0) < 0;

  if (item.kind === "deadline") {
    const p = item.project;
    return (
      <Link href={`/projects/${p.id}`} className="flex h-[34px] items-center gap-2.5 rounded-md px-2 hover:bg-hover">
        <Flag className="size-3.5 shrink-0 text-fg-3" />
        <span className="shrink-0 text-[14px]">{p.icon}</span>
        <span className="min-w-0 flex-1 truncate text-[14px]">{p.name}</span>
        <span className="shrink-0 text-[12px] text-fg-3">Deadline</span>
        {showDate && <span className="w-16 shrink-0 text-right text-[12px] text-fg-2 tabular">{formatDay(item.date)}</span>}
      </Link>
    );
  }

  const t = item.task;
  const project = t.project_id ? data.projects.find((p) => p.id === t.project_id) : undefined;
  return (
    <div className="group flex min-h-[34px] items-center gap-2.5 rounded-md px-2 py-1 hover:bg-hover">
      <Checkbox
        checked={t.status === "done"}
        onChange={(done) => void update("tasks", t.id, statusPatch(done ? "done" : "todo"))}
        label={`Complete ${t.title}`}
      />
      <button type="button" onClick={() => openTask(t.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <span className={cn("min-w-0 shrink break-words text-[14px] leading-snug", t.status === "done" && "text-fg-3 line-through")}>{t.title}</span>
        {t.status === "blocked" && <span className="shrink-0 rounded-[3px] bg-[var(--tag-red-bg)] px-1 text-[11px] text-[var(--tag-text)]">Blocked</span>}
        {project && (
          <span className="hidden min-w-0 shrink-[4] items-center gap-1 text-[12px] text-fg-3 sm:inline-flex">
            <span className="shrink-0">{project.icon}</span>
            <span className="truncate">{project.name}</span>
          </span>
        )}
      </button>
      {late && <span className="shrink-0 text-[12px] font-medium text-danger tabular">{relativeDue(item.date)}</span>}
      {showDate && !late && <span className="w-16 shrink-0 text-right text-[12px] text-fg-2 tabular">{formatDay(item.date)}</span>}
      {showAssignee && (taskAssignees(t).length ? <AvatarStack profiles={taskAssignees(t).map((id) => people.get(id))} size={20} /> : <Avatar profile={null} size={20} />)}
    </div>
  );
}

/** Label + count header used above grouped rows. */
export function GroupLabel({ label, count, tone }: { label: string; count?: number; tone?: "danger" }) {
  return (
    <div className={cn("mb-0.5 px-2 text-[12px] font-medium", tone === "danger" ? "text-danger" : "text-fg-3")}>
      {label} {count != null && <span className="font-normal">{count}</span>}
    </div>
  );
}

export function ProjectCard({ project: p }: { project: Project }) {
  const { data } = useWorkspace();
  const people = useProfiles();
  const prog = projectProgress(p.id, data.tasks);
  const status = optionFor(PROJECT_STATUSES, p.status)!;
  const type = optionFor(PROJECT_TYPES, p.type);
  const diff = daysUntil(p.deadline);
  const lead = people.get(p.lead_id);
  const team = data.project_members.filter((m) => m.project_id === p.id).map((m) => people.get(m.profile_id));
  return (
    <Link
      href={`/projects/${p.id}`}
      className="flex min-w-0 flex-col rounded-lg p-3 shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-hover"
    >
      <div className="flex items-start gap-2">
        <span className="text-[22px] leading-none">{p.icon ?? "📁"}</span>
        <span className="ml-auto flex flex-wrap justify-end gap-1">
          {type && <Tag color={type.color}>{type.label}</Tag>}
          <StatusTag color={status.color}>{status.label}</StatusTag>
        </span>
      </div>
      <div className="mt-2.5 line-clamp-2 text-[15px] font-semibold leading-snug">{p.name}</div>
      {hasClient(p) && p.client && <div className="truncate text-[12px] text-fg-3">{p.client}</div>}
      <div className="mt-1.5 line-clamp-2 min-h-[2lh] text-[13px] text-fg-2">
        <span className="flex min-w-0 items-center gap-1">
          → <NextStepText project={p} />
        </span>
      </div>
      <div className="mt-auto pt-3">
        <div className="flex items-center gap-2 text-[12px] text-fg-2 tabular">
          <ProgressBar value={prog.ratio} tone={prog.total && prog.ratio === 1 ? "green" : "default"} className="flex-1" />
          {prog.total ? `${prog.done}/${prog.total}` : "No tasks"}
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <span className="flex -space-x-1">
            {(lead ? [lead, ...team.filter((t) => t && t.id !== lead.id)] : team).slice(0, 4).map((person, i) => (
              <Avatar key={person?.id ?? i} profile={person} size={20} className="ring-2 ring-bg" />
            ))}
          </span>
          {p.deadline && (
            <span className={cn("ml-auto text-[12px] tabular", diff != null && diff < 0 ? "font-medium text-danger" : diff != null && diff <= 3 ? "font-medium text-fg" : "text-fg-2")}>
              {formatDay(p.deadline)} · {relativeDue(p.deadline)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProjectGrid({ projects, empty }: { projects: Project[]; empty: ReactNode }) {
  if (!projects.length) return <>{empty}</>;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((p) => (
        <ProjectCard key={p.id} project={p} />
      ))}
    </div>
  );
}

/** Person row with a stacked bar: overdue · in progress · other open. */
export function WorkloadRow({ load: l, max }: { load: Workload; max: number }) {
  return (
    <Link href={`/projects/tasks?filter=member:${l.profile.id}`} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-hover">
      <Avatar profile={l.profile} size={26} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[14px] font-medium">{l.profile.full_name}</span>
          <span className="shrink-0 text-[12px] text-fg-2 tabular">
            {l.open} open
            {l.overdue > 0 && <span className="text-danger"> · {l.overdue} overdue</span>}
            {l.blocked > 0 && <span className="text-[var(--dot-orange)]"> · {l.blocked} blocked</span>}
          </span>
        </div>
        <WorkloadBar load={l} max={max} className="mt-1.5" />
      </div>
    </Link>
  );
}

export function WorkloadBar({ load: l, max, className }: { load: Workload; max: number; className?: string }) {
  return (
    <div className={cn("flex h-1.5 overflow-hidden rounded-full bg-active", className)} style={{ width: `${Math.max(8, (l.open / Math.max(1, max)) * 100)}%` }}>
      <span className="h-full bg-[var(--dot-red)]" style={{ width: `${(l.overdue / Math.max(1, l.open)) * 100}%` }} />
      <span className="h-full bg-[var(--dot-blue)]" style={{ width: `${(l.inProgress / Math.max(1, l.open)) * 100}%` }} />
    </div>
  );
}

export function WorkloadLegend() {
  return (
    <div className="flex gap-4 px-2 pt-1 text-[11px] text-fg-3">
      <span className="flex items-center gap-1">
        <span className="size-2 rounded-full bg-[var(--dot-red)]" /> Overdue
      </span>
      <span className="flex items-center gap-1">
        <span className="size-2 rounded-full bg-[var(--dot-blue)]" /> In progress
      </span>
      <span className="flex items-center gap-1">
        <span className="size-2 rounded-full bg-active" /> Other open
      </span>
    </div>
  );
}

export function PersonCard({ load: l, max }: { load: Workload; max: number }) {
  return (
    <Link
      href={`/projects/tasks?filter=member:${l.profile.id}`}
      className="flex min-w-0 flex-col rounded-lg p-3 shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-hover"
    >
      <div className="flex items-center gap-2.5">
        <Avatar profile={l.profile} size={32} />
        <div className="min-w-0">
          <div className="truncate text-[14px] font-medium">{l.profile.full_name}</div>
          {l.profile.role_title && <div className="truncate text-[12px] text-fg-3">{l.profile.role_title}</div>}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Mini label="Open" value={l.open} />
        <Mini label="Overdue" value={l.overdue} tone={l.overdue ? "danger" : undefined} />
        <Mini label="This week" value={l.dueThisWeek} />
      </div>
      <WorkloadBar load={l} max={max} className="mt-3" />
    </Link>
  );
}

function Mini({ label, value, tone }: { label: string; value: number; tone?: "danger" }) {
  return (
    <div className="rounded-md bg-subtle py-1.5">
      <div className={cn("text-[17px] font-semibold tabular", tone === "danger" && "text-danger")}>{value}</div>
      <div className="text-[11px] text-fg-3">{label}</div>
    </div>
  );
}

/** Generic empty line for compact widgets. */
export function Quiet({ children }: { children: ReactNode }) {
  return <EmptyState title={String(children)} className="py-6" />;
}
