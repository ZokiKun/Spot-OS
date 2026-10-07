import type { ReactNode } from "react";
import { cn } from "@/directions/d2/lib/utils";

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
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      {icon && <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-hover opacity-80">{icon}</div>}
      <div className="text-[16px] font-medium">{title}</div>
      {description && <div className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed opacity-60">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-hover", className)} />;
}

/** Section heading. */
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
    <div className={cn("mb-3 flex min-h-7 items-center gap-2 text-[17px] font-medium tracking-[-0.01em]", className)}>
      {icon && <span className="flex size-4 items-center justify-center opacity-60">{icon}</span>}
      <span>{children}</span>
      {action && <span className="ml-auto flex items-center text-[13px] font-normal text-fg-2">{action}</span>}
    </div>
  );
}

export function ProgressBar({ value, className, tone = "default" }: { value: number; className?: string; tone?: "default" | "green" | "red" }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-active", className)} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300",
          tone === "green" ? "bg-[var(--dot-green)]" : tone === "red" ? "bg-[var(--dot-red)]" : "bg-current",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Callout({ icon, children, className }: { icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex gap-3 rounded-[24px] bg-cream px-5 py-4 text-[14px] text-on-chunk", className)}>
      {icon && <div className="shrink-0 text-[17px] leading-[21px]">{icon}</div>}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md bg-hover px-1.5 font-sans text-[11px] text-fg-3">{children}</kbd>;
}
