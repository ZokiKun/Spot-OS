import { clsx, type ClassValue } from "clsx";
import {
  addDays,
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isValid,
  parseISO,
} from "date-fns";
import type { ISODate } from "./types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function uid() {
  return crypto.randomUUID();
}

export function nowISO() {
  return new Date().toISOString();
}

/** Local calendar date as YYYY-MM-DD (never UTC-shifted). */
export function toISODate(d: Date): ISODate {
  return format(d, "yyyy-MM-dd");
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

export function addDaysISO(date: ISODate, days: number): ISODate {
  return toISODate(addDays(parseISO(date), days));
}

export function parseDate(date: string | null | undefined): Date | null {
  if (!date) return null;
  const d = parseISO(date);
  return isValid(d) ? d : null;
}

/** Days from today to date (negative = past). */
export function daysUntil(date: ISODate | null | undefined): number | null {
  const d = parseDate(date);
  if (!d) return null;
  return differenceInCalendarDays(d, new Date());
}

/** Notion-style relative date label: Today, Tomorrow, Yesterday, Oct 12. */
export function formatDay(date: ISODate | null | undefined, opts: { withYear?: boolean } = {}) {
  const d = parseDate(date);
  if (!d) return "";
  const diff = differenceInCalendarDays(d, new Date());
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return format(d, opts.withYear || !sameYear ? "MMM d, yyyy" : "MMM d");
}

export function formatLongDate(date: ISODate) {
  const d = parseDate(date);
  return d ? format(d, "EEEE, MMMM d, yyyy") : "";
}

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return "";
  const d = parseISO(iso);
  if (!isValid(d)) return "";
  const secs = (Date.now() - d.getTime()) / 1000;
  if (secs < 45) return "just now";
  return `${formatDistanceToNowStrict(d)} ago`;
}

export function formatMoney(value: number | null | undefined, currency = "EUR", compact = false) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    notation: compact ? "compact" : "standard",
  }).format(value);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function firstName(name: string | undefined | null) {
  return (name ?? "").split(/\s+/)[0] ?? "";
}

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function plural(n: number, word: string, pluralWord = `${word}s`) {
  return `${n} ${n === 1 ? word : pluralWord}`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function downloadFile(filename: string, content: string | Blob, mime = "text/plain") {
  const blob = typeof content === "string" ? new Blob([content], { type: mime }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Human distance to a date: "Today", "Tomorrow", "In 3 days", "2 days late". */
export function relativeDays(date: ISODate | null | undefined, { late = "late" }: { late?: string } = {}) {
  const diff = daysUntil(date);
  if (diff == null) return "";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return `1 day ${late}`;
  if (diff < 0) return `${-diff} days ${late}`;
  if (diff <= 14) return `In ${diff} days`;
  return formatDay(date);
}
