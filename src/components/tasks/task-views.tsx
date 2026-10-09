"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CalendarDays, CalendarRange, Columns3, GanttChart, GripVertical, LayoutGrid, List, Table2, Waypoints } from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";
import type { Project, Task } from "@/lib/types";
import { TASK_PRIORITIES, optionFor } from "@/lib/constants";
import { useProfiles, useWorkspace } from "@/lib/store";
import { taskAssignees } from "@/lib/selectors";
import { statusChange, statusOptions, taskStatusOption, type StatusOption } from "@/lib/task-statuses";
import { addDaysISO, cn, daysUntil, formatDay, parseDate, todayISO } from "@/lib/utils";
import { AvatarStack } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { StatusTag, Tag } from "@/components/ui/tag";
import { usePref } from "@/lib/hooks";
import { statusPatch, useTaskPeek } from "./task-peek";

export type TaskView = "table" | "timeline" | "board" | "list" | "grid" | "gantt";

const META: Record<TaskView, { label: string; icon: ReactNode }> = {
  table: { label: "Table", icon: <Table2 className="size-4" /> },
  timeline: { label: "Milestones", icon: <Waypoints className="size-4" /> },
  board: { label: "Board", icon: <Columns3 className="size-4" /> },
  list: { label: "List", icon: <List className="size-4" /> },
  grid: { label: "Grid", icon: <LayoutGrid className="size-4" /> },
  gantt: { label: "Gantt", icon: <GanttChart className="size-4" /> },
};

