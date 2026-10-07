"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Flag, Plus } from "lucide-react";
import type { Task } from "@/lib/types";
import { useWorkspace, useProfiles } from "@/lib/store";
import { addDaysISO, cn, daysUntil, formatDay, todayISO } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/input";
import { Card, EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { statusPatch, useTaskPeek } from "./task-peek";

const CHEERS = ["Nice work!", "Boom, done!", "One less thing!", "Great job!", "Look at you go!"];

/** Plain-language due label, coloured by urgency. */
export function DueBadge({ date, done }: { date: string | null; done?: boolean }) {
  if (!date) return null;
  const d = daysUntil(date)!;
  if (done) return <span className="text-fg-3">{formatDay(date)}</span>;
  if (d < 0)
    return (
      <span className="label-caps rounded-md bg-red-soft px-1.5 text-[10.5px] leading-5 text-red-edge">
        Late · {formatDay(date)}
      </span>
    );
  if (d === 0) return <span className="label-caps rounded-md bg-orange-soft px-1.5 text-[10.5px] leading-5 text-orange-edge">Today</span>;
  if (d === 1) return <span className="label-caps rounded-md bg-blue-soft px-1.5 text-[10.5px] leading-5 text-blue-edge">Tomorrow</span>;
  return <span className="text-fg-2">{formatDay(date)}</span>;
}

export function useCompleteTask() {
  const { update } = useWorkspace();
  const toast = useToast();
  return (task: Task, done: boolean) => {
    void update("tasks", task.id, statusPatch(done ? "done" : "todo"));
    if (done) toast.show({ title: CHEERS[Math.floor(Math.random() * CHEERS.length)]!, description: task.title, tone: "success" });
  };
}

/** One task: big round checkbox, title, and a single line of friendly meta. Click opens the side panel. */
export function TaskRow({ task, showAssignee = true, showProject = true }: { task: Task; showAssignee?: boolean; showProject?: boolean }) {
  const { data } = useWorkspace();
  const people = useProfiles();
  const { openTask } = useTaskPeek();
  const complete = useCompleteTask();
  const project = showProject && task.project_id ? data.projects.find((p) => p.id === task.project_id) : undefined;
  const assignee = showAssignee ? people.get(task.assignee_id) : undefined;
  const done = task.status === "done";
  const urgent = !done && (task.priority === "urgent" || task.priority === "high");
  return (
    <div className="group flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-subtle">
      <Checkbox checked={done} onChange={(v) => complete(task, v)} label={`Mark ${task.title} ${done ? "not done" : "done"}`} />
      <button type="button" onClick={() => openTask(task.id)} className="min-w-0 flex-1 text-left">
        <div className={cn("truncate text-[15.5px] font-bold", done && "text-fg-3 line-through decoration-2")}>{task.title || "Untitled"}</div>
        {(task.due_date || project || task.status === "blocked" || urgent) && (
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] font-semibold text-fg-2">
            <DueBadge date={task.due_date} done={done} />
            {task.status === "blocked" && (
              <span className="label-caps rounded-md bg-red-soft px-1.5 text-[10.5px] leading-5 text-red-edge">Blocked</span>
            )}
            {urgent && (
              <span className={cn("flex items-center gap-1", task.priority === "urgent" ? "text-red" : "text-orange")}>
                <Flag className="size-3.5" strokeWidth={3} fill="currentColor" />
                {task.priority === "urgent" ? "Urgent" : "High"}
              </span>
            )}
            {project && (
              <span className="flex min-w-0 items-center gap-1 truncate">
                <span>{project.icon ?? "📁"}</span>
                <span className="truncate">{project.name}</span>
              </span>
            )}
          </div>
        )}
      </button>
      {assignee && <Avatar profile={assignee} size={28} />}
      <ChevronRight className="size-5 shrink-0 text-fg-3 opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={3} />
    </div>
  );
}

/** Flat list of task rows inside a card (dashboards, calendar day). */
export function TaskList({ tasks, showAssignee = true, showProject = true, limit }: { tasks: Task[]; showAssignee?: boolean; showProject?: boolean; limit?: number }) {
  const shown = limit ? tasks.slice(0, limit) : tasks;
  return (
    <Card className="divide-y-2 divide-line overflow-hidden">
      {shown.map((t) => (
        <TaskRow key={t.id} task={t} showAssignee={showAssignee} showProject={showProject} />
      ))}
      {limit && tasks.length > limit && <div className="px-4 py-2.5 text-[13px] font-bold text-fg-3">+{tasks.length - limit} more</div>}
    </Card>
  );
}

