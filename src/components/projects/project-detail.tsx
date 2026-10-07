"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArrowRight,
  Building2,
  CalendarDays,
  CalendarPlus,
  CircleDot,
  Contact,
  Ellipsis,
  Link2,
  Palette,
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
import { isOpen, isOverdue, projectProgress, sortTasks } from "@/lib/selectors";
import { useDebouncedSave } from "@/lib/hooks";
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
import { TaskList, TaskTable } from "@/components/tasks/task-table";
import { ActivityFeed } from "@/components/activity-feed";
import { AttachmentList } from "@/components/attachments";
import { RichEditor } from "@/components/editor/rich-editor";
import { LibraryItemDialog } from "@/components/library/library-item-dialog";
import { LibraryRow } from "@/components/library/library-row";
import { projectStatusPatch } from "./project-views";

type Tab = "overview" | "tasks" | "files" | "links" | "notes" | "activity";
const ICONS = ["📁", "🧭", "🪶", "🫙", "🟠", "⚙️", "📓", "🔤", "🎨", "📐", "🖼️", "🎬", "📦", "🌱", "✳️", "🔶", "🧪", "💡"];

export function ProjectDetail({ id }: { id: string }) {
  const { data, update, remove, status } = useWorkspace();
  const people = useProfiles();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = (params.get("tab") as Tab) || "overview";
  const project = data.projects.find((p) => p.id === id);
  const { setAnchor: moreAnchorRef, ...more } = usePopover();
  const { setAnchor: iconPopAnchorRef, ...iconPop } = usePopover();
  const [description, setDescription] = useState<string | null>(null);

  const tasks = useMemo(() => sortTasks(data.tasks.filter((t) => t.project_id === id)), [data.tasks, id]);
  const files = useMemo(() => data.attachments.filter((a) => a.project_id === id), [data.attachments, id]);
  const links = useMemo(() => data.library_items.filter((l) => l.project_id === id), [data.library_items, id]);
  const activity = useMemo(() => data.activity_log.filter((a) => a.project_id === id), [data.activity_log, id]);

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
      width="doc"
      crumbs={[
        { label: "Projects", href: "/projects", icon: <Icon className="size-4" /> },
        { label: project?.name ?? "…", icon: <span>{project?.icon}</span> },
      ]}
      actions={
        project && (
          <>
            <span className="mr-1 hidden text-[13px] text-fg-3 sm:inline">Edited {timeAgo(project.updated_at)}</span>
            <IconButton ref={moreAnchorRef} label="More" onClick={more.toggle} size="md">
              <Ellipsis className="size-4" />
            </IconButton>
            <Popover open={more.open} onClose={more.close} anchor={more.anchor} align="end" width={220}>
              <MenuList>
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
                    if (confirm(`Delete “${project.name}” and its tasks? This cannot be undone.`)) {
                      void remove("projects", project.id);
                      router.push("/projects");
                    }
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
        <>
          <button
            ref={iconPopAnchorRef}
            type="button"
            onClick={iconPop.toggle}
            className="-ml-1 mb-1 flex size-[72px] items-center justify-center rounded-lg text-[56px] leading-none hover:bg-hover"
            aria-label="Change icon"
          >
            {project.icon ?? "📁"}
          </button>
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

          <div className="mt-4 space-y-0.5">
            <PropertyRow icon={<CircleDot className="size-4" />} label="Status">
              <OptionField variant="property" options={PROJECT_STATUSES} value={project.status} onChange={(s) => set(projectStatusPatch(s))} />
            </PropertyRow>
            <PropertyRow icon={<TagIcon className="size-4" />} label="Type">
              <OptionField variant="property" kind="select" options={PROJECT_TYPES} value={project.type} onChange={(type) => set({ type })} />
            </PropertyRow>
            <PropertyRow icon={<Tags className="size-4" />} label="Tags">
              <TagsField variant="property" scope="project" value={project.tags} onChange={(tags) => set({ tags })} />
            </PropertyRow>
            <PropertyRow icon={<StickyNote className="size-4" />} label="Note">
              <TextProperty value={project.note} onCommit={(note) => set({ note })} />
            </PropertyRow>
            <PropertyRow icon={<Building2 className="size-4" />} label="Client">
              <TextProperty value={project.client} onCommit={(client) => set({ client })} />
            </PropertyRow>
            <PropertyRow icon={<Contact className="size-4" />} label="Client contact">
              <TextProperty value={project.client_contact} onCommit={(client_contact) => set({ client_contact })} />
            </PropertyRow>
            <PropertyRow icon={<Palette className="size-4" />} label="Creative director">
              <PersonField variant="property" people={people.list} value={project.creative_director_id} onChange={(v) => set({ creative_director_id: v })} />
            </PropertyRow>
            <PropertyRow icon={<User className="size-4" />} label="Project lead">
              <PersonField variant="property" people={people.list} value={project.lead_id} onChange={(lead_id) => set({ lead_id })} />
            </PropertyRow>
            <PropertyRow icon={<CalendarPlus className="size-4" />} label="Start date">
              <DateField variant="property" value={project.start_date} onChange={(start_date) => set({ start_date })} />
            </PropertyRow>
            <PropertyRow icon={<CalendarDays className="size-4" />} label="Deadline">
              <DateField
                variant="property"
                value={project.deadline}
                highlightOverdue={!["completed", "archived"].includes(project.status)}
                onChange={(deadline) => set({ deadline })}
              />
            </PropertyRow>
            <PropertyRow icon={<Users className="size-4" />} label="People">
              <MembersProperty projectId={project.id} />
            </PropertyRow>
          </div>

          <NextActionCallout project={project} onCommit={(next_action) => set({ next_action })} />

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
                { value: "tasks", label: "Tasks", count: tasks.filter(isOpen).length },
                { value: "files", label: "Files", count: files.length },
                { value: "links", label: "Links", count: links.length },
                { value: "notes", label: "Notes" },
                { value: "activity", label: "Activity" },
              ]}
            />
            <div className="pt-5">
              {tab === "overview" && <Overview project={project} progress={prog} />}
              {tab === "tasks" && <TaskTable tasks={tasks} showProject={false} newTaskDefaults={{ project_id: project.id }} emptyLabel="No tasks yet — add the first one below" />}
              {tab === "files" && <AttachmentList items={files} owner={{ project_id: project.id }} folder={`projects/${project.id}`} />}
              {tab === "links" && <ProjectLinks projectId={project.id} />}
              {tab === "notes" && <ProjectNotes project={project} />}
              {tab === "activity" && <ActivityFeed entries={activity} limit={50} compact />}
            </div>
          </div>
        </>
      )}
    </Page>
  );
}

