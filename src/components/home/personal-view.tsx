"use client";

import Link from "next/link";
import { CalendarClock, CircleCheck, FolderKanban } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { isDueToday, isMyProject, isOverdue, isUpcoming, sortProjects, sortTasks } from "@/lib/selectors";
import { ACTIVE_PROJECT_STATUSES } from "@/lib/constants";
import { addDaysISO, cn, daysUntil, formatDay, todayISO } from "@/lib/utils";
import { EmptyState, SectionHeading } from "@/components/ui/misc";
import { TaskList } from "@/components/tasks/task-table";
import { ProjectTable } from "@/components/projects/project-views";

export function PersonalView() {
  const { data, me } = useWorkspace();
  const meId = me?.id ?? null;
  const today = todayISO();

  const mine = data.tasks.filter((t) => t.assignee_id === meId);
  const overdue = sortTasks(mine.filter((t) => isOverdue(t, today)));
  const dueToday = sortTasks(mine.filter((t) => isDueToday(t, today)));
  const upcoming = sortTasks(mine.filter((t) => isUpcoming(t, today, 7)));

  // Only the projects I lead, direct, am a member of, or have open tasks on.
  const myProjects = sortProjects(data.projects.filter((p) => ACTIVE_PROJECT_STATUSES.includes(p.status) && isMyProject(p, data, meId)));

  const deadlines = myProjects
    .filter((p) => p.deadline && p.deadline >= today && p.deadline <= addDaysISO(today, 30))
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!));

  return (
    <div className="space-y-10">
      <section>
        <SectionHeading
          icon={<FolderKanban className="size-3.5" />}
          action={
            <Link href="/projects" className="rounded px-1 hover:bg-hover">
              All projects
            </Link>
          }
        >
          My active projects <span className="font-normal text-fg-3">{myProjects.length}</span>
        </SectionHeading>
        {myProjects.length === 0 ? (
          <EmptyState title="You’re not on any active project" description="Projects you lead, direct or have tasks on show up here." className="py-6" />
        ) : (
          <ProjectTable projects={myProjects} />
        )}
      </section>

      <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-2">
        <section>
          <SectionHeading
            icon={<CircleCheck className="size-3.5" />}
            action={
              <Link href="/projects/tasks?filter=mine" className="rounded px-1 hover:bg-hover">
                All my tasks
              </Link>
            }
          >
            My tasks
          </SectionHeading>
          {overdue.length + dueToday.length + upcoming.length === 0 ? (
            <EmptyState title="You’re clear for the week" description="No overdue, due-today or upcoming tasks." className="py-6" />
          ) : (
            <div className="space-y-3">
              {overdue.length > 0 && <Group label="Overdue" tone="danger" tasks={overdue} />}
              {dueToday.length > 0 && <Group label="Today" tasks={dueToday} />}
              {upcoming.length > 0 && <Group label="Next 7 days" tasks={upcoming} />}
            </div>
          )}
        </section>

        <section>
          <SectionHeading icon={<CalendarClock className="size-3.5" />}>My deadlines · next 30 days</SectionHeading>
          {deadlines.length === 0 ? (
            <EmptyState title="No deadlines in the next 30 days" className="py-6" />
          ) : (
            <div>
              {deadlines.map((p) => {
                const d = daysUntil(p.deadline)!;
                return (
                  <Link key={p.id} href={`/projects/${p.id}`} className="flex h-9 items-center gap-3 rounded-md px-2 hover:bg-hover">
                    <span className={cn("w-20 shrink-0 text-[13px] tabular", d <= 3 ? "font-medium text-danger" : "text-fg-2")}>{formatDay(p.deadline)}</span>
                    <span>{p.icon}</span>
                    <span className="min-w-0 flex-1 truncate text-[14px]">{p.name}</span>
                    <span className="text-[12px] text-fg-3">{d === 0 ? "today" : `in ${d}d`}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Group({ label, tasks, tone }: { label: string; tasks: Parameters<typeof TaskList>[0]["tasks"]; tone?: "danger" }) {
  return (
    <div>
      <div className={cn("mb-0.5 px-2 text-[12px] font-medium", tone === "danger" ? "text-danger" : "text-fg-3")}>
        {label} <span className="font-normal">{tasks.length}</span>
      </div>
      <TaskList tasks={tasks} showAssignee={false} limit={6} />
    </div>
  );
}
