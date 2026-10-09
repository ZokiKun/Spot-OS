"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Rocket, Ship } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { CLAUDE_AGENT_NAME, FIX_RUN_STALE_MS, GITHUB_REPO, OPEN_FIX_STATUSES, tasksAwaitingShip, type FixRun } from "@/lib/push-to-fix";
import { cn, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { SettingsRow, SettingsSection } from "./settings-ui";

const isActive = (r: FixRun) => r.status === "running" && Date.now() - new Date(r.created_at).getTime() < FIX_RUN_STALE_MS;

/** Settings → Automation: hand Claude's open tasks to a cloud Claude run, then Ship it to put the work live. */
export function PushToFix() {
  const { mode, data, canEdit } = useWorkspace();
  const toast = useToast();
  const confirm = useConfirm();
  const [runs, setRuns] = useState<FixRun[] | null>(null);
  const [sending, setSending] = useState(false);
  const [shipping, setShipping] = useState<string | null>(null);

  const agent = data.profiles.find((p) => p.full_name === CLAUDE_AGENT_NAME);
  // Tasks already built in a run that's waiting for Ship it aren't sent again.
  const waiting = useMemo(() => tasksAwaitingShip(runs ?? []), [runs]);
  const queue = useMemo(
    () =>
      agent
        ? data.tasks.filter(
            (t) => OPEN_FIX_STATUSES.includes(t.status) && (t.assignee_ids?.includes(agent.id) || t.assignee_id === agent.id) && !waiting.has(t.id),
          )
        : [],
    [agent, data.tasks, waiting],
  );

  // Bumping `tick` re-reads the latest runs.
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => {
    if (mode !== "supabase") return;
    let live = true;
    void getSupabaseBrowserClient()
      .from("fix_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data: rows }) => {
        if (live) setRuns((rows as FixRun[] | null) ?? []);
      });
    return () => {
      live = false;
    };
  }, [mode, tick]);

  // While Claude works, check back every 10s for its report.
  const running = runs?.find(isActive);
  const ready = runs?.find((r) => r.status === "ready");
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(reload, 10_000);
    return () => clearInterval(timer);
  }, [running, reload]);

  const push = async () => {
    const ok = await confirm({
      title: `Send ${queue.length} task${queue.length === 1 ? "" : "s"} to Claude?`,
      description: (
        <>
          Claude builds {queue.length === 1 ? "it" : "each one"} in the cloud. Nothing goes live until you press Ship it.
          <ul className="mt-2 list-disc space-y-0.5 pl-4">
            {queue.slice(0, 6).map((t) => (
              <li key={t.id} className="line-clamp-1">
                {t.title}
              </li>
            ))}
            {queue.length > 6 && <li>and {queue.length - 6} more</li>}
          </ul>
        </>
      ),
      confirmLabel: "Push to fix",
      danger: false,
    });
    if (!ok) return;
    setSending(true);
    try {
      const res = await fetch("/api/push-to-fix", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { error?: string; empty?: boolean; tasks?: number };
      if (!res.ok) throw new Error(body.error ?? "Couldn’t start the run.");
      if (body.empty) toast.show({ title: `Nothing assigned to ${CLAUDE_AGENT_NAME}`, description: "Open tasks assigned to Claude show up here." });
      else toast.show({ title: "Claude is on it", description: `${body.tasks} task${body.tasks === 1 ? "" : "s"} sent. Ship it appears here when Claude is done.`, tone: "success" });
    } catch (e) {
      toast.show({ title: "Push to fix didn’t start", description: e instanceof Error ? e.message : undefined, tone: "error" });
    } finally {
      setSending(false);
      reload();
    }
  };

  // A run that never reported back (blocked push, crashed session) would block the button for hours.
  const stop = async (run: FixRun) => {
    const ok = await confirm({
      title: "Stop waiting for this run?",
      description: "Spot OS marks it as stopped so you can push to fix again. Anything Claude already pushed stays live.",
      confirmLabel: "Stop waiting",
      danger: false,
    });
    if (!ok) return;
    const { error } = await getSupabaseBrowserClient()
      .from("fix_runs")
      .update({ status: "failed", error: "Stopped from Settings — Claude never reported back.", finished_at: new Date().toISOString() })
      .eq("id", run.id)
      .eq("status", "running");
    if (error) toast.show({ title: "Couldn’t stop the run", description: error.message, tone: "error" });
    reload();
  };

  const ship = async (run: FixRun) => {
    const count = run.results.filter((x) => x.outcome === "shipped").length;
    const ok = await confirm({
      title: "Put this live?",
      description: `Merges Claude’s work (${count} task${count === 1 ? "" : "s"}) into the live site. It’s up in about 2 minutes, and the tasks move to Review for you to check.`,
      confirmLabel: "Ship it",
      danger: false,
    });
    if (!ok) return;
    setShipping(run.id);
    try {
      const res = await fetch("/api/push-to-fix/ship", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ runId: run.id }) });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Couldn’t ship it.");
      toast.show({ title: "Shipped", description: "Live in about 2 minutes. The tasks are in Review.", tone: "success" });
    } catch (e) {
      toast.show({ title: "Didn’t ship", description: e instanceof Error ? e.message : undefined, tone: "error" });
    } finally {
      setShipping(null);
      reload();
    }
  };

  const discard = async (run: FixRun) => {
    const ok = await confirm({
      title: "Discard Claude’s work?",
      description: "Nothing from this run goes live. Its tasks can be sent to Claude again.",
      confirmLabel: "Discard",
    });
    if (!ok) return;
    const { error } = await getSupabaseBrowserClient()
      .from("fix_runs")
      .update({ status: "failed", error: "Discarded — not shipped." })
      .eq("id", run.id)
      .eq("status", "ready");
    if (error) toast.show({ title: "Couldn’t discard the run", description: error.message, tone: "error" });
    reload();
  };

  const titleOf = (id: string) => data.tasks.find((t) => t.id === id)?.title ?? "A deleted task";
  const nameOf = (id: string | null) => data.profiles.find((p) => p.id === id)?.full_name ?? "Someone";

  return (
    <>
      <SettingsSection
        title="Push to fix"
        description={`Sends every open task assigned to ${CLAUDE_AGENT_NAME} to Claude in the cloud. Claude builds each one on its own branch; press Ship it to put the work live, and the tasks move to Review. Database changes are never run for you — Claude leaves a note instead.`}
      >
        <SettingsRow
          label={queue.length ? `${queue.length} task${queue.length === 1 ? "" : "s"} waiting` : "Nothing waiting"}
          description={
            mode !== "supabase"
              ? "Needs Supabase — not available in demo mode."
              : !agent
                ? `Add a member named “${CLAUDE_AGENT_NAME}” and assign tasks to it.`
                : !canEdit
                  ? "Only editors can push to fix."
                  : running
                    ? `Claude started ${timeAgo(running.created_at)} and is still working.`
                    : ready && !queue.length
                      ? "Claude is done — press Ship it below to put the work live."
                      : queue.length
                      ? "Todo, In progress and Blocked tasks assigned to Claude."
                      : `Assign a task to ${CLAUDE_AGENT_NAME} and it shows up here.`
          }
        >
          <Button variant="primary" size="md" onClick={push} disabled={mode !== "supabase" || !canEdit || !queue.length || !!running || sending}>
            <Rocket className="size-4" /> {sending ? "Sending…" : running ? "Claude is working…" : "Push to fix"}
          </Button>
        </SettingsRow>
      </SettingsSection>

      {!!runs?.length && (
        <SettingsSection title="Recent runs">
          <ul className="divide-y divide-line">
            {runs.map((r) => {
              const state = isActive(r) ? "running" : r.status === "running" ? "stalled" : r.status;
              const shipped = r.results.filter((x) => x.outcome === "shipped").length;
              return (
                <li key={r.id} className="py-3 text-[13px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          state === "done" && "bg-[var(--dot-green)]",
                          state === "running" && "animate-pulse bg-[var(--dot-blue)]",
                          state === "ready" && "bg-[var(--dot-orange)]",
                          (state === "failed" || state === "stalled") && "bg-[var(--dot-red)]",
                        )}
                      />
                      <span className="truncate">
                        {state === "running"
                          ? "Working"
                          : state === "stalled"
                            ? "No report back"
                            : state === "ready"
                              ? `Ready to ship · ${shipped} of ${r.task_ids.length}`
                              : state === "done"
                                ? `${r.shipped_at ? "Live" : "Shipped"} · ${shipped} of ${r.task_ids.length}`
                                : "Failed"}
                        <span className="text-fg-2"> · {nameOf(r.requested_by)} · {timeAgo(r.created_at)}</span>
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-3">
                      {r.status === "running" && canEdit && (
                        <button type="button" onClick={() => void stop(r)} className="text-fg-2 hover:text-fg">
                          Stop waiting
                        </button>
                      )}
                      {r.status === "ready" && r.branch && (
                        <a
                          href={`https://github.com/${GITHUB_REPO}/compare/main...${r.branch}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-fg-2 hover:text-fg"
                        >
                          Changes <ExternalLink className="size-3.5" />
                        </a>
                      )}
                      {r.session_url && (
                        <a href={r.session_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-fg-2 hover:text-fg">
                          Session <ExternalLink className="size-3.5" />
                        </a>
                      )}
                    </span>
                  </div>
                  {(r.summary || r.error) && <p className="mt-1 whitespace-pre-line text-fg-2">{r.summary || r.error}</p>}
                  {r.shipped_at && <p className="mt-1 text-[12px] text-fg-2">Shipped by {nameOf(r.shipped_by)} · {timeAgo(r.shipped_at)}</p>}
                  {!!r.results.length && (
                    <ul className="mt-1.5 space-y-0.5 text-[12px] text-fg-2">
                      {r.results.map((x) => (
                        <li key={x.task_id} className="line-clamp-2">
                          {x.outcome === "shipped" ? "✓" : "–"} {titleOf(x.task_id)}
                          {x.note && <span> — {x.note}</span>}
                          {x.commit && <span className="font-mono"> ({x.commit.slice(0, 7)})</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {r.status === "ready" && canEdit && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <Button variant="primary" onClick={() => void ship(r)} disabled={!!shipping}>
                        <Ship className="size-4" /> {shipping === r.id ? "Shipping…" : "Ship it"}
                      </Button>
                      <Button variant="ghost" onClick={() => void discard(r)} disabled={!!shipping}>
                        Discard
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </SettingsSection>
      )}
    </>
  );
}
