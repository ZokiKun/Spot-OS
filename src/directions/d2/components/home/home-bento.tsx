"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowUpRight, Eye, EyeOff, Plus, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useWorkspace } from "@/directions/d2/lib/store";
import {
  attentionItems,
  isActiveProject,
  isDueToday,
  isOverdue,
  isUpcoming,
  periodMetrics,
  sortProjects,
  sortTasks,
  workload,
} from "@/directions/d2/lib/selectors";
import { useFinance } from "@/directions/d2/lib/finance/use-finance";
import { addDaysISO, cn, firstName, greeting, parseDate, plural, relativeDays, todayISO } from "@/directions/d2/lib/utils";
import { Page } from "@/directions/d2/components/shell/page";
import { Avatar } from "@/directions/d2/components/ui/avatar";
import { Dialog } from "@/directions/d2/components/ui/dialog";
import { Card, Chip, CircleButton, Dots, Eyebrow, MUTED, PillButton, PillTabs, SOFT, type Tone } from "@/directions/d2/components/ui/chunk";
import { TaskChunkList } from "@/directions/d2/components/tasks/task-chunks";
import { ProjectCard } from "@/directions/d2/components/projects/project-card";
import { Money, useMoneyVisible } from "./money";

export function HomeBento() {
  const { data, me } = useWorkspace();
  const meId = me?.id ?? null;
  const today = todayISO();
  const [adding, setAdding] = useState(false);

  const mine = useMemo(() => data.tasks.filter((t) => t.assignee_id === meId), [data.tasks, meId]);
  const late = sortTasks(mine.filter((t) => isOverdue(t, today)));
  const dueToday = sortTasks(mine.filter((t) => isDueToday(t, today)));
  const upcoming = sortTasks(mine.filter((t) => isUpcoming(t, today, 7)));

  const summary = useMemo(() => {
    const parts: string[] = [];
    if (late.length) parts.push(`${plural(late.length, "late task")}`);
    if (dueToday.length) parts.push(`${dueToday.length} due today`);
    return parts.length ? `You have ${parts.join(" and ")}. Start with the orange card.` : "Nothing is due today. A good day to move a project forward.";
  }, [late.length, dueToday.length]);

  const myProjects = useMemo(
    () =>
      sortProjects(
        data.projects.filter(
          (p) =>
            isActiveProject(p) &&
            (p.lead_id === meId ||
              p.creative_director_id === meId ||
              data.project_members.some((m) => m.project_id === p.id && m.profile_id === meId) ||
              mine.some((t) => t.project_id === p.id && t.status !== "done")),
        ),
      ),
    [data.projects, data.project_members, mine, meId],
  );

  return (
    <Page crumbs={[{ label: "Home" }]}>
      <div className="mb-8 flex items-end gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 text-[14px] text-fg-2">{format(new Date(), "EEEE, d MMMM")}</div>
          <h1 className="text-[40px] font-medium leading-[1.02] tracking-[-0.035em] sm:text-[56px]">
            {greeting()},
            <br />
            {firstName(me?.full_name) || "there"}
          </h1>
          <p className="mt-4 max-w-[520px] text-[15px] leading-relaxed text-fg-2">{summary}</p>
        </div>
        <CircleButton label="Add a task" tone="ink" size={56} onClick={() => setAdding(true)} className="mb-1 max-sm:hidden">
          <Plus />
        </CircleButton>
      </div>

      <div className="stagger grid grid-flow-row-dense grid-cols-2 gap-3 lg:grid-cols-4">
        <TodayCard late={late} dueToday={dueToday} upcoming={upcoming} />
        <HeadsUpCard />
        <ComingUpCard />
        <MoneyCard />
        <TeamCard />
        <NextDeadlineCard />
        <MonthCard />
      </div>

      {myProjects.length > 0 && (
        <section className="mt-12">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-[26px] font-medium leading-tight tracking-[-0.025em]">Your projects</h2>
            <Link href="/projects" className="flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] text-fg-2 shadow-[inset_0_0_0_1.5px_var(--border-strong)] hover:text-fg">
              All projects <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
            {myProjects.map((p) => (
              <ProjectCard key={p.id} project={p} className="w-[280px] shrink-0 snap-start" />
            ))}
          </div>
        </section>
      )}

      <CircleButton
        label="Add a task"
        tone="ink"
        size={60}
        onClick={() => setAdding(true)}
        className="fixed bottom-24 right-5 z-20 shadow-menu sm:hidden"
      >
        <Plus />
      </CircleButton>
      <QuickAddDialog open={adding} onClose={() => setAdding(false)} />
    </Page>
  );
}

