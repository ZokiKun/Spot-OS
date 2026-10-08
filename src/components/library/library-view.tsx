"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  FolderOpen,
  LayoutGrid,
  Library as LibraryIconLucide,
  List,
  Pin,
  Plus,
  Search,
  Tag as TagIcon,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { LibraryItem, LibraryItemType } from "@/lib/types";
import { useTags } from "@/lib/tags";
import { readPref, writePref } from "@/lib/hooks";
import { LIBRARY_TYPES } from "@/lib/constants";
import { useWorkspace } from "@/lib/store";
import { usePageAdd } from "@/components/shell/quick-add";
import { cn } from "@/lib/utils";
import { Page, PageTitle } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { EmptyState, SectionHeading } from "@/components/ui/misc";
import { Popover, usePopover } from "@/components/ui/popover";
import { TagList, TagPicker } from "@/components/ui/tags-field";
import { ProjectField } from "@/components/ui/fields";
import { ViewTabs } from "@/components/ui/tabs";
import { FinanceView } from "@/components/insights/finance-view";
import { PerformanceView } from "@/components/insights/performance-view";
import { LibraryCard, LibraryRow } from "./library-row";
import { LibraryItemDialog } from "./library-item-dialog";
import { LibraryIcon } from "./library-meta";

type Tab = "resources" | "finance" | "performance";

export function LibraryView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const requested = params.get("tab");
  const tab: Tab = requested === "finance" || requested === "performance" ? requested : "resources";
  const [adding, setAdding] = useState(false);
  usePageAdd("Add to Library", () => setAdding(true), tab === "resources");

  return (
    <Page
      crumbs={[{ label: "Library", icon: <LibraryIconLucide className="size-4" /> }]}
      actions={
        tab === "resources" && (
          <Button variant="primary" onClick={() => setAdding(true)} title="Add (Shift+A)">
            <Plus className="size-3.5" /> Add
          </Button>
        )
      }
    >
      <PageTitle title="Library" description="The studio’s docs, links and Spot Base, plus finance and performance at a glance. Files stay in Google Drive." />
      <div className="mb-5 border-b border-line pb-1.5">
        <ViewTabs<Tab>
          value={tab}
          onChange={(t) => router.replace(t === "resources" ? pathname : `${pathname}?tab=${t}`, { scroll: false })}
          items={[
            { value: "resources", label: "Resources", icon: <FolderOpen className="size-4" /> },
            { value: "finance", label: "Finance", icon: <Wallet className="size-4" /> },
            { value: "performance", label: "Performance", icon: <BarChart3 className="size-4" /> },
          ]}
        />
      </div>
      {tab === "resources" && <Resources adding={adding} setAdding={setAdding} />}
      {tab === "finance" && <FinanceView />}
      {tab === "performance" && <PerformanceView />}
    </Page>
  );
}

type PinFilter = "all" | "pinned" | "mine";
type Layout = "list" | "grid";

