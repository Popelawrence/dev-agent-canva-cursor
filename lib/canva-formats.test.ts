import { describe, expect, it } from "vitest";
import { CANVA_FORMATS, resolveFormat } from "./canva-formats";
import { fitCanvaDimensions } from "./canva";

describe("canva formats", () => {
  it("includes a 'match' option with null dimensions", () => {
    const match = resolveFormat("match");
    expect(match).toBeDefined();
    expect(match?.width).toBeNull();
    expect(match?.height).toBeNull();
  });

  it("exposes preset formats with concrete dimensions", () => {
    const ig = resolveFormat("instagram_post");
    expect(ig?.width).toBe(1080);
    expect(ig?.height).toBe(1080);
    const story = resolveFormat("instagram_story");
    expect(story?.width).toBe(1080);
    expect(story?.height).toBe(1920);
  });

  it("returns undefined for an unknown format key", () => {
    expect(resolveFormat("nope")).toBeUndefined();
  });

  it("all preset dimensions are within Canva limits", () => {
    for (const f of CANVA_FORMATS) {
      if (f.width && f.height) {
        expect(f.width).toBeGreaterThanOrEqual(40);
        expect(f.width).toBeLessThanOrEqual(8000);
        expect(f.height).toBeGreaterThanOrEqual(40);
        expect(f.height).toBeLessThanOrEqual(8000);
        expect(f.width * f.height).toBeLessThanOrEqual(25_000_000);
      }
    }
  });
});

describe("fitCanvaDimensions", () => {
  it("leaves valid dimensions unchanged", () => {
    expect(fitCanvaDimensions(1080, 1080)).toEqual({ width: 1080, height: 1080 });
  });

  it("clamps dimensions below the minimum up to 40", () => {
    expect(fitCanvaDimensions(10, 10)).toEqual({ width: 40, height: 40 });
  });

  it("scales down when the area exceeds the maximum", () => {
    const { width, height } = fitCanvaDimensions(8000, 8000);
    expect(width).toBeLessThanOrEqual(8000);
    expect(height).toBeLessThanOrEqual(8000);
    expect(width * height).toBeLessThanOrEqual(25_000_000);
    // aspect ratio preserved (square stays square)
    expect(width).toBe(height);
  });
});
