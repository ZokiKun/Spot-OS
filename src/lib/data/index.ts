"use client";

import type { DataAdapter } from "./adapter";
import { DemoAdapter } from "./demo-adapter";
import { SupabaseAdapter } from "./supabase-adapter";
import { isSupabaseConfigured } from "../supabase/env";

let adapter: DataAdapter | null = null;

/** Browser-only. Components call this from effects/handlers, never during render. */
export function getAdapter(): DataAdapter {
  if (typeof window === "undefined") throw new Error("getAdapter() is browser-only");
  if (!adapter) adapter = isSupabaseConfigured ? new SupabaseAdapter() : new DemoAdapter();
  return adapter;
}

export function getDemoAdapter(): DemoAdapter | null {
  if (typeof window === "undefined" || isSupabaseConfigured) return null;
  const a = getAdapter();
  return a instanceof DemoAdapter ? a : null;
}

export type { DataAdapter } from "./adapter";
