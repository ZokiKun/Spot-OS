import type { TaskStatus } from "./types";

/** The member Claude's tasks are assigned to (a view-only bot profile, see migration 0007). */
export const CLAUDE_AGENT_NAME = "Claude:zoki";

/** Tasks Claude picks up. Review/Done are left alone — Review means "shipped, waiting for a person". */
export const OPEN_FIX_STATUSES: TaskStatus[] = ["todo", "in_progress", "blocked"];

/** A run that hasn't reported back after this long no longer blocks a new one. */
export const FIX_RUN_STALE_MS = 3 * 60 * 60 * 1000;

export interface FixRun {
  id: string;
  requested_by: string | null;
  task_ids: string[];
  status: "running" | "done" | "failed";
  session_url: string | null;
  summary: string | null;
  results: { task_id: string; outcome: "shipped" | "skipped"; note?: string; commit?: string }[];
  error: string | null;
  created_at: string;
  finished_at: string | null;
}
