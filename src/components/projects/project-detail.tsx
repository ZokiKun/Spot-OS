"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  Building2,
  CalendarDays,
  CalendarPlus,
  CircleDot,
  Contact,
  Ellipsis,
  Link2,
  ListChecks,
  Palette,
  PanelRight,
  PanelTop,
  Plus,
  StickyNote,
  Tag as TagIcon,
  Tags,
  Trash2,
  User,
  Users,
} from "lucide-react";
import type { Project } from "@/lib/types";
import { PROJECT_STATUSES, PROJECT_TYPES } from "@/lib/constants";
import { useProfiles, useWorkspace } from "@/lib/store";
import { hasClient, isAssignedTo, isOpen, isOverdue, projectProgress, sortTasks } from "@/lib/selectors";
import { useDebouncedSave, usePref } from "@/lib/hooks";
import { cn, formatDay, timeAgo } from "@/lib/utils";
import { Page } from "@/components/shell/page";
import { NAV_ICONS } from "@/components/shell/icons";
import { EditableText, AutoTextarea } from "@/components/ui/input";
import { DateField, OptionField, PersonField, PropertyRow } from "@/components/ui/fields";
import { UnderlineTabs } from "@/components/ui/tabs";
import { TagsField } from "@/components/ui/tags-field";
import { Button, IconButton } from "@/components/ui/button";
import { Popover, usePopover } from "@/components/ui/popover";
import { MenuDivider, MenuItem, MenuList } from "@/components/ui/menu";
import { EmptyState, ProgressBar, SectionHeading } from "@/components/ui/misc";
import { Avatar } from "@/components/ui/avatar";
import { TaskList } from "@/components/tasks/task-table";
import { ActivityFeed } from "@/components/activity-feed";
import { AttachmentList } from "@/components/attachments";
import { RichEditor } from "@/components/editor/rich-editor";
import { LibraryItemDialog } from "@/components/library/library-item-dialog";
import { LibraryRow } from "@/components/library/library-row";
import { projectStatusPatch } from "./project-views";
import { AddCoverButton, ProjectCover } from "./project-cover";
import { NextStepCallout, TimelineStepper, useTimeline } from "./project-timeline";
import { usePageAdd, useQuickAdd } from "@/components/shell/quick-add";
import { ProjectInvoices } from "./project-invoices";
import { ProjectTasks } from "./project-tasks";
import { TaskStatusesDialog } from "./project-statuses";
import { useConfirm } from "@/components/ui/confirm";

type Tab = "overview" | "tasks" | "invoices" | "files" | "links" | "notes" | "activity";
const ICONS = ["📁", "🧭", "🪶", "🫙", "🟠", "⚙️", "📓", "🔤", "🎨", "📐", "🖼️", "🎬", "📦", "🌱", "✳️", "🔶", "🧪", "💡"];

