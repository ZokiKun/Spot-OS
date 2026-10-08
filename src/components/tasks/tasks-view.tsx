"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "@/lib/store";
import type { Project, Task } from "@/lib/types";
import { filterTasks, sortTasks, type TaskFilter } from "@/lib/selectors";
import { firstName, todayISO } from "@/lib/utils";
import { Page, PageTitle } from "@/components/shell/page";
import { ViewTabs } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { NAV_ICONS } from "@/components/shell/icons";
import { TaskList, TaskTable } from "./task-table";
import { TaskBoard, TaskGantt, TaskGrid, TaskViewSwitcher, type TaskView } from "./task-views";
import { usePref } from "@/lib/hooks";
import { EmptyState } from "@/components/ui/misc";
import { usePageAdd, useQuickAdd } from "@/components/shell/quick-add";

const TASK_VIEWS: TaskView[] = ["table", "board", "list", "grid", "gantt"];

/** Gantt rows grouped by project (tasks without one last). */
function ganttGroups(tasks: Task[], projects: Project[]) {
  const ids = [...new Set(tasks.map((t) => t.project_id))];
  return ids
    .map((id) => {
      const p = projects.find((x) => x.id === id);
      return { key: id ?? "none", label: p ? `${p.icon ?? "📁"} ${p.name}` : "No project", tasks: tasks.filter((t) => t.project_id === id), due: p?.deadline ?? null };
    })
    .sort((a, b) => (a.key === "none" ? 1 : b.key === "none" ? -1 : 0));
}

function parseFilter(raw: string | null): TaskFilter {
  if (!raw) return { kind: "mine" };
  if (raw.startsWith("member:")) return { kind: "member", id: raw.slice(7) };
  return { kind: raw as Exclude<TaskFilter["kind"], "member"> } as TaskFilter;
}
const keyOf = (f: TaskFilter) => (f.kind === "member" ? `member:${f.id}` : f.kind);

export function TasksView() {
  const { data, me } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filter = parseFilter(params.get("filter"));
  const meId = me?.id ?? null;

  const counts = (f: TaskFilter) => filterTasks(data.tasks, f, meId).length;
  const tabs = [
    { value: "all", label: "All", count: counts({ kind: "all" }) },
    { value: "mine", label: "My tasks", count: counts({ kind: "mine" }) },
    ...data.profiles
      .filter((p) => p.id !== meId)
      .map((p) => ({
        value: `member:${p.id}`,
        label: firstName(p.full_name),
        icon: <Avatar profile={p} size={16} />,
        count: counts({ kind: "member", id: p.id }),
      })),
    { value: "overdue", label: "Overdue", count: counts({ kind: "overdue" }) },
    { value: "today", label: "Today", count: counts({ kind: "today" }) },
    { value: "upcoming", label: "Upcoming", count: counts({ kind: "upcoming" }) },
    { value: "completed", label: "Completed" },
  ];

  const list = filterTasks(data.tasks, filter, meId);
  const tasks = filter.kind === "completed" ? list : sortTasks(list);

  const defaults =
    // Tasks start unassigned, except on a person's tab (else the new task would vanish from it).
    filter.kind === "member"
      ? { assignee_id: filter.id, assignee_ids: [filter.id] }
      : filter.kind === "mine" && meId
        ? { assignee_id: meId, assignee_ids: [meId] }
        : filter.kind === "today"
          ? { due_date: todayISO() }
          : {};

  const [savedView, setView] = usePref<TaskView>("tasks-view", "table");
  const view: TaskView = TASK_VIEWS.includes(savedView) ? savedView : "table";
  const quick = useQuickAdd();
  usePageAdd("New task", () => quick.openTask(defaults));

  const Icon = NAV_ICONS.projects!;
  return (
    <Page
      crumbs={[
        { label: "Projects", href: "/projects", icon: <Icon className="size-4" /> },
        { label: "Tasks" },
      ]}
    >
      <PageTitle title="Tasks" description="Every task across projects. Click a task to open it." />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <ViewTabs className="min-w-0 grow" value={keyOf(filter)} onChange={(v) => router.replace(`${pathname}?filter=${v}`)} items={tabs} />
        <TaskViewSwitcher value={view} onChange={setView} views={TASK_VIEWS} />
      </div>
      {view === "table" && (
        <TaskTable
          tasks={tasks}
          newTaskDefaults={defaults}
          emptyLabel={filter.kind === "overdue" ? "Nothing overdue 🎉" : filter.kind === "completed" ? "No completed tasks yet" : "No open tasks"}
        />
      )}
      {view === "board" && <TaskBoard tasks={tasks} />}
      {view === "list" && (tasks.length ? <TaskList tasks={tasks} /> : <EmptyState title="No tasks here" />)}
      {view === "grid" && <TaskGrid tasks={tasks} />}
      {view === "gantt" && <TaskGantt groups={ganttGroups(tasks, data.projects)} />}
    </Page>
  );
}
