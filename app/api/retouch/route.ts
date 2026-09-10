import { NextResponse } from "next/server";
import sharp from "sharp";
import { retouchPortrait } from "@/lib/retouch";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_PREVIEW_DIM = 1000;

export async function POST(request: Request) {
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

  const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Image is too large (max 15 MB)" },
      { status: 413 },
    );
  }

  const strengthRaw = form.get("strength");
  const parsedStrength =
    typeof strengthRaw === "string" ? Number(strengthRaw) : 0.6;
  const strength = Number.isFinite(parsedStrength) ? parsedStrength : 0.6;

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  let normalized: Buffer;
  try {
    normalized = await sharp(inputBuffer, { failOn: "none" })
      .rotate()
      .resize({
        width: MAX_PREVIEW_DIM,
        height: MAX_PREVIEW_DIM,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 92 })
      .toBuffer();
  } catch {
    return NextResponse.json(
      { error: "Unsupported or corrupt image file" },
      { status: 400 },
    );
  }

  const result = await retouchPortrait(normalized, { strength });

  return NextResponse.json({
    original: `data:image/jpeg;base64,${normalized.toString("base64")}`,
    retouched: `data:image/jpeg;base64,${result.data.toString("base64")}`,
    width: result.width,
    height: result.height,
    skinRatio: Number(result.skinRatio.toFixed(4)),
    strength: result.strength,
  });
}
