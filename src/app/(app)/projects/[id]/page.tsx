import { Suspense } from "react";
import { pick } from "@/lib/direction-server";
import { ProjectDetail as ProjectDetail1 } from "@/components/projects/project-detail";
import { ProjectDetail as ProjectDetail2 } from "@/directions/d2/components/projects/project-detail";
import { ProjectDetail as ProjectDetail3 } from "@/directions/d3/components/projects/project-detail";

export default async function Page({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const View = await pick({ 1: ProjectDetail1, 2: ProjectDetail2, 3: ProjectDetail3 });
  return <Suspense><View id={id} /></Suspense>;
}