export function ProjectDetail({ id }: { id: string }) {
  const { data, update, remove, status } = useWorkspace();
  const ask = useConfirm();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = (params.get("tab") as Tab) || "overview";
  const project = data.projects.find((p) => p.id === id);
  const { setAnchor: moreAnchorRef, ...more } = usePopover();
  const { setAnchor: iconPopAnchorRef, ...iconPop } = usePopover();
  const [description, setDescription] = useState<string | null>(null);
  const [statusesOpen, setStatusesOpen] = useState(false);
  // Layout option 2 (details on the right) — per device, so each teammate can try it.
  const [layout, setLayout] = usePref<"stacked" | "split">("project-layout", "stacked");
  const split = layout === "split";
  // Shift+A: a task in this project, in its current milestone.
  const quick = useQuickAdd();
  usePageAdd("New task", () => quick.openTask({ project_id: id }), !!project);

  const tasks = useMemo(() => sortTasks(data.tasks.filter((t) => t.project_id === id)), [data.tasks, id]);
  const files = useMemo(() => data.attachments.filter((a) => a.project_id === id), [data.attachments, id]);
  const links = useMemo(() => data.library_items.filter((l) => l.project_id === id), [data.library_items, id]);
  const activity = useMemo(() => data.activity_log.filter((a) => a.project_id === id), [data.activity_log, id]);
  const invoiceCount = useMemo(() => data.invoices.filter((i) => i.project_id === id).length, [data.invoices, id]);

  const Icon = NAV_ICONS.projects!;
  if (status === "ready" && !project)
    return (
      <Page crumbs={[{ label: "Projects", href: "/projects", icon: <Icon className="size-4" /> }]}>
        <EmptyState title="Project not found" description="It may have been deleted." action={<Link href="/projects" className="text-accent">Back to projects</Link>} />
      </Page>
    );

  const set = (patch: Partial<Project>) => project && void update("projects", project.id, patch);
  const prog = projectProgress(id, data.tasks);
  const setTab = (t: Tab) => router.replace(`${pathname}${t === "overview" ? "" : `?tab=${t}`}`, { scroll: false });

  return (
    <Page
      banner={project?.cover ? <ProjectCover project={project} /> : undefined}
      crumbs={[
        { label: "Projects", href: "/projects", icon: <Icon className="size-4" /> },
        { label: project?.name ?? "…", icon: <span>{project?.icon}</span> },
      ]}
      actions={
        project && (
          <>
            <span className="mr-1 hidden text-[13px] text-fg-3 sm:inline">Edited {timeAgo(project.updated_at)}</span>
            <LayoutToggle split={split} onChange={(v) => setLayout(v ? "split" : "stacked")} />
            <IconButton ref={moreAnchorRef} label="More" onClick={more.toggle} size="md">
              <Ellipsis className="size-4" />
            </IconButton>
            <Popover open={more.open} onClose={more.close} anchor={more.anchor} align="end" width={220}>
              <MenuList>
                <MenuItem
                  icon={<ListChecks className="size-4" />}
                  onSelect={() => {
                    more.close();
                    setStatusesOpen(true);
                  }}
                >
                  Task statuses…
                </MenuItem>
                <MenuItem
                  icon={<Archive className="size-4" />}
                  onSelect={() => {
                    set(projectStatusPatch(project.status === "archived" ? "active" : "archived"));
                    more.close();
                  }}
                >
                  {project.status === "archived" ? "Unarchive" : "Archive"}
                </MenuItem>
                <MenuDivider />
                <MenuItem
                  danger
                  icon={<Trash2 className="size-4" />}
                  onSelect={() => {
                    more.close();
                    void ask({ title: `Delete “${project.name}”?`, description: "Its tasks, milestones, invoices and files are deleted too. This can’t be undone.", confirmLabel: "Delete project" }).then((ok) => {
                      if (!ok) return;
                      void remove("projects", project.id);
                      router.push("/projects");
                    });
                  }}
                >
                  Delete project
                </MenuItem>
              </MenuList>
            </Popover>
          </>
        )
      }
    >
      {project && (
        <div className={cn(split && "lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-x-10 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-x-14")}>
          <div className="min-w-0 lg:col-start-1">
          <div className={cn("group/head flex items-end gap-2", project.cover && "relative z-[1] -mt-[76px]")}>
            <button
              ref={iconPopAnchorRef}
              type="button"
              onClick={iconPop.toggle}
              className={cn("-ml-1 mb-1 flex size-[72px] items-center justify-center rounded-lg text-[56px] leading-none hover:bg-hover", project.cover && "hover:bg-bg/60")}
              aria-label="Change icon"
            >
              {project.icon ?? "📁"}
            </button>
            {!project.cover && <AddCoverButton project={project} />}
          </div>
          <Popover open={iconPop.open} onClose={iconPop.close} anchor={iconPop.anchor} width={300}>
            <div className="grid grid-cols-8 gap-0.5 p-2">
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    set({ icon: i });
                    iconPop.close();
                  }}
                  className="flex size-8 items-center justify-center rounded-md text-[18px] hover:bg-hover"
                >
                  {i}
                </button>
              ))}
            </div>
          </Popover>
          <EditableText
            value={project.name}
            onCommit={(name) => name && set({ name })}
            placeholder="Untitled project"
            multiline
            className="text-[32px] font-bold leading-tight tracking-[-0.01em] sm:text-[40px]"
          />

          {!split && (
            <div className="mt-4">
              <ProjectProperties project={project} />
            </div>
          )}
          </div>

          {/* Option 2: the properties sit in a panel on the right (stacked under the title on small screens). */}
          {split && (
            <aside className="mt-5 lg:sticky lg:top-14 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:max-h-[calc(100dvh-4.5rem)] lg:self-start lg:overflow-y-auto">
              <div className="rounded-lg px-2 pb-2 pt-3 shadow-[inset_0_0_0_1px_var(--border)]">
                <div className="mb-1.5 px-1.5 text-[12px] font-medium text-fg-2">Details</div>
                <ProjectProperties project={project} narrow />
              </div>
            </aside>
          )}

          <div className="min-w-0 lg:col-start-1">
          <NextStepCallout project={project} onOpenTimeline={() => setTab("tasks")} onComplete={() => set(projectStatusPatch("completed"))} />

          <AutoTextarea
            value={description ?? project.description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              if (description != null && description !== (project.description ?? "")) set({ description: description || null });
              setDescription(null);
            }}
            placeholder="Add a short description…"
            className="mt-4 text-[16px] leading-relaxed"
          />

          <div className="mt-8">
            <UnderlineTabs<Tab>
              value={tab}
              onChange={setTab}
              items={[
                { value: "overview", label: "Overview" },
                { value: "tasks", label: "Timeline", count: tasks.filter(isOpen).length },
                { value: "invoices", label: "Invoices", count: invoiceCount },
                { value: "files", label: "Files", count: files.length },
                { value: "links", label: "Links", count: links.length },
                { value: "notes", label: "Notes" },
                { value: "activity", label: "Activity" },
              ]}
            />
            <div className="pt-5">
              {tab === "overview" && <Overview project={project} progress={prog} onOpenTimeline={() => setTab("tasks")} />}
              {tab === "tasks" && <ProjectTasks project={project} onEditStatuses={() => setStatusesOpen(true)} />}
              {tab === "invoices" && <ProjectInvoices project={project} />}
              {tab === "files" && <AttachmentList items={files} owner={{ project_id: project.id }} folder={`projects/${project.id}`} />}
              {tab === "links" && <ProjectLinks projectId={project.id} />}
              {tab === "notes" && <ProjectNotes project={project} />}
              {tab === "activity" && <ActivityFeed entries={activity} limit={50} compact />}
            </div>
          </div>
          </div>
          <TaskStatusesDialog project={project} open={statusesOpen} onClose={() => setStatusesOpen(false)} />
        </div>
      )}
    </Page>
  );
}

