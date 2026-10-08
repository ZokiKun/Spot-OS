"use client";

import type { ActivityEntry, Change, Row, Snapshot, TableName, UUID } from "../types";
import type { AuthUser, DataAdapter, UploadResult } from "./adapter";
import { normalizeSnapshot } from "./adapter";
import { buildSeed } from "./seed";
import { deriveActivity, shouldSkipEdit } from "./activity";
import { nowISO, uid } from "../utils";

const DB_KEY = "spotos:db:v1";
const USER_KEY = "spotos:demo-user";
const CHANNEL = "spotos:changes";
const MAX_UPLOAD = 2 * 1024 * 1024;

type Message = { change: Change };

/**
 * Local-only backend for running Spot OS on localhost without Supabase.
 * Data lives in localStorage; BroadcastChannel syncs open tabs to mimic Realtime.
 */
export class DemoAdapter implements DataAdapter {
  readonly mode = "demo" as const;
  private db: Snapshot;
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<(c: Change) => void>();

  constructor() {
    this.db = this.read();
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = (e: MessageEvent<Message>) => {
        this.applyLocal(e.data.change);
        this.listeners.forEach((l) => l(e.data.change));
      };
    }
  }

  private read(): Snapshot {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) return normalizeSnapshot(JSON.parse(raw) as Snapshot);
    } catch {
      /* fall through to seed */
    }
    const seed = buildSeed();
    this.write(seed);
    return seed;
  }

  private write(db = this.db) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (err) {
      console.warn("Spot OS demo storage is full", err);
      throw new Error("Local demo storage is full — remove some attachments.");
    }
  }

  private applyLocal(change: Change) {
    const rows = this.db[change.table] as { id: UUID }[];
    if (change.type === "delete") {
      (this.db[change.table] as { id: UUID }[]) = rows.filter((r) => r.id !== change.id);
    } else {
      const idx = rows.findIndex((r) => r.id === change.row.id);
      if (idx === -1) rows.push(change.row);
      else rows[idx] = change.row;
    }
  }

  private emit(change: Change) {
    this.applyLocal(change);
    this.write();
    this.listeners.forEach((l) => l(change));
    this.channel?.postMessage({ change } satisfies Message);
  }

  private log<T extends TableName>(table: T, before: Row<T> | null, after: Row<T>) {
    const derived = deriveActivity(table, before, after);
    if (!derived) return;
    const actor = localStorage.getItem(USER_KEY);
    if (shouldSkipEdit(this.db.activity_log, derived, actor)) return;
    const ts = nowISO();
    const entry: ActivityEntry = { id: uid(), actor_id: actor, ...derived, created_at: ts, updated_at: ts };
    this.emit({ type: "upsert", table: "activity_log", row: entry });
  }

  // ---- auth (demo: pick a member) ----
  async getUser(): Promise<AuthUser | null> {
    const id = localStorage.getItem(USER_KEY);
    const profile = id ? this.db.profiles.find((p) => p.id === id) : null;
    return profile ? { id: profile.id, email: profile.email } : null;
  }
  signInAs(id: UUID) {
    localStorage.setItem(USER_KEY, id);
  }
  async signOut() {
    localStorage.removeItem(USER_KEY);
  }
  async listMembers() {
    return this.db.profiles;
  }

  // ---- data ----
  async loadAll(): Promise<Snapshot> {
    this.db = this.read();
    return structuredClone(this.db);
  }

  async insert<T extends TableName>(table: T, row: Row<T>): Promise<Row<T>> {
    this.emit({ type: "upsert", table, row });
    this.log(table, null, row);
    return row;
  }

  async update<T extends TableName>(table: T, id: UUID, patch: Partial<Row<T>>): Promise<Row<T>> {
    const before = (this.db[table] as Row<T>[]).find((r) => (r as { id: UUID }).id === id);
    if (!before) throw new Error(`${table} ${id} not found`);
    const after = { ...before, ...patch, updated_at: nowISO() } as Row<T>;
    this.emit({ type: "upsert", table, row: after });
    this.log(table, before, after);
    return after;
  }

  async remove(table: TableName, id: UUID): Promise<void> {
    // Mirror the foreign-key rules in the SQL schema (cascade / set null).
    if (table === "projects") {
      this.db.milestones.filter((m) => m.project_id === id).forEach((m) => this.emit({ type: "delete", table: "milestones", id: m.id }));
      const taskIds = new Set(this.db.tasks.filter((t) => t.project_id === id).map((t) => t.id));
      this.db.attachments.filter((a) => a.task_id && taskIds.has(a.task_id)).forEach((a) => this.emit({ type: "delete", table: "attachments", id: a.id }));
      this.db.tasks.filter((t) => t.project_id === id).forEach((t) => this.emit({ type: "delete", table: "tasks", id: t.id }));
      this.db.project_members.filter((m) => m.project_id === id).forEach((m) => this.emit({ type: "delete", table: "project_members", id: m.id }));
      this.db.attachments.filter((a) => a.project_id === id).forEach((a) => this.emit({ type: "delete", table: "attachments", id: a.id }));
      this.db.library_items
        .filter((l) => l.project_id === id)
        .forEach((l) => this.emit({ type: "upsert", table: "library_items", row: { ...l, project_id: null } }));
    }
    if (table === "milestones")
      this.db.tasks
        .filter((t) => t.milestone_id === id)
        .forEach((t) => this.emit({ type: "upsert", table: "tasks", row: { ...t, milestone_id: null } }));
    if (table === "kb_pages")
      this.db.attachments.filter((a) => a.kb_page_id === id).forEach((a) => this.emit({ type: "delete", table: "attachments", id: a.id }));
    if (table === "tasks")
      this.db.attachments.filter((a) => a.task_id === id).forEach((a) => this.emit({ type: "delete", table: "attachments", id: a.id }));
    if (table === "calendar_notes")
      this.db.attachments.filter((a) => a.note_id === id).forEach((a) => this.emit({ type: "delete", table: "attachments", id: a.id }));
    this.emit({ type: "delete", table, id });
  }

  subscribe(onChange: (change: Change) => void) {
    this.listeners.add(onChange);
    return () => {
      this.listeners.delete(onChange);
    };
  }

  async upload(file: File, folder: string): Promise<UploadResult> {
    if (file.size > MAX_UPLOAD)
      throw new Error("Demo mode stores files in the browser — keep uploads under 2 MB. Supabase Storage has no such limit.");
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    return { path: `${folder}/${uid()}-${file.name}`, url };
  }

  async removeFile() {
    /* data URLs live on the row itself */
  }

  reset() {
    localStorage.removeItem(DB_KEY);
    this.db = this.read();
  }
}
