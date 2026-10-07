"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CircleCheck, ListFilter, Plus, Search, X } from "lucide-react";
import type { ProjectStatus, ProjectType } from "@/directions/d2/lib/types";
import { PROJECT_TYPES } from "@/directions/d2/lib/constants";
import { useWorkspace } from "@/directions/d2/lib/store";
import { sortProjects } from "@/directions/d2/lib/selectors";
import { cn } from "@/directions/d2/lib/utils";
import { Page, PageTitle } from "@/directions/d2/components/shell/page";
import { Popover, usePopover } from "@/directions/d2/components/ui/popover";
import { MenuDivider, MenuItem, MenuLabel, MenuList } from "@/directions/d2/components/ui/menu";
import { Card, CircleButton, PillTabs } from "@/directions/d2/components/ui/chunk";
import { ProjectCard } from "./project-card";
import { NewProjectDialog } from "./new-project-dialog";

type Group = "moving" | "stuck" | "later" | "done" | "all";

const GROUPS: { value: Group; label: string; statuses: ProjectStatus[] }[] = [
  { value: "moving", label: "In motion", statuses: ["active", "blocked", "review"] },
  { value: "stuck", label: "Stuck", statuses: ["blocked"] },
  { value: "later", label: "Not started", statuses: ["backlog"] },
  { value: "done", label: "Done", statuses: ["completed", "archived"] },
  { value: "all", label: "All", statuses: ["backlog", "active", "blocked", "review", "completed", "archived"] },
];

/** Projects as cards, filtered by one plain question: which ones are moving? */
export function ProjectsView() {
  const { data } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const group = (params.get("show") as Group) || "moving";
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState<ProjectType[]>([]);
  const [newOpen, setNewOpen] = useState(false);
  const { setAnchor: filterAnchorRef, ...filter } = usePopover();

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.projects.filter(
      (p) => (!types.length || types.includes(p.type)) && (!q || [p.name, p.client, p.description, p.next_action].some((f) => f?.toLowerCase().includes(q))),
    );
  }, [data.projects, query, types]);

  const statuses = GROUPS.find((g) => g.value === group)?.statuses ?? GROUPS[0]!.statuses;
  const projects = sortProjects(matches.filter((p) => statuses.includes(p.status)));
  const count = (g: (typeof GROUPS)[number]) => matches.filter((p) => g.statuses.includes(p.status)).length;
  const filtered = Boolean(query || types.length);

  return (
    <Page crumbs={[{ label: "Projects" }]}>
      <PageTitle
        title="Projects"
        description="Every studio project, where it stands and its one next step."
        aside={
          <>
            <Link
              href="/projects/tasks"
              className="flex h-11 items-center gap-2 rounded-full bg-elevated px-4 text-[14px] transition-transform active:scale-95 max-sm:hidden"
            >
              <CircleCheck className="size-4" /> All tasks
            </Link>
            <CircleButton label="New project" tone="ink" size={52} onClick={() => setNewOpen(true)}>
              <Plus />
            </CircleButton>
          </>
        }
      />

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <PillTabs
          className="min-w-0 flex-1"
          value={group}
          onChange={(g) => router.replace(g === "moving" ? pathname : `${pathname}?show=${g}`, { scroll: false })}
          items={GROUPS.map((g) => ({ value: g.value, label: g.label, count: count(g) }))}
        />
        <div className="flex items-center gap-2">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-elevated px-4 text-fg-2 focus-within:shadow-[inset_0_0_0_1.5px_var(--text)] lg:w-56 lg:flex-none">
            <Search className="size-4 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a project"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-fg-3"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="text-fg-3 hover:text-fg">
                <X className="size-4" />
              </button>
            )}
          </label>
          <button
            ref={filterAnchorRef}
            type="button"
            onClick={filter.toggle}
            className={cn(
              "flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[14px] transition-colors",
              types.length ? "bg-accent text-on-accent" : "text-fg-2 shadow-[inset_0_0_0_1.5px_var(--border-strong)] hover:text-fg",
            )}
          >
            <ListFilter className="size-4" /> Kind{types.length ? ` · ${types.length}` : ""}
          </button>
          <Popover open={filter.open} onClose={filter.close} anchor={filter.anchor} align="end" width={220}>
            <MenuList>
              <MenuLabel>Kind of project</MenuLabel>
              {PROJECT_TYPES.map((t) => (
                <MenuItem
                  key={t.value}
                  selected={types.includes(t.value)}
                  onSelect={() => setTypes((ts) => (ts.includes(t.value) ? ts.filter((x) => x !== t.value) : [...ts, t.value]))}
                >
                  {t.label}
                </MenuItem>
              ))}
              {types.length > 0 && (
                <>
                  <MenuDivider />
                  <MenuItem onSelect={() => setTypes([])}>Show all kinds</MenuItem>
                </>
              )}
            </MenuList>
          </Popover>
        </div>
      </div>

      {projects.length === 0 ? (
        <Card tone="cream" className="items-center py-14 text-center">
          <div className="text-[22px] font-medium tracking-[-0.02em]">{filtered ? "Nothing matches" : group === "stuck" ? "Nothing is stuck" : "No projects here yet"}</div>
          <div className="mt-1 text-[14px] text-[var(--on-chunk-2)]">
            {filtered ? "Try another word, or clear the filters." : group === "stuck" ? "Every project has a way forward." : "Start one with the + button."}
          </div>
        </Card>
      ) : (
        <div key={group} className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      <Link
        href="/projects/tasks"
        className="mt-8 flex h-12 items-center justify-center gap-2 rounded-full bg-elevated text-[14px] sm:hidden"
      >
        <CircleCheck className="size-4" /> See all tasks
      </Link>
      <NewProjectDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </Page>
  );
}
