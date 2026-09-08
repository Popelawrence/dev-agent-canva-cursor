import { NextResponse, type NextRequest } from "next/server";
import { isCanvaConfigured } from "@/lib/canva";
import { readTokens } from "@/lib/canva-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const configured = isCanvaConfigured();
  const { accessToken, refreshToken } = readTokens(request);
  return NextResponse.json({
    configured,
    connected: configured && Boolean(accessToken || refreshToken),
  });
}
