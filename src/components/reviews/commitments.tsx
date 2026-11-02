"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Commitment, UUID } from "@/lib/types";
import { useWorkspace } from "@/lib/store";
import { monthStartOf } from "@/lib/studio-review";
import { cn, plural } from "@/lib/utils";
import { Button, IconButton } from "@/components/ui/button";
import { EditableText } from "@/components/ui/input";
import { PersonField } from "@/components/ui/fields";
import { Tag } from "@/components/ui/tag";
import { useMembers } from "./review-ui";

/** A month's commitments — the monthly goals. Shown on Month and, compact, under each month on Goals. */
export function useCommitments(month: string, person: UUID | null = null) {
  const { data } = useWorkspace();
  return useMemo(
    () => data.commitments.filter((c) => c.month === month && (!person || c.owner_id === person)).sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)),
    [data.commitments, month, person],
  );
}

export function CommitmentSummary({ month, person }: { month: string; person: UUID | null }) {
  const list = useCommitments(month, person);
  if (!list.length) return <>No commitments</>;
  return (
    <>
      {list.filter((c) => c.status === "done").length} of {plural(list.length, "commitment")} done
    </>
  );
}

/** Green tick box used by commitments and quarter goals. */
export function TickBox({ done, onToggle, disabled, small }: { done: boolean; onToggle: () => void; disabled?: boolean; small?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={done ? "Mark not done" : "Mark done"}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "mt-0.5 flex shrink-0 items-center justify-center rounded-[4px] transition-colors",
        small ? "size-4" : "size-[18px]",
        done ? "bg-[var(--success)] text-white" : "shadow-[inset_0_0_0_1.5px_var(--text-3)] hover:bg-hover",
      )}
    >
      {done && (
        <svg viewBox="0 0 14 14" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7.5l2.5 2.5L11 4.5" />
        </svg>
      )}
    </button>
  );
}

/** "Why not?" note on something that didn't happen. */
export function WhyField({ value, onCommit, disabled }: { value: string; onCommit: (v: string) => void; disabled?: boolean }) {
  return (
    <div className={cn("mt-1.5 flex items-start gap-2 rounded-md px-2 py-1.5", value ? "bg-subtle" : "bg-[var(--danger-soft)]")}>
      <span className="pt-px text-[12px] font-medium text-fg-2">Why not?</span>
      <div className="min-w-0 flex-1 text-[13px]">
        {disabled ? <span>{value}</span> : <EditableText value={value} onCommit={onCommit} placeholder="e.g. Halcyon film took the whole team for two weeks" multiline />}
      </div>
    </div>
  );
}

/** "+ Add …" input at the bottom of a tick list. */
export function AddRow({ placeholder, onAdd, small }: { placeholder: string; onAdd: (title: string) => void; small?: boolean }) {
  const [draft, setDraft] = useState("");
  return (
    <form
      className={cn("mt-1 flex items-center py-1", small ? "gap-2" : "gap-3")}
      onSubmit={(e) => {
        e.preventDefault();
        const title = draft.trim();
        if (!title) return;
        setDraft("");
        onAdd(title);
      }}
    >
      <Plus className={cn("ml-px shrink-0 text-fg-3", small ? "size-3.5" : "size-4")} />
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className={cn("min-w-0 flex-1 bg-transparent outline-none placeholder:text-fg-3", small ? "h-7 text-[13px]" : "h-8 text-[14px]")}
      />
      {draft.trim() && (
        <Button type="submit" size="sm">
          Add
        </Button>
      )}
    </form>
  );
}

/**
 * Written at the start of the month; ticked at the end. Anything not done says why.
 * `compact` is the narrow version used in the Goals timeline's month columns.
 */
export function Commitments({ month, person = null, compact = false }: { month: string; person?: UUID | null; compact?: boolean }) {
  const { create, update, remove, me, canEdit } = useWorkspace();
  const members = useMembers();
  const list = useCommitments(month, person);
  const [today] = useState(() => monthStartOf(new Date()));
  const over = month < today;
  const set = (c: Commitment, patch: Partial<Commitment>) => void update("commitments", c.id, patch);
  const add = (title: string) =>
    void create("commitments", {
      month,
      title,
      owner_id: person ?? me?.id ?? null,
      scope: "studio",
      status: null,
      why: null,
      sort_order: list.length,
      created_by: me?.id ?? null,
    });

  return (
    <div>
      {list.length === 0 && (
        <p className={cn("pb-1 text-fg-3", compact ? "text-[12.5px]" : "text-[13.5px]")}>
          {over ? "Nothing was written down for this month." : compact ? "No goals for this month yet." : "Write the 3–5 things the studio (or one of you) commits to this month."}
        </p>
      )}
      <div className={cn(!compact && "divide-y divide-line")}>
        {list.map((c) => {
          const done = c.status === "done";
          const askWhy = !done && (over || c.status === "not_done" || !!c.why);
          const owner = members.find((p) => p.id === c.owner_id);
          return (
            <div key={c.id} className={cn("group flex items-start", compact ? "gap-2 py-1" : "gap-3 py-2")}>
              <TickBox small={compact} done={done} disabled={!canEdit} onToggle={() => set(c, done ? { status: c.why ? "not_done" : null } : { status: "done" })} />
              <div className="min-w-0 flex-1">
                <EditableText
                  value={c.title}
                  onCommit={(title) => title && set(c, { title })}
                  multiline={compact}
                  className={cn(compact ? "text-[13.5px] leading-snug" : "text-[14.5px]", done && "text-fg-2 line-through decoration-fg-3")}
                />
                {compact ? (
                  <div className="text-[11.5px] text-fg-3">
                    {owner?.full_name.split(" ")[0] ?? "No owner"}
                    {c.scope === "personal" && " · personal"}
                  </div>
                ) : (
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-fg-3">
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => set(c, { scope: c.scope === "studio" ? "personal" : "studio" })}
                      title="Studio commitment or a personal one — click to switch"
                    >
                      <Tag color={c.scope === "studio" ? "blue" : "pink"}>{c.scope === "studio" ? "Studio" : "Personal"}</Tag>
                    </button>
                    <div className="-my-1 w-auto">
                      <PersonField compact people={members} value={c.owner_id} onChange={(owner_id) => set(c, { owner_id })} placeholder="Owner" />
                    </div>
                    {!askWhy && !done && !over && canEdit && (
                      <button type="button" onClick={() => set(c, { status: "not_done" })} className="rounded px-1 opacity-0 hover:bg-hover hover:text-fg-2 group-hover:opacity-100">
                        Not happening?
                      </button>
                    )}
                  </div>
                )}
                {askWhy && (
                  <WhyField value={c.why ?? ""} onCommit={(why) => set(c, { why: why || null, status: why || over ? "not_done" : null })} disabled={!canEdit} />
                )}
              </div>
              {canEdit && (
                <IconButton label="Remove" className="opacity-0 group-hover:opacity-100" onClick={() => void remove("commitments", c.id)}>
                  <Trash2 className="size-3.5" />
                </IconButton>
              )}
            </div>
          );
        })}
      </div>
      {canEdit && <AddRow small={compact} placeholder={compact ? "Add a goal…" : "Add a commitment, e.g. “Launch the studio site”…"} onAdd={add} />}
    </div>
  );
}
