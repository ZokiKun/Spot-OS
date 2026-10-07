"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/directions/d3/lib/utils";

export function MenuList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("p-1.5", className)}>{children}</div>;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="label-caps px-2.5 pb-1 pt-2 text-[11px] text-fg-3">{children}</div>;
}

export function MenuDivider() {
  return <div className="-mx-1.5 my-1.5 h-[2px] bg-line" />;
}

export function MenuItem({
  icon,
  children,
  onSelect,
  selected,
  danger,
  hint,
  active,
  disabled,
}: {
  icon?: ReactNode;
  children: ReactNode;
  onSelect?: () => void;
  selected?: boolean;
  danger?: boolean;
  hint?: ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-[14px] font-bold transition-colors duration-75 hover:bg-hover disabled:opacity-40",
        danger && "text-danger",
        active && "bg-hover",
      )}
    >
      {icon && <span className={cn("flex size-4 shrink-0 items-center justify-center", danger ? "text-danger" : "text-fg-2")}>{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hint && <span className="shrink-0 text-[12px] font-semibold text-fg-3">{hint}</span>}
      {selected && <Check className="size-4 shrink-0 text-blue" strokeWidth={3} />}
    </button>
  );
}
