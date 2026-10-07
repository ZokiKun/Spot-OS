"use client";

import { eachDayOfInterval, endOfMonth, endOfWeek, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import type { CalendarNote, Project, Task } from "@/directions/d3/lib/types";
import { cn, todayISO, toISODate } from "@/directions/d3/lib/utils";

export interface DayData {
  notes: CalendarNote[];
  due: Task[];
  deadlines: Project[];
}

/**
 * Duolingo-style month: round day buttons, today in orange, the selected day ringed in blue,
 * and at most three coloured dots underneath instead of crammed text.
 */
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
      <div className="grid grid-cols-7">
        {weekdays.map((d, i) => (
          <div key={i} className="label-caps pb-2 text-center text-[12px] text-fg-3">
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
          const label = [
            deadlines.length && `${deadlines.length} deadline${deadlines.length > 1 ? "s" : ""}`,
            notes.length && `${notes.length} note${notes.length > 1 ? "s" : ""}`,
            due.length && `${due.length} task${due.length > 1 ? "s" : ""} due`,
          ]
            .filter(Boolean)
            .join(", ");
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              title={label || undefined}
              aria-label={`${iso}${label ? `: ${label}` : ""}`}
              aria-pressed={isSel}
              className="group flex flex-col items-center gap-1 py-0.5"
            >
              <span
                className={cn(
                  "flex size-11 items-center justify-center rounded-full border-2 text-[15px] font-extrabold tabular transition-colors max-sm:size-9 max-sm:text-[14px]",
                  isToday
                    ? "border-orange-edge bg-orange text-white"
                    : isSel
                      ? "border-blue bg-blue-soft text-blue"
                      : outside
                        ? "border-transparent text-fg-3/70 group-hover:bg-hover"
                        : "border-transparent text-fg group-hover:bg-hover",
                  isToday && isSel && "ring-4 ring-blue/35",
                )}
              >
                {d.getDate()}
              </span>
              <span className="flex h-2 items-center gap-1">
                {deadlines.length > 0 && <span className="size-2 rounded-full bg-red" />}
                {notes.length > 0 && <span className="size-2 rounded-full bg-blue" />}
                {due.length > 0 && <span className="size-2 rounded-full bg-yellow" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarLegend() {
  return (
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-[12.5px] font-bold text-fg-2">
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-red" /> Deadline
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-blue" /> Note
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-yellow" /> Tasks due
      </span>
    </div>
  );
}
