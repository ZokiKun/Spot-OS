"use client";

import type { ReactNode } from "react";
import { cn } from "@/directions/d2/lib/utils";
import { Card } from "@/directions/d2/components/ui/chunk";

/** One settings chunk: a card with a title, a short helper line, then rows. */
export function SettingsSection({
  title,
  description,
  children,
  step,
  className,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Shows a numbered badge — for settings that are filled in order. */
  step?: number;
  className?: string;
}) {
  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-start gap-3">
        {step != null && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-[15px] font-medium text-on-accent tabular">{step}</span>
        )}
        <div className="min-w-0">
          <h2 className="text-[20px] font-medium leading-tight tracking-[-0.02em]">{title}</h2>
          {description && <p className="mt-1 max-w-[560px] text-[13.5px] leading-snug text-fg-2">{description}</p>}
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </Card>
  );
}

/** Label + helper on the left, the control on the right. Stacks on small screens. */
export function SettingsRow({ label, description, children }: { label: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="text-[15px] font-medium">{label}</div>
        {description && <div className="mt-0.5 max-w-md text-[13px] leading-snug text-fg-2">{description}</div>}
      </div>
      <div className="min-w-0 shrink-0">{children}</div>
    </div>
  );
}

/** Two or three mutually exclusive options as pills (readable on a surface card). */
export function Choice<V extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: V;
  options: { value: V; label: string }[];
  onChange: (v: V) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-10 shrink-0 items-center rounded-full px-4 text-[14px] transition-[background,color] duration-150 active:scale-[0.97]",
              selected ? "bg-accent font-medium text-on-accent" : "bg-hover text-fg-2 hover:bg-active hover:text-fg",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Small status pill with a coloured dot. */
export function Status({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span className={cn("inline-flex h-8 items-center gap-2 rounded-full px-3.5 text-[13px]", ok ? "bg-lime text-on-chunk" : "bg-hover text-fg-2")}>
      <span className={cn("size-2 rounded-full", ok ? "bg-[#151515]" : "bg-[var(--dot-gray)]")} />
      {children}
    </span>
  );
}
