"use client";

import { useMemo } from "react";
import { History } from "lucide-react";
import { useWorkspace } from "@/directions/d2/lib/store";
import { isActiveProject, sortProjects, workload } from "@/directions/d2/lib/selectors";
import { MEMBER_TONE } from "@/directions/d2/lib/constants";
import { cn, firstName } from "@/directions/d2/lib/utils";
import { Page, PageTitle } from "@/directions/d2/components/shell/page";
import { Avatar } from "@/directions/d2/components/ui/avatar";
import { Card, Chip, Fold, MUTED } from "@/directions/d2/components/ui/chunk";
import { ActivityFeed } from "@/directions/d2/components/activity-feed";
import { ProjectCard } from "@/directions/d2/components/projects/project-card";

/** The studio at a glance: one card per person, one per project, history folded away. */
export function StudioView() {
  const { data } = useWorkspace();
  const load = useMemo(() => workload(data), [data]);
  const active = useMemo(() => sortProjects(data.projects.filter(isActiveProject)), [data.projects]);

  return (
    <Page crumbs={[{ label: "Home", href: "/" }, { label: "The studio" }]}>
      <PageTitle title={<>The<br />studio</>} description="Who’s doing what, and which projects are moving." />

      <h2 className="mb-4 text-[22px] font-medium tracking-[-0.02em]">People</h2>
      <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {load.map((l) => {
          const tone = MEMBER_TONE[l.profile.color] ?? "cream";
          return (
            <Card key={l.profile.id} tone={tone} href={`/projects/tasks?filter=member:${l.profile.id}`} className="min-h-[200px]">
              <div className="flex items-center gap-3">
                <Avatar profile={l.profile} size={48} className="bg-[#fffdf8]! text-on-chunk!" />
                <div className="min-w-0">
                  <div className="truncate text-[17px] font-medium">{firstName(l.profile.full_name)}</div>
                  <div className={cn("truncate text-[12.5px]", MUTED[tone])}>{l.profile.role_title ?? "Team"}</div>
                </div>
              </div>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-[48px] font-medium leading-none tracking-[-0.04em] tabular">{l.open}</span>
                <span className="text-[14px]">open tasks</span>
              </div>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                {l.inProgress > 0 && <Chip tone={tone}>{l.inProgress} doing</Chip>}
                {l.dueThisWeek > 0 && <Chip tone={tone}>{l.dueThisWeek} this week</Chip>}
                {l.overdue > 0 && <Chip className="bg-[#151515]! text-[#f7f3ea]">{l.overdue} late</Chip>}
                {l.blocked > 0 && <Chip className="bg-[#151515]! text-[#f7f3ea]">{l.blocked} stuck</Chip>}
                {l.open === 0 && <Chip tone={tone}>All clear</Chip>}
              </div>
            </Card>
          );
        })}
      </div>

      <h2 className="mb-4 mt-12 text-[22px] font-medium tracking-[-0.02em]">Projects in motion · {active.length}</h2>
      <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>

      <Fold className="mt-12" icon={<History />} title="What happened lately" summary="The last 15 changes across the studio">
        <ActivityFeed entries={data.activity_log} limit={15} />
      </Fold>
    </Page>
  );
}
