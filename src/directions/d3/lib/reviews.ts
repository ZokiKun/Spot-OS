import { addMonths, addQuarters, format, startOfMonth, startOfQuarter } from "date-fns";
import type { Review, ReviewPeriod } from "./types";
import { parseDate } from "./utils";

export interface ReviewField {
  key: keyof Pick<Review, "planned" | "done" | "not_done" | "reasons" | "wins" | "problems" | "lessons" | "next_period" | "numbers">;
  label: string;
  hint: string;
}

const MONTHLY: ReviewField[] = [
  { key: "planned", label: "Planned", hint: "What did we plan to do this month?" },
  { key: "done", label: "Actually done", hint: "What actually got done?" },
  { key: "not_done", label: "Not done", hint: "What didn’t happen?" },
  { key: "reasons", label: "Reasons", hint: "Why not? Be honest, not defensive." },
  { key: "wins", label: "Wins", hint: "What went well?" },
  { key: "problems", label: "Problems", hint: "What went wrong or got in the way?" },
  { key: "lessons", label: "Lessons", hint: "What will we do differently?" },
  { key: "next_period", label: "Next month", hint: "The few things that matter next month." },
  { key: "numbers", label: "Important numbers", hint: "Anything the auto-calculated metrics miss." },
];

const QUARTERLY: ReviewField[] = [
  { key: "planned", label: "Planned", hint: "What did we plan for the quarter?" },
  { key: "done", label: "Actually done", hint: "What actually got done?" },
  { key: "not_done", label: "Not done", hint: "What didn’t happen, and why?" },
  { key: "numbers", label: "Revenue, expenses & projects", hint: "Commentary on the numbers above." },
  { key: "wins", label: "Wins", hint: "What went well?" },
  { key: "problems", label: "Problems", hint: "What went wrong?" },
  { key: "lessons", label: "Lessons", hint: "What will we do differently?" },
  { key: "next_period", label: "Next quarter", hint: "Priorities for next quarter." },
];

export const reviewFields = (period: ReviewPeriod) => (period === "month" ? MONTHLY : QUARTERLY);

export function periodRange(period: ReviewPeriod, start: string): [string, string] {
  const d = parseDate(start)!;
  const end = period === "month" ? addMonths(d, 1) : addQuarters(d, 1);
  return [start, format(end, "yyyy-MM-dd")];
}

export function periodLabel(period: ReviewPeriod, start: string) {
  const d = parseDate(start);
  if (!d) return start;
  return period === "month" ? format(d, "MMMM yyyy") : `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
}

/** Finance key used by normalize.totalsBy for this period. */
export function financeKey(period: ReviewPeriod, start: string) {
  const d = parseDate(start)!;
  return period === "month" ? format(d, "yyyy-MM") : `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
}

/** Recent periods a review could be written for (newest first). */
export function recentPeriods(period: ReviewPeriod, count: number, today = new Date()) {
  const base = period === "month" ? startOfMonth(today) : startOfQuarter(today);
  return Array.from({ length: count }, (_, i) =>
    format(period === "month" ? addMonths(base, -i) : addQuarters(base, -i), "yyyy-MM-dd"),
  );
}

export function isReviewStarted(r: Review) {
  return reviewFields(r.period).some((f) => r[f.key]?.trim());
}
