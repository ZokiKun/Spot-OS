"use client";

import { useLayoutEffect, useRef, useState, type TextareaHTMLAttributes } from "react";
import type { Profile } from "@/lib/types";
import { useWorkspace } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  /** Show suggestions in the flow (inside popovers, which clip overflow). */
  inlineSuggestions?: boolean;
};

/** Text before the caret ends in "@query" (query may be empty). */
function activeQuery(text: string, caret: number) {
  const m = /(^|\s)@([\p{L}\p{N}._-]*)$/u.exec(text.slice(0, caret));
  return m ? { query: m[2]!, start: caret - m[2]!.length - 1 } : null;
}

/**
 * Auto-growing textarea with @member autocomplete. Picking a member inserts "@Full Name ";
 * the store turns new mentions into notifications for that person when the text is saved.
 */
export function MentionTextarea({ value, onChange, className, onKeyDown, onBlur, inlineSuggestions, ...props }: Props) {
  const { data, me } = useWorkspace();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [state, setState] = useState<{ query: string; start: number } | null>(null);
  const [active, setActive] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const matches: Profile[] = state
    ? data.profiles
        .filter((p) => p.id !== me?.id)
        .filter((p) => p.full_name.toLowerCase().split(/\s+/).some((w) => w.startsWith(state.query.toLowerCase())) || p.full_name.toLowerCase().startsWith(state.query.toLowerCase()))
        .slice(0, 6)
    : [];

  const sync = (el: HTMLTextAreaElement) => {
    const q = activeQuery(el.value, el.selectionStart ?? el.value.length);
    setState(q);
    setActive(0);
  };

  const pick = (p: Profile) => {
    const el = ref.current;
    if (!el || !state) return;
    const caret = el.selectionStart ?? value.length;
    const insert = `@${p.full_name} `;
    const next = value.slice(0, state.start) + insert + value.slice(caret);
    onChange(next);
    setState(null);
    requestAnimationFrame(() => {
      el.focus();
      const pos = state.start + insert.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        rows={1}
        onChange={(e) => {
          onChange(e.target.value);
          sync(e.target);
        }}
        onKeyUp={(e) => (e.key === "ArrowLeft" || e.key === "ArrowRight") && sync(e.currentTarget)}
        onClick={(e) => sync(e.currentTarget)}
        onBlur={(e) => {
          // Let a click on a suggestion land first.
          setTimeout(() => setState(null), 120);
          onBlur?.(e);
        }}
        onKeyDown={(e) => {
          if (state && matches.length) {
            if (e.key === "ArrowDown") return (e.preventDefault(), setActive((a) => (a + 1) % matches.length));
            if (e.key === "ArrowUp") return (e.preventDefault(), setActive((a) => (a - 1 + matches.length) % matches.length));
            if (e.key === "Enter" || e.key === "Tab") return (e.preventDefault(), pick(matches[active]!));
            if (e.key === "Escape") return (e.preventDefault(), e.stopPropagation(), setState(null));
          }
          onKeyDown?.(e);
        }}
        className={cn("w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-fg-3", className)}
        {...props}
      />
      {state && matches.length > 0 && (
        <div role="listbox" aria-label="Mention a member" className={cn("rounded-md bg-elevated p-1", inlineSuggestions ? "mt-1 shadow-[0_0_0_1px_var(--border)]" : "anim-pop absolute left-0 top-full z-50 mt-1 w-60 shadow-menu")}>
          <div className="px-2 pb-1 pt-0.5 text-[11px] font-medium text-fg-3">Mention a member</div>
          {matches.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(p)}
              className={cn("flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[14px]", i === active && "bg-hover")}
            >
              <Avatar profile={p} size={20} />
              <span className="min-w-0 flex-1 truncate">{p.full_name}</span>
              {p.role_title && <span className="truncate text-[11px] text-fg-3">{p.role_title}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Render plain text with @mentions highlighted. */
export function MentionText({ text, className }: { text: string; className?: string }) {
  const { data } = useWorkspace();
  const names = data.profiles.flatMap((p) => [p.full_name, p.full_name.split(/\s+/)[0]!]).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!names.length) return <span className={className}>{text}</span>;
  const re = new RegExp(`(@(?:${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}))(?![\\w])`, "gi");
  const parts = text.split(re);
  return (
    <span className={className}>
      {parts.map((part, i) => (i % 2 === 1 ? <span key={i} className="rounded-[3px] bg-accent-soft px-0.5 font-medium text-accent">{part}</span> : part))}
    </span>
  );
}
