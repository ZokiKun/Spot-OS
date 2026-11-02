import { addMonths, addQuarters, format, startOfMonth, startOfQuarter } from "date-fns";
import type { TagColor } from "./constants";
import type { Profile, Project, Review, Snapshot, Task, UUID } from "./types";
import { CLAUDE_AGENT_NAME } from "./push-to-fix";
import { taskAssignees } from "./selectors";
import { parseDate } from "./utils";

/**
 * Reviews → Month / Goals / Overview. A month is one `reviews` row (period "month") holding the money
 * and Claude's report; commitments and goals are their own tables. See migration 0011.
 */

// ─── Tags (where the time went) ───

export type WorkTag = "client" | "studio" | "personal";
export const WORK_TAGS: WorkTag[] = ["client", "studio", "personal"];
export const TAG_META: Record<WorkTag, { label: string; color: TagColor }> = {
  client: { label: "Client", color: "orange" },
  studio: { label: "Studio", color: "blue" },
  personal: { label: "Personal", color: "pink" },
};

/** People the review is about: not view-only bots, not the Push-to-fix Claude member. */
export const isReviewMember = (p: Profile) => p.access !== "viewer" && p.full_name !== CLAUDE_AGENT_NAME;

// ─── Periods ───

export const monthStartOf = (d: Date) => format(startOfMonth(d), "yyyy-MM-dd");
export const quarterStartOf = (d: Date) => format(startOfQuarter(d), "yyyy-MM-dd");
export const shiftMonth = (start: string, n: number) => format(addMonths(parseDate(start)!, n), "yyyy-MM-dd");
export const shiftQuarter = (start: string, n: number) => format(addQuarters(parseDate(start)!, n), "yyyy-MM-dd");
export const quarterOfMonth = (monthStart: string) => quarterStartOf(parseDate(monthStart)!);
export const monthName = (start: string, style: "long" | "short" | "year" = "long") =>
  format(parseDate(start)!, style === "year" ? "MMMM yyyy" : style === "short" ? "MMM" : "MMMM");
export const quarterName = (start: string) => {
  const d = parseDate(start)!;
  return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
};

/** Month starts from `from` to `to`, inclusive. */
export function monthsBetween(from: string, to: string) {
  const out: string[] = [];
  for (let m = from; m <= to; m = shiftMonth(m, 1)) out.push(m);
  return out;
}

/** "October 2026", "Aug – Oct 2026" or "Nov 2025 – Jan 2026" for a sorted list of months. */
export function monthsLabel(months: string[]) {
  if (!months.length) return "";
  if (months.length === 1) return monthName(months[0]!, "year");
  const first = parseDate(months[0]!)!;
  const last = parseDate(months.at(-1)!)!;
  return first.getFullYear() === last.getFullYear()
    ? `${format(first, "MMM")} – ${format(last, "MMM yyyy")}`
    : `${format(first, "MMM yyyy")} – ${format(last, "MMM yyyy")}`;
}

export function findMonthReview(data: Pick<Snapshot, "reviews">, month: string): Review | undefined {
  return data.reviews.find((r) => r.period === "month" && r.period_start === month);
}

/** A fresh month row (the older free-text review fields start empty). */
export function blankMonthReview(month: string, by: UUID | null) {
  return {
    period: "month" as const,
    period_start: month,
    planned: "",
    done: "",
    not_done: "",
    reasons: "",
    wins: "",
    problems: "",
    lessons: "",
    next_period: "",
    numbers: "",
    revenue: null,
    burn: null,
    report_md: null,
    report_generated_at: null,
    report_generated_by: null,
    created_by: by,
    updated_by: by,
  };
}

// ─── Work done, from completed tasks ───

/** The domain a task counts towards: its own override, else its project's. */
export const taskDomain = (task: Task, project: Project | undefined): string | null => task.domain ?? project?.domain ?? null;

/** Where a task's time goes: its project's type; tasks without a project are studio work. */
export const taskTag = (project: Project | undefined): WorkTag => project?.type ?? "studio";

/** One completed task's share for one person (a task with 2 assignees gives each 0.5). */
export interface Credit {
  task: Task;
  project: Project | undefined;
  tag: WorkTag;
  domain: string | null;
  profileId: UUID | null;
  weight: number;
}

