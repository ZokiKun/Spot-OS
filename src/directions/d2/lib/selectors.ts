import type { Profile, Project, Snapshot, Task, UUID } from "./types";
import { ACTIVE_PROJECT_STATUSES, OPEN_TASK_STATUSES } from "./constants";
import { addDaysISO, todayISO } from "./utils";

export const isOpen = (t: Task) => OPEN_TASK_STATUSES.includes(t.status);
export const isOverdue = (t: Task, today = todayISO()) => isOpen(t) && !!t.due_date && t.due_date < today;
export const isDueToday = (t: Task, today = todayISO()) => isOpen(t) && t.due_date === today;
export const isUpcoming = (t: Task, today = todayISO(), days = 7) =>
  isOpen(t) && !!t.due_date && t.due_date > today && t.due_date <= addDaysISO(today, days);
export const isActiveProject = (p: Project) => ACTIVE_PROJECT_STATUSES.includes(p.status);

const priorityRank = { urgent: 0, high: 1, medium: 2, low: 3 } as const;

export function sortTasks(tasks: Task[]) {
  return tasks.slice().sort((a, b) => {
    if (isOpen(a) !== isOpen(b)) return isOpen(a) ? -1 : 1;
    const ad = a.due_date ?? "9999";
    const bd = b.due_date ?? "9999";
    if (ad !== bd) return ad.localeCompare(bd);
    return priorityRank[a.priority] - priorityRank[b.priority];
  });
}

export function sortProjects(projects: Project[]) {
  const order = { blocked: 0, active: 1, review: 2, backlog: 3, completed: 4, archived: 5 } as const;
  return projects.slice().sort((a, b) => {
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999");
  });
}

export function projectProgress(projectId: UUID, tasks: Task[]) {
  const own = tasks.filter((t) => t.project_id === projectId);
  const done = own.filter((t) => t.status === "done").length;
  return { done, total: own.length, ratio: own.length ? done / own.length : 0 };
}

export type TaskFilter =
  | { kind: "all" }
  | { kind: "mine" }
  | { kind: "member"; id: UUID }
  | { kind: "overdue" }
  | { kind: "today" }
  | { kind: "upcoming" }
  | { kind: "completed" };

export function filterTasks(tasks: Task[], filter: TaskFilter, meId: UUID | null) {
  const today = todayISO();
  switch (filter.kind) {
    case "all":
      return tasks.filter(isOpen);
    case "mine":
      return tasks.filter((t) => isOpen(t) && t.assignee_id === meId);
    case "member":
      return tasks.filter((t) => isOpen(t) && t.assignee_id === filter.id);
    case "overdue":
      return tasks.filter((t) => isOverdue(t, today));
    case "today":
      return tasks.filter((t) => isDueToday(t, today));
    case "upcoming":
      return tasks.filter((t) => isUpcoming(t, today, 14));
    case "completed":
      return tasks
        .filter((t) => t.status === "done")
        .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
  }
}

export type AttentionKind =
  | "overdue_task"
  | "due_today"
  | "blocked_project"
  | "blocked_task"
  | "no_next_action"
  | "project_overdue"
  | "deadline_soon";

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  href: string;
  taskId?: UUID;
  projectId?: UUID;
  assigneeId?: UUID | null;
}

/**
 * Genuine exceptions only — the things that would otherwise be noticed too late.
 * `scope: "me"` limits task-level items to my assignments.
 */
