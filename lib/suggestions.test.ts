import { describe, expect, it } from "vitest";
import { generateSuggestions, type DesignBrief } from "./suggestions";

const baseBrief: DesignBrief = {
  prompt: "Summer coffee launch",
  designType: "instagram-post",
  tone: "playful",
};

describe("generateSuggestions", () => {
  it("returns the requested number of suggestions", () => {
    expect(generateSuggestions(baseBrief, 3)).toHaveLength(3);
    expect(generateSuggestions(baseBrief, 5)).toHaveLength(5);
  });

  it("is deterministic for identical briefs", () => {
    const a = generateSuggestions(baseBrief);
    const b = generateSuggestions(baseBrief);
    expect(a).toEqual(b);
  });

  it("uses the correct dimensions for the design type", () => {
    const [suggestion] = generateSuggestions({
      prompt: "Team offsite deck",
      designType: "presentation",
    });
    expect(suggestion.dimensions).toEqual({ width: 1920, height: 1080 });
  });

  it("includes a palette, font pairing, and headline", () => {
    const [suggestion] = generateSuggestions(baseBrief);
    expect(suggestion.palette.length).toBeGreaterThan(0);
    expect(suggestion.fontPairing.heading).toBeTruthy();
    expect(suggestion.fontPairing.body).toBeTruthy();
    expect(suggestion.headline).toContain("Summer coffee launch");
  });

  it("throws on an empty prompt", () => {
    expect(() =>
      generateSuggestions({ prompt: "   ", designType: "logo" }),
    ).toThrow(/must not be empty/);
  });

  it("varies output when the design type changes", () => {
    const post = generateSuggestions(baseBrief)[0];
    const story = generateSuggestions({ ...baseBrief, designType: "story" })[0];
    expect(post.dimensions).not.toEqual(story.dimensions);
  });
});
