"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, CircleDot, Flag, FolderKanban, Milestone as MilestoneIcon, Trash2, User, Clock } from "lucide-react";
import { useWorkspace, useProfiles } from "@/lib/store";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import type { Task, TaskStatus, UUID } from "@/lib/types";
import { nowISO, timeAgo } from "@/lib/utils";
import { SidePeek } from "@/components/ui/side-peek";
import { EditableText } from "@/components/ui/input";
import { MentionTextarea } from "@/components/ui/mention-textarea";
import { DateField, MilestoneField, OptionField, PersonField, ProjectField, PropertyRow } from "@/components/ui/fields";
import { sortMilestones } from "@/lib/milestones";
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
      expandHref={project ? `/projects/${project.id}?tab=tasks&task=${task.id}` : undefined}
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
          <Trash2 className="size-4" />
        </IconButton>
      }
    >
      <EditableText
        value={task.title}
        onCommit={(title) => title && set({ title })}
        placeholder="Untitled"
        multiline
        className="text-[30px] font-bold leading-tight"
      />
      <div className="mt-5 space-y-0.5">
        <PropertyRow icon={<CircleDot className="size-4" />} label="Status">
          <OptionField variant="property" options={TASK_STATUSES} value={task.status} onChange={(s) => set(statusPatch(s))} />
        </PropertyRow>
        <PropertyRow icon={<User className="size-4" />} label="Assignee">
          <PersonField variant="property" people={people.list} value={task.assignee_id} onChange={(assignee_id) => set({ assignee_id })} />
        </PropertyRow>
        <PropertyRow icon={<CalendarDays className="size-4" />} label="Due date">
          <DateField variant="property" value={task.due_date} highlightOverdue={task.status !== "done"} onChange={(due_date) => set({ due_date })} />
        </PropertyRow>
        <PropertyRow icon={<Flag className="size-4" />} label="Priority">
          <OptionField variant="property" kind="select" options={TASK_PRIORITIES} value={task.priority} onChange={(priority) => set({ priority })} />
        </PropertyRow>
        <PropertyRow icon={<FolderKanban className="size-4" />} label="Project">
          <ProjectField
            variant="property"
            projects={data.projects}
            value={task.project_id}
            onChange={(project_id) => project_id !== task.project_id && set({ project_id, milestone_id: null })}
          />
        </PropertyRow>
        {project && (
          <PropertyRow icon={<MilestoneIcon className="size-4" />} label="Milestone">
            <MilestoneField
              variant="property"
              milestones={sortMilestones(data.milestones.filter((m) => m.project_id === project.id))}
              value={task.milestone_id}
              onChange={(milestone_id) => set({ milestone_id })}
            />
          </PropertyRow>
        )}
        <PropertyRow icon={<Clock className="size-4" />} label="Created">
          <div className="flex min-h-[30px] items-center px-1.5 text-fg-2">
            {people.get(task.created_by)?.full_name ?? "Someone"} · {timeAgo(task.created_at)}
            {task.updated_at !== task.created_at && <span className="ml-1 text-fg-3">· edited {timeAgo(task.updated_at)}</span>}
          </div>
        </PropertyRow>
      </div>
      <div className="mt-4 border-t border-line pt-4">
        <MentionTextarea
          value={description}
          onChange={setDescription}
          onBlur={() => description !== (task.description ?? "") && set({ description: description || null })}
          placeholder="Add a description… type @ to mention someone"
          className="min-h-24 text-[15px] leading-relaxed"
        />
      </div>
    </SidePeek>
  );
}
