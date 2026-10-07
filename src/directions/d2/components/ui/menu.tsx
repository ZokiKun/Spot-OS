"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/directions/d2/lib/utils";

export function MenuList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("p-1.5", className)}>{children}</div>;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-3 pb-1 pt-2 text-[12px] text-fg-3">{children}</div>;
}

export function MenuDivider() {
  return <div className="-mx-1.5 my-1.5 h-px bg-line" />;
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
        "flex h-9 w-full items-center gap-2.5 rounded-full px-3 text-left text-[14px] transition-colors duration-75 hover:bg-hover disabled:opacity-40",
        danger && "text-danger",
        active && "bg-hover",
      )}
    >
      {icon && <span className={cn("flex size-4 shrink-0 items-center justify-center", danger ? "text-danger" : "text-fg-2")}>{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hint && <span className="shrink-0 text-[12px] text-fg-3">{hint}</span>}
      {selected && <Check className="size-4 shrink-0 text-fg" />}
    </button>
  );
}
