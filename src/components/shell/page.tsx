"use client";

import { useEffect, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/store";
import { Skeleton } from "@/components/ui/misc";
import { BigTitle, CircleLink } from "@/components/ui/chunk";

export interface Crumb {
  label: string;
  href?: string;
  icon?: ReactNode;
}

const widths = {
  doc: "max-w-[860px]",
  wide: "max-w-[1240px]",
  full: "max-w-none",
};

/**
 * Standard page frame. Crumbs no longer render as a breadcrumb trail: the parent
 * becomes a single round back button, and the last crumb names the tab.
 */
export function Page({
  crumbs,
  actions,
  width = "wide",
  children,
  className,
}: {
  crumbs: Crumb[];
  actions?: ReactNode;
  width?: keyof typeof widths;
  children: ReactNode;
  className?: string;
}) {
  const { status, error } = useWorkspace();
  const title = crumbs.at(-1)?.label;
  const parent = crumbs.length > 1 ? crumbs.at(-2) : undefined;
  useEffect(() => {
    if (title && title !== "…") document.title = `${title} · Spot OS`;
  }, [title]);
  return (
    <main className={cn("mx-auto w-full px-4 pb-24 pt-2 sm:px-6", widths[width], className)}>
      {(parent?.href || actions) && (
        <div className="no-print mb-6 flex min-h-11 items-center gap-2">
          {parent?.href && (
            <>
              <CircleLink href={parent.href} label={`Back to ${parent.label}`} tone="surface" size={44}>
                <ChevronLeft />
              </CircleLink>
              <span className="truncate text-[14px] text-fg-2">{parent.label}</span>
            </>
          )}
          {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {status === "loading" ? <PageSkeleton /> : status === "error" ? <LoadError message={error} /> : children}
    </main>
  );
}

export function PageTitle({
  icon,
  title,
  description,
  aside,
  children,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-end gap-4">
        <div className="min-w-0 flex-1">
          {icon && <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-elevated text-[32px] leading-none">{icon}</div>}
          <BigTitle>{title}</BigTitle>
        </div>
        {aside && <div className="flex shrink-0 items-center gap-2 pb-1">{aside}</div>}
      </div>
      {description && <p className="mt-3 max-w-[560px] text-[15px] leading-relaxed text-fg-2">{description}</p>}
      {children}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 pt-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-14 w-72 rounded-full" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-48 rounded-[28px]" />
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-[28px]" />
    </div>
  );
}

function LoadError({ message }: { message: string | null }) {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-[28px] bg-coral p-8 text-center text-on-chunk">
      <div className="text-[20px] font-medium">Spot OS couldn’t load the workspace</div>
      <p className="mt-2 text-[14px] opacity-70">{message ?? "Unknown error."}</p>
      <button onClick={() => window.location.reload()} className="mt-5 h-10 rounded-full bg-[#151515] px-5 text-[14px] text-[#f7f3ea]">
        Try again
      </button>
    </div>
  );
}
