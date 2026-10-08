"use client";

import { useState } from "react";
import { ArrowUpRight, Pencil, Pin, PinOff, Trash2, User, Users } from "lucide-react";
import type { LibraryItem } from "@/lib/types";
import { useProfiles, useWorkspace } from "@/lib/store";
import { cn, timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/button";
import { Popover, usePopover } from "@/components/ui/popover";
import { MenuDivider, MenuItem, MenuList } from "@/components/ui/menu";
import { TagList } from "@/components/ui/tags-field";
import { LibraryIcon, hostOf } from "./library-meta";
import { LibraryItemDialog } from "./library-item-dialog";
import { useConfirm } from "@/components/ui/confirm";

/** Pinned for everyone, and/or by me. */
export function usePins(item: LibraryItem) {
  const { update, me } = useWorkspace();
  const mine = !!me && item.pinned_by.includes(me.id);
  return {
    forAll: item.pinned,
    mine,
    toggleAll: () => void update("library_items", item.id, { pinned: !item.pinned }),
    toggleMine: () =>
      me && void update("library_items", item.id, { pinned_by: mine ? item.pinned_by.filter((id) => id !== me.id) : [...item.pinned_by, me.id] }),
  };
}

function ItemMenu({ item, onEdit }: { item: LibraryItem; onEdit: () => void }) {
  const { remove } = useWorkspace();
  const ask = useConfirm();
  const pins = usePins(item);
  const { setAnchor: anchorRef, ...pop } = usePopover();
  const pinned = pins.forAll || pins.mine;
  return (
    <>
      <IconButton ref={anchorRef} label={pinned ? "Pinned — change" : "Pin"} onClick={pop.toggle} className={cn(pinned && "text-accent")}>
        <Pin className={cn("size-3.5", pinned && "fill-current")} />
      </IconButton>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor} align="end" width={220}>
        <MenuList>
          <MenuItem icon={<Users className="size-4" />} selected={pins.forAll} onSelect={pins.toggleAll}>
            Pin for everyone
          </MenuItem>
          <MenuItem icon={<User className="size-4" />} selected={pins.mine} onSelect={pins.toggleMine}>
            Pin for me
          </MenuItem>
          {pinned && (
            <MenuItem
              icon={<PinOff className="size-4" />}
              onSelect={() => {
                if (pins.forAll) pins.toggleAll();
                if (pins.mine) pins.toggleMine();
                pop.close();
              }}
            >
              Unpin
            </MenuItem>
          )}
          <MenuDivider />
          <MenuItem icon={<Pencil className="size-4" />} onSelect={() => (pop.close(), onEdit())}>
            Edit
          </MenuItem>
          <MenuItem
            danger
            icon={<Trash2 className="size-4" />}
            onSelect={() => {
              pop.close();
              void ask({ title: `Remove “${item.name}” from Library?`, description: "The file itself is not touched.", confirmLabel: "Remove" }).then((ok) => ok && void remove("library_items", item.id));
            }}
          >
            Remove from Library
          </MenuItem>
        </MenuList>
      </Popover>
    </>
  );
}

function PinBadge({ item }: { item: LibraryItem }) {
  const pins = usePins(item);
  if (!pins.forAll && !pins.mine) return null;
  return (
    <span title={pins.forAll ? "Pinned for everyone" : "Pinned for you"} className="inline-flex shrink-0 items-center gap-0.5 text-[11px] text-accent">
      <Pin className="size-3 fill-current" />
      {pins.forAll ? "Team" : "Me"}
    </span>
  );
}

export function LibraryRow({ item, hideProject = false }: { item: LibraryItem; hideProject?: boolean }) {
  const { data } = useWorkspace();
  const people = useProfiles();
  const [editing, setEditing] = useState(false);
  const project = item.project_id ? data.projects.find((p) => p.id === item.project_id) : undefined;
  return (
    <div className="group flex min-h-10 items-center gap-3 rounded-md px-2 py-1.5 hover:bg-hover">
      <LibraryIcon type={item.type} />
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[14px] font-medium">{item.name}</span>
          <PinBadge item={item} />
          <ArrowUpRight className="size-3 shrink-0 text-fg-3 opacity-0 group-hover:opacity-100" />
        </div>
        <div className="truncate text-[12px] text-fg-3">{item.description || hostOf(item.url)}</div>
      </a>
      <TagList scope="library" tags={item.tags} className="hidden shrink-0 md:flex" />
      {!hideProject && project && (
        <span className="hidden w-40 shrink-0 truncate text-[13px] text-fg-2 lg:block">
          {project.icon} {project.name}
        </span>
      )}
      <span className="hidden w-24 shrink-0 items-center justify-end gap-1.5 text-[12px] text-fg-3 sm:flex">
        <Avatar profile={people.get(item.created_by)} size={16} />
        {timeAgo(item.updated_at)}
      </span>
      <div className="flex shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <ItemMenu item={item} onEdit={() => setEditing(true)} />
      </div>
      <LibraryItemDialog open={editing} onClose={() => setEditing(false)} item={item} />
    </div>
  );
}

/** Grid view card. */
export function LibraryCard({ item }: { item: LibraryItem }) {
  const { data } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const project = item.project_id ? data.projects.find((p) => p.id === item.project_id) : undefined;
  return (
    <div className="group relative flex min-h-[148px] flex-col rounded-lg p-3.5 shadow-[0_0_0_1px_var(--border)] transition-colors hover:bg-hover">
      <div className="flex items-start gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-subtle shadow-[inset_0_0_0_1px_var(--border)]">
          <LibraryIcon type={item.type} className="size-5" />
        </span>
        <div className="relative z-10 ml-auto flex items-center gap-1">
          <PinBadge item={item} />
          <span className="opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <ItemMenu item={item} onEdit={() => setEditing(true)} />
          </span>
        </div>
      </div>
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-2.5 block min-w-0 after:absolute after:inset-0 after:content-['']">
        <div className="line-clamp-2 text-[14px] font-medium leading-snug">{item.name}</div>
        <div className="mt-0.5 line-clamp-2 text-[12px] text-fg-3">{item.description || hostOf(item.url)}</div>
      </a>
      <div className="mt-auto flex min-w-0 items-center gap-2 pt-3">
        <TagList scope="library" tags={item.tags} max={2} />
        {project && <span className="ml-auto truncate text-[12px] text-fg-2">{project.icon} {project.name}</span>}
      </div>
      <LibraryItemDialog open={editing} onClose={() => setEditing(false)} item={item} />
    </div>
  );
}
