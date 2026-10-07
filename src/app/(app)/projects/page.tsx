import { Suspense } from "react";
import { ProjectsView } from "@/components/projects/projects-view";

export const metadata = { title: "Projects" };

export default function Page() {
  return <Suspense><ProjectsView /></Suspense>;
}
