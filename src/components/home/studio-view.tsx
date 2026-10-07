"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "@/lib/store";
import { attentionItems, isActiveProject, isOverdue, workload } from "@/lib/selectors";
import { cn, plural } from "@/lib/utils";
import { Page } from "@/components/shell/page";
import { Banner } from "@/components/ui/banner";
import { ViewTabs } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Card, ProgressBar, SectionHeading } from "@/components/ui/misc";
import { NAV_ART } from "@/components/shell/icons";
import { ActivityFeed } from "@/components/activity-feed";
import { Attention } from "./attention";
import { ComingUpCard } from "./rail-cards";
import { FinanceView } from "./finance-view";
import { PerformanceView } from "./performance-view";

type Tab = "team" | "money" | "progress";

/** The whole studio in three tabs: who's doing what, the money, and how this period compares. */
export function StudioView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = (params.get("tab") as Tab) || "team";

  return (
    <Page crumbs={[{ label: "Studio" }]} aside={<ComingUpCard />}>
      <StudioBanner />
      <ViewTabs<Tab>
        className="mb-7 mt-6"
        value={tab}
        onChange={(v) => router.replace(v === "team" ? pathname : `${pathname}?tab=${v}`, { scroll: false })}
        items={[
          { value: "team", label: "Team", icon: <span className="text-[16px]">👋</span> },
          { value: "money", label: "Money", icon: <span className="text-[16px]">💰</span> },
          { value: "progress", label: "Progress", icon: <span className="text-[16px]">📈</span> },
        ]}
      />
      {tab === "team" && <TeamTab />}
      {tab === "money" && <FinanceView />}
      {tab === "progress" && <PerformanceView />}
    </Page>
  );
}

function StudioBanner() {
  const { data } = useWorkspace();
  const active = data.projects.filter(isActiveProject);
  const stuck = data.projects.filter((p) => p.status === "blocked").length;
  const late = data.tasks.filter((t) => isOverdue(t)).length;
  const workspaceName = (data.settings.find((s) => s.key === "workspace")?.value.name as string) ?? "Studio Spot";
  const trouble = stuck > 0 || late > 0;
  return (
    <Banner tone={trouble ? "blue" : "green"} overline={workspaceName} title={`${plural(active.length, "project")} on the go`} art={<NAV_ART.studio size={80} />}>
      {trouble
        ? [stuck && `${stuck} ${stuck === 1 ? "needs" : "need"} help`, late && `${plural(late, "task")} running late`].filter(Boolean).join(" · ")
        : "Everything is moving. Nothing is stuck or late."}
    </Banner>
  );
}

function TeamTab() {
  const { data, me } = useWorkspace();
  const attention = useMemo(() => attentionItems(data, { meId: null, mine: false }), [data]);
  const load = useMemo(() => workload(data), [data]);
  const maxOpen = Math.max(1, ...load.map((l) => l.open));
  return (
    <div className="space-y-10">
      <section>
        <SectionHeading>Needs a nudge</SectionHeading>
        <Attention items={attention} showAssignee initial={4} />
      </section>

      <section>
        <SectionHeading>Who’s doing what</SectionHeading>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {load.map((l) => {
            const isMe = l.profile.id === me?.id;
            const lead = data.projects.filter((p) => isActiveProject(p) && p.lead_id === l.profile.id);
            return (
              <Link
                key={l.profile.id}
                href={`/projects/tasks?filter=${isMe ? "mine" : `member:${l.profile.id}`}`}
                className="card-press flex flex-col rounded-2xl bg-bg p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar profile={l.profile} size={44} />
                  <div className="min-w-0">
                    <div className="truncate text-[16px] font-extrabold">
                      {l.profile.full_name}
                      {isMe && <span className="text-green-edge"> (you)</span>}
                    </div>
                    <div className="truncate text-[13px] font-semibold text-fg-2">{l.profile.role_title}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <ProgressBar value={l.open / maxOpen} tone={l.overdue ? "orange" : "blue"} size="sm" />
                  <span className="shrink-0 text-[13px] font-extrabold tabular">{l.open} open</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[12px]">
                  {l.overdue > 0 && <span className="label-caps rounded-md bg-red-soft px-1.5 leading-5 text-red-edge">{l.overdue} late</span>}
                  {l.blocked > 0 && <span className="label-caps rounded-md bg-orange-soft px-1.5 leading-5 text-orange-edge">{l.blocked} stuck</span>}
                  {l.dueThisWeek > 0 && <span className="label-caps rounded-md bg-blue-soft px-1.5 leading-5 text-blue-edge">{l.dueThisWeek} this week</span>}
                  {!l.overdue && !l.blocked && !l.dueThisWeek && <span className="font-bold text-fg-3">Nothing due this week</span>}
                </div>
                {lead.length > 0 && (
                  <div className={cn("mt-3 border-t-2 border-line pt-2.5 text-[13px] font-bold text-fg-2")}>
                    Leads {lead.map((p) => `${p.icon ?? ""} ${p.name}`).join(", ")}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <SectionHeading>What happened lately</SectionHeading>
        <Card className="p-2">
          <ActivityFeed entries={data.activity_log} limit={8} />
        </Card>
      </section>
    </div>
  );
}
