import type { Change, Row, Snapshot, TableName, UUID } from "../types";

export interface AuthUser {
  id: UUID;
  email: string;
}

export interface UploadResult {
  path: string;
  url: string;
}

/**
 * The single seam between UI and persistence.
 * - DemoAdapter: localStorage + BroadcastChannel (no backend needed, for localhost).
 * - SupabaseAdapter: Postgres + Realtime + Storage.
 * Everything above this interface is identical in both modes.
 */
export interface DataAdapter {
  readonly mode: "demo" | "supabase";
  getUser(): Promise<AuthUser | null>;
  signOut(): Promise<void>;
  loadAll(): Promise<Snapshot>;
  insert<T extends TableName>(table: T, row: Row<T>): Promise<Row<T>>;
  update<T extends TableName>(table: T, id: UUID, patch: Partial<Row<T>>): Promise<Row<T>>;
  remove(table: TableName, id: UUID): Promise<void>;
  /** Changes made by anyone (including this client — upserts are idempotent). */
  subscribe(onChange: (change: Change) => void): () => void;
  upload(file: File, folder: string): Promise<UploadResult>;
  removeFile(path: string): Promise<void>;
}

export function emptySnapshot(): Snapshot {
  return {
    profiles: [],
    projects: [],
    project_members: [],
    milestones: [],
    tasks: [],
    invoices: [],
    calendar_notes: [],
    attachments: [],
    library_items: [],
    reviews: [],
    activity_log: [],
    kb_pages: [],
    finance_sources: [],
    finance_snapshots: [],
    settings: [],
    notifications: [],
  };
}

/**
 * Fill fields added after a row was stored (demo localStorage, old realtime payloads),
 * so the UI can rely on them.
 */
export function normalizeSnapshot(s: Snapshot): Snapshot {
  return {
    ...emptySnapshot(),
    ...s,
    profiles: s.profiles.map((p) => ({ ...p, access: p.access ?? "editor" })),
    projects: s.projects.map((p) => ({ ...p, tags: p.tags ?? [], note: p.note ?? null, cover: p.cover ?? null, cover_position: p.cover_position ?? 50, task_statuses: p.task_statuses ?? null })),
    library_items: s.library_items.map((l) => ({ ...l, tags: l.tags ?? [], pinned: l.pinned ?? false, pinned_by: l.pinned_by ?? [] })),
    tasks: s.tasks.map((t) => ({ ...t, milestone_id: t.milestone_id ?? null, sort_order: t.sort_order ?? null, custom_status: t.custom_status ?? null, assignee_ids: t.assignee_ids?.length ? t.assignee_ids : t.assignee_id ? [t.assignee_id] : [] })),
    milestones: s.milestones ?? [],
    invoices: s.invoices ?? [],
    attachments: s.attachments.map((a) => ({ ...a, kb_page_id: a.kb_page_id ?? null, task_id: a.task_id ?? null })),
    notifications: s.notifications ?? [],
  };
}
