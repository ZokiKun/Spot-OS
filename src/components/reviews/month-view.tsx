"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { NotebookText, Pencil, RefreshCw, Sparkles } from "lucide-react";
import type { UUID } from "@/lib/types";
import { useProfiles, useWorkspace } from "@/lib/store";
import { useFinance } from "@/lib/finance/use-finance";
import { isReviewStarted } from "@/lib/reviews";
import { renderMarkdown } from "@/lib/markdown";
import { findMonthReview, monthDigest, monthName, monthStartOf, monthsLabel, shiftMonth, taskCredits } from "@/lib/studio-review";
import { cn, formatDay, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AutoTextarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { Money, RevealToggle, useMoneyVisible } from "@/components/insights/money";
import { Card, MonthPicker, PersonBars, PersonPicker, TagLegend, useEnsureMonthReview, useMembers, useMonthMoney } from "./review-ui";
import { CommitmentSummary, Commitments } from "./commitments";

/** Reviews → Month: what each person did, the money, Claude's report and the commitments. */
export function MonthView({ months, person, onChange }: { months: string[]; person: UUID | null; onChange: (patch: { months?: string[]; person?: UUID | null }) => void }) {
  const { data } = useWorkspace();
  const members = useMembers();
  const people = person ? members.filter((p) => p.id === person) : members;
  const sorted = useMemo(() => [...months].sort(), [months]);
  const single = sorted.length === 1;
  const credits = useMemo(() => taskCredits(data, sorted[0]!, shiftMonth(sorted.at(-1)!, 1)).filter((c) => sorted.includes(c.task.completed_at!.slice(0, 7) + "-01")), [data, sorted]);
  const label = single ? monthName(sorted[0]!, "year") : monthsLabel(sorted);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <MonthPicker value={sorted} onChange={(m) => onChange({ months: m })} />
        <PersonPicker value={person} onChange={(p) => onChange({ person: p })} />
        <div className="ml-auto">
          <RevealToggle />
        </div>
      </div>

      <MoneyStrip months={sorted} />

      <Card title={`Where ${single ? monthName(sorted[0]!) : "the time"} went`} subtitle={`Tasks completed${single ? "" : ` in ${label}`}, by person. Click someone for their projects.`} action={<TagLegend />}>
        <PersonBars key={`${person ?? "all"}`} credits={credits} people={people} openByDefault={!!person} />
        {single && (
          <div className="mt-5 border-t border-line pt-4">
            <Report month={sorted[0]!} person={person} />
          </div>
        )}
      </Card>

      {single ? (
        <Card title={`Commitments for ${monthName(sorted[0]!)}`} subtitle={<CommitmentSummary month={sorted[0]!} person={person} />}>
          <Commitments month={sorted[0]!} person={person} />
        </Card>
      ) : (
        <div className="space-y-2">
          {[...sorted].reverse().map((m) => (
            <details key={m} className="group rounded-xl shadow-[0_0_0_1px_var(--border)]">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-hover">
                <span className="text-[15px] font-semibold">{monthName(m, "year")}</span>
                <span className="text-[13px] text-fg-3">
                  <CommitmentSummary month={m} person={person} /> · {findMonthReview(data, m)?.report_md ? "report written" : "no report"}
                </span>
                <span className="ml-auto text-[12px] text-fg-3 group-open:hidden">Show</span>
              </summary>
              <div className="space-y-5 border-t border-line px-4 py-4">
                <Report month={m} person={person} />
                <div>
                  <h3 className="mb-2 text-[14px] font-semibold">Commitments</h3>
                  <Commitments month={m} person={person} />
                </div>
              </div>
            </details>
          ))}
        </div>
      )}

      {single && <OlderReviewLink month={sorted[0]!} />}
    </div>
  );
}

// ─── Money ───

/** Revenue collected and burn: typed in per month; pre-filled from the finance sheet when it has the month. */
function MoneyStrip({ months }: { months: string[] }) {
  const fin = useFinance();
  const value = useMonthMoney();
  const single = months.length === 1;
  const total = (field: "revenue" | "burn") => {
    const vals = months.map((m) => value(m, field).value).filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  };
  const revenue = total("revenue");
  const burn = total("burn");
  const net = revenue != null && burn != null ? revenue - burn : null;

  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-line shadow-[0_0_0_1px_var(--border)] sm:grid-cols-3">
      {single ? (
        <>
          <MoneyCell month={months[0]!} field="revenue" label="Revenue collected" {...value(months[0]!, "revenue")} currency={fin.currency} />
          <MoneyCell month={months[0]!} field="burn" label="Burn" {...value(months[0]!, "burn")} currency={fin.currency} />
        </>
      ) : (
        <>
          <Figure label="Revenue collected" value={<Money value={revenue} currency={fin.currency} />} />
          <Figure label="Burn" value={<Money value={burn} currency={fin.currency} />} />
        </>
      )}
      <Figure label="Net" value={<Money value={net} currency={fin.currency} />} tone={net == null ? undefined : net >= 0 ? "good" : "bad"} sub={net == null ? "Needs both numbers" : undefined} />
    </div>
  );
}

