"use client";

import { useCallback, useMemo } from "react";
import type { TagColor } from "./constants";
import { useWorkspace } from "./store";

export type TagScope = "project" | "library";
export interface TagDef {
  name: string;
  color: TagColor;
}

const SETTINGS_KEY = "tags";
const TABLE = { project: "projects", library: "library_items" } as const;
const CYCLE: TagColor[] = ["blue", "green", "orange", "purple", "pink", "yellow", "brown", "red", "gray"];

export const normalizeTag = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Custom tags for projects or Library items. Items store tag names; names + colours
 * live in the shared "tags" workspace setting. Tags used on items but never registered
 * still show up (grey), so nothing disappears.
 */
export function useTags(scope: TagScope) {
  const { data, create, update } = useWorkspace();
  const row = data.settings.find((s) => s.key === SETTINGS_KEY);
  const items: { id: string; tags: string[] }[] = scope === "project" ? data.projects : data.library_items;

  const defs = useMemo<TagDef[]>(() => {
    const registered = ((row?.value[scope] as TagDef[] | undefined) ?? []).filter((d) => d?.name);
    const known = new Set(registered.map((d) => d.name));
    const discovered = [...new Set(items.flatMap((i) => i.tags ?? []))].filter((t) => !known.has(t)).sort().map((name) => ({ name, color: "default" as TagColor }));
    return [...registered, ...discovered];
  }, [row, scope, items]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((i) => (i.tags ?? []).forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
    return m;
  }, [items]);

  const save = useCallback(
    (next: TagDef[]) => {
      const value = { ...(row?.value ?? {}), [scope]: next };
      if (row) void update("settings", row.id, { value });
      else void create("settings", { key: SETTINGS_KEY, value });
    },
    [row, scope, update, create],
  );

  const colorOf = useCallback((name: string) => defs.find((d) => d.name === name)?.color ?? "default", [defs]);

  /** Register a tag (no-op if it exists). Returns the normalized name. */
  const add = useCallback(
    (raw: string, color?: TagColor) => {
      const name = normalizeTag(raw);
      if (!name) return "";
      if (!defs.some((d) => d.name === name)) save([...defs, { name, color: color ?? CYCLE[defs.length % CYCLE.length]! }]);
      return name;
    },
    [defs, save],
  );

  const recolor = useCallback((name: string, color: TagColor) => save(defs.map((d) => (d.name === name ? { ...d, color } : d))), [defs, save]);

  /** Rename everywhere: the registry and every item that carries the tag. */
  const rename = useCallback(
    (from: string, raw: string) => {
      const to = normalizeTag(raw);
      if (!to || to === from) return;
      const merged = defs.some((d) => d.name === to);
      save(merged ? defs.filter((d) => d.name !== from) : defs.map((d) => (d.name === from ? { ...d, name: to } : d)));
      items
        .filter((i) => i.tags?.includes(from))
        .forEach((i) => void update(TABLE[scope], i.id, { tags: [...new Set(i.tags.map((t) => (t === from ? to : t)))] }));
    },
    [defs, items, save, scope, update],
  );

  /** Delete the tag and remove it from every item. */
  const remove = useCallback(
    (name: string) => {
      save(defs.filter((d) => d.name !== name));
      items.filter((i) => i.tags?.includes(name)).forEach((i) => void update(TABLE[scope], i.id, { tags: i.tags.filter((t) => t !== name) }));
    },
    [defs, items, save, scope, update],
  );

  return { defs, counts, colorOf, add, recolor, rename, remove };
}
