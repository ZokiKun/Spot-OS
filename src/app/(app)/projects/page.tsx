import { Suspense } from "react";
import { pick } from "@/lib/direction-server";
import { ProjectsView as ProjectsView1 } from "@/components/projects/projects-view";
import { ProjectsView as ProjectsView2 } from "@/directions/d2/components/projects/projects-view";
import { ProjectsView as ProjectsView3 } from "@/directions/d3/components/projects/projects-view";

export const metadata = { title: "Projects" };

export default async function Page() {
  const View = await pick({ 1: ProjectsView1, 2: ProjectsView2, 3: ProjectsView3 });
  return <Suspense><View /></Suspense>;
}
