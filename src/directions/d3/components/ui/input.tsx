"use client";

import { forwardRef, useLayoutEffect, useRef, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/directions/d3/lib/utils";

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-12 w-full rounded-2xl border-2 border-line bg-input px-4 text-[15px] font-semibold text-fg outline-none transition-colors placeholder:font-semibold placeholder:text-fg-3 focus:border-blue",
        className,
      )}
      {...props}
    />
  );
});

/** Textarea that grows with its content. */
export function AutoTextarea({ className, value, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      className={cn("w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-fg-3", className)}
      {...props}
    />
  );
}

/**
 * Inline-editable text that looks like plain text until focused (Notion titles & cells).
 * Commits on blur / Enter; Escape reverts.
 */
export function EditableText({
  value,
  onCommit,
  placeholder,
  className,
  multiline = false,
  autoFocus,
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  autoFocus?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  // Take remote changes while not editing (adjust state during render, not in an effect).
  const [seen, setSeen] = useState(value);
  if (!editing && value !== seen) {
    setSeen(value);
    setDraft(value);
  }

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== value.trim()) onCommit(draft.trim());
  };

  const shared = {
    value: draft,
    placeholder,
    autoFocus,
    onFocus: () => setEditing(true),
    onBlur: commit,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (!multiline || !e.shiftKey)) {
        e.preventDefault();
        (e.target as HTMLElement).blur();
      } else if (e.key === "Escape") {
        setDraft(value);
        setEditing(false);
        requestAnimationFrame(() => (e.target as HTMLElement).blur());
      }
    },
  };

  if (multiline) return <AutoTextarea {...shared} className={cn("block", className)} />;
  return <input {...shared} className={cn("w-full min-w-0 bg-transparent outline-none placeholder:text-fg-3", className)} />;
}

export function Checkbox({
  checked,
  onChange,
  label,
  className,
  size = 26,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  className?: string;
  size?: number;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      style={{ width: size, height: size }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full transition-colors duration-150",
        checked
          ? "anim-check bg-green text-white shadow-[0_2px_0_var(--green-edge)]"
          : "border-2 border-b-[3px] border-line-strong bg-bg text-transparent hover:border-green hover:text-green",
        className,
      )}
    >
      <svg viewBox="0 0 14 14" className="size-[58%]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7.5l2.5 2.5L11 4.5" />
      </svg>
    </button>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors duration-150",
        checked ? "bg-blue" : "bg-active",
      )}
    >
      <span className={cn("size-5 rounded-full bg-white shadow-[0_2px_0_rgba(0,0,0,0.15)] transition-transform duration-150", checked && "translate-x-5")} />
    </button>
  );
}
