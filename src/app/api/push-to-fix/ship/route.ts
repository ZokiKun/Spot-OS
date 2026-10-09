import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { GITHUB_REPO, type FixRun } from "@/lib/push-to-fix";

/**
 * Settings → Automation → Ship it. Merges a finished run's claude/… branch into main through the
 * GitHub API (Vercel then deploys main) and moves the run's shipped tasks to Review. Editors only;
 * a person pressing this is what puts Claude's work live.
 *
 * Env (Vercel, server-only): GITHUB_TOKEN — fine-grained token with Contents: read & write on the repo.
 */
const GITHUB_TOKEN = (process.env.GITHUB_TOKEN ?? "").trim();

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

const github = (path: string, init: RequestInit = {}) =>
  fetch(`https://api.github.com/repos/${GITHUB_REPO}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
  });

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) return fail(400, "Ship it needs Supabase — it isn’t available in demo mode.");
  if (!GITHUB_TOKEN) return fail(503, "GitHub isn’t connected yet. Set GITHUB_TOKEN in Vercel.");

  const { runId } = (await request.json().catch(() => ({}))) as { runId?: string };
  if (!runId) return fail(400, "Which run?");

  const sb = await getSupabaseServerClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return fail(401, "Sign in first.");
  const { data: me } = await sb.from("profiles").select("id, access").eq("id", auth.user.id).single();
  if (!me || me.access === "viewer") return fail(403, "Only editors can ship.");

  const { data: run } = await sb.from("fix_runs").select("*").eq("id", runId).single<FixRun>();
  if (!run) return fail(404, "That run doesn’t exist.");
  if (run.status !== "ready" || !run.branch) return fail(409, "This run has nothing waiting to ship.");
  if (!/^claude\/[A-Za-z0-9._/-]+$/.test(run.branch)) return fail(400, "Only claude/ branches can be shipped.");

  // 201 = merged, 204 = main already has everything, 409 = conflicts, 404 = branch gone.
  const res = await github("/merges", {
    method: "POST",
    body: JSON.stringify({ base: "main", head: run.branch, commit_message: `Ship Push to fix run ${run.id.slice(0, 8)} (${run.branch})` }),
  });
  if (res.status === 409) return fail(409, "Claude’s branch conflicts with newer changes on main. Push to fix again to redo it on top of them.");
  if (res.status === 404) return fail(404, `GitHub can’t find ${run.branch}. It may have been deleted or merged already.`);
  if (res.status === 401 || res.status === 403) return fail(502, "GitHub refused the token. Check GITHUB_TOKEN in Vercel (Contents: read & write on the repo).");
  if (res.status !== 201 && res.status !== 204) return fail(502, `GitHub answered ${res.status}.`);
  const merged = res.status === 201 ? ((await res.json()) as { sha?: string }).sha ?? null : null;

  const now = new Date().toISOString();
  await sb.from("fix_runs").update({ status: "done", shipped_at: now, shipped_by: me.id, ship_commit: merged }).eq("id", run.id).eq("status", "ready");

  const shipped = run.results.filter((x) => x.outcome === "shipped" && run.task_ids.includes(x.task_id)).map((x) => x.task_id);
  if (shipped.length) {
    await sb.from("tasks").update({ status: "review", custom_status: null, completed_at: null }).in("id", shipped).neq("status", "done");
  }

  // Tidy up: the branch is in main now.
  await github(`/git/refs/heads/${run.branch.split("/").map(encodeURIComponent).join("/")}`, { method: "DELETE" }).catch(() => null);

  return NextResponse.json({ ok: true, commit: merged, tasks: shipped.length });
}
