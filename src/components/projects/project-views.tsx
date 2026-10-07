"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, CircleDot, Tag as TagIcon, Type, User, ArrowRight, Percent } from "lucide-react";
import type { Project, ProjectStatus } from "@/lib/types";
import { PROJECT_STATUSES, PROJECT_TYPES, optionFor } from "@/lib/constants";
import { useProfiles, useWorkspace } from "@/lib/store";
import { projectProgress } from "@/lib/selectors";
import { cn, formatDay, daysUntil, nowISO } from "@/lib/utils";
import { DateField, OptionField, PersonField } from "@/components/ui/fields";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar, EmptyState } from "@/components/ui/misc";
import { StatusTag, Tag } from "@/components/ui/tag";

export function projectStatusPatch(status: ProjectStatus): Partial<Project> {
  return { status, completed_at: status === "completed" ? nowISO() : null };
}

const COLS = "minmax(220px,1.3fr) 120px 108px 150px 104px 110px minmax(200px,1.4fr)";

export function ProjectTable({ projects }: { projects: Project[] }) {
  const { data, update } = useWorkspace();
  const people = useProfiles();
  const router = useRouter();
  const head = [
    { icon: <Type className="size-3.5" />, label: "Name" },
    { icon: <CircleDot className="size-3.5" />, label: "Status" },
    { icon: <TagIcon className="size-3.5" />, label: "Type" },
    { icon: <User className="size-3.5" />, label: "Lead" },
    { icon: <CalendarDays className="size-3.5" />, label: "Deadline" },
    { icon: <Percent className="size-3.5" />, label: "Progress" },
    { icon: <ArrowRight className="size-3.5" />, label: "Next action" },
  ];
  if (!projects.length) return <EmptyState title="No projects match" description="Try a different filter, or create a new project." />;
  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <div className="min-w-[1000px] text-[14px]">
        <div className="grid border-y border-line text-[13px] text-fg-2" style={{ gridTemplateColumns: COLS }}>
          {head.map((h, i) => (
            <div key={h.label} className={cn("flex h-8 items-center gap-1.5 px-2", i > 0 && "border-l border-line")}>
              <span className="text-fg-3">{h.icon}</span>
              {h.label}
            </div>
          ))}
        </div>
        {projects.map((p) => {
          const prog = projectProgress(p.id, data.tasks);
          return (
            <div key={p.id} className="group grid border-b border-line hover:bg-subtle" style={{ gridTemplateColumns: COLS }}>
              <Link href={`/projects/${p.id}`} className="flex min-w-0 items-center gap-2 px-2 py-1.5 font-medium">
                <span className="w-5 shrink-0 text-center text-[15px]">{p.icon ?? "📁"}</span>
                <span className="truncate">{p.name}</span>
              </Link>
              <div className="flex border-l border-line">
                <OptionField options={PROJECT_STATUSES} value={p.status} onChange={(s) => void update("projects", p.id, projectStatusPatch(s))} />
              </div>
              <div className="flex border-l border-line">
                <OptionField kind="select" options={PROJECT_TYPES} value={p.type} onChange={(type) => void update("projects", p.id, { type })} />
              </div>
              <div className="flex border-l border-line">
                <PersonField people={people.list} value={p.lead_id} onChange={(lead_id) => void update("projects", p.id, { lead_id })} />
              </div>
              <div className="flex border-l border-line">
                <DateField
                  value={p.deadline}
                  highlightOverdue={p.status !== "completed" && p.status !== "archived"}
                  onChange={(deadline) => void update("projects", p.id, { deadline })}
                />
              </div>
              <div className="flex items-center gap-2 border-l border-line px-2">
                {prog.total ? (
                  <>
                    <ProgressBar value={prog.ratio} tone={prog.ratio === 1 ? "green" : "default"} className="w-12" />
                    <span className="text-[12px] text-fg-2 tabular">
                      {prog.done}/{prog.total}
                    </span>
                  </>
                ) : (
                  <span className="text-[12px] text-fg-3">No tasks</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => router.push(`/projects/${p.id}`)}
                className="flex min-w-0 items-center border-l border-line px-2 text-left"
              >
                {p.next_action ? (
                  <span className="truncate">{p.next_action}</span>
                ) : p.status === "active" ? (
                  <span className="truncate text-[13px] text-danger">Set a next action</span>
                ) : (
                  <span className="text-fg-3">—</span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const BOARD_COLUMNS: ProjectStatus[] = ["backlog", "active", "blocked", "review", "completed"];

export function ProjectBoard({ projects }: { projects: Project[] }) {
  const { data, update } = useWorkspace();
  const people = useProfiles();

  const onDrop = (e: React.DragEvent, status: ProjectStatus) => {
    const id = e.dataTransfer.getData("text/project");
    const p = data.projects.find((x) => x.id === id);
    if (p && p.status !== status) void update("projects", id, projectStatusPatch(status));
  };

  return (
    <div className="-mx-2 flex items-start gap-3 overflow-x-auto px-2 pb-4">
      {BOARD_COLUMNS.map((status) => {
        const opt = optionFor(PROJECT_STATUSES, status)!;
        const items = projects.filter((p) => p.status === status);
        return (
          <div
            key={status}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, status)}
            className="flex w-[260px] shrink-0 flex-col rounded-lg p-1.5"
            style={{ background: `color-mix(in srgb, var(--tag-${opt.color}-bg) 35%, transparent)` }}
          >
            <div className="flex h-8 items-center gap-2 px-1.5">
              <StatusTag color={opt.color}>{opt.label}</StatusTag>
              <span className="text-[13px] text-fg-2">{items.length}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {items.map((p) => {
                const prog = projectProgress(p.id, data.tasks);
                const lead = people.get(p.lead_id);
                const diff = daysUntil(p.deadline);
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/project", p.id)}
                    className="block rounded-md bg-elevated px-2.5 py-2 shadow-card transition-colors hover:bg-[color-mix(in_srgb,var(--bg-elevated)_92%,var(--text))]"
                  >
                    <div className="flex items-start gap-2 text-[14px] font-medium">
                      <span>{p.icon ?? "📁"}</span>
                      <span className="min-w-0 flex-1">{p.name}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Tag color={optionFor(PROJECT_TYPES, p.type)?.color}>{optionFor(PROJECT_TYPES, p.type)?.label}</Tag>
                      {p.client && <span className="truncate text-[12px] text-fg-2">{p.client}</span>}
                    </div>
                    {p.next_action && <div className="mt-1.5 line-clamp-2 text-[12px] text-fg-2">→ {p.next_action}</div>}
                    <div className="mt-2 flex items-center gap-2">
                      {lead && <Avatar profile={lead} size={18} />}
                      {p.deadline && (
                        <span className={cn("text-[12px] tabular", diff != null && diff < 0 && status !== "completed" ? "text-danger" : "text-fg-2")}>
                          {formatDay(p.deadline)}
                        </span>
                      )}
                      {prog.total > 0 && (
                        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-fg-3 tabular">
                          <ProgressBar value={prog.ratio} className="w-10" tone={prog.ratio === 1 ? "green" : "default"} />
                          {prog.done}/{prog.total}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