/** The project's properties — under the title (classic) or in the right-hand panel (option 2). */
function ProjectProperties({ project, narrow = false }: { project: Project; narrow?: boolean }) {
  const { update } = useWorkspace();
  const people = useProfiles();
  const set = (patch: Partial<Project>) => void update("projects", project.id, patch);
  return (
    <div className="space-y-0.5">
      <PropertyRow narrow={narrow} icon={<CircleDot className="size-4" />} label="Status">
        <OptionField variant="property" options={PROJECT_STATUSES} value={project.status} onChange={(s) => set(projectStatusPatch(s))} />
      </PropertyRow>
      <PropertyRow narrow={narrow} icon={<TagIcon className="size-4" />} label="Type">
        <OptionField variant="property" kind="select" options={PROJECT_TYPES} value={project.type} onChange={(type) => set({ type })} />
      </PropertyRow>
      <PropertyRow narrow={narrow} icon={<Tags className="size-4" />} label="Tags">
        <TagsField variant="property" scope="project" value={project.tags} onChange={(tags) => set({ tags })} />
      </PropertyRow>
      <PropertyRow narrow={narrow} icon={<StickyNote className="size-4" />} label="Note">
        <TextProperty value={project.note} onCommit={(note) => set({ note })} />
      </PropertyRow>
      {hasClient(project) && (
        <>
          <PropertyRow narrow={narrow} icon={<Building2 className="size-4" />} label="Client">
            <TextProperty value={project.client} onCommit={(client) => set({ client })} />
          </PropertyRow>
          <PropertyRow narrow={narrow} icon={<Contact className="size-4" />} label="Client contact">
            <TextProperty value={project.client_contact} onCommit={(client_contact) => set({ client_contact })} />
          </PropertyRow>
        </>
      )}
      <PropertyRow narrow={narrow} icon={<Palette className="size-4" />} label="Creative director">
        <PersonField variant="property" people={people.list} value={project.creative_director_id} onChange={(v) => set({ creative_director_id: v })} />
      </PropertyRow>
      <PropertyRow narrow={narrow} icon={<User className="size-4" />} label="Project lead">
        <PersonField variant="property" people={people.list} value={project.lead_id} onChange={(lead_id) => set({ lead_id })} />
      </PropertyRow>
      <PropertyRow narrow={narrow} icon={<CalendarPlus className="size-4" />} label="Start date">
        <DateField variant="property" value={project.start_date} onChange={(start_date) => set({ start_date })} />
      </PropertyRow>
      <PropertyRow narrow={narrow} icon={<CalendarDays className="size-4" />} label="Deadline">
        <DateField
          variant="property"
          value={project.deadline}
          highlightOverdue={!["completed", "archived"].includes(project.status)}
          onChange={(deadline) => set({ deadline })}
        />
      </PropertyRow>
      <PropertyRow narrow={narrow} icon={<Users className="size-4" />} label="People">
        <MembersProperty projectId={project.id} />
      </PropertyRow>
    </div>
  );
}

