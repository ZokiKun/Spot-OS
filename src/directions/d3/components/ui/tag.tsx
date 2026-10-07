import type { ReactNode } from "react";
import type { TagColor } from "@/directions/d3/lib/constants";
import { cn } from "@/directions/d3/lib/utils";

/** Soft-tinted label with saturated text (Duolingo "WEEK 1" / "OCTOBER" badges). */
export function Tag({
  color = "default",
  children,
  className,
}: {
  color?: TagColor;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        `tag-${color}`,
        "inline-flex h-6 max-w-full shrink-0 items-center truncate rounded-lg px-2 text-[12.5px] font-bold leading-6",
        className,
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Status pill: uppercase, bold, tinted — one colour per meaning. */
export function StatusTag({ color = "default", children, className }: { color?: TagColor; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        `tag-${color}`,
        "label-caps inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-[11px] leading-6",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ color = "default", className }: { color?: TagColor; className?: string }) {
  return <span className={cn(`dot-${color}`, "inline-block size-2.5 shrink-0 rounded-full", className)} />;
}
