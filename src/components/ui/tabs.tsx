"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabItem<V extends string> {
  value: V;
  label: string;
  icon?: ReactNode;
  count?: number;
}

/** Notion database view tabs — selected tab gets a soft filled pill. */
export function ViewTabs<V extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem<V>[];
  value: V;
  onChange: (v: V) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("-mx-1 flex items-center gap-0.5 overflow-x-auto [scrollbar-width:none]", className)}>
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={selected}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[14px] transition-colors duration-100",
              selected ? "bg-active font-medium text-fg" : "text-fg-2 hover:bg-hover",
            )}
          >
            {item.icon && <span className="flex size-4 items-center justify-center">{item.icon}</span>}
            {item.label}
            {item.count != null && item.count > 0 && <span className="text-[12px] text-fg-3">{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Underlined section tabs (used on project pages). */
export function UnderlineTabs<V extends string>({
  items,
  value,
  onChange,
}: {
  items: TabItem<V>[];
  value: V;
  onChange: (v: V) => void;
}) {
  return (
    <div role="tablist" className="flex items-center gap-4 overflow-x-auto border-b border-line">
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={selected}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "relative flex h-9 shrink-0 items-center gap-1.5 text-[14px] transition-colors",
              selected ? "font-medium text-fg" : "text-fg-2 hover:text-fg",
            )}
          >
            {item.icon}
            {item.label}
            {item.count != null && item.count > 0 && <span className="text-[12px] text-fg-3">{item.count}</span>}
            {selected && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-fg" />}
          </button>
        );
      })}
    </div>
  );
}
