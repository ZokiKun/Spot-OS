import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
      {icon && <div className="mb-2 text-fg-3">{icon}</div>}
      <div className="text-[14px] font-medium text-fg-2">{title}</div>
      {description && <div className="mt-1 max-w-sm text-[13px] text-fg-3">{description}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-hover", className)} />;
}

/** Small muted section heading — Notion home's "Recently visited" style. */
export function SectionHeading({
  icon,
  children,
  action,
  className,
}: {
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-2 flex h-6 items-center gap-1.5 text-[12px] font-medium text-fg-2", className)}>
      {icon && <span className="flex size-3.5 items-center justify-center">{icon}</span>}
      <span>{children}</span>
      {action && <span className="ml-auto flex items-center">{action}</span>}
    </div>
  );
}

export function ProgressBar({ value, className, tone = "default" }: { value: number; className?: string; tone?: "default" | "green" | "red" }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-active", className)} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300",
          tone === "green" ? "bg-[var(--dot-green)]" : tone === "red" ? "bg-[var(--dot-red)]" : "bg-[var(--dot-blue)]",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Callout({ icon, children, className }: { icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex gap-2.5 rounded-md bg-callout px-4 py-3.5 text-[14px]", className)}>
      {icon && <div className="shrink-0 text-[17px] leading-[21px]">{icon}</div>}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line-strong px-1 font-sans text-[11px] text-fg-3">{children}</kbd>;
}
