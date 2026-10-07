"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Change, Row, Snapshot, TableName, UUID } from "../types";
import { TABLE_NAMES } from "../types";
import type { AuthUser, DataAdapter, UploadResult } from "./adapter";
import { emptySnapshot } from "./adapter";
import { getSupabaseBrowserClient } from "../supabase/client";
import { STORAGE_BUCKET } from "../supabase/env";
import { uid } from "../utils";

const SIGNED_URL_TTL = 60 * 60 * 24 * 365; // 1 year — see docs/ARCHITECTURE.md §6

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
        const { data, error } = await q;
        if (error) throw new Error(`Loading ${table}: ${error.message}`);
        (snap[table] as unknown[]) = data ?? [];
      }),
    );
    return snap;
  }

  async insert<T extends TableName>(table: T, row: Row<T>): Promise<Row<T>> {
    const { data, error } = await this.sb.from(table).insert(row).select().single();
    if (error) throw new Error(error.message);
    return data as Row<T>;
  }

  async update<T extends TableName>(table: T, id: UUID, patch: Partial<Row<T>>): Promise<Row<T>> {
    // updated_at is set by the `touch_updated_at` trigger
    const { updated_at: _ignored, ...rest } = patch as Record<string, unknown>;
    void _ignored;
    const { data, error } = await this.sb.from(table).update(rest).eq("id", id).select().single();
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
