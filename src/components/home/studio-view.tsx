"use client";

import Link from "next/link";
import { Activity, CalendarClock, Users } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { isActiveProject, workload } from "@/lib/selectors";
import { addDaysISO, formatDay, todayISO } from "@/lib/utils";
import { EmptyState, SectionHeading } from "@/components/ui/misc";
import { Avatar } from "@/components/ui/avatar";
import { ActivityFeed } from "@/components/activity-feed";

export function StudioView() {
  const { data } = useWorkspace();
  const today = todayISO();
  const load = workload(data);
  const maxOpen = Math.max(1, ...load.map((l) => l.open));

  const upcoming = [
    ...data.projects
      .filter((p) => isActiveProject(p) && p.deadline && p.deadline >= today && p.deadline <= addDaysISO(today, 14))
      .map((p) => ({ id: p.id, date: p.deadline!, label: p.name, icon: p.icon, href: `/projects/${p.id}`, kind: "Project deadline" })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-2">
        <section>
          <SectionHeading icon={<Users className="size-3.5" />}>Team workload</SectionHeading>
          <div className="space-y-1">
            {load.map((l) => (
              <Link
                key={l.profile.id}
                href={`/projects/tasks?filter=member:${l.profile.id}`}
                className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-hover"
              >
                <Avatar profile={l.profile} size={26} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[14px] font-medium">{l.profile.full_name}</span>
                    <span className="shrink-0 text-[12px] text-fg-2 tabular">
                      {l.open} open
                      {l.overdue > 0 && <span className="text-danger"> · {l.overdue} overdue</span>}
                      {l.blocked > 0 && <span className="text-[var(--dot-orange)]"> · {l.blocked} blocked</span>}
                    </span>
                  </div>
                  <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-active" style={{ width: `${Math.max(8, (l.open / maxOpen) * 100)}%` }}>
                    <span className="h-full bg-[var(--dot-red)]" style={{ width: `${(l.overdue / Math.max(1, l.open)) * 100}%` }} />
                    <span className="h-full bg-[var(--dot-blue)]" style={{ width: `${(l.inProgress / Math.max(1, l.open)) * 100}%` }} />
                  </div>
                </div>
              </Link>
            ))}
            <div className="flex gap-4 px-2 pt-1 text-[11px] text-fg-3">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-[var(--dot-red)]" /> Overdue
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-[var(--dot-blue)]" /> In progress
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-active" /> Other open
              </span>
            </div>
          </div>
        </section>

        <section>
          <SectionHeading icon={<CalendarClock className="size-3.5" />}>Upcoming deadlines · 14 days</SectionHeading>
          {upcoming.length === 0 ? (
            <EmptyState title="No deadlines in the next two weeks" className="py-6" />
          ) : (
            upcoming.map((u) => (
              <Link key={u.id} href={u.href} className="flex h-9 items-center gap-3 rounded-md px-2 hover:bg-hover">
                <span className="w-20 shrink-0 text-[13px] text-fg-2 tabular">{formatDay(u.date)}</span>
                <span>{u.icon}</span>
                <span className="min-w-0 flex-1 truncate text-[14px]">{u.label}</span>
              </Link>
            ))
          )}
        </section>
      </div>

      <section>
        <SectionHeading icon={<Activity className="size-3.5" />}>Recent activity</SectionHeading>
        <ActivityFeed entries={data.activity_log} limit={10} />
      </section>
    </div>
  );
}
