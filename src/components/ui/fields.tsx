"use client";

import type { ReactNode } from "react";
import { cn, formatDay, daysUntil } from "@/lib/utils";
import type { Option } from "@/lib/constants";
import type { Milestone, Profile, Project, UUID } from "@/lib/types";
import { Popover, usePopover } from "./popover";
import { Picker } from "./picker";
import { StatusTag, Tag } from "./tag";
import { Avatar, AvatarStack, PersonChip } from "./avatar";
import { MiniCalendar } from "./mini-calendar";

/** "chip": a compact toolbar button (e.g. the bulk-edit bar). */
type FieldVariant = "cell" | "property" | "chip";

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
  variant: FieldVariant;
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
        variant === "property"
          ? "min-h-[30px] w-full rounded-md px-1.5 py-1"
          : variant === "chip"
            ? "h-7 shrink-0 gap-1.5 rounded-md px-2 text-[13px]"
            : "h-full min-h-8 w-full px-2",
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
  variant?: FieldVariant;
  kind?: "status" | "select";
  placeholder?: ReactNode;
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
  variant?: FieldVariant;
  compact?: boolean;
  placeholder?: ReactNode;
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

/** Several people (e.g. task assignees). The picker stays open so you can tick more than one. */
export function PeopleField({
  people,
  value,
  onChange,
  variant = "cell",
  placeholder = "Empty",
}: {
  people: Profile[];
  value: UUID[];
  onChange: (v: UUID[]) => void;
  variant?: FieldVariant;
  placeholder?: ReactNode;
}) {
  const pop = usePopover();
  const current = value.map((id) => people.find((p) => p.id === id)).filter((p): p is Profile => !!p);
  return (
    <>
      <FieldButton setAnchor={pop.setAnchor} onClick={pop.toggle} variant={variant}>
        {current.length === 0 ? (
          <span className="text-fg-3">{placeholder}</span>
        ) : current.length === 1 ? (
          <PersonChip profile={current[0]} />
        ) : variant === "property" ? (
          <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            {current.map((p) => (
              <PersonChip key={p.id} profile={p} />
            ))}
          </span>
        ) : (
          <span className="flex min-w-0 items-center gap-1.5">
            <AvatarStack profiles={current} />
            <span className="truncate">{current.length} people</span>
          </span>
        )}
      </FieldButton>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor} width={240}>
        <Picker
          items={people.map((p) => ({ value: p.id, label: p.full_name, render: <PersonChip profile={p} /> }))}
          selected={value}
          placeholder="Add people…"
          onSelect={(id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])}
          onClear={() => {
            onChange([]);
            pop.close();
          }}
          clearLabel="Remove everyone"
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
  variant?: FieldVariant;
  highlightOverdue?: boolean;
  placeholder?: ReactNode;
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
          <div className="border-t border-line p-1">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                pop.close();
              }}
              className="flex h-7 w-full items-center rounded-md px-2 text-[14px] text-fg-2 hover:bg-hover"
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
  variant?: FieldVariant;
  placeholder?: ReactNode;
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

/** Notion page property row: icon + muted label on the left, editable value on the right. */
export function PropertyRow({ icon, label, children, narrow = false }: { icon: ReactNode; label: string; children: ReactNode; narrow?: boolean }) {
  return (
    <div className="flex min-h-[34px] items-start gap-1">
      <div className={cn("flex h-[30px] w-40 shrink-0 items-center gap-1.5 px-1.5 text-[14px] text-fg-2 max-sm:w-32", narrow && "w-32 lg:w-[9.75rem]")}>
        <span className="flex size-4 items-center justify-center text-fg-3">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="min-w-0 flex-1 text-[14px]">{children}</div>
    </div>
  );
}

/** Pick one of a project's milestones (already in timeline order), or none. */
export function MilestoneField({
  milestones,
  value,
  onChange,
  variant = "cell",
  placeholder = "No milestone",
}: {
  milestones: Milestone[];
  value: UUID | null;
  onChange: (v: UUID | null) => void;
  variant?: FieldVariant;
  placeholder?: ReactNode;
}) {
  const pop = usePopover();
  const index = milestones.findIndex((m) => m.id === value);
  const label = (m: Milestone, i: number) => (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0 text-[12px] text-fg-3 tabular">{i + 1}</span>
      <span className="truncate">{m.title}</span>
    </span>
  );
  return (
    <>
      <FieldButton setAnchor={pop.setAnchor} onClick={pop.toggle} variant={variant}>
        {index >= 0 ? label(milestones[index]!, index) : <span className="text-fg-3">{placeholder}</span>}
      </FieldButton>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor} width={260}>
        <Picker
          items={milestones.map((m, i) => ({ value: m.id, label: m.title, render: label(m, i) }))}
          value={value}
          placeholder="Search milestones…"
          emptyLabel="This project has no milestones yet"
          onSelect={(v) => {
            onChange(v);
            pop.close();
          }}
          onClear={() => {
            onChange(null);
            pop.close();
          }}
          clearLabel="Remove from milestone"
        />
      </Popover>
    </>
  );
}
