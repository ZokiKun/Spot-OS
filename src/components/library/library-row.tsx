"use client";

import { useState } from "react";
import { ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import type { LibraryItem } from "@/lib/types";
import { useProfiles, useWorkspace } from "@/lib/store";
import { timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { LibraryTile, hostOf } from "./library-meta";
import { LibraryItemDialog } from "./library-item-dialog";

export function LibraryRow({ item, hideProject = false }: { item: LibraryItem; hideProject?: boolean }) {
  const { data, remove } = useWorkspace();
  const people = useProfiles();
  const [editing, setEditing] = useState(false);
  const project = item.project_id ? data.projects.find((p) => p.id === item.project_id) : undefined;
  return (
    <div className="card-press group flex items-center gap-4 rounded-2xl bg-bg px-4 py-3">
      <LibraryTile type={item.type} />
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[16px] font-extrabold">{item.name}</span>
          <ArrowUpRight className="size-4 shrink-0 text-blue opacity-0 group-hover:opacity-100" strokeWidth={3} />
        </div>
        <div className="truncate text-[13.5px] font-semibold text-fg-2">{item.description || hostOf(item.url)}</div>
        {(item.tags.length > 0 || (!hideProject && project)) && (
          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
            {!hideProject && project && (
              <span className="truncate text-[12.5px] font-bold text-fg-2">
                {project.icon} {project.name}
              </span>
            )}
            {item.tags.slice(0, 3).map((t) => (
              <Tag key={t} className="h-5 text-[11.5px] leading-5">
                #{t}
              </Tag>
            ))}
          </div>
        )}
      </a>
      <span className="hidden shrink-0 items-center gap-1.5 text-[12px] font-bold text-fg-3 md:flex" title={`Added ${timeAgo(item.created_at)}`}>
        <Avatar profile={people.get(item.created_by)} size={22} />
      </span>
      <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100">
        <IconButton label="Edit" onClick={() => setEditing(true)}>
          <Pencil className="size-4" strokeWidth={2.5} />
        </IconButton>
        <IconButton
          label="Remove from Library"
          onClick={() => {
            if (confirm(`Remove “${item.name}” from Library? The file itself is not touched.`)) void remove("library_items", item.id);
          }}
        >
          <Trash2 className="size-4" strokeWidth={2.5} />
        </IconButton>
      </div>
      <LibraryItemDialog open={editing} onClose={() => setEditing(false)} item={item} />
    </div>
  );
}
