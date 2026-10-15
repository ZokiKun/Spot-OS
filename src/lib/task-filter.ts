import type { Task, TaskPriority, UUID } from "./types";
import { taskAssignees } from "./selectors";
import { addDaysISO, todayISO } from "./utils";

export type DueBucket = "overdue" | "today" | "week" | "later" | "none";

/** Due-date filter choices, in date order. "This week" = the next 7 days after today. */
export const DUE_BUCKETS: { value: DueBucket; label: string }[] = [
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Today" },
  { value: "week", label: "Next 7 days" },
  { value: "later", label: "Later" },
  { value: "none", label: "No due date" },
];

/** Assignee filter value for tasks nobody is on. */
export const UNASSIGNED = "none";

/**
 * Task filters. Empty or missing lists don't filter. Within a list any value matches (OR);
 * across lists every one has to match (AND). `status` holds status option values.
 */
export interface TaskFilters {
  status?: string[];
  assignees?: (UUID | typeof UNASSIGNED)[];
  due?: DueBucket[];
  priority?: TaskPriority[];
}

export const NO_FILTERS: TaskFilters = {};

export const countFilters = (f: TaskFilters) =>
  (f.status?.length ?? 0) + (f.assignees?.length ?? 0) + (f.due?.length ?? 0) + (f.priority?.length ?? 0);

export function dueBucket(t: Pick<Task, "due_date">, today = todayISO()): DueBucket {
  if (!t.due_date) return "none";
  if (t.due_date < today) return "overdue";
  if (t.due_date === today) return "today";
  return t.due_date <= addDaysISO(today, 7) ? "week" : "later";
}

/** Tasks that pass the filters, in the order they came. `statusOf` gives each task's status option value. */
export function applyTaskFilters(tasks: Task[], f: TaskFilters, statusOf: (t: Task) => string): Task[] {
  if (!countFilters(f)) return tasks;
  const today = todayISO();
  return tasks.filter((t) => {
    if (f.status?.length && !f.status.includes(statusOf(t))) return false;
    if (f.priority?.length && !f.priority.includes(t.priority)) return false;
    if (f.due?.length && !f.due.includes(dueBucket(t, today))) return false;
    if (f.assignees?.length) {
      const ids = taskAssignees(t);
      if (!(ids.length ? ids.some((id) => f.assignees!.includes(id)) : f.assignees.includes(UNASSIGNED))) return false;
    }
    return true;
  });
}
