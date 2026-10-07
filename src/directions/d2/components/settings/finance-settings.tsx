"use client";

import { useState } from "react";
import { Check, ChevronDown, TriangleAlert } from "lucide-react";
import type { FinanceMapping, FinanceSource } from "@/directions/d2/lib/types";
import { useWorkspace } from "@/directions/d2/lib/store";
import { DEMO_MAPPING } from "@/directions/d2/lib/finance/sample";
import { normalizeSheet, summarize } from "@/directions/d2/lib/finance/normalize";
import { fetchSourceRows } from "@/directions/d2/lib/finance/use-finance";
import { cn, formatMoney, timeAgo } from "@/directions/d2/lib/utils";
import { TextInput } from "@/directions/d2/components/ui/input";
import { PillButton } from "@/directions/d2/components/ui/chunk";
import { Choice, SettingsRow, SettingsSection } from "./settings-ui";

const list = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

type Draft = Omit<FinanceSource, "id" | "created_at" | "updated_at" | "last_synced_at">;

interface TestResult {
  ok: boolean;
  text: string;
  headers?: string[];
  warnings?: string[];
  preview?: { date: string; label: string; amount: string }[];
}

const SELECT =
  "h-11 w-full rounded-2xl bg-input px-4 text-[14px] text-fg outline-none focus:shadow-[inset_0_0_0_1.5px_var(--text)] sm:w-56";

