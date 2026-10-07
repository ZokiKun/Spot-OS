"use client";

import Link from "next/link";
import type { Project, ProjectStatus } from "@/lib/types";
import { PROJECT_TYPES, optionFor } from "@/lib/constants";
import { useWorkspace } from "@/lib/store";
import { projectProgress } from "@/lib/selectors";
import { cn, daysUntil, formatDay } from "@/lib/utils";
import { IconTile, ProgressBar, type Tone } from "@/components/ui/misc";
import { StatusTag } from "@/components/ui/tag";
import type { BannerTone } from "@/components/ui/banner";
import type { TagColor } from "@/lib/constants";

/** One colour per project state, used by tiles, banners and badges. */
export const PROJECT_TONE: Record<ProjectStatus, Tone & BannerTone> = {
  active: "blue",
  blocked: "red",
  review: "purple",
  backlog: "gray",
  completed: "green",
  archived: "gray",
};

/** Friendlier status words for people who don't live in project tools. */
export const PROJECT_STATE_LABEL: Record<ProjectStatus, string> = {
  active: "In progress",
  blocked: "Needs help",
  review: "In review",
  backlog: "Up next",
  completed: "Done",
  archived: "Archived",
};

const BADGE: Record<ProjectStatus, TagColor> = {
  active: "blue",
  blocked: "red",
  review: "purple",
  backlog: "gray",
  completed: "green",
  archived: "gray",
};

export function ProjectStateTag({ status, className }: { status: ProjectStatus; className?: string }) {
  return (
    <StatusTag color={BADGE[status]} className={className}>
      {PROJECT_STATE_LABEL[status]}
    </StatusTag>
  );
}

/** Plain-language deadline: "Due in 5 days", "Due today", "3 days late". */
export function deadlineText(p: Pick<Project, "deadline" | "status">) {
  const d = daysUntil(p.deadline);
  if (d == null) return null;
  if (p.status === "completed" || p.status === "archived") return { text: `Due ${formatDay(p.deadline)}`, tone: "text-fg-3" };
  if (d < 0) return { text: `${-d} ${d === -1 ? "day" : "days"} late`, tone: "text-red" };
  if (d === 0) return { text: "Due today", tone: "text-orange" };
  if (d <= 7) return { text: `Due in ${d} ${d === 1 ? "day" : "days"}`, tone: "text-orange" };
  return { text: `Due ${formatDay(p.deadline)}`, tone: "text-fg-2" };
}

/** A project as one chunky, tappable card: what it is, the next step, and how far along it is. */
export function ProjectCard({ project: p, showState = true }: { project: Project; showState?: boolean }) {
  const { data } = useWorkspace();
  const prog = projectProgress(p.id, data.tasks);
  const type = optionFor(PROJECT_TYPES, p.type);
  const due = deadlineText(p);
  const closed = p.status === "completed" || p.status === "archived";
  return (
    <Link href={`/projects/${p.id}`} className="card-press flex gap-4 rounded-2xl bg-bg p-4">
      <IconTile tone={PROJECT_TONE[p.status]} size={56}>
        {p.icon ?? "📁"}
      </IconTile>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[17px] font-extrabold leading-snug">{p.name}</div>
            <div className="truncate text-[13px] font-semibold text-fg-2">
              {[p.client, type?.label].filter(Boolean).join(" · ")}
            </div>
          </div>
          {showState && p.status !== "active" && <ProjectStateTag status={p.status} className="mt-0.5" />}
        </div>
        {!closed && (
          <div className={cn("mt-2 line-clamp-2 text-[14px] font-bold leading-snug", p.next_action ? "text-fg" : "text-orange")}>
            {p.next_action ? (
              <>
                <span className="text-blue">Next:</span> {p.next_action}
              </>
            ) : (
              "No next step yet — add one"
            )}
          </div>
        )}
        <div className="mt-3 flex items-center gap-3">
          {prog.total > 0 ? (
            <>
              <ProgressBar value={prog.ratio} tone={prog.ratio === 1 ? "green" : "yellow"} size="sm" className="max-w-40" />
              <span className="shrink-0 text-[12.5px] font-bold text-fg-2 tabular">
                {prog.done}/{prog.total} tasks
              </span>
            </>
          ) : (
            <span className="text-[12.5px] font-bold text-fg-3">No tasks yet</span>
          )}
          {due && <span className={cn("ml-auto shrink-0 text-[12.5px] font-extrabold", due.tone)}>{due.text}</span>}
        </div>
      </div>
    </Link>
  );
}
