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
    tasks: [],
    calendar_notes: [],
    attachments: [],
    library_items: [],
    reviews: [],
    activity_log: [],
    kb_pages: [],
    finance_sources: [],
    finance_snapshots: [],
    settings: [],
  };
}
