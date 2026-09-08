import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import {
  createDesignFromAsset,
  getCanvaConfig,
  refreshAccessToken,
  uploadImageAsset,
  type CanvaTokenSet,
} from "@/lib/canva";
import { readTokens, writeTokens } from "@/lib/canva-session";

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

  const stored = readTokens(request);
  let accessToken = stored.accessToken;
  let refreshed: CanvaTokenSet | null = null;

  const expired = !accessToken || Date.now() >= stored.expiresAt;
  if (expired && stored.refreshToken) {
    try {
      refreshed = await refreshAccessToken(config, stored.refreshToken);
      accessToken = refreshed.accessToken;
    } catch {
      return NextResponse.json(
        { error: "Canva session expired — please reconnect" },
        { status: 401 },
      );
    }
  }

  if (!accessToken) {
    return NextResponse.json(
      { error: "Not connected to Canva" },
      { status: 401 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data with an 'image' file" },
      { status: 400 },
    );
  }

  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'image' file" }, { status: 400 });
  }
  const titleRaw = form.get("title");
  const title =
    typeof titleRaw === "string" && titleRaw.trim()
      ? titleRaw.trim()
      : "Retouched portrait";

  const input = Buffer.from(await file.arrayBuffer());
  let jpeg: Buffer;
  let width: number;
  let height: number;
  try {
    const image = sharp(input, { failOn: "none" }).rotate();
    const meta = await image.metadata();
    width = meta.width ?? 1000;
    height = meta.height ?? 1000;
    jpeg = await image.jpeg({ quality: 92 }).toBuffer();
  } catch {
    return NextResponse.json(
      { error: "Unsupported or corrupt image file" },
      { status: 400 },
    );
  }

  try {
    const assetId = await uploadImageAsset(
      accessToken,
      new Uint8Array(jpeg),
      title,
    );
    const design = await createDesignFromAsset(accessToken, {
      assetId,
      width,
      height,
      title,
    });
    const res = NextResponse.json({
      designId: design.designId,
      editUrl: design.editUrl,
      viewUrl: design.viewUrl,
    });
    if (refreshed) {
      writeTokens(res, refreshed);
    }
    return res;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Canva request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
