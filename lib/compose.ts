import sharp from "sharp";

export type ComposePosition =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export interface ComposeOptions {
  /** Overlay width as a percentage of the template width (10–100). Default 50. */
  scalePercent?: number;
  /** Where to place the photo on the template. Default "center". */
  position?: ComposePosition;
}

export interface ComposeResult {
  data: Buffer;
  width: number;
  height: number;
  /** Placed photo size in px. */
  photoWidth: number;
  photoHeight: number;
}

const GRAVITY: Record<ComposePosition, string> = {
  center: "centre",
  top: "north",
  bottom: "south",
  left: "west",
  right: "east",
  "top-left": "northwest",
  "top-right": "northeast",
  "bottom-left": "southwest",
  "bottom-right": "southeast",
};

const clampPercent = (v: number) => Math.min(100, Math.max(10, v));

/**
 * Automatically place a photo onto a template image (no manual dragging).
 * The photo is scaled to a fraction of the template width and composited at the
 * requested position. Returns a flattened JPEG of the finished design.
 */
export async function composePhotoOntoTemplate(
  templateInput: Buffer,
  photoInput: Buffer,
  options: ComposeOptions = {},
): Promise<ComposeResult> {
  const scalePercent = clampPercent(options.scalePercent ?? 50);
  const position = options.position ?? "center";

  const template = sharp(templateInput, { failOn: "none" }).rotate();
  const templateMeta = await template.metadata();
  const width = templateMeta.width;
  const height = templateMeta.height;
  if (!width || !height) {
    throw new Error("Could not read template image dimensions");
  }

  const targetPhotoWidth = Math.max(
    1,
    Math.round((width * scalePercent) / 100),
  );

  // Resize the photo to the target width (height auto), but never taller than
  // the template.
  const resizedPhoto = await sharp(photoInput, { failOn: "none" })
    .rotate()
    .resize({
      width: targetPhotoWidth,
      height,
      fit: "inside",
      withoutEnlargement: false,
    })
    .toBuffer();

  const placedMeta = await sharp(resizedPhoto).metadata();

  const data = await sharp(templateInput, { failOn: "none" })
    .rotate()
    .composite([{ input: resizedPhoto, gravity: GRAVITY[position] }])
    .jpeg({ quality: 92 })
    .toBuffer();

  return {
    data,
    width,
    height,
    photoWidth: placedMeta.width ?? targetPhotoWidth,
    photoHeight: placedMeta.height ?? 0,
  };
}
