"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  Building2,
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  Contact,
  Ellipsis,
  History,
  Info,
  Link2,
  NotebookPen,
  Palette,
  Paperclip,
  Plus,
  Tag as TagIcon,
  Trash2,
  User,
  Users,
} from "lucide-react";
import type { Project, ProjectStatus } from "@/directions/d2/lib/types";
import { PROJECT_STATUSES, PROJECT_STATUS_TONE, PROJECT_TYPES, optionFor } from "@/directions/d2/lib/constants";
import { useProfiles, useWorkspace } from "@/directions/d2/lib/store";
import { isOpen, projectProgress, sortTasks } from "@/directions/d2/lib/selectors";
import { useDebouncedSave } from "@/directions/d2/lib/hooks";
import { cn, firstName, formatDay, relativeDays, timeAgo } from "@/directions/d2/lib/utils";
import { Page } from "@/directions/d2/components/shell/page";
import { AutoTextarea, EditableText } from "@/directions/d2/components/ui/input";
import { DateField, OptionField, PersonField, PropertyRow } from "@/directions/d2/components/ui/fields";
import { Popover, usePopover } from "@/directions/d2/components/ui/popover";
import { MenuDivider, MenuItem, MenuList } from "@/directions/d2/components/ui/menu";
import { Avatar } from "@/directions/d2/components/ui/avatar";
import { Card, CircleButton, Eyebrow, Fold, MUTED, Ring, SOFT, TONE } from "@/directions/d2/components/ui/chunk";
import { AddTaskPill, TaskChunkList } from "@/directions/d2/components/tasks/task-chunks";
import { ActivityFeed } from "@/directions/d2/components/activity-feed";
import { AttachmentList } from "@/directions/d2/components/attachments";
import { RichEditor } from "@/directions/d2/components/editor/rich-editor";
import { LibraryItemDialog } from "@/directions/d2/components/library/library-item-dialog";
import { LibraryRow } from "@/directions/d2/components/library/library-row";
import { projectStatusPatch } from "./project-views";

type Section = "details" | "files" | "notes" | "history";
const ICONS = ["📁", "🧭", "🪶", "🫙", "🟠", "⚙️", "📓", "🔤", "🎨", "📐", "🖼️", "🎬", "📦", "🌱", "✳️", "🔶", "🧪", "💡"];

/** Old ?tab= links still land in the right place. */
function sectionFromTab(tab: string | null): Section | null {
  if (tab === "notes") return "notes";
  if (tab === "files" || tab === "links") return "files";
  if (tab === "activity") return "history";
  return null;
}

/**
 * A project reads top to bottom like a card stack: what it is → the next step →
 * the steps → everything else folded away until you ask for it.
 */
