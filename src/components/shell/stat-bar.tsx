"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Search } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { isActiveProject, myWeek, weekStartsOn } from "@/lib/selectors";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { usePopover } from "@/components/ui/popover";
import { NAV_ART } from "./icons";
import { MoreMenu } from "./sidebar";
import { useShell } from "./shell-context";

export function FlameIcon({ size = 24, lit = true }: { size?: number; lit?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        d="M12 2.5c.6 3.2 3 4.6 4.6 6.9 1.6 2.3 2 4.4 1.6 6.4-.7 3.6-3.6 5.7-6.2 5.7S6.5 19.6 5.8 16c-.5-2.4.4-4.6 1.9-6.3.2 1.6.9 2.7 2 3.2-.3-3.7.6-7.6 2.3-10.4Z"
        fill={lit ? "#ff9600" : "#e5e5e5"}
      />
      <path d="M12 12.5c.3 1.5 1.6 2.3 2.2 3.4.6 1.2.4 2.5-.3 3.3-.6.6-1.2.9-1.9.9-1.6 0-2.9-1.2-2.9-2.9 0-1.7 1.6-2.8 2.9-4.7Z" fill={lit ? "#ffc800" : "#f2f2f2"} />
    </svg>
  );
}

export function AlarmIcon({ size = 24, active = true }: { size?: number; active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="12" cy="13" r="9" fill={active ? "#ff4b4b" : "#e5e5e5"} />
      <circle cx="12" cy="13" r="6.5" fill="#fff" />
      <path d="M12 9.5v4l2.5 1.5" stroke={active ? "#ff4b4b" : "#afafaf"} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M4 6.5 7 4M20 6.5 17 4" stroke={active ? "#ea2b2b" : "#cecece"} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function Chip({ href, title, icon, value, tone }: { href: string; title: string; icon: React.ReactNode; value: number; tone: string }) {
  return (
    <Link href={href} title={title} aria-label={`${title}: ${value}`} className="flex h-11 items-center gap-1.5 rounded-xl px-2.5 hover:bg-hover max-md:gap-1 max-md:px-1.5">
      {icon}
      <span className={cn("text-[16px] font-extrabold tabular", tone)}>{value}</span>
    </Link>
  );
}

/** The row of glanceable numbers at the top of the rail (Duolingo's streak · gems · hearts). */
export function StatBar({ className, showAccount = true }: { className?: string; showAccount?: boolean }) {
  const { data, me } = useWorkspace();
  const { openSearch } = useShell();
  const { setAnchor, ...menu } = usePopover<HTMLButtonElement>();
  const week = useMemo(() => myWeek(data, me?.id ?? null, weekStartsOn(data)), [data, me]);
  const active = data.projects.filter(isActiveProject).length;
  return (
    <div className={cn("flex items-center justify-between gap-1", className)}>
      <div className="flex items-center gap-1 max-md:gap-0">
        <Chip
          href="/projects/tasks?filter=completed"
          title="Tasks you finished this week"
          icon={<FlameIcon lit={week.done > 0} />}
          value={week.done}
          tone={week.done ? "text-orange" : "text-fg-3"}
        />
        <Chip
          href="/projects/tasks?filter=mine"
          title="Your overdue tasks"
          icon={<AlarmIcon active={week.overdue > 0} />}
          value={week.overdue}
          tone={week.overdue ? "text-red" : "text-fg-3"}
        />
        <Chip href="/projects" title="Active projects" icon={<NAV_ART.projects size={24} />} value={active} tone="text-yellow-edge" />
      </div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={openSearch} title="Search (⌘K)" aria-label="Search" className="flex size-11 max-md:hidden items-center justify-center rounded-xl text-fg-3 hover:bg-hover hover:text-fg-2">
          <Search className="size-[22px]" strokeWidth={2.8} />
        </button>
        {showAccount && (
          <>
            <button ref={setAnchor} type="button" onClick={menu.toggle} aria-label="Account" className="rounded-full p-1 hover:bg-hover">
              <Avatar profile={me} size={32} />
            </button>
            <MoreMenu open={menu.open} onClose={menu.close} anchor={menu.anchor} />
          </>
        )}
      </div>
    </div>
  );
}
