"use client";

import { forwardRef, useLayoutEffect, useRef, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-8 w-full rounded-md bg-input px-2.5 text-[14px] text-fg shadow-[inset_0_0_0_1px_var(--border-strong)] outline-none transition-shadow placeholder:text-fg-3 focus:shadow-[inset_0_0_0_1px_var(--accent),0_0_0_3px_var(--accent-soft)]",
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
}: {
  checked: boolean;
  /** The click comes along so callers can read modifier keys (shift-click ranges). */
  onChange: (v: boolean, e: React.MouseEvent) => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked, e);
      }}
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] transition-colors duration-100",
        checked ? "bg-accent text-white" : "shadow-[inset_0_0_0_1.5px_var(--text-3)] hover:bg-hover",
        className,
      )}
    >
      {checked && (
        <svg viewBox="0 0 14 14" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7.5l2.5 2.5L11 4.5" />
        </svg>
      )}
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
        "relative inline-flex h-[14px] w-[26px] shrink-0 items-center rounded-full p-[2px] transition-colors duration-150",
        checked ? "bg-accent" : "bg-[rgba(135,131,120,0.3)]",
      )}
    >
      <span className={cn("size-[10px] rounded-full bg-white transition-transform duration-150", checked && "translate-x-[12px]")} />
    </button>
  );
}
