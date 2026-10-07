"use client";

import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import type { CalendarNote, Project, Task } from "@/lib/types";
import { cn, todayISO, toISODate } from "@/lib/utils";

export interface DayData {
  notes: CalendarNote[];
  due: Task[];
  deadlines: Project[];
}

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
  const weekdays = weekStartsOn === 1 ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="overflow-hidden rounded-lg shadow-[0_0_0_1px_var(--border)]">
      <div className="grid grid-cols-7 border-b border-line">
        {weekdays.map((d) => (
          <div key={d} className="px-2 py-1.5 text-right text-[12px] text-fg-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const iso = toISODate(d);
          const { notes, due, deadlines } = dayData(iso);
          const isSel = iso === selected;
          const isToday = iso === today;
          const outside = !isSameMonth(d, month);
          const weekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              className={cn(
                "group relative flex min-h-[92px] flex-col items-stretch gap-0.5 border-line p-1 text-left transition-colors duration-75 max-sm:min-h-[56px]",
                i % 7 !== 0 && "border-l",
                i >= 7 && "border-t",
                weekend && !isSel && "bg-subtle/60",
                isSel ? "bg-selected" : "hover:bg-hover",
              )}
            >
              <div className="flex justify-end">
                <span
                  className={cn(
                    "flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[13px] tabular",
                    outside && "text-fg-3",
                    isToday && "bg-[var(--dot-red)] font-semibold text-white",
                  )}
                >
                  {d.getDate() === 1 ? format(d, "MMM d") : d.getDate()}
                </span>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5 max-sm:hidden">
                {deadlines.slice(0, 1).map((p) => (
                  <span key={p.id} className="truncate rounded-[3px] bg-danger-soft px-1 text-[11.5px] leading-[18px] text-danger">
                    ◆ {p.name}
                  </span>
                ))}
                {notes.slice(0, 2).map((n) => (
                  <span key={n.id} className="truncate rounded-[3px] bg-elevated px-1 text-[11.5px] leading-[18px] shadow-card">
                    {n.title || "Untitled"}
                  </span>
                ))}
                {notes.length > 2 && <span className="px-1 text-[11px] text-fg-3">+{notes.length - 2} more</span>}
                {due.length > 0 && <span className="px-1 text-[11px] text-fg-3">{due.length} due</span>}
              </div>
              {(notes.length > 0 || deadlines.length > 0) && (
                <span className="absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-fg-3 sm:hidden" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Compact month for the quarter and year views: day numbers plus markers. */
export function MiniMonth({
  month,
  selected,
  onSelect,
  onOpenMonth,
  dayData,
  weekStartsOn = 1,
  size = "sm",
}: {
  month: Date;
  selected: string;
  onSelect: (iso: string) => void;
  onOpenMonth: (month: Date) => void;
  dayData: (iso: string) => DayData;
  weekStartsOn?: 0 | 1;
  size?: "sm" | "md";
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn }),
  });
  const today = todayISO();
  const weekdays = weekStartsOn === 1 ? ["M", "T", "W", "T", "F", "S", "S"] : ["S", "M", "T", "W", "T", "F", "S"];
  let notes = 0;
  let deadlines = 0;
  days.forEach((d) => {
    if (!isSameMonth(d, month)) return;
    const x = dayData(toISODate(d));
    notes += x.notes.length;
    deadlines += x.deadlines.length;
  });

  return (
    <div className={cn("rounded-lg p-2 shadow-[0_0_0_1px_var(--border)]", size === "md" && "p-3")}>
      <button type="button" onClick={() => onOpenMonth(month)} className="mb-1 flex w-full items-baseline gap-2 rounded-md px-1 py-0.5 text-left hover:bg-hover">
        <span className={cn("font-semibold", size === "md" ? "text-[16px]" : "text-[14px]")}>{format(month, "MMMM")}</span>
        <span className="ml-auto text-[11px] text-fg-3 tabular">
          {deadlines > 0 && <span className="text-danger">◆ {deadlines}</span>}
          {deadlines > 0 && notes > 0 && " · "}
          {notes > 0 && `${notes} note${notes === 1 ? "" : "s"}`}
        </span>
      </button>
      <div className="grid grid-cols-7 text-center text-[10.5px] text-fg-3">
        {weekdays.map((d, i) => (
          <span key={i} className="py-0.5">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const iso = toISODate(d);
          const outside = !isSameMonth(d, month);
          if (outside) return <span key={iso} className={size === "md" ? "h-10" : "h-7"} />;
          const x = dayData(iso);
          const isSel = iso === selected;
          const isToday = iso === today;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              title={[x.deadlines.map((p) => `◆ ${p.name}`).join(", "), x.notes.length ? `${x.notes.length} note(s)` : "", x.due.length ? `${x.due.length} due` : ""].filter(Boolean).join(" · ") || undefined}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-md text-[12px] tabular transition-colors",
                size === "md" ? "h-10" : "h-7",
                isSel ? "bg-selected font-semibold" : "hover:bg-hover",
              )}
            >
              <span className={cn("flex size-5 items-center justify-center rounded-full", isToday && "bg-[var(--dot-red)] font-semibold text-white")}>{d.getDate()}</span>
              <span className="flex h-1 gap-0.5">
                {x.deadlines.length > 0 && <span className="size-1 rounded-full bg-[var(--dot-red)]" />}
                {x.notes.length > 0 && <span className="size-1 rounded-full bg-fg-2" />}
                {x.due.length > 0 && <span className="size-1 rounded-full bg-[var(--dot-blue)]" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
