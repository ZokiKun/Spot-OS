"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowDownUp, ArrowUp, CalendarDays, ChevronRight, Circle, CircleCheck, CircleDot, Ellipsis, Flag, GripVertical, ListChecks, Plus, Trash2 } from "lucide-react";
import type { Project, Task } from "@/lib/types";
import { useProfiles, useWorkspace } from "@/lib/store";
import { readPref, usePref } from "@/lib/hooks";
import { sortTasksBy, TASK_SORTS, timelineSortPref, type TaskSort } from "@/lib/task-sort";
import { useTaskSelection } from "@/components/tasks/task-selection";
import { nextSortOrder, projectTimeline, type MilestoneState, type Timeline, type TimelineStep } from "@/lib/milestones";
import { cn, formatDay } from "@/lib/utils";
import { EditableText } from "@/components/ui/input";
import { DateField } from "@/components/ui/fields";
import { Button, IconButton } from "@/components/ui/button";
import { Popover, usePopover } from "@/components/ui/popover";
import { MenuDivider, MenuItem, MenuLabel, MenuList } from "@/components/ui/menu";
import { ProgressBar } from "@/components/ui/misc";
import { TaskDndContext, TaskTable, type TaskDnd } from "@/components/tasks/task-table";

import { useConfirm } from "@/components/ui/confirm";

export function useTimeline(projectId: string): Timeline {
  const { data } = useWorkspace();
  return useMemo(() => projectTimeline(projectId, data), [projectId, data]);
}

export function StateIcon({ state, className }: { state: MilestoneState; className?: string }) {
  if (state === "done") return <CircleCheck className={cn("size-4 shrink-0 text-[var(--dot-green)]", className)} aria-label="Done" />;
  if (state === "current") return <CircleDot className={cn("size-4 shrink-0 text-[var(--dot-blue)]", className)} aria-label="Next step" />;
  return <Circle className={cn("size-4 shrink-0 text-fg-3", className)} aria-label="Upcoming" />;
}

/** Compact "next step" for tables and cards: the current milestone, or what's missing. */
export function NextStepText({ project, className }: { project: Project; className?: string }) {
  const timeline = useTimeline(project.id);
  if (timeline.current)
    return (
      <span className={cn("flex min-w-0 items-center gap-1.5", className)}>
        <span className="truncate">{timeline.current.milestone.title}</span>
        <span className="shrink-0 text-[12px] text-fg-3 tabular">
          {timeline.current.done}/{timeline.current.total}
        </span>
      </span>
    );
  if (timeline.complete) return <span className={cn("truncate text-fg-3", className)}>All milestones done</span>;
  if (project.status === "active") return <span className={cn("truncate text-[13px] text-danger", className)}>Add a timeline</span>;
  return <span className={cn("text-fg-3", className)}>—</span>;
}

