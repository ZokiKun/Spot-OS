"use client";

import { addDays } from "date-fns";
import type { CalendarEvent } from "./calendar-export";
import { GOOGLE_CLIENT_ID, requestGoogleToken } from "./google";
import { parseDate, toISODate } from "./utils";

/** Direct sync needs only an OAuth client ID (no API key). Without it, .ics import still works. */
export const isGoogleCalendarConfigured = Boolean(GOOGLE_CLIENT_ID);

const SCOPE = "https://www.googleapis.com/auth/calendar.events";
let token: string | null = null;

/**
 * Pushes events into the signed-in person's primary Google Calendar.
 * Uses events.import with a stable iCalUID, so syncing twice updates instead of duplicating.
 */
export async function syncToGoogleCalendar(events: CalendarEvent[]): Promise<number> {
  if (!token) token = await requestGoogleToken(SCOPE);
  let synced = 0;
  for (const e of events) {
    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events/import", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        iCalUID: `${e.uid}@spot-os`,
        summary: e.title,
        description: e.description,
        start: { date: e.date },
        end: { date: toISODate(addDays(parseDate(e.date)!, 1)) },
        transparency: "transparent",
        source: { title: "Spot OS", url: window.location.origin + "/calendar?date=" + e.date },
      }),
    });
    if (res.status === 401) {
      token = null;
      throw new Error("Google sign-in expired — try again.");
    }
    if (!res.ok) throw new Error(`Google Calendar rejected “${e.title}” (${res.status}).`);
    synced++;
  }
  return synced;
}
