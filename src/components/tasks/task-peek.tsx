"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Trash2, Undo2 } from "lucide-react";
import { useWorkspace, useProfiles } from "@/lib/store";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import type { Task, TaskStatus, UUID } from "@/lib/types";
import { nowISO, timeAgo } from "@/lib/utils";
import { SidePeek } from "@/components/ui/side-peek";
import { AutoTextarea, EditableText } from "@/components/ui/input";
import { DateField, OptionField, PersonField, ProjectField, PropertyRow } from "@/components/ui/fields";
import { Button, IconButton } from "@/components/ui/button";
import { useCompleteTask } from "./task-table";

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
  const complete = useCompleteTask();
  const task = data.tasks.find((t) => t.id === taskId);
  const project = task?.project_id ? data.projects.find((p) => p.id === task.project_id) : undefined;
  const [description, setDescription] = useState(task?.description ?? "");
  // Reset the draft when switching tasks or when someone else edits the description.
  const sourceKey = `${task?.id}:${task?.description ?? ""}`;
  const [seen, setSeen] = useState(sourceKey);
  if (sourceKey !== seen) {
    setSeen(sourceKey);
    setDescription(task?.description ?? "");
  }

  if (!task) return <SidePeek open={false} onClose={onClose}>{null}</SidePeek>;
  const set = (patch: Partial<Task>) => void update("tasks", task.id, patch);

  return (
    <SidePeek
      open
      onClose={onClose}
      expandHref={project ? `/projects/${project.id}?task=${task.id}` : undefined}
      actions={
        <IconButton
          label="Delete task"
          onClick={() => {
            if (confirm(`Delete “${task.title}”?`)) {
              void remove("tasks", task.id);
              onClose();
            }
          }}
        >
          <Trash2 className="size-[18px]" strokeWidth={2.5} />
        </IconButton>
      }
    >
      {project && (
        <div className="mb-1 flex items-center gap-1.5 text-[13px] font-bold text-fg-2">
          <span>{project.icon ?? "📁"}</span> {project.name}
        </div>
      )}
      <EditableText
        value={task.title}
        onCommit={(title) => title && set({ title })}
        placeholder="Untitled"
        multiline
        className="text-[26px] font-black leading-tight"
      />
      <div className="mt-5">
        {task.status === "done" ? (
          <Button variant="secondary" size="md" className="w-full" onClick={() => set(statusPatch("todo"))}>
            <Undo2 className="size-4" strokeWidth={3} /> Mark as not done
          </Button>
        ) : (
          <Button variant="primary" size="md" className="w-full" onClick={() => complete(task, true)}>
            <Check className="size-5" strokeWidth={3.5} /> Mark as done
          </Button>
        )}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <PropertyRow label="Status">
          <OptionField variant="property" options={TASK_STATUSES} value={task.status} onChange={(s) => set(statusPatch(s))} />
        </PropertyRow>
        <PropertyRow label="Who">
          <PersonField variant="property" people={people.list} value={task.assignee_id} onChange={(assignee_id) => set({ assignee_id })} />
        </PropertyRow>
        <PropertyRow label="Due">
          <DateField variant="property" value={task.due_date} highlightOverdue={task.status !== "done"} onChange={(due_date) => set({ due_date })} placeholder="Pick a day" />
        </PropertyRow>
        <PropertyRow label="Priority">
          <OptionField variant="property" kind="select" options={TASK_PRIORITIES} value={task.priority} onChange={(priority) => set({ priority })} />
        </PropertyRow>
        <div className="col-span-2">
          <PropertyRow label="Project">
            <ProjectField variant="property" projects={data.projects} value={task.project_id} onChange={(project_id) => set({ project_id })} />
          </PropertyRow>
        </div>
      </div>
      <div className="mt-5">
        <div className="label-caps mb-1.5 px-1 text-[11px] text-fg-3">Notes</div>
        <AutoTextarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => description !== (task.description ?? "") && set({ description: description || null })}
          placeholder="Anything worth knowing? Links, context, what “done” looks like…"
          className="min-h-28 rounded-2xl border-2 border-line bg-subtle px-4 py-3 text-[15px] font-semibold leading-relaxed focus:border-blue"
        />
      </div>
      <p className="mt-4 px-1 text-[12.5px] font-semibold text-fg-3">
        Added by {people.get(task.created_by)?.full_name ?? "someone"} · {timeAgo(task.created_at)}
        {task.updated_at !== task.created_at && <> · edited {timeAgo(task.updated_at)}</>}
      </p>
    </SidePeek>
  );
}