/** Two-way switch between layout 1 (details under the title) and layout 2 (details on the right). */
function LayoutToggle({ split, onChange }: { split: boolean; onChange: (split: boolean) => void }) {
  const options = [
    { value: false, label: "Layout 1 — details under the title", icon: <PanelTop className="size-4" /> },
    { value: true, label: "Layout 2 — details on the right", icon: <PanelRight className="size-4" /> },
  ];
  return (
    <div role="radiogroup" aria-label="Project layout" className="mr-1 hidden items-center gap-0.5 rounded-md p-0.5 shadow-[inset_0_0_0_1px_var(--border)] lg:flex">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={split === o.value}
          aria-label={o.label}
          title={o.label}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex h-6 items-center gap-1 rounded-[5px] px-1.5 text-[12px] transition-colors",
            split === o.value ? "bg-active font-medium text-fg" : "text-fg-3 hover:bg-hover hover:text-fg-2",
          )}
        >
          {o.icon}
          {o.value ? "2" : "1"}
        </button>
      ))}
    </div>
  );
}

function TextProperty({ value, onCommit }: { value: string | null; onCommit: (v: string | null) => void }) {
  return (
    <div className="rounded-md px-1.5 py-1 hover:bg-hover focus-within:bg-hover">
      <EditableText value={value ?? ""} placeholder="Empty" onCommit={(v) => onCommit(v || null)} className="text-[14px] placeholder:text-fg-3" />
    </div>
  );
}

function MembersProperty({ projectId }: { projectId: string }) {
  const { data, create, remove } = useWorkspace();
  const { setAnchor: popAnchorRef, ...pop } = usePopover();
  const members = data.project_members.filter((m) => m.project_id === projectId);
  const memberIds = new Set(members.map((m) => m.profile_id));
  return (
    <>
      <button
        ref={popAnchorRef}
        type="button"
        onClick={pop.toggle}
        className="flex min-h-[30px] w-full flex-wrap items-center gap-1.5 rounded-md px-1.5 py-1 text-left hover:bg-hover"
      >
        {members.length === 0 && <span className="text-fg-3">Empty</span>}
        {members.map((m) => {
          const p = data.profiles.find((x) => x.id === m.profile_id);
          return (
            <span key={m.id} className="inline-flex items-center gap-1.5">
              <Avatar profile={p} size={20} />
              <span className="text-[14px]">{p?.full_name}</span>
            </span>
          );
        })}
      </button>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor} width={240}>
        <MenuList>
          {data.profiles.map((p) => (
            <MenuItem
              key={p.id}
              icon={<Avatar profile={p} size={16} />}
              selected={memberIds.has(p.id)}
              onSelect={() => {
                const existing = members.find((m) => m.profile_id === p.id);
                if (existing) void remove("project_members", existing.id);
                else void create("project_members", { project_id: projectId, profile_id: p.id, role: null });
              }}
            >
              {p.full_name}
            </MenuItem>
          ))}
        </MenuList>
      </Popover>
    </>
  );
}

