"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { addMonths, format, startOfMonth } from "date-fns";
import { ArrowUpRight, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { CalendarNote, Project, Task } from "@/directions/d2/lib/types";
import { useWorkspace } from "@/directions/d2/lib/store";
import { isOpen } from "@/directions/d2/lib/selectors";
import { cn, parseDate, todayISO } from "@/directions/d2/lib/utils";
import { Page } from "@/directions/d2/components/shell/page";
import { BigTitle, Card, CircleButton, PillButton } from "@/directions/d2/components/ui/chunk";
import { TaskChunkList } from "@/directions/d2/components/tasks/task-chunks";
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
  const selDate = parseDate(selected)!;
  const isToday = selected === todayISO();

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

  const nothing = day.deadlines.length + day.due.length + completed.length + day.notes.length === 0;

  return (
    <Page crumbs={[{ label: "Calendar" }]}>
      <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)] xl:gap-10">
        <section className="xl:sticky xl:top-[88px]">
          <div className="mb-6 flex items-end gap-3">
            <BigTitle className="min-w-0 flex-1">
              {format(month, "MMMM")}
              <span className="text-fg-3"> {format(month, "yyyy")}</span>
            </BigTitle>
          </div>
          <Card tone="surface" className="p-4 sm:p-6">
            <div className="mb-3 flex items-center gap-2">
              <PillButton
                tone="outline"
                size="sm"
                onClick={() => {
                  setMonth(startOfMonth(new Date()));
                  select(todayISO());
                }}
              >
                Today
              </PillButton>
              <div className="ml-auto flex gap-1.5">
                <CircleButton label="Previous month" tone="ghost" className="bg-hover" onClick={() => setMonth((m) => addMonths(m, -1))}>
                  <ChevronLeft />
                </CircleButton>
                <CircleButton label="Next month" tone="ghost" className="bg-hover" onClick={() => setMonth((m) => addMonths(m, 1))}>
                  <ChevronRight />
                </CircleButton>
              </div>
            </div>
            <MonthGrid month={month} selected={selected} onSelect={select} dayData={dayData} weekStartsOn={weekStartsOn} />
            <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[12.5px] text-fg-2">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-coral" /> Deadline
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[var(--dot-blue)]" /> Tasks due
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-fg" /> Notes
              </span>
            </div>
          </Card>
        </section>

        <section className="min-w-0">
          <div className="mb-6 flex items-end justify-between gap-3 xl:pt-[18px]">
            <div>
              <div className="text-[14px] text-fg-2">{isToday ? "Today" : format(selDate, "EEEE")}</div>
              <h2 className="text-[34px] font-medium leading-tight tracking-[-0.03em] sm:text-[40px]">{format(selDate, "d MMMM")}</h2>
            </div>
            <PillButton onClick={() => void addNote()}>
              <Plus /> Note
            </PillButton>
          </div>

          <div className="stagger flex flex-col gap-3" key={selected}>
            {day.deadlines.length > 0 && (
              <Card tone="coral" className="p-6">
                <div className="mb-3 text-[20px] font-medium tracking-[-0.02em]">Deadline{day.deadlines.length > 1 ? "s" : ""}</div>
                <div className="flex flex-col gap-2">
                  {day.deadlines.map((p) => (
                    <Link key={p.id} href={`/projects/${p.id}`} className="press flex min-h-12 items-center gap-3 rounded-[22px] bg-[var(--chunk-soft)] px-4">
                      <span className="text-[18px]">{p.icon}</span>
                      <span className="min-w-0 flex-1 truncate text-[14.5px]">{p.name}</span>
                      <ArrowUpRight className="size-4 opacity-50" />
                    </Link>
                  ))}
                </div>
              </Card>
            )}
            {day.due.length > 0 && (
              <Card tone="sky" className="p-6">
                <div className="mb-3 text-[20px] font-medium tracking-[-0.02em]">Due {isToday ? "today" : "this day"}</div>
                <TaskChunkList tasks={day.due} tone="sky" limit={4} showAssignee showDue={false} />
              </Card>
            )}
            {completed.length > 0 && (
              <Card tone="lime" className="p-6">
                <div className="mb-3 text-[20px] font-medium tracking-[-0.02em]">Finished · {completed.length}</div>
                <TaskChunkList tasks={completed} tone="lime" limit={3} showAssignee showDue={false} />
              </Card>
            )}
            {day.notes.map((n) => (
              <NoteCard key={n.id} note={n} focus={n.id === focusNote} />
            ))}
            {nothing && (
              <Card tone="cream" className="items-center px-6 py-14 text-center">
                <div className="text-[22px] font-medium tracking-[-0.02em]">A blank page</div>
                <div className="mt-1 max-w-xs text-[14px] text-[var(--on-chunk-2)]">Nothing due and nothing written. Capture a meeting, a decision, or something to remember.</div>
                <button type="button" onClick={() => void addNote()} className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-[#151515] px-5 text-[14px] text-[#f7f3ea]">
                  <Plus className="size-4" /> Write a note
                </button>
              </Card>
            )}
            {!nothing && day.notes.length === 0 && (
              <button
                type="button"
                onClick={() => void addNote()}
                className={cn("flex h-14 items-center justify-center gap-2 rounded-[28px] text-[14px] text-fg-2 shadow-[inset_0_0_0_1.5px_var(--border-strong)] hover:text-fg")}
              >
                <Plus className="size-4" /> Add a note for this day
              </button>
            )}
          </div>
        </section>
      </div>
    </Page>
  );
}
