"use client";

import type { ReactNode } from "react";
import { cn, formatDay, daysUntil } from "@/directions/d3/lib/utils";
import type { Option } from "@/directions/d3/lib/constants";
import type { Profile, Project, UUID } from "@/directions/d3/lib/types";
import { Popover, usePopover } from "./popover";
import { Picker } from "./picker";
import { StatusTag, Tag } from "./tag";
import { Avatar, PersonChip } from "./avatar";
import { MiniCalendar } from "./mini-calendar";

/** Button that looks like a cell value and opens a popover editor. */
function FieldButton({
  setAnchor,
  onClick,
  children,
  className,
  variant,
}: {
  setAnchor: (el: HTMLButtonElement | null) => void;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  variant: "cell" | "property";
}) {
  return (
    <button
      ref={setAnchor}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex min-w-0 items-center text-left transition-colors duration-75 hover:bg-hover",
        variant === "property" ? "min-h-9 w-full rounded-xl px-1.5 py-1 font-bold" : "h-full min-h-9 w-full rounded-lg px-2 font-bold",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function OptionField<T extends string>({
  options,
  value,
  onChange,
  variant = "cell",
  kind = "status",
  placeholder = "Empty",
}: {
  options: Option<T>[];
  value: T | null;
  onChange: (v: T) => void;
  variant?: "cell" | "property";
  kind?: "status" | "select";
  placeholder?: string;
}) {
  const pop = usePopover();
  const current = options.find((o) => o.value === value);
  const render = (o: Option<T>) =>
    kind === "status" ? <StatusTag color={o.color}>{o.label}</StatusTag> : <Tag color={o.color}>{o.label}</Tag>;
  return (
    <>
      <FieldButton setAnchor={pop.setAnchor} onClick={pop.toggle} variant={variant}>
        {current ? render(current) : <span className="text-fg-3">{placeholder}</span>}
      </FieldButton>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor} width={240}>
        <Picker
          items={options.map((o) => ({ value: o.value, label: o.label, render: render(o) }))}
          value={value}
          placeholder="Search for an option…"
          onSelect={(v) => {
            onChange(v);
            pop.close();
          }}
        />
      </Popover>
    </>
  );
}

export function PersonField({
  people,
  value,
  onChange,
  variant = "cell",
  compact = false,
  placeholder = "Empty",
}: {
  people: Profile[];
  value: UUID | null;
  onChange: (v: UUID | null) => void;
  variant?: "cell" | "property";
  compact?: boolean;
  placeholder?: string;
}) {
  const pop = usePopover();
  const current = people.find((p) => p.id === value);
  return (
    <>
      <FieldButton setAnchor={pop.setAnchor} onClick={pop.toggle} variant={variant}>
        {current ? (
          compact ? (
            <Avatar profile={current} size={20} />
          ) : (
            <PersonChip profile={current} />
          )
        ) : (
          <span className="text-fg-3">{placeholder}</span>
        )}
      </FieldButton>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor} width={240}>
        <Picker
          items={people.map((p) => ({ value: p.id, label: p.full_name, render: <PersonChip profile={p} /> }))}
          value={value}
          placeholder="Search for a person…"
          onSelect={(v) => {
            onChange(v);
            pop.close();
          }}
          onClear={() => {
            onChange(null);
            pop.close();
          }}
          clearLabel="Remove person"
        />
      </Popover>
    </>
  );
}

export function DateField({
  value,
  onChange,
  variant = "cell",
  highlightOverdue = false,
  placeholder = "Empty",
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  variant?: "cell" | "property";
  highlightOverdue?: boolean;
  placeholder?: string;
}) {
  const pop = usePopover();
  const diff = daysUntil(value);
  const overdue = highlightOverdue && diff != null && diff < 0;
  return (
    <>
      <FieldButton setAnchor={pop.setAnchor} onClick={pop.toggle} variant={variant}>
        {value ? (
          <span className={cn("truncate", overdue && "text-danger")}>{formatDay(value)}</span>
        ) : (
          <span className="text-fg-3">{placeholder}</span>
        )}
      </FieldButton>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor}>
        <MiniCalendar
          value={value}
          onSelect={(iso) => {
            onChange(iso);
            pop.close();
          }}
        />
        {value && (
          <div className="border-t-2 border-line p-1.5">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                pop.close();
              }}
              className="flex h-10 w-full items-center rounded-xl px-2.5 text-[14px] font-bold text-fg-2 hover:bg-hover"
            >
              Clear date
            </button>
          </div>
        )}
      </Popover>
    </>
  );
}

export function ProjectField({
  projects,
  value,
  onChange,
  variant = "cell",
  placeholder = "No project",
}: {
  projects: Project[];
  value: UUID | null;
  onChange: (v: UUID | null) => void;
  variant?: "cell" | "property";
  placeholder?: string;
}) {
  const pop = usePopover();
  const current = projects.find((p) => p.id === value);
  const label = (p: Project) => (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="w-4 shrink-0 text-center text-[13px]">{p.icon ?? "📁"}</span>
      <span className="truncate">{p.name}</span>
    </span>
  );
  return (
    <>
      <FieldButton setAnchor={pop.setAnchor} onClick={pop.toggle} variant={variant}>
        {current ? label(current) : <span className="text-fg-3">{placeholder}</span>}
      </FieldButton>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor} width={280}>
        <Picker
          items={projects.map((p) => ({ value: p.id, label: p.name, render: label(p) }))}
          value={value}
          placeholder="Search projects…"
          onSelect={(v) => {
            onChange(v);
            pop.close();
          }}
          onClear={() => {
            onChange(null);
            pop.close();
          }}
          clearLabel="Remove from project"
        />
      </Popover>
    </>
  );
}

/** Labelled fact: small uppercase label above an editable value, inside a soft tile. */
export function PropertyRow({ icon, label, children }: { icon?: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border-2 border-line px-1.5 pb-1 pt-2">
      <div className="label-caps flex items-center gap-1.5 px-1.5 text-[11px] text-fg-3">
        {icon && <span className="flex size-3.5 items-center justify-center">{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      <div className="min-w-0 text-[15px]">{children}</div>
    </div>
  );
}
