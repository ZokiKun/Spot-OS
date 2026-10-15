import type { Profile, Project, Task, UUID } from "./types";
import { projectProgress, sortProjects } from "./selectors";

export type ProjectSortKey = "default" | "deadline" | "name" | "start" | "created" | "updated" | "progress" | "lead" | "client";
export interface ProjectSort {
  by: ProjectSortKey;
  /** false = the natural direction (soonest, A→Z, oldest, least done). */
  reverse?: boolean;
}

/** `order`: the natural direction, then the reversed one — in words that fit the field. */
export const PROJECT_SORTS: { value: ProjectSortKey; label: string; order?: [string, string] }[] = [
  { value: "default", label: "Status, then deadline" },
  { value: "deadline", label: "Deadline", order: ["Soonest first", "Latest first"] },
  { value: "name", label: "Name", order: ["A to Z", "Z to A"] },
  { value: "start", label: "Start date", order: ["Earliest first", "Latest first"] },
  { value: "created", label: "Date created", order: ["Oldest first", "Newest first"] },
  { value: "updated", label: "Last edited", order: ["Most recent first", "Least recent first"] },
  { value: "progress", label: "Progress", order: ["Least done first", "Most done first"] },
  { value: "lead", label: "Lead", order: ["A to Z", "Z to A"] },
  { value: "client", label: "Client", order: ["A to Z", "Z to A"] },
];

export const PROJECT_SORT_PREF = "projects-sort";
export const DEFAULT_PROJECT_SORT: ProjectSort = { by: "default" };

/**
 * Projects in the chosen order. The default order (status, then deadline) breaks ties, and
 * projects with no value to sort by (no deadline, no lead…) stay last in either direction.
 */
export function sortProjectsBy(projects: Project[], sort: ProjectSort, ctx: { tasks: Task[]; person: (id: UUID) => Profile | undefined }): Project[] {
  const base = sortProjects(projects);
  if (sort.by === "default") return base;
  const key = (p: Project): string | number | null => {
    switch (sort.by) {
      case "deadline":
        return p.deadline;
      case "name":
        return p.name.toLowerCase();
      case "start":
        return p.start_date;
      case "created":
        return p.created_at;
      case "updated":
        return p.updated_at;
      case "progress": {
        const prog = projectProgress(p.id, ctx.tasks);
        return prog.total ? prog.ratio : null;
      }
      case "lead":
        return p.lead_id ? (ctx.person(p.lead_id)?.full_name.toLowerCase() ?? null) : null;
      case "client":
        return p.client?.trim().toLowerCase() || null;
      default:
        return null;
    }
  };
  // "Last edited" reads most-recent-first naturally, so its natural direction is descending.
  const dir = (sort.by === "updated" ? -1 : 1) * (sort.reverse ? -1 : 1);
  const pos = new Map(base.map((p, i) => [p.id, i]));
  const keys = new Map(base.map((p) => [p.id, key(p)]));
  return base.sort((a, b) => {
    const ka = keys.get(a.id) ?? null;
    const kb = keys.get(b.id) ?? null;
    if (ka == null || kb == null) {
      if (ka != null) return -1;
      if (kb != null) return 1;
    } else if (ka !== kb) return (ka < kb ? -1 : 1) * dir;
    return pos.get(a.id)! - pos.get(b.id)!;
  });
}
