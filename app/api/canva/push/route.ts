import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import {
  createDesignFromAsset,
  getCanvaConfig,
  uploadImageAsset,
} from "@/lib/canva";
import { resolveFormat } from "@/lib/canva-formats";
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
  const accessToken = auth.accessToken;
  const refreshed = auth.refreshed;

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

  // Resolve the requested design format/size (defaults to matching the photo).
  const formatKey = typeof form.get("designType") === "string"
    ? String(form.get("designType"))
    : "match";
  const format = resolveFormat(formatKey);
  if (format && format.width && format.height) {
    width = format.width;
    height = format.height;
  }

  // "asset" mode uploads to the user's Canva Uploads (to drop into an imported
  // template); "design" mode (default) creates a new design from the photo.
  const mode = form.get("mode") === "asset" ? "asset" : "design";

  try {
    const assetId = await uploadImageAsset(
      accessToken,
      new Uint8Array(jpeg),
      title,
    );

    if (mode === "asset") {
      const res = NextResponse.json({
        mode: "asset",
        assetId,
        message:
          "Added to your Canva Uploads. Open your template in Canva and drag it in.",
      });
      if (refreshed) {
        writeTokens(res, refreshed);
      }
      return res;
    }

    const design = await createDesignFromAsset(accessToken, {
      assetId,
      width,
      height,
      title,
    });
    const res = NextResponse.json({
      mode: "design",
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