function TextProperty({ value, onCommit }: { value: string | null; onCommit: (v: string | null) => void }) {
  return (
    <div className="rounded-md px-1.5 py-1 hover:bg-hover focus-within:bg-hover">
      <EditableText value={value ?? ""} placeholder="Empty" onCommit={(v) => onCommit(v || null)} className="text-[14px] placeholder:text-fg-3" />
    </div>
  );
}

function NextActionCallout({ project, onCommit }: { project: Project; onCommit: (v: string | null) => void }) {
  const missing = !project.next_action?.trim() && project.status === "active";
  return (
    <div
      className={cn(
        "mt-5 flex items-start gap-3 rounded-md px-4 py-3",
        missing ? "bg-danger-soft" : "bg-[color-mix(in_srgb,var(--tag-blue-bg)_55%,transparent)]",
      )}
    >
      <ArrowRight className={cn("mt-[3px] size-4 shrink-0", missing ? "text-danger" : "text-[var(--dot-blue)]")} />
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-medium text-fg-2">Next action</div>
        <EditableText
          value={project.next_action ?? ""}
          onCommit={(v) => onCommit(v || null)}
          placeholder="What’s the one next meaningful step?"
          multiline
          className="text-[15px] font-medium leading-snug"
        />
      </div>
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

function Overview({ project, progress }: { project: Project; progress: { done: number; total: number; ratio: number } }) {
  const { data } = useWorkspace();
  const people = useProfiles();
  const open = sortTasks(data.tasks.filter((t) => t.project_id === project.id && isOpen(t)));
  const overdue = open.filter((t) => isOverdue(t)).length;
  const blocked = open.filter((t) => t.status === "blocked").length;
  const byPerson = data.profiles
    .map((p) => ({ p, n: open.filter((t) => t.assignee_id === p.id).length }))
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

      <section>
        <SectionHeading>Up next{blocked ? ` · ${blocked} blocked` : ""}</SectionHeading>
        {open.length ? <TaskList tasks={open} limit={6} /> : <EmptyState title="No open tasks" className="py-6" />}
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
