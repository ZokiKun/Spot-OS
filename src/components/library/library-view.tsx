"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Plus, Search, SlidersHorizontal, X } from "lucide-react";
import type { LibraryItemType } from "@/lib/types";
import { LIBRARY_TYPES } from "@/lib/constants";
import { useWorkspace } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Page, PageTitle } from "@/components/shell/page";
import { CircleButton, MUTED, PillButton, PillTabs, TONE, type PillItem } from "@/components/ui/chunk";
import { Popover, usePopover } from "@/components/ui/popover";
import { LibraryTile } from "./library-row";
import { LibraryItemDialog } from "./library-item-dialog";
import { LIBRARY_TYPE_NAME } from "./library-meta";

const PAGE_SIZE = 12;

export function LibraryView() {
  const { data } = useWorkspace();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<LibraryItemType | "all">("all");
  const [tag, setTag] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  // "Show more" belongs to one set of filters; changing a filter folds the list again.
  const filterKey = `${query}|${type}|${tag}|${projectId}`;
  const [expandedFor, setExpandedFor] = useState<string | null>(null);
  const expanded = expandedFor === filterKey;

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.library_items
      .filter(
        (i) =>
          (type === "all" || i.type === type) &&
          (!tag || i.tags.includes(tag)) &&
          (!projectId || i.project_id === projectId) &&
          (!q || [i.name, i.description, i.url, i.tags.join(" ")].some((f) => f?.toLowerCase().includes(q))),
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [data.library_items, query, type, tag, projectId]);

  const typeTabs = useMemo(() => {
    const counts = new Map<LibraryItemType, number>();
    data.library_items.forEach((i) => counts.set(i.type, (counts.get(i.type) ?? 0) + 1));
    const tabs: PillItem<LibraryItemType | "all">[] = [{ value: "all", label: "All", count: data.library_items.length }];
    LIBRARY_TYPES.forEach((t) => {
      const n = counts.get(t.value);
      if (n) tabs.push({ value: t.value, label: LIBRARY_TYPE_NAME[t.value].many, count: n });
    });
    return tabs;
  }, [data.library_items]);

  const filtered = Boolean(query.trim() || type !== "all" || tag || projectId);
  const visible = expanded ? items : items.slice(0, PAGE_SIZE);
  const hidden = items.length - visible.length;
  const clearAll = () => {
    setQuery("");
    setType("all");
    setTag(null);
    setProjectId(null);
  };

  return (
    <Page crumbs={[{ label: "Library" }]}>
      <PageTitle
        title="Library"
        description="Links to the studio’s docs, sheets and folders. Files stay in Google Drive."
        aside={
          <CircleButton label="Add to Library" tone="ink" size={52} onClick={() => setAdding(true)} className="max-sm:hidden">
            <Plus />
          </CircleButton>
        }
      />

      <div className="mb-6 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <label className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-full bg-elevated px-5 transition-shadow focus-within:shadow-[inset_0_0_0_1.5px_var(--text)]">
            <Search className="size-[18px] shrink-0 text-fg-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, tag or link"
              aria-label="Search the Library"
              className="min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-fg-3"
              style={{ outline: "none" }}
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="-mr-2 flex size-8 items-center justify-center rounded-full text-fg-3 hover:bg-hover hover:text-fg" aria-label="Clear search">
                <X className="size-4" />
              </button>
            )}
          </label>
          <FilterButton projectId={projectId} setProjectId={setProjectId} tag={tag} setTag={setTag} />
        </div>
        {(typeTabs.length > 2 || type !== "all") && <PillTabs items={typeTabs} value={type} onChange={setType} />}
      </div>

      {items.length > 0 ? (
        <>
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-[22px] font-medium tracking-[-0.02em]">{filtered ? (items.length === 1 ? "1 match" : `${items.length} matches`) : "Recently added"}</h2>
            {filtered && (
              <button type="button" onClick={clearAll} className="h-9 rounded-full px-3.5 text-[13.5px] text-fg-2 hover:bg-hover hover:text-fg">
                Clear all
              </button>
            )}
          </div>
          <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((i) => (
              <LibraryTile key={i.id} item={i} />
            ))}
          </div>
          {hidden > 0 && (
            <div className="mt-6 flex justify-center">
              <PillButton tone="outline" onClick={() => setExpandedFor(filterKey)}>
                Show {hidden} more
              </PillButton>
            </div>
          )}
        </>
      ) : filtered ? (
        <EmptyCard title="Nothing matches" description="Try another word, or clear the filters to see everything." action="Clear filters" onAction={clearAll} />
      ) : (
        <EmptyCard
          title="The Library is empty"
          description="Paste a Google Doc, Sheet, Drive folder or any link and it shows up here for the whole studio."
          action="Add the first link"
          onAction={() => setAdding(true)}
        />
      )}

      <CircleButton label="Add to Library" tone="ink" size={60} onClick={() => setAdding(true)} className="fixed bottom-24 right-5 z-20 shadow-menu sm:hidden">
        <Plus />
      </CircleButton>
      <LibraryItemDialog open={adding} onClose={() => setAdding(false)} defaults={projectId ? { project_id: projectId } : undefined} />
    </Page>
  );
}

