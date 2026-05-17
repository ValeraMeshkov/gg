import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";

export const SESSION_COOKIE_NAME = "game_session";
/** ~10 лет — практически «навсегда», без принудительного logout. */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 365 * 10;

type OAuthStatePayload = {
  linkUserId?: string;
  returnTo?: string;
};

function sessionSecret(): Uint8Array {
  const raw = process.env.AUTH_SESSION_SECRET;
  if (!raw || raw.length < 16) {
    throw new Error("AUTH_SESSION_SECRET must be set (min 16 chars)");
  }
  return new TextEncoder().encode(raw);
}

export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.AUTH_SESSION_SECRET &&
      process.env.AUTH_SESSION_SECRET.length >= 16
  );
}

export function publicApiBaseUrl(): string {
  const explicit = process.env.PUBLIC_API_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const port = process.env.PORT ?? "3001";
  return `http://127.0.0.1:${port}`;
}

export function googleRedirectUri(): string {
  const explicit = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  return `${publicApiBaseUrl()}/api/auth/google/callback`;
}

export function frontendBaseUrl(): string {
  const raw = process.env.FRONTEND_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "http://localhost:5174";
}

export function sessionCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Lax" | "None";
  maxAge: number;
  path: string;
} {
  const crossSite =
    process.env.AUTH_COOKIE_CROSS_SITE === "1" ||
    process.env.AUTH_COOKIE_CROSS_SITE === "true";
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || crossSite,
    sameSite: crossSite ? "None" : "Lax",
    maxAge: SESSION_MAX_AGE_SEC,
    path: "/",
  };
}

export async function signSessionToken(
  userId: string,
  email?: string
): Promise<string> {
  return new SignJWT(email ? { email } : {})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(sessionSecret());
}

export async function verifySessionToken(
  token: string
): Promise<{ userId: string; email?: string } | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    if (!payload.sub) return null;
    return {
      userId: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
    };
  } catch {
    return null;
  }
}

export async function signOAuthState(
  payload: OAuthStatePayload
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(sessionSecret());
}

export async function verifyOAuthState(
  state: string
): Promise<OAuthStatePayload | null> {
  try {
    const { payload } = await jwtVerify(state, sessionSecret());
    return {
      linkUserId:
        typeof payload.linkUserId === "string" ? payload.linkUserId : undefined,
      returnTo:
        typeof payload.returnTo === "string" ? payload.returnTo : undefined,
    };
  } catch {
    return null;
  }
}

export async function readAuthUserId(c: Context): Promise<string | null> {
  const cookieToken = getCookie(c, SESSION_COOKIE_NAME);
  if (cookieToken) {
    const session = await verifySessionToken(cookieToken);
    if (session) return session.userId;
  }

  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const session = await verifySessionToken(authHeader.slice(7));
    if (session) return session.userId;
  }

  return null;
}

export function setSessionCookie(c: Context, token: string): void {
  setCookie(c, SESSION_COOKIE_NAME, token, sessionCookieOptions());
}

export function buildGoogleAuthUrl(state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    include_granted_scopes: "true",
    prompt: "select_account",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

type GoogleTokenResponse = {
  access_token?: string;
  id_token?: string;
  error?: string;
};

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
};

export async function exchangeGoogleCode(
  code: string
): Promise<{ accessToken: string } | { error: string }> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: googleRedirectUri(),
    grant_type: "authorization_code",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = (await res.json()) as GoogleTokenResponse;
  if (!res.ok || !data.access_token) {
    return { error: data.error ?? `token HTTP ${res.status}` };
  }
  return { accessToken: data.access_token };
}

export async function fetchGoogleUserInfo(
  accessToken: string
): Promise<GoogleUserInfo | null> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as GoogleUserInfo;
}

/** Стабильный внутренний id из Google sub (один аккаунт → один userId). */
export function userIdFromGoogleSub(googleSub: string): string {
  const hex = createHash("sha256").update(`google:${googleSub}`).digest("hex");
  const bytes = hex.slice(0, 32).match(/.{2}/g)!.map((b) => parseInt(b, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const chars = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  return [
    chars.slice(0, 8),
    chars.slice(8, 12),
    chars.slice(12, 16),
    chars.slice(16, 20),
    chars.slice(20, 32),
  ].join("-");
}

export function safeReturnPath(returnTo: string | undefined): string {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/";
  }
  return returnTo;
}

export function authErrorRedirect(code: string): string {
  const base = frontendBaseUrl();
  return `${base}/?auth_error=${encodeURIComponent(code)}`;
}

export function authSuccessRedirect(returnTo?: string): string {
  const base = frontendBaseUrl();
  const path = safeReturnPath(returnTo);
  const url = new URL(path, `${base}/`);
  url.searchParams.set("auth", "ok");
  return url.toString();
}

export function newOAuthNonce(): string {
  return randomBytes(16).toString("hex");
}