/* ——— Chunks ——— */

function TodayCard({ late, dueToday, upcoming }: { late: ReturnType<typeof sortTasks>; dueToday: ReturnType<typeof sortTasks>; upcoming: ReturnType<typeof sortTasks> }) {
  const focus = [...late, ...dueToday];
  const clear = focus.length === 0;
  const tone: Tone = late.length ? "coral" : dueToday.length ? "sun" : "lime";
  const title = late.length
    ? `${late.length} late${dueToday.length ? `, ${dueToday.length} today` : ""}`
    : dueToday.length
      ? `${plural(dueToday.length, "thing")} for today`
      : "You’re clear today";
  const list = clear ? upcoming : focus;
  return (
    <Card tone={tone} handle className="col-span-2 min-h-[300px] pt-8 lg:col-span-1 lg:row-span-2">
      <Eyebrow>Your day</Eyebrow>
      <div className="mb-4 mt-1 text-[24px] font-medium leading-[1.1] tracking-[-0.02em]">{title}</div>
      {clear && upcoming.length > 0 && <div className={cn("mb-2 text-[12.5px]", MUTED[tone])}>Coming up this week</div>}
      <TaskChunkList tasks={list} tone={tone} limit={3} showAssignee={false} />
      {clear && upcoming.length === 0 && (
        <div className={cn("flex flex-1 flex-col items-center justify-center gap-2 text-center text-[14px]", MUTED[tone])}>
          <Sparkles className="size-6" />
          Nothing due this week.
        </div>
      )}
      <div className="mt-auto flex items-center justify-between pt-4">
        <Dots count={Math.ceil(list.length / 3)} />
        <Link href="/projects/tasks?filter=mine" className={cn("rounded-full px-3 py-1.5 text-[13px] hover:bg-[var(--chunk-soft)]", MUTED[tone])}>
          All my tasks →
        </Link>
      </div>
    </Card>
  );
}

function HeadsUpCard() {
  const { data, me } = useWorkspace();
  // Late / due-today tasks live in "Your day"; this card holds everything else that needs a look.
  const items = useMemo(
    () => attentionItems(data, { meId: me?.id ?? null, mine: true }).filter((i) => i.kind !== "overdue_task" && i.kind !== "due_today"),
    [data, me],
  );
  const tone: Tone = items.length ? "sun" : "lime";
  return (
    <Card tone={tone} href="/?view=attention" handle className="col-span-1 row-span-2 min-h-[300px] pt-8">
      <Eyebrow>Heads up</Eyebrow>
      <div className="mt-2 text-[72px] font-medium leading-none tracking-[-0.05em] tabular">{items.length}</div>
      <div className="mt-1 text-[15px] leading-snug">{items.length === 1 ? "thing needs a look" : items.length ? "things need a look" : "Nothing needs a look"}</div>
      <div className="mt-4 flex flex-col gap-2">
        {items.slice(0, 2).map((i) => (
          <div key={i.id} className={cn("rounded-[18px] px-3.5 py-2.5", SOFT[tone])}>
            <div className="truncate text-[13.5px] font-medium">{i.title}</div>
            <div className={cn("truncate text-[12px]", MUTED[tone])}>{i.detail}</div>
          </div>
        ))}
      </div>
      <span className="mt-auto flex justify-end pt-4">
        <span className={cn("flex size-10 items-center justify-center rounded-full", SOFT[tone])}>
          <ArrowUpRight className="size-[18px]" />
        </span>
      </span>
    </Card>
  );
}

