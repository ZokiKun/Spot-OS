import type { Notification, Profile, Row, Snapshot, TableName, UUID } from "./types";
import { firstName } from "./utils";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Plain text of editor HTML (tags stripped, entities decoded enough for matching). */
export function plainText(htmlOrText: string) {
  return htmlOrText
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h\d|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"');
}

/** Regex that finds "@Full Name" or "@First" for a member (case-insensitive, whole word). */
function mentionPattern(p: Profile) {
  const names = [p.full_name, firstName(p.full_name)].filter(Boolean).map(escapeRe);
  return new RegExp(`(^|[^\\w@])@(${names.join("|")})(?![\\w])`, "i");
}

/**
 * Who is @mentioned in a text field or editor HTML.
 * Rich text carries `data-id` on mention nodes; plain text is matched by name.
 */
export function mentionedIds(content: string | null | undefined, profiles: Profile[]): Set<UUID> {
  const ids = new Set<UUID>();
  if (!content) return ids;
  for (const m of content.matchAll(/data-type="mention"[^>]*data-id="([^"]+)"|data-id="([^"]+)"[^>]*data-type="mention"/g)) ids.add((m[1] ?? m[2])!);
  const text = plainText(content);
  for (const p of profiles) if (mentionPattern(p).test(text)) ids.add(p.id);
  return ids;
}

/** ~140 characters around the first mention of `profile`. */
export function excerptAround(content: string, profile: Profile) {
  const text = plainText(content).replace(/\s+/g, " ").trim();
  const m = mentionPattern(profile).exec(text);
  const at = m ? m.index : 0;
  const start = Math.max(0, at - 50);
  const out = text.slice(start, start + 140);
  return `${start > 0 ? "…" : ""}${out}${start + 140 < text.length ? "…" : ""}`;
}

/** Fields that can contain @mentions, per table. */
const MENTION_FIELDS: Partial<Record<TableName, string[]>> = {
  projects: ["note", "notes_html", "next_action", "description"],
  tasks: ["description", "title"],
  calendar_notes: ["content_html", "title"],
  kb_pages: ["content_md"],
};

type NewNotification = Omit<Notification, "id" | "created_at" | "updated_at">;

/**
 * Notifications for people newly @mentioned by an edit (not ones already mentioned before,
 * and never yourself). Called by the store on every create/update.
 */
export function mentionNotifications<T extends TableName>(
  table: T,
  before: Row<T> | null,
  after: Row<T>,
  data: Snapshot,
  actorId: UUID | null,
): NewNotification[] {
  const fields = MENTION_FIELDS[table];
  if (!fields || !actorId) return [];
  const a = after as unknown as Record<string, string | null>;
  const b = (before ?? {}) as unknown as Record<string, string | null>;
  const out: NewNotification[] = [];
  const notified = new Set<UUID>();

  for (const field of fields) {
    if (a[field] === b[field]) continue;
    const now = mentionedIds(a[field], data.profiles);
    const was = mentionedIds(b[field], data.profiles);
    for (const id of now) {
      if (was.has(id) || id === actorId || notified.has(id)) continue;
      const profile = data.profiles.find((p) => p.id === id);
      if (!profile) continue;
      notified.add(id);
      out.push({ recipient_id: id, actor_id: actorId, kind: "mention", ...target(table, after, data), excerpt: excerptAround(a[field] ?? "", profile), read_at: null });
    }
  }
  return out;
}

function target<T extends TableName>(table: T, row: Row<T>, data: Snapshot): Pick<Notification, "entity_type" | "entity_id" | "entity_label" | "href"> {
  switch (table) {
    case "projects": {
      const p = row as Row<"projects">;
      return { entity_type: "project", entity_id: p.id, entity_label: p.name, href: `/projects/${p.id}` };
    }
    case "tasks": {
      const t = row as Row<"tasks">;
      return {
        entity_type: "task",
        entity_id: t.id,
        entity_label: t.title,
        href: t.project_id ? `/projects/${t.project_id}?tab=tasks&task=${t.id}` : `/projects/tasks?task=${t.id}`,
      };
    }
    case "calendar_notes": {
      const n = row as Row<"calendar_notes">;
      return { entity_type: "calendar_note", entity_id: n.id, entity_label: n.title || `Note on ${n.date}`, href: `/calendar?date=${n.date}&note=${n.id}` };
    }
    default: {
      const k = row as Row<"kb_pages">;
      void data;
      return { entity_type: "kb_page", entity_id: k.id, entity_label: k.title, href: `/spot-base/${k.slug}` };
    }
  }
}
