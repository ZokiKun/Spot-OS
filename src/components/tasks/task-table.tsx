"use client";

import { createContext, useContext, useState } from "react";
import { CalendarDays, CircleDot, Flag, FolderKanban, GripVertical, Plus, Type, Users } from "lucide-react";
import type { Profile, Project, Task, UUID } from "@/lib/types";
import { TASK_PRIORITIES } from "@/lib/constants";
import { statusChange, statusOptions, taskStatusValue } from "@/lib/task-statuses";
import { useWorkspace, useProfiles } from "@/lib/store";
import { cn, daysUntil, formatDay } from "@/lib/utils";
import { AvatarStack } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/input";
import { DateField, OptionField, PeopleField, ProjectField } from "@/components/ui/fields";
import { assigneesPatch, taskAssignees } from "@/lib/selectors";
import { EmptyState } from "@/components/ui/misc";
import { statusPatch, useTaskPeek } from "./task-peek";
import { useTaskSelection } from "./task-selection";

/**
 * Drag-and-drop between stacked task tables (the project timeline). Each table is a "group"
 * (a milestone id, or "loose" for tasks outside every milestone); `over` is where the dragged
 * task would land: before row `index` of that group (index = length means at the end).
 */
export interface TaskDnd {
  dragging: UUID | null;
  over: { group: string; index: number } | null;
  start: (id: UUID) => void;
  hover: (group: string, index: number) => void;
  drop: () => void;
  end: () => void;
}
export const TaskDndContext = createContext<TaskDnd | null>(null);

// The first, narrow column holds the select tick (several tasks → the bulk-edit bar).
const COLS_WITH_PROJECT = "28px minmax(220px,1fr) 124px 150px 96px 92px 180px";
const COLS = "28px minmax(200px,1fr) 124px 146px 92px 88px";

