"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { addMonths, format, startOfMonth } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { CalendarNote, Project, Task } from "@/lib/types";
import { useWorkspace } from "@/lib/store";
import { isOpen } from "@/lib/selectors";
import { formatLongDate, parseDate, todayISO } from "@/lib/utils";
import { Page } from "@/components/shell/page";
import { Button, IconButton } from "@/components/ui/button";
import { EmptyState, SectionHeading } from "@/components/ui/misc";
import { TaskList } from "@/components/tasks/task-table";
import { MonthGrid } from "./month-grid";
import { NoteCard } from "./note-card";

export function CalendarView() {
  const { data, create, me } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selected = params.get("date") ?? todayISO();
  const focusNote = params.get("note");
  const [month, setMonth] = useState(() => startOfMonth(parseDate(selected) ?? new Date()));
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

  const select = (iso: string) => {
    router.replace(`${pathname}?date=${iso}`, { scroll: false });
    const d = parseDate(iso);
    if (d && (d.getMonth() !== month.getMonth() || d.getFullYear() !== month.getFullYear())) setMonth(startOfMonth(d));
  };

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
    router.replace(`${pathname}?date=${selected}&note=${n.id}`, { scroll: false });
  };

  return (
    <Page crumbs={[{ label: "Calendar", icon: <CalendarDays className="size-4" /> }]} width="full" className="max-w-[1400px]">
      <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(420px,520px)]">
        <section>
          <div className="mb-4 flex items-center gap-2">
            <h1 className="text-[28px] font-bold tracking-[-0.01em]">{format(month, "MMMM")}</h1>
            <span className="text-[28px] font-bold text-fg-3">{format(month, "yyyy")}</span>
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="secondary"
                onClick={() => {
                  setMonth(startOfMonth(new Date()));
                  select(todayISO());
                }}
              >
                Today
              </Button>
              <IconButton label="Previous month" size="md" onClick={() => setMonth((m) => addMonths(m, -1))}>
                <ChevronLeft className="size-4" />
              </IconButton>
              <IconButton label="Next month" size="md" onClick={() => setMonth((m) => addMonths(m, 1))}>
                <ChevronRight className="size-4" />
              </IconButton>
            </div>
          </div>
          <MonthGrid month={month} selected={selected} onSelect={select} dayData={dayData} weekStartsOn={weekStartsOn} />
          <p className="mt-2 text-[12px] text-fg-3">Notes are per day. Red diamonds are project deadlines; “due” counts open tasks.</p>
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
