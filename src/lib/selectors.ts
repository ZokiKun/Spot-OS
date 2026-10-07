import type { Profile, Project, ProjectStatus, Snapshot, Task, UUID } from "./types";
import { ACTIVE_PROJECT_STATUSES, OPEN_TASK_STATUSES } from "./constants";
import { addDaysISO, todayISO } from "./utils";

export const isOpen = (t: Task) => OPEN_TASK_STATUSES.includes(t.status);
export const isOverdue = (t: Task, today = todayISO()) => isOpen(t) && !!t.due_date && t.due_date < today;
export const isDueToday = (t: Task, today = todayISO()) => isOpen(t) && t.due_date === today;
export const isUpcoming = (t: Task, today = todayISO(), days = 7) =>
  isOpen(t) && !!t.due_date && t.due_date > today && t.due_date <= addDaysISO(today, days);
export const isActiveProject = (p: Project) => ACTIVE_PROJECT_STATUSES.includes(p.status);

/** I lead it, direct it, am a member, or have an open task on it. */
export function isMyProject(p: Project, data: Pick<Snapshot, "project_members" | "tasks">, meId: UUID | null) {
  if (!meId) return false;
  return (
    p.lead_id === meId ||
    p.creative_director_id === meId ||
    data.project_members.some((m) => m.project_id === p.id && m.profile_id === meId) ||
    data.tasks.some((t) => t.project_id === p.id && t.assignee_id === meId && isOpen(t))
  );
}

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

/** Always this order: active work first, then review, then finished and archived. */
export const PROJECT_STATUS_ORDER: ProjectStatus[] = ["active", "blocked", "review", "backlog", "completed", "archived"];

export function sortProjects(projects: Project[]) {
  const rank = (s: ProjectStatus) => PROJECT_STATUS_ORDER.indexOf(s);
  return projects.slice().sort((a, b) => {
    if (a.status !== b.status) return rank(a.status) - rank(b.status);
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