/** Credit for every task completed in [start, end). */
export function taskCredits(data: Pick<Snapshot, "tasks" | "projects">, start: string, end: string): Credit[] {
  const projects = new Map(data.projects.map((p) => [p.id, p]));
  const out: Credit[] = [];
  for (const task of data.tasks) {
    const day = task.completed_at?.slice(0, 10);
    if (task.status !== "done" || !day || day < start || day >= end) continue;
    const project = task.project_id ? projects.get(task.project_id) : undefined;
    const base = { task, project, tag: taskTag(project), domain: taskDomain(task, project) };
    const people = taskAssignees(task);
    if (!people.length) out.push({ ...base, profileId: null, weight: 1 });
    else people.forEach((profileId) => out.push({ ...base, profileId, weight: 1 / people.length }));
  }
  return out;
}

export type TagCounts = Record<WorkTag, number> & { total: number };

export function tagCounts(credits: Credit[]): TagCounts {
  const c = { client: 0, studio: 0, personal: 0, total: 0 };
  credits.forEach((x) => {
    c[x.tag] += x.weight;
    c.total += x.weight;
  });
  return c;
}

/** Tasks rounded for display: 3, 2.5, 0.3 → "3", "2.5", "0.3". */
export const fmtCount = (n: number) => String(Math.round(n * 10) / 10);

// ─── Digest for Claude's report ───

/**
 * Plain-text summary of one month's data, sent to Claude to write the report. Only what's needed:
 * names, project names and types, task titles, commitments and the money (when it's been entered).
 */
export function monthDigest(data: Snapshot, month: string, currency: string): string {
  const end = shiftMonth(month, 1);
  const credits = taskCredits(data, month, end);
  const members = data.profiles.filter(isReviewMember);
  const lines: string[] = [`Month: ${monthName(month, "year")}`, ""];

  const review = findMonthReview(data, month);
  if (review?.revenue != null || review?.burn != null)
    lines.push(`Money: revenue collected ${review?.revenue ?? "not entered"} ${currency}, burn ${review?.burn ?? "not entered"} ${currency}`, "");

  for (const person of members) {
    const mine = credits.filter((c) => c.profileId === person.id);
    const counts = tagCounts(mine);
    lines.push(
      `## ${person.full_name}${person.role_title ? ` (${person.role_title})` : ""}`,
      `Tasks completed: ${fmtCount(counts.total)} — client ${fmtCount(counts.client)}, studio ${fmtCount(counts.studio)}, personal ${fmtCount(counts.personal)}`,
    );
    const byProject = new Map<string, Credit[]>();
    mine.forEach((c) => {
      const key = c.project ? `${c.project.name} [${c.project.type}]` : "No project [studio]";
      byProject.set(key, [...(byProject.get(key) ?? []), c]);
    });
    for (const [project, list] of byProject) lines.push(`- ${project}: ${list.map((c) => c.task.title).join("; ")}`);
    if (!mine.length) lines.push("- (no completed tasks)");
    lines.push("");
  }

  const unassigned = credits.filter((c) => !c.profileId);
  if (unassigned.length) lines.push("## Unassigned completed tasks", ...unassigned.map((c) => `- ${c.task.title}${c.project ? ` (${c.project.name})` : ""}`), "");

  const started = data.projects.filter((p) => p.created_at.slice(0, 10) >= month && p.created_at.slice(0, 10) < end);
  if (started.length) lines.push("## Projects started this month", ...started.map((p) => `- ${p.name} [${p.type}]`), "");

  const commitments = data.commitments.filter((c) => c.month === month).sort((a, b) => a.sort_order - b.sort_order);
  if (commitments.length) {
    const who = (id: string | null) => members.find((p) => p.id === id)?.full_name ?? "studio";
    lines.push(
      "## Commitments made at the start of the month",
      ...commitments.map(
        (c) =>
          `- ${c.title} (${c.scope === "personal" ? `personal, ${who(c.owner_id)}` : "studio"}): ${
            c.status === "done" ? "done" : c.status === "not_done" ? `not done${c.why ? ` — why: ${c.why}` : ""}` : "not reviewed yet"
          }`,
      ),
      "",
    );
  }
  return lines.join("\n");
}
