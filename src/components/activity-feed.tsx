"use client";

import Link from "next/link";
import type { ActivityEntry, Project } from "@/lib/types";
import { PROJECT_STATUSES, TASK_STATUSES, optionFor } from "@/lib/constants";
import { useProfiles, useWorkspace } from "@/lib/store";
import { cn, formatDay, timeAgo, firstName } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/misc";

const INVOICE_STATUS: Record<string, string> = { not_sent: "Not sent", sent: "Sent", cleared: "Cleared" };

function describe(e: ActivityEntry, names: (id: string) => string, projects: Project[]) {
  const meta = e.meta as Record<string, string | null>;
  const statusLabel = (v: string) => {
    if (e.entity_type === "project") return optionFor(PROJECT_STATUSES, v as never)?.label ?? v;
    if (e.entity_type === "invoice") return INVOICE_STATUS[v] ?? v;
    // A project's own status name, if the task moved into one.
    const custom = meta.to_custom ? projects.find((p) => p.id === e.project_id)?.task_statuses?.find((s) => s.id === meta.to_custom) : null;
    return custom?.label ?? optionFor(TASK_STATUSES, v as never)?.label ?? v;
  };
  const noun = {
    project: "project",
    task: "task",
    calendar_note: "a note on",
    library_item: "to Library",
    review: "review",
    kb_page: "Spot Base page",
    invoice: "invoice",
    milestone: "milestone",
    attachment: meta.link ? "link" : "file",
  }[e.entity_type];
  switch (e.action) {
    case "created":
      return e.entity_type === "calendar_note" ? `added a note for ${formatDay(meta.date ?? "")}` : `created ${noun}`;
    case "completed":
      return `completed ${noun}`;
    case "status_changed":
      return `moved ${noun} to ${statusLabel(meta.to ?? "")}`;
    case "assigned":
      return `assigned ${noun} to ${names(meta.to ?? "")}`;
    case "added":
      return e.entity_type === "attachment" ? `added ${noun}` : "added";
    case "deleted":
      return `deleted ${noun}`;
    case "next_action_set":
      return "set the next action on";
    case "edited":
      return `edited ${noun}`;
    default:
      return e.action.replace(/_/g, " ");
  }
}

/** Where an entry links to; null when the thing is gone (deleted). */
function hrefFor(e: ActivityEntry): string | null {
  if (e.action === "deleted") return null;
  const meta = e.meta as Record<string, string | null>;
  switch (e.entity_type) {
    case "project":
      return `/projects/${e.entity_id}`;
    case "task":
      return e.project_id ? `/projects/${e.project_id}?tab=tasks&task=${e.entity_id}` : `/projects/tasks?task=${e.entity_id}`;
    case "calendar_note":
      return `/calendar?date=${meta.date ?? ""}&note=${e.entity_id}`;
    case "library_item":
      return "/library";
    case "review":
      return "/reviews";
    case "kb_page":
      return "/spot-base";
    case "invoice":
      return e.project_id ? `/projects/${e.project_id}?tab=invoices` : null;
    case "milestone":
      return e.project_id ? `/projects/${e.project_id}?tab=tasks` : null;
    case "attachment":
      if (meta.task_id) return e.project_id ? `/projects/${e.project_id}?tab=tasks&task=${meta.task_id}` : `/projects/tasks?task=${meta.task_id}`;
      if (e.project_id) return `/projects/${e.project_id}?tab=files`;
      if (meta.note_id) return `/calendar?note=${meta.note_id}`;
      if (meta.review_id) return `/reviews/${meta.review_id}`;
      return meta.kb_page_id ? "/spot-base" : null;
  }
}

export function ActivityFeed({ entries, limit = 12, compact = false }: { entries: ActivityEntry[]; limit?: number; compact?: boolean }) {
  const people = useProfiles();
  const { data } = useWorkspace();
  const names = (id: string) => firstName(people.get(id)?.full_name) || "someone";
  if (!entries.length) return <EmptyState title="No activity yet" description="Changes to projects, tasks, invoices, files and notes show up here." />;
  const sorted = entries.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
  return (
    <ol className="relative">
      {sorted.map((e) => {
        const actor = people.get(e.actor_id);
        const project = e.entity_type !== "project" && e.project_id ? data.projects.find((p) => p.id === e.project_id) : undefined;
        // Deleted things keep their project's name in meta (the link to it is gone).
        const goneProject = !project && e.action === "deleted" ? ((e.meta as { project?: string | null }).project ?? null) : null;
        const href = hrefFor(e);
        const label = e.entity_type === "review" ? "review" : e.entity_label;
        return (
          <li key={e.id} className="flex gap-2.5 rounded-md px-2 py-1.5 hover:bg-hover">
            <Avatar profile={actor} size={20} className="mt-px" />
            <div className="min-w-0 flex-1 text-[14px] leading-[22px]">
              <span className="font-medium">{actor ? firstName(actor.full_name) : "Someone"}</span>{" "}
              <span className="text-fg-2">{describe(e, names, data.projects)}</span>{" "}
              {href ? (
                <Link href={href} className="font-medium underline decoration-fg-3 underline-offset-2 hover:decoration-fg">
                  {label}
                </Link>
              ) : (
                <span className={cn("font-medium", e.action === "deleted" && "text-fg-2 line-through decoration-fg-3")}>{label}</span>
              )}
              {project && !compact && <span className="text-fg-3"> in {project.name}</span>}
              {goneProject && !compact && <span className="text-fg-3"> in {goneProject}</span>}
            </div>
            <span className="shrink-0 pt-0.5 text-[12px] text-fg-3">{timeAgo(e.created_at)}</span>
          </li>
        );
      })}
    </ol>
  );
}
