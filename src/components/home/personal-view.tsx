"use client";

import Link from "next/link";
import { CalendarClock, CircleCheck, FolderKanban, Target } from "lucide-react";
import type { Task } from "@/lib/types";
import { PROJECT_STATUSES, optionFor } from "@/lib/constants";
import { projectProgress } from "@/lib/selectors";
import { useWorkspace } from "@/lib/store";
import { addDaysISO, cn, daysUntil, formatDay } from "@/lib/utils";
import { EmptyState, ProgressBar, SectionHeading } from "@/components/ui/misc";
import { StatusTag } from "@/components/ui/tag";
import { TaskList } from "@/components/tasks/task-table";
import { ProjectTable } from "@/components/projects/project-views";
import { DatedRow, GroupLabel, Panel, PanelLink, ProjectGrid, StatTile, relativeDue } from "./home-blocks";
import { Agenda, WeekStrip } from "./home-timeline";
import { datedItems, usePersonalData, type HomeLayout } from "./home-data";

type PersonalData = ReturnType<typeof usePersonalData>;

export function PersonalView({ layout }: { layout: HomeLayout }) {
  const d = usePersonalData();
  switch (layout) {
    case "list":
      return <PersonalList d={d} />;
    case "grid":
      return <PersonalGrid d={d} />;
    case "agenda":
      return (
        <Agenda
          items={datedItems(d.myOpen, d.projects.filter((p) => p.deadline))}
          today={d.today}
          until={addDaysISO(d.today, 30)}
          emptyTitle="Nothing dated in the next 30 days"
        />
      );
    case "week":
      return (
        <div className="space-y-8">
          <WeekStrip items={datedItems(d.myOpen, d.projects.filter((p) => p.deadline))} today={d.today} />
          <ProjectChips d={d} />
        </div>
      );
    case "bento":
      return <PersonalBento d={d} />;
    default:
      return <PersonalTable d={d} />;
  }
}

const projectsLink = (
  <Link href="/projects" className="rounded px-1 hover:bg-hover">
    All projects
  </Link>
);
const tasksLink = (
  <Link href="/projects/tasks?filter=mine" className="rounded px-1 hover:bg-hover">
    All my tasks
  </Link>
);
const noProjects = <EmptyState title="You’re not on any active project" description="Projects you lead, direct or have tasks on show up here." className="py-6" />;
const clearWeek = <EmptyState title="You’re clear for the week" description="No overdue, due-today or upcoming tasks." className="py-6" />;

/** The original classic layout: projects table, then tasks and deadlines side by side. */
function PersonalTable({ d }: { d: PersonalData }) {
  return (
    <div className="space-y-10">
      <section>
        <SectionHeading icon={<FolderKanban className="size-3.5" />} action={projectsLink}>
          My active projects <span className="font-normal text-fg-3">{d.projects.length}</span>
        </SectionHeading>
        {d.projects.length === 0 ? noProjects : <ProjectTable projects={d.projects} />}
      </section>

      <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-2">
        <section>
          <SectionHeading icon={<CircleCheck className="size-3.5" />} action={tasksLink}>
            My tasks
          </SectionHeading>
          <TaskGroups d={d} />
        </section>

        <section>
          <SectionHeading icon={<CalendarClock className="size-3.5" />}>My deadlines · next 30 days</SectionHeading>
          <DeadlineRows d={d} />
        </section>
      </div>
    </div>
  );
}

function TaskGroups({ d, limit = 6 }: { d: PersonalData; limit?: number }) {
  if (d.overdue.length + d.dueToday.length + d.upcoming.length === 0) return clearWeek;
  return (
    <div className="space-y-3">
      {d.overdue.length > 0 && <Group label="Overdue" tone="danger" tasks={d.overdue} limit={limit} />}
      {d.dueToday.length > 0 && <Group label="Today" tasks={d.dueToday} limit={limit} />}
      {d.upcoming.length > 0 && <Group label="Next 7 days" tasks={d.upcoming} limit={limit} />}
    </div>
  );
}

function Group({ label, tasks, tone, limit }: { label: string; tasks: Task[]; tone?: "danger"; limit?: number }) {
  return (
    <div>
      <GroupLabel label={label} count={tasks.length} tone={tone} />
      <TaskList tasks={tasks} showAssignee={false} limit={limit} />
    </div>
  );
}