function EmptyCard({ title, description, action, onAction }: { title: string; description: string; action: string; onAction: () => void }) {
  return (
    <div className={cn("anim-rise mx-auto flex max-w-[520px] flex-col items-center rounded-[28px] px-8 py-10 text-center", TONE.cream)}>
      <div className="text-[24px] font-medium tracking-[-0.02em]">{title}</div>
      <p className={cn("mt-2 max-w-[360px] text-[14px] leading-relaxed", MUTED.cream)}>{description}</p>
      {/* Fixed dark pill: the theme's ink flips to light in dark mode and would vanish on cream. */}
      <button type="button" onClick={onAction} className="mt-5 inline-flex h-10 items-center rounded-full bg-[#151515] px-5 text-[14px] font-medium text-[#f7f3ea] transition-transform hover:bg-[#2e2d2b] active:scale-[0.97]">
        {action}
      </button>
    </div>
  );
}

/** Project + tag filters live behind one pill so the page stays calm. */
function FilterButton({
  projectId,
  setProjectId,
  tag,
  setTag,
}: {
  projectId: string | null;
  setProjectId: (v: string | null) => void;
  tag: string | null;
  setTag: (v: string | null) => void;
}) {
  const { data } = useWorkspace();
  const { setAnchor, ...pop } = usePopover();
  const active = (projectId ? 1 : 0) + (tag ? 1 : 0);

  const projects = useMemo(() => {
    const ids = new Set(data.library_items.map((i) => i.project_id).filter(Boolean));
    return data.projects.filter((p) => ids.has(p.id) || p.id === projectId).sort((a, b) => a.name.localeCompare(b.name));
  }, [data.library_items, data.projects, projectId]);
  const tags = useMemo(() => [...new Set(data.library_items.flatMap((i) => i.tags))].sort(), [data.library_items]);

  return (
    <>
      <button
        ref={setAnchor}
        type="button"
        onClick={pop.toggle}
        aria-expanded={pop.open}
        className={cn(
          "flex h-12 shrink-0 items-center gap-2 rounded-full px-4 text-[14px] transition-[background,color,box-shadow] duration-150",
          active ? "bg-accent text-on-accent" : "text-fg-2 shadow-[inset_0_0_0_1.5px_var(--border-strong)] hover:text-fg hover:shadow-[inset_0_0_0_1.5px_var(--text-3)]",
          active && "pr-2",
        )}
      >
        <SlidersHorizontal className="size-4" />
        <span className="max-sm:hidden">Filter</span>
        {active > 0 && <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-on-accent/15 px-1.5 text-[12px] tabular">{active}</span>}
      </button>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor} align="end" width={320}>
        <div className="flex flex-col gap-4 p-4">
          <section>
            <div className="mb-2 text-[13px] text-fg-2">Project</div>
            {projects.length === 0 ? (
              <div className="text-[13px] text-fg-3">No links are tied to a project yet.</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                <FilterChip selected={!projectId} onClick={() => setProjectId(null)}>
                  Any
                </FilterChip>
                {projects.map((p) => (
                  <FilterChip key={p.id} selected={projectId === p.id} onClick={() => setProjectId(projectId === p.id ? null : p.id)}>
                    <span>{p.icon ?? "📁"}</span>
                    <span className="max-w-[180px] truncate">{p.name}</span>
                  </FilterChip>
                ))}
              </div>
            )}
          </section>
          <section>
            <div className="mb-2 text-[13px] text-fg-2">Tag</div>
            {tags.length === 0 ? (
              <div className="text-[13px] text-fg-3">No tags yet. Add them under “More details” on a link.</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <FilterChip key={t} selected={tag === t} onClick={() => setTag(tag === t ? null : t)}>
                    #{t}
                  </FilterChip>
                ))}
              </div>
            )}
          </section>
          {active > 0 && (
            <PillButton
              tone="outline"
              size="sm"
              className="self-start"
              onClick={() => {
                setProjectId(null);
                setTag(null);
              }}
            >
              Clear filters
            </PillButton>
          )}
        </div>
      </Popover>
    </>
  );
}

function FilterChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex h-8 min-w-0 items-center gap-1.5 rounded-full px-3 text-[13px] transition-colors",
        selected ? "bg-accent text-on-accent" : "bg-hover text-fg hover:bg-active",
      )}
    >
      {children}
    </button>
  );
}
