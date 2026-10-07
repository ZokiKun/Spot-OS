import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Completes magic-link and invite sign-ins (PKCE code exchange). */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  if (code) {
    const sb = await getSupabaseServerClient();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next.startsWith("/") ? next : "/", url.origin));
  }
  return NextResponse.redirect(new URL("/login", url.origin));
}
