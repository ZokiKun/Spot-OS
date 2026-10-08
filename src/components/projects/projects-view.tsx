"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CircleCheck, Columns3, ListFilter, Plus, Search, Table2 } from "lucide-react";
import type { ProjectType } from "@/lib/types";
import { PROJECT_TYPES } from "@/lib/constants";
import { useWorkspace } from "@/lib/store";
import { sortProjects } from "@/lib/selectors";
import { useTags } from "@/lib/tags";
import { cn } from "@/lib/utils";
import { Page, PageTitle } from "@/components/shell/page";
import { ViewTabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Popover, usePopover } from "@/components/ui/popover";
import { MenuDivider, MenuItem, MenuLabel, MenuList } from "@/components/ui/menu";
import { Tag } from "@/components/ui/tag";
import { NAV_ICONS } from "@/components/shell/icons";
import { ProjectBoard, ProjectTable } from "./project-views";
import { NewProjectDialog } from "./new-project-dialog";
import { usePageAdd } from "@/components/shell/quick-add";

type View = "table" | "board" | "tasks";

export function ProjectsView() {
  const { data } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const view = (params.get("view") as View) || "table";
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState<ProjectType[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newOpen, setNewOpen] = useState(false);
  const { setAnchor: filterAnchorRef, ...filter } = usePopover();
  usePageAdd("New project", () => setNewOpen(true));

  const setView = (v: View) => {
    if (v === "tasks") return router.push("/projects/tasks");
    router.replace(`${pathname}?view=${v}`);
  };

  const projects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortProjects(
      data.projects.filter(
        (p) =>
          (!types.length || types.includes(p.type)) &&
          (!tags.length || tags.some((t) => p.tags.includes(t))) &&
          (!q || [p.name, p.client, p.description, p.note, p.tags.join(" ")].some((f) => f?.toLowerCase().includes(q))),
      ),
    );
  }, [data.projects, query, types, tags]);
  const tagDefs = useTags("project");

  const Icon = NAV_ICONS.projects!;
  const activeFilters = types.length + tags.length;

  return (
    <Page
      crumbs={[{ label: "Projects", icon: <Icon className="size-4" /> }]}
      actions={
        <Button variant="primary" onClick={() => setNewOpen(true)} title="New project (Shift+A)">
          <Plus className="size-3.5" /> New project
        </Button>
      }
    >
      <PageTitle title="Projects" description="Every studio project, grouped by status: active first, then review, completed and archived." />
      <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-line pb-1.5">
        <ViewTabs<View>
          value={view}
          onChange={setView}
          items={[
            { value: "table", label: "Table", icon: <Table2 className="size-4" /> },
            { value: "board", label: "Board", icon: <Columns3 className="size-4" /> },
            { value: "tasks", label: "All tasks", icon: <CircleCheck className="size-4" /> },
          ]}
        />
        <div className="ml-auto flex items-center gap-1">
          <label className="flex h-7 items-center gap-1.5 rounded-md px-2 text-fg-2 focus-within:bg-hover hover:bg-hover">
            <Search className="size-3.5" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-24 bg-transparent text-[14px] text-fg outline-none placeholder:text-fg-2 focus:w-40"
            />
          </label>
          <button
            ref={filterAnchorRef}
            type="button"
            onClick={filter.toggle}
            className={cn("flex h-7 items-center gap-1.5 rounded-md px-2 text-[14px] hover:bg-hover", activeFilters ? "text-accent" : "text-fg-2")}
          >
            <ListFilter className="size-3.5" /> Filter{activeFilters ? ` · ${activeFilters}` : ""}
          </button>
          <Popover open={filter.open} onClose={filter.close} anchor={filter.anchor} align="end" width={220}>
            <MenuList>
              <MenuLabel>Type</MenuLabel>
              {PROJECT_TYPES.map((t) => (
                <MenuItem
                  key={t.value}
                  selected={types.includes(t.value)}
                  onSelect={() => setTypes((ts) => (ts.includes(t.value) ? ts.filter((x) => x !== t.value) : [...ts, t.value]))}
                >
                  <Tag color={t.color}>{t.label}</Tag>
                </MenuItem>
              ))}
              {tagDefs.defs.length > 0 && (
                <>
                  <MenuDivider />
                  <MenuLabel>Tags</MenuLabel>
                  {tagDefs.defs.map((t) => (
                    <MenuItem
                      key={t.name}
                      selected={tags.includes(t.name)}
                      hint={tagDefs.counts.get(t.name) ?? 0}
                      onSelect={() => setTags((ts) => (ts.includes(t.name) ? ts.filter((x) => x !== t.name) : [...ts, t.name]))}
                    >
                      <Tag color={t.color}>{t.name}</Tag>
                    </MenuItem>
                  ))}
                </>
              )}
              {activeFilters > 0 && (
                <>
                  <MenuDivider />
                  <MenuItem
                    onSelect={() => {
                      setTypes([]);
                      setTags([]);
                    }}
                  >
                    Clear filters
                  </MenuItem>
                </>
              )}
            </MenuList>
          </Popover>
        </div>
      </div>
      {view === "board" ? <ProjectBoard projects={projects} /> : <ProjectTable projects={projects} />}
      <NewProjectDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </Page>
  );
}
