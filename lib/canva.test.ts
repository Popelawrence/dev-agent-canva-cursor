import crypto from "crypto";
import { describe, expect, it } from "vitest";
import {
  buildAuthorizeUrl,
  createPkce,
  createState,
  type CanvaConfig,
} from "./canva";

const config: CanvaConfig = {
  clientId: "OC-test-client",
  clientSecret: "secret-value",
  redirectUri: "https://example.com/api/canva/callback",
};

describe("createPkce", () => {
  it("produces a verifier of valid length and a matching S256 challenge", () => {
    const { verifier, challenge } = createPkce();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    const expected = crypto
      .createHash("sha256")
      .update(verifier)
      .digest("base64url");
    expect(challenge).toBe(expected);
  });

  it("generates a unique verifier each call", () => {
    expect(createPkce().verifier).not.toBe(createPkce().verifier);
  });
});

describe("createState", () => {
  it("returns a high-entropy unique string", () => {
    expect(createState()).not.toBe(createState());
    expect(createState().length).toBeGreaterThan(20);
  });
});

describe("buildAuthorizeUrl", () => {
  it("includes all required OAuth + PKCE parameters", () => {
    const url = new URL(
      buildAuthorizeUrl(config, {
        state: "state-123",
        codeChallenge: "challenge-abc",
      }),
    );
    expect(url.origin + url.pathname).toBe(
      "https://www.canva.com/api/oauth/authorize",
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe("OC-test-client");
    expect(url.searchParams.get("redirect_uri")).toBe(config.redirectUri);
    expect(url.searchParams.get("code_challenge")).toBe("challenge-abc");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.searchParams.get("scope")).toContain("asset:write");
    expect(url.searchParams.get("scope")).toContain("design:content:write");
  });
});