export function FinanceSettings() {
  const { data, create, update } = useWorkspace();
  const source = data.finance_sources[0] ?? null;
  const [draft, setDraft] = useState<Draft>(() => toDraft(source));
  const [test, setTest] = useState<TestResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [more, setMore] = useState(false);

  // Reset the form when the saved source changes (e.g. after Save, or another member edits it).
  const [seen, setSeen] = useState(source);
  if (source !== seen) {
    setSeen(source);
    setDraft(toDraft(source));
  }

  const edit = (fn: (d: Draft) => Draft) => {
    setSaved(false);
    setDraft(fn);
  };
  const m = draft.mapping;
  const setM = (patch: Partial<FinanceMapping>) => edit((d) => ({ ...d, mapping: { ...d.mapping, ...patch } }));
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
          ? `Read ${result.entries.length} entries. In the bank: ${formatMoney(s.available, m.currency)} · this month: ${formatMoney(s.currentMonth?.net ?? 0, m.currency)}`
          : "Connected, but no rows matched these columns.",
        headers: result.headers,
        warnings: result.warnings,
        preview: result.entries.slice(-3).map((e) => ({
          date: e.date,
          label: e.description ?? e.category ?? "",
          amount: formatMoney(e.amount, m.currency),
        })),
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
    setSaved(true);
  };

  const field = (label: string, key: keyof FinanceMapping, placeholder = "Column header", description?: string) => (
    <SettingsRow label={label} description={description}>
      <TextInput
        className="w-full sm:w-56"
        placeholder={placeholder}
        value={(m[key] as string | undefined) ?? ""}
        onChange={(e) => setM({ [key]: e.target.value || undefined })}
      />
    </SettingsRow>
  );

  return (
    <>
      <SettingsSection
        step={1}
        title={draft.kind === "demo" ? "Pick a source" : "Paste the sheet link"}
        description="The finance spreadsheet is the source of truth. Spot OS only reads it and never writes back."
      >
        <SettingsRow label="Source">
          <Choice
            label="Source"
            value={draft.kind}
            onChange={(k) => edit((d) => ({ ...d, kind: k, mapping: k === "demo" ? DEMO_MAPPING : d.mapping }))}
            options={[
              { value: "google_sheet_csv", label: "Google Sheet" },
              { value: "demo", label: "Sample data" },
            ]}
          />
        </SettingsRow>
        {draft.kind === "google_sheet_csv" && (
          <div>
            <TextInput
              aria-label="Sheet link"
              className="h-12"
              placeholder="https://docs.google.com/spreadsheets/d/…"
              value={draft.url ?? ""}
              onChange={(e) => edit((d) => ({ ...d, url: e.target.value || null }))}
            />
            <p className="mt-2 px-1 text-[13px] leading-snug text-fg-2">
              Share the sheet as “Anyone with the link can view” (or File → Share → Publish to web → CSV). Copy the link while the right tab is open.
            </p>
          </div>
        )}
        <SettingsRow label="Name" description="What Spot OS calls this source.">
          <TextInput className="w-full sm:w-64" value={draft.name} onChange={(e) => edit((d) => ({ ...d, name: e.target.value }))} />
        </SettingsRow>
        {source?.last_synced_at && <p className="text-[12.5px] text-fg-3">Last synced {timeAgo(source.last_synced_at)}</p>}
      </SettingsSection>

      <SettingsSection
        step={2}
        title="Match the columns"
        description="Type the header names from your sheet. Capitals don’t matter, so the sheet can change without breaking anything."
      >
        {field("Date", "date")}
        <SettingsRow label="Money columns">
          <Choice
            label="Money columns"
            value={mode}
            onChange={(v) =>
              v === "single"
                ? setM({ amount: m.amount || "Amount", income: undefined, expense: undefined })
                : setM({ amount: undefined, type: undefined, income: m.income || "Income", expense: m.expense || "Expense" })
            }
            options={[
              { value: "single", label: "One amount column" },
              { value: "split", label: "Income + Expense" },
            ]}
          />
        </SettingsRow>
        {mode === "single" ? (
          field("Amount", "amount")
        ) : (
          <>
            {field("Income", "income")}
            {field("Expense", "expense")}
          </>
        )}
        <SettingsRow label="Currency">
          <TextInput className="uppercase sm:w-24" maxLength={3} value={m.currency ?? "EUR"} onChange={(e) => setM({ currency: e.target.value.toUpperCase() })} />
        </SettingsRow>

        <div className="rounded-[22px] bg-hover">
          <button
            type="button"
            aria-expanded={more}
            onClick={() => setMore(!more)}
            className="flex w-full items-center gap-3 rounded-[22px] px-4 py-3.5 text-left"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium">More options</span>
              <span className="block truncate text-[12.5px] text-fg-2">
                {mode === "single" ? "Type, " : ""}category, status, balance, date format
              </span>
            </span>
            <ChevronDown className={cn("size-[18px] shrink-0 transition-transform duration-200", more && "rotate-180")} />
          </button>
          {more && (
            <div className="anim-fade flex flex-col gap-5 px-4 pb-5 pt-1">
              {mode === "single" && (
                <>
                  {field("Type column", "type", "Optional — e.g. Type", "Tells income and spending apart.")}
                  <SettingsRow label="Income values" description="Values in the type column that mean income.">
                    <TextInput
                      className="w-full sm:w-56"
                      value={(m.income_values ?? []).join(", ")}
                      onChange={(e) => setM({ income_values: list(e.target.value) })}
                      placeholder="Income, In"
                    />
                  </SettingsRow>
                  <SettingsRow label="Expense values">
                    <TextInput
                      className="w-full sm:w-56"
                      value={(m.expense_values ?? []).join(", ")}
                      onChange={(e) => setM({ expense_values: list(e.target.value) })}
                      placeholder="Expense, Out"
                    />
                  </SettingsRow>
                </>
              )}
              {field("Category column", "category", "Optional")}
              {field("Description column", "description", "Optional")}
              {field("Status column", "status", "Optional — e.g. Status")}
              <SettingsRow label="Waiting-to-be-paid values" description="Status values that mean “invoiced, not paid yet”.">
                <TextInput
                  className="w-full sm:w-56"
                  value={(m.outstanding_values ?? []).join(", ")}
                  onChange={(e) => setM({ outstanding_values: list(e.target.value) })}
                  placeholder="Outstanding, Unpaid"
                />
              </SettingsRow>
              {field("Balance column", "balance", "Optional — running balance")}
              <SettingsRow label="Opening balance" description="Used to work out what’s in the bank when there’s no balance column.">
                <TextInput
                  className="w-full sm:w-40"
                  type="number"
                  value={m.opening_balance ?? ""}
                  onChange={(e) => setM({ opening_balance: e.target.value === "" ? undefined : Number(e.target.value) })}
                />
              </SettingsRow>
              <SettingsRow label="Date format">
                <select
                  value={m.date_format ?? "auto"}
                  onChange={(e) => setM({ date_format: e.target.value as FinanceMapping["date_format"] })}
                  className={SELECT}
                >
                  <option value="auto">Work it out</option>
                  <option value="ymd">2026-10-31</option>
                  <option value="dmy">31/10/2026</option>
                  <option value="mdy">10/31/2026</option>
                </select>
              </SettingsRow>
            </div>
          )}
        </div>
      </SettingsSection>

      <SettingsSection step={3} title="Test & save" description="Check that Spot OS can read the sheet, then save it for everyone.">
        <div className="flex flex-wrap items-center gap-2">
          <PillButton tone="outline" onClick={() => void runTest()} disabled={busy}>
            {busy ? "Testing…" : "Test connection"}
          </PillButton>
          <PillButton onClick={() => void save()}>
            {saved ? (
              <>
                <Check /> Saved
              </>
            ) : (
              "Save finance source"
            )}
          </PillButton>
        </div>
        {test && (
          <div className="anim-fade flex flex-col gap-2">
            <div className={cn("flex items-start gap-3 rounded-[22px] px-4 py-3.5 text-[14px] text-on-chunk", test.ok ? "bg-lime" : "bg-coral")}>
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--chunk-soft)]">
                {test.ok ? <Check className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
              </span>
              <span className="min-w-0 font-medium leading-snug">{test.text}</span>
            </div>
            {test.warnings?.map((w, i) => (
              <div key={i} className="rounded-[18px] bg-hover px-4 py-2.5 text-[13px] text-fg-2">
                {w}
              </div>
            ))}
            {test.preview?.map((p, i) => (
              <div key={i} className="flex items-center gap-3 rounded-[18px] bg-hover px-4 py-2.5 text-[13.5px]">
                <span className="w-24 shrink-0 text-fg-2 tabular">{p.date}</span>
                <span className="min-w-0 flex-1 truncate">{p.label || "—"}</span>
                <span className="shrink-0 font-medium tabular">{p.amount}</span>
              </div>
            ))}
            {test.headers && test.headers.length > 0 && (
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[12.5px] text-fg-2">Columns found</span>
                {test.headers.map((h) => (
                  <span key={h} className="inline-flex h-7 items-center rounded-full bg-hover px-3 text-[12.5px]">
                    {h}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </SettingsSection>
    </>
  );
}

function toDraft(s: FinanceSource | null): Draft {
  return s
    ? { name: s.name, kind: s.kind, url: s.url, mapping: s.mapping }
    : { name: "Studio finance", kind: "google_sheet_csv", url: null, mapping: { date: "Date", amount: "Amount", type: "Type", income_values: ["Income"], expense_values: ["Expense"], currency: "EUR", date_format: "auto" } };
}
