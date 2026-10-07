"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { addMonths, addQuarters, addYears, format, startOfMonth, startOfQuarter, startOfYear } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { CalendarNote, Project, Task } from "@/lib/types";
import { useWorkspace } from "@/lib/store";
import { isOpen } from "@/lib/selectors";
import { cn, formatDay, formatLongDate, parseDate, todayISO, toISODate } from "@/lib/utils";
import { Page } from "@/components/shell/page";
import { Button, IconButton } from "@/components/ui/button";
import { EmptyState, SectionHeading } from "@/components/ui/misc";
import { TaskList } from "@/components/tasks/task-table";
import { ViewTabs } from "@/components/ui/tabs";
import { MiniMonth, MonthGrid } from "./month-grid";
import { CalendarExportMenu } from "./export-menu";
import { NoteCard } from "./note-card";

type View = "month" | "quarter" | "year";

const startOf = (view: View, d: Date) => (view === "month" ? startOfMonth(d) : view === "quarter" ? startOfQuarter(d) : startOfYear(d));
const step = (view: View, d: Date, n: number) => (view === "month" ? addMonths(d, n) : view === "quarter" ? addQuarters(d, n) : addYears(d, n));

export function CalendarView() {
  const { data, create, me } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selected = params.get("date") ?? todayISO();
  const focusNote = params.get("note");
  const requestedView = params.get("view");
  const view: View = requestedView === "quarter" || requestedView === "year" ? requestedView : "month";
  // `month` is the first day of the visible period (month, quarter or year).
  const [month, setMonth] = useState(() => startOf(view, parseDate(selected) ?? new Date()));
  const weekStartsOn = ((data.settings.find((s) => s.key === "workspace")?.value.week_starts_on as number) ?? 1) as 0 | 1;

  const index = useMemo(() => {
    const notes = new Map<string, CalendarNote[]>();
    const due = new Map<string, Task[]>();
    const deadlines = new Map<string, Project[]>();
    const push = <T,>(m: Map<string, T[]>, k: string, v: T) => m.set(k, [...(m.get(k) ?? []), v]);
    data.calendar_notes.forEach((n) => push(notes, n.date, n));
    data.tasks.forEach((t) => t.due_date && isOpen(t) && push(due, t.due_date, t));
    data.projects.forEach((p) => p.deadline && !["completed", "archived"].includes(p.status) && push(deadlines, p.deadline, p));
    notes.forEach((list) => list.sort((a, b) => a.created_at.localeCompare(b.created_at)));
    return { notes, due, deadlines };
  }, [data.calendar_notes, data.tasks, data.projects]);

  const dayData = useCallback(
    (iso: string) => ({ notes: index.notes.get(iso) ?? [], due: index.due.get(iso) ?? [], deadlines: index.deadlines.get(iso) ?? [] }),
    [index],
  );

  const href = (patch: { date?: string; view?: View; note?: string }) => {
    const q = new URLSearchParams();
    q.set("date", patch.date ?? selected);
    const v = patch.view ?? view;
    if (v !== "month") q.set("view", v);
    if (patch.note) q.set("note", patch.note);
    return `${pathname}?${q.toString()}`;
  };

  const select = (iso: string) => {
    router.replace(href({ date: iso }), { scroll: false });
    const d = parseDate(iso);
    if (d && toISODate(startOf(view, d)) !== toISODate(month)) setMonth(startOf(view, d));
  };

  const setView = (v: View) => {
    setMonth(startOf(v, parseDate(selected) ?? new Date()));
    router.replace(href({ view: v }), { scroll: false });
  };

  const openMonth = (m: Date) => {
    setMonth(startOfMonth(m));
    const inMonth = selected.slice(0, 7) === format(m, "yyyy-MM");
    router.replace(href({ view: "month", date: inMonth ? selected : toISODate(m) }), { scroll: false });
  };

  const months = view === "month" ? [month] : Array.from({ length: view === "quarter" ? 3 : 12 }, (_, i) => addMonths(month, i));
  const title =
    view === "month"
      ? [format(month, "MMMM"), format(month, "yyyy")]
      : view === "quarter"
        ? [`Q${Math.floor(month.getMonth() / 3) + 1}`, format(month, "yyyy")]
        : [format(month, "yyyy"), ""];
  const periodName = view === "month" ? "month" : view;

  // Agenda for the quarter view: deadlines and notes in the visible quarter.
  const agenda = useMemo(() => {
    if (view !== "quarter") return [];
    const start = toISODate(month);
    const end = toISODate(addQuarters(month, 1));
    return [
      ...data.projects
        .filter((p) => p.deadline && p.deadline >= start && p.deadline < end && p.status !== "archived")
        .map((p) => ({ id: `d-${p.id}`, date: p.deadline!, label: p.name, icon: p.icon ?? "📁", deadline: true, note: undefined as string | undefined })),
      ...data.calendar_notes
        .filter((n) => n.date >= start && n.date < end)
        .map((n) => ({ id: n.id, date: n.date, label: n.title || "Untitled note", icon: "📝", deadline: false, note: n.id })),
    ].sort((a, b) => a.date.localeCompare(b.date));
  }, [view, month, data.projects, data.calendar_notes]);

  const day = dayData(selected);
  const completed = data.tasks.filter((t) => t.completed_at && t.completed_at.slice(0, 10) === selected);

  const addNote = async () => {
    const n = await create("calendar_notes", {
      date: selected,
      title: "",
      content_html: "",
      created_by: me?.id ?? null,
      updated_by: me?.id ?? null,
    });
    router.replace(href({ note: n.id }), { scroll: false });
  };

  return (
    <Page crumbs={[{ label: "Calendar", icon: <CalendarDays className="size-4" /> }]} width="full" className="max-w-[1400px]">
      <div className={cn("grid grid-cols-1 gap-10", view === "month" ? "xl:grid-cols-[minmax(0,1fr)_minmax(420px,520px)]" : "xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]")}>
        <section>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h1 className="text-[28px] font-bold tracking-[-0.01em]">{title[0]}</h1>
            {title[1] && <span className="text-[28px] font-bold text-fg-3">{title[1]}</span>}
            <div className="ml-auto flex flex-wrap items-center gap-1">
              <ViewTabs<View>
                value={view}
                onChange={setView}
                className="mr-1"
                items={[
                  { value: "month", label: "Month" },
                  { value: "quarter", label: "Quarter" },
                  { value: "year", label: "Year" },
                ]}
              />
              <CalendarExportMenu selected={selected} defaultRange={view === "quarter" ? "month" : view} weekStartsOn={weekStartsOn} />
              <Button
                variant="secondary"
                onClick={() => {
                  setMonth(startOf(view, new Date()));
                  select(todayISO());
                }}
              >
                Today
              </Button>
              <IconButton label={`Previous ${periodName}`} size="md" onClick={() => setMonth((m) => step(view, m, -1))}>
                <ChevronLeft className="size-4" />
              </IconButton>
              <IconButton label={`Next ${periodName}`} size="md" onClick={() => setMonth((m) => step(view, m, 1))}>
                <ChevronRight className="size-4" />
              </IconButton>
            </div>
          </div>
          {view === "month" ? (
            <MonthGrid month={month} selected={selected} onSelect={select} dayData={dayData} weekStartsOn={weekStartsOn} />
          ) : (
            <div className={cn("grid gap-3", view === "quarter" ? "grid-cols-[repeat(auto-fill,minmax(172px,1fr))]" : "grid-cols-[repeat(auto-fill,minmax(164px,1fr))]")}>
              {months.map((m) => (
                <MiniMonth
                  key={m.toISOString()}
                  month={m}
                  selected={selected}
                  onSelect={select}
                  onOpenMonth={openMonth}
                  dayData={dayData}
                  weekStartsOn={weekStartsOn}
                  size={view === "quarter" ? "md" : "sm"}
                />
              ))}
            </div>
          )}
          {view === "quarter" && (
            <div className="mt-6">
              <SectionHeading>This quarter · deadlines and notes</SectionHeading>
              {agenda.length === 0 ? (
                <EmptyState title="Nothing scheduled this quarter" className="py-6" />
              ) : (
                agenda.map((a) => (
                  <Link
                    key={a.id}
                    href={a.note ? href({ date: a.date, note: a.note }) : `/projects/${a.id.slice(2)}`}
                    scroll={false}
                    className="flex h-9 items-center gap-3 rounded-md px-2 hover:bg-hover"
                  >
                    <span className="w-24 shrink-0 text-[13px] text-fg-2 tabular">{formatDay(a.date)}</span>
                    <span>{a.icon}</span>
                    <span className={cn("min-w-0 flex-1 truncate text-[14px]", a.deadline && "text-danger")}>{a.deadline ? `${a.label} — deadline` : a.label}</span>
                  </Link>
                ))
              )}
            </div>
          )}
          <p className="mt-2 text-[12px] text-fg-3">
            {view === "month"
              ? "Notes are per day. Red diamonds are project deadlines; “due” counts open tasks."
              : "Red dot: deadline · grey dot: notes · blue dot: tasks due. Click a month name to open it."}
          </p>
        </section>

        <section className="min-w-0">
          <div className="mb-5 flex items-end justify-between gap-3 border-b border-line pb-3">
            <div>
              <div className="text-[12px] font-medium uppercase tracking-wide text-fg-3">{selected === todayISO() ? "Today" : format(parseDate(selected)!, "EEEE")}</div>
              <h2 className="text-[20px] font-semibold">{formatLongDate(selected)}</h2>
            </div>
            <Button variant="primary" onClick={() => void addNote()}>
              <Plus className="size-3.5" /> New note
            </Button>
          </div>

          {(day.deadlines.length > 0 || day.due.length > 0 || completed.length > 0) && (
            <div className="mb-6 space-y-4">
              {day.deadlines.length > 0 && (
                <div>
                  <SectionHeading>Deadlines</SectionHeading>
                  {day.deadlines.map((p) => (
                    <Link key={p.id} href={`/projects/${p.id}`} className="flex h-8 items-center gap-2 rounded-md px-2 text-[14px] hover:bg-hover">
                      <span>{p.icon}</span> {p.name}
                    </Link>
                  ))}
                </div>
              )}
              {day.due.length > 0 && (
                <div>
                  <SectionHeading>Due</SectionHeading>
                  <TaskList tasks={day.due} />
                </div>
              )}
              {completed.length > 0 && (
                <div>
                  <SectionHeading>Completed this day</SectionHeading>
                  <TaskList tasks={completed} />
                </div>
              )}
            </div>
          )}

          {day.notes.length === 0 ? (
            <EmptyState
              title="No notes for this day"
              description="Capture what happened — meetings, decisions, things to remember."
              action={
                <Button onClick={() => void addNote()}>
                  <Plus className="size-3.5" /> Add a note
                </Button>
              }
            />
          ) : (
            day.notes.map((n) => <NoteCard key={n.id} note={n} focus={n.id === focusNote} />)
          )}
        </section>
      </div>
    </Page>
  );
}
