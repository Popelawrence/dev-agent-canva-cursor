import sharp from "sharp";

export interface RetouchOptions {
  /** Smoothing strength from 0 (no change) to 1 (maximum). Default 0.6. */
  strength?: number;
}

export interface RetouchResult {
  /** JPEG-encoded retouched image. */
  data: Buffer;
  width: number;
  height: number;
  /** Fraction of pixels classified as skin (0..1). */
  skinRatio: number;
  strength: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Classify a pixel as skin using YCbCr chrominance thresholds.
 * This is the identity-preserving guard: only skin is smoothed, so eyes,
 * brows, lips, hair, and the background are always left untouched.
 */
export function isSkinPixel(r: number, g: number, b: number): boolean {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173 && y > 40;
}

/**
 * Identity-preserving portrait retouch.
 *
 * Wrinkles/skin texture are softened with an edge-preserving median filter,
 * blended back only over skin regions at an adjustable strength. Because the
 * median filter keeps structural edges and the skin mask excludes facial
 * features, the person's likeness is preserved — this is classical retouching,
 * not generative re-synthesis.
 */
export async function retouchPortrait(
  input: Buffer,
  options: RetouchOptions = {},
): Promise<RetouchResult> {
  const strength = clamp01(options.strength ?? 0.6);

  const { data: orig, info } = await sharp(input, { failOn: "none" })
    .rotate()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const channels = info.channels;

  // Median window scaled to image size (odd, bounded) — removes fine texture
  // and wrinkles while preserving strong edges.
  const minDim = Math.min(width, height);
  let win = Math.round(minDim / 200);
  win = Math.max(3, win * 2 + 1);
  win = Math.min(win, 15);

  const smoothed = await sharp(input, { failOn: "none" })
    .rotate()
    .removeAlpha()
    .median(win)
    .raw()
    .toBuffer();

  // Build a hard skin mask, then feather it so the smoothing blends smoothly
  // into surrounding areas instead of leaving speckled per-pixel edges.
  const mask = Buffer.alloc(width * height);
  let skinCount = 0;
  for (let i = 0; i < width * height; i += 1) {
    const o = i * channels;
    if (isSkinPixel(orig[o], orig[o + 1], orig[o + 2])) {
      mask[i] = 255;
      skinCount += 1;
    }
  }

  const featherSigma = Math.max(1, Math.round(minDim / 300));
  const feathered = await sharp(mask, {
    raw: { width, height, channels: 1 },
  })
    .blur(featherSigma)
    .raw()
    .toBuffer();

  const out = Buffer.alloc(orig.length);
  for (let i = 0; i < width * height; i += 1) {
    const o = i * channels;
    const alpha = (feathered[i] / 255) * strength;
    out[o] = Math.round(orig[o] + (smoothed[o] - orig[o]) * alpha);
    out[o + 1] = Math.round(orig[o + 1] + (smoothed[o + 1] - orig[o + 1]) * alpha);
    out[o + 2] = Math.round(orig[o + 2] + (smoothed[o + 2] - orig[o + 2]) * alpha);
  }

  const data = await sharp(out, { raw: { width, height, channels } })
    .jpeg({ quality: 92 })
    .toBuffer();

  return {
    data,
    width,
    height,
    skinRatio: skinCount / (width * height),
    strength,
  };
}