function Figure({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "good" | "bad" }) {
  return (
    <div className="bg-bg px-4 py-3.5">
      <div className="text-[12px] text-fg-2">{label}</div>
      <div className={cn("mt-1 text-[22px] font-semibold leading-tight tabular", tone === "good" && "text-[var(--success)]", tone === "bad" && "text-danger")}>{value}</div>
      {sub && <div className="mt-1 text-[12px] text-fg-3">{sub}</div>}
    </div>
  );
}

function MoneyCell({
  month,
  field,
  label,
  value,
  source,
  currency,
}: {
  month: string;
  field: "revenue" | "burn";
  label: string;
  value: number | null;
  source: "entered" | "sheet" | null;
  currency: string;
}) {
  const { update, canEdit, me } = useWorkspace();
  const { visible } = useMoneyVisible();
  const ensure = useEnsureMonthReview(month);
  const [draft, setDraft] = useState<string | null>(null);
  const save = async (v: number | null) => {
    const r = await ensure();
    void update("reviews", r.id, { [field]: v, updated_by: me?.id ?? null });
  };
  const commit = () => {
    if (draft == null) return;
    const n = draft.trim() ? Number(draft.replace(/[^\d.]/g, "")) : null;
    setDraft(null);
    void save(n != null && Number.isFinite(n) ? n : null);
  };

  return (
    <div className="bg-bg px-4 py-3.5">
      <div className="text-[12px] text-fg-2">{label}</div>
      {draft != null ? (
        <input
          autoFocus
          inputMode="decimal"
          aria-label={label}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setDraft(null);
          }}
          placeholder="0"
          className="mt-1 h-8 w-full rounded-md bg-input px-2 text-[20px] font-semibold tabular shadow-[inset_0_0_0_1px_var(--accent)] outline-none"
        />
      ) : (
        <button
          type="button"
          disabled={!canEdit || !visible}
          onClick={() => setDraft(value == null ? "" : String(value))}
          title={visible ? "Click to edit" : "Reveal values to edit"}
          className={cn("group mt-1 flex items-center gap-1.5 text-[22px] font-semibold leading-tight tabular", source === "sheet" && "text-fg-2")}
        >
          {value == null && visible ? <span className="text-[15px] font-normal text-fg-3">Add amount</span> : <Money value={value} currency={currency} />}
          {canEdit && visible && <Pencil className="size-3.5 text-fg-3 opacity-0 group-hover:opacity-100" />}
        </button>
      )}
      <div className="mt-1 text-[12px] text-fg-3">
        {source === "sheet" ? (
          <>
            From the finance sheet
            {canEdit && visible && value != null && (
              <>
                {" · "}
                <button type="button" onClick={() => void save(value)} className="font-medium text-accent hover:underline">
                  Confirm
                </button>
              </>
            )}
          </>
        ) : source === "entered" ? (
          "Entered for this month"
        ) : (
          "Not entered yet"
        )}
      </div>
    </div>
  );
}

// ─── Claude's report ───

/** Only one person's "### Name" section when filtered to them; the whole report otherwise. */
function sectionFor(md: string, firstName: string | null) {
  if (!firstName) return md;
  const lines = md.split("\n");
  const start = lines.findIndex((l) => /^###\s/.test(l) && l.toLowerCase().includes(firstName.toLowerCase()));
  if (start < 0) return md;
  const end = lines.findIndex((l, i) => i > start && /^#{2,3}\s/.test(l));
  return lines.slice(start, end < 0 ? undefined : end).join("\n");
}

/** Claude writes Markdown; links become plain text so nothing in the report can point elsewhere. */
const reportHtml = (md: string) => renderMarkdown(md.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1"));

/** Is Claude connected (ANTHROPIC_API_KEY set)? Asked once per page load. */
let claudeEnabled: Promise<boolean> | null = null;
function useClaudeEnabled() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    claudeEnabled ??= fetch("/api/reviews/report")
      .then((r) => r.json())
      .then((b: { enabled?: boolean }) => !!b.enabled)
      .catch(() => false);
    let live = true;
    void claudeEnabled.then((v) => live && setEnabled(v));
    return () => {
      live = false;
    };
  }, []);
  return enabled;
}

/**
 * The month's written report. With ANTHROPIC_API_KEY set, Generate asks Claude to write it; without
 * it, someone writes it by hand (or asks Claude in Claude Code at month end) using the month's data
 * shown next to the editor.
 */
