import { NextResponse, type NextRequest } from "next/server";
import { toCsvUrl } from "@/lib/finance/normalize";

const ALLOWED_HOSTS = new Set(["docs.google.com"]);

/**
 * Server-side fetch of a Google Sheet as CSV (avoids browser CORS).
 * Only Google Sheets URLs are allowed, so this can't be used as an open proxy.
 * Signed-out requests never reach here — proxy.ts redirects them in Supabase mode.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  let target: URL;
  try {
    target = new URL(toCsvUrl(raw));
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
  if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname))
    return NextResponse.json({ error: "Only Google Sheets URLs are supported" }, { status: 400 });

  try {
    const res = await fetch(target, { signal: AbortSignal.timeout(10_000), redirect: "follow", cache: "no-store" });
    const text = await res.text();
    if (!res.ok || /^\s*<!doctype html/i.test(text))
      return NextResponse.json(
        { error: "Google returned an error. Make sure the sheet is shared as “Anyone with the link can view” or published to the web as CSV." },
        { status: 502 },
      );
    return new NextResponse(text, { headers: { "content-type": "text/csv; charset=utf-8", "cache-control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Fetch failed" }, { status: 502 });
  }
}
