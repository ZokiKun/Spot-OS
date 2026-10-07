"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useWorkspace } from "@/directions/d3/lib/store";
import { isActiveProject, myWeek, weekStartsOn, workload } from "@/directions/d3/lib/selectors";
import { periodLabel, recentPeriods, reviewFields } from "@/directions/d3/lib/reviews";
import { addDaysISO, cn, daysUntil, firstName, parseDate, todayISO } from "@/directions/d3/lib/utils";
import { Avatar } from "@/directions/d3/components/ui/avatar";
import { ActionLink, Card, DateTile, ProgressBar } from "@/directions/d3/components/ui/misc";
import { FlameIcon } from "@/directions/d3/components/shell/stat-bar";
import { NAV_ART } from "@/directions/d3/components/shell/icons";

export function RailCard({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={cn("px-5 pb-4 pt-4", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[17px] font-extrabold">{title}</h3>
        {action}
      </div>
      {children}
    </Card>
  );
}

function Chest({ open }: { open: boolean }) {
  return open ? (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-green text-white shadow-[0_2px_0_var(--green-edge)]" title="Done!">
      <svg viewBox="0 0 14 14" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7.5l2.5 2.5L11 4.5" />
      </svg>
    </span>
  ) : (
    <svg viewBox="0 0 32 32" width={32} height={32} className="shrink-0" aria-hidden>
      <rect x="4" y="12" width="24" height="15" rx="3" fill="#c4834f" />
      <path d="M4 14 a8 8 0 0 1 8 -8 h8 a8 8 0 0 1 8 8 v2 H4 Z" fill="#a5653a" />
      <rect x="4" y="15" width="24" height="3" fill="#ffc800" />
      <rect x="13" y="13" width="6" height="8" rx="1.5" fill="#ffc800" />
      <circle cx="16" cy="17" r="1.3" fill="#a5653a" />
    </svg>
  );
}

function Quest({ icon, title, value, total }: { icon: ReactNode; title: string; value: number; total: number }) {
  const done = total > 0 && value >= total;
  return (
    <div className="flex items-center gap-3.5 py-2.5">
      <span className="flex size-10 shrink-0 items-center justify-center">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 truncate text-[15px] font-extrabold">{title}</div>
        <div className="flex items-center gap-2">
          <ProgressBar value={total ? value / total : 0} tone={done ? "green" : "yellow"} size="lg" label={`${value} / ${total}`} />
          <Chest open={done} />
        </div>
      </div>
    </div>
  );
}

/** "This week" — three quests that sum up whether things are on track. */
export function WeekCard() {
  const { data, me } = useWorkspace();
  const week = useMemo(() => myWeek(data, me?.id ?? null, weekStartsOn(data)), [data, me]);
  const active = data.projects.filter((p) => p.status === "active");
  const withNext = active.filter((p) => p.next_action?.trim()).length;
  const lastMonth = recentPeriods("month", 2)[1]!;
  const review = data.reviews.find((r) => r.period === "month" && r.period_start === lastMonth);
  return (
    <RailCard title="This week" action={<ActionLink href="/projects/tasks?filter=mine">My tasks</ActionLink>}>
      <Quest icon={<FlameIcon size={34} />} title="Finish this week’s tasks" value={week.done} total={Math.max(week.total, week.done)} />
      <Quest
        icon={
          <span className="flex size-9 items-center justify-center rounded-full bg-blue text-[18px] shadow-[0_2px_0_var(--blue-edge)]" aria-hidden>
            🧭
          </span>
        }
        title="Every project has a next step"
        value={withNext}
        total={active.length}
      />
      <Quest
        icon={<NAV_ART.reviews size={34} />}
        title={`Write the ${periodLabel("month", lastMonth).split(" ")[0]} review`}
        value={review ? reviewFields("month").filter((f) => review[f.key]?.trim()).length : 0}
        total={reviewFields("month").length}
      />
    </RailCard>
  );
}

/** Next project deadlines as little calendar pages. */
export function ComingUpCard({ days = 30, limit = 4 }: { days?: number; limit?: number }) {
  const { data } = useWorkspace();
  const today = todayISO();
  const upcoming = data.projects
    .filter((p) => isActiveProject(p) && p.deadline && p.deadline >= today && p.deadline <= addDaysISO(today, days))
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!))
    .slice(0, limit);
  return (
    <RailCard title="Coming up" action={<ActionLink href="/calendar">Calendar</ActionLink>}>
      {upcoming.length === 0 ? (
        <p className="py-2 text-[14px] font-semibold text-fg-2">No deadlines in the next {days} days.</p>
      ) : (
        <div className="-mx-2">
          {upcoming.map((p) => {
            const d = daysUntil(p.deadline)!;
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-hover">
                <DateTile date={parseDate(p.deadline)!} tone={d <= 3 ? "red" : d <= 7 ? "orange" : "gray"} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-extrabold">
                    {p.icon} {p.name}
                  </div>
                  <div className={cn("text-[13px] font-bold", d <= 3 ? "text-red" : d <= 7 ? "text-orange" : "text-fg-2")}>
                    {d === 0 ? "Today" : d === 1 ? "Tomorrow" : `In ${d} days`}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </RailCard>
  );
}

/** The team, leaderboard-style: who has how much on their plate. You are highlighted. */
export function TeamCard() {
  const { data, me } = useWorkspace();
  const load = useMemo(() => workload(data), [data]);
  return (
    <RailCard title="The team" action={<ActionLink href="/studio">Studio</ActionLink>}>
      <div className="-mx-2 space-y-1">
        {load.map((l) => {
          const isMe = l.profile.id === me?.id;
          return (
            <Link
              key={l.profile.id}
              href={`/projects/tasks?filter=${isMe ? "mine" : `member:${l.profile.id}`}`}
              className={cn("flex items-center gap-3 rounded-xl px-2 py-2", isMe ? "bg-green-soft" : "hover:bg-hover")}
            >
              <Avatar profile={l.profile} size={38} />
              <div className="min-w-0 flex-1">
                <div className={cn("truncate text-[15px] font-extrabold", isMe && "text-green-edge")}>
                  {firstName(l.profile.full_name)}
                  {isMe && " (you)"}
                </div>
                <div className="text-[13px] font-bold text-fg-2">
                  {l.open} open
                  {l.overdue > 0 && <span className="text-red"> · {l.overdue} late</span>}
                  {l.blocked > 0 && <span className="text-orange"> · {l.blocked} stuck</span>}
                </div>
              </div>
              <span className="text-[15px] font-extrabold text-fg-2 tabular">{l.dueThisWeek}</span>
            </Link>
          );
        })}
      </div>
      <p className="mt-2 text-right text-[11.5px] font-bold text-fg-3">Number = due this week</p>
    </RailCard>
  );
}
