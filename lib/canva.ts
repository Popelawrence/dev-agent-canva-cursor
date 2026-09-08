import crypto from "crypto";

/**
 * Minimal Canva Connect API client.
 *
 * Implements the OAuth 2.0 Authorization Code + PKCE flow and the two calls
 * needed to push a photo into a real Canva design:
 *   1. upload the image as an asset (async job + polling)
 *   2. create a design from that asset
 *
 * Docs: https://www.canva.dev/docs/connect/
 *
 * The integration is fully optional: when the CANVA_* environment variables are
 * absent, `isCanvaConfigured()` returns false and the app hides the feature, so
 * the rest of the app (and the test suite) runs without any credentials.
 */

const AUTHORIZE_URL = "https://www.canva.com/api/oauth/authorize";
const TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";
const ASSET_UPLOADS_URL = "https://api.canva.com/rest/v1/asset-uploads";
const DESIGNS_URL = "https://api.canva.com/rest/v1/designs";

export const CANVA_SCOPES =
  "asset:read asset:write design:content:write design:meta:read";

export interface CanvaConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface CanvaTokenSet {
  accessToken: string;
  refreshToken: string;
  /** Absolute expiry time in epoch milliseconds. */
  expiresAt: number;
  scope: string;
}

export interface CanvaDesign {
  designId: string;
  editUrl: string;
  viewUrl: string;
}

export function getCanvaConfig(): CanvaConfig | null {
  const clientId = process.env.CANVA_CLIENT_ID;
  const clientSecret = process.env.CANVA_CLIENT_SECRET;
  const redirectUri = process.env.CANVA_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }
  return { clientId, clientSecret, redirectUri };
}

export function isCanvaConfigured(): boolean {
  return getCanvaConfig() !== null;
}

export interface Pkce {
  verifier: string;
  challenge: string;
}

export function createPkce(): Pkce {
  const verifier = crypto.randomBytes(96).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return { verifier, challenge };
}

export function createState(): string {
  return crypto.randomBytes(96).toString("base64url");
}

export function buildAuthorizeUrl(
  config: CanvaConfig,
  params: { state: string; codeChallenge: string; scopes?: string },
): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", params.scopes ?? CANVA_SCOPES);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", params.state);
  return url.toString();
}

function basicAuthHeader(config: CanvaConfig): string {
  const raw = `${config.clientId}:${config.clientSecret}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}

interface RawTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

function toTokenSet(raw: RawTokenResponse): CanvaTokenSet {
  return {
    accessToken: raw.access_token,
    refreshToken: raw.refresh_token,
    // Refresh a minute early to avoid edge-of-expiry failures.
    expiresAt: Date.now() + (raw.expires_in - 60) * 1000,
    scope: raw.scope,
  };
}

export async function exchangeCodeForToken(
  config: CanvaConfig,
  params: { code: string; codeVerifier: string },
): Promise<CanvaTokenSet> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    code_verifier: params.codeVerifier,
    redirect_uri: config.redirectUri,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(config),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status}): ${await res.text()}`);
  }
  return toTokenSet((await res.json()) as RawTokenResponse);
}

export async function refreshAccessToken(
  config: CanvaConfig,
  refreshToken: string,
): Promise<CanvaTokenSet> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(config),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`Token refresh failed (${res.status}): ${await res.text()}`);
  }
  return toTokenSet((await res.json()) as RawTokenResponse);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface AssetJob {
  id: string;
  status: "in_progress" | "success" | "failed";
  asset?: { id: string };
  error?: { code: string; message: string };
}

/**
 * Upload image bytes as a Canva asset and wait for the async job to complete.
 * Returns the resulting asset ID.
 */
export async function uploadImageAsset(
  accessToken: string,
  bytes: Uint8Array,
  name: string,
): Promise<string> {
  const nameBase64 = Buffer.from(name.slice(0, 50)).toString("base64");
  const res = await fetch(ASSET_UPLOADS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
      "Asset-Upload-Metadata": JSON.stringify({ name_base64: nameBase64 }),
    },
    body: bytes,
  });
  if (!res.ok) {
    throw new Error(`Asset upload failed (${res.status}): ${await res.text()}`);
  }

  let job = ((await res.json()) as { job: AssetJob }).job;
  for (let i = 0; job.status === "in_progress" && i < 30; i += 1) {
    await sleep(1000);
    const poll = await fetch(`${ASSET_UPLOADS_URL}/${job.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!poll.ok) {
      throw new Error(
        `Asset upload polling failed (${poll.status}): ${await poll.text()}`,
      );
    }
    job = ((await poll.json()) as { job: AssetJob }).job;
  }

  if (job.status !== "success" || !job.asset) {
    throw new Error(
      `Asset upload did not succeed: ${job.error?.message ?? job.status}`,
    );
  }
  return job.asset.id;
}

const MIN_DIM = 40;
const MAX_DIM = 8000;
const clampDim = (v: number) =>
  Math.min(MAX_DIM, Math.max(MIN_DIM, Math.round(v)));

/**
 * Create a custom-sized Canva design that contains the given image asset.
 */
export async function createDesignFromAsset(
  accessToken: string,
  params: { assetId: string; width: number; height: number; title: string },
): Promise<CanvaDesign> {
  const res = await fetch(DESIGNS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "type_and_asset",
      design_type: {
        type: "custom",
        width: clampDim(params.width),
        height: clampDim(params.height),
      },
      asset_id: params.assetId,
      title: params.title.slice(0, 255),
    }),
  });
  if (!res.ok) {
    throw new Error(`Create design failed (${res.status}): ${await res.text()}`);
  }
  const { design } = (await res.json()) as {
    design: { id: string; urls: { edit_url: string; view_url: string } };
  };
  return {
    designId: design.id,
    editUrl: design.urls.edit_url,
    viewUrl: design.urls.view_url,
  };
}
