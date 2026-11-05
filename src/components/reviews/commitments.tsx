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

const EXAMPLES = ["Launch the studio site", "Pitch two new clients", "Ship the first chapter"];

/**
 * Written at the start of the month; ticked at the end. Anything not done says why.
 * `compact` is the narrow version used in the Goals timeline's month columns.
 */
export function Commitments({ month, person = null, compact = false }: { month: string; person?: UUID | null; compact?: boolean }) {
  const { create, update, remove, me, canEdit } = useWorkspace();
  const members = useMembers();
  const list = useCommitments(month, person);
  const [today] = useState(() => monthStartOf(new Date()));
  const [typing, setTyping] = useState(false);
  const over = month < today;
  const set = (c: Commitment, patch: Partial<Commitment>) => void update("commitments", c.id, patch);
  const toggle = (c: Commitment) => set(c, c.status === "done" ? { status: c.why ? "not_done" : null } : { status: "done" });
  const setWhy = (c: Commitment, why: string) => set(c, { why: why || null, status: why || over ? "not_done" : null });
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

  if (compact)
    return (
      <div>
        {list.length === 0 && <p className="pb-1 text-[12.5px] text-fg-3">{over ? "Nothing was written down for this month." : "No goals for this month yet."}</p>}
        {list.map((c) => {
          const done = c.status === "done";
          const owner = members.find((p) => p.id === c.owner_id);
          return (
            <div key={c.id} className="group flex items-start gap-2 py-1">
              <TickBox small done={done} disabled={!canEdit} onToggle={() => toggle(c)} />
              <div className="min-w-0 flex-1">
                <EditableText
                  value={c.title}
                  onCommit={(title) => title && set(c, { title })}
                  multiline
                  className={cn("text-[13.5px] leading-snug", done && "text-fg-2 line-through decoration-fg-3")}
                />
                <div className="text-[11.5px] text-fg-3">
                  {owner?.full_name.split(" ")[0] ?? "No owner"}
                  {c.scope === "personal" && " · personal"}
                </div>
                {!done && (over || c.status === "not_done" || !!c.why) && <WhyField value={c.why ?? ""} onCommit={(why) => setWhy(c, why)} disabled={!canEdit} />}
              </div>
              {canEdit && (
                <IconButton label="Remove" className="opacity-0 group-hover:opacity-100" onClick={() => void remove("commitments", c.id)}>
                  <Trash2 className="size-3.5" />
                </IconButton>
              )}
            </div>
          );
        })}
        {canEdit && <AddRow small placeholder="Add a goal…" onAdd={add} />}
      </div>
    );

  // Aim for 3–5: until there are three, the missing ones show as numbered empty slots to fill in.
  const slots = canEdit && !over ? Math.max(0, 3 - list.length) : 0;
  const addFromSlot = (title: string) => {
    setTyping(true);
    add(title);
  };
  return (
    <div>
      {list.length > 0 && <CommitmentStrip list={list} />}
      {list.length === 0 && (over || !canEdit) && <p className="text-[13.5px] text-fg-3">{over ? "Nothing was written down for this month." : "Nothing written down yet."}</p>}
      {list.length === 0 && slots > 0 && (
        <p className="mb-2 text-[13px] text-fg-3">Pick the 3–5 things the studio, or one of you, commits to this month. Tick them off as they happen.</p>
      )}
      <ol className="space-y-1.5">
        {list.map((c, n) => {
          const done = c.status === "done";
          const missed = c.status === "not_done";
          const askWhy = !done && (over || missed || !!c.why);
          return (
            <li
              key={c.id}
              className={cn(
                "group flex items-start gap-3 rounded-lg px-3 py-2.5 shadow-[0_0_0_1px_var(--border)] transition-colors",
                done ? "bg-[color-mix(in_srgb,var(--success)_8%,transparent)]" : "hover:bg-hover",
              )}
            >
              <TickBox done={done} disabled={!canEdit} onToggle={() => toggle(c)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3">
                  <span className="mt-[3px] w-4 shrink-0 text-[12px] font-medium tabular text-fg-3">{n + 1}</span>
                  <EditableText
                    value={c.title}
                    onCommit={(title) => title && set(c, { title })}
                    className={cn("min-w-0 flex-1 text-[14.5px] font-medium", done && "text-fg-2 line-through decoration-fg-3", missed && "text-fg-2")}
                  />
                  <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-fg-3">
                    {!askWhy && !done && !over && canEdit && (
                      <button type="button" onClick={() => set(c, { status: "not_done" })} className="hidden rounded px-1 opacity-0 hover:bg-hover hover:text-fg-2 group-hover:opacity-100 sm:inline">
                        Not happening?
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => set(c, { scope: c.scope === "studio" ? "personal" : "studio" })}
                      title="Studio commitment or a personal one — click to switch"
                    >
                      <Tag color={c.scope === "studio" ? "blue" : "pink"}>{c.scope === "studio" ? "Studio" : "Personal"}</Tag>
                    </button>
                    <span className="-my-1">
                      <PersonField compact people={members} value={c.owner_id} onChange={(owner_id) => set(c, { owner_id })} placeholder="Owner" />
                    </span>
                    {canEdit && (
                      <IconButton label="Remove" className="-my-1 opacity-0 group-hover:opacity-100" onClick={() => void remove("commitments", c.id)}>
                        <Trash2 className="size-3.5" />
                      </IconButton>
                    )}
                  </span>
                </div>
                {askWhy && (
                  <div className="ml-7">
                    <WhyField value={c.why ?? ""} onCommit={(why) => setWhy(c, why)} disabled={!canEdit} />
                  </div>
                )}
              </div>
            </li>
          );
        })}
        {Array.from({ length: slots }, (_, k) => (
          <EmptySlot key={list.length + k} n={list.length + k + 1} example={EXAMPLES[(list.length + k) % EXAMPLES.length]!} active={k === 0} autoFocus={typing} onAdd={addFromSlot} />
        ))}
      </ol>
      {canEdit && !slots && <AddRow placeholder={list.length >= 5 ? "Add another — though 5 is usually plenty" : "Add another commitment…"} onAdd={add} />}
    </div>
  );
}

/** One segment per commitment: green done, red not happening, grey still open. */
function CommitmentStrip({ list }: { list: Commitment[] }) {
  const done = list.filter((c) => c.status === "done").length;
  return (
    <div className="mb-3 flex items-center gap-3">
      <div className="flex h-1.5 flex-1 gap-1">
        {list.map((c) => (
          <span
            key={c.id}
            className={cn("h-full flex-1 rounded-full", c.status === "done" ? "bg-[var(--success)]" : c.status === "not_done" ? "bg-[var(--danger)]" : "bg-[var(--border-strong)]")}
          />
        ))}
      </div>
      <span className="shrink-0 text-[12px] tabular text-fg-3">{Math.round((done / list.length) * 100)}% done</span>
    </div>
  );
}

/** A numbered, dashed slot waiting for a commitment. Only the first one takes typing; the rest point to it. */
function EmptySlot({ n, example, active, autoFocus, onAdd }: { n: number; example: string; active: boolean; autoFocus: boolean; onAdd: (title: string) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <li className={cn("flex items-center gap-3 rounded-lg border border-dashed border-[var(--border-strong)] px-3 py-2", active ? "focus-within:border-solid focus-within:border-[var(--accent)]" : "opacity-50")}>
      <Plus className={cn("size-[18px] shrink-0", active ? "text-fg-2" : "text-fg-3")} />
      <span className="w-4 shrink-0 text-[12px] font-medium tabular text-fg-3">{n}</span>
      {active ? (
        <form
          className="flex min-w-0 flex-1 items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const title = draft.trim();
            if (!title) return;
            setDraft("");
            onAdd(title);
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`e.g. “${example}”`}
            aria-label={`Commitment ${n}`}
            autoFocus={autoFocus}
            className="h-7 min-w-0 flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-fg-3"
          />
          {draft.trim() ? (
            <Button type="submit" size="sm" variant="primary">
              Add
            </Button>
          ) : (
            <span className="hidden shrink-0 font-sans text-[12px] text-fg-3 sm:inline">Enter to add</span>
          )}
        </form>
      ) : (
        <span className="h-7 flex-1 text-[14.5px] leading-7 text-fg-3">e.g. “{example}”</span>
      )}
    </li>
  );
}
