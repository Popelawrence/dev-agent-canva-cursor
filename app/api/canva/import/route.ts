import { NextResponse, type NextRequest } from "next/server";
import { getCanvaConfig, importDesignFromUrl } from "@/lib/canva";
import { ensureAccessToken, writeTokens } from "@/lib/canva-session";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const config = getCanvaConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Canva is not configured on the server" },
      { status: 503 },
    );
  }

  const auth = await ensureAccessToken(request, config);
  if (!auth.accessToken) {
    return NextResponse.json(
      {
        error:
          auth.error === "expired"
            ? "Canva session expired — please reconnect"
            : "Not connected to Canva",
      },
      { status: 401 },
    );
  }

  let body: { url?: unknown; title?: unknown; mimeType?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!/^https:\/\/.+/i.test(url)) {
    return NextResponse.json(
      { error: "A public https:// URL to a template file is required" },
      { status: 400 },
    );
  }
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : "Imported template";
  const mimeType =
    typeof body.mimeType === "string" && body.mimeType.trim()
      ? body.mimeType.trim()
      : undefined;

  try {
    const design = await importDesignFromUrl(auth.accessToken, {
      url,
      title,
      mimeType,
    });
    const res = NextResponse.json({
      designId: design.designId,
      editUrl: design.editUrl,
      viewUrl: design.viewUrl,
    });
    if (auth.refreshed) {
      writeTokens(res, auth.refreshed);
    }
    return res;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Template import failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
