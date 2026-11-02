import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Reviews → Month → "Generate report". The browser sends a plain-text digest of the month (tasks done
 * per person, commitments, money — built by lib/studio-review.ts → monthDigest); Claude writes a short
 * Markdown report, which the browser saves on that month's reviews row.
 *
 * Env (Vercel, server-only): ANTHROPIC_API_KEY.
 */
const MODEL = "claude-opus-5-5";
const MAX_DIGEST = 60_000; // characters — a busy month is a few thousand

const SYSTEM = `You write the monthly review for a small creative studio (about three people) that does client work, its own studio work (website, social media, outreach, events) and personal growth (courses, practice).

You get one month of data from their studio OS: each person's completed tasks grouped by project, with the project type in brackets ([client], [studio], [personal]), the commitments they made at the start of the month and whether they were done, projects started during the month, and sometimes the money.

Write the report in Markdown, in this shape:

## In short
Two or three sentences: what the month was mostly about and where the team's time went.

## People
### <First name>
Two to four bullets: what they actually got done (name projects, not every task), where their time went between client, studio and personal work, and anything notable.
(One section per person, in the order given.)

## Commitments
What landed and what didn't, with the reasons given. Skip this section if there were no commitments.

## Worth discussing
One to three bullets for the team's monthly meeting: patterns or tensions, such as client work crowding out studio plans, a domain or person stretched thin, or a project that appeared unplanned.

Rules: use only facts from the data and never invent numbers, tasks or reasons. Task counts are a rough signal of effort (a small task counts the same as a big one), so describe time in plain words rather than precise percentages. Keep it under 350 words, warm and direct, written for the team themselves.`;

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/** Whether Generate report can work here — the button is hidden when there's no key. */
export async function GET() {
  return NextResponse.json({ enabled: Boolean(process.env.ANTHROPIC_API_KEY) });
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY)
    return fail(503, "Claude isn’t connected yet. Add ANTHROPIC_API_KEY to the environment (Vercel → Settings → Environment Variables, or .env.local).");

  // Only signed-in editors can spend the studio's API credit. Demo mode (no Supabase) is localhost-only.
  if (isSupabaseConfigured) {
    const sb = await getSupabaseServerClient();
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) return fail(401, "Sign in first.");
    const { data: me } = await sb.from("profiles").select("access").eq("id", auth.user.id).single();
    if (!me || me.access === "viewer") return fail(403, "Only editors can generate the report.");
  } else if (!["localhost", "127.0.0.1", "[::1]"].includes(request.nextUrl.hostname)) {
    return fail(403, "Demo mode only generates reports on localhost.");
  }

  let body: { digest?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "Expected JSON.");
  }
  const digest = typeof body.digest === "string" ? body.digest.trim() : "";
  if (!digest) return fail(400, "Nothing to report on.");
  if (digest.length > MAX_DIGEST) return fail(413, "This month has too much data for one report.");

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium" },
      // If a safety classifier declines (rare false positive), retry on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content: `Here is the month's data:\n\n${digest}` }],
    });
    if (response.stop_reason === "refusal") return fail(502, "Claude declined to write this report. Try again, or write it by hand.");
    const report = response.content
      .flatMap((b) => (b.type === "text" ? [b.text] : []))
      .join("\n")
      .trim();
    if (!report) return fail(502, "Claude returned an empty report. Try again.");
    return NextResponse.json({ report, truncated: response.stop_reason === "max_tokens" });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return fail(503, "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.");
    if (err instanceof Anthropic.RateLimitError) return fail(429, "Claude is busy right now. Try again in a minute.");
    if (err instanceof Anthropic.APIError) return fail(502, `Claude couldn’t write the report (${err.status ?? "error"}).`);
    return fail(502, "Couldn’t reach Claude. Check the connection and try again.");
  }
}
