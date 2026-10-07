import type { ReactNode } from "react";
import type { TagColor } from "@/directions/d2/lib/constants";
import { cn } from "@/directions/d2/lib/utils";

/** Select tag: soft pill. */
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
        "inline-flex h-6 max-w-full shrink-0 items-center truncate rounded-full px-2.5 text-[12px] leading-6 text-[var(--tag-text)]",
        className,
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Status pill with a dot. */
export function StatusTag({ color = "default", children, className }: { color?: TagColor; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        `tag-${color}`,
        "inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full pl-2 pr-2.5 text-[12px] leading-6 text-[var(--tag-text)]",
        className,
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current opacity-60" />
      {children}
    </span>
  );
}

export function Dot({ color = "default", className }: { color?: TagColor; className?: string }) {
  return <span className={cn(`dot-${color}`, "inline-block size-2 shrink-0 rounded-full", className)} />;
}
