"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/store";
import { Skeleton } from "@/components/ui/misc";
import { Mascot } from "@/components/ui/mascot";
import { Button } from "@/components/ui/button";
import { StatBar } from "./stat-bar";

export interface Crumb {
  label: string;
  href?: string;
  icon?: ReactNode;
}

const widths = {
  doc: "max-w-[620px]",
  wide: "max-w-[1080px]",
  full: "max-w-none",
};

/**
 * Page frame (Duolingo web geometry): one focused centre column, and on wide screens a sticky
 * right rail with the stat chips and small "at a glance" cards. Below xl the rail stacks under
 * the content so nothing is lost on smaller screens.
 */
export function Page({
  crumbs,
  actions,
  width = "doc",
  aside,
  children,
  className,
}: {
  crumbs: Crumb[];
  actions?: ReactNode;
  width?: keyof typeof widths;
  /** Rail cards (right column on wide screens). */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const { status, error } = useWorkspace();
  const title = crumbs.at(-1)?.label;
  useEffect(() => {
    if (title && title !== "…") document.title = `${title} · Spot OS`;
  }, [title]);
  const parent = crumbs.length > 1 ? crumbs.at(-2) : undefined;
  const hasRail = width === "doc";
  const ready = status === "ready";

  return (
    <div className="flex min-h-full justify-center gap-12 px-4 pb-32 pt-5 sm:px-6 md:pb-16 md:pt-7 lg:px-10">
      <main className={cn("w-full min-w-0", widths[width], className)}>
        <StatBar className={cn("mb-4 max-md:hidden", hasRail && "xl:hidden")} />
        {(parent || actions) && (
          <div className="no-print mb-5 flex min-h-11 items-center gap-2">
            {parent?.href && (
              <Link href={parent.href} className="label-caps -ml-2 flex h-10 items-center gap-2 rounded-xl px-2 text-[13px] text-fg-3 hover:bg-hover hover:text-fg-2">
                <ArrowLeft className="size-5" strokeWidth={3} /> {parent.label}
              </Link>
            )}
            <div className="ml-auto flex items-center gap-2">{ready && actions}</div>
          </div>
        )}
        {status === "loading" ? <PageSkeleton /> : status === "error" ? <LoadError message={error} /> : children}
        {aside && ready && <div className={cn("mt-10 space-y-5", hasRail && "xl:hidden")}>{aside}</div>}
      </main>
      {hasRail && (
        <aside className="no-print hidden w-[360px] shrink-0 xl:block">
          <div className="sticky top-7 space-y-5">
            <StatBar />
            {ready && aside}
            <RailFooter />
          </div>
        </aside>
      )}
    </div>
  );
}

function RailFooter() {
  return (
    <div className="label-caps flex flex-wrap justify-center gap-x-4 gap-y-1 pt-1 text-[11px] text-fg-3">
      <Link href="/spot-base" className="hover:text-fg-2">Spot Base</Link>
      <Link href="/spot-base/spot-md" className="hover:text-fg-2">SPOT.md</Link>
      <Link href="/settings" className="hover:text-fg-2">Settings</Link>
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
      <h1 className="text-[28px] font-black leading-tight tracking-[-0.01em] sm:text-[32px]">{title}</h1>
      {description && <p className="mt-1.5 text-[16px] font-semibold text-fg-2">{description}</p>}
      {children}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-6 w-56" />
      <div className="space-y-3 pt-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

function LoadError({ message }: { message: string | null }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <Mascot mood="worried" size={96} />
      <div className="mt-4 text-[20px] font-extrabold">Spot OS couldn’t load the workspace</div>
      <p className="mt-2 text-[15px] font-semibold text-fg-2">{message ?? "Unknown error."}</p>
      <Button variant="blue" size="md" className="mt-6" onClick={() => window.location.reload()}>
        Try again
      </Button>
    </div>
  );
}
