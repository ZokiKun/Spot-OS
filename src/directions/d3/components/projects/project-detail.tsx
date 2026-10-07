"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Archive, ChevronDown, Ellipsis, Link2, Plus, Trash2 } from "lucide-react";
import type { Project, ProjectStatus } from "@/directions/d3/lib/types";
import { PROJECT_TYPES, optionFor } from "@/directions/d3/lib/constants";
import { useProfiles, useWorkspace } from "@/directions/d3/lib/store";
import { isOpen, isOverdue, projectProgress, sortTasks } from "@/directions/d3/lib/selectors";
import { useDebouncedSave } from "@/directions/d3/lib/hooks";
import { cn, timeAgo } from "@/directions/d3/lib/utils";
import { Page } from "@/directions/d3/components/shell/page";
import { EditableText, AutoTextarea } from "@/directions/d3/components/ui/input";
import { DateField, OptionField, PersonField, PropertyRow } from "@/directions/d3/components/ui/fields";
import { UnderlineTabs } from "@/directions/d3/components/ui/tabs";
import { Button, IconButton } from "@/directions/d3/components/ui/button";
import { Popover, usePopover } from "@/directions/d3/components/ui/popover";
import { MenuDivider, MenuItem, MenuList } from "@/directions/d3/components/ui/menu";
import { ActionLink, Card, EmptyState, IconTile, ProgressBar, SectionHeading } from "@/directions/d3/components/ui/misc";
import { Banner, bannerButton } from "@/directions/d3/components/ui/banner";
import { Avatar } from "@/directions/d3/components/ui/avatar";
import { TaskTable } from "@/directions/d3/components/tasks/task-table";
import { ActivityFeed } from "@/directions/d3/components/activity-feed";
import { AttachmentList } from "@/directions/d3/components/attachments";
import { RichEditor } from "@/directions/d3/components/editor/rich-editor";
import { LibraryItemDialog } from "@/directions/d3/components/library/library-item-dialog";
import { LibraryRow } from "@/directions/d3/components/library/library-row";
import { RailCard } from "@/directions/d3/components/home/rail-cards";
import { projectStatusPatch } from "./project-views";
import { PROJECT_STATE_LABEL, PROJECT_TONE, deadlineText } from "./project-card";

type Tab = "tasks" | "notes" | "files" | "about";
const LEGACY_TAB: Record<string, Tab> = { overview: "tasks", links: "files", activity: "about" };
const ICONS = ["📁", "🧭", "🪶", "🫙", "🟠", "⚙️", "📓", "🔤", "🎨", "📐", "🖼️", "🎬", "📦", "🌱", "✳️", "🔶", "🧪", "💡"];
const STATUS_ORDER: ProjectStatus[] = ["backlog", "active", "blocked", "review", "completed", "archived"];

