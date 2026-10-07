import { addDays, endOfMonth, endOfWeek, endOfYear, format, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import type { ISODate, Snapshot } from "./types";
import { isOpen } from "./selectors";
import { htmlToMarkdown } from "./markdown";
import { formatLongDate, parseDate, toISODate } from "./utils";

export type ExportRange = "week" | "month" | "year";

export interface CalendarEvent {
  uid: string; // stable — re-importing updates instead of duplicating
  date: ISODate; // all-day
  title: string;
  description: string;
  kind: "deadline" | "task" | "note";
}

/** [start, end) of the week / month / year containing `date`. */
export function rangeFor(range: ExportRange, date: ISODate, weekStartsOn: 0 | 1 = 1) {
  const d = parseDate(date) ?? new Date();
  const [s, e] =
    range === "week"
      ? [startOfWeek(d, { weekStartsOn }), addDays(endOfWeek(d, { weekStartsOn }), 1)]
      : range === "month"
        ? [startOfMonth(d), addDays(endOfMonth(d), 1)]
        : [startOfYear(d), addDays(endOfYear(d), 1)];
  const label =
    range === "week" ? `Week of ${format(s, "MMM d, yyyy")}` : range === "month" ? format(s, "MMMM yyyy") : format(s, "yyyy");
  return { start: toISODate(s), end: toISODate(e), label };
}

/** Project deadlines, open task due dates and day notes in [start, end). */
export function collectEvents(data: Snapshot, start: ISODate, end: ISODate): CalendarEvent[] {
  const inRange = (d: string | null) => !!d && d >= start && d < end;
  const projects = new Map(data.projects.map((p) => [p.id, p]));
  const events: CalendarEvent[] = [];
  for (const p of data.projects)
    if (inRange(p.deadline) && p.status !== "archived")
      events.push({
        uid: `deadline-${p.id}`,
        date: p.deadline!,
        title: `◆ ${p.name} — deadline`,
        description: [p.client && `Client: ${p.client}`, p.next_action && `Next action: ${p.next_action}`].filter(Boolean).join("\n"),
        kind: "deadline",
      });
  for (const t of data.tasks)
    if (inRange(t.due_date) && isOpen(t))
      events.push({
        uid: `task-${t.id}`,
        date: t.due_date!,
        title: `☐ ${t.title}`,
        description: [t.project_id && `Project: ${projects.get(t.project_id)?.name ?? ""}`, t.description].filter(Boolean).join("\n"),
        kind: "task",
      });
  for (const n of data.calendar_notes)
    if (inRange(n.date))
      events.push({
        uid: `note-${n.id}`,
        date: n.date,
        title: n.title || "Note",
        description: htmlToMarkdown(n.content_html).trim(),
        kind: "note",
      });
  return events.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const compact = (d: ISODate) => d.replace(/-/g, "");

/** RFC 5545: fold lines at 75 octets (UTF-8), never splitting a character. */
const encoder = new TextEncoder();
function fold(line: string) {
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = encoder.encode(ch).length;
    if (bytes + n > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

/** iCalendar file — imports into Google Calendar, Apple Calendar and Outlook. */
export function toICS(events: CalendarEvent[], calendarName: string) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Studio Spot//Spot OS//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(calendarName)}`,
    ...events.flatMap((e) => [
      "BEGIN:VEVENT",
      `UID:${e.uid}@spot-os`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(e.date)}`,
      `DTEND;VALUE=DATE:${compact(toISODate(addDays(parseDate(e.date)!, 1)))}`,
      `SUMMARY:${esc(e.title)}`,
      ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []),
      `CATEGORIES:${e.kind.toUpperCase()}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Readable digest of the period, grouped by day. */
export function toMarkdown(events: CalendarEvent[], title: string) {
  const byDay = new Map<string, CalendarEvent[]>();
  events.forEach((e) => byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]));
  const days = [...byDay.entries()].map(([date, list]) => {
    const body = list
      .map((e) => (e.kind === "note" ? `### ${e.title}\n\n${e.description || "_Empty note_"}` : `- ${e.title}${e.description ? ` — ${e.description.replace(/\n/g, " · ")}` : ""}`))
      .join("\n\n");
    return `## ${formatLongDate(date)}\n\n${body}`;
  });
  return `# ${title}\n\n${days.length ? days.join("\n\n") : "_Nothing scheduled._"}\n`;
}

/** One-click "add this to Google Calendar" link for a single all-day event (no setup needed). */
export function googleCalendarLink(e: Pick<CalendarEvent, "date" | "title" | "description">) {
  const next = toISODate(addDays(parseDate(e.date)!, 1));
  const q = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates: `${compact(e.date)}/${compact(next)}`, details: e.description });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

export const GOOGLE_CALENDAR_IMPORT_URL = "https://calendar.google.com/calendar/u/0/r/settings/export";
