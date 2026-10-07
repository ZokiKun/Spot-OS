"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabItem<V extends string> {
  value: V;
  label: string;
  icon?: ReactNode;
  count?: number;
}

/** Chunky pill tabs — the selected one gets Duolingo's blue "selected answer" treatment. */
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
    <div role="tablist" className={cn("-mx-1 flex items-center gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none]", className)}>
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
              "label-caps flex h-10 shrink-0 items-center gap-2 rounded-xl border-2 border-b-4 px-3.5 text-[12.5px] transition-colors duration-100",
              selected ? "border-line-selected bg-selected text-blue" : "border-line text-fg-2 hover:bg-subtle",
            )}
          >
            {item.icon && <span className="flex size-5 items-center justify-center">{item.icon}</span>}
            {item.label}
            {item.count != null && item.count > 0 && (
              <span className={cn("rounded-full px-1.5 text-[11px] leading-[18px] tabular", selected ? "bg-blue text-white" : "bg-hover text-fg-2")}>
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Uppercase tabs with a blue underline (Duolingo profile "FOLLOWING / FOLLOWERS"). */
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
    <div role="tablist" className="flex items-center gap-1 overflow-x-auto border-b-2 border-line [scrollbar-width:none]">
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
              "label-caps relative flex h-12 shrink-0 items-center gap-1.5 px-3 text-[13px] transition-colors",
              selected ? "text-blue" : "text-fg-3 hover:text-fg-2",
            )}
          >
            {item.icon}
            {item.label}
            {item.count != null && item.count > 0 && <span className={cn("text-[12px]", selected ? "text-blue" : "text-fg-3")}>{item.count}</span>}
            {selected && <span className="absolute inset-x-2 -bottom-[2px] h-[3px] rounded-full bg-blue" />}
          </button>
        );
      })}
    </div>
  );
}