function DeadlineRows({ d, limit }: { d: PersonalData; limit?: number }) {
  if (d.deadlines.length === 0) return <EmptyState title="No deadlines in the next 30 days" className="py-6" />;
  return (
    <div>
      {d.deadlines.slice(0, limit).map((p) => {
        const days = daysUntil(p.deadline)!;
        return (
          <Link key={p.id} href={`/projects/${p.id}`} className="flex h-9 items-center gap-3 rounded-md px-2 hover:bg-hover">
            <span className={cn("w-20 shrink-0 text-[13px] tabular", days <= 3 ? "font-medium text-danger" : "text-fg-2")}>{formatDay(p.deadline)}</span>
            <span>{p.icon}</span>
            <span className="min-w-0 flex-1 truncate text-[14px]">{p.name}</span>
            <span className="text-[12px] text-fg-3">{relativeDue(p.deadline!)}</span>
          </Link>
        );
      })}
    </div>
  );
}

/** One prioritised stream: what's late, what's today, what's this week — projects folded below. */
function PersonalList({ d }: { d: PersonalData }) {
  const weekEnd = addDaysISO(d.today, 7);
  const deadlinesToday = d.deadlines.filter((p) => p.deadline === d.today);
  const deadlinesWeek = d.deadlines.filter((p) => p.deadline! > d.today && p.deadline! <= weekEnd);
  const groups = [
    { label: "Overdue", tone: "danger" as const, items: datedItems(d.overdue, []) },
    { label: "Today", items: datedItems(d.dueToday, deadlinesToday) },
    { label: "Next 7 days", items: datedItems(d.upcoming, deadlinesWeek), showDate: true },
  ].filter((g) => g.items.length);

  return (
    <div className="max-w-[760px] space-y-6">
      {groups.length === 0
        ? clearWeek
        : groups.map((g) => (
            <section key={g.label}>
              <GroupLabel label={g.label} count={g.items.length} tone={g.tone} />
              {g.items.map((i) => (
                <DatedRow key={i.kind === "task" ? i.task.id : i.project.id} item={i} showDate={g.showDate} />
              ))}
            </section>
          ))}

      <details className="group/projects border-t border-line pt-4" open={groups.length === 0}>
        <summary className="flex h-7 cursor-pointer list-none items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-fg-2 hover:bg-hover [&::-webkit-details-marker]:hidden">
          <FolderKanban className="size-3.5" /> Your projects <span className="font-normal text-fg-3">{d.projects.length}</span>
          <span className="ml-auto text-fg-3 group-open/projects:hidden">Show</span>
          <span className="ml-auto hidden text-fg-3 group-open/projects:inline">Hide</span>
        </summary>
        <div className="mt-1">{d.projects.length ? d.projects.map((p) => <ProjectLine key={p.id} id={p.id} />) : noProjects}</div>
      </details>
    </div>
  );
}

function ProjectLine({ id }: { id: string }) {
  const { data } = useWorkspace();
  const p = data.projects.find((x) => x.id === id)!;
  const prog = projectProgress(p.id, data.tasks);
  const status = optionFor(PROJECT_STATUSES, p.status)!;
  return (
    <Link href={`/projects/${p.id}`} className="flex h-9 items-center gap-2.5 rounded-md px-2 hover:bg-hover">
      <span className="w-5 shrink-0 text-center">{p.icon ?? "📁"}</span>
      <span className="min-w-0 flex-1 truncate text-[14px]">{p.name}</span>
      <StatusTag color={status.color}>{status.label}</StatusTag>
      <span className="hidden w-24 items-center gap-1.5 text-[12px] text-fg-3 tabular sm:flex">
        <ProgressBar value={prog.ratio} className="flex-1" />
        {prog.done}/{prog.total}
      </span>
      <span className="w-16 shrink-0 text-right text-[12px] text-fg-2 tabular">{p.deadline ? formatDay(p.deadline) : "—"}</span>
    </Link>
  );
}