type Group = { key: string; label: string; tone?: "red" | "orange"; tasks: Task[] };

function groupByDue(tasks: Task[]): Group[] {
  const today = todayISO();
  const week = addDaysISO(today, 7);
  const groups: Group[] = [
    { key: "late", label: "Late", tone: "red", tasks: [] },
    { key: "today", label: "Today", tone: "orange", tasks: [] },
    { key: "week", label: "Next 7 days", tasks: [] },
    { key: "later", label: "Later", tasks: [] },
    { key: "none", label: "No date", tasks: [] },
  ];
  for (const t of tasks) {
    const g = !t.due_date ? "none" : t.due_date < today ? "late" : t.due_date === today ? "today" : t.due_date <= week ? "week" : "later";
    groups.find((x) => x.key === g)!.tasks.push(t);
  }
  return groups.filter((g) => g.tasks.length);
}

/**
 * Task list grouped by "when" — Late, Today, Next 7 days, Later, No date — instead of a spreadsheet.
 * Details (status, priority, assignee…) live in the side panel one click away.
 */
export function TaskTable({
  tasks,
  showProject = true,
  showAssignee = true,
  newTaskDefaults,
  emptyLabel = "No tasks here",
}: {
  tasks: Task[];
  showProject?: boolean;
  showAssignee?: boolean;
  newTaskDefaults?: Partial<Task>;
  emptyLabel?: string;
}) {
  const { create, me } = useWorkspace();
  const [showDone, setShowDone] = useState(false);
  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");
  const onlyDone = open.length === 0 && done.length > 0;
  const groups = groupByDue(open);

  return (
    <div className="space-y-6">
      {newTaskDefaults !== undefined && (
        <NewTaskRow
          onCreate={(title) =>
            void create("tasks", {
              title,
              description: null,
              project_id: null,
              assignee_id: me?.id ?? null,
              status: "todo",
              priority: "medium",
              due_date: null,
              created_by: me?.id ?? null,
              completed_at: null,
              ...newTaskDefaults,
            })
          }
        />
      )}
      {tasks.length === 0 && <EmptyState mood="cheer" title={emptyLabel} className="py-8" />}
      {groups.map((g) => (
        <section key={g.key}>
          <div className="mb-2 flex items-center gap-2 px-1">
            <h3 className={cn("text-[17px] font-extrabold", g.tone === "red" ? "text-red" : g.tone === "orange" ? "text-orange" : "text-fg")}>{g.label}</h3>
            <span className="text-[14px] font-bold text-fg-3">{g.tasks.length}</span>
          </div>
          <TaskList tasks={g.tasks} showProject={showProject} showAssignee={showAssignee} />
        </section>
      ))}
      {done.length > 0 &&
        (onlyDone ? (
          <TaskList tasks={done} showProject={showProject} showAssignee={showAssignee} />
        ) : (
          <section>
            <button
              type="button"
              onClick={() => setShowDone((s) => !s)}
              className="label-caps mb-2 flex h-9 items-center gap-1.5 rounded-xl px-2 text-[13px] text-fg-3 hover:bg-hover hover:text-fg-2"
            >
              <ChevronDown className={cn("size-4 transition-transform", !showDone && "-rotate-90")} strokeWidth={3} />
              {showDone ? "Hide" : "Show"} {done.length} done
            </button>
            {showDone && <TaskList tasks={done} showProject={showProject} showAssignee={showAssignee} />}
          </section>
        ))}
    </div>
  );
}

/** "+ Add a task" — a dashed card that turns into an input. */
export function NewTaskRow({ onCreate, label = "Add a task" }: { onCreate: (title: string) => void; label?: string }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  if (!editing)
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="label-caps flex h-14 w-full items-center gap-3 rounded-2xl border-2 border-dashed border-line-strong px-4 text-[13px] text-fg-3 transition-colors hover:border-blue hover:bg-blue-soft hover:text-blue"
      >
        <span className="flex size-[26px] items-center justify-center rounded-full bg-hover">
          <Plus className="size-4" strokeWidth={3} />
        </span>
        {label}
      </button>
    );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) onCreate(title.trim());
        setTitle("");
      }}
      className="flex h-14 items-center gap-3 rounded-2xl border-2 border-blue bg-bg px-4"
    >
      <span className="flex size-[26px] items-center justify-center rounded-full bg-blue-soft text-blue">
        <Plus className="size-4" strokeWidth={3} />
      </span>
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
        placeholder="What needs doing? Press Enter to add"
        className="h-full flex-1 bg-transparent text-[15.5px] font-bold outline-none placeholder:font-semibold placeholder:text-fg-3"
      />
    </form>
  );
}
