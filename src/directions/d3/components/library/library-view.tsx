"use client";

import { useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import type { LibraryItemType } from "@/directions/d3/lib/types";
import { LIBRARY_TYPES } from "@/directions/d3/lib/constants";
import { useWorkspace } from "@/directions/d3/lib/store";
import { Page, PageTitle } from "@/directions/d3/components/shell/page";
import { Button } from "@/directions/d3/components/ui/button";
import { Card, EmptyState } from "@/directions/d3/components/ui/misc";
import { ViewTabs } from "@/directions/d3/components/ui/tabs";
import { Mascot } from "@/directions/d3/components/ui/mascot";
import { RailCard } from "@/directions/d3/components/home/rail-cards";
import { LibraryRow } from "./library-row";
import { LibraryItemDialog } from "./library-item-dialog";
import { LibraryIcon } from "./library-meta";

/** One search box and a row of type chips — that's the whole Library. */
export function LibraryView() {
  const { data } = useWorkspace();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<LibraryItemType | "all">("all");
  const [adding, setAdding] = useState(false);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const projectName = (id: string | null) => (id ? (data.projects.find((p) => p.id === id)?.name ?? "") : "");
    return data.library_items
      .filter(
        (i) =>
          (type === "all" || i.type === type) &&
          (!q || [i.name, i.description, i.url, i.tags.join(" "), projectName(i.project_id)].some((f) => f?.toLowerCase().includes(q))),
      )
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [data.library_items, data.projects, query, type]);

  const typeCounts = useMemo(() => {
    const m = new Map<LibraryItemType, number>();
    data.library_items.forEach((i) => m.set(i.type, (m.get(i.type) ?? 0) + 1));
    return m;
  }, [data.library_items]);

  return (
    <Page
      crumbs={[{ label: "Library" }]}
      aside={
        <RailCard title="How Library works">
          <div className="flex items-start gap-3 pt-1">
            <Mascot mood="happy" size={56} />
            <p className="text-[14px] font-semibold leading-snug text-fg-2">
              Library is a list of <b className="text-fg">links</b> — docs, sheets, Drive folders, templates. The files themselves stay in Google Drive.
            </p>
          </div>
        </RailCard>
      }
    >
      <div className="flex items-start justify-between gap-4">
        <PageTitle title="Library" description="The studio’s docs, sheets, folders and templates — in one place." />
        <Button variant="primary" size="md" className="mt-1 shrink-0" onClick={() => setAdding(true)}>
          <Plus className="size-4" strokeWidth={3.5} /> Add
        </Button>
      </div>

      <label className="mb-3 flex h-12 items-center gap-3 rounded-2xl border-2 border-line bg-input px-4 focus-within:border-blue">
        <Search className="size-5 text-fg-3" strokeWidth={3} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, tag, project or link"
          className="min-w-0 flex-1 bg-transparent text-[15.5px] font-bold outline-none placeholder:font-semibold placeholder:text-fg-3"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="text-fg-3 hover:text-fg" aria-label="Clear search">
            <X className="size-5" strokeWidth={3} />
          </button>
        )}
      </label>
      <ViewTabs<LibraryItemType | "all">
        className="mb-6"
        value={type}
        onChange={setType}
        items={[
          { value: "all", label: "All", count: data.library_items.length },
          ...LIBRARY_TYPES.filter((t) => typeCounts.get(t.value)).map((t) => ({
            value: t.value,
            label: t.label,
            icon: <LibraryIcon type={t.value} className="size-[18px]" />,
          })),
        ]}
      />

      {items.length === 0 ? (
        <Card>
          {query || type !== "all" ? (
            <EmptyState mood="think" title="Nothing matches" description="Try another word, or pick “All”." />
          ) : (
            <EmptyState
              mood="sleepy"
              title="Library is empty"
              description="Paste a Google Doc, Sheet, Drive folder or any link to keep it here."
              action={
                <Button variant="primary" size="md" onClick={() => setAdding(true)}>
                  Add the first link
                </Button>
              }
            />
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((i) => (
            <LibraryRow key={i.id} item={i} />
          ))}
        </div>
      )}
      <LibraryItemDialog open={adding} onClose={() => setAdding(false)} />
    </Page>
  );
}
