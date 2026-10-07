"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Ellipsis, Plus, Trash2, X } from "lucide-react";
import { MEMBER_COLORS, type TagColor } from "@/lib/constants";
import { normalizeTag, useTags, type TagScope } from "@/lib/tags";
import { cn } from "@/lib/utils";
import { Popover, usePopover } from "./popover";
import { Tag } from "./tag";

const COLORS: TagColor[] = ["default", "gray", ...MEMBER_COLORS.filter((c) => c !== "gray")];

export function TagList({ scope, tags, max = 3, className }: { scope: TagScope; tags: string[]; max?: number; className?: string }) {
  const { colorOf } = useTags(scope);
  if (!tags.length) return null;
  return (
    <span className={cn("flex min-w-0 items-center gap-1 overflow-hidden", className)}>
      {tags.slice(0, max).map((t) => (
        <Tag key={t} color={colorOf(t)}>
          {t}
        </Tag>
      ))}
      {tags.length > max && <span className="shrink-0 text-[12px] text-fg-3">+{tags.length - max}</span>}
    </span>
  );
}

/** Notion multi-select: pick, create, rename, recolour and delete tags in one popover. */
export function TagsField({
  scope,
  value,
  onChange,
  variant = "cell",
  placeholder = "Empty",
}: {
  scope: TagScope;
  value: string[];
  onChange: (tags: string[]) => void;
  variant?: "cell" | "property";
  placeholder?: string;
}) {
  const { setAnchor: anchorRef, ...pop } = usePopover();
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          pop.toggle();
        }}
        className={cn(
          "flex min-w-0 items-center text-left transition-colors duration-75 hover:bg-hover",
          variant === "property" ? "min-h-[30px] w-full rounded-md px-1.5 py-1" : "h-full min-h-8 w-full px-2",
        )}
      >
        {value.length ? <TagList scope={scope} tags={value} max={variant === "property" ? 8 : 2} /> : <span className="text-fg-3">{placeholder}</span>}
      </button>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor} width={280}>
        <TagPicker scope={scope} value={value} onChange={onChange} />
      </Popover>
    </>
  );
}

