import type { TaskStatus } from "./types";

/** The member Claude's tasks are assigned to (a view-only bot profile, see migration 0007). */
export const CLAUDE_AGENT_NAME = "Claude:zoki";

/** The GitHub repo Claude works on; Ship it merges its branches into main here. */
export const GITHUB_REPO = "ZokiKun/Spot-OS";

/** Tasks Claude picks up. Review/Done are left alone — Review means "live, waiting for a person". */
export const OPEN_FIX_STATUSES: TaskStatus[] = ["todo", "in_progress", "blocked"];

/** A run that hasn't reported back after this long no longer blocks a new one. */
export const FIX_RUN_STALE_MS = 3 * 60 * 60 * 1000;

export interface FixRun {
  id: string;
  requested_by: string | null;
  task_ids: string[];
  /** running → ready (work on a claude/ branch, waiting for Ship it) → done; or failed. */
  status: "running" | "ready" | "done" | "failed";
  session_url: string | null;
  summary: string | null;
  results: { task_id: string; outcome: "shipped" | "skipped"; note?: string; commit?: string }[];
  error: string | null;
  branch: string | null;
  shipped_at: string | null;
  shipped_by: string | null;
  ship_commit: string | null;
  created_at: string;
  finished_at: string | null;
}

/** Tasks in a run that's waiting for Ship it — not sent to Claude again meanwhile. */
export function tasksAwaitingShip(runs: Pick<FixRun, "status" | "results">[]) {
  return new Set(runs.filter((r) => r.status === "ready").flatMap((r) => r.results.filter((x) => x.outcome === "shipped").map((x) => x.task_id)));
}
