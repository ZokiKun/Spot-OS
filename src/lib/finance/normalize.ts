import { format, parse, isValid, startOfQuarter } from "date-fns";
import type { FinanceEntry, FinanceMapping } from "../types";

/** RFC-4180-ish CSV parser (quotes, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export function parseAmount(raw: string | undefined): number | null {
  if (raw == null) return null;
  let s = raw.trim();
  if (!s) return null;
  const negative = /^\(.*\)$/.test(s) || s.startsWith("-");
  s = s.replace(/[()\s€$£¥]|[A-Z]{3}/g, "").replace(/^-/, "");
  // "1.234,56" (EU) vs "1,234.56" (US)
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  if (Number.isNaN(n)) return null;
  return negative ? -n : n;
}

function parseDateCell(raw: string, fmt: FinanceMapping["date_format"] = "auto"): string | null {
  const s = raw.trim();
  if (!s) return null;
  // Excel date serial (days since 1899-12-30) from a cell with a custom format, e.g. "45930".
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const n = Math.floor(Number(s));
    if (n > 20000 && n < 80000) return new Date(Date.UTC(1899, 11, 30) + n * 86_400_000).toISOString().slice(0, 10);
  }
  const tryFormats: string[] =
    fmt === "dmy"
      ? ["dd/MM/yyyy", "d/M/yyyy", "dd.MM.yyyy", "dd-MM-yyyy"]
      : fmt === "mdy"
        ? ["MM/dd/yyyy", "M/d/yyyy"]
        : fmt === "ymd"
          ? ["yyyy-MM-dd", "yyyy/MM/dd"]
          : ["yyyy-MM-dd", "yyyy/MM/dd", "dd/MM/yyyy", "d/M/yyyy", "dd.MM.yyyy", "MMM d, yyyy", "d MMM yyyy"];
  for (const f of tryFormats) {
    const d = parse(s, f, new Date());
    if (isValid(d)) return format(d, "yyyy-MM-dd");
  }
  const d = new Date(s);
  return isValid(d) && d.getFullYear() > 1900 && d.getFullYear() < 2200 ? format(d, "yyyy-MM-dd") : null;
}

export interface NormalizeResult {
  entries: FinanceEntry[];
  balance: number | null;
  headers: string[];
  warnings: string[];
}

/** Turn any sheet into entries using the configurable mapping (no hard-coded columns). */
export function normalizeSheet(rows: string[][], mapping: FinanceMapping): NormalizeResult {
  const warnings: string[] = [];
  // Spreadsheets often have a title or notes above the table: the header is the first row with the date column.
  const want = mapping.date.trim().toLowerCase();
  const headerAt = Math.max(0, rows.slice(0, 20).findIndex((r) => r.some((c) => c.trim().toLowerCase() === want)));
  const [header, ...body] = rows.slice(headerAt);
  if (!header) return { entries: [], balance: null, headers: [], warnings: ["Sheet is empty"] };
  const headers = header.map((h) => h.trim());
  const col = (name?: string) => {
    if (!name) return -1;
    const idx = headers.findIndex((h) => h.toLowerCase() === name.trim().toLowerCase());
    if (idx === -1) warnings.push(`Column "${name}" not found`);
    return idx;
  };
  const iDate = col(mapping.date);
  const iAmount = col(mapping.amount);
  const iType = col(mapping.type);
  const iIncome = col(mapping.income);
  const iExpense = col(mapping.expense);
  const iCategory = col(mapping.category);
  const iDesc = col(mapping.description);
  const iStatus = col(mapping.status);
  const iBalance = col(mapping.balance);
  const lower = (xs?: string[]) => (xs ?? []).map((x) => x.trim().toLowerCase());
  const incomeVals = lower(mapping.income_values);
  const expenseVals = lower(mapping.expense_values);
  const outstandingVals = lower(mapping.outstanding_values);

  const entries: FinanceEntry[] = [];
  let balance: number | null = null;
  let skipped = 0;

  for (const r of body) {
    const date = iDate >= 0 ? parseDateCell(r[iDate] ?? "", mapping.date_format) : null;
    if (iBalance >= 0) {
      const b = parseAmount(r[iBalance]);
      if (b != null) balance = b;
    }
    if (!date) {
      skipped++;
      continue;
    }
    let amount: number | null = null;
    if (iAmount >= 0) {
      amount = parseAmount(r[iAmount]);
      if (amount != null && iType >= 0) {
        const t = (r[iType] ?? "").trim().toLowerCase();
        if (expenseVals.includes(t)) amount = -Math.abs(amount);
        else if (incomeVals.includes(t)) amount = Math.abs(amount);
      }
    } else {
      const inc = iIncome >= 0 ? parseAmount(r[iIncome]) : null;
      const exp = iExpense >= 0 ? parseAmount(r[iExpense]) : null;
      if (inc || exp) amount = (inc ?? 0) - Math.abs(exp ?? 0);
    }
    if (amount == null || amount === 0) {
      skipped++;
      continue;
    }
    entries.push({
      date,
      amount,
      category: iCategory >= 0 ? r[iCategory]?.trim() || null : null,
      description: iDesc >= 0 ? r[iDesc]?.trim() || null : null,
      outstanding: iStatus >= 0 ? outstandingVals.includes((r[iStatus] ?? "").trim().toLowerCase()) : false,
    });
  }
  if (skipped) warnings.push(`${skipped} row(s) skipped (no date or amount)`);
  entries.sort((a, b) => a.date.localeCompare(b.date));
  return { entries, balance, headers, warnings: [...new Set(warnings)] };
}

