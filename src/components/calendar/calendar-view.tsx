"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { addMonths, format, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { CalendarNote, Project, Task } from "@/lib/types";
import { useWorkspace } from "@/lib/store";
import { isOpen, weekStartsOn as getWeekStart } from "@/lib/selectors";
import { cn, parseDate, todayISO } from "@/lib/utils";
import { Page } from "@/components/shell/page";
import { Button, IconButton } from "@/components/ui/button";
import { Card, EmptyState, SectionHeading } from "@/components/ui/misc";
import { TaskList } from "@/components/tasks/task-table";
import { CalendarLegend, MonthGrid } from "./month-grid";
import { NoteCard } from "./note-card";

/** Pick a day on the left; everything about that day — deadlines, tasks, notes — on the right. */
export function CalendarView() {
  const { data, create, me } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selected = params.get("date") ?? todayISO();
  const focusNote = params.get("note");
  const [month, setMonth] = useState(() => startOfMonth(parseDate(selected) ?? new Date()));
  const weekStartsOn = getWeekStart(data);

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

  const select = (iso: string) => {
    router.replace(`${pathname}?date=${iso}`, { scroll: false });
    const d = parseDate(iso);
    if (d && (d.getMonth() !== month.getMonth() || d.getFullYear() !== month.getFullYear())) setMonth(startOfMonth(d));
  };

  const day = dayData(selected);
  const completed = data.tasks.filter((t) => t.completed_at && t.completed_at.slice(0, 10) === selected);
  const isToday = selected === todayISO();
  const selDate = parseDate(selected)!;

  const addNote = async () => {
    const n = await create("calendar_notes", {
      date: selected,
      title: "",
      content_html: "",
      created_by: me?.id ?? null,
      updated_by: me?.id ?? null,
    });
    router.replace(`${pathname}?date=${selected}&note=${n.id}`, { scroll: false });
  };

  const empty = !day.deadlines.length && !day.due.length && !completed.length && !day.notes.length;

  return (
    <Page crumbs={[{ label: "Calendar" }]} width="wide">
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,430px)_minmax(0,1fr)] lg:gap-10">
        <Card className="px-4 pb-5 pt-4 lg:sticky lg:top-7">
          <div className="mb-4 flex items-center gap-1">
            <IconButton label="Previous month" size="md" onClick={() => setMonth((m) => addMonths(m, -1))}>
              <ChevronLeft className="size-5" strokeWidth={3} />
            </IconButton>
            <h1 className="label-caps flex-1 text-center text-[15px] text-fg">{format(month, "MMMM yyyy")}</h1>
            <IconButton label="Next month" size="md" onClick={() => setMonth((m) => addMonths(m, 1))}>
              <ChevronRight className="size-5" strokeWidth={3} />
            </IconButton>
          </div>
          <MonthGrid month={month} selected={selected} onSelect={select} dayData={dayData} weekStartsOn={weekStartsOn} />
          <div className="mt-4 flex flex-col items-center gap-3 border-t-2 border-line pt-4">
            <CalendarLegend />
            {!isToday && (
              <Button
                variant="secondary"
                onClick={() => {
                  setMonth(startOfMonth(new Date()));
                  select(todayISO());
                }}
              >
                Back to today
              </Button>
            )}
          </div>
        </Card>

        <section className="min-w-0">
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <div className={cn("label-caps text-[12.5px]", isToday ? "text-orange" : "text-fg-3")}>{isToday ? "Today" : format(selDate, "EEEE")}</div>
              <h2 className="text-[28px] font-black leading-tight">{format(selDate, "EEEE, MMMM d")}</h2>
            </div>
            <Button variant="primary" size="md" onClick={() => void addNote()}>
              <Plus className="size-4" strokeWidth={3.5} /> Note
            </Button>
          </div>

          {empty ? (
            <Card>
              <EmptyState
                mood="sleepy"
                title={isToday ? "A quiet day so far" : "Nothing on this day"}
                description="Capture what happened — meetings, decisions, things to remember."
                action={
                  <Button variant="secondary" onClick={() => void addNote()}>
                    <Plus className="size-4" strokeWidth={3} /> Add a note
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="space-y-8">
              {day.deadlines.length > 0 && (
                <div className="space-y-2.5">
                  {day.deadlines.map((p) => (
                    <Link key={p.id} href={`/projects/${p.id}`} className="card-press flex items-center gap-4 rounded-2xl border-red/40 bg-red-soft px-4 py-3">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-bg text-[22px]">{p.icon ?? "📁"}</span>
                      <div className="min-w-0">
                        <div className="label-caps text-[11px] text-red-edge">Deadline</div>
                        <div className="truncate text-[16px] font-extrabold">{p.name}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {day.due.length > 0 && (
                <section>
                  <SectionHeading size="md">Due this day</SectionHeading>
                  <TaskList tasks={day.due} />
                </section>
              )}
              {day.notes.length > 0 && (
                <section>
                  <SectionHeading size="md">Notes</SectionHeading>
                  <div className="space-y-4">
                    {day.notes.map((n) => (
                      <NoteCard key={n.id} note={n} focus={n.id === focusNote} />
                    ))}
                  </div>
                </section>
              )}
              {completed.length > 0 && (
                <section>
                  <SectionHeading size="md">Finished this day 🎉</SectionHeading>
                  <TaskList tasks={completed} />
                </section>
              )}
            </div>
          )}
        </section>
      </div>
    </Page>
  );
}
