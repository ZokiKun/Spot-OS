"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Plus, Search, X } from "lucide-react";
import type { Project, ProjectStatus } from "@/directions/d3/lib/types";
import { useWorkspace } from "@/directions/d3/lib/store";
import { isOpen, sortProjects } from "@/directions/d3/lib/selectors";
import { cn } from "@/directions/d3/lib/utils";
import { Page, PageTitle } from "@/directions/d3/components/shell/page";
import { ViewTabs } from "@/directions/d3/components/ui/tabs";
import { Button } from "@/directions/d3/components/ui/button";
import { Card, EmptyState, ProgressBar, SectionHeading } from "@/directions/d3/components/ui/misc";
import { RailCard } from "@/directions/d3/components/home/rail-cards";
import { NAV_ART } from "@/directions/d3/components/shell/icons";
import { ProjectCard, PROJECT_STATE_LABEL } from "./project-card";
import { NewProjectDialog } from "./new-project-dialog";

type Bucket = "now" | "next" | "done";

const BUCKETS: Record<Bucket, ProjectStatus[]> = {
  now: ["blocked", "active", "review"],
  next: ["backlog"],
  done: ["completed", "archived"],
};

/**
 * Projects as three plain buckets — what we're doing now, what's next, what's done —
 * each project a single readable card. Editing lives on the project page.
 */
export function ProjectsView() {
  const { data } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const bucket = (params.get("show") as Bucket) || "now";
  const [query, setQuery] = useState("");
  const [newOpen, setNewOpen] = useState(false);

  const counts = useMemo(
    () => Object.fromEntries((Object.keys(BUCKETS) as Bucket[]).map((b) => [b, data.projects.filter((p) => BUCKETS[b].includes(p.status)).length])) as Record<Bucket, number>,
    [data.projects],
  );

  const projects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortProjects(
      data.projects.filter(
        (p) => (q ? true : BUCKETS[bucket].includes(p.status)) && (!q || [p.name, p.client, p.description, p.next_action].some((f) => f?.toLowerCase().includes(q))),
      ),
    );
  }, [data.projects, bucket, query]);

  // Inside "now", show the stuck ones first under their own heading.
  const sections: { title?: string; list: Project[] }[] =
    bucket === "now" && !query
      ? [
          { title: "Needs help", list: projects.filter((p) => p.status === "blocked") },
          { title: "In progress", list: projects.filter((p) => p.status === "active") },
          { title: "In review", list: projects.filter((p) => p.status === "review") },
        ].filter((s) => s.list.length)
      : [{ list: projects }];

  return (
    <Page
      crumbs={[{ label: "Projects" }]}
      aside={
        <>
          <StudioGlance />
          <TasksShortcut />
        </>
      }
    >
      <div className="flex items-start justify-between gap-4">
        <PageTitle title="Projects" description="Every studio project, and the one next step for each." />
        <Button variant="primary" size="md" className="mt-1 max-sm:hidden" onClick={() => setNewOpen(true)}>
          <Plus className="size-4" strokeWidth={3.5} /> New project
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <ViewTabs<Bucket>
          value={bucket}
          onChange={(v) => {
            setQuery("");
            router.replace(v === "now" ? pathname : `${pathname}?show=${v}`, { scroll: false });
          }}
          items={[
            { value: "now", label: "Now", count: counts.now },
            { value: "next", label: "Up next", count: counts.next },
            { value: "done", label: "Done", count: counts.done },
          ]}
        />
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border-2 border-line bg-input px-3 focus-within:border-blue sm:max-w-56">
          <Search className="size-4 shrink-0 text-fg-3" strokeWidth={3} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a project"
            className="min-w-0 flex-1 bg-transparent text-[14.5px] font-bold outline-none placeholder:font-semibold placeholder:text-fg-3"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="text-fg-3 hover:text-fg">
              <X className="size-4" strokeWidth={3} />
            </button>
          )}
        </label>
      </div>

      {projects.length === 0 ? (
        <Card>
          <EmptyState
            mood="sleepy"
            title={query ? "No project matches that" : bucket === "next" ? "Nothing lined up yet" : bucket === "done" ? "Nothing finished yet" : "No projects in progress"}
            description={query ? "Try another word." : "Start one — it only needs a name."}
            action={
              !query && (
                <Button variant="primary" size="md" onClick={() => setNewOpen(true)}>
                  New project
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {sections.map((s, i) => (
            <section key={s.title ?? i}>
              {s.title && sections.length > 1 && (
                <SectionHeading size="md" className={cn(s.title === "Needs help" && "[&_h2]:text-red")}>
                  {s.title}
                </SectionHeading>
              )}
              <div className="space-y-3">
                {s.list.map((p) => (
                  <ProjectCard key={p.id} project={p} showState={!!query || bucket === "done"} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Button variant="primary" size="lg" className="mt-8 w-full sm:hidden" onClick={() => setNewOpen(true)}>
        <Plus className="size-4" strokeWidth={3.5} /> New project
      </Button>
      <NewProjectDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </Page>
  );
}

/** How the studio's projects are spread across states — one bar per state. */
function StudioGlance() {
  const { data } = useWorkspace();
  const rows: { status: ProjectStatus; tone: "red" | "blue" | "purple" | "default" }[] = [
    { status: "blocked", tone: "red" },
    { status: "active", tone: "blue" },
    { status: "review", tone: "purple" },
    { status: "backlog", tone: "default" },
  ];
  const max = Math.max(1, ...rows.map((r) => data.projects.filter((p) => p.status === r.status).length));
  return (
    <RailCard title="At a glance">
      <div className="space-y-3 pt-1">
        {rows.map((r) => {
          const n = data.projects.filter((p) => p.status === r.status).length;
          return (
            <div key={r.status}>
              <div className="mb-1 flex justify-between text-[14px] font-extrabold">
                <span className={cn(r.status === "blocked" && n > 0 && "text-red")}>{PROJECT_STATE_LABEL[r.status]}</span>
                <span className="text-fg-2 tabular">{n}</span>
              </div>
              <ProgressBar value={n / max} tone={r.tone === "default" ? "default" : r.tone} size="sm" className={cn(r.tone === "default" && "[&>div]:bg-fg-3")} />
            </div>
          );
        })}
      </div>
    </RailCard>
  );
}

function TasksShortcut() {
  const { data } = useWorkspace();
  const open = data.tasks.filter(isOpen).length;
  return (
    <Link href="/projects/tasks" className="card-press flex items-center gap-4 rounded-2xl bg-bg px-5 py-4">
      <NAV_ART.reviews size={40} />
      <div className="min-w-0 flex-1">
        <div className="text-[16px] font-extrabold">All tasks</div>
        <div className="text-[13.5px] font-semibold text-fg-2">{open} open across every project</div>
      </div>
      <ChevronRight className="size-5 text-fg-3" strokeWidth={3} />
    </Link>
  );
}