function ComingUpCard() {
  const { data, me } = useWorkspace();
  const today = todayISO();
  const items = useMemo(() => {
    const end = addDaysISO(today, 14);
    const tasks = data.tasks
      .filter((t) => t.assignee_id === me?.id && isUpcoming(t, today, 14))
      .map((t) => ({ id: t.id, date: t.due_date!, label: t.title, kind: "Task", href: t.project_id ? `/projects/${t.project_id}?task=${t.id}` : `/projects/tasks?task=${t.id}` }));
    const deadlines = data.projects
      .filter((p) => isActiveProject(p) && p.deadline && p.deadline > today && p.deadline <= end)
      .map((p) => ({ id: p.id, date: p.deadline!, label: `${p.icon ?? ""} ${p.name}`.trim(), kind: "Deadline", href: `/projects/${p.id}` }));
    return [...deadlines, ...tasks].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  }, [data.tasks, data.projects, me, today]);

  return (
    <Card tone="sky" className="col-span-2 min-h-[200px]">
      <div className="flex items-center justify-between">
        <Eyebrow>Coming up · next 2 weeks</Eyebrow>
        <Link href="/calendar" className="rounded-full px-3 py-1 text-[12.5px] text-[var(--on-chunk-2)] hover:bg-[var(--chunk-soft)]">
          Calendar →
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="mt-6 text-[20px] font-medium tracking-[-0.02em]">A quiet two weeks ahead.</div>
      ) : (
        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
          {items.map((i) => {
            const d = parseDate(i.date)!;
            return (
              <Link key={`${i.kind}-${i.id}`} href={i.href} className="press flex w-[150px] shrink-0 flex-col rounded-[22px] bg-[var(--chunk-soft)] p-3.5">
                <span className="text-[12px] text-[var(--on-chunk-2)]">{format(d, "EEE")}</span>
                <span className="text-[30px] font-medium leading-none tracking-[-0.03em] tabular">{format(d, "d")}</span>
                <span className="mt-3 line-clamp-2 text-[13px] leading-snug">{i.label}</span>
                <span className="mt-auto pt-2 text-[11.5px] text-[var(--on-chunk-2)]">{i.kind === "Deadline" ? "◆ Deadline" : relativeDays(i.date)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function MoneyCard() {
  const fin = useFinance();
  const { visible, setVisible } = useMoneyVisible();
  return (
    <Card tone="ink" className="col-span-1 min-h-[180px]">
      <div className="flex items-start justify-between gap-2">
        <Eyebrow>In the bank</Eyebrow>
        <CircleButton
          label={visible ? "Hide amounts" : "Show amounts"}
          tone="ghost"
          size={36}
          className="-mr-1.5 -mt-1.5 bg-white/10 hover:bg-white/15"
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff /> : <Eye />}
        </CircleButton>
      </div>
      <div className="mt-3 truncate text-[30px] font-medium leading-none tracking-[-0.03em] tabular">
        {fin.source ? <Money value={fin.summary?.available ?? null} currency={fin.currency} /> : "—"}
      </div>
      <div className="mt-2 text-[12.5px] text-[var(--on-ink-2)]">
        {fin.source ? (
          <>
            Waiting on <Money value={fin.summary?.outstanding ?? null} currency={fin.currency} compact />
          </>
        ) : (
          "No finance sheet yet"
        )}
      </div>
      <Link href={fin.source ? "/?view=finance" : "/settings?section=finance"} className="mt-auto pt-4 text-[13px] text-[var(--on-ink-2)] hover:text-[var(--on-ink)]">
        {fin.source ? "See money →" : "Connect a sheet →"}
      </Link>
    </Card>
  );
}

function TeamCard() {
  const { data } = useWorkspace();
  const load = useMemo(() => workload(data), [data]);
  const open = load.reduce((n, l) => n + l.open, 0);
  const late = load.reduce((n, l) => n + l.overdue, 0);
  return (
    <Card tone="lime" href="/?view=studio" className="col-span-1 min-h-[180px]">
      <Eyebrow>The studio</Eyebrow>
      <div className="mt-3 flex -space-x-2">
        {load.map((l) => (
          <Avatar key={l.profile.id} profile={l.profile} size={36} className="ring-[3px] ring-lime" />
        ))}
      </div>
      <div className="mt-3 text-[15px] leading-snug">
        <span className="font-medium">{open}</span> open tasks
        {late > 0 && <span className="text-[var(--on-chunk-2)]"> · {late} late</span>}
      </div>
      <div className="mt-auto pt-4 text-[13px] text-[var(--on-chunk-2)]">Who’s doing what →</div>
    </Card>
  );
}

function NextDeadlineCard() {
  const { data } = useWorkspace();
  const today = todayISO();
  const next = data.projects
    .filter((p) => isActiveProject(p) && p.deadline && p.deadline >= today)
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!))[0];
  if (!next)
    return (
      <Card tone="cream" className="col-span-2 flex-row items-center gap-4 rounded-full py-4 pl-4 lg:col-span-3">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--chunk-soft)] text-[26px]">🌤️</span>
        <div className="text-[16px]">No deadlines ahead.</div>
      </Card>
    );
  return (
    <Card tone="cream" href={`/projects/${next.id}`} className="col-span-2 flex-row items-center gap-4 rounded-full py-3 pl-3 pr-3 lg:col-span-3">
      <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#fffdf8] text-[30px] leading-none">{next.icon ?? "📁"}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] text-[var(--on-chunk-2)]">Next deadline · {relativeDays(next.deadline)}</div>
        <div className="truncate text-[19px] font-medium tracking-[-0.02em]">{next.name}</div>
      </div>
      <Chip tone="cream" className="max-sm:hidden">
        {format(parseDate(next.deadline)!, "d MMM")}
      </Chip>
      <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--chunk-soft)]">
        <ArrowUpRight className="size-5" />
      </span>
    </Card>
  );
}

