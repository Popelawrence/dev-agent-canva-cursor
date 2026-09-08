import { NextResponse, type NextRequest } from "next/server";
import {
  buildAuthorizeUrl,
  createPkce,
  createState,
  getCanvaConfig,
} from "@/lib/canva";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(_request: NextRequest) {
  const config = getCanvaConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Canva is not configured on the server" },
      { status: 503 },
    );
  }

  const { verifier, challenge } = createPkce();
  const state = createState();
  const authorizeUrl = buildAuthorizeUrl(config, {
    state,
    codeChallenge: challenge,
  });

  const res = NextResponse.redirect(authorizeUrl);
  const base = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  };
  res.cookies.set("canva_pkce", verifier, base);
  res.cookies.set("canva_state", state, base);
  return res;
}
