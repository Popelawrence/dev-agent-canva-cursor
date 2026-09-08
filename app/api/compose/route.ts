import { NextResponse } from "next/server";
import {
  composePhotoOntoTemplate,
  type ComposePosition,
} from "@/lib/compose";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const POSITIONS: ComposePosition[] = [
  "center",
  "top",
  "bottom",
  "left",
  "right",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  const template = form.get("template");
  const photo = form.get("photo");
  if (!(template instanceof File)) {
    return NextResponse.json(
      { error: "Missing 'template' image" },
      { status: 400 },
    );
  }
  if (!(photo instanceof File)) {
    return NextResponse.json({ error: "Missing 'photo' image" }, { status: 400 });
  }
  if (template.size > MAX_UPLOAD_BYTES || photo.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Image is too large (max 15 MB)" },
      { status: 413 },
    );
  }

  const positionRaw = form.get("position");
  const position: ComposePosition =
    typeof positionRaw === "string" &&
    POSITIONS.includes(positionRaw as ComposePosition)
      ? (positionRaw as ComposePosition)
      : "center";

  const scaleRaw = form.get("scalePercent");
  const scalePercent =
    typeof scaleRaw === "string" && Number.isFinite(Number(scaleRaw))
      ? Number(scaleRaw)
      : 50;

  const templateBuf = Buffer.from(await template.arrayBuffer());
  const photoBuf = Buffer.from(await photo.arrayBuffer());

  try {
    const result = await composePhotoOntoTemplate(templateBuf, photoBuf, {
      scalePercent,
      position,
    });
    return NextResponse.json({
      composed: `data:image/jpeg;base64,${result.data.toString("base64")}`,
      width: result.width,
      height: result.height,
      photoWidth: result.photoWidth,
      photoHeight: result.photoHeight,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Compose failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