export function ProjectDetail({ id }: { id: string }) {
  const { data, update, remove, status } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get("tab") ?? "tasks";
  const tab: Tab = LEGACY_TAB[raw] ?? (raw as Tab);
  const project = data.projects.find((p) => p.id === id);
  const { setAnchor: moreAnchorRef, ...more } = usePopover();
  const { setAnchor: iconAnchorRef, ...iconPop } = usePopover();
  const { setAnchor: statusAnchorRef, ...statusPop } = usePopover();

  const tasks = useMemo(() => sortTasks(data.tasks.filter((t) => t.project_id === id)), [data.tasks, id]);
  const files = useMemo(() => data.attachments.filter((a) => a.project_id === id), [data.attachments, id]);
  const links = useMemo(() => data.library_items.filter((l) => l.project_id === id), [data.library_items, id]);

  if (status === "ready" && !project)
    return (
      <Page crumbs={[{ label: "Projects", href: "/projects" }, { label: "Not found" }]}>
        <Card>
          <EmptyState mood="worried" title="Project not found" description="It may have been deleted." action={<ActionLink href="/projects">Back to projects</ActionLink>} />
        </Card>
      </Page>
    );

  const set = (patch: Partial<Project>) => project && void update("projects", project.id, patch);
  const setTab = (t: Tab) => router.replace(`${pathname}${t === "tasks" ? "" : `?tab=${t}`}`, { scroll: false });
  const type = project ? optionFor(PROJECT_TYPES, project.type) : undefined;

  return (
    <Page
      crumbs={[{ label: "Projects", href: "/projects" }, { label: project?.name ?? "…" }]}
      aside={project && <ProjectRail project={project} />}
      actions={
        project && (
          <>
            <span className="hidden text-[13px] font-bold text-fg-3 sm:inline">Edited {timeAgo(project.updated_at)}</span>
            <IconButton ref={moreAnchorRef} label="More" onClick={more.toggle} size="md">
              <Ellipsis className="size-5" strokeWidth={3} />
            </IconButton>
            <Popover open={more.open} onClose={more.close} anchor={more.anchor} align="end" width={230}>
              <MenuList>
                <MenuItem
                  icon={<Archive className="size-4" strokeWidth={2.5} />}
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
                  icon={<Trash2 className="size-4" strokeWidth={2.5} />}
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
          <Banner
            tone={PROJECT_TONE[project.status]}
            overline={[project.client, type?.label].filter(Boolean).join(" · ") || "Project"}
            title={
              <EditableText
                value={project.name}
                onCommit={(name) => name && set({ name })}
                placeholder="Untitled project"
                multiline
                className="text-white placeholder:text-white/60"
              />
            }
            art={
              <>
                <button
                  ref={iconAnchorRef}
                  type="button"
                  onClick={iconPop.toggle}
                  aria-label="Change icon"
                  className="flex size-[100px] items-center justify-center rounded-full text-[60px] leading-none transition-transform hover:scale-105"
                >
                  {project.icon ?? "📁"}
                </button>
                <Popover open={iconPop.open} onClose={iconPop.close} anchor={iconPop.anchor} width={300} align="end">
                  <div className="grid grid-cols-6 gap-1 p-2">
                    {ICONS.map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          set({ icon: i });
                          iconPop.close();
                        }}
                        className="flex size-11 items-center justify-center rounded-xl text-[22px] hover:bg-hover"
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                </Popover>
              </>
            }
            action={
              <>
                <button ref={statusAnchorRef} type="button" onClick={statusPop.toggle} className={bannerButton}>
                  {PROJECT_STATE_LABEL[project.status]}
                  <ChevronDown className="size-4" strokeWidth={3} />
                </button>
                <Popover open={statusPop.open} onClose={statusPop.close} anchor={statusPop.anchor} width={230}>
                  <MenuList>
                    {STATUS_ORDER.map((s) => (
                      <MenuItem
                        key={s}
                        selected={project.status === s}
                        icon={<span className={cn("size-3 rounded-full", `dot-${PROJECT_TONE[s]}`)} />}
                        onSelect={() => {
                          set(projectStatusPatch(s));
                          statusPop.close();
                        }}
                      >
                        {PROJECT_STATE_LABEL[s]}
                      </MenuItem>
                    ))}
                  </MenuList>
                </Popover>
              </>
            }
          />

          <NextStepCard project={project} onCommit={(next_action) => set({ next_action })} />
          <ProgressCard project={project} />

          <div className="mt-8">
            <UnderlineTabs<Tab>
              value={tab}
              onChange={setTab}
              items={[
                { value: "tasks", label: "Tasks", count: tasks.filter(isOpen).length },
                { value: "notes", label: "Notes" },
                { value: "files", label: "Files", count: files.length + links.length },
                { value: "about", label: "About" },
              ]}
            />
            <div className="pt-6">
              {tab === "tasks" && (
                <TaskTable tasks={tasks} showProject={false} newTaskDefaults={{ project_id: project.id }} emptyLabel="No tasks yet — add the first one above" />
              )}
              {tab === "notes" && <ProjectNotes project={project} />}
              {tab === "files" && (
                <div className="space-y-8">
                  <section>
                    <SectionHeading size="md">Links</SectionHeading>
                    <ProjectLinks projectId={project.id} />
                  </section>
                  <section>
                    <SectionHeading size="md">Uploads</SectionHeading>
                    <AttachmentList items={files} owner={{ project_id: project.id }} folder={`projects/${project.id}`} />
                  </section>
                </div>
              )}
              {tab === "about" && <About project={project} />}
            </div>
          </div>
        </>
      )}
    </Page>
  );
}

