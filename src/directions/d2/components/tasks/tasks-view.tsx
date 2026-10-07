"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import type { Task, UUID } from "@/directions/d2/lib/types";
import { useWorkspace } from "@/directions/d2/lib/store";
import { isOpen, sortTasks } from "@/directions/d2/lib/selectors";
import { addDaysISO, cn, firstName, todayISO } from "@/directions/d2/lib/utils";
import { Page, PageTitle } from "@/directions/d2/components/shell/page";
import { Avatar } from "@/directions/d2/components/ui/avatar";
import { Card, MUTED, PillTabs, type Tone } from "@/directions/d2/components/ui/chunk";
import { AddTaskPill, TaskChunkList } from "./task-chunks";

type Scope = { kind: "mine" } | { kind: "all" } | { kind: "member"; id: UUID } | { kind: "completed" };

function parseScope(raw: string | null): Scope {
  if (!raw || raw === "mine") return { kind: "mine" };
  if (raw.startsWith("member:")) return { kind: "member", id: raw.slice(7) };
  if (raw === "completed") return { kind: "completed" };
  // "all", plus the old overdue / today / upcoming filters — the groups below already split by time.
  return { kind: "all" };
}
const keyOf = (s: Scope) => (s.kind === "member" ? `member:${s.id}` : s.kind);

const GROUPS: { key: string; title: string; tone: Tone; test: (t: Task, today: string) => boolean }[] = [
  { key: "late", title: "Late", tone: "coral", test: (t, today) => !!t.due_date && t.due_date < today },
  { key: "today", title: "Today", tone: "sun", test: (t, today) => t.due_date === today },
  { key: "week", title: "This week", tone: "sky", test: (t, today) => !!t.due_date && t.due_date > today && t.due_date <= addDaysISO(today, 7) },
  { key: "later", title: "Later", tone: "cream", test: (t, today) => !!t.due_date && t.due_date > addDaysISO(today, 7) },
  { key: "someday", title: "No date", tone: "surface", test: (t) => !t.due_date },
];

/** Tasks sorted into "when" chunks — late, today, this week, later — instead of one long table. */
export function TasksView() {
  const { data, me, create } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const scope = parseScope(params.get("filter"));
  const meId = me?.id ?? null;
  const today = todayISO();

  const everyone = scope.kind === "all" || scope.kind === "completed";
  const assignee = scope.kind === "member" ? scope.id : meId;
  const inScope = data.tasks.filter((t) => everyone || t.assignee_id === assignee);

  const open = sortTasks(inScope.filter(isOpen));
  const completed = data.tasks
    .filter((t) => t.status === "done")
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))
    .slice(0, 40);

  const countOpen = (who: UUID | null) => data.tasks.filter((t) => isOpen(t) && t.assignee_id === who).length;
  const tabs = [
    { value: "mine", label: "Mine", count: countOpen(meId) },
    { value: "all", label: "Everyone", count: data.tasks.filter(isOpen).length },
    ...data.profiles
      .filter((p) => p.id !== meId)
      .map((p) => ({ value: `member:${p.id}`, label: firstName(p.full_name), icon: <Avatar profile={p} size={22} className="-ml-2" />, count: countOpen(p.id) })),
    { value: "completed", label: "Done" },
  ];

  const who = scope.kind === "member" ? data.profiles.find((p) => p.id === scope.id) : null;

  return (
    <Page crumbs={[{ label: "Projects", href: "/projects" }, { label: "Tasks" }]}>
      <PageTitle
        title={scope.kind === "mine" ? <>My<br />tasks</> : scope.kind === "member" ? <>{firstName(who?.full_name)}’s<br />tasks</> : scope.kind === "completed" ? <>Done<br />lately</> : <>All<br />tasks</>}
        description={scope.kind === "completed" ? "The last 40 things the studio finished." : "Sorted by when they’re due. Tap a task to see everything about it."}
      />
      <PillTabs className="mb-6" value={keyOf(scope)} onChange={(v) => router.replace(`${pathname}?filter=${v}`, { scroll: false })} items={tabs} />

      {scope.kind === "completed" ? (
        <Card tone="lime" className="p-6">
          <TaskChunkList tasks={completed} tone="lime" limit={12} showAssignee empty={<div className="py-8 text-center text-[15px]">Nothing finished yet.</div>} />
        </Card>
      ) : (
        <>
          <Card tone="surface" className="mb-3 p-2">
            <AddTaskPill
              label={scope.kind === "member" ? `Add a task for ${firstName(who?.full_name)}` : "Add a task"}
              onCreate={(title) =>
                void create("tasks", {
                  title,
                  description: null,
                  project_id: null,
                  assignee_id: assignee,
                  status: "todo",
                  priority: "medium",
                  due_date: null,
                  created_by: meId,
                  completed_at: null,
                })
              }
            />
          </Card>
          {open.length === 0 ? (
            <Card tone="lime" className="items-center py-14 text-center">
              <Sparkles className="size-8" />
              <div className="mt-3 text-[24px] font-medium tracking-[-0.02em]">Nothing open</div>
              <div className="mt-1 text-[14px] text-[var(--on-chunk-2)]">Every task here is done.</div>
            </Card>
          ) : (
            <div key={keyOf(scope)} className="stagger columns-1 gap-3 lg:columns-2 [&>*]:mb-3 [&>*]:break-inside-avoid">
              {GROUPS.map((g) => {
                const tasks = open.filter((t) => g.test(t, today));
                if (!tasks.length) return null;
                return (
                  <Card key={g.key} tone={g.tone} className="p-6">
                    <div className="mb-4 flex items-baseline gap-2">
                      <h2 className="text-[22px] font-medium tracking-[-0.02em]">{g.title}</h2>
                      <span className={cn("text-[15px]", MUTED[g.tone])}>{tasks.length}</span>
                    </div>
                    <TaskChunkList tasks={tasks} tone={g.tone} limit={5} showAssignee={scope.kind === "all"} showDue={g.key !== "today"} />
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </Page>
  );
}
