import type { ReactNode } from "react";
import type { TagColor } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Notion select tag: muted fill, 3px radius, 20px tall. */
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
        "inline-flex h-5 max-w-full shrink-0 items-center truncate rounded-[3px] px-1.5 text-[12.5px] leading-5 text-[var(--tag-text)]",
        className,
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Notion status property: pill with a coloured dot. */
export function StatusTag({ color = "default", children, className }: { color?: TagColor; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        `tag-${color}`,
        "inline-flex h-5 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full pl-1.5 pr-2 text-[12.5px] leading-5 text-[var(--tag-text)]",
        className,
      )}
    >
      <span className={cn(`dot-${color}`, "size-2 shrink-0 rounded-full")} />
      {children}
    </span>
  );
}

export function Dot({ color = "default", className }: { color?: TagColor; className?: string }) {
  return <span className={cn(`dot-${color}`, "inline-block size-2 shrink-0 rounded-full", className)} />;
}