export function TaskTable({
  tasks,
  showProject = true,
  newTaskDefaults,
  emptyLabel = "No tasks here",
  showHeader = true,
  dndGroup,
}: {
  tasks: Task[];
  showProject?: boolean;
  newTaskDefaults?: Partial<Task>;
  emptyLabel?: string;
  /** Off when several tables stack (e.g. one per milestone) under a shared header. */
  showHeader?: boolean;
  /** Makes rows draggable inside a <TaskDndContext> — this table's group id. */
  dndGroup?: string;
}) {
  const { data, update, create, me } = useWorkspace();
  const people = useProfiles();
  const { openTask } = useTaskPeek();
  const selection = useTaskSelection();
  const selecting = selection.selected.size > 0;
  const ids = tasks.map((t) => t.id);
  const allSelected = ids.length > 0 && ids.every((id) => selection.selected.has(id));
  const cols = showProject ? COLS_WITH_PROJECT : COLS;
  const dndCtx = useContext(TaskDndContext);
  const dnd = dndGroup != null ? dndCtx : null;
  const group = dndGroup ?? "";
  const dropAt = dnd?.dragging && dnd.over?.group === group ? dnd.over.index : null;
  // Rows report "before me / after me"; the rest of the table (empty state, new-task row) means "at the end".
  const tableDrag = dnd && {
    onDragOver: (e: React.DragEvent) => {
      if (!dnd.dragging) return;
      e.preventDefault();
      e.stopPropagation();
      dnd.hover(group, tasks.length);
    },
    onDrop: (e: React.DragEvent) => {
      if (!dnd.dragging) return;
      e.preventDefault();
      e.stopPropagation();
      dnd.drop();
    },
  };

  const head = [
    { icon: <Type className="size-3.5" />, label: "Name" },
    { icon: <CircleDot className="size-3.5" />, label: "Status" },
    { icon: <Users className="size-3.5" />, label: "Assignees" },
    { icon: <CalendarDays className="size-3.5" />, label: "Due" },
    { icon: <Flag className="size-3.5" />, label: "Priority" },
    ...(showProject ? [{ icon: <FolderKanban className="size-3.5" />, label: "Project" }] : []),
  ];

  return (
    <div className="-mx-2 overflow-x-auto px-2" {...tableDrag}>
      <div className={cn("text-[14px]", showProject ? "min-w-[860px]" : "min-w-[660px]")}>
        {showHeader ? (
          <div className="grid border-y border-line text-[13px] text-fg-2" style={{ gridTemplateColumns: cols }}>
            <div className="flex h-8 items-center justify-center">
              {/* Stacked tables (timeline) share one header — each group has its own "Select" instead. */}
              {ids.length > 0 && !dnd && (
                <SelectTick
                  checked={allSelected}
                  visible={selecting}
                  label={allSelected ? "Unselect all tasks" : "Select all tasks"}
                  onChange={(on) => selection.setMany(ids, on)}
                />
              )}
            </div>
            {head.map((h, i) => (
              <div key={h.label} className={cn("flex h-8 items-center gap-1.5 px-2", i > 0 && "border-l border-line")}>
                <span className="text-fg-3">{h.icon}</span>
                {h.label}
              </div>
            ))}
          </div>
        ) : (
          <div className="border-t border-line" />
        )}
        {tasks.map((t, i) => (
          <div
            key={t.id}
            onDragOver={
              dnd
                ? (e) => {
                    if (!dnd.dragging) return;
                    e.preventDefault();
                    e.stopPropagation();
                    const r = e.currentTarget.getBoundingClientRect();
                    dnd.hover(group, i + (e.clientY > r.top + r.height / 2 ? 1 : 0));
                  }
                : undefined
            }
            onDrop={tableDrag?.onDrop}
            className={cn(
              "group relative grid border-b border-line transition-colors duration-75 hover:bg-subtle",
              selection.selected.has(t.id) && "bg-accent-soft hover:bg-accent-soft",
              dnd?.dragging === t.id && "opacity-40",
              dropAt === i && "before:absolute before:inset-x-0 before:-top-px before:z-[1] before:h-0.5 before:bg-accent",
              dropAt === tasks.length && i === tasks.length - 1 && "after:absolute after:inset-x-0 after:-bottom-px after:z-[1] after:h-0.5 after:bg-accent",
            )}
            style={{ gridTemplateColumns: cols }}
          >
            <div className="flex items-center justify-center">
              <SelectTick
                checked={selection.selected.has(t.id)}
                visible={selecting}
                label={`Select ${t.title || "Untitled"}`}
                onChange={(on, e) => selection.toggle(t.id, on, { ids, shift: e.shiftKey })}
              />
            </div>
            <div className={cn("flex min-w-0 items-center gap-2 px-2", dnd && "pl-0")}>
              {dnd && (
                <span
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", t.title);
                    const row = e.currentTarget.closest(".grid");
                    if (row instanceof HTMLElement) e.dataTransfer.setDragImage(row, 24, 16);
                    dnd.start(t.id);
                  }}
                  onDragEnd={dnd.end}
                  title="Drag to move — into another milestone, or up and down"
                  aria-hidden
                  className="-mr-1.5 flex h-7 w-3.5 shrink-0 cursor-grab items-center justify-center text-fg-3 opacity-0 hover:text-fg-2 active:cursor-grabbing group-hover:opacity-100 max-sm:opacity-60"
                >
                  <GripVertical className="size-3.5" />
                </span>
              )}
              <Checkbox
                checked={t.status === "done"}
                onChange={(done) => void update("tasks", t.id, statusPatch(done ? "done" : "todo"))}
                label={`Mark ${t.title} ${t.status === "done" ? "not done" : "done"}`}
              />
              <button
                type="button"
                onClick={() => openTask(t.id)}
                className={cn(
                  "min-w-0 flex-1 whitespace-normal break-words py-1.5 text-left font-medium leading-snug",
                  t.status === "done" && "text-fg-3 line-through decoration-fg-3",
                )}
              >
                {t.title || <span className="text-fg-3">Untitled</span>}
              </button>
            </div>
            <Cell>
              <TaskStatusField task={t} />
            </Cell>
            <Cell>
              <PeopleField people={people.list} value={taskAssignees(t)} onChange={(ids) => void update("tasks", t.id, assigneesPatch(ids))} />
            </Cell>
            <Cell>
              <DateField value={t.due_date} highlightOverdue={t.status !== "done"} onChange={(due_date) => void update("tasks", t.id, { due_date })} />
            </Cell>
            <Cell>
              <OptionField kind="select" options={TASK_PRIORITIES} value={t.priority} onChange={(priority) => void update("tasks", t.id, { priority })} />
            </Cell>
            {showProject && (
              <Cell>
                <ProjectField projects={data.projects} value={t.project_id} onChange={(project_id) => void update("tasks", t.id, { project_id })} />
              </Cell>
            )}
          </div>
        ))}
        {tasks.length === 0 && (
          <EmptyState
            title={dropAt != null ? "Drop here" : emptyLabel}
            className={cn("border-b border-line py-8", dropAt != null && "bg-accent-soft shadow-[inset_0_0_0_1px_var(--accent)]")}
          />
        )}
        <NewTaskRow
          onCreate={(title) =>
            void create("tasks", {
              title,
              description: null,
              project_id: null,
              milestone_id: null,
              ...assigneesPatch([]), // nobody by default — assign deliberately
              status: "todo",
              priority: "medium",
              due_date: null,
              created_by: me?.id ?? null,
              completed_at: null,
              ...newTaskDefaults,
            })
          }
        />
      </div>
    </div>
  );
}

