"use client";

import { useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, parseDate, todayISO, toISODate } from "@/directions/d2/lib/utils";
import { IconButton } from "./button";

export function MiniCalendar({
  value,
  onSelect,
  marked,
  weekStartsOn = 1,
}: {
  value: string | null;
  onSelect: (iso: string) => void;
  marked?: Set<string>;
  weekStartsOn?: 0 | 1;
}) {
  const [month, setMonth] = useState(() => startOfMonth(parseDate(value) ?? new Date()));
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn }),
  });
  const today = todayISO();
  const weekdays = weekStartsOn === 1 ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className="w-[248px] select-none p-2">
      <div className="mb-1 flex items-center justify-between pl-1.5">
        <span className="text-[14px] font-medium">{format(month, "MMMM yyyy")}</span>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setMonth(startOfMonth(new Date()))}
            className="mr-1 h-7 rounded-full px-2.5 text-[12px] text-fg-2 hover:bg-hover"
          >
            Today
          </button>
          <IconButton label="Previous month" onClick={() => setMonth((m) => addMonths(m, -1))}>
            <ChevronLeft className="size-4" />
          </IconButton>
          <IconButton label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="size-4" />
          </IconButton>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-fg-3">
        {weekdays.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((d) => {
          const iso = toISODate(d);
          const selected = iso === value;
          const isToday = iso === today;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              className={cn(
                "relative mx-auto flex size-9 items-center justify-center rounded-full text-[13px] tabular transition-colors duration-75",
                !isSameMonth(d, month) && "text-fg-3",
                selected ? "bg-accent font-medium text-on-accent" : "hover:bg-hover",
                isToday && !selected && "bg-sun font-medium text-on-chunk",
              )}
            >
              {format(d, "d")}
              {marked?.has(iso) && (
                <span className={cn("absolute bottom-1 size-1 rounded-full", selected ? "bg-on-accent" : "bg-fg-3")} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
