"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  CircleDot,
  Ellipsis,
  Flag,
  Percent,
  Shapes,
  StickyNote,
  Tag as TagIcon,
  Type,
  User,
} from "lucide-react";
import type { Project, ProjectStatus } from "@/lib/types";
import { PROJECT_STATUSES, PROJECT_TYPES, optionFor } from "@/lib/constants";
import { useProfiles, useWorkspace } from "@/lib/store";
import { PROJECT_STATUS_ORDER, hasClient, projectProgress } from "@/lib/selectors";
import { readPref, writePref } from "@/lib/hooks";
import { cn, formatDay, daysUntil, nowISO } from "@/lib/utils";
import { DateField, OptionField, PersonField } from "@/components/ui/fields";
import { Avatar } from "@/components/ui/avatar";
import { NextStepText, useTimeline } from "./project-timeline";
import { ProgressBar, EmptyState } from "@/components/ui/misc";
import { StatusTag, Tag } from "@/components/ui/tag";
import { IconButton } from "@/components/ui/button";
import { Popover, usePopover } from "@/components/ui/popover";
import { MenuItem, MenuList } from "@/components/ui/menu";
import { TagList, TagsField } from "@/components/ui/tags-field";
import { ProjectNoteField } from "./project-note-field";
import { coverStyle } from "./project-cover";

export function projectStatusPatch(status: ProjectStatus): Partial<Project> {
  return { status, completed_at: status === "completed" ? nowISO() : null };
}

type ColKey = "name" | "status" | "type" | "tags" | "lead" | "deadline" | "progress" | "next" | "note";

// Columns in the order they appear. `min` is the narrowest the column can get; `from` is the
// table width (px) at which it starts showing, so the table always fits without sideways scroll.
const COLUMNS: { key: ColKey; label: string; icon: React.ReactNode; track: string; min: number; from: number }[] = [
  { key: "name", label: "Name", icon: <Type className="size-3.5" />, track: "minmax(180px,1.6fr)", min: 180, from: 0 },
  { key: "status", label: "Status", icon: <CircleDot className="size-3.5" />, track: "120px", min: 120, from: 560 },
  { key: "type", label: "Type", icon: <Shapes className="size-3.5" />, track: "108px", min: 108, from: 1080 },
  { key: "tags", label: "Tags", icon: <TagIcon className="size-3.5" />, track: "minmax(130px,1fr)", min: 130, from: 1180 },
  { key: "lead", label: "Lead", icon: <User className="size-3.5" />, track: "minmax(120px,0.9fr)", min: 120, from: 640 },
  { key: "deadline", label: "Deadline", icon: <CalendarDays className="size-3.5" />, track: "100px", min: 100, from: 0 },
  { key: "progress", label: "Progress", icon: <Percent className="size-3.5" />, track: "104px", min: 104, from: 420 },
  { key: "next", label: "Next step", icon: <Flag className="size-3.5" />, track: "minmax(150px,1.3fr)", min: 150, from: 800 },
  { key: "note", label: "Note", icon: <StickyNote className="size-3.5" />, track: "minmax(160px,1.2fr)", min: 160, from: 1380 },
];