/** Horizontal step indicator (stacks on small screens). */
export function TimelineStepper({ timeline, onOpen }: { timeline: Timeline; onOpen?: () => void }) {
  if (!timeline.steps.length) return null;
  return (
    <ol className="grid grid-cols-1 gap-2 sm:auto-cols-fr sm:grid-flow-col sm:gap-0">
      {timeline.steps.map((s, i) => (
        <li key={s.milestone.id} className="min-w-0">
          <button type="button" onClick={onOpen} className="group flex w-full min-w-0 items-start gap-2.5 text-left sm:flex-col sm:gap-2">
            <span className="flex items-center sm:w-full">
              <StateIcon state={s.state} className="size-[18px]" />
              {i < timeline.steps.length - 1 && (
                <span className={cn("ml-2 hidden h-0.5 flex-1 rounded-full sm:block", s.state === "done" ? "bg-[var(--dot-green)]" : "bg-active")} />
              )}
            </span>
            <span className="min-w-0 pr-3">
              <span className={cn("block truncate text-[14px] group-hover:underline", s.state === "current" ? "font-semibold" : s.state === "done" ? "text-fg-2" : "")}>
                {s.milestone.title}
              </span>
              <span className="block text-[12px] text-fg-3 tabular">
                {s.total ? `${s.done}/${s.total} tasks` : "No tasks yet"}
                {s.milestone.due_date && ` · ${formatDay(s.milestone.due_date)}`}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/** Big callout under the project properties: the next step comes from the timeline. */
export function NextStepCallout({ project, onOpenTimeline, onComplete }: { project: Project; onOpenTimeline: () => void; onComplete: () => void }) {
  const timeline = useTimeline(project.id);
  const step = timeline.current;

  if (step)
    return (
      <div className="mt-5 flex items-start gap-3 rounded-md bg-[color-mix(in_srgb,var(--tag-blue-bg)_55%,transparent)] px-4 py-3">
        <Flag className="mt-[3px] size-4 shrink-0 text-[var(--dot-blue)]" />
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-medium text-fg-2">
            Next step · milestone {step.index} of {timeline.steps.length}
          </div>
          <button type="button" onClick={onOpenTimeline} className="block text-left text-[15px] font-medium leading-snug hover:underline">
            {step.milestone.title}
          </button>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-fg-2 tabular">
            <span className="w-24 shrink-0">
              <ProgressBar value={step.total ? step.done / step.total : 0} />
            </span>
            {step.total ? `${step.done} of ${step.total} tasks done` : "Add tasks to this milestone"}
            {step.milestone.due_date && <span className="text-fg-3">· due {formatDay(step.milestone.due_date)}</span>}
          </div>
        </div>
      </div>
    );

  if (timeline.complete)
    return (
      <div className="mt-5 flex items-center gap-3 rounded-md bg-[color-mix(in_srgb,var(--tag-green-bg)_55%,transparent)] px-4 py-3">
        <CircleCheck className="size-4 shrink-0 text-[var(--dot-green)]" />
        <div className="min-w-0 flex-1 text-[14px] font-medium">All {timeline.steps.length} milestones done</div>
        {project.status !== "completed" && project.status !== "archived" && (
          <Button size="sm" onClick={onComplete}>
            Mark project completed
          </Button>
        )}
      </div>
    );

  const needs = project.status === "active";
  return (
    <div className={cn("mt-5 flex items-center gap-3 rounded-md px-4 py-3", needs ? "bg-danger-soft" : "bg-subtle")}>
      <Flag className={cn("size-4 shrink-0", needs ? "text-danger" : "text-fg-3")} />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-medium">No timeline yet</div>
        <div className="text-[13px] text-fg-2">Add the major milestones. Tasks go under them, and the next step moves on as each one is finished.</div>
      </div>
      <Button size="sm" onClick={onOpenTimeline}>
        Plan timeline
      </Button>
    </div>
  );
}

/** The Timeline tab: milestones in order, each with its tasks. */
export function ProjectTimeline({ project }: { project: Project }) {
  const timeline = useTimeline(project.id);
  const { steps, loose } = timeline;
  // Finished milestones start folded; a click overrides that per milestone.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpen = (s: TimelineStep) => toggled[s.milestone.id] ?? s.state !== "done";
  const headerAt = steps.find(isOpen)?.milestone.id;
  const { update } = useWorkspace();
  // Drag-to-reorder: which milestone is being dragged, and where it would land.
  const [drag, setDrag] = useState<{ id: string; over: string | null; after: boolean } | null>(null);

  // Dragging tasks: within a milestone, between milestones, and in or out of "Not in a milestone".
  const [taskDrag, setTaskDrag] = useState<{ id: string; over: { group: string; index: number } | null } | null>(null);
  const groupTasks = (group: string) => (group === LOOSE ? loose : (steps.find((s) => s.milestone.id === group)?.tasks ?? []));
  const dropTask = () => {
    const d = taskDrag;
    setTaskDrag(null);
    if (!d?.over) return;
    const task = timeline.steps.flatMap((s) => s.tasks).concat(loose).find((t) => t.id === d.id);
    if (!task) return;
    const { group, index } = d.over;
    const milestoneId = group === LOOSE ? null : group;
    // A sorted group decides its own order: dropping there only moves the task into it.
    if (readPref<TaskSort>(timelineSortPref(group === LOOSE ? `${LOOSE}:${project.id}` : group), MANUAL).by !== "manual") {
      if ((task.milestone_id ?? null) !== milestoneId) void update("tasks", task.id, { milestone_id: milestoneId });
      return;
    }
    const target = groupTasks(group);
    const from = target.findIndex((t) => t.id === d.id);
    const order = target.filter((t) => t.id !== d.id);
    order.splice(from >= 0 && from < index ? index - 1 : index, 0, task);
    // Number the whole group 0..n so the hand-set order sticks for everyone.
    order.forEach((t, i) => {
      const patch: { sort_order?: number; milestone_id?: string | null } = {};
      if (t.sort_order !== i) patch.sort_order = i;
      if (t.id === task.id && (t.milestone_id ?? null) !== milestoneId) patch.milestone_id = milestoneId;
      if (Object.keys(patch).length) void update("tasks", t.id, patch);
    });
  };
  const taskDnd: TaskDnd = {
    dragging: taskDrag?.id ?? null,
    over: taskDrag?.over ?? null,
    start: (id) => setTaskDrag({ id, over: null }),
    hover: (group, index) =>
      setTaskDrag((d) => (d && (d.over?.group !== group || d.over.index !== index) ? { ...d, over: { group, index } } : d)),
    drop: dropTask,
    end: () => setTaskDrag(null),
  };
  /** Dropping on a milestone's header (e.g. a folded one) puts the task at its end. */
  const dropOnGroup = (group: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!taskDrag) return;
      e.preventDefault();
      e.stopPropagation();
      taskDnd.hover(group, groupTasks(group).length);
    },
    onDrop: (e: React.DragEvent) => {
      if (!taskDrag) return;
      e.preventDefault();
      e.stopPropagation();
      dropTask();
    },
  });

  /** Move a milestone to `to` (0-based) and rewrite sort_order 0..n. */
  const moveTo = (id: string, to: number) => {
    const order = steps.map((s) => s.milestone);
    const from = order.findIndex((x) => x.id === id);
    if (from < 0) return;
    const [m] = order.splice(from, 1);
    order.splice(Math.max(0, Math.min(to, order.length)), 0, m!);
    order.forEach((x, idx) => x.sort_order !== idx && void update("milestones", x.id, { sort_order: idx }));
  };
  const drop = () => {
    if (drag?.over && drag.over !== drag.id) {
      const rest = steps.filter((s) => s.milestone.id !== drag.id);
      const target = rest.findIndex((s) => s.milestone.id === drag.over);
      moveTo(drag.id, target + (drag.after ? 1 : 0));
    }
    setDrag(null);
  };

  return (
    <TaskDndContext value={taskDnd}>
    <div className="space-y-6">

      {steps.map((step, i) => (
        <MilestoneSection
          key={step.milestone.id}
          step={step}
          first={i === 0}
          last={i === steps.length - 1}
          project={project}
          open={isOpen(step)}
          onToggle={() => setToggled((t) => ({ ...t, [step.milestone.id]: !isOpen(step) }))}
          showHeader={step.milestone.id === headerAt}
          onMove={(dir) => moveTo(step.milestone.id, i + dir)}
          dragging={drag?.id === step.milestone.id}
          dropEdge={drag && drag.over === step.milestone.id && drag.id !== step.milestone.id ? (drag.after ? "after" : "before") : null}
          onDragStart={() => setDrag({ id: step.milestone.id, over: null, after: false })}
          onDragOver={(after) => drag && (drag.over !== step.milestone.id || drag.after !== after) && setDrag({ ...drag, over: step.milestone.id, after })}
          onDrop={drop}
          onDragEnd={() => setDrag(null)}
          taskDrop={dropOnGroup(step.milestone.id)}
          taskOver={!!taskDrag && taskDrag.over?.group === step.milestone.id}
        />
      ))}
      <AddMilestone projectId={project.id} empty={!steps.length} />
      {(loose.length > 0 || !steps.length || taskDrag) && (
        <LooseSection project={project} tasks={loose} label={steps.length ? "Not in a milestone" : "Tasks"} drop={dropOnGroup(LOOSE)}>
          {(sorted) => (
          <TaskTable
            tasks={sorted}
            showProject={false}
            newTaskDefaults={{ project_id: project.id }}
            emptyLabel={steps.length ? "Every task is in a milestone" : "No tasks yet"}
            dndGroup={LOOSE}
          />
          )}
        </LooseSection>
      )}
    </div>
    </TaskDndContext>
  );
}

/** Drop-group id for tasks outside every milestone. */
const LOOSE = "loose";
const MANUAL: TaskSort = { by: "manual" };

/** A group's tasks in its chosen sort (saved per milestone, on this device). */
function useGroupSort(prefKey: string, tasks: Task[], project: Project) {
  const [sort, setSort] = usePref<TaskSort>(timelineSortPref(prefKey), MANUAL);
  const people = useProfiles();
  const sorted = useMemo(() => sortTasksBy(tasks, sort, { project, person: people.get }), [tasks, sort, project, people]);
  return { sort, setSort, sorted };
}

/** "Sort" button + menu for one group of tasks. Shows the active sort so it's clear the order isn't the custom one. */
function SortMenu({ sort, onChange }: { sort: TaskSort; onChange: (s: TaskSort) => void }) {
  const { setAnchor, ...pop } = usePopover();
  const active = TASK_SORTS.find((o) => o.value === sort.by) ?? TASK_SORTS[0]!;
  const sorted = sort.by !== "manual";
  return (
    <>
      <button
        ref={setAnchor}
        type="button"
        onClick={pop.toggle}
        title={sorted ? `Tasks sorted by ${active.label.toLowerCase()} — ${active.order?.[sort.reverse ? 1 : 0].toLowerCase()}` : "Sort the tasks in this milestone"}
        className={cn(
          "inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-[12px] transition-colors hover:bg-hover",
          sorted ? "font-medium text-accent" : "text-fg-3 hover:text-fg-2",
        )}
      >
        <ArrowDownUp className="size-3.5" />
        <span className="hidden xl:inline">{sorted ? `Sort: ${active.label}` : "Sort"}</span>
      </button>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor} align="end" width={200}>
        <MenuList>
          <MenuLabel>Sort tasks by</MenuLabel>
          {TASK_SORTS.map((o) => (
            <MenuItem
              key={o.value}
              selected={o.value === sort.by}
              onSelect={() => {
                onChange({ by: o.value });
                if (!o.order) pop.close();
              }}
            >
              {o.label}
            </MenuItem>
          ))}
          {active.order && (
            <>
              <MenuDivider />
              <MenuLabel>Order</MenuLabel>
              {active.order.map((label, i) => (
                <MenuItem
                  key={label}
                  selected={!!sort.reverse === (i === 1)}
                  onSelect={() => {
                    onChange({ ...sort, reverse: i === 1 });
                    pop.close();
                  }}
                >
                  {label}
                </MenuItem>
              ))}
            </>
          )}
        </MenuList>
      </Popover>
    </>
  );
}

/** Tick every task in a group (adds to the selection, so several milestones can be combined). */
function SelectGroupButton({ tasks, name }: { tasks: Task[]; name: string }) {
  const selection = useTaskSelection();
  if (!tasks.length) return null;
  const all = tasks.every((t) => selection.selected.has(t.id));
  return (
    <button
      type="button"
      onClick={() => selection.setMany(tasks.map((t) => t.id), !all)}
      title={all ? `Unselect the tasks in ${name}` : `Select all tasks in ${name} to edit, duplicate or delete them together`}
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-[12px] transition-colors hover:bg-hover",
        all ? "font-medium text-accent" : "text-fg-3 hover:text-fg-2",
      )}
    >
      <ListChecks className="size-3.5" />
      <span className="hidden xl:inline">{all ? "Unselect" : "Select"}</span>
    </button>
  );
}

