import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/env";
import { CLAUDE_AGENT_NAME, FIX_RUN_STALE_MS, OPEN_FIX_STATUSES } from "@/lib/push-to-fix";

/**
 * Settings → Automation → "Push to fix". Sends every open task assigned to the Claude member to a
 * cloud Claude Code routine (API trigger), which builds them, pushes main and reports back through
 * the finish_fix_run() RPC (migration 0012). Runs as the signed-in editor — no service-role key.
 *
 * Env (Vercel, server-only): CLAUDE_ROUTINE_FIRE_URL, CLAUDE_ROUTINE_TOKEN.
 */
// Pasted values often carry stray spaces, newlines or quotes.
const clean = (v: string | undefined) => (v ?? "").trim().replace(/^["']|["']$/g, "").trim();
const FIRE_URL = clean(process.env.CLAUDE_ROUTINE_FIRE_URL);
const FIRE_TOKEN = clean(process.env.CLAUDE_ROUTINE_TOKEN);
const ROUTINE_BETA = "experimental-cc-routine-2026-04-01";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) return fail(400, "Push to fix needs Supabase — it isn’t available in demo mode.");
  if (!FIRE_URL || !FIRE_TOKEN) return fail(503, "The Claude routine isn’t connected yet. Set CLAUDE_ROUTINE_FIRE_URL and CLAUDE_ROUTINE_TOKEN in Vercel.");

  const sb = await getSupabaseServerClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return fail(401, "Sign in first.");
  const { data: me } = await sb.from("profiles").select("id, access").eq("id", auth.user.id).single();
  if (!me || me.access === "viewer") return fail(403, "Only editors can push to fix.");

  // One run at a time; a run that never reported back stops blocking after a few hours.
  const { data: active } = await sb
    .from("fix_runs")
    .select("id, created_at")
    .eq("status", "running")
    .gte("created_at", new Date(Date.now() - FIX_RUN_STALE_MS).toISOString())
    .limit(1);
  if (active?.length) return fail(409, "Claude is already working on a run. Wait for it to finish.");

  const { data: agent } = await sb.from("profiles").select("id, full_name").eq("full_name", CLAUDE_AGENT_NAME).maybeSingle();
  if (!agent) return fail(404, `No member named “${CLAUDE_AGENT_NAME}”.`);

  const { data: tasks, error: tasksError } = await sb
    .from("tasks")
    .select("id, title, description, priority, status, project_id, created_at, created_by, projects(name)")
    .in("status", OPEN_FIX_STATUSES)
    .or(`assignee_id.eq.${agent.id},assignee_ids.cs.{${agent.id}}`)
    .order("created_at", { ascending: true });
  if (tasksError) return fail(500, tasksError.message);
  if (!tasks?.length) return NextResponse.json({ empty: true });

  const { data: people } = await sb.from("profiles").select("id, full_name");
  const nameOf = (id: string | null) => people?.find((p) => p.id === id)?.full_name ?? "someone";

  const token = randomBytes(32).toString("hex");
  const { data: run, error: runError } = await sb
    .from("fix_runs")
    .insert({
      requested_by: me.id,
      agent_id: agent.id,
      task_ids: tasks.map((t) => t.id),
      status: "running",
      token_hash: createHash("sha256").update(token).digest("hex"),
    })
    .select("id")
    .single();
  if (runError || !run) return fail(500, runError?.message ?? "Couldn’t start the run.");

  const origin = request.nextUrl.origin;
  const payload = {
    run_id: run.id,
    requested_by: nameOf(me.id),
    app_url: origin,
    report: {
      url: `${SUPABASE_URL}/rest/v1/rpc/finish_fix_run`,
      apikey: SUPABASE_ANON_KEY,
      token,
    },
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: (t.description ?? "").slice(0, 4000),
      priority: t.priority,
      project: (t.projects as unknown as { name: string } | null)?.name ?? null,
      created_by: nameOf(t.created_by),
      link: t.project_id ? `${origin}/projects/${t.project_id}?tab=tasks&task=${t.id}` : `${origin}/projects/tasks?task=${t.id}`,
    })),
  };

  try {
    const res = await fetch(FIRE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRE_TOKEN}`,
        "anthropic-beta": ROUTINE_BETA,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: JSON.stringify(payload) }),
    });
    const body = (await res.json().catch(() => ({}))) as { claude_code_session_url?: string; error?: { message?: string } };
    if (res.status === 401 || res.status === 403)
      throw new Error("Claude rejected the routine token. Regenerate it on the routine’s API trigger and update CLAUDE_ROUTINE_TOKEN in Vercel.");
    if (res.status === 404) throw new Error("Claude couldn’t find the routine. Check CLAUDE_ROUTINE_FIRE_URL in Vercel.");
    if (!res.ok) throw new Error(body.error?.message ?? `The routine answered ${res.status}.`);
    await sb.from("fix_runs").update({ session_url: body.claude_code_session_url ?? null }).eq("id", run.id);
    return NextResponse.json({ id: run.id, tasks: tasks.length, session_url: body.claude_code_session_url ?? null });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Couldn’t reach Claude.";
    await sb.from("fix_runs").update({ status: "failed", error: message, finished_at: new Date().toISOString() }).eq("id", run.id);
    return fail(502, message);
  }
}