export function TagPicker({ scope, value, onChange }: { scope: TagScope; value: string[]; onChange: (tags: string[]) => void }) {
  const tags = useTags(scope);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const q = normalizeTag(query);
  const filtered = useMemo(() => tags.defs.filter((d) => d.name.includes(q)), [tags.defs, q]);
  const exact = tags.defs.some((d) => d.name === q);

  // The popover is invisible until it has measured itself, so focus on the next frame.
  useEffect(() => {
    if (editing) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [editing]);

  const toggle = (name: string) => onChange(value.includes(name) ? value.filter((t) => t !== name) : [...value, name]);
  const createFromQuery = () => {
    const name = tags.add(q);
    if (name && !value.includes(name)) onChange([...value, name]);
    setQuery("");
  };

  if (editing) {
    const def = tags.defs.find((d) => d.name === editing);
    if (!def) {
      setEditing(null);
      return null;
    }
    return <TagEditor key={def.name} scope={scope} name={def.name} color={def.color} onBack={(to) => {
          if (to && to !== def.name && value.includes(def.name)) onChange([...new Set(value.map((t) => (t === def.name ? to : t)))]);
          setEditing(null);
        }} onDeleted={() => (onChange(value.filter((t) => t !== def.name)), setEditing(null))} />;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 border-b border-line p-1.5">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center">
            <Tag color={tags.colorOf(t)} className="pr-0.5">
              <span className="inline-flex items-center gap-0.5">
                {t}
                <button type="button" aria-label={`Remove ${t}`} onClick={() => toggle(t)} className="rounded-sm opacity-60 hover:opacity-100">
                  <X className="size-3" />
                </button>
              </span>
            </Tag>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && q) {
              e.preventDefault();
              if (exact) toggle(q);
              else createFromQuery();
              setQuery("");
            } else if (e.key === "Backspace" && !query && value.length) onChange(value.slice(0, -1));
          }}
          placeholder={value.length ? "" : "Search or create a tag…"}
          className="h-6 min-w-[80px] flex-1 bg-transparent px-1 text-[14px] outline-none placeholder:text-fg-3"
        />
      </div>
      <div className="max-h-72 overflow-y-auto p-1">
        <div className="px-2 pb-1 pt-1 text-[12px] text-fg-3">Select a tag or create one</div>
        {filtered.map((d) => (
          <div key={d.name} className="group flex h-7 items-center gap-1 rounded-md pl-2 pr-1 hover:bg-hover">
            <button type="button" onClick={() => toggle(d.name)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
              <Tag color={d.color}>{d.name}</Tag>
              <span className="text-[11px] text-fg-3">{tags.counts.get(d.name) ?? 0}</span>
              {value.includes(d.name) && <Check className="ml-auto size-4 shrink-0" />}
            </button>
            <button
              type="button"
              aria-label={`Edit ${d.name}`}
              onClick={() => setEditing(d.name)}
              className="flex size-6 shrink-0 items-center justify-center rounded text-fg-3 opacity-0 hover:bg-active hover:text-fg group-hover:opacity-100 focus:opacity-100"
            >
              <Ellipsis className="size-4" />
            </button>
          </div>
        ))}
        {q && !exact && (
          <button type="button" onClick={createFromQuery} className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[14px] hover:bg-hover">
            <Plus className="size-4 text-fg-3" /> Create <Tag color="default">{q}</Tag>
          </button>
        )}
        {!q && filtered.length === 0 && <div className="px-2 py-1.5 text-[13px] text-fg-3">No tags yet — type to create one.</div>}
      </div>
    </div>
  );
}

function TagEditor({
  scope,
  name,
  color,
  onBack,
  onDeleted,
}: {
  scope: TagScope;
  name: string;
  color: TagColor;
  onBack: (renamedTo?: string) => void;
  onDeleted: () => void;
}) {
  const tags = useTags(scope);
  const [draft, setDraft] = useState(name);
  const used = tags.counts.get(name) ?? 0;
  const commit = () => {
    const next = normalizeTag(draft);
    if (next && next !== name) tags.rename(name, next);
    onBack(next || name);
  };
  return (
    <div className="p-1.5">
      <div className="mb-1.5 flex items-center gap-1">
        <button type="button" aria-label="Back" onClick={commit} className="flex size-6 items-center justify-center rounded text-fg-2 hover:bg-hover">
          <ArrowLeft className="size-4" />
        </button>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="h-7 flex-1 rounded-md bg-input px-2 text-[14px] shadow-[inset_0_0_0_1px_var(--border)] outline-none focus:shadow-[inset_0_0_0_1px_var(--accent)]"
          aria-label="Tag name"
        />
      </div>
      <div className="px-1 pb-1 text-[12px] text-fg-3">Colour</div>
      <div className="grid grid-cols-5 gap-1 px-1 pb-2">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => tags.recolor(name, c)}
            aria-label={c}
            title={c}
            className={cn("flex h-7 items-center justify-center rounded-md hover:bg-hover", color === c && "bg-active")}
          >
            <span className={cn(`tag-${c}`, "size-4 rounded-[4px] shadow-[inset_0_0_0_1px_var(--border)]")} />
          </button>
        ))}
      </div>
      <div className="-mx-1.5 h-px bg-line" />
      <button
        type="button"
        onClick={() => {
          if (!used || confirm(`Delete “${name}”? It’s removed from ${used} item${used === 1 ? "" : "s"}.`)) {
            tags.remove(name);
            onDeleted();
          }
        }}
        className="mt-1 flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[14px] text-danger hover:bg-hover"
      >
        <Trash2 className="size-4" /> Delete tag
      </button>
    </div>
  );
}
