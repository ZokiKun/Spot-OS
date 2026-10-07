import { Suspense } from "react";
import { ProjectDetail } from "@/components/projects/project-detail";

export default async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  return (
    <Suspense>
      <ProjectDetail id={id} />
    </Suspense>
  );
}