function NextStepCard({ project, onCommit }: { project: Project; onCommit: (v: string | null) => void }) {
  const missing = !project.next_action?.trim();
  const closed = project.status === "completed" || project.status === "archived";
  if (closed && missing) return null;
  return (
    <div className={cn("mt-5 flex items-start gap-4 rounded-2xl border-2 px-5 py-4", missing ? "border-yellow bg-yellow-soft" : "border-line bg-bg")}>
      <IconTile tone={missing ? "yellow" : "blue"} size={48}>
        👉
      </IconTile>
      <div className="min-w-0 flex-1">
        <div className={cn("label-caps text-[11.5px]", missing ? "text-yellow-edge" : "text-blue")}>Next step</div>
        <EditableText
          value={project.next_action ?? ""}
          onCommit={(v) => onCommit(v || null)}
          placeholder="What’s the one next step? Click to write it."
          multiline
          className="mt-0.5 text-[18px] font-extrabold leading-snug placeholder:text-fg-3"
        />
        {missing && <p className="mt-1 text-[13px] font-semibold text-fg-2">Projects move faster with one clear next step.</p>}
      </div>
    </div>
  );
}

function ProgressCard({ project }: { project: Project }) {
  const { data } = useWorkspace();
  const prog = projectProgress(project.id, data.tasks);
  const open = data.tasks.filter((t) => t.project_id === project.id && isOpen(t));
  const late = open.filter((t) => isOverdue(t)).length;
  const stuck = open.filter((t) => t.status === "blocked").length;
  return (
    <Card className="mt-4 px-5 py-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="flex-1 text-[17px] font-extrabold">
          {prog.total ? `${prog.done} of ${prog.total} tasks done` : "No tasks yet"}
        </span>
        {late > 0 && <span className="label-caps rounded-lg bg-red-soft px-2 text-[11px] leading-6 text-red-edge">{late} late</span>}
        {stuck > 0 && <span className="label-caps rounded-lg bg-orange-soft px-2 text-[11px] leading-6 text-orange-edge">{stuck} stuck</span>}
      </div>
      <ProgressBar value={prog.ratio} tone={prog.total && prog.ratio === 1 ? "green" : "yellow"} size="lg" />
    </Card>
  );
}

