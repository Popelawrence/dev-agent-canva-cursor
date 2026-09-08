import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { isSkinPixel, retouchPortrait } from "./retouch";

function mulberry32(seed: number) {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function makeNoisy(
  base: [number, number, number],
  width = 120,
  height = 120,
  amp = 40,
  seed = 1,
): Promise<Buffer> {
  const rnd = mulberry32(seed);
  const buf = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i += 1) {
    const o = i * 3;
    for (let c = 0; c < 3; c += 1) {
      const n = (rnd() * 2 - 1) * amp;
      buf[o + c] = Math.min(255, Math.max(0, Math.round(base[c] + n)));
    }
  }
  return sharp(buf, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

async function channelVariance(jpeg: Buffer, ch: number): Promise<number> {
  const { data } = await sharp(jpeg)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let sum = 0;
  let sum2 = 0;
  let n = 0;
  for (let o = ch; o < data.length; o += 3) {
    sum += data[o];
    sum2 += data[o] * data[o];
    n += 1;
  }
  const mean = sum / n;
  return sum2 / n - mean * mean;
}

async function meanAbsDiff(a: Buffer, b: Buffer): Promise<number> {
  const rawA = await sharp(a).removeAlpha().raw().toBuffer();
  const rawB = await sharp(b).removeAlpha().raw().toBuffer();
  let sum = 0;
  for (let i = 0; i < rawA.length; i += 1) {
    sum += Math.abs(rawA[i] - rawB[i]);
  }
  return sum / rawA.length;
}

describe("isSkinPixel", () => {
  it("classifies skin tones as skin", () => {
    expect(isSkinPixel(200, 150, 120)).toBe(true);
    expect(isSkinPixel(241, 194, 167)).toBe(true);
  });

  it("rejects clearly non-skin colors", () => {
    expect(isSkinPixel(20, 40, 200)).toBe(false);
    expect(isSkinPixel(20, 180, 40)).toBe(false);
  });
});

describe("retouchPortrait", () => {
  it("preserves image dimensions", async () => {
    const img = await makeNoisy([200, 150, 120], 100, 140);
    const res = await retouchPortrait(img, { strength: 0.6 });
    expect(res.width).toBe(100);
    expect(res.height).toBe(140);
  });

  it("reduces skin texture (smooths wrinkles) more at higher strength", async () => {
    const img = await makeNoisy([200, 150, 120], 120, 120, 35, 7);
    const base = await retouchPortrait(img, { strength: 0 });
    const strong = await retouchPortrait(img, { strength: 0.9 });
    expect(strong.skinRatio).toBeGreaterThan(0.6);
    const vBase = await channelVariance(base.data, 0);
    const vStrong = await channelVariance(strong.data, 0);
    expect(vStrong).toBeLessThan(vBase);
  });

  it("leaves non-skin images essentially untouched", async () => {
    const img = await makeNoisy([20, 40, 200], 80, 80, 30, 3);
    const res = await retouchPortrait(img, { strength: 0.9 });
    expect(res.skinRatio).toBeLessThan(0.02);
  });

  it("changes pixels far less at strength 0 than at strength 0.9", async () => {
    const img = await makeNoisy([200, 150, 120], 120, 120, 40, 11);
    const jpegBaseline = await sharp(img)
      .removeAlpha()
      .jpeg({ quality: 92 })
      .toBuffer();
    const low = await retouchPortrait(img, { strength: 0 });
    const high = await retouchPortrait(img, { strength: 0.9 });
    const dLow = await meanAbsDiff(low.data, jpegBaseline);
    const dHigh = await meanAbsDiff(high.data, jpegBaseline);
    expect(dHigh).toBeGreaterThan(dLow);
  });
});
