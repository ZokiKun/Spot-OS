import type { ActivityEntry, Row, TableName, UUID } from "../types";

type Derived = Pick<ActivityEntry, "action" | "entity_type" | "entity_id" | "entity_label" | "project_id" | "meta">;

/**
 * Which writes produce an activity entry.
 * Mirrors the `log_activity` trigger in supabase/migrations/0001_init.sql —
 * in Supabase mode the database does this; in demo mode the DemoAdapter calls it.
 */
export function deriveActivity<T extends TableName>(
  table: T,
  before: Row<T> | null,
  after: Row<T>,
): Derived | null {
  switch (table) {
    case "projects": {
      const a = after as Row<"projects">;
      const b = before as Row<"projects"> | null;
      const base = { entity_type: "project" as const, entity_id: a.id, entity_label: a.name, project_id: a.id };
      if (!b) return { ...base, action: "created", meta: {} };
      if (a.status !== b.status) {
        if (a.status === "completed") return { ...base, action: "completed", meta: {} };
        return { ...base, action: "status_changed", meta: { from: b.status, to: a.status } };
      }
      if ((a.next_action ?? "") !== (b.next_action ?? "") && a.next_action)
        return { ...base, action: "next_action_set", meta: { next_action: a.next_action } };
      return null;
    }
    case "tasks": {
      const a = after as Row<"tasks">;
      const b = before as Row<"tasks"> | null;
      const base = { entity_type: "task" as const, entity_id: a.id, entity_label: a.title, project_id: a.project_id };
      if (!b) return { ...base, action: "created", meta: {} };
      if (a.status !== b.status) {
        if (a.status === "done") return { ...base, action: "completed", meta: {} };
        return { ...base, action: "status_changed", meta: { from: b.status, to: a.status } };
      }
      if (a.assignee_id !== b.assignee_id && a.assignee_id)
        return { ...base, action: "assigned", meta: { to: a.assignee_id } };
      return null;
    }
    case "calendar_notes": {
      const a = after as Row<"calendar_notes">;
      if (before) return null;
      return {
        entity_type: "calendar_note",
        entity_id: a.id,
        entity_label: a.title || a.date,
        project_id: null,
        action: "created",
        meta: { date: a.date },
      };
    }
    case "library_items": {
      const a = after as Row<"library_items">;
      if (before) return null;
      return {
        entity_type: "library_item",
        entity_id: a.id,
        entity_label: a.name,
        project_id: a.project_id,
        action: "added",
        meta: {},
      };
    }
    case "reviews": {
      const a = after as Row<"reviews">;
      return {
        entity_type: "review",
        entity_id: a.id,
        entity_label: a.period_start,
        project_id: null,
        action: before ? "edited" : "created",
        meta: { period: a.period },
      };
    }
    case "kb_pages": {
      const a = after as Row<"kb_pages">;
      return {
        entity_type: "kb_page",
        entity_id: a.id,
        entity_label: a.title,
        project_id: null,
        action: before ? "edited" : "created",
        meta: {},
      };
    }
    default:
      return null;
  }
}

/** "edited" entries collapse within this window so autosave doesn't flood the feed. */
export const EDIT_COLLAPSE_MS = 10 * 60 * 1000;

export function isCollapsible(action: string) {
  return action === "edited";
}

export function shouldSkipEdit(
  log: ActivityEntry[],
  entry: { action: string; entity_id: UUID },
  actorId: UUID | null,
) {
  if (!isCollapsible(entry.action)) return false;
  const cutoff = Date.now() - EDIT_COLLAPSE_MS;
  return log.some(
    (e) =>
      e.entity_id === entry.entity_id &&
      e.actor_id === actorId &&
      e.action === entry.action &&
      new Date(e.created_at).getTime() > cutoff,
  );
}