export function attentionItems(data: Snapshot, scope: { meId: UUID | null; mine: boolean }): AttentionItem[] {
  const today = todayISO();
  const items: AttentionItem[] = [];
  const projects = new Map(data.projects.map((p) => [p.id, p]));
  const projName = (id: UUID | null) => (id ? (projects.get(id)?.name ?? "No project") : "No project");
  const relevantTask = (t: Task) => !scope.mine || t.assignee_id === scope.meId;

  for (const p of data.projects) {
    if (p.status === "blocked")
      items.push({
        id: `bp-${p.id}`,
        kind: "blocked_project",
        severity: "high",
        title: p.name,
        detail: p.next_action ? `Stuck · ${p.next_action}` : "Stuck",
        href: `/projects/${p.id}`,
        projectId: p.id,
      });
    if (isActiveProject(p) && p.deadline && p.deadline < today)
      items.push({
        id: `po-${p.id}`,
        kind: "project_overdue",
        severity: "high",
        title: p.name,
        detail: "Past its deadline",
        href: `/projects/${p.id}`,
        projectId: p.id,
      });
    if (p.status === "active" && !p.next_action?.trim())
      items.push({
        id: `nna-${p.id}`,
        kind: "no_next_action",
        severity: "medium",
        title: p.name,
        detail: "No next step set",
        href: `/projects/${p.id}`,
        projectId: p.id,
      });
  }

  for (const t of data.tasks) {
    if (!relevantTask(t)) continue;
    if (isOverdue(t, today))
      items.push({
        id: `ot-${t.id}`,
        kind: "overdue_task",
        severity: "high",
        title: t.title,
        detail: projName(t.project_id),
        href: t.project_id ? `/projects/${t.project_id}?tab=tasks&task=${t.id}` : `/projects/tasks?task=${t.id}`,
        taskId: t.id,
        assigneeId: t.assignee_id,
      });
    else if (t.status === "blocked")
      items.push({
        id: `bt-${t.id}`,
        kind: "blocked_task",
        severity: "medium",
        title: t.title,
        detail: projName(t.project_id),
        href: t.project_id ? `/projects/${t.project_id}?tab=tasks&task=${t.id}` : `/projects/tasks?task=${t.id}`,
        taskId: t.id,
        assigneeId: t.assignee_id,
      });
    else if (isDueToday(t, today))
      items.push({
        id: `dt-${t.id}`,
        kind: "due_today",
        severity: "medium",
        title: t.title,
        detail: projName(t.project_id),
        href: t.project_id ? `/projects/${t.project_id}?tab=tasks&task=${t.id}` : `/projects/tasks?task=${t.id}`,
        taskId: t.id,
        assigneeId: t.assignee_id,
      });
  }

  const rank = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

export interface Workload {
  profile: Profile;
  open: number;
  inProgress: number;
  overdue: number;
  dueThisWeek: number;
  blocked: number;
}

export function workload(data: Snapshot): Workload[] {
  const today = todayISO();
  return data.profiles.map((profile) => {
    const mine = data.tasks.filter((t) => t.assignee_id === profile.id && isOpen(t));
    return {
      profile,
      open: mine.length,
      inProgress: mine.filter((t) => t.status === "in_progress").length,
      overdue: mine.filter((t) => isOverdue(t, today)).length,
      dueThisWeek: mine.filter((t) => t.due_date && t.due_date >= today && t.due_date <= addDaysISO(today, 7)).length,
      blocked: mine.filter((t) => t.status === "blocked").length,
    };
  });
}

/** Metrics for a date range [start, end) — used by Performance and Reviews. */
export function periodMetrics(data: Snapshot, start: string, end: string) {
  const inRange = (iso: string | null) => !!iso && iso.slice(0, 10) >= start && iso.slice(0, 10) < end;
  return {
    projectsStarted: data.projects.filter((p) => inRange(p.start_date)).length,
    projectsCompleted: data.projects.filter((p) => inRange(p.completed_at)).length,
    tasksCompleted: data.tasks.filter((t) => t.status === "done" && inRange(t.completed_at)).length,
    tasksCreated: data.tasks.filter((t) => inRange(t.created_at)).length,
    overdueTasks: data.tasks.filter((t) => isOpen(t) && t.due_date && t.due_date >= start && t.due_date < end && t.due_date < todayISO()).length,
  };
}