function Overview({
  project,
  progress,
  onOpenTimeline,
}: {
  project: Project;
  progress: { done: number; total: number; ratio: number };
  onOpenTimeline: () => void;
}) {
  const { data } = useWorkspace();
  const people = useProfiles();
  const timeline = useTimeline(project.id);
  const quick = useQuickAdd();
  const open = sortTasks(data.tasks.filter((t) => t.project_id === project.id && isOpen(t)));
  // "Up next" follows the timeline: the current milestone's open tasks first.
  const upNext = timeline.current ? sortTasks(timeline.current.tasks.filter(isOpen)) : open;
  const overdue = open.filter((t) => isOverdue(t)).length;
  const blocked = open.filter((t) => t.status === "blocked").length;
  const byPerson = data.profiles
    .map((p) => ({ p, n: open.filter((t) => isAssignedTo(t, p.id)).length }))
    .filter((x) => x.n > 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-line shadow-[0_0_0_1px_var(--border)] sm:grid-cols-4">
        {[
          { label: "Progress", value: progress.total ? `${Math.round(progress.ratio * 100)}%` : "—", sub: <ProgressBar value={progress.ratio} className="mt-2" tone={progress.ratio === 1 ? "green" : "default"} /> },
          { label: "Open tasks", value: open.length },
          { label: "Overdue", value: overdue, danger: overdue > 0 },
          { label: "Deadline", value: project.deadline ? formatDay(project.deadline) : "—" },
        ].map((s) => (
          <div key={s.label} className="bg-bg px-4 py-3">
            <div className="text-[12px] text-fg-2">{s.label}</div>
            <div className={cn("mt-0.5 text-[20px] font-semibold tabular", s.danger && "text-danger")}>{s.value}</div>
            {s.sub}
          </div>
        ))}
      </div>

      {timeline.steps.length > 0 && (
        <section>
          <SectionHeading>Timeline</SectionHeading>
          <TimelineStepper timeline={timeline} onOpen={onOpenTimeline} />
        </section>
      )}

      <section>
        <SectionHeading>
          {timeline.current ? `Up next · ${timeline.current.milestone.title}` : "Up next"}
          {blocked ? ` · ${blocked} blocked` : ""}
        </SectionHeading>
        {upNext.length ? <TaskList tasks={upNext} limit={6} /> : <EmptyState title={timeline.current ? "No open tasks in this milestone" : "No open tasks"} className="py-6" />}
        <button type="button" onClick={() => quick.openTask({ project_id: project.id })} className="mt-1 flex h-8 w-full items-center gap-1.5 rounded-md px-2 text-[14px] text-fg-3 hover:bg-hover hover:text-fg-2">
          <Plus className="size-4" /> Add task
        </button>
      </section>

      {byPerson.length > 0 && (
        <section>
          <SectionHeading>Who’s on it</SectionHeading>
          <div className="flex flex-wrap gap-4">
            {byPerson.map(({ p, n }) => (
              <span key={p.id} className="inline-flex items-center gap-2 text-[14px]">
                <Avatar profile={p} size={22} /> {p.full_name} <span className="text-fg-3">{n}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeading>Recent activity</SectionHeading>
        <ActivityFeed entries={data.activity_log.filter((a) => a.project_id === project.id)} limit={6} compact />
      </section>
      <p className="text-[12px] text-fg-3">
        Created by {people.get(project.created_by)?.full_name ?? "someone"} · {timeAgo(project.created_at)}
      </p>
    </div>
  );
}

function ProjectLinks({ projectId }: { projectId: string }) {
  const { data } = useWorkspace();
  const [open, setOpen] = useState(false);
  const links = data.library_items.filter((l) => l.project_id === projectId);
  return (
    <div>
      {links.length === 0 ? (
        <EmptyState
          icon={<Link2 className="size-5" />}
          title="No links yet"
          description="Add the project’s Drive folder, briefs and sheets. They also appear in Library."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-3.5" /> Add link
            </Button>
          }
        />
      ) : (
        <>
          {links.map((l) => (
            <LibraryRow key={l.id} item={l} hideProject />
          ))}
          <button type="button" onClick={() => setOpen(true)} className="flex h-8 w-full items-center gap-1.5 rounded-md px-2 text-[14px] text-fg-3 hover:bg-hover hover:text-fg-2">
            <Plus className="size-4" /> Add link
          </button>
        </>
      )}
      <LibraryItemDialog open={open} onClose={() => setOpen(false)} defaults={{ project_id: projectId }} />
    </div>
  );
}

function ProjectNotes({ project }: { project: Project }) {
  const { update, upload } = useWorkspace();
  const { schedule } = useDebouncedSave<string>((html) => void update("projects", project.id, { notes_html: html || null }));
  return (
    <RichEditor
      value={project.notes_html ?? ""}
      onChange={schedule}
      placeholder="Meeting notes, decisions, context… Type # for a heading, - for a list, [ ] for a checklist."
      onUploadImage={async (file) => (await upload(file, `projects/${project.id}/notes`)).url}
    />
  );
}
