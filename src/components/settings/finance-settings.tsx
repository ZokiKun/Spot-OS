"use client";

import { useState } from "react";
import { CircleCheck, TriangleAlert } from "lucide-react";
import type { FinanceMapping, FinanceSource } from "@/lib/types";
import { useWorkspace } from "@/lib/store";
import { DEMO_MAPPING } from "@/lib/finance/sample";
import { normalizeSheet, summarize } from "@/lib/finance/normalize";
import { fetchSourceRows } from "@/lib/finance/use-finance";
import { formatMoney, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/input";
import { SettingsRow, SettingsSection } from "./settings-ui";

const list = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

type Draft = Omit<FinanceSource, "id" | "created_at" | "updated_at" | "last_synced_at">;

export function FinanceSettings() {
  const { data, create, update } = useWorkspace();
  const source = data.finance_sources[0] ?? null;
  const [draft, setDraft] = useState<Draft>(() => toDraft(source));
  const [test, setTest] = useState<{ ok: boolean; text: string; headers?: string[]; preview?: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  // Reset the form when the saved source changes (e.g. after Save, or another member edits it).
  const [seen, setSeen] = useState(source);
  if (source !== seen) {
    setSeen(source);
    setDraft(toDraft(source));
  }

  const m = draft.mapping;
  const setM = (patch: Partial<FinanceMapping>) => setDraft((d) => ({ ...d, mapping: { ...d.mapping, ...patch } }));
  const mode: "single" | "split" = m.amount ? "single" : "split";

  const runTest = async () => {
    setBusy(true);
    setTest(null);
    try {
      const rows = await fetchSourceRows({ ...draft, id: "test", created_at: "", updated_at: "", last_synced_at: null });
      const result = normalizeSheet(rows, draft.mapping);
      const s = summarize(result.entries, result.balance, draft.mapping);
      setTest({
        ok: result.entries.length > 0,
        text: result.entries.length
          ? `Read ${result.entries.length} entries. Available: ${formatMoney(s.available, m.currency)} · This month net: ${formatMoney(s.currentMonth?.net ?? 0, m.currency)}`
          : "Connected, but no entries matched the mapping.",
        headers: result.headers,
        preview: [...result.warnings, ...result.entries.slice(-3).map((e) => `${e.date} · ${e.description ?? e.category ?? ""} · ${formatMoney(e.amount, m.currency)}`)],
      });
    } catch (err) {
      setTest({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (source) await update("finance_sources", source.id, draft);
    else await create("finance_sources", { ...draft, last_synced_at: null });
  };

  const field = (label: string, key: keyof FinanceMapping, placeholder = "Column header") => (
    <SettingsRow label={label}>
      <TextInput className="w-56" placeholder={placeholder} value={(m[key] as string | undefined) ?? ""} onChange={(e) => setM({ [key]: e.target.value || undefined })} />
    </SettingsRow>
  );

  return (
    <>
      <SettingsSection
        title="Source"
        description="The finance spreadsheet is the source of truth. Spot OS reads it and never writes back."
      >
        <SettingsRow label="Source type">
          <div className="flex gap-1">
            {(["google_sheet_csv", "demo"] as const).map((k) => (
              <Button
                key={k}
                variant={draft.kind === k ? "primary" : "secondary"}
                onClick={() => setDraft((d) => ({ ...d, kind: k, mapping: k === "demo" ? DEMO_MAPPING : d.mapping }))}
              >
                {k === "demo" ? "Sample data" : "Google Sheet"}
              </Button>
            ))}
          </div>
        </SettingsRow>
        <SettingsRow label="Name">
          <TextInput className="w-72" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
        </SettingsRow>
        {draft.kind === "google_sheet_csv" && (
          <SettingsRow label="Sheet URL" description="Share the sheet as “Anyone with the link can view”, or File → Share → Publish to web → CSV. Use the tab’s URL so the right sheet (gid) is read.">
            <TextInput className="w-full sm:w-96" placeholder="https://docs.google.com/spreadsheets/d/…" value={draft.url ?? ""} onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value || null }))} />
          </SettingsRow>
        )}
        {source?.last_synced_at && <p className="pt-1 text-[12px] text-fg-3">Last synced {timeAgo(source.last_synced_at)}</p>}
      </SettingsSection>

      <SettingsSection title="Column mapping" description="Tell Spot OS which columns mean what. Header names are matched case-insensitively, so you can change the sheet without code changes.">
        {field("Date column", "date")}
        <SettingsRow label="Amount layout">
          <div className="flex gap-1">
            <Button variant={mode === "single" ? "primary" : "secondary"} onClick={() => setM({ amount: m.amount || "Amount", income: undefined, expense: undefined })}>
              One amount column
            </Button>
            <Button variant={mode === "split" ? "primary" : "secondary"} onClick={() => setM({ amount: undefined, type: undefined, income: m.income || "Income", expense: m.expense || "Expense" })}>
              Income + Expense columns
            </Button>
          </div>
        </SettingsRow>
        {mode === "single" ? (
          <>
            {field("Amount column", "amount")}
            {field("Type column", "type", "Optional — e.g. Type")}
            <SettingsRow label="Income values" description="Values in the type column that mean income.">
              <TextInput className="w-56" value={(m.income_values ?? []).join(", ")} onChange={(e) => setM({ income_values: list(e.target.value) })} placeholder="Income, In" />
            </SettingsRow>
            <SettingsRow label="Expense values">
              <TextInput className="w-56" value={(m.expense_values ?? []).join(", ")} onChange={(e) => setM({ expense_values: list(e.target.value) })} placeholder="Expense, Out" />
            </SettingsRow>
          </>
        ) : (
          <>
            {field("Income column", "income")}
            {field("Expense column", "expense")}
          </>
        )}
        {field("Category column", "category", "Optional")}
        {field("Description column", "description", "Optional")}
        {field("Status column", "status", "Optional — e.g. Status")}
        <SettingsRow label="Outstanding values" description="Status values that mean “invoiced, not yet paid”.">
          <TextInput className="w-56" value={(m.outstanding_values ?? []).join(", ")} onChange={(e) => setM({ outstanding_values: list(e.target.value) })} placeholder="Outstanding, Unpaid" />
        </SettingsRow>
        {field("Balance column", "balance", "Optional — running balance")}
        <SettingsRow label="Opening balance" description="Used to compute “available” when there is no balance column.">
          <TextInput
            className="w-40"
            type="number"
            value={m.opening_balance ?? ""}
            onChange={(e) => setM({ opening_balance: e.target.value === "" ? undefined : Number(e.target.value) })}
          />
        </SettingsRow>
        <SettingsRow label="Date format">
          <select
            value={m.date_format ?? "auto"}
            onChange={(e) => setM({ date_format: e.target.value as FinanceMapping["date_format"] })}
            className="h-8 rounded-md bg-input px-2 text-[14px] shadow-[inset_0_0_0_1px_var(--border-strong)]"
          >
            <option value="auto">Auto-detect</option>
            <option value="ymd">2026-10-31</option>
            <option value="dmy">31/10/2026</option>
            <option value="mdy">10/31/2026</option>
          </select>
        </SettingsRow>
        <SettingsRow label="Currency">
          <TextInput className="w-24 uppercase" maxLength={3} value={m.currency ?? "EUR"} onChange={(e) => setM({ currency: e.target.value.toUpperCase() })} />
        </SettingsRow>
      </SettingsSection>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button onClick={() => void runTest()} disabled={busy}>
          {busy ? "Testing…" : "Test connection"}
        </Button>
        <Button variant="primary" onClick={() => void save()}>
          Save finance source
        </Button>
      </div>
      {test && (
        <div className={`mt-3 rounded-md px-3.5 py-3 text-[13px] ${test.ok ? "bg-callout" : "bg-danger-soft text-danger"}`}>
          <div className="flex items-start gap-2 font-medium">
            {test.ok ? <CircleCheck className="mt-px size-4 text-[var(--success)]" /> : <TriangleAlert className="mt-px size-4" />}
            {test.text}
          </div>
          {test.headers && <div className="mt-2 text-fg-2">Columns found: {test.headers.join(" · ")}</div>}
          {test.preview?.map((p, i) => (
            <div key={i} className="mt-0.5 font-mono text-[12px] text-fg-2">
              {p}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function toDraft(s: FinanceSource | null): Draft {
  return s
    ? { name: s.name, kind: s.kind, url: s.url, mapping: s.mapping }
    : { name: "Studio finance", kind: "google_sheet_csv", url: null, mapping: { date: "Date", amount: "Amount", type: "Type", income_values: ["Income"], expense_values: ["Expense"], currency: "EUR", date_format: "auto" } };
}