/** Icon segmented control for task views (the selected one shows its name). */
export function TaskViewSwitcher({ value, onChange, views }: { value: TaskView; onChange: (v: TaskView) => void; views: TaskView[] }) {
  return (
    <div role="radiogroup" aria-label="Task view" className="flex shrink-0 items-center gap-0.5 rounded-md p-0.5 shadow-[inset_0_0_0_1px_var(--border)]">
      {views.map((v) => {
        const selected = v === value;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={META[v].label}
            title={META[v].label}
            onClick={() => onChange(v)}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-[5px] px-1.5 text-[13px] transition-colors duration-100",
              selected ? "bg-active font-medium text-fg" : "text-fg-3 hover:bg-hover hover:text-fg-2",
            )}
          >
            {META[v].icon}
            {selected && <span className="hidden pr-0.5 sm:inline">{META[v].label}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** One task as a card (board and grid). */
function TaskCard({ task, showProject, draggable, onDragStart, dragging }: { task: Task; showProject: boolean; draggable?: boolean; onDragStart?: () => void; dragging?: boolean }) {
  const { data, update } = useWorkspace();
  const people = useProfiles();
  const { openTask } = useTaskPeek();
  const project = task.project_id ? data.projects.find((p) => p.id === task.project_id) : undefined;
  const status = taskStatusOption(task, project);
  const priority = optionFor(TASK_PRIORITIES, task.priority);
  const diff = daysUntil(task.due_date);
  const late = task.status !== "done" && diff != null && diff < 0;
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", task.title);
        onDragStart?.();
      }}
      className={cn(
        "group rounded-lg bg-elevated p-2.5 shadow-[0_0_0_1px_var(--border),0_1px_2px_rgba(15,15,15,0.04)] transition-opacity hover:shadow-[0_0_0_1px_var(--border-strong),0_2px_6px_rgba(15,15,15,0.06)]",
        draggable && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      <div className="flex items-start gap-2">
        <span className="pt-[3px]">
          <Checkbox checked={task.status === "done"} onChange={(done) => void update("tasks", task.id, statusPatch(done ? "done" : "todo"))} label={`Complete ${task.title}`} />
        </span>
        <button
          type="button"
          onClick={() => openTask(task.id)}
          className={cn("min-w-0 flex-1 break-words text-left text-[14px] font-medium leading-snug", task.status === "done" && "text-fg-3 line-through")}
        >
          {task.title || <span className="text-fg-3">Untitled</span>}
        </button>
      </div>
      {showProject && project && (
        <div className="mt-1.5 flex min-w-0 items-center gap-1 pl-6 text-[12px] text-fg-3">
          <span className="shrink-0">{project.icon ?? "📁"}</span>
          <span className="truncate">{project.name}</span>
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-6">
        <StatusTag color={status.color}>{status.label}</StatusTag>
        {priority && task.priority !== "medium" && <Tag color={priority.color}>{priority.label}</Tag>}
        {task.due_date && (
          <span className={cn("inline-flex items-center gap-1 text-[12px] tabular", late ? "text-danger" : "text-fg-2")}>
            <CalendarDays className="size-3" />
            {formatDay(task.due_date)}
          </span>
        )}
        <span className="ml-auto">
          <AvatarStack profiles={taskAssignees(task).map((id) => people.get(id))} size={18} />
        </span>
      </div>
    </div>
  );
}

/** Columns in the saved order; statuses added since keep their place at the end. */
function orderColumns(columns: StatusOption[], saved: string[]) {
  const rank = (c: StatusOption) => {
    const i = saved.indexOf(c.value);
    return i < 0 ? saved.length + columns.indexOf(c) : i;
  };
  return columns.slice().sort((a, b) => rank(a) - rank(b));
}

/**
 * Kanban: a column per status (the project's own statuses inside a project, the built-in ones
 * across projects). Drag a card to another column to change its status; hold and drag a column
 * (its header or empty space) to move it — the order is saved per board on this device.
 */
export function TaskBoard({ tasks, project, showProject = !project }: { tasks: Task[]; project?: Project | null; showProject?: boolean }) {
  const { update } = useWorkspace();
  const [savedOrder, setSavedOrder] = usePref<string[]>(`board-columns:${project?.id ?? "all"}`, []);
  const columns = orderColumns(statusOptions(project), savedOrder);
  const [drag, setDrag] = useState<{ id: string; over: string | null } | null>(null);
  // Moving a whole column: which one, and the edge of the column it would land beside.
  const [colDrag, setColDrag] = useState<{ value: string; over: string | null; after: boolean } | null>(null);
  const columnOf = (t: Task) => (project ? taskStatusOption(t, project).value : t.status);

  const drop = (col: StatusOption) => {
    const task = drag && tasks.find((t) => t.id === drag.id);
    setDrag(null);
    if (!task || columnOf(task) === col.value) return;
    // Across projects the columns are the built-in statuses; each task then shows its project's first matching one.
    void update("tasks", task.id, project ? statusChange(col.value, project) : statusPatch(col.base));
  };

  const dropColumn = () => {
    const d = colDrag;
    setColDrag(null);
    if (!d?.over || d.over === d.value) return;
    const order = columns.map((c) => c.value).filter((v) => v !== d.value);
    const at = order.indexOf(d.over) + (d.after ? 1 : 0);
    order.splice(at, 0, d.value);
    setSavedOrder(order);
  };

  return (
    <div className="-mx-2 overflow-x-auto px-2 pb-2">
      <div className="flex min-w-max items-start gap-3">
        {columns.map((col) => {
          const items = tasks.filter((t) => columnOf(t) === col.value);
          const over = drag?.over === col.value;
          const edge = colDrag && colDrag.over === col.value && colDrag.value !== col.value ? (colDrag.after ? "after" : "before") : null;
          return (
            <section
              key={col.value}
              draggable
              onDragStart={(e) => {
                if (e.target !== e.currentTarget) return; // a card is being dragged, not the column
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", col.label);
                setColDrag({ value: col.value, over: null, after: false });
              }}
              onDragEnd={() => setColDrag(null)}
              onDragOver={(e) => {
                if (colDrag) {
                  e.preventDefault();
                  const r = e.currentTarget.getBoundingClientRect();
                  const after = e.clientX > r.left + r.width / 2;
                  if (colDrag.over !== col.value || colDrag.after !== after) setColDrag({ ...colDrag, over: col.value, after });
                  return;
                }
                if (!drag) return;
                e.preventDefault();
                if (drag.over !== col.value) setDrag({ ...drag, over: col.value });
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (colDrag) dropColumn();
                else drop(col);
              }}
              className={cn(
                "group/col relative flex w-[272px] shrink-0 cursor-grab flex-col rounded-lg bg-subtle p-2 transition-[box-shadow,opacity] active:cursor-grabbing",
                over && "shadow-[inset_0_0_0_1.5px_var(--accent)]",
                colDrag?.value === col.value && "opacity-40",
                edge === "before" && "before:absolute before:-left-[7px] before:inset-y-0 before:w-0.5 before:rounded-full before:bg-accent",
                edge === "after" && "after:absolute after:-right-[7px] after:inset-y-0 after:w-0.5 after:rounded-full after:bg-accent",
              )}
            >
              <div className="mb-2 flex items-center gap-2 px-1" title="Hold and drag to move this column">
                <StatusTag color={col.color}>{col.label}</StatusTag>
                <span className="text-[12px] text-fg-3 tabular">{items.length}</span>
                <GripVertical className="ml-auto size-3.5 text-fg-3 opacity-0 transition-opacity group-hover/col:opacity-100 max-sm:opacity-60" aria-hidden />
              </div>
              <div className="flex min-h-16 cursor-auto flex-col gap-2">
                {items.map((t) => (
                  <div key={t.id} onDragEnd={() => setDrag(null)}>
                    <TaskCard task={t} showProject={showProject} draggable onDragStart={() => setDrag({ id: t.id, over: null })} dragging={drag?.id === t.id} />
                  </div>
                ))}
                {!items.length && (
                  <div className="cursor-grab rounded-md border border-dashed border-line-strong px-2 py-4 text-center text-[12px] text-fg-3">
                    {drag ? "Drop here" : col.base === "done" ? "Drop a task here to complete it" : "No tasks"}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Cards in a responsive grid. */
export function TaskGrid({ tasks, showProject = true }: { tasks: Task[]; showProject?: boolean }) {
  if (!tasks.length) return <EmptyState title="No tasks here" />;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} showProject={showProject} />
      ))}
    </div>
  );
}

export interface GanttGroup {
  key: string;
  label: ReactNode;
  tasks: Task[];
  /** Optional end marker for the group (a milestone's due date). */
  due?: string | null;
}

const DAY = 28; // px per day
const LABEL = 260; // px for the name column

/**
 * Gantt: each task is a bar from when it was created to its due date, grouped (by milestone in a
 * project, by project across projects). Tasks without a due date are listed underneath.
 */
export function TaskGantt({ groups }: { groups: GanttGroup[] }) {
  const { data } = useWorkspace();
  const { openTask } = useTaskPeek();
  const today = todayISO();
  const dated = groups.flatMap((g) => g.tasks).filter((t) => t.due_date);
  const undated = groups.flatMap((g) => g.tasks).filter((t) => !t.due_date);

  const range = useMemo(() => {
    const starts = dated.map((t) => startOf(t));
    const ends = [...dated.map((t) => t.due_date!), ...groups.map((g) => g.due).filter((d): d is string => !!d)];
    if (!starts.length) return null;
    const min = [today, ...starts].sort()[0]!;
    const max = [today, ...ends].sort().at(-1)!;
    const from = addDaysISO(min, -2);
    const to = addDaysISO(max, 5);
    return { from, days: differenceInCalendarDays(parseDate(to)!, parseDate(from)!) + 1 };
  }, [dated, groups, today]);

  if (!range) return <EmptyState title="Nothing to chart yet" description="Give tasks a due date and they appear here as bars." />;
  const x = (iso: string) => differenceInCalendarDays(parseDate(iso)!, parseDate(range.from)!) * DAY;
  const dayList = Array.from({ length: range.days }, (_, i) => addDaysISO(range.from, i));
  const width = range.days * DAY;

  return (
    <div className="space-y-4">
      <div
        className="-mx-2 overflow-x-auto px-2 pb-2"
        // Open scrolled so today sits near the left, with a few days of context.
        ref={(el) => {
          if (el && !el.dataset.scrolled) {
            el.dataset.scrolled = "1";
            el.scrollLeft = Math.max(0, x(today) - 5 * DAY);
          }
        }}
      >
        <div className="relative text-[13px]" style={{ width: LABEL + width }}>
          {/* Header: months and days */}
          <div className="sticky top-0 z-[2] flex border-b border-line bg-bg">
            <div className="sticky left-0 z-[1] shrink-0 bg-bg px-2 py-1 text-[12px] text-fg-2" style={{ width: LABEL }}>
              Task
            </div>
            <div className="relative h-11" style={{ width }}>
              {dayList.map((d, i) =>
                i === 0 || d.endsWith("-01") ? (
                  <div key={`m-${d}`} className="absolute top-0.5 text-[12px] font-medium text-fg-2" style={{ left: x(d) + 4 }}>
                    {format(parseDate(d)!, "MMM yyyy")}
                  </div>
                ) : null,
              )}
              {dayList.map((d) => {
                const day = parseDate(d)!;
                const weekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <div
                    key={d}
                    className={cn("absolute bottom-0.5 text-center text-[11px] tabular", d === today ? "font-semibold text-accent" : weekend ? "text-fg-3" : "text-fg-2")}
                    style={{ left: x(d), width: DAY }}
                  >
                    {day.getDate()}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Today line */}
          <div className="pointer-events-none absolute bottom-0 top-11 z-[1] w-px bg-accent/60" style={{ left: LABEL + x(today) + DAY / 2 }} />
          {groups.map((g) => {
            const rows = g.tasks.filter((t) => t.due_date);
            if (!rows.length && !g.due) return null;
            return (
              <div key={g.key}>
                <div className="flex h-8 items-center border-b border-line bg-subtle">
                  <div className="sticky left-0 z-[1] flex h-full shrink-0 items-center truncate bg-subtle px-2 text-[12px] font-semibold text-fg-2" style={{ width: LABEL }}>
                    {g.label}
                  </div>
                  <div className="relative h-full" style={{ width }}>
                    {g.due && (
                      <span
                        title={`Due ${formatDay(g.due)}`}
                        className="absolute top-1/2 size-2.5 -translate-y-1/2 rotate-45 bg-fg-2"
                        style={{ left: x(g.due) + DAY / 2 - 5 }}
                      />
                    )}
                  </div>
                </div>
                {rows.map((t) => {
                  const project = t.project_id ? data.projects.find((p) => p.id === t.project_id) : undefined;
                  const status = taskStatusOption(t, project);
                  const start = startOf(t);
                  const left = x(start);
                  const w = Math.max(DAY, x(t.due_date!) - left + DAY);
                  const late = t.status !== "done" && t.due_date! < today;
                  return (
                    <div key={t.id} className="flex h-9 items-center border-b border-line hover:bg-subtle">
                      <button type="button" onClick={() => openTask(t.id)} className="sticky left-0 z-[1] h-full min-w-0 shrink-0 truncate bg-bg px-2 text-left hover:underline" style={{ width: LABEL }} title={t.title}>
                        <span className={cn(t.status === "done" && "text-fg-3 line-through")}>{t.title}</span>
                      </button>
                      <div className="relative h-full" style={{ width }}>
                        <button
                          type="button"
                          onClick={() => openTask(t.id)}
                          title={`${t.title} · ${formatDay(start)} → ${formatDay(t.due_date)} · ${status.label}`}
                          className={cn(
                            `tag-${status.color}`,
                            "absolute top-1.5 flex h-6 items-center gap-1.5 overflow-hidden rounded-md px-2 text-[12px] text-[var(--tag-text)] shadow-[inset_0_0_0_1px_var(--border)]",
                            late && "shadow-[inset_0_0_0_1.5px_var(--danger)]",
                            t.status === "done" && "opacity-60",
                          )}
                          style={{ left, width: w }}
                        >
                          <span className={cn(`dot-${status.color}`, "size-2 shrink-0 rounded-full")} />
                          <span className="truncate">{t.title}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {undated.length > 0 && (
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[13px] font-medium text-fg-2">
            <CalendarRange className="size-3.5" /> No due date <span className="font-normal text-fg-3">{undated.length}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {undated.map((t) => (
              <button key={t.id} type="button" onClick={() => openTask(t.id)} className="rounded-md bg-active px-2 py-1 text-left text-[12px] hover:bg-hover">
                {t.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** A bar starts when the task was created, never after its due date. */
function startOf(t: Task) {
  const created = t.created_at.slice(0, 10);
  return t.due_date && created > t.due_date ? t.due_date : created;
}
