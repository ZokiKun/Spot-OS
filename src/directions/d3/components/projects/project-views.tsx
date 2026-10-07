import type { Project, ProjectStatus } from "@/directions/d3/lib/types";
import { nowISO } from "@/directions/d3/lib/utils";

export function projectStatusPatch(status: ProjectStatus): Partial<Project> {
  return { status, completed_at: status === "completed" ? nowISO() : null };
}
