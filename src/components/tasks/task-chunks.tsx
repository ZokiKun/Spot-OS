"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { Task } from "@/lib/types";
import { useProfiles, useWorkspace } from "@/lib/store";
import { cn, daysUntil, relativeDays } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { CircleCheck, MUTED, SOFT, type Tone } from "@/components/ui/chunk";
import { statusPatch, useTaskPeek } from "./task-peek";

/**
 * Tasks as pill rows with a round check — the reference's "Buy food / Reading / Invest".
 * Shows `limit` rows and folds the rest behind "Show N more".
 */
export function TaskChunkList({
  tasks,
  tone = "surface",
  limit,
  showProject = true,
  showAssignee = false,
  showDue = true,
  empty,
}: {
  tasks: Task[];
  tone?: Tone;
  limit?: number;
  showProject?: boolean;
  showAssignee?: boolean;
  showDue?: boolean;
  empty?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = limit && !expanded ? tasks.slice(0, limit) : tasks;
  const hidden = tasks.length - shown.length;
  if (!tasks.length) return <>{empty ?? null}</>;
  return (
    <div className="flex flex-col gap-2">
      {shown.map((t) => (
        <TaskChunkRow key={t.id} task={t} tone={tone} showProject={showProject} showAssignee={showAssignee} showDue={showDue} />
      ))}
      {(hidden > 0 || expanded) && limit && tasks.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className={cn("h-9 self-start rounded-full px-4 text-[13px] transition-colors hover:bg-[var(--chunk-soft)]", MUTED[tone])}
        >
          {expanded ? "Show less" : `Show ${hidden} more`}
        </button>
      )}
    </div>
  );
}

export function TaskChunkRow({
  task,
  tone = "surface",
  showProject = true,
  showAssignee = false,
  showDue = true,
}: {
  task: Task;
  tone?: Tone;
  showProject?: boolean;
  showAssignee?: boolean;
  showDue?: boolean;
}) {
  const { data, update } = useWorkspace();
  const people = useProfiles();
  const { openTask } = useTaskPeek();
  const done = task.status === "done";
  const project = showProject && task.project_id ? data.projects.find((p) => p.id === task.project_id) : undefined;
  const diff = daysUntil(task.due_date);
  const late = !done && diff != null && diff < 0;
  const due = showDue && task.due_date && !done ? relativeDays(task.due_date) : null;
  const meta = [project ? `${project.icon ?? ""} ${project.name}`.trim() : null, task.status === "blocked" ? "Stuck" : null].filter(Boolean);

  return (
    <div className={cn("group flex min-h-12 items-center gap-3 rounded-[22px] py-1.5 pl-2 pr-3 transition-colors", SOFT[tone])}>
      <CircleCheck
        checked={done}
        onChange={(v) => void update("tasks", task.id, statusPatch(v ? "done" : "todo"))}
        label={`Mark ${task.title} ${done ? "not done" : "done"}`}
        size={32}
      />
      <button type="button" onClick={() => openTask(task.id)} className="min-w-0 flex-1 py-1 text-left">
        <span className={cn("block truncate text-[14px] leading-snug", done && "line-through opacity-50")}>{task.title || "Untitled"}</span>
        {(meta.length > 0 || due) && (
          <span className={cn("block truncate text-[12px]", MUTED[tone])}>
            {due && <span className={cn(late && "font-medium text-current")}>{due}</span>}
            {due && meta.length > 0 && " · "}
            {meta.join(" · ")}
          </span>
        )}
      </button>
      {showAssignee && <Avatar profile={people.get(task.assignee_id)} size={26} />}
    </div>
  );
}

/** "Add a task…" pill that turns into an input. */
export function AddTaskPill({
  onCreate,
  tone = "surface",
  label = "Add a task",
  startEditing = false,
}: {
  onCreate: (title: string) => void;
  tone?: Tone;
  label?: string;
  /** Open straight into the input (remount with a new `key` to re-trigger). */
  startEditing?: boolean;
}) {
  const [editing, setEditing] = useState(startEditing);
  const [title, setTitle] = useState("");
  const submit = () => {
    if (title.trim()) onCreate(title.trim());
    setTitle("");
  };
  if (!editing)
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn("flex h-12 w-full items-center gap-3 rounded-[22px] pl-2 pr-4 text-left text-[14px] transition-colors hover:bg-[var(--chunk-soft)]", MUTED[tone])}
      >
        <span className="flex size-8 items-center justify-center rounded-full shadow-[inset_0_0_0_1.5px_currentColor] [&_svg]:size-4">
          <Plus />
        </span>
        {label}
      </button>
    );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={cn("flex h-12 items-center gap-3 rounded-[22px] pl-2 pr-4", SOFT[tone])}
    >
      <span className="flex size-8 items-center justify-center rounded-full shadow-[inset_0_0_0_1.5px_currentColor] opacity-50 [&_svg]:size-4">
        <Plus />
      </span>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => {
          submit();
          setEditing(false);
        }}
        onKeyDown={(e) => e.key === "Escape" && (setTitle(""), setEditing(false))}
        placeholder="What needs doing? Press Enter to add"
        className="h-full flex-1 bg-transparent text-[14px] outline-none placeholder:opacity-50"
      />
    </form>
  );
}
