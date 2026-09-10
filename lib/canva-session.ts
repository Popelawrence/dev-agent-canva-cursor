import type { NextRequest, NextResponse } from "next/server";
import { refreshAccessToken, type CanvaConfig, type CanvaTokenSet } from "./canva";

/**
 * Demo-grade token storage in httpOnly cookies.
 *
 * This keeps the sample self-contained. A production integration should store
 * tokens in an encrypted server-side session or database keyed to the logged-in
 * user, not in cookies.
 */

const ACCESS = "canva_at";
const ACCESS_EXP = "canva_at_exp";
const REFRESH = "canva_rt";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

function cookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export interface StoredTokens {
  accessToken?: string;
  refreshToken?: string;
  expiresAt: number;
}

export function readTokens(req: NextRequest): StoredTokens {
  const accessToken = req.cookies.get(ACCESS)?.value;
  const refreshToken = req.cookies.get(REFRESH)?.value;
  const expRaw = req.cookies.get(ACCESS_EXP)?.value;
  return {
    accessToken,
    refreshToken,
    expiresAt: expRaw ? Number(expRaw) : 0,
  };
}

export function writeTokens(res: NextResponse, tokens: CanvaTokenSet): void {
  const base = { ...cookieBase(), maxAge: THIRTY_DAYS };
  res.cookies.set(ACCESS, tokens.accessToken, base);
  res.cookies.set(ACCESS_EXP, String(tokens.expiresAt), base);
  res.cookies.set(REFRESH, tokens.refreshToken, base);
}

export function clearTokens(res: NextResponse): void {
  const base = { ...cookieBase(), maxAge: 0 };
  res.cookies.set(ACCESS, "", base);
  res.cookies.set(ACCESS_EXP, "", base);
  res.cookies.set(REFRESH, "", base);
}

export interface AccessTokenResult {
  accessToken?: string;
  /** Set when a refresh happened, so the caller can persist new cookies. */
  refreshed: CanvaTokenSet | null;
  error?: "expired" | "missing";
}

/**
 * Resolve a usable access token for the request, refreshing with the refresh
 * token when the stored access token is missing or expired. On refresh, the
 * caller must call `writeTokens(res, result.refreshed)` on its response.
 */
export async function ensureAccessToken(
  request: NextRequest,
  config: CanvaConfig,
): Promise<AccessTokenResult> {
  const stored = readTokens(request);
  let accessToken = stored.accessToken;
  let refreshed: CanvaTokenSet | null = null;

  const expired = !accessToken || Date.now() >= stored.expiresAt;
  if (expired && stored.refreshToken) {
    try {
      refreshed = await refreshAccessToken(config, stored.refreshToken);
      accessToken = refreshed.accessToken;
    } catch {
      return { refreshed: null, error: "expired" };
    }
  }
  if (!accessToken) {
    return { refreshed: null, error: "missing" };
  }
  return { accessToken, refreshed };
}
