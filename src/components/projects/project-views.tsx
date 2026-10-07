import type { Project, ProjectStatus } from "@/lib/types";
import { nowISO } from "@/lib/utils";

export function projectStatusPatch(status: ProjectStatus): Partial<Project> {
  return { status, completed_at: status === "completed" ? nowISO() : null };
}