export function ProjectDetail({ id }: { id: string }) {
  const { data, update, remove, status } = useWorkspace();
  const router = useRouter();
  const params = useSearchParams();
  const project = data.projects.find((p) => p.id === id);
  const [open, setOpen] = useState<Set<Section>>(() => {
    const s = sectionFromTab(params.get("tab"));
    return new Set(s ? [s] : []);
  });
  const [linkOpen, setLinkOpen] = useState(false);
  const [addingTaskKey, setAddingTaskKey] = useState(0);
  const tasksRef = useRef<HTMLDivElement>(null);
  const { setAnchor: moreAnchorRef, ...more } = usePopover();

  const files = useMemo(() => data.attachments.filter((a) => a.project_id === id), [data.attachments, id]);
  const links = useMemo(() => data.library_items.filter((l) => l.project_id === id), [data.library_items, id]);
  const activity = useMemo(() => data.activity_log.filter((a) => a.project_id === id), [data.activity_log, id]);

  if (status === "ready" && !project)
    return (
      <Page crumbs={[{ label: "Projects", href: "/projects" }, { label: "Not found" }]} width="doc">
        <Card tone="cream" className="items-center py-14 text-center">
          <div className="text-[22px] font-medium">Project not found</div>
          <div className="mt-1 text-[14px] text-[var(--on-chunk-2)]">It may have been deleted.</div>
          <Link href="/projects" className="mt-5 inline-flex h-10 items-center rounded-full bg-[#151515] px-5 text-[14px] text-[#f7f3ea]">
            Back to projects
          </Link>
        </Card>
      </Page>
    );

  const set = (patch: Partial<Project>) => project && void update("projects", project.id, patch);
  const toggle = (s: Section, value?: boolean) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (value ?? !next.has(s)) next.add(s);
      else next.delete(s);
      return next;
    });
  const reveal = (s: Section) => {
    toggle(s, true);
    requestAnimationFrame(() => document.getElementById(`section-${s}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <Page
      width="doc"
      crumbs={[
        { label: "Projects", href: "/projects" },
        { label: project?.name ?? "…" },
      ]}
      actions={
        project && (
          <>
            <span className="mr-1 hidden text-[13px] text-fg-3 sm:inline">Edited {timeAgo(project.updated_at)}</span>
            <CircleButton ref={moreAnchorRef} label="More" size={44} onClick={more.toggle}>
              <Ellipsis />
            </CircleButton>
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
        <div className="flex flex-col gap-3">
          <Hero
            project={project}
            onAddTask={() => {
              setAddingTaskKey((k) => k + 1);
              requestAnimationFrame(() => tasksRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
            }}
            onAddLink={() => setLinkOpen(true)}
            onNotes={() => reveal("notes")}
            onFiles={() => reveal("files")}
          />
          <NextStep project={project} onCommit={(next_action) => set({ next_action })} />
          <div ref={tasksRef} className="scroll-mt-24">
            <Steps project={project} addingKey={addingTaskKey} />
          </div>

          <Fold
            id="section-details"
            icon={<Info />}
            title="Details"
            summary={<DetailsSummary project={project} />}
            open={open.has("details")}
            onOpenChange={(v) => toggle("details", v)}
          >
            <Details project={project} set={set} />
          </Fold>

          <Fold
            id="section-files"
            icon={<Paperclip />}
            title="Files & links"
            summary={files.length + links.length ? [links.length && `${links.length} links`, files.length && `${files.length} files`].filter(Boolean).join(" · ") : "Drive folder, briefs, uploads"}
            open={open.has("files")}
            onOpenChange={(v) => toggle("files", v)}
          >
            <div className="grid gap-5">
              <div>
                <div className="mb-2 text-[13px] text-fg-2">Links</div>
                {links.map((l) => (
                  <LibraryRow key={l.id} item={l} hideProject />
                ))}
                <button
                  type="button"
                  onClick={() => setLinkOpen(true)}
                  className="flex h-11 w-full items-center gap-2 rounded-full px-3 text-[14px] text-fg-2 hover:bg-hover hover:text-fg"
                >
                  <Link2 className="size-4" /> Add a link (Drive, Docs, anything)
                </button>
              </div>
              <div>
                <div className="mb-2 text-[13px] text-fg-2">Uploaded files</div>
                <AttachmentList items={files} owner={{ project_id: project.id }} folder={`projects/${project.id}`} compact />
              </div>
            </div>
          </Fold>

          <Fold
            id="section-notes"
            tone="cream"
            icon={<NotebookPen />}
            title="Notes"
            summary={notesPreview(project.notes_html) || "Meeting notes, decisions, context"}
            open={open.has("notes")}
            onOpenChange={(v) => toggle("notes", v)}
          >
            <ProjectNotes project={project} />
          </Fold>

          <Fold
            id="section-history"
            icon={<History />}
            title="History"
            summary={activity[0] ? `Last change ${timeAgo(activity[0].created_at)}` : "No changes yet"}
            open={open.has("history")}
            onOpenChange={(v) => toggle("history", v)}
          >
            <ActivityFeed entries={activity} limit={30} compact />
          </Fold>

          <LibraryItemDialog open={linkOpen} onClose={() => setLinkOpen(false)} defaults={{ project_id: project.id }} />
        </div>
      )}
    </Page>
  );
}

function notesPreview(html: string | null) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 90);
}

/* ——— Hero ——— */

function Hero({
  project,
  onAddTask,
  onAddLink,
  onNotes,
  onFiles,
}: {
  project: Project;
  onAddTask: () => void;
  onAddLink: () => void;
  onNotes: () => void;
  onFiles: () => void;
}) {
  const { data, update } = useWorkspace();
  const tone = PROJECT_STATUS_TONE[project.status];
  const prog = projectProgress(project.id, data.tasks);
  const [description, setDescription] = useState<string | null>(null);
  const { setAnchor: iconAnchorRef, ...iconPop } = usePopover();
  const set = (patch: Partial<Project>) => void update("projects", project.id, patch);
  const deadline = project.deadline && !["completed", "archived"].includes(project.status) ? relativeDays(project.deadline) : null;
  const meta = [optionFor(PROJECT_TYPES, project.type)?.label, project.client, deadline && `Due ${deadline.toLowerCase()}`].filter(Boolean);

  return (
    <section className={cn("rounded-[32px] p-6 transition-colors duration-300 sm:p-8", TONE[tone])}>
      <div className="flex items-start justify-between gap-3">
        <button
          ref={iconAnchorRef}
          type="button"
          onClick={iconPop.toggle}
          className={cn("flex size-16 items-center justify-center rounded-full text-[32px] leading-none transition-transform active:scale-95", SOFT[tone])}
          aria-label="Change icon"
        >
          {project.icon ?? "📁"}
        </button>
        <Popover open={iconPop.open} onClose={iconPop.close} anchor={iconPop.anchor} width={300}>
          <div className="grid grid-cols-6 gap-1 p-3">
            {ICONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  set({ icon: i });
                  iconPop.close();
                }}
                className="flex size-10 items-center justify-center rounded-full text-[20px] hover:bg-hover"
              >
                {i}
              </button>
            ))}
          </div>
        </Popover>
        <StatusPicker project={project} />
      </div>

      <EditableText
        value={project.name}
        onCommit={(name) => name && set({ name })}
        placeholder="Untitled project"
        multiline
        className="mt-6 text-[36px] font-medium leading-[1.05] tracking-[-0.035em] placeholder:opacity-40 sm:text-[48px]"
      />
      {meta.length > 0 && <div className={cn("mt-2 text-[14px]", MUTED[tone])}>{meta.join(" · ")}</div>}
      <AutoTextarea
        value={description ?? project.description ?? ""}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={() => {
          if (description != null && description !== (project.description ?? "")) set({ description: description || null });
          setDescription(null);
        }}
        placeholder="Add a short description — what is this project, in one or two sentences?"
        className="mt-4 max-w-[600px] text-[15px] leading-relaxed placeholder:text-current placeholder:opacity-45"
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <CircleButton label="Add a task" tone="black" size={48} onClick={onAddTask}>
          <Plus />
        </CircleButton>
        <CircleButton label="Add a link" tone="soft" size={48} onClick={onAddLink}>
          <Link2 />
        </CircleButton>
        <CircleButton label="Open notes" tone="soft" size={48} onClick={onNotes}>
          <NotebookPen />
        </CircleButton>
        <CircleButton label="Files" tone="soft" size={48} onClick={onFiles}>
          <Paperclip />
        </CircleButton>
        {prog.total > 0 && (
          <span className="ml-auto flex items-center gap-3">
            <span className={cn("text-right text-[13px] leading-tight", MUTED[tone])}>
              <span className="block text-[15px] font-medium text-current">
                {prog.done} of {prog.total}
              </span>
              steps done
            </span>
            <Ring value={prog.ratio} size={48} stroke={4.5}>
              {Math.round(prog.ratio * 100)}%
            </Ring>
          </span>
        )}
      </div>
    </section>
  );
}

function StatusPicker({ project }: { project: Project }) {
  const { update } = useWorkspace();
  const { setAnchor, ...pop } = usePopover();
  const current = optionFor(PROJECT_STATUSES, project.status)!;
  return (
    <>
      <button
        ref={setAnchor}
        type="button"
        onClick={pop.toggle}
        className="flex h-10 items-center gap-2 rounded-full bg-[var(--chunk-soft)] pl-4 pr-3 text-[14px] transition-colors hover:bg-[var(--chunk-soft-2)]"
      >
        {current.label}
        <ChevronDown className="size-4 opacity-60" />
      </button>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor} align="end" width={220}>
        <MenuList>
          {PROJECT_STATUSES.map((s) => (
            <MenuItem
              key={s.value}
              selected={s.value === project.status}
              icon={<span className={cn("size-3 rounded-full", TONE[PROJECT_STATUS_TONE[s.value as ProjectStatus]], "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]")} />}
              onSelect={() => {
                void update("projects", project.id, projectStatusPatch(s.value));
                pop.close();
              }}
            >
              {s.label}
            </MenuItem>
          ))}
        </MenuList>
      </Popover>
    </>
  );
}

/* ——— Next step ——— */

function NextStep({ project, onCommit }: { project: Project; onCommit: (v: string | null) => void }) {
  const missing = !project.next_action?.trim() && project.status === "active";
  return (
    <Card tone={missing ? "coral" : "ink"} className="gap-1 p-6">
      <Eyebrow>{missing ? "What’s the next step?" : "Next step"}</Eyebrow>
      <EditableText
        value={project.next_action ?? ""}
        onCommit={(v) => onCommit(v || null)}
        placeholder="Write the one next thing that moves this forward"
        multiline
        className="text-[22px] font-medium leading-snug tracking-[-0.015em] placeholder:text-current placeholder:opacity-45"
      />
    </Card>
  );
}

/* ——— Steps (tasks) ——— */

function Steps({ project, addingKey }: { project: Project; addingKey: number }) {
  const { data, create, me } = useWorkspace();
  const [showDone, setShowDone] = useState(false);
  const tasks = useMemo(() => sortTasks(data.tasks.filter((t) => t.project_id === project.id)), [data.tasks, project.id]);
  const open = tasks.filter(isOpen);
  const done = tasks.filter((t) => t.status === "done");
  return (
    <Card tone="surface" className="p-6">
      <div className="mb-4 flex items-baseline gap-2">
        <h2 className="text-[22px] font-medium tracking-[-0.02em]">Steps</h2>
        <span className="text-[14px] text-fg-2">{open.length ? `${open.length} to do` : tasks.length ? "all done" : "none yet"}</span>
      </div>
      <TaskChunkList tasks={open} limit={6} showProject={false} showAssignee />
      <div className={cn(open.length > 0 && "mt-2")}>
        <AddTaskPill
          key={addingKey}
          startEditing={addingKey > 0}
          label="Add a step"
          onCreate={(title) =>
            void create("tasks", {
              title,
              description: null,
              project_id: project.id,
              assignee_id: me?.id ?? null,
              status: "todo",
              priority: "medium",
              due_date: null,
              created_by: me?.id ?? null,
              completed_at: null,
            })
          }
        />
      </div>
      {done.length > 0 && (
        <div className="mt-3">
          <button type="button" onClick={() => setShowDone((s) => !s)} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] text-fg-2 hover:bg-hover">
            <ChevronDown className={cn("size-4 transition-transform", showDone && "rotate-180")} />
            {done.length} done
          </button>
          {showDone && (
            <div className="anim-fade mt-2">
              <TaskChunkList tasks={done} showProject={false} showAssignee />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ——— Details ——— */

function DetailsSummary({ project }: { project: Project }) {
  const people = useProfiles();
  const lead = people.get(project.lead_id);
  return (
    <>
      {[lead && `${firstName(lead.full_name)} leads`, project.deadline && `Due ${formatDay(project.deadline)}`, project.client].filter(Boolean).join(" · ") ||
        "Client, people and dates"}
    </>
  );
}

function Details({ project, set }: { project: Project; set: (p: Partial<Project>) => void }) {
  const people = useProfiles();
  return (
    <div className="space-y-0.5">
      <PropertyRow icon={<TagIcon className="size-4" />} label="Kind">
        <OptionField variant="property" kind="select" options={PROJECT_TYPES} value={project.type} onChange={(type) => set({ type })} />
      </PropertyRow>
      <PropertyRow icon={<Building2 className="size-4" />} label="Client">
        <TextProperty value={project.client} onCommit={(client) => set({ client })} />
      </PropertyRow>
      <PropertyRow icon={<Contact className="size-4" />} label="Client contact">
        <TextProperty value={project.client_contact} onCommit={(client_contact) => set({ client_contact })} />
      </PropertyRow>
      <PropertyRow icon={<User className="size-4" />} label="Lead">
        <PersonField variant="property" people={people.list} value={project.lead_id} onChange={(lead_id) => set({ lead_id })} />
      </PropertyRow>
      <PropertyRow icon={<Palette className="size-4" />} label="Creative director">
        <PersonField variant="property" people={people.list} value={project.creative_director_id} onChange={(v) => set({ creative_director_id: v })} />
      </PropertyRow>
      <PropertyRow icon={<Users className="size-4" />} label="People">
        <MembersProperty projectId={project.id} />
      </PropertyRow>
      <PropertyRow icon={<CalendarPlus className="size-4" />} label="Started">
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
      <p className="px-1 pt-3 text-[12px] text-fg-3">
        Created by {people.get(project.created_by)?.full_name ?? "someone"} · {timeAgo(project.created_at)}
      </p>
    </div>
  );
}

function TextProperty({ value, onCommit }: { value: string | null; onCommit: (v: string | null) => void }) {
  return (
    <div className="flex min-h-10 items-center rounded-full px-3 hover:bg-hover focus-within:bg-hover">
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
        className="flex min-h-10 w-full flex-wrap items-center gap-2 rounded-full px-3 py-1 text-left hover:bg-hover"
      >
        {members.length === 0 && <span className="text-fg-3">Empty</span>}
        {members.map((m) => {
          const p = data.profiles.find((x) => x.id === m.profile_id);
          return (
            <span key={m.id} className="inline-flex items-center gap-1.5">
              <Avatar profile={p} size={22} />
              <span className="text-[14px]">{firstName(p?.full_name)}</span>
            </span>
          );
        })}
      </button>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor} width={240}>
        <MenuList>
          {data.profiles.map((p) => (
            <MenuItem
              key={p.id}
              icon={<Avatar profile={p} size={18} />}
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

function ProjectNotes({ project }: { project: Project }) {
  const { update, upload } = useWorkspace();
  const { schedule } = useDebouncedSave<string>((html) => void update("projects", project.id, { notes_html: html || null }));
  return (
    <div className="[&_.prose-notion]:text-current">
      <RichEditor
        value={project.notes_html ?? ""}
        onChange={schedule}
        placeholder="Meeting notes, decisions, context… Type # for a heading, - for a list, [ ] for a checklist."
        onUploadImage={async (file) => (await upload(file, `projects/${project.id}/notes`)).url}
      />
    </div>
  );
}