/** Rail: the three facts people look for most, editable in place. */
function ProjectRail({ project }: { project: Project }) {
  const { data, update } = useWorkspace();
  const people = useProfiles();
  const set = (patch: Partial<Project>) => void update("projects", project.id, patch);
  const due = deadlineText(project);
  return (
    <>
      <RailCard title="Key facts">
        <div className="space-y-2.5 pt-1">
          <PropertyRow label="Lead">
            <PersonField variant="property" people={people.list} value={project.lead_id} onChange={(lead_id) => set({ lead_id })} />
          </PropertyRow>
          <PropertyRow label="Deadline">
            <div className="flex items-center">
              <div className="min-w-0 flex-1">
                <DateField
                  variant="property"
                  value={project.deadline}
                  highlightOverdue={!["completed", "archived"].includes(project.status)}
                  onChange={(deadline) => set({ deadline })}
                  placeholder="Pick a day"
                />
              </div>
              {due && !/^Due [A-Z]/.test(due.text) && <span className={cn("shrink-0 pr-2 text-[12.5px] font-extrabold", due.tone)}>{due.text.replace(/^Due /, "")}</span>}
            </div>
          </PropertyRow>
          <PropertyRow label="People">
            <MembersProperty projectId={project.id} />
          </PropertyRow>
        </div>
      </RailCard>
      <RailCard title="Latest" action={<ActionLink href={`/projects/${project.id}?tab=about`}>All</ActionLink>}>
        <ActivityFeed entries={data.activity_log.filter((a) => a.project_id === project.id)} limit={4} compact />
      </RailCard>
    </>
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
        className="flex min-h-9 w-full flex-wrap items-center gap-2 rounded-xl px-1.5 py-1 text-left hover:bg-hover"
      >
        {members.length === 0 && <span className="font-bold text-fg-3">Add people</span>}
        {members.map((m) => {
          const p = data.profiles.find((x) => x.id === m.profile_id);
          return (
            <span key={m.id} className="inline-flex items-center gap-1.5 text-[14px] font-bold">
              <Avatar profile={p} size={24} />
              {p?.full_name.split(" ")[0]}
            </span>
          );
        })}
      </button>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor} width={240}>
        <MenuList>
          {data.profiles.map((p) => (
            <MenuItem
              key={p.id}
              icon={<Avatar profile={p} size={22} />}
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

/** Everything else about the project, in one calm place. */
function About({ project }: { project: Project }) {
  const { data, update } = useWorkspace();
  const people = useProfiles();
  const [description, setDescription] = useState<string | null>(null);
  const set = (patch: Partial<Project>) => void update("projects", project.id, patch);
  return (
    <div className="space-y-8">
      <section>
        <SectionHeading size="md">What it’s about</SectionHeading>
        <AutoTextarea
          value={description ?? project.description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => {
            if (description != null && description !== (project.description ?? "")) set({ description: description || null });
            setDescription(null);
          }}
          placeholder="A sentence or two so anyone can understand this project…"
          className="min-h-24 rounded-2xl border-2 border-line bg-subtle px-4 py-3 text-[16px] font-semibold leading-relaxed focus:border-blue"
        />
      </section>
      <section>
        <SectionHeading size="md">Details</SectionHeading>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <PropertyRow label="Type">
            <OptionField variant="property" kind="select" options={PROJECT_TYPES} value={project.type} onChange={(type) => set({ type })} />
          </PropertyRow>
          <PropertyRow label="Client">
            <TextProperty value={project.client} onCommit={(client) => set({ client })} />
          </PropertyRow>
          <PropertyRow label="Client contact">
            <TextProperty value={project.client_contact} onCommit={(client_contact) => set({ client_contact })} />
          </PropertyRow>
          <PropertyRow label="Creative director">
            <PersonField variant="property" people={people.list} value={project.creative_director_id} onChange={(v) => set({ creative_director_id: v })} />
          </PropertyRow>
          <PropertyRow label="Started">
            <DateField variant="property" value={project.start_date} onChange={(start_date) => set({ start_date })} placeholder="Pick a day" />
          </PropertyRow>
          <PropertyRow label="Deadline">
            <DateField variant="property" value={project.deadline} onChange={(deadline) => set({ deadline })} placeholder="Pick a day" />
          </PropertyRow>
        </div>
      </section>
      <section>
        <SectionHeading size="md">History</SectionHeading>
        <Card className="p-2">
          <ActivityFeed entries={data.activity_log.filter((a) => a.project_id === project.id)} limit={30} compact />
        </Card>
        <p className="mt-3 px-1 text-[13px] font-semibold text-fg-3">
          Created by {people.get(project.created_by)?.full_name ?? "someone"} · {timeAgo(project.created_at)}
        </p>
      </section>
    </div>
  );
}

function TextProperty({ value, onCommit }: { value: string | null; onCommit: (v: string | null) => void }) {
  return (
    <div className="min-h-9 rounded-xl px-1.5 py-1 hover:bg-hover focus-within:bg-hover">
      <EditableText value={value ?? ""} placeholder="Add" onCommit={(v) => onCommit(v || null)} className="text-[15px] font-bold placeholder:text-fg-3" />
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
        <Card>
          <EmptyState
            icon={<Link2 className="size-7" strokeWidth={2.5} />}
            title="No links yet"
            description="Add the Drive folder, brief and sheets. They also show up in Library."
            action={
              <Button variant="secondary" onClick={() => setOpen(true)}>
                <Plus className="size-4" strokeWidth={3} /> Add link
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {links.map((l) => (
            <LibraryRow key={l.id} item={l} hideProject />
          ))}
          <Button variant="secondary" onClick={() => setOpen(true)}>
            <Plus className="size-4" strokeWidth={3} /> Add link
          </Button>
        </div>
      )}
      <LibraryItemDialog open={open} onClose={() => setOpen(false)} defaults={{ project_id: projectId }} />
    </div>
  );
}

function ProjectNotes({ project }: { project: Project }) {
  const { update, upload } = useWorkspace();
  const { schedule } = useDebouncedSave<string>((html) => void update("projects", project.id, { notes_html: html || null }));
  return (
    <Card className="px-6 py-5">
      <RichEditor
        value={project.notes_html ?? ""}
        onChange={schedule}
        placeholder="Meeting notes, decisions, context… Type # for a heading, - for a list, [ ] for a checklist."
        onUploadImage={async (file) => (await upload(file, `projects/${project.id}/notes`)).url}
      />
    </Card>
  );
}

