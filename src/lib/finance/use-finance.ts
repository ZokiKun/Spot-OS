"use client";

import { useMemo, useState } from "react";
import type { FinanceEntry, FinanceSource } from "../types";
import { useWorkspace } from "../store";
import { normalizeSheet, parseCsv, summarize, type FinanceSummary } from "./normalize";
import { demoFinanceCsv } from "./sample";

/** After this long without a new upload, Spot OS nudges the team to upload this month's file. */
export const FINANCE_STALE_DAYS = 35;

export interface FinanceState {
  source: FinanceSource | null;
  summary: FinanceSummary | null;
  entries: FinanceEntry[];
  currency: string;
  /** When the current numbers were uploaded (null for sample data or before the first upload). */
  updatedAt: string | null;
  stale: boolean;
}

/**
 * Finance numbers come from a spreadsheet a member uploads (monthly) in Settings → Finance.
 * The file is read in the browser; only the normalized entries are saved, as a finance_snapshot.
 */
export function useFinance(): FinanceState {
  const { data } = useWorkspace();
  const source = data.finance_sources[0] ?? null;
  const snapshot = useMemo(
    () =>
      source
        ? data.finance_snapshots.filter((s) => s.source_id === source.id).sort((a, b) => b.fetched_at.localeCompare(a.fetched_at))[0]
        : undefined,
    [data.finance_snapshots, source],
  );

  const demo = useMemo(() => (source?.kind === "demo" ? normalizeSheet(parseCsv(demoFinanceCsv()), source.mapping) : null), [source]);

  const entries = useMemo(() => demo?.entries ?? snapshot?.entries ?? [], [demo, snapshot]);
  const balance = demo ? demo.balance : (snapshot?.balance ?? null);
  const summary = useMemo(
    () => (source && (demo || snapshot) ? summarize(entries, balance, source.mapping) : null),
    [source, demo, snapshot, entries, balance],
  );

  const updatedAt = demo ? null : (snapshot?.fetched_at ?? null);
  const [now] = useState(() => Date.now());
  const stale = !!updatedAt && now - new Date(updatedAt).getTime() > FINANCE_STALE_DAYS * 86_400_000;

  return { source, summary, entries, currency: source?.mapping.currency ?? "EUR", updatedAt, stale };
}
