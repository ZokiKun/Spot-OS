"use client";

import { eachDayOfInterval, endOfMonth, endOfWeek, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import type { CalendarNote, Project, Task } from "@/directions/d2/lib/types";
import { cn, todayISO, toISODate } from "@/directions/d2/lib/utils";

export interface DayData {
  notes: CalendarNote[];
  due: Task[];
  deadlines: Project[];
}

/** Month as a grid of round days. Each day shows up to three dots: deadline, tasks due, notes. */
export function MonthGrid({
  month,
  selected,
  onSelect,
  dayData,
  weekStartsOn = 1,
}: {
  month: Date;
  selected: string;
  onSelect: (iso: string) => void;
  dayData: (iso: string) => DayData;
  weekStartsOn?: 0 | 1;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn }),
  });
  const today = todayISO();
  const weekdays = weekStartsOn === 1 ? ["M", "T", "W", "T", "F", "S", "S"] : ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 text-center text-[12.5px] text-fg-3">
        {weekdays.map((d, i) => (
          <div key={i} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1.5">
        {days.map((d) => {
          const iso = toISODate(d);
          const { notes, due, deadlines } = dayData(iso);
          const isSel = iso === selected;
          const isToday = iso === today;
          const outside = !isSameMonth(d, month);
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              aria-pressed={isSel}
              aria-label={`${d.toDateString()}${deadlines.length ? `, ${deadlines.length} deadline` : ""}${due.length ? `, ${due.length} due` : ""}${notes.length ? `, ${notes.length} notes` : ""}`}
              className="group flex flex-col items-center gap-1 py-0.5"
            >
              <span
                className={cn(
                  "flex size-11 items-center justify-center rounded-full text-[15px] tabular transition-[background,transform] duration-150 group-active:scale-90 sm:size-14 sm:text-[17px]",
                  outside && !isSel && "text-fg-3",
                  isSel ? "bg-accent font-medium text-on-accent" : isToday ? "bg-sun font-medium text-on-chunk" : "group-hover:bg-hover",
                )}
              >
                {d.getDate()}
              </span>
              <span className="flex h-1.5 items-center gap-1">
                {deadlines.length > 0 && <span className="size-1.5 rounded-full bg-coral" />}
                {due.length > 0 && <span className="size-1.5 rounded-full bg-[var(--dot-blue)]" />}
                {notes.length > 0 && <span className="size-1.5 rounded-full bg-fg" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
