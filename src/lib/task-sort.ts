import type { Profile, Project, Task, TaskPriority, UUID } from "./types";
import { statusOptions, taskStatusValue } from "./task-statuses";
import { taskAssignees } from "./selectors";

export type TaskSortKey = "manual" | "created" | "priority" | "assignees" | "due" | "status";
export interface TaskSort {
  by: TaskSortKey;
  /** false = the natural direction (oldest, most urgent, A→Z, soonest, first status). */
  reverse?: boolean;
}

export const TASK_SORTS: { value: TaskSortKey; label: string; hint: string }[] = [
  { value: "manual", label: "Custom order", hint: "Drag to arrange" },
  { value: "created", label: "Date created", hint: "Oldest first" },
  { value: "priority", label: "Priority", hint: "Urgent first" },
  { value: "assignees", label: "Assignees", hint: "A → Z" },
  { value: "due", label: "Due date", hint: "Soonest first" },
  { value: "status", label: "Status", hint: "In status order" },
];

const PRIORITY_RANK: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

/**
 * Tasks in the chosen order. `tasks` arrive in custom order, which breaks ties. Tasks with no
 * value to sort by (no due date, nobody assigned) stay last in either direction.
 */
export function sortTasksBy(tasks: Task[], sort: TaskSort, ctx: { project?: Project | null; person: (id: UUID) => Profile | undefined }): Task[] {
  if (sort.by === "manual") return tasks;
  const options = statusOptions(ctx.project);
  const key = (t: Task): string | number | null => {
    switch (sort.by) {
      case "created":
        return t.created_at;
      case "priority":
        return PRIORITY_RANK[t.priority] ?? 9;
      case "due":
        return t.due_date;
      case "status":
        return options.findIndex((o) => o.value === taskStatusValue(t, ctx.project));
      case "assignees": {
        const first = taskAssignees(t)[0];
        return first ? (ctx.person(first)?.full_name.toLowerCase() ?? null) : null;
      }
      default:
        return null;
    }
  };
  const dir = sort.reverse ? -1 : 1;
  const pos = new Map(tasks.map((t, i) => [t.id, i]));
  return tasks.slice().sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    if (ka == null || kb == null) {
      if (ka != null) return -1;
      if (kb != null) return 1;
    } else if (ka !== kb) return (ka < kb ? -1 : 1) * dir;
    return pos.get(a.id)! - pos.get(b.id)!;
  });
}

export const timelineSortPref = (group: string) => `timeline-sort:${group}`;
