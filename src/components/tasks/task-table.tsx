"use client";

import { useState } from "react";
import { CalendarDays, CircleDot, Flag, FolderKanban, Plus, Type, Users, PanelRightOpen } from "lucide-react";
import type { Profile, Project, Task } from "@/lib/types";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import { useWorkspace, useProfiles } from "@/lib/store";
import { cn, daysUntil, formatDay } from "@/lib/utils";
import { AvatarStack } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/input";
import { DateField, OptionField, PeopleField, ProjectField } from "@/components/ui/fields";
import { assigneesPatch, taskAssignees } from "@/lib/selectors";
import { EmptyState } from "@/components/ui/misc";
import { statusPatch, useTaskPeek } from "./task-peek";

const COLS_WITH_PROJECT = "minmax(220px,1fr) 124px 150px 96px 92px 180px";
const COLS = "minmax(200px,1fr) 124px 146px 92px 88px";

export function TaskTable({
  tasks,
  showProject = true,
  newTaskDefaults,
  emptyLabel = "No tasks here",
  showHeader = true,
}: {
  tasks: Task[];
  showProject?: boolean;
  newTaskDefaults?: Partial<Task>;
  emptyLabel?: string;
  /** Off when several tables stack (e.g. one per milestone) under a shared header. */
  showHeader?: boolean;
}) {
  const { data, update, create, me } = useWorkspace();
  const people = useProfiles();
  const { openTask } = useTaskPeek();
  const cols = showProject ? COLS_WITH_PROJECT : COLS;

  const head = [
    { icon: <Type className="size-3.5" />, label: "Name" },
    { icon: <CircleDot className="size-3.5" />, label: "Status" },
    { icon: <Users className="size-3.5" />, label: "Assignees" },
    { icon: <CalendarDays className="size-3.5" />, label: "Due" },
    { icon: <Flag className="size-3.5" />, label: "Priority" },
    ...(showProject ? [{ icon: <FolderKanban className="size-3.5" />, label: "Project" }] : []),
  ];

  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <div className={cn("text-[14px]", showProject ? "min-w-[860px]" : "min-w-[660px]")}>
        {showHeader ? (
          <div className="grid border-y border-line text-[13px] text-fg-2" style={{ gridTemplateColumns: cols }}>
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
        {tasks.map((t) => (
          <div
            key={t.id}
            className="group grid border-b border-line transition-colors duration-75 hover:bg-subtle"
            style={{ gridTemplateColumns: cols }}
          >
            <div className="flex min-w-0 items-center gap-2 px-2">
              <Checkbox
                checked={t.status === "done"}
                onChange={(done) => void update("tasks", t.id, statusPatch(done ? "done" : "todo"))}
                label={`Mark ${t.title} ${t.status === "done" ? "not done" : "done"}`}
              />
              <button
                type="button"
                onClick={() => openTask(t.id)}
                className={cn(
                  "min-w-0 flex-1 truncate py-1.5 text-left font-medium",
                  t.status === "done" && "text-fg-3 line-through decoration-fg-3",
                )}
              >
                {t.title || <span className="text-fg-3">Untitled</span>}
              </button>
              <button
                type="button"
                onClick={() => openTask(t.id)}
                className="hidden h-6 shrink-0 items-center gap-1 rounded px-1.5 text-[12px] font-medium text-fg-2 shadow-[inset_0_0_0_1px_var(--border-strong)] hover:bg-hover group-hover:flex"
              >
                <PanelRightOpen className="size-3" /> Open
              </button>
            </div>
            <Cell>
              <OptionField options={TASK_STATUSES} value={t.status} onChange={(s) => void update("tasks", t.id, statusPatch(s))} />
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
        {tasks.length === 0 && <EmptyState title={emptyLabel} className="border-b border-line py-8" />}
        <NewTaskRow
          onCreate={(title) =>
            void create("tasks", {
              title,
              description: null,
              project_id: null,
              milestone_id: null,
              ...assigneesPatch(me ? [me.id] : []),
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
    <div className="group flex h-[34px] items-center gap-2.5 rounded-md px-2 transition-colors duration-75 hover:bg-hover">
      <Checkbox checked={task.status === "done"} onChange={onToggle} label={`Complete ${task.title}`} />
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <span className={cn("min-w-0 shrink truncate text-[14px]", task.status === "done" && "text-fg-3 line-through")}>{task.title}</span>
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

