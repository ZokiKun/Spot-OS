"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Project, Task } from "@/lib/types";
import { useWorkspace } from "@/lib/store";
import { isActiveProject, isAssignedTo, isDueToday, isMyProject, isOpen, isOverdue, isUpcoming, sortProjects, sortTasks, workload } from "@/lib/selectors";
import { ACTIVE_PROJECT_STATUSES } from "@/lib/constants";
import { readPref, writePref } from "@/lib/hooks";
import { addDaysISO, todayISO } from "@/lib/utils";

export type HomeLayout = "table" | "list" | "grid" | "agenda" | "week" | "bento";
export const HOME_LAYOUTS: HomeLayout[] = ["table", "list", "grid", "agenda", "week", "bento"];
export const isHomeLayout = (v: unknown): v is HomeLayout => HOME_LAYOUTS.includes(v as HomeLayout);

const LAYOUT_KEY = "home-layout";
const layoutListeners = new Set<() => void>();

/** The layout last picked on this device (Table until one is chosen). */
export function useSavedLayout() {
  const layout = useSyncExternalStore(
    (cb) => {
      layoutListeners.add(cb);
      return () => layoutListeners.delete(cb);
    },
    () => {
      const saved = readPref<string>(LAYOUT_KEY, "table");
      return isHomeLayout(saved) ? saved : "table";
    },
    () => "table" as HomeLayout,
  );
  const save = (l: HomeLayout) => {
    writePref(LAYOUT_KEY, l);
    layoutListeners.forEach((cb) => cb());
  };
  return [layout, save] as const;
}

/** Something with a date on the home timeline: a task due that day, or a project deadline. */
export type DatedItem = { kind: "task"; date: string; task: Task } | { kind: "deadline"; date: string; project: Project };

export function datedItems(tasks: Task[], deadlines: Project[]): DatedItem[] {
  return [
    ...deadlines.map((project) => ({ kind: "deadline" as const, date: project.deadline!, project })),
    ...sortTasks(tasks)
      .filter((t) => t.due_date)
      .map((task) => ({ kind: "task" as const, date: task.due_date!, task })),
  ].sort((a, b) => a.date.localeCompare(b.date) || (a.kind === b.kind ? 0 : a.kind === "deadline" ? -1 : 1));
}

/** Everything the Personal tab shows, shared by every layout. */
export function usePersonalData() {
  const { data, me } = useWorkspace();
  const meId = me?.id ?? null;
  return useMemo(() => {
    const today = todayISO();
    const mine = data.tasks.filter((t) => isAssignedTo(t, meId));
    const myOpen = mine.filter(isOpen);
    const projects = sortProjects(data.projects.filter((p) => ACTIVE_PROJECT_STATUSES.includes(p.status) && isMyProject(p, data, meId)));
    return {
      today,
      myOpen,
      overdue: sortTasks(mine.filter((t) => isOverdue(t, today))),
      dueToday: sortTasks(mine.filter((t) => isDueToday(t, today))),
      upcoming: sortTasks(mine.filter((t) => isUpcoming(t, today, 7))),
      projects,
      deadlines: projects
        .filter((p) => p.deadline && p.deadline >= today && p.deadline <= addDaysISO(today, 30))
        .sort((a, b) => a.deadline!.localeCompare(b.deadline!)),
    };
  }, [data, meId]);
}

/** Everything the Studio tab shows, shared by every layout. */
export function useStudioData() {
  const { data } = useWorkspace();
  return useMemo(() => {
    const today = todayISO();
    const open = data.tasks.filter(isOpen);
    const active = sortProjects(data.projects.filter(isActiveProject));
    return {
      today,
      open,
      overdue: sortTasks(open.filter((t) => isOverdue(t, today))),
      upcomingTasks: sortTasks(open.filter((t) => t.due_date && t.due_date >= today && t.due_date <= addDaysISO(today, 14))),
      active,
      blocked: active.filter((p) => p.status === "blocked"),
      load: workload(data).sort((a, b) => b.open - a.open),
      deadlines: active
        .filter((p) => p.deadline && p.deadline >= today && p.deadline <= addDaysISO(today, 14))
        .sort((a, b) => a.deadline!.localeCompare(b.deadline!)),
      activity: data.activity_log,
    };
  }, [data]);
}
