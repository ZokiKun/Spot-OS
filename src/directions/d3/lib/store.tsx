"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Change, Profile, Row, Snapshot, TableName, UUID } from "./types";
import { emptySnapshot } from "./data/adapter";
import { getAdapter } from "./data";
import { isSupabaseConfigured } from "./supabase/env";
import type { AuthUser } from "./data/adapter";
import { nowISO, uid } from "./utils";
import { useLatest } from "./hooks";
import { useToast } from "@/directions/d3/components/ui/toast";

type State = { data: Snapshot; status: "loading" | "ready" | "error"; error: string | null };
type Action =
  | { type: "loaded"; data: Snapshot }
  | { type: "error"; error: string }
  | { type: "change"; change: Change };

function applyChange(data: Snapshot, change: Change): Snapshot {
  const rows = data[change.table] as { id: UUID }[];
  let next: { id: UUID }[];
  if (change.type === "delete") {
    if (!rows.some((r) => r.id === change.id)) return data;
    next = rows.filter((r) => r.id !== change.id);
  } else {
    const idx = rows.findIndex((r) => r.id === change.row.id);
    if (idx === -1) next = change.table === "activity_log" ? [change.row, ...rows] : [...rows, change.row];
    else {
      next = rows.slice();
      next[idx] = change.row;
    }
  }
  return { ...data, [change.table]: next };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "loaded":
      return { data: action.data, status: "ready", error: null };
    case "error":
      return { ...state, status: "error", error: action.error };
    case "change":
      return { ...state, data: applyChange(state.data, action.change) };
  }
}

/** Fields the store fills in automatically on create. */
type AutoFields = "id" | "created_at" | "updated_at";
export type NewRow<T extends TableName> = Omit<Row<T>, AutoFields> & Partial<Pick<Row<T>, AutoFields>>;

interface WorkspaceContextValue {
  data: Snapshot;
  status: State["status"];
  error: string | null;
  mode: "demo" | "supabase";
  user: AuthUser | null;
  me: Profile | null;
  create<T extends TableName>(table: T, row: NewRow<T>): Promise<Row<T>>;
  update<T extends TableName>(table: T, id: UUID, patch: Partial<Row<T>>): Promise<void>;
  remove(table: TableName, id: UUID): Promise<void>;
  upload(file: File, folder: string): Promise<{ path: string; url: string }>;
  signOut(): Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const [state, dispatch] = useReducer(reducer, {
    data: emptySnapshot(),
    status: "loading",
    error: null,
  });
  const [user, setUser] = useState<AuthUser | null>(null);
  const dataRef = useLatest(state.data);

  useEffect(() => {
    const adapter = getAdapter();
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    (async () => {
      try {
        const u = await adapter.getUser();
        if (!u) {
          router.replace("/login");
          return;
        }
        if (cancelled) return;
        setUser(u);
        // Subscribe before loading so no change is missed in between.
        unsubscribe = adapter.subscribe((change) => dispatch({ type: "change", change }));
        const data = await adapter.loadAll();
        if (!cancelled) dispatch({ type: "loaded", data });
      } catch (err) {
        if (!cancelled) dispatch({ type: "error", error: err instanceof Error ? err.message : String(err) });
      }
    })();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [router]);

  const fail = useCallback(
    (err: unknown, what: string) => {
      const message = err instanceof Error ? err.message : String(err);
      toast.show({ title: `Couldn't ${what}`, description: message, tone: "error" });
    },
    [toast],
  );

  const create = useCallback(
    async <T extends TableName>(table: T, row: NewRow<T>) => {
      const ts = nowISO();
      const full = { id: uid(), created_at: ts, updated_at: ts, ...row } as unknown as Row<T>;
      dispatch({ type: "change", change: { type: "upsert", table, row: full } });
      try {
        const saved = await getAdapter().insert(table, full);
        dispatch({ type: "change", change: { type: "upsert", table, row: saved } });
        return saved;
      } catch (err) {
        dispatch({ type: "change", change: { type: "delete", table, id: (full as { id: UUID }).id } });
        fail(err, "save");
        throw err;
      }
    },
    [fail],
  );

  const update = useCallback(
    async <T extends TableName>(table: T, id: UUID, patch: Partial<Row<T>>) => {
      const before = (dataRef.current[table] as Row<T>[]).find((r) => (r as { id: UUID }).id === id);
      if (!before) return;
      const optimistic = { ...before, ...patch, updated_at: nowISO() } as Row<T>;
      dispatch({ type: "change", change: { type: "upsert", table, row: optimistic } });
      try {
        const saved = await getAdapter().update(table, id, patch);
        dispatch({ type: "change", change: { type: "upsert", table, row: saved } });
      } catch (err) {
        dispatch({ type: "change", change: { type: "upsert", table, row: before } });
        fail(err, "update");
      }
    },
    [fail, dataRef],
  );

  const remove = useCallback(
    async (table: TableName, id: UUID) => {
      const before = (dataRef.current[table] as Row<TableName>[]).find((r) => (r as { id: UUID }).id === id);
      dispatch({ type: "change", change: { type: "delete", table, id } });
      try {
        await getAdapter().remove(table, id);
      } catch (err) {
        if (before) dispatch({ type: "change", change: { type: "upsert", table, row: before } });
        fail(err, "delete");
      }
    },
    [fail, dataRef],
  );

  const upload = useCallback(
    async (file: File, folder: string) => {
      try {
        return await getAdapter().upload(file, folder);
      } catch (err) {
        fail(err, "upload");
        throw err;
      }
    },
    [fail],
  );

  const signOut = useCallback(async () => {
    await getAdapter().signOut();
    router.replace("/login");
  }, [router]);

  const me = useMemo(
    () => (user ? (state.data.profiles.find((p) => p.id === user.id) ?? null) : null),
    [user, state.data.profiles],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      data: state.data,
      status: state.status,
      error: state.error,
      mode: isSupabaseConfigured ? "supabase" : "demo",
      user,
      me,
      create,
      update,
      remove,
      upload,
      signOut,
    }),
    [state, user, me, create, update, remove, upload, signOut],
  );

  return <WorkspaceContext value={value}>{children}</WorkspaceContext>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return ctx;
}

/** Profile lookup helper used across tables and pickers. */
export function useProfiles() {
  const { data } = useWorkspace();
  return useMemo(() => {
    const byId = new Map(data.profiles.map((p) => [p.id, p]));
    return { list: data.profiles, get: (id: UUID | null | undefined) => (id ? byId.get(id) : undefined) };
  }, [data.profiles]);
}

export function useProjectsById() {
  const { data } = useWorkspace();
  return useMemo(() => new Map(data.projects.map((p) => [p.id, p])), [data.projects]);
}
