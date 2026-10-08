import type { Milestone, Snapshot, Task, UUID } from "./types";
import { sortTasks } from "./selectors";

export type MilestoneState = "done" | "current" | "upcoming";

export interface TimelineStep {
  milestone: Milestone;
  /** 1-based position on the timeline. */
  index: number;
  tasks: Task[];
  done: number;
  total: number;
  state: MilestoneState;
}

export interface Timeline {
  steps: TimelineStep[];
  /** The project's next step: the first milestone whose tasks aren't all done. */
  current: TimelineStep | null;
  /** Project tasks that aren't under any milestone. */
  loose: Task[];
  /** Every milestone has tasks and all of them are done. */
  complete: boolean;
}

/** Tasks in a timeline group: hand-ordered ones first (by sort_order), the rest by due date and priority. */
export function orderTasks(tasks: Task[]) {
  const rank = new Map(sortTasks(tasks).map((t, i) => [t.id, i]));
  return tasks.slice().sort((a, b) => (a.sort_order ?? Infinity) - (b.sort_order ?? Infinity) || rank.get(a.id)! - rank.get(b.id)!);
}

export function sortMilestones(milestones: Milestone[]) {
  return milestones.slice().sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
}

/**
 * A milestone is done once it has tasks and every one is done. Milestones complete in any
 * order, but only the first unfinished one is "current" — that's what the project shows as
 * its next step. An empty milestone counts as unfinished, so it waits for its tasks.
 */
export function projectTimeline(projectId: UUID, data: Pick<Snapshot, "milestones" | "tasks">): Timeline {
  const milestones = sortMilestones(data.milestones.filter((m) => m.project_id === projectId));
  const ids = new Set(milestones.map((m) => m.id));
  const projectTasks = data.tasks.filter((t) => t.project_id === projectId);
  let current: TimelineStep | null = null;
  const steps = milestones.map((milestone, i): TimelineStep => {
    const tasks = orderTasks(projectTasks.filter((t) => t.milestone_id === milestone.id));
    const done = tasks.filter((t) => t.status === "done").length;
    const finished = tasks.length > 0 && done === tasks.length;
    const step: TimelineStep = { milestone, index: i + 1, tasks, done, total: tasks.length, state: "upcoming" };
    if (finished) step.state = "done";
    else if (!current) {
      step.state = "current";
      current = step;
    }
    return step;
  });
  return {
    steps,
    current,
    loose: orderTasks(projectTasks.filter((t) => !t.milestone_id || !ids.has(t.milestone_id))),
    complete: steps.length > 0 && !current,
  };
}

/** Next sort_order for a new milestone at the end of a project's timeline. */
export function nextSortOrder(projectId: UUID, milestones: Milestone[]) {
  return milestones.filter((m) => m.project_id === projectId).reduce((max, m) => Math.max(max, m.sort_order + 1), 0);
}
