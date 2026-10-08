"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "@/lib/store";
import { filterTasks, sortTasks, type TaskFilter } from "@/lib/selectors";
import { firstName, todayISO } from "@/lib/utils";
import { Page, PageTitle } from "@/components/shell/page";
import { ViewTabs } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { NAV_ICONS } from "@/components/shell/icons";
import { TaskTable } from "./task-table";
import { usePageAdd, useQuickAdd } from "@/components/shell/quick-add";

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
    filter.kind === "member" ? { assignee_id: filter.id, assignee_ids: [filter.id] } : filter.kind === "today" ? { due_date: todayISO() } : {};

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
      <ViewTabs
        className="mb-3"
        value={keyOf(filter)}
        onChange={(v) => router.replace(`${pathname}?filter=${v}`)}
        items={tabs}
      />
      <TaskTable
        tasks={tasks}
        newTaskDefaults={defaults}
        emptyLabel={filter.kind === "overdue" ? "Nothing overdue 🎉" : filter.kind === "completed" ? "No completed tasks yet" : "No open tasks"}
      />
    </Page>
  );
}