function MonthCard() {
  const { data } = useWorkspace();
  const now = new Date();
  const iso = (d: Date) => format(d, "yyyy-MM-dd");
  const m0 = new Date(now.getFullYear(), now.getMonth(), 1);
  const m1 = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const p0 = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const cur = periodMetrics(data, iso(m0), iso(m1)).tasksCompleted;
  const prev = periodMetrics(data, iso(p0), iso(m0)).tasksCompleted;
  const up = cur >= prev;
  return (
    <Card tone="surface" href="/?view=performance" className="col-span-2 min-h-[120px] sm:col-span-1">
      <Eyebrow>{format(now, "MMMM")} so far</Eyebrow>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[36px] font-medium leading-none tracking-[-0.04em] tabular">{cur}</span>
        <span className="text-[14px] text-fg-2">tasks done</span>
      </div>
      <div className={cn("mt-auto flex items-center gap-1.5 pt-3 text-[12.5px]", up ? "text-[var(--success)]" : "text-danger")}>
        {up ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
        {prev} last month
      </div>
    </Card>
  );
}

/* ——— Quick add ——— */

function QuickAddDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { create, me, data } = useWorkspace();
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState<"today" | "tomorrow" | "none">("today");
  const [projectId, setProjectId] = useState<string>("none");
  const projects = sortProjects(data.projects.filter(isActiveProject));
  const save = () => {
    if (!title.trim()) return;
    const today = todayISO();
    void create("tasks", {
      title: title.trim(),
      description: null,
      project_id: projectId === "none" ? null : projectId,
      assignee_id: me?.id ?? null,
      status: "todo",
      priority: "medium",
      due_date: when === "today" ? today : when === "tomorrow" ? addDaysISO(today, 1) : null,
      created_by: me?.id ?? null,
      completed_at: null,
    });
    setTitle("");
    onClose();
  };
  return (
    <Dialog open={open} onClose={onClose} title="Add a task" width={480}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="space-y-5"
      >
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
          className="h-14 w-full rounded-[20px] bg-input px-5 text-[17px] outline-none placeholder:text-fg-3 focus:shadow-[inset_0_0_0_1.5px_var(--text)]"
        />
        <div>
          <div className="mb-2 text-[13px] text-fg-2">When</div>
          <PillTabs
            size="sm"
            value={when}
            onChange={setWhen}
            items={[
              { value: "today", label: "Today" },
              { value: "tomorrow", label: "Tomorrow" },
              { value: "none", label: "Someday" },
            ]}
          />
        </div>
        {projects.length > 0 && (
          <div>
            <div className="mb-2 text-[13px] text-fg-2">Project</div>
            <PillTabs
              size="sm"
              value={projectId}
              onChange={setProjectId}
              items={[{ value: "none", label: "None" }, ...projects.map((p) => ({ value: p.id, label: `${p.icon ?? ""} ${p.name}`.trim() }))]}
            />
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <PillButton tone="outline" onClick={onClose}>
            Cancel
          </PillButton>
          <PillButton type="submit" disabled={!title.trim()}>
            Add task
          </PillButton>
        </div>
      </form>
    </Dialog>
  );
}
