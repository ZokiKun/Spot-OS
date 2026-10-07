"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useWorkspace, useProfiles } from "@/directions/d3/lib/store";
import { filterTasks, sortTasks, type TaskFilter } from "@/directions/d3/lib/selectors";
import { firstName, timeAgo, todayISO } from "@/directions/d3/lib/utils";
import { Page, PageTitle } from "@/directions/d3/components/shell/page";
import { ViewTabs } from "@/directions/d3/components/ui/tabs";
import { Avatar } from "@/directions/d3/components/ui/avatar";
import { WeekCard, RailCard } from "@/directions/d3/components/home/rail-cards";
import { TaskTable } from "./task-table";
import { useTaskPeek } from "./task-peek";

function parseFilter(raw: string | null): TaskFilter {
  if (!raw) return { kind: "mine" };
  if (raw.startsWith("member:")) return { kind: "member", id: raw.slice(7) };
  return { kind: raw as Exclude<TaskFilter["kind"], "member"> } as TaskFilter;
}
const keyOf = (f: TaskFilter) => (f.kind === "member" ? `member:${f.id}` : f.kind);

/** Every task, grouped by when it's due. Filters are just "whose" — the grouping answers "when". */
export function TasksView() {
  const { data, me } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filter = parseFilter(params.get("filter"));
  const meId = me?.id ?? null;

  const counts = (f: TaskFilter) => filterTasks(data.tasks, f, meId).length;
  const tabs = [
    { value: "mine", label: "Mine", count: counts({ kind: "mine" }) },
    { value: "all", label: "Everyone", count: counts({ kind: "all" }) },
    ...data.profiles
      .filter((p) => p.id !== meId)
      .map((p) => ({
        value: `member:${p.id}`,
        label: firstName(p.full_name),
        icon: <Avatar profile={p} size={22} />,
        count: counts({ kind: "member", id: p.id }),
      })),
    { value: "completed", label: "Done" },
  ];

  const list = filterTasks(data.tasks, filter, meId);
  const tasks = filter.kind === "completed" ? list.slice(0, 50) : sortTasks(list);
  const defaults = filter.kind === "member" ? { assignee_id: filter.id } : filter.kind === "today" ? { due_date: todayISO() } : {};
  const person = filter.kind === "member" ? data.profiles.find((p) => p.id === filter.id) : undefined;

  const title =
    filter.kind === "mine" ? "My tasks" : filter.kind === "member" ? `${firstName(person?.full_name)}’s tasks` : filter.kind === "completed" ? "Done lately" : "All tasks";

  return (
    <Page
      crumbs={[{ label: "Projects", href: "/projects" }, { label: "Tasks" }]}
      aside={
        <>
          <WeekCard />
          <DoneLately />
        </>
      }
    >
      <PageTitle title={title} description={filter.kind === "completed" ? "Finished work from the whole team. 🎉" : "Tick things off as you go. Click a task for details."} />
      <ViewTabs className="mb-7" value={keyOf(filter)} onChange={(v) => router.replace(`${pathname}?filter=${v}`, { scroll: false })} items={tabs} />
      <TaskTable
        tasks={tasks}
        showAssignee={filter.kind === "all" || filter.kind === "completed"}
        newTaskDefaults={filter.kind === "completed" ? undefined : defaults}
        emptyLabel={filter.kind === "completed" ? "Nothing finished yet" : "Nothing on the list — enjoy it!"}
      />
    </Page>
  );
}

/** Small celebration of recently finished work. */
function DoneLately() {
  const { data } = useWorkspace();
  const people = useProfiles();
  const { openTask } = useTaskPeek();
  const done = data.tasks
    .filter((t) => t.status === "done" && t.completed_at)
    .sort((a, b) => b.completed_at!.localeCompare(a.completed_at!))
    .slice(0, 4);
  if (!done.length) return null;
  return (
    <RailCard title="Recently done">
      <div className="-mx-2">
        {done.map((t) => (
          <button key={t.id} type="button" onClick={() => openTask(t.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-hover">
            <Avatar profile={people.get(t.assignee_id)} size={30} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14.5px] font-extrabold">{t.title}</div>
              <div className="text-[12.5px] font-bold text-green-edge">Done {timeAgo(t.completed_at)}</div>
            </div>
          </button>
        ))}
      </div>
    </RailCard>
  );
}
