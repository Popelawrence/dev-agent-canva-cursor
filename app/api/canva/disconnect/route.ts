import { NextResponse } from "next/server";
import { clearTokens } from "@/lib/canva-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST() {
  const res = NextResponse.json({ ok: true });
  clearTokens(res);
  return res;
}
