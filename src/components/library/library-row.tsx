"use client";

import { useState } from "react";
import { ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import type { LibraryItem } from "@/lib/types";
import { useProfiles, useWorkspace } from "@/lib/store";
import { timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { LibraryIcon, hostOf } from "./library-meta";
import { LibraryItemDialog } from "./library-item-dialog";

export function LibraryRow({ item, hideProject = false }: { item: LibraryItem; hideProject?: boolean }) {
  const { data, remove } = useWorkspace();
  const people = useProfiles();
  const [editing, setEditing] = useState(false);
  const project = item.project_id ? data.projects.find((p) => p.id === item.project_id) : undefined;
  return (
    <div className="group flex min-h-10 items-center gap-3 rounded-md px-2 py-1.5 hover:bg-hover">
      <LibraryIcon type={item.type} />
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[14px] font-medium">{item.name}</span>
          <ArrowUpRight className="size-3 shrink-0 text-fg-3 opacity-0 group-hover:opacity-100" />
        </div>
        <div className="truncate text-[12px] text-fg-3">{item.description || hostOf(item.url)}</div>
      </a>
      <div className="hidden shrink-0 items-center gap-1 md:flex">
        {item.tags.slice(0, 3).map((t) => (
          <Tag key={t}>{t}</Tag>
        ))}
      </div>
      {!hideProject && project && (
        <span className="hidden w-40 shrink-0 truncate text-[13px] text-fg-2 lg:block">
          {project.icon} {project.name}
        </span>
      )}
      <span className="hidden w-24 shrink-0 items-center justify-end gap-1.5 text-[12px] text-fg-3 sm:flex">
        <Avatar profile={people.get(item.created_by)} size={16} />
        {timeAgo(item.updated_at)}
      </span>
      <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <IconButton label="Edit" onClick={() => setEditing(true)}>
          <Pencil className="size-3.5" />
        </IconButton>
        <IconButton
          label="Remove from Library"
          onClick={() => {
            if (confirm(`Remove “${item.name}” from Library? The file itself is not touched.`)) void remove("library_items", item.id);
          }}
        >
          <Trash2 className="size-3.5" />
        </IconButton>
      </div>
      <LibraryItemDialog open={editing} onClose={() => setEditing(false)} item={item} />
    </div>
  );
}
