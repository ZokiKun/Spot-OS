"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "@/directions/d3/lib/store";
import { attentionItems, isActiveProject, isDueToday, isOverdue, isUpcoming, sortProjects, sortTasks } from "@/directions/d3/lib/selectors";
import { firstName, formatLongDate, greeting, plural, todayISO } from "@/directions/d3/lib/utils";
import { Page } from "@/directions/d3/components/shell/page";
import { Banner, bannerButton } from "@/directions/d3/components/ui/banner";
import { Mascot } from "@/directions/d3/components/ui/mascot";
import { ActionLink, Card, EmptyState, SectionHeading } from "@/directions/d3/components/ui/misc";
import { TaskList } from "@/directions/d3/components/tasks/task-table";
import { ProjectCard } from "@/directions/d3/components/projects/project-card";
import { Attention } from "./attention";
import { ComingUpCard, TeamCard, WeekCard } from "./rail-cards";

/**
 * Home = "what should I do now?". One banner that says how things stand in a sentence,
 * then three small chunks: today's focus, what needs a nudge, and your projects.
 * Studio-wide numbers live on the Studio page.
 */
export function HomeView() {
  const { data, me } = useWorkspace();
  const meId = me?.id ?? null;
  const today = todayISO();
  const router = useRouter();
  const legacyView = useSearchParams().get("view");
  useEffect(() => {
    // Old links (/?view=studio|finance|performance) now live on the Studio page.
    const tab = { studio: "", finance: "?tab=money", performance: "?tab=progress" }[legacyView ?? ""];
    if (tab !== undefined) router.replace(`/studio${tab}`);
  }, [legacyView, router]);

  const mine = useMemo(() => data.tasks.filter((t) => t.assignee_id === meId), [data.tasks, meId]);
  const overdue = sortTasks(mine.filter((t) => isOverdue(t, today)));
  const dueToday = sortTasks(mine.filter((t) => isDueToday(t, today)));
  const upcoming = sortTasks(mine.filter((t) => isUpcoming(t, today, 7)));
  const focus = [...overdue, ...dueToday];
  if (focus.length < 3) focus.push(...upcoming.slice(0, 3 - focus.length));

  // Late / due-today tasks already sit in "Today's focus", so nudges show the rest.
  const nudges = attentionItems(data, { meId, mine: true }).filter((i) => i.kind !== "overdue_task" && i.kind !== "due_today");

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

  const summary = overdue.length
    ? `${plural(overdue.length, "task is", "tasks are")} late${dueToday.length ? ` and ${dueToday.length} due today` : ""}. Let’s clear ${overdue.length + dueToday.length === 1 ? "it" : "them"} first.`
    : dueToday.length
      ? `${plural(dueToday.length, "thing")} due today. You’ve got this.`
      : upcoming.length
        ? `Nothing due today. ${plural(upcoming.length, "task")} coming up this week.`
        : "Nothing due this week. Nice and calm.";

  return (
    <Page
      crumbs={[{ label: "Home" }]}
      aside={
        <>
          <WeekCard />
          <ComingUpCard />
          <TeamCard />
        </>
      }
    >
      <Banner
        tone={overdue.length ? "orange" : "green"}
        overline={formatLongDate(today)}
        title={`${greeting()}, ${firstName(me?.full_name) || "there"}!`}
        art={<Mascot mood={overdue.length ? "think" : focus.length ? "happy" : "cheer"} size={104} float />}
        action={
          <>
            <Link href="/projects/tasks?filter=mine" className={bannerButton}>
              All my tasks
            </Link>
            <Link href={`/calendar?date=${today}`} className={bannerButton}>
              Today’s notes
            </Link>
          </>
        }
      >
        {summary}
      </Banner>

      <section className="mt-10">
        <SectionHeading action={<ActionLink href="/projects/tasks?filter=mine">See all</ActionLink>}>Today’s focus</SectionHeading>
        {focus.length ? (
          <TaskList tasks={focus.slice(0, 5)} showAssignee={false} />
        ) : (
          <Card>
            <EmptyState mood="cheer" title="You’re all clear!" description="Nothing due this week. Pick something from a project, or take a breather." />
          </Card>
        )}
        {focus.length > 5 && <p className="mt-2 px-1 text-[13px] font-bold text-fg-3">+{focus.length - 5} more in your tasks</p>}
      </section>

      <section className="mt-10">
        <SectionHeading>Needs a nudge</SectionHeading>
        <Attention items={nudges} />
      </section>

      <section className="mt-10">
        <SectionHeading action={<ActionLink href="/projects">All projects</ActionLink>}>Your projects</SectionHeading>
        {myProjects.length === 0 ? (
          <Card>
            <EmptyState mood="sleepy" title="You’re not on any active project" description="Projects you lead, direct or have tasks in show up here." />
          </Card>
        ) : (
          <div className="space-y-3">
            {myProjects.slice(0, 4).map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>
    </Page>
  );
}
