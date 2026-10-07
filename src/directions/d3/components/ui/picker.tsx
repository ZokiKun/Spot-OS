"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/directions/d3/lib/utils";

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
      <div className="border-b-2 border-line p-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="h-10 w-full rounded-xl border-2 border-line bg-input px-3 text-[14px] font-semibold outline-none placeholder:text-fg-3 focus:border-blue"
        />
      </div>
      <div className="max-h-72 overflow-y-auto p-1.5">
        {filtered.length === 0 && <div className="px-2.5 py-2 text-[13px] text-fg-3">{emptyLabel ?? "No results"}</div>}
        {filtered.map((item, i) => (
          <button
            key={String(item.value)}
            type="button"
            onMouseEnter={() => setActive(i)}
            onClick={() => onSelect(item.value)}
            className={cn(
              "flex min-h-10 w-full items-center gap-2 rounded-xl px-2.5 py-1 text-left text-[14px] font-bold",
              i === active && "bg-hover",
            )}
          >
            <span className="min-w-0 flex-1 truncate">{item.render ?? item.label}</span>
            {value != null && item.value === value && <Check className="size-4 shrink-0 text-blue" strokeWidth={3} />}
          </button>
        ))}
        {onClear && value != null && (
          <>
            <div className="-mx-1.5 my-1.5 h-[2px] bg-line" />
            <button
              type="button"
              onClick={onClear}
              className="flex h-10 w-full items-center rounded-xl px-2.5 text-left text-[14px] font-bold text-fg-2 hover:bg-hover"
            >
              {clearLabel}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
