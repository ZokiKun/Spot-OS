"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CircleCheck, FolderPlus, Link2, Plus, Upload } from "lucide-react";
import type { Task, UUID } from "@/lib/types";
import { useProfiles, useWorkspace } from "@/lib/store";
import { useLatest } from "@/lib/hooks";
import { assigneesPatch } from "@/lib/selectors";
import { projectTimeline, sortMilestones } from "@/lib/milestones";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/input";
import { DateField, MilestoneField, PeopleField, ProjectField } from "@/components/ui/fields";
import { Popover, hasOpenPopover, usePopover } from "@/components/ui/popover";
import { MenuLabel, MenuList } from "@/components/ui/menu";
import { Kbd } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { LibraryItemDialog } from "@/components/library/library-item-dialog";
import { useAttachmentUpload } from "@/components/attachments";
import { useTaskPeek } from "@/components/tasks/task-peek";

// ─── Shift+A: every page registers what "add" means there ───
// Projects → new project, Tasks and a project → new task, Calendar → note, Library → link…
// The most recently mounted registration wins; with none, Shift+A opens the Quick Add chooser.
type PageAdd = { run: () => void; label: string };
const pageAdds: { current: PageAdd }[] = [];

/** Register this page's Shift+A action while it's mounted. */
export function usePageAdd(label: string, run: () => void, enabled = true) {
  const ref = useLatest<PageAdd>({ run, label });
  useEffect(() => {
    if (!enabled) return;
    pageAdds.push(ref);
    return () => {
      const i = pageAdds.indexOf(ref);
      if (i >= 0) pageAdds.splice(i, 1);
    };
  }, [enabled, ref]);
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

export type QuickAddKind = "task" | "project" | "file" | "link";
type TaskDefaults = Partial<Pick<Task, "project_id" | "milestone_id" | "assignee_ids" | "due_date">>;

interface QuickAddApi {
  openTask: (defaults?: TaskDefaults) => void;
  openProject: () => void;
  openFile: (projectId?: UUID | null) => void;
  openLink: (projectId?: UUID | null) => void;
  open: (kind: QuickAddKind) => void;
  /** The "what do you want to add?" chooser (Shift+A where a page has no add of its own). */
  openChooser: () => void;
}
const QuickAddContext = createContext<QuickAddApi | null>(null);
export function useQuickAdd() {
  const ctx = useContext(QuickAddContext);
  if (!ctx) throw new Error("useQuickAdd must be used inside <QuickAddProvider>");
  return ctx;
}

export const QUICK_ADD_ITEMS: { kind: QuickAddKind; label: string; hint: string; key: string; icon: ReactNode }[] = [
  { kind: "task", label: "New task", hint: "Assign it, give it a date", key: "T", icon: <CircleCheck className="size-4" /> },
  { kind: "project", label: "New project", hint: "With its first milestones", key: "P", icon: <FolderPlus className="size-4" /> },
  { kind: "file", label: "Upload a file", hint: "Into a project’s Files", key: "F", icon: <Upload className="size-4" /> },
  { kind: "link", label: "Add a link", hint: "Docs, sheets, Drive — to Library", key: "L", icon: <Link2 className="size-4" /> },
];

/** Opens one of the quick-add flows when its letter is pressed (while a quick-add menu is open). */
function useLetterKeys(active: boolean, onPick: (kind: QuickAddKind) => void) {
  const pick = useLatest(onPick);
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const item = QUICK_ADD_ITEMS.find((i) => i.key === e.key.toUpperCase());
      if (!item) return;
      e.preventDefault();
      pick.current(item.kind);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, pick]);
}

function QuickAddItems({ onPick }: { onPick: (kind: QuickAddKind) => void }) {
  return (
    <>
      {QUICK_ADD_ITEMS.map((i) => (
        <button
          key={i.kind}
          type="button"
          onClick={() => onPick(i.kind)}
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors duration-75 hover:bg-hover"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-active text-fg-2">{i.icon}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] leading-tight">{i.label}</span>
            <span className="block truncate text-[12px] leading-tight text-fg-3">{i.hint}</span>
          </span>
          <Kbd>{i.key}</Kbd>
        </button>
      ))}
    </>
  );
}

