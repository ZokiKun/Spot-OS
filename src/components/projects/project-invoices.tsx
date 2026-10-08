"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Link2, Plus, ReceiptText, Trash2 } from "lucide-react";
import type { Invoice, InvoiceStatus, Project } from "@/lib/types";
import type { Option } from "@/lib/constants";
import { useWorkspace } from "@/lib/store";
import { cn, formatMoney, todayISO } from "@/lib/utils";
import { EditableText } from "@/components/ui/input";
import { DateField, OptionField } from "@/components/ui/fields";
import { Button, IconButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { useConfirm } from "@/components/ui/confirm";

export const INVOICE_STATUSES: Option<InvoiceStatus>[] = [
  { value: "not_sent", label: "Not sent", color: "gray" },
  { value: "sent", label: "Sent", color: "yellow" },
  { value: "cleared", label: "Cleared", color: "green" },
];

const COLS = "minmax(110px,0.7fr) minmax(180px,1.6fr) 130px 104px 104px 120px 44px 36px";

/** Next number after the highest one used so far, keeping its prefix and padding (INV-007 → INV-008). */
function nextNumber(invoices: Invoice[]) {
  let best: { prefix: string; n: number; width: number } | null = null;
  for (const inv of invoices) {
    const m = /^(.*?)(\d+)\s*$/.exec(inv.number);
    if (!m) continue;
    const n = Number(m[2]);
    if (!best || n > best.n) best = { prefix: m[1]!, n, width: m[2]!.length };
  }
  return best ? `${best.prefix}${String(best.n + 1).padStart(best.width, "0")}` : "INV-001";
}

/** A project's invoices: number, what it's for, amount, dates and whether it's sent or cleared. */
export function ProjectInvoices({ project }: { project: Project }) {
  const { data, create, update, remove, me } = useWorkspace();
  const ask = useConfirm();
  const currency = data.finance_sources[0]?.mapping.currency ?? "INR";
  const invoices = useMemo(
    () =>
      data.invoices
        .filter((i) => i.project_id === project.id)
        .sort((a, b) => (b.issue_date ?? "").localeCompare(a.issue_date ?? "") || b.created_at.localeCompare(a.created_at)),
    [data.invoices, project.id],
  );
  const today = todayISO();

  const totals = useMemo(() => {
    const sum = (s?: InvoiceStatus) => invoices.filter((i) => !s || i.status === s).reduce((t, i) => t + (i.amount ?? 0), 0);
    return { all: sum(), cleared: sum("cleared"), sent: sum("sent"), notSent: sum("not_sent") };
  }, [invoices]);

  const add = () =>
    void create("invoices", {
      project_id: project.id,
      number: nextNumber(data.invoices),
      title: "",
      amount: null,
      currency,
      issue_date: today,
      due_date: null,
      status: "not_sent",
      url: null,
      created_by: me?.id ?? null,
    });

  const set = (inv: Invoice, patch: Partial<Invoice>) => void update("invoices", inv.id, patch);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-line shadow-[0_0_0_1px_var(--border)] sm:grid-cols-4">
        {[
          { label: "Invoiced", value: totals.all },
          { label: "Cleared", value: totals.cleared, tone: "text-[var(--dot-green)]" },
          { label: "Sent, awaiting payment", value: totals.sent, tone: totals.sent ? "text-[var(--dot-yellow)]" : "" },
          { label: "Not sent yet", value: totals.notSent },
        ].map((s) => (
          <div key={s.label} className="bg-bg px-4 py-3">
            <div className="text-[12px] text-fg-2">{s.label}</div>
            <div className={cn("mt-0.5 text-[20px] font-semibold tabular", s.tone)}>{formatMoney(s.value, currency)}</div>
          </div>
        ))}
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          icon={<ReceiptText className="size-5" />}
          title="No invoices yet"
          description="Keep every invoice for this project here — and whether it’s sent, not sent or cleared."
          action={
            <Button variant="primary" onClick={add}>
              <Plus className="size-3.5" /> New invoice
            </Button>
          }
        />
      ) : (
        <div className="-mx-2 overflow-x-auto px-2">
          <div className="min-w-[820px] text-[14px]">
            <div className="grid border-y border-line text-[13px] text-fg-2" style={{ gridTemplateColumns: COLS }}>
              {["Invoice", "For", "Amount", "Issued", "Due", "Status", "Link", ""].map((h, i) => (
                <div key={i} className={cn("flex h-8 items-center px-2", i > 0 && h && "border-l border-line")}>
                  {h}
                </div>
              ))}
            </div>
            {invoices.map((inv) => (
              <div key={inv.id} className="group grid border-b border-line hover:bg-subtle" style={{ gridTemplateColumns: COLS }}>
                <div className="flex min-w-0 items-center px-2">
                  <EditableText value={inv.number} placeholder="Number" onCommit={(number) => set(inv, { number })} className="font-medium tabular" />
                </div>
                <div className="flex min-w-0 items-center border-l border-line px-2">
                  <EditableText value={inv.title} placeholder="What it’s for" onCommit={(title) => set(inv, { title })} />
                </div>
                <div className="flex min-w-0 items-center border-l border-line px-2">
                  <AmountInput value={inv.amount} currency={inv.currency ?? currency} onCommit={(amount) => set(inv, { amount })} />
                </div>
                <div className="flex min-w-0 items-stretch border-l border-line">
                  <DateField value={inv.issue_date} onChange={(issue_date) => set(inv, { issue_date })} />
                </div>
                <div className="flex min-w-0 items-stretch border-l border-line">
                  {/* Only an unpaid, sent invoice can be overdue. */}
                  <DateField value={inv.due_date} highlightOverdue={inv.status === "sent"} onChange={(due_date) => set(inv, { due_date })} />
                </div>
                <div className="flex min-w-0 items-stretch border-l border-line">
                  <OptionField options={INVOICE_STATUSES} value={inv.status} onChange={(status) => set(inv, { status })} />
                </div>
                <div className="relative flex items-center justify-center border-l border-line">
                  <LinkCell url={inv.url} onChange={(url) => set(inv, { url })} />
                </div>
                <div className="flex items-center justify-center">
                  <IconButton
                    label={`Delete ${inv.number || "invoice"}`}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 max-sm:opacity-100"
                    onClick={() =>
                      void ask({ title: `Delete invoice ${inv.number || ""}?`.replace(" ?", "?"), description: "It’s removed from this project’s list." }).then(
                        (ok) => ok && void remove("invoices", inv.id),
                      )
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </IconButton>
                </div>
              </div>
            ))}
            <div className="flex h-10 items-center px-1">
              <button
                type="button"
                onClick={add}
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[14px] font-medium text-accent transition-colors hover:bg-accent-soft"
              >
                <Plus className="size-4" strokeWidth={2.25} /> New invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AmountInput({ value, currency, onCommit }: { value: number | null; currency: string; onCommit: (v: number | null) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  if (draft === null)
    return (
      <button type="button" onClick={() => setDraft(value == null ? "" : String(value))} className="w-full py-1.5 text-left tabular">
        {value == null ? <span className="text-fg-3">Amount</span> : formatMoney(value, currency)}
      </button>
    );
  const commit = () => {
    const n = draft.trim() === "" ? null : Number(draft.replace(/[^\d.-]/g, ""));
    if (n === null || !Number.isNaN(n)) onCommit(n);
    setDraft(null);
  };
  return (
    <input
      autoFocus
      inputMode="decimal"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setDraft(null);
      }}
      placeholder="0"
      className="h-7 w-full rounded bg-input px-1.5 tabular outline-none"
    />
  );
}

function LinkCell({ url, onChange }: { url: string | null; onChange: (v: string | null) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  if (draft !== null) {
    const commit = () => {
      const v = draft.trim();
      onChange(v ? (/^https?:\/\//i.test(v) ? v : `https://${v}`) : null);
      setDraft(null);
    };
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setDraft(null);
        }}
        placeholder="Paste link"
        className="absolute z-10 h-8 w-64 -translate-x-56 rounded-md bg-elevated px-2 text-[13px] shadow-menu outline-none"
      />
    );
  }
  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={`${url} — right-click to change`}
      onContextMenu={(e) => {
        e.preventDefault();
        setDraft(url);
      }}
      className="flex size-6 items-center justify-center rounded-md text-accent hover:bg-hover"
    >
      <ExternalLink className="size-3.5" />
    </a>
  ) : (
    <IconButton label="Add a link to the invoice (PDF, Drive…)" onClick={() => setDraft("")}>
      <Link2 className="size-3.5" />
    </IconButton>
  );
}
