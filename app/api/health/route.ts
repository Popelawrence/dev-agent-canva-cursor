import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "dev-agent-canva-cursor",
    timestamp: new Date().toISOString(),
  });
}
