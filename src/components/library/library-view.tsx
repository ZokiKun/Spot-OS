"use client";

import { useMemo, useState } from "react";
import { Library as LibraryIconLucide, Plus, Search, X } from "lucide-react";
import type { LibraryItemType } from "@/lib/types";
import { LIBRARY_TYPES } from "@/lib/constants";
import { useWorkspace } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Page, PageTitle } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { ProjectField } from "@/components/ui/fields";
import { LibraryRow } from "./library-row";
import { LibraryItemDialog } from "./library-item-dialog";
import { LibraryIcon } from "./library-meta";

export function LibraryView() {
  const { data } = useWorkspace();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<LibraryItemType | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const allTags = useMemo(() => [...new Set(data.library_items.flatMap((i) => i.tags))].sort(), [data.library_items]);
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.library_items
      .filter(
        (i) =>
          (!type || i.type === type) &&
          (!tag || i.tags.includes(tag)) &&
          (!projectId || i.project_id === projectId) &&
          (!q || [i.name, i.description, i.url, i.tags.join(" ")].some((f) => f?.toLowerCase().includes(q))),
      )
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [data.library_items, query, type, tag, projectId]);

  const typeCounts = useMemo(() => {
    const m = new Map<LibraryItemType, number>();
    data.library_items.forEach((i) => m.set(i.type, (m.get(i.type) ?? 0) + 1));
    return m;
  }, [data.library_items]);

  const filtered = Boolean(query || type || tag || projectId);

  return (
    <Page
      crumbs={[{ label: "Library", icon: <LibraryIconLucide className="size-4" /> }]}
      actions={
        <Button variant="primary" onClick={() => setAdding(true)}>
          <Plus className="size-3.5" /> Add
        </Button>
      }
    >
      <PageTitle title="Library" description="An index of the studio’s docs, sheets, Drive folders, templates and links. Files stay in Google Drive." />

      <div className="mb-4 flex flex-col gap-3">
        <label className="flex h-9 items-center gap-2 rounded-md bg-input px-3 shadow-[inset_0_0_0_1px_var(--border)] focus-within:shadow-[inset_0_0_0_1px_var(--accent)]">
          <Search className="size-4 text-fg-3" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, tag or URL" className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-fg-3" />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="text-fg-3 hover:text-fg" aria-label="Clear search">
              <X className="size-4" />
            </button>
          )}
        </label>
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
          <div className="ml-auto w-52">
            <ProjectField projects={data.projects} value={projectId} onChange={setProjectId} variant="property" placeholder="Any project" />
          </div>
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {allTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(tag === t ? null : t)}
                className={cn("rounded-[3px] px-1.5 text-[12.5px] leading-5 transition-colors", tag === t ? "bg-accent text-white" : "tag-default text-[var(--tag-text)] hover:opacity-80")}
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-line pt-1">
        {items.map((i) => (
          <LibraryRow key={i.id} item={i} />
        ))}
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
      </div>
      <LibraryItemDialog open={adding} onClose={() => setAdding(false)} defaults={projectId ? { project_id: projectId } : undefined} />
    </Page>
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
