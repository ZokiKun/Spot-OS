"use client";

import { ListFilter } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { TASK_PRIORITIES } from "@/lib/constants";
import type { StatusOption } from "@/lib/task-statuses";
import { countFilters, DUE_BUCKETS, UNASSIGNED, type TaskFilters } from "@/lib/task-filter";
import { cn, firstName } from "@/lib/utils";
import { Popover, usePopover } from "@/components/ui/popover";
import { MenuDivider, MenuItem, MenuLabel, MenuList } from "@/components/ui/menu";
import { StatusTag, Tag } from "@/components/ui/tag";
import { Avatar } from "@/components/ui/avatar";

const toggle = <T,>(list: T[] | undefined, v: T) => (list?.includes(v) ? list.filter((x) => x !== v) : [...(list ?? []), v]);

/**
 * "Filter" button + menu for a list of tasks: status, assignee, due date and priority. Pick
 * several in a group to see any of them; groups combine. Shows how many filters are on.
 */
export function TaskFilterMenu({
  filters,
  onChange,
  statuses,
  hide = [],
  compact = false,
}: {
  filters: TaskFilters;
  onChange: (f: TaskFilters) => void;
  /** The status choices (a project's own, or the built-in five). */
  statuses: StatusOption[];
  /** Groups not to offer (e.g. "status" on a Completed tab). */
  hide?: (keyof TaskFilters)[];
  /** Small button, for section headers. */
  compact?: boolean;
}) {
  const { data, me } = useWorkspace();
  const { setAnchor, ...pop } = usePopover();
  const n = countFilters(filters);
  const set = <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => onChange({ ...filters, [key]: value?.length ? value : undefined });
  // You first, then everyone else by name.
  const people = [...data.profiles].sort((a, b) => (a.id === me?.id ? -1 : b.id === me?.id ? 1 : a.full_name.localeCompare(b.full_name)));

  return (
    <>
      <button
        ref={setAnchor}
        type="button"
        onClick={pop.toggle}
        title={n ? `${n} filter${n === 1 ? "" : "s"} on` : "Filter tasks by status, assignee, due date or priority"}
        className={cn(
          "flex shrink-0 items-center rounded-md hover:bg-hover",
          compact ? "h-6 gap-1 px-1.5 text-[12px]" : "h-7 gap-1.5 px-2 text-[14px]",
          n ? "font-medium text-accent" : compact ? "text-fg-3 hover:text-fg-2" : "text-fg-2",
        )}
      >
        <ListFilter className="size-3.5" />
        <span className={cn(compact && "hidden xl:inline")}>Filter{n ? ` · ${n}` : ""}</span>
      </button>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor} align="end" width={240}>
        <MenuList>
          {!hide.includes("status") && (
            <>
              <MenuLabel>Status</MenuLabel>
              {statuses.map((o) => (
                <MenuItem key={o.value} selected={filters.status?.includes(o.value)} onSelect={() => set("status", toggle(filters.status, o.value))}>
                  <StatusTag color={o.color}>{o.label}</StatusTag>
                </MenuItem>
              ))}
              <MenuDivider />
            </>
          )}
          {!hide.includes("assignees") && (
            <>
              <MenuLabel>Assignee</MenuLabel>
              {people.map((p) => (
                <MenuItem
                  key={p.id}
                  icon={<Avatar profile={p} size={16} />}
                  selected={filters.assignees?.includes(p.id)}
                  onSelect={() => set("assignees", toggle(filters.assignees, p.id))}
                >
                  {p.id === me?.id ? `${firstName(p.full_name)} (you)` : p.full_name}
                </MenuItem>
              ))}
              <MenuItem
                icon={<Avatar profile={null} size={16} />}
                selected={filters.assignees?.includes(UNASSIGNED)}
                onSelect={() => set("assignees", toggle(filters.assignees, UNASSIGNED))}
              >
                Unassigned
              </MenuItem>
              <MenuDivider />
            </>
          )}
          {!hide.includes("due") && (
            <>
              <MenuLabel>Due date</MenuLabel>
              {DUE_BUCKETS.map((b) => (
                <MenuItem key={b.value} selected={filters.due?.includes(b.value)} onSelect={() => set("due", toggle(filters.due, b.value))}>
                  <span className={cn(b.value === "overdue" && "text-danger")}>{b.label}</span>
                </MenuItem>
              ))}
              <MenuDivider />
            </>
          )}
          {!hide.includes("priority") && (
            <>
              <MenuLabel>Priority</MenuLabel>
              {[...TASK_PRIORITIES].reverse().map((o) => (
                <MenuItem key={o.value} selected={filters.priority?.includes(o.value)} onSelect={() => set("priority", toggle(filters.priority, o.value))}>
                  <Tag color={o.color}>{o.label}</Tag>
                </MenuItem>
              ))}
            </>
          )}
          {n > 0 && (
            <>
              <MenuDivider />
              <MenuItem
                onSelect={() => {
                  onChange({});
                  pop.close();
                }}
              >
                Clear filters
              </MenuItem>
            </>
          )}
        </MenuList>
      </Popover>
    </>
  );
}
