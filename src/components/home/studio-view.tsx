"use client";

import Link from "next/link";
import { Activity, CalendarClock, FolderKanban, Users } from "lucide-react";
import { addDaysISO, formatDay } from "@/lib/utils";
import { EmptyState, SectionHeading } from "@/components/ui/misc";
import { ActivityFeed } from "@/components/activity-feed";
import { DatedRow, Panel, PersonCard, ProjectGrid, StatTile, WorkloadLegend, WorkloadRow, relativeDue } from "./home-blocks";
import { Agenda, WeekStrip } from "./home-timeline";
import { datedItems, useStudioData, type HomeLayout } from "./home-data";

type StudioData = ReturnType<typeof useStudioData>;

export function StudioView({ layout }: { layout: HomeLayout }) {
  const d = useStudioData();
  switch (layout) {
    case "list":
      return <StudioList d={d} />;
    case "grid":
      return <StudioGrid d={d} />;
    case "agenda":
      return (
        <Agenda
          items={datedItems(d.open, d.active.filter((p) => p.deadline))}
          today={d.today}
          until={addDaysISO(d.today, 14)}
          showAssignee
          emptyTitle="Nothing dated in the next two weeks"
        />
      );
    case "week":
      return (
        <div className="space-y-10">
          <WeekStrip items={datedItems(d.open, d.active.filter((p) => p.deadline))} today={d.today} showAssignee />
          <RecentActivity d={d} />
        </div>
      );
    case "bento":
      return <StudioBento d={d} />;
    default:
      return <StudioTable d={d} />;
  }
}

const maxOpen = (d: StudioData) => Math.max(1, ...d.load.map((l) => l.open));

function Workload({ d }: { d: StudioData }) {
  const max = maxOpen(d);
  return (
    <div className="space-y-1">
      {d.load.map((l) => (
        <WorkloadRow key={l.profile.id} load={l} max={max} />
      ))}
      <WorkloadLegend />
    </div>
  );
}

function Deadlines({ d, limit }: { d: StudioData; limit?: number }) {
  if (!d.deadlines.length) return <EmptyState title="No deadlines in the next two weeks" className="py-6" />;
  return (
    <>
      {d.deadlines.slice(0, limit).map((p) => (
        <Link key={p.id} href={`/projects/${p.id}`} className="flex h-9 items-center gap-3 rounded-md px-2 hover:bg-hover">
          <span className="w-20 shrink-0 text-[13px] text-fg-2 tabular">{formatDay(p.deadline)}</span>
          <span>{p.icon}</span>
          <span className="min-w-0 flex-1 truncate text-[14px]">{p.name}</span>
          <span className="text-[12px] text-fg-3">{relativeDue(p.deadline!)}</span>
        </Link>
      ))}
    </>
  );
}

function RecentActivity({ d, limit = 10 }: { d: StudioData; limit?: number }) {
  return (
    <section>
      <SectionHeading icon={<Activity className="size-3.5" />}>Recent activity</SectionHeading>
      <ActivityFeed entries={d.activity} limit={limit} />
    </section>
  );
}

/** The original classic layout. */
function StudioTable({ d }: { d: StudioData }) {
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-2">
        <section>
          <SectionHeading icon={<Users className="size-3.5" />}>Team workload</SectionHeading>
          <Workload d={d} />
        </section>
        <section>
          <SectionHeading icon={<CalendarClock className="size-3.5" />}>Upcoming deadlines · 14 days</SectionHeading>
          <Deadlines d={d} />
        </section>
      </div>
      <RecentActivity d={d} />
    </div>
  );
}

/** One column: what's late across the team, what's due, then who's carrying it. */
function StudioList({ d }: { d: StudioData }) {
  const soon = datedItems(d.upcomingTasks, d.deadlines);
  return (
    <div className="max-w-[760px] space-y-8">
      {d.overdue.length > 0 && (
        <section>
          <SectionHeading className="!text-danger">
            Overdue across the studio <span className="font-normal">{d.overdue.length}</span>
          </SectionHeading>
          {datedItems(d.overdue, []).map((i) => (
            <DatedRow key={i.kind === "task" ? i.task.id : i.project.id} item={i} showAssignee />
          ))}
        </section>
      )}
      <section>
        <SectionHeading icon={<CalendarClock className="size-3.5" />}>Due in the next 14 days</SectionHeading>
        {soon.length ? (
          soon.map((i) => <DatedRow key={i.kind === "task" ? i.task.id : i.project.id} item={i} showDate showAssignee />)
        ) : (
          <EmptyState title="Nothing due in the next two weeks" className="py-6" />
        )}
      </section>
      <section>
        <SectionHeading icon={<Users className="size-3.5" />}>Team workload</SectionHeading>
        <Workload d={d} />
      </section>
      <RecentActivity d={d} />
    </div>
  );
}

/** People as cards, then active projects as cards. */
function StudioGrid({ d }: { d: StudioData }) {
  const max = maxOpen(d);
  return (
    <div className="space-y-10">
      <section>
        <SectionHeading icon={<Users className="size-3.5" />}>Team workload</SectionHeading>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {d.load.map((l) => (
            <PersonCard key={l.profile.id} load={l} max={max} />
          ))}
        </div>
      </section>
      <section>
        <SectionHeading
          icon={<FolderKanban className="size-3.5" />}
          action={
            <Link href="/projects" className="rounded px-1 hover:bg-hover">
              All projects
            </Link>
          }
        >
          Active projects <span className="font-normal text-fg-3">{d.active.length}</span>
        </SectionHeading>
        <ProjectGrid projects={d.active} empty={<EmptyState title="No active projects" className="py-6" />} />
      </section>
    </div>
  );
}

/** Studio health numbers, then workload / deadlines / activity widgets. */
function StudioBento({ d }: { d: StudioData }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile label="Open tasks" value={d.open.length} href="/projects/tasks?filter=all" />
      <StatTile label="Overdue" value={d.overdue.length} tone={d.overdue.length ? "danger" : undefined} href="/projects/tasks?filter=overdue" />
      <StatTile label="Active projects" value={d.active.length} href="/projects" />
      <StatTile
        label="Blocked projects"
        value={d.blocked.length}
        tone={d.blocked.length ? "danger" : undefined}
        hint={d.blocked[0] ? d.blocked.map((p) => p.name).join(", ") : "None"}
        href={d.blocked.length === 1 ? `/projects/${d.blocked[0]!.id}` : "/projects"}
      />
      <Panel title="Team workload" icon={<Users className="size-3.5" />} className="col-span-2 lg:row-span-2">
        <Workload d={d} />
      </Panel>
      <Panel title="Deadlines · 14 days" icon={<CalendarClock className="size-3.5" />} className="col-span-2">
        <Deadlines d={d} limit={5} />
      </Panel>
      <Panel title="Recent activity" icon={<Activity className="size-3.5" />} className="col-span-2">
        <ActivityFeed entries={d.activity} limit={5} />
      </Panel>
    </div>
  );
}