export function QuickAddProvider({ children }: { children: ReactNode }) {
  const { canEdit } = useWorkspace();
  const pathname = usePathname();
  // On a project page, new files and links default to that project.
  const currentProject = /^\/projects\/(?!tasks$)([^/]+)$/.exec(pathname)?.[1] ?? null;

  const [task, setTask] = useState<{ key: number; defaults: TaskDefaults } | null>(null);
  const [projectOpen, setProjectOpen] = useState(false);
  const [file, setFile] = useState<{ key: number; projectId: UUID | null } | null>(null);
  const [link, setLink] = useState<{ projectId: UUID | null } | null>(null);
  const [chooser, setChooser] = useState(false);
  const seq = useRef(0);

  const api = useMemo<QuickAddApi>(() => {
    const openTask = (defaults: TaskDefaults = {}) => setTask({ key: ++seq.current, defaults });
    const openProject = () => setProjectOpen(true);
    const openFile = (projectId: UUID | null = null) => setFile({ key: ++seq.current, projectId });
    const openLink = (projectId: UUID | null = null) => setLink({ projectId });
    return {
      openTask,
      openProject,
      openFile,
      openLink,
      open: (kind) => {
        setChooser(false);
        if (kind === "task") openTask(currentProject ? { project_id: currentProject } : {});
        if (kind === "project") openProject();
        if (kind === "file") openFile(currentProject);
        if (kind === "link") openLink(currentProject);
      },
      openChooser: () => setChooser(true),
    };
  }, [currentProject]);

  // Shift+A — not while typing, in a dialog or with a menu open.
  const canEditRef = useLatest(canEdit);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.metaKey || e.ctrlKey || e.altKey || e.repeat || e.key.toLowerCase() !== "a") return;
      if (isTyping(e.target) || hasOpenPopover() || document.querySelector('[aria-modal="true"]')) return;
      if (!canEditRef.current) return;
      e.preventDefault();
      const page = pageAdds.at(-1)?.current;
      if (page) page.run();
      else setChooser(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canEditRef]);

  useLetterKeys(chooser, api.open);

  return (
    <QuickAddContext value={api}>
      {children}
      <Dialog open={chooser} onClose={() => setChooser(false)} title="Add to Spot OS" width={380}>
        <MenuList className="-mx-3 -mt-1 p-0">
          <QuickAddItems onPick={api.open} />
        </MenuList>
        <p className="mt-2 text-[12px] text-fg-3">
          Tip: <Kbd>⇧</Kbd> <Kbd>A</Kbd> adds what each page is about — a project on Projects, a task on Tasks or a project, a note on Calendar.
        </p>
      </Dialog>
      {task && <QuickTaskDialog key={task.key} defaults={task.defaults} onClose={() => setTask(null)} />}
      <NewProjectDialog open={projectOpen} onClose={() => setProjectOpen(false)} />
      {file && <QuickFileDialog key={file.key} projectId={file.projectId} onClose={() => setFile(null)} />}
      <LibraryItemDialog open={!!link} onClose={() => setLink(null)} defaults={link?.projectId ? { project_id: link.projectId } : undefined} />
    </QuickAddContext>
  );
}

/** Floating + at the bottom right of Home: add a task, project, file or link without leaving the page. */
export function QuickAddFab() {
  const { canEdit } = useWorkspace();
  const quick = useQuickAdd();
  const { setAnchor, ...menu } = usePopover<HTMLButtonElement>();
  const pick = (kind: QuickAddKind) => {
    menu.close();
    quick.open(kind);
  };
  usePageAdd("Quick add", () => menu.setOpen(true), canEdit);
  useLetterKeys(menu.open, pick);
  if (!canEdit) return null;
  return (
    <>
      <button
        ref={setAnchor}
        type="button"
        onClick={menu.toggle}
        aria-label="Quick add"
        title="Quick add (Shift+A)"
        aria-expanded={menu.open}
        className={cn(
          "no-print fixed bottom-6 right-6 z-30 flex size-12 items-center justify-center rounded-full bg-accent text-white shadow-[0_6px_20px_rgba(15,15,15,0.22),0_1px_3px_rgba(15,15,15,0.2)] transition-transform duration-150 hover:scale-105 hover:bg-accent-hover active:scale-95 sm:bottom-8 sm:right-8",
        )}
      >
        <Plus className={cn("size-6 transition-transform duration-150", menu.open && "rotate-45")} strokeWidth={2.25} />
      </button>
      <Popover open={menu.open} onClose={menu.close} anchor={menu.anchor} align="end" width={260} offset={10}>
        <MenuList>
          <MenuLabel>Add to Spot OS</MenuLabel>
          <QuickAddItems onPick={pick} />
        </MenuList>
      </Popover>
    </>
  );
}