function Report({ month, person }: { month: string; person: UUID | null }) {
  const { data, update, canEdit, me } = useWorkspace();
  const people = useProfiles();
  const fin = useFinance();
  const toast = useToast();
  const ask = useConfirm();
  const ensure = useEnsureMonthReview(month);
  const review = findMonthReview(data, month);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [today] = useState(() => monthStartOf(new Date()));
  const report = review?.report_md ?? "";
  const firstName = person ? (people.get(person)?.full_name.split(" ")[0] ?? null) : null;
  const shown = reportHtml(sectionFor(report, firstName));
  const ongoing = month >= today;
  const claude = useClaudeEnabled();

  const generate = async () => {
    if (report && !(await ask({ title: "Write a new report?", description: "Claude rewrites it from this month’s tasks. Edits you made to the current report are replaced.", confirmLabel: "Regenerate", danger: false })))
      return;
    setBusy(true);
    try {
      const res = await fetch("/api/reviews/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digest: monthDigest(data, month, fin.currency) }),
      });
      const body = (await res.json().catch(() => ({}))) as { report?: string; error?: string };
      if (!res.ok || !body.report) throw new Error(body.error ?? `Request failed (${res.status})`);
      const r = await ensure();
      await update("reviews", r.id, { report_md: body.report, report_generated_at: new Date().toISOString(), report_generated_by: me?.id ?? null, updated_by: me?.id ?? null });
      toast.show({ title: `${monthName(month)} report written`, tone: "success" });
    } catch (err) {
      toast.show({ title: "Couldn’t generate the report", description: err instanceof Error ? err.message : String(err), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (editing == null) return;
    const r = await ensure();
    const text = editing.trim() || null;
    const stamp = text && !r.report_md ? { report_generated_at: new Date().toISOString(), report_generated_by: me?.id ?? null } : {};
    void update("reviews", r.id, { report_md: text, ...stamp, updated_by: me?.id ?? null });
    setEditing(null);
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Sparkles className="size-4 text-[var(--dot-purple)]" />
        <h3 className="text-[14px] font-semibold">Monthly report{firstName && report ? ` · ${firstName}` : ""}</h3>
        {review?.report_generated_at && (
          <span className="text-[12px] text-fg-3">
            Written {formatDay(review.report_generated_at.slice(0, 10))}
            {review.report_generated_by ? ` · by ${people.get(review.report_generated_by)?.full_name.split(" ")[0] ?? "someone"}` : ""}
          </span>
        )}
        {canEdit && (
          <div className="ml-auto flex items-center gap-1">
            {editing == null && (
              <Button variant={report || claude ? "ghost" : "secondary"} onClick={() => setEditing(report)}>
                <Pencil className="size-3.5" /> {report ? "Edit" : "Write report"}
              </Button>
            )}
            {claude && (
              <Button variant={report ? "ghost" : "primary"} disabled={busy || editing != null} onClick={() => void generate()}>
                {report ? <RefreshCw className={cn("size-3.5", busy && "animate-spin")} /> : <Sparkles className="size-3.5" />}
                {busy ? "Claude is reading the month…" : report ? "Regenerate" : "Generate report"}
              </Button>
            )}
          </div>
        )}
      </div>

      {editing != null ? (
        <div>
          <AutoTextarea
            autoFocus
            aria-label="Report (Markdown)"
            value={editing}
            onChange={(e) => setEditing(e.target.value)}
            placeholder={"## In short\n…\n\n## People\n### Name\n- …\n\n## Commitments\n…\n\n## Worth discussing\n- …"}
            className="min-h-[160px] rounded-md bg-input p-3 font-mono text-[13px] leading-relaxed shadow-[inset_0_0_0_1px_var(--border-strong)]"
          />
          <details className="mt-2 rounded-md bg-subtle px-3 py-2" open={!report}>
            <summary className="cursor-pointer text-[12.5px] font-medium text-fg-2">{monthName(month)}’s data — completed tasks per person, commitments</summary>
            <pre aria-label={`${monthName(month)} data`} className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-fg-2">
              {monthDigest(data, month, fin.currency)}
            </pre>
          </details>
          <div className="mt-2 flex justify-end gap-1.5">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void saveEdit()}>
              Save
            </Button>
          </div>
        </div>
      ) : report ? (
        <div className={cn("review-report max-w-3xl", busy && "opacity-50")} dangerouslySetInnerHTML={{ __html: shown }} />
      ) : (
        <p className="rounded-lg bg-subtle px-3 py-3 text-[13.5px] text-fg-2">
          {busy
            ? "Claude is reading this month’s tasks and commitments…"
            : ongoing
              ? `${monthName(month)} isn’t over yet. At the end of the month, write what each person did and where the time went — or ask Claude to write it from the month’s tasks.`
              : `No report yet. Write what each person did and where the time went — or ask Claude to write it from ${monthName(month)}’s tasks.`}
        </p>
      )}
    </div>
  );
}

function OlderReviewLink({ month }: { month: string }) {
  const { data } = useWorkspace();
  const review = findMonthReview(data, month);
  if (!review || !isReviewStarted(review)) return null;
  return (
    <Link href={`/reviews/${review.id}`} className="inline-flex items-center gap-1.5 text-[13px] text-fg-2 hover:text-fg">
      <NotebookText className="size-3.5" /> Written review for {monthName(month)} · edited {timeAgo(review.updated_at)}
    </Link>
  );
}

