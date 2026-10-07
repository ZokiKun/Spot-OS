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

/* ---------- Guided flow: the fields grouped into three steps ---------- */

export type ReviewStepTone = "cream" | "sky" | "lime";

export interface ReviewStep {
  /** 1-based, used in the `?step=` param. */
  n: number;
  title: string;
  helper: string;
  tone: ReviewStepTone;
  fields: ReviewField[];
}

const STEP_META: Omit<ReviewStep, "n" | "fields">[] = [
  { title: "Look back", helper: "What was the plan, and what actually happened?", tone: "cream" },
  { title: "What we learned", helper: "The good, the bad, and what to change.", tone: "sky" },
  { title: "Look ahead", helper: "Turn it into a short plan for what’s next.", tone: "lime" },
];

const STEP_KEYS: Record<ReviewPeriod, ReviewField["key"][][]> = {
  month: [
    ["planned", "done", "not_done", "reasons"],
    ["wins", "problems", "lessons"],
    ["next_period", "numbers"],
  ],
  quarter: [
    ["planned", "done", "not_done", "numbers"],
    ["wins", "problems", "lessons"],
    ["next_period"],
  ],
};

/** The review's questions split into Look back → What we learned → Look ahead. */
export function reviewSteps(period: ReviewPeriod): ReviewStep[] {
  const fields = reviewFields(period);
  return STEP_KEYS[period].map((keys, i) => ({
    n: i + 1,
    ...STEP_META[i],
    fields: keys.map((k) => fields.find((f) => f.key === k)!).filter(Boolean),
  }));
}

/** How many of the review's questions have an answer. */
export function reviewProgress(r: Review, fields: ReviewField[] = reviewFields(r.period)) {
  const filled = fields.filter((f) => r[f.key]?.trim()).length;
  return { filled, total: fields.length };
}

/** "September" / "2026", or "Q3" / "2026" — for big period titles. */
export function periodParts(period: ReviewPeriod, start: string) {
  const d = parseDate(start);
  if (!d) return { name: start, year: "" };
  return {
    name: period === "month" ? format(d, "MMMM") : `Q${Math.floor(d.getMonth() / 3) + 1}`,
    year: String(d.getFullYear()),
  };
}

/**
 * The period a review is due for right now, or null when none is.
 * Monthly: this month, or last month during the first week.
 * Quarterly: the last month of a quarter, or the previous quarter during the first two weeks.
 */
export function duePeriod(period: ReviewPeriod, today = new Date()): string | null {
  if (period === "month") {
    const base = startOfMonth(today);
    return format(today.getDate() <= 7 ? addMonths(base, -1) : base, "yyyy-MM-dd");
  }
  const q = startOfQuarter(today);
  const monthInQuarter = today.getMonth() - q.getMonth();
  if (monthInQuarter === 0 && today.getDate() <= 14) return format(addQuarters(q, -1), "yyyy-MM-dd");
  if (monthInQuarter === 2) return format(q, "yyyy-MM-dd");
  return null;
}
