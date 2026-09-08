import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { composePhotoOntoTemplate } from "./compose";

async function solid(
  width: number,
  height: number,
  rgb: { r: number; g: number; b: number },
): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: rgb },
  })
    .png()
    .toBuffer();
}

describe("composePhotoOntoTemplate", () => {
  it("keeps the template dimensions", async () => {
    const template = await solid(800, 600, { r: 10, g: 20, b: 30 });
    const photo = await solid(400, 400, { r: 240, g: 40, b: 40 });
    const res = await composePhotoOntoTemplate(template, photo, {
      scalePercent: 50,
      position: "center",
    });
    expect(res.width).toBe(800);
    expect(res.height).toBe(600);
  });

  it("scales the photo to the requested percentage of template width", async () => {
    const template = await solid(1000, 1000, { r: 0, g: 0, b: 0 });
    const photo = await solid(500, 500, { r: 255, g: 255, b: 255 });
    const res = await composePhotoOntoTemplate(template, photo, {
      scalePercent: 40,
    });
    expect(res.photoWidth).toBe(400);
  });

  it("actually places the photo (output differs from the template)", async () => {
    const template = await solid(400, 400, { r: 0, g: 0, b: 0 });
    const photo = await solid(400, 400, { r: 255, g: 255, b: 255 });
    const res = await composePhotoOntoTemplate(template, photo, {
      scalePercent: 60,
      position: "center",
    });

    // Center pixel should now be bright (white photo), not black template.
    const { data, info } = await sharp(res.data)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const cx = Math.floor(info.width / 2);
    const cy = Math.floor(info.height / 2);
    const o = (cy * info.width + cx) * info.channels;
    expect(data[o]).toBeGreaterThan(200);
  });

  it("places the photo in the requested corner", async () => {
    const template = await solid(400, 400, { r: 0, g: 0, b: 0 });
    const photo = await solid(400, 400, { r: 255, g: 255, b: 255 });
    const res = await composePhotoOntoTemplate(template, photo, {
      scalePercent: 30,
      position: "top-left",
    });
    const { data, info } = await sharp(res.data)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    // Top-left pixel bright, bottom-right pixel still dark.
    const tl = 0;
    const br = ((info.height - 1) * info.width + (info.width - 1)) * info.channels;
    expect(data[tl]).toBeGreaterThan(200);
    expect(data[br]).toBeLessThan(60);
  });
});
