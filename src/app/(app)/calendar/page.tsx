import { Suspense } from "react";
import { pick } from "@/lib/direction-server";
import { CalendarView as CalendarView1 } from "@/components/calendar/calendar-view";
import { CalendarView as CalendarView2 } from "@/directions/d2/components/calendar/calendar-view";
import { CalendarView as CalendarView3 } from "@/directions/d3/components/calendar/calendar-view";

export const metadata = { title: "Calendar" };

export default async function Page() {
  const View = await pick({ 1: CalendarView1, 2: CalendarView2, 3: CalendarView3 });
  return <Suspense><View /></Suspense>;
}
