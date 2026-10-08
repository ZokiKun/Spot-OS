import type { CustomTaskStatus, Project, Task, TaskStatus } from "./types";
import { TASK_STATUSES, type Option, type TagColor } from "./constants";
import { nowISO } from "./utils";

/** A status a task can be in: a project's own one, or a built-in one. `base` drives done/overdue/progress. */
export interface StatusOption extends Option<string> {
  base: TaskStatus;
  custom: boolean;
}

/** The statuses tasks in this project can have — its own list if it has one, else the built-in five. */
export function statusOptions(project?: Pick<Project, "task_statuses"> | null): StatusOption[] {
  const custom = project?.task_statuses;
  if (custom?.length) return custom.map((s) => ({ value: s.id, label: s.label, color: s.color as TagColor, base: s.base, custom: true }));
  return TASK_STATUSES.map((o) => ({ ...o, base: o.value, custom: false }));
}

/**
 * Which option a task shows. Its custom status only counts while it still matches the built-in
 * status (a checkbox tick moves the built-in one); otherwise the first option with that base.
 */
export function taskStatusValue(task: Pick<Task, "status" | "custom_status">, project?: Pick<Project, "task_statuses"> | null): string {
  const options = statusOptions(project);
  if (!options[0]?.custom) return task.status;
  const own = options.find((o) => o.value === task.custom_status && o.base === task.status);
  return (own ?? options.find((o) => o.base === task.status) ?? options[0]!).value;
}

export function taskStatusOption(task: Pick<Task, "status" | "custom_status">, project?: Pick<Project, "task_statuses"> | null) {
  const value = taskStatusValue(task, project);
  return statusOptions(project).find((o) => o.value === value) ?? statusOptions(null).find((o) => o.value === task.status)!;
}

/** Patch for picking a status option: the built-in status, completed_at and the custom one. */
export function statusChange(value: string, project?: Pick<Project, "task_statuses"> | null): Partial<Task> {
  const option = statusOptions(project).find((o) => o.value === value);
  const base = option?.base ?? (value as TaskStatus);
  return { status: base, completed_at: base === "done" ? nowISO() : null, custom_status: option?.custom ? value : null };
}

export const BASE_STATUS_LABEL: Record<TaskStatus, string> = Object.fromEntries(TASK_STATUSES.map((o) => [o.value, o.label])) as Record<TaskStatus, string>;

/** Starting point when a project switches to its own statuses: the built-in five, editable. */
export function defaultCustomStatuses(): CustomTaskStatus[] {
  return TASK_STATUSES.map((o) => ({ id: o.value, label: o.label, color: o.color, base: o.value }));
}