function QuickTaskDialog({ defaults, onClose }: { defaults: TaskDefaults; onClose: () => void }) {
  const { data, create, me } = useWorkspace();
  const people = useProfiles();
  const toast = useToast();
  const { openTask } = useTaskPeek();
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<UUID | null>(defaults.project_id ?? null);
  const [milestoneId, setMilestoneId] = useState<UUID | null>(() => {
    if (defaults.milestone_id !== undefined) return defaults.milestone_id;
    // In a project, new tasks go to its next step by default.
    return defaults.project_id ? (projectTimeline(defaults.project_id, data).current?.milestone.id ?? null) : null;
  });
  const [assignees, setAssignees] = useState<UUID[]>(defaults.assignee_ids ?? (me ? [me.id] : []));
  const [due, setDue] = useState<string | null>(defaults.due_date ?? null);
  const milestones = useMemo(() => sortMilestones(data.milestones.filter((m) => m.project_id === projectId)), [data.milestones, projectId]);
  const projects = useMemo(() => data.projects.filter((p) => p.status !== "archived"), [data.projects]);

  const submit = async () => {
    const name = title.trim();
    if (!name) return;
    onClose();
    try {
      const t = await create("tasks", {
        title: name,
        description: null,
        project_id: projectId,
        milestone_id: projectId ? milestoneId : null,
        ...assigneesPatch(assignees),
        status: "todo",
        priority: "medium",
        due_date: due,
        created_by: me?.id ?? null,
        completed_at: null,
      });
      toast.show({ title: "Task added", description: name, tone: "success", action: { label: "Open", onClick: () => openTask(t.id) } });
    } catch {
      /* toast shown by the store */
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="New task"
      width={500}
      footer={
        <>
          <span className="mr-auto text-[12px] text-fg-3">
            <Kbd>Enter</Kbd> to add
          </span>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!title.trim()} onClick={() => void submit()}>
            Add task
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-3"
      >
        <TextInput autoFocus placeholder="What needs doing?" value={title} onChange={(e) => setTitle(e.target.value)} className="h-10 text-[16px]" />
        <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 text-[14px]">
          <span className="text-fg-2">Project</span>
          <div className="-ml-1.5">
            <ProjectField
              variant="property"
              projects={projects}
              value={projectId}
              onChange={(v) => {
                setProjectId(v);
                setMilestoneId(v ? (projectTimeline(v, data).current?.milestone.id ?? null) : null);
              }}
            />
          </div>
          {projectId && milestones.length > 0 && (
            <>
              <span className="text-fg-2">Milestone</span>
              <div className="-ml-1.5">
                <MilestoneField variant="property" milestones={milestones} value={milestoneId} onChange={setMilestoneId} />
              </div>
            </>
          )}
          <span className="text-fg-2">Assignees</span>
          <div className="-ml-1.5">
            <PeopleField variant="property" people={people.list} value={assignees} onChange={setAssignees} />
          </div>
          <span className="text-fg-2">Due</span>
          <div className="-ml-1.5">
            <DateField variant="property" value={due} onChange={setDue} />
          </div>
        </div>
      </form>
    </Dialog>
  );
}

function QuickFileDialog({ projectId: initial, onClose }: { projectId: UUID | null; onClose: () => void }) {
  const { data } = useWorkspace();
  const router = useRouter();
  const toast = useToast();
  const [projectId, setProjectId] = useState<UUID | null>(initial);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const project = data.projects.find((p) => p.id === projectId);
  const projects = useMemo(() => data.projects.filter((p) => p.status !== "archived"), [data.projects]);
  const { run, busy } = useAttachmentUpload(projectId ? { project_id: projectId } : {}, `projects/${projectId}`);

  const send = useCallback(
    async (files: FileList | File[]) => {
      if (!project || !files.length) return;
      await run(files);
      onClose();
      toast.show({
        title: files.length === 1 ? "File uploaded" : `${files.length} files uploaded`,
        description: `To ${project.name}`,
        tone: "success",
        action: { label: "View", onClick: () => router.push(`/projects/${project.id}?tab=files`) },
      });
    },
    [project, run, onClose, toast, router],
  );

  return (
    <Dialog open onClose={onClose} title="Upload a file" width={480}>
      <div className="space-y-3 pb-2">
        <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-3 text-[14px]">
          <span className="text-fg-2">Project</span>
          <div className="-ml-1.5">
            <ProjectField variant="property" projects={projects} value={projectId} onChange={setProjectId} placeholder="Choose a project" />
          </div>
        </div>
        <button
          type="button"
          disabled={!project || busy}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void send(e.dataTransfer.files);
          }}
          className={cn(
            "flex h-32 w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-[14px] transition-colors disabled:opacity-50",
            dragging ? "border-accent bg-accent-soft" : "border-line-strong hover:bg-hover",
          )}
        >
          <Upload className="size-5 text-fg-2" />
          {busy ? "Uploading…" : project ? "Drop files here, or click to choose" : "Choose a project first"}
          <span className="text-[12px] text-fg-3">They appear in the project’s Files tab.</span>
        </button>
        <input ref={input} type="file" multiple hidden onChange={(e) => e.target.files && void send(e.target.files)} />
      </div>
    </Dialog>
  );
}
