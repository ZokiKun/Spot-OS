import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** The live deploy's version, so open tabs can tell a newer one has shipped (see WhatsNew). */
export function GET() {
  return NextResponse.json({ version: process.env.APP_VERSION ?? "dev" }, { headers: { "Cache-Control": "no-store" } });
}
