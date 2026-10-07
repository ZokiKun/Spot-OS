"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FinanceEntry, FinanceSource } from "../types";
import { useWorkspace } from "../store";
import { normalizeSheet, parseCsv, summarize, type FinanceSummary } from "./normalize";
import { useLatest } from "../hooks";
import { demoFinanceCsv } from "./sample";

const STALE_MS = 60 * 60 * 1000; // re-fetch the sheet at most hourly

export async function fetchSourceRows(source: FinanceSource): Promise<string[][]> {
  if (source.kind === "demo") return parseCsv(demoFinanceCsv());
  if (!source.url) throw new Error("No sheet URL configured");
  const res = await fetch(`/api/finance?url=${encodeURIComponent(source.url)}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Sheet request failed (${res.status})`);
  }
  return parseCsv(await res.text());
}

export interface FinanceState {
  source: FinanceSource | null;
  summary: FinanceSummary | null;
  entries: FinanceEntry[];
  currency: string;
  loading: boolean;
  error: string | null;
  warnings: string[];
  fetchedAt: string | null;
  refresh: () => void;
}

/**
 * Reads the configured finance source (the spreadsheet is the source of truth),
 * caches the normalized result in finance_snapshots so Home renders instantly.
 */
export function useFinance(): FinanceState {
  const { data, create, update } = useWorkspace();
  const source = data.finance_sources[0] ?? null;
  const snapshot = useMemo(
    () =>
      source
        ? data.finance_snapshots.filter((s) => s.source_id === source.id).sort((a, b) => b.fetched_at.localeCompare(a.fetched_at))[0]
        : undefined,
    [data.finance_snapshots, source],
  );
  const [nonce, setNonce] = useState(0);
  const [mountedAt] = useState(() => Date.now());
  type Result = { key: string; live?: { entries: FinanceEntry[]; balance: number | null; warnings: string[]; at: string }; error?: string };
  const [result, setResult] = useState<Result | null>(null);

  // Re-fetch when what we read changes — not on every row update (last_synced_at would loop).
  const sourceKey = source ? `${source.id}:${source.kind}:${source.url}:${JSON.stringify(source.mapping)}` : "";
  const requestKey = `${sourceKey}#${nonce}`;
  const snapshotFresh = !!snapshot && mountedAt - new Date(snapshot.fetched_at).getTime() < STALE_MS;
  // A fresh cached snapshot is good enough on first view; demo data is computed locally.
  const skip = !source || (source.kind !== "demo" && nonce === 0 && snapshotFresh && !result);
  const current = result?.key === requestKey ? result : null;
  const loading = !skip && !current;

  const sourceRef = useLatest(source);
  useEffect(() => {
    const src = sourceRef.current;
    if (skip || !src) return;
    let cancelled = false;
    fetchSourceRows(src)
      .then((rows) => {
        if (cancelled) return;
        const r = normalizeSheet(rows, src.mapping);
        const at = new Date().toISOString();
        setResult({ key: requestKey, live: { entries: r.entries, balance: r.balance, warnings: r.warnings, at } });
        if (src.kind !== "demo") {
          void create("finance_snapshots", { source_id: src.id, entries: r.entries, balance: r.balance, fetched_at: at }).catch(() => {});
          void update("finance_sources", src.id, { last_synced_at: at });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setResult({ key: requestKey, error: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, skip, sourceRef, create, update]);

  // Keep showing the last good data while a refresh is in flight.
  const [lastLive, setLastLive] = useState<Result["live"]>(undefined);
  if (current?.live && current.live !== lastLive) setLastLive(current.live);
  const live = current?.live ?? lastLive;
  const error = current?.error ?? null;

  const entries = useMemo(() => live?.entries ?? snapshot?.entries ?? [], [live, snapshot]);
  const balance = live ? live.balance : (snapshot?.balance ?? null);
  const summary = useMemo(
    () => (source && (live || snapshot) ? summarize(entries, balance, source.mapping) : null),
    [source, live, snapshot, entries, balance],
  );

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  return {
    source,
    summary,
    entries,
    currency: source?.mapping.currency ?? "EUR",
    loading,
    error,
    warnings: live?.warnings ?? [],
    fetchedAt: live?.at ?? snapshot?.fetched_at ?? null,
    refresh,
  };
}