export interface PeriodTotals {
  key: string; // yyyy-MM or yyyy-Qn
  label: string;
  income: number;
  expenses: number;
  net: number;
}

export function totalsBy(entries: FinanceEntry[], period: "month" | "quarter"): PeriodTotals[] {
  const map = new Map<string, PeriodTotals>();
  for (const e of entries) {
    if (e.outstanding && e.amount > 0) continue; // not received yet
    const d = new Date(`${e.date}T00:00:00`);
    const key =
      period === "month" ? format(d, "yyyy-MM") : `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
    const label = period === "month" ? format(d, "MMM yyyy") : `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
    const t = map.get(key) ?? { key, label, income: 0, expenses: 0, net: 0 };
    if (e.amount > 0) t.income += e.amount;
    else t.expenses += -e.amount;
    t.net = t.income - t.expenses;
    map.set(key, t);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export interface FinanceSummary {
  available: number | null;
  outstanding: number;
  months: PeriodTotals[];
  quarters: PeriodTotals[];
  currentMonth: PeriodTotals | null;
  previousMonth: PeriodTotals | null;
  currentQuarter: PeriodTotals | null;
}

export function summarize(entries: FinanceEntry[], balance: number | null, mapping: FinanceMapping, today = new Date()): FinanceSummary {
  const months = totalsBy(entries, "month");
  const quarters = totalsBy(entries, "quarter");
  const curKey = format(today, "yyyy-MM");
  const prevDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevKey = format(prevDate, "yyyy-MM");
  const q = startOfQuarter(today);
  const qKey = `${q.getFullYear()}-Q${Math.floor(q.getMonth() / 3) + 1}`;
  const received = entries.filter((e) => !(e.outstanding && e.amount > 0));
  const computed =
    mapping.opening_balance != null
      ? mapping.opening_balance + received.reduce((s, e) => s + e.amount, 0)
      : null;
  return {
    available: balance ?? computed,
    outstanding: entries.filter((e) => e.outstanding && e.amount > 0).reduce((s, e) => s + e.amount, 0),
    months,
    quarters,
    currentMonth: months.find((m) => m.key === curKey) ?? null,
    previousMonth: months.find((m) => m.key === prevKey) ?? null,
    currentQuarter: quarters.find((m) => m.key === qKey) ?? null,
  };
}
