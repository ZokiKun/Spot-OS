"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CalendarDays, CircleDot, Copy, Flag, FolderKanban, Trash2, Users, X } from "lucide-react";
import type { Task, UUID } from "@/lib/types";
import { TASK_PRIORITIES } from "@/lib/constants";
import { statusChange, statusOptions } from "@/lib/task-statuses";
import { assigneesPatch, taskAssignees } from "@/lib/selectors";
import { useProfiles, useWorkspace } from "@/lib/store";
import { DateField, OptionField, PeopleField, ProjectField } from "@/components/ui/fields";
import { Button, IconButton } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";
import { hasOpenPopover } from "@/components/ui/popover";
import { taskCopy } from "./task-peek";

interface TaskSelectionApi {
  selected: ReadonlySet<UUID>;
  /** Tick or untick one task. With `range` (the table's tasks in order), shift-click ticks everything from the last tick. */
  toggle: (id: UUID, on: boolean, range?: { ids: UUID[]; shift: boolean }) => void;
  setMany: (ids: UUID[], on: boolean) => void;
  clear: () => void;
}
const TaskSelectionContext = createContext<TaskSelectionApi>({ selected: new Set(), toggle: () => {}, setMany: () => {}, clear: () => {} });
export const useTaskSelection = () => useContext(TaskSelectionContext);

/** Tick several tasks in a table, then edit, duplicate or delete them together from the bar at the bottom. */
export function TaskSelectionProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<UUID[]>([]);
  const anchor = useRef<UUID | null>(null);
  const pathname = usePathname();

  // A selection belongs to the page it was made on.
  const [seenPath, setSeenPath] = useState(pathname);
  if (pathname !== seenPath) {
    setSeenPath(pathname);
    setIds([]);
  }

  const toggle = useCallback<TaskSelectionApi["toggle"]>((id, on, range) => {
    const from = anchor.current;
    anchor.current = id;
    setIds((cur) => {
      let touched = [id];
      if (range?.shift && from && from !== id) {
        const a = range.ids.indexOf(from);
        const b = range.ids.indexOf(id);
        if (a >= 0 && b >= 0) touched = range.ids.slice(Math.min(a, b), Math.max(a, b) + 1);
      }
      return on ? [...new Set([...cur, ...touched])] : cur.filter((x) => !touched.includes(x));
    });
  }, []);
  const setMany = useCallback((many: UUID[], on: boolean) => {
    setIds((cur) => (on ? [...new Set([...cur, ...many])] : cur.filter((x) => !many.includes(x))));
  }, []);
  const clear = useCallback(() => setIds([]), []);

  useEffect(() => {
    if (!ids.length) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || hasOpenPopover() || document.querySelector("[aria-modal='true']")) return;
      setIds([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ids.length]);

  const selected = useMemo(() => new Set(ids), [ids]);
  const api = useMemo(() => ({ selected, toggle, setMany, clear }), [selected, toggle, setMany, clear]);
  return (
    <TaskSelectionContext value={api}>
      {children}
      {ids.length > 0 && <BulkBar ids={ids} onClear={clear} />}
    </TaskSelectionContext>
  );
}

/** The value every selected task shares, or null when they differ. */
function shared<T>(tasks: Task[], get: (t: Task) => T, key: (v: T) => string = (v) => String(v)): T | null {
  if (!tasks.length) return null;
  const first = get(tasks[0]!);
  return tasks.every((t) => key(get(t)) === key(first)) ? first : null;
}

function BulkBar({ ids, onClear }: { ids: UUID[]; onClear: () => void }) {
  const { data, update, create, remove, me } = useWorkspace();
  const people = useProfiles();
  const ask = useConfirm();
  const toast = useToast();
  const tasks = useMemo(() => data.tasks.filter((t) => ids.includes(t.id)), [data.tasks, ids]);
  if (!tasks.length) return null; // the selected tasks were deleted

  const projectId = shared(tasks, (t) => t.project_id);
  const project = projectId ? data.projects.find((p) => p.id === projectId) : null;
  const n = tasks.length;
  const noun = n === 1 ? "task" : "tasks";
  const each = (patch: (t: Task) => Partial<Task>) => tasks.forEach((t) => void update("tasks", t.id, patch(t)));

  const label = (icon: ReactNode, text: string) => (
    <span className="flex items-center gap-1.5 text-fg-2">
      {icon}
      {text}
    </span>
  );

  return (
    <div className="no-print anim-pop fixed bottom-5 left-1/2 z-40 md:left-[calc(50%+120px)] flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto rounded-lg bg-elevated p-1 shadow-menu" role="toolbar" aria-label="Selected tasks">
      <span className="shrink-0 whitespace-nowrap px-2 text-[13px] font-medium tabular">
        {n} selected
      </span>
      <span className="mx-0.5 h-5 w-px shrink-0 bg-line" />
      <OptionField
        variant="chip"
        options={statusOptions(project)}
        value={null}
        placeholder={label(<CircleDot className="size-3.5" />, "Status")}
        onChange={(v) => each(() => statusChange(v, project))}
      />
      <PeopleField
        variant="chip"
        people={people.list}
        value={shared(tasks, taskAssignees, (v) => v.join()) ?? []}
        placeholder={label(<Users className="size-3.5" />, "Assignees")}
        onChange={(next) => each(() => assigneesPatch(next))}
      />
      <DateField variant="chip" value={null} placeholder={label(<CalendarDays className="size-3.5" />, "Due")} onChange={(due_date) => each(() => ({ due_date }))} />
      <OptionField
        variant="chip"
        kind="select"
        options={TASK_PRIORITIES}
        value={null}
        placeholder={label(<Flag className="size-3.5" />, "Priority")}
        onChange={(priority) => each(() => ({ priority }))}
      />
      <ProjectField
        variant="chip"
        projects={data.projects}
        value={null}
        placeholder={label(<FolderKanban className="size-3.5" />, "Project")}
        onChange={(project_id) =>
          // Statuses are per project: keep each task's built-in status, drop the old project's custom one.
          each((t) => (t.project_id === project_id ? {} : { project_id, milestone_id: null, custom_status: null }))
        }
      />
      <span className="mx-0.5 h-5 w-px shrink-0 bg-line" />
      <Button
        variant="ghost"
        onClick={() => {
          void Promise.allSettled(tasks.map((t) => create("tasks", taskCopy(t, me?.id ?? null)))).then((results) => {
            const made = results.filter((r) => r.status === "fulfilled").length;
            if (made) toast.show({ title: made === 1 ? "Task duplicated" : `${made} tasks duplicated`, tone: "success" });
          });
          onClear();
        }}
      >
        <Copy className="size-3.5" /> Duplicate
      </Button>
      <Button
        variant="ghost"
        className="text-danger hover:text-danger"
        onClick={() => {
          void ask({
            title: n === 1 ? `Delete “${tasks[0]!.title || "Untitled"}”?` : `Delete ${n} tasks?`,
            description: `The ${noun} and ${n === 1 ? "its" : "their"} files are removed for everyone.`,
            confirmLabel: n === 1 ? "Delete" : `Delete ${n} tasks`,
          }).then((ok) => {
            if (!ok) return;
            tasks.forEach((t) => void remove("tasks", t.id));
            onClear();
          });
        }}
      >
        <Trash2 className="size-3.5" /> Delete
      </Button>
      <IconButton label="Clear selection (Esc)" size="md" onClick={onClear}>
        <X className="size-4" />
      </IconButton>
    </div>
  );
}
