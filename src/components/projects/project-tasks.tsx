"use client";

import { useMemo } from "react";
import type { Project } from "@/lib/types";
import { useWorkspace } from "@/lib/store";
import { usePref } from "@/lib/hooks";
import { sortTasks } from "@/lib/selectors";
import { statusOptions } from "@/lib/task-statuses";
import { StatusTag } from "@/components/ui/tag";
import { TaskList } from "@/components/tasks/task-table";
import { TaskBoard, TaskGantt, TaskGrid, TaskViewSwitcher, type TaskView } from "@/components/tasks/task-views";
import { EmptyState } from "@/components/ui/misc";
import { ProjectTimeline, useTimeline } from "./project-timeline";

const VIEWS: TaskView[] = ["timeline", "board", "list", "grid", "gantt"];

/** A project's tasks: milestones (default), or as a board, list, grid or Gantt chart. */
export function ProjectTasks({ project, onEditStatuses }: { project: Project; onEditStatuses: () => void }) {
  const { data } = useWorkspace();
  const [saved, setView] = usePref<TaskView>("project-task-view", "timeline");
  const view = VIEWS.includes(saved) ? saved : "timeline";
  const timeline = useTimeline(project.id);
  const tasks = useMemo(() => sortTasks(data.tasks.filter((t) => t.project_id === project.id)), [data.tasks, project.id]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <TaskViewSwitcher value={view} onChange={setView} views={VIEWS} />
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5 text-[12px] text-fg-3">
          {statusOptions(project).map((o) => (
            <StatusTag key={o.value} color={o.color}>
              {o.label}
            </StatusTag>
          ))}
          <button type="button" onClick={onEditStatuses} className="ml-1 rounded-md px-1.5 py-0.5 font-medium text-fg-2 hover:bg-hover hover:text-fg">
            {project.task_statuses?.length ? "Edit statuses" : "Customise statuses"}
          </button>
        </div>
      </div>
      {view === "timeline" && <ProjectTimeline project={project} />}
      {view === "board" && <TaskBoard tasks={tasks} project={project} />}
      {view === "list" && (tasks.length ? <TaskList tasks={tasks} /> : <EmptyState title="No tasks yet" />)}
      {view === "grid" && <TaskGrid tasks={tasks} showProject={false} />}
      {view === "gantt" && (
        <TaskGantt
          groups={[
            ...timeline.steps.map((s) => ({ key: s.milestone.id, label: `${s.index}. ${s.milestone.title}`, tasks: s.tasks, due: s.milestone.due_date })),
            ...(timeline.loose.length ? [{ key: "loose", label: timeline.steps.length ? "Not in a milestone" : "Tasks", tasks: timeline.loose }] : []),
          ]}
        />
      )}
    </div>
  );
}