/** Status picker using the task's project statuses (custom ones if the project has them). */
export function TaskStatusField({ task, variant }: { task: Task; variant?: "cell" | "property" }) {
  const { data, update } = useWorkspace();
  const project = task.project_id ? data.projects.find((p) => p.id === task.project_id) : null;
  return (
    <OptionField
      variant={variant}
      options={statusOptions(project)}
      value={taskStatusValue(task, project)}
      onChange={(v) => void update("tasks", task.id, statusChange(v, project))}
    />
  );
}

/** Row select tick: shows on hover, and on every row once something is selected. Shift-click selects a range. */
function SelectTick({
  checked,
  visible,
  label,
  onChange,
}: {
  checked: boolean;
  visible: boolean;
  label: string;
  onChange: (on: boolean, e: React.MouseEvent) => void;
}) {
  return (
    <Checkbox
      checked={checked}
      onChange={onChange}
      label={label}
      className={cn(
        "transition-opacity focus-visible:opacity-100",
        checked || visible ? "opacity-100" : "opacity-0 group-hover:opacity-100 max-sm:opacity-60",
      )}
    />
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <div className="flex min-w-0 items-stretch border-l border-line">{children}</div>;
}

export function NewTaskRow({ onCreate, label = "New task" }: { onCreate: (title: string) => void; label?: string }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  if (!editing)
    return (
      <div className="flex h-10 items-center px-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[14px] font-medium text-accent transition-colors hover:bg-accent-soft"
        >
          <Plus className="size-4" strokeWidth={2.25} /> {label}
        </button>
      </div>
    );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) onCreate(title.trim());
        setTitle("");
      }}
      className="flex h-8 items-center gap-2 border-b border-line px-2"
    >
      <Plus className="size-4 text-fg-3" />
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => {
          if (title.trim()) onCreate(title.trim());
          setTitle("");
          setEditing(false);
        }}
        onKeyDown={(e) => e.key === "Escape" && (setTitle(""), setEditing(false))}
        placeholder="Type a task name and press Enter"
        className="h-full flex-1 bg-transparent text-[14px] outline-none placeholder:text-fg-3"
      />
    </form>
  );
}

/** Compact task list for dashboards: checkbox · title · project · due · assignee. */
export function TaskList({ tasks, showAssignee = true, limit }: { tasks: Task[]; showAssignee?: boolean; limit?: number }) {
  const { data, update } = useWorkspace();
  const people = useProfiles();
  const { openTask } = useTaskPeek();
  const projects = new Map(data.projects.map((p) => [p.id, p]));
  const shown = limit ? tasks.slice(0, limit) : tasks;
  return (
    <div>
      {shown.map((t) => (
        <TaskListRow
          key={t.id}
          task={t}
          projectLabel={t.project_id ? projects.get(t.project_id) : undefined}
          assignees={showAssignee ? taskAssignees(t).map((id) => people.get(id)!).filter(Boolean) : undefined}
          onOpen={() => openTask(t.id)}
          onToggle={(done) => void update("tasks", t.id, statusPatch(done ? "done" : "todo"))}
        />
      ))}
      {limit && tasks.length > limit && <div className="px-2 py-1 text-[12px] text-fg-3">+{tasks.length - limit} more</div>}
    </div>
  );
}

function TaskListRow({
  task,
  projectLabel,
  assignees,
  onOpen,
  onToggle,
}: {
  task: Task;
  projectLabel?: Project;
  assignees?: Profile[];
  onOpen: () => void;
  onToggle: (done: boolean) => void;
}) {
  const diff = daysUntil(task.due_date);
  const overdue = task.status !== "done" && diff != null && diff < 0;
  return (
    <div className="group flex min-h-[34px] items-center gap-2.5 rounded-md px-2 py-1 transition-colors duration-75 hover:bg-hover">
      <Checkbox checked={task.status === "done"} onChange={onToggle} label={`Complete ${task.title}`} />
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <span className={cn("min-w-0 shrink break-words text-[14px] leading-snug", task.status === "done" && "text-fg-3 line-through")}>{task.title}</span>
        {task.status === "blocked" && <span className="shrink-0 rounded-[3px] bg-[var(--tag-red-bg)] px-1 text-[11px] text-[var(--tag-text)]">Blocked</span>}
        {projectLabel && (
          <span className="hidden min-w-0 shrink-[4] items-center gap-1 text-[12px] text-fg-3 sm:inline-flex">
            <span className="shrink-0">{projectLabel.icon}</span>
            <span className="truncate">{projectLabel.name}</span>
          </span>
        )}
      </button>
      {task.due_date && (
        <span className={cn("shrink-0 text-[12px] tabular", overdue ? "text-danger" : "text-fg-2")}>{formatDay(task.due_date)}</span>
      )}
      {assignees && <AvatarStack profiles={assignees} size={20} />}
    </div>
  );
}

