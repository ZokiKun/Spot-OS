import { Suspense } from "react";
import { pick } from "@/lib/direction-server";
import { TasksView as TasksView1 } from "@/components/tasks/tasks-view";
import { TasksView as TasksView2 } from "@/directions/d2/components/tasks/tasks-view";
import { TasksView as TasksView3 } from "@/directions/d3/components/tasks/tasks-view";

export const metadata = { title: "Tasks" };

export default async function Page() {
  const View = await pick({ 1: TasksView1, 2: TasksView2, 3: TasksView3 });
  return <Suspense><View /></Suspense>;
}
