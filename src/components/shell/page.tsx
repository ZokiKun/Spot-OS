"use client";

import Link from "next/link";
import { Fragment, useEffect, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/store";
import { IconButton } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { useShell } from "./shell-context";

export interface Crumb {
  label: string;
  href?: string;
  icon?: ReactNode;
}

export function Topbar({ crumbs, actions }: { crumbs: Crumb[]; actions?: ReactNode }) {
  const { openMobileNav } = useShell();
  return (
    <header className="no-print sticky top-0 z-20 flex h-11 shrink-0 items-center gap-1 bg-bg/95 px-3 backdrop-blur-sm">
      <IconButton label="Open navigation" className="md:hidden" onClick={openMobileNav}>
        <Menu className="size-4" />
      </IconButton>
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center text-[14px]">
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="px-0.5 text-fg-3">/</span>}
            {c.href ? (
              <Link href={c.href} className="flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-fg hover:bg-hover">
                {c.icon}
                <span className="truncate">{c.label}</span>
              </Link>
            ) : (
              <span className="flex min-w-0 items-center gap-1.5 px-1.5 py-0.5">
                {c.icon}
                <span className="truncate">{c.label}</span>
              </span>
            )}
          </Fragment>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-1">{actions}</div>
    </header>
  );
}

const widths = {
  doc: "max-w-[860px]",
  wide: "max-w-[1180px]",
  full: "max-w-none",
};

/** Standard page frame: top bar + padded content column (Notion page geometry). */
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
  useEffect(() => {
    if (title && title !== "…") document.title = `${title} · Spot OS`;
  }, [title]);
  return (
    <div className="flex min-h-full flex-col">
      <Topbar crumbs={crumbs} actions={actions} />
      <main className={cn("mx-auto w-full flex-1 px-6 pb-24 pt-8 sm:px-12 lg:px-16", widths[width], className)}>
        {status === "loading" ? <PageSkeleton /> : status === "error" ? <LoadError message={error} /> : children}
      </main>
    </div>
  );
}

export function PageTitle({
  icon,
  title,
  description,
  children,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6">
      {icon && <div className="mb-2 text-[44px] leading-none">{icon}</div>}
      <h1 className="text-[32px] font-bold leading-tight tracking-[-0.01em] sm:text-[40px]">{title}</h1>
      {description && <p className="mt-1.5 text-[15px] text-fg-2">{description}</p>}
      {children}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="space-y-2 pt-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}

function LoadError({ message }: { message: string | null }) {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <div className="text-[16px] font-semibold">Spot OS couldn’t load the workspace</div>
      <p className="mt-2 text-[14px] text-fg-2">{message ?? "Unknown error."}</p>
      <button onClick={() => window.location.reload()} className="mt-4 rounded-md px-3 py-1.5 text-[14px] shadow-[inset_0_0_0_1px_var(--border-strong)] hover:bg-hover">
        Try again
      </button>
    </div>
  );
}
