"use client";

import { useMemo, useRef, useState, type DragEvent } from "react";
import { CircleCheck, FileSpreadsheet, TriangleAlert, Upload } from "lucide-react";
import type { FinanceMapping, FinanceSource } from "@/lib/types";
import { useWorkspace } from "@/lib/store";
import { DEMO_MAPPING } from "@/lib/finance/sample";
import { detectSplitTabs, normalizeWorkbook, summarize } from "@/lib/finance/normalize";
import { FINANCE_FILE_ACCEPT, readFinanceFile, type FinanceFileSheet } from "@/lib/finance/read-file";
import { cn, formatMoney, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { SettingsRow, SettingsSection } from "./settings-ui";

const list = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

type Draft = Omit<FinanceSource, "id" | "created_at" | "updated_at" | "last_synced_at" | "file_name">;
type Picked = { fileName: string; sheets: FinanceFileSheet[]; sheet: number };

export function FinanceSettings() {
  const { data, create, update } = useWorkspace();
  const toast = useToast();
  const source = data.finance_sources[0] ?? null;
  const [draft, setDraft] = useState<Draft>(() => toDraft(source));
  const [picked, setPicked] = useState<Picked | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset the form when the saved source changes (e.g. after Save, or another member edits it).
  const [seen, setSeen] = useState(source);
  if (source !== seen) {
    setSeen(source);
    setDraft(toDraft(source));
  }

  const m = draft.mapping;
  const setM = (patch: Partial<FinanceMapping>) => setDraft((d) => ({ ...d, mapping: { ...d.mapping, ...patch } }));
  const mode: "tabs" | "single" | "split" = m.income_sheet || m.expense_sheet ? "tabs" : m.amount ? "single" : "split";

  // Preview updates live as the file, tab or mapping changes.
  const preview = useMemo(() => {
    if (!picked) return null;
    const result = normalizeWorkbook(picked.sheets, m, picked.sheet);
    return { result, summary: summarize(result.entries, result.balance, m) };
  }, [picked, m]);

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    setReadError(null);
    try {
      const sheets = await readFinanceFile(file);
      if (!sheets.some((s) => s.rows.length)) throw new Error("That file looks empty.");
      // Start on the first tab that has the date column, else the first tab with data.
      const want = m.date.trim().toLowerCase();
      const withDate = sheets.findIndex((s) => s.rows.slice(0, 20).some((r) => r.some((c) => c.trim().toLowerCase() === want)));
      setPicked({ fileName: file.name, sheets, sheet: withDate >= 0 ? withDate : sheets.findIndex((s) => s.rows.length) });
      // Income and expenses on their own tabs (like the studio's sheet): read both, no setup needed.
      const split = detectSplitTabs(sheets, m.date);
      if (split && mode !== "tabs")
        setM({
          ...split,
          amount: m.amount || "Amount",
          type: undefined,
          income: undefined,
          expense: undefined,
          category: m.category || "Category",
          description: m.description || "Description",
          // The tabs have no status or running-balance column: "available" = opening balance + entries.
          status: undefined,
          balance: undefined,
          opening_balance: m.opening_balance ?? 0,
          // EUR was only the template default; the studio's books are in rupees.
          currency: m.currency && m.currency !== "EUR" ? m.currency : "INR",
        });
    } catch (err) {
      setPicked(null);
      setReadError(err instanceof Error ? err.message : String(err));
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void pickFile(e.dataTransfer.files[0]);
  };

  const canPublish = draft.kind === "upload" && !!preview && preview.result.entries.length > 0;

  const save = async () => {
    setSaving(true);
    try {
      const at = new Date().toISOString();
      const fields = { ...draft, ...(canPublish ? { file_name: picked!.fileName, last_synced_at: at } : {}) };
      const saved = source ? (await update("finance_sources", source.id, fields), source) : await create("finance_sources", { file_name: null, last_synced_at: null, ...fields });
      if (canPublish) {
        const { entries, balance } = preview!.result;
        await create("finance_snapshots", { source_id: saved.id, entries, balance, fetched_at: at });
        setPicked(null);
        toast.show({ title: "Finance updated", description: `${entries.length} entries from ${fields.file_name}. Home, Insights and Reviews now use these numbers.` });
      } else toast.show({ title: "Finance settings saved" });
    } catch (err) {
      toast.show({ title: "Couldn’t save finance", description: err instanceof Error ? err.message : String(err), tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof FinanceMapping, placeholder = "Column header") => (
    <SettingsRow label={label}>
      <TextInput className="w-56" placeholder={placeholder} value={(m[key] as string | undefined) ?? ""} onChange={(e) => setM({ [key]: e.target.value || undefined })} />
    </SettingsRow>
  );

  return (
    <>
      <SettingsSection title="Source" description="Your finance spreadsheet stays the source of truth. Once a month, upload a copy here and Spot OS updates its numbers.">
        <SettingsRow label="Source type">
          <div className="flex gap-1">
            {(["upload", "demo"] as const).map((k) => (
              <Button
                key={k}
                variant={draft.kind === k ? "primary" : "secondary"}
                onClick={() =>
                  setDraft((d) =>
                    k === "demo"
                      ? { ...d, kind: k, mapping: DEMO_MAPPING }
                      : d.kind === "demo"
                        ? { kind: k, name: "Studio finance", mapping: DEFAULT_MAPPING }
                        : d,
                  )
                }
              >
                {k === "demo" ? "Sample data" : "Excel upload"}
              </Button>
            ))}
          </div>
        </SettingsRow>
        <SettingsRow label="Name">
          <TextInput className="w-72" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
        </SettingsRow>
      </SettingsSection>

      {draft.kind === "upload" && (
        <SettingsSection title="Upload this month’s file" description="In Google Sheets: File → Download → Microsoft Excel (.xlsx) — or CSV. The file is read on this device and never stored; Spot OS saves only the entries it needs.">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              "mt-2 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-7 text-center transition-colors",
              dragging ? "border-accent bg-accent/5" : "border-[var(--border-strong)] hover:bg-hover",
            )}
          >
            <input ref={inputRef} type="file" accept={FINANCE_FILE_ACCEPT} className="sr-only" onChange={(e) => void pickFile(e.target.files?.[0])} />
            {picked ? <FileSpreadsheet className="size-5 text-fg-2" /> : <Upload className="size-5 text-fg-2" />}
            <span className="text-[14px] font-medium">{reading ? "Reading…" : picked ? picked.fileName : "Drop the finance file here, or click to choose"}</span>
            <span className="text-[12px] text-fg-2">{picked ? "Choose a different file" : "Excel (.xlsx) or CSV · up to 10 MB"}</span>
          </label>

          {picked && picked.sheets.length > 1 && mode !== "tabs" && (
            <SettingsRow label="Tab" description="Which tab of the workbook holds the transactions.">
              <select
                value={picked.sheet}
                onChange={(e) => setPicked({ ...picked, sheet: Number(e.target.value) })}
                className="h-8 max-w-60 rounded-md bg-input px-2 text-[14px] shadow-[inset_0_0_0_1px_var(--border-strong)]"
              >
                {picked.sheets.map((s, i) => (
                  <option key={i} value={i}>
                    {s.name}
                  </option>
                ))}
              </select>
            </SettingsRow>
          )}

          {readError && (
            <div className="mt-3 flex items-start gap-2 rounded-md bg-danger-soft px-3.5 py-3 text-[13px] font-medium text-danger">
              <TriangleAlert className="mt-px size-4 shrink-0" /> {readError}
            </div>
          )}

          {!picked && !readError && (
            <p className="pt-3 text-[12px] text-fg-3">
              {source?.kind === "upload" && source.last_synced_at
                ? <>Last updated {timeAgo(source.last_synced_at)}{source.file_name && <> from {source.file_name}</>}. Changed the column mapping? Upload the file again to apply it.</>
                : "Nothing uploaded yet."}
            </p>
          )}

          {preview && (
            <PreviewBox
              ok={preview.result.entries.length > 0}
              text={
                preview.result.entries.length
                  ? `Found ${preview.result.entries.length} entries in ${preview.result.tabs.map((t) => `“${t}”`).join(" + ")}. Available: ${formatMoney(preview.summary.available, m.currency)} · This month net: ${formatMoney(preview.summary.currentMonth?.net ?? 0, m.currency)}`
                  : `No entries matched the column mapping in ${preview.result.tabs.map((t) => `“${t}”`).join(" + ") || "this file"}. Check the mapping below.`
              }
              headers={preview.result.headers}
              lines={[...preview.result.warnings, ...preview.result.entries.slice(-3).map((e) => `${e.date} · ${e.description ?? e.category ?? ""} · ${formatMoney(e.amount, m.currency)}`)]}
            />
          )}
        </SettingsSection>
      )}

      <SettingsSection title="Column mapping" description="Tell Spot OS which columns mean what. Header names are matched case-insensitively, so you can change the sheet without code changes.">
        {field("Date column", "date")}
        <SettingsRow label="Amount layout">
          <div className="flex gap-1">
            <Button
              variant={mode === "tabs" ? "primary" : "secondary"}
              onClick={() => setM({ income_sheet: m.income_sheet || "Income", expense_sheet: m.expense_sheet || "Expenses", amount: m.amount || "Amount", type: undefined, income: undefined, expense: undefined })}
            >
              Separate tabs
            </Button>
            <Button variant={mode === "single" ? "primary" : "secondary"} onClick={() => setM({ amount: m.amount || "Amount", income: undefined, expense: undefined, income_sheet: undefined, expense_sheet: undefined })}>
              One amount column
            </Button>
            <Button
              variant={mode === "split" ? "primary" : "secondary"}
              onClick={() => setM({ amount: undefined, type: undefined, income: m.income || "Income", expense: m.expense || "Expense", income_sheet: undefined, expense_sheet: undefined })}
            >
              Income + Expense columns
            </Button>
          </div>
        </SettingsRow>
        {mode === "tabs" ? (
          <>
            {field("Income tab", "income_sheet", "Tab name, e.g. Income")}
            {field("Expenses tab", "expense_sheet", "Tab name, e.g. Expenses")}
            {field("Amount column", "amount")}
          </>
        ) : mode === "single" ? (
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
        <Button variant="primary" onClick={() => void save()} disabled={saving || reading}>
          {saving ? "Saving…" : canPublish ? "Save and update finance" : "Save settings"}
        </Button>
        {canPublish && <span className="text-[12px] text-fg-2">Replaces the numbers everyone sees with this file’s.</span>}
      </div>
    </>
  );
}

function PreviewBox({ ok, text, headers, lines }: { ok: boolean; text: string; headers: string[]; lines: string[] }) {
  return (
    <div className={cn("mt-3 rounded-md px-3.5 py-3 text-[13px]", ok ? "bg-callout" : "bg-danger-soft text-danger")}>
      <div className="flex items-start gap-2 font-medium">
        {ok ? <CircleCheck className="mt-px size-4 shrink-0 text-[var(--success)]" /> : <TriangleAlert className="mt-px size-4 shrink-0" />}
        {text}
      </div>
      {headers.length > 0 && <div className="mt-2 text-fg-2">Columns found: {headers.filter(Boolean).join(" · ")}</div>}
      {lines.map((p, i) => (
        <div key={i} className="mt-0.5 font-mono text-[12px] text-fg-2">
          {p}
        </div>
      ))}
    </div>
  );
}

/** Matches the studio's finance workbook: Income and Expenses tabs with Date · Category · Description · Amount. */
const DEFAULT_MAPPING: FinanceMapping = {
  date: "Date",
  amount: "Amount",
  income_sheet: "Income",
  expense_sheet: "Expenses",
  category: "Category",
  description: "Description",
  opening_balance: 0,
  currency: "INR",
  date_format: "auto",
};

function toDraft(s: FinanceSource | null): Draft {
  return s ? { name: s.name, kind: s.kind === "demo" ? "demo" : "upload", mapping: s.mapping } : { name: "Studio finance", kind: "upload", mapping: DEFAULT_MAPPING };
}
