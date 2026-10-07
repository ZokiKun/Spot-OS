import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { DIRECTION_COOKIE, parseDirection } from "@/lib/direction-cookie";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Refreshes the Supabase session cookie and redirects signed-out users to /login.
 * In demo mode (no Supabase env) the client-side provider handles the gate instead.
 */
export async function proxy(request: NextRequest) {
  // Shareable links: ?direction=2 picks the design direction, then drops the param.
  const requested = parseDirection(request.nextUrl.searchParams.get("direction"));
  if (requested) {
    const to = request.nextUrl.clone();
    to.searchParams.delete("direction");
    const res = NextResponse.redirect(to);
    res.cookies.set(DIRECTION_COOKIE, String(requested), { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return res;
  }

  if (!url || !anonKey) return NextResponse.next();

  let response = NextResponse.next({ request });
  const sb = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await sb.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublic = path.startsWith("/login") || path.startsWith("/auth");
  if (!data.user && !isPublic) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.search = "";
    return NextResponse.redirect(to);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
