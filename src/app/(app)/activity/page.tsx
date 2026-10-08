import { Suspense } from "react";
import { ActivityView } from "@/components/activity/activity-view";

export const metadata = { title: "Activity" };

export default function Page() {
  return <Suspense><ActivityView /></Suspense>;
}
