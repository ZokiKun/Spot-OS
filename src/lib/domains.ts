"use client";

import { useCallback, useMemo } from "react";
import type { TagColor } from "./constants";
import type { UUID } from "./types";
import { useWorkspace } from "./store";
import { uid } from "./utils";

/**
 * Domains are the studio's verticals (Animation, UI/UX, Social media…). Each has at most one owner
 * who is accountable for moving it forward. The list lives in the shared "domains" workspace setting;
 * projects carry a primary domain id and a task may override it.
 */
export interface Domain {
  id: string;
  name: string;
  color: TagColor;
  owner_id: UUID | null;
}

const SETTINGS_KEY = "domains";
/**
 * Colours follow a domain's position, in an order validated for colour-blind separation on light and
 * dark surfaces (dataviz validator). A 6th+ domain is grey — it shows as "Other" in charts.
 */
export const DOMAIN_COLORS: TagColor[] = ["purple", "green", "blue", "orange", "pink"];
export const domainColor = (index: number): TagColor => DOMAIN_COLORS[index] ?? "gray";

export function useDomains() {
  const { data, create, update } = useWorkspace();
  const row = data.settings.find((s) => s.key === SETTINGS_KEY);
  const list = useMemo<Domain[]>(
    () => ((row?.value.items as Domain[] | undefined) ?? []).filter((d) => d?.id && d.name).map((d, i) => ({ ...d, color: domainColor(i) })),
    [row],
  );

  const save = useCallback(
    (items: Domain[]) => {
      if (row) void update("settings", row.id, { value: { ...row.value, items } });
      else void create("settings", { key: SETTINGS_KEY, value: { items } });
    },
    [row, update, create],
  );

  const get = useCallback((id: string | null | undefined) => (id ? list.find((d) => d.id === id) : undefined), [list]);

  const add = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      save([...list, { id: uid(), name: trimmed, color: domainColor(list.length), owner_id: null }]);
    },
    [list, save],
  );

  const edit = useCallback((id: string, patch: Partial<Omit<Domain, "id" | "color">>) => save(list.map((d) => (d.id === id ? { ...d, ...patch } : d))), [list, save]);

  /** Move a domain up or down (its colour follows its position). */
  const move = useCallback(
    (id: string, dir: -1 | 1) => {
      const i = list.findIndex((d) => d.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return;
      const next = list.slice();
      [next[i], next[j]] = [next[j]!, next[i]!];
      save(next);
    },
    [list, save],
  );

  /** Remove from the list. Projects and tasks keep the id, which then simply reads as "no domain". */
  const remove = useCallback((id: string) => save(list.filter((d) => d.id !== id)), [list, save]);

  /** Options for an OptionField ("" = no domain). */
  const options = useMemo(() => [...list.map((d) => ({ value: d.id, label: d.name, color: d.color })), { value: "", label: "No domain", color: "default" as TagColor }], [list]);

  return { list, get, add, edit, move, remove, options };
}
