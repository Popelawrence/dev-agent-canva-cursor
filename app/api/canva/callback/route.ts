import { NextResponse, type NextRequest } from "next/server";
import { exchangeCodeForToken, getCanvaConfig } from "@/lib/canva";
import { writeTokens } from "@/lib/canva-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const home = new URL("/", request.url);
  const config = getCanvaConfig();
  if (!config) {
    home.searchParams.set("canva", "error");
    return NextResponse.redirect(home);
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const verifier = request.cookies.get("canva_pkce")?.value;
  const savedState = request.cookies.get("canva_state")?.value;

  if (!code || !state || !verifier || !savedState || state !== savedState) {
    home.searchParams.set("canva", "error");
    return NextResponse.redirect(home);
  }

  try {
    const tokens = await exchangeCodeForToken(config, {
      code,
      codeVerifier: verifier,
    });
    home.searchParams.set("canva", "connected");
    const res = NextResponse.redirect(home);
    writeTokens(res, tokens);
    res.cookies.set("canva_pkce", "", { path: "/", maxAge: 0 });
    res.cookies.set("canva_state", "", { path: "/", maxAge: 0 });
    return res;
  } catch {
    home.searchParams.set("canva", "error");
    return NextResponse.redirect(home);
  }
}
