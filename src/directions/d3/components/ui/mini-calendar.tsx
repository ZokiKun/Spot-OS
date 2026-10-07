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
import { cn, parseDate, todayISO, toISODate } from "@/directions/d3/lib/utils";
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
    <div className="w-[280px] select-none p-3">
      <div className="mb-1 flex items-center justify-between pl-1.5">
        <span className="text-[15px] font-extrabold">{format(month, "MMMM yyyy")}</span>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setMonth(startOfMonth(new Date()))}
            className="label-caps mr-1 rounded-lg px-1.5 text-[11px] text-blue hover:bg-hover"
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
      <div className="label-caps grid grid-cols-7 text-center text-[10px] text-fg-3">
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
                "relative mx-auto flex size-9 items-center justify-center rounded-full text-[13px] font-bold tabular transition-colors duration-75",
                !isSameMonth(d, month) && "text-fg-3",
                selected ? "bg-blue text-white" : "hover:bg-hover",
                isToday && !selected && "font-black text-orange",
              )}
            >
              {format(d, "d")}
              {marked?.has(iso) && (
                <span className={cn("absolute bottom-1 size-1 rounded-full", selected ? "bg-white" : "bg-fg-3")} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
