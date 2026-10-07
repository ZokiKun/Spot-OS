"use client";

import Link from "next/link";
import type { ActivityEntry } from "@/lib/types";
import { PROJECT_STATUSES, TASK_STATUSES, optionFor } from "@/lib/constants";
import { useProfiles, useWorkspace } from "@/lib/store";
import { formatDay, timeAgo, firstName } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/misc";

function describe(e: ActivityEntry, names: (id: string) => string) {
  const meta = e.meta as Record<string, string>;
  const statusLabel = (v: string) =>
    (e.entity_type === "project" ? optionFor(PROJECT_STATUSES, v as never) : optionFor(TASK_STATUSES, v as never))?.label ?? v;
  const noun = {
    project: "project",
    task: "task",
    calendar_note: "a note on",
    library_item: "to Library",
    review: "review",
    kb_page: "Spot Base page",
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
      return "added";
    case "next_action_set":
      return "set the next action on";
    case "edited":
      return `edited ${noun}`;
    default:
      return e.action.replace(/_/g, " ");
  }
}

function hrefFor(e: ActivityEntry) {
  switch (e.entity_type) {
    case "project":
      return `/projects/${e.entity_id}`;
    case "task":
      return e.project_id ? `/projects/${e.project_id}?tab=tasks&task=${e.entity_id}` : `/projects/tasks?task=${e.entity_id}`;
    case "calendar_note":
      return `/calendar?date=${(e.meta as { date?: string }).date ?? ""}&note=${e.entity_id}`;
    case "library_item":
      return "/library";
    case "review":
      return "/reviews";
    case "kb_page":
      return "/spot-base";
  }
}

export function ActivityFeed({ entries, limit = 12, compact = false }: { entries: ActivityEntry[]; limit?: number; compact?: boolean }) {
  const people = useProfiles();
  const { data } = useWorkspace();
  const names = (id: string) => firstName(people.get(id)?.full_name) || "someone";
  if (!entries.length) return <EmptyState mood="sleepy" title="Nothing yet" description="Changes to projects, tasks and notes show up here." className="py-6" />;
  const sorted = entries.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
  return (
    <ol className="relative">
      {sorted.map((e) => {
        const actor = people.get(e.actor_id);
        const project = e.entity_type !== "project" && e.project_id ? data.projects.find((p) => p.id === e.project_id) : undefined;
        return (
          <li key={e.id} className="flex gap-3 rounded-xl px-2 py-2 hover:bg-hover">
            <Avatar profile={actor} size={28} className="mt-px" />
            <div className="min-w-0 flex-1 text-[14px] font-semibold leading-[20px]">
              <span className="font-extrabold">{actor ? firstName(actor.full_name) : "Someone"}</span>{" "}
              <span className="text-fg-2">{describe(e, names)}</span>{" "}
              <Link href={hrefFor(e)} className="font-extrabold text-blue hover:underline">
                {e.entity_type === "review" ? "review" : e.entity_label}
              </Link>
              {project && !compact && <span className="text-fg-3"> in {project.name}</span>}
              <div className="mt-0.5 text-[12px] font-bold text-fg-3">{timeAgo(e.created_at)}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