/** Projects as cards, tasks as three short columns. */
function PersonalGrid({ d }: { d: PersonalData }) {
  const cols = [
    { label: "Overdue", tasks: d.overdue, tone: "danger" as const, empty: "Nothing overdue" },
    { label: "Today", tasks: d.dueToday, empty: "Nothing due today" },
    { label: "Next 7 days", tasks: d.upcoming, empty: "Nothing this week" },
  ];
  return (
    <div className="space-y-10">
      <section>
        <SectionHeading icon={<FolderKanban className="size-3.5" />} action={projectsLink}>
          My active projects <span className="font-normal text-fg-3">{d.projects.length}</span>
        </SectionHeading>
        <ProjectGrid projects={d.projects} empty={noProjects} />
      </section>
      <section>
        <SectionHeading icon={<CircleCheck className="size-3.5" />} action={tasksLink}>
          My tasks
        </SectionHeading>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {cols.map((c) => (
            <Panel
              key={c.label}
              title={
                <span className={cn(c.tone === "danger" && c.tasks.length > 0 && "text-danger")}>
                  {c.label} <span className="font-normal text-fg-3">{c.tasks.length}</span>
                </span>
              }
            >
              {c.tasks.length ? <TaskList tasks={c.tasks} showAssignee={false} limit={5} /> : <div className="px-2 py-3 text-[13px] text-fg-3">{c.empty}</div>}
            </Panel>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Pill row of my projects, used under the week strip. */
function ProjectChips({ d }: { d: PersonalData }) {
  return (
    <section>
      <SectionHeading icon={<FolderKanban className="size-3.5" />} action={projectsLink}>
        Your projects <span className="font-normal text-fg-3">{d.projects.length}</span>
      </SectionHeading>
      {d.projects.length ? (
        <div className="flex flex-wrap gap-1.5">
          {d.projects.map((p) => {
            const status = optionFor(PROJECT_STATUSES, p.status)!;
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex h-8 max-w-full items-center gap-2 rounded-md px-2.5 text-[13px] shadow-[inset_0_0_0_1px_var(--border)] hover:bg-hover"
              >
                <span>{p.icon ?? "📁"}</span>
                <span className="truncate font-medium">{p.name}</span>
                <span className={`dot-${status.color} size-2 shrink-0 rounded-full`} title={status.label} />
              </Link>
            );
          })}
        </div>
      ) : (
        noProjects
      )}
    </section>
  );
}

/** Numbers up top, then focus / deadlines / project progress widgets. */
function PersonalBento({ d }: { d: PersonalData }) {
  const next = d.deadlines[0];
  const focus = [...d.overdue, ...d.dueToday];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile label="Overdue" value={d.overdue.length} tone={d.overdue.length ? "danger" : undefined} href="/projects/tasks?filter=mine" />
      <StatTile label="Due today" value={d.dueToday.length} href="/projects/tasks?filter=mine" />
      <StatTile label="Active projects" value={d.projects.length} hint={`${d.myOpen.length} open tasks`} href="/projects" />
      <StatTile
        label="Next deadline"
        value={next ? relativeDue(next.deadline!) : "—"}
        hint={next ? `${next.icon ?? ""} ${next.name}` : "Nothing in 30 days"}
        href={next ? `/projects/${next.id}` : undefined}
      />

      <Panel title="Focus today" icon={<Target className="size-3.5" />} action={<PanelLink href="/projects/tasks?filter=mine">All my tasks</PanelLink>} className="col-span-2 lg:row-span-2">
        {focus.length ? (
          <>
            {datedItems(focus, []).slice(0, 8).map((i) => (
              <DatedRow key={i.kind === "task" ? i.task.id : i.project.id} item={i} />
            ))}
            {focus.length > 8 && <div className="px-2 py-1 text-[12px] text-fg-3">+{focus.length - 8} more</div>}
          </>
        ) : (
          <EmptyState title="Nothing overdue or due today" description={d.upcoming.length ? `${d.upcoming.length} coming up this week.` : undefined} className="py-6" />
        )}
      </Panel>

      <Panel title="Project progress" icon={<FolderKanban className="size-3.5" />} action={<PanelLink href="/projects">All projects</PanelLink>} className="col-span-2">
        {d.projects.length ? (
          <div className="space-y-0.5">
            {d.projects.slice(0, 5).map((p) => (
              <ProgressLine key={p.id} id={p.id} />
            ))}
          </div>
        ) : (
          noProjects
        )}
      </Panel>

      <Panel title="Deadlines · 30 days" icon={<CalendarClock className="size-3.5" />} className="col-span-2">
        <DeadlineRows d={d} limit={4} />
      </Panel>

      <Panel title="Next 7 days" icon={<CircleCheck className="size-3.5" />} className="col-span-2 lg:col-span-4">
        {d.upcoming.length ? <TaskList tasks={d.upcoming} showAssignee={false} limit={6} /> : <div className="px-2 py-3 text-[13px] text-fg-3">Nothing scheduled this week</div>}
      </Panel>
    </div>
  );
}

function ProgressLine({ id }: { id: string }) {
  const { data } = useWorkspace();
  const p = data.projects.find((x) => x.id === id)!;
  const prog = projectProgress(p.id, data.tasks);
  return (
    <Link href={`/projects/${p.id}`} className="flex h-8 items-center gap-2.5 rounded-md px-2 hover:bg-hover">
      <span className="w-5 shrink-0 text-center">{p.icon ?? "📁"}</span>
      <span className="min-w-0 flex-1 truncate text-[13px]">{p.name}</span>
      <div className="w-20 shrink-0 sm:w-28">
        <ProgressBar value={prog.ratio} tone={prog.total && prog.ratio === 1 ? "green" : "default"} />
      </div>
      <span className="w-9 shrink-0 text-right text-[12px] text-fg-3 tabular">{prog.total ? `${Math.round(prog.ratio * 100)}%` : "—"}</span>
    </Link>
  );
}
