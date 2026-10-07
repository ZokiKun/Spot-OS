"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Check, ChevronDown, CircleDot, Clock, Flag, FolderKanban, Trash2, User } from "lucide-react";
import { useWorkspace, useProfiles } from "@/lib/store";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import type { Task, TaskStatus, UUID } from "@/lib/types";
import { cn, nowISO, timeAgo } from "@/lib/utils";
import { SidePeek } from "@/components/ui/side-peek";
import { AutoTextarea, EditableText } from "@/components/ui/input";
import { DateField, OptionField, PersonField, ProjectField, PropertyRow } from "@/components/ui/fields";
import { IconButton } from "@/components/ui/button";

interface TaskPeekApi {
  openTask: (id: UUID) => void;
}
const TaskPeekContext = createContext<TaskPeekApi>({ openTask: () => {} });
export const useTaskPeek = () => useContext(TaskPeekContext);

/** Status change helper that keeps completed_at consistent. */
export function statusPatch(status: TaskStatus): Partial<Task> {
  return { status, completed_at: status === "done" ? nowISO() : null };
}

export function TaskPeekProvider({ children }: { children: ReactNode }) {
  const [taskId, setTaskId] = useState<UUID | null>(null);
  const openTask = useCallback((id: UUID) => setTaskId(id), []);
  const close = useCallback(() => {
    setTaskId(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has("task")) {
      url.searchParams.delete("task");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, []);
  const api = useMemo(() => ({ openTask }), [openTask]);
  return (
    <TaskPeekContext value={api}>
      {children}
      <Suspense fallback={null}>
        <TaskParamWatcher onTask={openTask} />
      </Suspense>
      <TaskPeek taskId={taskId} onClose={close} />
    </TaskPeekContext>
  );
}

function TaskParamWatcher({ onTask }: { onTask: (id: UUID) => void }) {
  const params = useSearchParams();
  const task = params.get("task");
  useEffect(() => {
    if (task) onTask(task);
  }, [task, onTask]);
  return null;
}

function TaskPeek({ taskId, onClose }: { taskId: UUID | null; onClose: () => void }) {
  const { data, update, remove } = useWorkspace();
  const people = useProfiles();
  const task = data.tasks.find((t) => t.id === taskId);
  const project = task?.project_id ? data.projects.find((p) => p.id === task.project_id) : undefined;
  const [description, setDescription] = useState(task?.description ?? "");
  const [more, setMore] = useState(false);
  // Reset the draft when switching tasks or when someone else edits the description.
  const sourceKey = `${task?.id}:${task?.description ?? ""}`;
  const [seen, setSeen] = useState(sourceKey);
  if (sourceKey !== seen) {
    setSeen(sourceKey);
    setDescription(task?.description ?? "");
  }

  if (!task) return <SidePeek open={false} onClose={onClose}>{null}</SidePeek>;
  const set = (patch: Partial<Task>) => void update("tasks", task.id, patch);
  const done = task.status === "done";

  return (
    <SidePeek
      open
      onClose={onClose}
      expandHref={project ? `/projects/${project.id}?task=${task.id}` : undefined}
      actions={
        <IconButton
          label="Delete task"
          size="md"
          className="bg-hover"
          onClick={() => {
            if (confirm(`Delete “${task.title}”?`)) {
              void remove("tasks", task.id);
              onClose();
            }
          }}
        >
          <Trash2 className="size-4" />
        </IconButton>
      }
    >
      {project && (
        <div className="mb-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-hover px-3 text-[13px] text-fg-2">
          <span>{project.icon}</span> {project.name}
        </div>
      )}
      <EditableText
        value={task.title}
        onCommit={(title) => title && set({ title })}
        placeholder="Untitled"
        multiline
        className={cn("text-[30px] font-medium leading-[1.1] tracking-[-0.03em]", done && "line-through opacity-50")}
      />
      <button
        type="button"
        onClick={() => set(statusPatch(done ? "todo" : "done"))}
        className={cn(
          "mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-medium transition-[background,transform] active:scale-[0.98]",
          done ? "bg-lime text-on-chunk" : "bg-accent text-on-accent hover:bg-accent-hover",
        )}
      >
        <Check className="size-[18px]" /> {done ? "Done — tap to reopen" : "Mark as done"}
      </button>

      <div className="mt-5 rounded-[24px] bg-hover p-2">
        <PropertyRow icon={<CircleDot className="size-4" />} label="Status">
          <OptionField variant="property" options={TASK_STATUSES} value={task.status} onChange={(s) => set(statusPatch(s))} />
        </PropertyRow>
        <PropertyRow icon={<User className="size-4" />} label="Who">
          <PersonField variant="property" people={people.list} value={task.assignee_id} onChange={(assignee_id) => set({ assignee_id })} placeholder="Nobody yet" />
        </PropertyRow>
        <PropertyRow icon={<CalendarDays className="size-4" />} label="When">
          <DateField variant="property" value={task.due_date} highlightOverdue={!done} onChange={(due_date) => set({ due_date })} placeholder="No date" />
        </PropertyRow>
        {more && (
          <div className="anim-fade">
            <PropertyRow icon={<Flag className="size-4" />} label="Priority">
              <OptionField variant="property" kind="select" options={TASK_PRIORITIES} value={task.priority} onChange={(priority) => set({ priority })} />
            </PropertyRow>
            <PropertyRow icon={<FolderKanban className="size-4" />} label="Project">
              <ProjectField variant="property" projects={data.projects} value={task.project_id} onChange={(project_id) => set({ project_id })} />
            </PropertyRow>
            <PropertyRow icon={<Clock className="size-4" />} label="Created">
              <div className="flex min-h-10 items-center px-3 text-fg-2">
                {people.get(task.created_by)?.full_name ?? "Someone"} · {timeAgo(task.created_at)}
              </div>
            </PropertyRow>
          </div>
        )}
        <button type="button" onClick={() => setMore((m) => !m)} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] text-fg-2 hover:text-fg">
          <ChevronDown className={cn("size-4 transition-transform", more && "rotate-180")} />
          {more ? "Fewer details" : "Priority, project & more"}
        </button>
      </div>

      <div className="mt-3 rounded-[24px] bg-cream p-5 text-on-chunk">
        <div className="mb-1 text-[12.5px] text-[var(--on-chunk-2)]">Notes</div>
        <AutoTextarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => description !== (task.description ?? "") && set({ description: description || null })}
          placeholder="Add any detail that helps — links, context, what “done” looks like…"
          className="min-h-24 text-[15px] leading-relaxed placeholder:text-[var(--on-chunk-2)]"
        />
      </div>
    </SidePeek>
  );
}
