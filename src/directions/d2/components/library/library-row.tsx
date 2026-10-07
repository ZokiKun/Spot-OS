"use client";

import { useState } from "react";
import { ArrowUpRight, Ellipsis, Pencil, Trash2 } from "lucide-react";
import type { LibraryItem } from "@/directions/d2/lib/types";
import { LIBRARY_TYPE_TONE } from "@/directions/d2/lib/constants";
import { useWorkspace } from "@/directions/d2/lib/store";
import { cn } from "@/directions/d2/lib/utils";
import { Chip, CircleButton, MUTED, SOFT, TONE, isColor, type Tone } from "@/directions/d2/components/ui/chunk";
import { MenuItem, MenuList } from "@/directions/d2/components/ui/menu";
import { Popover, usePopover } from "@/directions/d2/components/ui/popover";
import { LibraryIcon, hostOf } from "./library-meta";
import { LibraryItemDialog } from "./library-item-dialog";

/** One Library item as a chunk: the whole card opens the link, "…" holds edit / remove. */
export function LibraryTile({ item, hideProject = false, className }: { item: LibraryItem; hideProject?: boolean; className?: string }) {
  const { data } = useWorkspace();
  const tone: Tone = LIBRARY_TYPE_TONE[item.type] ?? "surface";
  const project = !hideProject && item.project_id ? data.projects.find((p) => p.id === item.project_id) : undefined;
  return (
    <div className={cn("press group relative flex min-h-[164px] min-w-0 flex-col rounded-[28px] p-5 sm:min-h-[196px]", TONE[tone], className)}>
      {/* Stretched link: the card is clickable without nesting the menu button inside an <a>. */}
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 rounded-[28px]" aria-label={`Open ${item.name}`} />
      <div className="pointer-events-none relative flex items-start justify-between gap-2">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full", SOFT[tone])}>
          <LibraryIcon type={item.type} plain={isColor(tone)} className="size-5" />
        </span>
        <ItemMenu item={item} tone={tone} className="pointer-events-auto -mr-1 -mt-1" />
      </div>
      <div className="pointer-events-none relative mt-4 line-clamp-2 text-[17px] font-medium leading-snug tracking-[-0.01em]">{item.name}</div>
      <div className={cn("pointer-events-none relative mt-1 truncate text-[13px]", MUTED[tone])}>{item.description || hostOf(item.url)}</div>
      <div className="pointer-events-none relative mt-auto flex items-center gap-2 pt-4">
        {project && (
          <Chip tone={tone} className="min-w-0">
            <span className="shrink-0">{project.icon ?? "📁"}</span>
            <span className="truncate">{project.name}</span>
          </Chip>
        )}
        <span className={cn("ml-auto flex size-10 shrink-0 items-center justify-center rounded-full transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5", SOFT[tone])} aria-hidden>
          <ArrowUpRight className="size-[18px]" />
        </span>
      </div>
    </div>
  );
}

/** Compact pill row for short lists (e.g. a project's links). Same behaviour as the tile. */
export function LibraryRow({ item, hideProject = false }: { item: LibraryItem; hideProject?: boolean }) {
  const { data } = useWorkspace();
  const tone: Tone = LIBRARY_TYPE_TONE[item.type] ?? "surface";
  const project = !hideProject && item.project_id ? data.projects.find((p) => p.id === item.project_id) : undefined;
  return (
    <div className="group relative flex min-h-14 min-w-0 items-center gap-3 rounded-[22px] bg-elevated py-2 pl-2 pr-2 transition-colors hover:bg-[color-mix(in_srgb,var(--bg-elevated)_92%,var(--text))]">
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 rounded-[22px]" aria-label={`Open ${item.name}`} />
      <span className={cn("pointer-events-none relative flex size-10 shrink-0 items-center justify-center rounded-full", tone === "surface" ? "bg-hover" : TONE[tone])}>
        <LibraryIcon type={item.type} plain={isColor(tone)} className="size-[18px]" />
      </span>
      <div className="pointer-events-none relative min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[15px] font-medium">{item.name}</span>
          <ArrowUpRight className="size-3.5 shrink-0 text-fg-3 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <div className="truncate text-[12.5px] text-fg-2">
          {project ? `${project.icon ?? "📁"} ${project.name} · ` : ""}
          {item.description || hostOf(item.url)}
        </div>
      </div>
      <ItemMenu item={item} tone="surface" className="relative" />
    </div>
  );
}

/** "…" menu with edit / remove. Stops propagation so it never opens the link underneath. */
function ItemMenu({ item, tone, className }: { item: LibraryItem; tone: Tone; className?: string }) {
  const { remove } = useWorkspace();
  const { setAnchor, ...menu } = usePopover();
  const [editing, setEditing] = useState(false);
  return (
    <>
      <CircleButton
        ref={setAnchor}
        label="More"
        tone={isColor(tone) ? "soft" : "ghost"}
        size={36}
        className={cn(tone === "ink" && "bg-white/10 hover:bg-white/15", className)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          menu.toggle();
        }}
      >
        <Ellipsis />
      </CircleButton>
      <Popover open={menu.open} onClose={menu.close} anchor={menu.anchor} align="end" width={210}>
        <MenuList>
          <MenuItem
            icon={<ArrowUpRight className="size-4" />}
            onSelect={() => {
              window.open(item.url, "_blank", "noopener,noreferrer");
              menu.close();
            }}
          >
            Open link
          </MenuItem>
          <MenuItem
            icon={<Pencil className="size-4" />}
            onSelect={() => {
              menu.close();
              setEditing(true);
            }}
          >
            Edit
          </MenuItem>
          <MenuItem
            danger
            icon={<Trash2 className="size-4" />}
            onSelect={() => {
              menu.close();
              if (confirm(`Remove “${item.name}” from Library? The file itself is not touched.`)) void remove("library_items", item.id);
            }}
          >
            Remove from Library
          </MenuItem>
        </MenuList>
      </Popover>
      <LibraryItemDialog open={editing} onClose={() => setEditing(false)} item={item} />
    </>
  );
}
