"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Change, Row, Snapshot, TableName, UUID } from "../types";
import { TABLE_NAMES } from "../types";
import type { AuthUser, DataAdapter, UploadResult } from "./adapter";
import { emptySnapshot, normalizeSnapshot } from "./adapter";
import { getSupabaseBrowserClient } from "../supabase/client";
import { STORAGE_BUCKET } from "../supabase/env";
import { uid } from "../utils";

const OPTIONAL_TABLES: TableName[] = ["milestones"];
const MISSING_TABLE = ["42P01", "PGRST205"];
const SIGNED_URL_TTL = 60 * 60 * 24 * 365; // 1 year — see docs/ARCHITECTURE.md §6

/**
 * Columns from newer migrations: if the database hasn't been migrated yet, PostgREST rejects the
 * write ("Could not find the 'x' column…", PGRST204). Drop that column and retry so the app keeps
 * saving — e.g. tasks keep their primary assignee until 0006 adds assignee_ids.
 */
const MISSING_COLUMN = /Could not find the '([^']+)' column/;
async function withoutMissingColumns<R>(
  values: Record<string, unknown>,
  run: (values: Record<string, unknown>) => PromiseLike<{ data: R; error: { code?: string; message: string } | null }>,
) {
  let current = values;
  for (let tries = 0; tries < 5; tries++) {
    const res = await run(current);
    const col = res.error?.message.match(MISSING_COLUMN)?.[1];
    if (!col || !(col in current)) return res;
    console.warn(`Spot OS: column "${col}" is missing — run the latest supabase/migrations.`);
    const { [col]: _dropped, ...rest } = current;
    void _dropped;
    current = rest;
  }
  return run(current);
}

/**
 * Supabase backend. RLS restricts every table to studio members;
 * activity_log rows are written by database triggers, not by the client.
 */
export class SupabaseAdapter implements DataAdapter {
  readonly mode = "supabase" as const;
  private sb: SupabaseClient = getSupabaseBrowserClient();

  async getUser(): Promise<AuthUser | null> {
    const { data } = await this.sb.auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email ?? "" } : null;
  }

  async signOut() {
    await this.sb.auth.signOut();
  }

  async loadAll(): Promise<Snapshot> {
    const snap = emptySnapshot();
    await Promise.all(
      TABLE_NAMES.map(async (table) => {
        let q = this.sb.from(table).select("*");
        if (table === "activity_log") q = q.order("created_at", { ascending: false }).limit(300);
        if (table === "finance_snapshots") q = q.order("fetched_at", { ascending: false }).limit(10);
        if (table === "notifications") q = q.order("created_at", { ascending: false }).limit(200);
        const { data, error } = await q;
        // Tables from newer migrations: an unmigrated database shows no data instead of failing.
        if (error && OPTIONAL_TABLES.includes(table) && MISSING_TABLE.includes(error.code)) {
          console.warn(`Spot OS: table "${table}" is missing — run the latest supabase/migrations.`);
          return;
        }
        if (error) throw new Error(`Loading ${table}: ${error.message}`);
        (snap[table] as unknown[]) = data ?? [];
      }),
    );
    return normalizeSnapshot(snap);
  }

  async insert<T extends TableName>(table: T, row: Row<T>): Promise<Row<T>> {
    // RLS lets you create a notification for someone else but not read it back.
    if (table === "notifications") {
      const { error } = await withoutMissingColumns(row as unknown as Record<string, unknown>, (v) => this.sb.from(table).insert(v));
      if (error) throw new Error(error.message);
      return row;
    }
    const { data, error } = await withoutMissingColumns(row as unknown as Record<string, unknown>, (v) => this.sb.from(table).insert(v).select().single());
    if (error) throw new Error(error.message);
    return data as Row<T>;
  }

  async update<T extends TableName>(table: T, id: UUID, patch: Partial<Row<T>>): Promise<Row<T>> {
    // updated_at is set by the `touch_updated_at` trigger
    const { updated_at: _ignored, ...rest } = patch as Record<string, unknown>;
    void _ignored;
    const { data, error } = await withoutMissingColumns(rest, (v) => this.sb.from(table).update(v).eq("id", id).select().single());
    if (error) throw new Error(error.message);
    return data as Row<T>;
  }

  async remove(table: TableName, id: UUID): Promise<void> {
    const { error } = await this.sb.from(table).delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  subscribe(onChange: (change: Change) => void) {
    const channel = this.sb
      .channel("spotos-db")
      .on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
        const table = payload.table as TableName;
        if (!TABLE_NAMES.includes(table)) return;
        if (payload.eventType === "DELETE") {
          const id = (payload.old as { id?: UUID }).id;
          if (id) onChange({ type: "delete", table, id });
        } else {
          onChange({ type: "upsert", table, row: payload.new as Row<TableName> });
        }
      })
      .subscribe();
    return () => {
      void this.sb.removeChannel(channel);
    };
  }

  async upload(file: File, folder: string): Promise<UploadResult> {
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${folder}/${uid()}-${safe}`;
    const { error } = await this.sb.storage.from(STORAGE_BUCKET).upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (error) throw new Error(error.message);
    const { data, error: urlError } = await this.sb.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL);
    if (urlError || !data) throw new Error(urlError?.message ?? "Could not create file URL");
    return { path, url: data.signedUrl };
  }

  async removeFile(path: string) {
    await this.sb.storage.from(STORAGE_BUCKET).remove([path]);
  }
}
