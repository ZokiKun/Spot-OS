import { parseCsv } from "./normalize";

export interface FinanceFileSheet {
  name: string;
  rows: string[][];
}

export const FINANCE_FILE_ACCEPT = ".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv";
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Reads an Excel (.xlsx) or CSV file entirely in the browser and returns every tab as text rows.
 * The file itself is never uploaded — only the normalized entries are saved.
 */
export async function readFinanceFile(file: File): Promise<FinanceFileSheet[]> {
  if (file.size > MAX_BYTES) throw new Error("That file is over 10 MB. Export just the finance tab and try again.");
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return [{ name: file.name.replace(/\.csv$/i, ""), rows: parseCsv(await file.text()) }];
  if (name.endsWith(".xls")) throw new Error("Old .xls files aren’t supported. In Excel, use File → Save As → Excel Workbook (.xlsx).");
  if (!name.endsWith(".xlsx")) throw new Error("Choose an Excel (.xlsx) or CSV file.");

  const { default: readXlsxFile } = await import("read-excel-file/browser");
  let sheets;
  try {
    sheets = await readXlsxFile(file);
  } catch {
    throw new Error("Couldn’t read that file. Make sure it’s an Excel workbook (.xlsx) and not password-protected.");
  }
  return sheets.map((s) => ({
    name: s.sheet,
    rows: s.data.map((row) => row.map(cellToText)).filter((r) => r.some((c) => c.trim() !== "")),
  }));
}

function cellToText(v: unknown): string {
  if (v == null) return "";
  // Excel dates have no time zone; the reader returns them as UTC midnight.
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? "" : v.toISOString().slice(0, 10);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return String(v);
}
