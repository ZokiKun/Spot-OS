import { format, startOfMonth, subMonths } from "date-fns";
import type { FinanceMapping } from "../types";

/** Mapping for the bundled demo sheet — the same shape a real Google Sheet mapping uses. */
export const DEMO_MAPPING: FinanceMapping = {
  date: "Date",
  amount: "Amount",
  type: "Type",
  income_values: ["Income"],
  expense_values: ["Expense"],
  category: "Category",
  description: "Description",
  status: "Status",
  outstanding_values: ["Outstanding", "Unpaid"],
  opening_balance: 18000,
  date_format: "ymd",
  currency: "EUR",
};

/** Deterministic 12-month ledger so demo numbers are stable between reloads. */
export function demoFinanceCsv(today = new Date()): string {
  const rows: string[][] = [["Date", "Description", "Category", "Type", "Amount", "Status"]];
  const clients = ["Northwind", "Atelier Mora", "Kestrel Labs", "Field Notes Co."];
  for (let m = 11; m >= 0; m--) {
    const start = startOfMonth(subMonths(today, m));
    const d = (day: number) => {
      const date = new Date(start);
      date.setDate(Math.min(day, 28));
      return format(date, "yyyy-MM-dd");
    };
    const seed = (m * 7919) % 13;
    const isCurrent = m === 0;
    const maxDay = isCurrent ? today.getDate() : 28;
    const push = (day: number, ...r: string[]) => {
      if (day <= maxDay) rows.push([d(day), ...r]);
    };
    push(3, `${clients[m % 4]} — retainer`, "Retainer", "Income", String(6500 + seed * 180), "Paid");
    push(12, `${clients[(m + 1) % 4]} — project milestone`, "Project", "Income", String(8400 + seed * 520), "Paid");
    if (m === 1) push(26, `${clients[(m + 3) % 4]} — phase 2 invoice`, "Project", "Income", "5400", "Outstanding");
    if (m % 3 === 0) push(20, `${clients[(m + 2) % 4]} — workshop`, "Project", "Income", "3200", "Paid");
    push(1, "Studio rent", "Rent", "Expense", "2400", "Paid");
    push(5, "Software & subscriptions", "Software", "Expense", String(380 + seed * 10), "Paid");
    push(15, "Freelance support", "Contractors", "Expense", String(1500 + seed * 210), "Paid");
    push(25, "Salaries", "Payroll", "Expense", "6900", "Paid");
    if (m % 4 === 1) push(18, "Equipment", "Equipment", "Expense", "1350", "Paid");
  }
  return rows.map((r) => r.map((c) => (c.includes(",") ? `"${c}"` : c)).join(",")).join("\n");
}
