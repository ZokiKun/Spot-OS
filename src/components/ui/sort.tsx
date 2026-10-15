"use client";

import type { ReactNode } from "react";
import { ArrowDown, ArrowDownUp, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, usePopover } from "./popover";
import { MenuDivider, MenuItem, MenuLabel, MenuList } from "./menu";

export interface SortState<K extends string> {
  by: K;
  /** false = the natural direction (A→Z, soonest, oldest…). */
  reverse?: boolean;
}

/** `order`: the natural direction, then the reversed one — in words that fit the field. The first option is the default order. */
export interface SortOption<K extends string> {
  value: K;
  label: string;
  order?: [string, string];
}

/** Header click: sort by this column → flip it → back to the default order. */
export function nextSort<K extends string>(sort: SortState<K>, key: K, defaultKey: K): SortState<K> {
  if (sort.by !== key) return { by: key };
  if (!sort.reverse) return { by: key, reverse: true };
  return { by: defaultKey };
}

/**
 * Stable sort by a key. Rows with no value (no date, nobody assigned…) stay last in either
 * direction; ties keep the incoming order.
 */
export function sortByKey<T>(rows: T[], key: (row: T) => string | number | null | undefined, reverse?: boolean): T[] {
  const dir = reverse ? -1 : 1;
  const keyed = rows.map((row, i) => ({ row, i, k: key(row) ?? null }));
  keyed.sort((a, b) => {
    if (a.k == null || b.k == null) {
      if (a.k != null) return -1;
      if (b.k != null) return 1;
    } else if (a.k !== b.k) return (a.k < b.k ? -1 : 1) * dir;
    return a.i - b.i;
  });
  return keyed.map((x) => x.row);
}

/** A table header cell that sorts its column on click, with an arrow while it's the active sort. */
export function SortHead({
  label,
  icon,
  active,
  reverse,
  onClick,
  className,
  align = "left",
}: {
  label: ReactNode;
  icon?: ReactNode;
  active: boolean;
  reverse?: boolean;
  onClick: () => void;
  className?: string;
  align?: "left" | "right";
}) {
  const Arrow = reverse ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={onClick}
      title={active ? (reverse ? "Sorted (reversed) — click for the default order" : "Sorted — click to reverse") : "Click to sort"}
      className={cn(
        "group/sort flex h-8 w-full min-w-0 items-center gap-1.5 px-2 text-left transition-colors hover:bg-hover hover:text-fg",
        align === "right" && "justify-end",
        active && "text-fg",
        className,
      )}
    >
      {icon && <span className={cn("shrink-0", active ? "text-accent" : "text-fg-3")}>{icon}</span>}
      <span className="truncate">{label}</span>
      {active ? <Arrow className="size-3 shrink-0 text-accent" /> : <ArrowDown className="size-3 shrink-0 opacity-0 group-hover/sort:opacity-40" />}
    </button>
  );
}

/** "Sort" button + menu. Shows the active sort so it's clear the order isn't the default one. */
export function SortMenu<K extends string>({
  options,
  sort,
  onChange,
  noun,
}: {
  options: SortOption<K>[];
  sort: SortState<K>;
  onChange: (s: SortState<K>) => void;
  /** "projects", "tasks"… — for the menu heading. */
  noun: string;
}) {
  const { setAnchor, ...pop } = usePopover();
  const active = options.find((o) => o.value === sort.by) ?? options[0]!;
  const sorted = active.value !== options[0]!.value;
  return (
    <>
      <button
        ref={setAnchor}
        type="button"
        onClick={pop.toggle}
        title={sorted ? `Sorted by ${active.label.toLowerCase()} — ${active.order?.[sort.reverse ? 1 : 0].toLowerCase()}` : `Sort ${noun}`}
        className={cn("flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-[14px] hover:bg-hover", sorted ? "text-accent" : "text-fg-2")}
      >
        <ArrowDownUp className="size-3.5" /> {sorted ? `Sort: ${active.label}` : "Sort"}
      </button>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor} align="end" width={220}>
        <MenuList>
          <MenuLabel>Sort {noun} by</MenuLabel>
          {options.map((o) => (
            <MenuItem
              key={o.value}
              selected={o.value === active.value}
              onSelect={() => {
                onChange({ by: o.value });
                if (!o.order) pop.close();
              }}
            >
              {o.label}
            </MenuItem>
          ))}
          {active.order && (
            <>
              <MenuDivider />
              <MenuLabel>Order</MenuLabel>
              {active.order.map((label, i) => (
                <MenuItem
                  key={label}
                  selected={!!sort.reverse === (i === 1)}
                  onSelect={() => {
                    onChange({ ...sort, reverse: i === 1 });
                    pop.close();
                  }}
                >
                  {label}
                </MenuItem>
              ))}
            </>
          )}
        </MenuList>
      </Popover>
    </>
  );
}