/** Width of an element, kept up to date as it resizes. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export function ProjectTable({ projects, grouped = true }: { projects: Project[]; grouped?: boolean }) {
  const [collapsed, setCollapsed] = useState<ProjectStatus[]>(() => readPref<ProjectStatus[]>("project-groups-collapsed", []));
  const [ref, width] = useWidth<HTMLDivElement>();
  const toggleGroup = (s: ProjectStatus) => {
    const next = collapsed.includes(s) ? collapsed.filter((x) => x !== s) : [...collapsed, s];
    setCollapsed(next);
    writePref("project-groups-collapsed", next);
  };
  // Grouped rows already sit under their status, so the Status column would repeat it.
  // Before the first measurement (width 0) show the core columns only.
  const cols = COLUMNS.filter((c) => (c.key !== "status" || !grouped) && (width || 700) >= c.from);
  const template = cols.map((c) => c.track).join(" ");
  if (!projects.length) return <EmptyState title="No projects match" description="Try a different filter, or create a new project." />;
  const groups = grouped
    ? PROJECT_STATUS_ORDER.map((status) => ({ status, items: projects.filter((p) => p.status === status) })).filter((g) => g.items.length)
    : [{ status: null, items: projects }];
  return (
    <div ref={ref} className="text-[14px]">
      <div className="grid border-y border-line text-[13px] text-fg-2" style={{ gridTemplateColumns: template }}>
        {cols.map((h, i) => (
          <div key={h.key} className={cn("flex h-8 min-w-0 items-center gap-1.5 px-2", i > 0 && "border-l border-line")}>
            <span className="shrink-0 text-fg-3">{h.icon}</span>
            <span className="truncate">{h.label}</span>
          </div>
        ))}
      </div>
      {groups.map((g) => {
        const opt = g.status ? optionFor(PROJECT_STATUSES, g.status)! : null;
        const isCollapsed = g.status != null && collapsed.includes(g.status);
        return (
          <div key={g.status ?? "all"}>
            {opt && (
              <button
                type="button"
                onClick={() => toggleGroup(g.status!)}
                aria-expanded={!isCollapsed}
                className="flex h-9 items-center gap-1.5 px-1 pt-2 text-[13px] text-fg-2 hover:text-fg"
              >
                <ChevronRight className={cn("size-3.5 transition-transform", !isCollapsed && "rotate-90")} />
                <StatusTag color={opt.color}>{opt.label}</StatusTag>
                <span className="text-fg-3">{g.items.length}</span>
              </button>
            )}
            {!isCollapsed && g.items.map((p) => <ProjectRow key={p.id} project={p} cols={cols.map((c) => c.key)} template={template} />)}
          </div>
        );
      })}
    </div>
  );
}

function ProjectRow({ project: p, cols, template }: { project: Project; cols: ColKey[]; template: string }) {
  const { data, update } = useWorkspace();
  const people = useProfiles();
  const router = useRouter();
  const { setAnchor, ...menu } = usePopover();
  const prog = projectProgress(p.id, data.tasks);
  const closed = p.status === "completed" || p.status === "archived";
  const cell: Record<ColKey, React.ReactNode> = {
    name: (
      <div className="flex min-w-0 items-center">
        <Link href={`/projects/${p.id}`} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 font-medium">
          <span className={cn("w-5 shrink-0 text-center text-[15px]", p.status === "archived" && "opacity-60")}>{p.icon ?? "📁"}</span>
          <span className="truncate">{p.name}</span>
        </Link>
        <IconButton ref={setAnchor} label="Project actions" onClick={menu.toggle} className="mr-1 opacity-0 group-hover:opacity-100 focus:opacity-100">
          <Ellipsis className="size-4" />
        </IconButton>
        <Popover open={menu.open} onClose={menu.close} anchor={menu.anchor} width={200}>
          <MenuList>
            <MenuItem icon={<ArrowUpRight className="size-4" />} onSelect={() => router.push(`/projects/${p.id}`)}>
              Open
            </MenuItem>
            {p.status !== "completed" && (
              <MenuItem icon={<CircleCheck className="size-4" />} onSelect={() => (void update("projects", p.id, projectStatusPatch("completed")), menu.close())}>
                Mark completed
              </MenuItem>
            )}
            <MenuItem
              icon={p.status === "archived" ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
              onSelect={() => (void update("projects", p.id, projectStatusPatch(p.status === "archived" ? "active" : "archived")), menu.close())}
            >
              {p.status === "archived" ? "Unarchive" : "Archive"}
            </MenuItem>
          </MenuList>
        </Popover>
      </div>
    ),
    status: (
      <div className="flex min-w-0 border-l border-line">
        <OptionField options={PROJECT_STATUSES} value={p.status} onChange={(s) => void update("projects", p.id, projectStatusPatch(s))} />
      </div>
    ),
    type: (
      <div className="flex min-w-0 border-l border-line">
        <OptionField kind="select" options={PROJECT_TYPES} value={p.type} onChange={(type) => void update("projects", p.id, { type })} />
      </div>
    ),
    tags: (
      <div className="flex min-w-0 border-l border-line">
        <TagsField scope="project" value={p.tags} onChange={(tags) => void update("projects", p.id, { tags })} />
      </div>
    ),
    lead: (
      <div className="flex min-w-0 border-l border-line">
        <PersonField people={people.list} value={p.lead_id} onChange={(lead_id) => void update("projects", p.id, { lead_id })} />
      </div>
    ),
    deadline: (
      <div className="flex min-w-0 border-l border-line">
        <DateField value={p.deadline} highlightOverdue={!closed} onChange={(deadline) => void update("projects", p.id, { deadline })} />
      </div>
    ),
    progress: (
      <div className="flex min-w-0 items-center gap-2 border-l border-line px-2">
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
    ),
    next: (
      <button type="button" onClick={() => router.push(`/projects/${p.id}`)} className="flex min-w-0 items-center border-l border-line px-2 text-left">
        <NextStepText project={p} />
      </button>
    ),
    note: (
      <div className="flex min-w-0 border-l border-line">
        <ProjectNoteField project={p} />
      </div>
    ),
  };
  return (
    <div className={cn("group grid border-b border-line hover:bg-subtle", p.status === "archived" && "text-fg-2")} style={{ gridTemplateColumns: template }}>
      {cols.map((k) => (
        <Fragment key={k}>{cell[k]}</Fragment>
      ))}
    </div>
  );
}

const BOARD_COLUMNS: ProjectStatus[] = PROJECT_STATUS_ORDER;

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
                    className="block overflow-hidden rounded-md bg-elevated px-2.5 py-2 shadow-card transition-colors hover:bg-[color-mix(in_srgb,var(--bg-elevated)_92%,var(--text))]"
                  >
                    {p.cover && <div className="-mx-2.5 -mt-2 mb-2 h-12" style={coverStyle(p.cover, p.cover_position)} />}
                    <div className="flex items-start gap-2 text-[14px] font-medium">
                      <span>{p.icon ?? "📁"}</span>
                      <span className="min-w-0 flex-1">{p.name}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Tag color={optionFor(PROJECT_TYPES, p.type)?.color}>{optionFor(PROJECT_TYPES, p.type)?.label}</Tag>
                      {hasClient(p) && p.client && <span className="truncate text-[12px] text-fg-2">{p.client}</span>}
                    </div>
                    {p.tags.length > 0 && <TagList scope="project" tags={p.tags} className="mt-1.5" />}
                    <BoardNextStep projectId={p.id} />
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

/** Board cards show the timeline's current milestone, when there is one. */
function BoardNextStep({ projectId }: { projectId: string }) {
  const { current } = useTimeline(projectId);
  if (!current) return null;
  return <div className="mt-1.5 line-clamp-2 text-[12px] text-fg-2">→ {current.milestone.title}</div>;
}
