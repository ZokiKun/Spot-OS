"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/directions/d2/lib/utils";

export interface PickerItem<V> {
  value: V;
  label: string;
  render?: ReactNode;
}

/** Notion-style searchable option list (used for status, people, project pickers). */
export function Picker<V>({
  items,
  value,
  onSelect,
  placeholder = "Search…",
  emptyLabel,
  onClear,
  clearLabel = "Clear",
}: {
  items: PickerItem<V>[];
  value?: V | null;
  onSelect: (value: V) => void;
  placeholder?: string;
  emptyLabel?: string;
  onClear?: () => void;
  clearLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(
    () => items.filter((i) => i.label.toLowerCase().includes(query.trim().toLowerCase())),
    [items, query],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[active];
      if (item) onSelect(item.value);
    }
  };

  return (
    <div className="w-full">
      <div className="border-b border-line p-1.5">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="h-9 w-full rounded-full bg-input px-3.5 text-[14px] outline-none placeholder:text-fg-3 focus:shadow-[inset_0_0_0_1.5px_var(--text)]"
        />
      </div>
      <div className="max-h-72 overflow-y-auto p-1">
        {filtered.length === 0 && <div className="px-2 py-1.5 text-[13px] text-fg-3">{emptyLabel ?? "No results"}</div>}
        {filtered.map((item, i) => (
          <button
            key={String(item.value)}
            type="button"
            onMouseEnter={() => setActive(i)}
            onClick={() => onSelect(item.value)}
            className={cn(
              "flex min-h-9 w-full items-center gap-2 rounded-full px-3 py-1 text-left text-[14px]",
              i === active && "bg-hover",
            )}
          >
            <span className="min-w-0 flex-1 truncate">{item.render ?? item.label}</span>
            {value != null && item.value === value && <Check className="size-4 shrink-0" />}
          </button>
        ))}
        {onClear && value != null && (
          <>
            <div className="-mx-1 my-1 h-px bg-line" />
            <button
              type="button"
              onClick={onClear}
              className="flex h-9 w-full items-center rounded-full px-3 text-left text-[14px] text-fg-2 hover:bg-hover"
            >
              {clearLabel}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
