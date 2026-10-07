"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, CircleCheck, FolderKanban } from "lucide-react";
import { useProfiles, useWorkspace } from "@/lib/store";
import { attentionItems, isActiveProject, isDueToday, isOverdue, isUpcoming, projectProgress, sortProjects, sortTasks } from "@/lib/selectors";
import { PROJECT_STATUSES, optionFor } from "@/lib/constants";
import { addDaysISO, cn, daysUntil, formatDay, todayISO } from "@/lib/utils";
import { EmptyState, ProgressBar, SectionHeading } from "@/components/ui/misc";
import { StatusTag } from "@/components/ui/tag";
import { Avatar } from "@/components/ui/avatar";
import { TaskList } from "@/components/tasks/task-table";
import { Attention } from "./attention";

export function PersonalView() {
  const { data, me } = useWorkspace();
  const meId = me?.id ?? null;
  const today = todayISO();

  const mine = useMemo(() => data.tasks.filter((t) => t.assignee_id === meId), [data.tasks, meId]);
  const overdue = sortTasks(mine.filter((t) => isOverdue(t, today)));
  const dueToday = sortTasks(mine.filter((t) => isDueToday(t, today)));
  const upcoming = sortTasks(mine.filter((t) => isUpcoming(t, today, 7)));
  // Overdue / due-today already appear under My tasks, so Attention shows the rest.
  const attention = attentionItems(data, { meId, mine: true }).filter((i) => i.kind !== "overdue_task" && i.kind !== "due_today");

  const myProjects = useMemo(
    () =>
      sortProjects(
        data.projects.filter(
          (p) =>
            isActiveProject(p) &&
            (p.lead_id === meId ||
              p.creative_director_id === meId ||
              data.project_members.some((m) => m.project_id === p.id && m.profile_id === meId) ||
              mine.some((t) => t.project_id === p.id && t.status !== "done")),
        ),
      ),
    [data.projects, data.project_members, mine, meId],
  );

  const deadlines = data.projects
    .filter((p) => isActiveProject(p) && p.deadline && p.deadline >= today && p.deadline <= addDaysISO(today, 30))
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!));

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-2">
        <section>
          <SectionHeading icon={<CircleCheck className="size-3.5" />} action={<Link href="/projects/tasks?filter=mine" className="rounded px-1 hover:bg-hover">All my tasks</Link>}>
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
        <Attention items={attention} />
      </div>

      <section>
        <SectionHeading icon={<FolderKanban className="size-3.5" />}>My active projects · next actions</SectionHeading>
        {myProjects.length === 0 ? (
          <EmptyState title="You’re not on any active project" className="py-6" />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {myProjects.map((p) => (
              <ProjectNextActionCard key={p.id} projectId={p.id} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeading icon={<CalendarClock className="size-3.5" />}>Deadlines · next 30 days</SectionHeading>
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

export function ProjectNextActionCard({ projectId }: { projectId: string }) {
  const { data } = useWorkspace();
  const people = useProfiles();
  const p = data.projects.find((x) => x.id === projectId)!;
  const prog = projectProgress(p.id, data.tasks);
  const status = optionFor(PROJECT_STATUSES, p.status)!;
  return (
    <Link href={`/projects/${p.id}`} className="group flex flex-col rounded-lg px-3.5 py-3 shadow-[0_0_0_1px_var(--border)] transition-colors hover:bg-hover">
      <div className="flex items-center gap-2">
        <span className="text-[16px]">{p.icon}</span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{p.name}</span>
        <StatusTag color={status.color}>{status.label}</StatusTag>
      </div>
      <div className={cn("mt-2 flex items-start gap-1.5 text-[13px]", p.next_action ? "text-fg" : "text-danger")}>
        <ArrowRight className="mt-[3px] size-3.5 shrink-0 text-fg-3" />
        <span className="line-clamp-2">{p.next_action ?? "No next action set"}</span>
      </div>
      <div className="mt-auto flex items-center gap-2 pt-3">
        <Avatar profile={people.get(p.lead_id)} size={18} />
        {p.deadline && <span className="text-[12px] text-fg-2">{formatDay(p.deadline)}</span>}
        {prog.total > 0 && (
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-fg-3 tabular">
            <ProgressBar value={prog.ratio} className="w-14" tone={prog.ratio === 1 ? "green" : "default"} />
            {prog.done}/{prog.total}
          </span>
        )}
      </div>
    </Link>
  );
}
