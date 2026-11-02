"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import type { Goal } from "@/lib/types";
import { useWorkspace } from "@/lib/store";
import { useDomains } from "@/lib/domains";
import { monthName, monthStartOf, monthsBetween, quarterName, quarterOfMonth, shiftMonth, shiftQuarter } from "@/lib/studio-review";
import { cn } from "@/lib/utils";
import { Button, IconButton } from "@/components/ui/button";
import { EditableText } from "@/components/ui/input";
import { OptionField, PersonField } from "@/components/ui/fields";
import { useMembers } from "./review-ui";
import { AddRow, Commitments, TickBox, useCommitments, WhyField } from "./commitments";

/**
 * Reviews → Goals: one quarter at a glance. Quarter goals are a tick list on top; under each month
 * are that month's goals — the same list as the Month tab's commitments, so ticking either updates both.
 */
export function GoalsView({ quarter, onQuarterChange }: { quarter: string; onQuarterChange: (q: string) => void }) {
  const { data } = useWorkspace();
  const [thisMonth] = useState(() => monthStartOf(new Date()));
  const months = monthsBetween(quarter, shiftMonth(quarter, 2));
  const goals = data.goals.filter((g) => g.period === "quarter" && g.period_start === quarter).sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
  const done = goals.filter((g) => g.status === "done").length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <IconButton label="Previous quarter" size="md" onClick={() => onQuarterChange(shiftQuarter(quarter, -1))}>
            <ChevronLeft className="size-4" />
          </IconButton>
          <span className="min-w-[96px] text-center text-[17px] font-semibold">{quarterName(quarter)}</span>
          <IconButton label="Next quarter" size="md" onClick={() => onQuarterChange(shiftQuarter(quarter, 1))}>
            <ChevronRight className="size-4" />
          </IconButton>
        </div>
        {quarter !== quarterOfMonth(thisMonth) && (
          <Button variant="ghost" onClick={() => onQuarterChange(quarterOfMonth(thisMonth))}>
            This quarter
          </Button>
        )}
      </div>

      <section className="mb-6 rounded-xl p-4 shadow-[0_0_0_1px_var(--border)] sm:p-5">
        <div className="mb-2 flex items-baseline gap-2">
          <h2 className="text-[16px] font-semibold">Quarter goals</h2>
          <span className="text-[12.5px] text-fg-3">{goals.length ? `${done} of ${goals.length} done` : "3–4 for the quarter"}</span>
        </div>
        <QuarterGoals quarter={quarter} goals={goals} over={shiftQuarter(quarter, 1) <= thisMonth} />
      </section>

      <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
        <h2 className="text-[16px] font-semibold">Monthly goals</h2>
        <span className="text-[12.5px] text-fg-3">The same list as each month’s commitments on the Month tab.</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {months.map((m) => (
          <MonthColumn key={m} month={m} current={m === thisMonth} />
        ))}
      </div>
    </div>
  );
}

function MonthColumn({ month, current }: { month: string; current: boolean }) {
  const list = useCommitments(month);
  const done = list.filter((c) => c.status === "done").length;
  return (
    <div className={cn("rounded-xl p-3", current ? "shadow-[0_0_0_1.5px_var(--accent)]" : "shadow-[0_0_0_1px_var(--border)]")}>
      <div className="mb-1.5 flex items-baseline gap-2">
        <Link href={`/reviews?months=${month}`} className="text-[14px] font-semibold hover:underline" title={`Open ${monthName(month)} on the Month tab`}>
          {monthName(month)}
        </Link>
        {current && <span className="text-[11.5px] font-medium text-accent">now</span>}
        {list.length > 0 && (
          <span className="ml-auto text-[12px] tabular text-fg-3">
            {done}/{list.length}
          </span>
        )}
      </div>
      <Commitments month={month} compact />
    </div>
  );
}

/** Ticked when done. Once the quarter is over, anything unticked is missed and says why. */
function QuarterGoals({ quarter, goals, over }: { quarter: string; goals: Goal[]; over: boolean }) {
  const { create, update, remove, me, canEdit } = useWorkspace();
  const members = useMembers();
  const domains = useDomains();
  const set = (g: Goal, patch: Partial<Goal>) => void update("goals", g.id, patch);
  const add = (title: string) =>
    void create("goals", {
      period: "quarter",
      period_start: quarter,
      title,
      owner_id: me?.id ?? null,
      domain: domains.list.find((d) => d.owner_id === me?.id)?.id ?? null,
      status: "open",
      note: null,
      sort_order: goals.length,
      created_by: me?.id ?? null,
    });

  return (
    <div>
      <div className="divide-y divide-line">
        {goals.map((g) => {
          const done = g.status === "done";
          const askWhy = !done && (over || g.status === "missed" || !!g.note);
          return (
            <div key={g.id} className="group flex items-start gap-3 py-2">
              <TickBox done={done} disabled={!canEdit} onToggle={() => set(g, { status: done ? (over || g.note ? "missed" : "open") : "done" })} />
              <div className="min-w-0 flex-1">
                <EditableText value={g.title} onCommit={(title) => title && set(g, { title })} className={cn("text-[14.5px]", done && "text-fg-2 line-through decoration-fg-3")} />
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-fg-3">
                  <div className="-my-1">
                    <PersonField compact people={members} value={g.owner_id} onChange={(owner_id) => set(g, { owner_id })} placeholder="Owner" />
                  </div>
                  {domains.list.length > 0 && (
                    <div className="-my-1 w-36">
                      <OptionField kind="select" options={domains.options} value={domains.get(g.domain) ? g.domain : null} placeholder="Domain" onChange={(v) => set(g, { domain: v || null })} />
                    </div>
                  )}
                </div>
                {askWhy && <WhyField value={g.note ?? ""} onCommit={(note) => set(g, { note: note || null, status: note || over ? "missed" : "open" })} disabled={!canEdit} />}
              </div>
              {canEdit && (
                <IconButton label="Delete goal" className="opacity-0 group-hover:opacity-100" onClick={() => void remove("goals", g.id)}>
                  <Trash2 className="size-3.5" />
                </IconButton>
              )}
            </div>
          );
        })}
      </div>
      {goals.length === 0 && <p className="pb-1 text-[13.5px] text-fg-3">No quarter goals yet.</p>}
      {canEdit && <AddRow placeholder="Add a quarter goal, e.g. “Launch the studio site”…" onAdd={add} />}
    </div>
  );
}