function Resources({ adding, setAdding }: { adding: boolean; setAdding: (v: boolean) => void }) {
  const { data, me } = useWorkspace();
  const tagDefs = useTags("library");
  const [query, setQuery] = useState("");
  const [type, setType] = useState<LibraryItemType | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [pins, setPins] = useState<PinFilter>("all");
  const [layout, setLayoutState] = useState<Layout>(() => readPref<Layout>("library-layout", "list"));
  const setLayout = (l: Layout) => {
    setLayoutState(l);
    writePref("library-layout", l);
  };
  const { setAnchor: tagAnchorRef, ...tagPop } = usePopover();
  const meId = me?.id ?? "";

  const isPinned = (i: LibraryItem) => i.pinned || i.pinned_by.includes(meId);
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.library_items
      .filter(
        (i) =>
          (!type || i.type === type) &&
          (!tags.length || tags.every((t) => i.tags.includes(t))) &&
          (!projectId || i.project_id === projectId) &&
          (pins === "all" || (pins === "pinned" ? i.pinned : i.pinned_by.includes(meId))) &&
          (!q || [i.name, i.description, i.url, i.tags.join(" ")].some((f) => f?.toLowerCase().includes(q))),
      )
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [data.library_items, query, type, tags, projectId, pins, meId]);

  const typeCounts = useMemo(() => {
    const m = new Map<LibraryItemType, number>();
    data.library_items.forEach((i) => m.set(i.type, (m.get(i.type) ?? 0) + 1));
    return m;
  }, [data.library_items]);

  const filtered = Boolean(query || type || tags.length || projectId || pins !== "all");
  // Pinned items float to the top when not already filtering by pins.
  const pinned = pins === "all" ? items.filter(isPinned) : [];
  const rest = pins === "all" ? items.filter((i) => !isPinned(i)) : items;
  const pinCounts = { pinned: data.library_items.filter((i) => i.pinned).length, mine: data.library_items.filter((i) => i.pinned_by.includes(meId)).length };

  const render = (list: LibraryItem[]) =>
    layout === "grid" ? (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
        {list.map((i) => (
          <LibraryCard key={i.id} item={i} />
        ))}
      </div>
    ) : (
      <div>
        {list.map((i) => (
          <LibraryRow key={i.id} item={i} />
        ))}
      </div>
    );

  return (
    <>
      <SpotBaseItem layout={layout} />

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md bg-input px-3 shadow-[inset_0_0_0_1px_var(--border)] focus-within:shadow-[inset_0_0_0_1px_var(--accent)]">
            <Search className="size-4 text-fg-3" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, tag or URL" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-fg-3" />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="text-fg-3 hover:text-fg" aria-label="Clear search">
                <X className="size-4" />
              </button>
            )}
          </label>
          <ViewTabs<Layout>
            value={layout}
            onChange={setLayout}
            items={[
              { value: "list", label: "List", icon: <List className="size-4" /> },
              { value: "grid", label: "Grid", icon: <LayoutGrid className="size-4" /> },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Chip active={!type} onClick={() => setType(null)}>
            All <span className="text-fg-3">{data.library_items.length}</span>
          </Chip>
          {LIBRARY_TYPES.filter((t) => typeCounts.get(t.value)).map((t) => (
            <Chip key={t.value} active={type === t.value} onClick={() => setType(type === t.value ? null : t.value)}>
              <LibraryIcon type={t.value} className="size-3.5" /> {t.label}
              <span className="text-fg-3">{typeCounts.get(t.value)}</span>
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip active={pins === "pinned"} onClick={() => setPins(pins === "pinned" ? "all" : "pinned")}>
            <Users className="size-3.5" /> Pinned for all <span className="text-fg-3">{pinCounts.pinned}</span>
          </Chip>
          <Chip active={pins === "mine"} onClick={() => setPins(pins === "mine" ? "all" : "mine")}>
            <User className="size-3.5" /> My pins <span className="text-fg-3">{pinCounts.mine}</span>
          </Chip>
          <span className="mx-1 h-4 w-px bg-line" />
          <button
            ref={tagAnchorRef}
            type="button"
            onClick={tagPop.toggle}
            className={cn("flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[13px] transition-colors", tags.length ? "bg-active font-medium" : "text-fg-2 hover:bg-hover")}
          >
            <TagIcon className="size-3.5" /> {tags.length ? "Tags" : "Tags · edit"}
          </button>
          {tags.length > 0 && <TagList scope="library" tags={tags} max={4} />}
          <Popover open={tagPop.open} onClose={tagPop.close} anchor={tagPop.anchor} width={280}>
            <TagPicker scope="library" value={tags} onChange={setTags} />
            <div className="border-t border-line px-3 py-2 text-[11.5px] text-fg-3">Pick tags to filter. Use ··· on a tag to rename, recolour or delete it everywhere.</div>
          </Popover>
          <div className="ml-auto w-52">
            <ProjectField projects={data.projects} value={projectId} onChange={setProjectId} variant="property" placeholder="Any project" />
          </div>
          {filtered && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setType(null);
                setTags([]);
                setProjectId(null);
                setPins("all");
              }}
              className="h-7 rounded-md px-2 text-[13px] text-fg-2 hover:bg-hover"
            >
              Clear
            </button>
          )}
        </div>
        {tagDefs.defs.length === 0 && <p className="text-[12px] text-fg-3">No tags yet — add some when you add or edit a resource.</p>}
      </div>

      {pinned.length > 0 && (
        <section className="mb-6">
          <SectionHeading icon={<Pin className="size-3.5" />}>Pinned</SectionHeading>
          {render(pinned)}
        </section>
      )}
      <section className="border-t border-line pt-3">
        {pinned.length > 0 && <SectionHeading>All resources</SectionHeading>}
        {rest.length > 0 && render(rest)}
        {items.length === 0 &&
          (filtered ? (
            <EmptyState title="Nothing matches" description="Try another search or clear the filters." />
          ) : (
            <EmptyState
              title="Library is empty"
              description="Paste a Google Doc, Sheet, Drive folder or any URL to index it here."
              action={
                <Button onClick={() => setAdding(true)}>
                  <Plus className="size-3.5" /> Add the first resource
                </Button>
              }
            />
          ))}
      </section>
      <LibraryItemDialog open={adding} onClose={() => setAdding(false)} defaults={projectId ? { project_id: projectId } : undefined} />
    </>
  );
}

/** Spot Base lives in Library as one item. */
function SpotBaseItem({ layout }: { layout: Layout }) {
  const { data } = useWorkspace();
  const count = data.kb_pages.length;
  return (
    <Link
      href="/spot-base"
      className={cn(
        "group mb-5 flex items-center gap-3 rounded-lg px-4 py-3 shadow-[0_0_0_1px_var(--border)] transition-colors hover:bg-hover",
        layout === "grid" && "py-4",
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--tag-orange-bg)_80%,transparent)] text-[20px]">🟠</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[15px] font-semibold">
          Spot Base <span className="rounded-[3px] bg-active px-1.5 text-[11px] font-medium text-fg-2">Studio knowledge</span>
        </div>
        <div className="truncate text-[13px] text-fg-2">Team · What, why, how & ethos · Brand assets (SPOT.md, logo, files) · {count} pages</div>
      </div>
      <ArrowRight className="size-4 shrink-0 text-fg-3 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[13px] transition-colors",
        active ? "bg-active font-medium text-fg" : "text-fg-2 hover:bg-hover",
      )}
    >
      {children}
    </button>
  );
}