function LooseSection({
  project,
  tasks,
  label,
  drop,
  children,
}: {
  project: Project;
  tasks: Task[];
  label: string;
  drop: { onDragOver: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent) => void };
  children: (sorted: Task[]) => React.ReactNode;
}) {
  const { sort, setSort, sorted } = useGroupSort(`${LOOSE}:${project.id}`, tasks, project);
  return (
    <section {...drop}>
      <div className="mb-1 flex h-7 items-center gap-2 text-[13px] font-medium text-fg-2">
        {label} <span className="font-normal text-fg-3">{tasks.length}</span>
        <span className="ml-auto flex items-center gap-0.5 font-normal">
          <SelectGroupButton tasks={sorted} name={label} />
          {tasks.length > 1 && <SortMenu sort={sort} onChange={setSort} />}
        </span>
      </div>
      {children(sorted)}
    </section>
  );
}

function MilestoneSection({
  step,
  first,
  last,
  project,
  open,
  onToggle,
  showHeader,
  onMove,
  dragging,
  dropEdge,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  taskDrop,
  taskOver,
}: {
  step: TimelineStep;
  first: boolean;
  last: boolean;
  project: Project;
  open: boolean;
  onToggle: () => void;
  showHeader: boolean;
  onMove: (dir: -1 | 1) => void;
  dragging: boolean;
  dropEdge: "before" | "after" | null;
  onDragStart: () => void;
  onDragOver: (after: boolean) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  /** Handlers that take a dragged task at the end of this milestone. */
  taskDrop: { onDragOver: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent) => void };
  /** A dragged task would land in this milestone. */
  taskOver: boolean;
}) {
  const { update, remove } = useWorkspace();
  const ask = useConfirm();
  const { setAnchor, ...menu } = usePopover();
  const sectionRef = useRef<HTMLElement>(null);
  const m = step.milestone;
  const { sort, setSort, sorted } = useGroupSort(m.id, step.tasks, project);
  const move = (dir: -1 | 1) => {
    onMove(dir);
    menu.close();
  };

  return (
    <section
      ref={sectionRef}
      onDragOver={(e) => {
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        onDragOver(e.clientY > r.top + Math.min(r.height / 2, 24));
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={cn(
        "relative transition-opacity",
        dragging && "opacity-40",
        dropEdge === "before" && "before:absolute before:inset-x-0 before:-top-3 before:h-0.5 before:rounded-full before:bg-accent",
        dropEdge === "after" && "after:absolute after:inset-x-0 after:-bottom-3 after:h-0.5 after:rounded-full after:bg-accent",
      )}
    >
      <div
        {...taskDrop}
        className={cn(
          "group flex min-h-9 items-center gap-1.5 rounded-md pr-1",
          step.state === "current" && "bg-[color-mix(in_srgb,var(--tag-blue-bg)_45%,transparent)]",
          taskOver && "shadow-[inset_0_0_0_1.5px_var(--accent)]",
        )}
      >
        <span
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", m.title);
            if (sectionRef.current) e.dataTransfer.setDragImage(sectionRef.current, 24, 18);
            onDragStart();
          }}
          onDragEnd={onDragEnd}
          title="Drag to reorder"
          aria-hidden
          className="-mr-1 flex h-7 w-4 shrink-0 cursor-grab items-center justify-center text-fg-3 opacity-50 hover:opacity-100 active:cursor-grabbing group-hover:opacity-100"
        >
          <GripVertical className="size-4" />
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? `Collapse ${m.title}` : `Expand ${m.title}`}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-fg-3 hover:bg-hover"
        >
          <ChevronRight className={cn("size-4 transition-transform", open && "rotate-90")} />
        </button>
        <StateIcon state={step.state} />
        <span className="shrink-0 text-[12px] text-fg-3 tabular">{step.index}</span>
        <EditableText
          value={m.title}
          onCommit={(title) => title && void update("milestones", m.id, { title })}
          placeholder="Milestone name"
          className={cn("min-w-0 flex-1 text-[15px] font-semibold", step.state === "done" && "text-fg-2")}
        />
        {step.state === "current" && (
          <span className="hidden shrink-0 rounded-full bg-[var(--tag-blue-bg)] px-2 text-[11px] font-medium leading-5 text-[var(--tag-text)] sm:inline">Next step</span>
        )}
        <span className="hidden w-28 shrink-0 items-center gap-1.5 text-[12px] text-fg-2 tabular sm:flex">
          <ProgressBar value={step.total ? step.done / step.total : 0} tone={step.state === "done" ? "green" : "default"} className="flex-1" />
          {step.done}/{step.total}
        </span>
        <div className="w-28 shrink-0 text-[13px]" title="Milestone deadline">
          <DateField
            value={m.due_date}
            icon={<CalendarDays className="size-3.5" />}
            placeholder="Deadline"
            onChange={(due_date) => void update("milestones", m.id, { due_date })}
          />
        </div>
        {step.tasks.length > 0 && <span className="h-4 w-px shrink-0 bg-line" aria-hidden />}
        <SelectGroupButton tasks={sorted} name={m.title} />
        {step.tasks.length > 1 && <SortMenu sort={sort} onChange={setSort} />}
        <span className="flex shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-sm:opacity-100">
          <IconButton label={`Move ${m.title} up`} disabled={first} onClick={() => onMove(-1)}>
            <ArrowUp className="size-3.5" />
          </IconButton>
          <IconButton label={`Move ${m.title} down`} disabled={last} onClick={() => onMove(1)}>
            <ArrowDown className="size-3.5" />
          </IconButton>
        </span>
        <IconButton ref={setAnchor} label={`More for ${m.title}`} onClick={menu.toggle}>
          <Ellipsis className="size-4" />
        </IconButton>
        <Popover open={menu.open} onClose={menu.close} anchor={menu.anchor} align="end" width={200}>
          <MenuList>
            <MenuItem icon={<ArrowUp className="size-4" />} disabled={first} onSelect={() => move(-1)}>
              Move up
            </MenuItem>
            <MenuItem icon={<ArrowDown className="size-4" />} disabled={last} onSelect={() => move(1)}>
              Move down
            </MenuItem>
            <MenuDivider />
            <MenuItem
              danger
              icon={<Trash2 className="size-4" />}
              onSelect={() => {
                menu.close();
                void ask({ title: `Delete the milestone “${m.title}”?`, description: "Its tasks stay in the project." }).then((ok) => ok && void remove("milestones", m.id));
              }}
            >
              Delete milestone
            </MenuItem>
          </MenuList>
        </Popover>
      </div>
      {open && (
        <div className="mt-1 pl-9">
          <TaskTable
            tasks={sorted}
            showProject={false}
            showHeader={showHeader}
            newTaskDefaults={{ project_id: project.id, milestone_id: m.id }}
            emptyLabel="No tasks yet — add the first one below"
            dndGroup={m.id}
          />
        </div>
      )}
    </section>
  );
}

