import type { Project, ProjectStatus } from "@/directions/d2/lib/types";
import { nowISO } from "@/directions/d2/lib/utils";

export function projectStatusPatch(status: ProjectStatus): Partial<Project> {
  return { status, completed_at: status === "completed" ? nowISO() : null };
}