function AddMilestone({ projectId, empty }: { projectId: string; empty: boolean }) {
  const { data, create, me } = useWorkspace();
  const [editing, setEditing] = useState(empty);
  const [title, setTitle] = useState("");
  const add = () => {
    const t = title.trim();
    if (!t) return;
    void create("milestones", { project_id: projectId, title: t, due_date: null, sort_order: nextSortOrder(projectId, data.milestones), created_by: me?.id ?? null });
    setTitle("");
  };
  if (!editing)
    return (
      <button type="button" onClick={() => setEditing(true)} className="flex h-8 items-center gap-1.5 rounded-md px-2 text-[14px] text-fg-3 hover:bg-hover hover:text-fg-2">
        <Plus className="size-4" /> Add milestone
      </button>
    );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        add();
      }}
      className="flex items-center gap-2 rounded-md px-2 shadow-[inset_0_0_0_1px_var(--border)]"
    >
      <Flag className="size-4 shrink-0 text-fg-3" />
      <input
        autoFocus={!empty}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => {
          add();
          if (!empty) setEditing(false);
        }}
        onKeyDown={(e) => e.key === "Escape" && (setTitle(""), setEditing(empty))}
        placeholder={empty ? "Name the first milestone, e.g. Discovery — press Enter" : "Milestone name — press Enter"}
        className="h-9 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-fg-3"
      />
    </form>
  );
}
